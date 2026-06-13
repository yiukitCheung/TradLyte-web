-- Persist onboarding answers on profiles (not just browser localStorage).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS primary_goal text,
  ADD COLUMN IF NOT EXISTS purpose_statement text,
  ADD COLUMN IF NOT EXISTS investment_experience text,
  ADD COLUMN IF NOT EXISTS time_horizon text,
  ADD COLUMN IF NOT EXISTS risk_tolerance text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_experience_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_experience_check
      CHECK (
        investment_experience IS NULL
        OR investment_experience IN ('beginner', 'intermediate', 'advanced')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_time_horizon_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_time_horizon_check
      CHECK (
        time_horizon IS NULL
        OR time_horizon IN ('short', 'medium', 'long')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_risk_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_risk_check
      CHECK (
        risk_tolerance IS NULL
        OR risk_tolerance IN ('conservative', 'moderate', 'aggressive')
      );
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

COMMENT ON COLUMN public.profiles.onboarding_complete IS 'True once the purpose onboarding flow has been saved.';
