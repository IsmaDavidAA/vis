-- VIS Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Profiles
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals
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

-- Monthly non-negotiables
CREATE TABLE IF NOT EXISTS monthly_non_negotiables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL CHECK (month IN ('julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre')),
  title TEXT NOT NULL,
  UNIQUE(user_id, month)
);

-- Daily check-ins
CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT FALSE,
  points INTEGER DEFAULT 0,
  UNIQUE(user_id, goal_id, date)
);

-- User stats (gamification)
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  lives INTEGER DEFAULT 5,
  max_lives INTEGER DEFAULT 5,
  streak INTEGER DEFAULT 0,
  stars_earned INTEGER DEFAULT 0,
  fails INTEGER DEFAULT 0
);

-- Prizes
CREATE TABLE IF NOT EXISTS prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  claimed_by UUID REFERENCES auth.users(id)
);

-- Seed default prizes (minipremios dobles — sin costo alto)
INSERT INTO prizes (title, description) VALUES
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
  ('Fotos tontas en el parque', '30 min de fotos divertidas juntos. El otro no puede poner cara seria.'),
  ('Playlist para manejar', 'Armas la playlist. Manejan juntos a donde quieras.'),
  ('Un sábado tú mandas', 'Tú decides qué hacen un sábado completo. Sin gastar mucho.'),
  ('Gloria eterna', 'El otro admite en voz alta que ganaste. Una vez. Con testigos.')
ON CONFLICT DO NOTHING;

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_non_negotiables ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- Goals policies
CREATE POLICY "Users can view own goals" ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON goals FOR DELETE USING (auth.uid() = user_id);

-- Non-negotiables policies
CREATE POLICY "Users can manage own non-negotiables" ON monthly_non_negotiables
  FOR ALL USING (auth.uid() = user_id);

-- Checkins policies
CREATE POLICY "Users can manage own checkins" ON checkins
  FOR ALL USING (auth.uid() = user_id);

-- Stats: users see own, everyone sees leaderboard stats
CREATE POLICY "Users can view all stats" ON user_stats FOR SELECT USING (true);
CREATE POLICY "Users can manage own stats" ON user_stats
  FOR ALL USING (auth.uid() = user_id);

-- Prizes: everyone can view, winner can claim
CREATE POLICY "Everyone can view prizes" ON prizes FOR SELECT USING (true);
CREATE POLICY "Authenticated can claim prizes" ON prizes FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Auto-create profile and stats on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  INSERT INTO user_stats (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Leaderboard view
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
