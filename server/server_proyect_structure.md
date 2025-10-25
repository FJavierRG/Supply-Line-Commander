# 🎮 Supply Line Commander - Servidor Multijugador

Servidor Node.js + Socket.IO para partidas 1v1 en tiempo real.

---

## 🚀 Instalación

### 1. Instalar Dependencias
```bash
cd server
npm install
```

### 2. Iniciar Servidor
```bash
npm start
```

El servidor se ejecutará en **http://localhost:3000**

---

## 📡 API Socket.IO

### **Eventos del Cliente → Servidor**

| Evento | Datos | Descripción |
|--------|-------|-------------|
| `create_room` | `{ playerName }` | Crea nueva sala |
| `join_room` | `{ roomId, playerName }` | Unirse a sala |
| `get_rooms` | - | Listar salas disponibles |
| `player_ready` | `{ roomId }` | Marcar como listo |
| `build_request` | `{ roomId, buildingType, x, y }` | Construir edificio |
| `convoy_request` | `{ roomId, fromId, toId }` | Enviar convoy |

### **Eventos del Servidor → Cliente**

| Evento | Datos | Descripción |
|--------|-------|-------------|
| `room_created` | `{ roomId, playerNumber, playerName }` | Sala creada |
| `room_joined` | `{ roomId, playerNumber, playerName, opponent }` | Unido a sala |
| `opponent_joined` | `{ opponentName }` | Oponente se unió |
| `countdown` | `{ seconds }` | Countdown antes de iniciar |
| `game_start` | `{ myTeam, opponentTeam, initialState, duration }` | Partida iniciada |
| `game_update` | `{ tick, gameTime, nodes, convoys, emergencies, currency }` | Estado completo (20 TPS) |
| `game_over` | `{ winner, reason }` | Partida terminada (victoria/derrota) |
| `building_created` | `{ nodeId, type, x, y, team, constructionTime }` | Edificio creado |
| `convoy_spawned` | `{ convoyId, fromId, toId, team, vehicleType, cargo }` | Convoy enviado |
| `opponent_disconnected` | - | Oponente desconectado |
| `error` | `{ message }` | Error |

---

## 🏗️ Estructura

```
server/
├── package.json
├── server.js                        # Servidor principal
├── managers/
│   └── RoomManager.js               # Gestor de salas
├── game/
│   └── GameStateManager.js          # Estado del juego + integración de sistemas
└── systems/                         # Sistemas de simulación (servidor)
    ├── MedicalSystemServer.js       # Emergencias médicas
    ├── FrontMovementSystemServer.js # Movimiento de frentes
    └── TerritorySystemServer.js     # Control de territorio
```

---

## 🔧 Configuración

### Variables de Entorno
```bash
PORT=3000  # Puerto del servidor (default: 3000)
```

### Desarrollo con Auto-reload
```bash
npm run dev
```

---

## 📊 Endpoints HTTP

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/` | GET | Estado del servidor |
| `/rooms` | GET | Listar salas disponibles |

---

## 🎯 Características Implementadas (v2.0 - Servidor Autoritativo Completo)

### **Fase 0: Refactorización PvP**
- ✅ Sistema unificado de nodos (player1/player2)
- ✅ Sprites dinámicos según equipo
- ✅ Código preparado para PvP

### **Fase 1 v2.0: Servidor Autoritativo Completo**
- ✅ Sistema de salas con códigos únicos (4 caracteres)
- ✅ Matchmaking simple (crear/unirse)
- ✅ Sincronización de estado inicial
- ✅ **Simulación completa en servidor:**
  - ✅ Emergencias médicas (MedicalSystemServer)
  - ✅ Movimiento de frentes (FrontMovementSystemServer)
  - ✅ Control de territorio (TerritorySystemServer)
  - ✅ Movimiento de convoyes y entregas
  - ✅ Currency pasiva y por avance
  - ✅ Consumo de suministros
  - ✅ Construcciones
- ✅ Sincronización completa a 20 TPS
- ✅ Cliente "dumb" (solo renderiza)
- ✅ 0 simulación local en multijugador
- ✅ Detección de desconexión

---

## 🔜 Próximas Características (Fase 2+)

- ⏳ Sistema de drones (servidor)
- ⏳ Sistema anti-drones (servidor)
- ⏳ Francotiradores (servidor)
- ⏳ Condiciones de victoria/derrota (servidor)
- ⏳ Optimización: Delta updates
- ⏳ Sistema de reconexión
- ⏳ Observadores (spectators)

---

**Versión:** 2.0.0 (Servidor Autoritativo Completo)
**Node.js:** >= 18.0.0  
**Socket.IO:** 4.6.1

