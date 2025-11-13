# Documentación de Balanceo: Métricas y Configuración del Juego

## Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Configuración de Partida](#configuración-de-partida)
3. [Métricas del Juego](#métricas-del-juego)
4. [KPIs Sugeridos para Análisis](#kpis-sugeridos-para-análisis)
5. [Puntos de Control de Balance](#puntos-de-control-de-balance)
6. [Estimaciones de Tiempos de Partida](#estimaciones-de-tiempos-de-partida)
7. [Métricas de Rendimiento](#métricas-de-rendimiento)

---

## Resumen Ejecutivo

Este documento detalla todas las métricas y configuraciones técnicas del juego que son relevantes para el balanceo. Incluye configuraciones de partida, métricas que se trackean durante el juego, KPIs sugeridos para análisis post-lanzamiento y puntos de control críticos para el balanceo.

**Características Clave:**
- Tick rate: 10 TPS (optimizado desde 20 TPS)
- Dimensiones del mundo: 1920x1080 píxeles
- Countdown inicial: 3 segundos
- Sistema de estadísticas implementado para análisis

---

## Configuración de Partida

### Configuración Base

| Propiedad | Valor | Descripción |
|-----------|-------|-------------|
| Countdown | 3 segundos | Tiempo de espera antes de empezar |
| Tick Rate | 10 TPS | Ticks por segundo (optimizado desde 20) |
| Ancho del Mundo | 1920 px | Ancho total del mapa |
| Alto del Mundo | 1080 px | Alto total del mapa |
| Línea de Victoria Izquierda | 288px (15%) | Línea de victoria para player2 |
| Línea de Victoria Derecha | 1632px (85%) | Línea de victoria para player1 |

### Tick Rate y Performance

**Configuración Actual:**
- **Tick Rate:** 10 TPS (Ticks por Segundo)
- **Intervalo entre ticks:** 100ms
- **Optimización:** Reducido de 20 TPS a 10 TPS para mejor rendimiento

**Impacto en Balanceo:**
- Afecta la precisión de cálculos de movimiento
- Afecta la responsividad de acciones del jugador
- Afecta la sincronización servidor-cliente

**Consideraciones:**
- Tick rate más bajo = menos precisión pero mejor rendimiento
- Tick rate más alto = más precisión pero mayor carga del servidor
- 10 TPS es un balance razonable para un RTS

### Dimensiones del Mundo

**Configuración:**
- **Ancho:** 1920 píxeles
- **Alto:** 1080 píxeles
- **Ratio:** 16:9 (estándar)

**Distribución Territorial Inicial:**

| Equipo | Posición HQ | Territorio Inicial |
|--------|-------------|-------------------|
| Player1 | x = 100px | 100px → ~825px (~725px) |
| Player2 | x = 1820px | ~775px → 1820px (~1045px) |

**Nota:** La distribución inicial es ligeramente asimétrica (Player2 tiene más territorio inicial).

### Líneas de Victoria

**Cálculo:**
- Línea izquierda: 1920 × 0.15 = 288px
- Línea derecha: 1920 × 0.85 = 1632px
- Zona de juego efectiva: 1632 - 288 = 1344px

**Análisis:**
- Player1 debe avanzar: 1632 - 800 = 832px para ganar
- Player2 debe avanzar: 800 - 288 = 512px para ganar
- **Asimetría:** Player2 tiene ventaja inicial (menos distancia para ganar)

---

## Métricas del Juego

### Estadísticas Trackeadas

El juego trackea las siguientes estadísticas durante la partida:

**Por Jugador:**
- **Edificios construidos:** Número de edificios construidos (excluyendo HQ, FOB, Front)
- **Avance máximo:** Posición X más avanzada alcanzada por los frentes
- **Currency final:** Currency al final de la partida
- **Currency total generado:** Currency total generado durante toda la partida

**Globales:**
- **Duración de la partida:** Tiempo total en segundos
- **Edificios perdidos:** Edificios destruidos durante la partida
- **Drones lanzados:** Número de drones usados
- **Snipers lanzados:** Número de snipers usados
- **Convoyes despachados:** Número de convoyes enviados
- **Emergencias resueltas:** Emergencias médicas resueltas
- **Emergencias fallidas:** Emergencias médicas no resueltas

### Métricas de Estado del Juego

**Estado Actual:**
- **gameTime:** Tiempo transcurrido desde el inicio (segundos)
- **tickCounter:** Número de ticks desde el inicio
- **currency:** Currency actual de cada jugador
- **currencyGenerated:** Currency total generado por cada jugador

**Entidades Activas:**
- **nodes:** Número de nodos en el juego
- **convoys:** Número de convoyes activos
- **trains:** Número de trenes activos
- **helicopters:** Número de helicópteros activos
- **drones:** Número de drones activos
- **tanks:** Número de tanques activos

---

## KPIs Sugeridos para Análisis

### KPIs de Balanceo

#### 1. Tiempo Promedio de Partida

**Métrica:** Duración promedio de las partidas completadas
**Objetivo:** 5-15 minutos
**Análisis:**
- Partidas muy cortas (< 3 min): Puede indicar desbalance
- Partidas muy largas (> 20 min): Puede indicar falta de progresión
- Partidas ideales: 5-15 minutos

#### 2. Distribución de Victorias

**Métrica:** Porcentaje de victorias por condición
**Objetivo:** Distribución equilibrada
**Categorías:**
- Victoria activa (frente alcanza línea)
- Victoria pasiva (frontera enemiga retrocede)
- Análisis de qué condición ocurre más frecuentemente

#### 3. Currency Generado por Minuto

**Métrica:** Currency promedio generado por minuto por jugador
**Objetivo:** Balance entre jugadores
**Análisis:**
- Diferencias grandes pueden indicar desbalance económico
- Currency por minuto debería ser similar entre jugadores

#### 4. Edificios Construidos por Partida

**Métrica:** Número promedio de edificios construidos por jugador
**Objetivo:** 5-15 edificios por partida
**Análisis:**
- Muy pocos edificios: Puede indicar economía lenta
- Demasiados edificios: Puede indicar economía rápida

#### 5. Uso de Consumibles

**Métrica:** Frecuencia de uso de cada consumible
**Objetivo:** Todos los consumibles deberían usarse
**Análisis:**
- Consumibles nunca usados: Pueden estar desbalanceados (muy caros o débiles)
- Consumibles siempre usados: Pueden estar desbalanceados (muy baratos o fuertes)

#### 6. Tasa de Éxito de Drones

**Métrica:** Porcentaje de drones que impactan vs son interceptados
**Objetivo:** 40-60% de éxito
**Análisis:**
- Tasa muy alta (> 80%): Anti-Drones pueden ser débiles
- Tasa muy baja (< 20%): Drones pueden ser demasiado caros

#### 7. Impacto de Efectos Temporales

**Métrica:** Efectividad promedio de efectos temporales
**Objetivo:** Efectos deberían tener impacto medible
**Análisis:**
- Sniper: ¿Cuántos supplies adicionales se consumen?
- Comando: ¿Cuántos edificios se deshabilitan en promedio?
- Sabotaje: ¿Cuánto tiempo se ralentiza la logística?

#### 8. Distribución de Mazos

**Métrica:** Frecuencia de uso de diferentes mazos
**Objetivo:** Variedad de mazos viables
**Análisis:**
- Mazos dominantes: Pueden indicar desbalance
- Mazos nunca usados: Pueden necesitar ajustes

### KPIs de Performance

#### 1. Tick Rate Promedio

**Métrica:** Ticks por segundo promedio del servidor
**Objetivo:** Mantener 10 TPS
**Análisis:**
- Caídas de tick rate pueden indicar problemas de optimización
- Tick rate consistente es crucial para balanceo

#### 2. Latencia Servidor-Cliente

**Métrica:** Tiempo de respuesta servidor-cliente
**Objetivo:** < 100ms
**Análisis:**
- Alta latencia puede afectar la experiencia de juego
- Puede afectar la precisión de acciones rápidas

#### 3. Entidades Activas

**Métrica:** Número promedio de entidades activas simultáneamente
**Objetivo:** < 100 entidades
**Análisis:**
- Demasiadas entidades pueden afectar el rendimiento
- Puede indicar necesidad de optimización

---

## Puntos de Control de Balance

### Puntos de Control Tempranos (0-2 minutos)

**Métricas Clave:**
- Currency inicial: 30
- Primera construcción: ¿Qué edificio se construye primero?
- Tiempo hasta primera acción: ¿Cuánto tarda el jugador en actuar?

**Objetivos:**
- Los jugadores deberían poder construir su primer edificio rápidamente
- No debería haber ventaja inicial significativa
- Las opciones iniciales deberían ser equilibradas

### Puntos de Control Medios (2-5 minutos)

**Métricas Clave:**
- Currency generado: ¿Cuánto currency tiene cada jugador?
- Edificios construidos: ¿Cuántos edificios tiene cada jugador?
- Avance territorial: ¿Qué equipo está avanzando más?

**Objetivos:**
- El balance debería mantenerse equilibrado
- No debería haber ventaja dominante
- Las estrategias deberían ser viables

### Puntos de Control Tardíos (5+ minutos)

**Métricas Clave:**
- Currency total generado: ¿Hay diferencia significativa?
- Edificios construidos: ¿Hay diferencia significativa?
- Avance territorial: ¿Qué equipo está ganando?

**Objetivos:**
- El juego debería progresar hacia una conclusión
- No debería haber estancamiento
- Las victorias deberían ser posibles

### Puntos de Control por Sistema

#### Sistema Económico

**Métricas:**
- Currency generado por segundo promedio
- Currency total generado por partida
- Diferencias entre jugadores

**Objetivos:**
- Currency debería generarse a ritmo constante
- No debería haber diferencias grandes entre jugadores
- Las inversiones deberían tener retorno apropiado

#### Sistema de Combate

**Métricas:**
- Tasa de éxito de drones
- Uso de consumibles
- Efectividad de efectos temporales

**Objetivos:**
- Todos los consumibles deberían ser útiles
- No debería haber consumibles dominantes
- Los efectos deberían tener impacto medible

#### Sistema de Logística

**Métricas:**
- Throughput promedio de suministros
- Tiempo promedio de viaje
- Frecuencia de convoyes

**Objetivos:**
- Los suministros deberían fluir consistentemente
- No debería haber cuellos de botella
- La logística debería ser manejable

#### Sistema de Frentes

**Métricas:**
- Avance promedio por minuto
- Consumo promedio de suministros
- Distribución territorial

**Objetivos:**
- Los frentes deberían avanzar a ritmo constante
- No debería haber estancamiento
- El territorio debería cambiar dinámicamente

---

## Estimaciones de Tiempos de Partida

### Cálculo Teórico de Tiempo Mínimo

**Escenario:** Victoria rápida por avance agresivo

**Suposiciones:**
- Frente avanza constantemente a 4 px/s
- Distancia para ganar: 832px (Player1) o 512px (Player2)
- Suministros siempre disponibles

**Cálculo:**
- Player1: 832px ÷ 4 px/s = 208 segundos (~3.5 minutos)
- Player2: 512px ÷ 4 px/s = 128 segundos (~2.1 minutos)

**Nota:** Esto es teórico - en la práctica, los frentes no avanzan constantemente debido a colisiones y falta de suministros.

### Cálculo Teórico de Tiempo Máximo

**Escenario:** Empate prolongado

**Suposiciones:**
- Frentes en colisión constante
- Suministros equilibrados
- Empate continuo

**Cálculo:**
- Sin avance neto = partida indefinida
- En la práctica, las partidas terminan cuando un equipo se queda sin suministros

**Estimación práctica:** 15-30 minutos máximo antes de que un equipo colapse

### Tiempo Promedio Estimado

**Basado en mecánicas:**
- Consumo de suministros: 1.6 supplies/s por frente
- Suministros iniciales: 50 por frente
- Duración sin reabastecimiento: ~31 segundos
- Con reabastecimiento constante: Partida puede durar indefinidamente

**Estimación realista:** 5-15 minutos para partidas típicas

---

## Métricas de Rendimiento

### Métricas del Servidor

**Tick Rate:**
- **Configurado:** 10 TPS
- **Objetivo:** Mantener 10 TPS consistentemente
- **Métrica:** Ticks por segundo promedio

**Latencia:**
- **Objetivo:** < 100ms servidor-cliente
- **Métrica:** Tiempo de respuesta promedio

**Entidades Activas:**
- **Objetivo:** < 100 entidades simultáneas
- **Métrica:** Número máximo de entidades activas

### Métricas del Cliente

**FPS (Frames por Segundo):**
- **Objetivo:** 60 FPS
- **Métrica:** FPS promedio durante partida

**Uso de Memoria:**
- **Objetivo:** < 500MB
- **Métrica:** Memoria RAM utilizada

**Carga de CPU:**
- **Objetivo:** < 50% uso de CPU
- **Métrica:** Porcentaje de CPU utilizado

---

## Métricas Sugeridas para Tracking Post-Lanzamiento

### Métricas de Jugador

1. **Tiempo promedio de sesión**
2. **Partidas completadas vs abandonadas**
3. **Tasa de victoria por mazo**
4. **Mazos más populares**
5. **Unidades más construidas**
6. **Consumibles más usados**

### Métricas de Balanceo

1. **Distribución de victorias por condición**
2. **Currency promedio generado por minuto**
3. **Edificios promedio construidos por partida**
4. **Tasa de éxito de drones**
5. **Impacto promedio de efectos temporales**
6. **Throughput promedio de suministros**
7. **Avance promedio por minuto**

### Métricas de Performance

1. **Tick rate promedio del servidor**
2. **Latencia promedio servidor-cliente**
3. **Número máximo de entidades activas**
4. **FPS promedio del cliente**
5. **Uso de memoria promedio**

### Métricas de Engagement

1. **Partidas por jugador por día**
2. **Tiempo promedio entre partidas**
3. **Mazos creados por jugador**
4. **Experimentos con diferentes mazos**

---

## Análisis de Configuración Actual

### Fortalezas de la Configuración

1. **Tick Rate Optimizado:**
   - 10 TPS es un buen balance entre precisión y rendimiento
   - Permite cálculos precisos sin sobrecargar el servidor

2. **Dimensiones Apropiadas:**
   - 1920x1080 es estándar y familiar
   - Proporciona espacio suficiente para estrategia

3. **Sistema de Estadísticas:**
   - Trackea métricas importantes
   - Permite análisis post-partida

### Áreas de Mejora Potencial

1. **Asimetría Inicial:**
   - Player2 tiene más territorio inicial
   - Player2 tiene menos distancia para ganar
   - **Consideración:** ¿Debería ser simétrico?

2. **Tick Rate:**
   - 10 TPS puede ser bajo para acciones rápidas
   - **Consideración:** ¿Debería ser 15-20 TPS?

3. **Métricas Adicionales:**
   - Podrían trackearse más métricas
   - **Consideración:** ¿Qué métricas adicionales serían útiles?

---

## Notas para Balanceo

### Puntos Clave a Considerar

1. **Configuración de Partida:**
   - ¿El countdown de 3 segundos es apropiado?
   - ¿Las dimensiones del mundo son adecuadas?
   - ¿Las líneas de victoria están balanceadas?

2. **Tick Rate:**
   - ¿10 TPS es suficiente para precisión?
   - ¿Afecta el balanceo de alguna manera?
   - ¿Debería ser ajustable?

3. **Métricas:**
   - ¿Se trackean suficientes métricas?
   - ¿Las métricas actuales son útiles para balanceo?
   - ¿Qué métricas adicionales serían valiosas?

4. **Asimetría:**
   - ¿La asimetría inicial es intencional?
   - ¿Afecta el balance del juego?
   - ¿Debería ser simétrico?

### Recomendaciones para Análisis

1. **Implementar Tracking Detallado:**
   - Trackear todas las acciones del jugador
   - Trackear tiempos de todas las acciones
   - Trackear resultados de todas las acciones

2. **Análisis Post-Partida:**
   - Analizar métricas después de cada partida
   - Identificar patrones y tendencias
   - Ajustar balance basándose en datos

3. **Testing Continuo:**
   - Probar diferentes configuraciones
   - Medir impacto de cambios
   - Iterar basándose en resultados

---

**Última actualización:** Basado en código del servidor
**Archivos fuente:**
- `server/config/gameConfig.js`
- `server/game/GameStateManager.js`
- `src/Game.js`
- `src/systems/NetworkManager.js`

