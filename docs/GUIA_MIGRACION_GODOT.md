# 🎮 Guía Completa de Migración: JavaScript → Godot GDScript

**Para principiantes que nunca han usado Godot**

---

## 📋 Tabla de Contenidos

1. [Instalación y Configuración Inicial](#1-instalación-y-configuración-inicial)
2. [Conceptos Básicos de Godot](#2-conceptos-básicos-de-godot)
3. [Estructura del Proyecto](#3-estructura-del-proyecto)
4. [Migración Sistema por Sistema](#4-migración-sistema-por-sistema)
5. [Integración Socket.IO](#5-integración-socketio)
6. [Exportación a Steam](#6-exportación-a-steam)
7. [Cheat Sheet GDScript](#7-cheat-sheet-gdscript)

---

## 1. Instalación y Configuración Inicial

### 1.1 Descargar Godot

1. Ve a: https://godotengine.org/download
2. Descarga **Godot 4.2** (o la versión estable más reciente)
3. **NO necesitas instalarlo** - Godot es portable (ejecutable directo)
4. Guarda el ejecutable en una carpeta fácil de encontrar (ej: `C:\Godot\`)

### 1.2 Crear Proyecto Nuevo

1. Abre Godot
2. Click en **"New Project"**
3. Configura:
   - **Project Name:** `SupplyLineCommander`
   - **Project Path:** `C:\Users\fjrg\Documents\ProyectoMil\godot\`
   - **Renderer:** `Forward Plus` (por defecto, está bien)
4. Click **"Create & Edit"**

### 1.3 Configuración Inicial del Proyecto

1. Ve a **Project → Project Settings**
2. En **Application → Config**:
   - **Name:** `Supply Line Commander`
   - **Run → Main Scene:** (lo configuramos después)
3. En **Display → Window**:
   - **Size:** `1920 x 1080` (igual que tu BASE_WIDTH/BASE_HEIGHT)
   - **Mode:** `Windowed` (para desarrollo)
   - **Stretch → Mode:** `viewport` (mantiene aspecto)
4. Click **"Close"**

### 1.4 Crear Estructura de Carpetas

En el **FileSystem** (panel izquierdo), crea esta estructura:

```
godot/
├── scenes/          # Escenas de Godot
│   ├── core/        # Escenas principales
│   ├── ui/          # Interfaces
│   └── entities/    # Entidades del juego
├── scripts/         # Scripts GDScript
│   ├── core/        # Game.js, main.js equivalente
│   ├── systems/     # Todos tus sistemas
│   ├── entities/    # VisualNode, Convoy, etc.
│   └── config/      # Configuraciones
├── assets/          # Assets del juego
│   ├── sprites/     # Copiar desde assets/sprites/
│   └── sounds/       # Copiar desde assets/sounds/
└── addons/          # Addons de terceros (Socket.IO)
```

**Para crear carpetas:** Click derecho en FileSystem → **"New Folder"**

---

## 2. Conceptos Básicos de Godot

### 2.1 ¿Qué es Godot?

Godot es un motor de juegos **basado en nodos**. Todo es un nodo, y los nodos se organizan en árboles.

### 2.2 Conceptos Clave

#### **Nodos (Nodes)**
- Son los "bloques de construcción" de Godot
- Cada cosa en el juego es un nodo
- Ejemplos:
  - `Node2D` → Para cosas 2D (tu juego)
  - `Sprite2D` → Para mostrar imágenes
  - `Camera2D` → Para la cámara
  - `CanvasLayer` → Para UI

#### **Escenas (Scenes)**
- Son árboles de nodos guardados en archivos `.tscn`
- Equivalente a "prefabs" en Unity o "componentes" en tu JS
- Tu juego principal será una escena

#### **Scripts (GDScript)**
- Archivos `.gd` que controlan el comportamiento
- Se adjuntan a nodos
- **Muy similar a JavaScript**

### 2.3 Diferencias Clave con tu Código Actual

| JavaScript (Actual) | Godot GDScript |
|---------------------|----------------|
| `class Game { }` | `extends Node` |
| `this.canvas` | `$CanvasLayer` (referencia a nodo) |
| `canvas.getContext('2d')` | `Sprite2D` nodes automáticos |
| `ctx.drawImage()` | `sprite.texture = image` |
| `requestAnimationFrame()` | `_process()` o `_ready()` |
| `new Image()` | `preload()` o `load()` |

---

## 3. Estructura del Proyecto

### 3.1 Mapeo de Archivos

| Tu Código Actual (JS) | Godot Equivalente |
|----------------------|-------------------|
| `src/Game.js` | `scripts/core/Game.gd` |
| `src/main.js` | `scenes/core/Main.tscn` + script |
| `src/systems/RenderSystem.js` | `scripts/systems/RenderSystem.gd` |
| `src/systems/NetworkManager.js` | `scripts/systems/NetworkManager.gd` |
| `src/config/constants.js` | `scripts/config/Constants.gd` |
| `assets/sprites/` | `assets/sprites/` (igual) |

### 3.2 Copiar Assets

1. Copia toda la carpeta `assets/sprites/` → `godot/assets/sprites/`
2. Copia toda la carpeta `assets/sounds/` → `godot/assets/sounds/`
3. **NO necesitas cambiar nada** - solo copiar y pegar

---

## 4. Migración Sistema por Sistema

### 4.1 Paso 1: Configuración (Constants.gd)

**JavaScript (`src/config/constants.js`):**
```javascript
export const GAME_CONFIG = {
    CANVAS_BG_COLOR: '#0a0e27',
    GRID_SIZE: 50,
    BASE_WIDTH: 1920,
    BASE_HEIGHT: 1080,
};
```

**GDScript (`scripts/config/Constants.gd`):**
```gdscript
extends Node

class_name Constants

const GAME_CONFIG = {
    "CANVAS_BG_COLOR": Color("#0a0e27"),
    "GRID_SIZE": 50,
    "BASE_WIDTH": 1920,
    "BASE_HEIGHT": 1080,
}

const VEHICLE_TYPES = {
    "heavy_truck": {
        "name": "Camión Pesado",
        "color": Color("#4ecca3")
    },
    "truck": {
        "name": "Camión",
        "color": Color("#4ecca3")
    },
    # ... más tipos
}
```

**Diferencias clave:**
- `export const` → `const` (en GDScript, const es global si está en un class_name)
- `'#0a0e27'` → `Color("#0a0e27")` (Godot usa tipo Color)
- Los objetos se crean con `{}` igual que JS

### 4.2 Paso 2: AssetManager

**JavaScript (`src/systems/AssetManager.js`):**
```javascript
export class AssetManager {
    constructor() {
        this.images = new Map();
    }
    
    async loadImage(path) {
        const img = new Image();
        img.src = path;
        await img.decode();
        this.images.set(key, img);
    }
}
```

**GDScript (`scripts/systems/AssetManager.gd`):**
```gdscript
extends Node

class_name AssetManager

var images: Dictionary = {}
var load_status: Dictionary = {}
var all_loaded: bool = false
var loading_progress: float = 0.0

# Catálogo de assets (igual que tu código)
var asset_catalog = {
    "base-hq": "res://assets/sprites/bases/HQ.png",
    "base-fob": "res://assets/sprites/bases/FOB.png",
    # ... más sprites
}

func _ready():
    load_all_assets()

func load_all_assets():
    var total = asset_catalog.size()
    var loaded = 0
    
    for key in asset_catalog:
        var path = asset_catalog[key]
        var texture = load(path)
        if texture:
            images[key] = texture
            loaded += 1
            loading_progress = float(loaded) / float(total)
        else:
            print("Error cargando: ", path)
    
    all_loaded = true
    print("Assets cargados: ", loaded, "/", total)

func get_sprite(key: String) -> Texture2D:
    return images.get(key, null)
```

**Diferencias clave:**
- `Map` → `Dictionary` (equivalente en GDScript)
- `new Image()` → `load()` o `preload()` (Godot carga automáticamente)
- `async/await` → No necesario (load es síncrono, o usa `call_deferred()`)
- `res://` → Prefijo especial de Godot para rutas de assets

### 4.3 Paso 3: Game (Clase Principal)

**JavaScript (`src/Game.js`):**
```javascript
export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.assetManager = new AssetManager();
        this.renderer = new RenderSystem(canvas, this.assetManager);
    }
    
    gameLoop() {
        this.update(dt);
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}
```

**GDScript (`scripts/core/Game.gd`):**
```gdscript
extends Node2D

class_name Game

# Referencias a sistemas
var asset_manager: AssetManager
var render_system: RenderSystem
var network_manager: NetworkManager
var game_state_manager: GameStateManager

# Estado del juego
var state: String = "menu"
var is_multiplayer: bool = false
var my_team: String = "ally"

func _ready():
    # Inicializar sistemas
    asset_manager = AssetManager.new()
    add_child(asset_manager)
    
    render_system = RenderSystem.new()
    add_child(render_system)
    render_system.initialize(self, asset_manager)
    
    network_manager = NetworkManager.new()
    add_child(network_manager)
    network_manager.initialize(self)
    
    game_state_manager = GameStateManager.new()
    add_child(game_state_manager)
    game_state_manager.set_state("menu")

func _process(delta: float):
    # delta es el tiempo entre frames (equivalente a tu dt)
    if state == "playing":
        update(delta)
    
    render()

func update(dt: float):
    # Tu lógica de actualización aquí
    pass

func render():
    # El renderizado se hace automáticamente con nodos
    # Pero puedes llamar a render_system.render() si lo necesitas
    pass
```

**Diferencias clave:**
- `extends Node2D` → Tu juego hereda de Node2D (para 2D)
- `_ready()` → Se ejecuta una vez al inicio (como constructor)
- `_process(delta)` → Se ejecuta cada frame (como tu gameLoop)
- `add_child()` → Añade nodos al árbol (Godot maneja automáticamente)

### 4.4 Paso 4: Escena Principal (Main.tscn)

**Crear la escena principal:**

1. En FileSystem, click derecho → **"New Scene"**
2. Añade un nodo raíz: Click **"Other Node"** → Busca `Node2D` → **"Create"**
3. Nombre el nodo: `Main` (click en el nodo en el árbol)
4. Adjunta el script: Click en el nodo → Panel derecho → **"Attach Script"**
5. Selecciona: `scripts/core/Game.gd` → **"Create"**
6. Guarda la escena: `scenes/core/Main.tscn`

**Configurar como escena principal:**

1. Project → Project Settings → Application → Run → Main Scene
2. Selecciona `scenes/core/Main.tscn`

### 4.5 Paso 5: RenderSystem (Básico)

**JavaScript (`src/systems/RenderSystem.js`):**
```javascript
export class RenderSystem {
    constructor(canvas, assetManager, game) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }
    
    renderNode(node) {
        const sprite = this.assetManager.getSprite(node.spriteKey);
        this.ctx.drawImage(sprite, node.x, node.y);
    }
}
```

**GDScript (`scripts/systems/RenderSystem.gd`):**
```gdscript
extends Node2D

class_name RenderSystem

var game: Game
var asset_manager: AssetManager
var camera: Camera2D

func initialize(game_ref: Game, asset_mgr: AssetManager):
    game = game_ref
    asset_manager = asset_mgr
    
    # Crear cámara
    camera = Camera2D.new()
    add_child(camera)
    camera.make_current()

func render_node(node: VisualNode):
    # En Godot, los nodos se renderizan automáticamente
    # Pero puedes crear sprites dinámicamente:
    var sprite = Sprite2D.new()
    sprite.texture = asset_manager.get_sprite(node.sprite_key)
    sprite.position = Vector2(node.x, node.y)
    add_child(sprite)
    
    # O mejor: que VisualNode tenga su propio Sprite2D
    # (ver siguiente sección)
```

**IMPORTANTE:** En Godot, normalmente **NO renderizas manualmente**. Los nodos se renderizan solos. Tu `RenderSystem` será más un "organizador" de nodos.

### 4.6 Paso 6: VisualNode (Entidad)

**JavaScript (`src/entities/visualNode.js`):**
```javascript
export class VisualNode {
    constructor(x, y, nodeId, config, game) {
        this.x = x;
        this.y = y;
        this.type = nodeId;
        this.spriteKey = config.spriteKey;
    }
}
```

**GDScript (`scripts/entities/VisualNode.gd`):**
```gdscript
extends Node2D

class_name VisualNode

var node_type: String
var sprite_key: String
var node_id: String
var radius: float = 30.0

# Referencias
var sprite: Sprite2D
var game: Game

func _init(x: float, y: float, type: String, config: Dictionary, game_ref: Game = null):
    position = Vector2(x, y)
    node_type = type
    sprite_key = config.get("spriteKey", "")
    radius = config.get("radius", 30.0)
    game = game_ref

func _ready():
    # Crear sprite visual
    sprite = Sprite2D.new()
    if game and game.asset_manager:
        sprite.texture = game.asset_manager.get_sprite(sprite_key)
    add_child(sprite)
    
    # Ajustar escala si es necesario
    if sprite.texture:
        var scale_factor = (radius * 2) / sprite.texture.get_width()
        sprite.scale = Vector2(scale_factor, scale_factor)
```

**Diferencias clave:**
- `extends Node2D` → VisualNode ES un nodo en Godot
- `this.x, this.y` → `position` (Vector2 en Godot)
- `_init()` → Constructor (como constructor en JS)
- `_ready()` → Se ejecuta cuando el nodo se añade al árbol

### 4.7 Paso 7: NetworkManager (Socket.IO)

**IMPORTANTE:** Godot NO tiene Socket.IO nativo. Necesitas un addon.

#### Instalar Addon Socket.IO:

1. Ve a: https://github.com/fenrisus/godot-socketio-client
2. Descarga el repositorio (ZIP)
3. Extrae la carpeta `socketio-client` → `godot/addons/socketio-client/`
4. En Godot: Project → Project Settings → Plugins → Activa "SocketIO Client"

**GDScript (`scripts/systems/NetworkManager.gd`):**
```gdscript
extends Node

class_name NetworkManager

var game: Game
var socket: SocketIOClient
var connected: bool = false
var room_id: String = ""
var my_team: String = ""
var opponent_team: String = ""

var server_url: String = "http://localhost:3000"

func initialize(game_ref: Game):
    game = game_ref
    
    # Auto-detectar URL
    if OS.has_feature("editor"):
        server_url = "http://localhost:3000"
    else:
        # En producción, configurar desde fuera
        server_url = "http://localhost:3000"  # TODO: Cambiar en producción

func connect_to_server():
    socket = SocketIOClient.new()
    socket.connect_to_url(server_url)
    
    # Conectar señales (eventos)
    socket.connect("connected", _on_connected)
    socket.connect("disconnected", _on_disconnected)
    socket.connect("error", _on_error)
    
    # Eventos del juego
    socket.on("room_created", _on_room_created)
    socket.on("game_update", _on_game_update)
    socket.on("game_start", _on_game_start)

func _on_connected():
    connected = true
    print("✅ Conectado al servidor")

func _on_disconnected():
    connected = false
    print("❌ Desconectado del servidor")

func _on_error(error_msg: String):
    print("❌ Error: ", error_msg)

func _on_room_created(data: Dictionary):
    room_id = data.get("roomId", "")
    my_team = "player1"
    game.my_team = "player1"
    print("🎮 Sala creada: ", room_id)

func _on_game_update(data: Dictionary):
    # Actualizar estado del juego desde el servidor
    if game:
        game.handle_server_update(data)

func _on_game_start(data: Dictionary):
    game.my_team = data.get("myTeam", "")
    game.is_multiplayer = true
    game.state = "playing"
    print("🎮 Partida iniciada!")

func emit_build_request(building_type: String, x: float, y: float):
    if socket and connected:
        socket.emit("build_request", {
            "roomId": room_id,
            "buildingType": building_type,
            "x": x,
            "y": y
        })
```

**Diferencias clave:**
- `io()` → `SocketIOClient.new()` (addon)
- `socket.on()` → `socket.on()` (igual)
- `socket.emit()` → `socket.emit()` (igual)
- `socket.connect()` → Señales de Godot (equivalente a eventos)

---

## 5. Integración Socket.IO

### 5.1 Instalación del Addon

Ya explicado arriba. Si el addon no funciona, hay alternativas:

1. **godot-socketio** (otro addon)
2. **WebSocket nativo** (requiere reescribir el protocolo)

### 5.2 Configuración del Servidor

**¡IMPORTANTE!** Tu servidor Node.js **NO cambia**. Solo cambia cómo se conecta el cliente.

El servidor sigue igual:
- `server/server.js` → Sin cambios
- Socket.IO → Funciona igual
- Eventos → Iguales

### 5.3 Prueba de Conexión

**Crear script de prueba (`scripts/test/NetworkTest.gd`):**
```gdscript
extends Node

func _ready():
    var network = NetworkManager.new()
    add_child(network)
    network.connect_to_server()
    
    # Esperar 2 segundos y probar
    await get_tree().create_timer(2.0).timeout
    if network.connected:
        print("✅ Conexión exitosa!")
    else:
        print("❌ Error de conexión")
```

---

## 6. Exportación a Steam

### 6.1 Configuración de Build

1. Project → Project Settings → Application → Config
2. **Name:** `Supply Line Commander`
3. **Version:** `1.0.0`
4. **Description:** `RTS multijugador de logística militar`

### 6.2 Exportar para Windows

1. Project → Export
2. Click **"Add..."** → Selecciona **"Windows Desktop"**
3. Configura:
   - **Executable Name:** `SupplyLineCommander.exe`
   - **Custom Features:** (dejar vacío por ahora)
4. Click **"Export Project"**
5. Selecciona carpeta de destino
6. Click **"Save"**

### 6.3 Integración Steam (Opcional, para más adelante)

Requiere Steamworks SDK. Esto es avanzado, lo hacemos después de tener el juego funcionando.

**Pasos básicos:**
1. Descargar Steamworks SDK
2. Añadir a proyecto Godot
3. Usar addon de Steam para Godot

---

## 7. Cheat Sheet GDScript

### 7.1 Sintaxis Básica

```gdscript
# Variables
var nombre: String = "Hola"
var numero: int = 42
var decimal: float = 3.14
var booleano: bool = true
var diccionario: Dictionary = {"key": "value"}
var array: Array = [1, 2, 3]

# Constantes
const PI: float = 3.14159

# Funciones
func mi_funcion(parametro: String) -> void:
    print(parametro)

func suma(a: int, b: int) -> int:
    return a + b

# Clases
extends Node2D

class_name MiClase

# Herencia
extends Node2D
```

### 7.2 Equivalencias JavaScript → GDScript

| JavaScript | GDScript |
|------------|----------|
| `let x = 5` | `var x: int = 5` |
| `const PI = 3.14` | `const PI: float = 3.14` |
| `function foo() {}` | `func foo():` |
| `class X {}` | `class_name X extends Node` |
| `this.prop` | `self.prop` o solo `prop` |
| `new Map()` | `Dictionary` o `Array` |
| `array.push()` | `array.append()` |
| `array.length` | `array.size()` |
| `Math.random()` | `randf()` o `randi()` |
| `setTimeout()` | `await get_tree().create_timer(2.0).timeout` |
| `requestAnimationFrame()` | `_process(delta)` automático |

### 7.3 Nodos Comunes

```gdscript
# Sprite2D (imagen)
var sprite = Sprite2D.new()
sprite.texture = preload("res://assets/sprites/base.png")
sprite.position = Vector2(100, 100)
add_child(sprite)

# Camera2D (cámara)
var camera = Camera2D.new()
camera.position = Vector2(500, 500)
camera.make_current()
add_child(camera)

# Label (texto)
var label = Label.new()
label.text = "Hola mundo"
label.position = Vector2(10, 10)
add_child(label)

# Button (botón)
var button = Button.new()
button.text = "Click me"
button.position = Vector2(100, 100)
button.pressed.connect(_on_button_pressed)
add_child(button)

func _on_button_pressed():
    print("Botón presionado!")
```

### 7.4 Señales (Events)

```gdscript
# Definir señal
signal mi_senal(parametro: String)

# Emitir señal
emit_signal("mi_senal", "valor")

# Conectar señal
mi_nodo.mi_senal.connect(_on_mi_senal)

func _on_mi_senal(valor: String):
    print("Recibido: ", valor)
```

---

## 8. Plan de Migración Paso a Paso

### Fase 1: Preparación (Día 1)
- [ ] Instalar Godot
- [ ] Crear proyecto nuevo
- [ ] Copiar assets (sprites, sounds)
- [ ] Crear estructura de carpetas

### Fase 2: Core (Día 2-3)
- [ ] Migrar `Constants.gd`
- [ ] Migrar `AssetManager.gd`
- [ ] Crear escena `Main.tscn`
- [ ] Migrar `Game.gd` básico
- [ ] Probar que carga assets

### Fase 3: Red (Día 4-5)
- [ ] Instalar addon Socket.IO
- [ ] Migrar `NetworkManager.gd`
- [ ] Probar conexión con servidor
- [ ] Recibir `game_update` del servidor

### Fase 4: Renderizado (Día 6-8)
- [ ] Migrar `RenderSystem.gd` básico
- [ ] Migrar `VisualNode.gd`
- [ ] Crear nodos visuales desde servidor
- [ ] Probar renderizado de sprites

### Fase 5: Sistemas de Juego (Día 9-12)
- [ ] Migrar `BuildingSystem.gd`
- [ ] Migrar `ConvoyManager.gd`
- [ ] Migrar `TerritorySystem.gd`
- [ ] Migrar sistemas de unidades (Drone, Tank)

### Fase 6: UI (Día 13-15)
- [ ] Migrar `UIManager.gd`
- [ ] Crear escenas de UI (menús, overlays)
- [ ] Migrar `InputHandler.gd`
- [ ] Conectar botones y eventos

### Fase 7: Audio y Polish (Día 16-18)
- [ ] Migrar `AudioManager.gd`
- [ ] Añadir sonidos
- [ ] Optimización
- [ ] Testing completo

### Fase 8: Exportación (Día 19-20)
- [ ] Configurar build
- [ ] Exportar para Windows
- [ ] Probar ejecutable
- [ ] Preparar para Steam (opcional)

---

## 9. Consejos y Trucos

### 9.1 Debugging

```gdscript
# Print normal
print("Valor: ", variable)

# Print con formateo
print("Posición: %s, %s" % [x, y])

# Breakpoint (en editor)
breakpoint  # Pausa aquí en debug mode

# Ver nodos en consola
print(get_tree().get_nodes_in_group("nodes"))
```

### 9.2 Referencias a Nodos

```gdscript
# Por nombre (path)
var sprite = $Sprite2D

# Por grupo
var nodes = get_tree().get_nodes_in_group("game_nodes")

# Buscar por nombre
var camera = get_node("../Camera2D")
```

### 9.3 Cargar Assets

```gdscript
# Preload (al inicio, carga inmediata)
var sprite = preload("res://assets/sprites/base.png")

# Load (cuando lo necesites)
var sprite = load("res://assets/sprites/base.png")

# Desde AssetManager
var sprite = asset_manager.get_sprite("base-hq")
```

### 9.4 Async/Await Equivalent

```gdscript
# Esperar tiempo
await get_tree().create_timer(2.0).timeout

# Esperar señal
await mi_nodo.mi_senal

# Esperar función
func carga_async():
    await carga_assets()
    print("Carga completada")
```

---

## 10. Recursos y Ayuda

### Documentación Oficial
- **Godot Docs:** https://docs.godotengine.org/
- **GDScript Guide:** https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/index.html
- **2D Tutorial:** https://docs.godotengine.org/en/stable/tutorials/2d/index.html

### Addons Útiles
- **Socket.IO Client:** https://github.com/fenrisus/godot-socketio-client
- **Steam Integration:** Buscar "godot steam" en Asset Library

### Comunidad
- **Godot Forums:** https://forum.godotengine.org/
- **Reddit:** r/godot
- **Discord:** Godot Discord oficial

---

## 11. Siguiente Paso

**Cuando estés listo para empezar:**

1. **Instala Godot** (15 minutos)
2. **Crea el proyecto** (5 minutos)
3. **Copia los assets** (2 minutos)
4. **Dime "empecemos"** y te guío paso a paso con cada sistema

**Puedo ayudarte con:**
- ✅ Crear cada archivo GDScript
- ✅ Explicar cada concepto
- ✅ Debuggear problemas
- ✅ Convertir tu código específico

**Todo desde Cursor, igual que siempre** 🚀

---

**Última actualización:** 2024
**Estado:** Guía completa - Lista para usar




