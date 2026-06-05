/**
 * Real on-chain devnet swap via Orca Whirlpools.
 *
 * Devnet SOL <-> devUSDC whirlpool from Orca's "devToken" ecosystem:
 *   - Whirlpools program: whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc
 *   - Devnet WhirlpoolsConfig: FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR
 *   - devUSDC mint: BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k (6 decimals)
 *   - wSOL mint:    So11111111111111111111111111111111111111112 (9 decimals)
 *   - tick spacing: 64
 */

import { AnchorProvider } from "@coral-xyz/anchor";
import { Percentage } from "@orca-so/common-sdk";
import {
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil,
  WhirlpoolContext,
  buildWhirlpoolClient,
  swapQuoteByInputToken,
} from "@orca-so/whirlpools-sdk";
import type { Connection } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import BN from "bn.js";
import Decimal from "decimal.js";

export const DEVNET_WSOL = new PublicKey(
  "So11111111111111111111111111111111111111112"
);
export const DEVNET_USDC = new PublicKey(
  "BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"
);
const DEVNET_WHIRLPOOLS_CONFIG = new PublicKey(
  "FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR"
);
const TICK_SPACING = 64;

export type OrcaSwapResult = {
  signature: string;
  whirlpool: string;
  inMint: string;
  outMint: string;
  inAmountUi: number;
  estOutUi: number;
  minOutUi: number;
  priceImpactPct: number;
  slippageBps: number;
};

function adaptWallet(wallet: WalletContextState) {
  if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
    throw new Error("Wallet not connected or does not support signing");
  }
  return {
    publicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction.bind(wallet),
    signAllTransactions: wallet.signAllTransactions.bind(wallet),
  } as any;
}

export async function executeOrcaDevnetSwap(opts: {
  connection: Connection;
  wallet: WalletContextState;
  inputMint: PublicKey; // DEVNET_WSOL or DEVNET_USDC
  outputMint: PublicKey;
  amountInUi: number; // human units
  slippageBps?: number; // default 50 = 0.5%
}): Promise<OrcaSwapResult> {
  const { connection, wallet, inputMint, outputMint, amountInUi } = opts;
  const slippageBps = opts.slippageBps ?? 50;

  if (!wallet.publicKey) throw new Error("Connect a wallet first");

  const isSolUsdc =
    (inputMint.equals(DEVNET_WSOL) && outputMint.equals(DEVNET_USDC)) ||
    (inputMint.equals(DEVNET_USDC) && outputMint.equals(DEVNET_WSOL));
  if (!isSolUsdc) {
    throw new Error(
      "Orca devnet route only supports SOL ↔ devUSDC. Other pairs use the simulation curve."
    );
  }

  const provider = new AnchorProvider(connection, adaptWallet(wallet), {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  const ctx = WhirlpoolContext.withProvider(provider);
  const client = buildWhirlpoolClient(ctx);

  // Token mints must be sorted for the PDA. PDAUtil handles that internally if
  // you pass them in canonical order; we always pass (wSOL, devUSDC) since
  // wSOL's pubkey sorts before devUSDC's.
  const [mintA, mintB] = [DEVNET_WSOL, DEVNET_USDC];
  const decimalsByMint = new Map<string, number>([
    [DEVNET_WSOL.toBase58(), 9],
    [DEVNET_USDC.toBase58(), 6],
  ]);

  const whirlpoolPda = PDAUtil.getWhirlpool(
    ORCA_WHIRLPOOL_PROGRAM_ID,
    DEVNET_WHIRLPOOLS_CONFIG,
    mintA,
    mintB,
    TICK_SPACING
  );
  const whirlpool = await client.getPool(whirlpoolPda.publicKey);

  const inDecimals = decimalsByMint.get(inputMint.toBase58())!;
  const outDecimals = decimalsByMint.get(outputMint.toBase58())!;

  const amountInBase = new BN(
    new Decimal(amountInUi).mul(new Decimal(10).pow(inDecimals)).toFixed(0)
  );

  const quote = await swapQuoteByInputToken(
    whirlpool,
    inputMint,
    amountInBase,
    Percentage.fromFraction(slippageBps, 10_000),
    ctx.program.programId,
    ctx.fetcher,
    undefined as any
  );

  const estOut = new Decimal(quote.estimatedAmountOut.toString()).div(
    new Decimal(10).pow(outDecimals)
  );
  const minOut = new Decimal(quote.otherAmountThreshold.toString()).div(
    new Decimal(10).pow(outDecimals)
  );
  // Price impact is on the quote (percentage)
  const priceImpactPct =
    "estimatedPriceImpact" in quote && (quote as any).estimatedPriceImpact
      ? Number((quote as any).estimatedPriceImpact.toString())
      : 0;

  const tx = await whirlpool.swap(quote);
  const signature = await tx.buildAndExecute();

  // Best-effort confirmation
  try {
    const bh = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction(
      { signature, ...bh } as any,
      "confirmed"
    );
  } catch {
    /* ignore — tx is already submitted */
  }

  return {
    signature,
    whirlpool: whirlpoolPda.publicKey.toBase58(),
    inMint: inputMint.toBase58(),
    outMint: outputMint.toBase58(),
    inAmountUi: amountInUi,
    estOutUi: estOut.toNumber(),
    minOutUi: minOut.toNumber(),
    priceImpactPct,
    slippageBps,
  };
}
