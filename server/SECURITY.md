# 🔒 SEGURIDAD - GUÍA COMPLETA

## ⚠️ REGLAS DE ORO (NUNCA ROMPER)

### **1. NUNCA subas `.env` a GitHub**
```bash
# ✅ CORRECTO: .env está en .gitignore
# ❌ NUNCA hagas: git add .env
# ❌ NUNCA hagas: git add -f .env
```

**Verificación antes de commit:**
```bash
git status  # Asegúrate que .env NO aparece
```

---

### **2. NUNCA expongas credenciales en el código**
```js
// ❌ MAL
const supabaseUrl = 'https://xxxxx.supabase.co';

// ✅ BIEN
const supabaseUrl = process.env.SUPABASE_URL;
```

---

### **3. NUNCA envíes `process.env` al cliente**
```js
// ❌ MAL
socket.emit('config', { env: process.env });
res.json({ config: process.env });

// ✅ BIEN
socket.emit('config', { deckLimit: 700 });
```

**Protección incluida:** El middleware `preventEnvLeaks` bloquea esto automáticamente.

---

### **4. NUNCA hagas console.log de credenciales**
```js
// ❌ MAL
console.log('Supabase URL:', process.env.SUPABASE_URL);

// ✅ BIEN
console.log('Supabase conectado');
```

---

## 🛡️ MEDIDAS DE SEGURIDAD IMPLEMENTADAS

### **1. Middleware de Seguridad**
Archivo: `server/middleware/security.js`

- ✅ **preventEnvLeaks**: Bloquea envío accidental de env vars
- ✅ **securityHeaders**: Headers HTTP de seguridad
- ✅ **safeErrorHandler**: No revela detalles en producción

### **2. .gitignore**
```
.env
.env.local
.env.development
.env.test
.env.production
server/data/  # Base de datos local
```

### **3. Separación de entornos**
- **Desarrollo**: SQLite local (no necesita credenciales)
- **Producción**: Supabase (credenciales en Railway ENV vars)

---

## 🚀 DEPLOYMENT SEGURO (Railway)

### **Variables de entorno en Railway:**

1. Ve a tu proyecto en Railway
2. Settings → Variables
3. Añade:
```
NODE_ENV=production
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
```

4. **NUNCA** pongas estas credenciales en el código

---

## 🔍 CÓMO VERIFICAR QUE ESTÁ SEGURO

### **Test 1: Verificar .gitignore**
```bash
git status
# NO debe aparecer: .env, server/data/
```

### **Test 2: Buscar credenciales hardcodeadas**
```bash
grep -r "supabase.co" server/
# Solo debe aparecer en: .env.example (con xxxxx)
```

### **Test 3: Probar endpoint de seguridad**
```bash
curl http://localhost:3000/api/decks/default/get
# NO debe retornar: SUPABASE_URL, SUPABASE_ANON_KEY
```

---

## ⚡ SI ACCIDENTALMENTE EXPUSISTE CREDENCIALES

### **1. En GitHub:**
1. Ve a Supabase → Settings → API
2. Click **"Reset anon key"** → Genera nueva key
3. Actualiza `.env` local
4. Actualiza Railway ENV vars
5. **NUNCA** hagas revert del commit (la key queda en historial)

### **2. En Railway:**
1. Regenera la key en Supabase
2. Actualiza la ENV var en Railway
3. Redeploy

---

## 🪝 AUTOMATIZAR VERIFICACIÓN (RECOMENDADO)

### **Instalar Git Hook (UNA VEZ):**
```bash
cd server
npm run install-hooks
```

Esto configura un **pre-commit hook** que:
- ✅ Se ejecuta automáticamente antes de cada commit
- ✅ Verifica seguridad sin que lo recuerdes
- ✅ Bloquea commits con errores críticos
- ✅ Permite commits con solo advertencias

### **Para saltarlo temporalmente (solo si es urgente):**
```bash
git commit --no-verify -m "mensaje"
```

---

## 📋 CHECKLIST MANUAL (si no instalaste el hook)

- [ ] `git status` no muestra `.env`
- [ ] No hay `console.log` con credenciales
- [ ] No hay strings hardcodeados con URLs de Supabase
- [ ] Los cambios en `.env.example` solo tienen placeholders
- [ ] Ejecutar: `cd server && npm run security-check`

---

## 🆘 CONTACTO DE EMERGENCIA

Si crees que expusiste credenciales:
1. **PRIMERO**: Regenera las keys en Supabase inmediatamente
2. **DESPUÉS**: Actualiza todo lo demás

**La velocidad es crítica. Una key expuesta puede ser usada en minutos.**

