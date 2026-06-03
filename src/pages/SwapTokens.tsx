import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownUp, Settings, ChevronDown, Loader2, ExternalLink } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PublicKey, VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Jupiter aggregator (mainnet). Works for any SPL token with on-chain liquidity.
const JUP_QUOTE = 'https://lite-api.jup.ag/swap/v1/quote';
const JUP_SWAP = 'https://lite-api.jup.ag/swap/v1/swap';

type TokenOpt = {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  icon?: string;
};

const SOL: TokenOpt = {
  symbol: 'SOL',
  name: 'Solana',
  mint: 'So11111111111111111111111111111111111111112',
  decimals: 9,
  icon: '◎',
};
const USDC: TokenOpt = {
  symbol: 'USDC',
  name: 'USD Coin',
  mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  decimals: 6,
  icon: '$',
};

export default function SwapTokens() {
  const { connected, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [tokenList, setTokenList] = useState<TokenOpt[]>([SOL, USDC]);
  const [fromToken, setFromToken] = useState<TokenOpt>(SOL);
  const [toToken, setToToken] = useState<TokenOpt>(USDC);
  const [fromAmount, setFromAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5'); // %
  const [showSettings, setShowSettings] = useState(false);
  const [showPicker, setShowPicker] = useState<'from' | 'to' | null>(null);

  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [quote, setQuote] = useState<any>(null);
  const [quoting, setQuoting] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  // Load platform tokens so users can swap creator-launched tokens too
  useEffect(() => {
    void supabase
      .from('tokens')
      .select('name,symbol,mint_address,decimals,logo_url')
      .not('mint_address', 'is', null)
      .eq('liquidity_added', true)
      .limit(50)
      .then(({ data }) => {
        if (!data) return;
        const extra: TokenOpt[] = data
          .filter((t) => t.mint_address)
          .map((t) => ({
            symbol: t.symbol,
            name: t.name,
            mint: t.mint_address as string,
            decimals: t.decimals ?? 9,
            icon: t.logo_url ?? undefined,
          }));
        setTokenList([SOL, USDC, ...extra]);
      });
  }, []);

  // SOL balance
  useEffect(() => {
    if (!connected || !publicKey) {
      setSolBalance(null);
      return;
    }
    let cancelled = false;
    connection
      .getBalance(publicKey)
      .then((lamports) => !cancelled && setSolBalance(lamports / LAMPORTS_PER_SOL))
      .catch(() => !cancelled && setSolBalance(null));
    return () => {
      cancelled = true;
    };
  }, [connected, publicKey, connection, lastTx]);

  // Quote (debounced)
  useEffect(() => {
    setQuote(null);
    const amt = Number(fromAmount);
    if (!amt || amt <= 0 || fromToken.mint === toToken.mint) return;
    const slipBps = Math.max(1, Math.round(Number(slippage || '0.5') * 100));
    const inAmount = Math.floor(amt * 10 ** fromToken.decimals).toString();
    const url = `${JUP_QUOTE}?inputMint=${fromToken.mint}&outputMint=${toToken.mint}&amount=${inAmount}&slippageBps=${slipBps}&swapMode=ExactIn`;

    let cancelled = false;
    setQuoting(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(url);
        const j = await r.json();
        if (cancelled) return;
        if (!r.ok || j.error) {
          setQuote(null);
        } else {
          setQuote(j);
        }
      } catch {
        if (!cancelled) setQuote(null);
      } finally {
        if (!cancelled) setQuoting(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
      setQuoting(false);
    };
  }, [fromAmount, fromToken, toToken, slippage]);

  const estimatedOutput = useMemo(() => {
    if (!quote?.outAmount) return '0.00';
    return (Number(quote.outAmount) / 10 ** toToken.decimals).toFixed(6);
  }, [quote, toToken.decimals]);

  const rate = useMemo(() => {
    const a = Number(fromAmount);
    const o = Number(estimatedOutput);
    if (!a || !o) return null;
    return (o / a).toFixed(6);
  }, [fromAmount, estimatedOutput]);

  const handleSwapDirection = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount('');
  };

  const handleSwap = useCallback(async () => {
    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }
    if (!quote) {
      toast.error('No quote available');
      return;
    }
    if (!signTransaction) {
      toast.error('Wallet does not support signing');
      return;
    }
    setSwapping(true);
    try {
      const swapRes = await fetch(JUP_SWAP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: publicKey.toBase58(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto',
        }),
      });
      const swapJson = await swapRes.json();
      if (!swapRes.ok || !swapJson.swapTransaction) {
        throw new Error(swapJson.error || 'Failed to build swap transaction');
      }
      const txBuf = Uint8Array.from(atob(swapJson.swapTransaction), (c) => c.charCodeAt(0));
      const tx = VersionedTransaction.deserialize(txBuf);

      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      toast.success('Swap submitted', { description: sig.slice(0, 12) + '…' });

      const bh = await connection.getLatestBlockhash('confirmed');
      await connection.confirmTransaction(
        { signature: sig, blockhash: bh.blockhash, lastValidBlockHeight: bh.lastValidBlockHeight },
        'confirmed'
      );

      setLastTx(sig);
      setFromAmount('');
      setQuote(null);
      toast.success('Swap confirmed');
    } catch (e: any) {
      console.error('Swap failed:', e);
      toast.error('Swap failed', { description: e?.message?.slice(0, 140) || 'Unknown error' });
    } finally {
      setSwapping(false);
    }
  }, [connected, publicKey, signTransaction, quote, connection, setVisible]);

  const insufficient =
    fromToken.symbol === 'SOL' &&
    solBalance !== null &&
    Number(fromAmount) > 0 &&
    Number(fromAmount) > solBalance;

  const canSwap = connected && !!quote && !quoting && !swapping && !insufficient;

  const TokenButton = ({ token, side }: { token: TokenOpt; side: 'from' | 'to' }) => (
    <button
      onClick={() => setShowPicker(side)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium"
    >
      {token.icon && /^https?:/.test(token.icon) ? (
        <img src={token.icon} alt="" className="w-4 h-4 rounded-full" />
      ) : (
        <span>{token.icon ?? '•'}</span>
      )}
      <span>{token.symbol}</span>
      <ChevronDown className="w-3 h-3" />
    </button>
  );

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-md mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold mb-2">
            <span className="gradient-text">Swap Tokens</span>
          </h1>
          <p className="text-muted-foreground text-sm">Trade tokens instantly on Solana via Jupiter</p>
        </motion.div>

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
                {fromToken.symbol === 'SOL' && solBalance !== null
                  ? `Balance: ${solBalance.toFixed(4)}`
                  : ''}
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
                {quoting ? <Loader2 className="w-5 h-5 animate-spin" /> : estimatedOutput}
              </div>
              <TokenButton token={toToken} side="to" />
            </div>
          </div>

          {quote && rate && (
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>Rate</span><span>1 {fromToken.symbol} ≈ {rate} {toToken.symbol}</span></div>
              <div className="flex justify-between"><span>Price impact</span><span>{Number(quote.priceImpactPct ?? 0).toFixed(4)}%</span></div>
              <div className="flex justify-between"><span>Slippage</span><span>{slippage}%</span></div>
            </div>
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
              : quoting
              ? 'Fetching quote…'
              : !quote
              ? 'Enter an amount'
              : 'Swap'}
          </button>

          {lastTx && (
            <a
              href={`https://solscan.io/tx/${lastTx}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center justify-center gap-1 text-xs text-primary hover:underline"
            >
              View last transaction <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </motion.div>

        {/* Token picker */}
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
                        if (t.mint === toToken.mint) setToToken(fromToken);
                        setFromToken(t);
                      } else {
                        if (t.mint === fromToken.mint) setFromToken(toToken);
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
