-- Add a user-defined ordering to user_goals so the mobile Goals screen can
-- persist reordering (the top goal becomes the "summit").
ALTER TABLE public.user_goals
ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Backfill a stable order from creation time, per user.
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1 AS rn
  FROM public.user_goals
)
UPDATE public.user_goals g
SET sort_order = o.rn
FROM ordered o
WHERE g.id = o.id;

COMMENT ON COLUMN public.user_goals.sort_order IS 'User-defined goal ordering; 0 = top/summit goal.';
