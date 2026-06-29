-- Add an explicit purchase date to user_portfolio so the portfolio chart can
-- anchor to when a holding was actually bought, not when it was added in-app
-- (which is all created_at captured). Nullable on purpose: existing rows fall
-- back to created_at on the client, so this is additive and safe to apply live.
ALTER TABLE public.user_portfolio
  ADD COLUMN IF NOT EXISTS purchase_date date;
