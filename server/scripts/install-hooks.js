// ===== INSTALADOR DE GIT HOOKS =====
// Ejecuta: node server/scripts/install-hooks.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLORS = {
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[36m',
    RESET: '\x1b[0m'
};

console.log(`\n${COLORS.BLUE}🪝 INSTALANDO GIT HOOKS${COLORS.RESET}\n`);

// Ruta al directorio de hooks de git
const gitHooksDir = path.join(__dirname, '../../.git/hooks');

// Verificar que existe .git (estamos en un repo)
if (!fs.existsSync(gitHooksDir)) {
    console.error('❌ No se encontró .git/hooks (¿estás en el directorio raíz del repo?)');
    process.exit(1);
}

// Contenido del pre-commit hook
const preCommitHook = `#!/bin/sh
# ===== GIT PRE-COMMIT HOOK =====
# Ejecuta verificación de seguridad antes de cada commit

echo ""
echo "🔒 Ejecutando verificación de seguridad..."
echo ""

cd server
npm run security-check

# Si el script falla (exit code != 0), bloquear el commit
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ COMMIT BLOQUEADO - Corrige los errores de seguridad"
    echo ""
    exit 1
fi

echo ""
echo "✅ Verificación de seguridad OK - Continuando con commit..."
echo ""
exit 0
`;

// Escribir el hook
const preCommitPath = path.join(gitHooksDir, 'pre-commit');
fs.writeFileSync(preCommitPath, preCommitHook, { mode: 0o755 });

console.log(`${COLORS.GREEN}✅ Pre-commit hook instalado${COLORS.RESET}`);
console.log(`   ${preCommitPath}`);

console.log(`\n${COLORS.YELLOW}📋 ¿Qué hace este hook?${COLORS.RESET}`);
console.log('   → Se ejecuta automáticamente antes de cada commit');
console.log('   → Verifica que no haya credenciales expuestas');
console.log('   → Bloquea el commit si encuentra errores críticos');
console.log('   → Permite el commit si solo hay advertencias');

console.log(`\n${COLORS.YELLOW}🔧 Para desactivarlo temporalmente:${COLORS.RESET}`);
console.log('   git commit --no-verify -m "tu mensaje"');

console.log(`\n${COLORS.GREEN}✅ ¡Listo! Ahora tus commits son más seguros${COLORS.RESET}\n`);





