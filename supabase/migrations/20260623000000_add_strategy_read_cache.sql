-- Cache for the strategy "read" (behavioral narrative) shown on the stock
-- detail page. Keyed by (symbol, as_of_date) so a given week's read is
-- generated once and reused until the weekly pipeline refresh changes
-- as_of_date. Only the strategy-read Edge Function (service role) touches this
-- table; clients reach it through that function, never directly.
create table if not exists public.strategy_read_cache (
  symbol      text        not null,
  as_of_date  text        not null,
  narrative   text        not null,
  created_at  timestamptz not null default now(),
  primary key (symbol, as_of_date)
);

alter table public.strategy_read_cache enable row level security;
-- No policies on purpose: RLS denies anon/authenticated direct access. The
-- Edge Function uses the service role, which bypasses RLS.
