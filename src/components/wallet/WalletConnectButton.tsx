import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletName } from '@solana/wallet-adapter-phantom';
import { Wallet, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface Props {
  compact?: boolean;
}

export const WalletConnectButton = ({ compact = false }: Props) => {
  const { publicKey, disconnect, connected, select, connect, wallets } = useWallet();
  const { setVisible } = useWalletModal();
  const [tosAccepted, setTosAccepted] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : '';

  const handleConnect = async () => {
    if (!compact && !tosAccepted) return;

    const phantomProvider =
      (window as any)?.phantom?.solana ?? (window as any)?.solana;

    if (!phantomProvider?.isPhantom) {
      toast.error('Phantom wallet not detected', {
        description: 'Install Phantom to connect.',
        action: {
          label: 'Install',
          onClick: () => window.open('https://phantom.app/download', '_blank'),
        },
      });
      return;
    }

    const phantom = wallets.find((w) => w.adapter.name === PhantomWalletName);
    if (!phantom) {
      // Adapter not registered yet — fall back to modal
      setVisible(true);
      return;
    }

    try {
      setConnecting(true);
      select(PhantomWalletName);
      await connect();
      toast.success('Wallet connected');
    } catch (err: any) {
      console.error('Wallet connect failed:', err);
      const message =
        err?.message?.includes('User rejected')
          ? 'Connection request was rejected.'
          : err?.message || 'Could not connect to Phantom. Please try again.';
      toast.error('Connection failed', { description: message });
    } finally {
      setConnecting(false);
    }
  };

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

  const disabled = (!compact && !tosAccepted) || connecting;

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
        whileHover={{ scale: !disabled ? 1.05 : 1 }}
        whileTap={{ scale: !disabled ? 0.95 : 1 }}
        onClick={handleConnect}
        disabled={disabled}
        className={`flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold transition-all ${
          compact ? 'p-2' : 'px-4 py-2 text-sm w-full'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Connect Phantom"
      >
        <Wallet className="w-4 h-4" />
        {!compact && <span>{connecting ? 'Connecting…' : 'Connect Phantom'}</span>}
      </motion.button>
    </div>
  );
};
