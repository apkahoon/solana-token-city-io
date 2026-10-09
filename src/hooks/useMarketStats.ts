import { useEffect, useState } from 'react';

export type MarketStats = { priceUsd: number; volume24h: number; change24h: number; liquidityUsd: number; buys24h: number; pairUrl: string };

/** Real 24h market stats for live pools (DexScreener, Solana mainnet). Highest-liquidity pair wins. */
export function useMarketStats(mints: (string | null | undefined)[]) {
  const [stats, setStats] = useState<Record<string, MarketStats>>({});
  const key = [...new Set(mints.filter(Boolean) as string[])].sort().join(',');

  useEffect(() => {
    if (!key) return;
    let stop = false;
    const load = async () => {
      try {
        const ids = key.split(',');
        const out: Record<string, MarketStats> = {};
        for (let i = 0; i < ids.length; i += 30) {
          const r = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${ids.slice(i, i + 30).join(',')}`);
          if (!r.ok) continue;
          for (const p of (await r.json()) as any[]) {
            const mint = p.baseToken?.address;
            if (!ids.includes(mint)) continue;
            const liq = Number(p.liquidity?.usd || 0);
            if (out[mint] && out[mint].liquidityUsd >= liq) continue;
            out[mint] = {
              priceUsd: Number(p.priceUsd || 0), volume24h: Number(p.volume?.h24 || 0),
              change24h: Number(p.priceChange?.h24 || 0), liquidityUsd: liq,
              buys24h: Number(p.txns?.h24?.buys || 0), pairUrl: p.url,
            };
          }
        }
        if (!stop) setStats(out);
      } catch { /* keep last */ }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { stop = true; clearInterval(t); };
  }, [key]);

  return stats;
}

/** Ranking formula: volume*0.5 + liquidity*0.3 + buys*0.2 */
export const marketScore = (m: MarketStats) => m.volume24h * 0.5 + m.liquidityUsd * 0.3 + m.buys24h * 0.2;
