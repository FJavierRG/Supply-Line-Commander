-- ============================================
-- SETUP DE TABLA DECKS CON RLS
-- ============================================
-- Este script configura Row Level Security en la tabla decks
-- para que cada usuario solo vea/edite sus propios mazos
--
-- INSTRUCCIONES:
-- 1. Asegúrate de haber ejecutado setup-auth.sql primero
-- 2. Abre SQL Editor en Supabase
-- 3. Copia y pega este script completo
-- 4. Ejecuta (Run)
-- ============================================

-- ============================================
-- MODIFICAR TABLA DECKS
-- ============================================

-- Añadir columna user_id si no existe
-- Ahora referencia auth.users (gestionado por Supabase Auth)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'decks' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE decks ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Añadir índice para búsquedas por user_id
CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id);

-- Añadir índice compuesto para búsquedas user_id + created_at
CREATE INDEX IF NOT EXISTS idx_decks_user_created ON decks(user_id, created_at DESC);

-- ============================================
-- ELIMINAR MAZO DEFAULT DE BD
-- ============================================
-- El mazo default ahora será hardcodeado en el servidor
-- No necesitamos almacenarlo en BD
DELETE FROM decks WHERE id = '00000000-0000-0000-0000-000000000001';
DELETE FROM decks WHERE name = 'Mazo Predeterminado';

-- ============================================
-- ACTIVAR ROW LEVEL SECURITY
-- ============================================
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS
-- ============================================

-- Política 1: Ver solo tus propios mazos
-- Usa auth.uid() nativo de Supabase (no necesitamos función custom)
DROP POLICY IF EXISTS "users_view_own_decks" ON decks;
CREATE POLICY "users_view_own_decks"
  ON decks
  FOR SELECT
  USING (user_id = auth.uid());

-- Política 2: Crear solo mazos para ti mismo
DROP POLICY IF EXISTS "users_create_own_decks" ON decks;
CREATE POLICY "users_create_own_decks"
  ON decks
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Política 3: Actualizar solo tus propios mazos
DROP POLICY IF EXISTS "users_update_own_decks" ON decks;
CREATE POLICY "users_update_own_decks"
  ON decks
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Política 4: Eliminar solo tus propios mazos
DROP POLICY IF EXISTS "users_delete_own_decks" ON decks;
CREATE POLICY "users_delete_own_decks"
  ON decks
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
-- Dar permisos necesarios para que las políticas funcionen
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;

GRANT SELECT ON auth.users TO anon, authenticated;
GRANT ALL ON decks TO authenticated;
GRANT SELECT ON decks TO anon;

-- ============================================
-- TESTING (opcional)
-- ============================================
-- Descomentar para probar que RLS funciona correctamente
/*
-- 1. Crear usuario de prueba
INSERT INTO auth.users (id, username, password_hash)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'test_user_rls',
  '$2b$10$test'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Autenticarse como ese usuario (usando Supabase Auth)
-- Esto se hace desde el cliente con supabase.auth.signInWithPassword()

-- 3. Crear un mazo de prueba
INSERT INTO decks (id, user_id, name, units, bench, disciplines)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Mazo RLS Test',
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb
);

-- 4. Verificar que solo ves tu mazo
SELECT id, name, user_id FROM decks;
-- Debería retornar solo el mazo del test_user_rls

-- 5. Limpiar datos de prueba
DELETE FROM decks WHERE id = '22222222-2222-2222-2222-222222222222';
DELETE FROM auth.users WHERE id = '11111111-1111-1111-1111-111111111111';
*/

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta esta query para verificar que todo está configurado
SELECT 
  'decks.user_id column' as item,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'decks' 
    AND column_name = 'user_id'
  ) THEN '✅ Existe' ELSE '❌ Falta' END as status
UNION ALL
SELECT 
  'RLS enabled on decks' as item,
  CASE WHEN EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'decks' 
    AND rowsecurity = true
  ) THEN '✅ Activado' ELSE '❌ Desactivado' END as status
UNION ALL
SELECT 
  'RLS policies count' as item,
  COUNT(*)::text || ' políticas' as status
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'decks';

