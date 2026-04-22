import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Rocket, TrendingUp, Plus, ArrowLeftRight,
  Droplets, Shield, Briefcase, Settings, ChevronLeft, ChevronRight, Flame, LayoutDashboard, Menu, X
} from 'lucide-react';
import { useState } from 'react';
import { WalletConnectButton } from '../wallet/WalletConnectButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/create', label: 'Token Creator', icon: Plus, badge: true },
  { to: '/swap', label: 'Swap Tokens', icon: ArrowLeftRight },
  { to: '/liquidity', label: 'Liquidity Manager', icon: Droplets },
  { to: '/security', label: 'Security & Burn', icon: Shield },
  { to: '/portfolio', label: 'My Portfolio', icon: Briefcase },
  { to: '/trending', label: 'Trending', icon: Flame },
];

const adminItems = [
  { to: '/admin', label: 'Admin Panel', icon: Settings },
];

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  return (
    <>
      {/* Logo */}
      <div className="p-4 flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2 min-w-0" onClick={onNavigate}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center shrink-0">
            <Rocket className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <span className="font-display font-bold text-xs gradient-text leading-none block">Solana Token</span>
              <span className="font-display font-bold text-xs gradient-text leading-none block">City</span>
            </div>
          )}
        </Link>
      </div>

      {/* Network badge */}
      {!collapsed && (
        <div className="px-4 mb-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1 glass rounded-lg text-xs w-fit">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span className="text-muted-foreground">MAINNET</span>
          </div>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                active
                  ? 'bg-neon-purple/10 text-neon-purple'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-neon-purple rounded-full"
                />
              )}
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {item.badge && !collapsed && (
                <div className="w-1.5 h-1.5 rounded-full bg-neon-green ml-auto" />
              )}
            </Link>
          );
        })}

        {isAdmin && <div className="my-3 border-t border-border/50" />}

        {isAdmin && adminItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-neon-purple/10 text-neon-purple'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Auth link */}
        {!user && !collapsed && (
          <>
            <div className="my-3 border-t border-border/50" />
            <Link
              to="/auth"
              onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neon-purple hover:bg-neon-purple/10 transition-all"
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Sign In / Sign Up</span>
            </Link>
          </>
        )}
      </nav>

      {/* Wallet connect at bottom */}
      <div className="p-3 border-t border-border/50">
        <WalletConnectButton compact={collapsed} />
      </div>
    </>
  );
}

export const Sidebar = () => {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isMobile) {
    return (
      <>
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg glass text-foreground"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-64 bg-background border-r border-border">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="flex flex-col h-full">
              <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <aside className={`fixed top-0 left-0 h-full z-50 glass-strong transition-all duration-300 flex flex-col ${collapsed ? 'w-16' : 'w-56'}`}>
      <SidebarContent collapsed={collapsed} />

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
};
