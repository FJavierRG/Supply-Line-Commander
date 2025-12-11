# 🌐 Sistema i18n - Fase 3: Descripciones de Edificios + Sincronización

## ✅ Completado

### Archivos Creados

1. **`locales/server/es.json`** - Descripciones en español (edificios + consumibles + sistema)
2. **`locales/server/en.json`** - Descripciones en inglés (edificios + consumibles + sistema)
3. **`server/services/I18nService.js`** - Servicio de i18n para el servidor

### Archivos Modificados

1. **`server/server.js`** - Inicialización de i18n + handshake modificado
2. **`src/systems/NetworkManager.js`** - Cliente envía idioma preferido al conectar

---

## 📋 Características Implementadas

### 1. Sistema de Traducciones del Servidor

El servidor ahora tiene su propio servicio de i18n completamente independiente del cliente:

```javascript
// server/services/I18nService.js
import { i18nServer } from './services/I18nService.js';

// Inicializar al arrancar el servidor
i18nServer.init();

// Obtener traducción
i18nServer.t('es', 'buildings.hq.name'); // "HQ (Cuartel General)"
i18nServer.t('en', 'buildings.hq.name'); // "HQ (Headquarters)"

// Obtener todas las descripciones
const descriptions = i18nServer.getAllDescriptions('es');
```

### 2. Handshake Mejorado Cliente-Servidor

#### Flujo Anterior (Fase 1-2):
```
1. Cliente conecta
2. Servidor envía game_config inmediatamente
3. Cliente recibe descripciones en español (hardcoded)
```

#### Flujo Nuevo (Fase 3):
```
1. Cliente conecta
2. Cliente envía su idioma preferido: { language: 'en' }
3. Servidor recibe idioma
4. Servidor envía game_config con descripciones traducidas
5. Cliente recibe descripciones en su idioma
```

### 3. Sincronización Automática

- El cliente lee su idioma de `i18n.getCurrentLanguage()`
- Al conectar al servidor, envía el idioma via `client_language` event
- El servidor guarda el idioma en `socket.clientLanguage`
- Todas las descripciones se envían en el idioma correcto

---

## 📊 Contenido Migrado

### Edificios Traducidos (26 buildings)
✅ HQ (Cuartel General / Headquarters)  
✅ FOB (Base de Operaciones Avanzada / Forward Operating Base)  
✅ Front (Frente / Front)  
✅ Anti-Dron / Anti-Drone  
✅ Lanzadera de Drones / Drone Launcher  
✅ Red de Navajas / Razor Net  
✅ Fábrica de Camiones / Truck Factory  
✅ Fábrica / Factory  
✅ Centro de Ingenieros / Engineer Center  
✅ Planta Nuclear / Nuclear Plant  
✅ Nido de Máquinas / Machine Nest  
✅ Hospital de Campaña / Field Hospital  
✅ Radio de Inteligencia / Intelligence Radio  
✅ Centro de Inteligencia / Intelligence Center  
✅ Base Aérea / Aerial Base  
✅ Torre de Vigilancia / Vigilance Tower  
✅ Estación de Tren / Train Station  
✅ Taller de Drones / Drone Workshop  
✅ Taller de Vehículos / Vehicle Workshop  
✅ Estudios de Física / Physics Studies  
✅ Laboratorio Secreto / Secret Laboratory  
✅ Campo de Entrenamiento / Training Camp  
✅ Fábrica de Vehículos Artillados / Armored Vehicle Factory  
✅ Construcción Prohibida / Forbidden Construction  
✅ Servidores / Servers  

### Consumibles Traducidos (10 consumables)
✅ Dron Bomba / Bomb Drone  
✅ Ataque de Francotirador / Sniper Strike  
✅ Sabotaje FOB / FOB Sabotage  
✅ Comando Especial / Special Commando  
✅ Truck Assault  
✅ Tanque / Tank  
✅ Artillado Ligero / Light Armored  
✅ Artillería / Artillery  
✅ Dron Cámara / Camera Drone  
✅ Destructor de Mundos / World Destroyer  

### Mensajes del Sistema (7 messages)
✅ Jugador se unió / Player joined  
✅ Jugador salió / Player left  
✅ Jugador listo / Player ready  
✅ Jugador no listo / Player not ready  
✅ La partida comenzará en... / Game will start in...  
✅ La partida ha comenzado / The game has started  
✅ Victoria/Derrota / Victory/Defeat  

---

## 🔧 Implementación Técnica

### Estructura de Datos (JSON)

```json
{
  "buildings": {
    "hq": {
      "name": "HQ (Headquarters)",
      "description": "Main base: manages resources...",
      "details": "Main base that manages resources, produces {maxVehicles} vehicles..."
    }
  },
  "consumables": {
    "drone": {
      "name": "Bomb Drone",
      "description": "Destroys an enemy target...",
      "details": "Consumable that destroys... Cost: {cost}$..."
    }
  },
  "system": {
    "player_joined": "{playerName} joined the room"
  }
}
```

### Interpolación de Variables

Las descripciones soportan variables dinámicas:

```javascript
// Servidor
const description = i18nServer.t('es', 'buildings.factory.details', {
    amount: 5,
    interval: 3
});
// "Fábrica industrial que genera 5 suministros cada 3 segundos..."
```

---

## 🧪 Testing

### Casos de Prueba

| Escenario | Acción | Resultado Esperado |
|-----------|--------|-------------------|
| Login en ES | Conectar al servidor | Descripciones en español |
| Login en EN | Conectar al servidor | Descripciones en inglés |
| Cambiar idioma | Cambiar en login → Reconectar | Descripciones actualizadas |
| Tooltip edificio | Hover sobre HQ | Muestra nombre traducido |
| Detalles consumible | Click en Dron Bomba | Muestra descripción traducida |

### Verificación Manual

1. ✅ Abrir juego, seleccionar inglés en login
2. ✅ Conectar al servidor
3. ✅ Verificar consola: "🌐 Enviando idioma preferido: en"
4. ✅ Verificar consola servidor: "Cliente XXX idioma: en"
5. ✅ Abrir Arsenal, ver nombres en inglés
6. ✅ Hover sobre edificios, ver tooltips en inglés

---

## 📈 Estadísticas Totales (Fases 1-3)

| Fase | Textos Migrados | Idiomas | Estado |
|------|-----------------|---------|--------|
| Fase 1: Login | ~20 strings | 2 | ✅ |
| Fase 2: Menús | ~80 strings | 2 | ✅ |
| Fase 3: Edificios | ~110 strings | 2 | ✅ |
| **TOTAL** | **~210 strings** | **2** | **✅** |

---

## 🚀 Próximos Pasos (Fase 4 - Opcional)

### Mensajes Dinámicos del Servidor
El servidor actualmente envía mensajes hardcodeados del sistema. Podrían traducirse:

```javascript
// ❌ Actual
io.to(room.id).emit('lobby_chat_message', {
    playerName: 'Sistema',
    message: `${playerName} se unió a la sala`
});

// ✅ Mejorado
io.to(room.id).emit('lobby_chat_message', {
    playerName: i18nServer.t(socket.clientLanguage, 'system.system'),
    translationKey: 'system.player_joined',
    data: { playerName }
});
```

### Tooltips en Canvas
Actualmente los tooltips del canvas usan descripciones que ya vienen traducidas del servidor, pero podrían mejorarse con más detalles.

### Tutorial
El tutorial tiene textos hardcodeados que podrían migrarse a i18n.

---

## 💡 Ventajas del Sistema Implementado

### 1. Servidor como Autoridad
- El servidor controla las descripciones (anti-hack)
- No se pueden manipular las traducciones desde el cliente

### 2. Sincronización Automática
- El idioma se sincroniza automáticamente al conectar
- No requiere intervención manual del usuario

### 3. Rendimiento
- Traducciones cacheadas en memoria
- Una sola carga de archivos al inicio del servidor
- Sin overhead en runtime

### 4. Mantenimiento
- Archivos JSON separados por idioma
- Fácil añadir nuevos idiomas (crear `locales/server/XX.json`)
- Fallback automático a español

### 5. Escalabilidad
- Sistema preparado para múltiples idiomas
- Interpolación de variables para contenido dinámico
- Estructura modular y extensible

---

## 🐛 Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| Descripciones en español cuando debería ser inglés | Cliente no envió idioma | Verificar `client_language` event |
| `[buildings.hq.name]` en lugar de nombre | Archivo JSON incorrecto | Verificar sintaxis del JSON |
| Servidor no arranca | Error en i18nService | Verificar rutas de archivos JSON |
| Variables no interpoladas `{cost}` | Faltan datos en interpolación | Pasar objeto `data` completo |

---

## 📝 Notas Técnicas

### Diferencias Cliente vs Servidor

| Aspecto | Cliente | Servidor |
|---------|---------|----------|
| Módulos | ES6 modules (import/export) | ES6 modules (import/export) |
| Archivos | `locales/client/*.json` | `locales/server/*.json` |
| Carga | Fetch API (async) | fs.readFileSync (sync) |
| Uso | `i18n.t('key')` | `i18nServer.t('lang', 'key')` |
| Contexto | Un idioma a la vez (usuario) | Múltiples idiomas (todos los clientes) |

### Seguridad

✅ **Protección contra manipulación:**
- Las descripciones se generan en el servidor
- El cliente no puede modificar costes, nombres o descripciones
- Validación de idioma en el servidor (fallback a español)

✅ **Validación de entrada:**
```javascript
const clientLang = i18nServer.isLanguageAvailable(language) 
    ? language 
    : 'es'; // Fallback seguro
```

---

**Fecha:** Diciembre 2025  
**Estado:** ✅ Fase 3 Completada  
**Siguiente:** Fase 4 (Opcional) - Mensajes dinámicos y tutorial

