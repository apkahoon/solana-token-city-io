import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Flame, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

type Action = 'revoke' | 'burn' | 'freeze';

const actions: { key: Action; label: string; icon: typeof Shield; description: string; color: string }[] = [
  { key: 'revoke', label: 'Revoke Authority', icon: Shield, description: 'Revoke mint or freeze authority to make your token immutable', color: 'from-neon-blue to-neon-purple' },
  { key: 'burn', label: 'Burn Tokens', icon: Flame, description: 'Permanently destroy tokens to reduce supply', color: 'from-neon-pink to-destructive' },
  { key: 'freeze', label: 'Freeze Account', icon: Lock, description: 'Freeze a token account to prevent transfers', color: 'from-neon-purple to-neon-pink' },
];

export default function SecurityBurn() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [activeAction, setActiveAction] = useState<Action>('revoke');
  const [mintAddress, setMintAddress] = useState('');
  const [burnAmount, setBurnAmount] = useState('');

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass p-10 text-center max-w-md">
          <Shield className="w-12 h-12 text-neon-purple mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground text-sm mb-6">Connect to access security tools</p>
          <button onClick={() => setVisible(true)} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground font-semibold neon-glow">
            Connect Wallet
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-2xl font-bold"><span className="gradient-text">Security & Burn</span></h1>
          <p className="text-muted-foreground text-sm">Manage token authority and supply</p>
        </motion.div>

        {/* Action selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {actions.map((action) => (
            <motion.button
              key={action.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setActiveAction(action.key)}
              className={`glass p-4 text-left transition-all ${activeAction === action.key ? 'neon-glow ring-1 ring-neon-purple/50' : 'hover:bg-muted/50'}`}
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} bg-opacity-20 flex items-center justify-center mb-3`}>
                <action.icon className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="font-semibold text-sm mb-1">{action.label}</div>
              <p className="text-xs text-muted-foreground">{action.description}</p>
            </motion.button>
          ))}
        </div>

        {/* Form */}
        <motion.div key={activeAction} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-6">
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-1.5 block">Token Mint Address</label>
            <input
              type="text"
              placeholder="Enter token mint address..."
              value={mintAddress}
              onChange={(e) => setMintAddress(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm font-mono"
            />
          </div>

          {activeAction === 'burn' && (
            <div className="mb-4">
              <label className="text-sm text-muted-foreground mb-1.5 block">Amount to Burn</label>
              <input
                type="number"
                placeholder="0"
                value={burnAmount}
                onChange={(e) => setBurnAmount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
          )}

          {activeAction === 'revoke' && (
            <div className="mb-4 space-y-2">
              <label className="text-sm text-muted-foreground mb-1.5 block">Authority to Revoke</label>
              {['Mint Authority', 'Freeze Authority'].map((auth) => (
                <label key={auth} className="flex items-center gap-3 glass p-3 rounded-lg cursor-pointer hover:bg-muted/50">
                  <input type="checkbox" className="w-4 h-4 rounded border-border text-neon-purple focus:ring-neon-purple" />
                  <span className="text-sm">{auth}</span>
                </label>
              ))}
            </div>
          )}

          <div className="glass p-3 mb-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              {activeAction === 'revoke' && 'Warning: Revoking authority is irreversible. You will not be able to mint new tokens or freeze accounts.'}
              {activeAction === 'burn' && 'Warning: Burning tokens is permanent. The burned tokens will be removed from circulation forever.'}
              {activeAction === 'freeze' && 'Warning: Freezing an account will prevent all transfers from that account.'}
            </p>
          </div>

          <button className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-primary-foreground font-semibold neon-glow">
            {activeAction === 'revoke' && 'Revoke Authority'}
            {activeAction === 'burn' && 'Burn Tokens'}
            {activeAction === 'freeze' && 'Freeze Account'}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
