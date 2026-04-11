import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Flame, Clock, ArrowUpRight, ExternalLink, Zap } from 'lucide-react';

type Tab = 'trending' | 'new' | 'gainers';

const mockTokens = [
  { name: 'PepeSol', symbol: 'PEPES', change: '+342%', price: '$0.00042', volume: '$2.1M', liquidity: '$890K', buys: 1284, score: 95, color: 'from-green-400 to-emerald-600' },
  { name: 'Bonk2.0', symbol: 'BONK2', change: '+189%', price: '$0.00018', volume: '$1.4M', liquidity: '$560K', buys: 892, score: 87, color: 'from-orange-400 to-red-500' },
  { name: 'SolDoge', symbol: 'SDOGE', change: '+156%', price: '$0.00091', volume: '$980K', liquidity: '$420K', buys: 673, score: 82, color: 'from-neon-purple to-neon-blue' },
  { name: 'MoonCat', symbol: 'MCAT', change: '+124%', price: '$0.00063', volume: '$750K', liquidity: '$380K', buys: 541, score: 76, color: 'from-neon-pink to-neon-purple' },
  { name: 'RocketInu', symbol: 'RINU', change: '+98%', price: '$0.00027', volume: '$520K', liquidity: '$290K', buys: 423, score: 71, color: 'from-cyan-400 to-blue-500' },
  { name: 'WenLambo', symbol: 'WLMB', change: '+87%', price: '$0.00015', volume: '$340K', liquidity: '$180K', buys: 312, score: 64, color: 'from-yellow-400 to-orange-500' },
  { name: 'DiamondHands', symbol: 'DHDZ', change: '+76%', price: '$0.00008', volume: '$280K', liquidity: '$150K', buys: 278, score: 58, color: 'from-indigo-400 to-purple-500' },
  { name: 'ShibaSol', symbol: 'SHIBS', change: '+52%', price: '$0.00034', volume: '$190K', liquidity: '$120K', buys: 198, score: 49, color: 'from-amber-400 to-red-400' },
];

const tabs: { key: Tab; label: string; icon: typeof TrendingUp }[] = [
  { key: 'trending', label: 'Trending', icon: Flame },
  { key: 'new', label: 'New Launches', icon: Clock },
  { key: 'gainers', label: 'Top Gainers', icon: TrendingUp },
];

export default function Trending() {
  const [activeTab, setActiveTab] = useState<Tab>('trending');

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3">
            🔥 <span className="gradient-text">Trending Tokens</span>
          </h1>
          <p className="text-muted-foreground">Discover the hottest meme coins on Solana</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
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

          {mockTokens.map((token, i) => (
            <motion.div
              key={token.symbol}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-4 border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer items-center"
            >
              <span className="w-8 text-sm text-muted-foreground font-medium">{i + 1}</span>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${token.color} flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0`}>
                  {token.symbol.slice(0, 2)}
                </div>
                <div>
                  <div className="font-semibold text-sm">{token.name}</div>
                  <div className="text-xs text-muted-foreground">${token.symbol}</div>
                </div>
              </div>
              <span className="text-right text-sm font-medium w-20 hidden sm:block">{token.price}</span>
              <span className="text-right text-sm font-semibold text-neon-green w-20 hidden sm:block">{token.change}</span>
              <span className="text-right text-sm text-muted-foreground w-24 hidden sm:block">{token.volume}</span>
              <div className="text-right w-20 hidden sm:flex items-center justify-end gap-1">
                <Zap className="w-3 h-3 text-neon-purple" />
                <span className="text-sm font-medium">{token.score}</span>
              </div>
              <div className="flex items-center gap-2 sm:w-10">
                <span className="text-neon-green text-sm font-semibold sm:hidden">{token.change}</span>
                <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground shrink-0" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Boost CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 glass p-6 flex flex-col sm:flex-row items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-pink/20 to-neon-purple/20 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-6 h-6 text-neon-pink" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-display font-semibold mb-1">Boost Your Token</h3>
            <p className="text-sm text-muted-foreground">Pay to increase your ranking score and get more visibility</p>
          </div>
          <button className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-primary-foreground text-sm font-semibold neon-glow">
            Boost Now
          </button>
        </motion.div>
      </div>
    </div>
  );
}
