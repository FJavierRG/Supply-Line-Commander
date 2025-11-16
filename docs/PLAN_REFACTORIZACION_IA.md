# Plan de Refactorización: Sistema de Perfiles de IA Basado en Mazos

## 📋 Objetivo
Refactorizar la IA para usar un sistema de perfiles basado en mazos, empezando con el mazo por defecto, manteniendo la lógica común (abastecimiento, emergencias, reparaciones) separada y permitiendo crear perfiles con comportamientos específicos.

---

## 🎯 Visión General

### Problema Actual
La IA actual tiene varios problemas:
- **Lógica hardcodeada**: Las decisiones están mezcladas con la lógica de ejecución
- **No usa mazos**: La IA no respeta el sistema de mazos del juego, tiene acceso a todas las cartas
- **Difícil de extender**: Crear nuevos comportamientos requiere modificar código existente
- **Código duplicado**: La lógica de abastecimiento, emergencias, etc. está mezclada con decisiones estratégicas
- **No hay perfiles**: No existe un sistema para crear diferentes "personalidades" de IA con comportamientos distintos

### Solución Propuesta
Crear un sistema modular por capas que separe responsabilidades y permita crear perfiles de IA basados en mazos:

1. **Capa 1 - Lógica Común (Core)**: Abastecimiento, emergencias médicas y reparaciones
   - Lógica que se repite independientemente del mazo
   - Reutilizable para todos los perfiles
   - No conoce cartas ni mazos

2. **Adaptador de Configuración**: Lee metadata desde `SERVER_NODE_CONFIG`
   - No duplica datos
   - Proporciona acceso unificado a costes, requisitos, etc.
   - Fuente única de verdad

3. **Sistema de Evaluación Genérico**: Evalúa cartas sin conocer detalles específicos
   - Analiza estado del juego
   - Evalúa cartas del mazo usando reglas del perfil
   - Calcula scores y prioriza acciones

4. **Perfiles de IA**: Define mazo y reglas de comportamiento
   - Cada perfil tiene su mazo de cartas
   - Define reglas de scoring específicas
   - Fácil de crear nuevos perfiles

### Arquitectura en Capas

```
┌─────────────────────────────────────────┐
│  CAPA 3: Perfiles de IA (Deck Profiles) │  ← Define mazo + reglas específicas
├─────────────────────────────────────────┤
│  CAPA 2: Sistema de Evaluación Genérico │  ← Evalúa cartas usando adaptador
├─────────────────────────────────────────┤
│  ADAPTADOR: Acceso a Config Existente   │  ← Lee SERVER_NODE_CONFIG (sin duplicar)
├─────────────────────────────────────────┤
│  CAPA 1: Lógica Común (Core)            │  ← Abastecimiento, emergencias, reparaciones
└─────────────────────────────────────────┘
```

### Flujo de Decisión

1. **AICoreSystem** ejecuta lógica común (abastecimiento, emergencias, reparaciones)
2. **AISystem** llama al perfil activo para decisiones estratégicas
3. **Perfil** usa el evaluador genérico con su mazo y reglas
4. **Evaluador** verifica requisitos, calcula scores, prioriza acciones
5. **AISystem** ejecuta la mejor acción usando el handler correspondiente

### Ventajas del Nuevo Sistema

- ✅ **No duplica datos**: Usa `SERVER_NODE_CONFIG` como fuente única
- ✅ **No repite lógica**: Abastecimiento, emergencias y reparaciones centralizados
- ✅ **Fácil de extender**: Nuevo perfil = nuevo archivo con mazo + reglas
- ✅ **Modular**: Cada capa tiene responsabilidades claras
- ✅ **Mantenible**: Cambios en cartas se hacen en un solo lugar
- ✅ **Respeta mazos**: La IA solo usa cartas de su mazo
- ✅ **Comportamientos ricos**: Cada perfil puede tener su propia personalidad

### Enfoque de Implementación

- **Migración gradual**: No romper funcionalidad existente
- **Testing continuo**: Probar cada fase antes de continuar
- **Empezar simple**: Implementar primero el mazo por defecto
- **Extensibilidad**: Estructura preparada para futuros perfiles

---

## ✅ Fase 1: Crear Capa 1 - Lógica Común (Core)

### 1.1 Extraer Lógica de Abastecimiento
- [x] Crear archivo `server/game/ai/core/AISupplyManager.js`
  
  Crear un nuevo archivo que contendrá toda la lógica relacionada con el abastecimiento de la IA. Este archivo será una clase que se instanciará desde el sistema core.

- [x] Implementar método `ruleResupplyFOBs(team)`
  
  Este método debe revisar todos los FOBs del equipo y verificar si tienen suministros por debajo del umbral (50% por defecto). Para cada FOB que necesite suministros, debe enviar un convoy desde el HQ. Debe ejecutarse periódicamente (cada 2 segundos).

- [x] Implementar método `ruleResupplyFronts(team)`
  
  Este método debe revisar todos los frentes del equipo y verificar si tienen suministros por debajo del umbral (70% por defecto). Para cada frente que necesite suministros, debe encontrar el FOB más cercano con recursos disponibles y enviar un convoy desde ese FOB al frente. Debe ejecutarse periódicamente (cada 3 segundos).

- [x] Implementar método `ruleResupplyHelicopters(team)`
  
  Este método debe gestionar el reabastecimiento usando helicópteros. Debe enviar helicópteros llenos desde HQ o Bases Aéreas hacia los frentes, y regresar helicópteros vacíos a las bases para recargar. Debe ejecutarse periódicamente (cada 1.5 segundos).

- [x] Implementar método `sendSupplyConvoy(from, to, team)`
  
  Este método debe crear y enviar un convoy de suministros desde un nodo origen hacia un nodo destino. Debe verificar que haya vehículos disponibles en el origen, crear el convoy usando el sistema de convoyes del juego, y emitir los eventos correspondientes para que el cliente se entere.

- [x] Implementar método `findClosestFOBWithResources(targetNode, fobs)`
  
  Este método debe encontrar el FOB más cercano a un nodo objetivo que tenga vehículos disponibles y suministros suficientes. Debe calcular distancias y retornar el FOB más cercano que cumpla las condiciones, o null si no hay ninguno disponible.

- [x] Migrar lógica desde `AISystem.ruleResupplyFOBs()`
  
  Copiar la lógica existente del método `ruleResupplyFOBs()` en `AISystem.js` al nuevo `AISupplyManager`, adaptándola para que funcione como método de instancia de la clase.

- [x] Migrar lógica desde `AISystem.ruleResupplyFronts()`
  
  Copiar la lógica existente del método `ruleResupplyFronts()` en `AISystem.js` al nuevo `AISupplyManager`, adaptándola para que funcione como método de instancia de la clase.

- [x] Migrar lógica desde `AISystem.ruleResupplyHelicopters()`
  
  Copiar la lógica existente del método `ruleResupplyHelicopters()` en `AISystem.js` al nuevo `AISupplyManager`, adaptándola para que funcione como método de instancia de la clase.

- [ ] Probar que el abastecimiento funciona correctamente
  
  Verificar que los convoyes se envían correctamente desde HQ a FOBs, desde FOBs a frentes, y que los helicópteros se gestionan adecuadamente. Debe funcionar igual que antes de la migración.

### 1.2 Extraer Lógica de Emergencias Médicas
- [x] Crear archivo `server/game/ai/core/AIMedicalManager.js`
  
  Crear un nuevo archivo que contendrá toda la lógica relacionada con las emergencias médicas de la IA. Este archivo será una clase que se instanciará desde el sistema core.

- [x] Implementar método `handleMedicalEmergencies(team, currency)`
  
  Este método debe revisar si hay emergencias médicas activas para el equipo (frentes con bajas que requieren ambulancias). Si hay emergencias y hay ambulancias disponibles en el HQ o en un hospital, debe enviar una ambulancia a la primera emergencia encontrada. Debe ejecutarse periódicamente (cada 3 segundos) y tener una probabilidad de respuesta (70% por defecto).

- [x] Implementar método `findEmergencyFronts(team)`
  
  Este método debe buscar en el sistema de emergencias médicas del juego todos los frentes del equipo que tengan emergencias activas y no resueltas. Debe retornar una lista de objetos con el frente y la información de la emergencia.

- [x] Migrar lógica desde `AISystem.handleMedicalEmergencies()`
  
  Copiar la lógica existente del método `handleMedicalEmergencies()` en `AISystem.js` al nuevo `AIMedicalManager`, adaptándola para que funcione como método de instancia de la clase.

- [ ] Probar que las emergencias médicas se resuelven correctamente
  
  Verificar que cuando hay frentes con bajas, la IA envía ambulancias desde el HQ o hospital para resolver las emergencias. Debe funcionar igual que antes de la migración.

### 1.3 Crear Lógica de Reparaciones
- [x] Crear archivo `server/game/ai/core/AIRepairManager.js`
  
  Crear un nuevo archivo que contendrá toda la lógica relacionada con las reparaciones de edificios rotos de la IA. Este archivo será una clase que se instanciará desde el sistema core.

- [x] Implementar método `handleRepairs(team, currency)`
  
  Este método debe revisar si hay edificios del equipo que estén en estado "roto" (broken). Si hay edificios rotos y hay vehículos mecánicos disponibles en el HQ, debe enviar un vehículo de reparación al edificio roto más prioritario. Debe ejecutarse periódicamente (cada 3-5 segundos).

- [x] Implementar método `findBrokenBuildings(team)`
  
  Este método debe buscar en el gameState todos los edificios del equipo que tengan la propiedad `broken` en `true`. Debe filtrar solo edificios que sean reparables (no FOBs ni HQs) y retornar una lista ordenada por prioridad (edificios más importantes primero).

- [x] Implementar método `sendRepairVehicle(hq, target, team)`
  
  Este método debe crear y enviar un vehículo mecánico desde el HQ hacia un edificio roto. Debe verificar que haya vehículos de reparación disponibles en el HQ, crear el convoy de reparación usando el sistema de convoyes del juego, y emitir los eventos correspondientes.

- [x] Integrar con sistema de vehículos mecánicos existente
  
  Asegurarse de que el sistema de reparaciones use correctamente el sistema de vehículos mecánicos que ya existe en el juego. Debe verificar `availableRepairVehicles` y `maxRepairVehicles` en el HQ, y usar el handler de convoyes con el tipo de vehículo correcto.

- [ ] Probar que las reparaciones funcionan correctamente
  
  Verificar que cuando hay edificios rotos, la IA envía vehículos mecánicos desde el HQ para repararlos. Los edificios deben quedar funcionales después de la reparación. Debe funcionar de forma similar al sistema de ambulancias.

### 1.4 Crear Sistema Core
- [x] Crear archivo `server/game/ai/core/AICoreSystem.js`
  
  Crear un nuevo archivo que será el sistema central que orquesta toda la lógica común de la IA. Este sistema coordinará los diferentes managers (abastecimiento, emergencias, reparaciones).

- [x] Implementar constructor que recibe `gameState`, `io`, `roomId`
  
  El constructor debe recibir las dependencias necesarias: el estado del juego, el objeto de Socket.IO para emitir eventos, y el ID de la sala. Debe inicializar los managers y los timers necesarios.

- [x] Crear instancias de `AISupplyManager`, `AIMedicalManager`, `AIRepairManager`
  
  En el constructor, crear instancias de cada uno de los managers pasándoles las dependencias necesarias (gameState, io, roomId). Estos managers se usarán desde el método update.

- [x] Implementar método `update(dt)` que orquesta los managers
  
  Este método debe ser llamado cada frame/tick del juego. Debe actualizar los timers internos y llamar a los métodos correspondientes de cada manager según sus intervalos. Debe gestionar los timers para abastecimiento (cada 2s, 3s, 1.5s), emergencias (cada 3s), y reparaciones (cada 3-5s).

- [x] Implementar método `updateCurrency(dt)`
  
  Este método debe actualizar el tracking interno de currency de la IA. Debe leer el currency actual del gameState y almacenarlo para uso en las decisiones. Puede incluir logging si está habilitado el debug.

- [x] Gestionar timers e intervalos comunes
  
  El sistema core debe mantener timers internos para cada tipo de acción (abastecimiento FOBs, frentes, helicópteros, emergencias, reparaciones). Debe usar los intervalos configurados y ajustados por dificultad.

- [ ] Probar que el sistema core funciona correctamente
  
  Verificar que el sistema core se inicializa correctamente, que los managers se crean, y que el método update se ejecuta y llama a los managers en los intervalos correctos. Debe funcionar como un orquestador central.

---

## ✅ Fase 2: Crear Adaptador de Configuración

### 2.1 Crear AICardAdapter
- [x] Crear archivo `server/game/ai/core/AICardAdapter.js`
  
  Crear un nuevo archivo que será un adaptador estático para leer información de cartas desde la configuración del servidor. Este adaptador NO duplica datos, solo lee desde `SERVER_NODE_CONFIG`.

- [x] Implementar método `getCost(cardId)` → Lee `SERVER_NODE_CONFIG.costs[cardId]`
  
  Este método debe leer el coste de una carta desde la configuración del servidor. Debe retornar el coste numérico o null si la carta no existe o no tiene coste definido. No debe duplicar esta información.

- [x] Implementar método `getRequirements(cardId)`
  
  Este método debe retornar un array con todos los requisitos (directos e indirectos) que necesita una carta para poder usarse. Debe retornar un array vacío si no hay requisitos, o null si la carta no existe.
  
  - [x] Leer requisitos directos desde `SERVER_NODE_CONFIG.buildRequirements`
    
    Leer los requisitos de construcción que están definidos en la configuración. Por ejemplo, `deadlyBuild` requiere `['nuclearPlant', 'secretLaboratory', 'physicStudies']`.
  
  - [x] Añadir requisitos indirectos:
    
    Añadir requisitos que no están en buildRequirements pero que son necesarios para usar ciertos consumibles. Estos requisitos deben estar hardcodeados en el método ya que son reglas de juego.
    
    - [x] `drone` → `['droneLauncher']`
      
      Un dron requiere tener una lanzadera de drones construida para poder usarse.
    
    - [x] `specopsCommando` → `['intelCenter']`
      
      Un comando especial requiere tener un centro de inteligencia construido.
    
    - [x] `fobSabotage` → `['intelCenter']` (verificar en código)
      
      El sabotaje de FOB requiere tener un centro de inteligencia. Verificar en el código del CombatHandler si este requisito es correcto.
    
    - [x] Añadir más según sea necesario
      
      Revisar otros consumibles y añadir sus requisitos indirectos si los tienen. Añadidos: cameraDrone → droneLauncher, truckAssault → intelCenter.

- [x] Implementar método `isInDeck(cardId, deck)` → Verifica `deck.units`
  
  Este método debe verificar si una carta específica está disponible en el mazo del jugador. Debe buscar en el array `deck.units` y retornar true si la encuentra, false en caso contrario. También verifica en `deck.bench`.

- [x] Implementar método `isEnabled(cardId)` → Lee `SERVER_NODE_CONFIG.gameplay.enabled[cardId]`
  
  Este método debe verificar si una carta está habilitada en el juego. Debe leer desde la configuración del servidor y retornar true si está habilitada, false si está deshabilitada, o null si no existe.

- [ ] Probar que el adaptador lee correctamente la configuración
  
  Verificar que todos los métodos retornan los valores correctos leyendo desde `SERVER_NODE_CONFIG`. Debe funcionar para diferentes cartas (edificios y consumibles) y retornar null o valores por defecto cuando corresponda.

---

## ✅ Fase 3: Crear Sistema de Evaluación Genérico

### 3.1 Crear Analizador de Estado
- [x] Crear archivo `server/game/ai/core/AIGameStateAnalyzer.js`
  
  Crear un nuevo archivo que contendrá la lógica para analizar el estado actual del juego desde la perspectiva de la IA. Este analizador será usado por el evaluador de cartas para tomar decisiones.

- [x] Implementar método `analyzeState(team, gameState)`
  
  Este método debe analizar el estado completo del juego y retornar un objeto con toda la información relevante para la toma de decisiones de la IA. Debe ser un método estático o de instancia que reciba el equipo y el gameState.
  
  - [x] Calcular fase del juego (`early`, `mid`, `late`)
    
    Determinar en qué fase del juego se encuentra basándose en el currency actual. Early: < 200, Mid: 200-400, Late: > 400.
  
  - [x] Contar FOBs propios
    
    Contar cuántos FOBs tiene el equipo que estén construidos y activos.
  
  - [x] Contar plantas nucleares propias
    
    Contar cuántas plantas nucleares tiene el equipo que estén construidas y activas.
  
  - [x] Contar plantas nucleares del jugador
    
    Contar cuántas plantas nucleares tiene el jugador enemigo para evaluar amenazas y urgencias.
  
  - [x] Verificar si tiene lanzadera
    
    Verificar si el equipo tiene al menos una lanzadera de drones construida y activa.
  
  - [x] Obtener currency actual
    
    Obtener el currency actual del equipo desde el gameState.
  
  - [x] Retornar objeto con estado completo
    
    Retornar un objeto con todas las propiedades calculadas: `{ phase, myFOBs, myPlants, playerPlants, hasLauncher, currency, ... }`

- [x] Implementar método `getGamePhase(currency)` → `'early' | 'mid' | 'late'`
  
  Este método helper debe calcular la fase del juego basándose únicamente en el currency. Debe retornar 'early', 'mid' o 'late' según los umbrales definidos.

- [ ] Probar que el análisis de estado es correcto
  
  Verificar que el método analyzeState retorna valores correctos para diferentes situaciones del juego. Debe contar correctamente los edificios, determinar la fase correcta, y detectar correctamente las amenazas del jugador.

### 3.2 Crear Evaluador de Cartas
- [x] Crear archivo `server/game/ai/core/AICardEvaluator.js`
  
  Crear un nuevo archivo que contendrá la lógica para evaluar cartas y calcular sus scores. Este evaluador será genérico y usará las reglas de scoring del perfil activo.

- [x] Implementar método `evaluateCard(cardId, gameState, team, currency, state, scoringRules)`
  
  Este método debe evaluar una carta individual y calcular su score de prioridad. Debe retornar un objeto con la información de la acción o null si la carta no está disponible.
  
  - [x] Verificar si está en mazo (`AICardAdapter.isInDeck()`)
    
    Primero verificar que la carta esté en el mazo del jugador. Si no está, retornar null inmediatamente.
  
  - [x] Verificar requisitos (`AICardAdapter.getRequirements()` → retorna `null` si faltan)
    
    Obtener los requisitos de la carta y verificar que el equipo tenga todos los edificios requeridos construidos y activos. Si faltan requisitos, retornar null.
  
  - [x] Verificar coste (`AICardAdapter.getCost()`)
    
    Obtener el coste de la carta y verificar que el equipo tenga suficiente currency. Si no tiene suficiente, retornar null.
  
  - [x] Calcular score base (desde `scoringRules` del perfil)
    
    Obtener el score base de la carta desde las reglas de scoring del perfil. Si la carta no tiene reglas definidas, usar un score por defecto o retornar null.
  
  - [x] Aplicar bonificaciones del perfil
    
    Aplicar todas las bonificaciones definidas en las reglas del perfil. Las bonificaciones pueden depender del estado del juego (fase, cantidad de edificios, amenazas, etc.). Sumar o restar valores al score base según las condiciones.
  
  - [x] Retornar `{ type, cardId, score, cost }` o `null`
    
    Retornar un objeto con el tipo de acción ('build' para edificios, 'attack' o el tipo correspondiente para consumibles), el ID de la carta, el score calculado, y el coste. Si la carta no está disponible, retornar null.

- [x] Implementar método `evaluateDeck(deck, gameState, team, currency, state, scoringRules)`
  
  Este método debe evaluar todas las cartas del mazo y retornar una lista ordenada de acciones disponibles.
  
  - [x] Iterar sobre `deck.units`
    
    Recorrer todas las cartas que están en el mazo del jugador.
  
  - [x] Evaluar cada carta
    
    Para cada carta, llamar a `evaluateCard()` para obtener su score y disponibilidad.
  
  - [x] Filtrar `null` (cartas no disponibles)
    
    Eliminar de la lista todas las cartas que retornaron null (no disponibles, sin requisitos, sin currency, etc.).
  
  - [x] Ordenar por score descendente
    
    Ordenar las acciones restantes por score de mayor a menor, para que las acciones más prioritarias estén primero.
  
  - [x] Retornar lista de acciones evaluadas
    
    Retornar el array ordenado de acciones que están disponibles y pueden ejecutarse.

- [ ] Probar que la evaluación funciona correctamente
  
  Verificar que las cartas se evalúan correctamente, que los requisitos se verifican, que los scores se calculan bien, y que la lista se ordena correctamente. Debe funcionar para diferentes estados del juego y diferentes mazos.

### 3.3 Crear Selector de Acciones
- [x] Crear archivo `server/game/ai/core/AIActionSelector.js`
  
  Crear un nuevo archivo que contendrá la lógica para seleccionar la mejor acción de una lista de acciones evaluadas. Este selector será simple pero necesario para separar responsabilidades.

- [x] Implementar método `selectBestAction(evaluatedActions, currency)`
  
  Este método debe seleccionar la mejor acción de una lista de acciones ya evaluadas, teniendo en cuenta el currency disponible.
  
  - [x] Filtrar acciones que se puedan pagar
    
    Filtrar la lista de acciones para quedarse solo con aquellas cuyo coste sea menor o igual al currency disponible. Esto es importante porque el currency puede haber cambiado desde que se evaluaron las cartas.
  
  - [x] Retornar mejor acción (mayor score)
    
    De las acciones que se pueden pagar, retornar la que tenga el mayor score. Si la lista ya está ordenada por score descendente, simplemente retornar la primera. Si no hay acciones disponibles, retornar null.

- [ ] Probar que la selección funciona correctamente
  
  Verificar que el método filtra correctamente las acciones por currency, que selecciona la acción con mayor score, y que retorna null cuando no hay acciones disponibles. Debe funcionar con diferentes listas de acciones y diferentes cantidades de currency.

---

## ✅ Fase 4: Crear Perfil de Mazo por Defecto

### 4.1 Crear Clase Base de Perfil
- [x] Crear archivo `server/game/ai/profiles/BaseProfile.js`
  
  Crear un nuevo archivo que contendrá la clase base para todos los perfiles de IA. Esta clase definirá la interfaz común que todos los perfiles deben implementar.

- [x] Implementar clase `BaseProfile`
  
  Crear una clase base (o abstracta) que defina la estructura común de todos los perfiles. Esta clase debe tener un constructor que reciba el mazo del perfil y almacenarlo.

- [x] Implementar método `getProfileId()` → Retorna ID del perfil
  
  Este método debe retornar un identificador único del perfil (por ejemplo, 'default', 'aggressive', 'defensive', etc.). Este ID se usará para identificar qué perfil está activo.

- [x] Implementar método `getDeck()` → Retorna mazo del perfil
  
  Este método debe retornar el objeto del mazo que está asociado a este perfil. El mazo debe tener la estructura estándar con `units` y `bench`.

- [x] Implementar método abstracto `getScoringRules()` → Retorna reglas de scoring
  
  Este método debe ser abstracto (o lanzar error si no se implementa) y debe retornar un objeto con las reglas de scoring para cada carta. Cada perfil implementará sus propias reglas según su estrategia.

- [x] Implementar método abstracto `getPriorities()` → Retorna prioridades por fase
  
  Este método debe ser abstracto (o lanzar error si no se implementa) y debe retornar un objeto con las prioridades del perfil para cada fase del juego (early, mid, late). Cada perfil puede tener diferentes prioridades.

- [ ] Probar que la clase base funciona correctamente
  
  Verificar que la clase se puede instanciar (aunque sea abstracta), que los métodos comunes funcionan, y que los métodos abstractos lanzan errores cuando se intentan usar sin implementar. Debe servir como contrato para los perfiles.

### 4.2 Crear Perfil de Mazo por Defecto
- [x] Crear archivo `server/game/ai/profiles/DefaultDeckProfile.js`
  
  Crear un nuevo archivo que contendrá la implementación del perfil para el mazo por defecto. Este será el primer perfil implementado y servirá como referencia para futuros perfiles.

- [x] Extender `BaseProfile`
  
  La clase `DefaultDeckProfile` debe extender `BaseProfile` para heredar los métodos comunes y cumplir con la interfaz definida.

- [x] Implementar constructor que carga `DEFAULT_DECK` desde servidor
  
  El constructor debe recibir el mazo (que puede ser el DEFAULT_DECK del servidor o un mazo personalizado) y pasarlo al constructor de la clase base. Debe establecer el profileId como 'default'.

- [x] Implementar método `getScoringRules()` con reglas específicas:
  
  Este método debe retornar un objeto con las reglas de scoring para cada carta del mazo por defecto. Las reglas definen el score base y las bonificaciones que se aplican según el contexto del juego.
  
  - [x] `fob`: `{ base: 40, bonuses: { hasLessThan2: 30, earlyPhase: 20 } }`
    
    FOB tiene score base 40. Si tiene menos de 2 FOBs, +30. Si está en fase early, +20.
  
  - [x] `nuclearPlant`: `{ base: 50, bonuses: { perPlayerPlant: 30, perMyPlant: -25 } }`
    
    Planta nuclear tiene score base 50. Por cada planta del jugador, +30 (urgencia). Por cada planta propia, -25 (evitar spam).
  
  - [x] `droneLauncher`: `{ base: 60 }`
    
    Lanzadera de drones tiene score base 60, sin bonificaciones adicionales.
  
  - [x] `antiDrone`: `{ base: 30 }`
    
    Anti-dron tiene score base 30, sin bonificaciones adicionales.
  
  - [x] `truckFactory`: `{ base: 45, bonuses: { notLate: 15 } }`
    
    Fábrica de camiones tiene score base 45. Si NO está en fase late, +15.
  
  - [x] `engineerCenter`: `{ base: 40, bonuses: { earlyPhase: 10 } }`
    
    Centro de ingenieros tiene score base 40. Si está en fase early, +10.
  
  - [x] `intelRadio`: `{ base: 35 }` (ajustar según balance)
    
    Radio de inteligencia tiene score base 35. Ajustar según el balance del juego.
  
  - [x] `drone`: `{ base: 65, bonuses: { hasTargets: 40 } }`
    
    Dron tiene score base 65. Si hay objetivos disponibles (plantas, hospitales, FOBs del jugador), +40.
  
  - [x] `sniperStrike`: `{ base: 30 }`
    
    Ataque de francotirador tiene score base 30, con bonus base de +20.

- [x] Implementar método `getPriorities()` con prioridades por fase
  
  Este método debe retornar un objeto con las prioridades del perfil para cada fase. Por ejemplo, en early game priorizar FOBs y fábricas, en mid game priorizar plantas y lanzaderas, etc. Esto puede usarse para ajustar scores o filtrar acciones.

- [x] Implementar método `evaluateStrategicActions(gameState, team, currency, state)`
  
  Este método debe evaluar todas las cartas del mazo y retornar las acciones estratégicas disponibles (construcciones principalmente).
  
  - [x] Usar `AICardEvaluator.evaluateDeck()` con el mazo y reglas
    
    Llamar al evaluador genérico pasándole el mazo del perfil, el estado del juego, y las reglas de scoring de este perfil.
  
  - [x] Retornar lista de acciones evaluadas
    
    Retornar la lista de acciones que el evaluador calculó, ya ordenadas por score.

- [ ] Probar que el perfil funciona correctamente
  
  Verificar que el perfil se crea correctamente, que las reglas de scoring se aplican bien, que el método evaluateStrategicActions retorna acciones válidas, y que las prioridades se respetan. Debe funcionar con el mazo por defecto del juego.

---

## ✅ Fase 5: Refactorizar AISystem

### 5.1 Integrar Capa 1 (Core)
- [x] Modificar `server/game/managers/AISystem.js`
  
  Modificar el archivo existente de AISystem para integrar el nuevo sistema core. Esto implica eliminar código duplicado y delegar responsabilidades al core.

- [x] Crear instancia de `AICoreSystem` en constructor
  
  En el constructor de AISystem, crear una instancia de AICoreSystem pasándole gameState, io, roomId, raceId y difficulty. Esta instancia se usará para toda la lógica común.

- [x] Delegar abastecimiento a `AICoreSystem` en `update()`
  
  En el método update de AISystem, eliminar las llamadas a los métodos de abastecimiento propios y en su lugar llamar al método update del AICoreSystem, que se encargará de todo el abastecimiento.

- [x] Delegar emergencias médicas a `AICoreSystem` en `update()`
  
  Eliminar la lógica de emergencias médicas de AISystem y dejar que AICoreSystem la maneje. El core se encargará de detectar y resolver emergencias.

- [x] Delegar reparaciones a `AICoreSystem` en `update()`
  
  Eliminar cualquier lógica de reparaciones de AISystem (si existe) y dejar que AICoreSystem la maneje. El core se encargará de detectar edificios rotos y enviar vehículos de reparación.

- [x] Mantener timers e intervalos en `AISystem` (o mover a Core según diseño)
  
  Decidir si los timers e intervalos para decisiones estratégicas y ofensivas se mantienen en AISystem o se mueven al Core. Probablemente se mantengan en AISystem ya que son específicos de la toma de decisiones, no de la lógica común. Los timers del core están en AICoreSystem.

- [ ] Probar que la integración funciona correctamente
  
  Verificar que después de la integración, el abastecimiento, emergencias y reparaciones siguen funcionando igual que antes. No debe haber regresiones en la funcionalidad.

### 5.2 Integrar Sistema de Perfiles
- [x] Modificar `server/game/managers/AISystem.js`
  
  Modificar AISystem para usar el sistema de perfiles en lugar de la lógica hardcodeada de evaluación de acciones.

- [x] Crear instancia del perfil activo en constructor
  
  En el constructor, obtener el mazo del jugador IA y crear el perfil correspondiente. Por ahora solo habrá DefaultDeckProfile, pero la estructura debe permitir fácilmente añadir más perfiles en el futuro.
  
  - [x] Obtener mazo desde `gameState.getPlayerDeck('player2')`
    
    Obtener el mazo del jugador IA desde el gameState. Este mazo contiene las cartas disponibles para la IA. Si no hay mazo, usar DEFAULT_DECK como fallback.
  
  - [x] Crear `DefaultDeckProfile` con el mazo
    
    Crear una instancia de DefaultDeckProfile pasándole el mazo obtenido. Esta instancia se usará para todas las decisiones estratégicas y ofensivas.

- [x] Reemplazar `handleStrategicBuilding()` para usar perfil
  
  Modificar el método handleStrategicBuilding para que use el sistema de perfiles en lugar de la lógica hardcodeada.
  
  - [x] Usar `profile.evaluateStrategicActions()` en lugar de `evaluateActions()`
    
    En lugar de llamar al método evaluateActions propio, llamar al método evaluateStrategicActions del perfil activo. Este método retornará las acciones evaluadas usando el mazo del perfil.
  
  - [x] Usar `AIActionSelector.selectBestAction()` para elegir acción
    
    De las acciones evaluadas por el perfil, usar el selector para elegir la mejor acción que se pueda pagar con el currency disponible.

- [x] Reemplazar `handleOffensiveDecision()` para usar perfil
  
  Modificar el método handleOffensiveDecision para que use el sistema de perfiles para evaluar consumibles.
  
  - [x] Usar `AICardEvaluator.evaluateDeck()` para consumibles
    
    Evaluar todas las cartas del mazo usando el evaluador genérico, pero filtrar solo las que sean consumibles (no edificios).
  
  - [x] Filtrar solo consumibles del mazo
    
    De las acciones evaluadas, quedarse solo con las que corresponden a consumibles (drones, snipers, etc.) y no con edificios.

- [ ] Probar que las decisiones estratégicas usan el mazo correctamente
  
  Verificar que la IA solo construye edificios que están en su mazo, que respeta las reglas de scoring del perfil, y que las decisiones son coherentes con el mazo seleccionado.

- [ ] Probar que las decisiones ofensivas usan el mazo correctamente
  
  Verificar que la IA solo usa consumibles que están en su mazo, que respeta las reglas de scoring del perfil, y que las decisiones son coherentes con el mazo seleccionado.

### 5.3 Actualizar AIActionHandler
- [x] Modificar `server/game/handlers/AIActionHandler.js`
  
  Expandir el AIActionHandler para que pueda ejecutar todos los tipos de consumibles que están en el mazo, no solo drones y snipers.

- [x] Expandir método `executeAttack()` para más tipos de consumibles
  
  El método executeAttack actualmente solo maneja 'drone' y 'sniper'. Debe expandirse para manejar todos los tipos de consumibles: artillery, cameraDrone, fobSabotage, specopsCommando, truckAssault, lightVehicle.

- [x] Añadir método `executeArtillery(team)`
  
  Crear un método específico para ejecutar ataques de artillería. La artillería requiere una posición (x, y) en el mapa, no un objetivo específico.
  
  - [x] Encontrar objetivo prioritario
    
    Calcular una posición estratégica donde lanzar la artillería. Debe buscar un área con múltiples edificios enemigos para maximizar el daño.
  
  - [x] Llamar a `gameState.handleArtilleryLaunch()`
    
    Llamar al handler correspondiente del gameState pasando la posición calculada. Este handler se encargará de crear el ataque de artillería.

- [x] Añadir método `executeCameraDrone(team)`
  
  Crear un método específico para desplegar drones cámara. Los drones cámara se despliegan en una posición del mapa.
  
  - [x] Calcular posición estratégica
    
    Calcular una posición estratégica donde desplegar el dron cámara. Debe ser en territorio enemigo o cerca de él para obtener información.
  
  - [x] Llamar a `gameState.handleCameraDroneDeploy()`
    
    Llamar al handler correspondiente del gameState pasando la posición calculada. Este handler se encargará de crear el dron cámara.

- [x] Añadir método `executeFobSabotage(team)`
  
  Crear un método específico para ejecutar sabotajes de FOB. Los sabotajes requieren un FOB objetivo específico.
  
  - [x] Encontrar FOB objetivo
    
    Buscar FOBs enemigos y seleccionar uno prioritario (el más cercano, el que tiene más suministros, etc.).
  
  - [x] Llamar a `gameState.handleFobSabotage()`
    
    Llamar al handler correspondiente del gameState pasando el ID del FOB objetivo. Este handler se encargará de aplicar el efecto de sabotaje.

- [x] Añadir método `executeSpecopsCommando(team)`
  
  Crear un método específico para desplegar comandos especiales. Los comandos se despliegan en una posición del mapa.
  
  - [x] Calcular posición estratégica
    
    Calcular una posición estratégica donde desplegar el comando. Debe ser cerca de edificios enemigos importantes para deshabilitarlos.
  
  - [x] Llamar a handler correspondiente
    
    Llamar al handler correspondiente del gameState pasando la posición calculada. Este handler se encargará de crear el comando especial.

- [x] Añadir método `executeTruckAssault(team)`
  
  Crear un método específico para desplegar truck assault. Similar a specopsCommando pero para atacar convoyes.

- [x] Añadir método `executeLightVehicle(team)`
  
  Crear un método específico para ejecutar ataques de artillado ligero. Requiere un objetivo específico.

- [x] Actualizar `executeAttack()` para enrutar a métodos específicos
  
  Modificar el método executeAttack para que, según el cardId de la acción, enrute a los métodos específicos correspondientes. Usa un switch que llama al método correcto.

- [ ] Probar que todos los consumibles se ejecutan correctamente
  
  Verificar que cada tipo de consumible se ejecuta correctamente cuando la IA decide usarlo. Debe funcionar igual que cuando un jugador humano usa esos consumibles.

---

## ✅ Fase 6: Migración y Limpieza

### 6.1 Migrar Configuración Antigua
- [x] Modificar `server/game/ai/config/RaceAIConfig.js`
  
  Limpiar el archivo de configuración antigua, eliminando lo que se ha migrado a perfiles y manteniendo solo lo que sigue siendo necesario.

- [x] Simplificar `RACE_AI_CONFIG` (mantener solo intervalos y umbrales)
  
  Simplificar el objeto RACE_AI_CONFIG eliminando `buildings`, `consumables`, `buildingScores` y `attackScores` ya que ahora están en los perfiles. Mantener solo `intervals` y `thresholds` que todavía se usan.

- [x] Mantener `DIFFICULTY_MULTIPLIERS` y funciones de ajuste
  
  El archivo mantiene los multiplicadores de dificultad y las funciones que ajustan valores según la dificultad. Todo lo relacionado con scores y cartas disponibles se ha movido a perfiles.

- [x] Marcar `getAdjustedScore()` como obsoleto
  
  Marcar esta función como obsoleta ya que los scores ahora se obtienen desde los perfiles de mazo. Se mantiene por compatibilidad con métodos obsoletos pero retorna null y muestra un warning.

- [x] Mantener funciones necesarias:
  
  Mantener las funciones de utilidad que ajustan valores según la dificultad, ya que siguen siendo útiles para el sistema de perfiles.
  
  - [x] `getDifficultyMultipliers()`
    
    Mantener esta función que retorna los multiplicadores de dificultad (easy, medium, hard). Se sigue usando para ajustar intervalos y umbrales.
  
  - [x] `getAdjustedInterval()`
    
    Mantener esta función que ajusta intervalos según la raza (ahora perfil) y dificultad. Se sigue usando para los timers de la IA.
  
  - [x] `getAdjustedScore()` (marcado como obsoleto)
    
    Marcado como obsoleto ya que los perfiles manejan sus propios scores. Se mantiene por compatibilidad pero retorna null.
  
  - [x] `getAdjustedThreshold()`
    
    Mantener esta función que ajusta umbrales según la raza (ahora perfil) y dificultad. Se sigue usando para umbrales de currency y suministros.

- [x] Actualizar métodos que usaban RACE_AI_CONFIG
  
  Actualizar `calculateAvailableBuildings()` y `calculateAvailableConsumables()` para obtener las cartas desde el mazo del perfil en lugar de RACE_AI_CONFIG.

- [ ] Verificar que no se rompe nada
  
  Después de simplificar código, verificar que no hay referencias rotas. Todas las referencias a buildings/consumables/scores deben haberse migrado a perfiles.

### 6.2 Limpiar Código Obsoleto
- [x] Marcar `AISystem.evaluateActions()` como obsoleto (reemplazado por perfil)
  
  Marcar el método evaluateActions de AISystem como obsoleto (prefijo `_obsolete_`) ya que ahora se usa profile.evaluateStrategicActions(). El método se puede eliminar en una limpieza posterior.

- [x] Marcar `AISystem.evaluateOffensiveActions()` como obsoleto (reemplazado por perfil)
  
  Marcar el método evaluateOffensiveActions de AISystem como obsoleto (prefijo `_obsolete_`) ya que ahora se usa AICardEvaluator.evaluateDeck() directamente. El método se puede eliminar en una limpieza posterior.

- [x] Marcar lógica hardcodeada de abastecimiento como obsoleta (movida a Core)
  
  Marcar los métodos ruleResupplyFOBs, ruleResupplyFronts, ruleResupplyHelicopters, sendSupplyConvoy, y findClosestFOBWithResources de AISystem como obsoletos (prefijo `_obsolete_`), ya que ahora están en AISupplyManager. Los métodos se pueden eliminar en una limpieza posterior.

- [x] Marcar lógica hardcodeada de emergencias como obsoleta (movida a Core)
  
  Marcar el método handleMedicalEmergencies de AISystem como obsoleto (prefijo `_obsolete_`), ya que ahora está en AIMedicalManager. El método se puede eliminar en una limpieza posterior.

- [x] Verificar lógica hardcodeada de reparaciones (si existía, movida a Core)
  
  Verificado: No había lógica de reparaciones en AISystem, se creó desde cero en AIRepairManager. No hay nada que eliminar.

- [x] Marcar métodos no utilizados como obsoletos
  
  Revisado AISystem y marcados todos los métodos obsoletos con prefijo `_obsolete_`. Los métodos se pueden eliminar en una limpieza posterior más segura.

- [x] Actualizar referencias a código obsoleto
  
  Actualizadas todas las referencias encontradas: `handleReactions` ahora usa directamente `aiActionHandler.executeBuild()`, y `logStatus` usa `AIGameStateAnalyzer.analyzeState()`. Los métodos obsoletos están marcados y no se usan en el código activo.

### 6.3 Testing Completo
- [ ] Probar abastecimiento funciona correctamente
  
  Verificar que los convoyes se envían desde HQ a FOBs cuando los FOBs tienen pocos suministros, desde FOBs a frentes cuando los frentes tienen pocos suministros, y que los helicópteros se gestionan correctamente. Debe funcionar igual que antes de la refactorización.

- [ ] Probar emergencias médicas se resuelven
  
  Verificar que cuando hay frentes con bajas, la IA envía ambulancias desde el HQ o hospital para resolver las emergencias. Las ambulancias deben llegar a los frentes y resolver las emergencias.

- [ ] Probar reparaciones funcionan
  
  Verificar que cuando hay edificios rotos, la IA envía vehículos mecánicos desde el HQ para repararlos. Los edificios deben quedar funcionales después de la reparación.

- [ ] Probar construcciones estratégicas usan el mazo
  
  Verificar que la IA solo intenta construir edificios que están en su mazo. No debe intentar construir edificios que no tiene disponibles.

- [ ] Probar decisiones ofensivas usan el mazo
  
  Verificar que la IA solo intenta usar consumibles que están en su mazo. No debe intentar usar consumibles que no tiene disponibles.

- [ ] Probar requisitos de construcción se verifican correctamente
  
  Verificar que la IA no intenta construir edificios que requieren otros edificios si no los tiene. Por ejemplo, no debe intentar construir deadlyBuild sin tener las plantas y laboratorios necesarios.

- [ ] Probar que la IA construye edificios del mazo
  
  Durante una partida, verificar que todos los edificios que construye la IA están en su mazo. No debe construir nada fuera del mazo.

- [ ] Probar que la IA usa consumibles del mazo
  
  Durante una partida, verificar que todos los consumibles que usa la IA están en su mazo. No debe usar nada fuera del mazo.

- [ ] Probar que la IA no intenta usar cartas que no están en el mazo
  
  Modificar temporalmente el mazo para quitar una carta y verificar que la IA no intenta usarla. Debe funcionar solo con las cartas disponibles.

- [ ] Probar que la IA respeta requisitos (ej: no construye `deadlyBuild` sin requisitos)
  
  Verificar que la IA no intenta construir edificios que requieren otros edificios si no los tiene construidos. Debe esperar a tener los requisitos antes de intentar construir.

- [ ] Probar que diferentes dificultades funcionan correctamente
  
  Probar la IA en dificultad easy, medium y hard. Verificar que los intervalos se ajustan correctamente, que las decisiones son apropiadas para cada dificultad, y que no hay errores.

---

## 📁 Estructura Final de Archivos

```
server/game/ai/
├── core/
│   ├── AICoreSystem.js          ✅ Fase 1.4
│   ├── AISupplyManager.js       ✅ Fase 1.1
│   ├── AIMedicalManager.js      ✅ Fase 1.2
│   ├── AIRepairManager.js       ✅ Fase 1.3
│   ├── AICardAdapter.js         ✅ Fase 2.1
│   ├── AIGameStateAnalyzer.js   ✅ Fase 3.1
│   ├── AICardEvaluator.js       ✅ Fase 3.2
│   └── AIActionSelector.js      ✅ Fase 3.3
│
├── config/
│   ├── AIConfig.js              (Ya existe - mantener)
│   └── RaceAIConfig.js          (Refactorizar - Fase 6.1)
│
├── profiles/
│   ├── BaseProfile.js           ✅ Fase 4.1
│   └── DefaultDeckProfile.js    ✅ Fase 4.2
│
└── managers/
    └── AISystem.js              (Refactorizar - Fase 5)
```

---

## 📝 Notas Importantes

- ✅ **No duplicar datos**: Usar `SERVER_NODE_CONFIG` como fuente única de verdad
- ✅ **No clasificar edificios/consumibles**: Cada carta se ejecuta con su handler específico
- ✅ **Verificar requisitos antes de evaluar**: Si faltan requisitos, retornar `null`
- ✅ **Mantener compatibilidad**: Migrar gradualmente sin romper funcionalidad existente
- ✅ **Testing continuo**: Probar cada fase antes de continuar

---

## 🎯 Orden de Implementación Recomendado

1. **Fase 1** (Core) → Base para todo lo demás
2. **Fase 2** (Adapter) → Necesario para evaluación
3. **Fase 3** (Evaluación) → Necesario para perfiles
4. **Fase 4** (Perfiles) → Usa evaluación
5. **Fase 5** (Integración) → Conecta todo
6. **Fase 6** (Limpieza) → Finaliza migración

---

## 📊 Progreso General

- [ ] Fase 1: Lógica Común (Core)
- [ ] Fase 2: Adaptador de Configuración
- [ ] Fase 3: Sistema de Evaluación Genérico
- [ ] Fase 4: Perfil de Mazo por Defecto
- [ ] Fase 5: Refactorización de AISystem
- [ ] Fase 6: Migración y Limpieza

**Estado actual**: ⏳ Pendiente de inicio

---

*Última actualización: [Fecha]*

