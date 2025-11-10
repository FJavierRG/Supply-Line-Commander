# 🔍 RESTOS DE SINGLEPLAYER LEGACY

## ⚠️ **CONTEXTO CRÍTICO**
El juego **NO tiene singleplayer**. Es siempre **multiplayer** con opción de añadir **IA** en lugar de un segundo jugador humano.

---

## 📍 **LUGARES CON REFERENCIAS A SINGLEPLAYER**

### 1. **`src/Game.js`** - Referencias múltiples

#### Línea 93-94:
```javascript
this.isMultiplayer = false;
this.myTeam = 'ally'; // Por defecto en singleplayer
```
**Problema**: `isMultiplayer` se inicializa en `false`, pero debería inicializarse en `true` o detectarse automáticamente cuando se conecta a una sala.

#### Línea 96-97:
```javascript
// 🆕 SERVIDOR COMO AUTORIDAD: Configuración de edificios para singleplayer
this.serverBuildingConfig = null;
```
**Problema**: Comentario menciona "singleplayer", debería decir "configuración local antes de conectar al servidor".

#### Línea 103-104:
```javascript
// 🆕 SERVIDOR COMO AUTORIDAD: Inicializar configuración de edificios para singleplayer
this.initializeSingleplayerBuildingConfig();
```
**Problema**: Nombre del método y comentario mencionan "singleplayer". Debería ser `initializeLocalBuildingConfig()` o similar.

#### Línea 177-180:
```javascript
// 🎯 NUEVO: Establecer myTeam en singleplayer
if (!this.isMultiplayer) {
    this.myTeam = 'player1';
}
```
**Problema**: Lógica condicional basada en `isMultiplayer`. Debería establecerse cuando se conecta a una sala.

#### Línea 345, 377:
```javascript
// 🆕 NUEVO: Crea el helicóptero inicial para B_Nation en singleplayer
// 🆕 NUEVO: Despega un helicóptero desde un nodo hacia otro (singleplayer)
```
**Problema**: Comentarios mencionan "singleplayer", deberían ser genéricos.

#### Línea 1370-1371:
```javascript
// SINGLEPLAYER: Pseudo-servidor local
console.log(`🛡️ SINGLEPLAYER: Enviando tank_request a pseudo-servidor: target=${targetBase.id}`);
```
**Problema**: Log menciona "SINGLEPLAYER", debería decir "LOCAL" o eliminarse.

#### Línea 1747-1749:
```javascript
/**
 * 🆕 SERVIDOR COMO AUTORIDAD: Inicializar configuración de edificios para singleplayer
 */
initializeSingleplayerBuildingConfig() {
```
**Problema**: Nombre del método y comentario mencionan "singleplayer". Debería renombrarse.

---

### 2. **`src/systems/BuildingSystem.js`** - Referencias múltiples

#### Líneas 200-210:
```javascript
// Delegar TODO al servidor/pseudo-servidor
if (this.game.isMultiplayer && this.game.network) {
    // MULTIPLAYER: Servidor remoto
    console.log(`🏗️ MULTIPLAYER: Enviando build_request: ${buildingId} en (${x}, ${y})`);
    this.game.network.requestBuild(buildingId, x, y);
} else {
    // SINGLEPLAYER: Pseudo-servidor local (Game.js)
    console.log(`🏗️ SINGLEPLAYER: Enviando build_request a pseudo-servidor: ${buildingId} en (${x}, ${y})`);
    this.game.handleBuildRequest(buildingId, x, y);
}
```
**Problema**: Lógica condicional que asume "singleplayer" cuando no hay conexión. Debería requerir siempre conexión al servidor.

#### Líneas similares en:
- `launchDrone()` (línea 368-369)
- `launchTank()` (línea 439-440)
- `launchSniper()` (línea 546-547)
- `launchFobSabotage()` (línea 609-610)
- `deployCommando()` (línea 682-683)

**Problema**: Todas tienen la misma lógica condicional con referencias a "SINGLEPLAYER".

#### Líneas 289, 304:
```javascript
// Obtener equipo del jugador (soporta singleplayer y multiplayer)
```
**Problema**: Comentario menciona "singleplayer", debería eliminarse.

---

### 3. **`src/systems/StoreUIManager.js`** - Referencias múltiples

#### Línea 48:
```javascript
// Determinar team (multijugador usa myTeam, singleplayer usa 'player1')
const team = this.game?.myTeam || 'player1';
```
**Problema**: Comentario menciona "singleplayer", debería ser genérico.

#### Líneas 134-160:
```javascript
/**
 * 🆕 Crea configuración de raza para singleplayer desde el servidor
 */
async createSingleplayerRaceConfig(raceId) {
    // ...
    // En singleplayer, el jugador es 'player1'
    this.game.raceConfigs['player1'] = raceConfig;
    // ...
}
```
**Problema**: Nombre del método y comentarios mencionan "singleplayer". Debería renombrarse a `createLocalRaceConfig()` o similar.

#### Líneas 777-791:
```javascript
// 🎯 NUEVO: En singleplayer, crear configuración desde el servidor si no existe
if (this.game && (!this.game.isMultiplayer || this.game.isMultiplayer === false)) {
    if (!this.game.raceConfigs || !this.game.raceConfigs['player1']) {
        this.createSingleplayerRaceConfig(raceId).then(() => {
            // ...
        });
    }
} else {
    // Multijugador: solo actualizar categorías
    this.updateCategories();
}
```
**Problema**: Lógica condicional basada en `isMultiplayer`. Debería siempre usar configuración del servidor.

---

### 4. **`src/systems/TerritorySystem.js`** - Referencias múltiples

#### Línea 78:
```javascript
// En singleplayer, usar myTeam dinámico para soportar 'ally'
const teamToFilter = this.game.isMultiplayer ? 'player1' : (this.game.myTeam || 'ally');
```
**Problema**: Lógica condicional que asume "singleplayer" cuando no hay multiplayer.

#### Línea 113:
```javascript
// En singleplayer, el enemigo es cualquier team que NO sea el mío
```
**Problema**: Comentario menciona "singleplayer".

#### Línea 313:
```javascript
// En singleplayer, usar detección dinámica de equipos
```
**Problema**: Comentario menciona "singleplayer".

#### Línea 331:
```javascript
// SINGLEPLAYER: Detección dinámica
```
**Problema**: Comentario menciona "SINGLEPLAYER".

#### Línea 367:
```javascript
// Singleplayer: player1 = azul (yo), player2 = rojo (enemigo)
```
**Problema**: Comentario menciona "Singleplayer".

---

### 5. **`src/systems/RenderSystem.js`** - Referencias menores

#### Línea 150:
```javascript
// En singleplayer, puede ser 'ally' o 'enemy'
```
**Problema**: Comentario menciona "singleplayer".

#### Línea 1382:
```javascript
// Los helicópteros en singleplayer ya no son convoys, sino entidades persistentes
```
**Problema**: Comentario menciona "singleplayer".

---

### 6. **`src/systems/NetworkManager.js`** - Referencia menor

#### Línea 2414:
```javascript
// Estadísticas (usando mismo estilo que singleplayer)
```
**Problema**: Comentario menciona "singleplayer".

---

### 7. **`server/utils/mapGenerator.js`** - Referencias

#### Línea 2:
```javascript
// Lógica de generación de mapas que se usa tanto en singleplayer como multiplayer
```
**Problema**: Comentario menciona "singleplayer".

#### Línea 46:
```javascript
 * @param {string} team - 'player1' o 'player2' o 'ally'/'enemy' para singleplayer
```
**Problema**: Documentación menciona "singleplayer".

#### Líneas 92-95:
```javascript
/**
 * Genera el mapa completo (jugador + enemigo) para singleplayer
 */
export function generateSingleplayerMap() {
```
**Problema**: Función y documentación mencionan "singleplayer". Debería renombrarse o eliminarse si no se usa.

---

### 8. **`src/config/nodes.js`** - Referencia menor

#### Línea 433:
```javascript
 * SIEMPRE usa configuración del servidor (tanto en singleplayer como multiplayer)
```
**Problema**: Comentario menciona "singleplayer".

#### Línea 443:
```javascript
    // Usar configuración del servidor (tanto en singleplayer como multiplayer)
```
**Problema**: Comentario menciona "singleplayer".

---

## 🎯 **RESUMEN DE PROBLEMAS**

### **Problemas Principales:**

1. **`isMultiplayer` inicializado en `false`**: Debería inicializarse en `true` o detectarse automáticamente.

2. **Lógica condicional basada en `!isMultiplayer`**: Muchos lugares asumen "singleplayer" cuando no hay conexión, pero deberían requerir siempre conexión al servidor.

3. **Métodos con nombres "singleplayer"**: 
   - `initializeSingleplayerBuildingConfig()`
   - `createSingleplayerRaceConfig()`
   - `generateSingleplayerMap()` (si existe)

4. **Comentarios y logs con "SINGLEPLAYER"**: Deberían eliminarse o cambiarse por términos genéricos como "LOCAL" o "SIN CONEXIÓN".

5. **Lógica de "pseudo-servidor local"**: El código que ejecuta lógica autoritativa localmente cuando `!isMultiplayer` debería eliminarse, ya que siempre debería haber un servidor.

---

## ✅ **SOLUCIONES PROPUESTAS**

1. **Eliminar lógica condicional de "singleplayer"**: Siempre requerir conexión al servidor.

2. **Renombrar métodos y variables**: Cambiar nombres que mencionen "singleplayer" por términos genéricos.

3. **Actualizar comentarios**: Eliminar o cambiar referencias a "singleplayer" en comentarios y logs.

4. **Refactorizar inicialización**: Asegurar que el juego siempre se conecte a un servidor (local o remoto).

5. **Eliminar código legacy**: Si hay funciones como `generateSingleplayerMap()` que no se usan, eliminarlas.

---

## 📝 **NOTAS**

- El juego **siempre** debería conectarse a un servidor (puede ser local para desarrollo).
- La IA se añade en el lobby mediante `add_ai_player` en el servidor.
- No hay modo "singleplayer" real, solo multiplayer con IA opcional.

