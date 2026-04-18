-- Add premium tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS revenuecat_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS lifetime_purchase BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active_product_id TEXT,
  ADD COLUMN IF NOT EXISTS premium_updated_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_profiles_revenuecat_customer
  ON public.profiles(revenuecat_customer_id)
  WHERE revenuecat_customer_id IS NOT NULL;

-- Audit log of all RevenueCat webhook events
CREATE TABLE IF NOT EXISTS public.premium_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  product_id TEXT,
  store TEXT,
  environment TEXT,
  raw_event JSONB NOT NULL,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_premium_events_user ON public.premium_events(user_id, occurred_at DESC);

ALTER TABLE public.premium_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own premium events"
  ON public.premium_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies = only service role (edge functions) can write