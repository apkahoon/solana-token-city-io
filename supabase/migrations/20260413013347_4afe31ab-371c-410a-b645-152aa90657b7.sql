
-- Fix tokens: broken "Creators can update own tokens" policy (creator_wallet = creator_wallet is always true)
DROP POLICY IF EXISTS "Creators can update own tokens" ON public.tokens;
DROP POLICY IF EXISTS "Anyone can create tokens" ON public.tokens;

CREATE POLICY "Creators can update own tokens" ON public.tokens
FOR UPDATE TO authenticated
USING (creator_wallet = (SELECT wallet_address FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1));

CREATE POLICY "Authenticated users can create tokens" ON public.tokens
FOR INSERT TO authenticated
WITH CHECK (true);

-- Fix transactions: remove public read, restrict to own wallet
DROP POLICY IF EXISTS "Anyone can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Anyone can create transactions" ON public.transactions;

CREATE POLICY "Users can view own transactions" ON public.transactions
FOR SELECT TO authenticated
USING (user_wallet = (SELECT wallet_address FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1));

CREATE POLICY "Service can insert transactions" ON public.transactions
FOR INSERT TO authenticated
WITH CHECK (true);

-- Admin can view all transactions
CREATE POLICY "Admins can view all transactions" ON public.transactions
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix users: broken update policy (wallet_address = wallet_address is always true)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert themselves" ON public.users;

CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.users
FOR INSERT TO authenticated
WITH CHECK (auth_user_id = auth.uid());

-- Fix user_roles: add RLS policies
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own role" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix boosts: restrict insert to authenticated
DROP POLICY IF EXISTS "Anyone can create boosts" ON public.boosts;

CREATE POLICY "Authenticated users can create boosts" ON public.boosts
FOR INSERT TO authenticated
WITH CHECK (true);

-- Fix liquidity_pools: restrict insert to authenticated
DROP POLICY IF EXISTS "Anyone can create pools" ON public.liquidity_pools;

CREATE POLICY "Authenticated users can create pools" ON public.liquidity_pools
FOR INSERT TO authenticated
WITH CHECK (true);

-- Fix trending_stats: remove public write access
DROP POLICY IF EXISTS "Anyone can insert trending stats" ON public.trending_stats;
DROP POLICY IF EXISTS "Anyone can update trending stats" ON public.trending_stats;

-- Only admins/service role can write trending stats
CREATE POLICY "Admins can manage trending stats" ON public.trending_stats
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Also allow handle_new_user trigger to work (it uses service role, so no policy needed)
-- But ensure the trigger function exists for auth signup
