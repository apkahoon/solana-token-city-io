
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_simulated boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
