import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Flame, Lock, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  AuthorityType, createBurnInstruction, createFreezeAccountInstruction, createSetAuthorityInstruction,
  getAssociatedTokenAddressSync, getMint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Action = 'revoke' | 'burn' | 'freeze' | 'lock';

const actions: { key: Action; label: string; icon: typeof Shield; description: string; color: string }[] = [
  { key: 'revoke', label: 'Revoke Authority', icon: Shield, description: 'Revoke mint or freeze authority to make your token immutable', color: 'from-neon-blue to-neon-purple' },
  { key: 'burn', label: 'Burn Tokens', icon: Flame, description: 'Permanently destroy tokens to reduce supply', color: 'from-neon-pink to-destructive' },
  { key: 'lock', label: 'Lock Liquidity', icon: Lock, description: 'Permanently lock a pool by burning all of your LP tokens', color: 'from-neon-green to-neon-blue' },
  { key: 'freeze', label: 'Freeze Account', icon: Lock, description: 'Freeze a token account to prevent transfers', color: 'from-neon-purple to-neon-pink' },
];

function parseKey(s: string, label: string) {
  try { return new PublicKey(s.trim()); } catch { throw new Error(`Invalid ${label}`); }
}

export default function SecurityBurn() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const { user } = useAuth();
  const [activeAction, setActiveAction] = useState<Action>('revoke');
  const [mintAddress, setMintAddress] = useState('');
  const [burnAmount, setBurnAmount] = useState('');
  const [freezeTarget, setFreezeTarget] = useState('');
  const [revokeMint, setRevokeMint] = useState(false);
  const [revokeFreeze, setRevokeFreeze] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sig, setSig] = useState<string | null>(null);

  if (!wallet.connected || !wallet.publicKey) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass p-10 text-center max-w-md">
          <Shield className="w-12 h-12 text-neon-purple mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground text-sm mb-6">Connect to access security tools</p>
          <button onClick={() => setVisible(true)} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground font-semibold neon-glow">Connect Wallet</button>
        </motion.div>
      </div>
    );
  }

  const run = async () => {
    const owner = wallet.publicKey!;
    setBusy(true); setSig(null);
    try {
      const mint = parseKey(mintAddress, 'mint address');
      const info = await connection.getAccountInfo(mint);
      if (!info) throw new Error('Mint not found on mainnet');
      const programId = info.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
      const mintInfo = await getMint(connection, mint, 'confirmed', programId);
      const tx = new Transaction();
      let amountUi = 0;

      if (activeAction === 'revoke') {
        if (!revokeMint && !revokeFreeze) throw new Error('Select at least one authority');
        if (revokeMint) {
          if (!mintInfo.mintAuthority?.equals(owner)) throw new Error('Your wallet is not the mint authority (or it is already revoked)');
          tx.add(createSetAuthorityInstruction(mint, owner, AuthorityType.MintTokens, null, [], programId));
        }
        if (revokeFreeze) {
          if (!mintInfo.freezeAuthority?.equals(owner)) throw new Error('Your wallet is not the freeze authority (or it is already revoked)');
          tx.add(createSetAuthorityInstruction(mint, owner, AuthorityType.FreezeAccount, null, [], programId));
        }
      } else if (activeAction === 'lock') {
        const ata = getAssociatedTokenAddressSync(mint, owner, false, programId);
        const bal = await connection.getTokenAccountBalance(ata).catch(() => null);
        if (!bal || bal.value.amount === '0') throw new Error('You hold no LP tokens for this pool');
        amountUi = Number(bal.value.uiAmount);
        tx.add(createBurnInstruction(ata, mint, owner, BigInt(bal.value.amount), [], programId));
      } else if (activeAction === 'burn') {
        amountUi = Number(burnAmount);
        if (!(amountUi > 0)) throw new Error('Enter an amount to burn');
        const ata = getAssociatedTokenAddressSync(mint, owner, false, programId);
        const bal = await connection.getTokenAccountBalance(ata).catch(() => null);
        if (!bal) throw new Error('You hold no tokens of this mint');
        const raw = BigInt(Math.round(amountUi * 10 ** mintInfo.decimals));
        if (raw > BigInt(bal.value.amount)) throw new Error('Amount exceeds your balance');
        tx.add(createBurnInstruction(ata, mint, owner, raw, [], programId));
      } else {
        if (!mintInfo.freezeAuthority?.equals(owner)) throw new Error('Your wallet is not the freeze authority of this token');
        const target = parseKey(freezeTarget, 'wallet address');
        let acct = target;
        const tInfo = await connection.getAccountInfo(target);
        if (!tInfo || !tInfo.owner.equals(programId)) acct = getAssociatedTokenAddressSync(mint, target, true, programId);
        if (!(await connection.getAccountInfo(acct))) throw new Error('That wallet has no token account for this mint');
        tx.add(createFreezeAccountInstruction(acct, mint, owner, [], programId));
      }

      tx.feePayer = owner;
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      const signed = await wallet.signTransaction!(tx);
      const s = await connection.sendRawTransaction(signed.serialize());
      let ok = false;
      for (let i = 0; i < 40 && !ok; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const st = (await connection.getSignatureStatuses([s])).value[0];
        if (st?.err) throw new Error('Transaction failed on-chain');
        ok = st?.confirmationStatus === 'confirmed' || st?.confirmationStatus === 'finalized';
      }
      if (!ok) throw new Error('Not confirmed yet — check Solscan');
      setSig(s);
      toast.success('Done', { description: 'Confirmed on Solana mainnet' });
      if ((activeAction === 'burn' || activeAction === 'lock') && user) {
        const { data: tok } = await supabase.from('tokens').select('id').eq('mint_address', mint.toBase58()).maybeSingle();
        await supabase.from('transactions').insert({
          user_wallet: owner.toBase58(), type: 'BURN', amount: amountUi, tx_hash: s, token_id: tok?.id ?? null,
          status: 'confirmed', is_simulated: false, metadata: { mint: mint.toBase58(), kind: activeAction === 'lock' ? 'lp_lock' : 'burn' },
        });
      }
      setBurnAmount('');
    } catch (e: any) {
      toast.error('Action failed', { description: e.message });
    } finally { setBusy(false); }
  };

  const inputCls = 'w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm';

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-2xl font-bold"><span className="gradient-text">Security & Burn</span></h1>
          <p className="text-muted-foreground text-sm">Manage token authority and supply on Solana mainnet</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {actions.map((a) => (
            <button key={a.key} onClick={() => { setActiveAction(a.key); setSig(null); }}
              className={`glass p-4 text-left transition-all ${activeAction === a.key ? 'neon-glow ring-1 ring-neon-purple/50' : 'hover:bg-muted/50'}`}>
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${a.color} flex items-center justify-center mb-3`}><a.icon className="w-4 h-4 text-primary-foreground" /></div>
              <div className="font-semibold text-sm mb-1">{a.label}</div>
              <p className="text-xs text-muted-foreground">{a.description}</p>
            </button>
          ))}
        </div>

        <motion.div key={activeAction} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-6">
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-1.5 block">{activeAction === 'lock' ? 'LP Token Mint Address (from your Raydium pool)' : 'Token Mint Address'}</label>
            <input placeholder="Enter token mint address..." value={mintAddress} onChange={(e) => setMintAddress(e.target.value)} className={`${inputCls} font-mono`} />
          </div>

          {activeAction === 'burn' && (
            <div className="mb-4">
              <label className="text-sm text-muted-foreground mb-1.5 block">Amount to Burn</label>
              <input type="number" min="0" placeholder="0" value={burnAmount} onChange={(e) => setBurnAmount(e.target.value)} className={inputCls} />
            </div>
          )}
          {activeAction === 'freeze' && (
            <div className="mb-4">
              <label className="text-sm text-muted-foreground mb-1.5 block">Wallet (or token account) to freeze</label>
              <input placeholder="Holder wallet address..." value={freezeTarget} onChange={(e) => setFreezeTarget(e.target.value)} className={`${inputCls} font-mono`} />
            </div>
          )}
          {activeAction === 'revoke' && (
            <div className="mb-4 space-y-2">
              <label className="text-sm text-muted-foreground mb-1.5 block">Authority to Revoke</label>
              {[['Mint Authority', revokeMint, setRevokeMint], ['Freeze Authority', revokeFreeze, setRevokeFreeze]].map(([l, v, set]: any) => (
                <label key={l} className="flex items-center gap-3 glass p-3 rounded-lg cursor-pointer hover:bg-muted/50">
                  <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm">{l}</span>
                </label>
              ))}
            </div>
          )}

          <div className="glass p-3 mb-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              {activeAction === 'revoke' && 'Warning: Revoking authority is irreversible. You will not be able to mint new tokens or freeze accounts.'}
              {activeAction === 'burn' && 'Warning: Burning tokens is permanent. The burned tokens will be removed from circulation forever.'}
              {activeAction === 'lock' && 'Warning: Burning LP tokens locks the liquidity forever. You will never be able to withdraw it — this is what investors trust.'}
              {activeAction === 'freeze' && 'Warning: Freezing an account will prevent all transfers from that account.'}
            </p>
          </div>

          <button onClick={run} disabled={busy} className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-primary-foreground font-semibold neon-glow disabled:opacity-50 flex items-center justify-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {activeAction === 'revoke' && 'Revoke Authority'}
            {activeAction === 'burn' && 'Burn Tokens'}
            {activeAction === 'freeze' && 'Freeze Account'}
            {activeAction === 'lock' && 'Lock Liquidity Forever'}
          </button>
          {sig && (
            <a href={`https://solscan.io/tx/${sig}`} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline">
              View transaction on Solscan <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </motion.div>
      </div>
    </div>
  );
}
