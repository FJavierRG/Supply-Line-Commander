# Preguntas de Balanceo para Testers

Este documento centraliza todas las preguntas de balanceo que necesitan respuesta durante las pruebas. Responde estas preguntas mientras juegas y reporta tus observaciones.

---

## 📊 Métricas Generales

### Tiempo de Partida
- [ ] ¿Cuánto duran las partidas en promedio? (Objetivo: 5-15 minutos)
- [ ] ¿Las partidas terminan demasiado rápido (< 3 min) o muy lento (> 20 min)?
- [ ] ¿Hay partidas que se estancan sin progreso?

### Distribución de Victorias
- [ ] ¿Qué porcentaje de victorias son por avance activo vs retroceso pasivo?
- [ ] ¿Un equipo gana significativamente más que el otro?
- [ ] ¿Las victorias se sienten justas o hay ventajas iniciales?

### Currency (Recursos)
- [ ] ¿Cuánto currency genera cada jugador por minuto?
- [ ] ¿Hay diferencias grandes entre jugadores?
- [ ] ¿El currency inicial (30) es suficiente para empezar?

---

## ⚔️ Sistema de Combate

### Drones vs Anti-Drones
- [ ] ¿Qué porcentaje de drones son interceptados? (Objetivo: 40-60%)
- [ ] ¿El intercambio económico es justo? (Dron: 150, Anti-Dron: 115)
- [ ] ¿Los drones se sienten demasiado caros o baratos?

### Tanques
- [ ] ¿Los tanques son útiles comparados con drones?
- [ ] ¿Son demasiado lentos (125 px/s) para ser efectivos?
- [ ] ¿El costo de 100 currency es apropiado?

### Efectos Temporales
- [ ] **Sniper (40 currency):**
  - ¿El efecto "herido" de 15 segundos tiene suficiente impacto?
  - ¿Se nota la diferencia cuando un frente está herido?
  - ¿El costo es apropiado?

- [ ] **Comando Especial (70 currency):**
  - ¿13 segundos de deshabilitación es suficiente tiempo?
  - ¿Puedes aprovechar la ventana de oportunidad?
  - ¿El costo es apropiado?

- [ ] **Sabotaje FOB (40 currency):**
  - ¿Afectar 3 camiones es suficiente?
  - ¿Se nota el impacto en la logística enemiga?
  - ¿El costo es apropiado?

### Contadores
- [ ] ¿Hay suficientes formas de contrarrestar cada estrategia?
- [ ] ¿El Anti-Dron es efectivo contra drones?
- [ ] ¿Faltan contadores para alguna estrategia dominante?

---

## 💰 Sistema Económico

### Generación de Currency
- [ ] ¿3 currency/s base es suficiente?
- [ ] ¿El bonus de +2/s por Planta Nuclear es apropiado?
- [ ] ¿La generación por avance (1 currency cada 2px) es balanceada?

### Edificios Económicos
- [ ] **Radio de Inteligencia (70 currency):**
  - ¿El ROI del 35.7% en 20 segundos es demasiado alto?
  - ¿Se construye siempre por ser muy rentable?
  - ¿El tiempo de inversión (20s) es apropiado?

- [ ] **Planta Nuclear (200 currency):**
  - ¿100 segundos para recuperar inversión es demasiado lento?
  - ¿Vale la pena construirla en partidas cortas?
  - ¿Es demasiado vulnerable durante el tiempo de recuperación?

- [ ] **Estación de Tren (170 currency):**
  - ¿25 supplies cada 12s es balanceado?
  - ¿El costo es apropiado para el beneficio?
  - ¿Se construye frecuentemente?

### Costos de Edificios
- [ ] ¿Los costos son proporcionales a su utilidad?
- [ ] ¿Hay edificios que nunca se construyen? (¿Por qué?)
- [ ] ¿Hay edificios que siempre se construyen? (¿Por qué?)

---

## 🚚 Sistema de Logística

### Velocidades de Vehículos
- [ ] ¿El Heavy Truck (40 px/s) es demasiado lento?
- [ ] ¿El bonus del Centro de Ingenieros (+50% velocidad) es suficiente?
- [ ] ¿Las diferencias de velocidad entre vehículos son apropiadas?

### Capacidades de Carga
- [ ] ¿15 supplies base para Heavy Truck es adecuado?
- [ ] ¿El bonus de +15 por Fábrica de Camiones es balanceado?
- [ ] ¿20 supplies para Truck es apropiado?

### Penalizaciones
- [ ] ¿El sabotaje FOB (-50% velocidad) es demasiado fuerte?
- [ ] ¿Afectar 3 camiones es suficiente impacto?
- [ ] ¿Se nota cuando tu logística está saboteada?

### Sistema de Rutas
- [ ] ¿La jerarquía HQ → FOB → Front es demasiado restrictiva?
- [ ] ¿Debería permitirse enviar directamente HQ → Front?
- [ ] ¿Las rutas funcionan bien en la práctica?

### Trenes
- [ ] ¿El intervalo de 12 segundos es apropiado?
- [ ] ¿25 supplies por tren es balanceado?
- [ ] ¿Los trenes mejoran significativamente la logística?

---

## 🎯 Sistema de Frentes

### Velocidades de Movimiento
- [ ] ¿4 px/s para avance y retroceso es apropiado?
- [ ] ¿Deberían ser diferentes las velocidades de avance y retroceso?
- [ ] ¿El movimiento es demasiado rápido o lento?

### Consumo de Suministros
- [ ] ¿1.6 supplies/s es balanceado?
- [ ] ¿El efecto "herido" (3.2 supplies/s) es demasiado fuerte?
- [ ] ¿Los frentes consumen suministros demasiado rápido o lento?

### Sistema de Colisión
- [ ] ¿La mecánica de empuje es balanceada?
- [ ] ¿El empate cuando suministros son iguales es apropiado?
- [ ] ¿La zona neutral de 25px es adecuada?

### Condiciones de Victoria
- [ ] ¿Las líneas de victoria (15% y 85%) son apropiadas?
- [ ] ¿Hay suficiente espacio para maniobras estratégicas?
- [ ] ¿Las partidas progresan hacia una conclusión?

### Balance Territorial
- [ ] ¿La distribución inicial es justa?
- [ ] ¿Un equipo tiene ventaja inicial?
- [ ] ¿El sistema de territorio es claro?

---

## 🎴 Sistema de Mazos

### Límite de Puntos
- [ ] ¿700 puntos permite suficiente variedad de mazos?
- [ ] ¿Es demasiado restrictivo o permisivo?
- [ ] ¿Los jugadores usan todos los puntos disponibles?

### Costos de Unidades
- [ ] ¿Los costos reflejan el poder de cada unidad?
- [ ] ¿Hay unidades demasiado baratas? (Sniper 40, Sabotaje 40)
- [ ] ¿Hay unidades demasiado caras? (Planta Nuclear 200, Estación 170)

### Mazo Predeterminado
- [ ] ¿El mazo predeterminado es jugable? (Actualmente 815 puntos, límite 700)
- [ ] ¿Es un buen ejemplo para nuevos jugadores?
- [ ] ¿Refleja el balance del juego?

### Variedad de Mazos
- [ ] ¿Hay múltiples estrategias viables?
- [ ] ¿Algunos mazos dominan sobre otros?
- [ ] ¿Los jugadores experimentan con diferentes mazos?

### Sinergias
- [ ] ¿Las sinergias son demasiado fuertes? (Ej: Fábrica + Centro de Ingenieros)
- [ ] ¿Hay combinaciones que dominen el meta?
- [ ] ¿Hay suficientes opciones viables?

---

## ⏱️ Sistema de Tiempos

### Tiempos de Construcción
- [ ] ¿2-4 segundos es apropiado?
- [ ] ¿Los edificios caros deberían tardar más en construirse?
- [ ] ¿Hay suficiente diferencia entre rápido y lento?

### Tiempos de Viaje
- [ ] ¿Las velocidades de convoyes son balanceadas?
- [ ] ¿El bonus del Centro de Ingenieros es suficiente?
- [ ] ¿La penalización de sabotaje es demasiado fuerte?

### Duración de Efectos
- [ ] ¿15 segundos de "herido" es apropiado?
- [ ] ¿13 segundos de deshabilitación es suficiente?
- [ ] ¿Los efectos duran demasiado o poco?

### Ventanas de Oportunidad
- [ ] ¿Hay suficientes ventanas para contraatacar?
- [ ] ¿Las ventanas son demasiado cortas o largas?
- [ ] ¿Los jugadores pueden reaccionar a tiempo?

### Ciclos Económicos
- [ ] ¿Los tiempos de recuperación son apropiados?
- [ ] ¿Hay suficiente tiempo para que las inversiones valgan la pena?
- [ ] ¿Los ciclos son demasiado rápidos o lentos?

---

## 🏗️ Unidades y Edificios

### Edificios Defensivos
- [ ] **Anti-Dron (115 currency):**
  - ¿Es efectivo contra drones?
  - ¿El costo es apropiado?
  - ¿Se construye frecuentemente?

### Edificios de Infraestructura
- [ ] **Fábrica de Camiones (100 currency):**
  - ¿El bonus de +15 capacidad es balanceado?
  - ¿Se construye frecuentemente?
  - ¿El costo es apropiado?

- [ ] **Centro de Ingenieros (120 currency):**
  - ¿El bonus de +50% velocidad es suficiente?
  - ¿Solo afectar heavy_trucks es limitante?
  - ¿Se construye frecuentemente?

### Edificios Ofensivos
- [ ] **Lanzadera de Drones (100 currency):**
  - ¿Es necesario para usar drones?
  - ¿El costo es apropiado?
  - ¿Se construye frecuentemente?

- [ ] **Centro de Inteligencia (150 currency):**
  - ¿Es necesario para usar comandos?
  - ¿El costo es apropiado?
  - ¿Se construye frecuentemente?

### Consumibles
- [ ] ¿Qué consumibles se usan más?
- [ ] ¿Hay consumibles que nunca se usan? (¿Por qué?)
- [ ] ¿Hay consumibles que siempre se usan? (¿Por qué?)

---

## 📈 Observaciones Generales

### Problemas Críticos
- [ ] ¿Hay algún problema crítico que impida disfrutar el juego?
- [ ] ¿Hay mecánicas que se sienten rotas o abusables?
- [ ] ¿Hay estrategias que dominen completamente el meta?

### Experiencia de Juego
- [ ] ¿El ritmo del juego es apropiado?
- [ ] ¿Hay suficiente acción o demasiada espera?
- [ ] ¿Las decisiones estratégicas se sienten significativas?

### Claridad
- [ ] ¿Las mecánicas son claras y comprensibles?
- [ ] ¿Los efectos de las unidades son evidentes?
- [ ] ¿Falta información importante durante el juego?

---

## 📝 Cómo Reportar

Para cada pregunta que respondas:

1. **Marca la pregunta** con [x] si la observaste
2. **Indica tu respuesta:** Sí/No/No estoy seguro
3. **Añade contexto:** Situación específica donde lo observaste
4. **Sugiere cambios:** Si tienes ideas de mejora

**Ejemplo:**
```
- [x] ¿El efecto "herido" de 15 segundos tiene suficiente impacto?
  Respuesta: No, no se nota mucho la diferencia
  Contexto: Usé sniper en un frente con 50 supplies y apenas retrocedió
  Sugerencia: Aumentar duración a 20 segundos o aumentar el multiplicador
```

---

**Última actualización:** Documento simplificado para testers
**Versión:** 1.0


