import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTokenPrices, formatUsd } from '@/hooks/useTokenPrices';

type T = { id: string; name: string; symbol: string; mint_address: string | null; is_featured: boolean };

/** Homepage strip showing real on-chain prices for platform tokens. */
export function LivePriceStrip() {
  const [tokens, setTokens] = useState<T[]>([]);
  useEffect(() => {
    supabase.from('tokens').select('id,name,symbol,mint_address,is_featured').not('mint_address', 'is', null)
      .order('is_featured', { ascending: false }).order('created_at', { ascending: false }).limit(12)
      .then(({ data }) => data && setTokens(data));
  }, []);
  const prices = useTokenPrices(tokens.map((t) => t.mint_address));
  if (!tokens.length) return null;

  return (
    <section className="px-4 py-10">
      <div className="container mx-auto max-w-6xl">
        <h2 className="font-display text-xl font-bold mb-4"><span className="gradient-text">Live token prices</span></h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {tokens.map((t) => {
            const p = t.mint_address ? prices[t.mint_address] : undefined;
            const ch = p?.priceChange24h;
            return (
              <Link key={t.id} to={`/token/${t.id}`} className="glass p-4 hover:bg-muted/40">
                <div className="flex items-center gap-1 text-sm font-semibold truncate">
                  {t.is_featured && <Star className="w-3 h-3 text-accent shrink-0" />}{t.name}
                </div>
                <div className="text-xs text-muted-foreground">${t.symbol}</div>
                <div className="mt-2 font-bold">{p ? formatUsd(p.usdPrice) : <span className="text-xs text-muted-foreground font-normal">No market yet</span>}</div>
                {ch != null && <div className={`text-xs ${ch >= 0 ? 'text-neon-green' : 'text-destructive'}`}>{ch >= 0 ? '+' : ''}{ch.toFixed(1)}%</div>}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
