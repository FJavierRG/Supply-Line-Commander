# Análisis de Código Legacy en `src/`

Este documento identifica las partes del código cliente (`src/`) que contienen lógica autoritativa y deberían estar solo en el servidor (`server/`).

## Principio: Cliente Tonto (Dumb Client)
El cliente (`src/`) debería:
- ✅ Renderizar gráficos y UI
- ✅ Manejar input del usuario
- ✅ Interpolar visualmente posiciones del servidor
- ✅ Reproducir sonidos y efectos visuales
- ✅ Mostrar información del estado del juego

El cliente NO debería:
- ❌ Modificar estado del juego directamente
- ❌ Validar reglas de juego
- ❌ Calcular currency, supplies, o recursos
- ❌ Ejecutar lógica de IA
- ❌ Determinar victoria/derrota
- ❌ Simular física de entidades (drones, convoyes, frentes)

---

## 🔴 CÓDIGO LEGACY CRÍTICO - Debe Migrarse al Servidor

### 1. **`src/systems/CurrencyManager.js`** ⚠️ LEGACY
**Problema:** El cliente calcula y actualiza currency directamente.

**Código problemático:**
- `updatePassiveCurrency(dt)` - Calcula currency pasiva cada frame
- `add(amount)` - Modifica currency directamente
- `spend(amount)` - Gasta currency sin validación del servidor
- `getNuclearPlantBonus()` - Calcula bonus de plantas nucleares

**Estado:** Solo funciona en singleplayer. En multiplayer debería estar deshabilitado.

**Solución:** El servidor ya tiene `server/game/systems/CurrencySystem.js` - el cliente solo debe leer currency del estado del servidor.

---

### 2. **`src/systems/DroneSystem.js`** ⚠️ LEGACY PARCIAL
**Problema:** En singleplayer, el cliente simula completamente los drones.

**Código problemático:**
- `update(dt)` - Mueve drones y calcula colisiones (líneas 71-117)
- `destroyTarget(target)` - Destruye objetivos directamente (líneas 132-151)
- `launchDrone()` - Crea drones sin autoridad del servidor en singleplayer

**Estado:** En multiplayer está deshabilitado (línea 73), pero en singleplayer ejecuta toda la lógica.

**Solución:** El servidor ya tiene `server/systems/DroneSystemServer.js` - el cliente solo debe renderizar drones.

---

### 3. **`src/systems/FrontMovementSystem.js`** ⚠️ LEGACY PARCIAL
**Problema:** En singleplayer, el cliente simula movimiento de frentes y otorga currency.

**Código problemático:**
- `update()` - Simula movimiento de frentes (líneas 36-62)
- `updateAllyFrontMovement()` - Modifica posición X de frentes (líneas 69-135)
- `updateEnemyFrontMovement()` - Modifica posición X de frentes enemigos (líneas 142-209)
- `awardCurrencyForAdvance()` - Otorga currency por avance (líneas 215-233)
- `awardEnemyCurrencyForAdvance()` - Otorga currency a la IA (líneas 240-259)
- `checkVictoryConditions()` - Determina victoria/derrota (líneas 374-400)

**Estado:** En multiplayer está deshabilitado (línea 38), pero en singleplayer ejecuta toda la lógica.

**Solución:** El servidor ya tiene `server/systems/FrontMovementSystemServer.js` - el cliente solo debe renderizar frentes.

---

### 4. **`src/systems/TerritorySystem.js`** ⚠️ LEGACY PARCIAL
**Problema:** En singleplayer, el cliente verifica y ejecuta abandono de edificios.

**Código problemático:**
- `update()` - Verifica FOBs fuera de territorio (líneas 526-538)
- `checkFOBsOutOfTerritory()` - Ejecuta `startAbandoning()` en edificios (líneas 545-579)
- `isBuildingCompletelyOutOfTerritory()` - Determina si un edificio debe abandonarse (líneas 589-621)

**Estado:** En multiplayer está deshabilitado (línea 528), pero en singleplayer ejecuta la lógica.

**Solución:** El servidor ya tiene `server/systems/AbandonmentSystem.js` - el cliente solo debe mostrar efectos visuales.

---

### 5. **`src/systems/MedicalEmergencySystem.js`** ⚠️ LEGACY PARCIAL
**Problema:** En singleplayer, el cliente crea y gestiona emergencias médicas.

**Código problemático:**
- `update()` - Crea nuevas emergencias y aplica penalizaciones (líneas 113-176)
- `triggerRandomEmergency()` - Crea emergencias aleatorias (líneas 182-202)
- `applyPenalty()` - Modifica `consumeRate` de frentes (líneas 87-108)
- `notifyNearbyHospitals()` - Triggea respuestas automáticas (líneas 232-251)
- `triggerHospitalResponse()` - Ejecuta respuestas de hospitales (líneas 256-278)

**Estado:** En multiplayer está deshabilitado (línea 115), pero en singleplayer ejecuta toda la lógica.

**Solución:** El servidor ya tiene `server/systems/MedicalSystemServer.js` - el cliente solo debe mostrar emergencias.

---

### 6. **`src/systems/EnemyAISystem.js`** ⚠️ LEGACY COMPLETO
**Problema:** Sistema completo de IA ejecutándose en el cliente.

**Archivo completo:** Toda la lógica de IA enemiga está en el cliente.

**Código problemático:**
- `update()` - Actualiza currency pasiva del enemigo (línea 165)
- `ruleResupplyFOBs()` - Toma decisiones de reabastecimiento
- `ruleResupplyFronts()` - Toma decisiones de reabastecimiento
- `ruleReactToPlayer()` - Reacciona a acciones del jugador
- `attemptFOBConstruction()` - Construye edificios
- `attemptDroneLaunch()` - Lanza drones
- `attemptSniperStrike()` - Lanza snipers
- Y muchas más decisiones autoritativas...

**Estado:** Solo funciona en singleplayer. En multiplayer debería estar completamente deshabilitado.

**Solución:** El servidor ya tiene `server/game/managers/AISystem.js` - el cliente NO debe ejecutar IA.

---

### 7. **`src/ai/AIDirector.js`** ⚠️ LEGACY COMPLETO
**Problema:** Director de IA ejecutándose en el cliente.

**Archivo completo:** Sistema modular de IA que toma decisiones autoritativas.

**Código problemático:**
- `update()` - Toma decisiones cada frame (líneas 72-119)
- `handleSupply()` - Decide reabastecimiento
- `handleStrategicBuilding()` - Decide construcciones
- `handleOffensiveDecision()` - Decide acciones ofensivas
- `handleSniperHarass()` - Decide harass
- Y todas las acciones que ejecuta...

**Estado:** Solo funciona en singleplayer. En multiplayer debería estar completamente deshabilitado.

**Solución:** El servidor ya tiene `server/game/managers/AISystem.js` - el cliente NO debe ejecutar IA.

---

### 8. **`src/systems/AntiDroneSystem.js`** ⚠️ LEGACY PARCIAL
**Problema:** En singleplayer, el cliente simula combate anti-drone.

**Código problemático:**
- `update()` - Verifica drones y dispara (líneas 22-28)
- `shootDrone()` - Destruye drones directamente (líneas 187-219)
- `destroyAntiDroneBuilding()` - Destruye edificios directamente (líneas 252-276)

**Estado:** En multiplayer debería estar deshabilitado, pero no hay verificación.

**Solución:** El servidor debería manejar la lógica de combate anti-drone.

---

### 9. **`src/Game.js`** ⚠️ LEGACY PARCIAL
**Problema:** Contiene lógica autoritativa de singleplayer.

**Código problemático:**
- `handleBuildRequest()` - Valida y ejecuta construcciones (líneas 1243-1379)
- `handleFobSabotageRequest()` - Ejecuta sabotaje de FOBs (línea 1462)
- `addMissionCurrency()` - Modifica currency directamente (línea 1218)
- `update()` - En singleplayer, ejecuta simulaciones que deberían estar en el servidor (líneas 498-568)

**Estado:** Estos métodos solo se usan en singleplayer como "pseudo-servidor local".

**Solución:** En multiplayer, todo esto debe venir del servidor. En singleplayer, podría mantenerse como simulador local, pero idealmente debería ejecutarse en un servidor local.

---

### 10. **`src/systems/ConvoyManager.js`** ✅ PARCIALMENTE CORRECTO
**Estado:** Ya delegado al servidor en multiplayer (líneas 73-77).

**Código legacy restante:**
- `deliverSupplies()` - Modifica supplies directamente (línea 126)
- En singleplayer aún ejecuta lógica local

**Solución:** El servidor ya tiene `server/game/managers/ConvoyMovementManager.js` - el cliente solo debe mostrar convoyes.

---

## 🟡 CÓDIGO QUE DEBE REVISARSE

### 11. **`src/systems/GameStateManager.js`**
**Estado:** Solo maneja estado de UI (menu, playing, paused, etc.) - probablemente está bien.

**Nota:** El estado del juego real viene del servidor vía `NetworkManager.applyGameState()`.

---

## 🟢 CÓDIGO CORRECTO (Solo Renderizado/UI)

Estos sistemas están bien implementados como cliente tonto:

- ✅ `src/systems/RenderSystem.js` - Solo renderizado
- ✅ `src/systems/UIManager.js` - Solo UI
- ✅ `src/systems/AudioManager.js` - Solo sonidos
- ✅ `src/systems/BuildingSystem.js` - Ya delega al servidor (líneas 195-203)
- ✅ `src/systems/CameraController.js` - Solo cámara
- ✅ `src/utils/InterpolationUtils.js` - Solo interpolación visual
- ✅ `src/systems/ParticleSystem.js` - Solo efectos visuales
- ✅ `src/systems/NetworkManager.js` - Maneja comunicación, aplica estado del servidor

---

## 📊 Resumen por Prioridad

### 🔴 CRÍTICO (Migrar inmediatamente)
1. `EnemyAISystem.js` - Toda la IA ejecutándose en cliente
2. `AIDirector.js` - Director de IA ejecutándose en cliente
3. `CurrencyManager.js` - Currency calculada en cliente
4. `FrontMovementSystem.js` - Simulación de frentes en cliente
5. `DroneSystem.js` - Simulación de drones en cliente

### 🟡 IMPORTANTE (Migrar pronto)
6. `MedicalEmergencySystem.js` - Emergencias creadas en cliente
7. `TerritorySystem.js` - Abandono ejecutado en cliente
8. `AntiDroneSystem.js` - Combate simulado en cliente
9. `Game.js` - Lógica autoritativa de singleplayer

### 🟢 BAJO (Ya parcialmente correcto)
10. `ConvoyManager.js` - Ya delega al servidor en multiplayer

---

## 🎯 Recomendaciones

1. **Deshabilitar completamente en multiplayer:**
   - Verificar que todos los sistemas legacy tengan `if (this.game.isMultiplayer) return;` al inicio de sus métodos `update()`.

2. **Migrar lógica de singleplayer:**
   - El singleplayer debería usar un servidor local o la misma lógica del servidor.
   - Actualmente `Game.js` actúa como "pseudo-servidor" - esto debería eliminarse.

3. **Separar responsabilidades:**
   - Cliente: Solo renderizado, input, interpolación, UI
   - Servidor: Toda la simulación, validación, autoridad

4. **Verificar estado del servidor:**
   - Confirmar que el servidor ya tiene toda la lógica necesaria en:
     - `server/game/managers/AISystem.js`
     - `server/game/systems/CurrencySystem.js`
     - `server/systems/FrontMovementSystemServer.js`
     - `server/systems/DroneSystemServer.js`
     - `server/systems/MedicalSystemServer.js`
     - `server/systems/AbandonmentSystem.js`








