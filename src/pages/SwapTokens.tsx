import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownUp, Settings, ChevronDown, Loader2, Info, ExternalLink, ShieldCheck, FlaskConical } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  executeOrcaDevnetSwap,
  DEVNET_USDC,
  DEVNET_WSOL,
  type OrcaSwapResult,
} from '@/lib/orcaDevnetSwap';

/**
 * Devnet swap page with TWO routes:
 *
 * 1) REAL on-chain — only for SOL ↔ devUSDC, executed through Orca Whirlpools
 *    on Solana devnet (the only liquid devnet pair that actually exists).
 *
 * 2) SIMULATION — for any platform-launched token. Solana devnet has no real
 *    DEX liquidity for platform tokens, so we price them off the app's own
 *    `liquidity_pools` rows using a constant-product (x*y=k) curve with a
 *    0.30% pool fee. No tokens move on-chain.
 *
 * Both routes write a full receipt to `transactions` (with `is_simulated` set
 * appropriately and the input/output, price, slippage, impact, and any
 * on-chain signature stored in `metadata`).
 */

type TokenOpt = {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  icon?: string;
  // Pool reserves vs SOL (only for platform tokens)
  poolSol?: number;
  poolToken?: number;
  tokenId?: string;
  isDevUsdc?: boolean;
  isSol?: boolean;
};

const SOL: TokenOpt = {
  symbol: 'SOL',
  name: 'Solana (devnet)',
  mint: DEVNET_WSOL.toBase58(),
  decimals: 9,
  icon: '◎',
  isSol: true,
};

const DEV_USDC: TokenOpt = {
  symbol: 'devUSDC',
  name: 'Devnet USDC (Orca)',
  mint: DEVNET_USDC.toBase58(),
  decimals: 6,
  icon: '$',
  isDevUsdc: true,
};

const FEE_BPS = 30; // 0.30% pool fee for the simulation curve

function quoteCP(amountIn: number, reserveIn: number, reserveOut: number) {
  if (amountIn <= 0 || reserveIn <= 0 || reserveOut <= 0) return { out: 0, impact: 0 };
  const amountInAfterFee = amountIn * (1 - FEE_BPS / 10_000);
  const out = (amountInAfterFee * reserveOut) / (reserveIn + amountInAfterFee);
  const spotPrice = reserveOut / reserveIn;
  const execPrice = out / amountIn;
  const impact = Math.max(0, (spotPrice - execPrice) / spotPrice) * 100;
  return { out, impact };
}

type Receipt = {
  id: string;
  isSimulated: boolean;
  inSymbol: string;
  outSymbol: string;
  inAmount: number;
  outAmount: number;
  minReceived: number;
  priceImpact: number;
  slippage: number;
  signature?: string;
  whirlpool?: string;
};

export default function SwapTokens() {
  const wallet = useWallet();
  const { connected, publicKey } = wallet;
  const { setVisible } = useWalletModal();
  const { user } = useAuth();
  const navigate = useNavigate();
  const connection = useMemo(
    () =>
      new Connection(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rpc-proxy`,
        {
          commitment: 'confirmed',
          httpHeaders: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      ),
    []
  );

  const [tokenList, setTokenList] = useState<TokenOpt[]>([SOL, DEV_USDC]);
  const [fromToken, setFromToken] = useState<TokenOpt>(SOL);
  const [toToken, setToToken] = useState<TokenOpt | null>(DEV_USDC);
  const [fromAmount, setFromAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);
  const [showPicker, setShowPicker] = useState<'from' | 'to' | null>(null);

  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [history, setHistory] = useState<Receipt[]>([]);

  // Identify the active route
  const isOrcaRoute = useMemo(() => {
    if (!toToken) return false;
    return (
      (fromToken.isSol && toToken.isDevUsdc) ||
      (fromToken.isDevUsdc && toToken.isSol)
    );
  }, [fromToken, toToken]);

  // Load platform tokens that have a pool with reserves (for simulation)
  useEffect(() => {
    (async () => {
      const { data: pools } = await supabase
        .from('liquidity_pools')
        .select('token_id, sol_amount, token_amount');
      const poolByToken = new Map<string, { sol: number; tok: number }>();
      (pools ?? []).forEach((p) => {
        const sol = Number(p.sol_amount) || 0;
        const tok = Number(p.token_amount) || 0;
        if (sol > 0 && tok > 0) poolByToken.set(p.token_id as string, { sol, tok });
      });
      const platformOpts: TokenOpt[] = [];
      if (poolByToken.size > 0) {
        const { data: tokens } = await supabase
          .from('tokens')
          .select('id,name,symbol,mint_address,decimals,logo_url')
          .in('id', Array.from(poolByToken.keys()));
        (tokens ?? [])
          .filter((t) => t.mint_address)
          .forEach((t) => {
            const p = poolByToken.get(t.id)!;
            platformOpts.push({
              symbol: t.symbol,
              name: t.name,
              mint: t.mint_address as string,
              decimals: t.decimals ?? 9,
              icon: t.logo_url ?? undefined,
              poolSol: p.sol,
              poolToken: p.tok,
              tokenId: t.id,
            });
          });
      }
      setTokenList([SOL, DEV_USDC, ...platformOpts]);
    })();
  }, []);

  // SOL balance
  useEffect(() => {
    if (!connected || !publicKey) return setSolBalance(null);
    let cancelled = false;
    connection
      .getBalance(publicKey)
      .then((l) => !cancelled && setSolBalance(l / LAMPORTS_PER_SOL))
      .catch(() => !cancelled && setSolBalance(null));
    return () => {
      cancelled = true;
    };
  }, [connected, publicKey, connection, receipt]);

  // Load recent swap history for the connected wallet
  const loadHistory = useCallback(async () => {
    if (!publicKey) return setHistory([]);
    const { data } = await supabase
      .from('transactions')
      .select('id, is_simulated, metadata, created_at')
      .eq('user_wallet', publicKey.toBase58())
      .eq('type', 'SWAP')
      .order('created_at', { ascending: false })
      .limit(8);
    const rows: Receipt[] = (data ?? []).map((r: any) => ({
      id: r.id,
      isSimulated: !!r.is_simulated,
      inSymbol: r.metadata?.inSymbol ?? '?',
      outSymbol: r.metadata?.outSymbol ?? '?',
      inAmount: Number(r.metadata?.inAmount) || 0,
      outAmount: Number(r.metadata?.outAmount) || 0,
      minReceived: Number(r.metadata?.minReceived) || 0,
      priceImpact: Number(r.metadata?.priceImpact) || 0,
      slippage: Number(r.metadata?.slippage) || 0,
      signature: r.metadata?.signature,
      whirlpool: r.metadata?.whirlpool,
    }));
    setHistory(rows);
  }, [publicKey]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory, receipt]);

  // Quote (simulation only; Orca quote is built at execution time)
  const { outAmount, priceImpact, minReceived, unsupported } = useMemo(() => {
    if (!toToken) return { outAmount: 0, priceImpact: 0, minReceived: 0, unsupported: false };
    const amt = Number(fromAmount);
    if (!amt || amt <= 0) return { outAmount: 0, priceImpact: 0, minReceived: 0, unsupported: false };
    if (isOrcaRoute) {
      // Orca quote happens at execution; show a rough sentinel.
      return { outAmount: NaN, priceImpact: 0, minReceived: 0, unsupported: false };
    }
    const sellingSol = fromToken.isSol;
    const buyingSol = toToken.isSol;
    if (sellingSol && buyingSol) return { outAmount: 0, priceImpact: 0, minReceived: 0, unsupported: true };
    if (!sellingSol && !buyingSol)
      return { outAmount: 0, priceImpact: 0, minReceived: 0, unsupported: true };
    const slip = 1 - Number(slippage || '0.5') / 100;
    if (sellingSol && toToken.poolSol && toToken.poolToken) {
      const q = quoteCP(amt, toToken.poolSol, toToken.poolToken);
      return { outAmount: q.out, priceImpact: q.impact, minReceived: q.out * slip, unsupported: false };
    }
    if (buyingSol && fromToken.poolSol && fromToken.poolToken) {
      const q = quoteCP(amt, fromToken.poolToken, fromToken.poolSol);
      return { outAmount: q.out, priceImpact: q.impact, minReceived: q.out * slip, unsupported: false };
    }
    return { outAmount: 0, priceImpact: 0, minReceived: 0, unsupported: true };
  }, [fromAmount, fromToken, toToken, slippage, isOrcaRoute]);

  const rate = useMemo(() => {
    const a = Number(fromAmount);
    if (!a || !outAmount || Number.isNaN(outAmount)) return null;
    return (outAmount / a).toFixed(6);
  }, [fromAmount, outAmount]);

  const handleSwapDirection = () => {
    if (!toToken) return;
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount('');
  };

  const recordReceipt = useCallback(
    async (r: Omit<Receipt, 'id'> & { tokenId?: string | null }) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_wallet: publicKey!.toBase58(),
          token_id: r.tokenId ?? null,
          type: 'SWAP',
          amount: r.inAmount,
          status: r.isSimulated ? 'simulated' : 'confirmed',
          tx_hash: r.signature ?? null,
          is_simulated: r.isSimulated,
          metadata: {
            inSymbol: r.inSymbol,
            outSymbol: r.outSymbol,
            inAmount: r.inAmount,
            outAmount: r.outAmount,
            minReceived: r.minReceived,
            priceImpact: r.priceImpact,
            slippage: r.slippage,
            route: r.isSimulated ? 'simulated-cp' : 'orca-whirlpools-devnet',
            signature: r.signature,
            whirlpool: r.whirlpool,
          },
        })
        .select('id')
        .single();
      if (error) throw error;
      setReceipt({ id: data.id, ...r });
    },
    [publicKey]
  );

  const handleSwap = useCallback(async () => {
    if (!user) {
      toast.error('Sign in before swapping so receipts can be saved');
      navigate('/auth');
      return;
    }
    if (!connected || !publicKey) return setVisible(true);
    if (!toToken) {
      toast.error('Pick a token to receive');
      return;
    }
    const amt = Number(fromAmount);
    if (!amt || amt <= 0) {
      toast.error('Enter an amount');
      return;
    }
    if (fromToken.isSol && solBalance !== null && amt > solBalance) {
      toast.error('Insufficient SOL balance');
      return;
    }

    setSwapping(true);
    try {
      if (isOrcaRoute) {
        // REAL on-chain Orca devnet swap
        const slippageBps = Math.max(1, Math.round(Number(slippage || '0.5') * 100));
        const res: OrcaSwapResult = await executeOrcaDevnetSwap({
          connection,
          wallet,
          inputMint: new PublicKey(fromToken.mint),
          outputMint: new PublicKey(toToken.mint),
          amountInUi: amt,
          slippageBps,
        });
        await recordReceipt({
          isSimulated: false,
          inSymbol: fromToken.symbol,
          outSymbol: toToken.symbol,
          inAmount: amt,
          outAmount: res.estOutUi,
          minReceived: res.minOutUi,
          priceImpact: res.priceImpactPct,
          slippage: slippageBps / 100,
          signature: res.signature,
          whirlpool: res.whirlpool,
          tokenId: null,
        });
        toast.success('On-chain swap confirmed', {
          description: `~${res.estOutUi.toFixed(6)} ${toToken.symbol} via Orca devnet`,
        });
      } else {
        if (unsupported || !outAmount || Number.isNaN(outAmount)) {
          toast.error('No route available for this pair');
          return;
        }
        const tokenId = fromToken.isSol ? toToken.tokenId : fromToken.tokenId;
        await recordReceipt({
          isSimulated: true,
          inSymbol: fromToken.symbol,
          outSymbol: toToken.symbol,
          inAmount: amt,
          outAmount,
          minReceived,
          priceImpact,
          slippage: Number(slippage || '0.5'),
          tokenId: tokenId ?? null,
        });
        toast.success('Devnet swap simulated', {
          description: `~${outAmount.toFixed(6)} ${toToken.symbol} (internal curve)`,
        });
      }
      setFromAmount('');
    } catch (e: any) {
      console.error(e);
      toast.error('Swap failed', { description: e?.message?.slice(0, 180) ?? '' });
    } finally {
      setSwapping(false);
    }
  }, [
    user, navigate, connected, publicKey, fromToken, toToken, fromAmount, solBalance,
    isOrcaRoute, slippage, connection, wallet, recordReceipt,
    unsupported, outAmount, minReceived, priceImpact, setVisible,
  ]);

  const insufficient =
    fromToken.isSol && solBalance !== null && Number(fromAmount) > 0 && Number(fromAmount) > solBalance;

  const canSwap =
    !!user &&
    connected &&
    !!toToken &&
    !insufficient &&
    !swapping &&
    (isOrcaRoute ? Number(fromAmount) > 0 : outAmount > 0 && !unsupported);

  const TokenButton = ({ token, side }: { token: TokenOpt | null; side: 'from' | 'to' }) => (
    <button
      onClick={() => setShowPicker(side)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium"
    >
      {token ? (
        <>
          {token.icon && /^https?:/.test(token.icon) ? (
            <img src={token.icon} alt="" className="w-4 h-4 rounded-full" />
          ) : (
            <span>{token.icon ?? '•'}</span>
          )}
          <span>{token.symbol}</span>
        </>
      ) : (
        <span className="text-muted-foreground">Select</span>
      )}
      <ChevronDown className="w-3 h-3" />
    </button>
  );

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-md mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <h1 className="font-display text-2xl font-bold mb-2">
            <span className="gradient-text">Swap Tokens</span>
          </h1>
          <p className="text-muted-foreground text-sm">Devnet: real Orca route for SOL ↔ devUSDC, simulated curve for platform tokens</p>
        </motion.div>

        {/* Route banner */}
        {isOrcaRoute ? (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span className="text-foreground/90">
              <strong className="text-emerald-400">Real on-chain swap.</strong>{' '}
              This trade executes against the Orca Whirlpools <code>SOL/devUSDC</code> pool on
              Solana <strong>devnet</strong>. Tokens actually move and a real transaction signature
              is recorded.
            </span>
          </div>
        ) : (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs">
            <FlaskConical className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <span className="text-foreground/90">
              <strong className="text-amber-400">Devnet simulation.</strong>{' '}
              Solana devnet has no real liquidity for platform-launched tokens, so this pair is
              priced from the app's own pool reserves using a constant-product curve (0.30% fee).
              No tokens move on-chain — the trade is recorded to your history for testing.
            </span>
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-5 relative">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Swap</span>
            <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {showSettings && (
            <div className="mb-4 glass p-3 rounded-lg">
              <label className="text-xs text-muted-foreground mb-1.5 block">Slippage Tolerance</label>
              <div className="flex items-center gap-2">
                {['0.1', '0.5', '1.0'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlippage(s)}
                    className={`px-3 py-1 rounded text-xs font-medium ${slippage === s ? 'bg-neon-purple/20 text-neon-purple' : 'bg-muted text-muted-foreground'}`}
                  >
                    {s}%
                  </button>
                ))}
                <input
                  type="number"
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  className="w-16 px-2 py-1 rounded bg-muted border border-border text-xs text-right"
                  placeholder="Custom"
                />
              </div>
            </div>
          )}

          {/* From */}
          <div className="glass p-4 rounded-lg mb-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">From</span>
              <span className="text-xs text-muted-foreground">
                {fromToken.isSol && solBalance !== null ? `Balance: ${solBalance.toFixed(4)}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-xl font-display font-bold focus:outline-none placeholder:text-muted-foreground"
              />
              <TokenButton token={fromToken} side="from" />
            </div>
          </div>

          <div className="flex justify-center -my-3 relative z-10">
            <button onClick={handleSwapDirection} className="w-8 h-8 rounded-lg glass flex items-center justify-center text-muted-foreground hover:text-foreground hover:neon-glow transition-all">
              <ArrowDownUp className="w-4 h-4" />
            </button>
          </div>

          {/* To */}
          <div className="glass p-4 rounded-lg mt-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">To (estimated)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-xl font-display font-bold text-muted-foreground">
                {isOrcaRoute
                  ? Number(fromAmount) > 0 ? '— quoted at swap —' : '0.00'
                  : outAmount > 0 ? outAmount.toFixed(6) : '0.00'}
              </div>
              <TokenButton token={toToken} side="to" />
            </div>
          </div>

          {!isOrcaRoute && outAmount > 0 && rate && (
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>Rate</span><span>1 {fromToken.symbol} ≈ {rate} {toToken?.symbol}</span></div>
              <div className="flex justify-between"><span>Price impact</span><span>{priceImpact.toFixed(4)}%</span></div>
              <div className="flex justify-between"><span>Min received</span><span>{minReceived.toFixed(6)} {toToken?.symbol}</span></div>
              <div className="flex justify-between"><span>Pool fee</span><span>0.30%</span></div>
            </div>
          )}

          {unsupported && Number(fromAmount) > 0 && (
            <p className="mt-3 text-xs text-destructive">
              No route: only SOL ↔ platform-token (simulated) or SOL ↔ devUSDC (Orca) are supported.
            </p>
          )}
          {insufficient && (
            <p className="mt-3 text-xs text-destructive">Insufficient {fromToken.symbol} balance</p>
          )}

          <button
            onClick={handleSwap}
            disabled={!!user && connected && !canSwap}
            className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground font-semibold neon-glow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!user
              ? 'Sign in to Swap'
              : !connected
              ? 'Connect Wallet to Swap'
              : swapping
              ? (<><Loader2 className="w-4 h-4 animate-spin" /> {isOrcaRoute ? 'Swapping on Orca…' : 'Swapping…'}</>)
              : !toToken
              ? 'Select a token'
              : isOrcaRoute
              ? 'Swap on Orca (devnet)'
              : outAmount <= 0
              ? 'Enter an amount'
              : 'Simulated swap'}
          </button>
        </motion.div>

        {/* Latest receipt */}
        {receipt && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass mt-4 p-4 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Receipt</span>
              <span className={`px-2 py-0.5 rounded text-[10px] ${receipt.isSimulated ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                {receipt.isSimulated ? 'SIMULATED' : 'ON-CHAIN'}
              </span>
            </div>
            <div className="flex justify-between"><span>Paid</span><span>{receipt.inAmount} {receipt.inSymbol}</span></div>
            <div className="flex justify-between"><span>Received (est.)</span><span>{receipt.outAmount.toFixed(6)} {receipt.outSymbol}</span></div>
            <div className="flex justify-between"><span>Min received</span><span>{receipt.minReceived.toFixed(6)} {receipt.outSymbol}</span></div>
            <div className="flex justify-between"><span>Price impact</span><span>{receipt.priceImpact.toFixed(4)}%</span></div>
            <div className="flex justify-between"><span>Slippage</span><span>{receipt.slippage}%</span></div>
            {receipt.signature && (
              <div className="flex justify-between gap-2">
                <span>Signature</span>
                <a
                  href={`https://solscan.io/tx/${receipt.signature}?cluster=devnet`}
                  target="_blank" rel="noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 truncate"
                >
                  {receipt.signature.slice(0, 8)}…{receipt.signature.slice(-6)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </motion.div>
        )}

        {/* Swap history */}
        {connected && history.length > 0 && (
          <div className="glass mt-4 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">Recent swaps</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" /> devnet only
              </span>
            </div>
            <div className="space-y-1">
              {history.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] ${r.isSimulated ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                      {r.isSimulated ? 'SIM' : 'LIVE'}
                    </span>
                    <span>
                      {r.inAmount} {r.inSymbol} → {r.outAmount.toFixed(4)} {r.outSymbol}
                    </span>
                  </div>
                  {r.signature ? (
                    <a
                      href={`https://solscan.io/tx/${r.signature}?cluster=devnet`}
                      target="_blank" rel="noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      tx <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {showPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowPicker(null)}>
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <div className="glass relative z-10 w-full max-w-sm p-4 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-semibold mb-3">Select a token</h3>
              <div className="space-y-1">
                {tokenList.map((t) => (
                  <button
                    key={t.mint}
                    onClick={() => {
                      if (showPicker === 'from') {
                        if (toToken && t.mint === toToken.mint) setToToken(fromToken);
                        setFromToken(t);
                      } else {
                        if (t.mint === fromToken.mint) setFromToken(toToken ?? SOL);
                        setToToken(t);
                      }
                      setShowPicker(null);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted text-left"
                  >
                    {t.icon && /^https?:/.test(t.icon) ? (
                      <img src={t.icon} alt="" className="w-6 h-6 rounded-full" />
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">{t.icon ?? t.symbol[0]}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium flex items-center gap-2">
                        {t.symbol}
                        {(t.isSol || t.isDevUsdc) && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Orca</span>
                        )}
                        {!t.isSol && !t.isDevUsdc && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">Sim</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{t.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
