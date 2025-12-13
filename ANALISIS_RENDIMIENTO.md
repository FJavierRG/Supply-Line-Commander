# 📊 ANÁLISIS DE RENDIMIENTO - ProyectoMil RTS

**Fecha:** 11 de diciembre de 2025  
**Objetivo:** Priorizar optimización en partida para gameplay fluido sin lag

---

## 🎯 RESUMEN EJECUTIVO

El juego es un RTS multijugador tipo Clash Royale con:
- **Arquitectura:** Cliente-Servidor (Socket.IO)
- **Rendering:** Canvas 2D con requestAnimationFrame
- **Estado del juego:** Servidor autoritativo (✅ BUENA ARQUITECTURA)
- **Complejidad:** Proyecto grande (~25K+ líneas, 100+ archivos)

### 🔴 PROBLEMAS CRÍTICOS IDENTIFICADOS

1. **TRIPLE ITERACIÓN de `this.nodes` en el render loop** (CAGADA #1)
2. **Múltiples `forEach` sin early exit** en operaciones críticas
3. **No hay object pooling** para entidades temporales (partículas, explosiones)
4. **Sin batching de draw calls** en Canvas 2D
5. **AssetManager sin lazy loading** - carga todo al inicio
6. **Game.js monolítico** (2501 líneas)

---

## 🚨 CAGADAS GRAVES (PRIORIDAD MÁXIMA)

### 1. ⚠️ TRIPLE ITERACIÓN DE NODOS EN RENDER
**Archivo:** `src/Game.js:1030-1056`

```javascript
// CAGADA: Itera 3 veces sobre this.nodes en CADA frame
// Línea 1030: Renderiza todo excepto fronts
this.nodes.forEach(node => {
    if (node.type !== 'front') { ... }
});

// Línea 1042: Renderiza solo fronts
this.nodes.forEach(node => {
    if (node.type === 'front') { ... }
});

// Línea 1054: Renderiza vehicle UI
this.nodes.forEach(node => {
    this.renderer.renderVehicleUI(node, this);
});
```

**IMPACTO:** 
- Si hay 20 nodos → 60 iteraciones por frame
- A 60 FPS → 3,600 iteraciones/segundo innecesarias
- **SOLUCIÓN:** Un solo bucle con separación en el orden de renderizado

---

### 2. ⚠️ MÚLTIPLES ITERACIONES SIN CACHE

```javascript
// Línea 1063: Convoys
convoys.forEach(convoy => this.renderer.renderConvoy(convoy));

// Línea 1067: Trenes
this.trainSystem.trains.forEach(train => this.renderer.renderTrain(train));

// Línea 1072: Helicópteros
this.helicopters.forEach(heli => { ... });

// Línea 1083: Drones
this.droneSystem.getDrones().forEach(drone => ...);

// Línea 1086: Tanques
this.tankSystem.getTanks().forEach(tank => ...);

// Línea 1089: Artillados ligeros
this.lightVehicleSystem.getLightVehicles().forEach(lightVehicle => ...);

// Línea 1092: Partículas (×3 arrays)
this.particleSystem.getParticles().forEach(p => ...);
this.particleSystem.getExplosionSprites().forEach(e => ...);
this.particleSystem.getDroneExplosionSprites().forEach(e => ...);
```

**PROBLEMA:** `getDrones()`, `getTanks()`, etc. pueden estar creando arrays nuevos en cada frame.

**SOLUCIÓN:** Cachear referencias a los arrays.

---

### 3. ⚠️ SIN OBJECT POOLING

**Archivo:** `src/utils/ParticleSystem.js`

Las partículas se crean y destruyen constantemente:
- Explosiones de drones
- Marcas de impacto
- Textos flotantes
- Sprites cayendo

**PROBLEMA:** Garbage Collection constante → tirones/lag
**SOLUCIÓN:** Implementar object pool para partículas y proyectiles

---

### 4. ⚠️ GAME.JS MONOLÍTICO

**Archivo:** `src/Game.js` (2501 líneas)

Responsabilidades mezcladas:
- Inicialización
- Game loop
- Rendering
- Input handling
- Network sync
- UI management
- Tutorial
- Editor (legacy)

**PROBLEMA:** Difícil de mantener y optimizar
**SOLUCIÓN:** Refactor progresivo extrayendo GameLoop y RenderCoordinator

---

## 🟡 PROBLEMAS MODERADOS

### 5. Sin Culling Espacial

No hay verificación de si una entidad está fuera de pantalla antes de renderizarla.

**IMPACTO:** Medio (el juego ve todo en pantalla)
**SOLUCIÓN:** Implementar frustum culling simple basado en AABB

---

### 6. Sistemas de Colisión Ineficientes

**Archivo:** `server/game/handlers/CombatHandler.js`

Probable uso de nested loops para detección de colisiones (O(n²)).

**SOLUCIÓN:** Implementar spatial hash grid o quad-tree

---

### 7. Sin Compression en WebSocket

**Archivo:** `server/server.js`

Socket.IO sin compression activada.

**SOLUCIÓN:** Activar `perMessageDeflate`

---

### 8. AssetManager Carga Todo al Inicio

**Archivo:** `src/systems/core/AssetManager.js`

Todos los assets se cargan al inicio, incluso los no usados en la primera pantalla.

**SOLUCIÓN:** Lazy loading para assets no críticos

---

## ✅ COSAS QUE ESTÁN BIEN

1. ✅ **Arquitectura servidor autoritativa** - previene cheating
2. ✅ **RequestAnimationFrame** - sincronización con vsync
3. ✅ **Interpolación de movimiento** - suaviza lag de red
4. ✅ **Separación en sistemas modulares** - RenderSystem, InputHandler, etc.
5. ✅ **Canvas fijo 1600x900** - no recalcula layout constantemente
6. ✅ **Delta time (dt)** - frame-independent logic

---

## 📋 PLAN DE OPTIMIZACIÓN PRIORIZADO

### FASE 1: CAGADAS CRÍTICAS (Máximo impacto, mínimo riesgo)

1. **Unificar iteración de nodos** → Un solo bucle en render
2. **Cachear arrays de entidades** → Evitar llamadas a getters
3. **Implementar Object Pool** → Para partículas y proyectiles

**Impacto esperado:** 30-50% mejora en FPS

---

### FASE 2: OPTIMIZACIONES MEDIAS

4. **Frustum culling simple** → No renderizar fuera de pantalla
5. **Activar compression WebSocket** → Reducir lag de red
6. **Refactor Game.js** → Extraer GameLoop y RenderCoordinator

**Impacto esperado:** 15-25% mejora adicional

---

### FASE 3: OPTIMIZACIONES AVANZADAS

7. **Spatial hash grid** → Colisiones más eficientes
8. **Lazy loading assets** → Inicio más rápido
9. **Batch rendering** → Agrupar draw calls similares

**Impacto esperado:** 10-20% mejora adicional

---

## 🎯 SIGUIENTE PASO

**¿Quieres que proceda con la FASE 1?**

Comenzaré por:
1. Unificar la iteración de nodos (fix más rápido y seguro)
2. Cachear arrays de entidades
3. Implementar Object Pool básico

Estas optimizaciones son **no-invasivas** y **preservan la lógica existente**.

---

## 📊 MÉTRICAS A MEDIR

Antes y después de cada fase, deberíamos medir:
- FPS promedio en partida
- Frame time (ms)
- Número de draw calls
- Garbage collections/segundo
- Latencia de red (RTT)

**Herramientas sugeridas:**
- Chrome DevTools Performance
- Stats.js (FPS meter)
- `performance.now()` para profiling manual

---

## ⚠️ NOTAS IMPORTANTES

1. **NO tocar lógica de servidor** en Fase 1 - solo cliente
2. **Preservar compatibilidad** con código existente
3. **Testear en partida real** después de cada cambio
4. **Commits pequeños y atómicos** para poder revertir si algo falla



