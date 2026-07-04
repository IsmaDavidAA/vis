-- VIS — Setup completo (ejecutar UNA vez en Supabase SQL Editor)
-- Proyecto: https://supabase.com/dashboard/project/adwmdjqqysnivtjudrhm/sql

-- ─── Tablas ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  current_state TEXT DEFAULT '',
  accountability_partner TEXT DEFAULT '',
  december_feeling TEXT DEFAULT '',
  december_have TEXT DEFAULT '',
  december_left TEXT DEFAULT '',
  onboarding_complete BOOLEAN DEFAULT FALSE,
  share_code TEXT UNIQUE,
  sharing_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('salud', 'dinero', 'aprender', 'relaciones', 'dejar')),
  title TEXT NOT NULL,
  description TEXT,
  month TEXT CHECK (month IN ('julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre')),
  is_non_negotiable BOOLEAN DEFAULT FALSE,
  relationship_name TEXT,
  relationship_change TEXT,
  learn_how TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_non_negotiables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL CHECK (month IN ('julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre')),
  title TEXT NOT NULL,
  UNIQUE(user_id, month)
);

CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT FALSE,
  points INTEGER DEFAULT 0,
  UNIQUE(user_id, goal_id, date)
);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  lives INTEGER DEFAULT 5,
  max_lives INTEGER DEFAULT 5,
  streak INTEGER DEFAULT 0,
  stars_earned INTEGER DEFAULT 0,
  fails INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  claimed_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS user_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id TEXT NOT NULL,
  daily_target INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  is_custom BOOLEAN DEFAULT FALSE,
  custom_title TEXT,
  custom_icon TEXT DEFAULT '✨',
  custom_description TEXT DEFAULT '',
  custom_type TEXT DEFAULT 'boolean',
  custom_unit TEXT,
  goal_category TEXT,
  difficulty TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, template_id)
);

CREATE TABLE IF NOT EXISTS metric_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  metric_id UUID REFERENCES user_metrics(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  value INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, metric_id, date)
);

CREATE TABLE IF NOT EXISTS shared_snapshots (
  share_code TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  snapshot JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_prize_collection (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prize_id TEXT NOT NULL,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, prize_id)
);

-- Columnas extra si profiles ya existía sin ellas
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sharing_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_link_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_notify BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS partner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ─── Premios iniciales ────────────────────────────────────────────────────

INSERT INTO prizes (title, description)
SELECT t.title, t.description
FROM (VALUES
  ('Desayuno en cama', 'El otro te prepara desayuno un domingo. Sin excusas.'),
  ('Elige la película', 'Tú eliges peli o serie. El otro ve sin quejarse.'),
  ('Masaje de 15 min', 'El otro te da masaje de hombros y espalda. Timer incluido.'),
  ('Semana sin platos', 'El otro lava los platos toda la semana. Tú solo miras.'),
  ('Paseo a tu elección', 'Eliges ruta, parque o lugar. Van juntos, gratis.'),
  ('Carta de gratitud', 'El otro te escribe una carta bonita a mano. Sin ChatGPT.'),
  ('Café por 3 mañanas', 'El otro te prepara café o té 3 mañanas seguidas.'),
  ('Noche de juegos', 'Tú eliges el juego de mesa o cartas. Juegan juntos.'),
  ('Cocina mi favorito', 'El otro cocina tu platillo favorito. Tú eliges cuál.'),
  ('3 favores canjeables', 'Guardas 3 favores pequeños: hacer la cama, un errand, lo que sea.'),
  ('Tarde planificada gratis', 'Tú planeas una tarde sin gastar: picnic, parque, biblioteca.'),
  ('Karaoke en casa', 'Eliges 5 canciones. Cantan juntos en la sala.'),
  ('Fotos tontas en el parque', '30 min de fotos divertidas juntos.'),
  ('Playlist para manejar', 'Armas la playlist. Manejan juntos a donde quieras.'),
  ('Un sábado tú mandas', 'Tú decides qué hacen un sábado completo. Sin gastar mucho.'),
  ('Gloria eterna', 'El otro admite en voz alta que ganaste. Una vez. Con testigos.')
) AS t(title, description)
WHERE NOT EXISTS (SELECT 1 FROM prizes LIMIT 1);

-- ─── RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_non_negotiables ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_prize_collection ENABLE ROW LEVEL SECURITY;

-- Policies (idempotentes)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
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

CREATE POLICY "Users can view profiles" ON profiles FOR SELECT
  USING (
    auth.uid() = user_id
    OR sharing_enabled = true
    OR auth.uid() = partner_user_id
    OR user_id = public.auth_partner_user_id()
  );
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON goals;
DROP POLICY IF EXISTS "Users can update own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON goals;
CREATE POLICY "Users can view own goals" ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON goals FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own non-negotiables" ON monthly_non_negotiables;
CREATE POLICY "Users can manage own non-negotiables" ON monthly_non_negotiables
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own checkins" ON checkins;
CREATE POLICY "Users can manage own checkins" ON checkins
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all stats" ON user_stats;
DROP POLICY IF EXISTS "Users can manage own stats" ON user_stats;
CREATE POLICY "Users can view all stats" ON user_stats FOR SELECT USING (true);
CREATE POLICY "Users can manage own stats" ON user_stats FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Everyone can view prizes" ON prizes;
DROP POLICY IF EXISTS "Authenticated can claim prizes" ON prizes;
CREATE POLICY "Everyone can view prizes" ON prizes FOR SELECT USING (true);
CREATE POLICY "Authenticated can claim prizes" ON prizes FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users manage own metrics" ON user_metrics;
CREATE POLICY "Users manage own metrics" ON user_metrics FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own metric entries" ON metric_entries;
CREATE POLICY "Users manage own metric entries" ON metric_entries FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view shared snapshots" ON shared_snapshots;
DROP POLICY IF EXISTS "Users manage own snapshots" ON shared_snapshots;
CREATE POLICY "Anyone can view shared snapshots" ON shared_snapshots FOR SELECT USING (true);
CREATE POLICY "Users manage own snapshots" ON shared_snapshots FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own prize collection" ON user_prize_collection;
CREATE POLICY "Users manage own prize collection" ON user_prize_collection
  FOR ALL USING (auth.uid() = user_id);

-- ─── Trigger: crear profile + stats al registrarse ──────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Vista leaderboard ────────────────────────────────────────────────────

CREATE OR REPLACE VIEW leaderboard AS
SELECT
  us.user_id,
  p.display_name,
  us.total_points,
  us.stars_earned,
  us.streak,
  RANK() OVER (ORDER BY us.total_points DESC) AS rank
FROM user_stats us
JOIN profiles p ON p.user_id = us.user_id
ORDER BY us.total_points DESC;

-- ─── Verificación ─────────────────────────────────────────────────────────
SELECT 'OK — tablas VIS creadas' AS status,
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') AS profiles_exists;
