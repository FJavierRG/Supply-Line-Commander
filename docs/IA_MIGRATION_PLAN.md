# Plan de Migración de IA al Servidor

## 📊 Estado Actual

### ✅ Lo que ya funciona en Servidor:
- ✅ GameStateManager con sistemas modulares
- ✅ BuildHandler, ConvoyHandler, CombatHandler
- ✅ CurrencySystem, ConstructionSystem, EffectsSystem
- ✅ MedicalSystem, FrontMovementSystem, TerritorySystem
- ✅ Detección de IA en room.aiPlayer

### ❌ Lo que falta:
- ❌ Sistema de IA en servidor (TODO está en src/)
- ❌ Integración de decisiones de IA en GameStateManager
- ❌ Mecanismo para que la IA "juegue" como player2

## 🎯 Objetivo

Migrar la IA completa del cliente (src/) al servidor usando el **sistema moderno** (AIDirector) en lugar del legacy (EnemyAISystem).

## 🏗️ Arquitectura Propuesta

```
server/
├── game/
│   ├── managers/
│   │   ├── AISystem.js              # 🆕 Sistema de IA (wrapper)
│   │   └── AIDecisionExecutor.js     # 🆕 Ejecutor de decisiones de IA
│   └── ai/                          # 🆕 Migrado de src/ai/
│       ├── AIDirector.js            # Coordinador
│       ├── core/
│       │   ├── StateAnalyzer.js
│       │   ├── ActionEvaluator.js
│       │   └── ThreatAnalyzer.js
│       └── config/
│           └── AIConfig.js
├── handlers/
│   └── AIActionHandler.js          # 🆕 Handler específico para acciones de IA
└── systems/
    └── [ya existen]
```

## 📋 Fases de Migración

### Fase 1: Preparación (30 min)
1. Copiar archivos de IA de src/ a server/
2. Ajustar imports (cambiar referencias de `game` a `gameState`)
3. Adaptar sistema de nodos (servidor usa estructura diferente)
4. Crear stub de integración con GameStateManager

### Fase 2: Adaptación (1h)
1. Crear `AISystem.js` (wrapper para AIDirector)
2. Adaptar StateAnalyzer para leer de GameStateManager
3. Adaptar ActionEvaluator para trabajar con handlers de servidor
4. Crear `AIActionHandler.js` para ejecutar decisiones

### Fase 3: Integración (1h)
1. Integrar AISystem en GameStateManager
2. Crear callback para que IA ejecute acciones
3. Conectar decisiones de IA con handlers existentes
4. Probar flujo completo

### Fase 4: Testing (30 min)
1. Pruebas de decisión de construcción (FOBs, edificios)
2. Pruebas de ataque (drones, snipers)
3. Pruebas de reacción (amenazas del jugador)
4. Ajustar parámetros de dificultad

## 🔧 Cambios Específicos Necesarios

### 1. Adaptar referencias a nodos

**ANTES (cliente):**
```javascript
// En src/
const nodes = this.game.nodes;
const hq = nodes.find(n => n.team === 'player2' && n.type === 'hq');
```

**DESPUÉS (servidor):**
```javascript
// En server/
const nodes = this.gameState.nodes;
const hq = nodes.find(n => n.team === 'player2' && n.type === 'hq');
```

### 2. Sistema de Currency

**ANTES (cliente):**
```javascript
this.currency += this.getCurrencyRate() * dt;
```

**DESPUÉS (servidor):**
```javascript
// Currency ya está centralizada en GameStateManager
const currency = this.gameState.currency.player2;
```

### 3. Ejecución de Acciones

**ANTES (cliente):**
```javascript
// En src/ - La IA creaba nodos directamente
const node = new VisualNode(x, y, 'fob', config);
this.game.nodes.push(node);
```

**DESPUÉS (servidor):**
```javascript
// En server/ - La IA usa handlers
await this.gameState.buildHandler.build({
    nodeType: 'fob',
    x: x,
    y: y,
    team: 'player2'
});
```

### 4. Sistema de Eventos

**ANTES (cliente):**
```javascript
this.game.aiDirector.onPlayerAction('drone', target);
```

**DESPUÉS (servidor):**
```javascript
// Los eventos vienen del servidor automáticamente
// La IA los lee del gameState
this.threatAnalyzer.detectThreats(this.gameState);
```

## 📝 Archivos a Crear

### 1. `server/game/managers/AISystem.js`
```javascript
// Wrapper que integra AIDirector con GameStateManager
export class AISystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.aiDirector = new AIDirector(gameState); // Adaptado
    }
    
    update(dt) {
        if (!this.shouldActivate()) return;
        this.aiDirector.update(dt);
    }
    
    shouldActivate() {
        return this.gameState.room?.aiPlayer !== undefined;
    }
}
```

### 2. `server/game/handlers/AIActionHandler.js`
```javascript
// Handler específico para ejecutar decisiones de IA
export class AIActionHandler {
    constructor(gameState) {
        this.gameState = gameState;
        this.buildHandler = gameState.buildHandler;
        // etc.
    }
    
    async executeAction(action) {
        switch(action.type) {
            case 'build':
                return await this.buildHandler.build(action);
            case 'attack':
                return await this.combatHandler.attack(action);
            // etc.
        }
    }
}
```

## ✅ Checklist de Migración

- [ ] Copiar archivos de IA a server/
- [ ] Adaptar imports y referencias
- [ ] Crear AISystem.js
- [ ] Crear AIActionHandler.js
- [ ] Integrar en GameStateManager
- [ ] Adaptar StateAnalyzer
- [ ] Adaptar ActionEvaluator
- [ ] Adaptar ThreatAnalyzer
- [ ] Probar construcción de edificios
- [ ] Probar lanzamiento de drones
- [ ] Probar reacciones a amenazas
- [ ] Ajustar dificultad
- [ ] Documentar cambios

## 🚀 Siguiente Paso

**Iniciar Fase 1**: Copiar y adaptar los archivos base de IA.

¿Quieres que empiece con la Fase 1?







