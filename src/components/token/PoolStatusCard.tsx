import { useCallback, useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Link } from 'react-router-dom';
import { RefreshCw, Droplets, ExternalLink } from 'lucide-react';
import { getRaydiumPoolStats, type PoolStats } from '@/lib/raydiumPool';
import { useTokenPrices, formatUsd } from '@/hooks/useTokenPrices';

const SOL_MINT = 'So11111111111111111111111111111111111111112';

export function PoolStatusCard({ tokenId, mint, pool }: { tokenId: string; mint: string | null; pool: string | null }) {
  const { connection } = useConnection();
  const realPool = pool && !pool.startsWith('pool_') ? pool : null;
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);
  const prices = useTokenPrices([SOL_MINT, mint]);
  const solUsd = prices[SOL_MINT]?.usdPrice;

  const refresh = useCallback(async () => {
    if (!realPool || !mint) return;
    setLoading(true); setErr(null);
    try { setStats(await getRaydiumPoolStats(connection, realPool, mint)); setUpdated(new Date()); }
    catch (e: any) { setErr('Could not read the pool from the blockchain. Try refresh.'); console.warn(e); }
    finally { setLoading(false); }
  }, [connection, realPool, mint]);

  useEffect(() => { refresh(); }, [refresh]);

  const status = !realPool ? 'No pool' : err ? 'Unreachable' : stats ? (stats.solReserve > 0 ? 'Live' : 'Empty') : 'Checking…';
  const statusCls = status === 'Live' ? 'bg-neon-green/20 text-neon-green' : status === 'No pool' ? 'bg-muted text-muted-foreground' : 'bg-accent/20 text-accent';

  return (
    <div className="glass p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Droplets className="w-4 h-4" /> Raydium Pool</h3>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusCls}`}>{status}</span>
          {realPool && (
            <button onClick={refresh} disabled={loading} aria-label="Refresh pool" className="p-1.5 rounded-lg glass hover:bg-muted/60 disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {!realPool ? (
        <div className="text-sm text-muted-foreground">
          This token has no Raydium pool yet, so it can't be traded.{' '}
          <Link to={`/liquidity?token=${tokenId}`} className="text-primary hover:underline">Create a pool</Link>
        </div>
      ) : err ? (
        <p className="text-sm text-destructive">{err}</p>
      ) : stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Pool price</div><div className="font-semibold">{stats.priceSol.toPrecision(4)} SOL</div>
            {solUsd && <div className="text-xs text-muted-foreground">{formatUsd(stats.priceSol * solUsd)}</div>}</div>
          <div><div className="text-xs text-muted-foreground">SOL in pool</div><div className="font-semibold">{stats.solReserve.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
            {solUsd && <div className="text-xs text-muted-foreground">{formatUsd(stats.solReserve * solUsd * 2)} total liquidity</div>}</div>
          <div><div className="text-xs text-muted-foreground">Tokens in pool</div><div className="font-semibold">{stats.tokenReserve.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div></div>
          <div><div className="text-xs text-muted-foreground">Trade fee</div><div className="font-semibold">{stats.tradeFeePct}%</div></div>
        </div>
      ) : <p className="text-sm text-muted-foreground">Reading pool…</p>}

      {realPool && (
        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
          <a href={`https://raydium.io/swap/?inputMint=sol&outputMint=${mint}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">Raydium <ExternalLink className="w-3 h-3" /></a>
          <a href={`https://solscan.io/account/${realPool}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">Pool on Solscan <ExternalLink className="w-3 h-3" /></a>
          {updated && <span className="text-muted-foreground">Updated {updated.toLocaleTimeString()}</span>}
        </div>
      )}
    </div>
  );
}
