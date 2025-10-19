# 🏗️ Arquitectura Técnica - Supply Line Commander

**Versión:** 2.0 (PvP-Ready)  
**Stack:** Vanilla JavaScript + Canvas 2D  
**Patrón:** Arquitectura modular basada en sistemas (ECS-like)  
**Estado:** ✅ Refactorizado para soporte multijugador

---

## 📂 Estructura del Proyecto

```
ProyectoMil/
├── index.html                 # HTML principal
├── styles.css                 # Estilos globales
├── README.md                  # Documentación del juego
├── .roadfaz                   # Roadmap proyecto multiplayer
├── ARCHITECTURE.md            # Este archivo
│
├── assets/
│   ├── sprites/              # Sprites del juego
│   │   ├── bases/           # HQ, FOB, Frente (+ estados)
│   │   ├── buildings/       # Edificios construibles
│   │   ├── vehicles/        # Vehículos y drones
│   │   ├── ui/              # UI frames e iconos
│   │   ├── map/             # Tiles del mapa
│   │   └── particles/       # Efectos visuales
│   └── sounds/
│       └── normalized/      # Audio normalizado a -3dB
│
└── src/
    ├── main.js              # Punto de entrada
    ├── Game.js              # Controlador principal
    │
    ├── config/
    │   ├── nodes.js         # ⭐ Configuración de TODOS los nodos
    │   ├── constants.js     # Constantes globales
    │   └── upgrades_legacy.js  # Sistema de mejoras
    │
    ├── entities/
    │   ├── MapNode.js       # ⭐ Entidad unificada (bases, edificios, etc)
    │   └── Convoy.js        # Vehículos en tránsito
    │
    ├── factories/
    │   └── BaseFactory.js   # Crea nodos con upgrades
    │
    ├── missions/
    │   ├── Mission.js       # Clase base de misiones
    │   ├── Mission20.js     # Misión actual
    │   └── old/             # Misiones antiguas (backup)
    │
    ├── ai/                  # Sistema de IA enemiga
    │   ├── AIDirector.js    # Director de IA (scoring contextual)
    │   ├── config/          # Configuración de IA
    │   ├── core/            # Lógica central (StateAnalyzer, etc.)
    │   └── strategies/      # Estrategias de IA
    │
    ├── systems/ (23+ sistemas)
    │   ├── RenderSystem.js          # Renderizado en canvas
    │   ├── UIManager.js             # UI/HUD
    │   ├── AudioManager.js          # Sistema de audio
    │   ├── InputHandler.js          # Input del usuario
    │   ├── BuildingSystem.js        # Construcción
    │   ├── ConvoyManager.js         # Gestión de convoyes
    │   ├── DroneSystem.js           # Sistema de drones
    │   ├── AntiDroneSystem.js       # Sistema anti-drones
    │   ├── MedicalEmergencySystem.js # Emergencias médicas
    │   ├── FrontMovementSystem.js   # Movimiento de frentes
    │   ├── TerritorySystem.js       # Control territorial
    │   ├── CurrencyManager.js       # Moneda del juego
    │   ├── StoreUIManager.js        # Tienda en juego
    │   ├── ArsenalManager.js        # Menú Arsenal
    │   ├── OptionsManager.js        # Opciones de audio
    │   ├── CameraController.js      # Control de cámara
    │   ├── EnemyAISystem.js         # IA enemiga (legacy)
    │   ├── TutorialSystem.js        # Sistema de tutorial
    │   ├── TutorialManager.js       # Gestor de tutorial
    │   ├── LoadingScreenManager.js  # Pantalla de carga
    │   ├── BackgroundTileSystem.js  # Sistema de tiles
    │   ├── AssetManager.js          # Carga de assets
    │   └── MissionManager.js        # Gestor de misiones
    │
    └── utils/
        ├── ParticleSystem.js        # Partículas y efectos
        └── RoadSystem.js            # Sistema de carreteras
```

---

## 🎯 Sistema Unificado de Nodos

### **MapNode.js** - Entidad Universal

**TODO es un MapNode:**
- Bases del mapa (HQ, FOB, Frente)
- Edificios construibles (Anti-Dron, Hospital, Nuclear)
- Nodos enemigos (mismo sistema con `team: 'player2'`)
- Proyectiles (Dron kamikaze)

**Propiedades opcionales según tipo:**
```javascript
{
    // Identificación
    id: 'node_123',
    type: 'hq' | 'fob' | 'front' | 'antiDrone' | ...,
    name: 'HQ (Cuartel General)',
    category: 'map_node' | 'buildable' | 'projectile',
    team: 'ally' | 'player2',
    
    // Renderizado
    spriteKey: 'base-hq',
    radius: 50,
    shadowColor: '#3498db',
    sizeMultiplier: 1.0,
    flipHorizontal: false,
    
    // Sistemas opcionales
    hasSupplies: true,
    maxSupplies: 100,
    supplies: 50,
    
    hasVehicles: true,
    maxVehicles: 4,
    availableVehicles: 4,
    
    hasMedicalSystem: true,
    maxAmbulances: 1,
    
    // Construcción
    needsConstruction: true,
    constructionTime: 2,
    isConstructing: false,
    constructed: true,
    cost: 130,
    
    // Propiedades específicas
    detectionRange: 200,
    actionRange: 300,
    passiveIncomeBonus: 5,
    enabled: true  // ✅ visible en tienda
}
```

### **nodes.js** - Configuración Única

**Categorías:**
- `map_node` - Nodos del mapa inicial (HQ, FOB, Frente)
- `buildable` - Construibles durante el juego
- `projectile` - Consumibles (Dron kamikaze)

**⚠️ IMPORTANTE:** Ya no existe la categoría `enemy`. Los nodos se diferencian por el campo `team`.

**Sistema de `enabled`:**
```javascript
antiDrone: {
    enabled: true,  // ✅ Visible en tienda/arsenal
    cost: 200,
    // ...
},
razorNet: {
    enabled: false, // ❌ Oculto (work in progress)
    // ...
}
```

---

## 🔄 Game Loop y Arquitectura

### **Game.js** - Orquestador Central

```javascript
class Game {
    constructor(canvas) {
        // Sistemas (23+)
        this.renderer = new RenderSystem(...);
        this.ui = new UIManager(...);
        this.audio = new AudioManager();
        this.convoyManager = new ConvoyManager(...);
        this.droneSystem = new DroneSystem(...);
        // ... etc
        
        // Estado del juego
        this.nodes = [];  // ⭐ Array unificado de todos los nodos
        this.selectedNode = null;
        this.hoveredNode = null;
        this.state = 'menu' | 'playing' | 'paused' | 'victory' | 'defeat';
        
        // Helpers de compatibilidad
        get bases() { return this.nodes.filter(n => n.hasVehicles); }
        get buildings() { return this.nodes.filter(n => n.category === 'buildable'); }
    }
    
    gameLoop() {
        const dt = (now - this.lastTime) / 1000;
        
        if (this.state === 'playing' && !this.paused) {
            this.update(dt);
        }
        
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update(dt) {
        // Actualizar todos los sistemas
        this.audio.update(dt);
        this.nodes.forEach(n => n.update(dt));
        this.currency.updatePassiveCurrency(dt);
        this.medicalSystem.update(dt * 1000);
        this.frontMovement.update(dt * 1000);
        this.convoyManager.update(dt);
        this.droneSystem.update(dt);
        this.antiDroneSystem.update(dt);
        this.territory.update(dt);
        this.enemyAI.update(dt);  // ⚠️ Será refactorizado en Fase 0
        this.particleSystem.update(dt);
        this.ui.updateHUD(this.getGameState());
    }
    
    render() {
        this.renderer.clear();
        this.camera.applyToContext(ctx);
        
        this.renderer.renderBackground();
        this.roadSystem.render(ctx);
        this.territory.render(ctx);
        this.nodes.forEach(n => this.renderer.renderNode(n, ...));
        this.convoyManager.getConvoys().forEach(c => this.renderer.renderConvoy(c));
        this.droneSystem.getDrones().forEach(d => this.renderer.renderDrone(d));
        this.particleSystem.getParticles().forEach(p => this.renderer.renderParticle(p));
        this.storeUI.render(ctx);
        
        this.camera.restoreContext(ctx);
    }
}
```

### **Flujo de Datos**

```
CONFIG (nodes.js)
    ↓
FACTORY (BaseFactory.createBase())
    ↓
ENTITY (new MapNode(...))
    ↓
GAME (game.nodes.push(node))
    ↓
SYSTEMS (actualizan/leen nodos)
    ↓
RENDER (dibuja según estado)
```

---

## 🧩 Sistemas Principales

### **RenderSystem.js** - Renderizado

```javascript
renderNode(node, isSelected, isHovered, game) {
    const sprite = this.assetManager.getSprite(node.spriteKey);
    
    // Detecta automáticamente:
    // - Estados especiales (construcción, crítico, sin munición)
    // - UI específica (vehículos, suministros, rangos)
    // - Filtros (grayscale, abandono)
    
    if (node.isConstructing) {
        ctx.filter = 'grayscale(100%)';
    }
    
    if (node.flipHorizontal) {
        ctx.scale(-1, 1);
    }
    
    ctx.drawImage(sprite, x, y, size, size);
    
    // UI adicional
    this.renderVehicleUI(node, game);
    this.renderSupplyBar(node);
}
```

### **ConvoyManager.js** - Gestión de Convoyes

```javascript
createRoute(from, to) {
    // Valida jerarquía logística (VALID_ROUTES)
    // HQ → FOB → Front
    
    // Aplica upgrades (Truck Factory, Engineer Center)
    const vehicle = this.applyUpgrades(baseVehicle, vehicleType);
    
    // Crea convoy
    const convoy = new Convoy(from, to, vehicle, supplies);
    this.convoys.push(convoy);
}

update(dt) {
    this.convoys.forEach(convoy => {
        convoy.update(dt);
        
        if (convoy.hasArrived()) {
            convoy.destination.supplies += convoy.cargo;
            convoy.returnToOrigin();
        }
    });
}
```

### **EnemyAISystem.js** - IA Enemiga

✅ **REFACTORIZADO:** Sistema actualizado para arquitectura PvP-ready.
Busca nodos por `team === 'player2'` en lugar de tipos `enemy_*`.

```javascript
update(dt) {
    if (!this.enabled) return;
    
    this.updateCurrency(dt);  // Genera currency pasiva
    
    // Comportamientos cada N segundos (APM simulado)
    this.fobCheckTimer += dt;
    if (this.fobCheckTimer >= this.fobCheckInterval) {
        this.checkFOBSupplies();  // Reabastecer FOBs
        this.fobCheckTimer = 0;
    }
    
    this.frontCheckTimer += dt;
    if (this.frontCheckTimer >= this.frontCheckInterval) {
        this.checkFrontSupplies();  // Reabastecer frentes
        this.frontCheckTimer = 0;
    }
    
    // Más comportamientos: harass, build, react, etc.
}
```

### **AudioManager.js** - Audio con Pooling

```javascript
// Sistema de instancias para múltiples sonidos simultáneos
playSound(soundKey, volume = 1.0) {
    const audio = new Audio(this.sounds[soundKey]);
    audio.volume = volume;
    audio.play();
    
    // Cleanup automático
    audio.addEventListener('ended', () => {
        audio.remove();
    });
}

// Audio ambiente dinámico
update(dt) {
    this.ambientTimer += dt;
    if (this.ambientTimer >= this.ambientInterval) {
        this.playRandomAmbient();
        this.ambientTimer = 0;
    }
}
```

### **BuildingSystem.js** - Construcción

```javascript
buildAt(x, y, buildingType) {
    const cost = this.getBuildingCost(buildingType);
    
    if (!this.game.currency.canAfford(cost)) return false;
    
    // Validaciones
    if (!this.isValidPlacement(x, y)) return false;
    if (!this.territory.isInAllyTerritory(x, y)) return false;
    
    // Gastar currency
    this.game.currency.spend(cost);
    
    // Crear nodo
    const node = this.game.baseFactory.createBase(x, y, buildingType, {
        isConstructed: false  // Empieza en construcción
    });
    
    this.game.nodes.push(node);
    return true;
}
```

---

## 🎨 UI y Renderizado

### **Estructura de Menús**

```html
<div class="main-menu-container">
    <div class="menu-header">
        <h1 class="menu-title">Título</h1>
    </div>
    <div class="menu-actions">
        <button class="menu-btn primary">Acción</button>
    </div>
</div>
```

**Menús disponibles:**
- Menú Principal
- Pausa (ESC)
- Victoria/Derrota (con estadísticas)
- Arsenal (mejoras pre-partida)
- Opciones (volumen)

### **UIFrames (Sprites)**

Todos los botones/UI usan sprites en `assets/sprites/ui/UIFrames/`:
- `medium_bton.png` - Botones estándar
- `currency_bton.png` - Indicador de moneda
- `big_frame.png` - Marcos grandes
- etc.

---

## 📝 Convenciones de Código

### Nomenclatura:
- **Nodo**: Cualquier entidad en el mapa (MapNode)
- **Construible**: Nodo que se puede construir durante partida
- **Sistema**: Clase que maneja una responsabilidad específica
- **Manager**: Sistema que gestiona una colección (ej: ConvoyManager)

### Categorías de Nodos:
- `map_node` - Nodos iniciales del mapa
- `buildable` - Se pueden construir
- `enemy` - Nodos enemigos (⚠️ legacy, será refactorizado)
- `projectile` - Consumibles (Dron)

### Organización de Archivos:
- `src/config/` - Solo configuración (JSON-like)
- `src/entities/` - Clases de entidades (MapNode, Convoy)
- `src/systems/` - Lógica de juego (Systems)
- `src/utils/` - Utilidades generales
- `src/factories/` - Creación de objetos complejos

---

## 🚀 Principios de Diseño

### 1. **Modularidad**
Cada sistema es independiente y se comunica a través de `game`:
- Fácil de testear
- Fácil de extender
- Sin dependencias circulares
- Single Responsibility Principle

### 2. **Configuración sobre Código**
Nuevos edificios se añaden en `nodes.js`, no en código:
```javascript
// 1. Añadir en nodes.js
newBuilding: {
    id: 'newBuilding',
    name: 'Nuevo Edificio',
    spriteKey: 'building-new',
    cost: 300,
    enabled: true
}

// 2. Añadir sprite en assets/sprites/buildings/

// 3. Añadir sprite key en AssetManager.js

// ¡Listo! Sistema lo detecta automáticamente
```

### 3. **Data-Driven**
- Misiones definidas en JSON-like
- Configuración de IA en archivos separados
- Upgrades configurables

### 4. **Event-Driven Audio**
- Flags para evitar spam
- Pooling de instancias
- Cleanup automático

---

## ✅ Refactorización PvP (Completada)

### Cambios Arquitectónicos v2.0:

1. **Sistema Unificado de Nodos** ✅
   - Ya NO existen tipos duplicados (`enemy_hq`, `enemy_fob`, `enemy_front`)
   - Todos usan tipos genéricos: `hq`, `fob`, `front`
   - Diferenciación por campo `team`: `'ally'` vs `'player2'`

2. **Sprites Dinámicos** ✅
   - `AssetManager.getBaseSprite()` acepta parámetro `team`
   - Sprites enemigos (`base-enemy-*`) se asignan automáticamente
   - `MapNode` constructor ajusta `spriteKey` según team

3. **IA Preparada para PvP** ✅
   - `EnemyAISystem` busca nodos por `team === 'player2'`
   - Funciona tanto con IA como con jugador humano futuro
   - Propiedad `controlledByAI` reservada para futuro

4. **Validaciones por Team** ✅
   - `ConvoyManager` valida que origen y destino sean del mismo equipo
   - `TerritorySystem` separa fronteras por team
   - Sistemas filtran correctamente por equipo

### Preparado para Multijugador:
- ✅ Código sin hardcoding de 'ally' vs 'enemy'
- ✅ `player2` puede ser IA o jugador humano
- ✅ Compatible con arquitectura cliente-servidor futura
- ⏳ Vista Espejo (Mirror View) pendiente para Fase 1

---

## 🔧 Debug y Testing

### Consola de Debug:
```javascript
// En consola del navegador:
window.game.debugMode = true;  // Activa debug visual
window.game.enemyAI.setDebugMode(true);  // Logs de IA
window.game.enemyAI.getStats();  // Estadísticas de IA
```

### Flags de Desarrollo:
```javascript
// En Game.js
this.debugMode = false;  // Debug visual
this.debugEnemyBuildMode = false;  // Construir como enemigo
this.debugEnemyDroneMode = false;  // Lanzar drones enemigos
this.devSupplyEnemyMode = false;  // Dar recursos a enemigo
```

---

## 📚 Documentación Adicional

- **Sprites**: Ver `docs/SPRITES_GUIDE.md`
- **IA Enemiga**: Ver `docs/archive/ENEMY_AI_GUIDE.md`
- **Balance**: Ver `docs/archive/GAME_BALANCE.md`
- **Roadmap Multiplayer**: Ver `.roadfaz` en raíz

---

**Última actualización:** 2025-10-16  
**Versión:** 2.0 (PvP-Ready)  
**Estado:** ✅ Fase 0 completada - Código preparado para multijugador  
**Próximo:** Fase 1 - Backend y Sincronización (ver `.roadfaz`)

