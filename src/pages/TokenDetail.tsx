import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, ExternalLink, Globe, Twitter, Send, Droplets, CheckCircle2, Loader2, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TokenData {
  id: string;
  name: string;
  symbol: string;
  supply: number;
  decimals: number;
  description: string | null;
  creator_wallet: string;
  mint_address: string | null;
  logo_url: string | null;
  website: string | null;
  twitter: string | null;
  telegram: string | null;
  liquidity_added: boolean;
  pool_address: string | null;
  is_featured: boolean;
  created_at: string;
}

export default function TokenDetail() {
  const { id } = useParams();
  const [token, setToken] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadToken();
  }, [id]);

  const loadToken = async () => {
    const { data } = await supabase.from('tokens').select('*').eq('id', id!).single();
    setToken(data as TokenData | null);
    setLoading(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const shareToken = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `${token?.name} on Solana Token City`, url });
    } else {
      copyToClipboard(url, 'Link');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neon-purple animate-spin" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass p-8 text-center max-w-md">
          <h2 className="font-display text-xl font-bold mb-2">Token Not Found</h2>
          <p className="text-muted-foreground text-sm mb-4">This token may have been removed or doesn't exist.</p>
          <Link to="/trending" className="text-neon-purple text-sm hover:underline">Browse Trending Tokens</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to="/trending" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Trending
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Token Header */}
          <div className="glass p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center text-primary-foreground font-bold text-2xl overflow-hidden shrink-0">
                {token.logo_url ? (
                  <img src={token.logo_url} alt={token.name} className="w-full h-full object-cover" />
                ) : (
                  token.symbol.slice(0, 2)
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="font-display text-2xl font-bold">{token.name}</h1>
                  {token.is_featured && (
                    <span className="px-2 py-0.5 rounded-full bg-neon-green/20 text-neon-green text-xs font-medium">Featured</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full bg-muted text-sm font-medium text-muted-foreground">${token.symbol}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${token.liquidity_added ? 'bg-neon-green/20 text-neon-green' : 'bg-muted text-muted-foreground'}`}>
                    {token.liquidity_added ? 'Live' : 'No Liquidity'}
                  </span>
                </div>
                {token.description && (
                  <p className="text-sm text-muted-foreground mb-3">{token.description}</p>
                )}
                <div className="flex items-center gap-3">
                  {token.website && (
                    <a href={token.website} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg glass text-muted-foreground hover:text-foreground">
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                  {token.twitter && (
                    <a href={`https://twitter.com/${token.twitter}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg glass text-muted-foreground hover:text-foreground">
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                  {token.telegram && (
                    <a href={`https://t.me/${token.telegram}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg glass text-muted-foreground hover:text-foreground">
                      <Send className="w-4 h-4" />
                    </a>
                  )}
                  <button onClick={shareToken} className="p-2 rounded-lg glass text-muted-foreground hover:text-foreground">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Token Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="glass p-5">
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Token Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Supply</span>
                  <span className="font-medium">{Number(token.supply).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Decimals</span>
                  <span className="font-medium">{token.decimals}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{new Date(token.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="glass p-5">
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">On-Chain</h3>
              <div className="space-y-3">
                {token.mint_address ? (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Mint Address</div>
                    <button onClick={() => copyToClipboard(token.mint_address!, 'Mint address')} className="flex items-center gap-2 text-sm font-mono text-foreground hover:text-neon-purple">
                      {token.mint_address.slice(0, 16)}...
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Mint address pending</div>
                )}
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Creator</div>
                  <button onClick={() => copyToClipboard(token.creator_wallet, 'Creator wallet')} className="flex items-center gap-2 text-sm font-mono text-foreground hover:text-neon-purple">
                    {token.creator_wallet.slice(0, 16)}...
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                {token.pool_address && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Pool Address</div>
                    <button onClick={() => copyToClipboard(token.pool_address!, 'Pool address')} className="flex items-center gap-2 text-sm font-mono text-foreground hover:text-neon-purple">
                      {token.pool_address.slice(0, 16)}...
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {!token.liquidity_added && (
              <Link to="/liquidity" className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground font-semibold neon-glow">
                <Droplets className="w-5 h-5" /> Add Liquidity
              </Link>
            )}
            <Link to="/swap" className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl glass font-medium hover:bg-muted/80">
              Swap Tokens
            </Link>
            {token.mint_address && (
              <a
                href={`https://solscan.io/token/${token.mint_address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl glass font-medium hover:bg-muted/80"
              >
                <ExternalLink className="w-4 h-4" /> View on Solscan
              </a>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
