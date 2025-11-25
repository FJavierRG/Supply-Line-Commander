// ===== SCRIPT DE VERIFICACIÓN DE SEGURIDAD =====
// Ejecutar antes de cada commit para asegurar que no hay leaks

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLORS = {
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    RESET: '\x1b[0m'
};

let hasErrors = false;
let hasWarnings = false;

console.log('\n🔒 VERIFICACIÓN DE SEGURIDAD\n');
console.log('━'.repeat(50));

// ============================================================
// TEST 1: Verificar que .env no está trackeado en git
// ============================================================
console.log('\n📝 TEST 1: Verificando .gitignore...');

const gitignorePath = path.join(__dirname, '../../.gitignore');
const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

if (gitignoreContent.includes('.env') && gitignoreContent.includes('server/data/')) {
    console.log(`${COLORS.GREEN}✅ .gitignore configurado correctamente${COLORS.RESET}`);
} else {
    console.log(`${COLORS.RED}❌ .gitignore INCOMPLETO${COLORS.RESET}`);
    hasErrors = true;
}

// ============================================================
// TEST 2: Buscar credenciales hardcodeadas
// ============================================================
console.log('\n📝 TEST 2: Buscando credenciales hardcodeadas...');

const dangerousPatterns = [
    { pattern: /supabase\.co(?!.*xxxxx)/gi, name: 'URL de Supabase real' },
    { pattern: /eyJ[A-Za-z0-9_-]{10,}\./g, name: 'JWT token' },
    { pattern: /process\.env\.(SUPABASE_URL|SUPABASE_ANON_KEY)(?!.*=)/g, name: 'Uso de env vars (revisar contexto)' }
];

function scanDirectory(dir, exclude = []) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    const results = [];
    
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        
        if (exclude.some(e => fullPath.includes(e))) continue;
        
        if (file.isDirectory()) {
            results.push(...scanDirectory(fullPath, exclude));
        } else if (file.name.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            
            for (const { pattern, name } of dangerousPatterns) {
                const matches = content.match(pattern);
                if (matches) {
                    results.push({ file: fullPath, pattern: name, matches });
                }
            }
        }
    }
    
    return results;
}

const serverDir = path.join(__dirname, '..');
const excludeDirs = ['node_modules', '.env.example', 'SECURITY.md', 'check-security.js'];
const findings = scanDirectory(serverDir, excludeDirs);

if (findings.length === 0) {
    console.log(`${COLORS.GREEN}✅ No se encontraron credenciales hardcodeadas${COLORS.RESET}`);
} else {
    console.log(`${COLORS.YELLOW}⚠️  Se encontraron ${findings.length} coincidencias potenciales:${COLORS.RESET}`);
    findings.forEach(f => {
        console.log(`   ${f.file.replace(serverDir, 'server')}`);
        console.log(`   → ${f.pattern}`);
    });
    hasWarnings = true;
}

// ============================================================
// TEST 3: Verificar que .env existe pero no está en git
// ============================================================
console.log('\n📝 TEST 3: Verificando .env...');

const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    console.log(`${COLORS.GREEN}✅ .env existe localmente${COLORS.RESET}`);
} else {
    console.log(`${COLORS.YELLOW}⚠️  .env no encontrado (crea uno desde .env.example)${COLORS.RESET}`);
    hasWarnings = true;
}

// ============================================================
// TEST 4: Verificar .env.example
// ============================================================
console.log('\n📝 TEST 4: Verificando .env.example...');

const envExamplePath = path.join(__dirname, '../env.example');
if (fs.existsSync(envExamplePath)) {
    const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
    
    if (envExampleContent.includes('xxxxx') || envExampleContent.includes('tu_')) {
        console.log(`${COLORS.GREEN}✅ .env.example tiene placeholders${COLORS.RESET}`);
    } else {
        console.log(`${COLORS.RED}❌ .env.example podría tener credenciales reales${COLORS.RESET}`);
        hasErrors = true;
    }
} else {
    console.log(`${COLORS.YELLOW}⚠️  .env.example no encontrado${COLORS.RESET}`);
    hasWarnings = true;
}

// ============================================================
// RESUMEN
// ============================================================
console.log('\n' + '━'.repeat(50));

if (hasErrors) {
    console.log(`${COLORS.RED}❌ FALLOS CRÍTICOS ENCONTRADOS${COLORS.RESET}`);
    console.log('   Por favor corrige los errores antes de hacer commit\n');
    process.exit(1);
} else if (hasWarnings) {
    console.log(`${COLORS.YELLOW}⚠️  ADVERTENCIAS ENCONTRADAS${COLORS.RESET}`);
    console.log('   Revisa las advertencias pero puedes continuar\n');
    process.exit(0);
} else {
    console.log(`${COLORS.GREEN}✅ TODO CORRECTO - SEGURO PARA COMMIT${COLORS.RESET}\n`);
    process.exit(0);
}

