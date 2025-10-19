# 🔌 GUÍA DE INTEGRACIÓN - SISTEMA IA MODULAR

## ✅ **INTEGRACIÓN COMPLETADA**

El nuevo sistema de IA modular está **completamente integrado** y listo para usar.

---

## 🎮 **CÓMO FUNCIONA**

### **Configuración en Game.js:**
```javascript
// Línea 36 en Game.js
const AI_SYSTEM_MODE = 'hybrid'; // ← Cambiar aquí
```

**Modos disponibles:**
- `'legacy'` - Solo EnemyAISystem (sistema antiguo)
- `'hybrid'` - **AIDirector** (decisiones) + **EnemyAISystem** (ejecución) ← **RECOMENDADO**
- `'modular'` - Solo AIDirector (futuro, no implementado todavía)

---

## 🔄 **FLUJO DEL SISTEMA HÍBRIDO**

```
1. Game.js actualiza
   ↓
2. AIDirector.update() - CEREBRO
   - StateAnalyzer analiza el juego
   - ThreatAnalyzer detecta amenazas
   - ActionEvaluator evalúa acciones con scoring
   - Elige la mejor acción
   ↓
3. AIDirector llama a EnemyAISystem - MANOS
   - attemptFOBConstruction()
   - buildNuclearPlant()
   - attemptDroneLaunch()
   - etc.
   ↓
4. EnemyAISystem ejecuta la acción
   - Construye edificios
   - Lanza drones/snipers
   - Envía suministros
```

---

## 💾 **SINCRONIZACIÓN DE CURRENCY**

El sistema sincroniza automáticamente la currency entre ambos sistemas:

```javascript
// En Game.js línea 360-362
this.aiDirector.currency = this.enemyAI.currency;  // Sincronizar entrada
this.aiDirector.update(dt);
this.enemyAI.currency = this.aiDirector.currency;  // Sincronizar salida
```

**Esto asegura que:**
- ✅ AIDirector siempre tiene la currency actualizada
- ✅ EnemyAISystem recibe los cambios de currency
- ✅ No hay desincronización

---

## 🔔 **NOTIFICACIÓN DE ACCIONES DEL JUGADOR**

Cuando el jugador hace algo importante, ambos sistemas son notificados:

### **BuildingSystem.js (líneas 200-208):**
```javascript
this.game.enemyAI.registerPlayerAction(buildingConfig.id, { x, y });
if (this.game.aiDirector && this.game.aiSystemMode !== 'legacy') {
    this.game.aiDirector.onPlayerAction(buildingConfig.id, { x, y });
}
```

### **DroneSystem.js (líneas 60-64):**
```javascript
this.game.enemyAI.registerPlayerAction('drone', actualTarget);
if (this.game.aiDirector && this.game.aiSystemMode !== 'legacy') {
    this.game.aiDirector.onPlayerAction('drone', actualTarget);
}
```

**Acciones detectadas:**
- 🚁 Drones del jugador
- 🛡️ Anti-drones del jugador
- 🏭 Plantas nucleares del jugador
- 🏥 Hospitales del jugador

---

## 🎬 **ACTIVACIÓN DE LA IA**

### **Inicio de Misión Normal:**
```javascript
// Game.js línea 311-313
if (this.aiDirector && this.aiSystemMode !== 'legacy') {
    this.aiDirector.activate();
}
```

### **Inicio de Tutorial:**
```javascript
// Game.js línea 685-687
this.enemyAI.setEnabled(false);
if (this.aiDirector) {
    this.aiDirector.deactivate();
}
```

---

## 📊 **VERIFICACIÓN DE INTEGRACIÓN**

### **Al iniciar el juego, deberías ver:**
```
🤖 Sistema IA: HYBRID - AIDirector + EnemyAISystem
```

### **Al iniciar una misión:**
```
🤖 IA Director: Sistema modular inicializado
📊 Componentes: StateAnalyzer, ActionEvaluator, ThreatAnalyzer
🤖 IA Director: ¡ACTIVADO!
⚙️ Intervalos: Supply(2s) | Strategic(8s) | Offensive(40.0s) | Harass(25s)
```

### **Durante el juego (cada 30s):**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 IA DIRECTOR - Estado: EVEN
💰 Currency: 250$ (Income: 5$/s vs 4$/s)
🏗️ Infraestructura: 2 FOBs, 1 Plantas
🚁 Lanzadera: ✅
📊 Stats: 3 Drones, 5 Snipers, 8 Edificios, 23 Decisiones
⚠️ Urgencia: 35/150
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🐛 **SOLUCIÓN DE PROBLEMAS**

### **Problema: La IA no hace nada**
**Verificar:**
1. ¿Está en modo `'hybrid'`? → Revisar línea 36 de Game.js
2. ¿Se activó correctamente? → Buscar logs de activación
3. ¿Hay errores en consola? → Abrir DevTools

### **Problema: Currency no sincroniza**
**Verificar:**
1. El gameLoop está actualizando correctamente (líneas 357-369)
2. No hay errores en AIDirector.update()

### **Problema: IA no reacciona a mis acciones**
**Verificar:**
1. BuildingSystem y DroneSystem están notificando (ver logs)
2. ThreatAnalyzer está registrando acciones
3. AIDirector está en modo activo

---

## 🔧 **CONFIGURACIÓN AVANZADA**

### **Ajustar comportamiento en AIConfig.js:**
```javascript
// src/ai/config/AIConfig.js

// Activar logs detallados
debug: {
    logScoring: true,      // Ver scores de acciones
    logDecisions: true,    // Ver decisiones tomadas
    logThreats: true,      // Ver amenazas detectadas
    logActions: true       // Ver ejecución
}

// Ajustar umbrales
thresholds: {
    earlyGame: 200,        // Cambiar fase early/mid
    minCurrencyToAct: 80   // Currency mínima
}

// Ajustar agresividad
scoring: {
    drone: {
        base: 45,          // Más alto = más drones
        ...
    }
}
```

---

## 📈 **PRÓXIMOS PASOS**

1. **Probar el sistema** en una partida real
2. **Ajustar pesos** de scoring según feedback
3. **Implementar estrategias** dedicadas (EarlyGameStrategy, etc.)
4. **Migrar acciones** a módulos independientes
5. **Deprecar** EnemyAISystem antiguo (cuando módulos estén completos)

---

## 📚 **DOCUMENTACIÓN RELACIONADA**

- **Arquitectura completa:** `src/ai/README.md`
- **Configuración:** `src/ai/config/AIConfig.js`
- **Árbol de comportamiento:** `ENEMY_AI_BEHAVIOR_TREE.md` (legacy, referencia)

---

**Estado:** ✅ **PRODUCCIÓN - LISTO PARA USAR**  
**Versión:** 2.0 Híbrido  
**Fecha:** Octubre 2025

