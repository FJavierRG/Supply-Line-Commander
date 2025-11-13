# Documentación de Balanceo: Sistema de Logística

## Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Sistema de Vehículos](#sistema-de-vehículos)
3. [Velocidades de Vehículos](#velocidades-de-vehículos)
4. [Rutas y Restricciones](#rutas-y-restricciones)
5. [Capacidades de Carga](#capacidades-de-carga)
6. [Bonificaciones y Penalizaciones](#bonificaciones-y-penalizaciones)
7. [Sistema de Trenes](#sistema-de-trenes)
8. [Tiempos de Viaje](#tiempos-de-viaje)
9. [Análisis de Eficiencia Logística](#análisis-de-eficiencia-logística)

---

## Resumen Ejecutivo

El sistema de logística es fundamental para mantener los frentes avanzando. Los jugadores deben transportar suministros desde el HQ hasta los frentes, pasando por FOBs intermedios. El sistema incluye diferentes tipos de vehículos, rutas específicas, bonificaciones y penalizaciones que afectan la velocidad y capacidad de transporte.

**Características Clave:**
- Sistema de rutas jerárquico: HQ → FOB → Front
- Diferentes tipos de vehículos con velocidades y capacidades distintas
- Bonificaciones de edificios que mejoran velocidad y capacidad
- Penalizaciones que ralentizan convoyes
- Sistema automático de trenes para suministros pasivos

---

## Sistema de Vehículos

### Tipos de Vehículos

| Vehículo | Origen | Destino | Capacidad Base | Velocidad Base |
|----------|--------|---------|----------------|----------------|
| Heavy Truck | HQ | FOB | 15 | 40 px/s |
| Truck | FOB | Front | 20 | 50 px/s |
| Ambulancia | HQ/Hospital | Front | 0 | 60 px/s |
| Helicóptero | HQ/Front | Front/HQ | 100 | 80 px/s |

### Disponibilidad de Vehículos

**HQ (Cuartel General):**
- Vehículos iniciales: 4 heavy_trucks
- Máximo de vehículos: 4 (+1 por cada Fábrica de Camiones)
- Ambulancias: 1 (sistema médico)

**FOB (Base de Operaciones Avanzada):**
- Vehículos iniciales: 2 trucks
- Máximo de vehículos: 2

**Front (Frente):**
- Helicópteros máximos: 1

**Hospital de Campaña:**
- Vehículos máximos: 1 (ambulancia)

---

## Velocidades de Vehículos

### Velocidades Base

| Vehículo | Velocidad Base | Comparación |
|----------|----------------|-------------|
| Heavy Truck | 40 px/s | Base (100%) |
| Truck | 50 px/s | +25% más rápido |
| Ambulancia | 60 px/s | +50% más rápido |
| Helicóptero | 80 px/s | +100% más rápido |

### Comparación de Velocidades

**Relación de velocidades:**
- Helicóptero: 2x más rápido que Heavy Truck
- Ambulancia: 1.5x más rápido que Heavy Truck
- Truck: 1.25x más rápido que Heavy Truck

### Velocidad en Ida y Vuelta

**Importante:** Las velocidades son **iguales** para ida y vuelta. Los vehículos mantienen la misma velocidad al regresar al origen.

---

## Rutas y Restricciones

### Rutas Válidas

**Sistema Tradicional (A_Nation):**

| Origen | Destinos Válidos |
|--------|------------------|
| HQ | FOB |
| FOB | Front, FOB |
| Front | (ninguno - solo recibe) |

**Restricciones:**
- Los frentes **NO pueden enviar** convoyes (solo reciben)
- Los convoyes deben seguir la jerarquía: HQ → FOB → Front
- No se puede saltar niveles (ej: HQ → Front directamente)

### Validaciones de Rutas

**Antes de crear un convoy:**
1. Verificar que el origen tenga vehículos disponibles
2. Verificar que la ruta sea válida según el tipo de nodo origen
3. Verificar que ambos nodos sean del mismo equipo
4. Verificar que el origen tenga suministros suficientes (si aplica)
5. Verificar que el origen no esté deshabilitado

### Rutas Especiales

**Helicópteros:**
- Pueden volar desde HQ directamente a Fronts
- Pueden volar desde Fronts de vuelta al HQ
- No siguen las rutas tradicionales de camiones

**Ambulancias:**
- Pueden ir desde HQ o Hospital de Campaña a Fronts
- Solo se usan para emergencias médicas
- No transportan suministros

---

## Capacidades de Carga

### Capacidades Base

| Vehículo | Capacidad Base | Con Bonus |
|----------|----------------|-----------|
| Heavy Truck | 15 | 30 (con Fábrica) |
| Truck | 20 | 20 (sin bonus) |
| Helicóptero | 100 | 100 |
| Ambulancia | 0 | 0 |
| Tren | 25 | 25 |

### Sistema de Carga

**Heavy Truck (HQ → FOB):**
- Capacidad base: 15 supplies
- Bonus de Fábrica de Camiones: +15 por cada fábrica
- Capacidad máxima: 15 + (N × 15), donde N = número de fábricas
- El HQ no tiene suministros variables - los heavy_trucks salen "llenos por defecto"

**Truck (FOB → Front):**
- Capacidad base: 20 supplies
- Sin bonificaciones disponibles
- Carga desde los suministros del FOB

**Helicóptero:**
- Capacidad total: 100 supplies
- Entrega: 50 supplies por viaje a frentes
- Carga en HQ o Base Aérea

**Tren:**
- Capacidad: 25 supplies por tren
- Automático (no requiere acción del jugador)
- Entrega a FOBs

### Cálculo de Carga

**Para Heavy Trucks:**
```
Capacidad = 15 + (N × 15)
Donde N = número de Fábricas de Camiones activas y no deshabilitadas
```

**Ejemplo:**
- Sin fábricas: 15 supplies
- Con 1 fábrica: 30 supplies
- Con 2 fábricas: 45 supplies
- Con 3 fábricas: 60 supplies

**Restricciones:**
- Las fábricas deshabilitadas NO aplican bonus
- Las fábricas en construcción NO aplican bonus
- Las fábricas abandonando NO aplican bonus

---

## Bonificaciones y Penalizaciones

### Bonificaciones de Velocidad

#### Centro de Ingenieros

| Propiedad | Valor |
|-----------|-------|
| Multiplicador | 1.5x (+50%) |
| Vehículos afectados | Solo heavy_truck |
| Requisito | Centro construido y no deshabilitado |

**Efecto:**
- Heavy Trucks: 40 px/s → 60 px/s (+50%)
- Otros vehículos: Sin efecto

**Mecánica:**
- Se aplica automáticamente si existe al menos un Centro de Ingenieros activo
- No requiere que el convoy pase cerca del centro
- Se aplica tanto en ida como en vuelta

**Ejemplo de velocidad con bonus:**
- Heavy Truck base: 40 px/s
- Con Centro de Ingenieros: 60 px/s
- Mejora: +20 px/s (+50%)

### Penalizaciones de Velocidad

#### Sabotaje FOB

| Propiedad | Valor |
|-----------|-------|
| Multiplicador | 0.5x (-50%) |
| Duración | Afecta a los siguientes 3 camiones |
| Aplicación | Tanto en ida como en vuelta |

**Mecánica:**
1. Se aplica a una FOB específica
2. Los siguientes 3 camiones que salgan de esa FOB tienen -50% velocidad
3. La penalización se mantiene durante todo el viaje (ida y vuelta)
4. Cada camión consume 1 uso del efecto

**Ejemplo de velocidad con penalización:**
- Truck base: 50 px/s
- Con sabotaje: 25 px/s (-50%)
- Reducción: -25 px/s (-50%)

**Restricciones:**
- No funciona si el FOB está protegido por una Torre de Vigilancia enemiga (rango 320px)
- Solo afecta a camiones (no a helicópteros ni ambulancias)

#### Penalización de Acoso (Harassment)

| Propiedad | Valor |
|-----------|-------|
| Multiplicador | 0.7x (-30%) |
| Estado | Configurado pero no implementado actualmente |

**Nota:** Esta penalización está en la configuración pero no se usa en el juego actual.

### Combinación de Bonificaciones y Penalizaciones

**Orden de aplicación:**
1. Velocidad base del vehículo
2. Penalización de sabotaje (si aplica)
3. Bonus de Centro de Ingenieros (si aplica)

**Ejemplo combinado:**
- Heavy Truck base: 40 px/s
- Con sabotaje: 20 px/s (40 × 0.5)
- Con Centro de Ingenieros: 30 px/s (20 × 1.5)

**Nota:** Las penalizaciones se aplican ANTES que los bonos, lo que reduce el impacto del bonus.

---

## Sistema de Trenes

### Configuración de Trenes

| Propiedad | Valor |
|-----------|-------|
| Intervalo entre trenes | 12 segundos |
| Velocidad del tren | 55 px/s |
| Suministros por tren | 25 supplies |
| Destino | Todos los FOBs del equipo |

### Mecánica de Trenes

**Funcionamiento:**
1. Cada Estación de Tren tiene un timer independiente
2. Cada 12 segundos, la estación envía un tren a cada FOB del equipo
3. Los trenes se mueven automáticamente hacia los FOBs
4. Al llegar, entregan 25 supplies al FOB
5. Los trenes NO regresan (se eliminan después de entregar)

**Ventajas:**
- Automático (no requiere acción del jugador)
- Consistente (siempre entrega cada 12s)
- No consume vehículos
- Entrega a múltiples FOBs simultáneamente

**Limitaciones:**
- Solo entrega a FOBs (no directamente a frentes)
- Requiere que los FOBs existan
- Costo inicial alto (170 currency)

### Eficiencia de Trenes

**Suministros por segundo:**
- 1 FOB: 25 supplies cada 12s = ~2.08 supplies/s
- 2 FOBs: 50 supplies cada 12s = ~4.16 supplies/s
- 3 FOBs: 75 supplies cada 12s = ~6.25 supplies/s

**Comparación con convoyes manuales:**
- Tren (1 FOB): ~2.08 supplies/s automático
- Heavy Truck manual: Variable según frecuencia de envío
- Truck manual: Variable según frecuencia de envío

---

## Tiempos de Viaje

### Cálculo de Tiempo de Viaje

**Fórmula:**
```
Tiempo = Distancia / Velocidad
```

**Ejemplo para Heavy Truck (sin bonus):**
- Distancia: 400px (HQ a FOB típico)
- Velocidad: 40 px/s
- Tiempo de ida: 400 / 40 = 10 segundos
- Tiempo de vuelta: 400 / 40 = 10 segundos
- Tiempo total: 20 segundos

### Tiempos Estimados por Distancia

**Heavy Truck (40 px/s):**

| Distancia | Tiempo Ida | Tiempo Total (ida+vuelta) |
|-----------|------------|----------------------------|
| 200px | 5s | 10s |
| 400px | 10s | 20s |
| 600px | 15s | 30s |
| 800px | 20s | 40s |

**Heavy Truck con Centro de Ingenieros (60 px/s):**

| Distancia | Tiempo Ida | Tiempo Total (ida+vuelta) |
|-----------|------------|----------------------------|
| 200px | 3.3s | 6.6s |
| 400px | 6.7s | 13.3s |
| 600px | 10s | 20s |
| 800px | 13.3s | 26.6s |

**Truck (50 px/s):**

| Distancia | Tiempo Ida | Tiempo Total (ida+vuelta) |
|-----------|------------|----------------------------|
| 200px | 4s | 8s |
| 400px | 8s | 16s |
| 600px | 12s | 24s |
| 800px | 16s | 32s |

**Truck con Sabotaje (25 px/s):**

| Distancia | Tiempo Ida | Tiempo Total (ida+vuelta) |
|-----------|------------|----------------------------|
| 200px | 8s | 16s |
| 400px | 16s | 32s |
| 600px | 24s | 48s |
| 800px | 32s | 64s |

### Tiempos de Trenes

**Tren (55 px/s):**

| Distancia | Tiempo de Viaje |
|-----------|-----------------|
| 200px | 3.6s |
| 400px | 7.3s |
| 600px | 10.9s |
| 800px | 14.5s |

**Nota:** Los trenes solo hacen viaje de ida (no regresan).

---

## Análisis de Eficiencia Logística

### Throughput por Vehículo

**Heavy Truck (sin bonus):**
- Capacidad: 15 supplies
- Tiempo total (400px): 20s (ida+vuelta)
- Throughput: 15 / 20 = 0.75 supplies/s

**Heavy Truck (con Fábrica, sin Centro):**
- Capacidad: 30 supplies
- Tiempo total (400px): 20s
- Throughput: 30 / 20 = 1.5 supplies/s

**Heavy Truck (con Fábrica y Centro):**
- Capacidad: 30 supplies
- Tiempo total (400px): 13.3s
- Throughput: 30 / 13.3 = 2.25 supplies/s

**Truck (sin penalización):**
- Capacidad: 20 supplies
- Tiempo total (400px): 16s
- Throughput: 20 / 16 = 1.25 supplies/s

**Truck (con sabotaje):**
- Capacidad: 20 supplies
- Tiempo total (400px): 32s
- Throughput: 20 / 32 = 0.625 supplies/s

**Tren (automático):**
- Capacidad: 25 supplies
- Intervalo: 12s
- Throughput: 25 / 12 = 2.08 supplies/s

### Comparación de Eficiencia

| Método | Throughput | Requiere Acción | Consume Vehículos |
|--------|------------|----------------|-------------------|
| Heavy Truck base | 0.75 supplies/s | Sí | Sí |
| Heavy Truck + Fábrica | 1.5 supplies/s | Sí | Sí |
| Heavy Truck + Fábrica + Centro | 2.25 supplies/s | Sí | Sí |
| Truck | 1.25 supplies/s | Sí | Sí |
| Truck + Sabotaje | 0.625 supplies/s | Sí | Sí |
| Tren (1 FOB) | 2.08 supplies/s | No | No |
| Tren (2 FOBs) | 4.16 supplies/s | No | No |

### Análisis de Edificios de Infraestructura

#### Fábrica de Camiones

**Inversión:** 100 currency
**Efecto:** +15 capacidad para heavy_trucks, +1 vehículo al HQ

**Mejora de throughput:**
- Sin fábrica: 0.75 supplies/s
- Con fábrica: 1.5 supplies/s
- Mejora: +100% throughput

**ROI:** ⭐⭐⭐⭐ (Mejora significativa de logística)

#### Centro de Ingenieros

**Inversión:** 120 currency
**Efecto:** +50% velocidad para heavy_trucks

**Mejora de throughput:**
- Sin centro: 1.5 supplies/s (con fábrica)
- Con centro: 2.25 supplies/s (con fábrica)
- Mejora: +50% throughput

**ROI:** ⭐⭐⭐⭐ (Mejora velocidad significativamente)

#### Estación de Tren

**Inversión:** 170 currency
**Efecto:** 25 supplies cada 12s por FOB

**Throughput:**
- 1 FOB: 2.08 supplies/s
- 2 FOBs: 4.16 supplies/s
- 3 FOBs: 6.25 supplies/s

**ROI:** ⭐⭐⭐⭐ (Excelente para suministros pasivos)

### Sinergias Logísticas

**Combinación Óptima:**
1. **Fábrica de Camiones** (+100% capacidad)
2. **Centro de Ingenieros** (+50% velocidad)
3. **Estación de Tren** (suministros pasivos)

**Throughput combinado:**
- Heavy Trucks mejorados: 2.25 supplies/s por convoy
- Trenes automáticos: 2.08+ supplies/s por FOB
- Total: Muy alto throughput logístico

---

## Estrategias Logísticas

### Estrategia Temprana

**Objetivos:**
- Establecer rutas básicas HQ → FOB → Front
- Mantener frentes abastecidos

**Recomendaciones:**
- Construir FOBs cerca de frentes para reducir distancia
- Enviar convoyes regularmente
- Priorizar frentes con menos suministros

### Estrategia Media

**Objetivos:**
- Mejorar eficiencia logística
- Reducir tiempo de viaje

**Recomendaciones:**
- Construir Fábrica de Camiones para aumentar capacidad
- Construir Centro de Ingenieros para aumentar velocidad
- Considerar Estación de Tren para suministros pasivos

### Estrategia Tardía

**Objetivos:**
- Maximizar throughput logístico
- Automatizar suministros

**Recomendaciones:**
- Múltiples Estaciones de Tren
- Proteger infraestructura logística (FOBs, edificios)
- Usar sabotaje enemigo para ralentizar logística enemiga

---

## Notas para Balanceo

### Puntos Clave a Considerar

1. **Velocidades de Vehículos:**
   - ¿Las diferencias de velocidad son apropiadas?
   - ¿El Heavy Truck es demasiado lento comparado con Truck?
   - ¿El bonus del Centro de Ingenieros es suficiente?

2. **Capacidades de Carga:**
   - ¿La capacidad base de 15 para Heavy Truck es adecuada?
   - ¿El bonus de +15 por fábrica es balanceado?
   - ¿La capacidad de 20 para Truck es apropiada?

3. **Sistema de Rutas:**
   - ¿La jerarquía HQ → FOB → Front es demasiado restrictiva?
   - ¿Debería permitirse HQ → Front directamente?
   - ¿Las rutas especiales (helicópteros) están balanceadas?

4. **Penalizaciones:**
   - ¿El sabotaje FOB (-50% velocidad) es demasiado fuerte?
   - ¿Afectar 3 camiones es apropiado?
   - ¿Debería haber más formas de ralentizar logística enemiga?

5. **Sistema de Trenes:**
   - ¿El intervalo de 12s es apropiado?
   - ¿25 supplies por tren es balanceado?
   - ¿El costo de 170 currency es justo?

### Métricas Sugeridas para Análisis

- **Tiempo promedio de viaje:** ¿Cuánto tardan los convoyes en promedio?
- **Throughput promedio:** ¿Cuántos supplies/s genera cada jugador?
- **Uso de bonificaciones:** ¿Qué porcentaje de jugadores construyen Fábrica/Centro?
- **Impacto de sabotaje:** ¿Cuánto afecta el sabotaje a la logística enemiga?
- **Eficiencia de trenes:** ¿Los trenes mejoran significativamente el throughput?

---

**Última actualización:** Basado en código del servidor
**Archivos fuente:**
- `server/game/managers/ConvoyMovementManager.js`
- `server/game/handlers/ConvoyHandler.js`
- `server/config/gameConfig.js`
- `server/config/serverNodes.js`
- `server/systems/TrainSystemServer.js`

