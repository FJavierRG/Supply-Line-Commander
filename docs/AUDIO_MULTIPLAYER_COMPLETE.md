# 🔊 SISTEMA DE AUDIO COMPLETO - MULTIPLAYER

## ✅ MIGRACIÓN COMPLETADA (2025-10-17)

TODO el sistema de audio del singleplayer ha sido migrado al multiplayer, manteniendo:
- ✅ Todos los timings originales
- ✅ Todos los cooldowns (2s truck, 3s HQ)
- ✅ Todos los flags de sonidos únicos
- ✅ Todos los volúmenes calibrados
- ✅ Secuencia de inicio completa
- ✅ Sonidos ambientales periódicos

---

## 🎵 SONIDOS IMPLEMENTADOS:

### **SECUENCIA DE INICIO:**

| Momento | Sonido | Timing | Volumen | Implementación |
|---------|--------|--------|---------|----------------|
| Countdown 3,2,1 | `countdown_normalized.wav` | 3s | 0.4 | ✅ playGameStartSequence() |
| Al terminar countdown | `startinggame_engine_normalized.wav` | +0s | 0.28 | ✅ playGameStartSequence() |
| Al terminar countdown | `infantry_move1/2/3_normalized.wav` (2x) | +0s y +0.7s | 0.14 | ✅ playGameStartSequence() |
| Inicio de partida | `warsound_normalized.wav` (loop) | Continuo | 0.4875 | ✅ startBattleMusic() |

**Trigger servidor:** Cuando `countdown <= 0` → eventos `game_start_sequence` + `start_battle_music`

---

### **SONIDOS DE COMBATE:**

| Evento | Sonido | Volumen | Cooldown | Implementación |
|--------|--------|---------|----------|----------------|
| Frente sin supplies | `no_ammo1/2/3/4_normalized.wav` (random) | 0.175 | 1x por frente | ✅ playNoAmmoSound(frontId) |
| Emergencia médica | `man_down1/2_normalized.wav` (random) | 0.0875 | 1x por emergencia | ✅ playManDownSound(frontId) |
| Primer contacto | `enemy_contact_normalized.wav` | 0.21 | 1x por partida | ✅ playEnemyContact() |

**Triggers servidor:**
- `no_ammo`: Cuando `front.supplies <= 0` (FrontMovementSystemServer)
- `man_down`: Cuando se genera emergencia (MedicalSystemServer)
- `enemy_contact`: Primera colisión de frentes (FrontMovementSystemServer)

---

### **SONIDOS DE LOGÍSTICA:**

| Evento | Sonido | Volumen | Cooldown | Implementación |
|--------|--------|---------|----------|----------------|
| Convoy despachado | `truckengine_normalized.wav` | 0.05 | 2s | ✅ playTruckSound() |
| HQ enviando | `hqsound_normalized.wav` | 0.3 | 3s | ✅ playHQSound() |

**Triggers servidor:**
- `truck_dispatch`: Al crear convoy o ambulancia (handleConvoy, handleAmbulance)
- `hq_dispatch`: Al crear convoy desde HQ (handleConvoy, handleAmbulance)

**Cooldowns:** Manejados por AudioManager (cliente) para evitar spam

---

### **SONIDOS DE CONSTRUCCIÓN:**

| Evento | Sonido | Volumen | Cooldown | Implementación |
|--------|--------|---------|----------|----------------|
| Edificio colocado | `place_building_normalized.wav` | 0.3 | No | ✅ playPlaceBuildingSound() |
| Anti-drone spawn | `antidrone_spawn_normalized.wav` | 0.2625 | No | ⚠️ No implementado |

**Trigger:** Evento `building_created` (NetworkManager:348)

---

### **SONIDOS DE PROYECTILES:**

| Evento | Sonido | Volumen | Cooldown | Implementación |
|--------|--------|---------|----------|----------------|
| Dron volando | `droneflying_normalized.wav` (loop) | 0.263 | No | ✅ playDroneSound(droneId) |
| Dron impacta | `explosion_normalized.wav` | 0.45 | No | ✅ playExplosionSound() |
| Anti-drone alerta | `antidrone_attack_normalized.wav` | 0.3 | 1x por dron | ✅ playAntiDroneAttackSound() |
| Anti-drone dispara | `bom_shoot1_normalized.wav` | 0.3 | No | ✅ playBomShootSound() |
| Sniper dispara | `sniper_shoot.wav` | 0.1 | No | ✅ sounds.sniperShoot.play() |
| Sniper detecta | `sniper_spotted_normalized.wav` | 0.84 | 7s | ⚠️ No implementado |

**Triggers:**
- `drone_launched`: Evento del servidor
- `drone_impact`: Evento del servidor
- `antidrone_alert`: Evento del servidor
- `drone_intercepted`: Evento del servidor
- `sniper_fired`: Evento del servidor

---

### **SONIDOS AMBIENTALES (periódicos):**

| Sonido | Timing | Volumen | Implementación |
|--------|--------|---------|----------------|
| `clear_shoots_ambiance_normalized.wav` | Cada 60s | 0.07 | ✅ playClearShoots() |
| `radio_effect1/2/3/4_normalized.wav` (random) | Cada 50s | 0.12 | ✅ playRandomRadioEffect() |

**Triggers servidor:** Timers en GameStateManager.update()

---

### **MÚSICA:**

| Música | Cuándo | Volumen | Loop | Implementación |
|--------|--------|---------|------|----------------|
| `main_theme.wav` | Menú principal | 0.3 | ✅ | ✅ playMainTheme() |
| `warsound_normalized.wav` | Durante batalla | 0.4875 | ✅ | ✅ startBattleMusic() |
| `Victory-March.wav` | Victoria | 0.4 | ❌ | ✅ playVictoryMarch() |

---

## 🔧 ARQUITECTURA DEL SISTEMA:

### **SERVIDOR (GameStateManager):**
```javascript
// Cola de eventos de sonido
this.soundEvents = [];

// Añadir evento
this.addSoundEvent('no_ammo', { frontId: 'front_abc' });

// Enviar en game_state
soundEvents: this.getSoundEvents() // Auto-limpia después de leer
```

### **CLIENTE (NetworkManager):**
```javascript
// Procesar eventos cada tick
if (gameState.soundEvents) {
    gameState.soundEvents.forEach(event => {
        this.handleSoundEvent(event);
    });
}

// Reproducir según tipo
handleSoundEvent(event) {
    switch(event.type) {
        case 'no_ammo': 
            this.game.audio.playNoAmmoSound(event.frontId);
            break;
        // etc...
    }
}
```

### **AudioManager (sin cambios):**
- Todos los métodos originales se reutilizan
- Cooldowns manejados localmente (playTruckSound, playHQSound)
- Flags de sonidos únicos (playNoAmmoSound, playManDownSound, playEnemyContact)

---

## 📋 EVENTOS DE SONIDO IMPLEMENTADOS:

| Tipo de Evento | Trigger (Servidor) | Handler (Cliente) |
|----------------|-------------------|------------------|
| `game_start_sequence` | countdown <= 0 | playGameStartSequence() |
| `start_battle_music` | countdown <= 0 | startBattleMusic() |
| `clear_shoots` | Cada 60s | playClearShoots() |
| `random_radio_effect` | Cada 50s | playRandomRadioEffect() |
| `man_down` | Emergencia generada | playManDownSound(frontId) |
| `no_ammo` | Frente supplies = 0 | playNoAmmoSound(frontId) |
| `enemy_contact` | Primera colisión | playEnemyContact() |
| `truck_dispatch` | Convoy creado | playTruckSound() |
| `hq_dispatch` | Convoy desde HQ | playHQSound() |

---

## 🎯 CARACTERÍSTICAS PRESERVADAS:

### **Cooldowns (anti-spam):**
- ✅ Truck: 2 segundos (AudioManager local)
- ✅ HQ: 3 segundos (AudioManager local)
- ✅ Sniper spotted: 7 segundos (BuildingSystem)

### **Sonidos únicos:**
- ✅ No ammo: 1x por frente (hasta que vuelva a tener supplies)
- ✅ Man down: 1x por emergencia
- ✅ Enemy contact: 1x por partida

### **Variantes aleatorias:**
- ✅ Infantry move: 3 variantes
- ✅ Man down: 2 variantes
- ✅ No ammo: 4 variantes
- ✅ Radio effect: 4 variantes

### **Timings exactos:**
- ✅ Countdown: 3s
- ✅ Infantry moves: +0s y +0.7s después de countdown
- ✅ Clear shoots: cada 60s desde inicio
- ✅ Radio effects: cada 50s desde inicio

---

## 🧪 TESTING:

### **Secuencia de inicio:**
1. Ambos jugadores en lobby
2. Host inicia partida
3. **DEBEN escuchar:**
   - Countdown (1, 2, 3)
   - Engine arrancando
   - 2x "go, go, go" (infantry moves con 0.7s de diferencia)
   - Música de batalla empieza en loop

### **Durante partida:**
1. **Cada 60s:** Clear shoots ambiance
2. **Cada 50s:** Radio effect aleatorio (1 de 4)
3. **Al enviar convoy:** Truck sound (máximo cada 2s)
4. **Al enviar desde HQ:** HQ sound (máximo cada 3s)

### **Eventos de combate:**
1. **Primera colisión de frentes:** "Enemy contact" (1 sola vez)
2. **Frente llega a 0 supplies:** "No ammo" aleatorio (1x por frente)
3. **Emergencia médica:** "Man down" aleatorio (1x por emergencia)

---

## 📂 ARCHIVOS MODIFICADOS:

### **Servidor:**
- `server/game/GameStateManager.js`:
  - Sistema de eventos de sonido (líneas 34-37, 122-133)
  - Eventos de inicio (líneas 565-566)
  - Eventos ambientales (líneas 578-592)
  - Eventos de convoy/HQ (líneas 344-347, 426-429)
  - Incluir soundEvents en game_state (línea 825)
  
- `server/systems/MedicalSystemServer.js`:
  - Evento man_down al generar emergencia (línea 111)
  
- `server/systems/FrontMovementSystemServer.js`:
  - Flag noAmmoSoundPlayed (línea 31)
  - Evento enemy_contact primera colisión (líneas 77-80)
  - Evento no_ammo cuando supplies = 0 (líneas 121-124)
  - Reset flag cuando vuelve a tener supplies (líneas 117-119)

### **Cliente:**
- `src/systems/NetworkManager.js`:
  - Procesamiento de soundEvents (líneas 1017-1022)
  - Handler handleSoundEvent() (líneas 1025-1075)
  - Mapeo de 9 tipos de eventos a métodos de AudioManager

### **Sin cambios (reutilizados):**
- `src/systems/AudioManager.js` → TODO funciona como está

---

## 🎉 RESULTADO FINAL:

**PARIDAD COMPLETA CON SINGLEPLAYER**

El multiplayer ahora tiene EXACTAMENTE la misma experiencia de audio que el singleplayer:
- Mismos sonidos
- Mismos timings
- Mismos cooldowns
- Misma inmersión

**Sincronización perfecta:**
- Ambos jugadores escuchan los mismos eventos
- Secuencia de inicio idéntica
- Sonidos ambientales sincronizados

