
-- 1) TOKENS: replace UPDATE policy with strict USING + WITH CHECK so
--    creators can only modify their own token AND cannot reassign creator_wallet.
DROP POLICY IF EXISTS "Creators can update own tokens" ON public.tokens;

CREATE POLICY "Creators can update own tokens"
ON public.tokens
FOR UPDATE
TO authenticated
USING (
  creator_wallet = (
    SELECT users.wallet_address FROM public.users
    WHERE users.auth_user_id = auth.uid()
    LIMIT 1
  )
)
WITH CHECK (
  creator_wallet = (
    SELECT users.wallet_address FROM public.users
    WHERE users.auth_user_id = auth.uid()
    LIMIT 1
  )
);

-- 2) TRENDING_STATS: drop any permissive write policies; only admins
--    (via has_role) and the service_role (bypasses RLS) can write.
DROP POLICY IF EXISTS "Anyone can insert trending stats" ON public.trending_stats;
DROP POLICY IF EXISTS "Anyone can update trending stats" ON public.trending_stats;
DROP POLICY IF EXISTS "Public can manage trending stats" ON public.trending_stats;
DROP POLICY IF EXISTS "Admins can manage trending stats" ON public.trending_stats;

CREATE POLICY "Admins can insert trending stats"
ON public.trending_stats
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update trending stats"
ON public.trending_stats
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete trending stats"
ON public.trending_stats
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) TRANSACTIONS: ensure SELECT is owner-or-admin only.
DROP POLICY IF EXISTS "Anyone can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Public can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;

CREATE POLICY "Users can view own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  user_wallet = (
    SELECT users.wallet_address FROM public.users
    WHERE users.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "Admins can view all transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
