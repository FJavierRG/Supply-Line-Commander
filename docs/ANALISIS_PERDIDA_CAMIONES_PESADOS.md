# Análisis: Pérdida de Camiones Pesados

## Problema Reportado
Un tester reporta que el número de camiones pesados (heavy_truck) está disminuyendo sin razón aparente.

## Análisis del Código

### Ubicación del Problema
El problema está en `server/game/managers/ConvoyMovementManager.js`, donde hay varios casos donde los convoyes se eliminan **SIN devolver el vehículo al HQ**.

### Casos Identificados donde se Pierden Vehículos

#### 1. **Nodo Inexistente** (Líneas 24-28)
```24:28:server/game/managers/ConvoyMovementManager.js
if (!fromNode || !toNode) {
    // Nodo no existe, eliminar convoy
    console.warn(`⚠️ Convoy ${convoy.id} tiene nodo inexistente, eliminando`);
    this.gameState.convoys.splice(i, 1);
    continue;
}
```
**Problema**: Si el nodo origen o destino se elimina mientras el convoy está en tránsito, el convoy se elimina pero el vehículo NO se devuelve al HQ.

**Impacto**: ⚠️ **ALTO** - Puede ocurrir si un FOB se destruye mientras un heavy_truck está viajando hacia él.

#### 2. **Origen Destruido** (Líneas 39-43)
```39:43:server/game/managers/ConvoyMovementManager.js
if (isOriginDestroyed) {
    // Si el origen está destruido, eliminar convoy (incluye HQ destruido, aunque no debería pasar)
    console.warn(`⚠️ Convoy ${convoy.id} tiene nodo origen destruido (fromId: ${convoy.fromId}, type: ${fromNode.type}), eliminando`);
    this.gameState.convoys.splice(i, 1);
    continue;
}
```
**Problema**: Si el HQ se marca como `active = false` (aunque no debería pasar según el comentario), todos los convoyes se eliminan sin devolver vehículos.

**Impacto**: ⚠️ **CRÍTICO** - Si el HQ se desactiva por algún bug, se pierden TODOS los camiones pesados en tránsito.

#### 3. **Destino Destruido (Solo para trucks normales)** (Líneas 46-57)
```46:57:server/game/managers/ConvoyMovementManager.js
if (isDestinationDestroyed) {
    // Si el destino está destruido:
    if (isHeavyTruckFromHQ) {
        // Camiones pesados del HQ: permitir que continúen y regresen al HQ
        // No eliminar, el convoy llegará al destino destruido y regresará
        // (se maneja en handleConvoyArrival)
    } else {
        // Camiones ligeros del FOB u otros: eliminar si el destino está destruido
        console.warn(`⚠️ Convoy ${convoy.id} tiene nodo destino destruido (toId: ${convoy.toId}, type: ${toNode.type}), eliminando`);
        this.gameState.convoys.splice(i, 1);
        continue;
    }
}
```
**Problema**: Para trucks normales (no heavy_truck), si el destino se destruye, se eliminan sin devolver el vehículo. Sin embargo, para heavy_truck está bien manejado (continúan y regresan).

**Impacto**: ⚠️ **BAJO** - Solo afecta a trucks normales, no a heavy_truck.

#### 4. **Distancia Inválida** (Líneas 63-68)
```63:68:server/game/managers/ConvoyMovementManager.js
if (distance < 1) {
    // Distancia inválida, eliminar convoy
    console.warn(`⚠️ Convoy ${convoy.id} tiene distancia 0, eliminando`);
    this.gameState.convoys.splice(i, 1);
    continue;
}
```
**Problema**: Si un convoy tiene distancia inválida (probablemente por un bug en la creación), se elimina sin devolver el vehículo.

**Impacto**: ⚠️ **MEDIO** - Puede ocurrir si hay un bug en la creación del convoy.

#### 5. **Camión de Reparación - Edificio Ya Reparado** (Líneas 204-208)
```204:208:server/game/managers/ConvoyMovementManager.js
} else {
    console.warn(`⚠️ Camión de reparación ${convoy.id} llegó a un edificio que ya no está roto: ${toNode?.type} ${toNode?.id}`);
    // Eliminar convoy si el edificio ya no está roto (por si acaso)
    this.gameState.convoys.splice(convoyIndex, 1);
    return;
}
```
**Problema**: Si un camión de reparación llega a un edificio que ya fue reparado, se elimina sin devolver el vehículo.

**Impacto**: ⚠️ **BAJO** - Solo afecta a camiones de reparación, no a heavy_truck.

### Caso Especial: Ambulancia del Hospital (Líneas 230-232)
```230:232:server/game/managers/ConvoyMovementManager.js
// Eliminar convoy (no regresa)
this.gameState.convoys.splice(convoyIndex, 1);
return;
```
**Nota**: Este caso es intencional - las ambulancias del hospital se consumen y no regresan. No es un bug.

## Resumen de Problemas Críticos

### Para Heavy Trucks Específicamente:

1. **Nodo Inexistente** (Línea 24-28): ⚠️ **ALTO**
   - Si el FOB destino se elimina mientras un heavy_truck está viajando, el vehículo se pierde.

2. **Origen Destruido** (Línea 39-43): ⚠️ **CRÍTICO**
   - Si el HQ se desactiva por algún bug, se pierden TODOS los heavy_trucks en tránsito.

3. **Distancia Inválida** (Línea 63-68): ⚠️ **MEDIO**
   - Si hay un bug en la creación del convoy, el vehículo se pierde.

## Solución Implementada ✅

Se ha implementado una función helper `returnVehicleToOrigin()` que devuelve vehículos al nodo origen antes de eliminar convoyes por condiciones excepcionales.

### Cambios Realizados:

1. **Nueva función helper** `returnVehicleToOrigin()` (líneas 279-321):
   - Maneja la devolución de vehículos para todos los tipos (heavy_truck, truck, repair, ambulance)
   - Puede ser llamada antes de eliminar convoyes sin afectar el flujo normal

2. **Correcciones aplicadas**:
   - ✅ **Nodo inexistente** (líneas 24-35): Ahora devuelve el vehículo si el nodo origen existe
   - ✅ **Origen destruido** (líneas 45-55): Devuelve el vehículo antes de eliminar
   - ✅ **Destino destruido (trucks normales)** (líneas 64-72): Devuelve el vehículo antes de eliminar
   - ✅ **Distancia inválida** (líneas 78-87): Devuelve el vehículo antes de eliminar
   - ✅ **Camión de reparación - edificio ya reparado** (líneas 224-229): Devuelve el vehículo antes de eliminar

### Resultado:

Ahora todos los camiones pesados (y otros vehículos) se devuelven correctamente al HQ cuando se eliminan convoyes por condiciones excepcionales, evitando la pérdida de vehículos reportada por el tester.

## Problema Relacionado: Eliminación de Nodos

En `server/game/GameStateManager.js` (líneas 818, 829-835, 845), los nodos se eliminan del array cuando `active === false`:

```818:818:server/game/GameStateManager.js
this.nodes = this.nodes.filter(n => n.active !== false);
```

**Secuencia del Bug**:
1. Un FOB se destruye (por combate, abandono, etc.) y se marca como `active = false`
2. En el siguiente `update()` de `GameStateManager`, el nodo se elimina del array `nodes`
3. En el siguiente `update()` de `ConvoyMovementManager`, el convoy que viaja hacia ese FOB no encuentra el nodo (`!toNode`)
4. El convoy se elimina sin devolver el vehículo (línea 24-28 de ConvoyMovementManager)

**Impacto**: ⚠️ **MUY ALTO** - Este es probablemente el caso más común de pérdida de vehículos.

## Notas Adicionales

- El sistema de retorno de vehículos funciona correctamente cuando los convoyes regresan normalmente (línea 285-315).
- El problema solo ocurre cuando los convoyes se eliminan por condiciones excepcionales.
- Los heavy_trucks están bien protegidos cuando el destino está destruido (continúan y regresan), pero no cuando el origen o el nodo no existe.
- **El problema más común es cuando un FOB se destruye mientras un heavy_truck está viajando hacia él**.

