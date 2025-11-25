# 🔧 Scripts del Servidor

## 📋 Scripts Disponibles

### **1. `npm run security-check`**
Verifica que no haya credenciales expuestas.

```bash
cd server
npm run security-check
```

**Verifica:**
- ✅ .gitignore configurado
- ✅ No hay credenciales hardcodeadas
- ✅ .env existe pero no está en git
- ✅ .env.example tiene placeholders

---

### **2. `npm run install-hooks`**
Instala el pre-commit hook (ejecutar UNA VEZ).

```bash
cd server
npm run install-hooks
```

**Después de esto:**
- ✅ Cada commit ejecuta automáticamente `security-check`
- ✅ Los commits con errores críticos se bloquean
- ✅ No te tienes que acordar de verificar manualmente

---

## 🪝 Git Hooks

### **Pre-commit Hook**
Se ejecuta automáticamente antes de cada `git commit`.

**Ubicación:** `.git/hooks/pre-commit`

**Para saltarlo temporalmente:**
```bash
git commit --no-verify -m "mensaje"
```

**Para reinstalarlo:**
```bash
cd server
npm run install-hooks
```

---

## 🐛 Troubleshooting

### El hook no se ejecuta
```bash
# Verificar que existe
ls .git/hooks/pre-commit

# Reinstalar
cd server
npm run install-hooks
```

### Quiero desactivarlo permanentemente
```bash
rm .git/hooks/pre-commit
```

### El hook falla en Windows
El hook usa sh, que viene con Git. Asegúrate de ejecutar desde Git Bash o PowerShell con Git instalado.

---

## 📝 Añadir más scripts

Para añadir más scripts al hook, edita:
`server/scripts/install-hooks.js`

