-- Competidores del reto + categorías de vida personalizadas

CREATE TABLE IF NOT EXISTS user_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  share_code TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, share_code)
);

CREATE TABLE IF NOT EXISTS user_metric_categories (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '✨',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, label)
);

ALTER TABLE user_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_metric_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own competitors" ON user_competitors;
CREATE POLICY "Users manage own competitors" ON user_competitors
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own categories" ON user_metric_categories;
CREATE POLICY "Users manage own categories" ON user_metric_categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
