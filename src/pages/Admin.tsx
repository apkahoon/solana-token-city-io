import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Coins, Users, BarChart3, Flag, Star, Trash2, Eye, Search, RefreshCw, Lock, Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

interface Token {
  id: string;
  name: string;
  symbol: string;
  supply: number;
  creator_wallet: string;
  mint_address: string | null;
  is_flagged: boolean;
  is_featured: boolean;
  liquidity_added: boolean;
  created_at: string;
}

interface Transaction {
  id: string;
  user_wallet: string;
  type: string;
  amount: number;
  tx_hash: string | null;
  status: string;
  created_at: string;
}

type Tab = 'tokens' | 'transactions' | 'users';

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <AdminPanel />;
}

function AdminPanel() {
  const [tab, setTab] = useState<Tab>('tokens');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ tokens: 0, users: 0, transactions: 0, volume: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [tokensRes, txRes, usersRes] = await Promise.all([
      supabase.from('tokens').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('users').select('*').order('created_at', { ascending: false }),
    ]);

    const t = (tokensRes.data || []) as Token[];
    const tx = (txRes.data || []) as Transaction[];
    const u = usersRes.data || [];

    setTokens(t);
    setTransactions(tx);
    setUsers(u);
    setStats({
      tokens: t.length,
      users: u.length,
      transactions: tx.length,
      volume: tx.reduce((s, x) => s + Number(x.amount), 0),
    });
    setLoading(false);
  };

  const toggleFlag = async (tokenId: string, currentFlag: boolean) => {
    await supabase.from('tokens').update({ is_flagged: !currentFlag }).eq('id', tokenId);
    setTokens(tokens.map(t => t.id === tokenId ? { ...t, is_flagged: !currentFlag } : t));
  };

  const toggleFeatured = async (tokenId: string, current: boolean) => {
    await supabase.from('tokens').update({ is_featured: !current }).eq('id', tokenId);
    setTokens(tokens.map(t => t.id === tokenId ? { ...t, is_featured: !current } : t));
  };

  const deleteToken = async (tokenId: string) => {
    await supabase.from('tokens').delete().eq('id', tokenId);
    setTokens(tokens.filter(t => t.id !== tokenId));
  };

  const filteredTokens = tokens.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.symbol.toLowerCase().includes(search.toLowerCase()) ||
    t.creator_wallet.includes(search)
  );

  const filteredTx = transactions.filter(t =>
    t.user_wallet.includes(search) ||
    t.type.toLowerCase().includes(search.toLowerCase()) ||
    (t.tx_hash && t.tx_hash.includes(search))
  );

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-pink/20 to-neon-purple/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-neon-pink" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Manage tokens, users, and transactions</p>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Coins, label: 'Total Tokens', value: stats.tokens },
            { icon: Users, label: 'Total Users', value: stats.users },
            { icon: BarChart3, label: 'Transactions', value: stats.transactions },
            { icon: BarChart3, label: 'Volume (SOL)', value: stats.volume.toFixed(2) },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass p-4">
              <div className="flex items-center gap-2">
                <s.icon className="w-4 h-4 text-neon-purple" />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <div className="font-display text-xl font-bold mt-1">{s.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-1">
            {(['tokens', 'transactions', 'users'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  tab === t ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-64"
              />
            </div>
            <button onClick={loadData} className="p-2 rounded-lg glass text-muted-foreground hover:text-foreground">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        {tab === 'tokens' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-border text-xs text-muted-foreground font-medium">
              <span>Token</span>
              <span className="w-24 text-right">Supply</span>
              <span className="w-20 text-center">Status</span>
              <span className="w-20 text-center">Flagged</span>
              <span className="w-20 text-center">Featured</span>
              <span className="w-24 text-center">Actions</span>
            </div>
            {filteredTokens.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No tokens found</div>
            ) : (
              filteredTokens.map((token) => (
                <div key={token.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3.5 border-b border-border/50 last:border-0 items-center hover:bg-muted/30">
                  <div>
                    <div className="font-semibold text-sm">{token.name} ({token.symbol})</div>
                    <div className="text-xs text-muted-foreground font-mono">{token.creator_wallet.slice(0, 12)}...</div>
                  </div>
                  <span className="w-24 text-right text-sm hidden sm:block">{Number(token.supply).toLocaleString()}</span>
                  <span className={`w-20 text-center text-xs font-medium hidden sm:block ${token.liquidity_added ? 'text-neon-green' : 'text-muted-foreground'}`}>
                    {token.liquidity_added ? 'Live' : 'Pending'}
                  </span>
                  <span className={`w-20 text-center text-xs hidden sm:block ${token.is_flagged ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {token.is_flagged ? 'Yes' : 'No'}
                  </span>
                  <span className={`w-20 text-center text-xs hidden sm:block ${token.is_featured ? 'text-neon-green' : 'text-muted-foreground'}`}>
                    {token.is_featured ? 'Yes' : 'No'}
                  </span>
                  <div className="flex items-center gap-1 w-24 justify-center">
                    <button onClick={() => toggleFlag(token.id, token.is_flagged)} className={`p-1.5 rounded hover:bg-muted ${token.is_flagged ? 'text-destructive' : 'text-muted-foreground'}`} title="Toggle flag">
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggleFeatured(token.id, token.is_featured)} className={`p-1.5 rounded hover:bg-muted ${token.is_featured ? 'text-neon-green' : 'text-muted-foreground'}`} title="Toggle featured">
                      <Star className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteToken(token.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {tab === 'transactions' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass overflow-hidden">
            <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-border text-xs text-muted-foreground font-medium">
              <span className="w-28">Type</span>
              <span>Wallet</span>
              <span className="w-20 text-right">Amount</span>
              <span className="w-20 text-center">Status</span>
              <span className="w-24 text-right">Date</span>
            </div>
            {filteredTx.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No transactions found</div>
            ) : (
              filteredTx.map((tx) => (
                <div key={tx.id} className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3.5 border-b border-border/50 last:border-0 items-center">
                  <div className={`px-2 py-0.5 rounded text-xs font-medium w-28 text-center ${
                    tx.type === 'CREATE_TOKEN' ? 'bg-neon-purple/20 text-neon-purple' :
                    tx.type === 'ADD_LIQUIDITY' ? 'bg-neon-blue/20 text-neon-blue' :
                    tx.type === 'BOOST' ? 'bg-neon-pink/20 text-neon-pink' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {tx.type.replace(/_/g, ' ')}
                  </div>
                  <span className="text-sm font-mono text-muted-foreground truncate">{tx.user_wallet}</span>
                  <span className="text-sm font-medium text-right w-20">{Number(tx.amount).toFixed(2)} SOL</span>
                  <span className={`text-xs text-center w-20 hidden sm:block ${tx.status === 'confirmed' ? 'text-neon-green' : 'text-muted-foreground'}`}>{tx.status}</span>
                  <span className="text-xs text-muted-foreground text-right w-24 hidden sm:block">{new Date(tx.created_at).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </motion.div>
        )}

        {tab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 border-b border-border text-xs text-muted-foreground font-medium">
              <span>Wallet</span>
              <span className="w-32">Display Name</span>
              <span className="w-28 text-right">Joined</span>
            </div>
            {users.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No users found</div>
            ) : (
              users.map((user: any) => (
                <div key={user.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] gap-4 px-5 py-3.5 border-b border-border/50 last:border-0 items-center">
                  <span className="text-sm font-mono truncate">{user.wallet_address}</span>
                  <span className="text-sm text-muted-foreground w-32 hidden sm:block">{user.display_name || '—'}</span>
                  <span className="text-xs text-muted-foreground text-right w-28">{new Date(user.created_at).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
