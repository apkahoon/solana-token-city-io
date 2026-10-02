import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, Loader2, Star, ExternalLink } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const PLATFORM_WALLET = new PublicKey('AUudUn5v4HM2EtkfM9GXSqLBAGUV5CoMgbKPWFPVV2fS');
// Must match supabase/functions/verify-boost
const TIERS = [
  { key: 'basic', label: 'Boost', sol: 0.1, duration: '24 hours', perks: 'Featured badge + trending bump' },
  { key: 'pro', label: 'Boost Pro', sol: 0.25, duration: '3 days', perks: 'Featured badge + 3× ranking bump' },
  { key: 'max', label: 'Boost Max', sol: 0.5, duration: '7 days', perks: 'Featured badge + top-of-trending bump' },
];

type Tok = { id: string; name: string; symbol: string; is_featured: boolean };

export default function BoostToken() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const [params] = useSearchParams();
  const [tokens, setTokens] = useState<Tok[]>([]);
  const [tokenId, setTokenId] = useState(params.get('token') || '');
  const [tier, setTier] = useState('basic');
  const [busy, setBusy] = useState(false);
  const [sig, setSig] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('tokens').select('id,name,symbol,is_featured').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => data && setTokens(data));
  }, []);

  const pay = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) return setVisible(true);
    if (!tokenId) return toast.error('Pick a token to boost');
    const t = TIERS.find((x) => x.key === tier)!;
    if (!confirm(`Send ${t.sol} SOL to boost this token for ${t.duration}?`)) return;
    setBusy(true); setSig(null);
    try {
      const tx = new Transaction().add(SystemProgram.transfer({
        fromPubkey: wallet.publicKey, toPubkey: PLATFORM_WALLET, lamports: Math.round(t.sol * LAMPORTS_PER_SOL),
      }));
      tx.feePayer = wallet.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
      const signed = await wallet.signTransaction(tx);
      const s = await connection.sendRawTransaction(signed.serialize());
      let ok = false;
      for (let i = 0; i < 40 && !ok; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const st = (await connection.getSignatureStatuses([s])).value[0];
        if (st?.err) throw new Error('Payment failed on-chain — no SOL was taken');
        ok = st?.confirmationStatus === 'confirmed' || st?.confirmationStatus === 'finalized';
      }
      if (!ok) throw new Error('Payment not confirmed yet — check Solscan');
      const { data, error } = await supabase.functions.invoke('verify-boost', { body: { tx_hash: s, token_id: tokenId, tier } });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setSig(s);
      toast.success('Token boosted!', { description: `Featured until ${new Date(data.expires_at).toLocaleString()}` });
    } catch (e: any) {
      toast.error('Boost failed', { description: e.message });
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-2xl font-bold"><span className="gradient-text">Boost Token</span></h1>
          <p className="text-muted-foreground text-sm">Pay in SOL to get a Featured badge and rank higher in Trending.</p>
        </motion.div>

        <div className="glass p-6 space-y-5">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Token</label>
            <select value={tokenId} onChange={(e) => setTokenId(e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-sm">
              <option value="">Select a token…</option>
              {tokens.map((t) => <option key={t.id} value={t.id}>{t.name} (${t.symbol}){t.is_featured ? ' ★' : ''}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TIERS.map((t) => (
              <button key={t.key} onClick={() => setTier(t.key)}
                className={`glass p-4 text-left ${tier === t.key ? 'neon-glow ring-1 ring-neon-purple/50' : 'hover:bg-muted/50'}`}>
                <div className="flex items-center gap-2 font-semibold text-sm"><Star className="w-4 h-4 text-accent" />{t.label}</div>
                <div className="text-xl font-bold mt-2">{t.sol} SOL</div>
                <div className="text-xs text-muted-foreground">{t.duration}</div>
                <div className="text-xs text-muted-foreground mt-2">{t.perks}</div>
              </button>
            ))}
          </div>

          <button onClick={pay} disabled={busy} className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground font-semibold neon-glow disabled:opacity-50 flex items-center justify-center gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            {!wallet.connected ? 'Connect Wallet' : busy ? 'Processing…' : 'Pay & Boost'}
          </button>
          {sig && (
            <a href={`https://solscan.io/tx/${sig}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
              View payment on Solscan <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
