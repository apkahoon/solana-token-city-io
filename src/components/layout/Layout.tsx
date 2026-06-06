import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ChatWidget } from '../chatbot/ChatWidget';
import { useIsMobile } from '@/hooks/use-mobile';

export const Layout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isAuth = location.pathname === '/auth';
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Devnet banner */}
      <div className="fixed top-0 inset-x-0 z-[60] bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-black text-center text-xs font-semibold py-1 px-3">
        🧪 DEVNET MODE — Test network. Get free SOL at{' '}
        <a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer" className="underline">faucet.solana.com</a>
      </div>
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-neon-purple/5 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-neon-blue/5 blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-neon-pink/3 blur-[100px] animate-pulse-slow" style={{ animationDelay: '4s' }} />
      </div>

      {isLanding || isAuth ? (
        <>
          <Navbar />
          <main className="relative pt-24">{children}</main>
        </>
      ) : (
        <div className="flex pt-6">
          <Sidebar />
          <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isMobile ? 'ml-0 pt-14' : 'ml-56'}`}>
            <main className="relative flex-1 pt-4 pb-4">{children}</main>
            <Footer />
          </div>
        </div>
      )}

      {/* Global Chatbot */}
      <ChatWidget />
    </div>
  );
};
