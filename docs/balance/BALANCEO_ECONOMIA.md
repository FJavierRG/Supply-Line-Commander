# Documentación de Balanceo: Sistema Económico

## Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Sistema de Currency Base](#sistema-de-currency-base)
3. [Generación Pasiva](#generación-pasiva)
4. [Generación Activa](#generación-activa)
5. [Bonificaciones Económicas](#bonificaciones-económicas)
6. [Sistema de Inversión](#sistema-de-inversión)
7. [Costos de Acciones](#costos-de-acciones)
8. [Análisis de Ratios de Inversión/Retorno](#análisis-de-ratios-de-inversiónretorno)
9. [Eficiencia Económica por Edificio](#eficiencia-económica-por-edificio)
10. [Sistema de Suministros](#sistema-de-suministros)

---

## Resumen Ejecutivo

El sistema económico del juego se basa en dos recursos principales:
- **Currency ("Terreno Ganado"):** Recurso principal para construir edificios y usar consumibles
- **Supplies (Suministros):** Recurso necesario para mantener los frentes avanzando

**Características Clave:**
- Currency inicial: 30
- Generación pasiva base: 3 currency/segundo
- Currency adicional por avance de frentes: 1 currency cada 2 píxeles
- Los edificios pueden generar bonificaciones económicas pasivas
- Sistema de inversión con retorno diferido (Intel Radio)

---

## Sistema de Currency Base

### Currency Inicial

| Propiedad | Valor |
|-----------|-------|
| Currency inicial | 30 |
| Nombre | "Terreno Ganado" |

### Generación de Currency

El currency se genera de dos formas:

1. **Generación Pasiva:** Constante y automática
2. **Generación Activa:** Por avance de frentes

---

## Generación Pasiva

### Tasa Base

| Propiedad | Valor |
|-----------|-------|
| Tasa pasiva base | 3 currency/segundo |
| Aplicación | Constante, automática |

### Cálculo de Generación Pasiva

```
Generación total = Tasa base + Bonificaciones de plantas nucleares
```

**Ejemplo:**
- Sin plantas nucleares: 3 currency/s
- Con 1 planta nuclear: 5 currency/s (3 + 2)
- Con 2 plantas nucleares: 7 currency/s (3 + 4)
- Con 3 plantas nucleares: 9 currency/s (3 + 6)

### Bonificaciones Pasivas

**Planta Nuclear:**
- Bonus por planta: +2 currency/segundo
- Requisito: Planta construida y no deshabilitada
- Stackeable: Sí (múltiples plantas suman)

**Restricciones:**
- Las plantas deshabilitadas (por comandos) NO generan bonus
- Las plantas en construcción NO generan bonus
- Las plantas abandonando NO generan bonus

---

## Generación Activa

### Currency por Avance de Frentes

| Propiedad | Valor |
|-----------|-------|
| Conversión | 1 currency cada 2 píxeles de avance |
| Mecánica | Solo cuenta avance neto (no retroceso) |
| Tracking | Se acumula y otorga en incrementos enteros |

### Mecánica de Generación

1. **Tracking:** Se acumulan los píxeles avanzados
2. **Conversión:** Cada 2 píxeles = 1 currency
3. **Otorgamiento:** Solo se otorga cuando se alcanza un incremento entero
4. **Reset:** No hay reset, se acumula durante toda la partida

### Ejemplo de Cálculo

- Frente avanza 10 píxeles → +5 currency
- Frente avanza 3 píxeles → +1 currency (se acumula 1 píxel restante)
- Frente avanza 1 píxel más → +1 currency (total acumulado = 2 píxeles)

### Velocidad de Generación por Avance

Con un frente avanzando constantemente a 4 px/s:
- **Píxeles por segundo:** 4 px/s
- **Currency por segundo:** 2 currency/s (4 px/s ÷ 2)
- **Total con pasiva:** 5 currency/s (3 pasiva + 2 por avance)

---

## Bonificaciones Económicas

### Planta Nuclear

| Propiedad | Valor |
|-----------|-------|
| Costo | 200 currency |
| Tiempo de construcción | 4 segundos |
| Bonus pasivo | +2 currency/segundo |
| Retorno de inversión | 100 segundos (1m 40s) |

**Análisis Económico:**

- **Inversión:** 200 currency
- **Retorno:** +2 currency/s
- **Tiempo de recuperación:** 200 ÷ 2 = 100 segundos
- **Eficiencia:** ⭐⭐⭐⭐⭐ (Muy alta si se mantiene viva)

**Escenarios:**

| Tiempo de vida | Currency generado | Beneficio neto |
|----------------|-------------------|----------------|
| 100s (1m 40s) | 200 | 0 (break even) |
| 200s (3m 20s) | 400 | +200 |
| 300s (5m) | 600 | +400 |
| 600s (10m) | 1200 | +1000 |

**Consideraciones:**
- Si la planta es destruida antes de 100s, hay pérdida económica
- Si la planta dura más de 100s, hay ganancia económica
- Múltiples plantas multiplican el beneficio

### Estación de Tren

| Propiedad | Valor |
|-----------|-------|
| Costo | 170 currency |
| Tiempo de construcción | 4 segundos |
| Intervalo entre trenes | 12 segundos |
| Suministros por tren | 25 supplies |
| Velocidad del tren | 55 px/s |

**Análisis Económico:**

- **Inversión:** 170 currency
- **Suministros por segundo:** ~2.08 supplies/s (25 cada 12s)
- **Tipo de recurso:** Suministros (no currency directa)
- **Eficiencia:** ⭐⭐⭐⭐ (Buena para suministros pasivos)

**Comparación con convoyes manuales:**

- **Camión pesado:** 15 supplies por viaje (sin bonus)
- **Camión normal:** 20 supplies por viaje
- **Tren:** 25 supplies cada 12 segundos (automático)

**Ventajas:**
- Automático (no requiere acción del jugador)
- Consistente (siempre entrega cada 12s)
- No consume vehículos

**Desventajas:**
- Solo entrega a FOBs (no directamente a frentes)
- Requiere que los FOBs existan
- Costo inicial alto

---

## Sistema de Inversión

### Radio de Inteligencia

| Propiedad | Valor |
|-----------|-------|
| Costo inicial | 70 currency |
| Tiempo de inversión | 20 segundos |
| Retorno total | 95 currency (70 + 25) |
| Beneficio neto | +25 currency |
| Retorno sobre inversión | ~35.7% |

**Mecánica:**

1. **Construcción:** Se construye por 70 currency
2. **Espera:** Debe permanecer en territorio propio por 20 segundos
3. **Retorno:** Después de 20s, se consume y devuelve 95 currency
4. **Abandono:** Se abandona automáticamente después del retorno

**Análisis Económico:**

- **Inversión:** 70 currency
- **Tiempo de bloqueo:** 20 segundos
- **Retorno:** 95 currency
- **Beneficio:** +25 currency
- **ROI:** 35.7%

**Comparación con Planta Nuclear:**

| Métrica | Intel Radio | Planta Nuclear |
|---------|-------------|----------------|
| Costo | 70 | 200 |
| Tiempo de recuperación | 20s | 100s |
| Retorno total | 95 | Ilimitado |
| Beneficio neto | +25 | Variable |
| Ventaja | Retorno rápido | Retorno continuo |

**Consideraciones:**
- Intel Radio es mejor para inversiones cortas
- Planta Nuclear es mejor para inversiones largas
- Intel Radio requiere territorio estable (20s sin perderlo)

---

## Costos de Acciones

### Tabla Completa de Costos

#### Edificios Construibles

| Edificio | Costo | Tiempo Construcción |
|----------|-------|---------------------|
| FOB | 120 | 4s |
| Anti-Dron | 115 | 4s |
| Lanzadera de Drones | 100 | 2s |
| Planta Nuclear | 200 | 4s |
| Fábrica de Camiones | 100 | 2s |
| Centro de Ingenieros | 120 | 4s |
| Radio de Inteligencia | 70 | 2s |
| Centro de Inteligencia | 150 | 3s |
| Estación de Tren | 170 | 4s |

#### Consumibles y Proyectiles

| Consumible | Costo | Efecto |
|------------|-------|--------|
| Dron Bomba | 150 | Destruye edificio |
| Ataque de Francotirador | 40 | Duplica consumo front 15s |
| Sabotaje FOB | 40 | Ralentiza 3 camiones |
| Comando Especial | 70 | Deshabilita edificios 10s |
| Tanque | 100 | Destruye edificio |

### Costos por Categoría

**Edificios Defensivos:**
- Anti-Dron: 115
- Torre de Vigilancia: 120 (deshabilitado)

**Edificios Ofensivos:**
- Lanzadera de Drones: 100
- Centro de Inteligencia: 150

**Edificios Económicos:**
- Planta Nuclear: 200
- Estación de Tren: 170
- Radio de Inteligencia: 70

**Edificios de Infraestructura:**
- FOB: 120
- Fábrica de Camiones: 100
- Centro de Ingenieros: 120

**Consumibles Baratos (< 50):**
- Ataque de Francotirador: 40
- Sabotaje FOB: 40

**Consumibles Medianos (50-100):**
- Comando Especial: 70
- Tanque: 100

**Consumibles Caros (> 100):**
- Dron Bomba: 150

---

## Análisis de Ratios de Inversión/Retorno

### Edificios con Retorno Económico

#### Planta Nuclear

| Métrica | Valor |
|---------|-------|
| Costo | 200 |
| Retorno por segundo | +2 currency/s |
| Tiempo de recuperación | 100s |
| ROI a 5 minutos | +400 currency |
| ROI a 10 minutos | +1000 currency |

**Eficiencia:** ⭐⭐⭐⭐⭐

#### Radio de Inteligencia

| Métrica | Valor |
|---------|-------|
| Costo | 70 |
| Tiempo de inversión | 20s |
| Retorno total | 95 |
| Beneficio neto | +25 |
| ROI | 35.7% |

**Eficiencia:** ⭐⭐⭐⭐⭐ (si se completa)

#### Estación de Tren

| Métrica | Valor |
|---------|-------|
| Costo | 170 |
| Retorno | 25 supplies cada 12s |
| Equivalente en currency | Variable (depende del valor de supplies) |

**Eficiencia:** ⭐⭐⭐⭐ (indirecta, mejora logística)

### Edificios sin Retorno Económico Directo

Estos edificios no generan currency, pero proporcionan ventajas estratégicas:

- **FOB:** Permite almacenar suministros y enviarlos al frente
- **Anti-Dron:** Protege contra drones (ahorra 150 currency por dron interceptado)
- **Lanzadera de Drones:** Permite usar drones ofensivos
- **Fábrica de Camiones:** Mejora capacidad logística
- **Centro de Ingenieros:** Mejora velocidad logística
- **Centro de Inteligencia:** Permite usar comandos especiales

### Análisis de Eficiencia por Punto de Mazo

Para el sistema de mazos (límite 700 puntos), cada unidad tiene un costo que cuenta para el límite:

| Unidad | Costo en Mazo | Eficiencia Económica |
|--------|---------------|----------------------|
| Planta Nuclear | 200 | ⭐⭐⭐⭐⭐ (Genera currency) |
| Radio de Inteligencia | 70 | ⭐⭐⭐⭐⭐ (Retorno rápido) |
| Estación de Tren | 170 | ⭐⭐⭐⭐ (Genera supplies) |
| FOB | 120 | ⭐⭐⭐ (Infraestructura esencial) |
| Anti-Dron | 115 | ⭐⭐⭐⭐ (Ahorra 150 por dron) |
| Lanzadera | 100 | ⭐⭐⭐ (Habilita drones) |
| Fábrica | 100 | ⭐⭐⭐ (Mejora logística) |
| Centro Ingenieros | 120 | ⭐⭐⭐ (Mejora velocidad) |
| Centro Inteligencia | 150 | ⭐⭐⭐ (Habilita comandos) |

---

## Eficiencia Económica por Edificio

### Ranking de Eficiencia Económica

**Tier S (Excelente ROI):**
1. **Radio de Inteligencia** - ROI 35.7% en 20s
2. **Planta Nuclear** - ROI ilimitado si se mantiene viva

**Tier A (Buen ROI):**
3. **Estación de Tren** - Genera supplies pasivos
4. **Anti-Dron** - Ahorra 150 currency por dron interceptado

**Tier B (ROI Indirecto):**
5. **Fábrica de Camiones** - Mejora eficiencia logística
6. **Centro de Ingenieros** - Mejora velocidad logística
7. **FOB** - Infraestructura esencial

**Tier C (ROI Estratégico):**
8. **Lanzadera de Drones** - Habilita ofensiva
9. **Centro de Inteligencia** - Habilita comandos

### Análisis de Tiempo de Recuperación

**Inversiones Rápidas (< 30s):**
- Radio de Inteligencia: 20s

**Inversiones Medianas (30s - 2m):**
- Planta Nuclear: 100s (break even)

**Inversiones Largas (> 2m):**
- Estación de Tren: Retorno continuo pero indirecto

---

## Sistema de Suministros

### Generación de Suministros

Los suministros NO se generan automáticamente. Deben ser transportados mediante:

1. **Convoyes manuales:** Camiones pesados y normales
2. **Trenes automáticos:** Estación de Tren
3. **Helicópteros:** Sistema aéreo (si está habilitado)

### Capacidades de Transporte

| Vehículo | Capacidad Base | Con Bonus | Origen |
|----------|----------------|-----------|--------|
| Heavy Truck | 15 | 30 (con Fábrica) | HQ |
| Truck | 20 | 20 | FOB |
| Tren | 25 | 25 | Estación |
| Helicóptero | 100 | 100 | HQ/Front |

### Eficiencia de Suministros por Segundo

**Convoyes Manuales:**
- Requieren acción del jugador
- Tiempo de viaje variable según distancia
- Consumen vehículos

**Trenes Automáticos:**
- Automáticos (no requieren acción)
- Entregan cada 12 segundos
- 25 supplies cada 12s = ~2.08 supplies/s por FOB

**Comparación:**

| Método | Suministros/s | Requiere Acción | Consume Vehículos |
|--------|---------------|----------------|-------------------|
| Tren (1 FOB) | ~2.08 | No | No |
| Tren (2 FOBs) | ~4.16 | No | No |
| Tren (3 FOBs) | ~6.25 | No | No |
| Convoy Manual | Variable | Sí | Sí |

### Valor Económico de Suministros

Los suministros no tienen un valor directo en currency, pero:
- Permiten que los frentes avancen
- El avance genera currency (1 cada 2 píxeles)
- Los frentes consumen 1.6 supplies/s

**Cálculo indirecto:**
- 1.6 supplies/s permiten avanzar a 4 px/s
- 4 px/s = 2 currency/s por avance
- Por lo tanto: ~0.8 supplies = 1 currency (indirectamente)

---

## Estrategias Económicas

### Estrategia Temprana (Primeros 2 minutos)

**Objetivos:**
- Construir infraestructura básica
- Establecer generación pasiva

**Recomendaciones:**
- Construir FOBs para almacenar suministros
- Construir Radio de Inteligencia si el territorio es estable
- Evitar Planta Nuclear temprano (riesgo de destrucción)

### Estrategia Media (2-5 minutos)

**Objetivos:**
- Expandir generación pasiva
- Mejorar logística

**Recomendaciones:**
- Construir Planta Nuclear si el territorio es seguro
- Construir Estación de Tren para suministros pasivos
- Mejorar infraestructura (Fábrica, Centro de Ingenieros)

### Estrategia Tardía (5+ minutos)

**Objetivos:**
- Maximizar generación pasiva
- Mantener ventaja económica

**Recomendaciones:**
- Múltiples Plantas Nucleares si es seguro
- Múltiples Estaciones de Tren
- Proteger inversiones económicas

---

## Notas para Balanceo

### Puntos Clave a Considerar

1. **Balance de Generación Pasiva vs Activa:**
   - ¿Es suficiente 3 currency/s base?
   - ¿El bonus de plantas nucleares (+2/s) es apropiado?
   - ¿La generación por avance (1 cada 2px) es balanceada?

2. **Costos de Edificios:**
   - ¿Los costos son proporcionales a su utilidad?
   - ¿Hay edificios demasiado baratos o caros?
   - ¿El sistema de mazos (700 puntos) limita adecuadamente?

3. **Sistema de Inversión:**
   - ¿El Intel Radio es demasiado rentable?
   - ¿El tiempo de inversión (20s) es apropiado?
   - ¿Debería haber más opciones de inversión?

4. **Eficiencia Económica:**
   - ¿Hay edificios que nunca se construyen por ser ineficientes?
   - ¿Hay edificios que siempre se construyen por ser demasiado eficientes?
   - ¿El balance entre costo y beneficio es adecuado?

### Métricas Sugeridas para Análisis

- **Currency generado por minuto:** ¿Cuánto currency genera cada jugador?
- **Distribución de edificios:** ¿Qué edificios se construyen más?
- **Tiempo promedio de recuperación:** ¿Cuánto tardan los jugadores en recuperar inversiones?
- **Uso de consumibles:** ¿Qué consumibles se usan más y por qué?
- **Impacto de plantas nucleares:** ¿Cuánto currency adicional generan en promedio?

---

**Última actualización:** Basado en código del servidor
**Archivos fuente:**
- `server/game/systems/CurrencySystem.js`
- `server/config/gameConfig.js`
- `server/config/serverNodes.js`
- `server/systems/TrainSystemServer.js`
- `server/systems/FrontMovementSystemServer.js`

