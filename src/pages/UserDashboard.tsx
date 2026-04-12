import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import { Coins, Plus, BarChart3, DollarSign, LogOut, ExternalLink, User } from 'lucide-react';

interface Token {
  id: string;
  name: string;
  symbol: string;
  supply: number;
  mint_address: string | null;
  logo_url: string | null;
  liquidity_added: boolean;
  created_at: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  tx_hash: string | null;
  status: string;
  created_at: string;
}

export default function UserDashboard() {
  const { user, signOut } = useAuth();
  const { publicKey, connected } = useWallet();
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadData();
  }, [user, publicKey]);

  const loadData = async () => {
    setLoading(true);
    // Load tokens by auth user or wallet
    const wallet = publicKey?.toBase58();
    
    const queries: Promise<any>[] = [];
    
    if (wallet) {
      queries.push(
        supabase.from('tokens').select('*').eq('creator_wallet', wallet).order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').eq('user_wallet', wallet).order('created_at', { ascending: false }).limit(20)
      );
    } else {
      // No wallet connected, show empty
      queries.push(Promise.resolve({ data: [] }), Promise.resolve({ data: [] }));
    }

    const [tokensRes, txRes] = await Promise.all(queries);
    setTokens((tokensRes.data || []) as Token[]);
    setTransactions((txRes.data || []) as Transaction[]);
    setLoading(false);
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center text-primary-foreground font-bold text-lg">
              {displayName[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Welcome, {displayName}</h1>
              <p className="text-muted-foreground text-sm">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/create" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground text-sm font-semibold neon-glow">
              <Plus className="w-4 h-4" /> Create Token
            </Link>
            <button onClick={() => { signOut(); navigate('/'); }} className="p-2.5 rounded-xl glass text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Coins, label: 'Tokens Created', value: tokens.length.toString() },
            { icon: DollarSign, label: 'Total Spent (SOL)', value: transactions.reduce((s, t) => s + Number(t.amount), 0).toFixed(2) },
            { icon: BarChart3, label: 'Transactions', value: transactions.length.toString() },
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

        {!connected && (
          <div className="glass p-4 mb-6 flex items-center gap-3 text-sm">
            <User className="w-5 h-5 text-neon-purple shrink-0" />
            <p className="text-muted-foreground">Connect your Phantom wallet from the sidebar to see your tokens and create new ones.</p>
          </div>
        )}

        {/* My Tokens */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
          <h2 className="font-display text-lg font-bold mb-4">My Tokens</h2>
          <div className="glass overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
            ) : tokens.length === 0 ? (
              <div className="p-8 text-center">
                <Coins className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-4">No tokens created yet</p>
                <Link to="/create" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground text-sm font-semibold">
                  <Plus className="w-4 h-4" /> Create Your First Token
                </Link>
              </div>
            ) : (
              tokens.map((token) => (
                <Link key={token.id} to={`/token/${token.id}`} className="flex items-center justify-between px-5 py-4 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center text-primary-foreground text-xs font-bold overflow-hidden">
                      {token.logo_url ? <img src={token.logo_url} alt={token.name} className="w-full h-full object-cover" /> : token.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{token.name}</div>
                      <div className="text-xs text-muted-foreground">${token.symbol} · {Number(token.supply).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${token.liquidity_added ? 'text-neon-green' : 'text-muted-foreground'}`}>
                      {token.liquidity_added ? 'Live' : 'Pending'}
                    </span>
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="font-display text-lg font-bold mb-4">Recent Transactions</h2>
          <div className="glass overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No transactions yet</div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                      tx.type === 'CREATE_TOKEN' ? 'bg-neon-purple/20 text-neon-purple' :
                      tx.type === 'ADD_LIQUIDITY' ? 'bg-neon-blue/20 text-neon-blue' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {tx.type.replace(/_/g, ' ')}
                    </div>
                    <span className="text-sm">{tx.status}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">{Number(tx.amount).toFixed(2)} SOL</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">{new Date(tx.created_at).toLocaleDateString()}</span>
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
