-- Trade regrets linked to portfolio holdings (and symbol for warnings on future trades).
CREATE TABLE public.user_regrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  portfolio_id UUID REFERENCES public.user_portfolio(id) ON DELETE SET NULL,
  stock_symbol TEXT NOT NULL,
  industry TEXT,
  reason TEXT NOT NULL,
  reason_code TEXT,
  notes TEXT,
  trade_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX user_regrets_user_id_idx ON public.user_regrets (user_id);
CREATE INDEX user_regrets_stock_symbol_idx ON public.user_regrets (user_id, stock_symbol);

ALTER TABLE public.user_regrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own regrets"
  ON public.user_regrets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_regrets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.user_regrets IS 'User-documented trade regrets for guardrails and journal prompts';
