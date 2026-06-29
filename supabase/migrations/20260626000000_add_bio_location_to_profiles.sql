-- Editable freeform profile fields surfaced on the Profile page (Edit profile dialog).
-- RLS (auth.uid() = id) and the set_updated_at trigger already cover this table.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS location text;
