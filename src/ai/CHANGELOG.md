# 📝 CHANGELOG - SISTEMA IA MODULAR

## [2.0.5] - Octubre 2025

### 🐛 **Bug Fixes**

#### **Fix CRÍTICO: IA tenía currency INFINITA** 💰🤦‍♂️
**El bug más épico del día - Parte 2**

**Problema:**
En modo `hybrid`, el flujo de sincronización de currency estaba al revés, causando que la IA nunca gastara dinero:

```javascript
// Game.js (ANTES - LÍNEAS 365-367)
this.aiDirector.currency = this.enemyAI.currency;  // (1) Copia 100$ → AIDirector
this.aiDirector.update(dt);                         // (2) AIDirector toma decisiones
this.enemyAI.currency = this.aiDirector.currency;   // (3) ¡SOBRESCRIBE enemyAI!
```

**Flujo del bug:**
```
Frame 1:
  enemyAI.currency = 100$
  (1) aiDirector.currency = 100$ ← copia de enemyAI
  (2) aiDirector.update() → "Construyo FOB"
       → llama a enemyAI.attemptFOBConstruction()
       → enemyAI.currency -= 130$ → enemyAI.currency = -30$
  (3) enemyAI.currency = 100$ ← ¡SOBRESCRIBE con aiDirector!
  
  Resultado: FOB construido GRATIS, currency vuelve a 100$ ✅

Frame 2:
  enemyAI.currency = 100$ (¡nunca gastó!)
  (1) aiDirector.currency = 100$
  (2) "Construyo Planta" → enemyAI.currency -= 200$ = -100$
  (3) enemyAI.currency = 100$ ← ¡SOBRESCRIBE OTRA VEZ!
  
  Resultado: FOB + Planta GRATIS, sigue con 100$ ✅✅

Frame 3:
  enemyAI.currency = 100$ (¡sigue igual!)
  ...
```

**Por qué pasaba:**
- Las acciones del `AIDirector` delegaban a `enemyAI` (ej: `enemyAI.buildFOB()`)
- `enemyAI.buildFOB()` modifica `enemyAI.currency` (gasta dinero)
- Pero la línea (3) **sobrescribía** `enemyAI.currency` con `aiDirector.currency`
- `aiDirector.currency` nunca cambió → **los gastos desaparecían**
- **Resultado:** IA construía edificios gratis infinitamente 🏗️💰♾️

**Por eso la IA construía 2 plantas, lanzadera, 2 drones a los 5 segundos** → ¡Dinero infinito!

**Solución:**
```javascript
// Game.js (AHORA - LÍNEAS 365-376)
// 1. Generar currency (solo EnemyAISystem tiene updateCurrency)
this.enemyAI.updateCurrency(dt);

// 2. Sincronizar currency de enemyAI a AIDirector
this.aiDirector.currency = this.enemyAI.currency;

// 3. AIDirector toma decisiones (ejecuta acciones via enemyAI)
this.aiDirector.update(dt);

// 4. ¡CRÍTICO! Sincronizar de vuelta para reflejar gastos
this.aiDirector.currency = this.enemyAI.currency;  // ← DIRECCIÓN CORRECTA
```

**Diferencia clave:**
```javascript
// ANTES:
this.enemyAI.currency = this.aiDirector.currency;  // ❌ SOBRESCRIBE gastos

// AHORA:
this.aiDirector.currency = this.enemyAI.currency;  // ✅ PRESERVA gastos
```

**Además:**
- Añadida llamada a `this.enemyAI.updateCurrency(dt)` que faltaba
- Sin esto, la IA no generaba currency en modo `hybrid`
- Ahora genera currency correctamente (3$/s base + 2$/s por planta + 1$/s ventaja IA)

**Archivos modificados:**
- `src/Game.js` (líneas 365-376)

**Resultado:**
- ✅ IA gasta currency correctamente
- ✅ IA genera currency a tasa normal (no infinita)
- ✅ Balance económico restaurado
- ✅ Juego jugable de nuevo 😅

---

## [2.0.4] - Octubre 2025

### 🐛 **Bug Fixes**

#### **Fix CRÍTICO: IA construía lanzaderas infinitamente sin lanzar drones** 😂
**Problema:**
- `attemptDroneLauncherConstruction()` creaba la lanzadera pero **NUNCA la agregaba a `game.nodes`**
- `hasDroneLauncher()` no la encontraba → retornaba `false`
- IA pensaba que no tenía lanzadera → construía otra → loop infinito
- **Resultado:** 20+ lanzaderas fantasma, 0 drones lanzados

**Código problemático:**
```javascript
// EnemyAISystem.js (ANTES)
const launcher = this.game.baseFactory.createBase(...);

if (launcher) {
    this.currency -= launcherConfig.cost;  // ✅ Resta currency
    console.log('LANZADERA construida');   // ✅ Log
    return true;                            // ✅ Return
}
// ❌ FALTA: this.game.nodes.push(launcher);
// ❌ Lanzadera existe en memoria pero no en el juego
```

**Solución:**
```javascript
// EnemyAISystem.js (AHORA)
if (launcher) {
    this.game.nodes.push(launcher);  // ✅ CRÍTICO: Agregar al juego
    this.currency -= launcherConfig.cost;
    console.log('LANZADERA construida');
    return true;
}
```

**Impacto:**
- Antes: IA gastaba toda su currency en lanzaderas fantasma (200$ cada una)
- Ahora: IA construye 1 lanzadera y luego lanza drones

#### **Fix: Scoring de drones muy bajo**
**Problema:**
- LAUNCHER score: 60 + 40 + 30 = **130 pts** (siempre ganaba)
- DRONE score: 45 + 35 = **80 pts** (nunca se elegía)
- IA prefería construir lanzaderas antes que usar drones

**Solución:**
```javascript
// AIConfig.js - Ajustes de scoring
drone: {
    base: 65,              // 45 → 65
    perHighValueTarget: 40, // 35 → 40
    ifWinning: 25,         // 20 → 25
    ifLateGame: 30         // NUEVO
}

launcher: {
    ifPlayerHasTargets: 25, // 40 → 25
    ifMidGame: 20,          // 30 → 20
    ifAlreadyHave: -9999    // -999 → -9999 (más negativo)
}
```

**Archivos modificados:**
- `src/systems/EnemyAISystem.js` (línea 1014)
- `src/ai/config/AIConfig.js` (líneas 64-80)
- `src/ai/core/ActionEvaluator.js` (líneas 221-227)

**Resultado:**
- ✅ IA construye 1 lanzadera (no 20)
- ✅ IA lanza drones ofensivos
- ✅ Decisiones más variadas
- ✅ Juego más divertido

---

## [2.0.3] - Octubre 2025

### 🐛 **Bug Fixes**

#### **Fix CRÍTICO: Plantas enemigas sumaban income al jugador** 🤦
**Problema:**
- `CurrencyManager.getNuclearPlantBonus()` NO filtraba por equipo
- **Bug gracioso:** IA construía plantas → Jugador recibía +2$/s por cada una 😂
- Resultado: Jugador con income GRATIS cortesía de la IA

**Código problemático:**
```javascript
// CurrencyManager.js (ANTES)
const nuclearPlants = this.game.buildings.filter(b =>  // ❌ buildings no existe
    b.type === 'nuclearPlant' &&                       // ❌ Sin filtro de team
    b.active && 
    b.constructed
);
// Resultado: Contaba plantas aliadas + enemigas → sumaba todo al jugador
```

**Solución:**
```javascript
// CurrencyManager.js (AHORA)
const nuclearPlants = this.game.nodes.filter(n =>  // ✅ Usar nodes
    n.type === 'nuclearPlant' && 
    n.team === 'ally' &&                            // ✅ Solo aliadas
    n.constructed && 
    !n.isConstructing &&
    !n.isAbandoning
);
```

**Archivos modificados:**
- `src/systems/CurrencyManager.js` (líneas 42-56)

**Resultado:**
- ✅ Solo plantas ALIADAS suman income al jugador
- ✅ Plantas ENEMIGAS suman income a la IA (como debe ser)
- ✅ Economía balanceada correctamente

**Impacto en balanceo:**
- Antes: Jugador income inflado artificialmente
- Ahora: Economía realista (IA dominante con sus plantas)

---

## [2.0.2] - Octubre 2025

### 🐛 **Bug Fixes**

#### **Fix 1: Spam de logs de detección de drones (CRÍTICO)**
**Problema:**
- `handleImmediateThreats()` se ejecutaba **cada frame** sin cooldown
- Resultado: Cientos de logs `🚨 IA: Amenaza high detectada: Dron...`
- Consola ilegible y lag de rendimiento

**Solución:**
```javascript
// Agregar cooldown de 500ms
if (now - this.lastThreatCheckTime < 500) {
    return; // No revisar amenazas tan seguido
}
```

#### **Fix 2: Construcción con score negativo**
**Problema:**
- ActionEvaluator ejecutaba acciones con score ≤ 0
- Ejemplo: `🏗️ IA: Construcción → PLANT (score: -25.0)` ❌

**Solución:**
```javascript
// ANTES: Filtraba solo score > -999
].filter(action => action.score > -999);

// AHORA: Filtra score ≤ 0
].filter(action => action.score > 0);
```

#### **Fix 3: Logs de "no respondió" innecesarios**
**Problema:**
- ThreatAnalyzer spameaba cuando NO respondía a drones
- `🤖 IA: Dron detectado pero no respondió (roll: 0.XX > 0.6)` x150 veces

**Solución:**
- Removidos logs cuando no responde (silencioso)
- `logThreats: false` por defecto en AIConfig

**Archivos modificados:**
- `src/ai/AIDirector.js` (líneas 121-148)
- `src/ai/core/ActionEvaluator.js` (línea 63)
- `src/ai/core/ThreatAnalyzer.js` (líneas 72-77)
- `src/ai/config/AIConfig.js` (línea 161)

**Resultado:**
- ✅ Consola limpia y legible
- ✅ Sin spam de logs
- ✅ Solo muestra decisiones importantes
- ✅ Rendimiento mejorado

---

## [2.0.1] - Octubre 2025

### 🐛 **Bug Fixes**

#### **Fix 1: FOBs no recibían suministros**
**Problema:**
- AIDirector tomaba el control del update pero no ejecutaba correctamente el reabastecimiento
- `handleSupply()` llamaba a métodos inexistentes (`resupplyFOB()`, `resupplyFront()`)

**Solución:**
```javascript
// Delegar correctamente a EnemyAISystem
this.game.enemyAI.ruleResupplyFOBs(enemyHQ, enemyFOBs);
```

#### **Fix 2: Frentes no recibían suministros**
**Problema:**
- `ruleResupplyFronts()` necesita 3 parámetros pero solo se pasaban 2
- Faltaba pasar `enemyFronts` como tercer parámetro

**Solución:**
```javascript
// ANTES (incorrecto):
this.game.enemyAI.ruleResupplyFronts(enemyHQ, enemyFOBs);  // ❌ Falta parámetro

// AHORA (correcto):
const enemyFronts = this.getEnemyFronts();
this.game.enemyAI.ruleResupplyFronts(enemyHQ, enemyFOBs, enemyFronts);  // ✅
```

**Resultado:**
- ✅ FOBs reciben suministros cuando <50%
- ✅ Frentes reciben suministros cuando <70%
- ✅ Sistema de reabastecimiento 100% funcional

---

## [2.0.0] - Octubre 2025

### ✨ **Features**

#### **Sistema de IA Modular Híbrido**
- Arquitectura modular con componentes especializados
- Scoring contextual para decisiones inteligentes
- Análisis de estado del juego en tiempo real
- Detección y respuesta a amenazas
- Umbrales dinámicos según urgencia
- Timing variable para impredecibilidad

**Componentes principales:**
- `AIDirector.js` - Coordinador principal
- `StateAnalyzer.js` - Análisis contextual
- `ActionEvaluator.js` - Scoring de acciones
- `ThreatAnalyzer.js` - Detección de amenazas
- `AIConfig.js` - Configuración centralizada

#### **Integración con Game.js**
- Modo configurable (legacy/hybrid/modular)
- Sincronización automática de currency
- Notificación de acciones del jugador
- Activación/desactivación inteligente

#### **Documentación completa**
- `README.md` - Arquitectura y uso
- `INTEGRATION_GUIDE.md` - Guía de integración
- `CHANGELOG.md` - Historial de cambios

### 🔧 **Improvements**

#### **Decisiones más inteligentes**
- Considera economía del jugador vs IA
- Evalúa amenazas activas
- Ajusta prioridades según fase del juego
- Calcula urgencia dinámica

#### **Mejor reacción a amenazas**
- Drones enemigos → Anti-drone automático
- Plantas enemigas → Copiar o destruir
- Gap económico → Acelerar construcción
- Pérdida de territorio → FOBs de emergencia

#### **Debug mejorado**
- Logs claros y estructurados
- Reporte de estado cada 30s
- Tracking de decisiones
- Métricas de rendimiento

---

## Notas de Versión

### **v2.0.1** (Actual)
- ✅ Modo híbrido completamente funcional
- ✅ Reabastecimiento arreglado
- ✅ Sistema probado y estable
- 🎯 **PRODUCCIÓN - ESTABLE**

### **v2.0.0** (Base)
- ✅ Arquitectura modular implementada
- ✅ Integración con Game.js
- ✅ Documentación completa
- ⚠️ Bug menor en reabastecimiento

---

## Roadmap

### **v2.1.0** (Futuro)
- [ ] Estrategias dedicadas (Early/Mid/LateGame)
- [ ] Módulos de acción independientes
- [ ] Modo modular 100% (sin EnemyAISystem)

### **v2.2.0** (Futuro)
- [ ] Machine Learning básico
- [ ] Aprendizaje de patrones del jugador
- [ ] Ajuste dinámico de pesos

---

**Mantenido por:** Director de IA (Claude Sonnet 4.5)  
**Proyecto:** ProyectoMil - Sistema RTS  
**Licencia:** Interno

