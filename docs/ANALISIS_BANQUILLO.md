# Análisis: Sistema de Banquillo (Sideboard)

## Resumen Ejecutivo

Este documento analiza todos los sistemas que necesitarán modificarse para implementar el sistema de banquillo, similar a Magic: The Gathering. El banquillo permitirá a los jugadores tener cartas adicionales que pueden intercambiar con las del mazo durante la partida.

---

## 1. Estructura de Datos

### 1.1. Modificaciones en el Modelo de Mazo

**Archivos afectados:**
- `src/systems/DeckManager.js`
- `server/config/defaultDeck.js`
- `server/game/managers/RaceManager.js`

**Cambios necesarios:**

```javascript
// Estructura actual del mazo:
{
    id: 'deck_xxx',
    name: 'Mi Mazo',
    units: ['hq', 'fob', 'drone', ...],
    createdAt: timestamp,
    updatedAt: timestamp,
    isDefault: false
}

// Nueva estructura con banquillo:
{
    id: 'deck_xxx',
    name: 'Mi Mazo',
    units: ['hq', 'fob', 'drone', ...],        // Mazo principal (equipado)
    bench: ['antiDrone', 'sniperStrike', ...], // Banquillo (no equipado)
    createdAt: timestamp,
    updatedAt: timestamp,
    isDefault: false
}
```

**Consideraciones:**
- El banquillo debe ser un array separado de `units`
- El HQ siempre debe estar en `units` (nunca en banquillo)
- No puede haber duplicados entre `units` y `bench`
- No puede haber duplicados dentro de `bench`

---

## 2. Sistema de Límites de Puntos

### 2.1. Límite Separado para Banquillo

**Archivos afectados:**
- `server/config/gameConfig.js`
- `src/systems/DeckManager.js`
- `src/systems/ArsenalManager.js`

**Cambios necesarios:**

```javascript
// En gameConfig.js
deck: {
    pointLimit: 815,        // Límite para el mazo principal
    benchPointLimit: 200    // 🆕 NUEVO: Límite para el banquillo
}
```

**Validaciones:**
- El mazo principal (`units`) no puede exceder `pointLimit`
- El banquillo (`bench`) no puede exceder `benchPointLimit`
- La suma total (`units` + `bench`) puede exceder `pointLimit`, pero cada uno por separado debe respetar su límite

**Métodos a modificar:**
- `DeckManager.calculateDeckCost()` - Ya existe, calculará solo el mazo principal
- `DeckManager.calculateBenchCost()` - 🆕 NUEVO: Calcular costo del banquillo
- `DeckManager.validateDeck()` - Modificar para validar ambos límites
- `ArsenalManager.getDeckCost()` - Ya existe, solo mazo principal
- `ArsenalManager.getBenchCost()` - 🆕 NUEVO: Calcular costo del banquillo

---

## 3. UI del Constructor de Mazos (Arsenal)

### 3.1. Nueva Columna "Banquillo"

**Archivos afectados:**
- `index.html` (estructura HTML)
- `src/systems/ArsenalManager.js` (lógica)
- `styles.css` (estilos)

**Cambios en HTML:**

```html
<!-- Panel derecho: Mazo actual -->
<div class="deck-panel">
    <div class="deck-panel-header">
        <h3 class="panel-title">Tu Mazo</h3>
        <div class="deck-counter">
            <span id="deck-count">0</span> / <span id="deck-limit">815</span> puntos
        </div>
    </div>
    <div class="deck-list" id="deck-list">
        <!-- Cartas del mazo -->
    </div>
</div>

<!-- 🆕 NUEVO: Panel de banquillo -->
<div class="deck-panel bench-panel">
    <div class="deck-panel-header">
        <h3 class="panel-title">Banquillo</h3>
        <div class="deck-counter">
            <span id="bench-count">0</span> / <span id="bench-limit">200</span> puntos
        </div>
    </div>
    <div class="deck-list" id="bench-list">
        <!-- Cartas del banquillo -->
    </div>
</div>
```

**Funcionalidades a implementar:**
- Click izquierdo en carta disponible → Añadir al mazo (si hay espacio)
- Click derecho en carta disponible → Añadir al banquillo (si hay espacio)
- Click en carta del mazo → Mover al banquillo (si hay espacio en banquillo)
- Click en carta del banquillo → Mover al mazo (si hay espacio en mazo)
- Validación visual de límites (color rojo/naranja cuando se acerca al límite)
- Contador de puntos separado para mazo y banquillo

**Métodos nuevos en ArsenalManager:**
- `addToBench(unitId)` - Añadir unidad al banquillo
- `removeFromBench(unitId)` - Quitar unidad del banquillo
- `moveToBench(unitId)` - Mover del mazo al banquillo
- `moveToDeck(unitId)` - Mover del banquillo al mazo
- `updateBenchDisplay()` - Actualizar visualización del banquillo
- `getBenchCost()` - Calcular costo del banquillo
- `validateBench()` - Validar límites del banquillo

---

## 4. Sistema de Intercambio Durante la Partida

### 4.1. UI Ingame para Mostrar Banquillo

**Archivos afectados:**
- `src/systems/StoreUIManager.js` (UI de tienda ingame)
- `src/systems/UIManager.js` (posiblemente)
- `src/systems/RenderSystem.js` (renderizado)

**Nueva UI ingame:**

La tienda actual (`StoreUIManager`) muestra las cartas del mazo equipado. Necesitamos:

1. **Panel de banquillo visible durante la partida:**
   - Mostrar cartas del banquillo en un panel separado
   - Botones para intercambiar cartas entre mazo y banquillo
   - Indicador visual de qué cartas están en el mazo vs banquillo

2. **Sistema de intercambio:**
   - Click en carta del mazo → Opción "Mover a banquillo"
   - Click en carta del banquillo → Opción "Mover a mazo"
   - Validación: No exceder límites al intercambiar
   - Confirmación visual del intercambio

**Consideraciones:**
- El intercambio debe ser instantáneo (no hay cooldown)
- El intercambio debe actualizar la tienda inmediatamente
- El intercambio debe sincronizarse con el servidor

---

## 5. Sincronización con el Servidor

### 5.1. Validación en Servidor

**Archivos afectados:**
- `server/server.js` (evento `select_race`)
- `server/game/managers/RaceManager.js`
- `server/game/GameStateManager.js`

**Cambios necesarios:**

1. **Al seleccionar mazo en lobby:**
   - Validar que el mazo principal no exceda `pointLimit`
   - Validar que el banquillo no exceda `benchPointLimit`
   - Almacenar tanto `units` como `bench` en el jugador

2. **Durante la partida:**
   - Nuevo evento: `swap_card` o `move_to_bench` / `move_to_deck`
   - Validar que el intercambio no exceda límites
   - Actualizar el mazo del jugador en `GameStateManager`
   - Notificar al cliente del cambio exitoso

**Nuevos eventos Socket.IO:**
```javascript
// Cliente → Servidor
socket.emit('move_to_bench', { unitId: 'drone' });
socket.emit('move_to_deck', { unitId: 'antiDrone' });

// Servidor → Cliente
socket.emit('card_moved', { 
    unitId: 'drone', 
    from: 'deck', 
    to: 'bench',
    newDeck: [...],
    newBench: [...]
});
```

### 5.2. Almacenamiento en GameState

**Archivos afectados:**
- `server/game/GameStateManager.js`
- `server/game/managers/RaceManager.js`

**Cambios necesarios:**

```javascript
// En RaceManager.setPlayerDeck()
setPlayerDeck(team, deck) {
    // deck ahora tiene: { id, name, units, bench }
    this.gameState.playerDecks[team] = {
        id: deck.id,
        name: deck.name,
        units: [...deck.units],  // Mazo equipado
        bench: [...(deck.bench || [])]  // Banquillo
    };
}

// En RaceManager.canPlayerUseUnit()
canPlayerUseUnit(team, unitId) {
    const deck = this.getPlayerDeck(team);
    // Solo verificar units (mazo equipado), no bench
    return deck?.units?.includes(unitId) || false;
}
```

---

## 6. Persistencia (localStorage)

### 6.1. Guardado de Banquillo

**Archivos afectados:**
- `src/systems/DeckManager.js`

**Cambios necesarios:**

El sistema actual guarda mazos en `localStorage` con la clave `game_decks`. La estructura JSON necesita incluir el banquillo:

```javascript
{
    decks: [
        {
            id: 'deck_xxx',
            name: 'Mi Mazo',
            units: ['hq', 'fob', ...],
            bench: ['antiDrone', ...],  // 🆕 NUEVO
            createdAt: timestamp,
            updatedAt: timestamp,
            isDefault: false
        }
    ],
    defaultDeckId: 'default',
    lastSelectedDeckId: 'deck_xxx'
}
```

**Métodos a modificar:**
- `DeckManager.saveDecks()` - Ya guarda, solo necesita incluir `bench`
- `DeckManager.loadDecks()` - Ya carga, solo necesita leer `bench`
- `DeckManager.createDeck()` - Inicializar `bench: []`
- `DeckManager.updateDeck()` - Permitir actualizar `bench`

---

## 7. Validaciones y Reglas de Negocio

### 7.1. Reglas del Banquillo

**Reglas a implementar:**

1. **Límites:**
   - Mazo principal: máximo `pointLimit` puntos (actualmente 815)
   - Banquillo: máximo `benchPointLimit` puntos (nuevo, sugerido 200)
   - No hay límite en la suma total

2. **Restricciones:**
   - HQ siempre debe estar en el mazo principal (nunca en banquillo)
   - No puede haber duplicados entre mazo y banquillo
   - No puede haber duplicados dentro del banquillo
   - No puede haber duplicados dentro del mazo (ya existe esta validación)

3. **Intercambio durante partida:**
   - Solo se puede intercambiar si no se exceden los límites
   - El intercambio es instantáneo
   - El intercambio actualiza inmediatamente las unidades disponibles en la tienda

4. **Validación en servidor:**
   - El servidor debe validar todos los intercambios
   - El servidor debe rechazar intercambios que excedan límites
   - El servidor es la fuente única de verdad del mazo del jugador

### 7.2. Validaciones a Implementar

**En cliente (ArsenalManager):**
- Validar límite de puntos al añadir al banquillo
- Validar límite de puntos al mover del mazo al banquillo
- Validar límite de puntos al mover del banquillo al mazo
- Prevenir duplicados
- Prevenir mover HQ al banquillo

**En servidor:**
- Validar límite de puntos del mazo principal
- Validar límite de puntos del banquillo
- Validar que no haya duplicados
- Validar que HQ esté siempre en el mazo principal
- Validar que las unidades existan y estén habilitadas

---

## 8. Migración de Datos Existentes

### 8.1. Compatibilidad con Mazos Antiguos

**Archivos afectados:**
- `src/systems/DeckManager.js`
- `server/config/defaultDeck.js`

**Estrategia:**

Los mazos existentes no tienen campo `bench`. Necesitamos:

1. **Al cargar mazos antiguos:**
   ```javascript
   // Si no existe bench, inicializar como array vacío
   if (!deck.bench) {
       deck.bench = [];
   }
   ```

2. **Mazo predeterminado:**
   - El mazo predeterminado debe tener `bench: []` inicialmente
   - Los jugadores pueden añadir cartas al banquillo del mazo predeterminado

3. **Migración automática:**
   - Al cargar desde localStorage, añadir `bench: []` si no existe
   - Guardar inmediatamente para persistir la migración

---

## 9. UI/UX Adicional

### 9.1. Indicadores Visuales

**Elementos a añadir:**

1. **En el constructor de mazos:**
   - Contador de puntos del banquillo (similar al del mazo)
   - Color rojo/naranja cuando se acerca al límite
   - Separador visual entre mazo y banquillo
   - Tooltip explicando qué es el banquillo

2. **Durante la partida:**
   - Panel de banquillo visible (colapsable/expandible)
   - Indicador de qué cartas están en el mazo vs banquillo
   - Botones de intercambio claros
   - Feedback visual al intercambiar (animación, sonido opcional)

3. **En la tienda ingame:**
   - Mostrar cartas del banquillo en un área separada
   - Botones para intercambiar claramente visibles
   - Indicador de límites de puntos

### 9.2. Estilos CSS

**Nuevos estilos necesarios:**

```css
.bench-panel {
    /* Estilos para el panel de banquillo */
}

.bench-list {
    /* Estilos para la lista de cartas del banquillo */
}

.bench-item {
    /* Estilos para cada carta del banquillo */
}

.swap-button {
    /* Estilos para botones de intercambio */
}
```

---

## 10. Testing y Validación

### 10.1. Casos de Prueba

**Casos a probar:**

1. **Constructor de mazos:**
   - Añadir carta al banquillo
   - Mover carta del mazo al banquillo
   - Mover carta del banquillo al mazo
   - Validar límites de puntos
   - Prevenir duplicados
   - Prevenir mover HQ al banquillo

2. **Durante la partida:**
   - Intercambiar carta del mazo al banquillo
   - Intercambiar carta del banquillo al mazo
   - Verificar que la tienda se actualiza correctamente
   - Verificar que solo las cartas del mazo están disponibles para construir

3. **Sincronización:**
   - Verificar que el servidor valida correctamente
   - Verificar que los cambios se sincronizan entre cliente y servidor
   - Verificar que no se pueden hacer trampas (exceder límites)

4. **Persistencia:**
   - Verificar que el banquillo se guarda correctamente
   - Verificar que se carga correctamente al reiniciar
   - Verificar migración de mazos antiguos

---

## 11. Resumen de Archivos a Modificar

### 11.1. Cliente (src/)

**Archivos principales:**
- `src/systems/DeckManager.js` - Gestión de mazos y banquillo
- `src/systems/ArsenalManager.js` - UI del constructor de mazos
- `src/systems/StoreUIManager.js` - UI de tienda ingame
- `src/systems/NetworkManager.js` - Eventos de red para intercambio

**Archivos de configuración:**
- `src/config/nodes.js` - (posiblemente, si necesitamos config adicional)

### 11.2. Servidor (server/)

**Archivos principales:**
- `server/server.js` - Eventos Socket.IO para intercambio
- `server/config/gameConfig.js` - Límite de puntos del banquillo
- `server/config/defaultDeck.js` - Mazo predeterminado con banquillo
- `server/game/managers/RaceManager.js` - Gestión de mazos en partida
- `server/game/GameStateManager.js` - Estado del juego (posiblemente)

### 11.3. UI (HTML/CSS)

**Archivos:**
- `index.html` - Estructura HTML del banquillo
- `styles.css` - Estilos del banquillo

---

## 12. Consideraciones Adicionales - DECISIONES FINALES

### 12.1. Decisiones Confirmadas

1. **Límite del banquillo:**
   - ✅ Solo límite de puntos: **200 puntos**
   - ❌ No hay límite de cantidad de cartas

2. **Visualización del banquillo del oponente:**
   - ❌ No se puede ver el banquillo del oponente

3. **Intercambio en modo IA:**
   - ❌ No tocar la IA aún (sin banquillo para IA por ahora)

4. **Mazo predeterminado:**
   - ✅ Tiene banquillo (se rellenará después)

5. **Feedback visual:**
   - ❌ No animaciones al intercambiar

6. **Sistema de intercambio:**
   - ✅ **PERMUTACIÓN** (intercambio) entre bench y deck
   - ✅ Click en carta del bench → mostrar cartas del deck → click en carta del deck para permutar
   - ✅ El bench será un desplegable para no ocupar espacio

### 12.2. UI del Sistema de Permutación

**Flujo de permutación:**

1. **En el constructor de mazos:**
   - Panel de banquillo colapsable/desplegable
   - Click en carta del bench → entrar en "modo permutación"
   - Mostrar cartas del deck con indicador visual de "selecciona para permutar"
   - Click en carta del deck → realizar permutación
   - Validar que ambos intercambios respeten límites de puntos

2. **Durante la partida:**
   - Panel de banquillo colapsable/desplegable
   - Mismo flujo de permutación
   - Actualizar tienda inmediatamente después de permutar

**Estados del sistema:**
- `NORMAL`: Sin permutación activa
- `SELECTING_BENCH_CARD`: Click en carta del bench, esperando selección de carta del deck
- `SELECTING_DECK_CARD`: Click en carta del deck, esperando selección de carta del bench (opcional, para bidireccional)

---

## 13. Orden de Implementación Sugerido

1. **Fase 1: Estructura de Datos**
   - Modificar modelo de mazo para incluir `bench`
   - Actualizar `DeckManager` para manejar banquillo
   - Migración de datos existentes
   - Añadir `benchPointLimit: 200` en configuración

2. **Fase 2: Límites y Validaciones**
   - Implementar validaciones en cliente y servidor
   - Actualizar métodos de cálculo de costos
   - Método para validar permutación (ambos límites)

3. **Fase 3: UI del Constructor - Panel de Banquillo**
   - Añadir panel de banquillo desplegable en HTML
   - Implementar lógica de añadir cartas al banquillo
   - Estilos CSS para panel desplegable

4. **Fase 4: UI del Constructor - Sistema de Permutación**
   - Implementar modo de permutación
   - Click en carta del bench → mostrar cartas del deck
   - Click en carta del deck → realizar permutación
   - Validación de límites durante permutación

5. **Fase 5: Sincronización con Servidor**
   - Eventos Socket.IO para permutación (`swap_card`)
   - Validación en servidor
   - Actualización de GameState

6. **Fase 6: UI Ingame**
   - Panel de banquillo desplegable durante partida
   - Sistema de permutación ingame
   - Actualización de tienda después de permutar

7. **Fase 7: Testing y Ajustes**
   - Pruebas de todos los casos
   - Ajustes de UI/UX
   - Optimizaciones

---

## 14. Decisiones Finales del Usuario ✅

1. **Límite de puntos del banquillo:** ✅ **200 puntos**

2. **Límite de cantidad de cartas:** ✅ Solo puntos (irrelevante cantidad)

3. **Visualización del banquillo del oponente:** ❌ No visible

4. **IA:** ❌ No tocar aún

5. **Mazo predeterminado:** ✅ Tiene banquillo (se rellenará después)

6. **Animaciones:** ❌ No animaciones

7. **UI del banquillo:**
   - ✅ Panel desplegable (no ocupa espacio cuando está colapsado)
   - ✅ Sistema de **permutación** (intercambio):
     - Click en carta del bench → mostrar cartas del deck
     - Click en carta del deck → permutar (intercambiar)

---

## Conclusión

El sistema de banquillo es una adición significativa que afecta múltiples sistemas del juego. La implementación requiere cambios en:

- **Estructura de datos** (mazos)
- **Sistema de límites** (nuevo límite para banquillo)
- **UI del constructor** (nueva columna)
- **UI ingame** (panel de banquillo y sistema de intercambio)
- **Sincronización servidor** (validación y eventos)
- **Persistencia** (guardado/carga)

Todos estos cambios deben implementarse de forma coordinada para mantener la consistencia del sistema.

