import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Wallet, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface Props {
  compact?: boolean;
}

export const WalletConnectButton = ({ compact = false }: Props) => {
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [tosAccepted, setTosAccepted] = useState(false);

  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : '';

  if (connected && publicKey) {
    return (
      <div className={`flex items-center ${compact ? 'justify-center' : 'gap-2'}`}>
        {!compact && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-lg text-xs text-muted-foreground flex-1 min-w-0">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse shrink-0" />
            <span className="truncate">{shortAddress}</span>
          </div>
        )}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => disconnect()}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Disconnect"
        >
          <LogOut className="w-4 h-4" />
        </motion.button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!compact && (
        <label className="flex items-start gap-2 cursor-pointer text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={tosAccepted}
            onChange={(e) => setTosAccepted(e.target.checked)}
            className="mt-0.5 rounded border-border"
          />
          <span>
            I agree to the{' '}
            <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </span>
        </label>
      )}
      <motion.button
        whileHover={{ scale: tosAccepted || compact ? 1.05 : 1 }}
        whileTap={{ scale: tosAccepted || compact ? 0.95 : 1 }}
        onClick={() => {
          if (compact || tosAccepted) setVisible(true);
        }}
        disabled={!compact && !tosAccepted}
        className={`flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold transition-all ${
          compact ? 'p-2' : 'px-4 py-2 text-sm w-full'
        } ${!compact && !tosAccepted ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Connect Wallet"
      >
        <Wallet className="w-4 h-4" />
        {!compact && <span>Connect</span>}
      </motion.button>
    </div>
  );
};
