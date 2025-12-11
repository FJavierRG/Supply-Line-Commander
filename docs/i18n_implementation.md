# 🌐 Sistema de Internacionalización (i18n) - Fase 1

## ✅ Implementación Completada

### Archivos Creados

1. **`locales/client/es.json`** - Traducciones en español
2. **`locales/client/en.json`** - Traducciones en inglés
3. **`src/services/I18nService.js`** - Servicio centralizado de i18n

### Archivos Modificados

1. **`src/systems/ui/AuthUIManager.js`** - Añadido soporte i18n
2. **`src/main.js`** - Inicialización asíncrona del sistema

---

## 📋 Funcionalidades Implementadas

### 1. Servicio de I18n (`I18nService.js`)

- ✅ Carga automática de traducciones desde archivos JSON
- ✅ Detección automática del idioma del navegador
- ✅ Persistencia de preferencia en `localStorage`
- ✅ Sistema de fallback (español → inglés → clave entre corchetes)
- ✅ Interpolación de variables: `i18n.t('key', { name: 'Juan' })`
- ✅ Navegación por claves anidadas: `i18n.t('auth.login.title')`
- ✅ Cache de traducciones para rendimiento

### 2. Selector de Idioma en Login

- ✅ Dropdown 🌐 en esquina inferior derecha
- ✅ Opciones: Español / English
- ✅ Cambio de idioma en tiempo real (sin recargar)
- ✅ Diseño coherente con la estética del juego

### 3. Textos Migrados (Login)

#### Traducidos
- ✅ Título de la aplicación
- ✅ Tabs (Iniciar sesión / Crear cuenta)
- ✅ Labels de formularios (Usuario, Contraseña, etc.)
- ✅ Placeholders de inputs
- ✅ Botones de submit
- ✅ Mensajes de error (preparados para i18n)

---

## 🎯 Cómo Usar el Sistema

### Obtener una Traducción Simple

```javascript
import { i18n } from './services/I18nService.js';

const welcomeText = i18n.t('auth.login.title'); 
// Español: "Supply Line Commander"
// English: "Supply Line Commander"
```

### Traducción con Variables

```javascript
const message = i18n.t('welcome.user', { username: 'Juan' });
// "Bienvenido, Juan" (si está en el JSON como "Bienvenido, {username}")
```

### Cambiar Idioma Programáticamente

```javascript
await i18n.setLanguage('en'); // Cambia a inglés
await i18n.setLanguage('es'); // Cambia a español
```

### Escuchar Cambios de Idioma

```javascript
window.addEventListener('languageChanged', (e) => {
    console.log('Nuevo idioma:', e.detail.language);
    // Actualizar tu componente aquí
});
```

---

## 🧪 Testing Manual

### Pasos para Probar

1. **Abrir el juego** (debe detectar idioma del navegador)
2. **Verificar selector** en esquina inferior derecha del login
3. **Cambiar idioma** usando el dropdown
4. **Verificar que todos los textos cambian** instantáneamente
5. **Recargar la página** → debe mantener el idioma elegido

### Casos de Prueba

| Acción | Resultado Esperado |
|--------|-------------------|
| Primer inicio con navegador en español | Idioma: Español |
| Primer inicio con navegador en inglés | Idioma: English |
| Cambiar de ES → EN | Todos los textos cambian a inglés |
| Cambiar de EN → ES | Todos los textos vuelven a español |
| Recargar página | Mantiene idioma seleccionado |
| localStorage vacío | Usa español por defecto |

---

## 🔒 Sistema de Fallback

El sistema tiene 3 niveles de fallback para garantizar que siempre se muestre algo:

```
1. Idioma actual (ej: 'en')
   ↓ (si falta)
2. Idioma fallback ('es')
   ↓ (si también falta)
3. Clave entre corchetes ('[auth.login.title]')
```

**Ejemplo:**
- Si falta `auth.login.title` en inglés → usa español
- Si falta en ambos → muestra `[auth.login.title]`

---

## 🚀 Próximos Pasos (Futuras Fases)

### Fase 2: Menú Principal
- [ ] Botones del menú (Jugar, Tutorial, Arsenal, Opciones, Salir)
- [ ] Pantalla de carga
- [ ] Mensajes del sistema

### Fase 3: Descripciones de Edificios
- [ ] Migrar `NODE_DESCRIPTIONS` del servidor
- [ ] Sincronización cliente-servidor con idioma preferido

### Fase 4: UI del Juego
- [ ] Tooltips
- [ ] Notificaciones
- [ ] Textos del canvas (nombres de edificios, contadores)

### Fase 5: Chat y Mensajes del Servidor
- [ ] Mensajes del sistema (jugador se unió, etc.)
- [ ] Razones de victoria/derrota
- [ ] Logs del juego

---

## 📝 Notas Técnicas

### Rendimiento
- Las traducciones se cachean en memoria
- Una sola carga de JSON por idioma
- Cambios de idioma son instantáneos (sin recarga)

### Compatibilidad
- Funciona sin servidor (archivos JSON estáticos)
- Compatible con todos los navegadores modernos
- No rompe funcionalidad existente

### Mantenimiento
- Añadir nuevos textos: editar JSON correspondiente
- Añadir nuevo idioma: crear nuevo archivo `locales/client/XX.json`
- Sistema autodocumentado con claves descriptivas

---

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| Aparecen claves `[auth.login.title]` | Verificar que el JSON tiene la clave |
| No cambia el idioma | Verificar que `await i18n.init()` se ejecutó |
| Idioma no persiste | Verificar localStorage habilitado |
| Traducciones no cargan | Verificar ruta `locales/client/*.json` |

---

**Fecha de Implementación:** Diciembre 2025  
**Estado:** ✅ Fase 1 Completada  
**Siguiente Fase:** Menú Principal

