# 🗺️ Diagrama Visual del Sistema de Territorio

## 📐 Representación del Mapa

```
┌────────────────────────────────────────────────────────────────────┐
│                         MAPA DE JUEGO                               │
│                         (1920 x 1080)                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  P1 HQ                                      P2 FRONTIER             │
│  (x~100)    P1 FRONTIER                     (x~1000)    P2 HQ      │
│    🏠         (x~800)                                     🏠        │
│    │            │                             │           │         │
│    │◄─────────►│                              │◄─────────►│        │
│    │  P1 TERR  │        ZONA NEUTRAL          │  P2 TERR  │        │
│    │   (AZUL)  │          (GRIS)              │  (ROJO)   │        │
│    │           │                              │           │         │
│    │           🛡️ P1 Front                    🛡️ P2 Front│        │
│    │           │                              │           │         │
│    │    🏭    │                              │    🏭    │         │
│    │   FOB    │                              │   FOB    │         │
│    │ (SEGURO) │                              │ (SEGURO) │         │
│    │           │                              │           │         │
│              🏭←─────── RETROCEDE ◄───────┐  │           │         │
│             FOB                            │  │           │         │
│          (FUERA!)                          │  │           │         │
│                                            │  │           │         │
│  ├─────────►│                              │◄───────────┤│         │
│  Avanza      Frontera P1                   Frontera P2   Avanza    │
│  a DERECHA   (frontierGapPx=25)            (frontierGapPx=25) a IZQUIERDA│
└────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Lógica de Detección

### **Player 1 (Izquierda → Derecha)**

```javascript
// Player1: HQ en x~100, avanza hacia la DERECHA
// Territorio: desde HQ hasta FRONTERA
// Frontera = frente más derecho + 25px

┌─────────────────────────────────────────┐
│  🏠 HQ (100)                             │
│   │                                      │
│   │◄────── TERRITORIO P1 (AZUL) ────►│  │
│   │                                   │  │
│   🏭 FOB (300) ✅ SEGURO             │  │
│   │                                   │  │
│   🏭 FOB (600) ✅ SEGURO             │  │
│   │                                   │  │
│   🛡️ Front (800)                      │  │
│   │                                   │  │
│   │          FRONTERA (825) ─────────┤  │
│   │                                      │
│   🏭 FOB (900) ❌ FUERA! (rightEdge > frontera)
│                                          │
└─────────────────────────────────────────┘

Detección:
buildingRightEdge = building.x + radius
isOut = buildingRightEdge > player1Frontier

Ejemplo:
FOB en x=900, radius=30
rightEdge = 900 + 30 = 930
frontier = 825
930 > 825 → ❌ FUERA!
```

---

### **Player 2 (Derecha → Izquierda)**

```javascript
// Player2: HQ en x~1820, avanza hacia la IZQUIERDA
// Territorio: desde FRONTERA hasta HQ
// Frontera = frente más izquierdo - 25px

┌─────────────────────────────────────────┐
│                                 🏠 HQ (1820)│
│                                  │       │
│                 │◄─── TERRITORIO P2 (ROJO) ──►│
│                 │                        │  │
│                 │             🏭 FOB (1600) ✅ SEGURO
│                 │                        │  │
│                 │             🏭 FOB (1300) ✅ SEGURO
│                 │                        │  │
│                 │              🛡️ Front (1000)│
│                 │                        │  │
│          ├───── FRONTERA (975)          │  │
│                                          │  │
│  🏭 FOB (800) ❌ FUERA! (leftEdge < frontera)│
│                                          │
└─────────────────────────────────────────┘

Detección:
buildingLeftEdge = building.x - radius
isOut = buildingLeftEdge < player2Frontier

Ejemplo:
FOB en x=800, radius=30
leftEdge = 800 - 30 = 770
frontier = 975
770 < 975 → ❌ FUERA!
```

---

## ⏱️ Proceso de Abandono

```
┌────────────────────────────────────────────────────────────┐
│                    LÍNEA DE TIEMPO                          │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  🏭 FOB sale de territorio                                  │
│  ├─────────────────────────────────────────────────────►   │
│  │                                                          │
│  │  ⏱️ Tiempo de Gracia (3 segundos)                       │
│  │  outOfTerritoryTimer = 0 → 1 → 2 → 3                   │
│  │                                                          │
│  │  ✅ Si vuelve a territorio: timer resetea               │
│  │                                                          │
│  ├──────────────────────────────────────►                  │
│  Timer >= 3s                                                │
│  │                                                          │
│  ▼                                                          │
│  💥 Inicia Abandono                                         │
│  ├─────────────────────────────────────────────────────►   │
│  │                                                          │
│  │  Fase 1 (2s): Gris Claro 🌫️                            │
│  │  Fase 2 (3s): Gris Oscuro 🌑                            │
│  │  Fase 3: Eliminación ❌                                 │
│  │                                                          │
│  └─────────────────────────────────────────────────────►   │
│                    FOB eliminado                            │
└────────────────────────────────────────────────────────────┘

Total: 3s (gracia) + 2s (fase1) + 3s (fase2) = 8 segundos
```

---

## 🏢 Edificios y Excepciones

### **Edificios Verificados**
```javascript
✅ FOB (Forward Operating Base)
✅ Talleres (drone_workshop, vehicle_workshop)
✅ Torres de vigilancia (vigilanceTower)
✅ Fábricas (factory)
✅ Hospitales (hospital)
✅ Centros de ingeniería (engineerCenter)
✅ Radio de inteligencia (intelRadio)
✅ Base aérea (aerialBase)
✅ Todos los edificios construibles
```

### **Edificios NO Verificados (Excepciones)**
```javascript
❌ HQ (cuartel general) - nunca se abandona por territorio
❌ front (frentes de batalla) - definen el territorio
❌ specopsCommando - diseñado para territorio enemigo
❌ truckAssault - diseñado para territorio enemigo
❌ cameraDrone - diseñado para territorio enemigo
```

---

## 🔄 Flujo de Verificación

```
┌─────────────────────────────────────────────────────────────┐
│                  CADA 0.2 SEGUNDOS                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1️⃣ Calcular Fronteras                                      │
│     ├─ Player1: Math.max(fronts.x) + 25                     │
│     └─ Player2: Math.min(fronts.x) - 25                     │
│                                                              │
│  2️⃣ Verificar Edificios Player1                             │
│     ├─ Filtrar: constructed && !HQ && !front                │
│     ├─ Para cada edificio:                                  │
│     │   ├─ rightEdge = x + radius                           │
│     │   ├─ isOut = rightEdge > frontier                     │
│     │   ├─ Si isOut && sin timer: iniciar timer             │
│     │   └─ Si !isOut && con timer: resetear timer           │
│     └─ Log: [PLAYER1] FOB_123 FUERA de territorio...        │
│                                                              │
│  3️⃣ Verificar Edificios Player2                             │
│     ├─ Filtrar: constructed && !HQ && !front                │
│     ├─ Para cada edificio:                                  │
│     │   ├─ leftEdge = x - radius                            │
│     │   ├─ isOut = leftEdge < frontier                      │
│     │   ├─ Si isOut && sin timer: iniciar timer             │
│     │   └─ Si !isOut && con timer: resetear timer           │
│     └─ Log: [PLAYER2] FOB_456 FUERA de territorio...        │
│                                                              │
│  4️⃣ Actualizar Timers de Gracia                             │
│     └─ Para cada edificio con timer:                        │
│         └─ outOfTerritoryTimer += dt                        │
│                                                              │
│  5️⃣ Sistema de Abandono (AbandonmentSystem)                 │
│     └─ Si timer >= 3s: iniciar abandono                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🐛 Modo Debug

Para activar logs detallados, edita `server/systems/TerritorySystemServer.js`:

```javascript
constructor(gameState) {
    // ...
    this.debugMode = true; // ← Cambiar a true
}
```

**Logs de Debug**:
```
🎯 Fronteras calculadas:
  Player1 (avanza →) → 825
  Player2 (avanza ←) → 975

   🔍 P1 Frontera: frente más derecho en 800, frontera en 825
   🔍 P2 Frontera: frente más izquierdo en 1000, frontera en 975

⏱️ [PLAYER1] fob fob_1 FUERA de territorio - iniciando gracia de 3s
   🔍 Detalles: leftEdge=870, rightEdge=930, frontier=825

   🔍 P1 fob FUERA: x=900, rightEdge=930, frontier=825
```

---

## 📊 Configuración Actual

```javascript
// server/config/gameConfig.js
territory: {
    frontierGapPx: 25,              // Separación entre frente y frontera
    checkAbandonmentInterval: 0.2,   // Verificar cada 0.2s (5 veces/seg)
    graceTime: 3.0                   // 3 segundos de gracia
}

abandonment: {
    default: {
        phase1Duration: 2000,      // 2s en gris claro
        phase2Duration: 3000       // 3s en gris oscuro
    }
}
```

---

## 🎮 Casos de Ejemplo

### **Caso 1: FOB de Player1 queda fuera**

```
Inicial:
  HQ(100) ───── FOB(500) ─── Front(800) ───►
  
Frente retrocede:
  HQ(100) ───── FOB(500) ◄─── Front(700)
                   ↑
                 FUERA!
                 
Detección:
  rightEdge = 500 + 30 = 530
  frontier = 700 + 25 = 725
  530 > 725? NO → ✅ SEGURO

Frente retrocede más:
  HQ(100) ◄───── Front(400) ──── FOB(500)
                                    ↑
                                  FUERA!
  
Detección:
  rightEdge = 500 + 30 = 530
  frontier = 400 + 25 = 425
  530 > 425? SÍ → ❌ FUERA! Timer inicia
```

### **Caso 2: FOB de Player2 queda fuera**

```
Inicial:
  ◄─── Front(1000) ─── FOB(1300) ───── HQ(1820)
  
Frente retrocede (hacia la derecha):
  Front(1200) ───► FOB(1300) ───── HQ(1820)
                      ↑
                    FUERA!
  
Detección:
  leftEdge = 1300 - 30 = 1270
  frontier = 1200 - 25 = 1175
  1270 < 1175? NO → ✅ SEGURO

Frente retrocede más:
  FOB(1300) ◄─── Front(1400) ───── HQ(1820)
     ↑
   FUERA!
  
Detección:
  leftEdge = 1300 - 30 = 1270
  frontier = 1400 - 25 = 1375
  1270 < 1375? SÍ → ❌ FUERA! Timer inicia
```

---

## ✅ Checklist de Verificación

Para asegurarte de que el sistema funciona correctamente:

- [ ] **Player1**: Construir FOB cerca del frente, hacer retroceder frente
- [ ] **Player1**: Verificar que aparece timer de 3s
- [ ] **Player1**: Verificar que después de 3s inicia abandono
- [ ] **Player2**: Construir FOB cerca del frente, hacer retroceder frente
- [ ] **Player2**: Verificar que aparece timer de 3s
- [ ] **Player2**: Verificar que después de 3s inicia abandono
- [ ] **Ambos**: Hacer que frente avance de nuevo antes de 3s
- [ ] **Ambos**: Verificar que timer se resetea
- [ ] **Comandos**: Verificar que specopsCommando NO se abandona en territorio enemigo
- [ ] **Truck Assault**: Verificar que truckAssault NO se abandona en territorio enemigo

---

**Última actualización**: 23 de Noviembre, 2025

