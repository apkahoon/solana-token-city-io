import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownUp, Settings, ChevronDown, Loader2 } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

const tokens = [
  { symbol: 'SOL', name: 'Solana', icon: '◎', balance: '12.45' },
  { symbol: 'USDC', name: 'USD Coin', icon: '$', balance: '1,234.56' },
  { symbol: 'PEPES', name: 'PepeSol', icon: '🐸', balance: '1,000,000' },
];

export default function SwapTokens() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [fromToken, setFromToken] = useState(tokens[0]);
  const [toToken, setToToken] = useState(tokens[1]);
  const [fromAmount, setFromAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);

  const estimatedOutput = fromAmount ? (Number(fromAmount) * 142.5).toFixed(2) : '0.00';

  const handleSwapDirection = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount('');
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-md mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold mb-2">
            <span className="gradient-text">Swap Tokens</span>
          </h1>
          <p className="text-muted-foreground text-sm">Trade tokens instantly on Solana</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-5 relative">
          {/* Settings */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Swap</span>
            <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {showSettings && (
            <div className="mb-4 glass p-3 rounded-lg">
              <label className="text-xs text-muted-foreground mb-1.5 block">Slippage Tolerance</label>
              <div className="flex items-center gap-2">
                {['0.1', '0.5', '1.0'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlippage(s)}
                    className={`px-3 py-1 rounded text-xs font-medium ${slippage === s ? 'bg-neon-purple/20 text-neon-purple' : 'bg-muted text-muted-foreground'}`}
                  >
                    {s}%
                  </button>
                ))}
                <input
                  type="number"
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  className="w-16 px-2 py-1 rounded bg-muted border border-border text-xs text-right"
                  placeholder="Custom"
                />
              </div>
            </div>
          )}

          {/* From */}
          <div className="glass p-4 rounded-lg mb-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">From</span>
              <span className="text-xs text-muted-foreground">Balance: {fromToken.balance}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-xl font-display font-bold focus:outline-none placeholder:text-muted-foreground"
              />
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium">
                <span>{fromToken.icon}</span>
                <span>{fromToken.symbol}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Swap direction */}
          <div className="flex justify-center -my-3 relative z-10">
            <button onClick={handleSwapDirection} className="w-8 h-8 rounded-lg glass flex items-center justify-center text-muted-foreground hover:text-foreground hover:neon-glow transition-all">
              <ArrowDownUp className="w-4 h-4" />
            </button>
          </div>

          {/* To */}
          <div className="glass p-4 rounded-lg mt-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">To (estimated)</span>
              <span className="text-xs text-muted-foreground">Balance: {toToken.balance}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-xl font-display font-bold text-muted-foreground">
                {estimatedOutput}
              </div>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium">
                <span>{toToken.icon}</span>
                <span>{toToken.symbol}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Rate info */}
          {fromAmount && (
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>Rate</span><span>1 {fromToken.symbol} = 142.5 {toToken.symbol}</span></div>
              <div className="flex justify-between"><span>Slippage</span><span>{slippage}%</span></div>
              <div className="flex justify-between"><span>Network Fee</span><span>~0.00005 SOL</span></div>
            </div>
          )}

          {/* Swap button */}
          <button
            onClick={() => !connected && setVisible(true)}
            className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground font-semibold neon-glow"
          >
            {connected ? 'Swap' : 'Connect Wallet to Swap'}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
