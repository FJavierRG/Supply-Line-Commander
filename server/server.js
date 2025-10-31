// ===== SERVIDOR MULTIJUGADOR - Supply Line Commander =====
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './game/managers/RoomManager.js';
import { GameStateManager } from './game/GameStateManager.js';
import { AISystem } from './game/managers/AISystem.js';

const app = express();
const httpServer = createServer(app);

// Configurar CORS más permisivo para desarrollo
app.use(cors({
    origin: true, // Permitir cualquier origen
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Middleware adicional para CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Manejar preflight OPTIONS
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    
    next();
});

app.use(express.json());

// Servir archivos estáticos del cliente (para ngrok/producción)
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '..')));

// Configurar Socket.IO con CORS más permisivo
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Permitir cualquier origen para desarrollo
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["*"],
        credentials: true
    },
    allowEIO3: true // Compatibilidad con versiones anteriores
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
     * Seleccionar raza
     */
    socket.on('select_race', (data) => {
        console.log('🏛️ SERVIDOR: Recibido select_race:', data);
        const { roomId, raceId } = data;
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room) throw new Error('Sala no encontrada');
            
            // Validar que la raza sea válida
            const validRaces = ['A_Nation', 'B_Nation'];
            if (!validRaces.includes(raceId)) {
                throw new Error('Raza inválida');
            }
            
            // Encontrar el jugador y actualizar su raza
            const player = room.players.find(p => p.id === socket.id);
            if (!player) throw new Error('Jugador no encontrado');
            
            player.selectedRace = raceId;
            
            // Confirmar selección al jugador
            socket.emit('race_selected', {
                raceId: raceId,
                playerName: player.name
            });
            
            // Notificar a todos los jugadores de la sala
            io.to(roomId).emit('race_selection_updated', {
                players: room.players.map(p => ({
                    id: p.id,
                    name: p.name,
                    team: p.team,
                    selectedRace: p.selectedRace,
                    ready: p.ready
                }))
            });
            
            console.log(`✅ Jugador ${player.name} seleccionó raza ${raceId} en sala ${roomId}`);
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
     * Añadir IA al slot player2
     */
    socket.on('add_ai_player', (data) => {
        const { race, difficulty } = data;
        const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room) throw new Error('Sala no encontrada');
            
            // Verificar que sea el host (player1)
            const player = room.players.find(p => p.id === socket.id);
            if (!player || player.team !== 'player1') {
                throw new Error('Solo el host puede añadir IA');
            }
            
            // Verificar que no haya player2 humano
            if (room.players.length === 2) {
                throw new Error('Ya hay un jugador en el slot 2');
            }
            
            // 🐛 FIX: Mapear IDs de raza del cliente al servidor
            const raceMapping = {
                'nationA': 'A_Nation',
                'nationB': 'B_Nation',
                'A': 'A_Nation',
                'B': 'B_Nation'
            };
            const mappedRace = raceMapping[race] || race;
            
            // Añadir IA como player2
            room.aiPlayer = {
                isAI: true,
                race: mappedRace,
                difficulty: difficulty,
                team: 'player2',
                name: `IA (${difficulty})`,
                ready: true,
                selectedRace: mappedRace
            };
            
            console.log(`🤖 IA añadida a sala ${roomId}: ${mappedRace} (${difficulty})`);
            
            // Notificar a todos en la sala
            io.to(roomId).emit('ai_player_added', {
                race: race,
                difficulty: difficulty
            });
            
            // Actualizar lobby
            broadcastLobbyUpdate(roomId);
            
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });
    
    /**
     * Actualizar configuración de IA
     */
    socket.on('update_ai_player', (data) => {
        const { race, difficulty } = data;
        const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room) throw new Error('Sala no encontrada');
            
            // Verificar que sea el host (player1)
            const player = room.players.find(p => p.id === socket.id);
            if (!player || player.team !== 'player1') {
                throw new Error('Solo el host puede actualizar IA');
            }
            
            // Verificar que haya IA
            if (!room.aiPlayer) {
                throw new Error('No hay IA para actualizar');
            }
            
            // Actualizar IA
            room.aiPlayer.race = race;
            room.aiPlayer.difficulty = difficulty;
            room.aiPlayer.selectedRace = race;
            room.aiPlayer.name = `IA (${difficulty})`;
            
            console.log(`🤖 IA actualizada en sala ${roomId}: ${race} (${difficulty})`);
            
            // Notificar a todos en la sala
            io.to(roomId).emit('ai_player_updated', {
                race: race,
                difficulty: difficulty
            });
            
            // Actualizar lobby
            broadcastLobbyUpdate(roomId);
            
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });
    
    /**
     * Quitar IA del slot player2
     */
    socket.on('remove_ai_player', () => {
        const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room) throw new Error('Sala no encontrada');
            
            // Verificar que sea el host (player1)
            const player = room.players.find(p => p.id === socket.id);
            if (!player || player.team !== 'player1') {
                throw new Error('Solo el host puede quitar IA');
            }
            
            // Quitar IA
            room.aiPlayer = null;
            
            console.log(`🤖 IA eliminada de sala ${roomId}`);
            
            // Notificar a todos en la sala
            io.to(roomId).emit('ai_player_removed');
            
            // Actualizar lobby
            broadcastLobbyUpdate(roomId);
            
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
            
            // 🆕 NUEVO: Verificar que haya 2 jugadores O 1 jugador + IA
            const hasPlayer2 = room.players.length === 2;
            const hasAI = room.aiPlayer !== null && room.aiPlayer !== undefined;
            
            if (!hasPlayer2 && !hasAI) {
                throw new Error('Se necesita un oponente (jugador o IA) para iniciar');
            }
            
            // Verificar que todos estén ready
            if (!roomManager.allPlayersReady(roomId)) {
                throw new Error('Todos los jugadores deben estar listos');
            }
            
            // 🆕 NUEVO: Verificar que ambos jugadores hayan seleccionado raza
            const player1 = room.players.find(p => p.team === 'player1');
            const player2 = room.players.find(p => p.team === 'player2');
            
            // Si hay IA, su raza ya está seleccionada
            if (hasAI) {
                if (!player1.selectedRace) {
                    throw new Error('Debes seleccionar una raza');
                }
            } else {
                // Si son 2 jugadores humanos
                if (!player1.selectedRace || !player2.selectedRace) {
                    throw new Error('Ambos jugadores deben seleccionar una raza');
                }
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
                // 🆕 NUEVO: Distinguir entre convoy y helicóptero
                if (result.helicopter) {
                    // Es un helicóptero - enviar evento especial
                    const heliData = {
                        helicopterId: result.helicopter.id,
                        fromId,
                        toId,
                        team: playerTeam
                    };
                    
                    io.to(roomId).emit('helicopter_dispatched', heliData);
                } else {
                    // Es un convoy tradicional
                    const convoyData = {
                        convoyId: result.convoy.id,
                        fromId,
                        toId,
                        team: playerTeam,
                        vehicleType: result.convoy.vehicleType,
                        cargo: result.convoy.cargo
                    };
                    
                    io.to(roomId).emit('convoy_spawned', convoyData);
                }
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
     * Sabotaje de FOB
     */
    socket.on('fob_sabotage_request', (data) => {
        const { roomId, targetId } = data;
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room || !room.gameState) throw new Error('Partida no iniciada');
            
            const playerTeam = roomManager.getPlayerTeam(roomId, socket.id);
            const result = room.gameState.handleFobSabotage(playerTeam, targetId);
            
            if (result.success) {
                // Broadcast a todos
                io.to(roomId).emit('fob_sabotage_fired', {
                    saboteurId: playerTeam,
                    targetId: result.targetId,
                    effect: result.effect
                });
                
                console.log(`⚡ FOB sabotajeada por ${playerTeam} → FOB ${targetId}`);
            } else {
                socket.emit('fob_sabotage_failed', { reason: result.reason });
                console.log(`⚠️ Sabotaje rechazado: ${result.reason}`);
            }
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });
    
    /**
     * 🆕 NUEVO: Despliegue de comando especial operativo
     */
    socket.on('commando_deploy_request', (data) => {
        const { roomId, x, y } = data;
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room || !room.gameState) throw new Error('Partida no iniciada');
            
            const playerTeam = roomManager.getPlayerTeam(roomId, socket.id);
            const result = room.gameState.handleCommandoDeploy(playerTeam, x, y);
            
            if (result.success) {
                // Broadcast a todos
                io.to(roomId).emit('commando_deployed', {
                    commandoId: result.commando.id,
                    team: playerTeam,
                    x: result.commando.x,
                    y: result.commando.y,
                    detectionRadius: result.commando.detectionRadius
                });
                
                console.log(`🎖️ Comando desplegado por ${playerTeam} en (${x.toFixed(0)}, ${y.toFixed(0)})`);
            } else {
                socket.emit('commando_deploy_failed', { reason: result.reason });
                console.log(`⚠️ Despliegue de comando rechazado: ${result.reason}`);
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
    
    /**
     * Ping/pong para medir latencia
     */
    socket.on('ping', (timestamp) => {
        socket.emit('pong', timestamp);
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
            selectedRace: p.selectedRace,
            isHost: room.players[0].id === p.id
        })),
        // 🤖 NUEVO: Incluir información de IA si existe
        aiPlayer: room.aiPlayer ? {
            isAI: true,
            name: room.aiPlayer.name,
            race: room.aiPlayer.race,
            difficulty: room.aiPlayer.difficulty,
            team: 'player2',
            ready: true
        } : null
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
        
        // 🆕 CENTRALIZADO: Establecer razas seleccionadas ANTES de crear estado inicial
        const player1 = room.players.find(p => p.team === 'player1');
        const player2 = room.players.find(p => p.team === 'player2');
        
        // 🤖 NUEVO: Si hay IA, usar sus datos
        const hasAI = room.aiPlayer !== null && room.aiPlayer !== undefined;
        
        if (player1.selectedRace) {
            gameState.setPlayerRace('player1', player1.selectedRace);
            console.log(`🏛️ Raza establecida para player1: ${player1.selectedRace}`);
        }
        
        if (hasAI) {
            // IA en player2
            gameState.setPlayerRace('player2', room.aiPlayer.race);
            console.log(`🤖 Raza establecida para IA (player2): ${room.aiPlayer.race} (${room.aiPlayer.difficulty})`);
            room.hasAI = true;
            room.aiDifficulty = room.aiPlayer.difficulty;
        } else if (player2 && player2.selectedRace) {
            // Jugador humano en player2
            gameState.setPlayerRace('player2', player2.selectedRace);
            console.log(`🏛️ Raza establecida para player2: ${player2.selectedRace}`);
        }
        
        // 🤖 NUEVO: Inicializar AISystem con io y roomId para simular eventos de jugador
        if (hasAI) {
            gameState.aiSystem = new AISystem(gameState, io, roomId);
        }
        
        // 🆕 CENTRALIZADO: Ahora crear estado inicial con las razas ya configuradas
        const initialState = gameState.getInitialState();
        
        // Enviar estado inicial a cada jugador (con su team asignado)
        room.players.forEach(player => {
            const playerSocket = io.sockets.sockets.get(player.id);
            if (playerSocket) {
                playerSocket.emit('game_start', {
                    myTeam: player.team,
                    opponentTeam: player.team === 'player1' ? 'player2' : 'player1',
                    selectedRace: player.selectedRace, // 🆕 NUEVO: Enviar raza seleccionada
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
    console.log(`🌐 http://0.0.0.0:${PORT}`);
    console.log('✅ CORS configurado para permitir cualquier origen');
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

