# 🤖 SISTEMA DE IA MODULAR v2.0

## 📋 **DESCRIPCIÓN**

Sistema de IA completamente rediseñado usando **arquitectura modular** y **scoring contextual** para decisiones inteligentes y adaptativas.

---

## 🏗️ **ARQUITECTURA**

```
src/ai/
├── AIDirector.js              # 🎯 Coordinador principal
├── core/
│   ├── StateAnalyzer.js       # 📊 Análisis de estado del juego
│   ├── ActionEvaluator.js     # ⚖️ Scoring contextual de acciones
│   └── ThreatAnalyzer.js      # 🚨 Detección de amenazas
├── strategies/                 # (Futuro) Estrategias específicas
├── actions/                    # (Futuro) Módulos de acción
└── config/
    └── AIConfig.js            # ⚙️ Configuración centralizada
```

---

## 🎯 **COMPONENTES PRINCIPALES**

### **1. AIDirector** (Coordinador)
- Orquesta todos los sistemas de IA
- Maneja timers e intervalos
- Ejecuta comportamientos basados en prioridades
- Delega decisiones a componentes especializados

**Flujo de actualización (cada frame):**
1. Amenazas inmediatas (máxima prioridad)
2. Emergencias médicas
3. Reabastecimiento (cada 2s)
4. Construcciones estratégicas (cada 8s)
5. Decisiones ofensivas (cada 35-45s variable)
6. Harass con sniper (cada 25s)
7. Iniciativa (si jugador inactivo)

### **2. StateAnalyzer** (Análisis)
- Analiza el estado completo del juego
- Identifica fase (early/mid/late)
- Evalúa economía, territorio, capacidades militares
- Detecta amenazas y calcula urgencia

**Métricas que proporciona:**
- Fase del juego (early/mid/late)
- Estado estratégico (desperate/losing/even/winning)
- Economía (income, plantas, diferencial)
- Territorio (FOBs, control)
- Amenazas activas

### **3. ActionEvaluator** (Decisiones)
- Evalúa todas las acciones posibles usando **scoring contextual**
- Considera el contexto del juego para cada decisión
- Ajusta márgenes de seguridad dinámicamente
- Recomienda la mejor acción

**Sistema de scoring:**
```javascript
score = base + contextualModifiers

Ejemplo Planta Nuclear:
- Base: 50 pts
- +30 pts por cada planta del jugador
- -25 pts por cada planta mía
- +40 pts si mi economía está detrás
- -20 pts en early game
```

### **4. ThreatAnalyzer** (Reacciones)
- Detecta amenazas inmediatas
- Registra acciones del jugador
- Determina respuestas apropiadas
- Calcula urgencia global

**Tipos de amenazas:**
- 🚁 Drones enemigos → Construir anti-drone
- 🏭 Plantas nucleares → Copiar o destruir con dron
- 🏥 Hospitales → Respuesta táctica
- 💰 Gap económico → Acelerar construcción
- 🏗️ Pérdida de territorio → FOBs de emergencia

---

## ⚙️ **CONFIGURACIÓN**

Toda la configuración está centralizada en `AIConfig.js`:

```javascript
// Umbrales (se ajustan dinámicamente)
thresholds: {
    earlyGame: 200,
    midGame: 400,
    minCurrencyToAct: 80
}

// Márgenes de seguridad
margins: {
    normal: 50,
    earlyGame: 20,
    desperate: 10,
    winning: 80
}

// Pesos de scoring
scoring: {
    fob: { base: 40, perExistingFOB: -25, ... },
    plant: { base: 50, perPlayerPlant: 30, ... },
    ...
}
```

---

## 🔄 **FLUJO DE DECISIÓN**

### **Decisión Tradicional (OLD):**
```javascript
if (currency >= 250 && Math.random() < 0.7) {
    buildPlant();
}
```
❌ **Problemas:**
- Ignora contexto
- Umbral fijo
- RNG puede fallar
- Predecible

### **Decisión Contextual (NEW):**
```javascript
1. StateAnalyzer analiza el juego
2. ActionEvaluator evalúa todas las acciones:
   - FOB: score = 40 + (contexto)
   - Plant: score = 50 + (contexto)
   - Drone: score = 45 + (contexto)
   - ...
3. Filtra por currency disponible (con margen dinámico)
4. Ordena por score
5. Ejecuta la mejor acción
```
✅ **Ventajas:**
- Considera contexto completo
- Umbrales dinámicos
- Determinista en lo crítico
- Impredecible en timing

---

## 📊 **VENTAJAS DEL NUEVO SISTEMA**

| Aspecto | Sistema Viejo | Sistema Nuevo |
|---------|--------------|---------------|
| **Decisiones** | Umbrales fijos + RNG | Scoring contextual |
| **Timing** | Intervalos fijos | Variable + event-driven |
| **Adaptación** | Ninguna | Reacciona a contexto |
| **Urgencia** | No existe | Ajusta umbrales/márgenes |
| **Predictibilidad** | Alta | Baja (timing variable) |
| **RNG crítico** | Puede fallar | Determinista en lo importante |
| **Modularidad** | Archivo monolítico | Componentes separados |
| **Mantenibilidad** | Difícil | Fácil |
| **Extensibilidad** | Complicada | Simple |

---

## 🚀 **EJEMPLOS DE USO**

### **Ejemplo 1: Detección de Amenaza Económica**
```
Jugador construye Planta Nuclear
↓
ThreatAnalyzer detecta amenaza
↓
StateAnalyzer evalúa: "Jugador 2 plantas, yo 0"
↓
ActionEvaluator calcula:
  - Planta: 50 + (2×30) = 110 pts
  - FOB: 40 + ... = 65 pts
  - Dron: 45 + ... = 80 pts
↓
DECISIÓN: Construir Planta (mayor score)
```

### **Ejemplo 2: Estado Desperate**
```
IA pierde todos sus FOBs
↓
StateAnalyzer: state = 'desperate'
↓
ActionEvaluator ajusta:
  - FOB score: +100 pts (URGENTE)
  - Margen: 50$ → 10$ (gastar YA)
↓
DECISIÓN: FOB de emergencia (máxima prioridad)
```

### **Ejemplo 3: Timing Variable**
```
Decisión ofensiva cada 35-45s (aleatorio)
↓
40s: Evalúa acciones → Construye FOB
↓
37s: Evalúa acciones → Lanza dron
↓
42s: Evalúa acciones → Construye planta
```
**Resultado:** Impredecible para el jugador

---

## 🔧 **INTEGRACIÓN CON EL JUEGO**

### **Opción A: Reemplazo Completo (Recomendado)**
```javascript
// En Game.js
import { AIDirector } from './ai/AIDirector.js';

// Crear instancia
this.aiDirector = new AIDirector(this);
this.aiDirector.activate();

// Update
this.aiDirector.update(dt);

// Eventos
this.aiDirector.onPlayerAction('drone', target);
```

### **Opción B: Modo Híbrido (Transición)**
```javascript
// Usar AIDirector para decisiones
// Mantener EnemyAISystem para acciones (legacy)
this.aiDirector = new AIDirector(this);
this.aiDirector.game.enemyAI = this.enemyAI; // Bridge
```

---

## 📈 **MÉTRICAS Y DEBUG**

### **Debug Flags** (AIConfig.js)
```javascript
debug: {
    logScoring: true,      // Ver scores de acciones
    logDecisions: true,    // Ver decisiones tomadas
    logThreats: true,      // Ver amenazas detectadas
    logActions: true       // Ver ejecución de acciones
}
```

### **Reporte de Estado** (cada 30s)
```
🤖 IA DIRECTOR - Estado: EVEN
💰 Currency: 250$ (Income: 5$/s vs 4$/s)
🏗️ Infraestructura: 2 FOBs, 1 Plantas
🚁 Lanzadera: ✅
📊 Stats: 3 Drones, 5 Snipers, 8 Edificios, 23 Decisiones
⚠️ Urgencia: 35/150
```

---

## 🔮 **ROADMAP FUTURO**

### **Fase 2: Estrategias**
- `EarlyGameStrategy.js` - Build orders optimizados
- `MidGameStrategy.js` - Balance expansión/presión
- `LateGameStrategy.js` - Dominio total

### **Fase 3: Acciones Modulares**
- `BuildActions.js` - Lógica de construcción
- `AttackActions.js` - Lógica de ataque
- `SupplyActions.js` - Lógica de suministro

### **Fase 4: Machine Learning** (Opcional)
- Aprendizaje de patrones del jugador
- Ajuste dinámico de pesos de scoring
- Predicción de acciones del jugador

---

## 📚 **REFERENCIAS**

- **Configuración:** `src/ai/config/AIConfig.js`
- **Documentación completa:** `ENEMY_AI_BEHAVIOR_TREE.md` (legacy)
- **Arquitectura del juego:** `ARCHITECTURE.md`

---

**Director de IA:** Claude Sonnet 4.5  
**Versión:** 2.0  
**Fecha:** Octubre 2025

