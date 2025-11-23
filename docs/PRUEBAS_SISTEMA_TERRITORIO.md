# 🧪 Guía de Pruebas del Sistema de Territorio

## 🎯 Objetivo

Esta guía te ayudará a probar sistemáticamente el sistema de control de territorio para verificar que funciona correctamente para ambos jugadores.

---

## 🔧 Preparación

### **Activar Modo Debug**

1. Abre `server/systems/TerritorySystemServer.js`
2. En el constructor, cambia:
```javascript
this.debugMode = true; // Activar logs detallados
```

3. Reinicia el servidor
4. Ahora verás logs detallados como:
```
🎯 Fronteras calculadas:
  Player1 (avanza →) → 825
  Player2 (avanza ←) → 975

⏱️ [PLAYER1] fob fob_1 FUERA de territorio - iniciando gracia de 3s
   🔍 Detalles: leftEdge=870, rightEdge=930, frontier=825
```

---

## 📋 Pruebas Básicas

### **Prueba 1: Player1 - Edificio sale de territorio**

**Objetivo**: Verificar que un FOB de Player1 se abandona cuando el frente retrocede

**Pasos**:
1. Iniciar partida como Player1
2. Construir un FOB cerca del frente (aprox. 50-100px detrás)
3. **Simular retroceso del frente**:
   - Opción A: Dejar que el frente retroceda naturalmente (sin suministros)
   - Opción B: Usar herramientas de debug para mover el frente

**Resultados Esperados**:
```
Tiempo 0s: FOB construido en x=750, Frente en x=800
  → FOB en territorio ✅

Tiempo 10s: Frente retrocede a x=700
  → FOB rightEdge (780) > frontier (725)?
  → 780 > 725? SÍ
  → Console: "⏱️ [PLAYER1] fob fob_X FUERA de territorio - iniciando gracia de 3s"

Tiempo 13s: Timer de gracia completo (3s)
  → Console: "💥 fob fob_X - tiempo de gracia completado - iniciando abandono"
  → FOB cambia a gris claro (fase 1)

Tiempo 15s: Fase 1 completa (2s)
  → FOB cambia a gris oscuro (fase 2)

Tiempo 18s: Fase 2 completa (3s)
  → FOB eliminado
  → Console: "💥 Eliminando fob fob_X - abandono finalizado"
```

**Verificaciones**:
- [ ] ⏱️ Timer de gracia aparece (3s)
- [ ] 💥 Abandono inicia después de 3s
- [ ] 🌫️ Fase 1: FOB se pone gris claro (2s)
- [ ] 🌑 Fase 2: FOB se pone gris oscuro (3s)
- [ ] ❌ FOB se elimina (total: 8s)

---

### **Prueba 2: Player2 - Edificio sale de territorio**

**Objetivo**: Verificar que un FOB de Player2 se abandona cuando el frente retrocede

**Pasos**:
1. Iniciar partida como Player2
2. Construir un FOB cerca del frente (aprox. 50-100px detrás, hacia la derecha)
3. Simular retroceso del frente (hacia la derecha)

**Resultados Esperados**:
```
Tiempo 0s: FOB construido en x=1100, Frente en x=1000
  → FOB en territorio ✅

Tiempo 10s: Frente retrocede a x=1200
  → FOB leftEdge (1070) < frontier (1175)?
  → 1070 < 1175? SÍ
  → Console: "⏱️ [PLAYER2] fob fob_X FUERA de territorio - iniciando gracia de 3s"

Tiempo 13s: Timer de gracia completo (3s)
  → Console: "💥 fob fob_X - tiempo de gracia completado - iniciando abandono"
  → FOB cambia a gris claro (fase 1)

Tiempo 15s: Fase 1 completa (2s)
  → FOB cambia a gris oscuro (fase 2)

Tiempo 18s: Fase 2 completa (3s)
  → FOB eliminado
```

**Verificaciones**:
- [ ] ⏱️ Timer de gracia aparece (3s)
- [ ] 💥 Abandono inicia después de 3s
- [ ] 🌫️ Fase 1: FOB se pone gris claro (2s)
- [ ] 🌑 Fase 2: FOB se pone gris oscuro (3s)
- [ ] ❌ FOB se elimina (total: 8s)
- [ ] 🔍 Logs muestran "[PLAYER2]" correctamente

---

### **Prueba 3: Edificio vuelve a territorio (cancelar abandono)**

**Objetivo**: Verificar que el timer se resetea si el edificio vuelve a territorio

**Pasos**:
1. Construir FOB cerca del frente
2. Hacer que el frente retroceda (activar timer)
3. **Esperar 2 segundos** (menos de 3s)
4. Hacer que el frente avance de nuevo

**Resultados Esperados**:
```
Tiempo 0s: FOB en territorio ✅
Tiempo 5s: Frente retrocede
  → Console: "⏱️ [PLAYER1] fob fob_X FUERA de territorio - iniciando gracia de 3s"
  → outOfTerritoryTimer = 0

Tiempo 7s: Timer = 2s (aún en gracia)
  → FOB aún normal (no gris)

Tiempo 8s: Frente avanza de nuevo
  → FOB vuelve a territorio
  → Console: "✅ fob fob_X - reseteando abandono"
  → outOfTerritoryTimer = null

Tiempo 15s: FOB sigue normal
  → NO se abandona ✅
```

**Verificaciones**:
- [ ] ⏱️ Timer inicia cuando sale
- [ ] ✅ Timer se resetea cuando vuelve
- [ ] 🏢 FOB permanece normal (no se abandona)
- [ ] 📊 Logs muestran "reseteando abandono"

---

### **Prueba 4: Edificios especiales NO se abandonan**

**Objetivo**: Verificar que specopsCommando, truckAssault y cameraDrone NO se abandonan en territorio enemigo

**Pasos**:
1. Desplegar `specopsCommando` en territorio enemigo
2. Esperar 10 segundos
3. Verificar que NO aparece timer de gracia

**Resultados Esperados**:
```
Tiempo 0s: Commando desplegado en territorio enemigo
  → Console: NO muestra mensaje de "FUERA de territorio"
  → outOfTerritoryTimer = null (NO se inicializa)

Tiempo 10s: Commando sigue operativo
  → NO hay timer
  → NO hay abandono
  → Commando sigue cumpliendo su misión ✅
```

**Verificaciones**:
- [ ] 🎯 specopsCommando NO se abandona en territorio enemigo
- [ ] 🚛 truckAssault NO se abandona en territorio enemigo
- [ ] 📹 cameraDrone NO se abandona en territorio enemigo
- [ ] 📊 Logs NO muestran mensajes de "FUERA" para estos edificios

---

## 🔬 Pruebas Avanzadas

### **Prueba 5: Múltiples edificios simultáneos**

**Objetivo**: Verificar que el sistema maneja múltiples edificios fuera de territorio

**Pasos**:
1. Construir 3 FOBs cerca del frente
2. Hacer que el frente retroceda (todos quedan fuera)
3. Verificar que todos tienen timer independiente

**Resultados Esperados**:
```
Tiempo 5s: Frente retrocede
  → Console: "⏱️ [PLAYER1] fob fob_1 FUERA..."
  → Console: "⏱️ [PLAYER1] fob fob_2 FUERA..."
  → Console: "⏱️ [PLAYER1] fob fob_3 FUERA..."

Tiempo 8s: Todos los timers en 3s
  → Todos inician abandono simultáneamente

Tiempo 16s: Todos los FOBs eliminados
```

**Verificaciones**:
- [ ] 🏢 Todos los edificios detectados correctamente
- [ ] ⏱️ Todos tienen timer independiente
- [ ] 💥 Todos se abandonan según sus timers
- [ ] 📊 Performance no se degrada

---

### **Prueba 6: Caso Edge - Edificio exactamente en la frontera**

**Objetivo**: Verificar comportamiento cuando un edificio está justo en el límite

**Pasos**:
1. Construir FOB exactamente en x = frontier - radius
2. Verificar que NO se considera fuera

**Ejemplo Player1**:
```
Frontera: 825
FOB radius: 30
FOB x: 795 (rightEdge = 825)

rightEdge (825) > frontier (825)?
825 > 825? NO ✅

FOB seguro en territorio
```

**Verificaciones**:
- [ ] 📐 Edificio justo en límite es seguro
- [ ] 🎯 No aparece timer de gracia
- [ ] 📊 Logs no muestran "FUERA"

---

### **Prueba 7: Sin frentes (caso extremo)**

**Objetivo**: Verificar que el sistema no crashea si no hay frentes

**Pasos**:
1. Eliminar todos los frentes de un equipo (modo debug)
2. Verificar que el sistema no genera errores

**Resultados Esperados**:
```
Console: "⚠️ No se pueden calcular fronteras - sin frentes activos"
→ Sistema no crashea ✅
→ No se verifica abandono para ese equipo ✅
```

**Verificaciones**:
- [ ] 🛡️ Sistema no crashea
- [ ] 📊 Log apropiado aparece
- [ ] 🏢 Edificios no se abandonan sin frontera

---

## 🐛 Debugging de Problemas

### **Problema 1: Player2 abandona edificios incorrectamente**

**Diagnóstico**:
1. Activar `debugMode = true`
2. Verificar en logs:
```
🔍 P2 Frontera: frente más izquierdo en 1000, frontera en 975
🔍 P2 fob FUERA: x=1100, leftEdge=1070, frontier=975
```

3. Verificar manualmente:
   - FOB en x=1100, radius=30
   - leftEdge = 1100 - 30 = 1070
   - frontier = 975
   - ¿Es 1070 < 975? NO → Edificio DEBERÍA estar seguro

**Solución**: Si los números no coinciden, hay un bug en la lógica

---

### **Problema 2: Timer no se resetea**

**Diagnóstico**:
1. Verificar en logs:
```
✅ fob fob_X - reseteando abandono
```

2. Si no aparece, verificar:
   - `building.outOfTerritoryTimer` está siendo reseteado
   - `building.isAbandoning` es false después del reset
   - El edificio realmente volvió a territorio

---

### **Problema 3: Edificios especiales se abandonan**

**Diagnóstico**:
1. Verificar en el código:
```javascript
// En checkBuildingsForTeam
const buildings = this.gameState.nodes.filter(n => 
    n.team === team && 
    n.constructed && 
    n.type !== 'hq' && 
    n.type !== 'front' &&
    n.type !== 'specopsCommando' &&  // ← Debe estar aquí
    n.type !== 'truckAssault' &&     // ← Debe estar aquí
    n.type !== 'cameraDrone'         // ← Debe estar aquí
);
```

2. Si falta alguna exclusión, agregarla

---

## 📊 Checklist Final

### **Player 1**
- [ ] FOB se detecta como fuera cuando frente retrocede
- [ ] Timer de gracia funciona (3s)
- [ ] Abandono ocurre correctamente (5s total)
- [ ] Timer se resetea si vuelve a territorio
- [ ] Logs muestran "[PLAYER1]"

### **Player 2**
- [ ] FOB se detecta como fuera cuando frente retrocede
- [ ] Timer de gracia funciona (3s)
- [ ] Abandono ocurre correctamente (5s total)
- [ ] Timer se resetea si vuelve a territorio
- [ ] Logs muestran "[PLAYER2]"

### **Edificios Especiales**
- [ ] specopsCommando NO se abandona en territorio enemigo
- [ ] truckAssault NO se abandona en territorio enemigo
- [ ] cameraDrone NO se abandona en territorio enemigo

### **Casos Edge**
- [ ] Múltiples edificios funcionan correctamente
- [ ] Edificio en límite exacto es seguro
- [ ] Sistema no crashea sin frentes

---

## 🎯 Criterios de Éxito

El sistema pasa las pruebas si:

1. ✅ **Player1 y Player2 funcionan idénticamente** (excepto dirección)
2. ✅ **Timer de gracia es consistente** (siempre 3s)
3. ✅ **Abandono es predecible** (siempre 2s + 3s = 5s)
4. ✅ **Edificios especiales están excluidos**
5. ✅ **No hay crashes o errores en console**
6. ✅ **Performance es buena** (verificación cada 0.2s no causa lag)

---

## 📝 Reporte de Resultados

Después de completar las pruebas, llena este template:

```markdown
## Resultados de Pruebas - Sistema de Territorio

**Fecha**: _______
**Versión**: _______
**Tester**: _______

### Player 1
- Detección de edificios fuera: ✅ / ❌
- Timer de gracia: ✅ / ❌
- Proceso de abandono: ✅ / ❌
- Reset de timer: ✅ / ❌
- Notas: ___________________

### Player 2
- Detección de edificios fuera: ✅ / ❌
- Timer de gracia: ✅ / ❌
- Proceso de abandono: ✅ / ❌
- Reset de timer: ✅ / ❌
- Notas: ___________________

### Edificios Especiales
- specopsCommando: ✅ / ❌
- truckAssault: ✅ / ❌
- cameraDrone: ✅ / ❌
- Notas: ___________________

### Bugs Encontrados
1. ___________________
2. ___________________
3. ___________________

### Recomendaciones
___________________
___________________
```

---

**Última actualización**: 23 de Noviembre, 2025

