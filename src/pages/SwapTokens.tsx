import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownUp, Settings, ChevronDown, Loader2, Info, ExternalLink } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

/**
 * Devnet-native swap.
 *
 * Solana devnet has no real DEX liquidity (Jupiter is mainnet-only, Raydium /
 * Orca devnet pools are empty for platform-launched tokens). So instead of
 * routing through an aggregator, this page swaps against the app's own
 * `liquidity_pools` rows using a constant-product (x*y=k) curve.
 *
 * It's a SIMULATED swap — no tokens move on-chain — but it uses real reserves
 * from the database, applies slippage + a 0.3% pool fee, and records a SWAP
 * row in `transactions` so portfolio/history reflect the trade. This works for
 * every platform token, on devnet, with the wallet the user already connected.
 */

type TokenOpt = {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  icon?: string;
  // Pool reserves vs SOL (null for SOL itself)
  poolSol?: number;
  poolToken?: number;
  tokenId?: string;
};

const SOL: TokenOpt = {
  symbol: 'SOL',
  name: 'Solana (devnet)',
  mint: 'So11111111111111111111111111111111111111112',
  decimals: 9,
  icon: '◎',
};

const FEE_BPS = 30; // 0.30% pool fee

function quoteCP(amountIn: number, reserveIn: number, reserveOut: number) {
  if (amountIn <= 0 || reserveIn <= 0 || reserveOut <= 0) return { out: 0, impact: 0 };
  const amountInAfterFee = amountIn * (1 - FEE_BPS / 10_000);
  const out = (amountInAfterFee * reserveOut) / (reserveIn + amountInAfterFee);
  const spotPrice = reserveOut / reserveIn;
  const execPrice = out / amountIn;
  const impact = Math.max(0, (spotPrice - execPrice) / spotPrice) * 100;
  return { out, impact };
}

export default function SwapTokens() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const connection = useMemo(
    () => new Connection('https://api.devnet.solana.com', { commitment: 'confirmed' }),
    []
  );

  const [tokenList, setTokenList] = useState<TokenOpt[]>([SOL]);
  const [fromToken, setFromToken] = useState<TokenOpt>(SOL);
  const [toToken, setToToken] = useState<TokenOpt | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);
  const [showPicker, setShowPicker] = useState<'from' | 'to' | null>(null);

  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [lastSwap, setLastSwap] = useState<{ id: string; out: number; symbol: string } | null>(null);

  // Load platform tokens that have a pool with reserves
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
      if (poolByToken.size === 0) {
        setTokenList([SOL]);
        return;
      }
      const { data: tokens } = await supabase
        .from('tokens')
        .select('id,name,symbol,mint_address,decimals,logo_url')
        .in('id', Array.from(poolByToken.keys()));
      const opts: TokenOpt[] = (tokens ?? [])
        .filter((t) => t.mint_address)
        .map((t) => {
          const p = poolByToken.get(t.id)!;
          return {
            symbol: t.symbol,
            name: t.name,
            mint: t.mint_address as string,
            decimals: t.decimals ?? 9,
            icon: t.logo_url ?? undefined,
            poolSol: p.sol,
            poolToken: p.tok,
            tokenId: t.id,
          };
        });
      setTokenList([SOL, ...opts]);
      if (!toToken && opts.length > 0) setToToken(opts[0]);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [connected, publicKey, connection, lastSwap]);

  // Quote
  const { outAmount, priceImpact, minReceived, unsupported } = useMemo(() => {
    if (!toToken) return { outAmount: 0, priceImpact: 0, minReceived: 0, unsupported: false };
    const amt = Number(fromAmount);
    if (!amt || amt <= 0) return { outAmount: 0, priceImpact: 0, minReceived: 0, unsupported: false };
    // Determine which side is the platform token
    const sellingSol = fromToken.symbol === 'SOL';
    const buyingSol = toToken.symbol === 'SOL';
    if (sellingSol && buyingSol) return { outAmount: 0, priceImpact: 0, minReceived: 0, unsupported: true };
    if (!sellingSol && !buyingSol)
      // token -> token via SOL is unsupported in this simple model
      return { outAmount: 0, priceImpact: 0, minReceived: 0, unsupported: true };

    if (sellingSol && toToken.poolSol && toToken.poolToken) {
      const q = quoteCP(amt, toToken.poolSol, toToken.poolToken);
      const slip = 1 - Number(slippage || '0.5') / 100;
      return { outAmount: q.out, priceImpact: q.impact, minReceived: q.out * slip, unsupported: false };
    }
    if (buyingSol && fromToken.poolSol && fromToken.poolToken) {
      const q = quoteCP(amt, fromToken.poolToken, fromToken.poolSol);
      const slip = 1 - Number(slippage || '0.5') / 100;
      return { outAmount: q.out, priceImpact: q.impact, minReceived: q.out * slip, unsupported: false };
    }
    return { outAmount: 0, priceImpact: 0, minReceived: 0, unsupported: true };
  }, [fromAmount, fromToken, toToken, slippage]);

  const rate = useMemo(() => {
    const a = Number(fromAmount);
    if (!a || !outAmount) return null;
    return (outAmount / a).toFixed(6);
  }, [fromAmount, outAmount]);

  const handleSwapDirection = () => {
    if (!toToken) return;
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount('');
  };

  const handleSwap = useCallback(async () => {
    if (!connected || !publicKey) return setVisible(true);
    if (!toToken || outAmount <= 0 || unsupported) {
      toast.error('No route available for this pair');
      return;
    }
    if (fromToken.symbol === 'SOL' && solBalance !== null && Number(fromAmount) > solBalance) {
      toast.error('Insufficient SOL balance');
      return;
    }
    setSwapping(true);
    try {
      const tokenId =
        fromToken.symbol === 'SOL' ? toToken.tokenId : fromToken.tokenId;
      const { data: row, error } = await supabase
        .from('transactions')
        .insert({
          user_wallet: publicKey.toBase58(),
          token_id: tokenId,
          type: 'SWAP',
          amount: Number(fromAmount),
          status: 'simulated',
        })
        .select('id')
        .single();
      if (error) throw error;

      setLastSwap({
        id: row.id,
        out: outAmount,
        symbol: toToken.symbol,
      });
      toast.success('Devnet swap simulated', {
        description: `Received ~${outAmount.toFixed(6)} ${fromToken.symbol === 'SOL' ? toToken.symbol : 'SOL'}`,
      });
      setFromAmount('');
    } catch (e: any) {
      console.error(e);
      toast.error('Swap failed', { description: e?.message?.slice(0, 140) ?? '' });
    } finally {
      setSwapping(false);
    }
  }, [connected, publicKey, fromToken, toToken, fromAmount, outAmount, unsupported, solBalance, setVisible]);

  const insufficient =
    fromToken.symbol === 'SOL' &&
    solBalance !== null &&
    Number(fromAmount) > 0 &&
    Number(fromAmount) > solBalance;

  const canSwap = connected && !!toToken && outAmount > 0 && !unsupported && !insufficient && !swapping;

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
          <p className="text-muted-foreground text-sm">Trade against platform liquidity pools on devnet</p>
        </motion.div>

        <div className="mb-4 flex items-start gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
          <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <span>
            <strong className="text-foreground">Devnet simulation.</strong> Swaps are priced from
            on-platform pool reserves using a constant-product curve (0.30% fee) and recorded to
            your transaction history. No tokens move on-chain — devnet has no real DEX liquidity.
          </span>
        </div>

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
                {fromToken.symbol === 'SOL' && solBalance !== null ? `Balance: ${solBalance.toFixed(4)}` : ''}
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
                {outAmount > 0 ? outAmount.toFixed(6) : '0.00'}
              </div>
              <TokenButton token={toToken} side="to" />
            </div>
          </div>

          {outAmount > 0 && rate && (
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>Rate</span><span>1 {fromToken.symbol} ≈ {rate} {toToken?.symbol}</span></div>
              <div className="flex justify-between"><span>Price impact</span><span>{priceImpact.toFixed(4)}%</span></div>
              <div className="flex justify-between"><span>Min received</span><span>{minReceived.toFixed(6)} {toToken?.symbol}</span></div>
              <div className="flex justify-between"><span>Pool fee</span><span>0.30%</span></div>
            </div>
          )}

          {unsupported && Number(fromAmount) > 0 && (
            <p className="mt-3 text-xs text-destructive">
              No route: only SOL ↔ platform-token pairs are supported on devnet.
            </p>
          )}
          {insufficient && (
            <p className="mt-3 text-xs text-destructive">Insufficient {fromToken.symbol} balance</p>
          )}

          <button
            onClick={handleSwap}
            disabled={connected && !canSwap}
            className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground font-semibold neon-glow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!connected
              ? 'Connect Wallet to Swap'
              : swapping
              ? (<><Loader2 className="w-4 h-4 animate-spin" /> Swapping…</>)
              : !toToken
              ? 'Select a token'
              : outAmount <= 0
              ? 'Enter an amount'
              : 'Swap'}
          </button>

          {lastSwap && (
            <div className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground">
              Last swap: ~{lastSwap.out.toFixed(6)} {lastSwap.symbol}
              <a href="/portfolio" className="ml-1 text-primary hover:underline inline-flex items-center gap-1">
                view history <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </motion.div>

        {showPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowPicker(null)}>
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <div className="glass relative z-10 w-full max-w-sm p-4 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-semibold mb-3">Select a token</h3>
              {tokenList.length <= 1 ? (
                <p className="text-xs text-muted-foreground">
                  No platform tokens with liquidity yet. Create one and add liquidity to enable swaps.
                </p>
              ) : (
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
                        <div className="text-sm font-medium">{t.symbol}</div>
                        <div className="text-xs text-muted-foreground truncate">{t.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
