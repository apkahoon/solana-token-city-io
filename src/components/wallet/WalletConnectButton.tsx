import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Wallet, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  compact?: boolean;
}

export const WalletConnectButton = ({ compact = false }: Props) => {
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();

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
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setVisible(true)}
      className={`flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground font-semibold neon-glow transition-shadow hover:shadow-[0_0_30px_hsl(270_80%_60%/0.5)] ${
        compact ? 'p-2' : 'px-4 py-2 text-sm w-full'
      }`}
      title="Connect Wallet"
    >
      <Wallet className="w-4 h-4" />
      {!compact && <span>Connect</span>}
    </motion.button>
  );
};
