# 🤖 Guía de IA Enemiga - Supply Line Commander

## 📋 Descripción General

El sistema de IA enemiga (`EnemyAISystem.js`) es un módulo completamente aislado que controla las decisiones del enemigo basándose en **reglas simples y claras**.

### Características Principales:
- ✅ **Modular**: Completamente separado del resto de sistemas
- ✅ **Basado en reglas**: Fácil de entender y modificar
- ✅ **Extensible**: Añadir nuevas reglas es trivial
- ✅ **Debuggable**: Sistema de logs completo
- ✅ **Configurable**: Se puede desactivar o ajustar fácilmente

---

## ⚙️ Cómo Funciona

### APM (Acciones Por Minuto) Simuladas

La IA **NO piensa cada frame**, sino que cada comportamiento tiene su **propio intervalo** (configurable):

```javascript
this.fobCheckInterval = 2.0;                // Comprobar FOBs cada 2 segundos
this.frontCheckInterval = 3.0;              // Comprobar Frentes cada 3 segundos
this.reactCheckInterval = 2.5;              // Reaccionar al jugador cada 2.5 segundos
this.harassCheckInterval = 25.0;            // Harass con sniper cada 25 segundos (early game)
this.emergencyFobCheckInterval = 3.0;       // EMERGENCIA: Revisar si necesita FOB cada 3 segundos
this.offensiveCheckInterval = 40.0;         // Ataque programado cada 40 segundos
this.buildCheckInterval = 8.0;              // Construcciones estratégicas cada 8 segundos
```

Esto hace que la IA sea:
- ✅ **Más eficiente** (no sobrecarga el CPU)
- ✅ **Más humana** (tiempo de reacción realista)
- ✅ **Más predecible** (para balanceo)
- ✅ **Más personalizable** (cada comportamiento es independiente)

### Sistema de Currency Enemiga

La IA tiene su **propio sistema de currency**, completamente independiente del jugador:

**Generación Pasiva:**
- Base: 2$/segundo (igual que el jugador)
- Plantas Nucleares enemigas: +2$/segundo por planta

**Generación por Avance:**
- Por cada pixel que el frente enemigo avanza (hacia la izquierda): +1$

**Limitaciones:**
- HQ enemigo: 4 camiones (igual que el aliado)
- FOB enemigo: 2 camiones
- La IA debe gastar currency para construir edificios y lanzar drones

### Estructura de Actualización

```javascript
update(dt) {
    // === COMPORTAMIENTO 1: Comprobar FOBs cada 2 segundos ===
    this.fobCheckTimer += dt;
    if (this.fobCheckTimer >= this.fobCheckInterval) {
        this.fobCheckTimer = 0;
        this.ruleResupplyFOBs(enemyHQ, enemyFOBs);
    }
    
    // === COMPORTAMIENTO 2: Comprobar Frentes cada 3 segundos ===
    this.frontCheckTimer += dt;
    if (this.frontCheckTimer >= this.frontCheckInterval) {
        this.frontCheckTimer = 0;
        this.ruleResupplyFronts(enemyHQ, enemyFOBs, enemyFronts);
    }
    
    // Más comportamientos pueden añadirse aquí...
}
```

---

## 📖 Reglas Actuales

### REGLA 1: Reabastecer FOBs con <50% suministros

**Frecuencia**: Cada **2 segundos**

**Condición**: FOB enemigo tiene menos del 50% de sus suministros máximos

**Acción**: Enviar camión desde el HQ enemigo al FOB

**Comportamiento**: Revisa **TODOS los FOBs** y envía a todos los que cumplan la condición (hasta agotar vehículos disponibles)

**Código**:
```javascript
ruleResupplyFOBs(enemyHQ, enemyFOBs) {
    for (const fob of enemyFOBs) {
        const supplyPercentage = (fob.supplies / fob.maxSupplies) * 100;
        
        if (supplyPercentage < 50) {
            this.sendSupplyConvoy(enemyHQ, fob);
            // Continúa revisando otros FOBs (no hace return)
        }
    }
}
```

### REGLA 2: Reabastecer Frentes con <50% suministros

**Frecuencia**: Cada **3 segundos**

**Condición**: Frente enemigo tiene menos del 50% de sus suministros máximos

**Acción**: 
1. Buscar FOB más cercano con recursos y vehículos disponibles
2. Si hay FOB disponible → Enviar desde FOB
3. Si NO hay FOB disponible → Enviar desde HQ

**Comportamiento**: Revisa **TODOS los Frentes** y envía a todos los que cumplan la condición (hasta agotar vehículos disponibles)

**Estrategia**: Prioriza FOBs cercanos para eficiencia logística

---

### REGLA 3: Reaccionar a las Acciones del Jugador

**Frecuencia**: Cada **2.5 segundos**

**Condiciones y Reacciones**:

#### 🎯 **Jugador lanza Dron → IA coloca Anti-Drone**
- **Probabilidad**: 60% de éxito (40% de fallar en detectarlo)
- **Acción**: Coloca anti-drone enemigo cerca del objetivo del dron
- **Variación**: Pequeño offset aleatorio para no ser exacto
- **Costo**: 125$ (precio del anti-drone)

#### 🏗️ **Jugador construye Anti-Drone → IA copia en Mirror**
- **Probabilidad**: 30% de éxito (70% de ignorarlo)
- **Acción**: Construye anti-drone en posición espejo
- **Posición Mirror**: `mirrorX = centerX + (centerX - playerX)`, misma Y
- **Costo**: 125$

#### ⚡ **Jugador construye Planta Nuclear → IA REACCIONA AGRESIVAMENTE**
- **40% - Copiar en Espejo**: Carrera económica (ambos aceleran)
- **60% - Lanzar Dron Reactivo**: Si IA tiene ≥225$ (175$ + 50$ margen)
  - **Objetivo**: Destruir la planta ANTES de que se pague (ROI = 100s)
  - **Reacción inmediata** (no espera a late game)
  - **Crítico**: Evita que la planta genere valor
- **Si no tiene dinero**: Ignora (se arriesga a que la planta se pague)

#### 🏥 **Jugador construye Hospital → IA considera amenaza médica**
- **30% - Copiar en Espejo**: Construye hospital enemigo
- **40% - Lanzar Dron Reactivo**: Si IA tiene ≥225$
  - **Objetivo**: Reducir capacidad de respuesta a snipers
  - **Reacción inmediata**
- **30% - Ignorar**: Decide que no es amenaza crítica

#### 💡 **Iniciativa: Jugador inactivo 15+ segundos sin lanzar dron**
- **Acción**: IA lanza dron enemigo contra objetivo PRIORIZADO (usa scoring)
- **Frecuencia**: Solo si han pasado 15+ segundos desde el último dron del jugador
- **Objetivo**: Usa sistema de priorización inteligente
- **Costo**: 175$ (precio del dron)

---

### REGLA 4: 🚨 MODO EMERGENCIA - Construcción de FOB

**Frecuencia**: Cada **3 segundos** (MÁXIMA PRIORIDAD)

**Condición**: 
- La IA tiene **0 FOBs** enemigos
- La IA tiene suficiente currency (180$)

**Acción**: 
- Construir FOB enemigo **inmediatamente**
- **Distribución inteligente (Eje X)**:
  - Divide el espacio (frente → HQ) en 3 zonas
  - **Elige la zona con MENOS FOBs** (preferencia zona central 50% en emergencia)
  - Variación: ±50px
  - **Resultado**: Los FOBs se distribuyen a lo largo de la línea logística
- **Distribución inteligente (Eje Y)**: 
  - Cuenta FOBs enemigos en mitad superior e inferior del mapa
  - **Elige la mitad con MENOS FOBs**
  - Centrado en 25% (superior) o 75% (inferior) con variación ±75px
  - **Resultado**: Distribución equilibrada arriba/abajo del mapa

**Comportamiento**:
- Si se activa la emergencia, **detiene** todos los demás comportamientos en ese ciclo
- FOB construido con **50% de recursos** iniciales
- Si no hay frentes, coloca el FOB 200px a la izquierda del HQ

**Estrategia**: Sin FOBs, la IA no puede mantener presión en el frente. Esta regla asegura recuperación rápida y distribución natural.

---

### REGLA 5: Harass con Sniper (Solo si NO hay Amenazas)

**Frecuencia**: Cada **25 segundos** (pero NO siempre se ejecuta)

**Condición**:
- Currency entre **120$ y 249$** (early game)
- Jugador **NO** tiene Plantas Nucleares ni Hospitales construidos
- **40% de probabilidad** de ejecutarse (60% skip - más conservador)
- Reserva económica: Currency ≥ 160$ (80$ + 80$ reserva)
- Hay al menos 1 frente aliado disponible
- El frente objetivo NO tiene emergencia médica activa

**Acción**:
- Lanza **sniper strike** contra frente aliado aleatorio
- Crea emergencia médica (+30% consumo de munición si no se atiende)
- Reproduce sonido de disparo y animación de kill feed
- Costo: 80$ (muy económico)

**Estrategia**: 
- **Harass oportunista** solo si el jugador juega defensivo/pasivo
- Si jugador construye amenazas → IA deja de harass y se enfoca en respuestas serias
- Conserva reserva económica más grande (no se arruina)
- Se desactiva automáticamente cuando llega a mid game (≥250$)

---

### REGLA 6: Respuesta Médica a Emergencias

**Frecuencia**: **CONTINUO** (cada frame)

**Origen de las emergencias**:
- **Emergencias aleatorias**: El `MedicalEmergencySystem` global crea emergencias cada 30 segundos (80% probabilidad) en **cualquier frente** (aliado o enemigo)
- **Sniper Strike**: El jugador puede crear emergencias manualmente en frentes enemigos
- La IA **solo responde** a emergencias, no las crea

**Condición**:
- Hay frentes enemigos con emergencia médica activa

**Acción**:
- Buscar fuentes de ambulancias disponibles:
  1. **HQ enemigo** (siempre tiene 1 ambulancia)
  2. **Hospitales enemigos** construidos (1 ambulancia cada uno)
- Encontrar la fuente más cercana al frente con emergencia
- Enviar ambulancia al frente
- **Probabilidad de fallo**: 20% (la IA a veces falla en responder)

**Tracking**:
- La IA guarda un registro de emergencias ya atendidas para no enviar múltiples ambulancias al mismo frente
- Se limpia automáticamente cuando la emergencia se resuelve

**Estrategia**: Respuesta reactiva tanto a emergencias aleatorias como a los ataques del jugador con sniper strike.

---

### REGLA 7: Ataque Ofensivo Programado (Adaptativo)

**Frecuencia**: Cada **40 segundos**

**Very Early Game (< 150$)**:
- **Decisión**: 70% Construir FOB / 30% Ahorrar
- **Estrategia**: Priorizar desarrollo económico y logístico
- No lanzar ataques si la economía es frágil

**Early/Mid Game (150-299$)**:
- **Decisión**: 30% Sniper / 40% FOB (si tiene <2) / 30% Ahorrar
- **Estrategia**: Balance entre harass, desarrollo y ahorro
- Más conservador que antes

**Late Game (≥ 300$)**:
- **Si tiene <2 FOBs**: 50% Dron / 35% FOB / 15% Reservar
- **Si tiene ≥2 FOBs**: 75% Dron / 25% Acumular
- **Estrategia**: Presión ofensiva pero con períodos de acumulación

**Comportamiento General**:
- ✅ Se adapta automáticamente según la economía
- ✅ Incluye probabilidades de "no hacer nada" (ahorrar)
- ✅ Más aleatoriedad = IA menos predecible
- ✅ Evita spam de ataques que arruinen su economía

**Sistema de Priorización Inteligente de Objetivos (Drones)**:

Cuando la IA lanza un dron, NO ataca FOBs aleatoriamente. Calcula un **score estratégico** para cada objetivo:

**📊 Score Base:**
- FOB: 50 puntos (logística crítica)
- Planta Nuclear: 40 puntos (economía)
- Hospital de Campaña: 35 puntos (respuesta médica)

**🎮 Modificadores por Fase del Juego:**
- **Early (<200$)**: FOB +30, Planta -10, Hospital -5
- **Mid (200-399$)**: FOB +15, Planta +10, Hospital +10
- **Late (≥400$)**: Planta +25, Hospital +15, FOB +10

**📈 Multiplicadores por Cantidad:**
- Si jugador tiene ≥2 Plantas: +30 puntos (economía acelerada → destruir)
- Si jugador tiene ≥2 Hospitales: +20 puntos (reducir capacidad médica)
- Si jugador tiene ≥3 FOBs: -10 puntos (ya tiene red sólida)

**🎲 Factor Aleatorio:**
- ±10 puntos de variación
- 30% probabilidad de atacar el 2do mejor objetivo

**Ejemplos:**
- Early: 1 FOB (80) vs 1 Planta (30) → **Ataca FOB**
- Late: 1 FOB (60) vs 2 Plantas (95) → **Ataca Planta**
- Mid: 3 FOBs (55) vs 1 Hospital (45) vs 1 Planta (50) → **Variable**

---

### REGLA 8: Construcciones Estratégicas

**Frecuencia**: Cada **8 segundos**

**Prioridades**:

#### 1️⃣ FOB (Expansión Logística)
- **Condición**: 
  - Currency ≥250$
  - Menos de 2 FOBs enemigos
  - 70% de probabilidad de éxito
- **Distribución inteligente (Eje X)**:
  - Divide el espacio (frente → HQ) en **3 zonas**: 25%, 50%, 75%
  - Cuenta FOBs en cada zona
  - **Elige la zona con MENOS FOBs**
  - Si hay empate, elige aleatoriamente entre las zonas vacías
  - Variación: ±50px para evitar posiciones exactas
  - **Resultado**: Los FOBs se distribuyen a lo largo de toda la línea logística
- **Distribución inteligente (Eje Y)**:
  - Cuenta FOBs enemigos en mitad superior e inferior del mapa
  - **Elige la mitad con MENOS FOBs**
  - Centrado en 25% (superior) o 75% (inferior) con variación ±75px
  - **Resultado**: Distribución equilibrada arriba/abajo del mapa
- **Recursos iniciales**: 50%

#### 2️⃣ Planta Nuclear (Boost Económico)
- **Condición**:
  - Currency ≥350$
  - Menos de 2 plantas nucleares enemigas
  - 60% de probabilidad de éxito
- **Posicionamiento**:
  - Cerca del HQ (zona segura)
  - Radio: 150-250px del HQ
  - Ángulo aleatorio para distribución
- **Beneficio**: +2$/segundo por planta

**Comportamiento**:
- Solo construye **1 edificio por ciclo** (evita gastar todo el dinero de golpe)
- FOBs tienen prioridad sobre Plantas Nucleares
- Elementos probabilísticos añaden variabilidad al gameplay

**Estrategia**: Expandir economía y logística gradualmente para sostener presión a largo plazo

---

## 🛠️ Cómo Añadir Nuevas Reglas

### Paso 1: Crear el método de regla

```javascript
/**
 * REGLA 3: Ejemplo - Construir Anti-Drones cuando hay amenaza
 */
ruleBuildAntiDrones(enemyHQ) {
    // Detectar si hay drones aliados cerca
    const allyDrones = this.game.droneSystem.drones.filter(d => !d.isEnemy);
    
    if (allyDrones.length > 0 && this.game.currency.canAfford(150)) {
        // Construir anti-dron (implementar lógica)
        console.log('🤖 IA: Construyendo Anti-Dron defensivo');
    }
}
```

### Paso 2: Añadirla al ciclo de pensamiento

```javascript
think() {
    // ... código existente ...
    
    // Añadir nueva regla
    this.ruleBuildAntiDrones(enemyHQ);
}
```

### Paso 3: ¡Listo!

La IA automáticamente ejecutará la nueva regla cada 2 segundos.

---

## 🎮 Comandos de Debug

Desde la consola del navegador (F12):

### Activar modo debug (logs detallados)
```javascript
window.game.enemyAI.setDebugMode(true);
```

**Output**:
```
🤖 IA Debug Mode: ON
🤖 IA: Enviando suministros al FOB enemigo (34% suministros)
🤖 IA: Enviando suministros al Frente enemigo (22% suministros)
```

### Ver estadísticas de la IA
```javascript
window.game.enemyAI.getStats();
```

**Output**:
```javascript
{
    decisions: 45,      // Decisiones totales tomadas
    suppliesSent: 32,   // Convoyes de suministros enviados
    medicsSent: 8       // Ambulancias enviadas
}
```

### Desactivar la IA completamente
```javascript
window.game.enemyAI.setEnabled(false);
```

### Reactivar la IA
```javascript
window.game.enemyAI.setEnabled(true);
```

### Forzar pensamiento inmediato
```javascript
window.game.enemyAI.think();
```

---

## 🧪 Testing

### Test Básico: ¿La IA envía camiones?

1. Inicia el juego
2. Abre consola (F12)
3. Activa debug: `window.game.enemyAI.setDebugMode(true)`
4. Espera a que los FOBs enemigos consuman suministros
5. Cada 2 segundos, deberías ver: `🤖 IA: Enviando suministros al FOB enemigo`

### Test Avanzado: Estadísticas

1. Juega una partida completa
2. Al finalizar: `window.game.enemyAI.getStats()`
3. Verifica que `suppliesSent > 0`

---

## 🔧 Configuración

### Ajustar intervalo de pensamiento

En `EnemyAISystem.js`:
```javascript
this.thinkInterval = 1.5; // Pensar cada 1.5 segundos (más agresivo)
this.thinkInterval = 3.0; // Pensar cada 3 segundos (más pasivo)
```

### Ajustar umbral de reabastecimiento

En la regla específica:
```javascript
if (supplyPercentage < 30) { // Más agresivo (espera hasta 30%)
if (supplyPercentage < 70) { // Más defensivo (reabastece antes)
```

---

## 📊 Integración con el Juego

### Inicialización
```javascript
// Game.js - constructor
this.enemyAI = new EnemyAISystem(this);
```

### Update Loop
```javascript
// Game.js - update(dt)
if (this.missionStarted) {
    this.enemyAI.update(dt);
}
```

### Reset al iniciar misión
```javascript
// Game.js - startMission()
this.enemyAI.reset();
```

---

## 🎯 Ideas para Futuras Reglas

### Reglas Logísticas:
- ✅ Reabastecer FOBs (IMPLEMENTADA)
- ✅ Reabastecer Frentes (IMPLEMENTADA)
- ✅ Construir nuevos FOBs si la distancia es muy grande (IMPLEMENTADA)
- ✅ Responder a emergencias médicas (IMPLEMENTADA)

### Reglas Ofensivas:
- ✅ Lanzar drones contra FOBs aliados (IMPLEMENTADA - Regla 7 late game)
- ✅ Lanzar sniper strikes contra frentes aliados (IMPLEMENTADA - Regla 5 y 7 early/mid)
- ✅ Reaccionar a acciones del jugador (IMPLEMENTADA - Regla 3)
- ✅ Adaptar estrategia según economía (IMPLEMENTADA - Regla 7: sniper early, drones late)
- 🔲 Bombardeos coordinados múltiples

### Reglas Defensivas:
- ✅ Construir Anti-Drones cuando detecta amenaza (IMPLEMENTADA - Regla 3)
- ✅ Construir FOBs de emergencia (IMPLEMENTADA - Regla 4)
- 🔲 Construir Hospitales en frentes críticos
- 🔲 Reparar/reconstruir FOBs destruidos

### Reglas Económicas:
- ✅ Construir Plantas Nucleares para acelerar economía (IMPLEMENTADA - Regla 7)
- ✅ Decidir entre invertir en defensa vs economía vs ofensiva (IMPLEMENTADA - Reglas 5 y 7)

---

## 🐛 Troubleshooting

### La IA no hace nada

**Causas posibles**:
1. La IA está desactivada: `window.game.enemyAI.setEnabled(true)`
2. No hay nodos enemigos: Verificar que la misión tenga `enemy_hq`, `enemy_fob`, etc.
3. Los nodos enemigos tienen suministros infinitos (HQ): Revisar configuración

**Debug**:
```javascript
window.game.enemyAI.setDebugMode(true);
window.game.enemyAI.think(); // Forzar pensamiento
```

### La IA spam demasiado

**Solución**: Aumentar `thinkInterval`
```javascript
this.thinkInterval = 3.0; // Más lento
```

### La IA es muy lenta

**Solución**: Disminuir `thinkInterval`
```javascript
this.thinkInterval = 1.0; // Más rápido
```

---

## 📝 Notas de Diseño

### Filosofía de la IA:
- **Simple > Complejo**: Reglas claras mejor que ML complicado
- **Predecible**: El jugador puede aprender los patrones
- **Modular**: Fácil de extender sin romper nada
- **Debuggable**: Siempre se puede ver qué está pensando

### Limitaciones Intencionadas:
- Solo 1 acción por ciclo de pensamiento (más humano)
- No tiene "memoria" de decisiones pasadas (stateless)
- No anticipa movimientos del jugador (reactivo, no predictivo)

### Ventajas del Sistema:
- ✅ Performance excelente (no chequea cada frame)
- ✅ Fácil de balancear (ajustar umbrales y tiempos)
- ✅ Extensible sin límites (añadir reglas infinitas)

---

¡El sistema está listo para jugar! 🎮












