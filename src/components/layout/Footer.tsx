import { Rocket } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="border-t border-border/50 px-6 py-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
            <Rocket className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="text-xs font-display font-bold gradient-text">SolForge</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Solana Devnet</span>
          <span>© 2026 SolForge</span>
        </div>
      </div>
    </footer>
  );
};
