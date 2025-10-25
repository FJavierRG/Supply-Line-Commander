# 🚁 IMPLEMENTACIÓN COMPLETA DE BASE AÉREA

## 📋 RESUMEN EJECUTIVO

La **Base Aérea** es un edificio especial para la **B_Nation** que sirve como punto de recarga para helicópteros. Tiene suministros limitados (200), se autodestruye cuando se agota, y permite el transporte aéreo entre nodos.

---

## 🏗️ CONFIGURACIÓN BASE

### 1. Definición en `src/config/nodes.js`

```javascript
aerialBase: {
    id: 'aerialBase',
    name: 'Base Aérea',
    description: 'Punto de recarga para helicópteros. Suministra hasta 200 de cargo. Se destruye cuando se agota.',
    spriteKey: 'building-aerial-base',
    category: 'buildable',           // ✅ Aparece en tienda
    enabled: true,
    
    radius: 40,
    hitboxRadius: 48,
    detectionRadius: 130,
    canBeDestroyed: true,
    needsConstruction: true,
    cost: 150,
    constructionTime: 3,
    sizeMultiplier: 0.66,           // 🎨 50% más grande que tamaño base
    
    // Sistema de suministros
    hasSupplies: true,
    maxSupplies: 200,               // 🔋 Capacidad total
    
    // No maneja vehículos tradicionales
    hasVehicles: false,
    
    // Propiedades especiales
    isAerialBase: true,             // 🏷️ Flag de identificación
    autoDestroy: true               // 💥 Se autodestruye cuando se agota
}
```

### 2. Disponibilidad en `src/config/races.js`

```javascript
B_Nation: {
    buildings: [
        'intelRadio',
        'campaignHospital',
        'aerialBase'                // 🆕 Disponible en tienda
    ]
}
```

### 3. Rutas válidas en `src/config/constants.js`

```javascript
RACE_SPECIAL_ROUTES = {
    B_Nation: {
        'hq': ['front', 'aerialBase'],           // HQ → Front o Base Aérea
        'front': ['hq', 'front', 'aerialBase'], // Front → HQ, Front o Base Aérea
        'aerialBase': ['hq', 'front']           // 🆕 Base Aérea → HQ o Front
    }
}
```

---

## 🏭 FACTORY Y CREACIÓN

### `src/factories/BaseFactory.js`

```javascript
applyAerialBaseUpgrades(node, isConstructed) {
    // Base Aérea SIEMPRE empieza con su capacidad máxima (200)
    if (node.hasSupplies) {
        node.supplies = node.maxSupplies;
        console.log(`🏭 Base Aérea inicializada con ${node.supplies} suministros`);
    }
    
    // 🆕 NUEVO: Inicializar array de helicópteros aterrizados
    node.landedHelicopters = [];
    
    // 🆕 NUEVO: Asegurar que autoDestroy esté aplicado
    node.autoDestroy = true;
    console.log(`🏭 Base Aérea configurada con autoDestroy: ${node.autoDestroy}`);
}
```

**Funciones:**
- ✅ Inicializa `supplies = 200`
- ✅ Crea array `landedHelicopters = []`
- ✅ Aplica `autoDestroy = true`

---

## 🚁 SISTEMA DE HELICÓPTEROS

### Arquitectura: Helicópteros como Entidades Persistentes

Los helicópteros **NO** son convoyes temporales como los camiones. Son **entidades persistentes** con estado propio:

```javascript
// Estructura de helicóptero
{
    id: 'heli_1234567890_abc123',
    team: 'ally',
    state: 'landed' | 'flying',
    cargo: 50,                    // Suministros actuales (0-100)
    currentNodeId: 'node_5',      // Dónde está aterrizado
    targetNodeId: 'node_3',       // Hacia dónde vuela
    progress: 0.5,                // Progreso del vuelo (0-1)
    initialDistance: 200          // Distancia total del viaje
}
```

### Estados del Helicóptero

1. **`landed`**: Aterrizado en un nodo
   - Aparece sprite estático junto al nodo
   - Se agrega a `node.landedHelicopters[]`
   - Puede ser enviado a otro nodo

2. **`flying`**: Volando entre nodos
   - Se renderiza en movimiento con interpolación
   - Animación de hélices (alterna sprites)
   - Barra de cargo visible

---

## 🎮 LÓGICA DE JUEGO (SINGLEPLAYER)

### `src/Game.js` - Métodos Principales

#### 1. `createInitialHelicopter()`
```javascript
createInitialHelicopter() {
    const hq = this.nodes.find(n => n.type === 'hq' && n.team === 'ally');
    if (!hq) return;
    
    const heli = {
        id: `heli_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        team: 'ally',
        state: 'landed',
        cargo: 0,
        currentNodeId: hq.id,
        targetNodeId: null,
        progress: null,
        initialDistance: null
    };
    
    this.helicopters.push(heli);
    hq.landedHelicopters.push(heli.id);
}
```

#### 2. `dispatchHelicopter(fromNodeId, toNodeId)`
```javascript
dispatchHelicopter(fromNodeId, toNodeId) {
    // Validaciones
    const fromNode = this.nodes.find(n => n.id === fromNodeId);
    const toNode = this.nodes.find(n => n.id === toNodeId);
    
    // Buscar helicóptero aterrizado
    const heliId = fromNode.landedHelicopters[0];
    const heli = this.helicopters.find(h => h.id === heliId);
    
    // Cargar suministros si sale del HQ
    if (fromNode.type === 'hq') {
        heli.cargo = 100;
    }
    
    // Validaciones de cargo según destino
    if (toNode.type === 'front' && heli.cargo < 50) {
        return false; // Front necesita 50 cargo mínimo
    }
    
    if (toNode.type === 'aerialBase' && heli.cargo >= 100) {
        return false; // Base Aérea solo acepta helicópteros no llenos
    }
    
    // Despegar
    heli.state = 'flying';
    heli.currentNodeId = fromNodeId;
    heli.targetNodeId = toNodeId;
    heli.progress = 0;
    heli.initialDistance = distance;
    
    // Remover del nodo de origen
    fromNode.landedHelicopters = fromNode.landedHelicopters.filter(id => id !== heliId);
    
    return true;
}
```

#### 3. `handleHelicopterArrival(heli, toNode)`
```javascript
handleHelicopterArrival(heli, toNode) {
    if (toNode.type === 'front') {
        // Entregar 50 suministros al Front
        const deliveryAmount = 50;
        if (heli.cargo >= deliveryAmount) {
            toNode.supplies = Math.min(toNode.maxSupplies, toNode.supplies + deliveryAmount);
            heli.cargo -= deliveryAmount;
        }
    } 
    else if (toNode.type === 'hq') {
        // Recargar en HQ (infinito)
        heli.cargo = 100;
    } 
    else if (toNode.type === 'aerialBase') {
        // Recargar en Base Aérea (limitado)
        const neededCargo = 100 - heli.cargo;
        const availableCargo = toNode.supplies || 0;
        const rechargeAmount = Math.min(neededCargo, availableCargo);
        
        heli.cargo += rechargeAmount;
        toNode.supplies -= rechargeAmount;
    }
    
    // Aterrizar
    heli.state = 'landed';
    heli.currentNodeId = toNode.id;
    heli.targetNodeId = null;
    heli.progress = null;
    heli.initialDistance = null;
    
    // Agregar a la lista de helicópteros aterrizados del nodo
    if (!toNode.landedHelicopters.includes(heli.id)) {
        toNode.landedHelicopters.push(heli.id);
    }
}
```

#### 4. `updateHelicopters(dt)` - Loop Principal
```javascript
updateHelicopters(dt) {
    for (const heli of this.helicopters) {
        if (heli.state === 'flying') {
            this.updateHelicopterPosition(heli, dt);
            
            // Verificar si llegó al destino
            if (heli.progress >= 1) {
                const toNode = this.nodes.find(n => n.id === heli.targetNodeId);
                this.handleHelicopterArrival(heli, toNode);
            }
        }
    }
}
```

---

## 🎨 RENDERIZADO

### `src/systems/RenderSystem.js`

#### 1. Helicóptero Aterrizado
```javascript
// En renderNode() - se renderiza junto al nodo
if (node.landedHelicopters && node.landedHelicopters.length > 0) {
    const heliId = node.landedHelicopters[0];
    const heli = this.game.helicopters.find(h => h.id === heliId);
    if (heli) {
        this.renderLandedHelicopter(node, heli);
    }
}
```

#### 2. Helicóptero Volando
```javascript
// En render() - se renderiza en movimiento
for (const heli of this.game.helicopters) {
    if (heli.state === 'flying') {
        this.renderHelicopter(heli);
    }
}
```

#### 3. Características Visuales
- **Tamaño**: 20% más grande que otros vehículos
- **Animación**: Alterna entre `helicopter` y `helicopter2` cada 30 frames
- **Dirección**: Mira hacia la izquierda o derecha según destino
- **Barra de cargo**: Muestra porcentaje de suministros

---

## 🚨 SISTEMA DE AUTODESTRUCCIÓN

### Lógica de Abandono

```javascript
// En Game.js - Loop principal
for (let i = this.nodes.length - 1; i >= 0; i--) {
    const node = this.nodes[i];
    if ((node.type === 'aerialBase' || node.isAerialBase)) {
        if (node.supplies <= 0 && 
            node.autoDestroy && 
            (!node.landedHelicopters || node.landedHelicopters.length === 0) &&
            !node.isAbandoning) {
            
            console.log(`💥 Base Aérea #${node.id} agotada y vacía - iniciando abandono`);
            node.isAbandoning = true;
            node.abandonStartTime = Date.now();
            node.abandonPhase = 1;
        }
    }
}
```

### Fases de Abandono (Sistema Existente)

1. **Fase 1** (2 segundos): Gris claro
2. **Fase 2** (3 segundos): Gris oscuro  
3. **Fase 3**: Eliminación automática

---

## 🎯 INTERACCIÓN DEL USUARIO

### `src/systems/ConvoyManager.js`

#### 1. Detección de Helicópteros Disponibles
```javascript
// En createRoute()
else if ((from.type === 'aerialBase' || from.isAerialBase) && 
         from.landedHelicopters && 
         from.landedHelicopters.length > 0) {
    // Base Aérea puede enviar helicópteros si tiene alguno aterrizado
    console.log(`✅ Base Aérea tiene ${from.landedHelicopters.length} helicópteros - permitiendo envío`);
}
```

#### 2. Selección de Tipo de Vehículo
```javascript
// En selectVehicleType()
if ((from.type === 'aerialBase' || from.isAerialBase) && 
    from.landedHelicopters && 
    from.landedHelicopters.length > 0) {
    return 'helicopter';
}
```

#### 3. Manejo en Singleplayer
```javascript
// En createRoute()
if (vehicleType === 'helicopter') {
    const success = this.game.dispatchHelicopter(from.id, to.id);
    if (!success) {
        console.error('❌ No se pudo despachar helicóptero');
    }
    return;
}
```

---

## 🔄 FLUJO COMPLETO DE USO

### Escenario: Helicóptero desde HQ → Front → Base Aérea → Front

1. **Inicio**: Helicóptero en HQ con cargo 0
2. **HQ → Front**: 
   - Carga 100 cargo en HQ
   - Vuela al Front
   - Entrega 50 cargo al Front
   - Queda con 50 cargo
3. **Front → Base Aérea**:
   - Vuela a Base Aérea (200 suministros)
   - Recarga 50 cargo (queda 100 cargo)
   - Base Aérea queda con 150 suministros
4. **Base Aérea → Front**:
   - Vuela a otro Front
   - Entrega 50 cargo
   - Queda con 50 cargo
5. **Repetición**: Puede seguir usando la Base Aérea hasta que se agote
6. **Agotamiento**: Cuando Base Aérea llega a 0 suministros y no tiene helicópteros, entra en abandono

---

## 📊 DATOS TÉCNICOS

### Capacidades
- **Suministros iniciales**: 200
- **Cargo del helicóptero**: 100 máximo
- **Entrega por Front**: 50 cargo
- **Recargas posibles**: 4 (200 ÷ 50 = 4 entregas)

### Costes
- **Construcción**: 150 currency
- **Tiempo de construcción**: 3 segundos

### Limitaciones
- **Solo B_Nation**: No disponible para A_Nation
- **Una por helicóptero**: Cada helicóptero solo puede estar en un nodo
- **Autodestrucción**: Se destruye cuando se agota

---

## 🚀 IMPLEMENTACIÓN MULTIPLAYER

### Consideraciones para el Servidor

1. **Sincronización de Estado**:
   - Array `helicopters[]` en servidor
   - Propiedad `landedHelicopters[]` en cada nodo
   - Estados `flying`/`landed` sincronizados

2. **Validaciones Servidor**:
   - Verificar rutas válidas (`RACE_SPECIAL_ROUTES`)
   - Validar cargo suficiente para entregas
   - Controlar suministros de Base Aérea

3. **Eventos de Red**:
   - `helicopter_dispatched`: Cuando helicóptero despega
   - `helicopter_arrived`: Cuando helicóptero aterriza
   - `aerial_base_destroyed`: Cuando Base Aérea se autodestruye

4. **Interpolación Cliente**:
   - Usar mismo sistema que convoyes
   - `serverProgress` para sincronización
   - `clientProgress` para interpolación suave

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN MULTIPLAYER

- [ ] Servidor: Array `helicopters[]` en `GameStateManager`
- [ ] Servidor: Método `createHelicopter()` 
- [ ] Servidor: Método `updateHelicopters()`
- [ ] Servidor: Método `handleHelicopterDispatch()`
- [ ] Servidor: Método `handleHelicopterArrival()`
- [ ] Servidor: Serialización de helicópteros en updates
- [ ] Cliente: Sincronización de array `helicopters[]`
- [ ] Cliente: Sincronización de `landedHelicopters[]` en nodos
- [ ] Cliente: Interpolación de helicópteros volando
- [ ] Cliente: Renderizado de helicópteros aterrizados
- [ ] Red: Eventos `helicopter_dispatched`/`helicopter_arrived`
- [ ] Red: Validaciones de rutas en servidor
- [ ] Red: Sincronización de Base Aérea (suministros, abandono)

---

## 🎯 CONCLUSIÓN

La Base Aérea es un sistema completo que extiende las capacidades de transporte de B_Nation con:

- **Transporte aéreo** entre cualquier nodo
- **Suministros limitados** que requieren gestión estratégica  
- **Autodestrucción** cuando se agota
- **Integración completa** con el sistema de helicópteros persistente

La implementación singleplayer está **completa y funcional**. El siguiente paso es replicar esta lógica en el servidor multiplayer manteniendo la misma arquitectura de entidades persistentes.
