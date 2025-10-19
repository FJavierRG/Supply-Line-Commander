# 🎮 LOBBY MEJORADO - IMPLEMENTACIÓN

## ✅ **SERVIDOR COMPLETADO**

### **`server/managers/RoomManager.js`** - Nuevos métodos:
- `setPlayerReady(roomId, playerId, ready)` - Marcar jugador como ready/not ready
- `allPlayersReady(roomId)` - Verificar si todos están ready
- `isHost(roomId, playerId)` - Verificar si un jugador es el host
- `kickPlayer(roomId, hostId, targetPlayerId)` - Expulsar jugador (solo host)
- `removePlayer(roomId, playerId)` - Remover jugador al desconectarse

### **`server/server.js`** - Nuevos eventos:

#### **Eventos Socket.IO:**
1. **`player_ready`** - Marcar jugador como ready
   ```javascript
   socket.emit('player_ready', { roomId, ready: true/false });
   ```

2. **`kick_player`** - Expulsar jugador (solo host)
   ```javascript
   socket.emit('kick_player', { roomId, targetPlayerId });
   ```

3. **`lobby_chat`** - Enviar mensaje de chat
   ```javascript
   socket.emit('lobby_chat', { roomId, message: 'Hola!' });
   ```

4. **`start_game`** - Modificado para verificar que todos estén ready

#### **Eventos recibidos del servidor:**
1. **`lobby_update`** - Estado actualizado del lobby
   ```javascript
   {
       players: [
           { id, name, team, ready, isHost },
           { id, name, team, ready, isHost }
       ]
   }
   ```

2. **`kicked_from_room`** - Jugador fue expulsado
   ```javascript
   { roomId }
   ```

3. **`lobby_chat_message`** - Mensaje de chat recibido
   ```javascript
   { playerName, message, timestamp }
   ```

### **Función helper:**
- `broadcastLobbyUpdate(roomId)` - Envía estado actual del lobby a todos

---

## ✅ **CLIENTE COMPLETADO**

### **`src/systems/NetworkManager.js`** - Añadir:

1. **Handlers de eventos:**
   ```javascript
   socket.on('lobby_update', (data) => {
       this.updateLobbyUI(data);
   });
   
   socket.on('kicked_from_room', (data) => {
       this.handleKicked(data);
   });
   
   socket.on('lobby_chat_message', (data) => {
       this.addChatMessage(data);
   });
   ```

2. **Métodos para enviar:**
   ```javascript
   setReady(ready) {
       socket.emit('player_ready', { roomId: this.roomId, ready });
   }
   
   kickPlayer(targetPlayerId) {
       socket.emit('kick_player', { roomId: this.roomId, targetPlayerId });
   }
   
   sendChatMessage(message) {
       socket.emit('lobby_chat', { roomId: this.roomId, message });
   }
   ```

3. **UI del lobby:**
   - Mostrar lista de jugadores con nombres
   - Indicar quién es el host (⭐)
   - Mostrar estado ready (✅/❌)
   - Botón "Listo" para cada jugador
   - Botón "Expulsar" para el host (solo visible para jugador no host)
   - Chat básico con:
     - Área de mensajes
     - Input para escribir
     - Botón enviar
   - El host solo puede iniciar si TODOS están ready

---

## 🎨 **DISEÑO PROPUESTO DEL LOBBY**

```
┌─────────────────────────────────────────┐
│         SALA: AB12                       │
├─────────────────────────────────────────┤
│                                          │
│  JUGADORES:                              │
│  ┌────────────────────────────────────┐ │
│  │ ⭐ Jugador1 (Tú)         ✅ Listo │ │
│  │ Equipo: Azul                       │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ 👤 Jugador2              ❌ No    │ │
│  │ Equipo: Rojo                       │ │
│  │                    [🚫 Expulsar]   │ │
│  └────────────────────────────────────┘ │
│                                          │
│  CHAT:                                   │
│  ┌────────────────────────────────────┐ │
│  │ Jugador1: ¡Hola!                   │ │
│  │ Jugador2: ¡Listo!                  │ │
│  │                                    │ │
│  └────────────────────────────────────┘ │
│  [________________] [Enviar]             │
│                                          │
│                                          │
│    [◻️ No Listo]    [▶️ Iniciar]        │
│                     (bloqueado)          │
└─────────────────────────────────────────┘
```

---

## 📋 **ESTADO DE IMPLEMENTACIÓN**

1. ✅ Servidor implementado
2. ✅ Client-side implementado (NetworkManager)
3. ✅ UI del lobby creada
4. ⏳ Testing completo

---

## ✅ **RESUMEN DE LO IMPLEMENTADO**

### **Archivos modificados:**

1. **`server/managers/RoomManager.js`**
   - ✅ `setPlayerReady()` - Sistema de ready
   - ✅ `allPlayersReady()` - Validación
   - ✅ `isHost()` - Verificación de host
   - ✅ `kickPlayer()` - Expulsión
   - ✅ `removePlayer()` - Desconexión limpia

2. **`server/server.js`**
   - ✅ `player_ready` event - Cambiar estado ready
   - ✅ `kick_player` event - Expulsar jugadores
   - ✅ `lobby_chat` event - Sistema de chat
   - ✅ `lobby_update` broadcast - Actualización automática
   - ✅ Mensajes del sistema automáticos
   - ✅ Verificación de ready antes de iniciar
   - ✅ Manejo mejorado de desconexiones

3. **`index.html`**
   - ✅ Nueva estructura del lobby con dos vistas
   - ✅ Vista inicial (crear/unirse)
   - ✅ Vista de sala (jugadores + chat + botones)

4. **`src/systems/NetworkManager.js`**
   - ✅ `showRoomView()` - Mostrar sala
   - ✅ `updateLobbyUI()` - Renderizar jugadores con estilos
   - ✅ `setupLobbyButtons()` - Event listeners
   - ✅ `sendChatMessage()` - Enviar chat
   - ✅ `addChatMessage()` - Renderizar mensajes (sistema/jugador)
   - ✅ `kickPlayer()` - Expulsar con confirmación
   - ✅ `leaveRoom()` - Salir de sala
   - ✅ Handlers para todos los eventos del servidor

5. **`src/systems/InputHandler.js`**
   - ✅ `hideMultiplayerLobby()` actualizado
   - ✅ Reseteo de vistas
   - ✅ Llamada a `leaveRoom()`

---

## 🎮 **CARACTERÍSTICAS IMPLEMENTADAS**

### ✅ **Lista de Jugadores:**
- Muestra ambos jugadores con nombres
- Indica quién es el host (⭐)
- Muestra equipo (Azul/Rojo)
- Indica estado de ready (✅/❌)
- Botón "Expulsar" para el host

### ✅ **Sistema de Ready:**
- Botón toggle "Listo" / "No Listo"
- Cambia color según estado (verde/gris)
- El host solo puede iniciar si TODOS están ready
- Notificación automática en el chat

### ✅ **Chat del Lobby:**
- Mensajes con timestamp
- Diferencia entre mensajes de jugadores y del sistema
- Auto-scroll
- Enter para enviar
- Mensajes automáticos:
  - Al crear sala
  - Al unirse alguien
  - Al cambiar estado ready
  - Al expulsar jugador

### ✅ **Expulsión de Jugadores:**
- Solo el host puede expulsar
- Confirmación antes de expulsar
- El expulsado vuelve al menú con alerta
- Actualización automática del lobby

### ✅ **Manejo de Desconexiones:**
- Si estaba en lobby: remover jugador y actualizar
- Si estaba jugando: eliminar sala completa
- Notificación al otro jugador

---

## 🔧 **NOTAS TÉCNICAS**

- El host no puede expulsarse a sí mismo
- Solo el host puede iniciar la partida
- La partida solo se inicia si TODOS están ready
- Si un jugador se desconecta, se elimina de la sala
- Si el último jugador se desconecta, la sala se elimina
- Los mensajes de chat son broadcast a todos en la sala
- El estado del lobby se actualiza automáticamente cuando:
  - Un jugador se une
  - Un jugador cambia su estado de ready
  - Un jugador es expulsado

