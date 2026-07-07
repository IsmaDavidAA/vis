-- Link habits to specific goals; allow multiple goals per section

ALTER TABLE user_metrics ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES goals(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_metrics_goal_id ON user_metrics (goal_id);

-- Allow goals in custom sections (not only built-in categories)
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_category_check;
