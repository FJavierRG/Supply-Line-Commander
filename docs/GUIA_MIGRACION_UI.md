# 🎨 GUÍA DE MIGRACIÓN: UI/MENÚS A GODOT

## 📋 SITUACIÓN ACTUAL

### JavaScript (HTML/CSS)
- **OverlayManager:** Maneja elementos HTML (`<div id="main-menu-overlay">`)
- **UIManager:** Gestiona UI del juego usando HTML/CSS
- **StoreUIManager:** UI de tienda renderizada en Canvas
- **Menús:** Implementados en HTML con CSS

### Godot (Control Nodes)
- **CanvasLayer:** Para overlays/menús (equivalente a overlays HTML)
- **Control nodes:** Para UI (Button, Label, Panel, etc.)
- **Control nodes:** Renderizados automáticamente por Godot

---

## 🔄 MIGRACIÓN RECOMENDADA

### 1. OverlayManager → CanvasLayer + Control Nodes

#### JavaScript (actual):
```javascript
// OverlayManager.js
showOverlay('main-menu-overlay');
// Muestra <div id="main-menu-overlay">
```

#### Godot (recomendado):
```gdscript
# OverlayManager.gd
extends CanvasLayer

var overlays: Dictionary = {}

func show_overlay(overlay_id: String):
    if overlays.has(overlay_id):
        overlays[overlay_id].visible = true

func hide_overlay(overlay_id: String):
    if overlays.has(overlay_id):
        overlays[overlay_id].visible = false
```

**Estructura en Godot:**
```
Main (Node2D)
├── CanvasLayer (OverlayManager)
│   ├── MainMenuOverlay (Control)
│   ├── PauseOverlay (Control)
│   ├── VictoryOverlay (Control)
│   └── DefeatOverlay (Control)
```

### 2. UIManager → Control Nodes

#### JavaScript (actual):
```javascript
// UIManager.js
showMainMenu() {
    this.overlayManager.showOverlay('main-menu-overlay');
}
```

#### Godot (recomendado):
```gdscript
# UIManager.gd
extends Node

var game: Node
var main_menu: Control

func initialize(game_ref: Node):
    game = game_ref
    # Crear menú principal
    create_main_menu()

func show_main_menu():
    if main_menu:
        main_menu.visible = true
        game.audio_manager.play_main_theme()
```

**Estructura de menú en Godot:**
```
MainMenuOverlay (Control)
├── VBoxContainer
│   ├── Label (Título del juego)
│   ├── Button (Jugar)
│   ├── Button (Multijugador)
│   ├── Button (Opciones)
│   └── Button (Salir)
```

### 3. StoreUIManager → Control Nodes con GridContainer

#### JavaScript (actual):
```javascript
// StoreUIManager.js
render(ctx) {
    // Renderiza UI en Canvas
    ctx.drawImage(sprite, x, y);
}
```

#### Godot (recomendado):
```gdscript
# StoreUIManager.gd
extends Control

var build_system: BuildingSystem
var game: Node

func _ready():
    create_store_ui()

func create_store_ui():
    # Panel principal
    var panel = Panel.new()
    panel.size = Vector2(292, 125)
    panel.position = Vector2(40, 40)
    add_child(panel)
    
    # GridContainer para items
    var grid = GridContainer.new()
    grid.columns = 2
    # ... añadir botones de items
```

**Estructura en Godot:**
```
StoreUI (Control)
├── Panel (Fondo)
│   ├── HBoxContainer (Botones categorías)
│   │   ├── Button (Edificios)
│   │   └── Button (Vehículos)
│   └── GridContainer (Items)
│       ├── Button (Item 1)
│       ├── Button (Item 2)
│       └── ...
```

---

## 📐 CONVERSIÓN DE COORDENADAS

### JavaScript → Godot

| JavaScript | Godot |
|------------|-------|
| `x, y` (píxeles) | `position = Vector2(x, y)` |
| `width, height` | `size = Vector2(width, height)` |
| `element.style.display = 'none'` | `node.visible = false` |
| `element.style.display = 'block'` | `node.visible = true` |
| `element.classList.add('active')` | Usar propiedades o señales |

### CSS → Godot

| CSS | Godot |
|-----|-------|
| `background-color` | `Panel.modulate` o `ColorRect.color` |
| `font-size` | `Label.add_theme_font_size_override()` |
| `padding` | `MarginContainer` o `stylebox` |
| `flexbox` | `HBoxContainer` / `VBoxContainer` |

---

## 🎯 PLAN DE IMPLEMENTACIÓN

### Paso 1: OverlayManager
1. Crear `OverlayManager.gd` que extienda `CanvasLayer`
2. Crear escenas `.tscn` para cada overlay:
   - `MainMenuOverlay.tscn`
   - `PauseOverlay.tscn`
   - `VictoryOverlay.tscn`
   - `DefeatOverlay.tscn`
3. Cargar overlays en `OverlayManager._ready()`

### Paso 2: UIManager
1. Crear `UIManager.gd`
2. Crear escena `MainMenuOverlay.tscn` con Control nodes
3. Conectar botones a señales

### Paso 3: StoreUIManager
1. Crear `StoreUIManager.gd` que extienda `Control`
2. Usar `GridContainer` para items
3. Usar `TextureButton` para botones con sprites
4. Crear tooltips usando `TooltipPanel` o `PopupPanel`

---

## 💡 VENTAJAS EN GODOT

### ✅ Ventajas:
- **Renderizado automático:** No necesitas `render()` manual
- **Layout automático:** Containers manejan posicionamiento
- **Señales:** Sistema de eventos integrado
- **Theme system:** Estilos consistentes
- **Animaciones:** AnimatedSprite, AnimationPlayer nativos
- **Input:** Manejo automático de clicks/hover

### ⚠️ Desventajas:
- **Código adicional:** Necesitas crear escenas `.tscn`
- **Curva de aprendizaje:** Control nodes diferentes a HTML/CSS

---

## 🔧 EJEMPLO COMPLETO: Menú Principal

### Escena: `MainMenuOverlay.tscn`
```
MainMenuOverlay (Control)
├── ColorRect (Fondo oscuro)
└── CenterContainer
    └── VBoxContainer
        ├── Label (Título)
        ├── Button (Jugar)
        │   └── pressed -> _on_play_pressed()
        ├── Button (Multijugador)
        │   └── pressed -> _on_multiplayer_pressed()
        ├── Button (Opciones)
        │   └── pressed -> _on_options_pressed()
        └── Button (Salir)
            └── pressed -> _on_exit_pressed()
```

### Script: `MainMenuOverlay.gd`
```gdscript
extends Control

signal play_pressed
signal multiplayer_pressed
signal options_pressed
signal exit_pressed

func _on_play_pressed():
    emit_signal("play_pressed")

func _on_multiplayer_pressed():
    emit_signal("multiplayer_pressed")

func _on_options_pressed():
    emit_signal("options_pressed")

func _on_exit_pressed():
    emit_signal("exit_pressed")
```

---

## 📊 ESTADO ACTUAL

- ✅ **Sistemas core migrados:** 11/11 (100%)
- ❌ **Sistemas UI migrados:** 0/6 (0%)
- ⏳ **Prioridad:** 🔴 ALTA para UI/Menús

---

**Recomendación:** Empezar con OverlayManager y UIManager primero, ya que son críticos para la navegación del juego.




