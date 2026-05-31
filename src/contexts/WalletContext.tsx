import { FC, ReactNode, useEffect, useMemo, useState } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { useWallet } from '@solana/wallet-adapter-react';
import '@solana/wallet-adapter-react-ui/styles.css';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
}

export const SolanaWalletProvider: FC<Props> = ({ children }) => {
  // Route all RPC traffic through our edge function proxy.
  // Public `api.mainnet-beta.solana.com` blocks browser requests (403),
  // so we proxy through `rpc-proxy` which can use a paid RPC via SOLANA_RPC_URL.
  const endpoint = useMemo(
    () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rpc-proxy`,
    []
  );
  const [phantomDetected, setPhantomDetected] = useState(false);

  useEffect(() => {
    // Detect Phantom before initializing the adapter
    const detect = () => {
      const provider = (window as any)?.phantom?.solana ?? (window as any)?.solana;
      if (provider?.isPhantom) setPhantomDetected(true);
    };
    detect();
    // Phantom may inject slightly after page load
    const t = setTimeout(detect, 500);
    window.addEventListener('load', detect);
    return () => {
      clearTimeout(t);
      window.removeEventListener('load', detect);
    };
  }, []);

  const wallets = useMemo(
    () => (phantomDetected ? [new PhantomWalletAdapter()] : []),
    [phantomDetected]
  );

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
