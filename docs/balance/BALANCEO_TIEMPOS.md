# Documentación de Balanceo: Sistema de Tiempos

## Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Tiempos de Construcción](#tiempos-de-construcción)
3. [Tiempos de Viaje](#tiempos-de-viaje)
4. [Duración de Efectos Temporales](#duración-de-efectos-temporales)
5. [Tiempos de Cooldown](#tiempos-de-cooldown)
6. [Intervalos Automáticos](#intervalos-automáticos)
7. [Tiempos de Abandono](#tiempos-de-abandono)
8. [Tiempos de Inversión](#tiempos-de-inversión)
9. [Análisis de Ventanas de Oportunidad](#análisis-de-ventanas-de-oportunidad)
10. [Tiempos de Ciclo Económico](#tiempos-de-ciclo-económico)

---

## Resumen Ejecutivo

El sistema de tiempos es crucial para el balanceo del juego. Controla cuándo los jugadores pueden actuar, cuánto tiempo tardan las acciones y cuánto duran los efectos. Los tiempos afectan directamente el ritmo del juego, las ventanas de oportunidad y la viabilidad de diferentes estrategias.

**Características Clave:**
- Tiempos de construcción: 2-4 segundos
- Tiempos de viaje: Variables según distancia y velocidad
- Efectos temporales: 3-15 segundos
- Intervalos automáticos: 12-60 segundos
- Tiempos de abandono: 1-5 segundos

---

## Tiempos de Construcción

### Tabla Completa de Tiempos de Construcción

| Edificio | Tiempo de Construcción | Costo | Ratio Costo/Tiempo |
|----------|------------------------|-------|-------------------|
| FOB | 4s | 120 | 30/s |
| Anti-Dron | 4s | 115 | 28.75/s |
| Lanzadera de Drones | 2s | 100 | 50/s |
| Planta Nuclear | 4s | 200 | 50/s |
| Fábrica de Camiones | 2s | 100 | 50/s |
| Centro de Ingenieros | 4s | 120 | 30/s |
| Radio de Inteligencia | 2s | 70 | 35/s |
| Centro de Inteligencia | 3s | 150 | 50/s |
| Estación de Tren | 4s | 170 | 42.5/s |
| Base Aérea | 3s | 150 | 50/s |
| Hospital de Campaña | 2s | 60 | 30/s |
| Torre de Vigilancia | 3s | 120 | 40/s |

### Análisis de Tiempos de Construcción

**Edificios Rápidos (2 segundos):**
- Lanzadera de Drones
- Fábrica de Camiones
- Radio de Inteligencia
- Hospital de Campaña

**Ventaja:** Permiten construcción rápida y reacción inmediata

**Edificios Medianos (3 segundos):**
- Centro de Inteligencia
- Base Aérea
- Torre de Vigilancia

**Ventaja:** Balance entre velocidad y costo

**Edificios Lentos (4 segundos):**
- FOB
- Anti-Dron
- Planta Nuclear
- Centro de Ingenieros
- Estación de Tren

**Ventaja:** Más tiempo para el enemigo de reaccionar, pero edificios más poderosos

### Ratio Costo/Tiempo

**Alto Ratio (> 45/s):**
- Lanzadera: 50/s
- Planta Nuclear: 50/s
- Fábrica: 50/s
- Centro de Inteligencia: 50/s
- Base Aérea: 50/s

**Interpretación:** Estos edificios tienen alto costo por tiempo de construcción

**Bajo Ratio (< 35/s):**
- Radio de Inteligencia: 35/s
- Anti-Dron: 28.75/s
- FOB: 30/s
- Centro de Ingenieros: 30/s
- Hospital: 30/s

**Interpretación:** Estos edificios tienen menor costo por tiempo de construcción

---

## Tiempos de Viaje

### Tiempos de Viaje de Convoyes

**Heavy Truck (40 px/s):**

| Distancia | Tiempo Ida | Tiempo Vuelta | Tiempo Total |
|-----------|------------|---------------|--------------|
| 200px | 5.0s | 5.0s | 10.0s |
| 400px | 10.0s | 10.0s | 20.0s |
| 600px | 15.0s | 15.0s | 30.0s |
| 800px | 20.0s | 20.0s | 40.0s |

**Heavy Truck con Centro de Ingenieros (60 px/s):**

| Distancia | Tiempo Ida | Tiempo Vuelta | Tiempo Total |
|-----------|------------|---------------|--------------|
| 200px | 3.3s | 3.3s | 6.6s |
| 400px | 6.7s | 6.7s | 13.3s |
| 600px | 10.0s | 10.0s | 20.0s |
| 800px | 13.3s | 13.3s | 26.6s |

**Truck (50 px/s):**

| Distancia | Tiempo Ida | Tiempo Vuelta | Tiempo Total |
|-----------|------------|---------------|--------------|
| 200px | 4.0s | 4.0s | 8.0s |
| 400px | 8.0s | 8.0s | 16.0s |
| 600px | 12.0s | 12.0s | 24.0s |
| 800px | 16.0s | 16.0s | 32.0s |

**Truck con Sabotaje (25 px/s):**

| Distancia | Tiempo Ida | Tiempo Vuelta | Tiempo Total |
|-----------|------------|---------------|--------------|
| 200px | 8.0s | 8.0s | 16.0s |
| 400px | 16.0s | 16.0s | 32.0s |
| 600px | 24.0s | 24.0s | 48.0s |
| 800px | 32.0s | 32.0s | 64.0s |

**Tren (55 px/s, solo ida):**

| Distancia | Tiempo de Viaje |
|-----------|-----------------|
| 200px | 3.6s |
| 400px | 7.3s |
| 600px | 10.9s |
| 800px | 14.5s |

### Tiempos de Viaje de Proyectiles

**Dron (300 px/s):**

| Distancia | Tiempo de Viaje |
|-----------|-----------------|
| 400px | 1.3s |
| 800px | 2.7s |
| 1200px | 4.0s |
| 1600px | 5.3s |

**Tanque (125 px/s):**

| Distancia | Tiempo de Viaje | Tiempo Espera | Tiempo Disparo | Tiempo Total |
|-----------|-----------------|---------------|----------------|--------------|
| 400px | 3.2s | 1.0s | 0.35s | 4.55s |
| 800px | 6.4s | 1.0s | 0.35s | 7.75s |
| 1200px | 9.6s | 1.0s | 0.35s | 10.95s |
| 1600px | 12.8s | 1.0s | 0.35s | 14.15s |

---

## Duración de Efectos Temporales

### Efecto "Herido" (Wounded)

| Propiedad | Valor |
|-----------|-------|
| Duración | 15 segundos |
| Aplicación | Instantánea |
| Efecto | Duplica consumo de suministros |
| Fuente | Sniper strike o emergencia médica |

**Impacto Temporal:**
- Con 50 supplies: Reduce duración de 31.25s a 15.625s
- Con 100 supplies: Reduce duración de 62.5s a 31.25s
- **Reducción:** ~50% del tiempo de duración

### Efecto "Sabotaje FOB"

| Propiedad | Valor |
|-----------|-------|
| Duración | 3 camiones |
| Aplicación | Instantánea |
| Efecto | -50% velocidad en convoyes |
| Fuente | Sabotaje FOB consumible |

**Impacto Temporal:**
- Depende de la frecuencia de convoyes
- Si hay convoy cada 20s: Duración = 60 segundos
- Si hay convoy cada 10s: Duración = 30 segundos

### Efecto "Deshabilitado" (Comando)

| Propiedad | Valor |
|-----------|-------|
| Duración activa | 10 segundos |
| Duración residual | 3 segundos |
| Duración total | 13 segundos |
| Aplicación | Instantánea al desplegar comando |

**Impacto Temporal:**
- Los edificios quedan deshabilitados por 10s mientras el comando está activo
- Después de eliminar el comando, permanecen deshabilitados 3s adicionales
- **Total:** 13 segundos de deshabilitación

---

## Tiempos de Cooldown

### Cooldown de Anti-Dron

| Propiedad | Valor |
|-----------|-------|
| Cooldown | 3000ms (3 segundos) |
| Aplicación | Después de interceptar un dron |
| Efecto | El Anti-Dron se autodestruye (solo 1 uso) |

**Nota:** El Anti-Dron no tiene cooldown real, se destruye al usar.

### Cooldown de Sonido de Sniper

| Propiedad | Valor |
|-----------|-------|
| Cooldown | 7 segundos |
| Aplicación | Entre reproducciones del sonido "spotted" |
| Efecto | Previene spam de sonidos |

**Nota:** No afecta el uso del sniper, solo el sonido.

### Cooldown de Sonidos Ambientales

| Sonido | Intervalo |
|--------|-----------|
| Clear Shoots | 60 segundos |
| Radio Effect | 50 segundos |

---

## Intervalos Automáticos

### Sistema de Trenes

| Propiedad | Valor |
|-----------|-------|
| Intervalo entre trenes | 12 segundos |
| Aplicación | Automática por estación |
| Efecto | Envía tren a cada FOB cada 12s |

**Análisis:**
- Cada estación envía trenes independientemente
- Múltiples estaciones = múltiples trenes simultáneos
- Intervalo fijo, no acumulativo

### Sistema de Sonidos

| Sonido | Intervalo |
|--------|-----------|
| Clear Shoots | 60 segundos |
| Radio Effect | 50 segundos |

**Mecánica:**
- Se reproducen automáticamente cada X segundos
- No requieren acción del jugador
- Añaden ambiente al juego

---

## Tiempos de Abandono

### Tiempos de Abandono por Defecto

| Fase | Duración | Descripción |
|------|----------|-------------|
| Fase 1 (Gris claro) | 2000ms (2s) | Primera fase visual |
| Fase 2 (Gris oscuro) | 3000ms (3s) | Segunda fase visual |
| Total | 5000ms (5s) | Tiempo total de abandono |

### Tiempos Específicos

**Intel Radio:**
- Fase 1: 500ms (0.5s)
- Fase 2: 500ms (0.5s)
- Total: 1000ms (1s)

**Razón:** Se abandona automáticamente después de completar inversión, necesita ser rápido.

### Tiempo de Gracia por Territorio

| Propiedad | Valor |
|-----------|-------|
| Tiempo de gracia | 3 segundos |
| Aplicación | Edificios fuera del territorio |
| Efecto | Permite tiempo para volver al territorio |

**Mecánica:**
- Los edificios tienen 3 segundos de gracia antes de comenzar abandono
- Si vuelven al territorio antes de 3s, no se abandonan
- Si pasan 3s fuera, comienzan el proceso de abandono

---

## Tiempos de Inversión

### Radio de Inteligencia

| Propiedad | Valor |
|-----------|-------|
| Tiempo de inversión | 20 segundos |
| Retorno total | 95 currency (70 + 25) |
| Beneficio neto | +25 currency |
| ROI | 35.7% |

**Análisis Temporal:**
- Debe permanecer en territorio propio por 20 segundos
- Después de 20s, se consume y devuelve currency
- Tiempo de abandono rápido (1 segundo total)

**Ventana de Oportunidad:**
- El enemigo tiene 20 segundos para destruir el Radio antes del retorno
- Si se destruye antes de 20s, hay pérdida económica
- Si dura 20s, hay ganancia económica

---

## Análisis de Ventanas de Oportunidad

### Ventana de Construcción

**Tiempo vulnerable durante construcción:**
- Edificios rápidos (2s): Ventana pequeña
- Edificios lentos (4s): Ventana grande

**Estrategia:**
- Construir edificios importantes cuando el enemigo está ocupado
- Usar edificios rápidos para construcción segura
- Proteger edificios lentos durante construcción

### Ventana de Efectos Temporales

**Efecto "Herido" (15s):**
- Ventana para presionar el frente enemigo
- El enemigo consume suministros el doble de rápido
- Oportunidad para avanzar territorialmente

**Efecto "Deshabilitado" (13s total):**
- Ventana para atacar sin defensas enemigas
- Los edificios no funcionan durante este tiempo
- Oportunidad para destruir infraestructura crítica

**Efecto "Sabotaje" (variable):**
- Ventana para ralentizar logística enemiga
- Depende de la frecuencia de convoyes
- Oportunidad para ganar ventaja logística

### Ventana de Inversión

**Radio de Inteligencia (20s):**
- Ventana para el enemigo de destruir antes del retorno
- Si se protege por 20s, hay ganancia económica
- Balance entre riesgo y recompensa

### Ventana de Abandono

**Abandono por territorio (5s total):**
- Ventana para recuperar edificios antes de perderlos
- Si el territorio avanza, los edificios se salvan
- Si el territorio retrocede, los edificios se pierden

---

## Tiempos de Ciclo Económico

### Ciclo de Construcción → Retorno

**Planta Nuclear:**
- Tiempo de construcción: 4s
- Tiempo de recuperación: 100s (break even)
- **Ciclo total:** 104 segundos hasta break even

**Radio de Inteligencia:**
- Tiempo de construcción: 2s
- Tiempo de inversión: 20s
- Tiempo de abandono: 1s
- **Ciclo total:** 23 segundos hasta retorno

**Estación de Tren:**
- Tiempo de construcción: 4s
- Primer tren: 12s después de construcción
- **Ciclo total:** 16 segundos hasta primer suministro

### Ciclo de Logística

**Heavy Truck (400px, sin bonus):**
- Tiempo de construcción Fábrica: 2s
- Tiempo de viaje: 20s (ida+vuelta)
- **Ciclo total:** 22 segundos desde construcción hasta primer suministro mejorado

**Con Centro de Ingenieros:**
- Tiempo de construcción Centro: 4s
- Tiempo de viaje mejorado: 13.3s (ida+vuelta)
- **Ciclo total:** 17.3 segundos desde construcción hasta velocidad mejorada

### Ciclo de Ofensiva

**Dron:**
- Tiempo de construcción Lanzadera: 2s
- Tiempo de viaje dron (800px): 2.7s
- **Ciclo total:** 4.7 segundos desde construcción hasta impacto

**Tanque:**
- Tiempo de viaje (800px): 7.75s total
- **Ciclo total:** 7.75 segundos desde lanzamiento hasta impacto

**Sniper:**
- Aplicación: Instantánea
- Duración del efecto: 15s
- **Ciclo total:** 15 segundos de efecto activo

---

## Comparación de Tiempos Críticos

### Tiempos Más Rápidos

| Acción | Tiempo Total |
|--------|--------------|
| Construcción rápida | 2s |
| Dron (corto) | ~1.3s |
| Abandono Intel Radio | 1s |
| Tren (corto) | ~3.6s |

### Tiempos Más Lentos

| Acción | Tiempo Total |
|--------|--------------|
| Construcción lenta | 4s |
| Tanque (largo) | ~14.15s |
| Heavy Truck (largo, sin bonus) | 40s |
| Recuperación Planta Nuclear | 100s |

### Tiempos Promedio

| Categoría | Tiempo Promedio |
|-----------|-----------------|
| Construcción | 3s |
| Viaje convoy (400px) | 20s |
| Efecto temporal | 10-15s |
| Ciclo económico | 20-100s |

---

## Notas para Balanceo

### Puntos Clave a Considerar

1. **Tiempos de Construcción:**
   - ¿2-4 segundos es apropiado?
   - ¿Los edificios caros deberían tardar más en construirse?
   - ¿Hay suficiente diferencia entre rápido y lento?

2. **Tiempos de Viaje:**
   - ¿Las velocidades de convoyes son balanceadas?
   - ¿El bonus del Centro de Ingenieros es suficiente?
   - ¿La penalización de sabotaje es demasiado fuerte?

3. **Duración de Efectos:**
   - ¿15 segundos de "herido" es apropiado?
   - ¿13 segundos de deshabilitación es suficiente?
   - ¿Los efectos duran demasiado o poco?

4. **Ventanas de Oportunidad:**
   - ¿Hay suficientes ventanas para contraatacar?
   - ¿Las ventanas son demasiado cortas o largas?
   - ¿Los jugadores pueden reaccionar a tiempo?

5. **Ciclos Económicos:**
   - ¿Los tiempos de recuperación son apropiados?
   - ¿Hay suficiente tiempo para que las inversiones valgan la pena?
   - ¿Los ciclos son demasiado rápidos o lentos?

### Métricas Sugeridas para Análisis

- **Tiempo promedio de construcción:** ¿Cuánto tiempo pasan los jugadores construyendo?
- **Tiempo promedio de viaje:** ¿Cuánto tardan los convoyes en promedio?
- **Duración promedio de efectos:** ¿Cuánto duran los efectos en promedio?
- **Ventanas de oportunidad utilizadas:** ¿Qué porcentaje de ventanas se aprovechan?
- **Tiempo hasta primera acción:** ¿Cuánto tarda un jugador en hacer su primera acción significativa?

### Puntos de Balance Críticos

1. **Construcción vs Destrucción:**
   - Construcción: 2-4 segundos
   - Destrucción: Instantánea (dron/tanque)
   - ¿Es balanceado que la destrucción sea más rápida?

2. **Efectos Temporales:**
   - Sniper: 15 segundos
   - Comando: 13 segundos total
   - ¿Son suficientes para tener impacto estratégico?

3. **Tiempos de Inversión:**
   - Radio: 20 segundos
   - Planta: 100 segundos
   - ¿La diferencia es apropiada?

4. **Velocidades de Convoyes:**
   - Base: 40-50 px/s
   - Con bonus: 60 px/s
   - Con penalización: 25 px/s
   - ¿Las diferencias son demasiado extremas?

---

**Última actualización:** Basado en código del servidor
**Archivos fuente:**
- `server/config/serverNodes.js`
- `server/config/gameConfig.js`
- `server/systems/AbandonmentSystem.js`
- `server/game/managers/ConvoyMovementManager.js`
- `server/systems/TankSystemServer.js`
- `server/systems/DroneSystemServer.js`
- `server/systems/TrainSystemServer.js`

