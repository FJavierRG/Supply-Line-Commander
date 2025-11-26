#!/usr/bin/env node

// ===== SCRIPT DE VERIFICACIÓN DE CONFIGURACIÓN DE SUPABASE =====
// Verifica que todo esté configurado correctamente

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env desde la carpeta server
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('='.repeat(60));
console.log('🔍 VERIFICACIÓN DE CONFIGURACIÓN DE SUPABASE');
console.log('='.repeat(60));
console.log();

let hasErrors = false;

// 1. Verificar variables de entorno
console.log('📋 Variables de entorno:');
console.log('-'.repeat(60));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    console.error('❌ SUPABASE_URL no está definida');
    hasErrors = true;
} else if (supabaseUrl === 'https://xxxxx.supabase.co') {
    console.error('⚠️  SUPABASE_URL tiene valor de ejemplo (no configurada)');
    console.error('   Valor actual:', supabaseUrl);
    hasErrors = true;
} else {
    console.log('✅ SUPABASE_URL:', supabaseUrl);
}

if (!supabaseKey) {
    console.error('❌ SUPABASE_ANON_KEY no está definida');
    hasErrors = true;
} else if (supabaseKey === 'tu_anon_key_aqui' || supabaseKey.length < 50) {
    console.error('⚠️  SUPABASE_ANON_KEY tiene valor de ejemplo o inválido');
    console.error('   Longitud:', supabaseKey.length, '(debería ser ~200+ caracteres)');
    hasErrors = true;
} else {
    console.log('✅ SUPABASE_ANON_KEY:', supabaseKey.substring(0, 20) + '...' + ' (válida)');
}

console.log();

// 2. Verificar archivo .env
console.log('📄 Archivo .env:');
console.log('-'.repeat(60));

import { existsSync } from 'fs';

const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
    console.log('✅ Archivo .env existe en:', envPath);
} else {
    console.error('❌ Archivo .env NO existe en:', envPath);
    console.error('   Crea uno copiando env.example:');
    console.error('   cp server/env.example server/.env');
    hasErrors = true;
}

console.log();

// 3. Test de conexión (si las credenciales están disponibles)
if (supabaseUrl && supabaseKey && !hasErrors) {
    console.log('🔌 Test de conexión a Supabase:');
    console.log('-'.repeat(60));
    
    try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Intentar hacer una query simple
        const { data, error } = await supabase
            .from('profiles')
            .select('count')
            .limit(1);
        
        if (error) {
            console.error('⚠️  Error al conectar con Supabase:', error.message);
            console.error('   Esto podría significar que:');
            console.error('   1. Las credenciales son incorrectas');
            console.error('   2. La tabla "profiles" no existe (ejecuta setup-complete.sql)');
            console.error('   3. Las políticas RLS están bloqueando el acceso');
        } else {
            console.log('✅ Conexión exitosa a Supabase');
            console.log('✅ Tabla "profiles" es accesible');
        }
    } catch (error) {
        console.error('❌ Error al probar conexión:', error.message);
    }
    
    console.log();
}

// 4. Resumen
console.log('='.repeat(60));
if (hasErrors) {
    console.error('❌ CONFIGURACIÓN INCOMPLETA');
    console.log();
    console.log('📝 Para configurar Supabase:');
    console.log('   1. Ve a https://app.supabase.com');
    console.log('   2. Crea un proyecto (o usa uno existente)');
    console.log('   3. Ve a Settings → API');
    console.log('   4. Copia "Project URL" y "anon/public key"');
    console.log('   5. Pégalos en server/.env:');
    console.log();
    console.log('      SUPABASE_URL=https://xxxxx.supabase.co');
    console.log('      SUPABASE_ANON_KEY=eyJhbGc...(tu key aquí)');
    console.log();
    console.log('   6. Ejecuta las queries SQL en:');
    console.log('      server/scripts/setup-complete.sql');
    process.exit(1);
} else {
    console.log('✅ CONFIGURACIÓN COMPLETA');
    console.log();
    console.log('El servidor debería funcionar correctamente.');
    console.log('Si aún tienes problemas, verifica que:');
    console.log('  - El servidor esté corriendo (npm start)');
    console.log('  - El puerto 3000 esté disponible');
    console.log('  - Las tablas estén creadas en Supabase');
    process.exit(0);
}

