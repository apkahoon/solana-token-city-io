
-- Fix: Restrict users table SELECT to prevent exposure of auth_user_id and PII to anonymous visitors
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;

CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix: Remove redundant always-true INSERT policy on transactions
-- (service_role bypasses RLS entirely, so this policy is unnecessary and flagged as overly permissive)
DROP POLICY IF EXISTS "Service role can insert transactions" ON public.transactions;
