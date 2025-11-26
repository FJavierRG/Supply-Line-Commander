# 🗄️ CONFIGURACIÓN DE BASE DE DATOS (SUPABASE)

## 🎯 ESTRATEGIA

**Usamos Supabase Auth nativo** (no creamos tablas propias):
- ✅ `auth.users` gestionado por Supabase (email/password)
- ✅ Email será: `{username}@game.local` (falso pero único)
- ✅ Tabla `public.profiles` almacena el `username` real
- ✅ RLS usa `auth.uid()` nativo (sin funciones custom)

## 📋 ORDEN DE EJECUCIÓN

Ejecuta los scripts SQL en **este orden exacto**:

### **1️⃣ Setup de Perfiles**
```bash
server/scripts/setup-auth.sql
```
✅ Crea tabla `public.profiles` (username vinculado a `auth.users`)  
✅ Crea trigger para sincronizar automáticamente  
✅ Configura RLS en profiles  
✅ Configura índices

### **2️⃣ Setup de Mazos con RLS**
```bash
server/scripts/setup-decks-rls.sql
```
✅ Añade `user_id` a tabla `decks` (referencia `auth.users.id`)  
✅ Activa Row Level Security  
✅ Crea políticas de acceso usando `auth.uid()`  
✅ Elimina mazo default de BD

---

## 🚀 CÓMO EJECUTAR EN SUPABASE

### **Paso 1: Abrir SQL Editor**
1. Ve a tu dashboard de Supabase: https://app.supabase.com
2. Selecciona tu proyecto
3. En el menú lateral, haz clic en **"SQL Editor"**

### **Paso 2: Ejecutar setup-auth.sql**
1. Haz clic en **"New Query"**
2. Abre el archivo `server/scripts/setup-auth.sql`
3. Copia TODO el contenido
4. Pégalo en el SQL Editor
5. Haz clic en **"Run"** (o presiona `Ctrl+Enter`)
6. Verifica que aparezca: ✅ "Success. No rows returned"

### **Paso 3: Ejecutar setup-decks-rls.sql**
1. Haz clic en **"New Query"** nuevamente
2. Abre el archivo `server/scripts/setup-decks-rls.sql`
3. Copia TODO el contenido
4. Pégalo en el SQL Editor
5. Haz clic en **"Run"**
6. Verifica que aparezca: ✅ "Success. No rows returned"

---

## ✅ VERIFICACIÓN

### **Verificar que todo se creó correctamente:**

En el SQL Editor de Supabase, ejecuta:

```sql
-- Verificar tabla public.profiles
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'profiles';

-- Verificar trigger de sincronización
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Verificar columna user_id en decks
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'decks' AND column_name = 'user_id';

-- Verificar RLS activado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('profiles', 'decks');

-- Verificar políticas RLS
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename IN ('profiles', 'decks');
```

**Deberías ver:**
- ✅ Tabla `public.profiles` existe
- ✅ Trigger `on_auth_user_created` existe
- ✅ Columna `user_id` en `decks`
- ✅ `rowsecurity = true` en `profiles` y `decks`
- ✅ Políticas RLS en ambas tablas

---

## 🧪 TESTING MANUAL (OPCIONAL)

### **Probar que RLS funciona:**

**NOTA:** Para probar RLS necesitas autenticarte usando Supabase Auth desde el cliente. No puedes probarlo directamente en SQL Editor porque `auth.uid()` solo funciona con sesiones autenticadas.

**Prueba desde el código del servidor/cliente:**

```javascript
// 1. Crear usuario con Supabase Auth
const { data, error } = await supabase.auth.signUp({
  email: 'testuser@game.local',
  password: 'testpassword123'
});

// 2. El trigger automáticamente crea el perfil en public.profiles
// con username = 'testuser'

// 3. Crear mazo (el user_id se obtiene de auth.uid())
const { data: deck, error: deckError } = await supabase
  .from('decks')
  .insert({
    user_id: data.user.id, // auth.uid() se aplica automáticamente
    name: 'Mi Mazo de Prueba',
    units: ['unit1', 'unit2'],
    bench: [],
    disciplines: ['motorized_industry']
  });

// 4. Verificar que solo ves tus mazos
const { data: myDecks } = await supabase
  .from('decks')
  .select('*');
// Solo retornará mazos del usuario autenticado gracias a RLS
```

---

## 🔧 TROUBLESHOOTING

### **Error: "schema auth already exists"**
✅ **Solución:** Ignora este error, es normal. El script usa `IF NOT EXISTS`.

### **Error: "relation auth.users already exists"**
✅ **Solución:** La tabla ya existe. Verifica que tenga las columnas correctas.

### **Error: "column user_id already exists"**
✅ **Solución:** La columna ya existe. Continúa con el resto del script.

### **Error: "permission denied for schema auth"**
❌ **Solución:** Tu usuario de Supabase no tiene permisos suficientes. Contacta a soporte.

### **Las políticas RLS no funcionan**
🔍 **Debug:**
1. Verifica que RLS esté activado: `SELECT rowsecurity FROM pg_tables WHERE tablename = 'decks';`
2. Verifica que las políticas existan: `SELECT * FROM pg_policies WHERE tablename = 'decks';`
3. Verifica que estés seteando el contexto: `SELECT get_current_user_id();` (debería retornar un UUID, no NULL)

---

## 📝 NOTAS IMPORTANTES

### **❌ NO ejecutes estos scripts en producción si ya tienes usuarios**
Si ya tienes usuarios y mazos en producción:
1. Crea un backup completo primero
2. Ejecuta los scripts en un ambiente de staging
3. Crea un script de migración para datos existentes

### **✅ El mazo default NO está en BD**
A partir de ahora, el mazo predeterminado se carga desde:
```javascript
server/config/defaultDeck.js
```

No se guarda en la base de datos. Esto es intencional para:
- Evitar duplicación
- Poder actualizar el default sin tocar BD
- Simplificar la lógica de negocio

---

## 🎯 SIGUIENTE PASO

Una vez ejecutados estos scripts, continúa con:
**FASE 2: Crear AuthManager y rutas de autenticación**

Ver: `docs/PLAN_SISTEMA_USUARIOS_Y_MAZOS.md`

