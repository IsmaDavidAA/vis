-- Telegram notifications + partner linking
-- Run in SQL Editor after setup.sql

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_link_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_notify BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS partner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_telegram_link_code_uidx
  ON profiles (telegram_link_code)
  WHERE telegram_link_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_telegram_chat_id_uidx
  ON profiles (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

-- Avoid duplicate partner notifications spam
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, event_key)
);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notification log" ON notification_log;
CREATE POLICY "Users read own notification log" ON notification_log
  FOR SELECT USING (auth.uid() = user_id);

-- Inserts only via service role (Edge Functions)
DROP POLICY IF EXISTS "Service role manages notification log" ON notification_log;

-- Permitir buscar pareja por código (vía RPC lookup_profile_by_code)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "View shared profiles" ON profiles;
DROP POLICY IF EXISTS "Partners can view partner profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;

CREATE OR REPLACE FUNCTION public.auth_partner_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT partner_user_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.lookup_profile_by_code(p_code TEXT)
RETURNS TABLE (user_id UUID, display_name TEXT, partner_user_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.partner_user_id
  FROM public.profiles p
  WHERE UPPER(p.share_code) = UPPER(TRIM(p_code))
     OR UPPER(p.telegram_link_code) = UPPER(TRIM(p_code))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.auth_partner_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_profile_by_code(TEXT) TO authenticated;

CREATE POLICY "Users can view profiles" ON profiles
  FOR SELECT USING (
    auth.uid() = user_id
    OR sharing_enabled = true
    OR auth.uid() = partner_user_id
    OR user_id = public.auth_partner_user_id()
  );
