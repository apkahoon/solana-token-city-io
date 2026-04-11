
-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Users table (wallet-based identity)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  display_name TEXT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert themselves" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (wallet_address = wallet_address);

-- Transaction type enum
CREATE TYPE public.tx_type AS ENUM ('CREATE_TOKEN', 'ADD_LIQUIDITY', 'BOOST', 'SWAP', 'BURN');

-- Tokens table
CREATE TABLE public.tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  supply NUMERIC NOT NULL,
  decimals INT NOT NULL DEFAULT 9,
  mint_address TEXT UNIQUE,
  creator_wallet TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  website TEXT,
  twitter TEXT,
  telegram TEXT,
  liquidity_added BOOLEAN NOT NULL DEFAULT false,
  pool_address TEXT,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-flagged tokens" ON public.tokens FOR SELECT USING (is_flagged = false OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can create tokens" ON public.tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Creators can update own tokens" ON public.tokens FOR UPDATE USING (creator_wallet = creator_wallet);
CREATE POLICY "Admins can update any token" ON public.tokens FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete tokens" ON public.tokens FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet TEXT NOT NULL,
  type tx_type NOT NULL,
  amount NUMERIC NOT NULL,
  tx_hash TEXT,
  token_id UUID REFERENCES public.tokens(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Anyone can create transactions" ON public.transactions FOR INSERT WITH CHECK (true);

-- Liquidity pools table
CREATE TABLE public.liquidity_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES public.tokens(id) ON DELETE CASCADE NOT NULL,
  pool_address TEXT NOT NULL,
  sol_amount NUMERIC NOT NULL DEFAULT 0,
  token_amount NUMERIC NOT NULL DEFAULT 0,
  liquidity_locked BOOLEAN NOT NULL DEFAULT false,
  creator_wallet TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.liquidity_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pools" ON public.liquidity_pools FOR SELECT USING (true);
CREATE POLICY "Anyone can create pools" ON public.liquidity_pools FOR INSERT WITH CHECK (true);

-- Trending stats table
CREATE TABLE public.trending_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES public.tokens(id) ON DELETE CASCADE NOT NULL UNIQUE,
  volume_24h NUMERIC NOT NULL DEFAULT 0,
  buys_24h INT NOT NULL DEFAULT 0,
  liquidity NUMERIC NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  price_change_24h NUMERIC NOT NULL DEFAULT 0,
  score NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trending_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trending stats" ON public.trending_stats FOR SELECT USING (true);
CREATE POLICY "Anyone can insert trending stats" ON public.trending_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update trending stats" ON public.trending_stats FOR UPDATE USING (true);

-- Boosts table
CREATE TABLE public.boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES public.tokens(id) ON DELETE CASCADE NOT NULL,
  user_wallet TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view boosts" ON public.boosts FOR SELECT USING (true);
CREATE POLICY "Anyone can create boosts" ON public.boosts FOR INSERT WITH CHECK (true);

-- Platform config table
CREATE TABLE public.platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read config" ON public.platform_config FOR SELECT USING (true);
CREATE POLICY "Admins can manage config" ON public.platform_config FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tokens_updated_at BEFORE UPDATE ON public.tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trending_stats_updated_at BEFORE UPDATE ON public.trending_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_platform_config_updated_at BEFORE UPDATE ON public.platform_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_tokens_creator_wallet ON public.tokens(creator_wallet);
CREATE INDEX idx_tokens_mint_address ON public.tokens(mint_address);
CREATE INDEX idx_transactions_user_wallet ON public.transactions(user_wallet);
CREATE INDEX idx_transactions_token_id ON public.transactions(token_id);
CREATE INDEX idx_trending_stats_score ON public.trending_stats(score DESC);
CREATE INDEX idx_boosts_token_id ON public.boosts(token_id);

-- Enable realtime for trending
ALTER PUBLICATION supabase_realtime ADD TABLE public.tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trending_stats;
