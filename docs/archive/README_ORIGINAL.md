# 🎮 Supply Line Commander

Un juego de estrategia logística militar en tiempo real que funciona completamente en navegador web.

## 🎯 Concepto

Eres un comandante de logística militar encargado de mantener vivas las líneas de suministro en un frente de guerra activo. Los frentes consumen recursos constantemente y avanzan/retroceden según su munición. Tu objetivo: empujar el frente hasta conquistar el HQ enemigo antes de que el enemigo conquiste el tuyo.

## ✨ Características Principales

### 🎖️ **Gestión Logística en Tiempo Real**
- Establece cadenas de suministro: HQ → FOB → FRENTE
- Gestiona vehículos limitados entre múltiples frentes
- Los frentes avanzan con munición, retroceden sin ella

### 🏗️ **Sistema de Construcción**
- **FOBs**: Bases avanzadas para extender tu red logística
- **Anti-Dron**: Defensa contra ataques aéreos enemigos
- **Hospital de Campaña**: Envía ambulancias a frentes con emergencias médicas
- **Planta Nuclear**: Aumenta generación pasiva de recursos
- **Dron Bomba**: Destruye FOBs enemigos

### 🚑 **Emergencias Médicas**
- Los frentes pueden sufrir bajas y necesitar atención médica
- Envía ambulancias desde el HQ o Hospitales de Campaña
- Ignorar emergencias aumenta el consumo de recursos (+30%)

### 🎵 **Sistema de Audio Inmersivo**
- Música de batalla ambiental
- Efectos de radio y comunicaciones
- Sonidos específicos por evento (explosiones, drones, emergencias)
- Control de volumen completo (Maestro, Música, Efectos)

### 🎨 **Arte Pixel Personalizado**
- Sprites únicos para cada tipo de nodo
- Estados visuales (crítico, sin munición, construcción)
- Efectos de partículas y explosiones
- UI con frames personalizados

---

## 🎮 Cómo Jugar

### **Controles Básicos**

**Selección y Envío:**
1. Click en **HQ o FOB** → Selecciona origen
2. Click en **FOB o Frente** → Envía convoy de suministros
3. **Shift + Click** → Envía múltiples convoyes sin deseleccionar

**Modo Médico (HQ):**
1. Click en los **iconos** sobre el HQ para cambiar modo
2. **Camión** = Modo Munición (envía suministros)
3. **Ambulancia** = Modo Médico (envía ambulancias a frentes con 🚑)

**Construcción:**
1. Click en categoría de la **Tienda** (esquina superior izquierda)
2. Click en el **edificio/proyectil** deseado
3. Click en el **mapa** para colocar
4. Click derecho para cancelar

### **Objetivos**

**🏆 Victoria:** Tu frente alcanza la línea vertical del HQ enemigo

**💀 Derrota:** El frente enemigo alcanza la línea vertical de tu HQ

### **Recursos**

**Currency ($):**
- Ganancia pasiva: 2$/segundo (base)
- Ganancia por avance: Por cada pixel que avanza el frente
- Bonificaciones: Plantas Nucleares (+2$/s cada una)

**Munición:**
- Los frentes consumen munición constantemente (0.7/s)
- Sin munición → El frente retrocede
- Envía convoyes para reabastecer

---

## 🏗️ Nodos del Juego

### **Nodos Base**

**🏠 HQ (Cuartel General)**
- Nodo principal con recursos infinitos
- 4 camiones disponibles
- 1 ambulancia para emergencias
- Invulnerable

**⛺ FOB (Base Avanzada)** - 200$
- Base intermedia de suministros
- 2 camiones disponibles
- Puede ser destruida por drones

**⚔️ Frente**
- Nodo de combate que consume munición
- Avanza cuando tiene recursos
- Retrocede sin recursos

### **Edificios Construibles**

**🛡️ Anti-Dron** - 150$
- Destruye automáticamente drones enemigos en su rango
- Se consume tras disparar
- Rango de detección: 160px

**🏥 Hospital de Campaña** - 400$
- 1 ambulancia para emergencias médicas
- Rango de acción: 200px
- Puede ser destruido

**⚡ Planta Nuclear** - 500$
- +2$/segundo de generación pasiva
- Puede ser destruida
- Se puede construir en cualquier lugar

### **Proyectiles**

**💣 Dron Bomba** - 200$
- Destruye un FOB enemigo
- Puede ser interceptado por Anti-Drones

---

## ⚙️ Sistemas Técnicos

### **Sistema Unificado de Nodos**

TODO es un `MapNode` con propiedades opcionales:
```javascript
// Configuración en src/config/nodes.js
{
    id, name, description, spriteKey,
    category: 'map_node' | 'buildable' | 'enemy' | 'projectile',
    enabled: true/false,  // Activa/desactiva construibles
    hasSupplies, hasVehicles, hasMedicalSystem,
    // ... propiedades específicas
}
```

### **Renderizado Unificado**

Un solo método `renderNode()` para todo:
- Detecta automáticamente el tipo
- Aplica estados visuales
- Gestiona UI específica (barras, contadores, rangos)

### **Sistema de Audio con Pooling**

- Múltiples instancias de sonidos simultáneos
- Sin cancelaciones ni interrupciones
- Limpieza automática de memoria
- Flags para prevenir spam

### **Helpers de Compatibilidad**

```javascript
game.nodes        // Array unificado
game.bases        // Getter que filtra nodos con vehículos
game.buildings    // Getter que filtra construibles
```

---

## 🛠️ Para Desarrolladores

### **Añadir un Nuevo Edificio**

1. Edita `src/config/nodes.js`:
```javascript
newBuilding: {
    id: 'newBuilding',
    name: 'Nombre',
    description: 'Descripción',
    spriteKey: 'building-new',
    category: 'buildable',
    enabled: true,
    cost: 300,
    // ... propiedades específicas
}
```

2. Añade sprite en `assets/sprites/buildings/new.png`

3. Registra en `AssetManager.js`:
```javascript
'building-new': 'assets/sprites/buildings/new.png'
```

¡Listo! Aparecerá automáticamente en tienda y arsenal.

### **Desactivar un Construible**

Simplemente cambia en `nodes.js`:
```javascript
enabled: false
```

### **Ajustar Balance**

Edita valores en `src/config/nodes.js`:
```javascript
front: {
    consumeRate: 0.7,  // Consumo por segundo
    maxSupplies: 100,
    // ...
}
```

---

## 🎨 Assets

### **Sprites Requeridos**

**Bases:** `assets/sprites/bases/`
- `HQ.png`, `front.png`, `FOB.png`
- `hq_enemy.png`, `front_enemy.png`, `fob_enemy.png`
- `front_no_ammo.png`, `front_enemy_no_ammo.png`

**Edificios:** `assets/sprites/buildings/`
- `anti_drone_weapon.png`
- `campaign_hospital.png`
- `nuclear_plant.png`
- `construccion.png` (sprite de construcción)

**Vehículos:** `assets/sprites/vehicles/`
- `truck.png`, `ambulance.png`, `drone.png`

**UI:** `assets/sprites/ui/`
- `UIFrames/medium_bton.png`, `currency_bton.png`
- Iconos: `supplies.png`, `vehicle_icon.png`, `medic_vehicle_icon.png`

### **Audio**

Todos los archivos en `assets/sounds/normalized/` normalizados a -3dB peak.

---

## 🚀 Iniciar el Juego

```bash
# Servidor local (Python)
python -m http.server 8000

# Abrir en navegador
http://localhost:8000
```

---

## 📖 Documentación Adicional

- **SPRITES_GUIDE.md** - Guía completa de sprites
- **MAP_EDITOR_GUIDE.md** - Cómo usar el editor (acceso oculto)
- **ENEMY_AI_GUIDE.md** - Sistema de IA enemiga y cómo extenderlo
- **ARCHITECTURE.md** - Arquitectura del proyecto
- **GAME_BALANCE.md** - Balance y economía del juego

---

## 🎯 Estado del Proyecto

**Versión Actual:** v2.0 - Sistema Unificado

**Completado:**
- ✅ Sistema unificado de nodos
- ✅ Construcción de edificios
- ✅ Sistema de drones y anti-drones
- ✅ Hospital de campaña
- ✅ Planta nuclear
- ✅ Victoria/derrota
- ✅ Menú Arsenal
- ✅ Sistema de opciones
- ✅ Audio con pooling
- ✅ IA enemiga modular basada en reglas

**Próximos Pasos:**
- Expandir reglas de IA (construcción, ataques, defensa)
- Implementar edificios desactivados (Red de Alambre, Fábrica, Nido)
- Balanceo de gameplay
- Más misiones
- Efectos visuales adicionales

---

Desarrollado con ❤️ usando vanilla JavaScript y Canvas API.
