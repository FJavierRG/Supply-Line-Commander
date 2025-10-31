# 🤖 Documentación del Comportamiento de la IA

## 📋 Índice
1. [Arquitectura General](#arquitectura-general)
2. [Componentes del Sistema](#componentes-del-sistema)
3. [Sistemas de Comportamiento](#sistemas-de-comportamiento)
4. [Reglas de Suministro](#reglas-de-suministro)
5. [Sistema de Construcción](#sistema-de-construcción)
6. [Sistema Ofensivo](#sistema-ofensivo)
7. [Sistema de Reacciones](#sistema-de-reacciones)
8. [Sistema Médico](#sistema-médico)
9. [Sistema de Scoring](#sistema-de-scoring)
10. [Sistema de Dificultad](#sistema-de-dificultad)
11. [Flujo de Ejecución](#flujo-de-ejecución)
12. [Localización de Archivos](#localización-de-archivos)

---

## 🏗️ Arquitectura General

La IA funciona como un **sistema basado en reglas** que ejecuta diferentes comportamientos en intervalos específicos. Utiliza el mismo sistema de eventos que los jugadores humanos para garantizar consistencia y sincronización cliente-servidor.

### Principios de Diseño
- **Event-Driven**: La IA emite eventos Socket.IO como si fuera un jugador real
- **Server-Authoritative**: Toda la lógica corre en el servidor
- **Modular**: Separación entre decisión (AISystem) y ejecución (AIActionHandler)
- **Contextual**: Las decisiones se basan en análisis del estado del juego

---

## 🧩 Componentes del Sistema

### 1. **AISystem** (`server/game/managers/AISystem.js`)
**Responsabilidad**: Orquestador principal. Analiza el estado, evalúa acciones y decide qué hacer.

**Estado Interno**:
- `active`: Si la IA está activa
- `currency`: Currency actual del equipo
- `timers`: Objetos con timers para cada sistema
- `intervals`: Intervalos de ejecución para cada sistema
- `difficultyMultipliers`: Multiplicadores según dificultad
- `availableBuildings`: Cache de edificios disponibles (según raza)
- `availableConsumables`: Cache de consumibles disponibles (según raza)
- `stats`: Estadísticas de acciones ejecutadas

### 2. **AIActionHandler** (`server/game/handlers/AIActionHandler.js`)
**Responsabilidad**: Ejecuta las acciones decididas por AISystem. Simula eventos de jugador real.

**Métodos Principales**:
- `executeAction()`: Ejecuta una acción (build/attack)
- `executeBuild()`: Construye un edificio y emite evento `building_created`
- `executeAttack()`: Ejecuta ataque (drone/sniper)
- `calculateBuildPosition()`: Calcula posición válida para construcción

### 3. **AIConfig** (`server/game/ai/config/AIConfig.js`)
**Responsabilidad**: Configuración centralizada de intervalos y flags de debug.

---

## ⚙️ Sistemas de Comportamiento

La IA ejecuta **7 sistemas principales** en paralelo, cada uno con su propio timer:

| Sistema | Intervalo | Prioridad | Descripción |
|---------|-----------|-----------|-------------|
| **Supply FOBs** | 2.0s | ⭐⭐⭐ Crítica | Reabastece FOBs desde HQ |
| **Supply Fronts** | 3.0s | ⭐⭐⭐ Crítica | Reabastece frentes desde FOBs |
| **Strategic Building** | 8.0s (4.0s primera vez) | ⭐⭐ Alta | Construcciones estratégicas |
| **Offensive Decisions** | 40.0s ± 10s | ⭐⭐ Alta | Ataques ofensivos (drones/snipers) |
| **Reactions** | 0.5s | ⭐⭐⭐ Crítica | Reacciones a amenazas del jugador |
| **Medical Emergencies** | 3.0s | ⭐ Media | Envío de ambulancias |
| **Status Report** | 30.0s | ⭐ Baja | Logs de estado |

---

## 🚚 Reglas de Suministro

### REGLA 1: Reabastecimiento de FOBs desde HQ
**Frecuencia**: Cada 2 segundos  
**Trigger**: FOBs con ≤50% de suministros  
**Origen**: HQ  
**Comportamiento**:
- Revisa **TODOS** los FOBs del equipo
- Envía convoy a cada FOB que necesite suministros
- No se detiene en el primer FOB encontrado
- Requiere vehículos disponibles en el HQ

**Código**: `ruleResupplyFOBs(team)` (líneas 271-306)

### REGLA 2: Reabastecimiento de Frentes desde FOBs
**Frecuencia**: Cada 3 segundos  
**Trigger**: Frentes con <70% de suministros  
**Origen**: FOB más cercano con recursos  
**Comportamiento**:
- Revisa **TODOS** los frentes del equipo
- Busca el FOB más cercano que tenga:
  - Vehículos disponibles (`availableVehicles > 0`)
  - Suministros suficientes (`supplies >= 10`)
- Envía convoy desde el FOB más cercano
- Continúa revisando otros frentes aunque uno ya haya sido atendido

**Código**: `ruleResupplyFronts(team)` (líneas 312-343)

### Funciones Auxiliares
- `findClosestFOBWithResources()`: Encuentra FOB más cercano con recursos (líneas 348-371)
- `sendSupplyConvoy()`: Envía convoy y emite evento Socket.IO (líneas 376-425)

---

## 🏗️ Sistema de Construcción

### Proceso de Decisión
1. **Análisis de Estado** (`analyzeState()`):
   - Fase del juego (early/mid/late) basada en currency
   - Número de FOBs propios
   - Número de plantas nucleares propias vs jugador
   - Si tiene lanzadera de drones

2. **Evaluación de Acciones** (`evaluateActions()`):
   - Genera lista de acciones posibles con scores
   - Filtra por: edificios disponibles, currency suficiente, condiciones específicas
   - Calcula score contextual para cada acción

3. **Ejecución** (`handleStrategicBuilding()`):
   - Aplica multiplicadores de dificultad a scores
   - Ejecuta la acción con mayor score
   - Primera decisión estratégica es más rápida (4s en lugar de 8s)

### Edificios Evaluados

| Edificio | Score Base | Bonificaciones | Condiciones |
|----------|-----------|----------------|-------------|
| **Intel Radio** | 35 | +15 si fase early | Solo B_Nation |
| **Truck Factory** | 45 | +15 si fase no late | Solo si no tiene ya |
| **FOB** | 40 | +30 si <2 FOBs, +20 si early | - |
| **Nuclear Plant** | 50 | +30 por cada planta del jugador, -25 por cada planta propia | - |
| **Drone Launcher** | 60 | - | Solo si no tiene ya |
| **Anti-Drone** | 30 | - | Solo si no tiene ya |
| **Engineer Center** | 40 | +10 si fase early | Solo A_Nation, solo si no tiene ya |

### Cálculo de Posición
`calculateBuildPosition()` usa múltiples estrategias:
1. **Círculo alrededor del HQ**: Distancias 200-400px, 8 ángulos
2. **Espiral**: Desde 150px hasta 500px con step de 50px
3. **Grid**: Grid de 150px alrededor del HQ (rango ±5)
4. **Fallback aleatorio**: 100 intentos aleatorios
5. **Último recurso**: Posición fija a 200px del HQ

**Validación**: Usa `buildHandler.isValidLocation()` y `territoryCalculator.isInTeamTerritory()`

---

## ⚔️ Sistema Ofensivo

### Proceso de Decisión
**Frecuencia**: 40 segundos ± 10 segundos (variable)  
**Umbral**: Currency suficiente para la acción más barata (drone o sniper)

### Acciones Ofensivas

#### 1. Ataque con Dron
**Score**: 65 + 40 si hay objetivos  
**Condiciones**:
- Tiene lanzadera de drones (`droneLauncher`)
- Currency suficiente
- Hay objetivos del jugador (plantas nucleares, hospitales, FOBs)
- Puede usar consumible 'drone' (según raza)

**Objetivo Prioritario**:
1. Plantas nucleares
2. Hospitales
3. FOBs

#### 2. Ataque con Sniper
**Score**: 30 + 20  
**Condiciones**:
- Currency suficiente
- Puede usar consumible 'sniperStrike' (según raza)

**Objetivo**: Aleatorio entre FOBs, frentes y hospitales del jugador

**Código**: `evaluateOffensiveActions()` (líneas 643-676), `handleOffensiveDecision()` (líneas 473-495)

---

## 🔄 Sistema de Reacciones

**Frecuencia**: Cada 0.5 segundos (muy responsivo)  
**Propósito**: Reaccionar rápidamente a amenazas del jugador

### Reacciones Implementadas

#### 1. Reacción a Plantas Nucleares
**Trigger**: El jugador tiene más plantas nucleares que la IA  
**Acción**: Construir planta nuclear inmediatamente  
**Umbral**: Currency >= 200$ (modificado por dificultad)

#### 2. Reacción a Drones
**Trigger**: 
- Jugador tiene lanzadera de drones
- Jugador lanzó un dron en los últimos 10 segundos

**Acción**: Construir anti-drone (60% probabilidad)  
**Umbral**: Currency >= 115$ (modificado por dificultad)  
**Condición**: Solo si no tiene anti-drone ya

**Código**: `handleReactions()` (líneas 743-781)

---

## 🚑 Sistema Médico

**Frecuencia**: Cada 3 segundos  
**Propósito**: Enviar ambulancias a frentes con baja mano de obra

### Lógica
1. Detecta frentes con **<30% de manpower**
2. Busca fuente de ambulancias:
   - Hospital (`campaignHospital`) si existe
   - HQ si no hay hospital
3. Envía ambulancia si:
   - Hay vehículos disponibles (70% probabilidad)
   - Hay emergencias detectadas

**Nota**: Actualmente busca frentes de tipo `campaignFront`, pero los frentes se crean como `front`. Esto puede ser un bug.

**Código**: `handleMedicalEmergencies()` (líneas 786-822)

---

## 📊 Sistema de Scoring

### Fases del Juego
- **Early**: Currency < 200$
- **Mid**: Currency 200-400$
- **Late**: Currency > 400$

### Cálculo de Scores
Los scores se calculan dinámicamente según:
- **Contexto**: Fase del juego, estado del jugador, estado propio
- **Bonificaciones**: Situaciones específicas que aumentan prioridad
- **Penalizaciones**: Condiciones que reducen prioridad

**Ejemplo**: FOB tiene score base 40, pero si tiene <2 FOBs suma +30, y si está en fase early suma +20 → Score total: 90

### Aplicación de Dificultad
Después de calcular scores, se multiplican por `difficultyMultipliers.actionScore`:
- **Easy**: ×0.7 (decisiones menos agresivas)
- **Medium**: ×1.0 (normal)
- **Hard**: ×1.3 (más agresivo)

**Código**: `analyzeState()` (líneas 500-519), `evaluateActions()` (líneas 524-638)

---

## 🎚️ Sistema de Dificultad

### Multiplicadores por Dificultad

| Dificultad | Action Score | Currency Threshold | Reaction Speed |
|------------|--------------|-------------------|----------------|
| **Easy** | 0.7 | 1.3 | 0.5 |
| **Medium** | 1.0 | 1.0 | 1.0 |
| **Hard** | 1.3 | 0.7 | 2.0 |

### Efectos
- **Action Score**: Multiplica scores de acciones (más alto = más agresivo)
- **Currency Threshold**: Multiplica umbrales de currency (más alto = necesita más currency para actuar)
- **Reaction Speed**: Multiplica velocidad de reacciones (actualmente no usado)

**Código**: `getDifficultyMultipliers()` (líneas 718-738)

---

## 🔄 Flujo de Ejecución

### Inicialización
```
1. Constructor AISystem
   ├─ Calcula edificios disponibles (según raza)
   ├─ Calcula consumibles disponibles (según raza)
   ├─ Inicializa timers e intervalos
   └─ Configura multiplicadores de dificultad

2. activate()
   ├─ Recálcula edificios disponibles (por si la raza se configuró después)
   └─ Log de estado inicial (FOBs, frentes, HQ)
```

### Loop Principal (`update(dt)`)
```
Cada tick (dt segundos):

1. Verificar activación
   └─ Si debe activarse y no está activa → activate()

2. Actualizar currency
   └─ Sincronizar con gameState.currency.player2

3. Sistema de Suministro FOBs (cada 2s)
   └─ ruleResupplyFOBs() → Envía convoyes desde HQ

4. Sistema de Suministro Frentes (cada 3s)
   └─ ruleResupplyFronts() → Envía convoyes desde FOBs

5. Construcciones Estratégicas (cada 8s, primera vez 4s)
   ├─ analyzeState() → Analiza estado
   ├─ evaluateActions() → Genera acciones con scores
   ├─ Aplica multiplicadores de dificultad
   └─ executeAction() → Ejecuta mejor acción

6. Decisiones Ofensivas (cada 40s ± 10s)
   ├─ evaluateOffensiveActions() → Genera acciones ofensivas
   ├─ Aplica multiplicadores de dificultad
   └─ executeAction() → Ejecuta mejor acción

7. Reacciones (cada 0.5s)
   └─ handleReactions() → Reacciona a amenazas

8. Emergencias Médicas (cada 3s)
   └─ handleMedicalEmergencies() → Envía ambulancias

9. Reporte de Estado (cada 30s)
   └─ logStatus() → Log de estado actual
```

### Ejecución de Acciones
```
executeAction(action, team):
1. Llama a AIActionHandler.executeAction()
2. AIActionHandler determina tipo (build/attack)
3. Si es build:
   ├─ calculateBuildPosition() → Busca posición válida
   ├─ gameState.handleBuild() → Construye en servidor
   └─ io.emit('building_created') → Notifica clientes
4. Si es attack:
   ├─ executeDroneAttack() o executeSniperAttack()
   └─ Emite eventos correspondientes
```

---

## 📁 Localización de Archivos

### Archivos Principales
- **`server/game/managers/AISystem.js`** (825 líneas)
  - Orquestador principal
  - Lógica de decisión
  - Sistemas de comportamiento
  - Scoring y análisis de estado

- **`server/game/handlers/AIActionHandler.js`** (246 líneas)
  - Ejecución de acciones
  - Cálculo de posiciones
  - Emisión de eventos Socket.IO

- **`server/game/ai/config/AIConfig.js`** (25 líneas)
  - Configuración de intervalos
  - Flags de debug

### Integración
- **`server/game/GameStateManager.js`**
  - Instancia `AISystem` en constructor
  - Llama `aiSystem.update(dt)` en el loop principal

- **`server/server.js`**
  - Inicializa `AISystem` con `io` y `roomId` cuando hay IA
  - Pasa configuración de dificultad desde `room.aiPlayer`

### Dependencias
- `BuildHandler`: Validación de posiciones, costes de edificios
- `ConvoyHandler`: Manejo de convoyes
- `CombatHandler`: Ataques (drone/sniper)
- `TerritoryCalculator`: Validación de territorio
- `RaceManager`: Edificios disponibles según raza
- `MedicalSystem`: Envío de ambulancias
- `DroneSystem`: Lanzamiento de drones

---

## 🔍 Problemas Identificados / Áreas de Mejora

### Bugs Conocidos
1. **Tipo de Frente Médico**: `handleMedicalEmergencies()` busca `campaignFront` pero los frentes se crean como `front`. (Línea 789)
2. **Sniper Attack**: `executeSniperAttack()` está incompleto, solo hace log. (Línea 152)

### Mejoras Potenciales
1. **Priorización de FOBs**: Actualmente envía a todos los FOBs que necesiten suministros. Podría priorizar los más bajos.
2. **Umbrales Dinámicos**: Los umbrales de suministro (50% FOBs, 70% frentes) son fijos. Podrían ser dinámicos según dificultad.
3. **Reacciones más Inteligentes**: Las reacciones podrían ser más sofisticadas (ej: construir múltiples anti-drones si hay muchos drones).
4. **Cálculo de Posición**: El sistema de cálculo de posición podría considerar mejor el territorio y evitar áreas peligrosas.
5. **Scoring más Contextual**: Los scores podrían considerar más factores (ej: distancia al frente, presión del jugador).

---

## 📝 Notas de Implementación

### Eventos Socket.IO Emitidos
- `building_created`: Cuando construye un edificio
- `convoy_spawned`: Cuando envía convoy tradicional
- `helicopter_dispatched`: Cuando envía helicóptero (B_Nation)

### Simulación de Jugador Real
La IA **no** llama directamente a handlers internos. En su lugar:
1. Llama a `gameState.handleBuild()` / `gameState.handleConvoy()` (mismos métodos que jugadores)
2. Emite eventos Socket.IO como si fuera un jugador real
3. Los clientes reciben los eventos y sincronizan igual que con jugadores humanos

Esto garantiza:
- ✅ Consistencia de lógica
- ✅ Sincronización cliente-servidor
- ✅ Mismo comportamiento visual y de juego

---

**Última Actualización**: 2024  
**Versión**: 1.0

