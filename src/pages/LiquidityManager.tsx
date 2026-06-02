import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Plus, Lock, Unlock, ExternalLink, Loader2 } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const PLATFORM_WALLET = 'AUudUn5v4HM2EtkfM9GXSqLBAGUV5CoMgbKPWFPVV2fS';
const POOL_FEE_SOL = 0.2;

export default function LiquidityManager() {
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const [pools, setPools] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ tokenId: '', solAmount: '', tokenAmount: '' });

  useEffect(() => {
    if (connected && publicKey) loadData();
  }, [connected, publicKey]);

  const loadData = async () => {
    if (!publicKey) return;
    setLoading(true);
    const wallet = publicKey.toBase58();
    const [poolsRes, tokensRes] = await Promise.all([
      supabase.from('liquidity_pools').select('*, tokens(name, symbol)').eq('creator_wallet', wallet),
      supabase.from('tokens').select('id, name, symbol').eq('creator_wallet', wallet).eq('liquidity_added', false),
    ]);
    setPools(poolsRes.data || []);
    setTokens(tokensRes.data || []);
    setLoading(false);
  };

  const handleCreatePool = async () => {
    if (!publicKey || !sendTransaction) { setVisible(true); return; }
    if (!form.tokenId) { toast.error('Please select a token'); return; }
    const solAmt = Number(form.solAmount);
    const tokAmt = Number(form.tokenAmount);
    if (!solAmt || solAmt <= 0) { toast.error('Enter a valid SOL amount'); return; }
    if (!tokAmt || tokAmt <= 0) { toast.error('Enter a valid token amount'); return; }

    try {
      setSubmitting(true);

      // Pay the 0.2 SOL pool creation fee to the platform wallet
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(PLATFORM_WALLET),
          lamports: Math.floor(POOL_FEE_SOL * LAMPORTS_PER_SOL),
        })
      );
      const signature = await sendTransaction(tx, connection);
      toast.info('Transaction sent. Waiting for confirmation...');

      // Poll for confirmation
      const confirmed = await (async () => {
        for (let i = 0; i < 30; i++) {
          try {
            const { value } = await connection.getSignatureStatuses([signature]);
            const s = value?.[0];
            if (s?.err) throw new Error('Transaction failed on-chain');
            if (s && (s.confirmationStatus === 'confirmed' || s.confirmationStatus === 'finalized')) return true;
          } catch (e) {
            if ((e as Error).message?.includes('on-chain')) throw e;
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
        return false;
      })();
      if (!confirmed) throw new Error('Confirmation timed out. SOL was sent — contact support with TX hash.');

      // Verify on backend and insert pool
      const verifyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-pool-payment`;
      const body = {
        tx_hash: signature,
        pool_data: {
          token_id: form.tokenId,
          creator_wallet: publicKey.toBase58(),
          sol_amount: solAmt,
          token_amount: tokAmt,
        },
      };
      let result: any = null;
      let lastErr = '';
      for (let attempt = 0; attempt < 5; attempt++) {
        const res = await fetch(verifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(body),
        });
        result = await res.json();
        if (res.ok) break;
        lastErr = result?.error || 'Verification failed';
        if (!/not found|confirming/i.test(lastErr)) throw new Error(lastErr);
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (!result?.success) throw new Error(lastErr || 'Verification failed');

      toast.success('Liquidity pool created! 💧');
      setForm({ tokenId: '', solAmount: '', tokenAmount: '' });
      setShowAdd(false);
      await loadData();
    } catch (err: any) {
      console.error('Pool creation error:', err);
      let msg = 'Failed to create pool.';
      if (err.message?.includes('User rejected')) msg = 'Transaction cancelled.';
      else if (err.message?.includes('insufficient')) msg = `Insufficient SOL. Need at least ${POOL_FEE_SOL} SOL + your liquidity.`;
      else if (err.message) msg = err.message;
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass p-10 text-center max-w-md">
          <Droplets className="w-12 h-12 text-neon-blue mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground text-sm mb-6">Connect to manage your liquidity pools</p>
          <button onClick={() => setVisible(true)} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground font-semibold neon-glow">
            Connect Wallet
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold"><span className="gradient-text">Liquidity Manager</span></h1>
            <p className="text-muted-foreground text-sm">Manage your token liquidity pools</p>
          </div>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground text-sm font-semibold neon-glow">
            <Plus className="w-4 h-4" /> Add Liquidity
          </button>
        </motion.div>

        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass p-6 mb-6">
            <h3 className="font-display font-semibold mb-4">Add Liquidity</h3>
            {tokens.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You don't have any tokens without a pool yet. Create a token first.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Select Token</label>
                  <select
                    value={form.tokenId}
                    onChange={(e) => setForm({ ...form, tokenId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm"
                    disabled={submitting}
                  >
                    <option value="">Select a token...</option>
                    {tokens.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.symbol})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">SOL Amount</label>
                    <input type="number" min="0" step="0.01" placeholder="0.00" value={form.solAmount} onChange={(e) => setForm({ ...form, solAmount: e.target.value })} disabled={submitting} className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Token Amount</label>
                    <input type="number" min="0" placeholder="0" value={form.tokenAmount} onChange={(e) => setForm({ ...form, tokenAmount: e.target.value })} disabled={submitting} className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm" />
                  </div>
                </div>
                <div className="glass p-3 text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">Fee:</span> {POOL_FEE_SOL} SOL for pool creation (paid to platform wallet)
                </div>
                <button
                  onClick={handleCreatePool}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple text-primary-foreground font-semibold neon-glow disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Pool...</> : 'Create Pool & Add Liquidity'}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Existing Pools */}
        <div className="glass overflow-hidden">
          <div className="px-5 py-3 border-b border-border text-xs text-muted-foreground font-medium">
            Your Liquidity Pools
          </div>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : pools.length === 0 ? (
            <div className="p-8 text-center">
              <Droplets className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No liquidity pools yet</p>
            </div>
          ) : (
            pools.map((pool: any) => (
              <div key={pool.id} className="flex items-center justify-between px-5 py-4 border-b border-border/50 last:border-0 hover:bg-muted/30">
                <div>
                  <div className="font-semibold text-sm">{pool.tokens?.name} / SOL</div>
                  <div className="text-xs text-muted-foreground">{Number(pool.sol_amount).toFixed(2)} SOL + {Number(pool.token_amount).toLocaleString()} tokens</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-1 text-xs ${pool.liquidity_locked ? 'text-neon-green' : 'text-muted-foreground'}`}>
                    {pool.liquidity_locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {pool.liquidity_locked ? 'Locked' : 'Unlocked'}
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
