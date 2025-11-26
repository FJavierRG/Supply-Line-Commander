# 🎮 PLAN: SISTEMA DE USUARIOS + MAZOS

## 📋 OBJETIVO

Implementar autenticación de usuarios y sistema de mazos persistentes en BD, siguiendo principios de:
- ✅ **Modularidad**: Cada funcionalidad aislada
- ✅ **Escalabilidad**: Preparado para crecer
- ✅ **DRY**: Zero código repetido
- ✅ **Single Source of Truth**: Un solo lugar para cada dato

---

## 🏗️ ARQUITECTURA FINAL

```
┌─────────────────────────────────────────────────┐
│                   CLIENTE                       │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ AuthService  │  │ DeckService  │            │
│  │ (Supabase)   │  │ (modular)    │            │
│  └──────┬───────┘  └──────┬───────┘            │
│         │                 │                     │
│         └────────┬────────┘                     │
│                  │ HTTP + Supabase JWT           │
└──────────────────┼──────────────────────────────┘
                   │
┌──────────────────┼──────────────────────────────┐
│                  │       SERVIDOR               │
│         ┌────────┴────────┐                     │
│         │  Auth Routes    │ (wrappers)          │
│         │  Deck Routes    │                     │
│         └────────┬────────┘                     │
│                  │                              │
└──────────────────┼──────────────────────────────┘
                   │
┌──────────────────┼──────────────────────────────┐
│             SUPABASE (BD)                       │
│  ┌────────────────────────────────┐             │
│  │  auth.users (Supabase Auth)    │             │
│  │  - id (UUID)                   │             │
│  │  - email: {username}@game.local│             │
│  │  - password_hash (Supabase)    │             │
│  │  - created_at                  │             │
│  └───────────────┬────────────────┘             │
│                  │ FK                           │
│  ┌───────────────┼───────────────┐             │
│  │ public.profiles│               │             │
│  │  - id ─────────┘               │             │
│  │  - username (único)            │             │
│  │  - created_at                  │             │
│  └────────────────────────────────┘             │
│                   │ FK (user_id)                │
│  ┌────────────────┼───────────────┐             │
│  │  public.decks  │               │             │
│  │  - id (UUID)   │               │             │
│  │  - user_id ────┘               │             │
│  │  - name                        │             │
│  │  - units (JSONB)               │             │
│  │  - bench (JSONB)               │             │
│  │  - disciplines (JSONB)         │             │
│  │  + RLS policies (auth.uid())   │             │
│  └────────────────────────────────┘             │
└─────────────────────────────────────────────────┘
```

### **🎯 Estrategia:**
- ✅ **Supabase Auth nativo**: Usamos `auth.users` gestionado por Supabase
- ✅ **Email falso**: `{username}@game.local` (único pero no se usa)
- ✅ **Perfiles**: `public.profiles` almacena el `username` real
- ✅ **RLS nativo**: Usa `auth.uid()` automáticamente (sin funciones custom)
- ✅ **JWT automático**: Supabase genera y valida tokens

---

## 🎯 PRINCIPIOS DE DISEÑO

### **1. Single Responsibility Principle**
- `AuthService` → Solo autenticación
- `DeckService` → Solo mazos
- `AuthManager` → Solo gestión de usuarios en servidor

### **2. Don't Repeat Yourself**
- Endpoints usan mismos helpers de validación
- Cliente usa servicios reutilizables
- Configuración centralizada

### **3. Separation of Concerns**
- Auth separado de game logic
- BD separada de lógica de negocio
- UI separada de servicios

### **4. Future-proof**
- Auth preparado para añadir OAuth más tarde
- Mazos preparados para compartir entre usuarios
- Estructura lista para stats, rankings, etc.

---

# 📦 FASE 1: BACKEND - BASE DE DATOS

## 1.1 Configurar Supabase Auth + Perfiles

### **✅ Checklist:**
- [ ] Crear tabla `public.profiles` (username vinculado a `auth.users`)
- [ ] Crear trigger para sincronizar automáticamente
- [ ] Configurar RLS en `public.profiles`
- [ ] Probar creación de usuario desde cliente

### **📄 Archivos a crear/modificar:**
- `server/scripts/setup-auth.sql` (nuevo)

### **🎯 Estrategia:**
- ✅ **Usamos Supabase Auth nativo**: `auth.users` gestionado por Supabase
- ✅ **Email falso**: `{username}@game.local` (único pero no se usa)
- ✅ **Perfiles**: `public.profiles` almacena el `username` real
- ✅ **Trigger automático**: Al crear usuario en `auth.users`, se crea perfil en `profiles`

### **🔧 SQL a ejecutar:**
```sql
-- Tabla de perfiles (username real)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger: Crear perfil automáticamente al crear usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

---

## 1.2 Modificar tabla decks (vincular a usuarios)

### **✅ Checklist:**
- [ ] Añadir Foreign Key a `auth.users`
- [ ] Eliminar mazo default de BD (será hardcodeado)
- [ ] Activar Row Level Security (RLS)
- [ ] Crear policies de acceso

### **🔧 SQL a ejecutar:**
```sql
-- Eliminar el mazo default (ahora será hardcodeado)
DELETE FROM decks WHERE id = '00000000-0000-0000-0000-000000000001';

-- Añadir constraint de FK (si user_id ya existe en la tabla)
ALTER TABLE decks 
  ADD CONSTRAINT fk_decks_user_id 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Activar RLS
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;

-- Policy: Ver solo tus mazos
CREATE POLICY "Users can view own decks"
  ON decks FOR SELECT
  USING (user_id = current_setting('app.user_id')::uuid);

-- Policy: Crear solo tus mazos
CREATE POLICY "Users can create own decks"
  ON decks FOR INSERT
  WITH CHECK (user_id = current_setting('app.user_id')::uuid);

-- Policy: Actualizar solo tus mazos
CREATE POLICY "Users can update own decks"
  ON decks FOR UPDATE
  USING (user_id = current_setting('app.user_id')::uuid);

-- Policy: Eliminar solo tus mazos
CREATE POLICY "Users can delete own decks"
  ON decks FOR DELETE
  USING (user_id = current_setting('app.user_id')::uuid);
```

---

# 📦 FASE 2: BACKEND - AUTH MANAGER

## 2.1 Crear AuthManager (servidor)

### **✅ Checklist:**
- [ ] Crear `server/managers/AuthManager.js`
- [ ] Implementar `register(username, password)`
- [ ] Implementar `login(username, password)`
- [ ] Implementar `verifyToken(token)`
- [ ] Implementar `refreshToken(token)`
- [ ] Usar bcrypt para passwords
- [ ] Usar jsonwebtoken para JWT

### **📄 Archivos a crear:**
```
server/managers/AuthManager.js (nuevo)
```

### **🎯 Funcionalidades:**
```javascript
class AuthManager {
  async register(username, password)
  async login(username, password) 
  async verifyToken(token)
  async refreshToken(token)
  async getUserById(userId)
  async updateLastLogin(userId)
}
```

### **📦 Dependencias a instalar:**
```bash
npm install bcrypt jsonwebtoken
```

### **🔑 Variables de entorno a añadir:**
```env
JWT_SECRET=tu-secret-muy-largo-y-aleatorio-aqui
JWT_EXPIRATION=7d
```

---

## 2.2 Crear rutas de autenticación

### **✅ Checklist:**
- [ ] Crear `server/routes/auth.js`
- [ ] `POST /api/auth/register` → Crear usuario
- [ ] `POST /api/auth/login` → Login y retornar JWT
- [ ] `POST /api/auth/logout` → Invalidar token (opcional)
- [ ] `GET /api/auth/me` → Obtener datos del usuario actual
- [ ] `POST /api/auth/refresh` → Renovar token
- [ ] Validar inputs (username mín 3 chars, password mín 6)

### **📄 Archivos a crear:**
```
server/routes/auth.js (nuevo)
```

### **📋 Endpoints:**
```javascript
POST /api/auth/register
  Body: { username, password }
  Response: { success, user: { id, username }, token }

POST /api/auth/login
  Body: { username, password }
  Response: { success, user: { id, username }, token }

GET /api/auth/me
  Headers: { Authorization: Bearer <token> }
  Response: { user: { id, username, created_at } }

POST /api/auth/refresh
  Body: { token }
  Response: { token: newToken }
```

---

## 2.3 Crear middleware de autenticación

### **✅ Checklist:**
- [ ] Crear `server/middleware/auth.js`
- [ ] `requireAuth` → Verificar JWT en header
- [ ] `optionalAuth` → Añadir user si hay token (pero no bloquear)
- [ ] Inyectar `req.user` con datos del usuario
- [ ] Manejar errores de token expirado/inválido

### **📄 Archivos a crear:**
```
server/middleware/auth.js (nuevo)
```

### **🔧 Middleware:**
```javascript
export function requireAuth(req, res, next) {
  // Verifica Authorization header
  // Valida JWT
  // Inyecta req.user = { id, username }
  // Si falla: 401 Unauthorized
}

export function optionalAuth(req, res, next) {
  // Similar pero no falla si no hay token
  // req.user = null si no autenticado
}
```

---

## 2.4 Proteger endpoints de mazos

### **✅ Checklist:**
- [ ] Modificar `server/routes/decks.js`
- [ ] Añadir `requireAuth` a todos los endpoints (excepto GET default)
- [ ] Usar `req.user.id` en vez de `userId` del body
- [ ] Validar que el usuario solo acceda a sus mazos
- [ ] Endpoint del default NO requiere auth

### **📄 Archivos a modificar:**
```
server/routes/decks.js (modificar)
```

### **🔧 Cambios:**
```javascript
// ANTES:
router.post('/', async (req, res) => {
  const { userId, name, units } = req.body;
  // ...
});

// DESPUÉS:
router.post('/', requireAuth, async (req, res) => {
  const userId = req.user.id; // ← Del JWT, no del body
  const { name, units } = req.body;
  // ...
});
```

---

## 2.5 Actualizar database.js para RLS

### **✅ Checklist:**
- [ ] Modificar `server/db/database.js`
- [ ] Antes de cada query en Supabase, setear `app.user_id`
- [ ] Usar `set_config('app.user_id', userId, true)` en Postgres
- [ ] En SQLite (dev), filtrar manualmente por `user_id`

### **📄 Archivos a modificar:**
```
server/db/database.js (modificar)
```

### **🔧 Cambios:**
```javascript
// En Supabase:
async getUserDecks(userId) {
  // Setear contexto de RLS
  await supabase.rpc('set_user_context', { user_id: userId });
  
  // Ahora las policies aplican automáticamente
  const { data } = await supabase.from('decks').select('*');
  return data;
}

// En SQLite:
async getUserDecks(userId) {
  // Filtrar manualmente
  const rows = sqliteDb
    .prepare('SELECT * FROM decks WHERE user_id = ?')
    .all(userId);
  return rows;
}
```

---

## 2.6 Eliminar default deck de BD

### **✅ Checklist:**
- [ ] Modificar `server/db/database.js`
- [ ] Eliminar INSERT del default en `initSQLite()`
- [ ] Endpoint `/api/decks/default/get` retorna desde `defaultDeck.js`
- [ ] El default NO se guarda en BD nunca

### **📄 Archivos a modificar:**
```
server/db/database.js (modificar)
server/routes/decks.js (modificar)
```

### **🔧 Cambios:**
```javascript
// server/routes/decks.js
import { DEFAULT_DECK } from '../config/defaultDeck.js';

router.get('/default', (req, res) => {
  // ✅ Desde archivo, NO desde BD
  res.json({ 
    success: true, 
    deck: {
      ...DEFAULT_DECK,
      id: 'default', // ID especial
      is_default: true
    }
  });
});
```

---

# 📦 FASE 3: FRONTEND - AUTH SERVICE

## 3.1 Crear AuthService (cliente)

### **✅ Checklist:**
- [ ] Crear `src/services/AuthService.js`
- [ ] `register(username, password)` → POST /api/auth/register
- [ ] `login(username, password)` → POST /api/auth/login
- [ ] `logout()` → Limpiar localStorage
- [ ] `getCurrentUser()` → GET /api/auth/me
- [ ] `getToken()` → Leer de localStorage
- [ ] `setToken(token)` → Guardar en localStorage
- [ ] `isAuthenticated()` → Verificar si hay token válido

### **📄 Archivos a crear:**
```
src/services/AuthService.js (nuevo)
```

### **🎯 API del servicio:**
```javascript
class AuthService {
  async register(username, password)
  async login(username, password)
  logout()
  async getCurrentUser()
  getToken()
  setToken(token)
  isAuthenticated()
  
  // Event emitter para notificar cambios
  on(event, callback)
  emit(event, data)
}
```

### **💾 LocalStorage:**
```javascript
localStorage.setItem('auth_token', token);
localStorage.setItem('user', JSON.stringify(user));
```

---

## 3.2 Crear DeckService (cliente)

### **✅ Checklist:**
- [ ] Crear `src/services/DeckService.js`
- [ ] `getDefaultDeck()` → GET /api/decks/default
- [ ] `getUserDecks()` → GET /api/decks/:userId
- [ ] `createDeck(deck)` → POST /api/decks
- [ ] `updateDeck(deckId, updates)` → PUT /api/decks/:deckId
- [ ] `deleteDeck(deckId)` → DELETE /api/decks/:deckId
- [ ] Todos los requests incluyen JWT token
- [ ] Manejo de errores 401 (token expirado)

### **📄 Archivos a crear:**
```
src/services/DeckService.js (nuevo)
```

### **🔧 Incluir token en requests:**
```javascript
async createDeck(deck) {
  const token = AuthService.getToken();
  
  const response = await fetch('/api/decks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(deck)
  });
  
  if (response.status === 401) {
    // Token expirado → logout
    AuthService.logout();
    throw new Error('Session expired');
  }
  
  return response.json();
}
```

---

## 3.3 Crear HTTP Client helper

### **✅ Checklist:**
- [ ] Crear `src/utils/httpClient.js`
- [ ] Wrapper de `fetch` con token automático
- [ ] Manejo global de errores 401
- [ ] Retry automático en caso de token refresh
- [ ] Base URL configurable

### **📄 Archivos a crear:**
```
src/utils/httpClient.js (nuevo)
```

### **🎯 API:**
```javascript
const http = {
  async get(url, options = {})
  async post(url, data, options = {})
  async put(url, data, options = {})
  async delete(url, options = {})
}

// Uso:
const deck = await http.post('/api/decks', { name: 'Mi Mazo' });
```

---

# 📦 FASE 4: FRONTEND - UI DE AUTENTICACIÓN

## 4.1 Crear pantalla Login/Register

### **✅ Checklist:**
- [ ] Crear HTML/CSS para modal de login
- [ ] Tab switcher: "Login" / "Register"
- [ ] Formulario de registro (username, password, confirm password)
- [ ] Formulario de login (username, password)
- [ ] Validación client-side (mín 3 chars username, mín 6 password)
- [ ] Mostrar errores del servidor
- [ ] Loading states durante request
- [ ] Cerrar modal tras login exitoso

### **📄 Archivos a crear:**
```
src/systems/AuthUIManager.js (nuevo)
src/styles/auth.css (nuevo)
index.html (añadir estructura HTML)
```

### **🎨 Estructura HTML:**
```html
<div id="auth-modal" class="modal hidden">
  <div class="modal-content">
    <div class="tab-switcher">
      <button class="tab active" data-tab="login">Iniciar Sesión</button>
      <button class="tab" data-tab="register">Crear Cuenta</button>
    </div>
    
    <!-- Formulario de login -->
    <form id="login-form" class="auth-form">
      <input type="text" name="username" placeholder="Usuario" required>
      <input type="password" name="password" placeholder="Contraseña" required>
      <button type="submit">Entrar</button>
      <div class="error-message"></div>
    </form>
    
    <!-- Formulario de registro -->
    <form id="register-form" class="auth-form hidden">
      <input type="text" name="username" placeholder="Usuario (mín 3 caracteres)" required>
      <input type="password" name="password" placeholder="Contraseña (mín 6 caracteres)" required>
      <input type="password" name="confirmPassword" placeholder="Confirmar contraseña" required>
      <button type="submit">Crear Cuenta</button>
      <div class="error-message"></div>
    </form>
  </div>
</div>
```

---

## 4.2 Integrar auth en flujo de juego

### **✅ Checklist:**
- [ ] Al abrir Arsenal, verificar autenticación
- [ ] Si no autenticado → Mostrar modal de login
- [ ] Si autenticado → Cargar mazos del usuario
- [ ] Botón "Cerrar Sesión" en menú principal
- [ ] Mostrar username en UI (top bar)
- [ ] Al salir, mantener sesión (localStorage)

### **📄 Archivos a modificar:**
```
src/systems/ArsenalManager.js (modificar)
src/systems/ScreenManager.js (modificar)
src/main.js (modificar)
```

### **🔧 Flujo:**
```
Usuario abre juego
  ↓
¿Hay token en localStorage?
  ├─ NO → Mostrar pantalla login
  └─ SÍ → Verificar token con servidor
           ├─ Válido → Mostrar menú principal
           └─ Inválido → Mostrar pantalla login
```

---

## 4.3 Actualizar Arsenal para usar DeckService

### **✅ Checklist:**
- [ ] Eliminar `DeckManager` (localStorage)
- [ ] Usar `DeckService` para todo
- [ ] Al abrir Arsenal:
  - Cargar default desde servidor
  - Cargar mazos personales desde servidor
- [ ] Al guardar mazo:
  - Si es default modificado → `DeckService.createDeck()`
  - Si es mazo existente → `DeckService.updateDeck()`
- [ ] Al eliminar mazo → `DeckService.deleteDeck()`
- [ ] Loading states mientras carga

### **📄 Archivos a modificar:**
```
src/systems/ArsenalManager.js (refactor completo)
```

### **🔧 Antes/Después:**
```javascript
// ANTES:
loadDeck(deckId) {
  const deck = this.deckManager.getDeck(deckId);
  // ...
}

// DESPUÉS:
async loadDeck(deckId) {
  try {
    const deck = await DeckService.getDeck(deckId);
    // ...
  } catch (error) {
    this.showNotification('Error cargando mazo', 'error');
  }
}
```

---

# 📦 FASE 5: LOBBY - INTEGRACIÓN

## 5.1 Modificar lobby para enviar solo deckId

### **✅ Checklist:**
- [ ] En `NetworkManager.setupRaceSelectListeners()`
- [ ] En vez de enviar `{ deckUnits, benchUnits, disciplines }`
- [ ] Enviar solo `{ deckId }`
- [ ] El servidor busca el mazo en BD por `deckId` y `user_id`
- [ ] Validar que el mazo pertenece al usuario

### **📄 Archivos a modificar:**
```
src/systems/NetworkManager.js (modificar)
server/server.js (modificar select_race handler)
```

### **🔧 Antes/Después:**
```javascript
// ANTES:
socket.emit('select_race', {
  roomId,
  raceId: deckId,
  deckUnits: deck.units,
  benchUnits: deck.bench,
  disciplines: deck.disciplines
});

// DESPUÉS:
socket.emit('select_race', {
  roomId,
  deckId: deck.id  // ← Solo el ID
});
```

---

## 5.2 Servidor: Cargar mazo desde BD

### **✅ Checklist:**
- [ ] Modificar handler `select_race` en `server.js`
- [ ] Recibir solo `deckId`
- [ ] Buscar mazo en BD: `db.getDeck(deckId)`
- [ ] Verificar que `deck.user_id === player.userId`
- [ ] Si no coincide → Error "No tienes permiso"
- [ ] Si es 'default' → Cargar desde `defaultDeck.js`
- [ ] Validar mazo igual que antes (anti-hack)

### **📄 Archivos a modificar:**
```
server/server.js (modificar socket handler)
```

### **🔧 Lógica:**
```javascript
socket.on('select_race', async (data) => {
  const { roomId, deckId } = data;
  const player = room.players.find(p => p.id === socket.id);
  
  let deck;
  
  if (deckId === 'default') {
    deck = DEFAULT_DECK;
  } else {
    // Buscar en BD
    deck = await db.getDeck(deckId);
    
    // Verificar ownership
    if (deck.user_id !== player.userId) {
      return socket.emit('error', { 
        message: 'No tienes permiso para usar este mazo' 
      });
    }
  }
  
  // Validar y guardar
  player.selectedDeck = deck;
  broadcastLobbyUpdate(roomId);
});
```

---

# 📦 FASE 6: TESTING & REFINAMIENTO

## 6.1 Testing de flujos completos

### **✅ Checklist:**
- [ ] **Flujo 1: Usuario nuevo**
  - Crear cuenta
  - Ver Arsenal (solo default)
  - Modificar default
  - Guardar como mazo nuevo
  - Crear lobby
  - Seleccionar mazo
  - Iniciar partida
- [ ] **Flujo 2: Usuario existente**
  - Login
  - Ver Arsenal (default + mazos guardados)
  - Editar mazo existente
  - Guardar cambios
  - Eliminar mazo
- [ ] **Flujo 3: Sesión**
  - Login
  - Cerrar navegador
  - Abrir navegador
  - Sesión persiste
- [ ] **Flujo 4: Logout**
  - Logout
  - Intentar acceder a mazos
  - Redirigir a login

---

## 6.2 Validaciones y edge cases

### **✅ Checklist:**
- [ ] Username duplicado → Error claro
- [ ] Password muy corta → Error claro
- [ ] Token expirado → Re-login automático
- [ ] BD caída → Mensaje de error amigable
- [ ] Usuario intenta usar mazo de otro → Bloqueado
- [ ] Usuario intenta modificar mazo de otro → Bloqueado
- [ ] Rate limiting en endpoints de auth (anti-spam)

---

## 6.3 Migración de datos (si hay usuarios de prueba)

### **✅ Checklist:**
- [ ] Script para migrar mazos de localStorage a BD
- [ ] Crear usuarios "legacy" con username = "guest_XXX"
- [ ] Asociar mazos antiguos a estos usuarios
- [ ] Probar que todo funciona post-migración

### **📄 Archivos a crear:**
```
server/scripts/migrate-legacy-decks.js (nuevo)
```

---

# 📦 FASE 7: LIMPIEZA Y DOCUMENTACIÓN

## 7.1 Eliminar código obsoleto

### **✅ Checklist:**
- [ ] Eliminar `src/systems/DeckManager.js`
- [ ] Eliminar todas las referencias a localStorage de mazos
- [ ] Eliminar logs de debug (excepto errores)
- [ ] Eliminar código comentado

---

## 7.2 Actualizar documentación

### **✅ Checklist:**
- [ ] Actualizar `server/db/README.md`
- [ ] Crear `docs/SISTEMA_USUARIOS.md`
- [ ] Actualizar `SECURITY.md` con info de JWT
- [ ] Documentar endpoints en `docs/API.md`

---

## 7.3 Variables de entorno finales

### **✅ Checklist:**
- [ ] Actualizar `.env.example`
- [ ] Documentar todas las variables necesarias
- [ ] Verificar que no hay secretos hardcodeados
- [ ] Ejecutar `npm run security-check`

### **📄 Variables finales:**
```env
# Base de datos
NODE_ENV=development
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=tu_key

# Autenticación
JWT_SECRET=tu-secret-aleatorio-muy-largo
JWT_EXPIRATION=7d

# Servidor
PORT=3000
```

---

# 📊 RESUMEN DE ARCHIVOS

## **Nuevos:**
```
server/managers/AuthManager.js
server/routes/auth.js
server/middleware/auth.js
server/scripts/setup-auth.sql
src/services/AuthService.js
src/services/DeckService.js
src/utils/httpClient.js
src/systems/AuthUIManager.js
src/styles/auth.css
docs/SISTEMA_USUARIOS.md
docs/API.md
```

## **Modificados:**
```
server/server.js (integrate auth routes, protect endpoints)
server/routes/decks.js (require auth, use req.user)
server/db/database.js (RLS support, remove default insert)
src/systems/ArsenalManager.js (use DeckService)
src/systems/NetworkManager.js (send deckId only)
src/main.js (auth flow)
index.html (auth modal)
.env.example (add JWT_SECRET)
server/SECURITY.md (add JWT info)
```

## **Eliminados:**
```
src/systems/DeckManager.js (reemplazado por DeckService)
```

---

# 🎯 MÉTRICAS DE ÉXITO

Al finalizar, el sistema debe:

- ✅ **Seguro**: Passwords hasheados, JWT firmados, RLS activo
- ✅ **Modular**: Cada feature en su servicio/manager
- ✅ **Escalable**: Preparado para 10K+ usuarios
- ✅ **Sin duplicación**: DRY en todo el código
- ✅ **Mantenible**: Código documentado y aislado
- ✅ **Testeado**: Todos los flujos principales funcionan

---

# 📝 NOTAS IMPORTANTES

## **Seguridad:**
- Los passwords NUNCA se guardan en texto plano
- Los JWT incluyen tiempo de expiración
- RLS de Supabase previene acceso no autorizado
- Todos los endpoints críticos requieren auth

## **Escalabilidad:**
- Índices en BD para búsquedas rápidas
- JWT stateless (no requiere sesiones en servidor)
- RLS se ejecuta en BD (no en app layer)
- Servicios reutilizables y modulares

## **Mantenibilidad:**
- Un solo lugar para cada funcionalidad
- Servicios con APIs claras
- Configuración centralizada
- Documentación inline y en .md

---

# 🚀 SIGUIENTE PASO

**Una vez revises este documento:**
1. Dame feedback sobre lo que quieras cambiar
2. Te pregunto por qué fase quieres empezar
3. Implementamos paso a paso con código real

**Tiempo estimado:** 4-6 horas de implementación total


