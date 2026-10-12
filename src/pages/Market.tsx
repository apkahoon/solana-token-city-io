import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Loader2, ExternalLink, Search, Droplets } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMarketStats } from '@/hooks/useMarketStats';
import { useTokenPrices, formatUsd } from '@/hooks/useTokenPrices';

type T = { id: string; name: string; symbol: string; logo_url: string | null; mint_address: string; pool_address: string; is_featured: boolean };
type Sort = 'volume' | 'change' | 'liquidity' | 'new';

/** All SolForge tokens with a real Raydium pool, with live market stats. */
export default function Market() {
  const [tokens, setTokens] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('volume');

  useEffect(() => {
    supabase.from('tokens')
      .select('id,name,symbol,logo_url,mint_address,pool_address,is_featured')
      .eq('is_flagged', false).eq('liquidity_added', true)
      .not('mint_address', 'is', null).not('pool_address', 'is', null)
      .order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => {
        setTokens(((data || []) as T[]).filter((t) => !t.pool_address.startsWith('pool_')));
        setLoading(false);
      });
  }, []);

  const market = useMarketStats(tokens.map((t) => t.mint_address));
  const prices = useTokenPrices(tokens.map((t) => t.mint_address));

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = tokens.filter((t) => !s || t.name.toLowerCase().includes(s) || t.symbol.toLowerCase().includes(s) || t.mint_address === q.trim());
    const v = (t: T, k: 'volume24h' | 'change24h' | 'liquidityUsd') => market[t.mint_address]?.[k] ?? -1e12;
    if (sort === 'volume') return [...list].sort((a, b) => v(b, 'volume24h') - v(a, 'volume24h'));
    if (sort === 'change') return [...list].sort((a, b) => v(b, 'change24h') - v(a, 'change24h'));
    if (sort === 'liquidity') return [...list].sort((a, b) => v(b, 'liquidityUsd') - v(a, 'liquidityUsd'));
    return list;
  }, [tokens, market, q, sort]);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Store className="w-6 h-6 text-primary" /><span className="gradient-text">Market</span></h1>
          <p className="text-muted-foreground text-sm">Every SolForge token with a live Raydium pool. Prices update every minute.</p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value.slice(0, 64))} placeholder="Search name, symbol or mint…" className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-muted border border-border text-sm" />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="px-4 py-2.5 rounded-lg bg-muted border border-border text-sm">
            <option value="volume">Top volume</option>
            <option value="change">Top gainers (24h)</option>
            <option value="liquidity">Most liquidity</option>
            <option value="new">Newest</option>
          </select>
        </div>

        {loading ? (
          <div className="glass p-12 text-center"><Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="glass p-12 text-center">
            <Droplets className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold mb-2">{tokens.length ? 'No matches' : 'No live pools yet'}</h3>
            <p className="text-muted-foreground text-sm mb-6">{tokens.length ? 'Try a different search.' : 'Tokens appear here once their Raydium pool is created.'}</p>
            {!tokens.length && <Link to="/liquidity" className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground font-semibold">Create a pool</Link>}
          </div>
        ) : (
          <div className="glass overflow-hidden">
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-border text-xs text-muted-foreground font-medium">
              <span>Token</span><span className="text-right">Price</span><span className="text-right">24h</span><span className="text-right">Volume 24h</span><span className="text-right">Liquidity</span><span className="w-24" />
            </div>
            {rows.map((t) => {
              const m = market[t.mint_address];
              const p = m?.priceUsd ?? prices[t.mint_address]?.usdPrice;
              const ch = m?.change24h ?? prices[t.mint_address]?.priceChange24h;
              return (
                <div key={t.id} className="grid grid-cols-[1fr_auto] md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 border-b border-border/50 items-center">
                  <Link to={`/token/${t.id}`} className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0 overflow-hidden">
                      {t.logo_url ? <img src={t.logo_url} alt="" className="w-full h-full object-cover" /> : t.symbol.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{t.name}{t.is_featured && <span className="ml-2 px-1.5 py-0.5 rounded bg-accent/20 text-accent text-[10px]">Featured</span>}</div>
                      <div className="text-xs text-muted-foreground">${t.symbol}<span className="md:hidden"> · {p != null ? formatUsd(p) : '—'}{ch != null && <span className={ch >= 0 ? ' text-neon-green' : ' text-destructive'}> {ch >= 0 ? '+' : ''}{ch.toFixed(1)}%</span>}</span></div>
                    </div>
                  </Link>
                  <span className="hidden md:block text-right text-sm font-medium">{p != null ? formatUsd(p) : '—'}</span>
                  <span className={`hidden md:block text-right text-sm font-semibold ${ch == null ? 'text-muted-foreground' : ch >= 0 ? 'text-neon-green' : 'text-destructive'}`}>{ch != null ? `${ch >= 0 ? '+' : ''}${ch.toFixed(1)}%` : '—'}</span>
                  <span className="hidden md:block text-right text-sm text-muted-foreground">{m ? `$${Math.round(m.volume24h).toLocaleString()}` : '—'}
                    {m && <span className="block text-[11px]"><span className="text-neon-green">{m.buys24h} buys</span> · <span className="text-destructive">{m.sells24h} sells</span></span>}</span>
                  <span className="hidden md:block text-right text-sm text-muted-foreground">{m ? `$${Math.round(m.liquidityUsd).toLocaleString()}` : '—'}</span>
                  <div className="flex items-center gap-2 justify-end w-24">
                    <Link to={`/token/${t.id}`} className="px-3 py-1.5 rounded-lg glass text-xs hover:bg-muted/60">View</Link>
                    <a href={m?.pairUrl || `https://solscan.io/account/${t.pool_address}`} target="_blank" rel="noopener noreferrer" aria-label="Open chart" className="p-1.5 rounded-lg glass hover:bg-muted/60"><ExternalLink className="w-3.5 h-3.5" /></a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">"—" means the pool is new and market data hasn't been published yet (usually a few minutes after the first trade).</p>
      </div>
    </div>
  );
}
