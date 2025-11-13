# Documentación de Balanceo: Sistema de Frentes

## Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Mecánica de Movimiento](#mecánica-de-movimiento)
3. [Consumo de Suministros](#consumo-de-suministros)
4. [Sistema de Colisión](#sistema-de-colisión)
5. [Cálculo de Fronteras](#cálculo-de-fronteras)
6. [Sistema de Territorio](#sistema-de-territorio)
7. [Condiciones de Victoria](#condiciones-de-victoria)
8. [Efectos que Afectan a los Frentes](#efectos-que-afectan-a-los-frentes)
9. [Balance Territorial](#balance-territorial)

---

## Resumen Ejecutivo

Los frentes son el núcleo del sistema de combate territorial del juego. Representan la línea de batalla que avanza o retrocede basándose en los suministros disponibles. El control de los frentes determina el territorio controlado, las condiciones de victoria y la generación de currency adicional.

**Características Clave:**
- Los frentes avanzan cuando tienen suministros y retroceden cuando no los tienen
- La velocidad de avance/retroceso es constante (4 px/s)
- Los frentes entran en colisión cuando se encuentran, comparando suministros
- El territorio se calcula desde las posiciones de los frentes
- Las condiciones de victoria se basan en el avance de los frentes

---

## Mecánica de Movimiento

### Velocidades Base

| Estado | Velocidad | Condición |
|--------|----------|-----------|
| Avance | 4 px/s | Con suministros > 0 y sin colisión |
| Retroceso | 4 px/s | Sin suministros (supplies = 0) |
| Empuje | 4 px/s | Cuando tiene más suministros que el enemigo |
| Empujado | 4 px/s | Cuando tiene menos suministros que el enemigo |
| Empate | 0 px/s | Suministros iguales y > 0 |
| Ambos sin recursos | 4 px/s retroceso | Ambos frentes sin suministros |

### Direcciones de Movimiento

**Player1:**
- Avanza hacia la derecha (+X)
- Retrocede hacia la izquierda (-X)
- Posición inicial: ~800px (centro del mapa)

**Player2:**
- Avanza hacia la izquierda (-X)
- Retrocede hacia la derecha (+X)
- Posición inicial: ~800px (centro del mapa)

### Estados de Movimiento

**Sin Colisión:**
- Con suministros: Avanza a 4 px/s
- Sin suministros: Retrocede a 4 px/s

**Con Colisión:**
- Más suministros: Empuja al enemigo (avanza a 4 px/s)
- Menos suministros: Es empujado (retrocede a 4 px/s)
- Suministros iguales > 0: Empate (no se mueve)
- Ambos sin suministros: Ambos retroceden a 4 px/s

---

## Consumo de Suministros

### Tasa de Consumo Base

| Propiedad | Valor |
|-----------|-------|
| Consumo base | 1.6 supplies/segundo |
| Consumo con efecto "herido" | 3.2 supplies/segundo |
| Duración del efecto "herido" | 15 segundos |

### Mecánica de Consumo

**Consumo Normal:**
- Cada frente consume 1.6 supplies por segundo
- El consumo es constante mientras el frente tenga suministros
- Cuando los suministros llegan a 0, el frente comienza a retroceder

**Consumo con Efecto "Herido":**
- El consumo se duplica a 3.2 supplies/segundo
- Dura 15 segundos
- Se aplica por sniper strike o emergencia médica no resuelta

### Tiempo de Duración de Suministros

**Con 100 supplies (máximo):**
- Consumo normal: 100 ÷ 1.6 = 62.5 segundos (~1 minuto)
- Consumo herido: 100 ÷ 3.2 = 31.25 segundos (~30 segundos)

**Con 50 supplies:**
- Consumo normal: 50 ÷ 1.6 = 31.25 segundos (~30 segundos)
- Consumo herido: 50 ÷ 3.2 = 15.625 segundos (~15 segundos)

### Suministros Iniciales

| Nodo | Suministros Iniciales | Máximo |
|------|----------------------|--------|
| Front | 50 | 100 |

---

## Sistema de Colisión

### Configuración de Colisión

| Propiedad | Valor |
|-----------|-------|
| Radio del frente | 40px |
| Gap hasta frontera | 25px |
| Zona neutral | 25px |
| Rango de colisión total | ~90px |

### Mecánica de Colisión

**Detección de Colisión:**
- Se busca el frente enemigo más cercano verticalmente (misma altura Y)
- Se calcula la distancia entre las fronteras de ambos frentes
- Si la distancia es ≤ 25px (zona neutral), hay colisión

**Cálculo de Fronteras:**
- Player1: Frontera = posición X + 40px (radio) + 25px (gap) = X + 65px
- Player2: Frontera = posición X - 40px (radio) - 25px (gap) = X - 65px

### Comportamiento en Colisión

**Más Suministros:**
- El frente con más suministros empuja al enemigo
- Avanza hacia el enemigo a 4 px/s
- El enemigo retrocede a 4 px/s (mantiene distancia constante)

**Menos Suministros:**
- El frente con menos suministros es empujado
- Retrocede alejándose del enemigo a 4 px/s
- El enemigo avanza a 4 px/s (mantiene distancia constante)

**Suministros Iguales (> 0):**
- Ambos frentes tienen los mismos suministros
- Empate: no se mueven (movement = 0)
- La distancia se mantiene constante

**Ambos Sin Suministros:**
- Ambos frentes tienen 0 suministros
- Ambos retroceden alejándose uno del otro
- Velocidad: 4 px/s cada uno

---

## Cálculo de Fronteras

### Definición de Frontera

La frontera de un equipo es la posición X más avanzada de todos sus frentes, más un gap de 25px.

**Player1 (avanza a la derecha):**
```
Frontera = max(front.x + 25px) para todos los frentes de player1
```

**Player2 (avanza a la izquierda):**
```
Frontera = min(front.x - 25px) para todos los frentes de player2
```

### Ejemplo de Cálculo

**Player1 tiene 3 frentes:**
- Front 1: x = 900px → Frontera = 925px
- Front 2: x = 950px → Frontera = 975px
- Front 3: x = 850px → Frontera = 875px
- **Frontera total:** 975px (la más avanzada)

**Player2 tiene 3 frentes:**
- Front 1: x = 700px → Frontera = 675px
- Front 2: x = 750px → Frontera = 725px
- Front 3: x = 650px → Frontera = 625px
- **Frontera total:** 625px (la más avanzada hacia la izquierda)

### Uso de Fronteras

Las fronteras se usan para:
1. **Calcular territorio:** Determinar qué área pertenece a cada equipo
2. **Validar construcción:** Los edificios solo pueden construirse dentro del territorio
3. **Condiciones de victoria:** Verificar si una frontera retrocedió demasiado
4. **Abandono de edificios:** Los edificios fuera del territorio se abandonan

---

## Sistema de Territorio

### Cálculo de Territorio

**Player1:**
- Territorio: Desde su HQ (x = 100) hasta su frontera (más avanzada)
- Puede construir edificios en: HQ.x ≤ x ≤ Frontera

**Player2:**
- Territorio: Desde su frontera (más avanzada) hasta su HQ (x = 1820)
- Puede construir edificios en: Frontera ≤ x ≤ HQ.x

### Restricciones de Construcción

**Sin Frentes:**
- Si un equipo no tiene frentes activos, solo puede construir en un radio de 300px alrededor del HQ

**Con Frentes:**
- Los edificios solo pueden construirse dentro del territorio del equipo
- El territorio se calcula dinámicamente desde las posiciones de los frentes

### Abandono por Territorio

**Mecánica:**
- Los edificios fuera del territorio tienen 3 segundos de gracia
- Después de 3 segundos, comienzan el proceso de abandono
- Si el edificio vuelve al territorio antes de completar el abandono, se cancela

**Edificios Excluidos:**
- HQ (nunca se abandona)
- Fronts (nunca se abandonan)
- Comandos Especiales (diseñados para desplegarse en territorio enemigo)

**Verificación:**
- Se verifica cada 1 segundo
- Se considera el radio completo del edificio (hitbox)

---

## Condiciones de Victoria

### Líneas de Victoria

| Línea | Posición | Porcentaje |
|-------|----------|------------|
| Línea izquierda | 288px | 15% del ancho |
| Línea derecha | 1632px | 85% del ancho |

**Cálculo:**
- Ancho del mundo: 1920px
- Línea izquierda: 1920 × 0.15 = 288px
- Línea derecha: 1920 × 0.85 = 1632px

### Condiciones de Victoria Activa

**Player1 gana si:**
- Algún frente player1 alcanza x ≥ 1632px (85% del mapa)

**Player2 gana si:**
- Algún frente player2 alcanza x ≤ 288px (15% del mapa)

**Mecánica:**
- Se verifica cada tick del juego
- Si algún frente cruza la línea de victoria, se declara victoria inmediata

### Condiciones de Victoria Pasiva

**Player1 gana si:**
- La frontera de player2 retrocede hasta x ≥ 1632px (85% del mapa)

**Player2 gana si:**
- La frontera de player1 retrocede hasta x ≤ 288px (15% del mapa)

**Mecánica:**
- Se verifica cada tick del juego
- Si la frontera enemiga retrocede hasta la línea de victoria, se declara victoria

### Ejemplo de Victoria

**Escenario:**
- Player1 tiene frentes en: 900px, 950px, 1000px
- Frontera de Player1: 1000 + 25 = 1025px
- Player2 tiene frentes en: 700px, 750px, 800px
- Frontera de Player2: 700 - 25 = 675px

**Victoria activa:**
- Si algún frente de Player1 alcanza 1632px → Victoria Player1
- Si algún frente de Player2 alcanza 288px → Victoria Player2

**Victoria pasiva:**
- Si la frontera de Player2 retrocede hasta 1632px → Victoria Player1
- Si la frontera de Player1 retrocede hasta 288px → Victoria Player2

---

## Efectos que Afectan a los Frentes

### Efecto "Herido" (Wounded)

| Propiedad | Valor |
|-----------|-------|
| Causa | Sniper strike o emergencia médica no resuelta |
| Duración | 15 segundos |
| Efecto | Duplica consumo de suministros |
| Consumo normal | 1.6 supplies/s |
| Consumo herido | 3.2 supplies/s |

**Impacto:**
- Reduce significativamente el tiempo de duración de suministros
- Puede causar que un frente retroceda rápidamente
- Útil para presionar frentes enemigos

**Análisis:**
- Con 50 supplies: Duración normal = 31.25s, Duración herido = 15.625s
- Con 100 supplies: Duración normal = 62.5s, Duración herido = 31.25s
- El efecto reduce la duración a la mitad

### Efectos de Suministros

**Suministros Altos (> 70):**
- Frente puede avanzar durante mucho tiempo
- Resistente a efectos temporales
- Puede empujar frentes enemigos con menos suministros

**Suministros Medios (30-70):**
- Frente puede avanzar moderadamente
- Vulnerable a efectos temporales
- Necesita reabastecimiento regular

**Suministros Bajos (< 30):**
- Frente puede avanzar poco tiempo
- Muy vulnerable a efectos temporales
- Puede retroceder rápidamente

**Sin Suministros (0):**
- Frente retrocede automáticamente
- No puede avanzar ni empujar
- Genera sonido de "no ammo"

---

## Balance Territorial

### Distribución Inicial

**Posiciones Iniciales:**
- Player1 HQ: x = 100px
- Player2 HQ: x = 1820px
- Frentes iniciales: x = 800px (centro del mapa)

**Territorio Inicial:**
- Player1: 100px → 825px (725px de territorio)
- Player2: 775px → 1820px (1045px de territorio)
- Zona neutral: ~50px en el centro

**Nota:** La distribución inicial es ligeramente asimétrica (Player2 tiene más territorio inicial).

### Balance de Avance

**Factores que Afectan el Balance:**
1. **Suministros:** Más suministros = más avance
2. **Logística:** Mejor logística = más suministros disponibles
3. **Efectos temporales:** Sniper puede ralentizar avance enemigo
4. **Estrategia:** Priorizar frentes específicos

### Estrategias de Control Territorial

**Estrategia Agresiva:**
- Priorizar suministros en un frente específico
- Empujar ese frente lo más lejos posible
- Generar currency adicional por avance

**Estrategia Defensiva:**
- Mantener suministros en todos los frentes
- Prevenir retroceso de fronteras
- Proteger territorio existente

**Estrategia Equilibrada:**
- Distribuir suministros equitativamente
- Mantener todos los frentes avanzando
- Maximizar territorio controlado

### Análisis de Currency por Avance

**Generación de Currency:**
- 1 currency cada 2 píxeles de avance
- Solo cuenta avance neto (no retroceso)
- Se acumula y otorga en incrementos enteros

**Ejemplo:**
- Frente avanza 100 píxeles → +50 currency
- Frente avanza 50 píxeles → +25 currency
- Frente avanza 3 píxeles → +1 currency (se acumula 1 píxel)

**Velocidad de Generación:**
- Con avance constante a 4 px/s: 2 currency/s por frente
- Con 3 frentes avanzando: 6 currency/s total
- Con pasiva base (3/s): Total = 9 currency/s

---

## Notas para Balanceo

### Puntos Clave a Considerar

1. **Velocidades de Movimiento:**
   - ¿4 px/s es apropiado para avance y retroceso?
   - ¿Deberían ser diferentes las velocidades de avance y retroceso?
   - ¿El movimiento es demasiado rápido o lento?

2. **Consumo de Suministros:**
   - ¿1.6 supplies/s es balanceado?
   - ¿El efecto "herido" (3.2 supplies/s) es demasiado fuerte?
   - ¿Los frentes consumen suministros demasiado rápido o lento?

3. **Sistema de Colisión:**
   - ¿La mecánica de empuje es balanceada?
   - ¿El empate cuando suministros son iguales es apropiado?
   - ¿La zona neutral de 25px es adecuada?

4. **Condiciones de Victoria:**
   - ¿Las líneas de victoria (15% y 85%) son apropiadas?
   - ¿Las partidas terminan demasiado rápido o lento?
   - ¿Hay suficiente espacio para maniobras estratégicas?

5. **Balance Territorial:**
   - ¿La distribución inicial es justa?
   - ¿Un equipo tiene ventaja inicial?
   - ¿El sistema de territorio es claro para los jugadores?

### Métricas Sugeridas para Análisis

- **Tiempo promedio de partida:** ¿Cuánto duran las partidas?
- **Distribución de victorias:** ¿Qué porcentaje gana cada condición?
- **Avance promedio de frentes:** ¿Cuántos píxeles avanzan los frentes en promedio?
- **Consumo promedio de suministros:** ¿Cuántos supplies/s se consumen en promedio?
- **Impacto de efectos temporales:** ¿Cuánto afectan los efectos al avance?

### Puntos de Balance Críticos

1. **Velocidad vs Consumo:**
   - Velocidad alta + consumo bajo = avance rápido
   - Velocidad baja + consumo alto = avance lento
   - ¿La relación actual es apropiada?

2. **Suministros vs Territorio:**
   - Más suministros = más territorio
   - Más territorio = más currency
   - ¿El ciclo es balanceado?

3. **Efectos Temporales:**
   - Sniper puede duplicar consumo por 15s
   - ¿Es suficiente para tener impacto estratégico?
   - ¿Debería durar más o menos?

---

**Última actualización:** Basado en código del servidor
**Archivos fuente:**
- `server/systems/FrontMovementSystemServer.js`
- `server/game/managers/SupplyManager.js`
- `server/systems/TerritorySystemServer.js`
- `server/game/managers/TerritoryCalculator.js`
- `server/config/serverNodes.js`
- `server/config/gameConfig.js`

