# 🎮 Sistema de Onboarding Implementado

## Flujo de Autenticación y Onboarding

### ✅ Lo que se ha implementado:

1. **AuthService** (Supabase Auth)
   - Crea sesión anónima automáticamente con UUID válido
   - La sesión se guarda en el navegador (localStorage de Supabase)
   - Permite migrar a cuenta real en el futuro

2. **OnboardingManager** (Nuevo)
   - Pantalla de bienvenida para usuarios nuevos
   - Input de username con validación en tiempo real
   - Verificación de disponibilidad con el servidor
   - Modal moderno con animaciones

3. **ProfileService**
   - Gestiona perfiles de usuario en Supabase
   - Verifica disponibilidad de usernames
   - Crea/actualiza perfiles

4. **Integración en main.js**
   - Orden correcto: Auth → Onboarding → Game
   - Flujo no bloqueante

## 📋 Flujo Completo

```
Usuario entra al juego
    ↓
AuthService inicializa sesión anónima (UUID de Supabase)
    ↓
Trigger de Supabase crea perfil base (username: Guest_xxxxx)
    ↓
OnboardingManager verifica si completó onboarding
    ↓
¿Tiene username personalizado?
    SÍ → Continuar al juego
    NO → Mostrar modal de onboarding
        ↓
    Usuario elige username
        ↓
    Validación en tiempo real
        ↓
    Actualizar perfil en Supabase
        ↓
    Marcar onboarding_complete en localStorage
        ↓
    Continuar al juego
```

## 🔧 Para probar el sistema:

### 1. Limpiar datos anteriores en el navegador:
```javascript
// En la consola del navegador (F12):
localStorage.clear();
location.reload();
```

### 2. Verificar que el archivo `.env` del servidor tenga las credenciales de Supabase:
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### 3. Reiniciar el servidor:
```bash
cd server
npm start
```

### 4. Refrescar el navegador y probar:
- Debería aparecer la pantalla de bienvenida
- Elige un nombre de usuario (3-20 caracteres, alfanumérico)
- El sistema verifica disponibilidad en tiempo real
- Al continuar, se crea el perfil y guardas la sesión

## 🔍 Verificación en Supabase:

1. Ve a tu proyecto en Supabase
2. Authentication → Users → Deberías ver usuarios anónimos
3. Table Editor → profiles → Deberías ver los perfiles con usernames personalizados

## 🚀 Características adicionales implementadas:

- ✅ Validación de username en tiempo real
- ✅ Verificación de disponibilidad con debounce
- ✅ Animaciones suaves (fade in/out, slide)
- ✅ Diseño moderno con gradientes
- ✅ Input validado (3-20 caracteres, alfanumérico)
- ✅ No se puede omitir el onboarding
- ✅ Solo se muestra una vez por usuario
- ✅ Submit con Enter

## 🔮 Próximos pasos (futuro):

- Agregar avatar personalizable
- Sistema de niveles/experiencia
- Estadísticas de partidas (wins/losses)
- Migración a cuenta real (con email + contraseña)
- Sistema de amigos

## 🐛 Solución de problemas:

### Error: "invalid input syntax for type uuid"
- **Causa**: Usuario antiguo con ID formato `user_xxxxx`
- **Solución**: Limpiar localStorage y recargar

### No aparece pantalla de onboarding
- **Causa**: `onboarding_complete` ya está en localStorage
- **Solución**: `localStorage.removeItem('onboarding_complete')`

### Error de perfiles
- **Causa**: Tablas no creadas en Supabase
- **Solución**: Ejecutar `setup-complete.sql` en SQL Editor de Supabase

