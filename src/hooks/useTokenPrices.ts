import { useEffect, useState } from 'react';

export type LivePrice = { usdPrice: number; priceChange24h?: number };

/** Real on-chain market prices from Jupiter's price API (mainnet). Missing = no market yet. */
export function useTokenPrices(mints: (string | null | undefined)[]) {
  const [prices, setPrices] = useState<Record<string, LivePrice>>({});
  const key = mints.filter(Boolean).sort().join(',');

  useEffect(() => {
    if (!key) return;
    let stop = false;
    const load = async () => {
      try {
        const ids = key.split(',');
        const out: Record<string, LivePrice> = {};
        for (let i = 0; i < ids.length; i += 50) {
          const r = await fetch(`https://lite-api.jup.ag/price/v3?ids=${ids.slice(i, i + 50).join(',')}`);
          if (r.ok) Object.assign(out, await r.json());
        }
        if (!stop) setPrices(out);
      } catch { /* keep last */ }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => { stop = true; clearInterval(t); };
  }, [key]);

  return prices;
}

export function formatUsd(n: number) {
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toExponential(2)}`;
}
