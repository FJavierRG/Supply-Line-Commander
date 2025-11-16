## Plan de Implementación: Fases por Tiempo + Comportamiento del Perfil Default

### 1. Integrar la noción de tiempo de partida en el análisis de estado

- [ ] **Añadir tiempo al estado analizado**  
  Extender `AIGameStateAnalyzer.analyzeState` para incluir `elapsedTime` (en segundos) y, si es útil, `elapsedMinutes`. Leer el tiempo de partida desde `gameState` (o añadir un campo `gameState.elapsedTime` que se actualice en el loop del juego).

- [ ] **Redefinir `getGamePhase` basado en tiempo**  
  Cambiar `getGamePhase(currency)` a una función basada en tiempo (`getGamePhase(elapsedTime, gameState)`). Definir fases principalmente por tiempo:  
  - Early: `0 – 210s` (0 – 3:30).  
  - Mid: `210 – 360s` (3:30 – 6:00).  
  - Late: `> 360s`.  
  Opcional: aplicar pequeños ajustes usando economía (por ejemplo, si en late no hay ninguna `nuclearPlant`, mantener una prioridad económica alta para construir alguna).

### 2. Ajustar el perfil Default para usar las nuevas fases

- [ ] **Usar `state.phase` como fuente de verdad**  
  Asegurarse de que todas las reglas de scoring que usan condiciones como `earlyPhase`, `notLate`, etc. se apoyan en `state.phase` calculado a partir del tiempo, no solo de la currency.

- [ ] **Definir reglas de comportamiento por fase**
  - Early (0–3:30): priorizar `truckFactory`, `engineerCenter` y el primer `fob` como núcleo de economía/logística; penalizar fuertemente `drone` para que prácticamente no se use en esta fase.  
  - Mid (3:30–6:00): seguir mejorando economía (`nuclearPlant` cuando sea viable), consolidar FOBs faltantes, dar peso significativo a `sniperStrike` y `fobSabotage` como herramientas de harass, permitir construir `droneLauncher` pero seguir penalizando el uso de `drone`.  
  - Late (>6:00): mantener economía y reconstruir edificios clave si se pierden, dar prioridad alta al uso de `drone` contra objetivos importantes (lanzaderas, plantas nucleares, economía), mantener uso activo de `sniperStrike` y `fobSabotage` como harass constante.

### 3. Introducir “presupuesto de consumibles” por fase

- [ ] **Definir límites de gasto en consumibles**  
  Añadir en el perfil default una configuración de presupuesto por fase, por ejemplo:  
  - Early: máximo ~20–25% de la currency actual para consumibles.  
  - Mid: máximo ~35–40%.  
  - Late: hasta ~50–60% si la economía está sana.

- [ ] **Aplicar el presupuesto en el selector de acciones**  
  Extender `AIActionSelector.selectBestAction` (o la capa que decide ejecutar consumibles) para que filtre acciones que rompan el presupuesto de consumibles de la fase, y priorice consumibles solo si, tras pagarlos, no deja a la IA sin margen para construir o reconstruir economía.

- [ ] **Rate-limit de harass en early**  
  Añadir un pequeño cooldown por tipo de consumible (por ejemplo, no más de un `sniperStrike` cada X segundos en early) y almacenar este cooldown en estado interno (`AISystem` o perfil), para evitar spam temprano.

### 4. Lógica de reacción a drones enemigos y defensa anti-dron

- [ ] **Detectar presión aérea enemiga en el analizador de estado**  
  Extender `AIGameStateAnalyzer` para detectar si el jugador está usando drones de forma significativa (por ejemplo, a través de flags en `gameState`, contadores de ataques recientes o presencia de `droneLauncher` enemigo y actividad asociada).

- [ ] **Dar bonus dinámico a `antiDrone` cuando haya amenaza aérea**  
  En el perfil default, añadir un bonus condicional al score de `antiDrone` cuando el estado indique presión de drones, aumentando la prioridad de construirlo si aún no existe.

- [ ] **Simular “error humano” con probabilidad dependiente de dificultad**  
  En la capa donde se decide ejecutar la acción (antes de `executeBuild`), aplicar una probabilidad de “fallar” la reacción de construir `antiDrone`. Hacer que esa probabilidad dependa de la dificultad (baja en fácil, media en normal, alta en difícil para reaccionar casi siempre).

### 5. Afinar la lógica de economía: `nuclearPlant` y reconstrucciones

- [ ] **Ajustar reglas de `nuclearPlant` a la nueva noción de fase**  
  En mid y late, aumentar el peso de construir plantas si el jugador tiene plantas y la IA tiene pocas propias, manteniendo la penalización por spam (`perMyPlant` negativo) para evitar sobre-construcción excesiva.

- [ ] **Sincronizar con el sistema de reparaciones**  
  Revisar `AIRepairManager.getBuildingPriority` para garantizar que `nuclearPlant`, `droneLauncher`, `antiDrone` y otros edificios económicos/defensivos críticos tienen prioridad alta de reparación, y asegurarse de que las decisiones del perfil no consumen tanto presupuesto que impidan reparaciones importantes.

### 6. Ajustar el sistema de suministro en función de dificultad (sin tocar la lógica base)

- [ ] **Mantener la lógica core de suministro**  
  Mantener el comportamiento de `AISupplyManager` y `AICoreSystem` que, cada cierto tiempo, revisan FOBs, frentes y helicópteros y envían lo que falta. No cambiar la lógica de “qué necesita suministro”, solo la frecuencia según dificultad.

- [ ] **Conectar dificultad con intervalos de suministro**  
  Usar `getAdjustedInterval` o configuración similar para que:  
  - Fácil: intervalos de supply más largos (reacción lenta).  
  - Media: intervalos medios.  
  - Difícil: intervalos más cortos (reacción casi inmediata).  
  Documentar esta relación en la configuración de IA para poder tunearla fácilmente.

### 7. Integración final y pruebas

- [ ] **Revisar `AISystem.handleStrategicBuilding` y `handleOffensiveDecision`**  
  Confirmar que ambas usan siempre `AIGameStateAnalyzer.analyzeState` (ya con fase basada en tiempo) y el perfil default para scoring, y que respetan presupuesto de consumibles, restricciones de fase (por ejemplo, no drones antes de 6:00) y condiciones especiales.

- [ ] **Diseñar pruebas dirigidas al comportamiento por fases**  
  Preparar escenarios de prueba (aunque sean manuales o basados en logs) para:  
  - Partida hasta 4 minutos: comprobar que predomina la construcción económica y el harass es ligero.  
  - Entre 4 y 6 minutos: comprobar aparición de snipers/sabotajes y comienzo de plantas/lanzaderas.  
  - Después de 6 minutos: comprobar uso regular de drones combinados con harass y mantenimiento de economía.  
  Incluir casos específicos donde el jugador spamea drones para validar la reacción defensiva (`antiDrone`) y la influencia de la dificultad en esa reacción.


