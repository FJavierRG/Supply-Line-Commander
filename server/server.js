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
// IMPORTANTE: Configurar headers correctos para módulos ES6
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readdirSync } from 'fs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Debug: Verificar rutas en producción
const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const indexHtmlPath = path.join(rootDir, 'index.html');
const convoyPath = path.join(srcDir, 'entities', 'Convoy.js');

console.log('📁 Directorio del servidor:', __dirname);
console.log('📁 Directorio raíz del proyecto:', rootDir);
console.log('📁 Directorio src existe:', existsSync(srcDir));
console.log('📁 index.html existe:', existsSync(indexHtmlPath));
console.log('📁 src/entities/Convoy.js existe:', existsSync(convoyPath));

// Middleware de logging para debugging ANTES de servir archivos estáticos
app.use((req, res, next) => {
    // Loggear solo archivos .js que no sean de API
    if (req.path.endsWith('.js') && !req.path.startsWith('/api/')) {
        const requestedPath = path.join(rootDir, req.path);
        const exists = existsSync(requestedPath);
        if (!exists) {
            console.log(`❌ 404: ${req.path}`);
            console.log(`   Ruta completa: ${requestedPath}`);
            console.log(`   Directorio raíz: ${rootDir}`);
            // Intentar con diferentes variaciones de casing
            const pathLower = requestedPath.toLowerCase();
            const pathUpper = requestedPath.toUpperCase();
            console.log(`   ¿Existe en minúsculas?: ${existsSync(pathLower)}`);
            console.log(`   ¿Existe en mayúsculas?: ${existsSync(pathUpper)}`);
            
            // Listar archivos en el directorio para debug
            try {
                const dir = path.dirname(requestedPath);
                if (existsSync(dir)) {
                    const files = readdirSync(dir);
                    console.log(`   Archivos en ${dir}:`, files);
                }
            } catch (e) {
                console.log(`   Error listando directorio:`, e.message);
            }
        } else {
            console.log(`✅ 200: ${req.path}`);
        }
    }
    next();
});

// CRÍTICO: Servir archivos estáticos PRIMERO, antes de cualquier otro middleware
app.use(express.static(rootDir, {
    // Asegurar que los módulos ES6 se sirvan correctamente
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        }
        // Headers adicionales para CORS en archivos estáticos
        res.setHeader('Access-Control-Allow-Origin', '*');
    },
    // Fallthrough: si no encuentra el archivo, continuar al siguiente middleware
    fallthrough: true
}));

// Middleware para headers adicionales en archivos estáticos
app.use((req, res, next) => {
    // Si es un archivo .js, asegurar que tenga el header correcto para módulos ES6
    if (req.path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    next();
});

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

// Servir index.html en la raíz
app.get('/', (req, res) => {
    // Si es una petición de API (headers Accept: application/json), devolver JSON
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
        res.json({
            game: 'Supply Line Commander',
            version: '2.0.0',
            status: 'online',
            players: io.engine.clientsCount,
            rooms: roomManager.getRoomCount(),
            activeGames: roomManager.getActiveGames()
        });
    } else {
        // Servir index.html para el juego
        const indexPath = path.join(__dirname, '..', 'index.html');
        if (existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).send('index.html no encontrado');
        }
    }
});

app.get('/api/status', (req, res) => {
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

// Catch-all: servir index.html para cualquier ruta que no sea API o archivo estático
// Esto permite que las rutas del cliente funcionen correctamente (SPA)
app.get('*', (req, res, next) => {
    // Si es una petición de API, continuar
    if (req.path.startsWith('/api/')) {
        return next();
    }
    
    // Si es un archivo estático (con extensión), el middleware de static ya lo maneja
    // Si llegamos aquí y es un archivo estático, significa que no se encontró
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|json|woff|woff2|ttf|eot)$/)) {
        // El archivo no existe, devolver 404
        res.status(404).send(`Archivo no encontrado: ${req.path}`);
        return;
    }
    
    // Para cualquier otra ruta, servir index.html (SPA routing)
    const indexPath = path.join(__dirname, '..', 'index.html');
    if (existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('index.html no encontrado');
    }
});

// ===== SOCKET.IO EVENTOS =====

io.on('connection', (socket) => {
    console.log(`✅ Cliente conectado: ${socket.id}`);
    
    // 🎯 NUEVO: Enviar configuración del juego al cliente (incluyendo límite de mazo)
    (async () => {
        const { GAME_CONFIG } = await import('./config/gameConfig.js');
        socket.emit('game_config', {
            deckPointLimit: GAME_CONFIG.deck.pointLimit || 650
        });
    })();
    
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
     * Seleccionar raza/mazo
     * 🎯 ACTUALIZADO: Ahora acepta deckId y valida el mazo del jugador
     */
    socket.on('select_race', async (data) => {
        console.log('🎴 SERVIDOR: Recibido select_race (ahora maneja mazos):', data);
        const { roomId, raceId, deckUnits } = data; // raceId ahora es deckId, deckUnits es opcional
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room) throw new Error('Sala no encontrada');
            
            // Encontrar el jugador
            const player = room.players.find(p => p.id === socket.id);
            if (!player) throw new Error('Jugador no encontrado');
            
            // 🎯 NUEVO: Validar y almacenar el mazo
            let validatedDeck = null;
            
            if (raceId === 'default') {
                // Mazo predeterminado - usar el del servidor
                const { DEFAULT_DECK } = await import('./config/defaultDeck.js');
                validatedDeck = {
                    id: 'default',
                    name: 'Mazo Predeterminado',
                    units: DEFAULT_DECK.units
                };
            } else if (deckUnits && Array.isArray(deckUnits)) {
                // 🎯 VALIDACIÓN ANTI-HACK: Validar que todas las unidades sean válidas
                const { SERVER_NODE_CONFIG } = await import('./config/serverNodes.js');
                const { GAME_CONFIG } = await import('./config/gameConfig.js');
                const enabled = SERVER_NODE_CONFIG.gameplay.enabled || {};
                const costs = SERVER_NODE_CONFIG.costs || {};
                const deckPointLimit = GAME_CONFIG.deck.pointLimit || 650;
                
                // Verificar que todas las unidades estén habilitadas en el servidor
                const validUnits = deckUnits.filter(unitId => {
                    const isEnabled = enabled[unitId] === true;
                    if (!isEnabled) {
                        console.warn(`⚠️ Unidad deshabilitada en mazo: ${unitId}`);
                    }
                    return isEnabled;
                });
                
                // El HQ siempre debe estar presente
                if (!validUnits.includes('hq')) {
                    validUnits.unshift('hq');
                }
                
                // 🎯 VALIDACIÓN ANTI-HACK: Calcular costo total del mazo
                // El HQ siempre está presente y no cuenta para el límite
                const deckCost = validUnits
                    .filter(unitId => unitId !== 'hq') // Excluir HQ del cálculo
                    .reduce((total, unitId) => {
                        const unitCost = costs[unitId] || 0;
                        return total + unitCost;
                    }, 0);
                
                // Validar que el costo no exceda el límite
                if (deckCost > deckPointLimit) {
                    console.warn(`🚫 Mazo rechazado: costo ${deckCost} excede límite ${deckPointLimit}`);
                    socket.emit('deck_validation_error', {
                        error: 'INVALID_DECK_COST',
                        message: `El costo del mazo (${deckCost}) excede el límite permitido (${deckPointLimit})`,
                        deckCost: deckCost,
                        deckLimit: deckPointLimit
                    });
                    return; // Rechazar el mazo
                }
                
                console.log(`✅ Mazo validado: ${validUnits.length} unidades, costo total: ${deckCost}/${deckPointLimit}`);
                
                validatedDeck = {
                    id: raceId, // El deckId del cliente
                    name: `Mazo del jugador ${player.name}`,
                    units: validUnits
                };
            } else {
                // Si no hay deckUnits, asumir que es el mazo predeterminado
                const { DEFAULT_DECK } = await import('./config/defaultDeck.js');
                validatedDeck = {
                    id: 'default',
                    name: 'Mazo Predeterminado',
                    units: DEFAULT_DECK.units
                };
            }
            
            // Almacenar el mazo en el jugador
            player.selectedRace = validatedDeck.id; // Mantener compatibilidad con nombre anterior
            player.selectedDeck = validatedDeck; // 🆕 NUEVO: Almacenar mazo completo
            
            // Confirmar selección al jugador
            socket.emit('race_selected', {
                raceId: validatedDeck.id, // Mantener compatibilidad
                deckId: validatedDeck.id, // 🆕 NUEVO
                playerName: player.name
            });
            
            // Notificar a todos los jugadores de la sala
            io.to(roomId).emit('race_selection_updated', {
                players: room.players.map(p => ({
                    id: p.id,
                    name: p.name,
                    team: p.team,
                    selectedRace: p.selectedRace, // Mantener compatibilidad
                    selectedDeck: p.selectedDeck ? { id: p.selectedDeck.id, name: p.selectedDeck.name } : null, // 🆕 NUEVO: Enviar info del mazo
                    ready: p.ready
                }))
            });
            
            console.log(`✅ Jugador ${player.name} seleccionó mazo "${validatedDeck.name}" (${validatedDeck.units.length} unidades) en sala ${roomId}`);
        } catch (error) {
            console.error('❌ Error al seleccionar mazo:', error);
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
                // 🆕 NUEVO: Broadcast a todos con información completa del objetivo
                io.to(roomId).emit('sniper_fired', {
                    shooterId: playerTeam,
                    targetId: result.targetId,
                    effect: result.effect,
                    targetType: result.targetType || 'front', // 'front' o 'commando'
                    eliminated: result.eliminated || false, // true si se eliminó un comando
                    targetX: result.targetX, // 🆕 Coordenadas del objetivo (para feed de kill)
                    targetY: result.targetY
                });
                
                // 🆕 NUEVO: Mensaje de log más descriptivo
                const targetTypeName = result.targetType === 'commando' ? 'comando' : 'frente';
                console.log(`🎯 Sniper disparado por ${playerTeam} → ${targetTypeName} ${targetId}`);
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
                    detectionRadius: result.commando.detectionRadius,
                    spawnTime: result.commando.spawnTime, // 🆕 NUEVO: Tiempo de creación
                    expiresAt: result.commando.expiresAt  // 🆕 NUEVO: Tiempo de expiración
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
     * Lanzamiento de tanque
     * 🆕 NUEVO
     */
    socket.on('tank_request', (data) => {
        const { roomId, targetId } = data;
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room || !room.gameState) throw new Error('Partida no iniciada');
            
            const playerTeam = roomManager.getPlayerTeam(roomId, socket.id);
            const result = room.gameState.handleTankLaunch(playerTeam, targetId);
            
            if (result.success) {
                // Broadcast a todos
                io.to(roomId).emit('tank_launched', {
                    tankId: result.tank.id,
                    targetId: result.targetId,
                    team: playerTeam,
                    x: result.tank.x,
                    y: result.tank.y
                });
                
                console.log(`🛡️ Tanque lanzado por ${playerTeam} → ${targetId}`);
            } else {
                socket.emit('tank_failed', { reason: result.reason });
                console.log(`⚠️ Tanque rechazado: ${result.reason}`);
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
    
    // Mensaje inicial en el chat
    io.to(roomId).emit('lobby_chat_message', {
        playerName: 'Sistema',
        message: '⏱️ La partida comenzará en 3 segundos...',
        timestamp: Date.now()
    });
    
    // Enviar el primer número inmediatamente (3)
    io.to(roomId).emit('countdown', { seconds: countdown });
    io.to(roomId).emit('lobby_chat_message', {
        playerName: 'Sistema',
        message: `⏱️ ${countdown}...`,
        timestamp: Date.now()
    });
    
    const interval = setInterval(() => {
        countdown--;
        
        io.to(roomId).emit('countdown', { seconds: countdown });
        
        if (countdown > 0) {
            // Enviar mensaje de cuenta atrás al chat
            io.to(roomId).emit('lobby_chat_message', {
                playerName: 'Sistema',
                message: `⏱️ ${countdown}...`,
                timestamp: Date.now()
            });
        } else {
            // Cuando llega a 0, mostrar mensaje final y comenzar
            clearInterval(interval);
            io.to(roomId).emit('lobby_chat_message', {
                playerName: 'Sistema',
                message: '🚀 ¡Comienza la partida!',
                timestamp: Date.now()
            });
            startGame(roomId);
        }
    }, 1000);
}

async function startGame(roomId) {
    try {
        const room = roomManager.getRoom(roomId);
        if (!room) throw new Error('Sala no encontrada');
        
        // Crear estado inicial del juego
        const gameState = new GameStateManager(room);
        room.gameState = gameState;
        room.status = 'playing';
        
        // 🆕 CENTRALIZADO: Establecer mazos seleccionados ANTES de crear estado inicial
        const player1 = room.players.find(p => p.team === 'player1');
        const player2 = room.players.find(p => p.team === 'player2');
        
        // 🤖 NUEVO: Si hay IA, usar sus datos
        const hasAI = room.aiPlayer !== null && room.aiPlayer !== undefined;
        
        if (player1 && player1.selectedDeck) {
            // 🎯 NUEVO: Usar mazo en lugar de raza (automáticamente establece A_Nation)
            gameState.setPlayerDeck('player1', player1.selectedDeck);
            console.log(`🎴 Mazo establecido para player1: "${player1.selectedDeck.name}" (${player1.selectedDeck.units.length} unidades)`);
        } else if (player1 && player1.selectedRace) {
            // Fallback: Si solo hay selectedRace (compatibilidad), crear mazo predeterminado
            const { DEFAULT_DECK } = await import('./config/defaultDeck.js');
            gameState.setPlayerDeck('player1', DEFAULT_DECK);
            console.log(`🎴 Mazo predeterminado establecido para player1 (fallback)`);
        } else {
            // 🎯 NUEVO: Si no hay mazo ni raza, establecer mazo predeterminado y A_Nation
            const { DEFAULT_DECK } = await import('./config/defaultDeck.js');
            gameState.setPlayerDeck('player1', DEFAULT_DECK);
            console.log(`🎴 Mazo predeterminado establecido para player1 (sin selección previa)`);
        }
        
        if (hasAI) {
            // IA en player2 - usar raza para compatibilidad con IA
            gameState.setPlayerRace('player2', room.aiPlayer.race);
            console.log(`🤖 Raza establecida para IA (player2): ${room.aiPlayer.race} (${room.aiPlayer.difficulty})`);
            room.hasAI = true;
            room.aiDifficulty = room.aiPlayer.difficulty;
        } else if (player2 && player2.selectedDeck) {
            // 🎯 NUEVO: Usar mazo en lugar de raza (automáticamente establece A_Nation)
            gameState.setPlayerDeck('player2', player2.selectedDeck);
            console.log(`🎴 Mazo establecido para player2: "${player2.selectedDeck.name}" (${player2.selectedDeck.units.length} unidades)`);
        } else if (player2 && player2.selectedRace) {
            // Fallback: Si solo hay selectedRace (compatibilidad), crear mazo predeterminado
            const { DEFAULT_DECK } = await import('./config/defaultDeck.js');
            gameState.setPlayerDeck('player2', DEFAULT_DECK);
            console.log(`🎴 Mazo predeterminado establecido para player2 (fallback)`);
        } else {
            // 🎯 NUEVO: Si no hay mazo ni raza, establecer mazo predeterminado y A_Nation
            const { DEFAULT_DECK } = await import('./config/defaultDeck.js');
            gameState.setPlayerDeck('player2', DEFAULT_DECK);
            console.log(`🎴 Mazo predeterminado establecido para player2 (sin selección previa)`);
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
                
                // Enviar impactos de tanques si hay
                if (gameState.tankImpacts && gameState.tankImpacts.length > 0) {
                    gameState.tankImpacts.forEach(impact => {
                        io.to(roomId).emit('tank_impact', impact);
                        console.log(`💥 Tanque ${impact.tankId} impactó ${impact.targetType} en (${impact.x}, ${impact.y})`);
                    });
                    gameState.tankImpacts = []; // Limpiar después de enviar
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

