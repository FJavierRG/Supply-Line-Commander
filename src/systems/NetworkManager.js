// ===== GESTOR DE RED - Cliente Socket.IO =====
import { BackgroundTileSystem } from './BackgroundTileSystem.js';
import { Convoy } from '../entities/Convoy.js';

export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.connected = false;
        this.roomId = null;
        this.myTeam = null;
        this.opponentTeam = null;
        
        // Auto-detectar URL del servidor
        // Si se accede vía ngrok/producción, usar la misma URL
        // Si es localhost, usar localhost:3000
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname === '';
        
        if (isLocalhost) {
        this.serverUrl = 'http://localhost:3000';
        } else {
            // Usar el mismo servidor desde donde se cargó la página
            this.serverUrl = window.location.origin;
        }
        
        console.log('🌐 Server URL detectada:', this.serverUrl);
        this.isMultiplayer = false;
    }
    
    /**
     * Conectar al servidor
     */
    connect() {
        return new Promise((resolve, reject) => {
            // Cargar Socket.IO client desde CDN
            if (typeof io === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdn.socket.io/4.6.1/socket.io.min.js';
                script.onload = () => {
                    this.initializeSocket();
                    resolve();
                };
                script.onerror = () => reject(new Error('No se pudo cargar Socket.IO'));
                document.head.appendChild(script);
            } else {
                this.initializeSocket();
                resolve();
            }
        });
    }
    
    /**
     * Inicializar socket y eventos
     */
    initializeSocket() {
        this.socket = io(this.serverUrl);
        
        this.socket.on('connect', () => {
            console.log('✅ Conectado al servidor:', this.socket.id);
            this.connected = true;
        });
        
        this.socket.on('disconnect', () => {
            console.log('❌ Desconectado del servidor');
            this.connected = false;
        });
        
        // === EVENTOS DE LOBBY ===
        
        this.socket.on('room_created', (data) => {
            console.log('🎮 Sala creada:', data.roomId);
            this.roomId = data.roomId;
            this.myTeam = 'player1';
            this.game.myTeam = 'player1';
            this.showRoomView(data.roomId);
        });
        
        this.socket.on('room_joined', (data) => {
            console.log('🎮 Unido a sala:', data.roomId);
            this.roomId = data.roomId;
            this.myTeam = 'player2';
            this.game.myTeam = 'player2';
            this.showRoomView(data.roomId);
        });
        
        this.socket.on('opponent_joined', (data) => {
            console.log('👥 Oponente se unió:', data.opponentName);
            // La actualización del lobby se maneja en lobby_update
        });
        
        this.socket.on('room_ready', (data) => {
            console.log('✅ Sala lista con 2 jugadores:', data.players);
            // La UI se actualiza con lobby_update
        });
        
        this.socket.on('lobby_update', (data) => {
            console.log('🔄 Actualización del lobby:', data);
            this.updateLobbyUI(data);
        });
        
        this.socket.on('kicked_from_room', (data) => {
            console.log('🚫 Expulsado de la sala');
            alert('Has sido expulsado de la sala por el host');
            this.leaveRoom();
        });
        
        this.socket.on('lobby_chat_message', (data) => {
            console.log('💬 Chat:', data);
            this.addChatMessage(data);
        });
        
        this.socket.on('rooms_list', (rooms) => {
            this.displayRoomsList(rooms);
        });
        
        // === EVENTOS DE JUEGO ===
        
        this.socket.on('countdown', (data) => {
            console.log(`⏱️ Countdown: ${data.seconds}`);
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
            console.log('🎮 Partida iniciada! Mi equipo:', data.myTeam);
            this.isMultiplayer = true;
            this.myTeam = data.myTeam;
            this.opponentTeam = data.opponentTeam;
            
            // Asignar team al juego
            this.game.myTeam = this.myTeam;
            
            // CRÍTICO: Desactivar tutorial ANTES de cargar estado
            if (this.game.tutorialManager) {
                this.game.tutorialManager.active = false; // Modificar el flag interno
                this.game.tutorialManager.enabled = false;
                // Forzar estado del juego a NO tutorial
                if (this.game.state === 'tutorial') {
                    this.game.state = 'menu';
                }
                console.log('📚 TutorialManager.active = false');
            }
            if (this.game.tutorialSystem) {
                this.game.tutorialSystem.enabled = false;
                console.log('📚 TutorialSystem desactivado');
            }
            
            // Cargar estado inicial
            this.loadInitialState(data.initialState);
            
            // Ocultar lobby completamente
            this.hideLobby();
            
            // Configurar duración de la misión
            this.game.missionDuration = data.duration;
            this.game.timeLeft = data.duration;
            
            // Iniciar el juego
            this.game.state = 'playing';
            this.game.missionStarted = true;
            this.game.paused = false;
            
            // CRÍTICO: Eliminar elementos del tutorial ANTES de cualquier render
            const removeAllTutorialElements = () => {
                const spotlight = document.getElementById('tutorial-spotlight');
                const textbox = document.getElementById('tutorial-textbox');
                const exitBtn = document.getElementById('tutorial-exit-btn');
                const nextBtn = document.getElementById('tutorial-next-btn');
                const prevBtn = document.getElementById('tutorial-prev-btn');
                
                [spotlight, textbox, exitBtn, nextBtn, prevBtn].forEach(elem => {
                    if (elem && elem.parentNode) {
                        elem.parentNode.removeChild(elem);
                    }
                });
            };
            
            // Ejecutar limpieza inicial
            removeAllTutorialElements();
            
            // Configurar UI
            this.game.ui.setupMissionUI(this.game.nodes);
            
            // Ejecutar limpieza DESPUÉS de setupMissionUI (por si crea algo)
            removeAllTutorialElements();
            
            // CRÍTICO: Forzar inicio del game loop
            this.game.lastTime = Date.now();
            
            // Si el loop no está corriendo, iniciarlo
            if (!this.game._gameLoopRunning) {
                this.game._gameLoopRunning = true;
                this.game.gameLoop();
                console.log('🔄 Game loop iniciado');
            }
            
            // Debug: Verificar estado del juego
            console.log('✅ Juego multijugador iniciado correctamente');
            console.log('📊 Estado:', {
                state: this.game.state,
                nodes: this.game.nodes.length,
                myTeam: this.game.myTeam,
                isMultiplayer: this.game.isMultiplayer,
                worldWidth: this.game.worldWidth,
                worldHeight: this.game.worldHeight,
                backgroundTiles: !!this.game.backgroundTiles
            });
            
            // Verificar que los assets estén cargados
            const assetsLoaded = this.game.assetManager.isReady();
            console.log('🖼️ Assets cargados:', assetsLoaded);
            
            // Verificar cámara
            console.log('📷 Cámara:', {
                offsetX: this.game.camera.offsetX,
                offsetY: this.game.camera.offsetY,
                zoom: this.game.camera.zoom
            });
            
            // Verificar canvas
            const canvas = this.game.canvas;
            console.log('🖼️ Canvas:', {
                width: canvas.width,
                height: canvas.height,
                display: canvas.style.display,
                visibility: canvas.style.visibility,
                zIndex: canvas.style.zIndex
            });
            
            // SOLUCIÓN DEFINITIVA: Crear regla CSS !important para ocultar tutorial
            const style = document.createElement('style');
            style.id = 'multiplayer-tutorial-killer';
            style.innerHTML = `
                #tutorial-spotlight,
                #tutorial-textbox,
                #tutorial-exit-btn,
                #tutorial-next-btn,
                #tutorial-prev-btn,
                .tutorial-spotlight,
                .tutorial-overlay {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                    z-index: -9999 !important;
                }
                
                /* FORZAR VISIBILIDAD DEL CANVAS */
                #game-canvas {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    z-index: 10 !important;
                    position: relative !important;
                    background: #000 !important;
                }
                
                #game-container {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    z-index: 5 !important;
                }
                
                #main-game {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    z-index: 5 !important;
                }
                
                /* FORZAR VISIBILIDAD DEL CURRENCY Y TIMER */
                #fob-currency-display {
                    display: flex !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    z-index: 100 !important;
                    pointer-events: auto !important;
                }
                
                #timer-display {
                    display: flex !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    z-index: 100 !important;
                    pointer-events: auto !important;
                }
            `;
            document.head.appendChild(style);
            console.log('🎨 CSS !important aplicado para ocultar tutorial y mostrar UI del juego');
            
            // Forzar primer render
            this.game.render();
            console.log('🎨 Primer render forzado');
        });
        
        this.socket.on('game_update', (gameState) => {
            // Recibir estado completo del servidor cada tick (20 TPS)
            this.applyGameState(gameState);
        });
        
        this.socket.on('game_over', (data) => {
            console.log('🏆 Partida terminada:', data);
            this.handleGameOver(data);
        });
        
        this.socket.on('building_created', (data) => {
            console.log('🏗️ Edificio creado por servidor:', data.type, 'equipo:', data.team, 'en', data.x, data.y);
            
            // Verificar que no exista ya (evitar duplicados)
            const exists = this.game.nodes.find(n => n.id === data.nodeId);
            if (exists) {
                console.warn(`⚠️ Nodo ${data.nodeId} ya existe, ignorando building_created`);
                return;
            }
            
            // Crear el nodo en el cliente (servidor ya validó y autorizó)
            const newNode = this.game.baseFactory.createBase(
                data.x,
                data.y,
                data.type,
                {
                    team: data.team,
                    isConstructed: false // CRÍTICO: Empieza en construcción
                }
            );
            
            if (newNode) {
                // Sobrescribir ID y estado desde el servidor
                newNode.id = data.nodeId;
                newNode.isConstructing = true;
                newNode.constructed = false;
                newNode.constructionTime = data.constructionTime || 2;
                newNode.constructionTimer = 0;
                
                this.game.nodes.push(newNode);
                
                console.log(`✅ Edificio ${data.type} creado localmente con ID ${data.nodeId} (en construcción)`);
                
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
            fromNode.takeVehicle();
            
            // Crear convoy localmente
            const VEHICLE_TYPES = {
                'truck': {
                    capacity: 15,
                    speed: 50,
                    spritePath: 'vehicles/convoy.png'
                },
                'heavy_truck': {
                    capacity: 25,
                    speed: 40,
                    spritePath: 'vehicles/convoy_heavy.png'
                }
            };
            
            const vehicle = this.game.convoyManager.applyUpgrades(
                VEHICLE_TYPES[data.vehicleType],
                data.vehicleType
            );
            
            const cargo = fromNode.removeSupplies(data.cargo);
            
            // Crear convoy
            const convoy = new Convoy(fromNode, toNode, vehicle, data.vehicleType, cargo);
            convoy.id = data.convoyId; // CRÍTICO: Usar ID del servidor
            
            this.game.convoyManager.convoys.push(convoy);
            
            // Reproducir sonido solo si NO es de mi equipo
            if (data.team !== this.myTeam) {
                this.game.audio.playSound('dispatch');
            }
        });
        
        this.socket.on('ambulance_spawned', (data) => {
            console.log(`🚑 Ambulancia autorizada por servidor: ${data.fromId} → ${data.toId} (emergencia: ${data.targetFrontId})`);
            
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
            const VEHICLE_TYPES = {
                'ambulance': {
                    capacity: 0,
                    speed: 60,
                    spritePath: 'vehicles/ambulance.png'
                }
            };
            
            const vehicle = this.game.convoyManager.applyUpgrades(
                VEHICLE_TYPES['ambulance'],
                'ambulance'
            );
            
            // Crear convoy médico
            const convoy = new Convoy(fromNode, toNode, vehicle, 'ambulance', 0);
            convoy.id = data.convoyId;
            convoy.isMedical = true;
            convoy.targetFrontId = data.targetFrontId;
            
            this.game.convoyManager.convoys.push(convoy);
            
            console.log(`✅ Ambulancia ${data.convoyId} creada localmente`);
            
            // Reproducir sonido solo si NO es de mi equipo
            if (data.team !== this.myTeam) {
                this.game.audio.playSound('dispatch');
            }
        });
        
        /**
         * Manejo de disparo de francotirador
         */
        this.socket.on('sniper_fired', (data) => {
            console.log(`🎯 Sniper disparado por ${data.shooterId} → frente ${data.targetId}`);
            
            // Buscar el frente objetivo
            const targetFront = this.game.nodes.find(n => n.id === data.targetId);
            
            if (targetFront) {
                // Reproducir sonido de disparo
                this.game.audio.sounds.sniperShoot.play();
                
                // Crear sprite flotante de sniper kill feed
                this.game.particleSystem.createFloatingSprite(
                    targetFront.x, 
                    targetFront.y - 40, 
                    'ui-sniper-kill'
                );
                
                console.log(`✅ Efectos visuales de sniper aplicados`);
            } else {
                console.warn(`⚠️ Frente objetivo ${data.targetId} no encontrado`);
            }
        });
        
        /**
         * Manejo de lanzamiento de dron
         */
        this.socket.on('drone_launched', (data) => {
            console.log(`💣 Dron lanzado por ${data.team}: ${data.droneId} → ${data.targetId}`);
            
            // El servidor ya lo tiene en el estado, solo reproducir sonido
            this.game.audio.playDroneSound(data.droneId);
            
            console.log(`✅ Dron ${data.droneId} lanzado - servidor simula trayectoria`);
        });
        
        /**
         * Manejo de impacto de dron
         */
        this.socket.on('drone_impact', (impact) => {
            console.log(`💥 Dron ${impact.droneId} impactó ${impact.targetType} en (${impact.x}, ${impact.y})`);
            
            // Detener sonido del dron
            this.game.audio.stopDroneSound(impact.droneId);
            
            // Reproducir sonido de explosión
            this.game.audio.playExplosionSound();
            
            // Crear explosión grande con partículas grises
            this.game.particleSystem.createExplosion(impact.x, impact.y, '#808080', 40);
            
            // Añadir sprite de explosión animado
            this.game.particleSystem.createExplosionSprite(impact.x, impact.y);
            
            // Crear marca de impacto permanente (cráter grande)
            this.game.particleSystem.createImpactMark(impact.x, impact.y, 'impact_icon', 1.2);
            
            console.log(`✅ Efectos de explosión de dron aplicados`);
        });
        
        /**
         * Manejo de alerta de anti-drone (dron detectado en rango de 220px)
         */
        this.socket.on('antidrone_alert', (alert) => {
            console.log(`🚨 Anti-drone ${alert.antiDroneId} detectó dron ${alert.droneId} (alerta)`);
            
            // Reproducir sonido de ataque anti-drone (alerta)
            this.game.audio.playAntiDroneAttackSound();
        });
        
        /**
         * Manejo de intercepción de dron por anti-drone
         */
        this.socket.on('drone_intercepted', (interception) => {
            console.log(`🎯 Anti-drone ${interception.antiDroneId} interceptó dron ${interception.droneId}`);
            
            // Detener sonido del dron
            this.game.audio.stopDroneSound(interception.droneId);
            
            // Sonido de disparo anti-drone
            this.game.audio.playBomShootSound();
            
            // Crear partículas de explosión del dron en el aire (naranja, más pequeña)
            this.game.particleSystem.createExplosion(
                interception.x, 
                interception.y, 
                '#ff6b35', // Naranja
                8 // Menos partículas que explosión de edificio
            );
            
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
            
            console.log(`✅ Efectos de intercepción aplicados - Dron destruido, anti-drone en fade out`);
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
            console.log('🏆 Partida terminada:', victoryResult);
            
            if (victoryResult.winner === this.game.myTeam) {
                console.log('🎉 ¡VICTORIA!');
                this.game.triggerVictory();
            } else {
                console.log('💀 Derrota');
                this.game.triggerDefeat();
            }
        });
        
        this.socket.on('error', (data) => {
            console.error('⚠️ Error del servidor:', data.message);
            alert(`Error: ${data.message}`);
        });
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
        
        this.socket.emit('create_room', { playerName });
    }
    
    /**
     * Unirse a sala
     */
    joinRoom(roomId, playerName) {
        if (!this.connected) {
            console.error('No conectado al servidor');
            return;
        }
        
        this.socket.emit('join_room', { roomId, playerName });
    }
    
    /**
     * Listar salas disponibles
     */
    getRooms() {
        if (!this.connected) {
            console.error('No conectado al servidor');
            return;
        }
        
        this.socket.emit('get_rooms');
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
        
        console.log('🚀 Solicitando inicio de partida...');
        this.socket.emit('start_game', { roomId: this.roomId });
        
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
        
        this.socket.emit('build_request', {
            roomId: this.roomId,
            buildingType,
            x,
            y
        });
    }
    
    /**
     * Enviar solicitud de convoy
     */
    requestConvoy(fromId, toId) {
        if (!this.isMultiplayer || !this.roomId) return;
        
        this.socket.emit('convoy_request', {
            roomId: this.roomId,
            fromId,
            toId
        });
    }
    
    /**
     * Enviar solicitud de ambulancia
     */
    requestAmbulance(fromId, toId) {
        if (!this.isMultiplayer || !this.roomId) return;
        
        console.log(`🚑 Enviando ambulance_request: ${fromId} → ${toId}`);
        
        this.socket.emit('ambulance_request', {
            roomId: this.roomId,
            fromId,
            toId
        });
    }
    
    /**
     * Solicita disparo de francotirador al servidor
     */
    requestSniper(targetId) {
        if (!this.isMultiplayer || !this.roomId) return;
        
        console.log(`🎯 Enviando sniper_request: target=${targetId}`);
        
        this.socket.emit('sniper_request', {
            roomId: this.roomId,
            targetId
        });
    }
    
    /**
     * Solicita lanzamiento de dron al servidor
     */
    requestDrone(targetId) {
        if (!this.isMultiplayer || !this.roomId) return;
        
        console.log(`💣 Enviando drone_request: target=${targetId}`);
        
        this.socket.emit('drone_request', {
            roomId: this.roomId,
            targetId
        });
    }
    
    /**
     * CHEAT: Añade currency al jugador (solo para testing)
     */
    addCurrency(amount = 500) {
        if (!this.isMultiplayer || !this.roomId) {
            console.log('⚠️ Este comando solo funciona en multijugador');
            return;
        }
        
        this.socket.emit('cheat_add_currency', {
            roomId: this.roomId,
            amount
        });
        
        console.log(`💰 Solicitando +${amount}$ al servidor...`);
    }
    
    // === MANEJO DE ESTADO ===
    
    /**
     * Cargar estado inicial desde servidor
     */
    loadInitialState(initialState) {
        console.log('📦 Cargando estado inicial:', initialState);
        
        // IMPORTANTE: Marcar como multijugador para desactivar IA
        this.game.isMultiplayer = true;
        this.isMultiplayer = true;
        
        // Desactivar IA explícitamente
        if (this.game.enemyAI) {
            this.game.enemyAI.enabled = false;
        }
        if (this.game.aiDirector) {
            this.game.aiDirector.enabled = false;
        }
        
        // Limpiar nodos actuales
        this.game.nodes = [];
        
        // Crear nodos desde datos del servidor
        initialState.nodes.forEach(nodeData => {
            const node = this.game.baseFactory.createBase(
                nodeData.x,
                nodeData.y,
                nodeData.type,
                {
                    team: nodeData.team,
                    isConstructed: false // Ya construidos
                }
            );
            
            // Sobrescribir ID con el del servidor
            node.id = nodeData.id;
            node.supplies = nodeData.supplies;
            node.availableVehicles = nodeData.availableVehicles;
            
            this.game.nodes.push(node);
            
            console.log(`  ✓ Nodo creado: ${nodeData.type} (${nodeData.team}) en (${nodeData.x}, ${nodeData.y})`);
        });
        
        console.log(`✅ ${this.game.nodes.length} nodos cargados`);
        
        // Establecer currency (CRÍTICO: usar missionCurrency, no .currency)
        this.game.currency.missionCurrency = initialState.currency[this.myTeam];
        console.log(`💰 Currency inicial: ${initialState.currency[this.myTeam]}$ para ${this.myTeam}`);
        
        // Configurar mundo
        this.game.worldWidth = initialState.worldWidth;
        this.game.worldHeight = initialState.worldHeight;
        
        // CRÍTICO: Reset y configurar cámara
        this.game.camera.reset();
        this.game.camera.setWorldSize(this.game.worldWidth, this.game.worldHeight);
        console.log('📷 Cámara inicializada:', {
            offsetX: this.game.camera.offsetX,
            offsetY: this.game.camera.offsetY,
            zoom: this.game.camera.zoom
        });
        
        // Generar sistema de tiles del background
        this.game.backgroundTiles = new BackgroundTileSystem(this.game.worldWidth, this.game.worldHeight, 60);
        
        // Inicializar road system (se actualiza automáticamente en update())
        this.game.roadSystem.update();
        
        // Inicializar sistemas dependientes
        this.game.territory.reset();
        this.game.territory.initializeAllyFrontier();
        this.game.territory.initializeEnemyFrontier();
        
        console.log(`✅ Estado inicial cargado. Nodos: ${this.game.nodes.length}`);
    }
    
    /**
     * Aplicar estado completo del servidor (SERVIDOR AUTORITATIVO COMPLETO)
     */
    applyGameState(gameState) {
        if (!gameState) return;
        
        // Guardar el último estado recibido (para reloj, etc.)
        this.lastGameState = gameState;
        
        // === ACTUALIZAR CURRENCY ===
        if (gameState.currency) {
            const oldCurrency = this.game.currency.missionCurrency;
            this.game.currency.missionCurrency = gameState.currency[this.myTeam];
            
            // DEBUG: Log cuando cambia significativamente
            if (!this._lastCurrencyLog || Math.abs(this.game.currency.missionCurrency - this._lastCurrencyLog) >= 10) {
                console.log(`💰 Currency actualizada: ${oldCurrency} → ${this.game.currency.missionCurrency}$`);
                this._lastCurrencyLog = this.game.currency.missionCurrency;
            }
        }
        
        // === ACTUALIZAR NODOS ===
        if (gameState.nodes) {
            gameState.nodes.forEach(nodeData => {
                let node = this.game.nodes.find(n => n.id === nodeData.id);
                
                if (node) {
                    // Actualizar nodo existente
                    
                    // Actualizar posición (frentes se mueven)
                    node.x = nodeData.x;
                    node.y = nodeData.y;
                    
                    // Actualizar suministros
                    node.supplies = nodeData.supplies;
                    node.availableVehicles = nodeData.availableVehicles;
                    
                    // Actualizar estado de construcción
                    const wasConstructing = node.isConstructing;
                    node.constructed = nodeData.constructed;
                    node.isConstructing = nodeData.isConstructing;
                    node.constructionTimer = nodeData.constructionTimer || 0;
                    node.constructionTime = nodeData.constructionTime || 2;
                    
                    // DEBUG: Log progreso de construcción
                    if (node.isConstructing && nodeData.constructionTimer !== undefined) {
                        const progress = (nodeData.constructionTimer / nodeData.constructionTime * 100).toFixed(0);
                        if (!this._lastConstructionLog) this._lastConstructionLog = {};
                        if (!this._lastConstructionLog[node.id] || Date.now() - this._lastConstructionLog[node.id] > 500) {
                            console.log(`🏗️ Construcción ${node.id}: ${progress}% (${nodeData.constructionTimer.toFixed(2)}s/${nodeData.constructionTime}s)`);
                            this._lastConstructionLog[node.id] = Date.now();
                        }
                    }
                    
                    // Log cuando se completa construcción
                    if (wasConstructing && !node.isConstructing && node.constructed) {
                        console.log(`✅ Construcción COMPLETADA: ${node.type} ${node.id}`);
                        
                        // Sonido especial de anti-drone al COMPLETAR construcción (x2 velocidad)
                        if (node.type === 'antiDrone') {
                            const audio = this.game.audio.playSoundInstance(
                                'assets/sounds/normalized/antidrone_spawn_normalized.wav', 
                                this.game.audio.volumes.antiDroneSpawn
                            );
                            audio.playbackRate = 2.0; // Doble velocidad
                            console.log('🔊 Anti-drone spawn sound (x2 velocidad)');
                        }
                    }
                    
                    // Actualizar frentes
                    if (nodeData.consumeRate !== undefined) {
                        node.consumeRate = nodeData.consumeRate;
                    }
                    if (nodeData.maxXReached !== undefined) {
                        node.maxXReached = nodeData.maxXReached;
                    }
                    if (nodeData.minXReached !== undefined) {
                        node.minXReached = nodeData.minXReached;
                    }
                    
                    // Actualizar abandono
                    node.isAbandoning = nodeData.isAbandoning;
                    node.abandonPhase = nodeData.abandonPhase;
                    
                    // Actualizar efectos (wounded, etc.)
                    if (nodeData.effects) {
                        node.effects = nodeData.effects;
                    }
                    
                    // Actualizar propiedades del sistema médico
                    if (nodeData.hasMedicalSystem !== undefined) {
                        node.hasMedicalSystem = nodeData.hasMedicalSystem;
                    }
                    if (nodeData.ambulanceAvailable !== undefined) {
                        node.ambulanceAvailable = nodeData.ambulanceAvailable;
                    }
                    if (nodeData.maxAmbulances !== undefined) {
                        node.maxAmbulances = nodeData.maxAmbulances;
                    }
                } else {
                    // Nodo nuevo del servidor (construcción autorizada)
                    // Ya debería haber sido creado por building_created
                    // Si no existe, es un error
                    console.warn(`⚠️ Nodo ${nodeData.id} del servidor no existe localmente`);
                }
            });
            
            // Eliminar nodos que ya no existen en el servidor (destruidos o abandonados)
            const serverNodeIds = gameState.nodes.map(n => n.id);
            for (let i = this.game.nodes.length - 1; i >= 0; i--) {
                const localNode = this.game.nodes[i];
                // Eliminar cualquier nodo que ya no esté en el servidor
                // (edificios destruidos por drones, abandonados, etc.)
                if (!serverNodeIds.includes(localNode.id)) {
                    console.log(`🗑️ Eliminando nodo local ${localNode.id} ${localNode.type} (ya no existe en servidor)`);
                    this.game.nodes.splice(i, 1);
                }
            }
        }
        
        // === ACTUALIZAR CONVOYES ===
        if (gameState.convoys && gameState.convoys.length > 0) {
            // Sincronizar convoyes: actualizar progress de los existentes
            gameState.convoys.forEach(convoyData => {
                const convoy = this.game.convoyManager.convoys.find(c => c.id === convoyData.id);
                
                if (convoy) {
                    // CRÍTICO: Actualizar progress desde el servidor
                    convoy.progress = convoyData.progress;
                    convoy.returning = convoyData.returning;
                    convoy.isMedical = convoyData.isMedical || false;
                    convoy.targetFrontId = convoyData.targetFrontId || null;
                }
                // Si no existe, será creado por el evento convoy_spawned o ambulance_spawned
            });
            
            // Eliminar convoyes que ya no existen en el servidor
            const serverConvoyIds = gameState.convoys.map(c => c.id);
            for (let i = this.game.convoyManager.convoys.length - 1; i >= 0; i--) {
                if (!serverConvoyIds.includes(this.game.convoyManager.convoys[i].id)) {
                    this.game.convoyManager.convoys.splice(i, 1);
                }
            }
        }
        
        // === ACTUALIZAR DRONES ===
        if (gameState.drones) {
            // Actualizar drones existentes y crear nuevos
            gameState.drones.forEach(droneData => {
                let drone = this.game.droneSystem.drones.find(d => d.id === droneData.id);
                
                if (drone) {
                    // Actualizar posición desde servidor
                    drone.x = droneData.x;
                    drone.y = droneData.y;
                    drone.targetId = droneData.targetId;
                } else {
                    // Dron nuevo del servidor - crear localmente
                    const targetNode = this.game.nodes.find(n => n.id === droneData.targetId);
                    if (targetNode) {
                        const newDrone = {
                            id: droneData.id,
                            x: droneData.x,
                            y: droneData.y,
                            target: targetNode,
                            targetId: droneData.targetId,
                            speed: 300,
                            active: true,
                            isEnemy: (droneData.team !== this.myTeam)
                        };
                        
                        this.game.droneSystem.drones.push(newDrone);
                        console.log(`💣 Dron ${droneData.id} creado desde servidor en (${droneData.x}, ${droneData.y})`);
                    }
                }
            });
            
            // Eliminar drones que ya no existen en el servidor (impactaron)
            const serverDroneIds = gameState.drones.map(d => d.id);
            for (let i = this.game.droneSystem.drones.length - 1; i >= 0; i--) {
                if (!serverDroneIds.includes(this.game.droneSystem.drones[i].id)) {
                    // Detener sonido antes de eliminar
                    this.game.audio.stopDroneSound(this.game.droneSystem.drones[i].id);
                    this.game.droneSystem.drones.splice(i, 1);
                }
            }
        }
        
        // === ACTUALIZAR EMERGENCIAS MÉDICAS ===
        if (gameState.emergencies) {
            // Limpiar emergencias antiguas
            this.game.medicalSystem.activeEmergencies.clear();
            
            // Aplicar emergencias del servidor
            gameState.emergencies.forEach(emergency => {
                if (!emergency.resolved) {
                    this.game.medicalSystem.activeEmergencies.set(emergency.frontId, {
                        frontId: emergency.frontId,
                        startTime: Date.now() - (20000 - emergency.timeLeft), // Recalcular startTime
                        duration: 20000,
                        resolved: false,
                        penalty: false
                    });
                }
            });
        }
        
        // === PROCESAR EVENTOS DE SONIDO ===
        if (gameState.soundEvents && gameState.soundEvents.length > 0) {
            gameState.soundEvents.forEach(event => {
                this.handleSoundEvent(event);
            });
        }
    }
    
    /**
     * Maneja eventos de sonido del servidor
     */
    handleSoundEvent(event) {
        switch(event.type) {
            case 'game_start_sequence':
                // IGNORAR: Ya se reproduce localmente después de 3s (evitar duplicación)
                console.log('🎵 game_start_sequence ignorado (ya reproducido localmente)');
                break;
                
            case 'start_battle_music':
                // IGNORAR: Ya se reproduce localmente (evitar duplicación)
                console.log('🎵 start_battle_music ignorado (ya reproducido localmente)');
                break;
                
            case 'clear_shoots':
                // Ambientes cada 60s
                this.game.audio.playClearShoots();
                break;
                
            case 'random_radio_effect':
                // Radio effect cada 50s
                this.game.audio.playRandomRadioEffect();
                break;
                
            case 'man_down':
                // Emergencia médica generada
                this.game.audio.playManDownSound(event.frontId);
                break;
                
            case 'no_ammo':
                // Frente sin suministros
                this.game.audio.playNoAmmoSound(event.frontId);
                break;
                
            case 'enemy_contact':
                // Primer contacto entre frentes
                this.game.audio.playEnemyContact();
                break;
                
            case 'truck_dispatch':
                // Convoy despachado
                this.game.audio.playTruckSound(); // Tiene cooldown 2s interno
                break;
                
            case 'hq_dispatch':
                // HQ enviando suministros
                this.game.audio.playHQSound(); // Tiene cooldown 3s interno
                break;
        }
    }
    
    // === UI DE LOBBY ===
    
    /**
     * Mostrar pantalla de lobby
     */
    /**
     * Mostrar vista de la sala (lobby mejorado)
     */
    showRoomView(roomId) {
        // Ocultar vista inicial, mostrar vista de sala
        const initialView = document.getElementById('lobby-initial-view');
        const roomView = document.getElementById('lobby-room-view');
        
        if (initialView) initialView.style.display = 'none';
        if (roomView) roomView.style.display = 'block';
        
        // Mostrar código de sala
        const roomCodeDisplay = document.getElementById('room-code-display');
        if (roomCodeDisplay) roomCodeDisplay.textContent = roomId;
        
        // Inicializar estado ready
        this.isReady = false;
        this.setupLobbyButtons();
    }
    
    /**
     * Actualizar UI del lobby con estado de jugadores
     */
    updateLobbyUI(data) {
        if (!data || !data.players) return;
        
        const playersList = document.getElementById('players-list');
        if (!playersList) return;
        
        // Limpiar lista
        playersList.innerHTML = '';
        
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
                        <div style="font-size: 14px; color: ${teamColor};">
                            Equipo: ${teamName}
                        </div>
                    </div>
                </div>
            `;
            
            playerCard.appendChild(playerInfo);
            
            // Botón expulsar (solo si soy host y no es mi card) - MÁS PEQUEÑO
            if (this.myTeam === 'player1' && !isMe) {
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
        
        // Actualizar mi estado de ready basado en los datos del servidor
        const myPlayer = data.players.find(p => p.id === this.socket.id);
        if (myPlayer) {
            this.isReady = myPlayer.ready;
            
            // Actualizar botón de ready
            const readyBtn = document.getElementById('ready-toggle-btn');
            if (readyBtn) {
                readyBtn.textContent = this.isReady ? 'Cancelar' : 'Marcar Listo';
            }
        }
        
        // Actualizar botón de inicio (solo visible para host si todos están ready)
        const startBtn = document.getElementById('start-multiplayer-game-btn');
        if (startBtn && this.myTeam === 'player1') {
            const allReady = data.players.length === 2 && data.players.every(p => p.ready);
            startBtn.style.display = allReady ? 'block' : 'none';
        }
    }
    
    /**
     * Configurar event listeners de botones del lobby
     */
    setupLobbyButtons() {
        // Botón Ready - El botón muestra la ACCIÓN, no el estado
        const readyBtn = document.getElementById('ready-toggle-btn');
        if (readyBtn) {
            readyBtn.onclick = () => {
                this.isReady = !this.isReady;
                this.socket.emit('player_ready', { roomId: this.roomId, ready: this.isReady });
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
        
        this.socket.emit('lobby_chat', { roomId: this.roomId, message });
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
            console.error('Solo el host puede expulsar jugadores');
            return;
        }
        
        if (confirm('¿Expulsar a este jugador?')) {
            this.socket.emit('kick_player', { roomId: this.roomId, targetPlayerId });
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
        
        // Resetear estado
        this.roomId = null;
        this.isReady = false;
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
            z-index: 1000;
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
        console.log('🎮 Overlay de countdown del juego creado');
    }
    
    updateGameCountdownDisplay(seconds) {
        const countdownText = document.getElementById('game-countdown-text');
        if (countdownText) {
            if (seconds <= 3) {
                countdownText.textContent = seconds;
                console.log(`🎮 Countdown del juego: ${seconds}`);
            } else {
                countdownText.textContent = '¡COMIENZA!';
                console.log('🎮 ¡JUEGO INICIADO!');
            }
        }
    }
    
    startActualGame() {
        console.log('🎮 Iniciando juego real...');
        
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
        
        // Despausar el juego
        this.game.paused = false;
        this.game.state = 'playing';
        
        console.log('✅ Juego real iniciado - ¡A jugar!');
    }

    hideLobby() {
        console.log('✅ Ocultando lobby, mostrando juego...');
        
        const lobbyOverlay = document.getElementById('multiplayer-lobby-overlay');
        if (lobbyOverlay) {
            lobbyOverlay.style.display = 'none';
            lobbyOverlay.classList.add('hidden');
            console.log('  ✓ Lobby oculto');
        }
        
        // Ocultar TODOS los overlays posibles
        const overlays = [
            'main-menu-overlay',
            'press-to-continue-screen',
            'loading-screen',
            'pause-overlay',
            'victory-overlay',
            'defeat-overlay',
            'arsenal-overlay'
        ];
        
        overlays.forEach(overlayId => {
            const overlay = document.getElementById(overlayId);
            if (overlay) {
                overlay.style.display = 'none';
                overlay.classList.add('hidden');
                console.log(`  ✓ Overlay oculto: ${overlayId}`);
            }
        });
        
        // CRÍTICO: Ocultar el botón de overlay "Comenzar" y TODOS los botones de overlay
        const startTimerBtn = document.getElementById('start-timer-btn');
        if (startTimerBtn) {
            startTimerBtn.style.display = 'none';
            startTimerBtn.style.visibility = 'hidden';
            startTimerBtn.style.opacity = '0';
            startTimerBtn.style.pointerEvents = 'none';
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
        console.log(`  ✓ ${overlayButtons.length} botones de overlay ocultados`);
        
        // CRÍTICO: Ocultar elementos del tutorial que tienen z-index altísimo
        const tutorialElements = [
            'tutorial-spotlight',
            'tutorial-textbox',
            'tutorial-exit-btn',
            'tutorial-next-btn',
            'tutorial-prev-btn'
        ];
        
        tutorialElements.forEach(elemId => {
            const elem = document.getElementById(elemId);
            if (elem) {
                elem.style.display = 'none';
                elem.style.visibility = 'hidden';
                elem.style.opacity = '0';
                elem.style.zIndex = '-999';
                elem.style.pointerEvents = 'none';
                // FORZAR eliminación del DOM
                if (elem.parentNode) {
                    elem.parentNode.removeChild(elem);
                    console.log(`  ✓ Tutorial element ELIMINADO del DOM: ${elemId}`);
                }
            }
        });
        
        // Ocultar cualquier elemento con clase tutorial
        const tutorialClassElements = document.querySelectorAll('.tutorial-spotlight, .tutorial-overlay');
        tutorialClassElements.forEach(elem => {
            if (elem.parentNode) {
                elem.parentNode.removeChild(elem);
            }
        });
        console.log(`  ✓ ${tutorialClassElements.length} elementos de tutorial eliminados por clase`);
        
        // Asegurar que el canvas esté visible y en primer plano
        const gameCanvas = document.getElementById('game-canvas');
        if (gameCanvas) {
            gameCanvas.style.display = 'block';
            gameCanvas.style.visibility = 'visible';
            gameCanvas.style.zIndex = '1';
            gameCanvas.style.position = 'relative';
            console.log('  ✓ Canvas mostrado');
        }
        
        // Asegurar que el contenedor del juego esté visible
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.style.display = 'block';
            gameContainer.style.visibility = 'visible';
            console.log('  ✓ game-container mostrado');
        }
        
        const mainGame = document.getElementById('main-game');
        if (mainGame) {
            mainGame.style.display = 'block';
            mainGame.style.visibility = 'visible';
            console.log('  ✓ main-game mostrado');
        }
        
        // Verificar TODOS los elementos que podrían estar tapando
        const allElements = document.querySelectorAll('*');
        let elementsOnTop = 0;
        allElements.forEach(el => {
            const zIndex = parseInt(window.getComputedStyle(el).zIndex);
            if (zIndex > 100 && el.style.display !== 'none') {
                console.warn(`⚠️ Elemento con z-index alto visible:`, el.id || el.className, 'z-index:', zIndex);
                elementsOnTop++;
            }
        });
        console.log(`🔍 Elementos con z-index alto: ${elementsOnTop}`);
        
        // Ocultar slider de cámara inicialmente
        this.game.ui.hideElement('camera-slider-container');
        
        // Mostrar timer y currency display
        this.game.ui.showElement('timer-display');
        this.game.ui.showElement('fob-currency-display');
        
        console.log('💰 Mostrando UI de currency...');
        
        // Forzar actualización inmediata del HUD
        setTimeout(() => {
            this.game.ui.updateHUD(this.game.getGameState());
            console.log('💰 HUD actualizado con currency:', this.game.currency.get());
            
            // DEBUG: Verificar que el elemento currency esté visible
            const currencyDisplay = document.getElementById('fob-currency-display');
            const currencyAmount = document.getElementById('fob-currency-amount');
            
            if (currencyDisplay) {
                const styles = window.getComputedStyle(currencyDisplay);
                console.log('💰 Currency Display:', {
                    exists: true,
                    display: styles.display,
                    visibility: styles.visibility,
                    zIndex: styles.zIndex,
                    top: styles.top,
                    left: styles.left,
                    opacity: styles.opacity
                });
            } else {
                console.error('❌ Currency Display NO ENCONTRADO en el DOM!');
            }
            
            if (currencyAmount) {
                console.log('💰 Currency Amount:', {
                    exists: true,
                    textContent: currencyAmount.textContent,
                    display: window.getComputedStyle(currencyAmount).display
                });
            } else {
                console.error('❌ Currency Amount NO ENCONTRADO en el DOM!');
            }
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
        console.log('🏆 Manejando fin de partida:', data);
        
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
            'front_reached_hq': 'Frente alcanzó el HQ enemigo',
            'frontier_collapsed': 'Frontera enemiga colapsó'
        };
        
        const loseReasons = {
            'front_reached_hq': 'Frente enemigo alcanzó tu HQ',
            'frontier_collapsed': 'Tu frontera colapsó'
        };
        
        const reasons = isWinner ? winReasons : loseReasons;
        return reasons[reason] || (isWinner ? 'Victoria' : 'Derrota');
    }
    
    /**
     * Mostrar pantalla de victoria/derrota
     */
    showGameOverScreen(isWinner, reasonText, stats) {
        // AUDIO: Detener música de batalla solo si gané
        if (isWinner) {
            // Victoria: detener batalla y reproducir Victory March
            this.game.audio.stopBattleMusic();
            this.game.audio.playVictoryMarch();
        }
        // Derrota: MANTENER música de batalla (sonido ambiental continúa)
        
        // Crear overlay usando las clases CSS del juego
        const overlay = document.createElement('div');
        overlay.id = 'game-over-overlay';
        overlay.className = 'overlay';
        overlay.style.cssText = `
            display: flex;
            background: rgba(0, 0, 0, 0.95);
        `;
        
        // Contenedor principal
        const container = document.createElement('div');
        container.className = 'main-menu-container';
        container.style.maxWidth = '700px';
        
        // Header
        const header = document.createElement('div');
        header.className = 'menu-header';
        
        const title = document.createElement('h1');
        title.className = 'menu-title';
        title.textContent = isWinner ? 'VICTORIA' : 'DERROTA';
        title.style.color = isWinner ? '#4ecca3' : '#e74c3c';
        title.style.textShadow = `0 0 20px ${isWinner ? '#4ecca3' : '#e74c3c'}`;
        header.appendChild(title);
        container.appendChild(header);
        
        // Razón de victoria/derrota
        const reasonDiv = document.createElement('div');
        reasonDiv.style.cssText = `
            color: #ffffff;
            font-size: 18px;
            margin: 20px 0;
            text-align: center;
        `;
        reasonDiv.textContent = reasonText;
        container.appendChild(reasonDiv);
        
        // Estadísticas (usando mismo estilo que singleplayer)
        if (stats) {
            const statsContainer = document.createElement('div');
            statsContainer.className = 'stats-container';
            statsContainer.style.cssText = `
                color: #ffffff;
                text-align: left;
                margin: 20px 0;
                padding: 20px;
                background: rgba(0, 0, 0, 0.7);
                border-radius: 8px;
            `;
            
            // Duración
            const duration = document.createElement('div');
            duration.style.cssText = `
                text-align: center;
                margin-bottom: 20px;
                font-size: 24px;
                font-weight: bold;
            `;
            const minutes = Math.floor(stats.duration / 60);
            const seconds = stats.duration % 60;
            duration.textContent = `⏱️ Duración: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            statsContainer.appendChild(duration);
            
            // Grid de estadísticas
            const grid = document.createElement('div');
            grid.style.cssText = `
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
            `;
            
            const myStats = stats[this.game.myTeam];
            const oppTeam = this.game.myTeam === 'player1' ? 'player2' : 'player1';
            const oppStats = stats[oppTeam];
            
            // Mis stats
            const myStatsDiv = document.createElement('div');
            myStatsDiv.innerHTML = `
                <h3 style="color: #4ecca3; margin-bottom: 10px;">TU RENDIMIENTO</h3>
                <div>💰 Currency total: ${myStats.totalCurrency}$</div>
                <div>🏗️ Edificios: ${myStats.buildings}</div>
                <div>⚔️ Avance máx: ${Math.floor(myStats.maxAdvance)} px</div>
            `;
            grid.appendChild(myStatsDiv);
            
            // Stats del enemigo
            const oppStatsDiv = document.createElement('div');
            oppStatsDiv.innerHTML = `
                <h3 style="color: #e74c3c; margin-bottom: 10px;">ENEMIGO</h3>
                <div>💰 Currency total: ${oppStats.totalCurrency}$</div>
                <div>🏗️ Edificios: ${oppStats.buildings}</div>
                <div>⚔️ Avance máx: ${Math.floor(oppStats.maxAdvance)} px</div>
            `;
            grid.appendChild(oppStatsDiv);
            
            statsContainer.appendChild(grid);
            container.appendChild(statsContainer);
        }
        
        // Acciones (botón volver al menú)
        const actions = document.createElement('div');
        actions.className = 'menu-actions';
        
        const menuBtn = document.createElement('button');
        menuBtn.className = 'menu-btn primary';
        menuBtn.textContent = 'Volver al Menú';
        // NO sobrescribir background - usar UIFrame del CSS (medium_bton.png)
        // Aplicar color como filtro si es derrota
        if (!isWinner) {
            menuBtn.style.filter = 'hue-rotate(180deg) saturate(1.5)'; // Rojo para derrota
        }
        menuBtn.onclick = () => {
            // Detener música de victoria
            this.game.audio.stopVictoryMarch();
            // Detener música de batalla (por si perdió)
            this.game.audio.stopBattleMusic();
            // Desconectar del servidor
            this.disconnect();
            // Recargar página para volver al menú principal
            window.location.reload();
        };
        actions.appendChild(menuBtn);
        container.appendChild(actions);
        
        overlay.appendChild(container);
        document.body.appendChild(overlay);
    }
    
    /**
     * Desconectar del servidor
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }
}

