# 🎯 Sistema de Dificultad Basado en Velocidad (APM)

## 📋 Cambio Realizado

Se ha modificado el sistema de dificultad para que la **velocidad de acciones (APM)** sea el factor principal de diferenciación entre dificultades.

## ⚙️ Multiplicadores de Intervalo

### Antes (Sistema Complejo)
- **Easy**: Scores 30% menores, necesita 30% más currency, intervalos 20% más largos
- **Medium**: Normal
- **Hard**: Scores 30% mayores, necesita 30% menos currency, intervalos 20% más cortos

### Ahora (Sistema Simple - Solo Velocidad)
- **Easy**: Intervalos **1.5x más largos** (50% más lento)
  - Ejemplo: Decisión estratégica cada 12s en lugar de 8s
  - Ejemplo: Reacción cada 0.75s en lugar de 0.5s
- **Medium**: Velocidad **normal** (multiplicador 1.0)
  - Ejemplo: Decisión estratégica cada 8s
  - Ejemplo: Reacción cada 0.5s
- **Hard**: Intervalos **35% más cortos** (multiplicador 0.65 = ~54% más rápido)
  - Ejemplo: Decisión estratégica cada 5.2s en lugar de 8s
  - Ejemplo: Reacción cada 0.325s en lugar de 0.5s

## 📊 Tabla Comparativa

| Dificultad | Interval Multiplier | Ejemplo Strategic | Ejemplo Reaction | Ejemplo Offensive |
|------------|---------------------|------------------|------------------|-------------------|
| **Easy** | 1.5x | 12.0s | 0.75s | 60.0s |
| **Medium** | 1.0x | 8.0s | 0.5s | 40.0s |
| **Hard** | 0.65x | 5.2s | 0.325s | 26.0s |

## 🎮 Impacto en el Juego

### Fácil
- ✅ IA toma decisiones más lentamente
- ✅ Más tiempo para reaccionar a sus acciones
- ✅ Menos presión temporal
- ✅ Mejor para aprender el juego

### Medio
- ✅ Velocidad estándar
- ✅ Balance entre desafío y jugabilidad

### Difícil
- ✅ IA toma decisiones muy rápidamente
- ✅ Menos tiempo para reaccionar
- ✅ Alta presión temporal
- ✅ Desafío real para jugadores experimentados

## 🔧 Cambios Técnicos

### Archivos Modificados

1. **`server/game/ai/config/RaceAIConfig.js`**:
   - `actionScore`: Ahora siempre 1.0 (no cambia agresividad)
   - `currencyThreshold`: Ahora siempre 1.0 (no cambia umbrales)
   - `intervalMultiplier`: **Principal diferenciador**
     - Easy: 1.5 (50% más lento)
     - Medium: 1.0 (normal)
     - Hard: 0.65 (35% más rápido)

2. **`server/game/managers/AISystem.js`**:
   - Comentarios actualizados para reflejar que solo la velocidad cambia
   - `handleReactions()` simplificado (eliminado uso de `currencyThreshold`)

## ✅ Beneficios

1. **Simplicidad**: Un solo factor de diferenciación (velocidad)
2. **Claridad**: Es fácil entender qué hace cada dificultad
3. **Balance**: La IA mantiene la misma agresividad, solo cambia la velocidad
4. **Escalabilidad**: Fácil ajustar multiplicadores si es necesario

## 📝 Notas

- Los scores de acciones siguen siendo ajustados por raza, pero no por dificultad
- Los umbrales de currency siguen siendo ajustados por raza, pero no por dificultad
- La única diferencia entre dificultades es la **velocidad de las acciones**

---

**Última Actualización**: 2024




