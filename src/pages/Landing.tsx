import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, TrendingUp, Zap, Shield, ArrowRight, Coins } from 'lucide-react';

const stats = [
  { label: 'Tokens Launched', value: '12,847' },
  { label: 'Total Volume', value: '$48.2M' },
  { label: 'Active Users', value: '23,591' },
];

const features = [
  { icon: Rocket, title: 'Launch in Seconds', description: 'Create and deploy your meme token on Solana in under a minute.' },
  { icon: Zap, title: 'Instant Liquidity', description: 'Add liquidity via Raydium pools automatically after launch.' },
  { icon: Shield, title: 'Verified & Secure', description: 'Every payment verified on-chain. No trust needed.' },
  { icon: TrendingUp, title: 'Trending Rankings', description: 'Get visibility through our trending algorithm and boost system.' },
];

const trendingMock = [
  { name: 'PEPE2', symbol: 'PEPE2', change: '+284%', volume: '$1.2M', color: 'from-neon-green to-neon-blue' },
  { name: 'Bonk Jr', symbol: 'BONKJ', change: '+156%', volume: '$892K', color: 'from-neon-pink to-neon-purple' },
  { name: 'SolCat', symbol: 'SCAT', change: '+98%', volume: '$456K', color: 'from-neon-purple to-neon-blue' },
];

export default function Landing() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="min-h-[90vh] flex items-center justify-center px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 glass rounded-full text-xs font-medium text-muted-foreground mb-8">
                <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                Live on Solana Mainnet
              </div>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-tight mb-6">
              Launch Your{' '}
              <span className="gradient-text">Meme Coin</span>
              <br />
              <span className="gradient-text-accent">In Seconds</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              The fastest meme coin launchpad on Solana. Create tokens, add liquidity, and go viral — all in one place.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/create" className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground font-semibold text-lg neon-glow hover:shadow-[0_0_40px_hsl(270_80%_60%/0.5)] transition-shadow">
                <Rocket className="w-5 h-5" /> Launch Token <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/trending" className="flex items-center gap-2 px-8 py-3.5 rounded-xl glass text-foreground font-semibold text-lg hover:bg-muted/80 transition-colors">
                <TrendingUp className="w-5 h-5" /> Explore Trending
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="flex items-center justify-center gap-8 sm:gap-16 mt-16">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="font-display text-2xl sm:text-3xl font-bold gradient-text">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trending Preview */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">🔥 <span className="gradient-text">Trending Now</span></h2>
            <p className="text-muted-foreground">Top performing tokens on Solana Token City</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {trendingMock.map((token, i) => (
              <motion.div key={token.symbol} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass p-5 hover:neon-glow transition-shadow cursor-pointer">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${token.color} flex items-center justify-center text-primary-foreground font-bold text-sm`}>{token.symbol[0]}</div>
                  <div>
                    <div className="font-semibold">{token.name}</div>
                    <div className="text-xs text-muted-foreground">${token.symbol}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neon-green font-semibold text-sm">{token.change}</span>
                  <span className="text-xs text-muted-foreground">Vol: {token.volume}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link to="/trending" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              View all trending tokens <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">Why <span className="gradient-text">Solana Token City</span>?</h2>
            <p className="text-muted-foreground">Everything you need to launch your meme coin empire</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feat, i) => (
              <motion.div key={feat.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass p-6 group hover:neon-glow transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 flex items-center justify-center mb-4">
                  <feat.icon className="w-6 h-6 text-neon-purple" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{feat.title}</h3>
                <p className="text-sm text-muted-foreground">{feat.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass p-10 sm:p-14 text-center neon-glow">
            <Coins className="w-12 h-12 text-neon-purple mx-auto mb-6" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">Ready to <span className="gradient-text-accent">Launch</span>?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">Create your meme token in under a minute. Only 0.3 SOL to launch.</p>
            <Link to="/create" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-primary-foreground font-semibold text-lg neon-glow">
              <Rocket className="w-5 h-5" /> Create Token Now
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
              <Rocket className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-sm gradient-text">Solana Token City</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Solana Token City. Built on Solana.</p>
        </div>
      </footer>
    </div>
  );
}
