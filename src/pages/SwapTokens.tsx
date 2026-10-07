import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownUp, Loader2, ExternalLink, ChevronDown } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL, VersionedTransaction } from '@solana/web3.js';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { quoteRaydiumCpmm, swapRaydiumCpmm, type RaydiumQuote } from '@/lib/raydiumPool';

/** Mainnet swap via Jupiter aggregator (real on-chain trades). */

type TokenOpt = { symbol: string; name: string; mint: string; decimals: number; tokenId?: string; pool?: string | null };

const SOL: TokenOpt = { symbol: 'SOL', name: 'Solana', mint: 'So11111111111111111111111111111111111111112', decimals: 9 };
const USDC: TokenOpt = { symbol: 'USDC', name: 'USD Coin', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 };
const USDT: TokenOpt = { symbol: 'USDT', name: 'Tether', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 };
const JUP = 'https://lite-api.jup.ag/swap/v1';

type Quote = { outAmount: string; otherAmountThreshold: string; priceImpactPct: string; [k: string]: unknown };

export default function SwapTokens() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const { user } = useAuth();

  const [list, setList] = useState<TokenOpt[]>([SOL, USDC, USDT]);
  const [from, setFrom] = useState<TokenOpt>(SOL);
  const [to, setTo] = useState<TokenOpt>(USDC);
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [rayQuote, setRayQuote] = useState<RaydiumQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [solBal, setSolBal] = useState<number | null>(null);
  const [lastSig, setLastSig] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('tokens').select('id,name,symbol,decimals,mint_address,pool_address,liquidity_added').not('mint_address', 'is', null).limit(100)
      .then(({ data }) => {
        if (!data) return;
        setList([SOL, USDC, USDT, ...data.map((t) => ({ symbol: t.symbol, name: t.name, mint: t.mint_address!, decimals: t.decimals, tokenId: t.id, pool: t.liquidity_added && t.pool_address && !t.pool_address.startsWith('pool_') ? t.pool_address : null }))]);
      });
  }, []);

  useEffect(() => {
    if (!wallet.publicKey) { setSolBal(null); return; }
    connection.getBalance(wallet.publicKey).then((l) => setSolBal(l / LAMPORTS_PER_SOL)).catch(() => setSolBal(null));
  }, [wallet.publicKey, connection, lastSig]);

  const slippageBps = Math.round(Math.min(50, Math.max(0.1, Number(slippage) || 0.5)) * 100);
  const amountBase = useMemo(() => {
    const n = Number(amount);
    return n > 0 ? Math.floor(n * 10 ** from.decimals) : 0;
  }, [amount, from]);

  useEffect(() => {
    setQuote(null); setRayQuote(null); setQuoteErr(null);
    if (!amountBase || from.mint === to.mint) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setQuoting(true);
      try {
        const r = await fetch(`${JUP}/quote?inputMint=${from.mint}&outputMint=${to.mint}&amount=${amountBase}&slippageBps=${slippageBps}`, { signal: ctrl.signal });
        const j = await r.json();
        if (!r.ok || j.error) throw new Error(j.error || 'No route found');
        setQuote(j);
      } catch (e: any) {
        if (e.name === 'AbortError') return;
        // Fallback: quote directly against our own Raydium pool (SOL pair only)
        const platform = from.pool ? from : to.pool ? to : null;
        const other = platform === from ? to : from;
        if (platform?.pool && other.symbol === 'SOL') {
          try { setRayQuote(await quoteRaydiumCpmm(connection, platform.pool, from.mint, amountBase, slippageBps)); return; }
          catch (re: any) { console.warn('raydium quote failed', re); }
        }
        setQuoteErr(e.message?.includes('route') ? 'No trading route — this token may have no market yet.' : e.message);
      } finally { setQuoting(false); }
    }, 400);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [amountBase, from, to, slippageBps, connection]);

  const outUi = quote ? Number(quote.outAmount) / 10 ** to.decimals : rayQuote ? Number(rayQuote.outBase.toString()) / 10 ** to.decimals : 0;
  const minUi = quote ? Number(quote.otherAmountThreshold) / 10 ** to.decimals : rayQuote ? Number(rayQuote.minOutBase.toString()) / 10 ** to.decimals : 0;
  const impactPct = quote ? Number(quote.priceImpactPct) * 100 : rayQuote?.priceImpactPct ?? 0;
  const hasQuote = !!quote || !!rayQuote;
  const noPoolToken = [from, to].find((t) => t.tokenId && !t.pool);

  const doSwap = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) return setVisible(true);
    if (!quote && !rayQuote) return;
    setSwapping(true);
    try {
      let sig: string;
      if (rayQuote) {
        sig = await swapRaydiumCpmm(connection, wallet, rayQuote, slippageBps);
      } else {
      const r = await fetch(`${JUP}/swap`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteResponse: quote!, userPublicKey: wallet.publicKey.toBase58(), wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: 'auto' }),
      });
      const j = await r.json();
      if (!r.ok || !j.swapTransaction) throw new Error(j.error || 'Could not build swap');
      const tx = VersionedTransaction.deserialize(Uint8Array.from(atob(j.swapTransaction), (c) => c.charCodeAt(0)));
      const sim = await connection.simulateTransaction(tx, { sigVerify: false });
      if (sim.value.err) throw new Error('Simulation failed: ' + JSON.stringify(sim.value.err));
      const signed = await wallet.signTransaction(tx);
      sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true, maxRetries: 3 });
      }
      // HTTP polling confirmation (no websockets through proxy)
      let ok = false;
      for (let i = 0; i < 40 && !ok; i++) {
        await new Promise((res) => setTimeout(res, 1500));
        const st = (await connection.getSignatureStatuses([sig])).value[0];
        if (st?.err) throw new Error('Transaction failed on-chain');
        if (st?.confirmationStatus === 'confirmed' || st?.confirmationStatus === 'finalized') ok = true;
      }
      if (!ok) throw new Error('Not confirmed yet — check the explorer');
      setLastSig(sig);
      toast.success('Swap confirmed', { description: `~${outUi.toFixed(6)} ${to.symbol}` });
      if (user) {
        await supabase.from('transactions').insert({
          user_wallet: wallet.publicKey.toBase58(), type: 'SWAP', amount: Number(amount), tx_hash: sig,
          token_id: from.tokenId ?? to.tokenId ?? null, status: 'confirmed', is_simulated: false,
          metadata: { route: rayQuote ? 'raydium-cpmm-direct' : 'jupiter-mainnet', pool: rayQuote?.poolId ?? null, in: from.symbol, out: to.symbol, outAmount: outUi, minReceived: minUi, slippageBps, priceImpactPct: impactPct },
        });
      }
      setAmount('');
    } catch (e: any) {
      toast.error('Swap failed', { description: e.message });
    } finally { setSwapping(false); }
  };

  const Picker = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80" onClick={() => setPicker(null)}>
      <div className="glass p-4 w-full max-w-sm max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {list.map((t) => (
          <button key={t.mint} onClick={() => { picker === 'from' ? setFrom(t) : setTo(t); setPicker(null); }} className="w-full text-left p-3 rounded-lg hover:bg-muted/50">
            <div className="font-semibold text-sm">{t.symbol}</div>
            <div className="text-xs text-muted-foreground">{t.name}</div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-md mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="font-display text-2xl font-bold"><span className="gradient-text">Swap Tokens</span></h1>
          <p className="text-muted-foreground text-sm">Best price across Solana mainnet, routed by Jupiter. Real SOL is used.</p>
        </motion.div>

        <div className="glass p-5 space-y-3">
          <div className="glass p-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>You pay</span>{from.symbol === 'SOL' && solBal !== null && <span>Balance: {solBal.toFixed(4)} SOL</span>}
            </div>
            <div className="flex gap-2">
              <input type="number" min="0" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1 bg-transparent text-2xl font-semibold focus:outline-none min-w-0" />
              <button onClick={() => setPicker('from')} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-muted text-sm font-semibold">{from.symbol}<ChevronDown className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex justify-center">
            <button onClick={() => { setFrom(to); setTo(from); }} className="p-2 rounded-full bg-muted hover:bg-muted/70" aria-label="Flip"><ArrowDownUp className="w-4 h-4" /></button>
          </div>
          <div className="glass p-4">
            <div className="text-xs text-muted-foreground mb-2">You receive</div>
            <div className="flex gap-2">
              <div className="flex-1 text-2xl font-semibold truncate">{quoting ? <Loader2 className="w-5 h-5 animate-spin" /> : outUi ? outUi.toFixed(6) : '0.0'}</div>
              <button onClick={() => setPicker('to')} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-muted text-sm font-semibold">{to.symbol}<ChevronDown className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Slippage %</span>
            <input value={slippage} onChange={(e) => setSlippage(e.target.value)} className="w-16 px-2 py-1 rounded bg-muted text-right text-foreground" />
          </div>
          {hasQuote && (
            <div className="text-xs space-y-1 text-muted-foreground">
              <div className="flex justify-between"><span>Minimum received</span><span>{minUi.toFixed(6)} {to.symbol}</span></div>
              <div className="flex justify-between"><span>Price impact</span><span>{impactPct.toFixed(2)}%</span></div>
              <div className="flex justify-between"><span>Route</span><span>{rayQuote ? 'Raydium pool (direct)' : 'Jupiter (best price)'}</span></div>
            </div>
          )}
          {quoteErr && <p className="text-xs text-destructive">{quoteErr}</p>}
          {noPoolToken && (
            <Link to={`/liquidity?token=${noPoolToken.tokenId}`} className="block text-center text-xs py-2 rounded-lg glass hover:bg-muted/50">
              ${noPoolToken.symbol} has no Raydium pool yet — <span className="text-primary font-semibold">Create a pool</span>
            </Link>
          )}

          <button
            onClick={wallet.connected ? doSwap : () => setVisible(true)}
            disabled={wallet.connected && (!hasQuote || swapping)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground font-semibold neon-glow disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {swapping && <Loader2 className="w-4 h-4 animate-spin" />}
            {!wallet.connected ? 'Connect Wallet' : swapping ? 'Swapping…' : 'Swap'}
          </button>

          {lastSig && (
            <a href={`https://solscan.io/tx/${lastSig}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
              View last swap on Solscan <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
      {picker && <Picker />}
    </div>
  );
}
