import { useCallback, useEffect, useState } from 'react';
import { LineChart as LineIcon, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

type Range = '1H' | '24H' | '7D' | '30D';
const RANGES: Record<Range, { tf: string; agg: number; limit: number }> = {
  '1H': { tf: 'minute', agg: 1, limit: 60 },
  '24H': { tf: 'minute', agg: 15, limit: 96 },
  '7D': { tf: 'hour', agg: 1, limit: 168 },
  '30D': { tf: 'hour', agg: 4, limit: 180 },
};

const fmt = (n: number) => (n >= 1 ? n.toFixed(2) : n >= 0.0001 ? n.toFixed(6) : n.toExponential(2));

/** Pool price history (USD) from GeckoTerminal's public OHLCV feed for the Raydium pool. */
export function PriceChart({ pool }: { pool: string | null }) {
  const real = pool && !pool.startsWith('pool_') ? pool : null;
  const [range, setRange] = useState<Range>('24H');
  const [data, setData] = useState<{ t: number; p: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!real) return;
    setLoading(true); setErr(null);
    try {
      const r = RANGES[range];
      const res = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${real}/ohlcv/${r.tf}?aggregate=${r.agg}&limit=${r.limit}&currency=usd`);
      if (res.status === 404) { setData([]); setErr('Chart data appears a few minutes after the first trade.'); return; }
      if (!res.ok) throw new Error();
      const j = await res.json();
      const list: number[][] = j?.data?.attributes?.ohlcv_list || [];
      setData(list.map((c) => ({ t: c[0] * 1000, p: c[4] })).reverse());
      if (!list.length) setErr('No trades in this period yet.');
    } catch { setErr('Could not load chart. Try refresh.'); }
    finally { setLoading(false); }
  }, [real, range]);

  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, [load]);
  if (!real) return null;

  const first = data[0]?.p, last = data[data.length - 1]?.p;
  const change = first && last ? ((last - first) / first) * 100 : null;
  const up = (change ?? 0) >= 0;
  const color = up ? 'hsl(var(--neon-green, 142 76% 45%))' : 'hsl(var(--destructive))';

  return (
    <div className="glass p-5 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2"><LineIcon className="w-4 h-4" /> Price chart</h3>
          {last != null && (
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold">${fmt(last)}</span>
              {change != null && <span className={`text-sm ${up ? 'text-neon-green' : 'text-destructive'}`}>{up ? '+' : ''}{change.toFixed(2)}% ({range})</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(Object.keys(RANGES) as Range[]).map((k) => (
            <button key={k} onClick={() => setRange(k)} className={`px-2.5 py-1 rounded-md text-xs font-medium ${range === k ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{k}</button>
          ))}
          <button onClick={load} disabled={loading} aria-label="Refresh chart" className="p-1.5 rounded-lg glass hover:bg-muted/60 disabled:opacity-50 ml-1">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <div className="h-56">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pc-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false}
                tickFormatter={(t) => (range === '1H' || range === '24H' ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' }))} />
              <YAxis dataKey="p" domain={['auto', 'auto']} width={70} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${fmt(v)}`} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                labelFormatter={(t) => new Date(t as number).toLocaleString()} formatter={(v: number) => [`$${fmt(v)}`, 'Price']} />
              <Area type="monotone" dataKey="p" stroke={color} strokeWidth={2} fill="url(#pc-fill)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">{loading ? 'Loading chart…' : err || 'Not enough trades to draw a chart yet.'}</div>
        )}
      </div>
    </div>
  );
}
