-- ============================================
-- SETUP DE AUTENTICACIÓN CON SUPABASE AUTH
-- ============================================
-- Este script configura el sistema de usuarios usando
-- Supabase Auth (auth.users) + tabla de perfiles (public.profiles)
--
-- ESTRATEGIA:
-- - Usamos Supabase Auth para autenticación (email/password)
-- - Email será: {username}@game.local (falso pero único)
-- - Tabla public.profiles almacena el username real
-- - RLS usa auth.uid() nativo de Supabase
--
-- INSTRUCCIONES:
-- 1. Abre tu dashboard de Supabase
-- 2. Ve a SQL Editor
-- 3. Copia y pega este script completo
-- 4. Ejecuta (Run)
-- ============================================

-- ============================================
-- TABLA: public.profiles
-- ============================================
-- Almacena información adicional del usuario (username real)
-- Vinculada a auth.users mediante user_id
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT username_length CHECK (char_length(username) >= 3),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]+$')
);

-- Índice para búsquedas rápidas por username
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Índice para ordenar por fecha de creación
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- ============================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en public.profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCIÓN: Crear perfil automáticamente al crear usuario
-- ============================================
-- Esta función se ejecuta cuando se crea un usuario en auth.users
-- Extrae el username del email (antes de @game.local) y lo guarda en profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  username_from_email TEXT;
BEGIN
  -- Extraer username del email: "username@game.local" -> "username"
  username_from_email := split_part(NEW.email, '@', 1);
  
  -- Insertar en profiles
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, username_from_email)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se ejecuta cuando se crea un usuario en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY (RLS) EN PROFILES
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política: Ver solo tu propio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Política: Actualizar solo tu propio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política: Cualquiera puede ver perfiles (para búsqueda de usuarios)
-- OPCIONAL: Si quieres que los perfiles sean privados, elimina esta política
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles"
  ON public.profiles
  FOR SELECT
  USING (true);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta esta query para verificar que todo se creó correctamente
SELECT 
  'public.profiles table' as item,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN '✅ Creada' ELSE '❌ Falta' END as status
UNION ALL
SELECT 
  'idx_profiles_username index' as item,
  CASE WHEN EXISTS (
    SELECT FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'idx_profiles_username'
  ) THEN '✅ Creado' ELSE '❌ Falta' END as status
UNION ALL
SELECT 
  'handle_new_user function' as item,
  CASE WHEN EXISTS (
    SELECT FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
  ) THEN '✅ Creada' ELSE '❌ Falta' END as status
UNION ALL
SELECT 
  'RLS enabled on profiles' as item,
  CASE WHEN EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND rowsecurity = true
  ) THEN '✅ Activado' ELSE '❌ Desactivado' END as status;
