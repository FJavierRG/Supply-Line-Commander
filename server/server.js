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
    
    // 🎯 NUEVO: Enviar configuración del juego al cliente (incluyendo límite de mazo y mazo por defecto)
    (async () => {
        const { GAME_CONFIG } = await import('./config/gameConfig.js');
        const { DEFAULT_DECK } = await import('./config/defaultDeck.js');
        socket.emit('game_config', {
            deckPointLimit: GAME_CONFIG.deck.pointLimit,
            benchPointLimit: GAME_CONFIG.deck.benchPointLimit, // 🆕 NUEVO: Límite del banquillo
            defaultDeck: { // 🆕 NUEVO: Mazo por defecto del servidor
                id: DEFAULT_DECK.id,
                name: DEFAULT_DECK.name,
                units: DEFAULT_DECK.units,
                bench: DEFAULT_DECK.bench || []
            }
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
        const { roomId, raceId, deckUnits, benchUnits } = data; // raceId ahora es deckId, deckUnits y benchUnits son opcionales
        
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
                    units: DEFAULT_DECK.units,
                    bench: DEFAULT_DECK.bench || [] // 🆕 NUEVO: Incluir banquillo
                };
            } else if (deckUnits && Array.isArray(deckUnits)) {
                // 🎯 VALIDACIÓN ANTI-HACK: Validar que todas las unidades sean válidas
                const { SERVER_NODE_CONFIG } = await import('./config/serverNodes.js');
                const { GAME_CONFIG } = await import('./config/gameConfig.js');
                const enabled = SERVER_NODE_CONFIG.gameplay.enabled || {};
                const costs = SERVER_NODE_CONFIG.costs || {};
                const deckPointLimit = GAME_CONFIG.deck.pointLimit;
                const benchPointLimit = GAME_CONFIG.deck.benchPointLimit; // 🆕 NUEVO: Límite del banquillo
                
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
                
                // 🆕 NUEVO: Validar banquillo si se proporciona
                let validBenchUnits = [];
                let benchCost = 0;
                
                if (benchUnits && Array.isArray(benchUnits)) {
                    // Verificar que todas las unidades del banquillo estén habilitadas
                    validBenchUnits = benchUnits.filter(unitId => {
                        const isEnabled = enabled[unitId] === true;
                        if (!isEnabled) {
                            console.warn(`⚠️ Unidad deshabilitada en banquillo: ${unitId}`);
                        }
                        return isEnabled;
                    });
                    
                    // Calcular costo del banquillo
                    benchCost = validBenchUnits.reduce((total, unitId) => {
                        const unitCost = costs[unitId] || 0;
                        return total + unitCost;
                    }, 0);
                    
                    // Validar que el costo del banquillo no exceda el límite
                    if (benchCost > benchPointLimit) {
                        console.warn(`🚫 Banquillo rechazado: costo ${benchCost} excede límite ${benchPointLimit}`);
                        socket.emit('deck_validation_error', {
                            error: 'INVALID_BENCH_COST',
                            message: `El costo del banquillo (${benchCost}) excede el límite permitido (${benchPointLimit})`,
                            benchCost: benchCost,
                            benchLimit: benchPointLimit
                        });
                        return; // Rechazar el mazo
                    }
                    
                    // 🆕 NUEVO: Verificar que no haya duplicados entre mazo y banquillo
                    const deckSet = new Set(validUnits);
                    const benchSet = new Set(validBenchUnits);
                    const intersection = [...deckSet].filter(x => benchSet.has(x));
                    if (intersection.length > 0) {
                        console.warn(`🚫 Mazo rechazado: duplicados entre mazo y banquillo: ${intersection.join(', ')}`);
                        socket.emit('deck_validation_error', {
                            error: 'DUPLICATE_UNITS',
                            message: `No puede haber unidades duplicadas entre el mazo y el banquillo: ${intersection.join(', ')}`,
                            duplicates: intersection
                        });
                        return; // Rechazar el mazo
                    }
                    
                    // 🆕 NUEVO: Verificar que el HQ no esté en el banquillo
                    if (validBenchUnits.includes('hq')) {
                        console.warn(`🚫 Mazo rechazado: el HQ no puede estar en el banquillo`);
                        socket.emit('deck_validation_error', {
                            error: 'HQ_IN_BENCH',
                            message: 'El HQ no puede estar en el banquillo'
                        });
                        return; // Rechazar el mazo
                    }
                }
                
                console.log(`✅ Mazo validado: ${validUnits.length} unidades (${deckCost}/${deckPointLimit} puntos), banquillo: ${validBenchUnits.length} unidades (${benchCost}/${benchPointLimit} puntos)`);
                
                validatedDeck = {
                    id: raceId, // El deckId del cliente
                    name: `Mazo del jugador ${player.name}`,
                    units: validUnits,
                    bench: validBenchUnits // 🆕 NUEVO: Incluir banquillo
                };
            } else {
                // Si no hay deckUnits, asumir que es el mazo predeterminado
                const { DEFAULT_DECK } = await import('./config/defaultDeck.js');
                validatedDeck = {
                    id: 'default',
                    name: 'Mazo Predeterminado',
                    units: DEFAULT_DECK.units,
                    bench: DEFAULT_DECK.bench || [] // 🆕 NUEVO: Incluir banquillo
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
     * 🆕 NUEVO: Permutar carta entre mazo y banquillo durante la partida
     */
    socket.on('swap_card', async (data) => {
        const { roomId, deckUnitId, benchUnitId } = data;
        console.log(`🔄 Swap recibido: ${deckUnitId} ↔ ${benchUnitId} en sala ${roomId}`);
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room) throw new Error('Sala no encontrada');
            
            // Verificar que la partida esté en curso
            if (room.status !== 'playing' || !room.gameState) {
                socket.emit('swap_card_error', {
                    error: 'GAME_NOT_STARTED',
                    message: 'La partida no ha comenzado'
                });
                return;
            }
            
            // Encontrar el jugador
            const player = room.players.find(p => p.id === socket.id);
            if (!player) throw new Error('Jugador no encontrado');
            
            // Obtener el mazo actual del jugador
            const playerDeck = room.gameState.raceManager.getPlayerDeck(player.team);
            if (!playerDeck || !playerDeck.units || !playerDeck.bench) {
                socket.emit('swap_card_error', {
                    error: 'DECK_NOT_FOUND',
                    message: 'Mazo no encontrado'
                });
                return;
            }
            
            // Validar que las unidades existan en sus respectivos lugares
            if (!playerDeck.units.includes(deckUnitId)) {
                socket.emit('swap_card_error', {
                    error: 'UNIT_NOT_IN_DECK',
                    message: `La unidad "${deckUnitId}" no está en el mazo`
                });
                return;
            }
            
            if (!playerDeck.bench.includes(benchUnitId)) {
                socket.emit('swap_card_error', {
                    error: 'UNIT_NOT_IN_BENCH',
                    message: `La unidad "${benchUnitId}" no está en el banquillo`
                });
                return;
            }
            
            // Verificar que no se intente intercambiar el HQ
            if (deckUnitId === 'hq') {
                socket.emit('swap_card_error', {
                    error: 'CANNOT_SWAP_HQ',
                    message: 'No se puede intercambiar el HQ'
                });
                return;
            }
            
            // 🆕 NUEVO: NO validar límites de puntos durante la permutación ingame
            // Los límites solo se aplican en el editor. Durante la partida, se puede permutar libremente.
            
            // 🆕 NUEVO: Verificar cooldown de la carta que entra al banquillo
            const gameTime = room.gameState.gameTime || 0;
            if (room.gameState.raceManager.isBenchCardOnCooldown(player.team, benchUnitId, gameTime)) {
                socket.emit('swap_card_error', {
                    error: 'BENCH_CARD_ON_COOLDOWN',
                    message: 'Esta carta está en cooldown y no puede ser intercambiada'
                });
                return;
            }
            
            // Realizar el intercambio
            const deckIndex = playerDeck.units.indexOf(deckUnitId);
            const benchIndex = playerDeck.bench.indexOf(benchUnitId);
            playerDeck.units[deckIndex] = benchUnitId;
            playerDeck.bench[benchIndex] = deckUnitId;
            
            // 🆕 CRÍTICO: Actualizar también en gameState.playerDecks para que getPlayerDeck() devuelva el mazo actualizado
            if (room.gameState.playerDecks && room.gameState.playerDecks[player.team]) {
                room.gameState.playerDecks[player.team].units = [...playerDeck.units];
                room.gameState.playerDecks[player.team].bench = [...playerDeck.bench];
                console.log(`🔄 Mazo actualizado en gameState para ${player.team}: ${playerDeck.units.length} unidades`);
            }
            
            // 🆕 NUEVO: Establecer cooldown para la carta que entra al banquillo (la que viene del deck)
            room.gameState.raceManager.setBenchCooldown(player.team, deckUnitId, gameTime);
            console.log(`⏱️ Cooldown establecido para ${deckUnitId} (team: ${player.team}, gameTime: ${gameTime}, cooldown hasta: ${room.gameState.benchCooldowns[player.team][deckUnitId]})`);
            
            // 🆕 NUEVO: Limpiar cooldown de la carta que sale del banquillo (si tenía uno)
            if (room.gameState.benchCooldowns?.[player.team]?.[benchUnitId]) {
                delete room.gameState.benchCooldowns[player.team][benchUnitId];
                console.log(`✅ Cooldown limpiado para ${benchUnitId} (salió del banquillo)`);
            }
            
            // Actualizar el mazo en el jugador también (para consistencia)
            if (player.selectedDeck) {
                player.selectedDeck.units = [...playerDeck.units];
                player.selectedDeck.bench = [...playerDeck.bench];
            }
            
            // Confirmar el intercambio al jugador
            socket.emit('swap_card_success', {
                deckUnitId: benchUnitId, // La que ahora está en el deck
                benchUnitId: deckUnitId, // La que ahora está en el bench
                newDeck: [...playerDeck.units],
                newBench: [...playerDeck.bench]
            });
            
            console.log(`🔄 Jugador ${player.name} permutó ${deckUnitId} ↔ ${benchUnitId}`);
        } catch (error) {
            console.error('❌ Error al permutar carta:', error);
            socket.emit('swap_card_error', {
                error: 'UNKNOWN_ERROR',
                message: error.message
            });
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
                'A': 'A_Nation'
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
     * 🆕 NUEVO: Activación del Destructor de mundos
     */
    socket.on('world_destroyer_request', (data) => {
        const { roomId } = data;
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room || !room.gameState) throw new Error('Partida no iniciada');
            
            const playerTeam = roomManager.getPlayerTeam(roomId, socket.id);
            const result = room.gameState.handleWorldDestroyer(playerTeam);
            
            if (result.success) {
                // Broadcast a todos que se activó el destructor
                io.to(roomId).emit('world_destroyer_activated', {
                    playerTeam: result.playerTeam,
                    startTime: result.startTime,
                    countdownDuration: result.countdownDuration
                });
                
                console.log(`☠️ Destructor de mundos activado por ${playerTeam}`);
            } else {
                socket.emit('world_destroyer_failed', { reason: result.reason });
                console.log(`⚠️ Destructor de mundos rechazado: ${result.reason}`);
            }
        } catch (error) {
            console.error('❌ Error en world_destroyer_request:', error);
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
                console.log(`⚠️ Comando rechazado: ${result.reason}`);
            }
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });
    
    /**
     * 🆕 NUEVO: Despliegue de camera drone
     */
    socket.on('camera_drone_deploy_request', (data) => {
        const { roomId, x, y } = data;
        
        console.log(`📹 [SERVER] camera_drone_deploy_request recibido: roomId=${roomId}, x=${x}, y=${y}`);
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room || !room.gameState) throw new Error('Partida no iniciada');
            
            const playerTeam = roomManager.getPlayerTeam(roomId, socket.id);
            console.log(`📹 [SERVER] Procesando despliegue para team: ${playerTeam}`);
            
            const result = room.gameState.handleCameraDroneDeploy(playerTeam, x, y);
            
            console.log(`📹 [SERVER] Resultado del despliegue: success=${result.success}`, result);
            
            if (result.success) {
                const eventData = {
                    cameraDroneId: result.cameraDrone.id,
                    team: playerTeam,
                    x: result.cameraDrone.x,
                    y: result.cameraDrone.y,
                    targetX: result.cameraDrone.targetX,
                    targetY: result.cameraDrone.targetY,
                    detectionRadius: result.cameraDrone.detectionRadius,
                    deployed: result.cameraDrone.deployed
                };
                
                console.log(`📹 [SERVER] Emitiendo camera_drone_deployed a room ${roomId}:`, eventData);
                
                // Broadcast a todos
                io.to(roomId).emit('camera_drone_deployed', eventData);
                
                // También enviar actualización de currency inmediatamente
                io.to(roomId).emit('currency_update', {
                    player1: Math.floor(room.gameState.currency.player1),
                    player2: Math.floor(room.gameState.currency.player2)
                });
                
                console.log(`📹 Camera Drone desplegado por ${playerTeam} hacia (${x.toFixed(0)}, ${y.toFixed(0)}) - Currency actualizado: ${room.gameState.currency[playerTeam]}$`);
            } else {
                console.log(`⚠️ [SERVER] Despliegue fallido, enviando camera_drone_deploy_failed: ${result.reason}`);
                socket.emit('camera_drone_deploy_failed', { reason: result.reason });
                console.log(`⚠️ Despliegue de camera drone rechazado: ${result.reason}`);
            }
        } catch (error) {
            console.error(`❌ [SERVER] Error en camera_drone_deploy_request:`, error);
            socket.emit('error', { message: error.message });
        }
    });
    
    /**
     * 🆕 NUEVO: Despliegue de truck assault
     */
    socket.on('truck_assault_deploy_request', (data) => {
        const { roomId, x, y } = data;
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room || !room.gameState) throw new Error('Partida no iniciada');
            
            const playerTeam = roomManager.getPlayerTeam(roomId, socket.id);
            const result = room.gameState.combatHandler.handleTruckAssaultDeploy(playerTeam, x, y);
            
            if (result.success) {
                // Broadcast a todos
                io.to(roomId).emit('truck_assault_deployed', {
                    truckAssaultId: result.truckAssault.id,
                    team: playerTeam,
                    x: result.truckAssault.x,
                    y: result.truckAssault.y,
                    detectionRadius: result.truckAssault.detectionRadius,
                    spawnTime: result.truckAssault.spawnTime,
                    expiresAt: result.truckAssault.expiresAt
                });
                
                console.log(`🚛 Truck Assault desplegado por ${playerTeam} en (${x.toFixed(0)}, ${y.toFixed(0)})`);
            } else {
                socket.emit('truck_assault_deploy_failed', { reason: result.reason });
                console.log(`⚠️ Despliegue de truck assault rechazado: ${result.reason}`);
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
    /**
     * 🆕 NUEVO: Cambiar tipo de recurso seleccionado de un nodo
     */
    socket.on('change_node_resource_type', (data) => {
        const { roomId, nodeId, resourceType } = data;
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room || !room.gameState) throw new Error('Partida no iniciada');
            
            const playerTeam = roomManager.getPlayerTeam(roomId, socket.id);
            const result = room.gameState.changeNodeResourceType(playerTeam, nodeId, resourceType);
            
            if (result.success) {
                // El cambio se sincronizará automáticamente en el próximo game_update
                // No necesitamos emitir un evento específico, el estado del juego se actualizará
                console.log(`🎯 ${playerTeam} cambió tipo de recurso de nodo ${nodeId} a ${resourceType}`);
            } else {
                socket.emit('change_node_resource_type_failed', { reason: result.reason });
                console.log(`⚠️ Cambio de tipo de recurso rechazado: ${result.reason}`);
            }
        } catch (error) {
            console.error('❌ Error en change_node_resource_type:', error);
            socket.emit('error', { message: error.message });
        }
    });
    
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
    
    // 🆕 NUEVO: Solicitud de artillado ligero
    socket.on('light_vehicle_request', (data) => {
        const { roomId, targetId } = data;
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room || !room.gameState) throw new Error('Partida no iniciada');
            
            const playerTeam = roomManager.getPlayerTeam(roomId, socket.id);
            const result = room.gameState.handleLightVehicleLaunch(playerTeam, targetId);
            
            if (result.success) {
                // Broadcast a todos
                io.to(roomId).emit('light_vehicle_launched', {
                    lightVehicleId: result.lightVehicle.id,
                    targetId: result.targetId,
                    team: playerTeam,
                    x: result.lightVehicle.x,
                    y: result.lightVehicle.y
                });
                
                console.log(`🚛 Artillado ligero lanzado por ${playerTeam} → ${targetId}`);
            } else {
                socket.emit('light_vehicle_failed', { reason: result.reason });
                console.log(`⚠️ Artillado ligero rechazado: ${result.reason}`);
            }
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });
    
    // 🆕 NUEVO: Solicitud de artillería
    socket.on('artillery_request', (data) => {
        const { roomId, x, y } = data;
        
        try {
            const room = roomManager.getRoom(roomId);
            if (!room || !room.gameState) throw new Error('Partida no iniciada');
            
            const playerTeam = roomManager.getPlayerTeam(roomId, socket.id);
            const result = room.gameState.handleArtilleryLaunch(playerTeam, x, y);
            
            if (result.success) {
                // Broadcast a todos
                io.to(roomId).emit('artillery_launched', {
                    artilleryId: result.artillery.id,
                    team: playerTeam,
                    x: result.x,
                    y: result.y,
                    startTime: result.artillery.startTime
                });
                
                console.log(`💣 Artillería lanzada por ${playerTeam} en (${x}, ${y})`);
            } else {
                socket.emit('artillery_failed', { reason: result.reason });
                console.log(`⚠️ Artillería rechazada: ${result.reason}`);
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
        console.log(`🚀 [startGame] Iniciando partida para sala: ${roomId}`);
        const room = roomManager.getRoom(roomId);
        if (!room) {
            throw new Error(`Sala ${roomId} no encontrada`);
        }
        console.log(`✅ [startGame] Sala encontrada: ${roomId}, jugadores: ${room.players.length}, IA: ${room.aiPlayer ? 'Sí' : 'No'}`);
        
        // Crear estado inicial del juego
        console.log(`📦 [startGame] Creando GameStateManager...`);
        const gameState = new GameStateManager(room);
        room.gameState = gameState;
        room.status = 'playing';
        console.log(`✅ [startGame] GameStateManager creado exitosamente`);
        
        // 🆕 CENTRALIZADO: Establecer mazos seleccionados ANTES de crear estado inicial
        const player1 = room.players.find(p => p.team === 'player1');
        const player2 = room.players.find(p => p.team === 'player2');
        
        // 🤖 NUEVO: Si hay IA, usar sus datos
        const hasAI = room.aiPlayer !== null && room.aiPlayer !== undefined;
        
        console.log(`🎴 [startGame] Configurando mazos - player1: ${player1 ? 'existe' : 'no existe'}, player2: ${player2 ? 'existe' : 'no existe'}, hasAI: ${hasAI}`);
        
        try {
            if (player1 && player1.selectedDeck) {
                // 🎯 NUEVO: Usar mazo en lugar de raza (automáticamente establece A_Nation)
                console.log(`🎴 [startGame] Estableciendo mazo para player1: "${player1.selectedDeck.name}" (${player1.selectedDeck.units?.length || 0} unidades)`);
                gameState.setPlayerDeck('player1', player1.selectedDeck);
                console.log(`✅ [startGame] Mazo establecido para player1: "${player1.selectedDeck.name}" (${player1.selectedDeck.units.length} unidades)`);
            } else if (player1 && player1.selectedRace) {
                // Fallback: Si solo hay selectedRace (compatibilidad), crear mazo predeterminado
                console.log(`⚠️ [startGame] Player1 solo tiene selectedRace, usando DEFAULT_DECK`);
                const { DEFAULT_DECK } = await import('./config/defaultDeck.js');
                gameState.setPlayerDeck('player1', DEFAULT_DECK);
                console.log(`✅ [startGame] Mazo predeterminado establecido para player1 (fallback)`);
            } else {
                // 🎯 NUEVO: Si no hay mazo ni raza, establecer mazo predeterminado y A_Nation
                console.log(`⚠️ [startGame] Player1 sin mazo ni raza, usando DEFAULT_DECK`);
                const { DEFAULT_DECK } = await import('./config/defaultDeck.js');
                gameState.setPlayerDeck('player1', DEFAULT_DECK);
                console.log(`✅ [startGame] Mazo predeterminado establecido para player1 (sin selección previa)`);
            }
        } catch (error) {
            console.error(`❌ [startGame] Error configurando mazo player1:`, error);
            console.error(`❌ [startGame] Stack trace:`, error.stack);
            throw error;
        }
        
        try {
            if (hasAI) {
                // IA en player2 - usar raza para compatibilidad con IA
                console.log(`🤖 [startGame] Configurando IA para player2: ${room.aiPlayer.race} (${room.aiPlayer.difficulty})`);
                gameState.setPlayerRace('player2', room.aiPlayer.race);
                console.log(`✅ [startGame] Raza establecida para IA (player2): ${room.aiPlayer.race} (${room.aiPlayer.difficulty})`);
                room.hasAI = true;
                room.aiDifficulty = room.aiPlayer.difficulty;
            } else if (player2 && player2.selectedDeck) {
                // 🎯 NUEVO: Usar mazo en lugar de raza (automáticamente establece A_Nation)
                console.log(`🎴 [startGame] Estableciendo mazo para player2: "${player2.selectedDeck.name}" (${player2.selectedDeck.units?.length || 0} unidades)`);
                gameState.setPlayerDeck('player2', player2.selectedDeck);
                console.log(`✅ [startGame] Mazo establecido para player2: "${player2.selectedDeck.name}" (${player2.selectedDeck.units.length} unidades)`);
            } else if (player2 && player2.selectedRace) {
                // Fallback: Si solo hay selectedRace (compatibilidad), crear mazo predeterminado
                console.log(`⚠️ [startGame] Player2 solo tiene selectedRace, usando DEFAULT_DECK`);
                const { DEFAULT_DECK } = await import('./config/defaultDeck.js');
                gameState.setPlayerDeck('player2', DEFAULT_DECK);
                console.log(`✅ [startGame] Mazo predeterminado establecido para player2 (fallback)`);
            } else {
                // 🎯 NUEVO: Si no hay mazo ni raza, establecer mazo predeterminado y A_Nation
                console.log(`⚠️ [startGame] Player2 sin mazo ni raza, usando DEFAULT_DECK`);
                const { DEFAULT_DECK } = await import('./config/defaultDeck.js');
                gameState.setPlayerDeck('player2', DEFAULT_DECK);
                console.log(`✅ [startGame] Mazo predeterminado establecido para player2 (sin selección previa)`);
            }
        } catch (error) {
            console.error(`❌ [startGame] Error configurando mazo player2:`, error);
            console.error(`❌ [startGame] Stack trace:`, error.stack);
            throw error;
        }
        
        // 🤖 NUEVO: Inicializar AISystem con io y roomId para simular eventos de jugador
        try {
            if (hasAI) {
                console.log(`🤖 [startGame] Inicializando AISystem...`);
                gameState.aiSystem = new AISystem(gameState, io, roomId);
                console.log(`✅ [startGame] AISystem inicializado exitosamente`);
            }
        } catch (error) {
            console.error(`❌ [startGame] Error inicializando AISystem:`, error);
            console.error(`❌ [startGame] Stack trace:`, error.stack);
            throw error;
        }
        
        // 🆕 CENTRALIZADO: Ahora crear estado inicial con las razas ya configuradas
        console.log(`🌍 [startGame] Generando estado inicial del juego...`);
        let initialState;
        try {
            initialState = gameState.getInitialState();
            console.log(`✅ [startGame] Estado inicial generado: ${initialState.nodes?.length || 0} nodos, ${initialState.helicopters?.length || 0} helicópteros`);
        } catch (error) {
            console.error(`❌ [startGame] Error generando estado inicial:`, error);
            console.error(`❌ [startGame] Stack trace:`, error.stack);
            throw error;
        }
        
        // Enviar estado inicial a cada jugador (con su team asignado)
        console.log(`📤 [startGame] Enviando estado inicial a ${room.players.length} jugadores...`);
        try {
            room.players.forEach((player, index) => {
                const playerSocket = io.sockets.sockets.get(player.id);
                if (playerSocket) {
                    console.log(`📤 [startGame] Enviando game_start a jugador ${index + 1}/${room.players.length} (${player.id}, team: ${player.team})`);
                    playerSocket.emit('game_start', {
                        myTeam: player.team,
                        opponentTeam: player.team === 'player1' ? 'player2' : 'player1',
                        selectedRace: player.selectedRace, // 🆕 NUEVO: Enviar raza seleccionada
                        initialState: initialState,
                        duration: 520
                    });
                    console.log(`✅ [startGame] game_start enviado a jugador ${player.id}`);
                } else {
                    console.warn(`⚠️ [startGame] Socket no encontrado para jugador ${player.id}`);
                }
            });
        } catch (error) {
            console.error(`❌ [startGame] Error enviando estado inicial:`, error);
            console.error(`❌ [startGame] Stack trace:`, error.stack);
            throw error;
        }
        
        // Iniciar loop del servidor
        console.log(`🔄 [startGame] Iniciando game loop...`);
        try {
            gameState.startGameLoop(
                // updateCallback - enviar estado cada tick
                (updates) => {
                    try {
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
                        
                        // 🆕 NUEVO: Enviar impactos de artillados ligeros si hay
                        if (gameState.lightVehicleImpacts && gameState.lightVehicleImpacts.length > 0) {
                            gameState.lightVehicleImpacts.forEach(impact => {
                                io.to(roomId).emit('light_vehicle_impact', impact);
                                console.log(`💥 Artillado ligero ${impact.lightVehicleId} impactó ${impact.targetType} (aplicó broken) en (${impact.x}, ${impact.y})`);
                            });
                            gameState.lightVehicleImpacts = []; // Limpiar después de enviar
                        }
                        
                        // 🆕 NUEVO: Enviar evento del Destructor de mundos si se ejecutó
                        if (gameState.worldDestroyerEvent) {
                            io.to(roomId).emit('world_destroyer_executed', gameState.worldDestroyerEvent);
                            console.log(`☠️ Destructor de mundos ejecutado - ${gameState.worldDestroyerEvent.destroyedBuildings.length} edificios destruidos`);
                            gameState.worldDestroyerEvent = null; // Limpiar después de enviar
                        }
                        
                        // 🆕 NUEVO: Enviar evento de artillería si se ejecutó
                        if (gameState.artilleryEvent) {
                            io.to(roomId).emit('artillery_executed', gameState.artilleryEvent);
                            console.log(`💣 Artillería ejecutada - ${gameState.artilleryEvent.affectedBuildings.length} edificios afectados`);
                            gameState.artilleryEvent = null; // Limpiar después de enviar
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
                    } catch (error) {
                        console.error(`❌ [startGame] Error en updateCallback:`, error);
                        console.error(`❌ [startGame] Stack trace:`, error.stack);
                    }
                },
                // victoryCallback - enviar victoria cuando termine
                (victoryResult) => {
                    try {
                        console.log(`🏆 Partida terminada en sala ${roomId}: ${victoryResult.winner} ganó`);
                        io.to(roomId).emit('game_over', victoryResult);
                    } catch (error) {
                        console.error(`❌ [startGame] Error en victoryCallback:`, error);
                        console.error(`❌ [startGame] Stack trace:`, error.stack);
                    }
                }
            );
            console.log(`✅ [startGame] Game loop iniciado exitosamente`);
        } catch (error) {
            console.error(`❌ [startGame] Error iniciando game loop:`, error);
            console.error(`❌ [startGame] Stack trace:`, error.stack);
            throw error;
        }
        
        console.log(`🎮 Partida iniciada en sala: ${roomId}`);
        
    } catch (error) {
        console.error(`❌ [startGame] ERROR CRÍTICO al iniciar partida en sala ${roomId}:`, error);
        console.error(`❌ [startGame] Mensaje de error:`, error.message);
        console.error(`❌ [startGame] Stack trace completo:`, error.stack);
        if (error.cause) {
            console.error(`❌ [startGame] Error cause:`, error.cause);
        }
        io.to(roomId).emit('error', { 
            message: 'Error al iniciar partida',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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

