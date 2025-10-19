# 🎨 Guía de Sprites - Supply Line Commander

**Sistema completo de sprites con fallback automático**

---

## 📁 Estructura

```
assets/sprites/
├── bases/          → HQ, FOB, Front (+ estados _selected, _hovered, _critical)
├── vehicles/       → Truck, Helicopter (+ _returning opcional)
├── ui/             → Iconos pequeños (medal, supply, warning, truck_icon)
└── particles/      → Efectos visuales (dust, explosion, smoke) - OPCIONAL
```

---

## 🚀 Cómo Funciona

### ✅ Sistema de Fallback Automático

**El juego SIEMPRE funciona, con o sin sprites:**
- Si un sprite existe → lo usa
- Si NO existe → usa placeholder visual (círculos + emojis)

**Ventajas:**
- Puedes añadir sprites de forma incremental
- No necesitas tener todo listo a la vez
- El juego nunca se rompe por falta de assets
- Desarrollo iterativo y flexible

### 📊 Priorización (de mayor a menor impacto)

**🔴 CRÍTICO** (Afecta gameplay):
1. `bases/front_critical.png` - El jugador DEBE ver cuando hay peligro

**🟡 ALTA PRIORIDAD** (Identidad visual):
2. `bases/hq.png` - Base principal
3. `bases/fob.png` - Base intermedia
4. `bases/front.png` - Frente de batalla
5. `vehicles/truck.png` - Vehículo más usado

**🟢 MEDIA PRIORIDAD** (Feedback interactivo):
6. Estados `_selected` y `_hovered` de bases
7. `vehicles/helicopter.png`

**⚪ BAJA PRIORIDAD** (Refinamiento):
8. Iconos UI (los emojis funcionan bien)
9. Partículas (los círculos funcionan bien)
10. Estados `_returning` de vehículos

---

## 📐 Especificaciones Técnicas

### Formato General
- **Tipo**: PNG con transparencia (RGBA)
- **Fondo**: Transparente
- **Nomenclatura**: Todo minúsculas, guiones bajos `_`, sufijos de estado al final

### 🏗️ Bases

| Sprite | Dimensiones | Radio | Color | Descripción |
|--------|-------------|-------|-------|-------------|
| `hq.png` | 88×88px | 44px | Verde #27ae60 | Cuartel General, imponente |
| `fob.png` | 70×70px | 35px | Azul #3498db | Base táctica, funcional |
| `front.png` | 63×63px | 31.5px | Rojo #e74c3c | Línea de combate, caótica |

**Estados adicionales** (para cada una):
- `*_selected.png` - Seleccionado (borde dorado, más brillante)
- `*_hovered.png` - Hover (ligeramente iluminado)
- `front_critical.png` - **MUY IMPORTANTE**: < 20 recursos, debe pulsar en rojo

### 🚛 Vehículos

| Sprite | Dimensiones | Color | Orientación | Notas |
|--------|-------------|-------|-------------|-------|
| `truck.png` | 32×32px | Menta #4ecca3 | → Derecha (0°) | Camión de carga |
| `helicopter.png` | 32×32px | Oro #f39c12 | → Derecha (0°) | Heli de emergencia |

**Estados adicionales** (opcional):
- `*_returning.png` - Regresando vacío (más gris/oscuro)

**⚠️ Importante**: Los vehículos deben apuntar a la derecha. El juego los rotará automáticamente.

### 🎯 UI (Iconos)

| Sprite | Tamaño | Descripción | Reemplaza |
|--------|--------|-------------|-----------|
| `medal.png` | 24×24px | Condecoración dorada | 🎖️ |
| `supply_icon.png` | 20×20px | Caja de suministros | 📦 |
| `truck_icon.png` | 20×20px | Icono de vehículo | 🚛 |
| `warning_icon.png` | 20×20px | Advertencia roja | ⚠️ |

### 💥 Partículas (OPCIONAL)

| Sprite | Tamaño | Descripción |
|--------|--------|-------------|
| `dust.png` | 8×8px | Polvo de vehículos |
| `explosion.png` | 16×16px | Destello al enviar convoy |
| `smoke.png` | 12×12px | Humo de bases críticas |

---

## 🎨 Paleta de Colores

```
HQ (Verde):       #27ae60, #4ecca3
FOB (Azul):       #3498db
Front (Rojo):     #e74c3c
Truck (Menta):    #4ecca3
Helicopter (Oro): #f39c12
Crítico:          #ff0000 (alerta)
Selección:        #f39c12 (borde)
Fondo:            #0a0e27 (canvas)
```

---

## 📝 Cómo Añadir Sprites

### 1. Preparar archivo
```
✅ Correcto:
   assets/sprites/bases/hq.png
   assets/sprites/vehicles/truck.png

❌ Incorrecto:
   assets/HQ.PNG                    (ubicación y extensión)
   assets/sprites/bases/HQ_SPRITE.png  (nombre)
```

### 2. Testear en navegador
1. Abre el juego
2. Abre consola (F12)
3. Busca:
   ```
   🎨 AssetManager: Iniciando carga de sprites...
     ✓ base-hq cargado              ← Sprite OK
     ✗ base-fob no encontrado       ← Usando placeholder
   ```

### 3. Iterar
- ¿Muy grande/pequeño? → Ajusta dimensiones
- ¿No combina? → Revisa paleta
- ¿Se ve mal rotado? → Verifica orientación (vehículos a la derecha)

---

## 🔧 Debug en Consola

```javascript
// Ver sprites cargados
game.assetManager.images.forEach((img, key) => 
  console.log(key, img ? '✅' : '❌')
);

// Verificar sprite específico
game.assetManager.hasSprite('base-hq');  // true/false

// Recargar sprites
await game.assetManager.loadAll();
```

---

## 💡 Consejos de Diseño

### Estilo Visual
- **Temática**: Militar táctico retro-futurista
- **Perspectiva**: Top-down o isométrico 3/4
- **Detalle**: Medio (debe verse bien a tamaño pequeño)

### Bases
- Deben distinguirse entre sí a simple vista
- `front_critical` debe ser MUY obvio (pulsar, rojo brillante)
- Mantén consistencia de iluminación

### Vehículos
- SIEMPRE orientados hacia la derecha (→)
- Evita asimetría extrema (se ven raros al rotar)
- El "frente" del vehículo debe ser claro

### UI
- Legibilidad a 20×20px
- Alto contraste con fondo oscuro (#0a0e27)
- Simplicidad: reconocibles de inmediato

---

## 📋 Workflow Recomendado

```
Fase 1: Bases Principales
├─ hq.png, fob.png, front.png, front_critical.png
├─ Testear en juego
└─ Ajustar según feedback

Fase 2: Vehículos
├─ truck.png, helicopter.png
└─ Testear rotaciones y movimiento

Fase 3: Estados Interactivos
├─ _selected y _hovered de todas las bases
└─ Testear feedback visual

Fase 4: Refinamiento (opcional)
├─ Iconos UI
└─ Partículas
```

---

## ❓ FAQ

**¿Qué pasa si no envío todos los sprites?**  
✅ El juego funciona perfectamente usando placeholders.

**¿Puedo cambiar las dimensiones?**  
⚠️ Sí, pero mantén proporciones. El juego escala según el `radius`.

**¿Necesito animar los sprites?**  
❌ No. Son estáticos. Animaciones futuras son opcionales.

**¿Qué hago si se ve mal al rotar?**  
✓ Asegúrate que apunte a la derecha (0°)  
✓ Que tenga simetría razonable  
✓ Que el "frente" sea claro

**¿Los sprites afectan el rendimiento?**  
✅ No. Se cachean en memoria. 20-30 PNGs pequeños son triviales.

---

## 📞 Código Fuente

Si necesitas detalles técnicos:
- `src/systems/AssetManager.js` - Sistema de carga
- `src/systems/RenderSystem.js` - Sistema de renderizado
- `src/Game.js` - Integración principal

---

**¡El sistema está listo para recibir sprites!** 🚀














