# Plan de Refactorización: RenderSystem

## Análisis del Problema

**RenderSystem.js**: ~4234 líneas, múltiples responsabilidades

### Estado Actual
- **65 referencias** desde `Game.js`
- **10 referencias** desde otros sistemas (StoreUIManager, NetworkManager, CanvasManager, etc.)
- **68+ métodos públicos** identificados
- **Responsabilidades múltiples** mezcladas en un solo archivo

### Responsabilidades Identificadas

1. **Canvas/Context Management** (~100 líneas)
   - `resize()`, `clear()`
   - Mirror view (vista espejo para multiplayer)
   - Configuración de contexto

2. **Background/Grid Rendering** (~50 líneas)
   - `renderBackground()`, `renderGrid()`

3. **Node Rendering** (~1000 líneas)
   - `renderNode()`, `renderBase()`, `renderBuilding()`
   - `renderBaseTypeNode()`, `renderBuildingTypeNode()`
   - `renderNodeUI()`, `renderVehicleUI()`
   - `renderResourceSelector()`, `renderSupplyBar()`, `renderEffects()`

4. **Vehicle Rendering** (~500 líneas)
   - `renderConvoy()`, `renderTrain()`, `renderHelicopter()`
   - `renderTank()`, `renderLightVehicle()`, `renderCombatVehicle()`

5. **Drone Rendering** (~200 líneas)
   - `renderDrone()`, `renderCameraDrone()`
   - `renderCameraDroneDetectionArea()`

6. **Particle/Effect Rendering** (~300 líneas)
   - `renderParticle()`, `renderExplosionSprite()`
   - `renderDroneExplosionSprite()`, `renderImpactMark()`

7. **UI/Overlay Rendering** (~400 líneas)
   - `renderFloatingTextsBatch()`, `renderFloatingSprites()`, `renderFallingSprites()`
   - `renderHoverTooltip()`, `renderEffectTooltip()`
   - `renderProgressRing()`, varios anillos de duración

8. **Preview Rendering** (~800 líneas)
   - `renderBuildPreview()`, `renderDronePreview()`
   - `renderTankPreview()`, `renderLightVehiclePreview()`
   - `renderArtilleryPreview()`, `renderSniperCursor()`, etc.

9. **Territory/Build Area Rendering** (~200 líneas)
   - `renderTerritoryOverlay()`, `renderBuildAreaOverlay()`
   - `renderExclusionCircle()`, `renderAntiDroneInterceptionRange()`

10. **Special Effects** (~300 líneas)
    - `renderArtilleryEffects()`, `renderWorldDestroyerEffects()`
    - `renderWhiteScreen()`, `renderWorldDestroyerCountdown()`

11. **Route/Connection Rendering** (~150 líneas)
    - `renderRoutePreview()`

---

## Estrategia de Refactorización Recomendada

### ✅ **ENFOQUE: Refactorización Gradual con Proxy/Facade Pattern**

**Objetivo**: Separar responsabilidades sin romper dependencias existentes

### Fase 1: Crear Estructura Base (SIN ROMPER NADA)

#### 1.1 Crear Renderers Especializados
```
src/systems/rendering/
  ├── RenderContext.js          # Canvas/context management + mirror view
  ├── NodeRenderer.js           # Nodos, bases, edificios
  ├── VehicleRenderer.js        # Convoys, trenes, helicópteros, tanques
  ├── DroneRenderer.js          # Drones, camera drones
  ├── ParticleRenderer.js       # Partículas, explosiones, impactos
  ├── UIRenderer.js             # Textos flotantes, tooltips, overlays
  ├── PreviewRenderer.js        # Todos los previews (build, drone, etc.)
  ├── TerritoryRenderer.js      # Territorio, build areas, exclusion zones
  ├── EffectRenderer.js         # Efectos especiales (artillería, world destroyer)
  └── BackgroundRenderer.js     # Background y grid
```

#### 1.2 Crear Facade Pattern en RenderSystem
```javascript
// RenderSystem mantiene la misma interfaz pública
// Pero delega a los renderers especializados internamente
export class RenderSystem {
    constructor(canvas, assetManager = null, game = null) {
        // Mantener compatibilidad
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.assetManager = assetManager;
        this.game = game;
        
        // Crear renderers especializados
        this.renderContext = new RenderContext(canvas, this.ctx, game);
        this.backgroundRenderer = new BackgroundRenderer(this.ctx, assetManager, game);
        this.nodeRenderer = new NodeRenderer(this.ctx, assetManager, game, this.renderContext);
        this.vehicleRenderer = new VehicleRenderer(this.ctx, assetManager, game, this.renderContext);
        // ... etc
        
        // Proxy de propiedades para compatibilidad
        Object.defineProperty(this, 'mirrorViewApplied', {
            get: () => this.renderContext.mirrorViewApplied
        });
    }
    
    // Métodos públicos mantienen la misma firma
    clear() {
        this.renderContext.clear();
    }
    
    renderNode(node, isSelected, isHovered, game) {
        return this.nodeRenderer.render(node, isSelected, isHovered, game);
    }
    
    // ... proxy de todos los métodos existentes
}
```

### Fase 2: Migración Incremental (SEGURA)

**Estrategia**: Mover métodos de uno en uno, mantener ambos durante un tiempo

1. **Mover RenderContext** primero (más independiente)
   - `clear()`, `resize()`, mirror view methods
   - ✅ Probar que todo sigue funcionando

2. **Mover BackgroundRenderer** (no tiene dependencias complejas)
   - `renderBackground()`, `renderGrid()`
   - ✅ Probar

3. **Mover ParticleRenderer** (relativamente independiente)
   - `renderParticle()`, explosiones, impactos
   - ✅ Probar

4. **Mover VehicleRenderer** (depende de RenderContext)
   - Todos los métodos de vehículos
   - ✅ Probar

5. Continuar con el resto...

### Fase 3: Limpieza y Optimización

- Eliminar código duplicado
- Optimizar comunicación entre renderers
- Documentar APIs internas

---

## Recomendación Final: **Patrón Facade con Composición**

### Ventajas:
✅ **Zero breaking changes**: La interfaz pública de RenderSystem no cambia  
✅ **Refactorización gradual**: Puedes mover código poco a poco  
✅ **Fácil de testear**: Cada renderer es independiente  
✅ **Mantenible**: Responsabilidades claras  
✅ **Escalable**: Fácil agregar nuevos renderers  

### Estructura Propuesta:

```
RenderSystem (Facade - 200-300 líneas)
  ├── Mantiene interfaz pública idéntica
  ├── Delega a renderers especializados
  └── Gestiona dependencias compartidas

Renderers Especializados (150-500 líneas cada uno)
  ├── RenderContext (~200 líneas)
  ├── BackgroundRenderer (~100 líneas)
  ├── NodeRenderer (~800 líneas)
  ├── VehicleRenderer (~500 líneas)
  ├── DroneRenderer (~200 líneas)
  ├── ParticleRenderer (~300 líneas)
  ├── UIRenderer (~400 líneas)
  ├── PreviewRenderer (~800 líneas)
  ├── TerritoryRenderer (~200 líneas)
  └── EffectRenderer (~300 líneas)
```

---

## Pasos Inmediatos Sugeridos

### Paso 1: Crear RenderContext (más seguro, menos dependencias)
- Extraer `clear()`, `resize()`, mirror view methods
- RenderSystem delega a RenderContext
- ✅ Test: Verificar que mirror view sigue funcionando

### Paso 2: Crear BackgroundRenderer
- Extraer `renderBackground()`, `renderGrid()`
- ✅ Test: Verificar que background/grid se renderiza

### Paso 3: Crear ParticleRenderer
- Extraer métodos de partículas
- ✅ Test: Verificar explosiones, impactos, textos flotantes

### Paso 4: Evaluar impacto y continuar...

---

## Consideraciones Importantes

1. **NO romper la API pública**: Mantener todas las firmas de métodos iguales
2. **Proxy de propiedades**: Si otros sistemas acceden a `renderer.mirrorViewApplied`, usar getters
3. **Testing incremental**: Probar después de cada extracción
4. **Documentación**: Documentar qué renderer maneja qué responsabilidad
5. **Dependencias compartidas**: `ctx`, `assetManager`, `game` se pasan a todos los renderers

---

## Preguntas antes de empezar

1. ¿Tienes tests automatizados? (Ayudaría mucho)
2. ¿Prefieres migración completa o gradual?
3. ¿Hay alguna responsabilidad que consideras crítica y debe quedar en RenderSystem?

---

## Ejemplo de Implementación: RenderContext

```javascript
// src/systems/rendering/RenderContext.js
export class RenderContext {
    constructor(canvas, ctx, game) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.game = game;
        this.width = canvas.width;
        this.height = canvas.height;
        this.mirrorViewApplied = false;
        
        // Configurar contexto
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.imageSmoothingEnabled = true;
        if (this.ctx.imageSmoothingQuality) {
            this.ctx.imageSmoothingQuality = 'high';
        }
    }
    
    resize(width, height) {
        this.width = width;
        this.height = height;
    }
    
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = GAME_CONFIG.CANVAS_BG_COLOR;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    applyMirrorView() {
        // ... código existente
    }
    
    restoreMirrorView() {
        // ... código existente
    }
    
    // ... resto de métodos de mirror view
}
```

```javascript
// src/systems/RenderSystem.js (modificado)
import { RenderContext } from './rendering/RenderContext.js';
// ... otros imports

export class RenderSystem {
    constructor(canvas, assetManager = null, game = null) {
        this.canvas = canvas;
        this.assetManager = assetManager;
        this.game = game;
        
        // Crear contexto centralizado
        this.renderContext = new RenderContext(canvas, null, game);
        this.ctx = this.renderContext.ctx; // Para compatibilidad
        
        // Proxy de propiedades
        Object.defineProperty(this, 'mirrorViewApplied', {
            get: () => this.renderContext.mirrorViewApplied,
            set: (val) => { this.renderContext.mirrorViewApplied = val; }
        });
        
        // Estado especial (temporalmente aquí, se moverá a EffectRenderer)
        this.worldDestroyerActive = false;
        this.artilleryStrikes = [];
    }
    
    resize(width, height) {
        this.renderContext.resize(width, height);
        this.width = width;
        this.height = height;
    }
    
    clear() {
        this.renderContext.clear();
    }
    
    applyMirrorView() {
        return this.renderContext.applyMirrorView();
    }
    
    // ... resto de métodos mantienen delegación o código existente
}
```

---

**¿Empezamos con RenderContext? Es el paso más seguro y establece el patrón para el resto.**

