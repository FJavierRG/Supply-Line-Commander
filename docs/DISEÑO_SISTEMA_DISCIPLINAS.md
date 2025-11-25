# Sistema de Disciplinas - Documento de Diseño

## 📋 Índice
1. [Concepto General](#concepto-general)
2. [Especificaciones Técnicas](#especificaciones-técnicas)
3. [Arquitectura de Implementación](#arquitectura-de-implementación)
4. [Integración con Sistemas Existentes](#integración-con-sistemas-existentes)
5. [Configuración y Datos](#configuración-y-datos)
6. [UI/UX](#uiux)
7. [Ejemplos de Disciplinas](#ejemplos-de-disciplinas)
8. [Checklist de Implementación](#checklist-de-implementación)

---

## Concepto General

### ¿Qué son las Disciplinas?

Las **Disciplinas** son cartas especiales que definen el modo de juego durante un tiempo determinado. Son una capa estratégica adicional que permite a los jugadores modificar temporalmente las reglas del juego a su favor.

**Analogías:**
- **Magic: The Gathering** → Planeswalkers (habilidades pasivas poderosas)
- **Europa Universalis IV** → Ideas Nacionales (modificadores globales)
- **Hearthstone** → Hero Powers (pero temporales y más poderosos)

### Características Principales

| Característica | Descripción |
|---------------|-------------|
| **Slots en Mazo** | 2 disciplinas por mazo (slots dedicados) |
| **Límite de Puntos** | ❌ NO cuentan para el límite de puntos del mazo |
| **Activación** | Manual, requiere click del jugador |
| **Duración** | Variable según disciplina (ej: 90-180 segundos) |
| **Cooldown** | Compartido entre ambas disciplinas |
| **Intercambio** | ❌ NO se pueden cambiar con banquillo mid-game |
| **Coste** | Gratis al activar (no consume currency) |
| **Efectos** | Modificadores globales con trade-offs |

### Flujo de Juego

```
ANTES DE LA PARTIDA:
┌─────────────────────────────────────┐
│ Jugador selecciona 2 disciplinas   │
│ en el Arsenal (slots dedicados)    │
└─────────────────────────────────────┘
                 ↓
        DURANTE LA PARTIDA:
┌─────────────────────────────────────┐
│ 1. Jugador activa Disciplina A     │
│ 2. Efectos se aplican por N mins   │
│ 3. Disciplina termina → Cooldown   │
│ 4. Tras cooldown: puede activar    │
│    A o B (la que quiera)            │
└─────────────────────────────────────┘
```

### Reglas Clave

2. **No Intercambiables**: Una vez en partida, las 2 disciplinas son fijas (no puedes traer del banquillo)
3. **Sin Coste**: Activar disciplinas es gratis (no consume currency)
4. **Trade-offs**: Todas las disciplinas tienen ventaja + desventaja para mantener balance
5. **Una a la vez**: Solo 1 disciplina puede estar activa simultáneamente

---

## Especificaciones Técnicas

### Parámetros de una Disciplina

```javascript
{
    id: string,              // Identificador único
    name: string,            // Nombre para mostrar
    description: string,     // Descripción de efectos
    icon: string,            // Path al icono
    cost: number,            // 0 (no consume currency al activar)
    duration: number,        // Duración en segundos
    cooldown: number,        // Cooldown en segundos tras terminar
    enabled: boolean,        // Para habilitar/deshabilitar disciplinas
    
    // Efectos organizados por sistema afectado
    effects: {
        [systemName]: {
            [parameter]: value
        }
    }
}
```

### Estado del Jugador (Runtime)

```javascript
playerDisciplines: {
    player1: {
        equipped: [string, string],  // 2 IDs de disciplinas del mazo
        active: string | null,       // ID de disciplina activa (o null)
        activeStartTime: number,     // Timestamp de activación
        activeDuration: number,      // Duración total
        cooldownUntil: number        // Timestamp cuando termina cooldown
    },
    player2: { /* ... */ }
}
```

### Sistemas Modificables

| Sistema | Parámetros Modificables | Ejemplos |
|---------|------------------------|----------|
| `economy` | `passiveRateMultiplier`, `allowNegativeCurrency`, `minCurrency` | Economía de deuda, Industrialización |
| `frontMovement` | `advanceSpeedMultiplier`, `retreatSpeedMultiplier`, `supplyConsumptionMultiplier` | Blitzkrieg, Guerra de Posiciones |
| `convoy` | `speedMultiplier`, `capacityMultiplier`, `penaltyResistance` | Logística Avanzada, Ruta de Suministros |
| `buildings` | `costMultiplier`, `buildTimeMultiplier`, `effectMultiplier` | Industrialización, Economía de Guerra |
| `territory` | `abandonmentTimeMultiplier`, `gracePeriodMultiplier` | Defensa Total, Territorio Contestado |
| `combat` | `damageMultiplier`, `costMultiplier`, `speedMultiplier` | Superioridad Aérea, Artillería Pesada |

---

## Arquitectura de Implementación

### 1. Archivo de Configuración

**Ubicación:** `server/config/disciplines.js`

```javascript
// ===== CONFIGURACIÓN DE DISCIPLINAS =====
// Define todas las disciplinas disponibles en el juego

export const DISCIPLINES = {
    'debt_economy': {
        id: 'debt_economy',
        name: 'Economía de Deuda',
        description: 'Permite entrar en números rojos hasta -150. Los frentes consumen +15% suministros',
        icon: 'debt_economy_icon.png',
        cost: 0,
        duration: 120, // 2 minutos
        cooldown: 30,  // 30 segundos
        enabled: true,
        
        effects: {
            economy: {
                allowNegativeCurrency: true,
                minCurrency: -150
            },
            frontMovement: {
                supplyConsumptionMultiplier: 1.15 // +15%
            }
        }
    },
    
    'blitzkrieg': {
        id: 'blitzkrieg',
        name: 'Blitzkrieg',
        description: 'Los frentes avanzan +50% más rápido. Los camiones son -30% más lentos',
        icon: 'blitzkrieg_icon.png',
        cost: 0,
        duration: 90,
        cooldown: 45,
        enabled: true,
        
        effects: {
            frontMovement: {
                advanceSpeedMultiplier: 1.5 // +50%
            },
            convoy: {
                speedMultiplier: 0.7 // -30%
            }
        }
    },
    
    // ... más disciplinas
};

// Helper para obtener una disciplina por ID
export function getDiscipline(disciplineId) {
    return DISCIPLINES[disciplineId] || null;
}

// Helper para obtener todas las disciplinas habilitadas
export function getEnabledDisciplines() {
    return Object.values(DISCIPLINES).filter(d => d.enabled !== false);
}

// Validar que exista una disciplina
export function disciplineExists(disciplineId) {
    return DISCIPLINES.hasOwnProperty(disciplineId);
}
```

### 2. Manager de Disciplinas (Servidor)

**Ubicación:** `server/game/managers/DisciplineManager.js`

```javascript
// ===== GESTOR DE DISCIPLINAS (SERVIDOR) =====
import { getDiscipline, disciplineExists } from '../../config/disciplines.js';

export class DisciplineManager {
    constructor(gameId) {
        this.gameId = gameId;
        
        // Estado de disciplinas por jugador
        this.playerDisciplines = {
            player1: {
                equipped: [],        // [disciplineId1, disciplineId2]
                active: null,        // ID de disciplina activa o null
                activeStartTime: 0,  // Timestamp
                activeDuration: 0,   // Duración en segundos
                cooldownUntil: 0     // Timestamp cuando termina cooldown
            },
            player2: {
                equipped: [],
                active: null,
                activeStartTime: 0,
                activeDuration: 0,
                cooldownUntil: 0
            }
        };
    }
    
    /**
     * Establece las disciplinas equipadas de un jugador (al inicio de partida)
     * @param {string} playerId - 'player1' o 'player2'
     * @param {Array<string>} disciplines - Array de 2 IDs de disciplinas
     */
    setEquippedDisciplines(playerId, disciplines) {
        if (!disciplines || disciplines.length !== 2) {
            console.error(`❌ El jugador ${playerId} debe tener exactamente 2 disciplinas`);
            return false;
        }
        
        // Validar que existan
        for (const disciplineId of disciplines) {
            if (!disciplineExists(disciplineId)) {
                console.error(`❌ Disciplina inválida: ${disciplineId}`);
                return false;
            }
        }
        
        // Validar que no haya duplicados
        if (disciplines[0] === disciplines[1]) {
            console.error(`❌ No puede haber disciplinas duplicadas`);
            return false;
        }
        
        this.playerDisciplines[playerId].equipped = [...disciplines];
        console.log(`✅ ${playerId} equipó disciplinas: ${disciplines.join(', ')}`);
        return true;
    }
    
    /**
     * Activa una disciplina para un jugador
     * @param {string} playerId - 'player1' o 'player2'
     * @param {string} disciplineId - ID de la disciplina a activar
     * @param {number} currentTime - Timestamp actual del servidor
     * @returns {boolean} - true si se activó correctamente
     */
    activateDiscipline(playerId, disciplineId, currentTime) {
        const playerState = this.playerDisciplines[playerId];
        
        // Validar que la disciplina esté equipada
        if (!playerState.equipped.includes(disciplineId)) {
            console.error(`❌ ${playerId} intentó activar disciplina no equipada: ${disciplineId}`);
            return false;
        }
        
        // Validar que no haya otra disciplina activa
        if (playerState.active !== null) {
            console.error(`❌ ${playerId} ya tiene una disciplina activa: ${playerState.active}`);
            return false;
        }
        
        // Validar cooldown
        if (currentTime < playerState.cooldownUntil) {
            const remaining = Math.ceil((playerState.cooldownUntil - currentTime) / 1000);
            console.error(`❌ ${playerId} está en cooldown (${remaining}s restantes)`);
            return false;
        }
        
        // Obtener configuración de la disciplina
        const discipline = getDiscipline(disciplineId);
        if (!discipline || discipline.enabled === false) {
            console.error(`❌ Disciplina deshabilitada o no existe: ${disciplineId}`);
            return false;
        }
        
        // Activar disciplina
        playerState.active = disciplineId;
        playerState.activeStartTime = currentTime;
        playerState.activeDuration = discipline.duration * 1000; // Convertir a ms
        
        console.log(`✅ ${playerId} activó disciplina: ${disciplineId} (${discipline.duration}s)`);
        return true;
    }
    
    /**
     * Actualiza el estado de las disciplinas (tick del servidor)
     * @param {number} currentTime - Timestamp actual del servidor
     */
    update(currentTime) {
        for (const playerId in this.playerDisciplines) {
            const playerState = this.playerDisciplines[playerId];
            
            // Si hay disciplina activa, verificar si terminó
            if (playerState.active !== null) {
                const endTime = playerState.activeStartTime + playerState.activeDuration;
                
                if (currentTime >= endTime) {
                    // Disciplina terminó
                    const disciplineId = playerState.active;
                    const discipline = getDiscipline(disciplineId);
                    
                    console.log(`⏱️ ${playerId} terminó disciplina: ${disciplineId}`);
                    
                    // Establecer cooldown
                    playerState.cooldownUntil = currentTime + (discipline.cooldown * 1000);
                    
                    // Desactivar
                    playerState.active = null;
                    playerState.activeStartTime = 0;
                    playerState.activeDuration = 0;
                }
            }
        }
    }
    
    /**
     * Obtiene los modificadores activos para un sistema específico
     * @param {string} playerId - 'player1' o 'player2'
     * @param {string} systemName - Nombre del sistema (ej: 'economy', 'frontMovement')
     * @returns {Object} - Objeto con modificadores o {}
     */
    getModifiersForSystem(playerId, systemName) {
        const playerState = this.playerDisciplines[playerId];
        
        // Si no hay disciplina activa, retornar vacío
        if (playerState.active === null) {
            return {};
        }
        
        // Obtener configuración de la disciplina activa
        const discipline = getDiscipline(playerState.active);
        if (!discipline || !discipline.effects) {
            return {};
        }
        
        // Retornar modificadores para el sistema solicitado
        return discipline.effects[systemName] || {};
    }
    
    /**
     * Obtiene el estado completo de un jugador (para enviar al cliente)
     * @param {string} playerId - 'player1' o 'player2'
     * @param {number} currentTime - Timestamp actual
     * @returns {Object} - Estado serializable
     */
    getPlayerState(playerId, currentTime) {
        const state = this.playerDisciplines[playerId];
        
        return {
            equipped: [...state.equipped],
            active: state.active,
            timeRemaining: state.active !== null 
                ? Math.max(0, (state.activeStartTime + state.activeDuration - currentTime) / 1000)
                : 0,
            cooldownRemaining: Math.max(0, (state.cooldownUntil - currentTime) / 1000)
        };
    }
    
    /**
     * Verifica si un jugador puede activar una disciplina específica
     * @param {string} playerId - 'player1' o 'player2'
     * @param {string} disciplineId - ID de la disciplina
     * @param {number} currentTime - Timestamp actual
     * @returns {Object} - { canActivate: boolean, reason: string }
     */
    canActivate(playerId, disciplineId, currentTime) {
        const playerState = this.playerDisciplines[playerId];
        
        if (!playerState.equipped.includes(disciplineId)) {
            return { canActivate: false, reason: 'Disciplina no equipada' };
        }
        
        if (playerState.active !== null) {
            return { canActivate: false, reason: 'Ya hay una disciplina activa' };
        }
        
        if (currentTime < playerState.cooldownUntil) {
            const remaining = Math.ceil((playerState.cooldownUntil - currentTime) / 1000);
            return { canActivate: false, reason: `Cooldown: ${remaining}s` };
        }
        
        const discipline = getDiscipline(disciplineId);
        if (!discipline || discipline.enabled === false) {
            return { canActivate: false, reason: 'Disciplina deshabilitada' };
        }
        
        return { canActivate: true, reason: '' };
    }
}
```

### 3. Integración con GameConfig

**Ubicación:** `server/config/gameConfig.js`

Añadir sección de disciplinas:

```javascript
export const GAME_CONFIG = {
    // ... configuraciones existentes ...
    
    // ═══════════════════════════════════════════════════════════════
    // DISCIPLINAS
    // ═══════════════════════════════════════════════════════════════
    disciplines: {
        maxEquipped: 2,      // Máximo de disciplinas por mazo
        activationCost: 0    // Coste para activar (0 = gratis)
    }
};
```

### 4. Validación en DeckManager

**Ubicación:** `src/systems/DeckManager.js`

Añadir validación de disciplinas:

```javascript
validateDeck(deck) {
    const errors = [];
    
    // ... validaciones existentes ...
    
    // 🆕 NUEVO: Validar disciplinas
    if (!Array.isArray(deck.disciplines)) {
        deck.disciplines = [];
    }
    
    if (deck.disciplines.length > 2) {
        errors.push('Solo puedes tener 2 disciplinas en el mazo');
    }
    
    // Verificar que no haya duplicadas
    const uniqueDisciplines = [...new Set(deck.disciplines)];
    if (uniqueDisciplines.length !== deck.disciplines.length) {
        errors.push('No puedes tener disciplinas duplicadas');
    }
    
    // Verificar que todas las disciplinas existan y estén habilitadas
    if (this.game && this.game.serverDisciplineConfig) {
        deck.disciplines.forEach(disciplineId => {
            const discipline = this.game.serverDisciplineConfig[disciplineId];
            if (!discipline) {
                errors.push(`La disciplina "${disciplineId}" no existe`);
            } else if (discipline.enabled === false) {
                errors.push(`La disciplina "${disciplineId}" está deshabilitada`);
            }
        });
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}
```

---

## Integración con Sistemas Existentes

### Patrón de Integración

Cada sistema que quiera ser afectado por disciplinas debe:

1. Tener referencia al `DisciplineManager`
2. Consultar modificadores antes de calcular valores
3. Aplicar multiplicadores/cambios según corresponda

**Ejemplo en FrontMovementSystem:**

```javascript
// server/systems/FrontMovementSystemServer.js

class FrontMovementSystemServer {
    constructor(gameState, disciplineManager) {
        this.gameState = gameState;
        this.disciplineManager = disciplineManager; // 🆕 Referencia
    }
    
    calculateAdvanceSpeed(front, playerId) {
        // Base speed
        let speed = GAME_CONFIG.frontMovement.advanceSpeed;
        
        // 🆕 Aplicar modificadores de disciplina
        const disciplineMods = this.disciplineManager
            .getModifiersForSystem(playerId, 'frontMovement');
        
        if (disciplineMods.advanceSpeedMultiplier) {
            speed *= disciplineMods.advanceSpeedMultiplier;
        }
        
        // ... otros modificadores (edificios, efectos, etc.) ...
        
        return speed;
    }
    
    calculateSupplyConsumption(front, playerId) {
        // Base consumption
        let consumption = front.baseConsumption || 1;
        
        // 🆕 Aplicar modificadores de disciplina
        const disciplineMods = this.disciplineManager
            .getModifiersForSystem(playerId, 'frontMovement');
        
        if (disciplineMods.supplyConsumptionMultiplier) {
            consumption *= disciplineMods.supplyConsumptionMultiplier;
        }
        
        return consumption;
    }
}
```

### Sistemas a Modificar

| Sistema | Archivo | Métodos a Modificar |
|---------|---------|---------------------|
| Economy | `src/systems/CurrencyManager.js` | `updateCurrency()`, `canAfford()` |
| Front Movement | `server/systems/FrontMovementSystemServer.js` | `calculateAdvanceSpeed()`, `calculateSupplyConsumption()` |
| Convoy | `server/systems/ConvoySystem.js` | `calculateSpeed()`, `calculateCapacity()` |
| Buildings | `server/systems/BuildingSystem.js` | `calculateCost()`, `canBuild()` |
| Territory | `server/systems/TerritorySystemServer.js` | `calculateAbandonmentTime()` |

---

## Configuración y Datos

### Estructura de Mazo Actualizada

```javascript
const deck = {
    id: string,
    name: string,
    units: Array<string>,      // Cartas normales
    bench: Array<string>,      // Banquillo
    disciplines: Array<string>, // 🆕 NUEVO: 2 disciplinas
    createdAt: number,
    updatedAt: number,
    isDefault: boolean
};
```

### Default Deck Actualizado

```javascript
// server/config/defaultDeck.js

export const DEFAULT_DECK = {
    id: 'default',
    name: 'Mazo Predeterminado',
    units: [
        'hq',
        'sniperStrike',
        'intelRadio',
        'engineerCenter',
        'truckFactory',
        'factory',
        'fobSabotage',
        'fob',
        'antiDrone',
        'nuclearPlant'
    ],
    bench: [
        'tank',
        'artillery'
    ],
    disciplines: [           // 🆕 NUEVO
        'debt_economy',
        'blitzkrieg'
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDefault: true
};
```

---

## UI/UX

### Arsenal (Constructor de Mazos)

**Nueva Sección:**

```
┌─────────────────────────────────────┐
│ 📋 ARSENAL                          │
├─────────────────────────────────────┤
│ [Mazo] [Banquillo] [Disciplinas] ⭐ │ ← Nueva pestaña
├─────────────────────────────────────┤
│                                     │
│   ┌───────┐      ┌───────┐         │
│   │ Slot  │      │ Slot  │         │
│   │   1   │      │   2   │         │
│   │       │      │       │         │
│   │ [???] │      │ [???] │         │
│   └───────┘      └───────┘         │
│                                     │
│ ─────────────────────────────────── │
│                                     │
│   Disciplinas Disponibles:         │
│                                     │
│   ┌──────────────┐ ┌──────────────┐│
│   │ Economía de  │ │ Blitzkrieg   ││
│   │    Deuda     │ │              ││
│   │  [Añadir]    │ │  [Añadir]    ││
│   └──────────────┘ └──────────────┘│
│                                     │
└─────────────────────────────────────┘
```

**Interacción:**
- Click en carta de disciplina → se añade al primer slot vacío
- Click derecho en slot → quitar disciplina
- Hover sobre disciplina → tooltip con efectos detallados

### In-Game (Durante la Partida)

**Panel de Disciplinas (Top Bar):**

```
┌─────────────────────────────────────────────┐
│ ⚡ DISCIPLINAS                              │
├──────────────────┬──────────────────────────┤
│ Economía Deuda   │ Blitzkrieg               │
│ [ACTIVAR] 🔓     │ [Cooldown: 15s] 🔒       │
└──────────────────┴──────────────────────────┘
```

**Estados Visuales:**

| Estado | Visual | Interacción |
|--------|--------|-------------|
| Disponible | Botón verde `[ACTIVAR]` | Click para activar |
| Activa | Timer cuenta atrás `[1:45]` + glow | No interactuable |
| Cooldown | Timer gris `[0:25]` + 🔒 | No interactuable |

**Feedback Visual:**
- Al activar: Flash en pantalla + sonido épico
- Durante activa: Border glowing alrededor del panel
- Efectos: Iconos flotantes en UI afectada (ej: "+50%" en velocidad de frentes)

### Tooltips

**Formato:**

```
┌────────────────────────────────────┐
│ ⚡ ECONOMÍA DE DEUDA                │
├────────────────────────────────────┤
│ Duración: 2:00                     │
│ Cooldown: 0:30                     │
│                                    │
│ ✅ Permite deuda hasta -150        │
│ ❌ Frentes consumen +15% recursos  │
└────────────────────────────────────┘
```

---

## Ejemplos de Disciplinas

### 1. Economía de Deuda

```javascript
{
    id: 'debt_economy',
    name: 'Economía de Deuda',
    description: 'Permite entrar en números rojos hasta -150. Los frentes consumen +15% suministros',
    icon: 'debt_economy_icon.png',
    duration: 120,
    cooldown: 30,
    effects: {
        economy: {
            allowNegativeCurrency: true,
            minCurrency: -150
        },
        frontMovement: {
            supplyConsumptionMultiplier: 1.15
        }
    }
}
```

**Uso Estratégico:** Permite inversión agresiva temprana sin preocuparse por quedarse sin oro.

---

### 2. Blitzkrieg

```javascript
{
    id: 'blitzkrieg',
    name: 'Blitzkrieg',
    description: 'Los frentes avanzan +50% más rápido. Los camiones son -30% más lentos',
    icon: 'blitzkrieg_icon.png',
    duration: 90,
    cooldown: 45,
    effects: {
        frontMovement: {
            advanceSpeedMultiplier: 1.5
        },
        convoy: {
            speedMultiplier: 0.7
        }
    }
}
```

**Uso Estratégico:** Push agresivo cuando tienes ventaja de suministros, sacrificando logística.

---

### 3. Guerra Total

```javascript
{
    id: 'total_war',
    name: 'Guerra Total',
    description: 'Todos los edificios cuestan -20%. Generas -50% currency pasivo',
    icon: 'total_war_icon.png',
    duration: 180,
    cooldown: 60,
    effects: {
        buildings: {
            costMultiplier: 0.8
        },
        economy: {
            passiveRateMultiplier: 0.5
        }
    }
}
```

**Uso Estratégico:** Construcción masiva rápida a cambio de economía debilitada.

---

### 4. Defensa Inquebrantable

```javascript
{
    id: 'unbreakable_defense',
    name: 'Defensa Inquebrantable',
    description: 'Edificios cuestan -30%. Los frentes retroceden +50% más rápido sin recursos',
    icon: 'defense_icon.png',
    duration: 120,
    cooldown: 40,
    effects: {
        buildings: {
            costMultiplier: 0.7
        },
        frontMovement: {
            retreatSpeedMultiplier: 1.5
        }
    }
}
```

**Uso Estratégico:** Montaje defensivo rápido, pero si pierdes suministros, el colapso es más rápido.

---

### 5. Logística Superior

```javascript
{
    id: 'superior_logistics',
    name: 'Logística Superior',
    description: 'Camiones +50% velocidad y capacidad. Edificios cuestan +30%',
    icon: 'logistics_icon.png',
    duration: 150,
    cooldown: 50,
    effects: {
        convoy: {
            speedMultiplier: 1.5,
            capacityMultiplier: 1.5
        },
        buildings: {
            costMultiplier: 1.3
        }
    }
}
```

**Uso Estratégico:** Dominio logístico absoluto, pero expansión territorial más cara.

---

### 6. Asedio Total

```javascript
{
    id: 'total_siege',
    name: 'Asedio Total',
    description: 'Proyectiles -40% coste. Los frentes consumen +30% suministros',
    icon: 'siege_icon.png',
    duration: 100,
    cooldown: 35,
    effects: {
        combat: {
            costMultiplier: 0.6
        },
        frontMovement: {
            supplyConsumptionMultiplier: 1.3
        }
    }
}
```

**Uso Estratégico:** Spam de ataques (drones, tanques, snipers) a cambio de frentes hambrientos.

---

### 7. Industrialización

```javascript
{
    id: 'industrialization',
    name: 'Industrialización',
    description: 'Generación de currency +100%. Los frentes avanzan -30% más lento',
    icon: 'industry_icon.png',
    duration: 180,
    cooldown: 60,
    effects: {
        economy: {
            passiveRateMultiplier: 2.0,
            territoryGainMultiplier: 2.0
        },
        frontMovement: {
            advanceSpeedMultiplier: 0.7
        }
    }
}
```

**Uso Estratégico:** Economía explosiva para mid/late game, sacrificando presión inmediata.

---

### 8. Desesperación

```javascript
{
    id: 'desperation',
    name: 'Desesperación',
    description: 'Todo cuesta -50%. Pierdes 1 pixel/segundo de territorio automáticamente',
    icon: 'desperation_icon.png',
    duration: 90,
    cooldown: 90,
    effects: {
        buildings: {
            costMultiplier: 0.5
        },
        combat: {
            costMultiplier: 0.5
        },
        territory: {
            forcedRetreat: 1 // px/s
        }
    }
}
```

**Uso Estratégico:** Última carta para comeback. Todo barato pero pierdes terreno constantemente.

---

## Checklist de Implementación

### Fase 1: Configuración Base
- [ ] Crear `server/config/disciplines.js` con configuración de disciplinas
- [ ] Añadir sección `disciplines` a `server/config/gameConfig.js`
- [ ] Crear helpers: `getDiscipline()`, `getEnabledDisciplines()`, etc.
- [ ] Definir al menos 4-5 disciplinas iniciales

### Fase 2: Manager de Servidor
- [ ] Crear `server/game/managers/DisciplineManager.js`
- [ ] Implementar `setEquippedDisciplines()`
- [ ] Implementar `activateDiscipline()`
- [ ] Implementar `update()` para tick del servidor
- [ ] Implementar `getModifiersForSystem()`
- [ ] Implementar `canActivate()` y `getPlayerState()`

### Fase 3: Integración con GameState
- [ ] Añadir `disciplineManager` a `GameStateManager` (servidor)
- [ ] Inicializar disciplinas de jugadores al inicio de partida
- [ ] Añadir disciplinas equipadas en evento `game_start`
- [ ] Sincronizar estado de disciplinas en updates

### Fase 4: Network (Comunicación Cliente-Servidor)
- [ ] Evento `activate_discipline` (cliente → servidor)
- [ ] Evento `discipline_activated` (servidor → cliente)
- [ ] Evento `discipline_ended` (servidor → cliente)
- [ ] Evento `discipline_cooldown_ready` (servidor → cliente)
- [ ] Incluir estado de disciplinas en `game_state_update`

### Fase 5: Integración con Sistemas Existentes
- [ ] Modificar `CurrencyManager` (economía)
- [ ] Modificar `FrontMovementSystemServer` (movimiento de frentes)
- [ ] Modificar `ConvoySystem` (logística)
- [ ] Modificar `BuildingSystem` (construcción)
- [ ] Modificar `TerritorySystem` (territorio)
- [ ] Modificar sistemas de combate (projectiles)

### Fase 6: Validación en DeckManager
- [ ] Añadir campo `disciplines: []` a estructura de mazos
- [ ] Validar máximo 2 disciplinas por mazo
- [ ] Validar que no haya disciplinas duplicadas
- [ ] Validar que disciplinas existan y estén habilitadas
- [ ] Actualizar mazo predeterminado con 2 disciplinas
- [ ] Migración de mazos antiguos (añadir `disciplines: []`)

### Fase 7: UI - Arsenal (Constructor de Mazos)
- [ ] Nueva pestaña "Disciplinas" en Arsenal
- [ ] Mostrar 2 slots para disciplinas
- [ ] Galería de disciplinas disponibles
- [ ] Drag & drop o click para añadir/quitar
- [ ] Tooltips detallados con efectos
- [ ] Validación visual (límite de 2, no duplicados)

### Fase 8: UI - In-Game (Durante Partida)
- [ ] Panel de disciplinas en Top Bar
- [ ] Botones de activación
- [ ] Timers (duración activa + cooldown)
- [ ] Estados visuales (disponible/activa/cooldown)
- [ ] Feedback visual al activar (flash, sonido)
- [ ] Iconos flotantes mostrando efectos activos

### Fase 9: Assets Visuales
- [ ] Iconos para disciplinas (8-10 disciplinas)
- [ ] Efectos visuales para activación (particles, flash)
- [ ] Sonidos de activación
- [ ] Sonidos de fin de disciplina
- [ ] Border/glow para panel de disciplina activa

### Fase 10: Testing & Balance
- [ ] Tests unitarios para `DisciplineManager`
- [ ] Tests de integración con sistemas afectados
- [ ] Validación anti-hack (servidor rechaza activaciones inválidas)
- [ ] Playtest de cada disciplina
- [ ] Balance de duraciones y cooldowns
- [ ] Balance de trade-offs (ventaja vs desventaja)

### Fase 11: Documentación
- [ ] ✅ Este documento de diseño
- [ ] Comentarios en código
- [ ] Tutorial in-game para disciplinas
- [ ] Actualizar README con nueva mecánica

---

## Notas de Implementación

### Orden Recomendado

1. **Backend primero**: Implementar toda la lógica de servidor antes de UI
2. **Un sistema a la vez**: Integrar con un sistema (ej: economía) y probar antes de continuar
3. **Disciplinas simples primero**: Empezar con disciplinas que solo modifican 1-2 parámetros
4. **UI mínima funcional**: Panel básico antes de pulir visuales

### Anti-Hack Considerations

- ✅ Servidor valida que disciplinas estén equipadas
- ✅ Servidor valida cooldowns y duraciones
- ✅ Servidor calcula efectos (cliente solo muestra)
- ✅ Cliente no puede forzar activación

### Performance

- Los modificadores se consultan dinámicamente (no se cachean)
- Cada sistema consulta solo cuando necesita calcular algo
- `update()` del manager es ligero (solo verifica timestamps)
- Estado se incluye en updates regulares (no eventos extra)

### Escalabilidad

- Añadir nueva disciplina = 1 entrada en `disciplines.js`
- Añadir nuevo sistema modificable = pattern de `getModifiersForSystem()`
- Sistema completamente data-driven

---

## Posibles Expansiones Futuras

### Ideas para Futuras Versiones

1. **Disciplinas Avanzadas**: Requerir nivel de jugador o achievements
2. **Sinergias**: Combos entre ciertas disciplinas
3. **Disciplinas de Raza**: Disciplinas exclusivas por facción (si se reimplementan razas)
4. **Meta-disciplinas**: Disciplinas que afectan a otras disciplinas
5. **Eventos Random**: Disciplinas que se activan automáticamente por eventos
6. **Disciplinas Duales**: Una misma carta con 2 modos (elige al activar)

---

## Referencias

- `server/config/disciplines.js` (a crear)
- `server/game/managers/DisciplineManager.js` (a crear)
- `server/config/gameConfig.js` (modificar)
- `src/systems/DeckManager.js` (modificar)
- Sistemas a integrar: `CurrencyManager`, `FrontMovementSystemServer`, `ConvoySystem`, etc.

---

**Documento creado:** 2025-11-24  
**Última actualización:** 2025-11-24  
**Estado:** 📋 Diseño completo - Pendiente de implementación

