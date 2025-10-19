# 📝 CHANGELOG - FASE 0: Refactorización PvP

**Fecha:** 2025-10-16  
**Versión:** 2.0 (PvP-Ready)  
**Estado:** ✅ Completada

---

## 🎯 Resumen de Cambios

La Fase 0 eliminó el hardcoding de tipos `enemy_*` y preparó el código para soportar multijugador 1v1.

---

## 🔄 Cambios Principales

### **1. Sistema Unificado de Nodos**

**ANTES (v1.0):**
```javascript
// Tipos duplicados
type: 'hq' | 'enemy_hq'
type: 'fob' | 'enemy_fob'  
type: 'front' | 'enemy_front'
category: 'enemy'
```

**DESPUÉS (v2.0):**
```javascript
// Tipos unificados
type: 'hq' | 'fob' | 'front'
team: 'ally' | 'player2'
// Ya no existe category: 'enemy'
```

---

### **2. Configuración (nodes.js)**

- ❌ Eliminados nodos: `enemy_hq`, `enemy_fob`, `enemy_front`
- ✅ Nodos base ahora sirven para ambos equipos
- ✅ Diferenciación por campo `team`

---

### **3. Rutas Unificadas (constants.js)**

**ANTES:**
```javascript
VALID_ROUTES = {
    'hq': ['fob'],
    'enemy_hq': ['enemy_fob'],
    'enemy_fob': ['enemy_front', 'enemy_fob']
}
```

**DESPUÉS:**
```javascript
VALID_ROUTES = {
    'hq': ['fob'],
    'fob': ['front', 'fob'],
    'front': []
}
```

---

### **4. Sprites Dinámicos**

**AssetManager.getBaseSprite():**
- Nuevo parámetro: `team`
- Retorna sprites `base-enemy-*` para `team === 'player2'`
- Sprites enemigos mantenidos pero usados dinámicamente

**MapNode constructor:**
- Ajusta `spriteKey` automáticamente según team
- HQ enemigo recibe `shadowColor` rojo

---

### **5. Validaciones por Team**

**ConvoyManager.createRoute():**
```javascript
// Validación añadida
if (from.team !== to.team) {
    return; // No se puede enviar a enemigos
}
```

**TerritorySystem:**
- Fronteras separadas por team
- Aliada: `team === 'ally'`
- Enemiga: `team === 'player2'`

---

## 📂 Archivos Modificados (~35 total)

### **Configuración:**
- `src/config/nodes.js`
- `src/config/constants.js`

### **Entidades:**
- `src/entities/MapNode.js`
- `src/factories/BaseFactory.js`

### **Core:**
- `src/missions/Mission.js`
- `src/systems/ConvoyManager.js`
- `src/systems/InputHandler.js`
- `src/systems/RenderSystem.js`
- `src/systems/AssetManager.js`

### **Sistemas (11):**
- FrontMovementSystem, TerritorySystem, BuildingSystem
- MedicalEmergencySystem, UIManager, DroneSystem
- AntiDroneSystem, TutorialConfig, TutorialManager

### **IA (6):**
- `src/systems/EnemyAISystem.js`
- `src/ai/AIDirector.js`
- `src/ai/core/StateAnalyzer.js`
- `src/ai/core/ThreatAnalyzer.js`
- `src/ai/core/ActionEvaluator.js`
- `src/ai/config/AIConfig.js`

### **Otros:**
- `src/Game.js`

---

## 🐛 Bugs Encontrados Durante Testing

### **Bug 1: TerritorySystem - Fronteras Mezcladas**
**Problema:** `initializeAllyFrontier()` incluía frentes enemigos  
**Fix:** Añadido filtro `&& b.team === 'ally'`

### **Bug 2: MapNode - Sprites Incorrectos**
**Problema:** FOBs enemigos usaban sprites azules  
**Fix:** Validación por `type` en lugar de solo `category`

### **Bug 3: ConvoyManager - Rutas Inválidas**
**Problema:** Permitía enviar camiones a nodos enemigos  
**Fix:** Validación `from.team !== to.team` en `createRoute()`

---

## ✅ Resultado Final

- ✅ 0 referencias a tipos `enemy_hq`, `enemy_fob`, `enemy_front`
- ✅ Código unificado con diferenciación por `team`
- ✅ Singleplayer vs IA completamente funcional
- ✅ 0 regresiones
- ✅ Base sólida para multijugador PvP

---

## 🚀 Próximos Pasos

**FASE 1: Backend y Sincronización Básica**
- Servidor Node.js + Socket.IO
- Sistema de lobby 2 jugadores
- Sincronización de estado básica
- Acciones de construcción y convoyes

Ver `.roadfaz` para roadmap completo.

---

**Última actualización:** 2025-10-16

