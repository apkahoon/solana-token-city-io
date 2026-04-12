import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SolanaWalletProvider } from "./contexts/WalletContext";
import { AuthProvider } from "./contexts/AuthContext";
import { Layout } from "./components/layout/Layout";
import Landing from "./pages/Landing";
import CreateToken from "./pages/CreateToken";
import Trending from "./pages/Trending";
import Portfolio from "./pages/Portfolio";
import Admin from "./pages/Admin";
import SwapTokens from "./pages/SwapTokens";
import LiquidityManager from "./pages/LiquidityManager";
import SecurityBurn from "./pages/SecurityBurn";
import Auth from "./pages/Auth";
import UserDashboard from "./pages/UserDashboard";
import TokenDetail from "./pages/TokenDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <SolanaWalletProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/create" element={<CreateToken />} />
                <Route path="/trending" element={<Trending />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/dashboard" element={<UserDashboard />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/swap" element={<SwapTokens />} />
                <Route path="/liquidity" element={<LiquidityManager />} />
                <Route path="/security" element={<SecurityBurn />} />
                <Route path="/token/:id" element={<TokenDetail />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </SolanaWalletProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
