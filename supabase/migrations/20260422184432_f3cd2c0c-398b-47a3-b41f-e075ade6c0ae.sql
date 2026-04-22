ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_wallet_address_key;

CREATE UNIQUE INDEX IF NOT EXISTS users_wallet_address_key
ON public.users (wallet_address)
WHERE wallet_address IS NOT NULL AND btrim(wallet_address) <> '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, display_name, wallet_address)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NULL
  )
  ON CONFLICT (auth_user_id) DO UPDATE
  SET display_name = COALESCE(EXCLUDED.display_name, public.users.display_name);

  RETURN NEW;
END;
$$;