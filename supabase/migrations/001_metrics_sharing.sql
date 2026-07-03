-- Migration: Metrics & Sharing
-- Run after schema.sql or merge into main schema

-- Add share fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sharing_enabled BOOLEAN DEFAULT FALSE;

-- User metrics (active tracking items)
CREATE TABLE IF NOT EXISTS user_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id TEXT NOT NULL,
  daily_target INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, template_id)
);

-- Metric daily entries
CREATE TABLE IF NOT EXISTS metric_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  metric_id UUID REFERENCES user_metrics(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  value INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, metric_id, date)
);

-- Public snapshots for sharing (no auth required to read)
CREATE TABLE IF NOT EXISTS shared_snapshots (
  share_code TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  snapshot JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own metrics" ON user_metrics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own metric entries" ON metric_entries
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view shared snapshots" ON shared_snapshots
  FOR SELECT USING (true);

CREATE POLICY "Users manage own snapshots" ON shared_snapshots
  FOR ALL USING (auth.uid() = user_id);

-- Allow viewing shared profiles when sharing is enabled
CREATE POLICY "View shared profiles" ON profiles
  FOR SELECT USING (sharing_enabled = true OR auth.uid() = user_id);

-- Function to sync snapshot on share
CREATE OR REPLACE FUNCTION sync_shared_snapshot(p_share_code TEXT, p_snapshot JSONB)
RETURNS VOID AS $$
BEGIN
  INSERT INTO shared_snapshots (share_code, user_id, snapshot, updated_at)
  VALUES (p_share_code, auth.uid(), p_snapshot, NOW())
  ON CONFLICT (share_code) DO UPDATE
  SET snapshot = p_snapshot, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
