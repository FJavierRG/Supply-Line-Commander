# 🤖 Sistema de Configuración Encapsulada de IA

## 📋 Objetivo

Crear un sistema de configuración que **encapsule completamente** el comportamiento de la IA por raza y dificultad, evitando que cambios en una raza afecten a otra.

## 🏗️ Arquitectura

### Estructura de Archivos

```
server/game/ai/config/
├── AIConfig.js          # Configuración global (intervalos base, debug)
├── RaceAIConfig.js      # Configuración por raza y dificultad (NUEVO)
└── ...
```

### Principios de Diseño

1. **Encapsulación por Raza**: Cada raza tiene su propia configuración completamente independiente
2. **Encapsulación por Dificultad**: Los multiplicadores de dificultad se aplican DESPUÉS de calcular scores base
3. **Modularidad**: Cambios en una raza NO afectan a otras
4. **Extensibilidad**: Fácil agregar nuevas razas o ajustar configuración existente

## 📊 Configuración por Raza

### Estructura de `RaceAIConfig.js`

Cada raza tiene:

```javascript
{
    buildingScores: {
        // Scores base y bonificaciones por edificio
        fob: {
            base: 40,
            bonuses: {
                hasLessThan2: 30,
                earlyPhase: 20
            }
        },
        // ...
    },
    
    attackScores: {
        // Scores base y bonificaciones por ataque
        drone: {
            base: 65,
            bonuses: {
                hasTargets: 40
            }
        },
        // ...
    },
    
    intervals: {
        // Intervalos específicos (null = usar por defecto)
        strategic: null,
        offensive: null,
        reaction: null
    },
    
    strategies: {
        // Estrategias específicas de la raza
        focusFOBs: true,
        focusEconomy: true,
        aggressiveness: 0.6
    },
    
    thresholds: {
        // Umbrales específicos
        fobSupply: 50,
        frontSupply: 70,
        currencyStrategic: 50
    }
}
```

### Razas Configuradas

#### A_Nation (Fuerzas Unificadas)
- **Estrategia**: Equilibrada, enfocada en FOBs y economía
- **Edificios**: FOBs, Truck Factory, Engineer Center, Nuclear Plant, Drone Launcher, Anti-Drone
- **Agresividad**: Media-alta (0.6)
- **Umbrales**: Estándar (50% FOBs, 70% frentes)

#### B_Nation (Fuerza de Asalto Directa)
- **Estrategia**: Agresiva, sin FOBs, enfocada en helicópteros y ataques
- **Edificios**: Intel Radio, Campaign Hospital, Aerial Base, Nuclear Plant, Drone Launcher, Anti-Drone
- **Agresividad**: Alta (0.8)
- **Umbrales**: Más agresivos (60% frentes, 40$ currency)
- **Intervalos**: Más rápidos (7s estratégico, 35s ofensivo)

## 🎚️ Configuración por Dificultad

### Multiplicadores

Los multiplicadores se aplican **DESPUÉS** de calcular scores base:

| Dificultad | Action Score | Currency Threshold | Reaction Speed | Interval Multiplier |
|------------|--------------|-------------------|----------------|---------------------|
| **Easy** | 0.7 | 1.3 | 0.5 | 1.2 |
| **Medium** | 1.0 | 1.0 | 1.0 | 1.0 |
| **Hard** | 1.3 | 0.7 | 2.0 | 0.8 |

### Ejemplo de Cálculo

**Score de FOB para A_Nation en fase early con dificultad Hard:**

1. Score base (raza): 40
2. Bonificación early: +20
3. Bonificación <2 FOBs: +30
4. **Total base**: 90
5. Multiplicador dificultad (hard): ×1.3
6. **Score final**: 117

## 🔧 Funciones de Utilidad

### `getRaceAIConfig(raceId)`
Obtiene configuración completa de una raza.

```javascript
const config = getRaceAIConfig('A_Nation');
```

### `getDifficultyMultipliers(difficulty)`
Obtiene multiplicadores de dificultad.

```javascript
const multipliers = getDifficultyMultipliers('hard');
```

### `getAdjustedInterval(intervalName, raceId, difficulty)`
Obtiene intervalo ajustado por raza y dificultad.

```javascript
const strategicInterval = getAdjustedInterval('strategic', 'B_Nation', 'hard');
// Retorna: 7.0 * 0.8 = 5.6 segundos
```

### `getAdjustedScore(actionType, actionName, raceId, difficulty, context)`
Obtiene score ajustado por raza y dificultad.

```javascript
const score = getAdjustedScore('building', 'fob', 'A_Nation', 'hard', {
    phase: 'early',
    myFOBs: 1
});
// Retorna: (40 + 20 + 30) * 1.3 = 117
```

### `getAdjustedThreshold(thresholdName, raceId, difficulty)`
Obtiene umbral ajustado por raza y dificultad.

```javascript
const threshold = getAdjustedThreshold('currencyStrategic', 'B_Nation', 'hard');
// Retorna: 40 * 0.7 = 28$
```

## 🔄 Migración de AISystem

### Antes (Hardcodeado)

```javascript
// Scores hardcodeados
if (this.canBuild('fob')) {
    actions.push({
        type: 'build',
        buildingType: 'fob',
        score: 40 + (state.myFOBs < 2 ? 30 : 0) + (state.phase === 'early' ? 20 : 0),
        cost: getCost('fob')
    });
}

// Intervalos hardcodeados
this.intervals = {
    strategic: 8.0,
    offensive: 40.0,
    // ...
};

// Umbrales hardcodeados
const threshold = 50 * this.difficultyMultipliers.currencyThreshold;
```

### Después (Encapsulado)

```javascript
// Obtener raza actual
const raceId = this.gameState.raceManager.getPlayerRace('player2');

// Scores encapsulados
if (this.canBuild('fob')) {
    const score = getAdjustedScore('building', 'fob', raceId, this.difficulty, {
        phase: state.phase,
        myFOBs: state.myFOBs
    });
    
    if (score !== null) {
        actions.push({
            type: 'build',
            buildingType: 'fob',
            score: score,
            cost: getCost('fob')
        });
    }
}

// Intervalos encapsulados
this.intervals = {
    strategic: getAdjustedInterval('strategic', raceId, this.difficulty),
    offensive: getAdjustedInterval('offensive', raceId, this.difficulty),
    // ...
};

// Umbrales encapsulados
const threshold = getAdjustedThreshold('currencyStrategic', raceId, this.difficulty);
```

## ✅ Beneficios

1. **Aislamiento**: Cambios en A_Nation NO afectan B_Nation
2. **Claridad**: Cada raza tiene su configuración visible y explícita
3. **Mantenibilidad**: Fácil ajustar balance por raza sin tocar código
4. **Extensibilidad**: Agregar nuevas razas es solo agregar una entrada en `RACE_AI_CONFIG`
5. **Testabilidad**: Puedes probar cada raza independientemente

## 📝 Próximos Pasos

1. ✅ Crear `RaceAIConfig.js` con estructura encapsulada
2. ⏳ Refactorizar `AISystem` para usar configuración encapsulada
3. ⏳ Actualizar `evaluateActions` para usar `getAdjustedScore`
4. ⏳ Actualizar intervalos para usar `getAdjustedInterval`
5. ⏳ Actualizar umbrales para usar `getAdjustedThreshold`
6. ⏳ Probar cada raza independientemente

---

**Última Actualización**: 2024








