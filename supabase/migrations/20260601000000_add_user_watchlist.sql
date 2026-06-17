-- Create user_watchlist table
-- Backs the mobile app's Watchlist page (replaces the web dashboard's mock list).
CREATE TABLE public.user_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, symbol)
);

ALTER TABLE public.user_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own watchlist"
  ON public.user_watchlist FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- List a user's watchlist newest-first.
CREATE INDEX user_watchlist_user_created_idx
  ON public.user_watchlist (user_id, created_at DESC);
