import { RefreshCw, ExternalLink, Activity } from 'lucide-react';
import { useRecentTrades } from '@/hooks/useRecentTrades';

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
const ago = (t: number | null) => {
  if (!t) return '';
  const s = Math.max(0, Math.floor(Date.now() / 1000 - t));
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`;
};

export function RecentTrades({ pool, mint, symbol }: { pool: string | null; mint: string | null; symbol: string }) {
  const real = pool && !pool.startsWith('pool_') ? pool : null;
  const { trades, loading, refresh } = useRecentTrades(real, mint);
  if (!real) return null;

  return (
    <div className="glass p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Activity className="w-4 h-4" /> Recent trades (on-chain)</h3>
        <button onClick={refresh} disabled={loading} aria-label="Refresh trades" className="p-1.5 rounded-lg glass hover:bg-muted/60 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {trades.length === 0 ? (
        <p className="text-sm text-muted-foreground">{loading ? 'Reading trades from the blockchain…' : 'No trades yet.'}</p>
      ) : (
        <div className="space-y-1 text-sm">
          {trades.map((t) => (
            <a key={t.signature} href={`https://solscan.io/tx/${t.signature}`} target="_blank" rel="noopener noreferrer"
              className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[60px_1fr_1fr_1fr_auto] gap-3 items-center px-2 py-1.5 rounded hover:bg-muted/40">
              <span className={`text-xs font-semibold ${t.side === 'buy' ? 'text-neon-green' : 'text-destructive'}`}>{t.side === 'buy' ? 'BUY' : 'SELL'}</span>
              <span className="font-mono text-xs">{short(t.wallet)}</span>
              <span className="hidden sm:block text-right">{t.tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {symbol}</span>
              <span className="hidden sm:block text-right text-muted-foreground">{t.solAmount.toFixed(4)} SOL</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1 justify-end">{ago(t.time)} <ExternalLink className="w-3 h-3" /></span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
