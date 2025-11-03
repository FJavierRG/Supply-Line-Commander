# 🚁 Velocidad del Helicóptero - Análisis de Ubicaciones

## 📍 Ubicaciones Encontradas

### 1. **✅ CORRECTO: server/config/gameConfig.js** (Línea 45)
```javascript
helicopter: {
    speed: 1200  // Velocidad real del helicóptero (px/s)
}
```
**Uso**: `HelicopterManager.js` usa `heliConfig.speed` (1200px/s) - **ESTA ES LA AUTORITATIVA**

### 2. **⚠️ CONFUSO: server/config/gameConfig.js** (Línea 127)
```javascript
convoy: {
    vehicleSpeeds: {
        helicopter: 80  // Para convoyes tradicionales (no usado para helicópteros persistentes)
    }
}
```
**Uso**: Solo para convoyes tradicionales, NO para helicópteros persistentes

### 3. **❌ OBSOLETO: src/Game.js** (Línea 369)
```javascript
const speed = 150;  // Hardcoded para singleplayer (obsoleto)
```
**Problema**: Solo para singleplayer legacy, debería eliminarse o usar configuración del servidor

### 4. **⚠️ LEGACY: src/entities/Convoy.js** (Línea 78)
```javascript
getVehicleSpeed() {
    helicopter: 1200  // Para convoyes tipo helicóptero (no usado actualmente)
}
```
**Uso**: Solo para convoyes que usan vehicleType='helicopter' (no helicópteros persistentes)

---

## 🎯 Problemas Identificados

1. **Velocidad inconsistente**: 150px/s vs 1200px/s vs 80px/s
2. **Código legacy**: `src/Game.js` tiene velocidad hardcoded (150px/s) para singleplayer
3. **Confusión**: `convoy.vehicleSpeeds.helicopter` (80px/s) no se usa para helicópteros persistentes

---

## ✅ Solución Recomendada

**Fuente única de verdad**: `server/config/gameConfig.js` → `vehicles.helicopter.speed = 1200`

**Acciones**:
1. ✅ Eliminar velocidad hardcoded en `src/Game.js` (singleplayer obsoleto)
2. ✅ Clarificar que `convoy.vehicleSpeeds.helicopter` es solo para convoyes tradicionales
3. ✅ Usar siempre `GAME_CONFIG.vehicles.helicopter.speed` en el servidor
4. ✅ El cliente NO necesita conocer la velocidad (usa interpolación)

---

**Última Actualización**: 2024






