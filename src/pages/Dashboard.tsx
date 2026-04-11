import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { motion } from 'framer-motion';
import { Wallet, Coins, TrendingUp, Clock, ExternalLink, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const myTokens = [
  { name: 'PepeSol', symbol: 'PEPES', supply: '1B', liquidity: '$890K', status: 'Live', change: '+342%' },
  { name: 'MoonCat', symbol: 'MCAT', supply: '500M', liquidity: '$380K', status: 'Live', change: '+124%' },
  { name: 'RocketInu', symbol: 'RINU', supply: '10B', liquidity: '-', status: 'No Liquidity', change: '-' },
];

const transactions = [
  { type: 'CREATE_TOKEN', token: 'PepeSol', amount: '0.3 SOL', time: '2h ago', status: 'Confirmed' },
  { type: 'ADD_LIQUIDITY', token: 'PepeSol', amount: '5 SOL', time: '2h ago', status: 'Confirmed' },
  { type: 'BOOST', token: 'PepeSol', amount: '1 SOL', time: '1h ago', status: 'Confirmed' },
  { type: 'CREATE_TOKEN', token: 'MoonCat', amount: '0.3 SOL', time: '5h ago', status: 'Confirmed' },
];

export default function Dashboard() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass p-10 text-center max-w-md">
          <Wallet className="w-12 h-12 text-neon-purple mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground text-sm mb-6">Connect your Phantom wallet to view your dashboard</p>
          <button
            onClick={() => setVisible(true)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground font-semibold neon-glow"
          >
            Connect Wallet
          </button>
        </motion.div>
      </div>
    );
  }

  const shortAddr = publicKey ? `${publicKey.toBase58().slice(0, 6)}...${publicKey.toBase58().slice(-4)}` : '';

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold mb-1">Dashboard</h1>
            <p className="text-muted-foreground text-sm font-mono">{shortAddr}</p>
          </div>
          <Link
            to="/create"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground text-sm font-semibold neon-glow"
          >
            <Plus className="w-4 h-4" />
            Create Token
          </Link>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Coins, label: 'Tokens Created', value: '3' },
            { icon: TrendingUp, label: 'Total Volume', value: '$1.27M' },
            { icon: Clock, label: 'Transactions', value: '4' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass p-5"
            >
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
            {myTokens.map((token, i) => (
              <div key={token.symbol} className="flex items-center justify-between px-5 py-4 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center text-primary-foreground text-xs font-bold">
                    {token.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{token.name}</div>
                    <div className="text-xs text-muted-foreground">${token.symbol} · Supply: {token.supply}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <div className={`text-sm font-semibold ${token.change === '-' ? 'text-muted-foreground' : 'text-neon-green'}`}>{token.change}</div>
                    <div className="text-xs text-muted-foreground">{token.status}</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Transactions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="font-display text-lg font-bold mb-4">Recent Transactions</h2>
          <div className="glass overflow-hidden">
            {transactions.map((tx, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                    tx.type === 'CREATE_TOKEN' ? 'bg-neon-purple/20 text-neon-purple' :
                    tx.type === 'ADD_LIQUIDITY' ? 'bg-neon-blue/20 text-neon-blue' :
                    'bg-neon-pink/20 text-neon-pink'
                  }`}>
                    {tx.type.replace('_', ' ')}
                  </div>
                  <span className="text-sm">{tx.token}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">{tx.amount}</span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">{tx.time}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
