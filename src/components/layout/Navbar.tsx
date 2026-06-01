import { Link } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const Navbar = () => {
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 glass-strong h-16 flex items-center px-6">
      <div className="container mx-auto max-w-6xl flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
            <Rocket className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-sm gradient-text">SolForge</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link to="/trending" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
            Trending
          </Link>
          <Link to="/create" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
            Create
          </Link>
          {user ? (
            <Link to="/dashboard" className="px-4 py-2 rounded-lg bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground text-sm font-semibold neon-glow">
              Dashboard
            </Link>
          ) : (
            <Link to="/auth" className="px-4 py-2 rounded-lg bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground text-sm font-semibold neon-glow">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};
