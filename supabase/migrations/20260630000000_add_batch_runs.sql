-- Batch backtesting: a saved matrix of tickers × strategies plus the per-cell
-- result snapshots that back the batch analytics page.
--
-- Two tables, both RLS-scoped to auth.uid(): `batch_runs` is one saved batch;
-- `batch_run_cells` is one backtest within it (a single symbol × strategy).
-- Cells carry a denormalized user_id so RLS is a direct auth.uid() = user_id
-- check without a join back to the parent.

CREATE TABLE public.batch_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  tickers TEXT[] NOT NULL,
  strategy_ids TEXT[] NOT NULL,
  timeframe TEXT NOT NULL DEFAULT '1d',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  initial_capital NUMERIC NOT NULL DEFAULT 10000,
  -- Max tolerable drawdown (percent magnitude, e.g. 12 = −12%) used to rank the
  -- deploy champion: highest return among cells within this cap.
  dd_cap NUMERIC NOT NULL DEFAULT 12,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'complete', 'partial', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.batch_run_cells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_run_id UUID REFERENCES public.batch_runs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'done', 'failed')),
  error TEXT,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (batch_run_id, symbol, strategy_id)
);

ALTER TABLE public.batch_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_run_cells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own batch runs"
  ON public.batch_runs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own batch run cells"
  ON public.batch_run_cells FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- List a user's batches newest-first.
CREATE INDEX batch_runs_user_created_idx
  ON public.batch_runs (user_id, created_at DESC);

-- Load all cells for one batch.
CREATE INDEX batch_run_cells_run_idx
  ON public.batch_run_cells (batch_run_id);
