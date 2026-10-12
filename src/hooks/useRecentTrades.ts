import { useCallback, useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

export type Trade = { signature: string; time: number | null; side: 'buy' | 'sell'; wallet: string; tokenAmount: number; solAmount: number };

/** Reads the latest real trades straight from the pool's on-chain history (any app, not just SolForge). */
export function useRecentTrades(pool: string | null, mint: string | null, limit = 20) {
  const { connection } = useConnection();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!pool || !mint || pool.startsWith('pool_')) return;
    setLoading(true);
    try {
      const sigs = await connection.getSignaturesForAddress(new PublicKey(pool), { limit });
      const ok = sigs.filter((s) => !s.err);
      const txs = await connection.getParsedTransactions(ok.map((s) => s.signature), { maxSupportedTransactionVersion: 0, commitment: 'confirmed' });
      const out: Trade[] = [];
      txs.forEach((tx, i) => {
        if (!tx?.meta) return;
        const keys = tx.transaction.message.accountKeys;
        const signer = keys.find((k) => k.signer)?.pubkey.toBase58();
        if (!signer) return;
        const bal = (arr: typeof tx.meta.preTokenBalances) =>
          (arr || []).filter((b) => b.mint === mint && b.owner === signer).reduce((a, b) => a + Number(b.uiTokenAmount.uiAmount || 0), 0);
        const dTok = bal(tx.meta.postTokenBalances) - bal(tx.meta.preTokenBalances);
        if (Math.abs(dTok) < 1e-12) return; // not a swap (e.g. pool creation / liquidity ops still count if token moved)
        const wsol = (arr: typeof tx.meta.preTokenBalances) =>
          (arr || []).filter((b) => b.mint === 'So11111111111111111111111111111111111111112' && b.owner === signer).reduce((a, b) => a + Number(b.uiTokenAmount.uiAmount || 0), 0);
        const dSol = (tx.meta.postBalances[0] - tx.meta.preBalances[0]) / 1e9 + (wsol(tx.meta.postTokenBalances) - wsol(tx.meta.preTokenBalances));
        out.push({ signature: ok[i].signature, time: ok[i].blockTime ?? null, side: dTok > 0 ? 'buy' : 'sell', wallet: signer, tokenAmount: Math.abs(dTok), solAmount: Math.abs(dSol) });
      });
      setTrades(out);
    } catch (e) { console.warn('recent trades failed', e); }
    finally { setLoading(false); }
  }, [connection, pool, mint, limit]);

  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, [load]);
  return { trades, loading, refresh: load };
}
