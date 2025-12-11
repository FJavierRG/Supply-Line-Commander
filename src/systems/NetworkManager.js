// ===== GESTOR DE RED - Cliente Socket.IO =====
// Responsabilidad: Coordinador principal de la red, delegando responsabilidades específicas a módulos especializados
import { BackgroundTileSystem } from './game/BackgroundTileSystem.js';
import { Convoy } from '../entities/Convoy.js';
import { VisualNode } from '../entities/visualNode.js';
import { getNodeConfig } from '../config/nodes.js';
import { ClientSender } from './network/ClientSender.js';
import { LobbyHandler } from './network/LobbyHandler.js';
import { NetworkEventHandler } from './network/NetworkEventHandler.js';
import { GameStateSync } from './network/GameStateSync.js';

export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.connected = false;
        this.roomId = null;
        this.myTeam = null;
        this.opponentTeam = null;
        
        // Medición de latencia/ping
        this.lastPingTime = 0;
        this.ping = 0;
        
        // 🔍 MONITOREO: Detección de lag/freezes
        this._lastFrameTime = Date.now();
        this._lagDetectionEnabled = false;
        
        // Auto-detectar URL del servidor
        // Si se accede vía ngrok/producción, usar la misma URL
        // Si es localhost, usar localhost:8000 (mismo puerto que el servidor)
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname === '';
        
        if (isLocalhost) {
            this.serverUrl = 'http://localhost:8000';
        } else {
            // Usar el mismo servidor desde donde se cargó la página
            this.serverUrl = window.location.origin;
        }
        
        // Logs de debug removidos para reducir spam en consola
        this.isMultiplayer = false;
    }
    
    /**
     * Conectar al servidor
     */
    connect() {
        return new Promise((resolve, reject) => {
            // Si ya está conectado, resolver inmediatamente
            if (this.connected && this.socket && this.socket.connected) {
                console.log('✅ Ya conectado al servidor');
                resolve();
                return;
            }
            
            // Si ya hay un socket intentando conectar, esperar a ese
            if (this.socket && !this.socket.connected) {
                console.log('⏳ Esperando conexión existente...');
                const checkConnection = setInterval(() => {
                    if (this.connected && this.socket && this.socket.connected) {
                        clearInterval(checkConnection);
                        resolve();
                    } else if (!this.socket || this.socket.disconnected) {
                        clearInterval(checkConnection);
                        // Intentar de nuevo
                        this.initializeSocket();
                    }
                }, 100);
                
                // Timeout después de 10 segundos
                setTimeout(() => {
                    clearInterval(checkConnection);
                    if (!this.connected) {
                        reject(new Error('Timeout esperando conexión'));
                    }
                }, 10000);
                return;
            }
            
            // Cargar Socket.IO client desde CDN si no está disponible
            if (typeof io === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdn.socket.io/4.6.1/socket.io.min.js';
                script.onload = () => {
                    this.initializeSocket();
                    // Esperar a que se conecte
                    this.waitForConnection(resolve, reject);
                };
                script.onerror = () => reject(new Error('No se pudo cargar Socket.IO'));
                document.head.appendChild(script);
            } else {
                this.initializeSocket();
                // Esperar a que se conecte
                this.waitForConnection(resolve, reject);
            }
        });
    }
    
    /**
     * Espera a que se establezca la conexión
     */
    waitForConnection(resolve, reject) {
        const timeout = setTimeout(() => {
            reject(new Error('Timeout esperando conexión al servidor'));
        }, 15000); // 15 segundos timeout
        
        const checkConnection = setInterval(() => {
            if (this.connected && this.socket && this.socket.connected) {
                clearInterval(checkConnection);
                clearTimeout(timeout);
                console.log('✅ Conectado al servidor:', this.serverUrl);
                resolve();
            }
        }, 100);
        
        // También escuchar eventos de conexión directamente
        if (this.socket) {
            const onConnect = () => {
                clearInterval(checkConnection);
                clearTimeout(timeout);
                console.log('✅ Conectado al servidor:', this.serverUrl);
                resolve();
            };
            
            const onError = (error) => {
                clearInterval(checkConnection);
                clearTimeout(timeout);
                console.error('❌ Error de conexión:', error);
                reject(error);
            };
            
            this.socket.once('connect', onConnect);
            this.socket.once('connect_error', onError);
        }
    }
    
    /**
     * Inicializar socket y eventos
     */
    initializeSocket() {
        console.log('🔌 Inicializando socket...', this.serverUrl);
        
        // Configurar socket con opciones para resolver problemas CORS
        this.socket = io(this.serverUrl, {
            transports: ['polling', 'websocket'],
            upgrade: true,
            rememberUpgrade: false,
            timeout: 20000,
            forceNew: true
        });
        
        // 🆕 Inicializar ClientSender para delegar emisión de eventos
        this.clientSender = new ClientSender(this.socket, this);
        
        // 🆕 Inicializar LobbyHandler para delegar gestión de UI del lobby
        this.lobbyHandler = new LobbyHandler(this, this.game);
        
        // 🆕 Inicializar NetworkEventHandler para delegar eventos audiovisuales
        this.eventHandler = new NetworkEventHandler(this, this.game);
        
        // 🆕 Inicializar GameStateSync para delegar sincronización de estado
        this.gameStateSync = new GameStateSync(this, this.game);
        
        this.socket.on('connect', () => {
            this.connected = true;
            console.log('✅ Socket conectado:', this.socket.id);
            
            // ✅ NUEVO: Enviar idioma preferido del cliente al servidor
            import('../services/I18nService.js').then(({ i18n }) => {
                const clientLanguage = i18n.getCurrentLanguage();
                console.log(`🌐 Enviando idioma preferido al servidor: ${clientLanguage}`);
                this.socket.emit('client_language', { language: clientLanguage });
            }).catch(err => {
                console.error('❌ Error al enviar idioma:', err);
                // Fallback: enviar español por defecto
                this.socket.emit('client_language', { language: 'es' });
            });
        });
        
        this.socket.on('disconnect', () => {
            this.connected = false;
            console.log('❌ Socket desconectado');
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('❌ Error de conexión:', error);
            console.error('❌ URL:', this.serverUrl);
            console.error('❌ Tipo:', error.type);
            console.error('❌ Descripción:', error.description);
            this.connected = false;
        });
        
        this.socket.on('error', (error) => {
            console.error('❌ Error del socket:', error);
            // 🆕 FIX: Restaurar botón si hay error al iniciar partida
            if (this._startingGame) {
                this._startingGame = false;
                const startBtn = document.getElementById('start-multiplayer-game-btn');
                if (startBtn) {
                    startBtn.disabled = false;
                    startBtn.textContent = 'Comenzar Partida';
                }
            }
        });
        
        // 🎯 NUEVO: Recibir configuración del juego del servidor (incluyendo límite de mazo y mazo por defecto)
        this.socket.on('game_config', (config) => {
            console.log('⚙️ Configuración del juego recibida:', config);
            
            // ✅ NUEVO: Guardar descripciones traducidas del servidor
            if (config.descriptions) {
                console.log('🌐 Descripciones traducidas recibidas del servidor');
                if (!this.game.serverBuildingConfig) {
                    this.game.serverBuildingConfig = {};
                }
                this.game.serverBuildingConfig.descriptions = config.descriptions;
            }
            
            // ✅ NUEVO: Guardar disciplinas traducidas del servidor
            if (config.disciplinesTranslated) {
                console.log('🌐 Disciplinas traducidas recibidas del servidor');
                this.game.disciplinesTranslated = config.disciplinesTranslated;
            }
            
            // 🐛 DEBUG: Verificar disciplinas recibidas
            if (config.defaultDeck && config.defaultDeck.disciplines) {
                console.log('📥 [GAME_CONFIG] Disciplinas recibidas del servidor:', config.defaultDeck.disciplines);
            } else {
                console.warn('⚠️ [GAME_CONFIG] NO se recibieron disciplinas del servidor!');
            }
            if (this.game && this.game.deckManager) {
                if (config.deckPointLimit) {
                    this.game.deckManager.setPointLimit(config.deckPointLimit);
                }
                // 🆕 NUEVO: Establecer límite del banquillo
                if (config.benchPointLimit) {
                    this.game.deckManager.setBenchPointLimit(config.benchPointLimit);
                }
                // El mazo por defecto ahora se obtiene vía API en DeckManager (no desde game_config)
            }
        });
        
        // 🎯 NUEVO: Manejar errores de validación de mazo
        this.socket.on('deck_validation_error', (error) => {
            console.error('🚫 Error de validación de mazo:', error);
            alert(`Error: ${error.message}`);
            // Recargar el arsenal para mostrar el estado correcto
            if (this.game && this.game.arsenalManager) {
                this.game.arsenalManager.populateArsenal();
            }
        });
        
        // Ping/pong para medir latencia
        this.socket.on('pong', (timestamp) => {
            this.ping = Date.now() - timestamp;
            // Log removido - solo mantener si ping es muy alto (crítico)
        });
        
        // === EVENTOS DE LOBBY ===
        
        this.socket.on('room_created', (data) => {
            console.log('🎮 Sala creada:', data.roomId);
            this.roomId = data.roomId;
            this.myTeam = 'player1';
            this.game.myTeam = 'player1';
            // 🆕 FIX: Resetear flag de inicio y restaurar botón
            this._startingGame = false;
            const startBtn = document.getElementById('start-multiplayer-game-btn');
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.textContent = 'Comenzar Partida';
            }
            this.lobbyHandler.showRoomView(data.roomId);
        });
        
        this.socket.on('room_joined', (data) => {
            console.log('🎮 Unido a sala:', data.roomId);
            this.roomId = data.roomId;
            this.myTeam = 'player2';
            this.game.myTeam = 'player2';
            // 🆕 FIX: Resetear flag de inicio y restaurar botón
            this._startingGame = false;
            const startBtn = document.getElementById('start-multiplayer-game-btn');
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.textContent = 'Comenzar Partida';
            }
            this.lobbyHandler.showRoomView(data.roomId);
        });
        
        this.socket.on('opponent_joined', (data) => {
            // La actualización del lobby se maneja en lobby_update
        });
        
        this.socket.on('room_ready', (data) => {
            // La UI se actualiza con lobby_update
        });
        
        this.socket.on('lobby_update', (data) => {
            this.lobbyHandler.updateLobbyUI(data);
        });
        
        this.socket.on('ai_player_added', (data) => {
            // La UI se actualiza con lobby_update
        });
        
        this.socket.on('ai_player_updated', (data) => {
            // La UI se actualiza con lobby_update
        });
        
        this.socket.on('ai_player_removed', () => {
            // La UI se actualiza con lobby_update
        });
        
        this.socket.on('kicked_from_room', (data) => {
            alert('Has sido expulsado de la sala por el host');
            this.lobbyHandler.leaveRoom();
        });
        
        this.socket.on('lobby_chat_message', (data) => {
            this.lobbyHandler.addChatMessage(data);
        });
        
        this.socket.on('rooms_list', (rooms) => {
            this.lobbyHandler.displayRoomsList(rooms);
        });
        
        // === EVENTOS DE SELECCIÓN DE RAZAS ===
        
        this.socket.on('race_selected', (data) => {
            // Actualizar la UI local con la selección confirmada
            if (this.game.raceSelectionManager) {
                this.game.raceSelectionManager.onRaceSelected(data.raceId);
            }
        });
        
        this.socket.on('race_selection_updated', (data) => {
            // Actualizar la UI del lobby con los nuevos datos
            this.lobbyHandler.updateLobbyUI(data);
        });
        
        // 🆕 NUEVO: Eventos de permutación de cartas
        // ✅ FIX: Los swaps durante la partida NO deben modificar el mazo original
        // Solo actualizan una copia temporal para mostrar en la UI (no se guarda nada)
        this.socket.on('swap_card_success', (data) => {
            // Actualizar solo la copia temporal del mazo en StoreUIManager
            // NO modificar el mazo original, NO guardar en localStorage, NO guardar en BD
            if (this.game && this.game.storeUI) {
                // Si no existe la copia temporal, crearla (por si acaso)
                if (!this.game.storeUI.gameDeckCopy) {
                    this.game.storeUI.initializeGameDeckCopy();
                }
                
                // Actualizar solo la copia temporal del mazo
                if (this.game.storeUI.gameDeckCopy) {
                    this.game.storeUI.gameDeckCopy.units = [...data.newDeck];
                    this.game.storeUI.gameDeckCopy.bench = [...data.newBench];
                    
                    // ✅ FIX: Actualizar las categorías para reflejar los cambios en la tienda
                    this.game.storeUI.updateCategories();
                }
                
                // Salir del modo permutación si está activo
                if (this.game.storeUI.swapMode) {
                    this.game.storeUI.exitSwapMode();
                }
            }
        });
        
        this.socket.on('swap_card_error', (data) => {
            console.error('Error al permutar carta:', data.message);
            // Mostrar notificación de error al usuario
            if (this.game && this.game.arsenalManager) {
                this.game.arsenalManager.showNotification(data.message || 'Error al permutar carta', 'error');
            }
        });
        
        // === EVENTOS DE DISCIPLINAS ===
        
        this.socket.on('discipline_activated', (data) => {
            console.log(`⚡ Disciplina activada: ${data.disciplineId} por ${data.playerId}`);
            // El estado ya se sincroniza con game_update, esto es solo notificación
            // TODO: Mostrar notificación visual cuando se implemente UI in-game
        });
        
        this.socket.on('discipline_event', (data) => {
            console.log(`⚡ Evento de disciplina:`, data);
            // Eventos: 'ended' o 'cooldown_ready'
            // El estado ya se sincroniza con game_update
            // TODO: Mostrar notificación visual cuando se implemente UI in-game
        });
        
        this.socket.on('activate_discipline_success', (data) => {
            console.log(`✅ Disciplina activada exitosamente: ${data.disciplineId}`);
            // TODO: Feedback visual de éxito
        });
        
        this.socket.on('activate_discipline_error', (data) => {
            console.error('Error al activar disciplina:', data.message);
            // TODO: Mostrar notificación de error al usuario
        });
        
        // === EVENTOS DE JUEGO ===
        
        this.socket.on('countdown', (data) => {
            this.game.countdown = data.seconds;
            
            // Actualizar UI del lobby con countdown
            const statusDisplay = document.getElementById('room-status-display');
            if (statusDisplay) {
                statusDisplay.textContent = `Iniciando en ${data.seconds}...`;
            }
            
            // Si es el último segundo, preparar countdown del juego
            if (data.seconds === 0) {
                this.startGameCountdown();
            }
        });
        
        this.socket.on('game_start', (data) => {

            this.isMultiplayer = true;
            this.myTeam = data.myTeam;
            this.opponentTeam = data.opponentTeam;
            
            // Asignar team al juego
            this.game.myTeam = this.myTeam;
            
            // 🆕 CENTRALIZADO: Sincronizar información de razas del estado inicial PRIMERO
            if (data.initialState && data.initialState.playerRaces) {
                this.game.playerRaces = data.initialState.playerRaces;
            }
            
                // ✅ ELIMINADO: Ya no hay raceConfigs en el estado inicial
            
            // 🆕 NUEVO: Establecer raza seleccionada desde el servidor
            if (data.selectedRace) {
                this.game.selectedRace = data.selectedRace;
            } else {
                // 🎯 CRÍTICO: Si no hay selectedRace pero hay playerRaces, usar la raza del playerRaces
                if (this.game.playerRaces && this.game.playerRaces[this.myTeam]) {
                    const raceFromPlayerRaces = this.game.playerRaces[this.myTeam];
                    this.game.selectedRace = raceFromPlayerRaces;
                } else {
                    console.error('❌ No se recibió selectedRace del servidor y no hay playerRaces');
                }
            }
            
            // 🎯 NUEVO: Actualizar tienda después de establecer el mazo seleccionado
            if (this.game.storeUI) {
                // selectedRace ahora contiene el deckId seleccionado
                if (this.game.selectedRace) {
                    // Usar setDeck con el deckId recibido del servidor
                    this.game.storeUI.setDeck(this.game.selectedRace);
                } else if (this.game.deckManager) {
                    // Si no hay deckId del servidor, usar el mazo seleccionado o predeterminado
                    const selectedDeck = this.game.deckManager.getSelectedDeck();
                    const deckToUse = selectedDeck || this.game.deckManager.getDefaultDeck();
                    if (deckToUse) {
                        this.game.storeUI.setDeck(deckToUse.id);
                    }
                }
                
                // ✅ FIX: Inicializar copia temporal del mazo para la partida (NO modifica el original)
                this.game.storeUI.initializeGameDeckCopy();
            }
            
            // CRÍTICO: Desactivar tutorial ANTES de cargar estado
            if (this.game.tutorialManager) {
                this.game.tutorialManager.active = false; // Modificar el flag interno
                // Forzar estado del juego a NO tutorial
                if (this.game.state === 'tutorial') {
                    this.game.state = 'menu';
                }
            }
            
            // Cargar estado inicial
            this.loadInitialState(data.initialState);
            
            // Ocultar lobby completamente
            this.lobbyHandler.hideLobby();
            
            // Configurar duración de la misión
            this.game.missionDuration = data.duration;
            this.game.timeLeft = data.duration;
            
            // Iniciar el juego
            this.game.setGameState('playing');
            this.game.missionStarted = true;
            this.game.paused = false;
            
            // 🆕 SIMPLIFICADO: Solo cerrar el tutorial si está activo
            // El tutorial nuevo es simple y se cierra automáticamente al cambiar de estado
            if (this.game.tutorialManager && this.game.tutorialManager.active) {
                const tutorialOverlay = document.getElementById('tutorial-overlay');
                if (tutorialOverlay) {
                    tutorialOverlay.style.display = 'none';
                }
                this.game.tutorialManager.active = false;
            }
            
            // Configurar UI
            this.game.ui.setupMissionUI(this.game.nodes);
            
            // CRÍTICO: Forzar inicio del game loop
            this.game.lastTime = Date.now();
            
            // Si el loop no está corriendo, iniciarlo
            if (!this.game._gameLoopRunning) {
                this.game._gameLoopRunning = true;
                this.game.gameLoop();
            }
            
            
            // Verificar que los assets estén completamente cargados
            const assetsLoaded = this.game.assetManager.isReady();
            const criticalAssetsLoaded = this.game.assetManager.areCriticalAssetsLoaded();
            
            // Verificar también que todos los assets estén realmente disponibles
            const allAssetsReady = assetsLoaded && criticalAssetsLoaded;

            
            // Si no están completamente listos, esperar
            if (!allAssetsReady) {
                // console.log('⏳ Esperando a que carguen completamente los assets...'); // Log removido
                this.waitForCriticalAssets().then(() => {
                    // console.log('✅ Assets completamente cargados, iniciando partida...'); // Log removido
                    this.finishGameStart();
                });
                return;
            }
            
            this.finishGameStart();
        });

        this.socket.on('game_update', (gameState) => {
            // Recibir estado completo del servidor cada tick (20 TPS)
            this.gameStateSync.applyGameState(gameState);
        });
        
        this.socket.on('game_over', (data) => {
            // console.log('🏆 Partida terminada:', data); // Log removido
            this.handleGameOver(data);
        });
        
        this.socket.on('building_created', (data) => {
            
            // Verificar que no exista ya (evitar duplicados)
            const exists = this.game.nodes.find(n => n.id === data.nodeId);
            if (exists) {
                return;
            }
            
            // Crear el nodo en el cliente (servidor ya validó y autorizó)
            const config = getNodeConfig(data.type);
            const newNode = new VisualNode(
                data.x,
                data.y,
                data.type,
                {
                    ...config,
                    team: data.team,
                    isConstructed: false // CRÍTICO: Empieza en construcción
                },
                this.game
            );
            
            if (newNode) {
                // Sobrescribir ID y estado desde el servidor
                newNode.id = data.nodeId;
                newNode.isConstructing = true;
                newNode.constructed = false;
                newNode.constructionTime = data.constructionTime || 2;
                newNode.constructionTimer = 0;
                
                // Inicializar propiedades de interpolación para multijugador
                if (newNode.updateServerPosition) {
                    newNode.updateServerPosition(data.x, data.y);
                }
                
                this.game.nodes.push(newNode);
                
                
                // CRÍTICO: Reproducir sonido para AMBOS jugadores (en multiplayer nadie lo reproduce localmente)
                    this.game.audio.playPlaceBuildingSound();
                
                // NO reproducir sonido de anti-drone aquí (se reproduce al terminar construcción)
            }
        });
        
        this.socket.on('convoy_spawned', (data) => {
            // Buscar los nodos
            const fromNode = this.game.nodes.find(n => n.id === data.fromId);
            const toNode = this.game.nodes.find(n => n.id === data.toId);
            
            if (!fromNode || !toNode) {
                console.error('⚠️ No se encontraron los nodos para el convoy:', data.fromId, data.toId);
                return;
            }
            
            // Tomar vehículo (el servidor ya lo validó)
            if (data.vehicleType === 'helicopter') {
                fromNode.takeHelicopter();
            } else {
                fromNode.takeVehicle();
            }
            
            // Crear convoy localmente
            // ⚠️ LEGACY: speed no se usa - solo se necesita para compatibilidad con vehicle object
            // El movimiento real viene del servidor (progress autoritativo)
            const VEHICLE_TYPES = {
                'truck': {
                    capacity: 15,
                    spritePath: 'vehicles/convoy.png',
                    color: '#4CAF50' // Solo para renderizado visual
                },
                'heavy_truck': {
                    capacity: 25,
                    spritePath: 'vehicles/convoy_heavy.png',
                    color: '#4CAF50' // Solo para renderizado visual
                },
                'helicopter': {
                    capacity: 100,
                    spritePath: 'vehicles/chopper.png',
                    color: '#4CAF50' // Solo para renderizado visual (aunque helicópteros no se renderizan como convoyes)
                }
            };
            
            const vehicle = this.game.convoyManager.applyUpgrades(
                VEHICLE_TYPES[data.vehicleType],
                data.vehicleType
            );
            
            const cargo = fromNode.removeSupplies(data.cargo);
            
            // Crear convoy
            const convoy = new Convoy(fromNode, toNode, vehicle, data.vehicleType, cargo, this.game);
            convoy.id = data.convoyId; // CRÍTICO: Usar ID del servidor
            convoy.team = data.team; // 🆕 FOG OF WAR: Asignar equipo para filtrado
            
            // 🆕 NUEVO: Aplicar bonus de vehicleWorkshop si el servidor lo indica
            if (data.hasVehicleWorkshopBonus) {
                convoy.hasVehicleWorkshopBonus = true;
            }
            
            // CRÍTICO: Actualizar posición visual inicial
            convoy.updateVisualPosition();
            
            this.game.convoyManager.convoys.push(convoy);
            
            // Reproducir sonido solo si NO es de mi equipo - usar volumen reducido para enemigos
            if (data.team !== this.myTeam) {
                this.game.audio.playEnemyTruckSound(); // Sonido del enemigo con volumen reducido 44% (56% del original)
            }
        });
        
        // 🆕 NUEVO: Evento de helicóptero despachado
        this.socket.on('helicopter_dispatched', (data) => {
            
            // El helicóptero ya está sincronizado por el game_state
            // El sonido se reproduce mediante el evento de sonido 'chopper' del servidor
        });
        
        // 🆕 NUEVO: Evento de convoy/helicóptero fallido
        this.socket.on('convoy_failed', (data) => {
            // console.log('⚠️ CONVOY_FAILED:', data.reason); // Log removido (mantener solo si es crítico)
            // TODO: Mostrar mensaje visual al usuario (cuando se implemente showMessage en UIManager)
        });
        
        this.socket.on('ambulance_spawned', (data) => {
            
            // Buscar los nodos
            const fromNode = this.game.nodes.find(n => n.id === data.fromId);
            const toNode = this.game.nodes.find(n => n.id === data.toId);
            
            if (!fromNode || !toNode) {
                console.error('⚠️ No se encontraron los nodos para la ambulancia:', data.fromId, data.toId);
                return;
            }
            
            // Tomar ambulancia del HQ
            if (fromNode.type === 'hq') {
                fromNode.takeAmbulance();
            } else if (fromNode.type === 'campaignHospital') {
                fromNode.dispatchAmbulance();
            }
            
            // Crear ambulancia localmente
            // ⚠️ LEGACY: speed no se usa - solo se necesita para compatibilidad con vehicle object
            // El movimiento real viene del servidor (progress autoritativo)
            const VEHICLE_TYPES = {
                'ambulance': {
                    capacity: 0,
                    spritePath: 'vehicles/ambulance.png',
                    color: '#FF5722' // Solo para renderizado visual
                }
            };
            
            const vehicle = this.game.convoyManager.applyUpgrades(
                VEHICLE_TYPES['ambulance'],
                'ambulance'
            );
            
            // Crear convoy médico
            const convoy = new Convoy(fromNode, toNode, vehicle, 'ambulance', 0, this.game);
            convoy.id = data.convoyId;
            convoy.team = data.team; // 🆕 FOG OF WAR: Asignar equipo para filtrado
            convoy.isMedical = true;
            convoy.targetFrontId = data.targetFrontId;
            
            // Inicializar sistema de interpolación suave y Dead Reckoning
            this.game.convoyManager.convoys.push(convoy);
            
            // Reproducir sonido solo si NO es de mi equipo - usar volumen reducido para enemigos
            if (data.team !== this.myTeam) {
                this.game.audio.playEnemyTruckSound(); // Sonido del enemigo con volumen reducido 44% (56% del original)
            }
        });
        
        /**
         * Manejo de disparo de francotirador
         */
        this.socket.on('sniper_fired', (data) => {
            this.eventHandler.handleSniperFired(data);
        });
        
        /**
         * Manejo de sabotaje de FOB
         */
        this.socket.on('fob_sabotage_fired', (data) => {
            this.eventHandler.handleFobSabotageFired(data);
        });
        
        this.socket.on('fob_sabotage_failed', (data) => {
            this.eventHandler.handleFobSabotageFailed(data);
        });
        
        /**
         * 🆕 NUEVO: Manejo de activación del Destructor de mundos
         */
        this.socket.on('world_destroyer_activated', (data) => {
            this.eventHandler.handleWorldDestroyerActivated(data);
            
            // Iniciar efectos visuales del countdown
            if (this.game && this.game.renderer) {
                this.game.renderer.startWorldDestroyerEffect(data.startTime, data.countdownDuration);
            }
        });
        
        this.socket.on('world_destroyer_failed', (data) => {
            console.warn(`⚠️ Destructor de mundos fallido: ${data.reason || 'Razón desconocida'}`);
            // Opcional: mostrar mensaje visual al usuario
            if (this.game && this.game.showNotification) {
                this.game.showNotification(data.reason || 'No se pudo activar el Destructor de mundos', 'error');
            }
        });
        
        /**
         * 🆕 NUEVO: Manejo de ejecución del Destructor de mundos
         */
        this.socket.on('world_destroyer_executed', (data) => {
            console.log(`☠️ Destructor de mundos ejecutado - ${data.destroyedBuildings.length} edificios destruidos`);
            
            // Reproducir sonido de explosión nuclear para ambos jugadores (cuando se muestra el flash blanco)
            if (this.game && this.game.audio && this.game.audio.playNuclearExplosionSound) {
                this.game.audio.playNuclearExplosionSound();
            }
            
            // Iniciar pantallazo blanco
            if (this.game && this.game.renderer) {
                this.game.renderer.executeWorldDestroyerEffect(data);
            }
            
            // Aplicar efectos del servidor: destruir edificios, vaciar FOBs y Frentes
            // Los nodos ya deberían estar actualizados por el estado del servidor, pero aplicamos efectos visuales
            // ✅ FIX: Usar el mismo sistema de efectos visuales que drones/tanques para consistencia
            if (data.destroyedBuildings) {
                data.destroyedBuildings.forEach((building, index) => {
                    // ✅ FIX: Usar coordenadas del servidor directamente (más confiable que buscar el nodo)
                    // Los nodos pueden haber sido eliminados del estado, pero las coordenadas del servidor son válidas
                    const x = building.x;
                    const y = building.y;
                    
                    // Reproducir sonido de explosión (solo una vez por edificio, no todos a la vez)
                    // Nota: Esto podría ser abrumador si hay muchos edificios, considerar un sonido especial
                    if (this.game.audio && this.game.audio.playExplosionSound) {
                        // Usar setTimeout para espaciar los sonidos y evitar sobrecarga
                        setTimeout(() => {
                            this.game.audio.playExplosionSound();
                        }, index * 50 + Math.random() * 100); // Espaciar entre 0-150ms por edificio
                    }
                    
                    // ✅ Usar el mismo sistema de explosiones que drones/tanques
                    // 1. Partículas de explosión (mismo color que drones/tanques para consistencia)
                    this.game.particleSystem.createExplosion(
                        x, 
                        y, 
                        '#808080', // Mismo color gris que drones/tanques
                        40 // Mismo número de partículas que impactos normales
                    );
                    
                    // 2. Sprite de explosión del edificio (mismo que drones/tanques)
                    if (this.game.particleSystem.createExplosionSprite) {
                        this.game.particleSystem.createExplosionSprite(x, y);
                    }
                    
                    // 3. ✅ FIX: Marca de impacto permanente (mismo que drones/tanques)
                    // Asegurarse de que se cree incluso si el nodo ya no existe
                    this.game.particleSystem.createImpactMark(x, y, 'impact_icon', 1.2);
                    
                    console.log(`💥 Destructor: Cráter creado en (${x}, ${y}) para ${building.type} ${building.id}`);
                });
            }
        });
        
        /**
         * 🆕 NUEVO: Manejo de despliegue de comando especial operativo
         */
        this.socket.on('commando_deployed', (data) => {
            
            // Verificar que no exista ya (evitar duplicados)
            const exists = this.game.nodes.find(n => n.id === data.commandoId);
            if (exists) {
                console.warn(`⚠️ Nodo ${data.commandoId} ya existe, ignorando commando_deployed`);
                return;
            }
            
            // Crear el nodo del comando en el cliente (ya construido, no necesita construcción)
            const config = getNodeConfig('specopsCommando');
            const newNode = new VisualNode(
                data.x,
                data.y,
                'specopsCommando',
                {
                    ...config,
                    team: data.team,
                    isConstructed: true // Ya está construido
                },
                this.game
            );
            
            if (newNode) {
                // Sobrescribir ID y estado desde el servidor
                newNode.id = data.commandoId;
                newNode.constructed = true;
                newNode.isConstructing = false;
                newNode.active = true;
                newNode.detectionRadius = data.detectionRadius || 200;
                newNode.isCommando = true;
                
                // 🆕 NUEVO: Sincronizar tiempo de expiración del comando
                if (data.spawnTime !== undefined) {
                    newNode.spawnTime = data.spawnTime;
                }
                if (data.expiresAt !== undefined) {
                    newNode.expiresAt = data.expiresAt;
                }
                
                // Inicializar propiedades de interpolación para multijugador
                if (newNode.updateServerPosition) {
                    newNode.updateServerPosition(data.x, data.y);
                }
                
                this.game.nodes.push(newNode);
                
                
                // Sonido de despliegue de comando
                if (this.game.audio && this.game.audio.playCommandoDeploySound) {
                    this.game.audio.playCommandoDeploySound();
                }
            }
        });
        
        /**
         * 🆕 NUEVO: Manejo de fallo de despliegue de comando
         */
        this.socket.on('commando_deploy_failed', (data) => {
            // TODO: Mostrar mensaje visual al usuario cuando se implemente showMessage en UIManager
        });
        
        /**
         * 🆕 NUEVO: Manejo de despliegue de camera drone
         */
        this.socket.on('camera_drone_deployed', (data) => {
            this.eventHandler.handleCameraDroneDeployed(data);
            
            try {
                // Crear el nodo del camera drone en el cliente
                const config = getNodeConfig('cameraDrone');
                console.log(`📹 [CLIENT] Config obtenida:`, config);
                
                const newNode = new VisualNode(
                    data.x,
                    data.y,
                    'cameraDrone',
                    {
                        ...config,
                        team: data.team,
                        isConstructed: data.deployed || false
                    },
                    this.game
                );
                
                if (newNode) {
                    // Sobrescribir ID y estado desde el servidor
                    newNode.id = data.cameraDroneId;
                    newNode.constructed = data.deployed || false;
                    newNode.isConstructing = false;
                    newNode.active = true;
                    newNode.detectionRadius = data.detectionRadius || 200;
                    newNode.isCameraDrone = true;
                    newNode.deployed = data.deployed || false;
                    newNode.targetX = data.targetX;
                    newNode.targetY = data.targetY;
                    
                    // 🆕 NUEVO: Inicializar propiedades de interpolación para multijugador (solo si está volando)
                    if (newNode.updateServerPosition && !data.deployed) {
                        newNode.updateServerPosition(data.x, data.y);
                    } else {
                        // Si ya está desplegado, usar posición directa
                        newNode.x = data.x;
                        newNode.y = data.y;
                    }
                    
                    this.game.nodes.push(newNode);
                    console.log(`📹 [CLIENT] Camera drone creado y agregado: ${data.cameraDroneId} en (${data.x}, ${data.y}), deployed=${data.deployed}`);
                } else {
                    console.error(`❌ [CLIENT] Error: newNode es null o undefined`);
                }
            } catch (error) {
                console.error(`❌ [CLIENT] Error al crear camera drone:`, error);
            }
        });
        
        /**
         * 🆕 NUEVO: Manejo de fallo en despliegue de camera drone
         */
        this.socket.on('camera_drone_deploy_failed', (data) => {
            console.error(`❌ [CLIENT] Despliegue de camera drone fallido: ${data.reason}`);
            // TODO: Mostrar mensaje de error al usuario en la UI
        });
        
        /**
         * 🆕 NUEVO: Actualización inmediata de currency (para despliegues de consumibles)
         */
        this.socket.on('currency_update', (data) => {
            if (data && this.myTeam && data[this.myTeam] !== undefined) {
                const oldCurrency = this.game.currency.missionCurrency;
                this.game.currency.missionCurrency = data[this.myTeam];
                console.log(`💰 [CLIENT] Currency actualizado inmediatamente: ${oldCurrency} → ${this.game.currency.missionCurrency}$`);
            }
        });
        
        /**
         * 🆕 NUEVO: Manejo de despliegue de truck assault
         */
        this.socket.on('truck_assault_deployed', (data) => {
            // Verificar que no exista ya (evitar duplicados)
            const exists = this.game.nodes.find(n => n.id === data.truckAssaultId);
            if (exists) {
                console.warn(`⚠️ Nodo ${data.truckAssaultId} ya existe, ignorando truck_assault_deployed`);
                return;
            }
            
            // Crear el nodo del truck assault en el cliente (ya construido, no necesita construcción)
            const config = getNodeConfig('truckAssault');
            const newNode = new VisualNode(
                data.x,
                data.y,
                'truckAssault',
                {
                    ...config,
                    team: data.team,
                    isConstructed: true // Ya está construido
                },
                this.game
            );
            
            if (newNode) {
                // Sobrescribir ID y estado desde el servidor
                newNode.id = data.truckAssaultId;
                newNode.constructed = true;
                newNode.isConstructing = false;
                newNode.active = true;
                newNode.detectionRadius = data.detectionRadius || 200;
                newNode.isTruckAssault = true;
                
                // Sincronizar tiempo de expiración del truck assault
                if (data.spawnTime !== undefined) {
                    newNode.spawnTime = data.spawnTime;
                }
                if (data.expiresAt !== undefined) {
                    newNode.expiresAt = data.expiresAt;
                }
                
                // Inicializar propiedades de interpolación para multijugador
                if (newNode.updateServerPosition) {
                    newNode.updateServerPosition(data.x, data.y);
                }
                
                this.game.nodes.push(newNode);
            }
        });
        
        /**
         * 🆕 NUEVO: Manejo de fallo de despliegue de truck assault
         */
        this.socket.on('truck_assault_deploy_failed', (data) => {
            // TODO: Mostrar mensaje visual al usuario cuando se implemente showMessage en UIManager
        });
        
        /**
         * Manejo de lanzamiento de dron
         */
        this.socket.on('drone_launched', (data) => {
            this.eventHandler.handleDroneLaunched(data);
        });
        
        /**
         * Manejo de impacto de dron
         */
        this.socket.on('drone_impact', (impact) => {
            
            // Detener sonido del dron
            this.game.audio.stopDroneSound(impact.droneId);
            
            // Reproducir sonido de explosión
            this.game.audio.playExplosionSound();
            
            // Crear explosión grande con partículas grises
            this.game.particleSystem.createExplosion(impact.x, impact.y, '#808080', 40);
            
            // 🆕 NUEVO: Crear animación de explosión de dron (2 frames) cuando impacta
            // La explosión del edificio se muestra después (explosionSprite)
            this.game.particleSystem.createDroneExplosionSprite(impact.x, impact.y);
            
            // Añadir sprite de explosión animado del edificio (después de la explosión del dron)
            this.game.particleSystem.createExplosionSprite(impact.x, impact.y);
            
            // Crear marca de impacto permanente (cráter grande)
            this.game.particleSystem.createImpactMark(impact.x, impact.y, 'impact_icon', 1.2);
            
        });
        
        /**
         * Manejo de alerta de anti-drone (dron detectado en rango de 220px)
         */
        this.socket.on('antidrone_alert', (alert) => {
            
            // Reproducir sonido de ataque anti-drone (alerta)
            this.game.audio.playAntiDroneAttackSound();
        });
        
        /**
         * Manejo de intercepción de dron por anti-drone
         */
        this.socket.on('drone_intercepted', (interception) => {
            
            // Detener sonido del dron
            this.game.audio.stopDroneSound(interception.droneId);
            
            // Sonido de disparo anti-drone
            this.game.audio.playBomShootSound();
            
            // Crear partículas de explosión del dron en el aire (gris, más pequeña)
            this.game.particleSystem.createExplosion(
                interception.x, 
                interception.y, 
                '#808080', // Gris (igual que explosiones de edificios)
                8 // Menos partículas que explosión de edificio
            );
            
            // 🆕 NUEVO: Crear animación de explosión de dron (2 frames)
            this.game.particleSystem.createDroneExplosionSprite(interception.x, interception.y);
            
            // Crear cráter pequeño del dron destruido (50% del tamaño)
            this.game.particleSystem.createImpactMark(interception.x, interception.y, 'impact_icon', 0.5);
            
            // Crear línea de disparo (efecto visual) desde anti-drone al dron
            const building = this.game.nodes.find(n => n.id === interception.antiDroneId);
            if (building) {
                // Crear partículas a lo largo de la línea de disparo
                const dx = interception.x - interception.antiDroneX;
                const dy = interception.y - interception.antiDroneY;
                const particles = 5;
                for (let i = 0; i < particles; i++) {
                    const t = i / (particles - 1);
                    const x = interception.antiDroneX + dx * t;
                    const y = interception.antiDroneY + dy * t;
                    
                    this.game.particleSystem.createParticle(
                        x, y,
                        0, 0, // Sin velocidad
                        '#ffff00', // Amarillo para el disparo
                        300 // Duración corta
                    );
                }
            }
            
            // Marcar anti-drone para fade out (como edificios abandonados)
            const antiDroneNode = this.game.nodes.find(n => n.id === interception.antiDroneId);
            if (antiDroneNode) {
                antiDroneNode.isAbandoning = true;
                antiDroneNode.abandonPhase = 1; // Empezar fade out
                
                // Programar eliminación después del fade out (2 segundos)
                setTimeout(() => {
                    const index = this.game.nodes.indexOf(antiDroneNode);
                    if (index > -1) {
                        this.game.nodes.splice(index, 1);
                    }
                }, 2000);
            }
            
        });
        
        /**
         * Manejo de lanzamiento de tanque
         */
        this.socket.on('tank_launched', (data) => {
            // El servidor ya lo tiene en el estado, solo reproducir sonido si es necesario
            console.log(`🛡️ Tanque ${data.tankId} lanzado por ${data.team} → ${data.targetId}`);
        });
        
        /**
         * Manejo de fallo en lanzamiento de tanque
         */
        this.socket.on('tank_failed', (data) => {
            console.log(`⚠️ Tanque rechazado: ${data.reason}`);
            // TODO: Mostrar mensaje visual al usuario cuando se implemente showMessage en UIManager
        });
        
        /**
         * Manejo de impacto de tanque
         */
        this.socket.on('tank_impact', (impact) => {
            // Reproducir sonido de explosión
            this.game.audio.playExplosionSound();
            
            // Crear explosión grande con partículas grises
            this.game.particleSystem.createExplosion(impact.x, impact.y, '#808080', 40);
            
            // Añadir sprite de explosión animado
            this.game.particleSystem.createExplosionSprite(impact.x, impact.y);
            
            // Crear marca de impacto permanente (cráter grande)
            this.game.particleSystem.createImpactMark(impact.x, impact.y, 'impact_icon', 1.2);
            
            console.log(`💥 Tanque ${impact.tankId} impactó ${impact.targetType} en (${impact.x}, ${impact.y})`);
        });
        
        /**
         * 🆕 NUEVO: Manejo de lanzamiento de artillado ligero
         */
        this.socket.on('light_vehicle_launched', (data) => {
            // El servidor ya lo tiene en el estado, solo reproducir sonido si es necesario
            console.log(`🚛 Artillado ligero ${data.lightVehicleId} lanzado por ${data.team} → ${data.targetId}`);
        });
        
        /**
         * 🆕 NUEVO: Manejo de fallo en lanzamiento de artillado ligero
         */
        this.socket.on('light_vehicle_failed', (data) => {
            console.log(`⚠️ Artillado ligero rechazado: ${data.reason}`);
            // TODO: Mostrar mensaje visual al usuario cuando se implemente showMessage en UIManager
        });
        
        /**
         * 🆕 NUEVO: Manejo de impacto de artillado ligero (aplica broken en vez de destruir)
         */
        this.socket.on('light_vehicle_impact', (impact) => {
            // Reproducir sonido de explosión
            this.game.audio.playExplosionSound();
            
            // Crear explosión grande con partículas grises (igual que tanque)
            this.game.particleSystem.createExplosion(impact.x, impact.y, '#808080', 40);
            
            // Añadir sprite de explosión animado
            this.game.particleSystem.createExplosionSprite(impact.x, impact.y);
            
            // NO crear marca de impacto permanente (el edificio no se destruye, solo se rompe)
            
            console.log(`💥 Artillado ligero ${impact.lightVehicleId} aplicó broken a ${impact.targetType} en (${impact.x}, ${impact.y})`);
        });
        
        /**
         * 🆕 NUEVO: Manejo de lanzamiento de artillería
         */
        this.socket.on('artillery_launched', (data) => {
            console.log(`💣 Artillería ${data.artilleryId} lanzada por ${data.team} en (${data.x}, ${data.y})`);
            
            // Iniciar efecto visual en RenderSystem
            if (this.game && this.game.renderer) {
                this.game.renderer.executeArtilleryEffect(data);
            }
        });
        
        /**
         * 🆕 NUEVO: Manejo de ejecución de artillería
         */
        this.socket.on('artillery_executed', (data) => {
            console.log(`💣 Artillería ejecutada - ${data.affectedBuildings.length} edificios afectados`);
            
            // Reproducir sonido de explosión
            if (this.game && this.game.audio && this.game.audio.playExplosionSound) {
                this.game.audio.playExplosionSound();
            }
            
            // Aplicar efectos visuales a edificios afectados
            if (data.affectedBuildings) {
                data.affectedBuildings.forEach((building, index) => {
                    const x = building.x;
                    const y = building.y;
                    
                    // Reproducir sonido de explosión (espaciado)
                    if (this.game.audio && this.game.audio.playExplosionSound) {
                        setTimeout(() => {
                            this.game.audio.playExplosionSound();
                        }, index * 50 + Math.random() * 100);
                    }
                    
                    // Partículas de explosión
                    this.game.particleSystem.createExplosion(x, y, '#808080', 30);
                    
                    // Sprite de explosión
                    if (this.game.particleSystem.createExplosionSprite) {
                        this.game.particleSystem.createExplosionSprite(x, y);
                    }
                    
                    console.log(`💥 Artillería: Edificio ${building.type} ${building.id} afectado en (${x}, ${y})`);
                });
            }
        });
        
        this.socket.on('cheat_success', (data) => {
            console.log(`✅ CHEAT: ${data.message}`);
        });
        
        this.socket.on('opponent_disconnected', () => {
            console.log('❌ Oponente desconectado');
            alert('Oponente desconectado. Victoria por abandono.');
            this.game.handleVictory();
        });
        
        // CRÍTICO: Manejar final de partida (victoria/derrota)
        this.socket.on('game_over', (victoryResult) => {
            
            if (victoryResult.winner === this.game.myTeam) {
                this.game.triggerVictory();
            } else {
                this.game.triggerDefeat();
            }
        });
        
        this.socket.on('error', (data) => {
            alert(`Error: ${data.message}`);
            // 🆕 FIX: Restaurar botón si hay error al iniciar partida
            if (this._startingGame) {
                this._startingGame = false;
                const startBtn = document.getElementById('start-multiplayer-game-btn');
                if (startBtn) {
                    startBtn.disabled = false;
                    startBtn.textContent = 'Comenzar Partida';
                }
            }
        });
    }
    
    /**
     * Espera a que los assets críticos estén cargados
     */
    async waitForCriticalAssets() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                const assetsLoaded = this.game.assetManager.isReady();
                const criticalAssetsLoaded = this.game.assetManager.areCriticalAssetsLoaded();
                const allReady = assetsLoaded && criticalAssetsLoaded;
                
                if (allReady) {
                    clearInterval(checkInterval);
                    console.log('✅ Assets completamente listos');
                    resolve();
                } else {
                    console.log('⏳ Esperando assets...', {
                        all: assetsLoaded,
                        critical: criticalAssetsLoaded,
                        progress: this.game.assetManager.getProgress()
                    });
                }
            }, 200); // Verificar cada 200ms para no saturar
            
            // Timeout de seguridad después de 15 segundos
            setTimeout(() => {
                clearInterval(checkInterval);
                console.warn('⚠️ Timeout esperando assets críticos, continuando...');
                resolve();
            }, 15000);
        });
    }
    
    /**
     * Finaliza el inicio del juego multijugador
     */
    finishGameStart() {
        // Verificación final de assets antes de proceder
        const finalAssetCheck = this.game.assetManager.isReady() && 
                               this.game.assetManager.areCriticalAssetsLoaded();
        
        if (!finalAssetCheck) {
            console.log('🖼️ Estado final:', {
                allLoaded: this.game.assetManager.isReady(),
                criticalLoaded: this.game.assetManager.areCriticalAssetsLoaded(),
                progress: this.game.assetManager.getProgress()
            });
        } else {
            console.log('✅ Verificación final de assets: TODO LISTO');
        }
        

        
        // 🆕 SIMPLIFICADO: Solo ocultar el overlay del tutorial si está activo
        // El tutorial nuevo es simple y no debería interferir, pero por seguridad lo ocultamos
        if (this.game.tutorialManager && this.game.tutorialManager.active) {
            const tutorialOverlay = document.getElementById('tutorial-overlay');
            if (tutorialOverlay) {
                tutorialOverlay.style.display = 'none';
            }
            this.game.tutorialManager.active = false;
        }
        
        // 🆕 FIX: Asegurar que el canvas y contenedores sean visibles
        // Esto es necesario porque algunos overlays pueden ocultarlos
        const gameCanvas = document.getElementById('game-canvas');
        if (gameCanvas) {
            gameCanvas.style.display = 'block';
            gameCanvas.style.visibility = 'visible';
            gameCanvas.style.opacity = '1';
            gameCanvas.style.zIndex = '1';
            gameCanvas.style.position = 'relative';
            gameCanvas.style.pointerEvents = 'auto';
        }
        
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.style.display = 'block';
            gameContainer.style.visibility = 'visible';
            gameContainer.style.opacity = '1';
        }
        
        const mainGame = document.getElementById('main-game');
        if (mainGame) {
            mainGame.style.display = 'block';
            mainGame.style.visibility = 'visible';
            mainGame.style.opacity = '1';
        }
        
        // 🆕 ELIMINADO: Los elementos timer-display y fob-currency-display fueron eliminados del HTML
        // El HUD ahora se renderiza completamente desde el canvas
        
        // Verificar canvas
        const canvas = this.game.canvas;
        
        // Forzar primer render
        this.game.render();
    }
    
    // === ACCIONES DEL CLIENTE ===
    
    /**
     * Crear sala nueva
     */
    createRoom(playerName) {
        if (!this.connected) {
            console.error('No conectado al servidor');
            return;
        }
        
        // 🆕 NUEVO: Limpiar cualquier estado anterior antes de crear una nueva sala
        // Esto evita problemas si el jugador salió de una partida anterior
        if (this.roomId) {
            console.log('⚠️ Limpiando sala anterior antes de crear nueva...');
            this.leaveRoom();
        }
        
        // Asegurarse de que el estado esté limpio
        this.roomId = null;
        this.myTeam = null;
        this.opponentTeam = null;
        this.isReady = false;
        this._startingGame = false;
        
        // 🆕 FIX: Restaurar botón de inicio
        const startBtn = document.getElementById('start-multiplayer-game-btn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = 'Comenzar Partida';
            startBtn.style.display = 'none';
        }
        
        this.clientSender.createRoom(playerName);
    }
    
    /**
     * Unirse a sala
     */
    joinRoom(roomId, playerName) {
        if (!this.connected) {
            console.error('No conectado al servidor');
            return;
        }
        
        this.clientSender.joinRoom(roomId, playerName);
    }
    
    /**
     * Listar salas disponibles
     */
    getRooms() {
        if (!this.connected) {
            console.error('No conectado al servidor');
            return;
        }
        
        this.clientSender.getRooms();
    }
    
    /**
     * Iniciar partida (solo host)
     */
    startGame() {
        if (!this.connected || !this.roomId) {
            console.error('No conectado o sin sala');
            return;
        }
        
        // Prevenir doble-click
        if (this._startingGame) {
            console.log('⚠️ Ya se está iniciando la partida...');
            return;
        }
        this._startingGame = true;
        
        this.clientSender.startGame(this.roomId);
        
        // Ocultar botón de inicio
        const startBtn = document.getElementById('start-multiplayer-game-btn');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.textContent = 'Iniciando...';
        }
    }
    
    /**
     * Enviar solicitud de construcción
     */
    requestBuild(buildingType, x, y) {
        if (!this.isMultiplayer || !this.roomId) return;
        
        this.clientSender.requestBuild(this.roomId, buildingType, x, y);
    }
    
    /**
     * Enviar solicitud de convoy
     */
    requestConvoy(fromId, toId) {
        if (!this.isMultiplayer || !this.roomId) return;
        
        this.clientSender.requestConvoy(this.roomId, fromId, toId);
    }
    
    /**
     * Seleccionar raza en multiplayer
     */
    selectRace(raceId) {
        
        if (!this.isMultiplayer || !this.roomId) {
            console.log('❌ selectRace bloqueado - isMultiplayer:', this.isMultiplayer, 'roomId:', this.roomId);
            return;
        }
        
        // 🆕 NUEVO: Obtener unidades del mazo, banquillo y disciplinas
        let deckUnits = null;
        let benchUnits = null;
        let disciplines = null; // 🆕 NUEVO: Disciplinas
        
        if (this.game && this.game.deckManager) {
            const deck = this.game.deckManager.getDeck(raceId);
            if (deck) {
                deckUnits = deck.units;
                benchUnits = deck.bench || [];
                disciplines = deck.disciplines || []; // 🆕 NUEVO: Disciplinas
            } else if (raceId === 'default') {
                const defaultDeck = this.game.deckManager.getDefaultDeck();
                if (defaultDeck) {
                    deckUnits = defaultDeck.units;
                    benchUnits = defaultDeck.bench || [];
                    disciplines = defaultDeck.disciplines || []; // 🆕 NUEVO: Disciplinas
                }
            }
        }
        
        this.clientSender.selectRace(this.roomId, raceId, deckUnits, benchUnits, disciplines);
    }
    
    /**
     * Enviar solicitud de ambulancia
     */
    requestAmbulance(fromId, toId) {
        if (!this.isMultiplayer || !this.roomId) return;
        
        this.clientSender.requestAmbulance(this.roomId, fromId, toId);
    }
    
    /**
     * Solicita disparo de francotirador al servidor
     */
    requestSniper(targetId) {
        if (!this.isMultiplayer || !this.roomId) return;
                
        this.clientSender.requestSniper(this.roomId, targetId);
    }
    
    /**
     * Solicita sabotaje de FOB al servidor
     */
    requestFobSabotage(targetId) {
        if (!this.isMultiplayer || !this.roomId) return;
        
        this.clientSender.requestFobSabotage(this.roomId, targetId);
    }
    
    /**
     * Solicita lanzamiento de dron al servidor
     */
    requestDrone(targetId) {
        if (!this.isMultiplayer || !this.roomId) return;
        
        this.clientSender.requestDrone(this.roomId, targetId);
    }
    
    /**
     * Solicita lanzamiento de tanque al servidor
     */
    requestTank(targetId) {
        if (!this.isMultiplayer || !this.roomId) return;
        
        this.clientSender.requestTank(this.roomId, targetId);
    }
    
    /**
     * Solicita lanzamiento de artillado ligero al servidor
     * 🆕 NUEVO
     */
    requestLightVehicle(targetId) {
        if (!this.isMultiplayer || !this.roomId) return;
        
        this.clientSender.requestLightVehicle(this.roomId, targetId);
    }
    
    /**
     * Solicita despliegue de comando especial operativo al servidor
     * 🆕 NUEVO
     */
    requestCommandoDeploy(x, y) {
        if (!this.isMultiplayer || !this.roomId) return;
        
        this.clientSender.requestCommandoDeploy(this.roomId, x, y);
    }
    
    /**
     * 🆕 NUEVO: Solicita despliegue de truck assault al servidor
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     */
    requestCameraDroneDeploy(x, y) {
        if (!this.socket || !this.connected || !this.roomId) {
            console.error('❌ No hay conexión al servidor');
            return;
        }
        
        this.clientSender.requestCameraDroneDeploy(this.roomId, x, y);
    }
    
    requestArtilleryLaunch(x, y) {
        if (!this.socket || !this.roomId) {
            console.error('❌ No hay conexión al servidor');
            return;
        }
        
        this.clientSender.requestArtilleryLaunch(this.roomId, x, y);
    }
    
    requestTruckAssaultDeploy(x, y) {
        if (!this.isMultiplayer || !this.roomId) return;
        
        this.clientSender.requestTruckAssaultDeploy(this.roomId, x, y);
    }
    
    /**
     * 🆕 NUEVO: Solicita activación del Destructor de mundos
     */
    requestWorldDestroyer() {
        if (!this.isMultiplayer || !this.roomId) return;
        
        this.clientSender.requestWorldDestroyer(this.roomId);
    }
    
    /**
     * 🆕 NUEVO: Activar disciplina
     */
    activateDiscipline(disciplineId) {
        if (!this.isMultiplayer || !this.roomId) return;
        
        this.clientSender.activateDiscipline(this.roomId, disciplineId);
    }
    
    /**
     * CHEAT: Añade currency al jugador (solo para testing)
     */
    addCurrency(amount = 500) {
        if (!this.isMultiplayer || !this.roomId) {
            return;
        }
        
        this.clientSender.addCurrency(this.roomId, amount);
    }
    
    // === MANEJO DE ESTADO ===
    
    /**
     * Cargar estado inicial desde servidor
     */
    loadInitialState(initialState) {
        console.log('📦 Cargando estado inicial:', initialState);
        
        // 🆕 FIX: Limpiar completamente el estado ANTES de cargar el nuevo estado
        // Esto evita que residuos de partidas anteriores interfieran
        if (this.game.clearGameState) {
            this.game.clearGameState();
        } else {
            // Fallback: limpieza manual si clearGameState no existe
            this.game.nodes = [];
            this.game.helicopters = [];
            this.game.convoyManager.clear();
            this.game.particleSystem.clear();
            this.game.droneSystem.clear();
            this.game.tankSystem.clear();
            this.game.currency.reset();
            this.game.buildSystem.resetLevel();
            this.game.medicalSystem.reset();
            this.game.frontMovement.resetLevel();
            this.game.territory.reset();
            this.game.audio.resetEventFlags();
            this.game.camera.reset();
            this.game.renderer.clear();
        }
        
        // 🆕 FIX: Ocultar todas las pantallas antes de cargar el estado inicial
        if (this.game.screenManager) {
            this.game.screenManager.hideAll();
        }
        
        // IMPORTANTE: Marcar como multijugador para desactivar IA
        this.game.isMultiplayer = true;
        this.isMultiplayer = true;
        
        // === LEGACY REMOVED: IA eliminada del cliente ===
        // La IA ahora está completamente en el servidor
        
        // Crear nodos desde datos del servidor
        initialState.nodes.forEach(nodeData => {
            const config = getNodeConfig(nodeData.type);
            const node = new VisualNode(
                nodeData.x,
                nodeData.y,
                nodeData.type,
                {
                    ...config,
                    team: nodeData.team,
                    isConstructed: false // Ya construidos
                },
                this.game
            );
            
            // Sobrescribir ID con el del servidor
            node.id = nodeData.id;
            node.supplies = nodeData.supplies;
            node.availableVehicles = nodeData.availableVehicles;
            
            // 🆕 NUEVO: Sincronizar propiedades de inversión (intelRadio)
            if (nodeData.investmentTime !== undefined) {
                node.investmentTime = nodeData.investmentTime;
            }
            if (nodeData.investmentTimer !== undefined) {
                node.investmentTimer = nodeData.investmentTimer;
            }
            if (nodeData.investmentStarted !== undefined) {
                node.investmentStarted = nodeData.investmentStarted;
            }
            if (nodeData.investmentCompleted !== undefined) {
                node.investmentCompleted = nodeData.investmentCompleted;
            }
            
            // 🆕 NUEVO: Sincronizar estado disabled (genérico)
            if (nodeData.disabled !== undefined) {
                node.disabled = nodeData.disabled;
            }
            
            // 🆕 NUEVO: Sincronizar estado broken (roto)
            if (nodeData.broken !== undefined) {
                node.broken = nodeData.broken;
            }
            
            // Inicializar propiedades de interpolación para multijugador
            if (node.updateServerPosition) {
                node.updateServerPosition(nodeData.x, nodeData.y);
            }
            
            this.game.nodes.push(node);
            
            console.log(`  ✓ Nodo creado: ${nodeData.type} (${nodeData.team}) en (${nodeData.x}, ${nodeData.y})`);
        });
        
        
        // Establecer currency (CRÍTICO: usar missionCurrency, no .currency)
        this.game.currency.missionCurrency = initialState.currency[this.myTeam];
        
        // Configurar mundo
        this.game.worldWidth = initialState.worldWidth;
        this.game.worldHeight = initialState.worldHeight;
        
        // CRÍTICO: Reset y configurar cámara
        this.game.camera.reset();
        this.game.camera.setWorldSize(this.game.worldWidth, this.game.worldHeight);

        
        // Generar sistema de tiles del background
        this.game.backgroundTiles = new BackgroundTileSystem(this.game.worldWidth, this.game.worldHeight, 60);
        
        // Inicializar road system (se actualiza automáticamente en update())
        this.game.roadSystem.update();
        
        // Inicializar sistemas dependientes
        this.game.territory.reset();
        this.game.territory.initializeAllyFrontier();
        this.game.territory.initializeEnemyFrontier();
        
        // 🆕 SERVIDOR COMO AUTORIDAD: Cargar configuración de edificios
        if (initialState.buildingConfig) {
            this.game.serverBuildingConfig = initialState.buildingConfig;
            
            // Actualizar configuración local con valores del servidor
            this.updateLocalBuildingConfig(initialState.buildingConfig);
        }
        
    }
    
    /**
     * Aplicar estado completo del servidor (SERVIDOR AUTORITATIVO COMPLETO)
     */
    applyGameState(gameState) {
        if (!gameState) return;
        
        // Guardar el último estado recibido (delegado a GameStateSync)
        this.gameStateSync.lastGameState = gameState;
        
        // === ACTUALIZAR HELICÓPTEROS === (Delegado a GameStateSync)
        this.gameStateSync.syncHelicopters(gameState);
        
        // === ACTUALIZAR CURRENCY === (Delegado a GameStateSync)
        this.gameStateSync.syncCurrency(gameState);
        
        // === ACTUALIZAR NODOS === (Delegado a GameStateSync)
        this.gameStateSync.syncNodes(gameState);
        
        // === ACTUALIZAR CONVOYES === (Delegado a GameStateSync)
        this.gameStateSync.syncConvoys(gameState);
        
        // === ACTUALIZAR TRENES === (Delegado a GameStateSync)
        this.gameStateSync.syncTrains(gameState);
        
        // === ACTUALIZAR ENVÍOS DE FÁBRICAS === (Delegado a GameStateSync)
        this.gameStateSync.syncFactorySupplyDeliveries(gameState);
        
        // === ACTUALIZAR DRONES === (Delegado a GameStateSync)
        this.gameStateSync.syncDrones(gameState);
        
        // === ACTUALIZAR TANQUES === (Delegado a GameStateSync)
        this.gameStateSync.syncTanks(gameState);
        
        // === ACTUALIZAR ARTILLADOS LIGEROS === (Delegado a GameStateSync)
        this.gameStateSync.syncLightVehicles(gameState);
        
        // === ACTUALIZAR EMERGENCIAS MÉDICAS === (Delegado a GameStateSync)
        this.gameStateSync.syncMedicalEmergencies(gameState);
        
        // === PROCESAR EVENTOS DE SONIDO ===
        if (gameState.soundEvents && gameState.soundEvents.length > 0) {
            gameState.soundEvents.forEach(event => {
                this.eventHandler.handleSoundEvent(event);
            });
        }
        
        // 🆕 NUEVO: PROCESAR EVENTOS VISUALES ===
        // 🐛 DEBUG: Log para ver si llegan eventos visuales
        if (gameState.visualEvents) {
            console.log(`📺 [CLIENT DEBUG] visualEvents recibidos: ${gameState.visualEvents.length} evento(s)`, gameState.visualEvents);
            if (gameState.visualEvents.length > 0) {
                gameState.visualEvents.forEach(event => {
                    this.eventHandler.handleVisualEvent(event);
                });
            }
        } else {
            // Solo log periódico para no saturar
            if (!this._lastVisualEventsCheck || Date.now() - this._lastVisualEventsCheck > 5000) {
                console.log(`📺 [CLIENT DEBUG] gameState.visualEvents no existe o está vacío`);
                this._lastVisualEventsCheck = Date.now();
            }
        }
    }
    
    /**
     * 🆕 NUEVO: Maneja eventos visuales del servidor (números flotantes, efectos, etc.)
     * @param {Object} event - Evento visual del servidor
     */
    // === EVENTOS AUDIOVISUALES === (Delegado a NetworkEventHandler)
    // Los siguientes métodos fueron movidos a NetworkEventHandler:
    // - handleSoundEvent()
    // - handleVisualEvent()
    // - handleSniperFired()
    // - handleFobSabotageFired()
    // - handleFobSabotageFailed()
    // - handleWorldDestroyerActivated()
    // - handleDroneLaunched()
    
    // === UI DE LOBBY === (Delegado a LobbyHandler)
    // Los siguientes métodos fueron movidos a LobbyHandler:
    // - showRoomView()
    // - updateLobbyUI()
    // - generateDeckOptions()
    // - getDeckDisplayName()
    // - setupRaceSelectListeners()
    // - getMyPlayerData()
    // - setupLobbyButtons()
    // - sendChatMessage()
    // - addChatMessage()
    // - kickPlayer()
    // - leaveRoom()
    // - hideLobby()
    // - displayRoomsList()
    // - startGameCountdown()
    // - createGameCountdownOverlay()
    // - updateGameCountdownDisplay()
    // - startActualGame()
    
    /**
     * Manejar fin de partida
     */
    handleGameOver(data) {
        
        // Detener el juego
        this.game.paused = true;
        this.game.state = 'finished';
        
        // Determinar si gané o perdí
        const isWinner = data.winner === this.game.myTeam;
        const reasonText = this.getReasonText(data.reason, isWinner);
        
        // Mostrar pantalla de victoria/derrota
        this.showGameOverScreen(isWinner, reasonText, data.stats);
    }
    
    /**
     * Obtener texto descriptivo de la razón de victoria
     */
    getReasonText(reason, isWinner) {
        const winReasons = {
            'enemy_front_pushed': 'Empujaste al enemigo hasta su línea de derrota'
        };
        
        const loseReasons = {
            'enemy_front_pushed': 'El enemigo te empujó hasta tu línea de derrota'
        };
        
        const reasons = isWinner ? winReasons : loseReasons;
        return reasons[reason] || (isWinner ? 'Victoria' : 'Derrota');
    }
    
    /**
     * Mostrar pantalla de victoria/derrota
     */
    showGameOverScreen(isWinner, reasonText, stats) {
        
        // Guardar datos del lobby para uso posterior (necesario para auto-selección de raza)
        this.lastLobbyData = data;
        
        // 🆕 FIX: Determinar si soy host basándome en los datos del servidor
        // Esto evita problemas de race condition cuando lobby_update llega antes de room_created
        const myPlayer = data.players.find(p => p.id === this.socket.id);
        const isHost = myPlayer && (myPlayer.isHost || myPlayer.team === 'player1');
        
        // 🆕 FIX: Actualizar this.myTeam si aún no está establecido (para evitar race conditions)
        if (!this.myTeam && myPlayer) {
            this.myTeam = myPlayer.team;
            this.game.myTeam = myPlayer.team;
            console.log(`🔄 myTeam actualizado desde lobby_update: ${this.myTeam}`);
        }
        
        // Renderizar cada jugador
        data.players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.style.cssText = `
                background: rgba(0, 0, 0, 0.7);
                border: 2px solid ${player.team === 'player1' ? '#4ecca3' : '#e74c3c'};
                border-radius: 5px;
                padding: 15px;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            
            const playerInfo = document.createElement('div');
            const isMe = player.id === this.socket.id;
            const youLabel = isMe ? ' (Tú)' : '';
            const teamColor = player.team === 'player1' ? '#4ecca3' : '#e74c3c';
            const teamName = player.team === 'player1' ? 'Azul' : 'Rojo';
            
            // Checkbox visual
            const checkboxColor = player.ready ? '#4ecca3' : '#e74c3c';
            const checkIcon = player.ready ? '✓' : '✗';
            
            playerInfo.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="
                        width: 30px;
                        height: 30px;
                        border: 3px solid ${checkboxColor};
                        border-radius: 5px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 20px;
                        font-weight: bold;
                        color: ${checkboxColor};
                        background: rgba(0, 0, 0, 0.5);
                    ">
                        ${checkIcon}
                    </div>
                    <div>
                        <div style="font-size: 18px; font-weight: bold; color: white; margin-bottom: 3px;">
                            ${player.name}${youLabel}
                        </div>
                        <div style="font-size: 14px; color: ${teamColor}; margin-bottom: 8px;">
                            Equipo: ${teamName}
                        </div>
                        ${isMe ? `
                            <select id="race-select-${player.id}" style="
                                padding: 5px 10px;
                                background: rgba(0, 0, 0, 0.7);
                                border: 2px solid #4ecca3;
                                border-radius: 5px;
                                color: white;
                                font-size: 14px;
                                width: 200px;
                            " ${player.ready ? 'disabled' : ''}>
                                ${this.generateDeckOptions(player.selectedRace)}
                            </select>
                        ` : `
                            <div style="font-size: 14px; color: ${player.selectedRace ? '#2ecc71' : '#e74c3c'};">
                                ${this.getDeckDisplayName(player.selectedRace)}
                            </div>
                        `}
                    </div>
                </div>
            `;
            
            playerCard.appendChild(playerInfo);
            
            // Botón expulsar (solo si soy host y no es mi card) - MÁS PEQUEÑO
            if (isHost && !isMe) {
                const kickBtn = document.createElement('button');
                kickBtn.className = 'menu-btn secondary';
                kickBtn.textContent = '🚫';
                kickBtn.style.cssText = 'padding: 8px 12px; font-size: 16px; min-width: 50px;';
                kickBtn.title = 'Expulsar jugador';
                kickBtn.onclick = () => this.kickPlayer(player.id);
                playerCard.appendChild(kickBtn);
            }
            
            playersList.appendChild(playerCard);
        });
        
        // 🤖 NUEVO: Mostrar/ocultar slot de IA según corresponda
        // 🆕 FIX: Usar isHost de los datos del servidor en lugar de this.myTeam
        const aiSlot = document.getElementById('ai-slot');
        const aiSlotEmpty = document.getElementById('ai-slot-empty');
        const aiSlotConfig = document.getElementById('ai-slot-config');
        
        if (data.aiPlayer) {
            // Hay IA: mostrar configuración
            if (aiSlotEmpty) aiSlotEmpty.style.display = 'none';
            if (aiSlotConfig) {
                aiSlotConfig.style.display = 'block';
                // Actualizar selectores
                const raceSelect = document.getElementById('ai-race-select');
                const difficultySelect = document.getElementById('ai-difficulty-select');
                if (raceSelect) raceSelect.value = data.aiPlayer.race;
                if (difficultySelect) difficultySelect.value = data.aiPlayer.difficulty;
            }
        } else if (data.players.length < 2 && isHost) {
            // No hay IA y soy host: mostrar botón para añadir
            if (aiSlot) aiSlot.style.display = 'block';
            if (aiSlotEmpty) aiSlotEmpty.style.display = 'block';
            if (aiSlotConfig) aiSlotConfig.style.display = 'none';
        } else {
            // No hay IA y no soy host, o hay player2: ocultar slot
            if (aiSlot) aiSlot.style.display = data.players.length === 2 ? 'none' : 'block';
        }
        
        // Actualizar mi estado de ready basado en los datos del servidor
        if (myPlayer) {
            this.isReady = myPlayer.ready;
            
            // Actualizar botón de ready
            const readyBtn = document.getElementById('ready-toggle-btn');
            if (readyBtn) {
                readyBtn.textContent = this.isReady ? 'Cancelar' : 'Marcar Listo';
            }
        }
        
        // Actualizar botón de inicio (solo visible para host si todos están ready Y han seleccionado nación)
        const startBtn = document.getElementById('start-multiplayer-game-btn');
        if (startBtn && isHost) {
            // 🤖 NUEVO: Verificar si hay 2 jugadores humanos O 1 jugador + IA
            const hasPlayer2 = data.players.length === 2;
            const hasAI = data.aiPlayer !== null && data.aiPlayer !== undefined;
            const hasOpponent = hasPlayer2 || hasAI;
            
            // Verificar que todos estén ready
            const allPlayersReady = data.players.every(p => p.ready);
            const aiReady = hasAI ? true : true; // IA siempre está lista
            const allReady = allPlayersReady && aiReady;
            
            // Verificar que todos tengan raza seleccionada
            const allPlayersHaveRace = data.players.every(p => p.selectedRace);
            const aiHasRace = hasAI ? (data.aiPlayer.race !== null) : true;
            const allHaveRace = allPlayersHaveRace && aiHasRace;
            
            // 🆕 FIX: Restaurar botón antes de mostrar/ocultar
            startBtn.disabled = false;
            startBtn.textContent = 'Comenzar Partida';
            
            startBtn.style.display = (hasOpponent && allReady && allHaveRace) ? 'block' : 'none';
        } else if (startBtn) {
            // Si no soy host, ocultar y restaurar el botón
            startBtn.style.display = 'none';
            startBtn.disabled = false;
            startBtn.textContent = 'Comenzar Partida';
        }
        
        // Configurar event listeners para los selects de raza
        this.setupRaceSelectListeners();
    }
    
    /**
     * Genera las opciones del desplegable de mazos
     * @param {string} selectedDeckId - ID del mazo actualmente seleccionado
     * @returns {string} HTML con las opciones del select
     */
    generateDeckOptions(selectedDeckId) {
        if (!this.game || !this.game.deckManager) {
            // Fallback si no hay DeckManager disponible
            return '<option value="default">Mazo Predeterminado</option>';
        }
        
        const allDecks = this.game.deckManager.getAllDecks();
        const defaultDeck = allDecks.find(d => d.isDefault === true);
        const playerDecks = allDecks.filter(d => d.isDefault === false);
        
        let optionsHTML = '';
        
        // Primero el mazo predeterminado (siempre disponible)
        if (defaultDeck) {
            const isSelected = (!selectedDeckId && !this.game.deckManager.lastSelectedDeckId) || 
                              selectedDeckId === defaultDeck.id ||
                              (!selectedDeckId && this.game.deckManager.lastSelectedDeckId === defaultDeck.id);
            optionsHTML += `<option value="${defaultDeck.id}" ${isSelected ? 'selected' : ''}>${defaultDeck.name}</option>`;
        }
        
        // Luego los mazos del jugador
        playerDecks.forEach(deck => {
            const isSelected = selectedDeckId === deck.id;
            optionsHTML += `<option value="${deck.id}" ${isSelected ? 'selected' : ''}>${deck.name}</option>`;
        });
        
        // Si no hay mazos guardados, mostrar solo el predeterminado
        if (playerDecks.length === 0 && !defaultDeck) {
            optionsHTML = '<option value="default">Mazo Predeterminado</option>';
        }
        
        return optionsHTML;
    }
    //
    /**
     * Obtiene el nombre del mazo para mostrar en la UI
     * @param {string} deckId - ID del mazo
     * @returns {string} Nombre del mazo o mensaje por defecto
     */
    getDeckDisplayName(deckId) {
        if (!deckId) {
            return 'Sin seleccionar';
        }
        
        if (!this.game || !this.game.deckManager) {
            return 'Mazo Predeterminado';
        }
        
        const deck = this.game.deckManager.getDeck(deckId);
        return deck ? deck.name : 'Mazo desconocido';
    }
    
    /**
     * Configurar event listeners para los selects de raza
     */
    setupRaceSelectListeners() {
        const playersList = document.getElementById('players-list');
        if (!playersList) return;
        
        // Buscar todos los selects de raza
        const raceSelects = playersList.querySelectorAll('select[id^="race-select-"]');
        
        raceSelects.forEach(select => {
            // Remover listeners anteriores para evitar duplicados
            select.removeEventListener('change', this.handleRaceSelect);
            
            // 🆕 NUEVO: Si el selector ya tiene un valor seleccionado (mazo predeterminado o mazo guardado),
            // enviarlo automáticamente al servidor
            if (select.value) {
                // Verificar si el jugador ya tiene este mazo seleccionado en el servidor
                // usando los datos del lobby que acabamos de recibir
                const playerId = select.id.replace('race-select-', '');
                const playerData = this.lastLobbyData?.players?.find(p => p.id === playerId);
                
                // Solo enviar si el jugador actual no tiene mazo seleccionado aún en el servidor
                if (playerData && !playerData.selectedRace) {
                    // 🆕 REFACTOR: Solo enviar el deckId, el servidor cargará el mazo desde la BD
                    const deckId = select.value;
                    console.log('📤 [AUTO-SELECT] Enviando deckId al servidor:', deckId);
                    
                    this.clientSender.selectRace(this.roomId, deckId);
                }
            }
            
            // Agregar nuevo listener para cambios futuros
            select.addEventListener('change', (e) => {
                const deckId = e.target.value;
                if (deckId) {
                    // 🎯 NUEVO: Obtener las unidades del mazo seleccionado
                    let deckUnits = null;
                    let benchUnits = null; // 🆕 NUEVO: Banquillo
                    let disciplines = null; // 🆕 NUEVO: Disciplinas
                    
                    if (this.game && this.game.deckManager) {
                        const deck = this.game.deckManager.getDeck(deckId);
                        console.log('🔍 [MANUAL-SELECT] Obteniendo mazo:', deckId, 'Resultado:', deck);
                        if (deck) {
                            deckUnits = deck.units;
                            benchUnits = deck.bench || []; // 🆕 NUEVO: Obtener banquillo
                            disciplines = deck.disciplines || []; // 🆕 NUEVO: Obtener disciplinas
                            console.log('🔍 [MANUAL-SELECT] Disciplinas del mazo:', disciplines);
                        } else if (deckId === 'default') {
                            // Si es el mazo predeterminado, obtenerlo
                            const defaultDeck = this.game.deckManager.getDefaultDeck();
                            console.log('🔍 [MANUAL-SELECT] Usando default deck:', defaultDeck);
                            if (defaultDeck) {
                                deckUnits = defaultDeck.units;
                                benchUnits = defaultDeck.bench || []; // 🆕 NUEVO: Obtener banquillo
                                disciplines = defaultDeck.disciplines || []; // 🆕 NUEVO: Obtener disciplinas
                                console.log('🔍 [MANUAL-SELECT] Disciplinas del default:', disciplines);
                            }
                        }
                    }
                    
                    // Enviar al servidor con las unidades del mazo
                    this.clientSender.selectRace(this.roomId, deckId, deckUnits, benchUnits, disciplines);
                }
            });
        });
    }
    
    /**
     * Obtener datos del jugador actual
     */
    getMyPlayerData() {
        // Buscar en el estado actual del lobby
        const playersList = document.getElementById('players-list');
        if (!playersList) return null;
        
        // Buscar el select del jugador actual
        const mySelect = playersList.querySelector(`select[id^="race-select-"]`);
        if (!mySelect) return null;
        
        // Extraer el ID del jugador del ID del select
        const playerId = mySelect.id.replace('race-select-', '');
        const selectedRace = mySelect.value || null;
        
        return {
            id: playerId,
            selectedRace: selectedRace,
            ready: this.isReady
        };
    }
    
    /**
     * Configurar event listeners de botones del lobby
     */
    setupLobbyButtons() {
        // Botón Ready - El botón muestra la ACCIÓN, no el estado
        const readyBtn = document.getElementById('ready-toggle-btn');
        if (readyBtn) {
            readyBtn.onclick = () => {
                // Verificar que haya seleccionado una nación antes de marcar ready
                if (!this.isReady) {
                    const myPlayer = this.getMyPlayerData();
                    if (!myPlayer || !myPlayer.selectedRace) {
                        alert('Debes seleccionar una nación antes de marcar listo');
                        return;
                    }
                }
                
                this.isReady = !this.isReady;
                this.clientSender.setPlayerReady(this.roomId, this.isReady);
                // El botón muestra lo CONTRARIO de tu estado (la acción que puedes hacer)
                readyBtn.textContent = this.isReady ? 'Cancelar' : 'Marcar Listo';
                readyBtn.className = 'menu-btn primary';
            };
        }
        
        // Chat - Enviar con botón
        const chatSendBtn = document.getElementById('chat-send-btn');
        const chatInput = document.getElementById('chat-input');
        
        if (chatSendBtn && chatInput) {
            chatSendBtn.onclick = () => this.sendChatMessage();
            
            // Enviar con Enter
            chatInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    this.sendChatMessage();
                }
            };
        }
    }
    
    /**
     * Enviar mensaje de chat
     */
    sendChatMessage() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;
        
        const message = chatInput.value.trim();
        if (message === '') return;
        
        this.clientSender.sendLobbyChat(this.roomId, message);
        chatInput.value = '';
    }
    
    /**
     * Añadir mensaje al chat
     */
    addChatMessage(data) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        const time = new Date(data.timestamp).toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Mensajes del sistema tienen estilo diferente
        if (data.playerName === 'Sistema') {
            messageDiv.style.cssText = 'margin-bottom: 8px; color: #888; font-style: italic;';
            messageDiv.innerHTML = `
                <span style="color: #666;">[${time}]</span>
                <span style="color: #aaa;">ℹ️ ${data.message}</span>
            `;
        } else {
            messageDiv.style.cssText = 'margin-bottom: 8px; color: #ccc;';
            messageDiv.innerHTML = `
                <span style="color: #4ecca3;">[${time}]</span>
                <span style="color: white; font-weight: bold;">${data.playerName}:</span>
                <span style="color: #ddd;">${data.message}</span>
            `;
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll
    }
    
    /**
     * Expulsar jugador (solo host)
     */
    kickPlayer(targetPlayerId) {
        if (this.myTeam !== 'player1') {
            return;
        }
        
        if (confirm('¿Expulsar a este jugador?')) {
            this.clientSender.kickPlayer(this.roomId, targetPlayerId);
        }
    }
    
    /**
     * Salir de la sala
     */
    leaveRoom() {
        // Volver a vista inicial
        const initialView = document.getElementById('lobby-initial-view');
        const roomView = document.getElementById('lobby-room-view');
        
        if (initialView) initialView.style.display = 'block';
        if (roomView) roomView.style.display = 'none';
        
        // Limpiar chat
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) chatMessages.innerHTML = '';
        
        // 🆕 NUEVO: Limpiar completamente el estado de la sala
        this.roomId = null;
        this.myTeam = null;
        this.opponentTeam = null;
        this.isReady = false;
        this.lastLobbyData = null;
        this._startingGame = false;
        
        // 🆕 FIX: Restaurar botón de inicio
        const startBtn = document.getElementById('start-multiplayer-game-btn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = 'Comenzar Partida';
            startBtn.style.display = 'none';
        }
        
        // Notificar al servidor que salimos de la sala (si estamos conectados)
        // El servidor manejará la desconexión automáticamente cuando el socket se desconecte,
        // pero si solo estamos saliendo de la sala sin desconectar, el servidor lo manejará
        // cuando el socket se desconecte o cuando se cree una nueva sala
    }
    
    /**
     * Ocultar lobby
     */
    startGameCountdown() {
        console.log('🎮 Iniciando countdown del juego...');
        
        // CRÍTICO: Detener música del menú principal
        this.game.audio.stopMainTheme();
        
        // CRÍTICO: Reproducir sonido de countdown (voz que dice "1, 2, 3")
        if (this.game.audio.sounds.countdown) {
            this.game.audio.sounds.countdown.currentTime = 0;
            this.game.audio.sounds.countdown.play().catch(e => {});
        }
        
        // CRÍTICO: Reproducir engine + infantry moves LOCALMENTE después de 3s
        // (sin esperar al servidor para evitar gap de silencio)
        setTimeout(() => {
            // Reproducir engine
            if (this.game.audio.sounds.startingEngine) {
                this.game.audio.sounds.startingEngine.currentTime = 0;
                this.game.audio.sounds.startingEngine.play().catch(e => {});
            }
            
            // Reproducir dos infantry move aleatorios con desync de 0.7s
            const variants = ['infantryMove1', 'infantryMove2', 'infantryMove3'];
            const first = variants[Math.floor(Math.random() * variants.length)];
            const second = variants[Math.floor(Math.random() * variants.length)];
            
            if (this.game.audio.sounds[first]) {
                this.game.audio.sounds[first].currentTime = 0;
                this.game.audio.sounds[first].play().catch(e => {});
            }
            
            setTimeout(() => {
                if (this.game.audio.sounds[second]) {
                    this.game.audio.sounds[second].currentTime = 0;
                    this.game.audio.sounds[second].play().catch(e => {});
                }
            }, 700);
            
            // Música de batalla (el servidor también la enviará, pero no importa si se duplica)
            this.game.audio.startBattleMusic();
        }, 3000); // Exactamente 3s después de que empiece countdown
        
        // Pausar el juego inmediatamente
        this.game.paused = true;
        this.game.state = 'countdown';
        
        // Crear overlay de countdown del juego
        this.createGameCountdownOverlay();
        
        // Countdown incremental: 1, 2, 3
        // CRÍTICO: Empezar en 0 para que el PRIMER tick muestre "1" inmediatamente
        let seconds = 0;
        
        // Mostrar "1" inmediatamente (sin esperar 1s)
        this.updateGameCountdownDisplay(1);
        seconds = 1;
        
        const countdownInterval = setInterval(() => {
            seconds++;
            this.updateGameCountdownDisplay(seconds);
            
            if (seconds >= 3) {
                clearInterval(countdownInterval);
                // Mostrar "¡COMIENZA!" por 1 segundo más
                setTimeout(() => {
                    this.startActualGame();
                }, 1000);
            }
        }, 1000);
    }
    
    createGameCountdownOverlay() {
        // Crear overlay de countdown del juego
        const overlay = document.createElement('div');
        overlay.id = 'game-countdown-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 100; /* var(--z-modals) - Countdown es un modal temporal */
            color: white;
            font-size: 72px;
            font-weight: bold;
            font-family: Arial, sans-serif;
        `;
        
        const countdownText = document.createElement('div');
        countdownText.id = 'game-countdown-text';
        countdownText.textContent = ''; // Vacío inicialmente (se actualiza inmediatamente después)
        overlay.appendChild(countdownText);
        
        document.body.appendChild(overlay);
    }
    
    updateGameCountdownDisplay(seconds) {
        const countdownText = document.getElementById('game-countdown-text');
        if (countdownText) {
            if (seconds <= 3) {
                countdownText.textContent = seconds;
            } else {
                countdownText.textContent = '¡COMIENZA!';
            }
        }
    }
    
    startActualGame() {
        
        // 🔍 MONITOREO: Activar detección de lag después de 10 segundos del inicio
        setTimeout(() => {
            this._lagDetectionEnabled = true;
            this._lastFrameTime = Date.now();
            console.log('🔍 Detección de lag activada');
        }, 10000);
        
        // CRÍTICO: Detener cualquier sonido del countdown que siga sonando
        if (this.game.audio.sounds.countdown) {
            this.game.audio.sounds.countdown.pause();
            this.game.audio.sounds.countdown.currentTime = 0;
        }
        
        // Remover overlay de countdown
        const overlay = document.getElementById('game-countdown-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        // 🆕 FIX: Ocultar todas las pantallas antes de iniciar
        if (this.game.screenManager) {
            this.game.screenManager.hideAll();
        }
        
        // 🆕 FIX: Reanudar el canvas para que se renderice el juego
        if (this.game.canvasManager) {
            this.game.canvasManager.resume();
        }
        
        // Despausar el juego
        this.game.paused = false;
        this.game.setGameState('playing');
        
    }

    hideLobby() {
        
        // Ocultar todos los overlays usando OverlayManager
        this.game.overlayManager.hideAllOverlays();
        
        // CRÍTICO: Ocultar el botón de overlay "Comenzar" y TODOS los botones de overlay
        const startTimerBtn = document.getElementById('start-timer-btn');
        if (startTimerBtn) {
            startTimerBtn.style.display = 'none';
            startTimerBtn.style.visibility = 'hidden';
            startTimerBtn.style.opacity = '0';
            startTimerBtn.style.pointerEvents = 'none';
            // Ocultar botón completamente
            startTimerBtn.style.zIndex = '-1';
            console.log('  ✓ start-timer-btn FORZADO a oculto');
        }
        
        // Ocultar cualquier botón de overlay del juego
        const overlayButtons = document.querySelectorAll('.game-start-overlay-btn');
        overlayButtons.forEach(btn => {
            btn.style.display = 'none';
            btn.style.visibility = 'hidden';
            btn.style.opacity = '0';
        });
        
        // 🆕 SIMPLIFICADO: Solo ocultar overlay del tutorial si existe
        // El tutorial nuevo es simple: solo tiene un overlay con id 'tutorial-overlay'
        // No necesita limpieza compleja como el tutorial antiguo
        const tutorialOverlay = document.getElementById('tutorial-overlay');
        if (tutorialOverlay) {
            tutorialOverlay.style.display = 'none';
        }
        
        // Asegurar que el tutorialManager sepa que está inactivo
        if (this.game.tutorialManager) {
            this.game.tutorialManager.active = false;
        }
        
        console.log('✅ Tutorial oculto (si estaba activo)');
        
        // 🆕 FIX: Asegurar que todos los overlays del menú estén ocultos
        // Esto es crítico para que el canvas sea visible
        const overlaysToHide = [
            'main-menu-overlay',
            'multiplayer-lobby-overlay',
            'press-to-continue-screen',
            'tutorial-overlay'
        ];
        
        overlaysToHide.forEach(overlayId => {
            const overlay = document.getElementById(overlayId);
            if (overlay) {
                overlay.classList.add('hidden');
                overlay.style.display = 'none';
            }
        });
        
        // Asegurar que el canvas esté visible y en primer plano
        const gameCanvas = document.getElementById('game-canvas');
        if (gameCanvas) {
            gameCanvas.style.display = 'block';
            gameCanvas.style.visibility = 'visible';
            gameCanvas.style.opacity = '1';
            gameCanvas.style.zIndex = '1';
            gameCanvas.style.position = 'relative';
            gameCanvas.style.pointerEvents = 'auto';
        }
        
        // Asegurar que el contenedor del juego esté visible
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.style.display = 'block';
            gameContainer.style.visibility = 'visible';
        }
        
        const mainGame = document.getElementById('main-game');
        if (mainGame) {
            mainGame.style.display = 'block';
            mainGame.style.visibility = 'visible';
        }
        
        // Verificar TODOS los elementos que podrían estar tapando
        const allElements = document.querySelectorAll('*');
        let elementsOnTop = 0;
        // Verificar elementos con z-index alto (usando var(--z-modals) = 100 como referencia)
        allElements.forEach(el => {
            const zIndex = parseInt(window.getComputedStyle(el).zIndex);
            if (zIndex >= 100 && el.style.display !== 'none') { // Modales y superiores
                elementsOnTop++;
            }
        });
        
        // Ocultar slider de cámara inicialmente
        this.game.ui.hideElement('camera-slider-container');
        
        // 🆕 ELIMINADO: Los elementos timer-display y fob-currency-display fueron eliminados del HTML
        // El HUD ahora se renderiza completamente desde el canvas
        
        // Forzar actualización inmediata del HUD
        setTimeout(() => {
            this.game.ui.updateHUD(this.game.getGameState());
        }, 100);
    }
    
    /**
     * Mostrar lista de salas
     */
    displayRoomsList(rooms) {
        console.log('📋 Salas disponibles:', rooms);
        // TODO: Crear UI de lista de salas
    }
    
    /**
     * Manejar fin de partida
     */
    handleGameOver(data) {
        
        // Detener el juego
        this.game.paused = true;
        this.game.state = 'finished';
        
        // Determinar si gané o perdí
        const isWinner = data.winner === this.game.myTeam;
        const reasonText = this.getReasonText(data.reason, isWinner);
        
        // Mostrar pantalla de victoria/derrota
        this.showGameOverScreen(isWinner, reasonText, data.stats);
    }
    
    /**
     * Obtener texto descriptivo de la razón de victoria
     */
    getReasonText(reason, isWinner) {
        const winReasons = {
            'enemy_front_pushed': 'Empujaste al enemigo hasta su línea de derrota'
        };
        
        const loseReasons = {
            'enemy_front_pushed': 'El enemigo te empujó hasta tu línea de derrota'
        };
        
        const reasons = isWinner ? winReasons : loseReasons;
        return reasons[reason] || (isWinner ? 'Victoria' : 'Derrota');
    }
    
    /**
     * Mostrar pantalla de victoria/derrota mejorada con pestañas
     */
    showGameOverScreen(isWinner, reasonText, stats) {
        // AUDIO: Detener música de batalla solo si gané
        if (isWinner) {
            this.game.audio.stopBattleMusic();
            this.game.audio.playVictoryMarch();
        }
        
        // Datos calculados
        const myTeam = this.game.myTeam;
        const oppTeam = myTeam === 'player1' ? 'player2' : 'player1';
        const myStats = stats?.[myTeam] || {};
        const oppStats = stats?.[oppTeam] || {};
        const duration = stats?.duration || 0;
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Calcular estadísticas derivadas
        const myGoldPerMin = duration > 0 ? Math.round((myStats.totalCurrency || 0) / (duration / 60)) : 0;
        const oppGoldPerMin = duration > 0 ? Math.round((oppStats.totalCurrency || 0) / (duration / 60)) : 0;
        
        // Estadísticas del cliente
        const clientStats = this.game.matchStats || {};
        
        // Colores
        const winColor = '#4ecca3';
        const loseColor = '#e74c3c';
        const mainColor = isWinner ? winColor : loseColor;
        
        // Crear overlay con layout fijo
        const overlay = document.createElement('div');
        overlay.id = 'game-over-overlay';
        overlay.className = 'overlay';
        overlay.style.cssText = `
            display: flex;
            background: rgba(0, 0, 0, 0.95);
            justify-content: center;
            align-items: center;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            overflow: hidden;
        `;
        
        // Contenedor principal con tamaño fijo
        const container = document.createElement('div');
        container.className = 'main-menu-container';
        container.style.cssText = `
            width: 700px;
            max-width: 90vw;
            max-height: 90vh;
            box-sizing: border-box;
        `;
        
        // Header con título y razón
        container.innerHTML = `
            <div class="menu-header">
                <h1 class="menu-title" style="color: ${mainColor}; text-shadow: 0 0 20px ${mainColor}; font-size: 36px;">
                    ${isWinner ? 'VICTORIA' : 'DERROTA'}
                </h1>
                <div style="color: #888; font-size: 14px; margin-top: 8px;">${reasonText}</div>
            </div>
            
            <!-- Pestañas -->
            <div id="stats-tabs" style="display: flex; gap: 10px; margin: 20px 0; justify-content: center;">
                <button class="stats-tab active" data-tab="resumen" style="
                    padding: 10px 30px;
                    background: ${mainColor};
                    border: none;
                    border-radius: 5px;
                    color: #000;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 14px;
                ">Resumen</button>
                <button class="stats-tab" data-tab="graficos" style="
                    padding: 10px 30px;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid ${mainColor};
                    border-radius: 5px;
                    color: ${mainColor};
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 14px;
                ">Gráficos</button>
            </div>
            
            <!-- Contenido de pestañas -->
            <div id="stats-content" style="
                background: rgba(0, 0, 0, 0.7);
                border-radius: 8px;
                padding: 25px;
                box-sizing: border-box;
            ">
                <!-- Pestaña Resumen -->
                <div id="tab-resumen" class="tab-content">
                    <div style="text-align: center; margin-bottom: 25px;">
                        <div style="font-size: 28px; font-weight: bold; color: #fff;">${durationStr}</div>
                        <div style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Duración</div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
                        <!-- Mi rendimiento -->
                        <div style="background: rgba(78, 204, 163, 0.08); padding: 18px; border-radius: 6px; border-left: 3px solid ${winColor};">
                            <h3 style="color: ${winColor}; margin: 0 0 14px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Tu rendimiento</h3>
                            <div style="display: flex; flex-direction: column; gap: 10px; color: #fff; font-size: 13px;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: #888;">Oro generado</span>
                                    <span style="font-weight: bold; color: #4ecca3;">${myStats.totalCurrency || 0}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: #888;">Oro gastado</span>
                                    <span style="font-weight: bold; color: #e74c3c;">${myStats.currencySpent || 0}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: #888;">Oro/min</span>
                                    <span style="font-weight: bold;">${myGoldPerMin}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: #888;">Camiones</span>
                                    <span style="font-weight: bold;">${myStats.trucksDispatched?.total || 0}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: #888;">Edificios</span>
                                    <span style="font-weight: bold;">${myStats.buildings || 0}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Enemigo -->
                        <div style="background: rgba(231, 76, 60, 0.08); padding: 18px; border-radius: 6px; border-left: 3px solid ${loseColor};">
                            <h3 style="color: ${loseColor}; margin: 0 0 14px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Enemigo</h3>
                            <div style="display: flex; flex-direction: column; gap: 10px; color: #fff; font-size: 13px;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: #888;">Oro generado</span>
                                    <span style="font-weight: bold; color: #4ecca3;">${oppStats.totalCurrency || 0}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: #888;">Oro gastado</span>
                                    <span style="font-weight: bold; color: #e74c3c;">${oppStats.currencySpent || 0}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: #888;">Oro/min</span>
                                    <span style="font-weight: bold;">${oppGoldPerMin}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: #888;">Camiones</span>
                                    <span style="font-weight: bold;">${oppStats.trucksDispatched?.total || 0}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: #888;">Edificios</span>
                                    <span style="font-weight: bold;">${oppStats.buildings || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Pestaña Gráficos -->
                <div id="tab-graficos" class="tab-content" style="display: none;">
                    <div style="text-align: center; margin-bottom: 15px;">
                        <div style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Evolución de la partida</div>
                    </div>
                    
                    <!-- Gráfico de Oro Generado -->
                    <div style="background: rgba(255, 255, 255, 0.03); padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                        <div style="color: #888; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Oro generado acumulado</div>
                        <canvas id="chart-currency" width="620" height="140" style="width: 100%; background: rgba(0,0,0,0.2); border-radius: 4px;"></canvas>
                        <div style="display: flex; justify-content: center; gap: 25px; margin-top: 8px; font-size: 11px; color: #666;">
                            <div><span style="color: ${winColor};">■</span> Tú (${myStats.totalCurrency || 0})</div>
                            <div><span style="color: ${loseColor};">■</span> Enemigo (${oppStats.totalCurrency || 0})</div>
                        </div>
                    </div>
                    
                    <!-- Gráfico de Camiones -->
                    <div style="background: rgba(255, 255, 255, 0.03); padding: 15px; border-radius: 6px;">
                        <div style="color: #888; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Camiones enviados acumulados</div>
                        <canvas id="chart-trucks" width="620" height="140" style="width: 100%; background: rgba(0,0,0,0.2); border-radius: 4px;"></canvas>
                        <div style="display: flex; justify-content: center; gap: 25px; margin-top: 8px; font-size: 11px; color: #666;">
                            <div><span style="color: ${winColor};">■</span> Tú (${myStats.trucksDispatched?.total || 0})</div>
                            <div><span style="color: ${loseColor};">■</span> Enemigo (${oppStats.trucksDispatched?.total || 0})</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Botón volver -->
            <div style="margin-top: 25px; display: flex; justify-content: center;">
                <button id="game-over-menu-btn" style="
                    width: 100%;
                    max-width: 300px;
                    padding: 16px 32px;
                    font-size: 18px;
                    font-weight: 600;
                    color: #fff;
                    background: rgba(78, 204, 163, 0.2);
                    border: 2px solid ${mainColor};
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                ">
                    Volver al Menú
                </button>
            </div>
        `;
        
        overlay.appendChild(container);
        document.body.appendChild(overlay);
        
        // Función para dibujar gráfico de líneas
        const drawLineChart = (canvasId, history, dataKey, myTeam) => {
            const canvas = overlay.querySelector(`#${canvasId}`);
            if (!canvas || !history || history.length < 2) {
                console.warn(`⚠️ [drawLineChart] No se puede dibujar: canvas=${!!canvas}, history length=${history?.length || 0}`);
                return;
            }
            
            console.log(`📊 [drawLineChart] Dibujando ${dataKey}:`, {
                puntos: history.length,
                primerTiempo: history[0]?.time,
                ultimoTiempo: history[history.length - 1]?.time,
                primeraData: history[0]
            });
            
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            const padding = { top: 20, right: 20, bottom: 30, left: 50 };
            const chartWidth = width - padding.left - padding.right;
            const chartHeight = height - padding.top - padding.bottom;
            
            // Limpiar canvas
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(0, 0, width, height);
            
            // Obtener datos
            const oppTeam = myTeam === 'player1' ? 'player2' : 'player1';
            const myData = history.map(h => h[myTeam]?.[dataKey] || 0);
            const oppData = history.map(h => h[oppTeam]?.[dataKey] || 0);
            const times = history.map(h => h.time || 0);
            
            console.log(`📊 [drawLineChart] Datos extraídos:`, {
                myTeam,
                oppTeam,
                myData: myData.slice(0, 3),
                oppData: oppData.slice(0, 3),
                times: times.slice(0, 3)
            });
            
            // Calcular escala
            const maxValue = Math.max(...myData, ...oppData, 1);
            const minTime = times[0] || 0;
            const maxTime = times[times.length - 1] || 1;
            
            // Dibujar grid
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = padding.top + (chartHeight * i / 4);
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(width - padding.right, y);
                ctx.stroke();
            }
            
            // Dibujar ejes
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.moveTo(padding.left, padding.top);
            ctx.lineTo(padding.left, height - padding.bottom);
            ctx.lineTo(width - padding.right, height - padding.bottom);
            ctx.stroke();
            
            // Etiquetas del eje Y
            ctx.fillStyle = '#888';
            ctx.font = '10px Arial';
            ctx.textAlign = 'right';
            for (let i = 0; i <= 4; i++) {
                const value = Math.round(maxValue * (4 - i) / 4);
                const y = padding.top + (chartHeight * i / 4);
                ctx.fillText(value.toString(), padding.left - 5, y + 3);
            }
            
            // Etiquetas del eje X (tiempo)
            ctx.textAlign = 'center';
            const timeLabels = [times[0], times[Math.floor(times.length/2)], times[times.length-1]];
            timeLabels.forEach((t, i) => {
                const x = padding.left + (chartWidth * i / 2);
                const mins = Math.floor(t / 60);
                const secs = t % 60;
                ctx.fillText(mins + ':' + secs.toString().padStart(2, '0'), x, height - 10);
            });
            
            // Función para dibujar línea
            const drawLine = (data, color) => {
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                data.forEach((value, i) => {
                    const x = padding.left + (chartWidth * i / (data.length - 1));
                    const y = padding.top + chartHeight - (chartHeight * value / maxValue);
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.stroke();
                
                // Puntos
                ctx.fillStyle = color;
                data.forEach((value, i) => {
                    const x = padding.left + (chartWidth * i / (data.length - 1));
                    const y = padding.top + chartHeight - (chartHeight * value / maxValue);
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, Math.PI * 2);
                    ctx.fill();
                });
            };
            
            // Dibujar líneas
            drawLine(myData, '#4ecca3');
            drawLine(oppData, '#e74c3c');
        };
        
        // Lógica de pestañas
        const tabs = overlay.querySelectorAll('.stats-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                
                // Actualizar estado de pestañas
                tabs.forEach(t => {
                    t.classList.remove('active');
                    t.style.background = 'rgba(255,255,255,0.1)';
                    t.style.color = mainColor;
                });
                tab.classList.add('active');
                tab.style.background = mainColor;
                tab.style.color = '#000';
                
                // Mostrar/ocultar contenido
                overlay.querySelectorAll('.tab-content').forEach(content => {
                    content.style.display = 'none';
                });
                overlay.querySelector(`#tab-${tabId}`).style.display = 'block';
                
                // Dibujar gráficos cuando se selecciona la pestaña
                if (tabId === 'graficos' && stats?.history) {
                    setTimeout(() => {
                        drawLineChart('chart-currency', stats.history, 'currency', myTeam);
                        drawLineChart('chart-trucks', stats.history, 'trucks', myTeam);
                    }, 50);
                }
            });
        });
        
        // Botón volver al menú
        const menuBtn = overlay.querySelector('#game-over-menu-btn');
        menuBtn.onclick = () => {
            this.game.audio.stopVictoryMarch();
            this.game.audio.stopBattleMusic();
            this.disconnect();
            window.location.reload();
        };
        
        // Efectos hover para el botón
        menuBtn.addEventListener('mouseenter', () => {
            menuBtn.style.background = 'rgba(78, 204, 163, 0.4)';
            menuBtn.style.transform = 'translateY(-2px)';
            menuBtn.style.boxShadow = `0 4px 12px rgba(${isWinner ? '78, 204, 163' : '231, 76, 60'}, 0.3)`;
        });
        
        menuBtn.addEventListener('mouseleave', () => {
            menuBtn.style.background = 'rgba(78, 204, 163, 0.2)';
            menuBtn.style.transform = 'translateY(0)';
            menuBtn.style.boxShadow = 'none';
        });
        
        menuBtn.addEventListener('mousedown', () => {
            menuBtn.style.transform = 'translateY(0)';
        });
    }
    
    /**
     * Actualiza el ping periódicamente (llamado desde Game.update)
     */
    update(dt) {
        if (!this.connected || !this.socket) return;
        
        // Enviar ping cada 5 segundos
        this.pingUpdateInterval += dt;
        if (this.pingUpdateInterval >= 5.0) {
            this.pingUpdateInterval = 0;
            this.clientSender.sendPing(Date.now());
        }
        
        // 🔍 MONITOREO: Detectar freezes/lag (solo después de activar)
        if (this._lagDetectionEnabled) {
            const now = Date.now();
            const frameTime = now - this._lastFrameTime;
            // Si un frame tardó más de 500ms, es un freeze significativo
            if (frameTime > 500) {
                console.warn(`⚠️ [LAG DETECTED] Frame tardó ${frameTime}ms (dt=${dt.toFixed(3)}s) en gameTime ~${this.gameStateSync?.lastGameState?.gameTime?.toFixed(1) || '?'}s`);
            }
            this._lastFrameTime = now;
        }
    }
    
    /**
     * Obtiene el ping actual en ms
     */
    getPing() {
        return this.ping;
    }

    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Actualiza configuración local con valores del servidor
     */
    updateLocalBuildingConfig(serverConfig) {
        // 🆕 NUEVO: Actualizar serverBuildingConfig del juego con la configuración completa del servidor
        if (this.game && serverConfig) {
            this.game.serverBuildingConfig = {
                ...this.game.serverBuildingConfig,
                ...serverConfig // Sobrescribir con valores del servidor
            };
        }
        
        // Importar configuración local para modificarla
        import('../config/nodes.js').then(module => {
            const { NODE_CONFIG } = module;
            
            // Actualizar costos con valores del servidor
            if (serverConfig.costs) {
                Object.keys(serverConfig.costs).forEach(buildingType => {
                    if (NODE_CONFIG[buildingType]) {
                        NODE_CONFIG[buildingType].cost = serverConfig.costs[buildingType];
                    }
                });
            }
            
            // Actualizar tiempos de construcción con valores del servidor
            if (serverConfig.buildTimes) {
                Object.keys(serverConfig.buildTimes).forEach(buildingType => {
                    if (NODE_CONFIG[buildingType]) {
                        NODE_CONFIG[buildingType].constructionTime = serverConfig.buildTimes[buildingType];
                    }
                });
            }
            
            // 🆕 SERVIDOR COMO AUTORIDAD: Actualizar descripciones con valores del servidor
            if (serverConfig.descriptions) {
                Object.keys(serverConfig.descriptions).forEach(buildingType => {
                    if (NODE_CONFIG[buildingType]) {
                        NODE_CONFIG[buildingType].name = serverConfig.descriptions[buildingType].name;
                        NODE_CONFIG[buildingType].description = serverConfig.descriptions[buildingType].description;
                        // 🆕 NUEVO: Incluir details si está disponible
                        if (serverConfig.descriptions[buildingType].details) {
                            NODE_CONFIG[buildingType].details = serverConfig.descriptions[buildingType].details;
                        }
                    }
                });
            }
            
            // 🆕 SERVIDOR COMO AUTORIDAD: Actualizar capacidades con valores del servidor
            if (serverConfig.capacities) {
                Object.keys(serverConfig.capacities).forEach(nodeType => {
                    if (NODE_CONFIG[nodeType]) {
                        const capacities = serverConfig.capacities[nodeType];
                        Object.keys(capacities).forEach(capacityKey => {
                            NODE_CONFIG[nodeType][capacityKey] = capacities[capacityKey];
                        });
                    }
                });
            }
            
            // 🆕 SERVIDOR COMO AUTORIDAD: Actualizar bonuses de edificios
            if (serverConfig.bonuses) {
                Object.keys(serverConfig.bonuses).forEach(nodeType => {
                    if (NODE_CONFIG[nodeType]) {
                        const bonuses = serverConfig.bonuses[nodeType];
                        Object.keys(bonuses).forEach(bonusKey => {
                            NODE_CONFIG[nodeType][bonusKey] = bonuses[bonusKey];
                        });
                    }
                });
            }
            
            // 🆕 SERVIDOR COMO AUTORIDAD: Actualizar propiedades de gameplay con valores del servidor
            if (serverConfig.gameplay) {
                Object.keys(serverConfig.gameplay).forEach(nodeType => {
                    if (NODE_CONFIG[nodeType]) {
                        const gameplay = serverConfig.gameplay[nodeType];
                        Object.keys(gameplay).forEach(gameplayKey => {
                            NODE_CONFIG[nodeType][gameplayKey] = gameplay[gameplayKey];
                        });
                    }
                });
            }
            
            // 🆕 SERVIDOR COMO AUTORIDAD: Actualizar radios de construcción (proximidad)
            if (serverConfig.buildRadii) {
                Object.keys(serverConfig.buildRadii).forEach(nodeType => {
                    if (NODE_CONFIG[nodeType]) {
                        NODE_CONFIG[nodeType].buildRadius = serverConfig.buildRadii[nodeType];
                    }
                });
            }
            
            // 🆕 SERVIDOR COMO AUTORIDAD: Actualizar radios de detección (CRÍTICO PARA SEGURIDAD)
            if (serverConfig.detectionRadii) {
                Object.keys(serverConfig.detectionRadii).forEach(nodeType => {
                    if (NODE_CONFIG[nodeType]) {
                        NODE_CONFIG[nodeType].detectionRadius = serverConfig.detectionRadii[nodeType];
                    }
                });
            }
            
            // 🆕 SERVIDOR COMO AUTORIDAD: Actualizar propiedades de seguridad (ANTI-HACK)
            if (serverConfig.security) {
                // ✅ Actualizar needsConstruction (solo los que están definidos, el resto usa true por defecto)
                if (serverConfig.security.needsConstruction) {
                    Object.keys(serverConfig.security.needsConstruction).forEach(nodeType => {
                        if (NODE_CONFIG[nodeType]) {
                            NODE_CONFIG[nodeType].needsConstruction = serverConfig.security.needsConstruction[nodeType];
                        }
                    });
                    // Los nodos que no están en la lista usan true por defecto (ya está en el código de visualNode)
                }
                
                // Actualizar canBeDestroyed
                if (serverConfig.security.canBeDestroyed) {
                    Object.keys(serverConfig.security.canBeDestroyed).forEach(nodeType => {
                        if (NODE_CONFIG[nodeType]) {
                            NODE_CONFIG[nodeType].canBeDestroyed = serverConfig.security.canBeDestroyed[nodeType];
                        }
                    });
                }
            }
            
            // 🆕 SERVIDOR COMO AUTORIDAD: Actualizar propiedades de comportamiento críticas
            if (serverConfig.behavior) {
                // Actualizar enabled
                if (serverConfig.behavior.enabled) {
                    Object.keys(serverConfig.behavior.enabled).forEach(nodeType => {
                        if (NODE_CONFIG[nodeType]) {
                            NODE_CONFIG[nodeType].enabled = serverConfig.behavior.enabled[nodeType];
                        }
                    });
                }
                
                // Actualizar propiedades de comportamiento específicas
                if (serverConfig.behavior.behavior) {
                    Object.keys(serverConfig.behavior.behavior).forEach(nodeType => {
                        if (NODE_CONFIG[nodeType]) {
                            const behaviorProps = serverConfig.behavior.behavior[nodeType];
                            Object.keys(behaviorProps).forEach(propKey => {
                                NODE_CONFIG[nodeType][propKey] = behaviorProps[propKey];
                            });
                        }
                    });
                }
            }
            
            console.log('✅ Configuración local actualizada con valores del servidor');
        }).catch(error => {
            console.error('❌ Error actualizando configuración local:', error);
        });
    }
    
    /**
     * Desconectar del servidor
     */
    disconnect() {
        // 🆕 NUEVO: Limpiar completamente el estado antes de desconectar
        // Esto evita que al crear una nueva sala se reconecte a la anterior
        
        // 🆕 FIX: Asegurar que el tutorial esté cerrado
        if (this.game.tutorialManager && this.game.tutorialManager.active) {
            const tutorialOverlay = document.getElementById('tutorial-overlay');
            if (tutorialOverlay) {
                tutorialOverlay.style.display = 'none';
            }
            this.game.tutorialManager.active = false;
        }
        
        // Salir de la sala actual si existe
        if (this.roomId) {
            this.leaveRoom();
        }
        
        // Limpiar estado de conexión
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        // Limpiar completamente el estado
        this.connected = false;
        this.roomId = null;
        this.myTeam = null;
        this.opponentTeam = null;
        this.isReady = false;
        this.isMultiplayer = false;
        this.lastLobbyData = null;
        this._startingGame = false;
        
        // 🆕 FIX: Restaurar botón de inicio
        const startBtn = document.getElementById('start-multiplayer-game-btn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = 'Comenzar Partida';
            startBtn.style.display = 'none';
        }
        
        // Limpiar UI del lobby
        const initialView = document.getElementById('lobby-initial-view');
        const roomView = document.getElementById('lobby-room-view');
        if (initialView) initialView.style.display = 'block';
        if (roomView) roomView.style.display = 'none';
        
        // Limpiar chat
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) chatMessages.innerHTML = '';
        
        console.log('🔌 Desconectado y estado limpiado completamente');
    }
}



