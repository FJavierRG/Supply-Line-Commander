# Análisis del Sistema de Razas (raceConfig.js)

## Resumen Ejecutivo

El archivo `server/config/raceConfig.js` contiene la configuración de razas/naciones del juego. Aunque el sistema de selección de razas ha sido reemplazado por un sistema de deckbuilding, **el código de razas sigue siendo utilizado activamente** como sistema de respaldo y para configuraciones críticas del juego.

## Estado Actual: Código Zombie vs Código Activo

### ✅ **CÓDIGO ACTIVO** - Todavía se usa:

1. **Sistema de vehículos iniciales** - `getServerInitialVehiclesForRace()`
   - Se usa para determinar qué vehículos tiene el HQ/FOB al inicio
   - Ubicación: `server/game/managers/RaceManager.js:100-115`
   - **CRÍTICO**: Se ejecuta siempre, incluso con mazos

2. **Validación de edificios (fallback)** - `getServerRaceBuildings()`
   - Se usa cuando NO hay mazo disponible
   - Ubicación: `server/game/handlers/BuildHandler.js:481-499`
   - **IMPORTANTE**: Sistema de respaldo para compatibilidad

3. **Sistema de transporte** - `getServerRaceTransportSystem()`
   - Determina si usa transporte estándar o aéreo
   - Ubicación: `server/game/handlers/ConvoyHandler.js:77-82`
   - **CRÍTICO**: Afecta rutas y tipos de vehículos

4. **Validación de FOBs** - `canServerRaceUseFOBs()`
   - Determina si una raza puede construir FOBs
   - Ubicación: `server/game/managers/RaceManager.js:35-37`
   - **CRÍTICO**: Restricción de gameplay

5. **Sistema de IA** - `RaceAIConfig.js`
   - La IA usa `raceConfig.buildings` y `raceConfig.consumables`
   - Ubicación: `server/game/managers/AISystem.js:163-184`
   - **CRÍTICO**: La IA depende completamente de raceConfig

6. **Mazo predeterminado** - `defaultDeck.js`
   - Usa `getServerRaceBuildings('A_Nation')` y `getServerRaceConsumables('A_Nation')`
   - Ubicación: `server/config/defaultDeck.js:12-22`
   - **CRÍTICO**: Define qué unidades tiene el mazo por defecto

### ⚠️ **CÓDIGO ZOMBIE** - Ya no se usa directamente:

1. **Selector de razas en lobby** - Desconectado
   - El selector visual ya no permite elegir razas
   - Ubicación: `index.html:155` (solo A_Nation disponible)
   - Estado: Comentado como "TEMPORAL: B_Nation deshabilitada"

2. **Configuración visual de razas** - `src/config/races.js`
   - Solo contiene información visual (nombre, color, icono)
   - Los datos críticos están en el servidor
   - Estado: Marcado como DEPRECATED

3. **Funciones deprecadas en cliente** - `src/config/nodes.js`
   - `getBuildableNodesByRace()`, `getProjectilesByRace()`, `isNodeAvailableForRace()`
   - Marcadas como DEPRECATED
   - Estado: Mantenidas para compatibilidad

## Uso de "A_Nation" por Defecto

### Dónde se establece automáticamente:

1. **Al establecer un mazo** (`RaceManager.setPlayerDeck()`)
   ```javascript
   // Línea 138: server/game/managers/RaceManager.js
   this.gameState.playerRaces[team] = 'A_Nation';
   ```
   - **Razón**: Necesario para vehículos iniciales del HQ/FOB
   - **Comentario**: "El usuario nunca verá esto, solo ve mazos"

2. **Al iniciar juego sin selección** (`server/server.js:1148-1152`)
   - Si no hay mazo ni raza seleccionada, se establece mazo predeterminado
   - El mazo predeterminado usa A_Nation internamente

3. **Fallback en IA** (`AISystem.js:206`)
   ```javascript
   return raceManager.getPlayerRace(team) || 'A_Nation'; // Fallback a A_Nation
   ```

4. **Función getDefaultRace()** (`src/config/races.js:56-58`)
   ```javascript
   export function getDefaultRace() {
       return 'A_Nation'; // Cambiado de 'default' a 'A_Nation' para consistencia
   }
   ```

## Flujo de Uso Actual

### Escenario 1: Jugador con Mazo (Modo Normal)
```
1. Jugador selecciona mazo en lobby
2. Servidor recibe mazo → setPlayerDeck()
3. setPlayerDeck() establece automáticamente A_Nation como raza
4. Validación de construcción usa MAZO (no raza)
5. Vehículos iniciales usan raceConfig de A_Nation
6. Sistema de transporte usa raceConfig de A_Nation
```

### Escenario 2: Jugador sin Mazo (Fallback)
```
1. No hay mazo disponible
2. Se usa raceConfig para validar edificios/consumibles
3. Se usa A_Nation por defecto
4. BuildHandler.canBuildBuilding() usa getServerRaceBuildings('A_Nation')
```

### Escenario 3: IA (Siempre usa raceConfig)
```
1. IA siempre tiene una raza asignada (A_Nation o B_Nation)
2. Usa raceConfig.buildings para saber qué construir
3. Usa raceConfig.consumables para saber qué usar
4. Usa RaceAIConfig para estrategias específicas por raza
```

## Archivos que Importan raceConfig

### Servidor (Uso Activo):
- ✅ `server/game/managers/RaceManager.js` - Gestión de razas
- ✅ `server/game/handlers/BuildHandler.js` - Validación de construcción
- ✅ `server/game/handlers/ConvoyHandler.js` - Sistema de transporte
- ✅ `server/config/defaultDeck.js` - Mazo predeterminado
- ✅ `server/game/managers/AISystem.js` - Sistema de IA
- ✅ `server/game/ai/config/RaceAIConfig.js` - Configuración de IA por raza

### Cliente (Uso Limitado/Fallback):
- ⚠️ `src/systems/StoreUIManager.js` - Fallback para mostrar tienda
- ⚠️ `src/systems/ConvoyManager.js` - Sistema de transporte (cliente)
- ⚠️ `src/config/races.js` - Solo visual (DEPRECATED)

## Configuración de A_Nation vs B_Nation

### A_Nation (Activa - Usada por Defecto):
- ✅ Edificios: fob, antiDrone, droneLauncher, truckFactory, engineerCenter, nuclearPlant, vigilanceTower, intelRadio, intelCenter
- ✅ Consumibles: drone, sniperStrike, specopsCommando, fobSabotage
- ✅ Transporte: standard (camiones)
- ✅ FOBs: Puede usar FOBs
- ✅ Vehículos iniciales: HQ tiene 4 vehículos, FOB tiene 2

### B_Nation (Zombie - Solo para IA):
- ⚠️ Edificios: intelRadio, intelCenter, campaignHospital, aerialBase, antiDrone, vigilanceTower
- ⚠️ Consumibles: fobSabotage, sniperStrike, specopsCommando, tank
- ⚠️ Transporte: aerial (helicópteros)
- ⚠️ FOBs: NO puede usar FOBs
- ⚠️ Vehículos iniciales: HQ tiene 1 helicóptero, sin vehículos terrestres
- ⚠️ **Estado**: Solo disponible para IA, no para jugadores humanos

## Recomendaciones

### Código que DEBE mantenerse:
1. ✅ `getServerInitialVehiclesForRace()` - Crítico para vehículos iniciales
2. ✅ `getServerRaceTransportSystem()` - Crítico para sistema de transporte
3. ✅ `canServerRaceUseFOBs()` - Crítico para restricciones de gameplay
4. ✅ Configuración de A_Nation - Usada como base para todos los mazos

### Código que podría eliminarse (con cuidado):
1. ⚠️ Configuración de B_Nation - Solo si se elimina soporte para IA con B_Nation
2. ⚠️ Funciones deprecadas en `src/config/nodes.js` - Si se confirma que no se usan
3. ⚠️ `src/config/races.js` - Solo visual, podría moverse a otro lugar

### Refactorización sugerida:
1. **Renombrar conceptos**: "race" → "faction" o "nation" para claridad
2. **Separar responsabilidades**: 
   - Configuración de vehículos iniciales → `vehicleConfig.js`
   - Configuración de transporte → `transportConfig.js`
   - Configuración de IA → Ya separado en `RaceAIConfig.js`
3. **Documentar dependencias**: Aclarar que A_Nation es la base para todos los mazos

## ⚠️ DUPLICACIÓN DE CONFIGURACIÓN DETECTADA

### Problema: Configuración de vehículos iniciales duplicada

Hay **tres lugares** donde se define la configuración de vehículos iniciales para A_Nation:

1. **`raceConfig.js` (Líneas 32-51)** - `initialVehicles`
   ```javascript
   A_Nation: {
       initialVehicles: {
           hq: { availableVehicles: 4, maxVehicles: 4 },
           fob: { availableVehicles: 2, maxVehicles: 2 }
       }
   }
   ```
   - ✅ **USADO**: Por `GameStateManager.createNode()` al iniciar el juego
   - Ubicación: `server/game/GameStateManager.js:259`

2. **`serverNodes.js` (Líneas 185-198)** - `capacities`
   ```javascript
   capacities: {
       hq: { maxVehicles: 4, hasVehicles: true },
       fob: { maxVehicles: 2, hasVehicles: true }
   }
   ```
   - ✅ **USADO**: Por `BuildHandler.createNode()` al construir edificios
   - Ubicación: `server/game/handlers/BuildHandler.js:389-390`
   - También usado por `CommandoSystem.js` para recalcular vehículos del HQ

3. **`gameConfig.js` (Líneas 99-122)** - `initialNodes`
   ```javascript
   initialNodes: {
       hq: { availableVehicles: 4, maxVehicles: 4 },
       fobs: [{ vehicles: 2 }]
   }
   ```
   - ❌ **NO USADO**: Parece ser código legacy que ya no se utiliza
   - El juego usa `MAP_CONFIG` de `mapGenerator.js` para posiciones

### Impacto

- **Duplicación de valores**: Los mismos números (4 vehículos HQ, 2 vehículos FOB) están en dos lugares activos
- **Riesgo de inconsistencia**: Si se cambia un valor, hay que cambiarlo en ambos lugares
- **Confusión**: No está claro cuál es la "fuente de verdad"

### Recomendación

**Opción 1: Consolidar en `serverNodes.capacities`**
- Eliminar `raceConfig.initialVehicles` 
- Hacer que `getServerInitialVehiclesForRace()` lea de `SERVER_NODE_CONFIG.capacities`
- Ventaja: Una sola fuente de verdad
- Desventaja: Pierde la capacidad de tener diferentes valores por raza (B_Nation tiene diferentes valores)

**Opción 2: Mantener separado pero documentar**
- `serverNodes.capacities` → Valores base/máximos para todos
- `raceConfig.initialVehicles` → Valores iniciales específicos por raza
- Documentar claramente la diferencia
- Ventaja: Permite diferentes configuraciones por raza
- Desventaja: Mantiene duplicación

**Opción 3: Eliminar `gameConfig.initialNodes`**
- Este código parece no usarse
- Verificar y eliminar si confirma que es legacy

## Conclusión

**El código de raceConfig NO es completamente zombie**. Sigue siendo crítico para:
- Vehículos iniciales del HQ/FOB (aunque duplicado con serverNodes)
- Sistema de transporte (rutas y tipos de vehículos)
- Restricciones de gameplay (FOBs)
- Sistema de IA
- Mazo predeterminado

**A_Nation se usa por defecto** en todos los casos donde se establece un mazo, pero el usuario nunca ve esta selección. Es un detalle de implementación interno necesario para que el juego funcione correctamente.

**B_Nation existe pero solo se usa para IA**, no está disponible para jugadores humanos en el lobby.

**✅ CONSOLIDACIÓN COMPLETADA**: La configuración de vehículos iniciales ha sido consolidada en `SERVER_NODE_CONFIG.capacities` como fuente única de verdad. Las secciones `initialVehicles` han sido eliminadas de `raceConfig.js` y `getServerInitialVehiclesForRace()` ahora lee directamente de `serverNodes.capacities`.

