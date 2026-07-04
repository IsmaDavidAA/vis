-- Fix: infinite recursion in profiles RLS (42P17)
-- Ejecutar en Supabase SQL Editor

-- Lee partner_user_id del usuario actual sin disparar RLS recursivo
CREATE OR REPLACE FUNCTION public.auth_partner_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT partner_user_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Buscar perfil por código de share/telegram (para vincular pareja)
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

-- Reemplazar política SELECT recursiva
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "View shared profiles" ON profiles;
DROP POLICY IF EXISTS "Partners can view partner profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;

CREATE POLICY "Users can view profiles" ON profiles
  FOR SELECT USING (
    auth.uid() = user_id
    OR sharing_enabled = true
    OR auth.uid() = partner_user_id
    OR user_id = public.auth_partner_user_id()
  );

-- Asegurar INSERT/UPDATE (idempotente)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);
