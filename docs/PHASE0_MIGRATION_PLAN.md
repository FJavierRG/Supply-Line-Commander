# 📋 FASE 0: PLAN DE MIGRACIÓN - Refactorización PvE a PvP

**Fecha:** 2025-10-16  
**Objetivo:** Eliminar hardcoding de 'ally' vs 'enemy', preparar código para multijugador  
**Progreso:** 0% - Análisis completado

---

## 🎯 DECISIÓN ARQUITECTÓNICA: NOMENCLATURA DE EQUIPOS

Después de analizar las opciones, se decide usar:

### ✅ **NOMENCLATURA ELEGIDA: `player1` / `player2`**

**Razones:**
- ✅ **Descriptiva**: Claramente identifica cada jugador
- ✅ **Escalable**: Fácil añadir `player3`, `player4` en el futuro
- ✅ **Sin sesgos**: No implica roles (atacante/defensor)
- ✅ **Compatible con IA**: Se puede tener `controlledByAI: true` en player2

**Implementación:**
```javascript
// ANTES (PvE):
node.team = 'ally' | 'enemy'

// DESPUÉS (PvP-ready):
node.team = 'player1' | 'player2'
```

**Mapeo de lógica:**
- **Player 1** = Jugador humano local (antes 'ally')
- **Player 2** = Oponente (humano en PvP, IA en singleplayer)

---

## 📊 ANÁLISIS DEL CÓDIGO ACTUAL

### **Referencias encontradas:**
- **110** referencias a `enemy_hq|enemy_fob|enemy_front` en **28 archivos**
- **53** referencias a `team === 'enemy'` o `team === 'ally'` en **16 archivos**
- **48** referencias a `type === 'enemy_*'` solo en **sistemas (11 archivos)**
- **9** referencias a `flipHorizontal` en **5 archivos**

### **Archivos críticos a modificar:**

#### **📁 Configuración (2 archivos):**
1. `src/config/nodes.js` - 7 referencias, nodos duplicados
2. `src/config/constants.js` - 3 referencias, VALID_ROUTES duplicadas

#### **📁 Entidades (2 archivos):**
1. `src/entities/MapNode.js` - 3 referencias (ya tiene campo `team`)
2. `src/entities/Convoy.js` - Pendiente analizar

#### **📁 Factories (1 archivo):**
1. `src/factories/BaseFactory.js` - 5 referencias

#### **📁 Misiones (1 archivo):**
1. `src/missions/Mission.js` - 3 referencias
2. `src/missions/Mission20.js` - Pendiente analizar

#### **📁 Sistemas (11 archivos):**
1. `src/systems/RenderSystem.js` - 19 referencias ⚠️ MÁS CRÍTICO
2. `src/systems/EnemyAISystem.js` - 12 referencias
3. `src/systems/ConvoyManager.js` - 6 referencias
4. `src/systems/InputHandler.js` - 5 referencias
5. `src/systems/TerritorySystem.js` - 4 referencias
6. `src/systems/BuildingSystem.js` - 4 referencias
7. `src/systems/FrontMovementSystem.js` - 4 referencias
8. `src/systems/TutorialManager.js` - 4 referencias
9. `src/systems/MedicalEmergencySystem.js` - 2 referencias
10. `src/systems/UIManager.js` - 1 referencia
11. `src/systems/AssetManager.js` - 6 referencias (sprites)

#### **📁 IA (5 archivos):**
1. `src/ai/AIDirector.js` - 3 referencias
2. `src/ai/core/ThreatAnalyzer.js` - 5 referencias
3. `src/ai/core/ActionEvaluator.js` - 3 referencias
4. `src/ai/core/StateAnalyzer.js` - 5 referencias
5. `src/ai/config/AIConfig.js` - 1 referencia

#### **📁 Otros:**
1. `src/systems/DroneSystem.js` - 1 referencia
2. `src/systems/AntiDroneSystem.js` - 1 referencia
3. `src/systems/CurrencyManager.js` - 1 referencia
4. `src/Game.js` - 2 referencias

**TOTAL: ~28 archivos a modificar**

---

## 🗺️ PLAN DE MIGRACIÓN POR FASES

### **FASE 0.1 ✅ ANÁLISIS Y PLANIFICACIÓN**
- [X] Analizar código actual
- [X] Contar referencias
- [X] Definir nomenclatura: `player1` / `player2`
- [X] Crear este documento

---

### **FASE 0.2 - UNIFICAR CONFIGURACIÓN**

#### **Archivo: `src/config/nodes.js`**

**Acciones:**
1. Eliminar nodos duplicados:
   - Borrar `enemy_hq` (líneas 80-103)
   - Borrar `enemy_fob` (líneas 105-126)
   - Borrar `enemy_front` (líneas 128-147)

2. Actualizar nodos base para soportar múltiples equipos:
   ```javascript
   hq: {
       id: 'hq',
       name: 'HQ (Cuartel General)',
       spriteKey: 'base-hq', // Sprite base (para player1)
       category: 'map_node',
       supportedTeams: ['player1', 'player2'],
       // ... resto de config
   }
   ```

3. Actualizar funciones helper:
   ```javascript
   // ELIMINAR:
   export function getEnemyNodes() {
       return Object.values(NODE_CONFIG).filter(n => n.category === 'enemy');
   }
   
   // REEMPLAZAR POR:
   export function getNodesByTeam(team) {
       // Filtrado se hará por node.team, no por tipo
   }
   ```

#### **Archivo: `src/config/constants.js`**

**Acciones:**
1. Unificar `VALID_ROUTES`:
   ```javascript
   // ANTES:
   export const VALID_ROUTES = {
       'hq': ['fob'],
       'fob': ['front', 'fob'],
       'front': [],
       'enemy_hq': ['enemy_fob'],
       'enemy_fob': ['enemy_front', 'enemy_fob'],
       'enemy_front': []
   };
   
   // DESPUÉS:
   export const VALID_ROUTES = {
       'hq': ['fob'],
       'fob': ['front', 'fob'],
       'front': []
       // Ya no hay rutas enemy_*, todos usan las mismas
   };
   ```

---

### **FASE 0.3 - REFACTORIZAR SISTEMA DE SPRITES**

#### **⭐ IMPLEMENTAR VISTA ESPEJO (MIRROR VIEW)**

**Problema:**
- Sprites enemigos usan `flipHorizontal: true` porque están diseñados para que el enemigo esté a la DERECHA
- En PvP, jugador 2 vería sus propios sprites al revés
- Los sprites de vehículos apuntan hacia la derecha

**Solución - Ambos jugadores ven su HQ a la IZQUIERDA:**

```javascript
// En RenderSystem.js - ANTES de renderizar
class RenderSystem {
    render(game) {
        const myTeam = game.myTeam; // 'player1' o 'player2'
        
        // Si soy player2, flippear todo el canvas
        if (myTeam === 'player2') {
            this.ctx.save();
            this.ctx.scale(-1, 1);
            this.ctx.translate(-this.canvas.width, 0);
        }
        
        // Renderizar todo normalmente
        this.renderGame(game);
        
        // Restaurar canvas
        if (myTeam === 'player2') {
            this.ctx.restore();
        }
        
        // Renderizar UI SIN flip (fuera del contexto flippeado)
        this.renderUI(game);
    }
}
```

#### **Archivo: `src/systems/RenderSystem.js`**

**Acciones:**
1. Crear función `getSpriteForNode(node, myTeam)`:
   ```javascript
   getSpriteForNode(node, myTeam) {
       const baseType = node.type; // 'hq', 'fob', 'front'
       const nodeTeam = node.team; // 'player1', 'player2'
       
       // Si el nodo NO es de mi equipo, usar sprite 'enemy'
       if (nodeTeam !== myTeam) {
           return `base-enemy-${baseType}`;
       }
       return `base-${baseType}`;
   }
   ```

2. Actualizar `renderNode()` para usar sprite resolver
3. Implementar transformación global de canvas para player2
4. Mantener sprites 'enemy' en AssetManager (se usan dinámicamente)

#### **Archivo: `src/systems/InputHandler.js`**

**Acciones:**
1. Transformar coordenadas del mouse para player2:
   ```javascript
   handleClick(event) {
       let mouseX = event.clientX;
       const mouseY = event.clientY;
       
       // Si soy player2, invertir coordenada X
       if (this.game.myTeam === 'player2') {
           mouseX = this.canvas.width - mouseX;
       }
       
       // ... resto de lógica
   }
   ```

#### **Archivo: `src/systems/AssetManager.js`**

**Acciones:**
- Mantener sprites de enemigo (NO eliminarlos)
- Se seguirán usando, solo que dinámicamente según equipo
- Sin cambios en la carga de assets

---

### **FASE 0.4 - REFACTORIZAR CÓDIGO CORE**

#### **Archivo: `src/factories/BaseFactory.js`**

**Acciones:**
1. Eliminar lógica hardcodeada de `enemy_*`:
   ```javascript
   // ANTES (línea 67):
   } else if (node.type === 'fob' || node.type === 'enemy_fob') {
   
   // DESPUÉS:
   } else if (node.type === 'fob') {
       // Funciona para ambos equipos
   }
   ```

2. Eliminar lógica de `flipHorizontal` para tipos enemy (líneas 42-48):
   ```javascript
   // ELIMINAR:
   if (type.startsWith('enemy_') && ...) {
       node.flipHorizontal = true;
   }
   // Ahora el flip se maneja por equipo, no por tipo
   ```

3. Actualizar `applyUpgradesToNode()`:
   ```javascript
   // ANTES:
   } else if (node.type === 'enemy_front') {
       this.applyEnemyFrontUpgrades(node);
   }
   
   // DESPUÉS:
   } else if (node.type === 'front') {
       this.applyFrontUpgrades(node);
       // Comportamiento idéntico para ambos equipos
   }
   ```

#### **Archivo: `src/missions/Mission.js`**

**Acciones:**
1. Actualizar `generateBases()`:
   ```javascript
   // ANTES:
   const enemyHQ = this.game.baseFactory.createBase(
       enemyHQX, enemyHQY, 'enemy_hq', {}
   );
   
   // DESPUÉS:
   const enemyHQ = this.game.baseFactory.createBase(
       enemyHQX, enemyHQY, 'hq', { team: 'player2' }
   );
   ```

2. Actualizar creación de FOBs y Frentes enemigos

#### **Archivo: `src/systems/ConvoyManager.js`**

**Acciones:**
1. Reemplazar checks de tipo `enemy_fob`:
   ```javascript
   // ANTES:
   if (from.type === 'enemy_fob' || to.type === 'enemy_fob') {
   
   // DESPUÉS:
   if (from.team === 'player2' || to.team === 'player2') {
   ```

2. Usar `node.team` para determinar si es convoy enemigo

---

### **FASE 0.5 - REFACTORIZAR SISTEMAS**

#### **Archivo: `src/systems/RenderSystem.js` (19 referencias) ⚠️ MÁS CRÍTICO**

**Patrón de reemplazo:**
```javascript
// ANTES:
if (node.type === 'enemy_hq') { ... }
if (node.type === 'enemy_fob') { ... }
if (node.type === 'enemy_front') { ... }

// DESPUÉS:
if (node.type === 'hq' && node.team === 'player2') { ... }
if (node.type === 'fob' && node.team === 'player2') { ... }
if (node.type === 'front' && node.team === 'player2') { ... }

// O mejor aún, si solo importa el equipo:
if (node.team === 'player2') { ... }
```

#### **Archivo: `src/systems/TerritorySystem.js`**

**Acciones:**
- Filtrar nodos por `team`, no por tipo `enemy_*`
- Actualizar cálculo de territorio

#### **Archivo: `src/systems/BuildingSystem.js`**

**Acciones:**
- Validar objetivos por `team`, no por tipo
- Verificar si un edificio es construible en territorio propio

#### **Archivo: `src/systems/DroneSystem.js`**

**Acciones:**
- Detectar enemigos por `team !== myTeam`
- Actualizar validaciones de objetivos

#### **Archivo: `src/systems/AntiDroneSystem.js`**

**Acciones:**
- Detectar amenazas por `team !== myTeam`

#### **Archivo: `src/systems/FrontMovementSystem.js`**

**Acciones:**
- Victoria/derrota por `team`, no por tipo
- Actualizar lógica de colisión entre frentes

#### **Resto de sistemas:**
- Mismo patrón: reemplazar checks de tipo por checks de team

---

### **FASE 0.6 - REFACTORIZAR IA ENEMIGA**

#### **Archivo: `src/systems/EnemyAISystem.js` (12 referencias)**

**Acciones:**
1. Actualizar métodos de búsqueda:
   ```javascript
   // ANTES:
   getEnemyHQ() {
       return this.game.nodes.find(n => n.type === 'enemy_hq');
   }
   
   getEnemyFOBs() {
       return this.game.nodes.filter(n => n.type === 'enemy_fob');
   }
   
   getEnemyFronts() {
       return this.game.nodes.filter(n => n.type === 'enemy_front');
   }
   
   // DESPUÉS:
   getEnemyHQ() {
       return this.game.nodes.find(n => 
           n.type === 'hq' && n.team === 'player2'
       );
   }
   
   getEnemyFOBs() {
       return this.game.nodes.filter(n => 
           n.type === 'fob' && n.team === 'player2'
       );
   }
   
   getEnemyFronts() {
       return this.game.nodes.filter(n => 
           n.type === 'front' && n.team === 'player2'
       );
   }
   ```

2. Actualizar todas las referencias a tipos enemy en comportamientos

#### **Archivos de IA:**
- `src/ai/AIDirector.js`
- `src/ai/core/StateAnalyzer.js`
- `src/ai/core/ThreatAnalyzer.js`
- `src/ai/core/ActionEvaluator.js`
- `src/ai/config/AIConfig.js`

**Patrón común:**
- Buscar por `team === 'player2'` en lugar de `type === 'enemy_*'`
- Añadir propiedad opcional `controlledByAI: true` a nodos (para futuro)

---

### **FASE 0.7 - TESTING DE REGRESIÓN**

#### **Checklist de Testing:**

**🎮 Funcionalidad de Juego:**
- [ ] Partida singleplayer vs IA funciona
- [ ] HQ, FOB y Frentes se ven correctamente
- [ ] Sprites de enemigo se muestran correctamente
- [ ] Construcción de edificios funciona
- [ ] Envío de convoyes (HQ→FOB→Front) funciona
- [ ] Convoyes enemigos funcionan
- [ ] Drones y anti-drones funcionan
- [ ] Emergencias médicas funcionan
- [ ] Movimiento de frentes funciona
- [ ] Sistema de territorio funciona
- [ ] Victoria al alcanzar HQ enemigo
- [ ] Derrota si enemigo alcanza HQ aliado

**🤖 IA Enemiga:**
- [ ] IA reabastece sus FOBs
- [ ] IA reabastece sus frentes
- [ ] IA construye edificios
- [ ] IA lanza drones
- [ ] IA reacciona a amenazas

**🎨 Visual:**
- [ ] Sprites se cargan correctamente
- [ ] No hay sprites faltantes (404)
- [ ] Colores de sombras correctos
- [ ] UI se muestra correctamente
- [ ] Barra de suministros funciona
- [ ] Indicador de vehículos funciona

**🔊 Audio:**
- [ ] Sonidos de construcción
- [ ] Sonidos de convoyes
- [ ] Sonidos de combate
- [ ] Audio ambiente

**⚠️ Errores:**
- [ ] 0 errores en consola del navegador
- [ ] 0 advertencias críticas
- [ ] No hay referencias undefined
- [ ] No hay sprites faltantes

**📈 Partida Completa:**
- [ ] Partida de inicio a fin sin crashes
- [ ] Ganar partida funciona correctamente
- [ ] Perder partida funciona correctamente
- [ ] Estadísticas finales se muestran

---

### **FASE 0.8 - DOCUMENTACIÓN**

#### **Archivos a actualizar:**

1. **`ARCHITECTURE.md`**:
   - Actualizar sección "Sistema Unificado de Nodos"
   - Documentar cambio de nomenclatura
   - Actualizar diagramas si existen
   - Eliminar referencias a tipos `enemy_*`

2. **`docs/SPRITES_GUIDE.md`**:
   - Documentar sistema dinámico de sprites
   - Explicar vista espejo (mirror view)

3. **Código (comentarios)**:
   - Actualizar comentarios en archivos modificados
   - Documentar decisiones de diseño
   - Añadir comentarios en sprite resolver

4. **Crear `docs/PVP_MIGRATION_CHANGELOG.md`**:
   - Listar todos los cambios realizados
   - Documentar decisiones arquitectónicas
   - Guía de referencia futura

---

## 📝 NOTAS IMPORTANTES

### **Compatibilidad con Singleplayer:**
- ✅ El código refactorizado DEBE mantener singleplayer vs IA funcional
- ✅ `player2` puede ser humano (futuro PvP) o IA (actual)
- ✅ Propiedad `controlledByAI` permite diferenciar (opcional)

### **Vista Espejo (Mirror View):**
- Es CRÍTICA para PvP
- Ambos jugadores deben ver su HQ a la IZQUIERDA
- Transformación global de canvas es la solución más simple
- Input del mouse debe transformarse también

### **Orden de Implementación:**
1. ✅ PRIMERO: Configuración (nodes.js, constants.js)
2. ✅ SEGUNDO: Sprites (RenderSystem, AssetManager)
3. ✅ TERCERO: Core (Factory, Mission, Convoy)
4. ✅ CUARTO: Sistemas (Territory, Building, etc.)
5. ✅ QUINTO: IA (EnemyAI, AIDirector)
6. ✅ SEXTO: Testing exhaustivo
7. ✅ SÉPTIMO: Documentación

### **Testing es Crítico:**
- NO pasar a siguiente sub-fase sin testing
- Verificar cada cambio en navegador
- Partida completa después de cada sección mayor

---

## 🎯 CRITERIOS DE ÉXITO FASE 0

### ✅ **Checklist Final:**

- [ ] 0 referencias a tipos `enemy_hq`, `enemy_fob`, `enemy_front` en código
- [ ] Todos los nodos usan tipos genéricos (`hq`, `fob`, `front`)
- [ ] Diferenciación por campo `team` (`player1`, `player2`)
- [ ] Sprites dinámicos funcionan (mismo nodo, diferentes sprites según equipo)
- [ ] Vista espejo implementada (opcional para singleplayer, crítico para PvP)
- [ ] Input del mouse transformado para player2 (si se implementa vista espejo)
- [ ] Singleplayer vs IA funciona 100% igual que antes
- [ ] 0 errores de regresión
- [ ] Código listo para que `player2` sea humano o IA
- [ ] Documentación actualizada

### ✅ **Entregables:**

1. Código refactorizado y funcional
2. Tests de regresión pasados
3. Documentación actualizada
4. Branch `feature/pvp-refactor` lista para merge
5. Tag `v2.0-pvp-ready`

---

## 📊 TRACKING

**FASE 0.1:** ✅ Completada (Análisis y Planificación)  
**FASE 0.2:** ⏳ Pendiente (Configuración)  
**FASE 0.3:** ⏳ Pendiente (Sprites)  
**FASE 0.4:** ⏳ Pendiente (Core)  
**FASE 0.5:** ⏳ Pendiente (Sistemas)  
**FASE 0.6:** ⏳ Pendiente (IA)  
**FASE 0.7:** ⏳ Pendiente (Testing)  
**FASE 0.8:** ⏳ Pendiente (Documentación)  

**PROGRESO TOTAL FASE 0:** 12.5% (1/8 sub-fases)

---

**Última actualización:** 2025-10-16  
**Siguiente paso:** Ejecutar FASE 0.2 (Unificar configuración de nodos)

