-- Add strategy fields to user_portfolio table
ALTER TABLE public.user_portfolio
ADD COLUMN strategy_name text,
ADD COLUMN strategy_description text,
ADD COLUMN strategy_allocation jsonb,
ADD COLUMN strategy_progress numeric DEFAULT 0;

-- Drop the user_strategies table (it has no data)
DROP TABLE public.user_strategies;