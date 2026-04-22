import { FC, ReactNode, useEffect, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import '@solana/wallet-adapter-react-ui/styles.css';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
}

export const SolanaWalletProvider: FC<Props> = ({ children }) => {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <WalletProfileSync />
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

function WalletProfileSync() {
  const { user } = useAuth();
  const { connected, publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58();

  useEffect(() => {
    if (!user || !connected || !walletAddress) return;

    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      null;

    void supabase
      .from('users')
      .upsert(
        {
          auth_user_id: user.id,
          wallet_address: walletAddress,
          ...(displayName ? { display_name: displayName } : {}),
        },
        { onConflict: 'auth_user_id' }
      )
      .then(({ error }) => {
        if (error) {
          console.warn('Failed to sync wallet address:', error);
        }
      });
  }, [connected, walletAddress, user]);

  return null;
}
