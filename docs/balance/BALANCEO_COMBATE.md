# Documentación de Balanceo: Mecánicas de Combate

## Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Sistema de Combate de Frentes](#sistema-de-combate-de-frentes)
3. [Sistema de Drones](#sistema-de-drones)
4. [Sistema de Tanques](#sistema-de-tanques)
5. [Sistema de Francotirador](#sistema-de-francotirador)
6. [Sistema de Sabotaje](#sistema-de-sabotaje)
7. [Sistema de Comandos Especiales](#sistema-de-comandos-especiales)
8. [Efectos Temporales](#efectos-temporales)
9. [Interacciones y Contadores](#interacciones-y-contadores)
10. [Condiciones de Victoria](#condiciones-de-victoria)

---

## Resumen Ejecutivo

Este documento detalla todas las mecánicas de combate del juego, incluyendo velocidades, rangos, tiempos de espera, efectos temporales y las interacciones entre diferentes sistemas de combate.

**Características Clave:**
- El combate se basa principalmente en destrucción de edificios y efectos temporales
- No hay sistema de vida/armadura tradicional - los edificios se destruyen instantáneamente
- Los frentes se mueven basándose en suministros, no en combate directo
- Los efectos temporales son cruciales para el balanceo estratégico

---

## Sistema de Combate de Frentes

### Mecánica Base

Los frentes no combaten directamente, sino que avanzan o retroceden basándose en sus suministros y comparación con frentes enemigos.

### Velocidades

| Estado | Velocidad | Condición |
|--------|----------|-----------|
| Avance | 4 px/s | Con suministros > 0 y sin colisión |
| Retroceso | 4 px/s | Sin suministros (supplies = 0) |
| Empuje | 4 px/s | Cuando tiene más suministros que el enemigo |
| Empujado | 4 px/s | Cuando tiene menos suministros que el enemigo |
| Empate | 0 px/s | Suministros iguales y > 0 |
| Ambos sin recursos | 4 px/s retroceso | Ambos frentes sin suministros |

### Consumo de Suministros

- **Tasa base:** 1.6 supplies/segundo
- **Con efecto "herido":** 3.2 supplies/segundo (duplica consumo)
- **Duración del efecto herido:** 15 segundos

### Mecánica de Colisión

Los frentes entran en colisión cuando están en rango de contacto:

- **Radio del frente:** 40px
- **Gap hasta frontera:** 25px
- **Zona neutral:** 25px
- **Rango de colisión total:** ~90px (40 + 25 + 25)

**Comportamiento en colisión:**
1. **Más suministros:** Empuja al enemigo (avanza hacia él)
2. **Menos suministros:** Es empujado (retrocede)
3. **Suministros iguales > 0:** Empate (no se mueven)
4. **Ambos sin suministros:** Ambos retroceden

### Generación de Currency por Avance

- **Conversión:** Cada 2 píxeles de avance = 1 currency
- **Mecánica:** Solo cuenta avance neto (no retroceso)
- **Tracking:** Se acumula y otorga en incrementos enteros

---

## Sistema de Drones

### Estadísticas Base

| Propiedad | Valor |
|-----------|-------|
| Costo | 150 currency |
| Velocidad | 300 px/s |
| Requisito | Lanzadera de Drones construida |
| Tipo | Proyectil consumible |

### Mecánica de Lanzamiento

- **Punto de origen:** Extremo del mapa del jugador
  - Player1: x = 0
  - Player2: x = 1920 (worldWidth)
- **Altura:** Misma altura que el objetivo (y = target.y)
- **Movimiento:** Directo hacia el objetivo en línea recta

### Sistema de Intercepción (Anti-Drones)

Los Anti-Drones pueden interceptar drones enemigos:

| Rango | Función |
|-------|---------|
| 160px | Rango de intercepción (disparo) |
| 220px | Rango de alerta (sonido de advertencia) |

**Mecánica:**
- El Anti-Dron más cercano en rango intercepta el dron
- El Anti-Dron se autodestruye al interceptar (solo tiene 1 proyectil)
- Si hay múltiples Anti-Drones en rango, el más cercano intercepta

### Objetivos Válidos

**Puede atacar:**
- FOB
- Planta Nuclear
- Anti-Dron
- Hospital de Campaña
- Lanzadera de Drones
- Fábrica de Camiones
- Centro de Ingenieros
- Radio de Inteligencia
- Centro de Inteligencia
- Base Aérea
- Estación de Tren

**NO puede atacar:**
- HQ
- Front
- Edificios en construcción

### Tiempo de Viaje Estimado

Para un objetivo a 960px (mitad del mapa):
- **Tiempo:** ~3.2 segundos
- **Sin intercepción:** Destruye el edificio instantáneamente al llegar

### Análisis de Balance

- **Costo del dron:** 150 currency
- **Costo del Anti-Dron:** 115 currency
- **Intercambio económico:** El Anti-Dron es más barato que el dron que intercepta
- **Eficiencia:** El Anti-Dron es económicamente eficiente si intercepta al menos 1 dron

---

## Sistema de Tanques

### Estadísticas Base

| Propiedad | Valor |
|-----------|-------|
| Costo | 100 currency |
| Velocidad | 125 px/s |
| Tiempo de espera antes de disparar | 1.0 segundo |
| Duración de animación de disparo | 0.35 segundos |
| Tipo | Unidad consumible |

### Mecánica de Lanzamiento

- **Punto de origen:** Extremo del mapa del jugador
  - Player1: x = 0
  - Player2: x = 1920 (worldWidth)
- **Altura:** Misma altura que el objetivo (y = target.y)
- **Punto de parada:** A 15px del borde del hitbox del edificio

### Estados del Tanque

1. **Moving:** Moviéndose hacia el objetivo
2. **Waiting:** Esperando 1 segundo antes de disparar
3. **Shooting:** Animación de disparo (0.35 segundos)
4. **Completed:** Tanque se desactiva después del impacto

### Objetivos Válidos

**Puede atacar:**
- Planta Nuclear
- Anti-Dron
- Hospital de Campaña
- Lanzadera de Drones
- Fábrica de Camiones
- Centro de Ingenieros
- Radio de Inteligencia
- Centro de Inteligencia
- Base Aérea
- Torre de Vigilancia
- Estación de Tren

**NO puede atacar:**
- FOB
- HQ
- Front
- Edificios en construcción

### Tiempo Total Estimado

Para un objetivo a 960px (mitad del mapa):
- **Tiempo de viaje:** ~7.7 segundos
- **Tiempo de espera:** 1.0 segundo
- **Tiempo de disparo:** 0.35 segundos
- **Tiempo total:** ~9.05 segundos

### Comparación con Drones

| Aspecto | Dron | Tanque |
|---------|------|--------|
| Costo | 150 | 100 |
| Velocidad | 300 px/s | 125 px/s |
| Tiempo total | ~3.2s | ~9.05s |
| Puede atacar FOB | Sí | No |
| Puede ser interceptado | Sí (Anti-Dron) | No |
| Ventaja | Más rápido, más versátil | Más barato, no interceptable |

---

## Sistema de Francotirador

### Estadísticas Base

| Propiedad | Valor |
|-----------|-------|
| Costo | 40 currency |
| Duración del efecto | 15 segundos |
| Cooldown de sonido | 7 segundos |
| Tipo | Consumible instantáneo |

### Objetivos Válidos

1. **Front enemigo:** Aplica efecto "herido"
2. **Comando Especial enemigo:** Elimina el comando inmediatamente

### Efecto en Frentes

**Efecto "Herido":**
- **Duración:** 15 segundos
- **Multiplicador de consumo:** 2x (duplica)
- **Consumo normal:** 1.6 supplies/s
- **Consumo herido:** 3.2 supplies/s
- **Suministros consumidos en 15s:** ~48 supplies

**Mecánica:**
- Se aplica instantáneamente al disparar
- El efecto se elimina automáticamente después de 15 segundos
- El consumo vuelve a la normalidad automáticamente

### Efecto en Comandos

**Eliminación inmediata:**
- El comando se marca como `isAbandoning = true`
- Se aplica efecto residual de 3 segundos a los edificios afectados
- El comando se elimina en el siguiente ciclo de limpieza

### Análisis de Balance

- **Costo:** 40 currency
- **Efecto:** Duplica consumo por 15s (~48 supplies extra consumidos)
- **Eficiencia:** Muy alta si se usa en momentos críticos
- **Uso estratégico:** Presionar frentes enemigos cuando están bajos de suministros

---

## Sistema de Sabotaje

### Estadísticas Base

| Propiedad | Valor |
|-----------|-------|
| Costo | 40 currency |
| Objetivo | Solo FOBs enemigas |
| Penalización | 50% velocidad (multiplicador 0.5x) |
| Duración | Afecta a los siguientes 3 camiones |
| Tipo | Consumible instantáneo |

### Mecánica

1. Se aplica a una FOB enemiga específica
2. Los siguientes 3 camiones que salgan de esa FOB tendrán -50% velocidad
3. El efecto se consume por camión (3 usos totales)

### Restricciones

- **Protección:** No funciona si el FOB está protegido por una Torre de Vigilancia enemiga (rango 320px)
- **Solo FOBs:** No puede aplicarse a otros edificios

### Análisis de Balance

- **Costo:** 40 currency
- **Efecto:** Ralentiza 3 convoyes
- **Impacto:** Depende de la frecuencia de convoyes del enemigo
- **Eficiencia:** Situacional - mejor contra jugadores con alta actividad logística

---

## Sistema de Comandos Especiales

### Estadísticas Base

| Propiedad | Valor |
|-----------|-------|
| Costo | 70 currency |
| Requisito | Centro de Inteligencia construido |
| Radio físico | 25px |
| Radio de efecto | 200px |
| Vida | 50 HP |
| Duración | 10 segundos |
| Efecto residual | 3 segundos adicionales |
| Tipo | Unidad desplegable |

### Mecánica de Despliegue

- **Ubicación:** Solo en territorio enemigo
- **Restricción:** No puede desplegarse cerca de Torres de Vigilancia enemigas (rango 320px)
- **Detección:** Ignora límites de detección normales

### Efecto de Deshabilitación

**Edificios afectados:**
- Todos los edificios enemigos dentro del radio de 200px
- Considera el hitbox del edificio (radio * 1.2) para mejor detección
- NO afecta: HQ, Front, otros Comandos

**Efecto:**
- Los edificios se marcan como `disabled = true`
- Los edificios deshabilitados no funcionan (no generan efectos, no pueden enviar convoyes, etc.)
- El efecto se mantiene mientras el comando esté activo

### Expiración y Efecto Residual

**Expiración automática:**
- Después de 10 segundos, el comando expira automáticamente
- Se marca como `isAbandoning = true` y se elimina

**Efecto residual:**
- Cuando el comando se elimina (por expiración o por sniper), los edificios afectados permanecen deshabilitados por 3 segundos adicionales
- Esto previene que el enemigo reactive inmediatamente sus edificios

### Eliminación por Sniper

Si un sniper elimina el comando:
- El comando se marca como `isAbandoning = true`
- Se aplica efecto residual de 3 segundos a todos los edificios afectados
- El comando se elimina en el siguiente ciclo de limpieza

### Análisis de Balance

- **Costo:** 70 currency
- **Duración total:** 10s activo + 3s residual = 13s de deshabilitación
- **Área de efecto:** Radio de 200px (área de ~125,664 px²)
- **Eficiencia:** Muy alta si se usa para deshabilitar múltiples edificios críticos
- **Contador:** Torre de Vigilancia (protege en rango de 320px)

---

## Efectos Temporales

### Efecto "Herido" (Wounded)

| Propiedad | Valor |
|-----------|-------|
| Duración | 15 segundos |
| Multiplicador de consumo | 2x |
| Icono | 'ui-wounded' |
| Tooltip | 'Herido: Consume el doble' |

**Aplicación:**
- Por sniper strike en un front
- Por emergencia médica no resuelta (sistema médico)

**Mecánica:**
- Duplica el consumo de suministros del frente
- Se elimina automáticamente después de 15 segundos
- El consumo vuelve a la normalidad automáticamente

### Efecto "Sabotaje FOB" (fobSabotage)

| Propiedad | Valor |
|-----------|-------|
| Penalización | 50% velocidad (0.5x) |
| Duración | 3 camiones |
| Icono | 'ui-no-supplies' |
| Tooltip | 'Saboteada: -50% velocidad en los siguientes 3 camiones' |

**Mecánica:**
- Se aplica a una FOB específica
- Afecta a los siguientes 3 camiones que salgan de esa FOB
- Cada camión consume 1 uso del efecto

### Efecto "Deshabilitado" (disabled)

| Propiedad | Valor |
|-----------|-------|
| Causa | Comando Especial |
| Duración | Mientras el comando esté activo |
| Efecto | Edificio no funciona |

**Mecánica:**
- Los edificios deshabilitados no pueden:
  - Generar efectos pasivos
  - Enviar convoyes
  - Procesar acciones
- Se restaura automáticamente cuando el comando expira o se elimina

### Efecto Residual de Comando (commandoResidual)

| Propiedad | Valor |
|-----------|-------|
| Duración | 3 segundos |
| Causa | Comando eliminado (por expiración o sniper) |
| Efecto | Mantiene edificios deshabilitados |

**Mecánica:**
- Se aplica cuando un comando se elimina
- Mantiene los edificios deshabilitados por 3 segundos adicionales
- Previene reactivación inmediata de edificios críticos

---

## Interacciones y Contadores

### Matriz de Interacciones

| Sistema | Contador | Efectividad |
|---------|----------|-------------|
| Dron | Anti-Dron | ⭐⭐⭐⭐⭐ (100% si está en rango) |
| Comando | Torre de Vigilancia | ⭐⭐⭐⭐⭐ (Previene despliegue en rango 320px) |
| Comando | Sniper | ⭐⭐⭐⭐ (Elimina comando, pero deja efecto residual) |
| FOB Sabotaje | Torre de Vigilancia | ⭐⭐⭐⭐⭐ (Previene sabotaje en rango 320px) |
| Front | Sniper | ⭐⭐⭐⭐ (Duplica consumo por 15s) |

### Sinergias

**Comando + Sniper:**
- El sniper puede eliminar comandos enemigos
- Útil para proteger edificios críticos

**Anti-Dron + Múltiples Drones:**
- Un Anti-Dron solo intercepta 1 dron
- Múltiples Anti-Drones pueden proteger contra múltiples drones

**Torre de Vigilancia + Defensa:**
- Protege contra comandos y sabotajes
- Útil para proteger FOBs críticas

---

## Condiciones de Victoria

### Líneas de Victoria

- **Línea izquierda:** 15% del ancho del mapa (288px)
- **Línea derecha:** 85% del ancho del mapa (1632px)

### Condiciones de Victoria Activa

**Player1 gana si:**
- Algún frente player1 alcanza x >= 1632px (85% del mapa)

**Player2 gana si:**
- Algún frente player2 alcanza x <= 288px (15% del mapa)

### Condiciones de Victoria Pasiva

**Player1 gana si:**
- La frontera de player2 retrocede hasta x >= 1632px (85% del mapa)

**Player2 gana si:**
- La frontera de player1 retrocede hasta x <= 288px (15% del mapa)

### Cálculo de Frontera

- **Player1:** Frontera = X más alto de todos sus frentes + 25px
- **Player2:** Frontera = X más bajo de todos sus frentes - 25px

---

## Notas para Balanceo

### Puntos Clave a Considerar

1. **Velocidades de Proyectiles:**
   - Los drones son 2.4x más rápidos que los tanques
   - Los tanques son más baratos pero más lentos
   - ¿Es suficiente diferencia para justificar el costo?

2. **Efectos Temporales:**
   - El efecto "herido" duplica consumo por 15s
   - ¿Es suficiente presión o debería durar más?
   - ¿El costo de 40 currency es apropiado?

3. **Sistema de Comandos:**
   - 10s activo + 3s residual = 13s total
   - ¿Es suficiente tiempo para tener impacto estratégico?
   - ¿El costo de 70 currency es apropiado?

4. **Contadores:**
   - Anti-Dron vs Dron: Intercambio económico favorable para el defensor
   - Torre de Vigilancia: Protege contra comandos y sabotajes
   - ¿Hay suficientes contadores para cada estrategia?

5. **Velocidades de Frentes:**
   - 4 px/s tanto para avance como retroceso
   - ¿Deberían ser diferentes?
   - ¿El consumo de 1.6 supplies/s es apropiado?

### Métricas Sugeridas para Análisis

- **Tiempo promedio de partida:** ¿Cuánto duran las partidas?
- **Frecuencia de uso de consumibles:** ¿Qué consumibles se usan más?
- **Tasa de éxito de drones:** ¿Qué porcentaje de drones son interceptados?
- **Impacto de comandos:** ¿Cuántos edificios se deshabilitan en promedio?
- **Efectividad de sniper:** ¿Cuántos supplies adicionales se consumen por sniper?

---

**Última actualización:** Basado en código del servidor
**Archivos fuente:**
- `server/game/handlers/CombatHandler.js`
- `server/systems/DroneSystemServer.js`
- `server/systems/TankSystemServer.js`
- `server/systems/FrontMovementSystemServer.js`
- `server/systems/CommandoSystem.js`
- `server/config/serverNodes.js`

