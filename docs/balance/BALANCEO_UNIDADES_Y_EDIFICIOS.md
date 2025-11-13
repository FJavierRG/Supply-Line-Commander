# Documentación de Balanceo: Unidades y Edificios

## Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Tabla Comparativa General](#tabla-comparativa-general)
3. [Nodos Base del Mapa](#nodos-base-del-mapa)
4. [Edificios Construibles](#edificios-construibles)
5. [Consumibles y Proyectiles](#consumibles-y-proyectiles)
6. [Análisis de Costo-Eficiencia](#análisis-de-costo-eficiencia)
7. [Restricciones y Limitaciones](#restricciones-y-limitaciones)

---

## Resumen Ejecutivo

Este documento contiene todas las estadísticas numéricas de unidades y edificios del juego para análisis de balanceo. Los valores están definidos en el servidor como autoridad única (anti-hack), lo que garantiza que estos números son los que realmente se usan en el juego.

**Sistema de Costos:**
- Los costos se miden en "currency" 
- Generación pasiva base: 3 currency/segundo
- Generación por pixel conquistado: 1 currency
- Currency inicial: 30

**Sistema de Construcción:**
- Todos los edificios requieren construcción excepto HQ y 2 Fronts iniciales (ya construidos al inicio)
- Los tiempos de construcción varían entre 2-4 segundos
- Los edificios solo pueden construirse dentro del territorio propio del jugador (a excepción de alguno)

**Sistema de Mazos:**
- Los jugadores construyen mazos con un límite de 700 puntos
- El costo de cada unidad cuenta para el límite del mazo (excepto HQ que siempre está incluido y los dos FOBs iniciales)
- Solo las unidades en el mazo pueden construirse durante la partida

---

## Tabla Comparativa General

### Edificios Construibles

| Edificio | Costo | Tiempo Construcción | Radio Visual | Radio Construcción | Estado |
|----------|-------|---------------------|--------------|-------------------|--------|
| FOB | 120 | 4s | 40px | 140px | ✅ Habilitado |
| Anti-Dron | 115 | 4s | 30px | 120px | ✅ Habilitado |
| Lanzadera de Drones | 100 | 2s | 30px | 120px | ✅ Habilitado |
| Planta Nuclear | 200 | 4s | 40px | 140px | ✅ Habilitado |
| Fábrica de Camiones | 100 | 2s | 35px | 130px | ✅ Habilitado |
| Centro de Ingenieros | 120 | 4s | 35px | 130px | ✅ Habilitado |
| Radio de Inteligencia | 70 | 2s | 30px | 120px | ✅ Habilitado |
| Centro de Inteligencia | 150 | 3s | 35px | 130px | ✅ Habilitado |
| Estación de Tren | 170 | 4s | 40px | 130px | ✅ Habilitado |
| Base Aérea | 150 | 3s | 40px | 130px | ❌ Deshabilitado |
| Hospital de Campaña | 60 | 2s | 35px | 130px | ❌ Deshabilitado |
| Torre de Vigilancia | 120 | 3s | 35px | 130px | ❌ Deshabilitado |
| Red de Navajas | - | - | 25px | 100px | ❌ Deshabilitado |
| Nido de Máquinas | - | - | 30px | 120px | ❌ Deshabilitado |

### Consumibles y Proyectiles

| Unidad | Costo | Duración/Efecto | Radio Visual | Estado |
|--------|-------|-----------------|--------------|--------|
| Dron Bomba | 150 | Destruye edificio | 0px | ✅ Habilitado |
| Ataque de Francotirador | 40 | 15s efecto "herido" | 0px | ✅ Habilitado |
| Sabotaje FOB | 40 | 3 camiones -50% velocidad | 0px | ✅ Habilitado |
| Comando Especial | 70 | 10s deshabilita edificios | 25px | ✅ Habilitado |
| Tanque | 100 | Destruye edificio | 0px | ✅ Habilitado |

---

## Nodos Base del Mapa

### HQ (Cuartel General)
- **Tipo:** Nodo base (no construible)
- **Costo:** 0 (siempre presente)
- **Construcción:** Ya construido al inicio
- **Destruible:** No
- **Capacidades:**
  - Vehículos máximos: 4
  - Ambulancias máximas: 1
  - Suministros: Ilimitados
- **Función:** Base principal que gestiona recursos, vehículos y ambulancias
- **Suministros iniciales:** 100
- **Vehículos iniciales:** 4 disponibles

### FOB (Base de Operaciones Avanzada)
- **Tipo:** Nodo base/construible
- **Costo:** 120 currency
- **Tiempo de construcción:** 4 segundos
- **Radio visual:** 40px
- **Radio de construcción:** 140px (distancia mínima de otros edificios)
- **Capacidades:**
  - Suministros máximos: 100
  - Vehículos máximos: 2
- **Suministros iniciales:** 30 (si se construye) / 40 (si es inicial)
- **Vehículos iniciales:** 2
- **Función:** Base avanzada que almacena suministros y permite enviarlos al frente

### Front (Frente)
- **Tipo:** Nodo base (no construible)
- **Costo:** 0 (siempre presente)
- **Construcción:** Ya construido al inicio
- **Destruible:** Sí
- **Capacidades:**
  - Suministros máximos: 100
  - Helicópteros máximos: 1
- **Suministros iniciales:** 50
- **Consumo de suministros:** 1.6 supplies/segundo
- **Velocidad de avance:** 4 px/s (con suministros)
- **Velocidad de retroceso:** 4 px/s (sin suministros)
- **Función:** Nodo de avance en el frente. Consume suministros para empujar.

---

## Edificios Construibles

### Anti-Dron
- **Costo:** 115 currency
- **Tiempo de construcción:** 4 segundos
- **Radio visual:** 30px
- **Radio de construcción:** 120px
- **Rangos:**
  - Rango de detección: 160px
  - Rango de alerta: 220px
- **Cooldown:** 3000ms (3 segundos)
- **Función:** Sistema de defensa que intercepta drones enemigos. Solo tiene un proyectil (se autodestruye al interceptar).
- **Mecánica:** Intercepta drones que entren en rango de 160px. Emite alerta a 220px.
- **Efecto:** Consumible (se destruye al usar)

### Lanzadera de Drones
- **Costo:** 100 currency
- **Tiempo de construcción:** 2 segundos
- **Radio visual:** 30px
- **Radio de construcción:** 120px
- **Función:** Desbloquea el uso de drones bomba en la tienda.
- **Requisito:** Necesario para lanzar drones

### Planta Nuclear
- **Costo:** 200 currency
- **Tiempo de construcción:** 4 segundos
- **Radio visual:** 40px
- **Radio de construcción:** 140px
- **Efecto pasivo:** +2 currency/segundo por planta
- **Función:** Genera currency pasiva adicional por segundo.
- **Análisis económico:** 
  - Retorno de inversión: 100 segundos (1 minuto 40 segundos)
  - Eficiencia: Alta si se mantiene viva durante toda la partida

### Fábrica de Camiones
- **Costo:** 100 currency
- **Tiempo de construcción:** 2 segundos
- **Radio visual:** 35px
- **Radio de construcción:** 130px
- **Efectos:**
  - +1 vehículo al HQ (máximo aumenta de 4 a 5)
  - +15 capacidad para heavy_trucks (de 15 a 30)
- **Función:** Aumenta la capacidad de carga de los camiones pesados y añade un vehículo adicional al HQ.

### Centro de Ingenieros
- **Costo:** 120 currency
- **Tiempo de construcción:** 4 segundos
- **Radio visual:** 35px
- **Radio de construcción:** 130px
- **Efecto:** +50% velocidad para heavy_truck (multiplicador 1.5x)
- **Vehículos afectados:** Solo heavy_truck
- **Función:** Pavimenta el camino del HQ a los FOBs, aumentando la velocidad de los convoyes pesados.

### Radio de Inteligencia
- **Costo:** 70 currency
- **Tiempo de construcción:** 2 segundos
- **Radio visual:** 30px
- **Radio de construcción:** 120px
- **Mecánica de inversión:**
  - Tiempo de inversión: 20 segundos
  - Retorno total: 95 currency (70 costo + 25 beneficio)
  - Beneficio neto: +25 currency
- **Función:** Pasado un tiempo en tu lado del campo de batalla se consume y devuelve su coste más un beneficio.
- **Tiempo de abandono:** 1 segundo total (0.5s fase 1 + 0.5s fase 2)

### Centro de Inteligencia
- **Costo:** 150 currency
- **Tiempo de construcción:** 3 segundos
- **Radio visual:** 35px
- **Radio de construcción:** 130px
- **Función:** Desbloquea el comando en la tienda.
- **Requisito:** Necesario para desplegar comandos especiales

### Estación de Tren
- **Costo:** 170 currency
- **Tiempo de construcción:** 4 segundos
- **Radio visual:** 40px
- **Radio de construcción:** 130px
- **Efectos:**
  - Intervalo entre trenes: 12 segundos
  - Velocidad del tren: 55 px/s
  - Carga por tren: 25 suministros
- **Función:** Envía trenes automáticamente con suministros a los FOBs de forma periódica.
- **Análisis de eficiencia:**
  - Suministros por segundo: ~2.08 supplies/s (25 cada 12s)
  - Retorno de inversión: ~82 segundos (asumiendo que el tren llega instantáneamente)

### Base Aérea (Deshabilitada)
- **Costo:** 150 currency
- **Tiempo de construcción:** 3 segundos
- **Radio visual:** 40px
- **Radio de construcción:** 130px
- **Capacidades:**
  - Suministros máximos: 200
- **Efecto:** Se autodestruye cuando supplies llega a 0
- **Estado:** ❌ Deshabilitado en el juego actual
- **Función:** Permite el despliegue y recarga de helicópteros.

### Hospital de Campaña (Deshabilitado)
- **Costo:** 60 currency
- **Tiempo de construcción:** 2 segundos
- **Radio visual:** 35px
- **Radio de construcción:** 130px
- **Rango de acción:** 240px (según ranges) / 260px (según gameplay.actionRange)
- **Capacidades:**
  - Vehículos máximos: 1 (ambulancias)
- **Estado:** ❌ Deshabilitado en el juego actual
- **Función:** Permite enviar ambulancias para evacuar heridos del frente.

### Torre de Vigilancia (Deshabilitada)
- **Costo:** 120 currency
- **Tiempo de construcción:** 3 segundos
- **Radio visual:** 35px
- **Radio de construcción:** 130px
- **Radio de detección:** 320px
- **Función:** Impide la aparición de comandos y sabotajes enemigos en su área.
- **Mecánica especial:** Elimina comandos enemigos dentro del área al construirse
- **Estado:** ❌ Deshabilitado en el juego actual

### Red de Navajas (Deshabilitada)
- **Radio visual:** 25px
- **Radio de construcción:** 100px
- **Estado:** ❌ Deshabilitado en el juego actual
- **Función:** Sistema defensivo que ralentiza y daña unidades enemigas que pasan por su área.

### Nido de Máquinas (Deshabilitado)
- **Radio visual:** 30px
- **Radio de construcción:** 120px
- **Estado:** ❌ Deshabilitado en el juego actual
- **Función:** Sistema defensivo automático que ataca unidades enemigas cercanas.

---

## Consumibles y Proyectiles

### Dron Bomba
- **Costo:** 150 currency
- **Velocidad:** 300 px/s
- **Requisito:** Necesita tener una Lanzadera de Drones construida
- **Objetivos válidos:** FOB, Planta Nuclear, Anti-Dron, Hospital de Campaña, Lanzadera de Drones, Fábrica de Camiones, Centro de Ingenieros, Radio de Inteligencia, Centro de Inteligencia, Base Aérea, Estación de Tren
- **Objetivos NO válidos:** HQ, Front
- **Mecánica:** Puede ser interceptado por Anti-Drones en rango de 160px
- **Función:** Destruye un objetivo enemigo. Puede ser interceptado por Anti-Drones.

### Ataque de Francotirador
- **Costo:** 40 currency
- **Duración del efecto:** 15 segundos
- **Objetivos válidos:** Front enemigo, Comando Especial enemigo
- **Efecto en Front:** Aplica efecto "herido" que duplica el consumo de suministros (de 1.6 a 3.2 supplies/s)
- **Efecto en Comando:** Elimina el comando inmediatamente
- **Cooldown de sonido:** 7 segundos
- **Función:** Aplica efecto "herido" a un frente enemigo o elimina un comando enemigo.

### Sabotaje FOB
- **Costo:** 40 currency
- **Objetivo:** Solo FOBs enemigas
- **Efecto:** 
  - Penalización de velocidad: 50% (multiplicador 0.5x)
  - Duración: Afecta a los siguientes 3 camiones que salgan del FOB
- **Restricción:** No funciona si el FOB está protegido por una Torre de Vigilancia enemiga
- **Función:** Ralentiza los convoyes que salen de un FOB enemigo durante un tiempo.

### Comando Especial Operativo
- **Costo:** 70 currency
- **Requisito:** Necesita tener un Centro de Inteligencia construido
- **Radio físico:** 25px
- **Radio de efecto:** 200px
- **Vida:** 50 HP
- **Duración:** 10 segundos (expira automáticamente)
- **Efecto residual:** 3 segundos adicionales de deshabilitación después de eliminar el comando
- **Función:** Despliega un comando que deshabilita los edificios enemigos dentro de su área de efecto.
- **Restricciones:**
  - Solo puede desplegarse en territorio enemigo
  - No puede desplegarse cerca de Torres de Vigilancia enemigas (rango 320px)
  - Ignora límites de detección normales

### Tanque
- **Costo:** 100 currency
- **Velocidad:** 125 px/s
- **Tiempo de espera antes de disparar:** 1.0 segundo
- **Duración de animación de disparo:** 0.35 segundos
- **Objetivos válidos:** Planta Nuclear, Anti-Dron, Hospital de Campaña, Lanzadera de Drones, Fábrica de Camiones, Centro de Ingenieros, Radio de Inteligencia, Centro de Inteligencia, Base Aérea, Torre de Vigilancia, Estación de Tren
- **Objetivos NO válidos:** FOB, HQ, Front
- **Función:** Unidad blindada que destruye edificios enemigos. No puede atacar FOBs ni HQs.

---

## Análisis de Costo-Eficiencia

### Edificios Económicos

**Planta Nuclear:**
- Costo: 200
- Retorno: +2 currency/s
- Tiempo de recuperación: 100 segundos (1m 40s)

**Radio de Inteligencia:**
- Costo: 70
- Retorno: 95 (70 + 25 beneficio)
- Tiempo de recuperación: 20 segundos
- Beneficio neto: +25 currency

**Estación de Tren:**
- Costo: 170
- Retorno: ~2.08 supplies/s (25 cada 12s)

### Edificios de Infraestructura

**Fábrica de Camiones:**
- Costo: 100
- Efecto inmediato: +1 vehículo, +15 capacidad

**Centro de Ingenieros:**
- Costo: 120
- Efecto: +50% velocidad heavy_truck

### Edificios Defensivos

**Anti-Dron:**
- Costo: 115
- Efecto: Intercepta 1 dron (150 currency del enemigo)

**Torre de Vigilancia:**
- Costo: 120
- Efecto: Protege área de 320px contra comandos y sabotajes

### Consumibles

**Ataque de Francotirador:**
- Costo: 40
- Efecto: Duplica consumo de front por 15s y puede eliminar comandos

**Sabotaje FOB:**
- Costo: 40
- Efecto: Ralentiza 3 camiones siguientes de un fob enemigo

**Dron Bomba:**
- Costo: 150
- Efecto: Destruye edificio

**Tanque:**
- Costo: 100
- Efecto: Destruye edificio 

**Comando Especial:**
- Costo: 70
- Efecto: Deshabilita edificios por 10s

---

## Restricciones y Limitaciones

### Restricciones de Construcción

1. **Territorio:** Todos los edificios solo pueden construirse dentro del territorio propio
2. **Proximidad:** Cada edificio tiene un radio de construcción que previene stacking
3. **Mazo:** Solo se pueden construir edificios que estén en el mazo del jugador
4. **Currency:** Se requiere tener suficiente currency para construir

### Restricciones de Destrucción

1. **HQ:** No puede ser destruido (indestructible)
2. **Front:** Puede ser destruido pero se regenera automáticamente
3. **Edificios:** Todos los demás edificios pueden ser destruidos

### Restricciones de Uso

1. **Drones:** Requieren Lanzadera de Drones construida
2. **Comandos:** Requieren Centro de Inteligencia construido
3. **Anti-Drones:** Solo tienen 1 proyectil (se autodestruyen al usar)
4. **Torre de Vigilancia:** Protege contra comandos y sabotajes en rango de 320px

### Limitaciones de Capacidad

1. **HQ:** Máximo 4 vehículos base (+1 con Fábrica de Camiones)
2. **FOB:** Máximo 100 suministros, 2 vehículos
3. **Front:** Máximo 100 suministros, 1 helicóptero
4. **Base Aérea:** Máximo 200 suministros (se autodestruye al agotarse)

---

## Notas para Balanceo

### Puntos Clave a Considerar

1. **Costo vs Tiempo de Construcción:** Los edificios más caros no siempre tienen tiempos de construcción proporcionales
2. **Efectos Pasivos:** La Planta Nuclear y Estación de Tren generan recursos pasivos que deben balancearse con su costo
3. **Consumibles:** Los consumibles tienen diferentes ratios de costo/efecto que deben evaluarse
4. **Sinergias:** Algunos edificios tienen sinergias claras (ej: Fábrica + Centro de Ingenieros)
5. **Contadores:** Existen relaciones de contador claras (Anti-Dron vs Dron, Torre vs Comando)

### Métricas Sugeridas para Análisis

- **Tiempo de recuperación de inversión:** ¿Cuánto tarda un edificio en pagarse?
- **Poder por punto:** ¿Cuánto poder aporta cada unidad por su costo en el mazo?
- **Ventana de oportunidad:** ¿Cuándo es óptimo construir cada edificio?
- **Eficiencia económica:** ¿Qué edificios generan más recursos por costo?

---

**Última actualización:** Basado en código del servidor (server/config/serverNodes.js)
**Versión del juego:** Sistema de mazos (límite 700 puntos)

