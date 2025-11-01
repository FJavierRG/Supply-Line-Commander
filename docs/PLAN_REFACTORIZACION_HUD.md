# Plan de Refactorización del Sistema HUD/UI

## 📋 Resumen Ejecutivo

Este plan detalla la refactorización completa del sistema HUD/UI para separar correctamente las capas visuales, implementar un sistema de estados robusto y gestionar eventos de forma centralizada, sin romper funcionalidad existente.

---

## 🎯 Objetivos

1. **Separar capas visuales**: Canvas (juego) y UI (overlays) en capas independientes
2. **Sistema de estados centralizado**: Gestionar qué acepta input según el estado
3. **Event delegation correcta**: Eventos van al lugar correcto automáticamente
4. **Gestión centralizada de overlays**: Un solo punto de control para todos los overlays
5. **Compatibilidad hacia atrás**: No romper ningún código existente

---

## 📊 Estado Actual: Inventario Completo

### Overlays Existentes (9 total)

1. **loading-screen** - Pantalla de carga inicial
2. **press-to-continue-screen** - Pantalla "Pulsa para continuar"
3. **main-menu-overlay** - Menú principal
4. **multiplayer-lobby-overlay** - Lobby multijugador
5. **arsenal-overlay** - Menú de arsenal
6. **victory-overlay** - Pantalla de victoria
7. **defeat-overlay** - Pantalla de derrota
8. **pause-overlay** - Menú de pausa
9. **upgrades-overlay** - Pantalla de mejoras

### Estados del Juego Actuales

- `menu` - Menú principal
- `playing` - Juego activo
- `paused` - Juego pausado
- `tutorial` - Modo tutorial
- `editor` - Editor de mapas
- `victory` - Victoria
- `defeat` - Derrota

### Sistemas que Manipulan Overlays

1. **UIManager.js** - Gestión básica de overlays
2. **InputHandler.js** - Manejo de eventos y navegación
3. **NetworkManager.js** - Overlays de multijugador
4. **Game.js** - Cambios de estado y overlays
5. **ArsenalManager.js** - Overlay de arsenal
6. **LoadingScreenManager.js** - Pantalla de carga
7. **TutorialManager.js** - Overlays del tutorial

### Métodos Críticos que Usan Overlays

```javascript
// UIManager.js
showMainMenu()
hideMainMenu()
showPauseMenu()
hidePauseMenu()
showMissionBriefing()
showMissionComplete()
showUpgradeScreen()
hideUpgradeScreen()
showElement() / hideElement() / toggleElement()

// InputHandler.js
showMultiplayerLobby()
hideMultiplayerLobby()
createMultiplayerRoom()
showJoinRoomInput()
joinRoomWithCode()

// NetworkManager.js
hideLobby()
createGameCountdownOverlay()
handleGameOver()

// Game.js
showMainMenu()
returnToMenuFromGame()
togglePause()
restartMission()

// ArsenalManager.js
showArsenal()
hideArsenal()
```

---

## 🏗️ Arquitectura Propuesta

### Estructura de Capas

```
┌─────────────────────────────────────┐
│   #ui-layer (z-index: 1000)        │  ← Capa de UI (siempre arriba)
│   ├── loading-screen                │
│   ├── main-menu-overlay             │
│   ├── multiplayer-lobby-overlay      │
│   ├── pause-overlay                 │
│   └── ... (todos los overlays)     │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│   #game-canvas (z-index: 1)        │  ← Canvas del juego (abajo)
└─────────────────────────────────────┘
```

### Nuevos Componentes

#### 1. **OverlayManager** (NUEVO)
```javascript
// src/systems/OverlayManager.js
- Gestión centralizada de todos los overlays
- Registro de overlays
- showOverlay(id)
- hideOverlay(id)
- hideAllOverlays()
- isOverlayVisible(id)
- getVisibleOverlays()
```

#### 2. **GameStateManager** (NUEVO)
```javascript
// src/systems/GameStateManager.js
- Gestión centralizada de estados
- Cambios de estado con eventos
- Validación de transiciones
- getCurrentState()
- setState(newState)
- onStateChange(callback)
```

#### 3. **InputRouter** (NUEVO)
```javascript
// src/systems/InputRouter.js
- Routing de eventos según estado
- Bloqueo automático de canvas cuando hay overlay
- Event delegation correcta
- shouldRouteToCanvas()
- shouldRouteToUI()
```

---

## 📝 Plan de Implementación (Paso a Paso)

### FASE 1: Preparación y Estructura Base ⚠️ NO TOCAR CÓDIGO EXISTENTE

#### Paso 1.1: Crear estructura HTML de capas
**Archivo**: `index.html`

**Cambios**:
```html
<!-- ANTES (estructura actual) -->
<div id="main-game">
    <canvas id="game-canvas"></canvas>
    <div id="main-menu-overlay" class="overlay hidden">...</div>
    <div id="pause-overlay" class="overlay hidden">...</div>
    <!-- ... más overlays ... -->
</div>

<!-- DESPUÉS (nueva estructura) -->
<div id="main-game">
    <!-- Capa del juego -->
    <canvas id="game-canvas"></canvas>
    
    <!-- Capa de UI (nueva, contenedor dedicado) -->
    <div id="ui-layer">
        <div id="main-menu-overlay" class="overlay hidden">...</div>
        <div id="pause-overlay" class="overlay hidden">...</div>
        <!-- ... todos los overlays movidos aquí ... -->
    </div>
</div>
```

**Acciones**:
1. Crear `<div id="ui-layer">` dentro de `#main-game`
2. Mover TODOS los overlays dentro de `#ui-layer`
3. Mantener los mismos IDs y clases
4. **NO cambiar ninguna funcionalidad**, solo mover elementos

**Verificación**:
- ✅ Todos los overlays siguen funcionando igual
- ✅ Los botones siguen siendo clickeables
- ✅ No se rompe nada visualmente

---

#### Paso 1.2: Actualizar CSS base
**Archivo**: `styles.css`

**Cambios**:
```css
/* NUEVO: Capa de UI siempre arriba */
#ui-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1000;
    pointer-events: none; /* Permite clicks a través cuando no hay overlay visible */
}

/* Canvas siempre debajo */
#game-canvas {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1; /* Explícitamente bajo */
    pointer-events: auto; /* Activo por defecto */
}

/* Overlays dentro de ui-layer capturan eventos cuando están visibles */
#ui-layer .overlay:not(.hidden) {
    pointer-events: auto;
}

/* Bloquear canvas cuando hay overlay visible */
#ui-layer:has(.overlay:not(.hidden)) ~ #game-canvas,
body:has(#ui-layer .overlay:not(.hidden)) #game-canvas {
    pointer-events: none;
}
```

**Acciones**:
1. Añadir estilos para `#ui-layer`
2. Asegurar z-index correcto
3. Configurar pointer-events

**Verificación**:
- ✅ Canvas no captura clicks cuando hay overlay visible
- ✅ Overlays capturan clicks correctamente
- ✅ No se rompe nada existente

---

### FASE 2: Crear Nuevos Managers (Sin Usar Aún)

#### Paso 2.1: Crear OverlayManager
**Archivo**: `src/systems/OverlayManager.js` (NUEVO)

**Implementación**:
```javascript
export class OverlayManager {
    constructor() {
        this.overlays = new Map(); // id -> overlay element
        this.visibleOverlays = new Set(); // IDs de overlays visibles
        this.registerAllOverlays();
    }
    
    registerAllOverlays() {
        // Registrar todos los overlays existentes
        const overlayIds = [
            'loading-screen',
            'press-to-continue-screen',
            'main-menu-overlay',
            'multiplayer-lobby-overlay',
            'arsenal-overlay',
            'victory-overlay',
            'defeat-overlay',
            'pause-overlay',
            'upgrades-overlay'
        ];
        
        overlayIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.overlays.set(id, element);
            }
        });
    }
    
    showOverlay(id) {
        const overlay = this.overlays.get(id);
        if (!overlay) {
            console.warn(`⚠️ Overlay ${id} no encontrado`);
            return false;
        }
        
        overlay.classList.remove('hidden');
        this.visibleOverlays.add(id);
        this.updateCanvasPointerEvents();
        return true;
    }
    
    hideOverlay(id) {
        const overlay = this.overlays.get(id);
        if (!overlay) {
            return false;
        }
        
        overlay.classList.add('hidden');
        this.visibleOverlays.delete(id);
        this.updateCanvasPointerEvents();
        return true;
    }
    
    hideAllOverlays() {
        this.visibleOverlays.forEach(id => {
            this.hideOverlay(id);
        });
    }
    
    isOverlayVisible(id) {
        return this.visibleOverlays.has(id);
    }
    
    getVisibleOverlays() {
        return Array.from(this.visibleOverlays);
    }
    
    updateCanvasPointerEvents() {
        // Esto se manejará automáticamente con CSS :has()
        // Pero podemos forzar actualización si es necesario
        const canvas = document.getElementById('game-canvas');
        if (canvas && this.visibleOverlays.size > 0) {
            canvas.style.pointerEvents = 'none';
        } else {
            canvas.style.pointerEvents = 'auto';
        }
    }
}
```

**Acciones**:
1. Crear archivo nuevo
2. Implementar clase completa
3. **NO instanciar ni usar aún** - solo crear el archivo

**Verificación**:
- ✅ Archivo se crea sin errores
- ✅ No afecta código existente

---

#### Paso 2.2: Crear GameStateManager
**Archivo**: `src/systems/GameStateManager.js` (NUEVO)

**Implementación**:
```javascript
export class GameStateManager {
    constructor() {
        this.currentState = 'menu';
        this.previousState = null;
        this.listeners = new Map(); // state -> [callbacks]
    }
    
    getCurrentState() {
        return this.currentState;
    }
    
    setState(newState) {
        if (this.currentState === newState) {
            return; // No cambiar si es el mismo
        }
        
        const oldState = this.currentState;
        this.previousState = oldState;
        this.currentState = newState;
        
        // Ejecutar listeners
        this.notifyStateChange(oldState, newState);
    }
    
    onStateChange(callback) {
        if (!this.listeners.has('*')) {
            this.listeners.set('*', []);
        }
        this.listeners.get('*').push(callback);
    }
    
    onStateChangeTo(state, callback) {
        if (!this.listeners.has(state)) {
            this.listeners.set(state, []);
        }
        this.listeners.get(state).push(callback);
    }
    
    notifyStateChange(oldState, newState) {
        // Notificar listeners generales
        const generalListeners = this.listeners.get('*') || [];
        generalListeners.forEach(cb => cb(newState, oldState));
        
        // Notificar listeners específicos del nuevo estado
        const specificListeners = this.listeners.get(newState) || [];
        specificListeners.forEach(cb => cb(newState, oldState));
    }
    
    canTransitionTo(newState) {
        // Validaciones de transición si es necesario
        return true; // Por ahora permitir todas
    }
}
```

**Acciones**:
1. Crear archivo nuevo
2. Implementar clase completa
3. **NO instanciar ni usar aún**

---

#### Paso 2.3: Crear InputRouter
**Archivo**: `src/systems/InputRouter.js` (NUEVO)

**Implementación**:
```javascript
export class InputRouter {
    constructor(gameStateManager, overlayManager) {
        this.gameStateManager = gameStateManager;
        this.overlayManager = overlayManager;
    }
    
    shouldRouteToCanvas(event) {
        const state = this.gameStateManager.getCurrentState();
        const visibleOverlays = this.overlayManager.getVisibleOverlays();
        
        // Si hay overlays visibles, NO rutear al canvas
        if (visibleOverlays.length > 0) {
            return false;
        }
        
        // Solo rutear al canvas en estados de juego activo
        const canvasStates = ['playing', 'tutorial'];
        return canvasStates.includes(state);
    }
    
    shouldRouteToUI(event) {
        const visibleOverlays = this.overlayManager.getVisibleOverlays();
        return visibleOverlays.length > 0;
    }
    
    // Verificar si el click está en un elemento HTML interactivo
    isClickOnUIElement(event) {
        const target = event.target;
        // Verificar si es un botón, input, o está dentro de un overlay
        if (target.tagName === 'BUTTON' || 
            target.tagName === 'INPUT' || 
            target.closest('.overlay:not(.hidden)')) {
            return true;
        }
        return false;
    }
}
```

**Acciones**:
1. Crear archivo nuevo
2. Implementar clase completa
3. **NO instanciar ni usar aún**

---

### FASE 3: Integración Gradual (Una pieza a la vez)

#### Paso 3.1: Integrar OverlayManager en Game.js
**Archivo**: `src/Game.js`

**Cambios**:
```javascript
// En constructor
import { OverlayManager } from './systems/OverlayManager.js';

constructor(canvas) {
    // ... código existente ...
    
    // NUEVO: Instanciar OverlayManager
    this.overlayManager = new OverlayManager();
    
    // MANTENER: UIManager sigue existiendo (compatibilidad)
    this.ui = new UIManager(this);
}
```

**Acciones**:
1. Importar OverlayManager
2. Instanciar en constructor
3. **NO cambiar ningún método existente aún**

**Verificación**:
- ✅ OverlayManager se instancia correctamente
- ✅ UIManager sigue funcionando igual
- ✅ No se rompe nada

---

#### Paso 3.2: Crear métodos wrapper en UIManager (Compatibilidad)
**Archivo**: `src/systems/UIManager.js`

**Cambios**:
```javascript
constructor(game) {
    this.game = game;
    // NUEVO: Referencia a OverlayManager si existe
    this.overlayManager = game.overlayManager;
    
    setTimeout(() => this.setupEventListeners(), 0);
}

// MANTENER métodos existentes pero internamente usar OverlayManager
showMainMenu() {
    // NUEVO: Usar OverlayManager si está disponible
    if (this.overlayManager) {
        this.overlayManager.showOverlay('main-menu-overlay');
    } else {
        // FALLBACK: Código original (para compatibilidad)
        const mainMenu = document.getElementById('main-menu-overlay');
        if (mainMenu) {
            document.body.classList.add('menu-open');
            mainMenu.classList.remove('hidden');
            mainMenu.style.display = '';
        }
    }
    
    // MANTENER: Lógica de audio existente
    if (this.game && this.game.audio) {
        this.game.audio.playMainTheme();
    }
}

// Repetir para TODOS los métodos:
// - hideMainMenu()
// - showPauseMenu()
// - hidePauseMenu()
// - showMissionBriefing()
// - showMissionComplete()
// - showUpgradeScreen()
// - hideUpgradeScreen()
// - showElement() / hideElement() / toggleElement()
```

**Estrategia**:
- **Mantener todos los métodos existentes** con la misma firma
- Internamente usar OverlayManager si está disponible
- Fallback al código original si no está disponible
- Esto asegura compatibilidad total

**Acciones**:
1. Añadir referencia a OverlayManager
2. Modificar cada método para usar OverlayManager internamente
3. Mantener fallback al código original
4. Probar cada método individualmente

**Verificación**:
- ✅ Todos los métodos siguen funcionando igual
- ✅ showMainMenu() funciona
- ✅ hideMainMenu() funciona
- ✅ showPauseMenu() funciona
- ✅ etc.

---

#### Paso 3.3: Actualizar InputHandler para usar InputRouter
**Archivo**: `src/systems/InputHandler.js`

**Cambios**:
```javascript
constructor(game) {
    this.game = game;
    
    // NUEVO: InputRouter si está disponible
    this.inputRouter = game.inputRouter;
    
    // ... resto del código existente ...
}

handleCanvasClick(e) {
    // NUEVO: Verificar si el click está en UI antes de procesar
    if (this.inputRouter && this.inputRouter.isClickOnUIElement(e)) {
        return; // Dejar que el elemento UI maneje el evento
    }
    
    // NUEVO: Verificar si debería rutear al canvas
    if (this.inputRouter && !this.inputRouter.shouldRouteToCanvas(e)) {
        return; // No procesar en canvas
    }
    
    // MANTENER: Resto del código existente sin cambios
    const rect = this.game.canvas.getBoundingClientRect();
    // ... código original ...
}
```

**Estrategia**:
- Añadir verificaciones al inicio de cada handler
- Si fallan las verificaciones, retornar temprano
- Resto del código queda igual

**Acciones**:
1. Añadir referencia a InputRouter
2. Modificar handleCanvasClick() con verificación temprana
3. Modificar handleCanvasMouseDown() con verificación temprana
4. Modificar handleCanvasMouseUp() con verificación temprana
5. Modificar handleRightClick() con verificación temprana
6. Mantener handleCanvasMouseMove() sin cambios (hover debe funcionar)

**Verificación**:
- ✅ Los botones del menú funcionan
- ✅ Los clicks en el canvas funcionan cuando deberían
- ✅ No se procesan clicks en canvas cuando hay overlay

---

#### Paso 3.4: Integrar GameStateManager en Game.js
**Archivo**: `src/Game.js`

**Cambios**:
```javascript
import { GameStateManager } from './systems/GameStateManager.js';

constructor(canvas) {
    // ... código existente ...
    
    // NUEVO: Instanciar GameStateManager
    this.gameStateManager = new GameStateManager();
    this.gameStateManager.setState('menu'); // Estado inicial
    
    // MANTENER: this.state sigue existiendo (compatibilidad)
    this.state = 'menu';
    
    // NUEVO: Sincronizar ambos
    this.gameStateManager.onStateChange((newState) => {
        this.state = newState; // Mantener sincronizado
    });
}

// NUEVO: Método helper para cambiar estado
setGameState(newState) {
    this.gameStateManager.setState(newState);
    this.state = newState; // Mantener compatibilidad
}

// MANTENER: Todos los métodos existentes que cambian this.state
// Modificarlos para usar setGameState() en lugar de this.state =
```

**Estrategia**:
- Mantener `this.state` para compatibilidad
- Sincronizar automáticamente con GameStateManager
- Gradualmente migrar todos los cambios de estado

**Acciones**:
1. Instanciar GameStateManager
2. Crear método setGameState()
3. Migrar cambios de estado uno por uno:
   - `this.state = 'menu'` → `this.setGameState('menu')`
   - `this.state = 'playing'` → `this.setGameState('playing')`
   - etc.

**Verificación**:
- ✅ Todos los cambios de estado funcionan igual
- ✅ this.state sigue siendo accesible
- ✅ No se rompe nada

---

### FASE 4: Migración Completa y Limpieza

#### Paso 4.1: Migrar todos los métodos de UIManager
**Archivo**: `src/systems/UIManager.js`

**Tareas**:
- [ ] Migrar todos los métodos a usar OverlayManager internamente
- [ ] Eliminar código duplicado (mantener solo fallback)
- [ ] Asegurar que todos los métodos funcionan igual

**Verificación**:
- ✅ Todos los overlays se muestran/ocultan correctamente
- ✅ No hay regresiones

---

#### Paso 4.2: Migrar todos los cambios de estado
**Archivo**: `src/Game.js`

**Tareas**:
- [ ] Buscar todos los `this.state =` en el código
- [ ] Reemplazar por `this.setGameState()`
- [ ] Probar cada cambio de estado

**Verificación**:
- ✅ Todos los cambios de estado funcionan
- ✅ Los listeners de estado se ejecutan correctamente

---

#### Paso 4.3: Actualizar InputHandler completamente
**Archivo**: `src/systems/InputHandler.js`

**Tareas**:
- [ ] Asegurar que todos los handlers verifican InputRouter
- [ ] Eliminar `shouldBlockGameInput()` si ya no es necesario
- [ ] Simplificar lógica de bloqueo

**Verificación**:
- ✅ Los eventos se rutear correctamente
- ✅ No hay clicks fantasma en el canvas

---

#### Paso 4.4: Actualizar otros sistemas
**Archivos**: 
- `src/systems/NetworkManager.js`
- `src/systems/ArsenalManager.js`
- `src/systems/LoadingScreenManager.js`

**Tareas**:
- [ ] Migrar a usar OverlayManager donde sea posible
- [ ] Mantener compatibilidad si es necesario

---

### FASE 5: Optimización y Documentación

#### Paso 5.1: Optimizar CSS
**Archivo**: `styles.css`

**Tareas**:
- [ ] Asegurar que todos los z-index son correctos
- [ ] Optimizar selectores CSS
- [ ] Asegurar que pointer-events funciona correctamente

---

#### Paso 5.2: Documentación
**Archivos**: 
- `docs/HUD_SYSTEM.md` (NUEVO)

**Contenido**:
- Arquitectura del sistema
- Cómo añadir nuevos overlays
- Cómo usar OverlayManager
- Cómo usar GameStateManager
- Cómo usar InputRouter

---

#### Paso 5.3: Limpieza de código legacy
**Tareas**:
- [ ] Identificar código duplicado
- [ ] Eliminar métodos obsoletos (si los hay)
- [ ] Comentar código legacy si es necesario mantenerlo

---

## 🔄 Matriz de Compatibilidad

### Métodos que DEBEN seguir funcionando igual

| Sistema | Método | Estado |
|---------|--------|--------|
| UIManager | showMainMenu() | ✅ Funciona igual |
| UIManager | hideMainMenu() | ✅ Funciona igual |
| UIManager | showPauseMenu() | ✅ Funciona igual |
| UIManager | hidePauseMenu() | ✅ Funciona igual |
| UIManager | showElement() | ✅ Funciona igual |
| UIManager | hideElement() | ✅ Funciona igual |
| Game | this.state | ✅ Sigue siendo accesible |
| Game | togglePause() | ✅ Funciona igual |
| InputHandler | handleCanvasClick() | ✅ Funciona igual |
| NetworkManager | hideLobby() | ✅ Funciona igual |

### Código que NO debe cambiar

- ✅ Todas las llamadas a métodos existentes
- ✅ Todas las referencias a `this.state`
- ✅ Todos los event listeners de botones HTML
- ✅ Todos los overlays en el HTML
- ✅ Toda la lógica de negocio

---

## ✅ Checklist de Verificación

### Fase 1: Estructura
- [ ] HTML reorganizado con ui-layer
- [ ] CSS actualizado con z-index correctos
- [ ] Canvas bloqueado cuando hay overlay visible
- [ ] Overlays capturan clicks correctamente

### Fase 2: Nuevos Managers
- [ ] OverlayManager creado y funcional
- [ ] GameStateManager creado y funcional
- [ ] InputRouter creado y funcional

### Fase 3: Integración
- [ ] OverlayManager integrado en Game.js
- [ ] UIManager usa OverlayManager internamente
- [ ] InputHandler usa InputRouter
- [ ] GameStateManager integrado en Game.js

### Fase 4: Migración
- [ ] Todos los métodos de UIManager migrados
- [ ] Todos los cambios de estado migrados
- [ ] InputHandler completamente actualizado
- [ ] Otros sistemas actualizados

### Fase 5: Optimización
- [ ] CSS optimizado
- [ ] Documentación creada
- [ ] Código legacy limpiado

### Tests Funcionales
- [ ] Menú principal funciona
- [ ] Lobby multijugador funciona
- [ ] Menú de pausa funciona
- [ ] Clicks en canvas funcionan cuando deben
- [ ] Overlays bloquean canvas correctamente
- [ ] Cambios de estado funcionan
- [ ] No hay regresiones

---

## 🚨 Riesgos y Mitigaciones

### Riesgo 1: Romper código existente
**Mitigación**: 
- Mantener todos los métodos existentes con misma firma
- Usar fallbacks al código original
- Probar cada cambio individualmente

### Riesgo 2: Event listeners duplicados
**Mitigación**:
- No duplicar listeners
- Usar event delegation cuando sea posible
- Limpiar listeners obsoletos

### Riesgo 3: Z-index conflicts
**Mitigación**:
- Definir z-index claramente en CSS
- Documentar jerarquía de capas
- Usar valores consistentes

### Riesgo 4: Performance
**Mitigación**:
- Usar CSS :has() para pointer-events (eficiente)
- No añadir listeners innecesarios
- Cachear referencias a elementos DOM

---

## 📚 Referencias

- Overlays existentes: `index.html` líneas 52-341
- Estados del juego: `src/Game.js` línea 104
- UIManager: `src/systems/UIManager.js`
- InputHandler: `src/systems/InputHandler.js`

---

## 🎯 Resultado Final Esperado

Después de la refactorización:

1. ✅ **Separación clara de capas**: Canvas y UI en capas independientes
2. ✅ **Sistema de estados robusto**: GameStateManager centralizado
3. ✅ **Event routing correcto**: InputRouter maneja eventos automáticamente
4. ✅ **Gestión centralizada**: OverlayManager controla todos los overlays
5. ✅ **Compatibilidad total**: Todo el código existente sigue funcionando
6. ✅ **Código mantenible**: Fácil añadir nuevos overlays o estados
7. ✅ **Sin regresiones**: Todo funciona igual o mejor que antes

---

## 📝 Notas de Implementación

- **Implementar una fase a la vez**
- **Probar después de cada paso**
- **NO avanzar si algo se rompe**
- **Mantener compatibilidad siempre**
- **Documentar cambios importantes**

---

**Fecha de creación**: 2024
**Última actualización**: 2024
**Estado**: Plan listo para implementación

