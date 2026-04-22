DROP POLICY IF EXISTS "Authenticated users can create tokens" ON public.tokens;
CREATE POLICY "Users can create tokens for linked wallet"
ON public.tokens
FOR INSERT
TO authenticated
WITH CHECK (
  creator_wallet = (
    SELECT users.wallet_address
    FROM public.users
    WHERE users.auth_user_id = auth.uid()
    LIMIT 1
  )
);

DROP POLICY IF EXISTS "Authenticated users can create pools" ON public.liquidity_pools;
CREATE POLICY "Users can create pools for linked wallet"
ON public.liquidity_pools
FOR INSERT
TO authenticated
WITH CHECK (
  creator_wallet = (
    SELECT users.wallet_address
    FROM public.users
    WHERE users.auth_user_id = auth.uid()
    LIMIT 1
  )
);

DROP POLICY IF EXISTS "Authenticated users can create boosts" ON public.boosts;
CREATE POLICY "Users can create boosts for linked wallet"
ON public.boosts
FOR INSERT
TO authenticated
WITH CHECK (
  user_wallet = (
    SELECT users.wallet_address
    FROM public.users
    WHERE users.auth_user_id = auth.uid()
    LIMIT 1
  )
);

DROP POLICY IF EXISTS "Service can insert transactions" ON public.transactions;
CREATE POLICY "Users can create transactions for linked wallet"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (
  user_wallet = (
    SELECT users.wallet_address
    FROM public.users
    WHERE users.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "Service role can insert transactions"
ON public.transactions
FOR INSERT
TO service_role
WITH CHECK (true);