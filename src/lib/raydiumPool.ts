/**
 * Real Raydium CPMM (constant-product) pool creation on Solana mainnet.
 * Pairs a platform token with SOL so it becomes tradable via Raydium / Jupiter.
 */
import {
  Raydium, TxVersion, CREATE_CPMM_POOL_PROGRAM, CREATE_CPMM_POOL_FEE_ACC,
} from '@raydium-io/raydium-sdk-v2';
import type { Connection } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import BN from 'bn.js';
import Decimal from 'decimal.js';

const WSOL = 'So11111111111111111111111111111111111111112';

export async function createRaydiumSolPool(opts: {
  connection: Connection;
  wallet: WalletContextState;
  tokenMint: string;
  tokenAmountUi: number;
  solAmountUi: number;
}): Promise<{ poolId: string; signature: string; lpMint: string }> {
  const { connection, wallet } = opts;
  if (!wallet.publicKey || !wallet.signAllTransactions) throw new Error('Wallet does not support signing');

  const raydium = await Raydium.load({
    connection,
    owner: wallet.publicKey,
    cluster: 'mainnet',
    signAllTransactions: wallet.signAllTransactions.bind(wallet) as any,
    disableFeatureCheck: true,
    disableLoadToken: true,
    blockhashCommitment: 'confirmed',
  });

  // Mint info (handles SPL Token and Token-2022)
  const acct = await connection.getAccountInfo(new PublicKey(opts.tokenMint));
  if (!acct) throw new Error('Token mint not found on mainnet');
  const decimals = acct.data[44];
  const token = { address: opts.tokenMint, decimals, programId: acct.owner.toBase58() };
  const sol = { address: WSOL, decimals: 9, programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' };

  const toBase = (ui: number, d: number) => new BN(new Decimal(ui).mul(new Decimal(10).pow(d)).toFixed(0));

  const configs = await raydium.api.getCpmmConfigs();
  if (!configs.length) throw new Error('Could not load Raydium fee configs');
  // Lowest-fee tier (typically 0.25%)
  const feeConfig = [...configs].sort((a, b) => a.tradeFeeRate - b.tradeFeeRate)[0];
  feeConfig.id = (feeConfig as any).id;

  const { execute, extInfo } = await raydium.cpmm.createPool({
    programId: CREATE_CPMM_POOL_PROGRAM,
    poolFeeAccount: CREATE_CPMM_POOL_FEE_ACC,
    mintA: token,
    mintB: sol,
    mintAAmount: toBase(opts.tokenAmountUi, decimals),
    mintBAmount: toBase(opts.solAmountUi, 9),
    startTime: new BN(0),
    feeConfig,
    associatedOnly: false,
    ownerInfo: { useSOLBalance: true },
    txVersion: TxVersion.V0,
  });

  const { txId } = await execute({ sendAndConfirm: false });

  // HTTP-poll confirmation (RPC proxy has no websockets)
  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const st = (await connection.getSignatureStatuses([txId])).value[0];
    if (st?.err) throw new Error('Raydium pool transaction failed on-chain');
    if (st?.confirmationStatus === 'confirmed' || st?.confirmationStatus === 'finalized') {
      return {
        poolId: extInfo.address.poolId.toBase58(),
        lpMint: extInfo.address.lpMint.toBase58(),
        signature: txId,
      };
    }
  }
  throw new Error(`Pool transaction not confirmed yet — check Solscan: ${txId}`);
}

export const RAYDIUM_CPMM_PROGRAM = CREATE_CPMM_POOL_PROGRAM.toBase58();

async function loadRaydium(connection: Connection, wallet?: WalletContextState) {
  return Raydium.load({
    connection,
    owner: wallet?.publicKey ?? undefined,
    cluster: 'mainnet',
    signAllTransactions: wallet?.signAllTransactions?.bind(wallet) as any,
    disableFeatureCheck: true,
    disableLoadToken: true,
    blockhashCommitment: 'confirmed',
  });
}

export type RaydiumQuote = { poolId: string; inBase: BN; outBase: BN; minOutBase: BN; priceImpactPct: number; baseIn: boolean };

/** Quote directly against a Raydium CPMM pool's on-chain reserves (used when Jupiter hasn't indexed it yet). */
export async function quoteRaydiumCpmm(connection: Connection, poolId: string, inputMint: string, amountInBase: number, slippageBps: number): Promise<RaydiumQuote> {
  const raydium = await loadRaydium(connection);
  const { poolInfo, rpcData } = await raydium.cpmm.getPoolInfoFromRpc(poolId);
  const baseIn = poolInfo.mintA.address === inputMint;
  if (!baseIn && poolInfo.mintB.address !== inputMint) throw new Error('Token not in this pool');
  const rIn = new Decimal((baseIn ? rpcData.baseReserve : rpcData.quoteReserve).toString());
  const rOut = new Decimal((baseIn ? rpcData.quoteReserve : rpcData.baseReserve).toString());
  const feeRate = new Decimal(rpcData.configInfo?.tradeFeeRate?.toString() ?? '2500').div(1_000_000);
  const inD = new Decimal(amountInBase).mul(new Decimal(1).minus(feeRate));
  const out = inD.mul(rOut).div(rIn.plus(inD)).floor();
  const spotOut = new Decimal(amountInBase).mul(rOut).div(rIn);
  const impact = spotOut.gt(0) ? spotOut.minus(out).div(spotOut).mul(100).toNumber() : 0;
  const minOut = out.mul(1 - slippageBps / 10_000).floor();
  return { poolId, inBase: new BN(amountInBase.toString()), outBase: new BN(out.toFixed(0)), minOutBase: new BN(minOut.toFixed(0)), priceImpactPct: impact, baseIn };
}

/** Execute a real swap through a Raydium CPMM pool. Returns the signature. */
export async function swapRaydiumCpmm(connection: Connection, wallet: WalletContextState, q: RaydiumQuote, slippageBps: number): Promise<string> {
  if (!wallet.publicKey || !wallet.signAllTransactions) throw new Error('Wallet does not support signing');
  const raydium = await loadRaydium(connection, wallet);
  const { poolInfo, poolKeys } = await raydium.cpmm.getPoolInfoFromRpc(q.poolId);
  const { execute } = await raydium.cpmm.swap({
    poolInfo, poolKeys, baseIn: q.baseIn, inputAmount: q.inBase,
    swapResult: { inputAmount: q.inBase, outputAmount: q.outBase } as any,
    slippage: slippageBps / 10_000, txVersion: TxVersion.V0,
  });
  const { txId } = await execute({ sendAndConfirm: false });
  return txId;
}

export type PoolStats = { solReserve: number; tokenReserve: number; priceSol: number; tradeFeePct: number };

/** Read live reserves and price for a Raydium CPMM SOL pool from the chain. */
export async function getRaydiumPoolStats(connection: Connection, poolId: string, tokenMint: string): Promise<PoolStats> {
  const raydium = await loadRaydium(connection);
  const { poolInfo, rpcData } = await raydium.cpmm.getPoolInfoFromRpc(poolId);
  const tokenIsA = poolInfo.mintA.address === tokenMint;
  const tokDec = tokenIsA ? poolInfo.mintA.decimals : poolInfo.mintB.decimals;
  const tok = new Decimal((tokenIsA ? rpcData.baseReserve : rpcData.quoteReserve).toString()).div(new Decimal(10).pow(tokDec));
  const sol = new Decimal((tokenIsA ? rpcData.quoteReserve : rpcData.baseReserve).toString()).div(1e9);
  return {
    solReserve: sol.toNumber(),
    tokenReserve: tok.toNumber(),
    priceSol: tok.gt(0) ? sol.div(tok).toNumber() : 0,
    tradeFeePct: Number(rpcData.configInfo?.tradeFeeRate?.toString() ?? '2500') / 10_000,
  };
}
