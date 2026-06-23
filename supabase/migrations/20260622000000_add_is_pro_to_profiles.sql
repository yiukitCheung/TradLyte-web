-- Add a pro-tier flag to profiles. Additive + safe: existing rows default false,
-- code that ignores the column keeps working. Gates the Pro Strategy Lab.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_pro boolean NOT NULL DEFAULT false;
