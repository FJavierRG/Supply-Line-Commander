# Documentación de Balanceo: Sistema de Mazos

## Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Sistema de Puntos](#sistema-de-puntos)
3. [Mazo Predeterminado](#mazo-predeterminado)
4. [Cálculo de Costos](#cálculo-de-costos)
5. [Validaciones de Mazos](#validaciones-de-mazos)
6. [Sinergias entre Unidades](#sinergias-entre-unidades)
7. [Análisis de Mazos Posibles](#análisis-de-mazos-posibles)
8. [Estrategias de Construcción de Mazos](#estrategias-de-construcción-de-mazos)
9. [Balance de Poder por Punto](#balance-de-poder-por-punto)

---

## Resumen Ejecutivo

El sistema de mazos reemplaza al antiguo sistema de razas, dando libertad total a los jugadores para construir su propio ejército. Cada unidad tiene un costo en puntos, y los jugadores deben construir mazos que no excedan el límite de 700 puntos. Solo las unidades incluidas en el mazo pueden construirse durante la partida.

**Características Clave:**
- Límite de puntos: 700 por mazo
- HQ siempre incluido y 2 FOBs iniciales (gratis, no cuenta para el límite)
- Sin duplicados necesarios
- Mazo predeterminado disponible para nuevos jugadores

---

## Sistema de Puntos

### Límite de Puntos

| Propiedad | Valor |
|-----------|-------|
| Límite de puntos | 700 |
| Validación | Servidor (anti-hack) |
| Fuente | `server/config/gameConfig.js` |

### Cálculo de Costos

**Reglas:**
- El HQ y 2 FOBs iniciales siempre está incluido y **NO cuenta** para el límite
- Todas las demás unidades suman su costo al total
- El costo de cada unidad es el mismo que su costo de construcción en el juego

**Fórmula:**
```
Costo del mazo = Suma de costos de todas las unidades (excluyendo HQ)
```

### Ejemplo de Cálculo

**Mazo ejemplo:**
- HQ: 0 puntos (gratis)
- FOB: 120 puntos
- Anti-Dron: 115 puntos
- Lanzadera: 100 puntos
- Dron: 150 puntos
- **Total: 485 puntos** (dentro del límite de 700)

---

## Mazo Predeterminado

### Composición del Mazo Predeterminado

| Unidad | Costo | Categoría |
|--------|-------|-----------|
| HQ | 0 | Base (siempre incluido) |
| FOB | 120 | Infraestructura |
| Anti-Dron | 115 | Defensa |
| Lanzadera de Drones | 100 | Ofensiva |
| Fábrica de Camiones | 100 | Infraestructura |
| Centro de Ingenieros | 120 | Infraestructura |
| Radio de Inteligencia | 70 | Económico |
| Dron | 150 | Consumible |
| Ataque de Francotirador | 40 | Consumible |

**Costo total:** 815 puntos

**Nota:** El mazo predeterminado excede el límite de 700 puntos. Esto puede ser intencional para mostrar todas las opciones disponibles, pero los jugadores deben ajustarlo para jugar.

### Análisis del Mazo Predeterminado

**Fortalezas:**
- Cubre todas las categorías principales
- Incluye infraestructura esencial (FOB, Fábrica, Centro)
- Incluye defensa (Anti-Dron)
- Incluye ofensiva (Lanzadera, Dron, Sniper)
- Incluye economía (Radio de Inteligencia)

**Debilidades:**
- Excede el límite de puntos (no es jugable directamente)
- No incluye todas las unidades disponibles
- Puede ser demasiado generalista

---

## Cálculo de Costos

### Tabla Completa de Costos para Mazos

#### Edificios Construibles

| Edificio | Costo en Mazo | Categoría |
|----------|---------------|-----------|
| FOB | 120 | Infraestructura |
| Anti-Dron | 115 | Defensa |
| Lanzadera de Drones | 100 | Ofensiva |
| Planta Nuclear | 200 | Económico |
| Fábrica de Camiones | 100 | Infraestructura |
| Centro de Ingenieros | 120 | Infraestructura |
| Radio de Inteligencia | 70 | Económico |
| Centro de Inteligencia | 150 | Ofensiva |
| Estación de Tren | 170 | Económico |

#### Consumibles y Proyectiles

| Consumible | Costo en Mazo | Categoría |
|------------|---------------|-----------|
| Dron Bomba | 150 | Ofensiva |
| Ataque de Francotirador | 40 | Ofensiva |
| Sabotaje FOB | 40 | Ofensiva |
| Comando Especial | 70 | Ofensiva |
| Tanque | 100 | Ofensiva |

### Costos por Categoría

**Infraestructura (Total: 440 puntos):**
- FOB: 120
- Fábrica de Camiones: 100
- Centro de Ingenieros: 120
- Estación de Tren: 170

**Defensa (Total: 115 puntos):**
- Anti-Dron: 115

**Ofensiva - Edificios (Total: 250 puntos):**
- Lanzadera de Drones: 100
- Centro de Inteligencia: 150

**Ofensiva - Consumibles (Total: 400 puntos):**
- Dron: 150
- Tanque: 100
- Comando Especial: 70
- Ataque de Francotirador: 40
- Sabotaje FOB: 40

**Económico (Total: 440 puntos):**
- Planta Nuclear: 200
- Estación de Tren: 170
- Radio de Inteligencia: 70

---

## Validaciones de Mazos

### Reglas de Validación

1. **HQ Obligatorio:**
   - El HQ siempre debe estar incluido
   - Si falta, se añade automáticamente

2. **Sin Duplicados:**
   - No se permiten unidades duplicadas en el mismo mazo
   - Cada unidad solo puede aparecer una vez

3. **Límite de Puntos:**
   - El costo total no puede exceder 700 puntos
   - El HQ no cuenta para el límite

4. **Unidades Habilitadas:**
   - Solo se pueden incluir unidades habilitadas en el servidor
   - Las unidades deshabilitadas se filtran automáticamente

5. **Validación en Servidor:**
   - El servidor valida todos los mazos antes de aceptarlos
   - Previene manipulación de clientes (anti-hack)

### Proceso de Validación

**En el Cliente:**
1. Verificar que el HQ esté incluido
2. Verificar que no haya duplicados
3. Calcular costo total
4. Verificar que no exceda 700 puntos
5. Verificar que todas las unidades estén habilitadas

**En el Servidor:**
1. Filtrar unidades deshabilitadas
2. Añadir HQ si falta
3. Calcular costo total (excluyendo HQ)
4. Verificar que no exceda 700 puntos
5. Aceptar o rechazar el mazo

---

## Sinergias entre Unidades

### Sinergias Defensivas

**Anti-Dron + Lanzadera de Drones:**
- Anti-Dron protege contra drones enemigos
- Lanzadera permite usar drones ofensivos
- **Sinergia:** Defensa propia + ofensiva contra enemigos
- **Costo combinado:** 215 puntos

### Sinergias Ofensivas

**Lanzadera de Drones + Dron:**
- Lanzadera desbloquea el uso de drones
- Dron es el consumible ofensivo principal
- **Sinergia:** Ofensiva aérea consistente
- **Costo combinado:** 250 puntos

**Centro de Inteligencia + Comando Especial:**
- Centro desbloquea el uso de comandos
- Comando deshabilita edificios enemigos
- **Sinergia:** Infiltración y sabotaje
- **Costo combinado:** 220 puntos

### Sinergias Económicas

**Planta Nuclear + Estación de Tren:**
- Planta genera currency pasiva (+2/s)
- Tren genera suministros pasivos (25 cada 12s)
- **Sinergia:** Recursos pasivos múltiples
- **Costo combinado:** 370 puntos

**Radio de Inteligencia + Planta Nuclear:**
- Radio genera retorno rápido (20s)
- Planta genera retorno continuo
- **Sinergia:** Inversiones complementarias
- **Costo combinado:** 270 puntos

### Sinergias de Infraestructura

**Fábrica de Camiones + Centro de Ingenieros:**
- Fábrica aumenta capacidad (+15) y vehículos (+1)
- Centro aumenta velocidad (+50%)
- **Sinergia:** Logística mejorada significativamente
- **Costo combinado:** 220 puntos

**FOB + Estación de Tren:**
- FOB almacena suministros
- Tren entrega suministros automáticamente a FOBs
- **Sinergia:** Suministros pasivos para frentes
- **Costo combinado:** 290 puntos

### Sinergias Ofensivas Múltiples

**Lanzadera + Dron + Tanque:**
- Lanzadera desbloquea drones
- Dron y Tanque son consumibles ofensivos
- **Sinergia:** Múltiples opciones ofensivas
- **Costo combinado:** 350 puntos

**Centro de Inteligencia + Comando + Sniper:**
- Centro desbloquea comandos
- Comando y Sniper son consumibles ofensivos
- **Sinergia:** Ofensiva especializada
- **Costo combinado:** 260 puntos

---

## Análisis de Mazos Posibles

### Mazo Económico (700 puntos)

**Composición:**
- HQ: 0
- FOB: 120
- Planta Nuclear: 200
- Estación de Tren: 170
- Radio de Inteligencia: 70
- Anti-Dron: 115
- Fábrica de Camiones: 100
- **Total: 775 puntos** (excede límite)

**Ajuste necesario:** Eliminar Fábrica de Camiones → **675 puntos**

**Fortalezas:**
- Generación pasiva alta (currency + supplies)
- Retorno de inversión rápido
- Infraestructura básica

**Debilidades:**
- Poca ofensiva
- Vulnerable a ataques
- Requiere tiempo para generar recursos

### Mazo Ofensivo (700 puntos)

**Composición:**
- HQ: 0
- FOB: 120
- Lanzadera de Drones: 100
- Centro de Inteligencia: 150
- Dron: 150
- Tanque: 100
- Comando Especial: 70
- Ataque de Francotirador: 40
- **Total: 730 puntos** (excede límite)

**Ajuste necesario:** Eliminar Tanque → **630 puntos**

**Fortalezas:**
- Múltiples opciones ofensivas
- Puede presionar frentes enemigos
- Versatilidad táctica

**Debilidades:**
- Poca economía
- Vulnerable a defensas
- Consume muchos recursos durante la partida

### Mazo Defensivo (700 puntos)

**Composición:**
- HQ: 0
- FOB: 120
- Anti-Dron: 115
- Fábrica de Camiones: 100
- Centro de Ingenieros: 120
- Estación de Tren: 170
- Radio de Inteligencia: 70
- **Total: 695 puntos**

**Fortalezas:**
- Buena defensa contra drones
- Logística mejorada
- Suministros pasivos

**Debilidades:**
- Poca ofensiva
- Depende de defensa pasiva
- Puede ser presionado fácilmente

### Mazo Balanceado (700 puntos)

**Composición:**
- HQ: 0
- FOB: 120
- Anti-Dron: 115
- Lanzadera de Drones: 100
- Fábrica de Camiones: 100
- Centro de Ingenieros: 120
- Radio de Inteligencia: 70
- Dron: 150
- Ataque de Francotirador: 40
- **Total: 815 puntos** (excede límite)

**Ajuste necesario:** Eliminar Radio de Inteligencia → **745 puntos** (aún excede)

**Ajuste adicional:** Eliminar Centro de Ingenieros → **625 puntos**

**Fortalezas:**
- Cubre todas las categorías
- Versátil y adaptable
- Buen balance ofensiva/defensa

**Debilidades:**
- Puede ser superado por mazos especializados
- Requiere buena gestión de recursos

### Mazo de Infraestructura (700 puntos)

**Composición:**
- HQ: 0
- FOB: 120
- Fábrica de Camiones: 100
- Centro de Ingenieros: 120
- Estación de Tren: 170
- Planta Nuclear: 200
- **Total: 710 puntos** (excede límite)

**Ajuste necesario:** Eliminar Planta Nuclear → **510 puntos**

**Fortalezas:**
- Logística excelente
- Suministros pasivos
- Velocidad mejorada

**Debilidades:**
- Sin ofensiva
- Sin defensa
- Depende completamente de logística

---

## Estrategias de Construcción de Mazos

### Estrategia Temprana

**Objetivos:**
- Establecer infraestructura básica
- Mantener opciones abiertas

**Recomendaciones:**
- Incluir FOB (esencial)
- Incluir al menos una unidad económica
- Incluir al menos una unidad ofensiva básica
- Incluir defensa si es posible

**Ejemplo (625 puntos):**
- FOB: 120
- Fábrica de Camiones: 100
- Radio de Inteligencia: 70
- Lanzadera de Drones: 100
- Dron: 150
- Ataque de Francotirador: 40
- Anti-Dron: 115

### Estrategia Especializada

**Objetivos:**
- Maximizar una categoría específica
- Crear sinergias fuertes

**Recomendaciones:**
- Elegir 2-3 sinergias principales
- Maximizar el poder en esas áreas
- Aceptar debilidades en otras áreas

**Ejemplo - Ofensiva Especializada (700 puntos):**
- FOB: 120
- Lanzadera: 100
- Centro de Inteligencia: 150
- Dron: 150
- Tanque: 100
- Comando: 70
- Sniper: 40
- Sabotaje: 40

### Estrategia Económica

**Objetivos:**
- Maximizar generación pasiva
- Crear ventaja económica a largo plazo

**Recomendaciones:**
- Incluir múltiples unidades económicas
- Priorizar retorno de inversión
- Aceptar debilidad inicial

**Ejemplo (690 puntos):**
- FOB: 120
- Planta Nuclear: 200
- Estación de Tren: 170
- Radio de Inteligencia: 70
- Fábrica de Camiones: 100
- Anti-Dron: 115

### Estrategia Defensiva

**Objetivos:**
- Proteger infraestructura
- Resistir ofensivas enemigas

**Recomendaciones:**
- Incluir defensas múltiples
- Mejorar logística para mantener suministros
- Priorizar supervivencia sobre ofensiva

**Ejemplo (695 puntos):**
- FOB: 120
- Anti-Dron: 115
- Fábrica de Camiones: 100
- Centro de Ingenieros: 120
- Estación de Tren: 170
- Radio de Inteligencia: 70

---

## Balance de Poder por Punto

### Análisis de Eficiencia

**Unidades con Alto Poder por Punto:**

| Unidad | Costo | Poder Estimado | Eficiencia |
|--------|-------|----------------|------------|
| Ataque de Francotirador | 40 | Alto (duplica consumo) | ⭐⭐⭐⭐⭐ |
| Sabotaje FOB | 40 | Medio (ralentiza logística) | ⭐⭐⭐⭐ |
| Radio de Inteligencia | 70 | Alto (ROI 35.7%) | ⭐⭐⭐⭐⭐ |
| Comando Especial | 70 | Alto (deshabilita edificios) | ⭐⭐⭐⭐⭐ |
| Fábrica de Camiones | 100 | Alto (mejora logística) | ⭐⭐⭐⭐ |
| Lanzadera de Drones | 100 | Alto (desbloquea drones) | ⭐⭐⭐⭐ |

**Unidades con Bajo Poder por Punto:**

| Unidad | Costo | Poder Estimado | Eficiencia |
|--------|-------|----------------|------------|
| Planta Nuclear | 200 | Alto pero requiere tiempo | ⭐⭐⭐ |
| Estación de Tren | 170 | Alto pero indirecto | ⭐⭐⭐ |
| Centro de Inteligencia | 150 | Medio (requiere comandos) | ⭐⭐⭐ |
| Dron | 150 | Alto pero consumible | ⭐⭐⭐⭐ |

### Comparación de Consumibles

**Consumibles Baratos (< 50 puntos):**
- Ataque de Francotirador: 40 puntos
- Sabotaje FOB: 40 puntos
- **Ventaja:** Múltiples usos por bajo costo

**Consumibles Medianos (50-100 puntos):**
- Comando Especial: 70 puntos
- Tanque: 100 puntos
- **Ventaja:** Poder moderado con costo razonable

**Consumibles Caros (> 100 puntos):**
- Dron: 150 puntos
- **Ventaja:** Alto poder pero alto costo

### Análisis de Edificios

**Edificios Baratos (< 100 puntos):**
- Radio de Inteligencia: 70 puntos
- **Ventaja:** Retorno rápido, bajo costo

**Edificios Medianos (100-150 puntos):**
- FOB: 120 puntos
- Anti-Dron: 115 puntos
- Fábrica de Camiones: 100 puntos
- Centro de Ingenieros: 120 puntos
- Lanzadera: 100 puntos
- **Ventaja:** Buen balance costo/beneficio

**Edificios Caros (> 150 puntos):**
- Planta Nuclear: 200 puntos
- Estación de Tren: 170 puntos
- Centro de Inteligencia: 150 puntos
- **Ventaja:** Alto poder pero alto costo

---

## Notas para Balanceo

### Puntos Clave a Considerar

1. **Límite de Puntos:**
   - ¿700 puntos es apropiado?
   - ¿Permite suficiente variedad de mazos?
   - ¿Es demasiado restrictivo o permisivo?

2. **Costos de Unidades:**
   - ¿Los costos reflejan el poder de cada unidad?
   - ¿Hay unidades demasiado baratas o caras?
   - ¿El balance de poder por punto es adecuado?

3. **Mazo Predeterminado:**
   - ¿Debería estar dentro del límite de 700 puntos?
   - ¿Es un buen ejemplo para nuevos jugadores?
   - ¿Refleja el balance del juego?

4. **Sinergias:**
   - ¿Las sinergias son demasiado fuertes?
   - ¿Hay combinaciones que dominen el meta?
   - ¿Hay suficientes opciones viables?

5. **Variedad de Mazos:**
   - ¿Hay múltiples estrategias viables?
   - ¿Algunos mazos dominan sobre otros?
   - ¿Los jugadores tienen opciones reales?

### Métricas Sugeridas para Análisis

- **Distribución de mazos:** ¿Qué mazos se usan más?
- **Tasa de victoria por mazo:** ¿Qué mazos ganan más?
- **Uso de unidades:** ¿Qué unidades aparecen en más mazos?
- **Sinergias comunes:** ¿Qué combinaciones son más populares?
- **Puntos promedio usados:** ¿Los jugadores usan todos los puntos disponibles?

### Puntos de Balance Críticos

1. **Unidades Baratas:**
   - Ataque de Francotirador (40) y Sabotaje (40) son muy baratos
   - ¿Deberían costar más para limitar su uso?

2. **Unidades Caras:**
   - Planta Nuclear (200) y Estación de Tren (170) son muy caras
   - ¿Deberían costar menos para ser más accesibles?

3. **Sinergias Fuertes:**
   - Fábrica + Centro de Ingenieros (220 puntos) es muy fuerte
   - ¿Debería costar más o ser menos efectiva?

4. **Mazo Predeterminado:**
   - Actualmente excede el límite (815 puntos)
   - ¿Debería ajustarse para ser jugable directamente?

---

**Última actualización:** Basado en código del servidor
**Archivos fuente:**
- `server/config/gameConfig.js`
- `server/config/defaultDeck.js`
- `server/config/serverNodes.js`
- `src/systems/DeckManager.js`
- `src/systems/ArsenalManager.js`
- `server/server.js`

