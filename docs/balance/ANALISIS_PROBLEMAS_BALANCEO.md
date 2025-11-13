# Análisis de Problemas y Mejoras de Balanceo

## Índice
1. [Problemas Críticos](#problemas-críticos)
2. [Problemas de Balance Económico](#problemas-de-balance-económico)
3. [Problemas de Balance de Combate](#problemas-de-balance-de-combate)
4. [Problemas de Balance Logístico](#problemas-de-balance-logístico)
5. [Problemas de Sistema de Mazos](#problemas-de-sistema-de-mazos)
6. [Problemas de Asimetría](#problemas-de-asimetría)
7. [Recomendaciones Prioritarias](#recomendaciones-prioritarias)

---

## Problemas Críticos

### 1. ~~Mazo Predeterminado Excede el Límite~~ ✅ VERIFICADO: Está en el Límite

**Estado:** ✅ **VERIFICADO EN CÓDIGO - EL MAZO ESTÁ EN EL LÍMITE**

**Verificación del Código Real:**
- El límite real del juego es **815 puntos** (no 700 como decía la documentación)
- El mazo predeterminado tiene exactamente **815 puntos**
- **El mazo está en el límite, no lo excede** ✅

**Mazo Predeterminado Actual (815 puntos):**
- FOB: 120
- Anti-Dron: 115
- Lanzadera: 100
- Fábrica: 100
- Centro Ingenieros: 120
- Radio Inteligencia: 70
- Dron: 150
- Sniper: 40
- **Total: 815 puntos** ✅ (exactamente en el límite)

**Conclusión:** El mazo predeterminado es jugable tal como está. La documentación tenía el límite incorrecto (700 en lugar de 815).

**Nota:** Si se quiere dejar margen para que los jugadores puedan añadir unidades, se podría considerar reducir el mazo predeterminado o aumentar el límite, pero no es crítico.

---

### 2. ~~Asimetría Inicial del Mapa~~ ✅ CORREGIDO: NO HAY ASIMETRÍA

**Estado:** ✅ **VERIFICADO EN CÓDIGO - EL MAPA ES SIMÉTRICO**

**Verificación del Código Real:**
El juego usa `MAP_CONFIG` de `mapGenerator.js`, no `GAME_CONFIG.initialNodes` (que estaba desactualizado en la documentación).

**Posiciones Reales (MAP_CONFIG):**
- Player1 HQ: 0.06 × 1920 = **115px**
- Player2 HQ: 0.94 × 1920 = **1805px**
- Player1 Front: 0.35 × 1920 = **672px**
- Player2 Front: 0.65 × 1920 = **1248px**

**Fronteras (con gap de 25px):**
- Player1 frontera: 672 + 25 = **697px**
- Player2 frontera: 1248 - 25 = **1223px**

**Territorio Inicial:**
- Player1: desde 115px hasta 697px = **582px** ✅
- Player2: desde 1223px hasta 1805px = **582px** ✅
- **Diferencia: 0px (SIMÉTRICO)** ✅

**Distancia para Ganar:**
- Player1: desde 672px hasta 1632px = **960px** ✅
- Player2: desde 1248px hasta 288px = **960px** ✅
- **Diferencia: 0px (SIMÉTRICO)** ✅

**Conclusión:** El mapa es completamente simétrico. La documentación estaba usando valores antiguos que ya no se usan en el código.

---

## Problemas de Balance Económico

### 3. Radio de Inteligencia: ROI Demasiado Alto

**Problema:**
- Radio de Inteligencia tiene un **ROI del 35.7%** en solo 20 segundos
- Es mucho más eficiente que cualquier otra inversión
- Puede dominar la economía temprana del juego

**Análisis:**
- Costo: 70 currency
- Retorno: 95 currency (70 + 25)
- Tiempo: 20 segundos
- ROI: 35.7%

**Comparación:**
- Planta Nuclear: ROI ilimitado pero requiere 100s para break even
- Radio: ROI 35.7% en solo 20s

**Solución Recomendada:**
- Reducir el beneficio neto de +25 a +15 currency (ROI 21.4%)
- O aumentar el tiempo de inversión de 20s a 30s
- O reducir el retorno total de 95 a 85 currency

**Impacto Esperado:**
- Menos dominante en economía temprana
- Más balanceado con otras opciones económicas
- Sigue siendo viable pero no obligatorio

---

### 4. Planta Nuclear: Break Even Demasiado Lento

**Problema:**
- Planta Nuclear requiere **100 segundos** (1m 40s) para recuperar la inversión
- En partidas cortas (< 5 minutos), puede no valer la pena
- Es muy vulnerable a ataques durante este tiempo

**Análisis:**
- Costo: 200 currency
- Retorno: +2 currency/s
- Break even: 100 segundos
- En partida de 5 minutos: Beneficio neto de +400 currency

**Solución Recomendada:**
- Reducir el tiempo de break even a 80 segundos (aumentar bonus a +2.5 currency/s)
- O reducir el costo a 150 currency (break even en 75s con +2/s)
- Considerar hacerla más resistente o más barata para compensar vulnerabilidad

**Impacto Esperado:**
- Más viable en partidas de duración media
- Mejor relación riesgo/recompensa
- Más atractiva para construir

---

### 5. Estación de Tren: Retorno Indirecto Difícil de Evaluar

**Problema:**
- El retorno de Estación de Tren es **indirecto** (suministros, no currency)
- Es difícil comparar con otras inversiones económicas
- Puede ser subestimada o sobreestimada por jugadores

**Análisis:**
- Costo: 170 currency
- Retorno: 25 supplies cada 12s = ~2.08 supplies/s
- Valor indirecto: ~0.8 supplies = 1 currency (según documentación)

**Solución Recomendada:**
- Clarificar el valor económico de los suministros en la documentación
- Considerar hacer el retorno más directo o más claro
- O ajustar el costo para reflejar mejor su valor

---

## Problemas de Balance de Combate

### 6. Dron vs Anti-Dron: Intercambio Económico Desfavorable para el Atacante

**Problema:**
- Dron cuesta **150 currency**
- Anti-Dron cuesta **115 currency**
- El defensor gana económicamente incluso si intercepta solo 1 dron
- Puede desincentivar el uso de drones

**Análisis:**
- Atacante pierde: 150 currency (dron)
- Defensor pierde: 115 currency (anti-dron)
- **Diferencia: -35 currency para el atacante** ❌

**Solución Recomendada:**
- Reducir el costo del dron a 120 currency (intercambio más justo)
- O aumentar el costo del Anti-Dron a 140 currency
- O hacer que el Anti-Dron pueda interceptar múltiples drones antes de destruirse

**Impacto Esperado:**
- Intercambio más balanceado
- Más incentivo para usar drones
- Defensa sigue siendo viable pero no tan dominante

---

### 7. Tanque: Demasiado Lento Comparado con Dron

**Problema:**
- Tanque tarda **~9 segundos** para objetivos a mitad del mapa
- Dron tarda **~3.2 segundos** para la misma distancia
- Tanque es solo 33% más barato pero 3x más lento

**Análisis:**
- Dron: 150 currency, 300 px/s, ~3.2s total
- Tanque: 100 currency, 125 px/s, ~9.05s total
- Ratio velocidad: 2.4x más rápido el dron
- Ratio costo: 1.5x más caro el dron

**Solución Recomendada:**
- Aumentar velocidad del tanque a 150 px/s (reducir tiempo total a ~7.5s)
- O reducir el costo del tanque a 80 currency
- O hacer que el tanque pueda atacar FOBs (más versátil)

**Impacto Esperado:**
- Tanque más competitivo con dron
- Más opciones viables de ataque
- Mejor balance entre velocidad y costo

---

### 8. Sniper: Efecto "Herido" Puede Ser Demasiado Débil

**Problema:**
- El efecto "herido" dura solo **15 segundos**
- Con 50 supplies, solo consume ~48 supplies adicionales
- Puede no ser suficiente para tener impacto estratégico significativo

**Análisis:**
- Costo: 40 currency
- Efecto: Duplica consumo por 15s
- Consumo adicional: ~24 supplies (de 24 a 48 en 15s)
- Valor: Depende de cuánto valgan esos supplies

**Solución Recomendada:**
- Aumentar duración a 20 segundos (consume ~64 supplies adicionales)
- O aumentar el multiplicador a 2.5x (consume ~60 supplies adicionales en 15s)
- O reducir el costo a 30 currency para permitir uso más frecuente

**Impacto Esperado:**
- Mayor impacto estratégico
- Más útil para presionar frentes
- Mejor relación costo/efecto

---

### 9. Comando Especial: Duración Puede Ser Insuficiente

**Problema:**
- Comando deshabilita edificios por **10 segundos activo + 3s residual = 13s total**
- Puede no ser suficiente tiempo para aprovechar la ventana de oportunidad
- Requiere coordinación perfecta para ser efectivo

**Análisis:**
- Costo: 70 currency
- Duración total: 13 segundos
- Radio de efecto: 200px
- Requisito: Centro de Inteligencia (150 currency)

**Solución Recomendada:**
- Aumentar duración activa a 12 segundos (total 15s)
- O aumentar el radio de efecto a 250px
- O reducir el costo a 60 currency

**Impacto Esperado:**
- Más tiempo para aprovechar la ventana
- Mayor impacto estratégico
- Más viable como opción ofensiva

---

## Problemas de Balance Logístico

### 10. Sabotaje FOB: Efecto Puede Ser Demasiado Débil

**Problema:**
- Sabotaje afecta solo a **3 camiones**
- Si el enemigo envía convoyes cada 20 segundos, el efecto dura solo 60 segundos
- Puede no tener suficiente impacto para justificar el costo

**Análisis:**
- Costo: 40 currency
- Efecto: -50% velocidad en 3 camiones
- Duración: Variable según frecuencia de convoyes

**Solución Recomendada:**
- Aumentar a 5 camiones afectados
- O aumentar la penalización a -60% velocidad
- O reducir el costo a 30 currency

**Impacto Esperado:**
- Mayor impacto en logística enemiga
- Más útil como herramienta de presión
- Mejor relación costo/efecto

---

### 11. Centro de Ingenieros: Solo Afecta Heavy Trucks

**Problema:**
- El bonus de velocidad solo afecta a **heavy_trucks**
- No afecta a trucks normales (FOB → Front)
- Puede ser menos útil de lo esperado

**Análisis:**
- Costo: 120 currency
- Efecto: +50% velocidad solo para heavy_truck
- No afecta: trucks, ambulancias, helicópteros

**Solución Recomendada:**
- Extender el bonus a trucks normales también (+25% velocidad)
- O reducir el costo a 100 currency
- O aumentar el bonus a +75% para heavy_trucks

**Impacto Esperado:**
- Más versátil y útil
- Mejor relación costo/beneficio
- Más atractivo para construir

---

### 12. Fábrica de Camiones: Bonus Puede Ser Demasiado Fuerte

**Problema:**
- Fábrica duplica la capacidad de heavy_trucks (15 → 30)
- Esto es un **+100% de throughput** con solo 1 edificio
- Puede ser demasiado dominante en logística

**Análisis:**
- Costo: 100 currency
- Efecto: +15 capacidad, +1 vehículo
- Mejora de throughput: +100% (de 0.75 a 1.5 supplies/s)

**Solución Recomendada:**
- Reducir el bonus a +10 capacidad (15 → 25, +67% throughput)
- O aumentar el costo a 120 currency
- O hacer que el bonus sea acumulativo pero con rendimientos decrecientes

**Impacto Esperado:**
- Menos dominante
- Más balanceado con otras opciones
- Sigue siendo fuerte pero no obligatorio

---

## Problemas de Sistema de Mazos

### 13. Límite de 700 Puntos Puede Ser Demasiado Restrictivo

**Problema:**
- Con un límite de 700 puntos, es difícil incluir múltiples estrategias
- Los jugadores pueden sentirse limitados en sus opciones
- Puede reducir la variedad de mazos viables

**Análisis:**
- Límite actual: 700 puntos
- Mazo económico completo: ~690 puntos
- Mazo ofensivo completo: ~630 puntos
- Mazo balanceado completo: ~815 puntos (excede límite)

**Solución Recomendada:**
- Aumentar el límite a 800 puntos
- O reducir algunos costos de unidades para permitir más variedad
- O crear categorías de mazos con límites diferentes

**Impacto Esperado:**
- Más variedad de mazos viables
- Más opciones estratégicas
- Menos restricciones artificiales

---

### 14. Consumibles Baratos Pueden Dominar Mazos

**Problema:**
- Consumibles baratos (Sniper 40, Sabotaje 40) son muy eficientes
- Pueden aparecer en todos los mazos por su bajo costo
- Puede reducir la variedad estratégica

**Análisis:**
- Sniper: 40 puntos, muy útil
- Sabotaje: 40 puntos, útil situacionalmente
- Ambos son muy baratos comparados con su utilidad

**Solución Recomendada:**
- Aumentar costo de Sniper a 50 puntos
- O aumentar costo de Sabotaje a 50 puntos
- O reducir su efectividad para compensar el bajo costo

**Impacto Esperado:**
- Menos omnipresentes en mazos
- Más decisiones estratégicas
- Mejor balance de poder por punto

---

## Problemas de Asimetría

### 15. Velocidades de Avance y Retroceso Iguales

**Problema:**
- Avance y retroceso tienen la misma velocidad (4 px/s)
- Esto puede hacer que sea difícil recuperar territorio perdido
- Puede crear situaciones de "bola de nieve" donde el perdedor no puede recuperarse

**Análisis:**
- Velocidad de avance: 4 px/s
- Velocidad de retroceso: 4 px/s
- Misma velocidad en ambas direcciones

**Solución Recomendada:**
- Hacer el retroceso más lento (3 px/s) para dar más tiempo de reacción
- O hacer el avance más rápido cuando hay ventaja de suministros
- O implementar un sistema de "momentum" que acelere el avance cuando hay ventaja

**Impacto Esperado:**
- Más oportunidades de recuperación
- Menos situaciones de bola de nieve
- Mejor balance dinámico

---

### 16. Consumo de Suministros Puede Ser Demasiado Alto

**Problema:**
- Consumo base de 1.6 supplies/s puede ser demasiado alto
- Con 50 supplies iniciales, solo duran ~31 segundos
- Requiere reabastecimiento constante y puede ser estresante

**Análisis:**
- Consumo base: 1.6 supplies/s
- Suministros iniciales: 50
- Duración sin reabastecimiento: ~31 segundos

**Solución Recomendada:**
- Reducir consumo a 1.2 supplies/s (dura ~42 segundos)
- O aumentar suministros iniciales a 75 (dura ~47 segundos con 1.6/s)
- O hacer que el consumo sea proporcional a la velocidad de avance

**Impacto Esperado:**
- Menos presión constante de reabastecimiento
- Más tiempo para planificar estrategias
- Mejor experiencia de juego

---

## Recomendaciones Prioritarias

### Prioridad Alta (Implementar Pronto)

1. **Ajustar Mazo Predeterminado** - Crítico para nuevos jugadores
2. **Corregir Asimetría Inicial** - Afecta balance competitivo
3. **Balancear Dron vs Anti-Dron** - Afecta meta del juego
4. **Ajustar Radio de Inteligencia** - Demasiado dominante económicamente

### Prioridad Media (Considerar para Próxima Iteración)

5. **Mejorar Tanque** - Hacerlo más competitivo con Dron
6. **Ajustar Planta Nuclear** - Mejorar relación riesgo/recompensa
7. **Mejorar Sniper** - Aumentar impacto estratégico
8. **Ajustar Fábrica de Camiones** - Reducir dominancia logística

### Prioridad Baja (Considerar para Futuro)

9. **Revisar Límite de Mazos** - Evaluar si 700 es apropiado
10. **Ajustar Velocidades de Frentes** - Considerar asimetría avance/retroceso
11. **Revisar Consumo de Suministros** - Evaluar si es demasiado alto
12. **Mejorar Comando Especial** - Aumentar duración o radio

---

## Métricas para Validar Cambios

Después de implementar cambios, deberías trackear:

1. **Tiempo promedio de partida** - ¿Sigue siendo 5-15 minutos?
2. **Tasa de victoria por equipo** - ¿Player1 y Player2 ganan igual?
3. **Uso de unidades** - ¿Todas las unidades se usan regularmente?
4. **Mazos más populares** - ¿Hay variedad o un mazo domina?
5. **Currency generado por minuto** - ¿Es balanceado entre jugadores?
6. **Tasa de éxito de drones** - ¿Es 40-60% como objetivo?
7. **Impacto de efectos temporales** - ¿Tienen efecto medible?

---

**Última actualización:** Basado en análisis de documentación completa
**Próximos pasos:** Implementar cambios de prioridad alta y validar con métricas

