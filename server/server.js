// ===== SERVIDOR MULTIJUGADOR - Supply Line Commander =====
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './managers/RoomManager.js';
import { GameStateManager } from './game/GameStateManager.js';

const app = express();
const httpServer = createServer(app);

// Configurar CORS
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del cliente (para ngrok/producción)
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '..')));

// Configurar Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: "*", // En producción, especificar dominio exacto
        methods: ["GET", "POST"]
    }
});

// Managers
const roomManager = new RoomManager();

// Variables globales
const PORT = process.env.PORT || 3000;

// ===== ENDPOINTS HTTP =====

app.get('/', (req, res) => {
    res.json({
        game: 'Supply Line Commander',
        version: '2.0.0',
        status: 'online',
        players: io.engine.clientsCount,
        rooms: roomManager.getRoomCount(),
        activeGames: roomManager.getActiveGames()
    });
});

app.get('/rooms', (req, res) => {
    res.json(roomManager.getAvailableRooms());
});

// ===== SOCKET.IO EVENTOS =====

io.on('connection', (socket) => {
    console.log(`✅ Cliente conectado: ${socket.id}`);
    
    // === LOBBY ===
    
    /**
     * Crear sala nueva
     */
    socket.on('create_room', (data) => {
        const { playerName } = data;
        
        try {
            const room = roomManager.createRoom(socket.id, playerName || 'Jugador 1');
            socket.join(room.id);
            
            socket.emit('room_created', {
                roomId: room.id,
                playerNumber: 1,
                playerName: room.players[0].name
            });
            
            // Enviar estado inicial del lobby
            broadcastLobbyUpdate(room.id);
            
            // Mensaje de bienvenida en el chat
            io.to(room.id).emit('lobby_chat_message', {
                playerName: 'Sistema',
                message: '¡Sala creada! Esperando a un oponente...',
                timestamp: Date.now()
            });
            
            console.log(`🎮 Sala creada: ${room.id} por ${playerName}`);
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });
    
    /**
     * Unirse a sala existente
     */
    socket.on('join_room', (data) => {
        const { roomId, playerName } = data;
        
        try {
            const room = roomManager.joinRoom(roomId, socket.id, playerName || 'Jugador 2');
            socket.join(roomId);
            
            // Notificar al jugador que se unió
            socket.emit('room_joined', {
                roomId: room.id,
                playerNumber: 2,
                playerName: room.players[1].name,
                opponent: room.players[0].name
            });
            
            // Notificar al otro jugador
            socket.to(roomId).emit('opponent_joined', {
                opponentName: playerName || 'Jugador 2'
            });
            
            console.log(`🎮 ${playerName} se unió a sala: ${roomId}`);
            
            // Notificar que la sala está lista (2 jugadores)
            io.to(roomId).emit('room_ready', {
                players: room.players.map(p => ({ name: p.name, team: p.team }))
            });
            
            // Enviar estado actualizado del lobby a todos
            broadcastLobbyUpdate(roomId);
            
            // Mensaje de sistema: jugador se unió
            io.to(roomId).emit('lobby_chat_message', {
                playerName: 'Sistema',
                message: `${playerName || 'Jugador 2'} se unió a la sala`,
                timestamp: Date.now()
            });
            
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });
    
    /**
     * Listar salas disponibles
     */
    socket.on('get_rooms', () => {
        const rooms = roomManager.getAvailableRooms();
        socket.emit('rooms_list', rooms);
    });
    
    /**
     * Marcar jugador como ready/not ready
     */
    socket.on('player_ready', (data) => {
        const { roomId, ready } = data;
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room) throw new Error('Sala no encontrada');
            
            roomManager.setPlayerReady(roomId, socket.id, ready);
            
            // Broadcast actualización del lobby a todos
            broadcastLobbyUpdate(roomId);
            
            // Mensaje del sistema
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                io.to(roomId).emit('lobby_chat_message', {
                    playerName: 'Sistema',
                    message: `${player.name} está ${ready ? 'listo ✅' : 'no listo ❌'}`,
                    timestamp: Date.now()
                });
            }
            
            console.log(`✅ Jugador ${socket.id} marcado como ${ready ? 'ready' : 'not ready'} en sala ${roomId}`);
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });
    
    /**
     * Expulsar jugador (solo host)
     */
    socket.on('kick_player', (data) => {
        const { roomId, targetPlayerId } = data;
        
        try {
            const room = roomManager.getRoom(roomId);
            const kickedPlayer = room.players.find(p => p.id === targetPlayerId);
            const kickedName = kickedPlayer ? kickedPlayer.name : 'Jugador';
            
            roomManager.kickPlayer(roomId, socket.id, targetPlayerId);
            
            // Notificar al jugador expulsado
            io.to(targetPlayerId).emit('kicked_from_room', { roomId });
            
            // Actualizar lobby para el host
            broadcastLobbyUpdate(roomId);
            
            // Mensaje del sistema
            io.to(roomId).emit('lobby_chat_message', {
                playerName: 'Sistema',
                message: `${kickedName} fue expulsado de la sala`,
                timestamp: Date.now()
            });
            
            console.log(`🚫 Jugador ${targetPlayerId} expulsado de sala ${roomId}`);
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });
    
    /**
     * Mensaje de chat en el lobby
     */
    socket.on('lobby_chat', (data) => {
        const { roomId, message } = data;
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room) throw new Error('Sala no encontrada');
            
            const player = room.players.find(p => p.id === socket.id);
            if (!player) throw new Error('Jugador no encontrado en la sala');
            
            // Broadcast mensaje a todos en la sala
            io.to(roomId).emit('lobby_chat_message', {
                playerName: player.name,
                message: message,
                timestamp: Date.now()
            });
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });
    
    /**
     * Host inicia la partida manualmente
     */
    socket.on('start_game', (data) => {
        const { roomId } = data;
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room) throw new Error('Sala no encontrada');
            
            // Verificar que sea el host (player1)
            const player = room.players.find(p => p.id === socket.id);
            if (!player || player.team !== 'player1') {
                throw new Error('Solo el host puede iniciar la partida');
            }
            
            // Verificar que haya 2 jugadores
            if (room.players.length !== 2) {
                throw new Error('Se necesitan 2 jugadores para iniciar');
            }
            
            // Verificar que todos estén ready
            if (!roomManager.allPlayersReady(roomId)) {
                throw new Error('Todos los jugadores deben estar listos');
            }
            
            // Iniciar countdown
            startGameCountdown(roomId);
            
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });
    
    // === JUEGO ===
    
    /**
     * Construcción de edificio
     */
    socket.on('build_request', (data) => {
        const { roomId, buildingType, x, y } = data;
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room || !room.gameState) throw new Error('Partida no iniciada');
            
            const playerTeam = roomManager.getPlayerTeam(roomId, socket.id);
            
            console.log(`🏗️ Build request recibido: ${buildingType} en (${x}, ${y}) por ${playerTeam}`);
            
            const result = room.gameState.handleBuild(playerTeam, buildingType, x, y);
            
            if (result.success) {
                console.log(`✅ Construcción autorizada: ${buildingType} ${result.node.id} - Broadcasting...`);
                
                // Broadcast a todos en la sala
                io.to(roomId).emit('building_created', {
                    nodeId: result.node.id,
                    type: buildingType,
                    x, y,
                    team: playerTeam,
                    constructionTime: result.node.constructionTime
                });
            } else {
                console.log(`⚠️ Construcción rechazada: ${result.reason}`);
                socket.emit('build_failed', { reason: result.reason });
            }
        } catch (error) {
            console.error('❌ Error en build_request:', error);
            socket.emit('error', { message: error.message });
        }
    });
    
    /**
     * Envío de convoy
     */
    socket.on('convoy_request', (data) => {
        const { roomId, fromId, toId } = data;
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room || !room.gameState) throw new Error('Partida no iniciada');
            
            const playerTeam = roomManager.getPlayerTeam(roomId, socket.id);
            const result = room.gameState.handleConvoy(playerTeam, fromId, toId);
            
            if (result.success) {
                // Broadcast a todos
                io.to(roomId).emit('convoy_spawned', {
                    convoyId: result.convoy.id,
                    fromId,
                    toId,
                    team: playerTeam,
                    vehicleType: result.convoy.vehicleType,
                    cargo: result.convoy.cargo
                });
            } else {
                socket.emit('convoy_failed', { reason: result.reason });
            }
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });
    
    /**
     * Envío de ambulancia (emergencia médica)
     */
    socket.on('ambulance_request', (data) => {
        const { roomId, fromId, toId } = data;
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room || !room.gameState) throw new Error('Partida no iniciada');
            
            const playerTeam = roomManager.getPlayerTeam(roomId, socket.id);
            const result = room.gameState.handleAmbulance(playerTeam, fromId, toId);
            
            if (result.success) {
                // Broadcast a todos
                io.to(roomId).emit('ambulance_spawned', {
                    convoyId: result.convoy.id,
                    fromId,
                    toId,
                    team: playerTeam,
                    targetFrontId: result.convoy.targetFrontId
                });
                
                console.log(`🚑 Ambulancia despachada: ${fromId} → ${toId} por ${playerTeam}`);
            } else {
                socket.emit('ambulance_failed', { reason: result.reason });
                console.log(`⚠️ Ambulancia rechazada: ${result.reason}`);
            }
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });
    
    /**
     * Disparo de francotirador
     */
    socket.on('sniper_request', (data) => {
        const { roomId, targetId } = data;
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room || !room.gameState) throw new Error('Partida no iniciada');
            
            const playerTeam = roomManager.getPlayerTeam(roomId, socket.id);
            const result = room.gameState.handleSniperStrike(playerTeam, targetId);
            
            if (result.success) {
                // Broadcast a todos
                io.to(roomId).emit('sniper_fired', {
                    shooterId: playerTeam,
                    targetId: result.targetId,
                    effect: result.effect
                });
                
                console.log(`🎯 Sniper disparado por ${playerTeam} → frente ${targetId}`);
            } else {
                socket.emit('sniper_failed', { reason: result.reason });
                console.log(`⚠️ Sniper rechazado: ${result.reason}`);
            }
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });
    
    /**
     * CHEAT: Dar currency (solo para testing)
     */
    socket.on('cheat_add_currency', (data) => {
        const { roomId, amount } = data;
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room || !room.gameState) throw new Error('Partida no iniciada');
            
            const playerTeam = roomManager.getPlayerTeam(roomId, socket.id);
            room.gameState.currency[playerTeam] += amount;
            
            console.log(`💰 CHEAT: +${amount}$ para ${playerTeam} (total: ${room.gameState.currency[playerTeam]}$)`);
            
            socket.emit('cheat_success', { message: `+${amount}$ añadidos` });
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });
    
    /**
     * Lanzamiento de dron
     */
    socket.on('drone_request', (data) => {
        const { roomId, targetId } = data;
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room || !room.gameState) throw new Error('Partida no iniciada');
            
            const playerTeam = roomManager.getPlayerTeam(roomId, socket.id);
            const result = room.gameState.handleDroneLaunch(playerTeam, targetId);
            
            if (result.success) {
                // Broadcast a todos
                io.to(roomId).emit('drone_launched', {
                    droneId: result.drone.id,
                    launcherId: result.launcherId,
                    targetId: result.targetId,
                    team: playerTeam,
                    x: result.drone.x,
                    y: result.drone.y
                });
                
                console.log(`💣 Dron lanzado por ${playerTeam} → ${targetId}`);
            } else {
                socket.emit('drone_failed', { reason: result.reason });
                console.log(`⚠️ Dron rechazado: ${result.reason}`);
            }
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });
    
    // === DESCONEXIÓN ===
    
    socket.on('disconnect', () => {
        console.log(`❌ Cliente desconectado: ${socket.id}`);
        
        // Buscar sala del jugador
        const room = roomManager.findRoomByPlayer(socket.id);
        
        if (room) {
            const roomId = room.id;
            const wasPlaying = room.status === 'playing';
            
            // Notificar al otro jugador
            socket.to(roomId).emit('opponent_disconnected');
            
            if (wasPlaying) {
                // Si estaba jugando, eliminar sala completa
                roomManager.removeRoom(roomId);
                console.log(`🗑️ Sala eliminada (partida en curso): ${roomId}`);
            } else {
                // Si estaba en lobby, remover jugador y actualizar
                roomManager.removePlayer(roomId, socket.id);
                
                // Si aún hay jugadores, actualizar lobby
                const updatedRoom = roomManager.getRoom(roomId);
                if (updatedRoom) {
                    broadcastLobbyUpdate(roomId);
                    console.log(`👤 Jugador removido de sala: ${roomId}`);
                } else {
                    console.log(`🗑️ Sala eliminada (sin jugadores): ${roomId}`);
                }
            }
        }
    });
});

// ===== FUNCIONES AUXILIARES =====

/**
 * Broadcast actualización del estado del lobby a todos los jugadores de una sala
 */
function broadcastLobbyUpdate(roomId) {
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    
    const lobbyData = {
        players: room.players.map(p => ({
            id: p.id,
            name: p.name,
            team: p.team,
            ready: p.ready,
            isHost: room.players[0].id === p.id
        }))
    };
    
    io.to(roomId).emit('lobby_update', lobbyData);
}

/**
 * Inicia countdown de 3 segundos antes de comenzar partida
 */
function startGameCountdown(roomId) {
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    
    let countdown = 3;
    
    const interval = setInterval(() => {
        io.to(roomId).emit('countdown', { seconds: countdown });
        
        if (countdown === 0) {
            clearInterval(interval);
            startGame(roomId);
        }
        
        countdown--;
    }, 1000);
}

/**
 * Inicia la partida
 */
function startGame(roomId) {
    try {
        const room = roomManager.getRoom(roomId);
        if (!room) throw new Error('Sala no encontrada');
        
        // Crear estado inicial del juego
        const gameState = new GameStateManager(room);
        room.gameState = gameState;
        room.status = 'playing';
        
        const initialState = gameState.getInitialState();
        
        // Enviar estado inicial a cada jugador (con su team asignado)
        room.players.forEach(player => {
            const playerSocket = io.sockets.sockets.get(player.id);
            if (playerSocket) {
                playerSocket.emit('game_start', {
                    myTeam: player.team,
                    opponentTeam: player.team === 'player1' ? 'player2' : 'player1',
                    initialState: initialState,
                    duration: 520
                });
            }
        });
        
        // Iniciar loop del servidor
        gameState.startGameLoop(
            // updateCallback - enviar estado cada tick
            (updates) => {
                io.to(roomId).emit('game_update', updates);
                
                // Enviar impactos de drones si hay
                if (gameState.droneImpacts && gameState.droneImpacts.length > 0) {
                    gameState.droneImpacts.forEach(impact => {
                        io.to(roomId).emit('drone_impact', impact);
                        console.log(`💥 Dron ${impact.droneId} impactó ${impact.targetType} en (${impact.x}, ${impact.y})`);
                    });
                    gameState.droneImpacts = []; // Limpiar después de enviar
                }
                
                // Enviar intercepciones de anti-drones si hay
                if (gameState.droneInterceptions && gameState.droneInterceptions.length > 0) {
                    gameState.droneInterceptions.forEach(interception => {
                        io.to(roomId).emit('drone_intercepted', interception);
                        console.log(`🎯 Anti-drone ${interception.antiDroneId} interceptó dron ${interception.droneId}`);
                    });
                    gameState.droneInterceptions = []; // Limpiar después de enviar
                }
                
                // Enviar alertas de anti-drones si hay
                if (gameState.droneAlerts && gameState.droneAlerts.length > 0) {
                    gameState.droneAlerts.forEach(alert => {
                        io.to(roomId).emit('antidrone_alert', alert);
                    });
                    gameState.droneAlerts = []; // Limpiar después de enviar
                }
            },
            // victoryCallback - enviar victoria cuando termine
            (victoryResult) => {
                console.log(`🏆 Partida terminada en sala ${roomId}: ${victoryResult.winner} ganó`);
                io.to(roomId).emit('game_over', victoryResult);
            }
        );
        
        console.log(`🎮 Partida iniciada en sala: ${roomId}`);
        
    } catch (error) {
        console.error('Error al iniciar partida:', error);
        io.to(roomId).emit('error', { message: 'Error al iniciar partida' });
    }
}

// ===== INICIO DEL SERVIDOR =====

const server = httpServer.listen(PORT, '0.0.0.0', () => {
    console.log('=====================================');
    console.log('  Supply Line Commander - Servidor');
    console.log('=====================================');
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log('=====================================');
});

// Manejo graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 Recibido SIGTERM, cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
    });
});

