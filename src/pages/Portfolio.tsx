import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { motion } from 'framer-motion';
import { Wallet, Coins, TrendingUp, Clock, ExternalLink, Plus, DollarSign, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Token {
  id: string;
  name: string;
  symbol: string;
  supply: number;
  mint_address: string | null;
  logo_url: string | null;
  liquidity_added: boolean;
  pool_address: string | null;
  created_at: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  tx_hash: string | null;
  status: string;
  created_at: string;
  token_id: string | null;
}

export default function Portfolio() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalTokens: 0, totalVolume: 0, totalTx: 0 });

  useEffect(() => {
    if (connected && publicKey) {
      loadPortfolio();
    }
  }, [connected, publicKey]);

  const loadPortfolio = async () => {
    if (!publicKey) return;
    const wallet = publicKey.toBase58();
    setLoading(true);

    const [tokensRes, txRes] = await Promise.all([
      supabase.from('tokens').select('*').eq('creator_wallet', wallet).order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').eq('user_wallet', wallet).order('created_at', { ascending: false }).limit(20),
    ]);

    const tokenData = (tokensRes.data || []) as Token[];
    const txData = (txRes.data || []) as Transaction[];

    setTokens(tokenData);
    setTransactions(txData);
    setStats({
      totalTokens: tokenData.length,
      totalVolume: txData.reduce((sum, tx) => sum + Number(tx.amount), 0),
      totalTx: txData.length,
    });
    setLoading(false);
  };

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass p-10 text-center max-w-md">
          <Wallet className="w-12 h-12 text-neon-purple mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground text-sm mb-6">Connect your Phantom wallet to view your portfolio</p>
          <button onClick={() => setVisible(true)} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground font-semibold neon-glow">
            Connect Wallet
          </button>
        </motion.div>
      </div>
    );
  }

  const shortAddr = publicKey ? `${publicKey.toBase58().slice(0, 6)}...${publicKey.toBase58().slice(-4)}` : '';

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold mb-1">My Portfolio</h1>
            <p className="text-muted-foreground text-sm font-mono">{shortAddr}</p>
          </div>
          <Link to="/create" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground text-sm font-semibold neon-glow">
            <Plus className="w-4 h-4" /> Create Token
          </Link>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Coins, label: 'Tokens Created', value: stats.totalTokens.toString() },
            { icon: DollarSign, label: 'Total Volume (SOL)', value: stats.totalVolume.toFixed(2) },
            { icon: BarChart3, label: 'Transactions', value: stats.totalTx.toString() },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-neon-purple" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                  <div className="font-display text-xl font-bold">{stat.value}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* My Tokens */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
          <h2 className="font-display text-lg font-bold mb-4">My Tokens</h2>
          <div className="glass overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
            ) : tokens.length === 0 ? (
              <div className="p-8 text-center">
                <Coins className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-4">You haven't created any tokens yet</p>
                <Link to="/create" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground text-sm font-semibold">
                  <Plus className="w-4 h-4" /> Create Your First Token
                </Link>
              </div>
            ) : (
              tokens.map((token) => (
                <div key={token.id} className="flex items-center justify-between px-5 py-4 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center text-primary-foreground text-xs font-bold overflow-hidden">
                      {token.logo_url ? <img src={token.logo_url} alt={token.name} className="w-full h-full object-cover" /> : token.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{token.name}</div>
                      <div className="text-xs text-muted-foreground">${token.symbol} · Supply: {Number(token.supply).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className={`text-xs font-medium ${token.liquidity_added ? 'text-neon-green' : 'text-muted-foreground'}`}>
                        {token.liquidity_added ? 'Live' : 'No Liquidity'}
                      </div>
                      {token.mint_address && (
                        <div className="text-xs text-muted-foreground font-mono">{token.mint_address.slice(0, 8)}...</div>
                      )}
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="font-display text-lg font-bold mb-4">Recent Transactions</h2>
          <div className="glass overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No transactions yet</div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                      tx.type === 'CREATE_TOKEN' ? 'bg-neon-purple/20 text-neon-purple' :
                      tx.type === 'ADD_LIQUIDITY' ? 'bg-neon-blue/20 text-neon-blue' :
                      tx.type === 'BOOST' ? 'bg-neon-pink/20 text-neon-pink' :
                      tx.type === 'SWAP' ? 'bg-neon-green/20 text-neon-green' :
                      'bg-destructive/20 text-destructive'
                    }`}>
                      {tx.type.replace(/_/g, ' ')}
                    </div>
                    <span className="text-sm">{tx.status}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">{Number(tx.amount).toFixed(2)} SOL</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
