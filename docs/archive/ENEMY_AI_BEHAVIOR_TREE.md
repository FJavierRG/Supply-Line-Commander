# 🤖 ÁRBOL DE COMPORTAMIENTO DE LA IA ENEMIGA

## 📊 **RESUMEN DE INTERVALOS**
```
FOBs:          2.0s  ████████████████████████████████ → ruleResupplyFOBs()
Frentes:       3.0s  ████████████████████████████ → ruleResupplyFronts()
Reacción:      CONTINUA ███████████████████████████ → ruleReactToPlayer()
Emergencia FOB: 3.0s  ████████████████████████████ → ruleEmergencyFOB()
Harass Sniper: 25.0s  ████ → ruleSniperHarass()
Ataque:        40.0s  ██ → ruleOffensiveStrike()
Construcción:  8.0s   ████████████████ → ruleStrategicBuilding()
Truck Factory: 180.0s █ → spawnEnemyTruckFactory()
Emergencias:   CONTINUA ███████████████████████████ → respondToMedicalEmergencies()
```

---

## 🌳 **ÁRBOL DE DECISIONES**

### **1. 🚨 EMERGENCIA FOB** *(Cada 3.0s)* → `ruleEmergencyFOB()`
```
¿Tiene 0 FOBs?
├─ SÍ → ¿Configuración FOB disponible?
│   ├─ SÍ → ¿Currency ≥ 130$?
│   │   ├─ SÍ → ✅ CONSTRUIR FOB EMERGENCIA (buildEmergencyFOB)
│   │   └─ NO → ❌ Sin dinero - esperar
│   └─ NO → ❌ Config no disponible
└─ NO → ❌ No necesario (tiene X FOBs)

⚠️ Si hay emergencia, detiene otros comportamientos en ese ciclo
```

### **2. 🚛 REABASTECIMIENTO FOBs** *(Cada 2.0s)* → `ruleResupplyFOBs()`
```
Para cada FOB enemigo:
├─ ¿Suministros < 50%?
│   ├─ SÍ → ¿HQ tiene vehículos y suministros?
│   │   ├─ SÍ → ✅ ENVIAR CAMIÓN (HQ → FOB)
│   │   └─ NO → ❌ Sin recursos
│   └─ NO → ❌ No necesita (>50%)
└─ Continuar con siguiente FOB
```

### **3. 🎯 REABASTECIMIENTO FRENTES** *(Cada 3.0s)* → `ruleResupplyFronts()`
```
Para cada frente enemigo:
├─ ¿Suministros < 70%?
│   ├─ SÍ → ¿Hay FOB cercano con recursos y vehículos?
│   │   ├─ SÍ → ✅ ENVIAR CAMIÓN (FOB → Frente)
│   │   └─ NO → ❌ Sin FOB disponible
│   └─ NO → ❌ No necesita (>70%)
└─ Continuar con siguiente frente
```

### **4. ⚡ REACCIÓN AL JUGADOR** *(CONTINUA - Cada frame)* → `ruleReactToPlayer()`

#### **4.1 Reacción a Drones del Jugador:**
```
¿Jugador lanzó dron (en últimos 3s)?
├─ SÍ → ¿Roll < 60%?
│   ├─ SÍ → ✅ CONSTRUIR ANTI-DRONE en objetivo (counterDroneWithAntiDrone)
│   │        Costo: 115$ + 40$ margen
│   └─ NO → ❌ Falló detección (40% probabilidad)
└─ NO → Siguiente verificación
```

#### **4.2 Reacción a Anti-Drones del Jugador:**
```
¿Jugador construyó anti-drone (en últimos 3s)?
├─ SÍ → ¿Roll > 70%?
│   ├─ SÍ → ✅ COPIAR ANTI-DRONE en espejo (mirrorPlayerBuilding)
│   │        30% probabilidad - Costo: 115$ + 50$ margen
│   └─ NO → ❌ No copiar (70% probabilidad)
└─ NO → Siguiente verificación
```

#### **4.3 Reacción a Planta Nuclear del Jugador:**
```
¿Jugador construyó planta nuclear (en últimos 3s)?
├─ SÍ → Generar Roll
│   ├─ Roll < 0.25 (25%) → ✅ COPIAR PLANTA en espejo (mirrorPlayerBuilding)
│   ├─ Roll < 0.60 (35%) → ¿Currency ≥ 175$?
│   │   ├─ SÍ → ✅ LANZAR DRON REACTIVO (reactToDroneableTarget)
│   │   │        Trade: 175$ vs 200$ - Requiere lanzadera
│   │   └─ NO → ❌ Sin currency
│   └─ Roll ≥ 0.60 (40%) → ❌ IGNORAR planta (arriesgado)
└─ NO → Siguiente verificación
```

#### **4.4 Reacción a Hospital del Jugador:**
```
¿Jugador construyó hospital (en últimos 3s)?
├─ SÍ → Generar Roll
│   ├─ Roll < 0.20 (20%) → ✅ COPIAR HOSPITAL en espejo (mirrorPlayerBuilding)
│   ├─ Roll < 0.50 (30%) → ¿Currency ≥ 175$?
│   │   ├─ SÍ → ✅ LANZAR DRON REACTIVO (reactToDroneableTarget)
│   │   │        Trade: 175$ vs 125$ - Requiere lanzadera
│   │   └─ NO → ❌ Sin currency
│   └─ Roll ≥ 0.50 (50%) → ❌ IGNORAR hospital
└─ NO → Siguiente verificación
```

#### **4.5 Iniciativa - Jugador Inactivo:**
```
¿Jugador sin lanzar drones por 15+ segundos?
├─ SÍ → ¿Han pasado 20s desde última iniciativa?
│   ├─ SÍ → ¿Tiene lanzadera?
│   │   ├─ SÍ → ¿Currency ≥ 175$ + 50$ margen?
│   │   │   ├─ SÍ → ¿Hay objetivos aliados?
│   │   │   │   ├─ SÍ → ✅ LANZAR DRON INICIATIVA (takeInitiative)
│   │   │   │   │        Objetivo: Mejor scoring de FOBs/Plantas/Hospitales
│   │   │   │   └─ NO → ❌ Sin objetivos
│   │   │   └─ NO → ❌ Sin currency
│   │   └─ NO → ¿Currency ≥ 200$?
│   │       ├─ SÍ → ✅ CONSTRUIR LANZADERA (prerequisito)
│   │       └─ NO → ❌ Sin currency para lanzadera
│   └─ NO → ⏳ Cooldown activo
└─ NO → ❌ Jugador activo

Cooldown: 20s entre intentos de iniciativa
```

### **5. 🎯 HARASS CON SNIPER** *(Cada 25.0s)* → `ruleSniperHarass()`
```
¿Currency entre 120$ y 249$? (Early game)
├─ SÍ → ¿Estado de juego?
│   ├─ Desperate/Losing → ❌ NO HARASS (supervivencia)
│   └─ Even/Winning → ¿Jugador tiene plantas o hospitales?
│       ├─ SÍ → ❌ NO HARASS (priorizar defensa)
│       └─ NO → ¿Roll < 0.4?
│           ├─ SÍ → ❌ SKIP (40% probabilidad)
│           └─ NO → ¿Currency ≥ 60$ + 40$ margen?
│               ├─ SÍ → ✅ LANZAR SNIPER a frente aleatorio
│               │        Efecto: +30% consumo (wounded) 15s
│               └─ NO → ❌ Sin reserva económica
└─ NO → ❌ Fuera de rango económico

Probabilidad real: ~30-40% (60% skip base reducido a 40%)
```

### **6. 🎲 ATAQUE OFENSIVO** *(Cada 40.0s)* → `ruleOffensiveStrike()`

#### **6.1 Modo Supervivencia (Desperate/Losing):**
```
Estado: DESPERATE o LOSING
├─ ¿FOBs < 2 Y Currency ≥ 130$?
│   ├─ SÍ → ✅ CONSTRUIR FOB (reconstruir infraestructura)
│   └─ NO → ¿Currency ≥ 250$?
│       ├─ SÍ → ✅ CONSTRUIR PLANTA NUCLEAR (acelerar economía)
│       └─ NO → ⏭️ SKIP (ahorrar)
└─ NO hacer ataques ofensivos
```

#### **6.2 Early Game (<100$):**
```
¿Currency < 100$?
├─ SÍ → ❌ CANCELADO - Currency muy baja
└─ NO → Continuar
```

#### **6.3 Early/Mid Game (100-299$):**
```
Currency entre 100$ y 299$
├─ ¿Currency < 150$? (Muy bajo)
│   ├─ SÍ → Generar Roll
│   │   ├─ Roll < 0.7 Y FOBs < 2 → ✅ CONSTRUIR FOB (70%)
│   │   └─ Roll ≥ 0.7 → ⏭️ SKIP (30% - ahorrar)
│   └─ NO → Currency entre 150-299$
│       ├─ PRIORIDAD: ¿Sin lanzadera Y Currency ≥ 200$?
│       │   ├─ SÍ → Generar Roll Lanzadera
│       │   │   ├─ Roll < 0.8 → ✅ CONSTRUIR LANZADERA (80%)
│       │   │   │                Costo: 200$ (prerequisito para drones)
│       │   │   └─ Roll ≥ 0.8 → Continuar otras decisiones (20% skip)
│       │   └─ NO → Continuar otras decisiones
│       └─ Generar Roll Acción (independiente)
│           ├─ Roll < 0.3 → ✅ LANZAR SNIPER (30%)
│           ├─ Roll < 0.7 Y FOBs < 2 → ✅ CONSTRUIR FOB (40%)
│           └─ Roll ≥ 0.7 → ⏭️ SKIP (30% - ahorrar para late)
```

#### **6.4 Late Game (≥300$):**
```
Currency ≥ 300$
├─ Analizar estado de partida (analyzeGameState)
│   ├─ Winning → droneChance = 80%, skipChance = 5%
│   └─ Even → droneChance = 50%, skipChance = 15%
│
├─ ¿FOBs < 2? (Necesita expandirse)
│   ├─ SÍ → Generar Roll
│   │   ├─ Roll < droneChance → ¿Tiene lanzadera?
│   │   │   ├─ SÍ → ✅ LANZAR DRON (50-80%)
│   │   │   └─ NO → ¿Currency ≥ 200$?
│   │   │       ├─ SÍ → ✅ CONSTRUIR LANZADERA (prerequisito)
│   │   │       └─ NO → ⏭️ AHORRAR para lanzadera
│   │   ├─ Roll < droneChance + (0.85 - skipChance) → ✅ CONSTRUIR FOB
│   │   └─ Roll resto → ⏭️ SKIP (5-15%)
│   │
│   └─ NO (≥2 FOBs) → Enfoque ofensivo
│       ├─ Generar Roll
│       ├─ Winning → offensiveThreshold = 0.9 (90%)
│       ├─ Even → offensiveThreshold = 0.75 (75%)
│       │
│       ├─ Roll < offensiveThreshold → ¿Tiene lanzadera?
│       │   ├─ SÍ → ✅ LANZAR DRON (75-90%)
│       │   └─ NO → ¿Currency ≥ 200$?
│       │       ├─ SÍ → ✅ CONSTRUIR LANZADERA (prerequisito)
│       │       └─ NO → ⏭️ AHORRAR para lanzadera
│       └─ Roll ≥ offensiveThreshold → ⏭️ SKIP (10-25%)
```

### **7. 🏗️ CONSTRUCCIONES ESTRATÉGICAS** *(Cada 8.0s)* → `ruleStrategicBuilding()`
```
PRIORIDAD 1: FOB Estratégico
¿Currency ≥ 180$ Y FOBs < 2?
├─ SÍ → Generar Roll
│   ├─ Roll > 0.2 → ✅ CONSTRUIR FOB ESTRATÉGICO (80%)
│   │                 Posición: Distribución inteligente 3 zonas
│   └─ Roll ≤ 0.2 → ❌ Falló (20%)
└─ NO → Siguiente prioridad

PRIORIDAD 2: Planta Nuclear
¿Currency ≥ 250$ Y Plantas < 2?
├─ SÍ → Generar Roll
│   ├─ Roll > 0.3 → ✅ CONSTRUIR PLANTA NUCLEAR (70%)
│   │                 Posición: Cerca del HQ (150-250px)
│   └─ Roll ≤ 0.3 → ❌ Falló (30%)
└─ NO → ❌ Ninguna acción
```

### **8. 🏥 RESPUESTA A EMERGENCIAS MÉDICAS** *(CONTINUA - Cada frame)* → `respondToMedicalEmergencies()`
```
Para cada frente enemigo con emergencia médica:
├─ ¿Ya se intentó atender esta emergencia?
│   ├─ SÍ → ⏭️ SKIP (evitar duplicados)
│   └─ NO → Marcar como atendida → Generar Roll
│       ├─ Roll < 0.2 → ❌ FALLÓ - No enviar (20% fallo)
│       └─ Roll ≥ 0.2 → ¿Hay ambulancias disponibles?
│           ├─ SÍ → Buscar fuente más cercana (HQ o Hospitales)
│           │   └─ ✅ ENVIAR AMBULANCIA (80% éxito)
│           └─ NO → ❌ Sin ambulancias

Fuentes médicas: HQ enemigo + Hospitales enemigos construidos
```

### **9. 🏭 TRUCK FACTORY AUTOMÁTICA** *(Cada 180.0s = 3 minutos)* → `spawnEnemyTruckFactory()`
```
Cada 3 minutos:
└─ ✅ SPAWN TRUCK FACTORY enemiga
    Posición: Cerca del HQ enemigo (X: HQ-200 a HQ-50, Y: aleatoria)
    Efecto: +1 vehículo al HQ enemigo inmediatamente
    Costo: GRATIS (automático)
```

---

## 💰 **ECONOMÍA**

### **Generación de Currency:**
- **Base**: +2$/s (jugador)
- **Ventaja IA**: +1$/s (compensación)
- **Bonus Plantas**: +2$/s por cada planta nuclear enemiga
- **Total IA**: 3$/s + (plantas × 2$)/s

### **Costos Actualizados:**
| Acción | Costo | Margen | Total Requerido |
|--------|-------|--------|-----------------|
| FOB | 130$ | **+20$ (early) / +50$ (mid-late)** | **150$ / 180$** |
| Planta Nuclear | 200$ | +50$ | 250$ |
| **Lanzadera Drones** | 200$ | **SIN MARGEN** | 200$ |
| **Dron** | 175$ | +50$ | 225$ |
| Sniper | 60$ | +20$ | 80$ |
| Anti-Drone | 115$ | +40$ | 155$ |
| Hospital | 125$ | +50$ | 175$ |

### **Notas de Balanceo:**
- **Drones Reactivos**: SIN MARGEN (trade económico directo)
- **Lanzadera**: SIN MARGEN (inversión crítica - IA la construye automáticamente)
- **IA tiene +1$/s ventaja**: Compensa limitaciones de decisión automática
- **IA proactiva**: Construye lanzadera automáticamente cuando necesita drones (80% mid, 100% late)

---

## 🎲 **PROBABILIDADES ACTUALIZADAS**

| Comportamiento | Probabilidad | Condición | Intervalo |
|---------------|--------------|-----------|-----------|
| **REACCIONES** | | | |
| Anti-drone reactivo | 60% | Jugador lanza dron | Inmediata |
| Mirror anti-drone | 30% | Jugador construye anti-drone | Inmediata |
| Copiar planta nuclear | 25% | Jugador construye planta | Inmediata |
| Dron reactivo a planta | 35% | Jugador construye planta + currency | Inmediata |
| Ignorar planta | 40% | Jugador construye planta sin currency | Inmediata |
| Copiar hospital | 20% | Jugador construye hospital | Inmediata |
| Dron reactivo a hospital | 30% | Jugador construye hospital + currency | Inmediata |
| Ignorar hospital | 50% | Jugador construye hospital sin currency | Inmediata |
| **HARASS (Early Game)** | | | |
| Skip harass | 40% | Random | 25s |
| Lanzar sniper | 60% | 120-249$, sin amenazas | 25s |
| **ATAQUE OFENSIVO** | | | |
| Early (<150$) - FOB | 70% | FOBs < 2 | 40s |
| Early (<150$) - Skip | 30% | Random | 40s |
| Mid (150-299$) - Lanzadera | 80% | Sin lanzadera, ≥200$ | 40s |
| Mid (150-299$) - Sniper | 30% | Random | 40s |
| Mid (150-299$) - FOB | 40% | FOBs < 2 | 40s |
| Mid (150-299$) - Skip | 30% | Random | 40s |
| Late (≥300$) - Dron | 50-80% | Según estado | 40s |
| Late (≥300$) - FOB | Variable | FOBs < 2 | 40s |
| Late (≥300$) - Skip | 5-15% | Según estado | 40s |
| **CONSTRUCCIÓN** | | | |
| FOB estratégico | 80% | **180$+**, <2 FOBs | 8s |
| Planta nuclear | 70% | **250$+**, <2 Plantas | 8s |
| **EMERGENCIAS MÉDICAS** | | | |
| Fallar respuesta | 20% | Random | Continuo |
| Enviar ambulancia | 80% | Fuentes disponibles | Continuo |

---

## ⏱️ **COOLDOWNS**

- **Iniciativa**: 20.0s entre intentos (evita spam)
- **Harass Sniper**: 25.0s entre verificaciones
- **Ataque Ofensivo**: 40.0s entre decisiones
- **Construcciones**: 8.0s entre ciclos
- **Truck Factory**: 180.0s (3 minutos) entre spawns
- **Reacción**: 3.0s ventana de reacción a acciones del jugador

---

## 🎯 **OBJETIVOS DE DRONES**

### **Jugador puede atacar:**
- ✅ `enemy_fob` (FOBs enemigos)
- ✅ `nuclearPlant` + `team: 'enemy'` (Plantas nucleares enemigas)
- ✅ `antiDrone` + `team: 'enemy'` (Anti-drones enemigos)
- ✅ `droneLauncher` + `team: 'enemy'` (Lanzaderas enemigas)
- ✅ `campaignHospital` + `team: 'enemy'` (Hospitales enemigos)

### **IA puede atacar:**
- ✅ `fob` + `team: 'ally'` (FOBs aliados)
- ✅ `nuclearPlant` + `team: 'ally'` (Plantas nucleares aliadas)
- ✅ `campaignHospital` + `team: 'ally'` (Hospitales aliados)
- ✅ `droneLauncher` + `team: 'ally'` (Lanzaderas aliadas - si se destruye, no más drones)

### **Sistema de Scoring de Objetivos:**
```
Score Base:
├─ FOB: 45 puntos
├─ Planta Nuclear: 55 puntos
└─ Hospital: 50 puntos

Modificadores por Fase:
├─ Early Game (jugador <200$):
│   ├─ Planta: +25 (total: 80) - MÁXIMA PRIORIDAD (destruir antes de ROI)
│   ├─ Hospital: +20 (total: 70)
│   └─ FOB: +15 (total: 60)
│
├─ Mid Game (jugador 200-399$):
│   ├─ Planta: +20 (total: 75)
│   ├─ Hospital: +15 (total: 65)
│   └─ FOB: +15 (total: 60)
│
└─ Late Game (jugador ≥400$):
    ├─ Planta: +30 (total: 85) - MÁXIMA PRIORIDAD
    ├─ Hospital: +20 (total: 70)
    └─ FOB: +10 (total: 55)

Bonus Crítico:
├─ Planta <120s antigüedad: +40 puntos (destruir antes de ROI)
└─ Hospital <120s antigüedad: +25 puntos

Multiplicador por Cantidad:
├─ ≥2 Plantas: +35 puntos (economía multiplicada)
├─ ≥2 Hospitales: +25 puntos
└─ ≥4 FOBs: -15 puntos (diversificar)

Factor Aleatorio: ±10 puntos
```

---

## 📈 **ANÁLISIS DE ESTADO DE PARTIDA**

### **Factores Evaluados:**

#### **1. Factor FOBs (±2 puntos):**
```
FOBs enemigos vs aliados:
├─ Enemigos < Aliados - 2 → Score -2 (muy por debajo)
├─ Enemigos < Aliados - 1 → Score -1 (por debajo)
├─ Enemigos > Aliados → Score +1 (por encima)
└─ Iguales → Score 0
```

#### **2. Factor Territorio (±2 puntos):**
```
Posición X promedio de frentes enemigos:
├─ < Centro - 200px → Score -2 (muy atrás)
├─ < Centro → Score -1 (atrás)
├─ > Centro + 200px → Score +2 (muy adelante)
├─ > Centro → Score +1 (adelante)
└─ En centro → Score 0
```

#### **3. Factor Economía (±1 punto):**
```
Currency IA vs Jugador:
├─ < 50% del jugador → Score -1 (muy pobre)
├─ > 150% del jugador → Score +1 (rico)
└─ Entre 50-150% → Score 0
```

### **Estados Resultantes:**
```
Score Total:
├─ ≤ -3 → DESPERATE (solo sobrevivir)
├─ ≤ -1 → LOSING (priorizar recuperación)
├─ ≥ +2 → WINNING (ser agresivo)
└─ Resto → EVEN (balanceado)
```

---

## 🆕 **NUEVO: SISTEMA DE LANZADERA DE DRONES**

### **Requisito para Drones:**
- ✅ IA debe construir lanzadera antes de usar drones
- ✅ Costo: 200$ (sin margen - inversión crítica)
- ✅ Construcción: Mid-game (≥200$) con 80% probabilidad
- ✅ Late-game: Si quiere drones y no tiene lanzadera → la construye automáticamente

### **Flujo de Habilitación:**
```
1. IA acumula 200$+
2. OPCIÓN A - Mid-game (150-299$): 80% probabilidad → Construir lanzadera
3. OPCIÓN B - Late-game (≥300$): Si quiere dron pero no tiene lanzadera → Construirla
4. OPCIÓN C - Iniciativa: Si jugador inactivo y no tiene lanzadera → Construirla
5. Lanzadera construida → Drones desbloqueados
6. Si lanzadera destruida → Drones bloqueados hasta reconstruir
```

### **Impacto en Balanceo:**
- **Primera inversión**: 200$ (lanzadera) antes del primer dron
- **Trade dron**: 175$ dron vs objetivo (requiere 375$ total primera vez)
- **Contrajuego**: Destruir lanzadera enemiga bloquea sus drones
- **Riesgo compartido**: Ambos bandos necesitan lanzadera
- **IA agresiva**: Construye lanzadera automáticamente si la necesita (80% mid, 100% late)

---

## 📍 **POSICIONAMIENTO INTELIGENTE**

### **FOBs - Distribución 3 Zonas (Eje X):**
```
Espacio entre frente y HQ dividido en:
├─ Zona 1 (0-33%): Cerca del frente
├─ Zona 2 (33-67%): Intermedia
└─ Zona 3 (67-100%): Cerca del HQ

Algoritmo:
1. Contar FOBs en cada zona
2. Elegir zona con menos FOBs
3. Posición = Centro de zona ± 50px random
```

### **FOBs - Distribución 2 Mitades (Eje Y):**
```
Mapa dividido en:
├─ Mitad Superior (0-50%)
└─ Mitad Inferior (50-100%)

Algoritmo:
1. Contar FOBs en cada mitad
2. Elegir mitad con menos FOBs
3. Posición = 25% o 75% de altura ± 75px random
```

### **Plantas Nucleares:**
```
Posición: Radio aleatorio del HQ enemigo
├─ Ángulo: Random (0-360°)
├─ Distancia: 150-250px del HQ
└─ Objetivo: Zona segura (retaguardia)
```

### **Lanzadera de Drones:**
```
Posición: Retaguardia enemiga
├─ X: WorldWidth - 200px (cerca del borde)
├─ Y: Centro del mapa (altura/2)
└─ Objetivo: Protegida pero funcional
```

---

## 🧠 **CARACTERÍSTICAS INTELIGENTES**

### **1. Tracking de Acciones del Jugador:**
- Registra drones, construcciones, etc.
- Ventana de reacción: 3 segundos
- Permite respuestas tácticas inmediatas

### **2. Gestión de Emergencias Médicas:**
- Set de emergencias ya atendidas
- Evita múltiples ambulancias a mismo frente
- 20% probabilidad de fallo (realismo)

### **3. Sistema de Iniciativa:**
- Si jugador inactivo 15s → IA toma la iniciativa
- Cooldown 20s entre iniciativas
- Requiere lanzadera para ejecutar

### **4. Análisis de Estado Dinámico:**
- Evalúa FOBs, territorio y economía
- Ajusta agresividad según situación
- Winning → 80-90% drones
- Losing → Construcciones defensivas

### **5. Priorización de Objetivos:**
- Sistema de scoring complejo
- Considera tipo, fase de juego, antigüedad
- 30% probabilidad de atacar 2º mejor objetivo (variedad)

---

## 🔄 **FLUJO DE ACTUALIZACIÓN (update)**

```
1. Actualizar currency pasiva (cada frame)
2. Obtener nodos enemigos (caché local)
3. Verificar FOBs (cada 2s)
4. Verificar Frentes (cada 3s)
5. Reaccionar al jugador (continuo)
6. Modo emergencia FOB (cada 3s)
   └─ Si emergencia → DETENER otros comportamientos
7. Harass sniper (cada 25s)
8. Ataque ofensivo (cada 40s)
9. Construcciones estratégicas (cada 8s)
10. Truck Factory (cada 180s)
11. Responder emergencias médicas (continuo)
```

---

## 🐛 **CORRECCIONES RECIENTES**

### **Bugs Arreglados:**
1. ✅ Rolls compartidos en mid-game (ahora independientes)
2. ✅ Rolls compartidos en late-game (ahora independientes)
3. ✅ Cooldown redundante de FOB automático (eliminado)
4. ✅ Iniciativa sin cooldown (agregado 20s)
5. ✅ Spam de logs sin lanzadera (solo en debug)
6. ✅ Sniper harass muy raro (40% skip, reserva 40$)
7. ✅ **CRÍTICO**: IA bloqueada sin lanzadera en late-game (ahora la construye automáticamente)
8. ✅ **CRÍTICO**: IA pasiva en early game - Umbrales demasiado altos (reducidos significativamente)

### **Mejoras Implementadas:**
- Cada decisión usa su propio número aleatorio
- Sniper más frecuente en early game
- Logs limpios en modo producción
- Iniciativa controlada sin spam
- **Construcción proactiva de lanzadera**: 80% en mid-game, 100% en late-game si necesita drones
- **Umbral reducido lanzadera**: 200$ en vez de 250$ (más accesible)
- **IA más agresiva**: No se queda esperando, construye prerequisitos automáticamente
- **Early game activo**:
  - FOB: 150$ en vez de 250$ (margen reducido de 20$ en early)
  - Planta: 250$ en vez de 350$
  - Decisión ofensiva: 80$ en vez de 100$
  - Probabilidades aumentadas (FOB 80%, Planta 70%)

---

## 🎮 **PATRONES DE JUEGO RESULTANTES**

### **Early Game (0-150$):**
- **Construcción agresiva de FOBs** (80% prob desde 150$, cada 8s)
- **Decisiones ofensivas** (desde 80$, cada 40s):
  - 70% construir FOB
  - 30% ahorrar
- Harass ocasional con sniper (60% de las veces, cada 25s)
- Respuesta médica a emergencias

### **Mid Game (150-299$):**
- **PRIORIDAD**: Construir lanzadera (80% prob, desde 200$)
- Mix de sniper (30%), FOBs (40%), skip (30%)
- Reacciones a plantas/hospitales del jugador

### **Late Game (≥300$):**
- **Lanzadera automática**: Si necesita drones y no tiene lanzadera → la construye (100%)
- Presión ofensiva con drones (75-90%)
- Construcciones automáticas
- Respuestas agresivas

### **Estado Desperate/Losing:**
- Solo construcciones defensivas
- NO hacer harass ni ataques
- Priorizar FOBs y plantas para recuperarse
