# Análisis de Inconsistencia en Movimiento de Nodos de Frente

## Problema Reportado

**Comportamiento esperado:**
- Los nodos de Frente tienen tres modos: **empujar** (advance), **retroceder** (retreat) y **aguantar** (hold)
- Si no tienen recursos (supplies = 0), deberían **retroceder automáticamente**

**Escenario problemático:**
1. Usuario empuja con un nodo en modo **ADVANCE**
2. Gana el empuje al enemigo (enemigo tiene menos recursos)
3. El enemigo se queda a 0 recursos y continúa siendo empujado
4. Usuario cambia su nodo a modo **HOLD**
5. **PROBLEMA**: El nodo enemigo (con 0 recursos) se detiene, cuando debería seguir retrocediendo automáticamente

## Análisis del Código

### Ubicación del problema
`server/game/systems/FrontMovementSystemServer.js` - Función `updateFrontMovement()`

### Lógica actual

El código maneja el movimiento en dos ramas:

#### 1. **CON COLISIÓN** (líneas 97-165)
- Evalúa el empuje comparando recursos entre los dos frentes
- Considera si alguno está en modo HOLD (ancla)
- **PROBLEMA**: No verifica si el atacante está realmente empujando activamente

#### 2. **SIN COLISIÓN** (líneas 166-233)
- Permite retroceso automático cuando hay 0 recursos
- Funciona correctamente para frentes que no están en contacto

### El Bug Específico

**Líneas 137-152:** Cuando hay colisión y se compara recursos:

```javascript
else if (front.supplies > nearestEnemy.supplies) {
    // Este frente tiene más → EMPUJA (si no está en modo retreat)
    if (modeConfig.canAdvance) {
        movement = pushSpeed * dt * direction;  // EMPUJA
    } else {
        movement = 0;  // No empuja (HOLD o RETREAT)
    }
} else if (front.supplies < nearestEnemy.supplies) {
    // Enemigo tiene más → ES EMPUJADO
    movement = -pushSpeed * dt * direction;
}
```

**El problema:**
- Cuando el usuario cambia a modo HOLD, su `movement = 0` (línea 109)
- Pero cuando se evalúa el movimiento del **enemigo**, el código compara recursos
- Si el usuario tiene más recursos que el enemigo (incluso si está en HOLD), el código podría intentar empujar al enemigo
- **FALTA**: Verificar si el atacante está realmente empujando activamente antes de forzar que el enemigo sea empujado

### Comportamiento Esperado vs Actual

| Situación | Comportamiento Esperado | Comportamiento Actual | ¿Correcto? |
|-----------|------------------------|----------------------|------------|
| Enemigo tiene 0 recursos, usuario en ADVANCE | Enemigo es empujado | Enemigo es empujado | ✅ SÍ |
| Enemigo tiene 0 recursos, usuario en HOLD | Enemigo retrocede automáticamente | Enemigo se detiene | ❌ NO |
| Enemigo tiene 0 recursos, sin colisión | Enemigo retrocede automáticamente | Enemigo retrocede automáticamente | ✅ SÍ |

## Solución Propuesta

### Principio: **Prioridad al retroceso automático por falta de recursos**

Un nodo con 0 recursos debería **siempre** retroceder automáticamente, EXCEPTO si:
1. Está siendo activamente empujado por un enemigo que tiene más recursos Y está en modo ADVANCE

### Cambios necesarios:

1. **Verificar si el atacante está realmente empujando** antes de aplicar lógica de empuje
   - Si el atacante está en modo HOLD (ancla), NO está empujando
   - Si el atacante está en modo RETREAT, NO está empujando
   - Solo el modo ADVANCE puede empujar activamente

2. **Priorizar retroceso automático cuando hay 0 recursos**
   - Si un nodo tiene 0 recursos y NO está siendo empujado activamente, debe retroceder
   - Esto debe ocurrir incluso si está en rango de colisión

3. **Lógica de empuje activo**
   - Un atacante solo empuja si:
     - Está en modo ADVANCE (`canAdvance = true`)
     - Tiene más recursos que el enemigo
     - NO está en modo HOLD

### Pseudocódigo de la solución:

```
SI (nodo tiene 0 recursos):
    SI (está en colisión Y enemigo está empujando activamente):
        Ser empujado
    SINO:
        Retroceder automáticamente
SINO:
    Lógica normal de movimiento según modo
```

## Solución Implementada

✅ **Corrección aplicada en `server/game/systems/FrontMovementSystemServer.js`**

### Cambios realizados:

1. **Prioridad al retroceso automático (líneas 131-154)**:
   - Si un nodo tiene 0 recursos, primero se verifica si está siendo empujado activamente
   - El enemigo solo está empujando activamente si:
     - Está en modo ADVANCE (`canAdvance = true`)
     - Tiene recursos > 0
   - Si NO está siendo empujado activamente → retrocede automáticamente
   - Si SÍ está siendo empujado activamente → continúa con la lógica de empuje normal

2. **Lógica de empuje mejorada (líneas 173-189)**:
   - Cuando el enemigo tiene más recursos, solo empuja si está en modo ADVANCE
   - Si el enemigo está en modo HOLD/RETREAT (no empuja activamente), el nodo mantiene posición o retrocede según su propio modo

### Comportamiento Corregido

| Situación | Comportamiento Esperado | Comportamiento Actual | ¿Correcto? |
|-----------|------------------------|----------------------|------------|
| Enemigo tiene 0 recursos, usuario en ADVANCE | Enemigo es empujado | Enemigo es empujado | ✅ SÍ |
| Enemigo tiene 0 recursos, usuario en HOLD | Enemigo retrocede automáticamente | Enemigo retrocede automáticamente | ✅ SÍ |
| Enemigo tiene 0 recursos, sin colisión | Enemigo retrocede automáticamente | Enemigo retrocede automáticamente | ✅ SÍ |

## Notas Adicionales

- El problema ocurre porque la evaluación es **unidireccional**: cada frente se evalúa por separado
- Cuando el usuario está en HOLD, su movimiento es 0, pero el enemigo aún se evalúa como "en colisión"
- La solución distingue entre "estar en rango de colisión" vs "estar siendo empujado activamente"
- Un atacante solo empuja activamente si está en modo ADVANCE, no en modo HOLD o RETREAT

