# ⚖️ Documento de Balance - Supply Line Commander

## 💰 Sistema Económico

### **Generación de Currency ($)**

**Generación Pasiva:**
- **Base**: 2 $/segundo (constante)
- **Planta Nuclear**: +n $/segundo por cada planta construida
- **Total posible**: 2 + (2 × número de plantas nucleares)

**Generación por Avance:**
- **Por pixel avanzado**: 1 $ por pixel
- **Conversión**: `pixelsPerCurrency = 1` (en `FOB_CURRENCY_CONFIG`)

### **Velocidad de Avance del Frente**

**Cuando tiene munición:**
- **Velocidad**: 4 px/segundo (`advanceSpeed` en `FRONT_MOVEMENT_CONFIG`)
- **Generación estimada**: ~4 $/segundo adicionales mientras avanza

**Cuando NO tiene munición:**
- **Velocidad**: -4 px/segundo (retrocede)
- **Sin generación**: 0 $/segundo por avance

### **Consumo de Munición del Frente**

- **Consumo**: 0.7 munición/segundo (`consumeRate`)
- **Capacidad máxima**: 100 munición (`maxSupplies`)
- **Duración sin reabastecimiento**: ~142 segundos (2.4 minutos)

### **Sistema de Convoyes**

**Camión (HQ y FOB):**
- **Capacidad**: 15 munición por viaje (`capacity`)
- **Velocidad**: 2 unidades/segundo (`speed`)
- **Viajes necesarios para llenar un frente**: 100/15 = ~7 viajes

**Ambulancia (HQ y Hospital):**
- **Función**: Resolver emergencias médicas (no transporta munición)
- **Velocidad**: 2.5 unidades/segundo

---

## 🏗️ Construibles Activos (Requieren Balance de Precios)

### **1. FOB (Base Avanzada)**
**Precio Actual:** 200 $

**Función:**
- Nodo intermedio en la cadena logística HQ → FOB → Frente
- Almacena hasta 100 munición
- Tiene 2 camiones para enviar convoyes
- Puede ser destruido por drones enemigos

**Utilidad:**
- Permite extender la red logística
- Acorta distancias de transporte
- Punto de almacenamiento estratégico

**Consideraciones:**
- Es ESENCIAL para el gameplay (sin FOBs es muy difícil)
- Vulnerable a drones (costo de reemplazo)
- Tiempo de construcción: 2 segundos

---

### **2. Anti-Dron**
**Precio Actual:** 150 $

**Función:**
- Detecta drones enemigos en un rango de 160px
- Destruye automáticamente el dron al entrar en rango
- Se AUTO-CONSUME tras disparar (desaparece)
- No deja cráter al consumirse

**Utilidad:**
- Protección contra ataques de drones enemigos
- Defensa de FOBs críticos
- Uso táctico de un solo disparo

**Consideraciones:**
- Un solo uso (consumible)
- Rango limitado (160px)
- El jugador debe anticipar rutas de drones enemigos
- Tiempo de construcción: 2 segundos

---

### **3. Planta Nuclear**
**Precio Actual:** 200 $ ⚖️ **REBALANCEADO** (era 290$)

**Función:**
- Aumenta generación pasiva de currency en +2 $/segundo
- Se puede construir solo en territorio aliado
- Puede ser destruida por drones enemigos
- Efecto permanente mientras esté activa
- Se abandona si queda fuera de territorio (gris → desaparece)

**Utilidad:**
- Inversión a medio plazo
- Acelera economía pasiva
- Múltiples plantas se acumulan

**Consideraciones:**
- **ROI (Return on Investment)**: 200$ / 2$/s = **100 segundos (1.67 minutos)**
- Vulnerable a drones enemigos (ahora con priorización inteligente)
- Solo en territorio aliado (nueva restricción)
- Construcción: 2 segundos

**Análisis Económico:**
- Con 1 planta: 4 $/s total (2 base + 2 planta)
- Con 2 plantas: 6 $/s total
- Con 3 plantas: 8 $/s total

**Decisión de Compra:**
- 200$ = 1.5 FOBs → ¿Logística o economía?
- ROI más rápido = Decisión más interesante
- Se paga a sí misma en ~2 minutos (viable en partidas de 10-15 min)

---

### **4. Hospital de Campaña**
**Precio Actual:** 400 $

**Función:**
- Tiene 1 ambulancia disponible (se regenera al volver)
- Envía ambulancias a frentes con emergencia médica (icono 🚑)
- Rango de acción: 200px
- Puede ser destruido por drones

**Utilidad:**
- Alternativa al HQ para resolver emergencias
- Descarga la ambulancia única del HQ
- Ubicación estratégica cerca de frentes

**Consideraciones:**
- El HQ ya tiene 1 ambulancia gratis
- Útil cuando hay múltiples frentes
- Rango limitado (200px)
- Emergencias no resueltas causan +30% consumo de munición durante 15s
- Construcción: 2 segundos

---

### **5. Dron Bomba** (Proyectil Consumible)
**Precio Actual:** 200 $

**Función:**
- Destruye un FOB enemigo
- Vuela desde el borde derecho hasta el objetivo
- Solo puede atacar FOBs enemigos
- Puede ser interceptado por Anti-Drones enemigos
- Deja un cráter pequeño al impactar

**Utilidad:**
- Ataque ofensivo
- Elimina puntos de suministro enemigos
- Uso táctico

**Consideraciones:**
- Un solo uso (consumible)
- Puede ser interceptado
- Debe seleccionar objetivo manualmente
- Sin tiempo de construcción (instántaneo)

---

## 📊 Contexto de Partida

### **Duración Estimada de Partida**
- **Misión actual**: ~5-10 minutos (dependiendo del jugador)

### **Ingresos Estimados en una Partida Típica**

**Sin plantas nucleares:**
- Pasivo: 2 $/s × 600s = 1,200 $
- Avance: ~4 $/s × 50% del tiempo = 1,200 $
- **Total**: ~2,400 $ en 10 minutos

**Con 1 planta nuclear (construida al minuto 2):**
- Pasivo: (2 $/s × 120s) + (4 $/s × 480s) = 240 + 1,920 = 2,160 $
- Avance: ~1,200 $
- **Total**: ~3,360 $ en 10 minutos

### **Recursos Iniciales**
- **Currency inicial**: 0 $ (empieza de cero)
- **Nodos iniciales**: 1 HQ, 2 FOBs, 2 Frentes (gratis)

---

## 🎯 Objetivos de Balance

### **Preguntas para la IA:**

1. ¿Los precios actuales reflejan la utilidad de cada construible?
2. ¿El ROI de la Planta Nuclear es razonable (4.2 minutos)?
3. ¿El Anti-Dron debería costar menos por ser consumible?
4. ¿El Hospital vale 400$ considerando que el HQ ya tiene ambulancia gratis?
5. ¿El Dron a 200$ es accesible pero no spammeable?
6. ¿Es posible construir todo lo necesario en una partida típica?

### **Consideraciones de Diseño:**

**Early Game (0-2 minutos):**
- El jugador debería poder construir 1-2 FOBs para expandirse
- Quizás un Anti-Dron para defensa

**Mid Game (2-5 minutos):**
- Decisión: ¿Invertir en Planta Nuclear o más infraestructura?
- Posibilidad de construir Hospital si hay múltiples frentes

**Late Game (5-10 minutos):**
- Economía acelerada permite múltiples construcciones
- Uso táctico de Drones para debilitar al enemigo

---

## 📋 Tabla Resumen para IA

| Construible | Precio Actual | Tipo | Utilidad Principal | Consideraciones |
|-------------|---------------|------|-------------------|-----------------|
| **FOB** | 200 $ | Permanente | Nodo logístico, almacén, 2 camiones | Esencial, vulnerable a drones |
| **Anti-Dron** | 150 $ | Consumible | Destruye 1 dron enemigo | Un solo uso, rango 160px |
| **Planta Nuclear** | 500 $ | Permanente | +2 $/s pasivos | ROI 250s, vulnerable |
| **Hospital** | 400 $ | Permanente | 1 ambulancia, rango 200px | HQ ya tiene ambulancia |
| **Dron Bomba** | 200 $ | Consumible | Destruye 1 FOB enemigo | Puede ser interceptado |

---

## 🎮 Mecánicas Adicionales Relevantes

### **Emergencias Médicas**
- Aparecen aleatoriamente en frentes
- Tiempo límite: ~30 segundos
- Penalización: +30% consumo de munición durante 15s
- Resolución: Enviar ambulancia desde HQ o Hospital

### **Sistema de Vehículos**
- **HQ**: 4 camiones, 1 ambulancia
- **FOB**: 2 camiones
- **Hospital**: 1 ambulancia
- Los vehículos regresan tras entregar (no se pierden)

### **Condiciones de Victoria/Derrota**
- **Victoria**: Frente aliado alcanza coordenada X del HQ enemigo
- **Derrota**: Frente enemigo alcanza coordenada X del HQ aliado
- Sin límite de tiempo (solo por objetivos)

---

## 💡 Notas para la IA de Balance

- El juego es de **gestión logística**, no RTS puro
- Las decisiones deben sentirse **significativas**
- Evitar que un solo construible sea obligatorio
- Permitir diferentes estrategias viables
- El jugador debe poder recuperarse de errores

**Objetivo:** Precios que creen decisiones interesantes sin frustración.

