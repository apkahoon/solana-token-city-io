-- Defense-in-depth: explicit restrictive policy ensuring only admins can ever
-- insert/update/delete rows in user_roles, even if a future permissive policy
-- is added by mistake.
CREATE POLICY "Restrict user_roles writes to admins"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));