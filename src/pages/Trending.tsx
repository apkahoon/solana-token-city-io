import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Flame, Clock, ExternalLink, Zap, Rocket, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Tab = 'trending' | 'new' | 'gainers';

interface TokenWithStats {
  id: string;
  name: string;
  symbol: string;
  logo_url: string | null;
  created_at: string;
  trending_stats: {
    price: number;
    price_change_24h: number;
    volume_24h: number;
    score: number;
  } | null;
}

const tabs: { key: Tab; label: string; icon: typeof TrendingUp }[] = [
  { key: 'trending', label: 'Trending', icon: Flame },
  { key: 'new', label: 'New Launches', icon: Clock },
  { key: 'gainers', label: 'Top Gainers', icon: TrendingUp },
];

const gradientColors = [
  'from-primary to-secondary',
  'from-accent to-primary',
  'from-secondary to-primary',
  'from-neon-green to-secondary',
  'from-primary to-accent',
];

export default function Trending() {
  const [activeTab, setActiveTab] = useState<Tab>('trending');
  const [tokens, setTokens] = useState<TokenWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTokens();
  }, [activeTab]);

  const loadTokens = async () => {
    setLoading(true);
    let query = supabase
      .from('tokens')
      .select('id, name, symbol, logo_url, created_at, trending_stats(price, price_change_24h, volume_24h, score)')
      .eq('is_flagged', false);

    if (activeTab === 'new') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data } = await query.limit(20);
    setTokens((data as TokenWithStats[] | null) || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 sm:mb-10">
          <h1 className="font-display text-2xl sm:text-4xl font-bold mb-3">
            🔥 <span className="gradient-text">Trending Tokens</span>
          </h1>
          <p className="text-muted-foreground text-sm">Discover the hottest meme coins on Solana</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-1 mb-8 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="glass p-12 text-center">
            <Loader2 className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
            <p className="text-muted-foreground text-sm">Loading tokens...</p>
          </div>
        ) : tokens.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-12 text-center">
            <Rocket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold mb-2">No Tokens Yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Be the first to launch a token on Solana Token City!</p>
            <Link to="/create" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold">
              <Rocket className="w-5 h-5" /> Launch First Token
            </Link>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass overflow-hidden">
            {/* Header */}
            <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-border text-xs text-muted-foreground font-medium">
              <span className="w-8">#</span>
              <span>Token</span>
              <span className="text-right w-20">Price</span>
              <span className="text-right w-20">24h</span>
              <span className="text-right w-24">Volume</span>
              <span className="text-right w-20">Score</span>
              <span className="w-10" />
            </div>

            {tokens.map((token, i) => {
              const stats = token.trending_stats?.[0];
              const change = stats?.price_change_24h || 0;
              return (
                <Link
                  key={token.id}
                  to={`/token/${token.id}`}
                  className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-4 border-b border-border/50 hover:bg-muted/30 transition-colors items-center"
                >
                  <span className="w-8 text-sm text-muted-foreground font-medium">{i + 1}</span>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradientColors[i % gradientColors.length]} flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0 overflow-hidden`}>
                      {token.logo_url ? <img src={token.logo_url} alt="" className="w-full h-full object-cover" /> : token.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{token.name}</div>
                      <div className="text-xs text-muted-foreground">${token.symbol}</div>
                    </div>
                  </div>
                  <span className="text-right text-sm font-medium w-20 hidden sm:block">
                    ${stats?.price?.toFixed(6) || '0.00'}
                  </span>
                  <span className={`text-right text-sm font-semibold w-20 hidden sm:block ${change >= 0 ? 'text-neon-green' : 'text-destructive'}`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                  </span>
                  <span className="text-right text-sm text-muted-foreground w-24 hidden sm:block">
                    ${(stats?.volume_24h || 0).toLocaleString()}
                  </span>
                  <div className="text-right w-20 hidden sm:flex items-center justify-end gap-1">
                    <Zap className="w-3 h-3 text-primary" />
                    <span className="text-sm font-medium">{stats?.score || 0}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:w-10">
                    <span className={`text-sm font-semibold sm:hidden ${change >= 0 ? 'text-neon-green' : 'text-destructive'}`}>
                      {change >= 0 ? '+' : ''}{change.toFixed(0)}%
                    </span>
                    <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground shrink-0" />
                  </div>
                </Link>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
