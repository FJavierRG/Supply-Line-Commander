// ===== CONTROLADOR PRINCIPAL DEL JUEGO =====
import { VisualNode } from './entities/visualNode.js';
import { interpolatePosition, interpolateProgress, interpolateValue } from './utils/InterpolationUtils.js';
import { RenderSystem } from './systems/RenderSystem.js';
import { UIManager } from './systems/UIManager.js';
import { AudioManager } from './systems/AudioManager.js';
import { ParticleSystem } from './utils/ParticleSystem.js';
import { AssetManager } from './systems/AssetManager.js';
import { InputHandler } from './systems/InputHandler.js';
import { BuildingSystem } from './systems/BuildingSystem.js';
import { ConvoyManager } from './systems/ConvoyManager.js';
import { MedicalEmergencySystem } from './systems/MedicalEmergencySystem.js';
import { DroneSystem } from './systems/DroneSystem.js';
import { TankSystem } from './systems/TankSystem.js';
import { LightVehicleSystem } from './systems/LightVehicleSystem.js'; // 🆕 NUEVO: Sistema de artillado ligero
import { AntiDroneSystem } from './systems/AntiDroneSystem.js';
import { FrontMovementSystem } from './systems/FrontMovementSystem.js';
import { TerritorySystem } from './systems/TerritorySystem.js';
import { BackgroundTileSystem } from './systems/BackgroundTileSystem.js';
import { CameraController } from './systems/CameraController.js';
import { LoadingScreenManager } from './systems/LoadingScreenManager.js';
import { CurrencyManager } from './systems/CurrencyManager.js';
import { StoreUIManager } from './systems/StoreUIManager.js';
import { RoadSystem } from './utils/RoadSystem.js';
import { RailSystem } from './utils/RailSystem.js';
import { TrainSystem } from './systems/TrainSystem.js';
import { OptionsManager } from './systems/OptionsManager.js';
import { ArsenalManager } from './systems/ArsenalManager.js';
import { DeckManager } from './systems/DeckManager.js';
import { TutorialManager } from './systems/TutorialManager.js';
import { NetworkManager } from './systems/NetworkManager.js';
import { RaceSelectionManager } from './systems/RaceSelectionManager.js';
import { OverlayManager } from './systems/OverlayManager.js';
import { GameStateManager } from './systems/GameStateManager.js';
import { InputRouter } from './systems/InputRouter.js';
import { ScreenManager } from './systems/ScreenManager.js';
import { CanvasManager } from './systems/CanvasManager.js';
import { GAME_CONFIG } from './config/constants.js';
// ELIMINADO: MAP_CONFIG, calculateAbsolutePosition - Ya no se genera el mapa en el cliente
import { getNodeConfig } from './config/nodes.js';

// === LEGACY REMOVED: Sistema de IA eliminado ===
// La IA ahora está completamente en el servidor (server/game/managers/AISystem.js)

export class Game {
    constructor(canvas) {
        // Canvas y dimensiones
        this.canvas = canvas;
        
        // Sistemas especializados
        this.assetManager = new AssetManager();
        this.renderer = new RenderSystem(canvas, this.assetManager, this);
        
        // NUEVO: Managers de HUD/UI
        this.overlayManager = new OverlayManager();
        this.gameStateManager = new GameStateManager();
        this.gameStateManager.setState('menu'); // Estado inicial
        this.screenManager = new ScreenManager();
        this.canvasManager = new CanvasManager(this);
        
        // 🆕 FIX: Configurar listener para pausar/reanudar canvas cuando cambian las pantallas
        this.screenManager.onScreenChange((newScreen, oldScreen) => {
            // Si se muestra una pantalla (menú, pausa, etc), pausar el canvas
            if (newScreen) {
                this.canvasManager.pause();
            } else {
                // Si no hay pantalla visible y estamos jugando, reanudar el canvas
                if (this.state === 'playing') {
                    this.canvasManager.resume();
                }
            }
        });
        
        // 🆕 FIX: Pausar canvas inicialmente ya que empezamos en el menú
        this.canvasManager.pause();
        
        // NUEVO: InputRouter necesita los managers antes de crearse
        this.inputRouter = new InputRouter(this.gameStateManager, this.overlayManager);
        
        // MANTENER: UIManager sigue existiendo (compatibilidad)
        this.ui = new UIManager(this);
        this.audio = new AudioManager();
        this.loadingScreen = new LoadingScreenManager();
        this.currency = new CurrencyManager(this);
        this.particleSystem = new ParticleSystem(this);
        this.roadSystem = new RoadSystem(this);
        this.railSystem = new RailSystem(this);
        this.buildSystem = new BuildingSystem(this);
        this.storeUI = new StoreUIManager(this.assetManager, this.buildSystem, this);
        this.options = new OptionsManager(this.audio);
        this.deckManager = new DeckManager(this);
        this.arsenal = new ArsenalManager(this.assetManager, this);
        this.convoyManager = new ConvoyManager(this);
        this.trainSystem = new TrainSystem(this);
        this.medicalSystem = new MedicalEmergencySystem(this);
        this.droneSystem = new DroneSystem(this);
        this.tankSystem = new TankSystem(this);
        this.lightVehicleSystem = new LightVehicleSystem(this); // 🆕 NUEVO: Sistema de artillado ligero
        this.antiDroneSystem = new AntiDroneSystem(this);
        this.frontMovement = new FrontMovementSystem(this);
        this.territory = new TerritorySystem(this);
        this.camera = new CameraController(this);
        this.inputHandler = new InputHandler(this);
        
        // === LEGACY REMOVED: Sistema de IA eliminado ===
        // La IA ahora está completamente en el servidor (server/game/managers/AISystem.js)
        // No hay IA en el cliente - solo renderizado visual
        
        this.tutorialManager = new TutorialManager(this);
        
        // Sistema de selección de raza
        this.raceSelection = new RaceSelectionManager(this);
        this.selectedRace = null; // Se establecerá cuando el usuario seleccione una raza
        
        // Sistema de red (multijugador)
        this.network = new NetworkManager(this);
        // 🆕 NUEVO: Hacer NetworkManager disponible globalmente para botones HTML
        window.networkManager = this.network;
        this.isMultiplayer = false;
        this.myTeam = 'ally'; // Por defecto antes de conectar al servidor
        
        // 🆕 SERVIDOR COMO AUTORIDAD: Inicializar configuración de edificios localmente
        this.serverBuildingConfig = null;
        
        // Configurar canvas
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // 🆕 SERVIDOR COMO AUTORIDAD: Inicializar configuración de edificios localmente
        this.initializeLocalBuildingConfig();
        
        // Estado del juego
        this.state = 'menu'; // menu, playing, paused, editor
        // MANTENER: this.state para compatibilidad, pero sincronizar con GameStateManager
        this.gameStateManager.onStateChange((newState) => {
            this.state = newState; // Mantener sincronizado
        });
        
        // NUEVO: Helper para cambiar estado (usa GameStateManager)
        this.setGameState = (newState) => {
            this.gameStateManager.setState(newState);
            // this.state se actualiza automáticamente vía listener
        };
        
        this.score = 0;
        this.deliveries = 0;
        this.lastTime = 0;
        this.paused = false;
        this.missionStarted = false;
        this.debugMode = false; // Modo debug para sistemas
        this.debugVisualMode = false; // Modo debug visual (F1) - hitboxes, rangos, vectores
        this.debugEnemyBuildMode = false; // Modo debug para colocar edificios enemigos
        this.debugEnemyDroneMode = false; // Modo debug para lanzar drones enemigos
        this.debugEnemySniperMode = false; // Modo debug para lanzar sniper enemigo
        this.isPlaytesting = false; // true cuando estamos testeando un mapa del editor
        this.playtestUpgrades = []; // Mejoras seleccionadas para el playtest
        this.devSupplyEnemyMode = false; // Modo desarrollo: dar recursos a enemigos
        this.countdown = 0; // Cuenta atrás al inicio (3, 2, 1)
        this.aiDifficulty = 'medium'; // Dificultad de la IA: 'easy', 'medium', 'hard'
        
        // Sistema de estadísticas de partida
        this.matchStats = {
            startTime: 0,
            endTime: 0,
            buildingsBuilt: 0,
            buildingsLost: 0,
            dronesLaunched: 0,
            snipersLaunched: 0,
            convoysDispatched: 0,
            emergenciesResolved: 0,
            emergenciesFailed: 0
        };
        
        // 🆕 SIMPLIFICADO: Ya no hay clases Mission, se usa mapGenerator directamente
        
        // Entidades - ARRAY UNIFICADO
        this.nodes = []; // Todos los nodos del mapa (bases, edificios, etc)
        this.helicopters = []; // 🆕 NUEVO: Array de helicópteros persistentes
        this.selectedNode = null;
        this.hoveredNode = null;
        this.hoveredEffect = null; // { tooltip: string, x: number, y: number }
        this.hoverTooltip = null; // { x, y, name, description, ranges?: [{radius, color, dash?}] }
        
        // Background
        this.backgroundTiles = null; // Sistema de tiles del background
        
        // Dimensiones del mundo (independientes del viewport)
        this.worldWidth = 0;
        this.worldHeight = 0;
        
        // Inicializar
        this.init();
    }
    
    /**
     * Maneja la selección de raza del usuario
     * @param {string} raceId - ID de la raza seleccionada (ahora puede ser un deckId)
     * @deprecated Este método ahora maneja mazos en lugar de razas
     */
    onRaceSelected(raceId) {
        this.selectedRace = raceId; // Mantener para compatibilidad
        console.log(`🏛️ Raza/Mazo seleccionado: ${raceId}`);
        
        // Establecer myTeam cuando se selecciona raza
        if (!this.isMultiplayer) {
            this.myTeam = 'player1';
        }
        
        // 🎯 NUEVO: Actualizar tienda con el mazo seleccionado
        if (this.storeUI && this.deckManager) {
            // Si raceId es un deckId válido, usarlo directamente
            const deck = this.deckManager.getDeck(raceId);
            if (deck) {
                this.storeUI.setDeck(deck.id);
            } else {
                // Si no es un deckId válido, usar el mazo seleccionado o predeterminado
                const selectedDeck = this.deckManager.getSelectedDeck();
                const deckToUse = selectedDeck || this.deckManager.getDefaultDeck();
                if (deckToUse) {
                    this.storeUI.setDeck(deckToUse.id);
                }
            }
        }
        
        // Mantener compatibilidad con buildSystem (puede necesitar actualización también)
        if (this.buildSystem && this.buildSystem.setRace) {
            this.buildSystem.setRace(raceId);
        }
        
        // Iniciar la misión con la raza seleccionada
        this.startMission();
    }
    
    resizeCanvas() {
        // RESOLUCIÓN INTERNA FIJA - Nunca cambia independientemente del zoom
        const gameWidth = GAME_CONFIG.BASE_WIDTH;
        const gameHeight = GAME_CONFIG.BASE_HEIGHT;
        
        // Establecer tamaño INTERNO del canvas (resolución de juego fija)
        this.canvas.width = gameWidth;
        this.canvas.height = gameHeight;
        
        // Obtener tamaño de la ventana para escalar CSS
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Usar escala independiente para ocupar toda la pantalla
        const scaleX = windowWidth / gameWidth;
        const scaleY = windowHeight / gameHeight;
        
        // Aplicar escala CSS independiente (ocupa toda la pantalla)
        this.canvas.style.width = windowWidth + 'px';
        this.canvas.style.height = windowHeight + 'px';
        
        // Sin márgenes - ocupa toda la pantalla
        this.canvas.style.marginLeft = '0px';
        this.canvas.style.marginTop = '0px';
        
        this.renderer.resize(gameWidth, gameHeight);
        this.camera.updateViewport(gameWidth, gameHeight);
    }
    
    async init() {
        // Mostrar pantalla de carga
        this.loadingScreen.show();
        
        // Cargar assets con callback de progreso
        await this.assetManager.loadAll((progress) => {
            this.loadingScreen.updateProgress(progress);
        });
        
        // Ocultar elementos UI inicialmente
        this.ui.hideElement('dev-supply-enemy-btn');
        this.ui.hideElement('pause-btn');
        
        // Ocultar pantalla de carga y mostrar "Press to Continue"
        this.loadingScreen.hide();
        this.loadingScreen.showPressToContinue(() => {
            // CRÍTICO: Desbloquear el contexto de audio del navegador
            // Esto debe hacerse ANTES de mostrar el menú para que el audio funcione
            this.audio.unlockAudioContext();
            
            // Al hacer clic, mostrar el menú principal (esto activará el audio)
            if (this.state === 'menu') {
                // Dar un pequeño delay para asegurar que el contexto de audio se desbloqueó
                setTimeout(() => {
                    this.showMainMenu();
                }, 50);
            }
        });
    }
    
    startMission() {
        // 🆕 FIX: Limpiar completamente el estado antes de iniciar una nueva partida
        // Esto previene problemas cuando se inicia una partida después de terminar otra
        this.clearGameState();
        
        // 🆕 FIX: Ocultar todas las pantallas antes de iniciar
        if (this.screenManager) {
            this.screenManager.hideAll();
        }
        
        // 🆕 FIX: Reanudar el canvas para que se renderice el juego
        if (this.canvasManager) {
            this.canvasManager.resume();
        }
        
        this.setGameState('playing');
        this.score = 0;
        this.deliveries = 0;
        this.nodes = []; // Limpiar todos los nodos
        this.helicopters = []; // 🆕 NUEVO: Limpiar helicópteros
        this.convoyManager.clear();
        this.particleSystem.clear();
        
        // Resetear estadísticas de partida
        this.matchStats = {
            startTime: 0,
            endTime: 0,
            buildingsBuilt: 0,
            buildingsLost: 0,
            dronesLaunched: 0,
            snipersLaunched: 0,
            convoysDispatched: 0,
            emergenciesResolved: 0,
            emergenciesFailed: 0
        };
        
        // Botones de debug desactivados para producción
        // const debugBtn = document.getElementById('toggle-debug-btn');
        // if (debugBtn) debugBtn.style.display = 'block';
        this.droneSystem.clear();
        this.tankSystem.clear();
        this.lightVehicleSystem.clear(); // 🆕 NUEVO: Artillado ligero
        this.paused = false;
        
        // Resetear currency
        this.currency.reset();
        
        // Resetear sistemas
        this.buildSystem.resetLevel();
        this.medicalSystem.reset();
        this.frontMovement.resetLevel();
        this.territory.reset();
        this.audio.resetEventFlags();
        
        // === LEGACY REMOVED: IA eliminada del cliente ===
        // La IA ahora está completamente en el servidor
        
        // Iniciar cuenta atrás de 3 segundos
        this.countdown = 3;
        this.missionStarted = false;
        
        // Reproducir secuencia de inicio (countdown + voces + motor)
        this.audio.playGameStartSequence();
        
        // Mostrar/ocultar botón "Volver al Editor" según si estamos en playtest
        const backToEditorBtn = document.getElementById('back-to-editor-btn');
        if (backToEditorBtn) {
            backToEditorBtn.style.display = this.isPlaytesting ? 'block' : 'none';
        }
        
        // Limpiar selecciones
        this.selectedNode = null;
        this.hoveredNode = null;
        
        // Definir tamaño del mundo FIJO basado en resolución base
        const baseWidth = GAME_CONFIG.BASE_WIDTH;
        const baseHeight = GAME_CONFIG.BASE_HEIGHT;
        
        this.worldWidth = baseWidth;
        this.worldHeight = baseHeight;
        
        // Reset y configurar cámara
        this.camera.reset();
        this.camera.setWorldSize(this.worldWidth, this.worldHeight);
        this.ui.hideElement('camera-slider-container');
        
        // ELIMINADO: generateBases - Ahora el servidor genera el mapa inicial
        this.nodes = [];
        
        // Generar sistema de tiles del background
        this.backgroundTiles = new BackgroundTileSystem(this.worldWidth, this.worldHeight, 60);
        
        // Configurar UI
        this.ui.setupMissionUI(this.nodes);
        
        // Renderizar iconos de la tienda
        // Store UI se renderiza en el render loop principal
        
        // Iniciar loop
        this.lastTime = Date.now();
        this.gameLoop();
    }
    
    /**
     * 🆕 FIX: Método centralizado para limpiar completamente el estado del juego
     * Se usa cuando se sale de una partida o antes de iniciar una nueva
     */
    clearGameState() {
        // Limpiar todas las entidades y sistemas
        this.nodes = [];
        this.helicopters = [];
        this.convoyManager.clear();
        this.particleSystem.clear();
        this.droneSystem.clear();
        this.tankSystem.clear();
        
        // Resetear sistemas
        this.currency.reset();
        this.buildSystem.resetLevel();
        this.medicalSystem.reset();
        this.frontMovement.resetLevel();
        this.territory.reset();
        this.audio.resetEventFlags();
        this.camera.reset();
        
        // Limpiar background tiles
        this.backgroundTiles = null;
        
        // Resetear estado del juego
        this.score = 0;
        this.deliveries = 0;
        this.missionStarted = false;
        this.countdown = 0;
        this.matchStats = {
            startTime: 0,
            endTime: 0,
            buildingsBuilt: 0,
            buildingsLost: 0,
            dronesLaunched: 0,
            snipersLaunched: 0,
            convoysDispatched: 0,
            emergenciesResolved: 0,
            emergenciesFailed: 0
        };
        
        // Limpiar selecciones
        this.selectedNode = null;
        this.hoveredNode = null;
        
        // Limpiar canvas
        if (this.renderer) {
            this.renderer.clear();
        }
    }
    
    // ELIMINADO: generateBases() y shouldGenerateFOBs()
    // El servidor ahora genera el mapa inicial (GameStateManager.getInitialState)
    // El cliente recibe los nodos ya generados vía NetworkManager.loadInitialState
    
    /**
     * Despega un helicóptero desde un nodo hacia otro
     */
    dispatchHelicopter(fromNodeId, toNodeId) {
        const fromNode = this.nodes.find(n => n.id === fromNodeId);
        const toNode = this.nodes.find(n => n.id === toNodeId);
        
        if (!fromNode || !toNode) {
            console.error('❌ Nodos no encontrados para dispatch de helicóptero');
            return false;
        }
        
        // Buscar helicóptero aterizado en el nodo de origen
        const heliId = fromNode.landedHelicopters[0];
        if (!heliId) {
            console.error('❌ No hay helicópteros disponibles en el nodo');
            return false;
        }
        
        const heli = this.helicopters.find(h => h.id === heliId);
        if (!heli) {
            console.error('❌ Helicóptero no encontrado');
            return false;
        }
        
        // Cargar suministros si sale del HQ
        if (fromNode.type === 'hq') {
            heli.cargo = 100;
        }
        
        // Validar cargo según destino
        
        // FRONT: necesita al menos 50 de cargo
        if (toNode.type === 'front' && heli.cargo < 50) {
            console.error(`❌ Sin suficientes suministros para Front`);
            return false;
        }
        
        // HQ: acepta helicópteros con cualquier cargo (recarga infinita siempre disponible)
        
        // BASE AÉREA: acepta cualquier helicóptero que no esté lleno
        const isAerialBase = toNode.type === 'aerialBase' || toNode.isAerialBase;
        if (isAerialBase) {
            // Ya está lleno - no necesita recargar
            if (heli.cargo >= 100) {
                return false;
            }
            
            // Base sin suministros
            if (toNode.supplies <= 0) {
                return false;
            }
        }
        
        // Calcular distancia
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Despegar
        heli.state = 'flying';
        heli.currentNodeId = fromNodeId;
        heli.targetNodeId = toNodeId;
        heli.progress = 0;
        heli.initialDistance = distance;
        
        // Remover del nodo de origen
        fromNode.landedHelicopters = fromNode.landedHelicopters.filter(id => id !== heliId);
        
        
        // El sonido se reproduce mediante el evento de sonido 'chopper' del servidor
        
        return true;
    }
    
    
    gameLoop() {
        // console.log(`🔄 GameLoop ejecutándose - state: ${this.state}`);
        // Solo actualizar si está en estado de juego activo
        if (this.state !== 'playing' && this.state !== 'victory' && this.state !== 'defeat' && this.state !== 'tutorial' && this.state !== 'menu') {
            // IMPORTANTE: Continuar el loop incluso si no está en estado activo
            requestAnimationFrame(() => this.gameLoop());
            return;
        }
        
        const now = Date.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;
        
        // Manejar tutorial por separado (ahora es solo UI, no necesita renderizado)
        if (this.state === 'tutorial') {
            // El tutorial simple no necesita update/render, todo es HTML
        } else {
            // Lógica normal del juego
            if (this.state === 'playing' && !this.paused) {
                this.update(dt);
            }
            
            // 🆕 FIX: Solo renderizar si el canvasManager está corriendo
            // Esto previene que se renderice el juego cuando hay menús visibles
            if (this.canvasManager && !this.canvasManager.getRunning()) {
                // Canvas pausado, no renderizar
                requestAnimationFrame(() => this.gameLoop());
                return;
            }
            
            // CRÍTICO: Renderizar siempre, incluso en estado 'menu' si hay pantalla de selección de raza
            if (this.state === 'menu' && this.raceSelection && this.raceSelection.isVisible) {
                // console.log('🏛️ RENDERIZANDO pantalla de selección de raza');
                // Solo renderizar la pantalla de selección de raza
                this.raceSelection.render(this.renderer.ctx);
            } else {
                // console.log(`🎮 RENDERIZANDO juego normal - state: ${this.state}, raceSelection visible: ${this.raceSelection?.isVisible}`);
                // Renderizado normal del juego
                this.render();
            }
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update(dt) {
        // ⚠️ LEGACY REMOVED: Todo el código de simulación local eliminado.
        // El servidor autoritativo maneja toda la simulación.
        // El cliente solo debe actualizar:
        // - Partículas (efectos visuales locales)
        // - Posiciones visuales de convoyes (basadas en progress del servidor)
        // - UI y HUD
        // - Input del mouse
        // - Interpolación de posiciones
        
        this.particleSystem.update(dt);
        this.ui.updateHUD(this.getGameState());
        this.inputHandler.updateHoverTooltip();
        
        // Actualizar ping/latencia
        if (this.network) {
            this.network.update(dt);
        }
        
        // Actualizar sistema de carreteras (renderizado)
        if (this.roadSystem) {
            this.roadSystem.update();
        }
        
        // Actualizar sistema de vías de tren (renderizado)
        if (this.railSystem) {
            this.railSystem.update();
        }
        
        // CRÍTICO: Actualizar SOLO posiciones visuales de convoyes con interpolación suave
        // El progress viene del servidor, pero necesitamos interpolar suavemente entre frames
        for (const convoy of this.convoyManager.convoys) {
            convoy.update(dt); // Llama al método update() que maneja la interpolación
        }
        
        // Actualizar trenes con interpolación suave
        if (this.trainSystem) {
            this.trainSystem.update(dt);
        }
        
        // Actualizar helicópteros con interpolación suave (igual que convoys)
        if (this.helicopters) {
            for (const heli of this.helicopters) {
                if (heli.state === 'flying') {
                    this.updateHelicopterPosition(heli, dt);
                }
            }
        }
        
        // Interpolación suave de nodos (especialmente fronts que se mueven)
        for (const node of this.nodes) {
            if (node.updatePosition) {
                node.updatePosition(dt);
            }
        }
        
        // Actualizar sistemas visuales (interpolación)
        this.tankSystem.update(dt);
        this.lightVehicleSystem.update(dt); // 🆕 NUEVO: Artillado ligero
        
        // Interpolación suave de drones (usando sistema centralizado)
        for (const drone of this.droneSystem.getDrones()) {
            interpolatePosition(drone, dt, { 
                speed: 8.0,
                threshold: 1.0,
                snapThreshold: 0.1
            });
        }
        
        // Interpolación suave de tanques (usando sistema centralizado)
        for (const tank of this.tankSystem.getTanks()) {
            interpolatePosition(tank, dt, { 
                speed: 8.0,
                threshold: 1.0,
                snapThreshold: 0.1
            });
        }
        
        // 🆕 NUEVO: Interpolación suave de artillados ligeros (usando sistema centralizado)
        for (const lightVehicle of this.lightVehicleSystem.getLightVehicles()) {
            interpolatePosition(lightVehicle, dt, { 
                speed: 8.0,
                threshold: 1.0,
                snapThreshold: 0.1
            });
        }
        
        // 🆕 NUEVO: Interpolación suave de camera drones volando (usando sistema centralizado)
        for (const node of this.nodes) {
            if (node.isCameraDrone && node.active && !node.deployed && node.serverX !== undefined && node.serverY !== undefined) {
                interpolatePosition(node, dt, { 
                    speed: 8.0,
                    threshold: 1.0,
                    snapThreshold: 0.1
                });
            }
        }
        
        // ⚠️ LEGACY REMOVED: NO ejecutar simulación aquí - el servidor maneja TODO
    }
    
    /**
     * Renderiza líneas de detección de anti-drones a drones enemigos
     */
    renderAntiDroneDetectionLines() {
        if (!this.droneSystem) return; // Seguridad
        
        const ctx = this.renderer.ctx;
        const alertRange = 220; // Rango de alerta del anti-drone
        
        // Buscar anti-drones construidos
        const antiDrones = this.nodes.filter(n => 
            n.type === 'antiDrone' && 
            n.constructed && 
            !n.isAbandoning
        );
        
        // Buscar drones activos
        const drones = this.droneSystem.getDrones();
        if (!drones || drones.length === 0) return; // No hay drones, no dibujar nada
        
        // Para cada anti-drone, verificar si hay drones enemigos en rango
        for (const antiDrone of antiDrones) {
            for (const drone of drones) {
                // Solo detectar drones enemigos
                const isDroneEnemy = (antiDrone.team === 'player1' && drone.isEnemy) || 
                                     (antiDrone.team === 'player2' && !drone.isEnemy);
                
                if (!isDroneEnemy) continue;
                
                // Calcular distancia
                const distance = Math.hypot(drone.x - antiDrone.x, drone.y - antiDrone.y);
                
                // Si está en rango de alerta (220px), dibujar línea roja
                if (distance <= alertRange) {
                    ctx.save();
                    ctx.strokeStyle = '#ff0000'; // Rojo
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 5]); // Línea punteada
                    ctx.globalAlpha = 0.6; // Semi-transparente
                    
                    ctx.beginPath();
                    ctx.moveTo(antiDrone.x, antiDrone.y);
                    ctx.lineTo(drone.x, drone.y);
                    ctx.stroke();
                    
                    ctx.restore();
                }
            }
        }
    }
    
    /**
     * Renderiza elementos de UI del juego (porcentajes de territorio, etc.)
     * Se llama al final del ciclo de renderizado (DENTRO del contexto de cámara)
     */
    renderGameUI() {
        // Renderizar porcentajes de territorio en la parte superior
        this.territory.renderTerritoryPercentages(this.renderer.ctx);
        
        // Renderizar reloj del tiempo de juego (centro superior)
        this.renderGameTimer(this.renderer.ctx);
    }
    
    /**
     * Renderiza el reloj del tiempo de juego en la parte superior central
     */
    renderGameTimer(ctx) {
        // Obtener tiempo de juego (en segundos ENTEROS)
        let gameTime = 0;
        
        if (this.network && this.network.lastGameState) {
            // Usar tiempo del servidor (redondear a segundos)
            gameTime = Math.floor(this.network.lastGameState.gameTime || 0);
        } else if (this.matchStats && this.matchStats.startTime) {
            // Fallback: calcular desde el inicio de la partida
            gameTime = Math.floor((Date.now() - this.matchStats.startTime) / 1000);
        }
        
        // Convertir a formato MM:SS
        const minutes = Math.floor(gameTime / 60);
        const seconds = gameTime % 60;
        const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Renderizar en el centro superior
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(timeText, this.worldWidth / 2, 50);
        ctx.restore();
    }
    
    /**
     * Renderiza la currency directamente en el canvas (solo multijugador)
     * Usa el UIFrame real (currency_bton.png) y se posiciona junto a la tienda
     */
    renderCurrencyOnCanvas(ctx) {
        const currency = Math.floor(this.currency.get());
        
        // Calcular rate: base (2$/s) + bonus de plantas nucleares (+2$/s cada una)
        const baseRate = 2;
        const nuclearBonus = this.currency.getNuclearPlantBonus();
        const rate = baseRate + nuclearBonus;
        
        // Obtener sprites
        const currencyFrame = this.assetManager.getSprite('ui-currency-background');
        const currencyIcon = this.assetManager.getSprite('ui-currency');
        
        ctx.save();
        
        // Posición: A la derecha de la tienda
        // Tienda está en x=40, width=292 → termina en x=332
        // Currency empieza en x=340 (8px de separación)
        const frameX = 340;
        const frameY = 40;
        const frameWidth = 210;  // Mitad del original (420/2)
        const frameHeight = 83;  // Mitad del original (166/2)
        
        // Renderizar UIFrame de background
        if (currencyFrame) {
            ctx.drawImage(currencyFrame, frameX, frameY, frameWidth, frameHeight);
        } else {
            // Fallback: rectángulo si no se carga el sprite
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(frameX, frameY, frameWidth, frameHeight);
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.strokeRect(frameX, frameY, frameWidth, frameHeight);
        }
        
        // Renderizar icono de moneda
        if (currencyIcon) {
            const iconSize = 24;
            const iconX = frameX + 20;
            const iconY = frameY + (frameHeight / 2) - (iconSize / 2);
            ctx.drawImage(currencyIcon, iconX, iconY, iconSize, iconSize);
        } else {
            // Fallback: símbolo $
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', frameX + 20, frameY + frameHeight / 2);
        }
        
        // Renderizar cantidad de currency
        ctx.fillStyle = '#FFD700'; // Dorado
        ctx.font = 'bold 26px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(currency.toString(), frameX + 55, frameY + (frameHeight / 2) - 2);
        
        // Renderizar rate de generación (más pequeño, abajo del número)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = '14px Arial';
        ctx.fillText(`(+${rate}/s)`, frameX + 55, frameY + (frameHeight / 2) + 16);
        
        ctx.restore();
    }
    
    /**
     * Actualiza la posición del helicóptero usando interpolación suave (igual que convoyes)
     * 🎯 REUTILIZA: Sistema modular de interpolación de convoyes
     */
    updateHelicopterPosition(heli, dt) {
        if (!heli.initialDistance || heli.initialDistance <= 0) return;
        
        // Inicializar progress si no existe
        if (heli.progress === undefined || heli.progress === null) {
            heli.progress = 0;
        }
        
        // Inicializar serverProgress si no existe (target del servidor)
        if (heli.serverProgress === undefined || heli.serverProgress === null) {
            heli.serverProgress = heli.progress || 0;
        }
        
        // 🎯 USAR SISTEMA MODULAR: Interpolación suave igual que convoyes
        // Usar wrapper temporal para que interpolateValue modifique el valor correctamente
        const progressWrapper = {
            current: heli.progress,
            target: heli.serverProgress
        };
        
        interpolateValue(progressWrapper, dt, {
            adaptiveSpeeds: {
                large: 15.0,  // Gran diferencia: interpolar rápidamente
                medium: 8.0,   // Diferencia media: velocidad normal
                small: 5.0     // Diferencia pequeña: muy suave
            },
            threshold: 0.001
        });
        
        // Actualizar progress desde el wrapper
        heli.progress = Math.max(0, Math.min(1.0, progressWrapper.current));
    }
    
    
    render() {
        // CRÍTICO: En multijugador, verificar que NO estamos en estado tutorial
        if (this.isMultiplayer && this.state === 'tutorial') {
            this.setGameState('playing');
        }
        
        this.renderer.clear();
        
        // Debug para multijugador
        if (this.isMultiplayer && this.nodes.length === 0) {
        }
        
        // Debug: Log ONE TIME para confirmar que render se ejecuta
        if (this.isMultiplayer && !this._renderLoggedOnce) {
            // console.log(`🎨 RENDER ejecutándose: state=${this.state}, nodes=${this.nodes.length}`);
            this._renderLoggedOnce = true;
        }
        
        // Aplicar cámara (siempre activa)
        this.camera.applyToContext(this.renderer.ctx);
        
        // Aplicar Mirror View para player2 (flip horizontal del mundo)
        this.renderer.applyMirrorView();
        
        // Renderizar fondo del mundo expandido
        this.renderer.renderBackground();
        this.renderer.renderGrid();
        
        // Carreteras debajo del territorio y de todo lo demás (solo por encima del fondo)
        this.roadSystem.render(this.renderer.ctx, this.assetManager);
        
        // Vías de tren debajo del territorio y de todo lo demás (solo por encima del fondo)
        this.railSystem.render(this.renderer.ctx, this.assetManager);
        
        // Renderizar territorio controlado (debajo de las bases, por encima de carreteras)
        this.territory.render(this.renderer.ctx);
        
        // 🆕 NUEVO: Renderizar overlay de áreas válidas/inválidas cuando está en modo construcción
        if (this.buildSystem.isActive()) {
            if (this.buildSystem.buildMode && this.buildSystem.currentBuildingType) {
                this.renderer.renderBuildAreaOverlay(this.buildSystem.currentBuildingType);
            } else if (this.buildSystem.commandoMode) {
                this.renderer.renderBuildAreaOverlay('specopsCommando');
            } else if (this.buildSystem.truckAssaultMode) {
                this.renderer.renderBuildAreaOverlay('truckAssault');
            }
        }
        
        // 🆕 NUEVO: Renderizar overlay de áreas de exclusión para consumibles lanzables
        if (this.buildSystem.droneMode) {
            this.renderer.renderBuildAreaOverlay('drone');
        } else if (this.buildSystem.fobSabotageMode) {
            this.renderer.renderBuildAreaOverlay('fobSabotage');
        }
        
        // Renderizar marcas de impacto permanentes (debajo de los nodos)
        this.particleSystem.getImpactMarks().forEach(mark => this.renderer.renderImpactMark(mark));
        
        // Renderizar todos los nodos
        this.nodes.forEach(node => {
            this.renderer.renderNode(
                node,
                node === this.selectedNode,
                node === this.hoveredNode,
                this
            );
        });
        
        // Renderizar UI de vehículos e iconos del HQ encima de todo
        this.nodes.forEach(node => {
            this.renderer.renderVehicleUI(node, this);
        });
        
        // Renderizar convoyes
        const convoys = this.convoyManager.getConvoys();
        if (convoys.length > 0 && !this._convoyRenderLogged) {
            this._convoyRenderLogged = true;
        }
        convoys.forEach(convoy => this.renderer.renderConvoy(convoy));
        
        // Renderizar trenes
        if (this.trainSystem && this.trainSystem.trains) {
            this.trainSystem.trains.forEach(train => this.renderer.renderTrain(train));
        }
        
        // 🆕 NUEVO: Renderizar helicópteros
        if (this.helicopters && this.helicopters.length > 0) {
            this.helicopters.forEach(heli => {
                if (heli.state === 'flying') {
                    this.renderer.renderHelicopter(heli);
                }
            });
        }
        
        // Renderizar líneas de detección anti-drone → dron (ANTES de renderizar drones)
        this.renderAntiDroneDetectionLines();
        
        // Renderizar drones
        this.droneSystem.getDrones().forEach(drone => this.renderer.renderDrone(drone));
        
        // Renderizar tanques
        this.tankSystem.getTanks().forEach(tank => this.renderer.renderTank(tank));
        
        // 🆕 NUEVO: Renderizar artillados ligeros
        this.lightVehicleSystem.getLightVehicles().forEach(lightVehicle => this.renderer.renderLightVehicle(lightVehicle));
        
        // Renderizar partículas
        this.particleSystem.getParticles().forEach(p => this.renderer.renderParticle(p));
        this.particleSystem.getExplosionSprites().forEach(e => this.renderer.renderExplosionSprite(e));
        // 🆕 NUEVO: Renderizar explosiones de drones
        if (this.particleSystem.getDroneExplosionSprites) {
            this.particleSystem.getDroneExplosionSprites().forEach(e => this.renderer.renderDroneExplosionSprite(e));
        }
        
        // Renderizar debug del sistema anti-drones
        if (this.debugMode) {
            this.antiDroneSystem.renderDebug(this.renderer.ctx);
        }
        
        // Renderizar textos flotantes en BATCH (optimización crítica)
        const floatingTexts = this.particleSystem.getFloatingTexts();
        if (floatingTexts.length > 0) {
            this.renderer.renderFloatingTextsBatch(floatingTexts);
        }
        
        // Renderizar sprites flotantes (ej: sniper kill feed)
        const floatingSprites = this.particleSystem.getFloatingSprites();
        if (floatingSprites.length > 0) {
            this.renderer.renderFloatingSprites(floatingSprites);
        }
        
        // Renderizar sprites que caen (ej: specops unit)
        if (this.particleSystem.getFallingSprites && this.renderer.renderFallingSprites) {
            const fallingSprites = this.particleSystem.getFallingSprites();
            if (fallingSprites.length > 0) {
                this.renderer.renderFallingSprites(fallingSprites);
            }
        }
        
        // Preview de ruta (solo si la ruta es válida)
        if (this.selectedNode && this.hoveredNode && this.selectedNode !== this.hoveredNode) {
            // Verificar si la ruta es válida según configuración del servidor
            const validTargets = this.serverBuildingConfig?.routes?.valid?.[this.selectedNode.type] || [];
            const isValidRoute = validTargets.includes(this.hoveredNode.type);
            
            if (isValidRoute) {
                this.renderer.renderRoutePreview(this.selectedNode, this.hoveredNode);
            }
        }
        
        // 🎯 NUEVO: Mostrar rango de intercepción de anti-drone cuando se selecciona una torreta propia
        if (this.selectedNode && 
            this.selectedNode.type === 'antiDrone' && 
            this.selectedNode.team === this.myTeam &&
            this.selectedNode.active &&
            this.selectedNode.constructed) {
            // Usar el mismo visual que se usa para las torretas enemigas en modo drone
            this.renderer.renderAntiDroneInterceptionRange(
                this.selectedNode.x, 
                this.selectedNode.y
            );
        }
        
        // Preview de construcción o dron
        if (this.buildSystem.isActive()) {
            const mousePos = this.inputHandler.getMousePosition();
            
            if (this.buildSystem.droneMode) {
                // Preview del dron: círculo vacío con X roja (o vacío si objetivo válido)
                this.renderer.renderDronePreview(mousePos.x, mousePos.y, this.hoveredNode);
            } else if (this.buildSystem.tankMode) {
                // Preview del tanque: similar al dron pero solo para edificios válidos (NO FOBs ni HQs)
                this.renderer.renderTankPreview(mousePos.x, mousePos.y, this.hoveredNode);
            } else if (this.buildSystem.lightVehicleMode) {
                // 🆕 NUEVO: Preview del artillado ligero: similar al tanque pero aplica broken (NO FOBs ni HQs)
                this.renderer.renderLightVehiclePreview(mousePos.x, mousePos.y, this.hoveredNode);
            } else if (this.buildSystem.sniperMode) {
                // Preview del francotirador: mira con sprite de sniper
                this.renderer.renderSniperCursor(mousePos.x, mousePos.y, this.hoveredNode);
            } else if (this.buildSystem.fobSabotageMode) {
                // Preview del sabotaje: cursor specops_selector
                this.renderer.renderFobSabotageCursor(mousePos.x, mousePos.y, this.hoveredNode);
            } else if (this.buildSystem.commandoMode) {
                // Preview del comando: usar preview normal de construcción
                this.renderer.renderBuildPreview(mousePos.x, mousePos.y, this.nodes, 'specopsCommando');
            } else if (this.buildSystem.truckAssaultMode) {
                // Preview del truck assault: usar preview normal de construcción
                this.renderer.renderBuildPreview(mousePos.x, mousePos.y, this.nodes, 'truckAssault');
            } else if (this.buildSystem.cameraDroneMode) {
                // Preview del camera drone: usar preview normal de construcción
                this.renderer.renderBuildPreview(mousePos.x, mousePos.y, this.nodes, 'cameraDrone');
            } else if (this.buildSystem.artilleryMode) {
                // Preview de artillería: mostrar área de efecto circular con sprite de artillery
                this.renderer.renderArtilleryPreview(mousePos.x, mousePos.y, this.hoveredNode);
            } else {
                // Preview del edificio actual
                const buildingType = this.buildSystem.currentBuildingType || 'fob';
                this.renderer.renderBuildPreview(mousePos.x, mousePos.y, this.nodes, buildingType);
            }
        }
        
        // Preview de dron enemigo (modo debug)
        if (this.debugEnemyDroneMode) {
            const mousePos = this.inputHandler.getMousePosition();
            this.renderer.renderEnemyDronePreview(mousePos.x, mousePos.y, this.hoveredNode);
        }
        
        // Preview de sniper enemigo (modo debug)
        if (this.debugEnemySniperMode) {
            const mousePos = this.inputHandler.getMousePosition();
            this.renderer.renderSniperCursor(mousePos.x, mousePos.y, this.hoveredNode);
        }
        
        // Preview de construcción enemiga (modo debug)
        if (this.debugEnemyBuildMode) {
            const mousePos = this.inputHandler.getMousePosition();
            this.renderer.renderEnemyBuildPreview(mousePos.x, mousePos.y);
        }
        
        // Renderizar tooltip de efectos
        if (this.hoveredEffect) {
            this.renderer.renderEffectTooltip(this.hoveredEffect);
        }
        
        // 🆕 NUEVO: Renderizar efectos del Destructor de mundos durante countdown (sobre todo excepto UI)
        // IMPORTANTE: Debe estar ANTES de restoreMirrorView() para que las coordenadas del mundo funcionen correctamente
        if (this.renderer.worldDestroyerActive) {
            this.renderer.renderWorldDestroyerEffects();
        }
        
        // 🆕 NUEVO: Renderizar efectos de artillería (countdown con sombra bomba nuclear pequeño)
        // IMPORTANTE: Debe estar ANTES de restoreMirrorView() para que las coordenadas del mundo funcionen correctamente
        if (this.renderer.artilleryStrikes && this.renderer.artilleryStrikes.length > 0) {
            this.renderer.renderArtilleryEffects();
        }
        
        // Restaurar Mirror View ANTES de UI del juego (para que porcentajes estén en posición correcta)
        this.renderer.restoreMirrorView();
        
        // Renderizar elementos de UI del juego (porcentajes de territorio, etc.)
        // DESPUÉS de restaurar mirror view para que estén en coordenadas correctas
        this.renderGameUI();
        
        // === UI FIJA EN PANTALLA (fuera del contexto de cámara) ===
        
        // Renderizar pantalla de selección de raza (si está visible) - ANTES de restaurar cámara
        this.raceSelection.render(this.renderer.ctx);
        
        // Restaurar cámara (siempre activa)
        this.camera.restoreContext(this.renderer.ctx);
        
        // 🆕 NUEVO: Renderizar pantallazo blanco del Destructor de mundos (sobre todo incluyendo UI)
        if (this.renderer.worldDestroyerExecuted) {
            this.renderer.renderWorldDestroyerEffects();
        }
        
        // Renderizar tienda (fija en pantalla)
        this.storeUI.updateLayout(this.canvas.width, this.canvas.height);
        this.storeUI.render(this.renderer.ctx);
        
        // Renderizar currency en canvas (multijugador)
        if (this.isMultiplayer) {
            this.renderCurrencyOnCanvas(this.renderer.ctx);
        }
        
        // Renderizar tooltip de hover prolongado
        if (this.hoverTooltip) {
            this.renderer.renderHoverTooltip(this.hoverTooltip);
        }
    }
    
    
    togglePause() {
        this.paused = !this.paused;
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.textContent = this.paused ? '▶️' : '⏸️';
            pauseBtn.classList.toggle('paused', this.paused);
        }
        if (this.paused) {
            this.ui.showPauseMenu(
                () => { // Continuar: solo cerrar el menú y reanudar
                    this.paused = false;
                    this.ui.hidePauseMenu();
                    if (pauseBtn) {
                        pauseBtn.textContent = '⏸️';
                        pauseBtn.classList.remove('paused');
                    }
                    console.log('▶️ Juego reanudado');
                },
                () => this.returnToMenuFromGame() // Volver al menú principal
            );
        } else {
            this.ui.hidePauseMenu();
        }
        // Pausa toggled (silencioso)
    }

    
    toggleBuildMode() {
        this.buildSystem.toggleBuildMode();
    }
    
    toggleDroneMode() {
        this.buildSystem.toggleDroneMode();
    }
    
    returnToMenuFromGame() {
        // Asegurarse de que la pausa esté desactivada
        this.paused = false;
        this.ui.hidePauseMenu();
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.textContent = '⏸️';
            pauseBtn.classList.remove('paused');
        }
        
        // Ocultar overlays de victoria/derrota usando ScreenManager
        if (this.screenManager) {
            this.screenManager.hide('VICTORY');
            this.screenManager.hide('DEFEAT');
            this.screenManager.hide('PAUSE');
        }
        
        // Mantener compatibilidad
        this.overlayManager.hideOverlay('victory-overlay');
        this.overlayManager.hideOverlay('defeat-overlay');
        this.overlayManager.hideOverlay('pause-overlay');
        
        // 🆕 FIX: Pausar canvas ANTES de limpiar el estado
        if (this.canvasManager) {
            this.canvasManager.pause();
        }
        
        // === LIMPIAR COMPLETAMENTE EL ESTADO DEL JUEGO ===
        // Limpiar todas las entidades y sistemas
        this.nodes = []; // Limpiar todos los nodos
        this.helicopters = []; // Limpiar helicópteros
        this.convoyManager.clear();
        this.particleSystem.clear();
        this.droneSystem.clear();
        this.tankSystem.clear();
        
        // Resetear sistemas
        this.currency.reset();
        this.buildSystem.resetLevel();
        this.medicalSystem.reset();
        this.frontMovement.resetLevel();
        this.territory.reset();
        this.audio.resetEventFlags();
        this.camera.reset();
        
        // Limpiar background tiles
        this.backgroundTiles = null;
        
        // Resetear estado del juego
        this.score = 0;
        this.deliveries = 0;
        this.missionStarted = false;
        this.countdown = 0;
        this.matchStats = {
            startTime: 0,
            endTime: 0,
            buildingsBuilt: 0,
            buildingsLost: 0,
            dronesLaunched: 0,
            snipersLaunched: 0,
            convoysDispatched: 0,
            emergenciesResolved: 0,
            emergenciesFailed: 0
        };
        
        // Si estaba en multijugador, desconectar
        if (this.isMultiplayer && this.network) {
            this.network.disconnect();
            this.isMultiplayer = false;
        }
        
        // Detener todos los sonidos
        this.audio.stopAllSounds();
        
        // Desactivar modos debug
        this.debugMode = false;
        this.debugVisualMode = false;
        this.debugEnemyBuildMode = false;
        this.debugEnemyDroneMode = false;
        this.debugEnemySniperMode = false;
        
        // Si estaba en playtest, limpiar mejoras
        if (this.isPlaytesting) {
            this.playtestUpgrades = [];
            this.isPlaytesting = false;
        }
        
        // Resetear selector de dificultad PRIMERO (antes de cambiar estado)
        if (this.inputHandler && this.inputHandler.resetDifficultySelector) {
            this.inputHandler.resetDifficultySelector();
        }
        
        // Cambiar estado a menú ANTES de mostrar el menú
        this.setGameState('menu');
        
        // Limpiar canvas completamente para que no quede frame congelado
        this.renderer.clear();
        
        // 🆕 FIX: Mostrar menú principal usando ScreenManager (esto pausará el canvas automáticamente)
        if (this.screenManager) {
            this.screenManager.show('MAIN_MENU');
        }
        
        // Mantener compatibilidad
        this.showMainMenu();
    }
    
    showMainMenu() {
        this.setGameState('menu');
        this.ui.showMainMenu();
        
        // Ocultar botón de "Volver al Editor" si existe
        const backToEditorBtn = document.getElementById('back-to-editor-btn');
        if (backToEditorBtn) {
            backToEditorBtn.style.display = 'none';
        }
        
        // (Editor de mapas legacy eliminado)
        
        // Reset flag de playtest
        this.isPlaytesting = false;
    }
    
    /**
     * === LEGACY REMOVED: initializeEnemyAI eliminado ===
     * La IA ahora está completamente en el servidor (server/game/managers/AISystem.js)
     */
    
    // ELIMINADO: setAIDifficulty, startGameFromMenu, onRaceSelected
    // Ahora todo se maneja desde el lobby unificado con servidor autoritativo
    
    /**
     * Inicia el tutorial desde el menú principal
     */
    startTutorialFromMenu() {
        // Verificar que los assets estén listos antes de continuar
        if (!this.assetManager.allLoaded) {
            return;
        }
        
        
        this.setGameState('tutorial'); // Estado separado para el tutorial
        this.ui.hideMainMenu();
        
        // Iniciar tutorial con su propio sistema
        this.tutorialManager.startTutorial();
    }
    
    /**
     * DEPRECATED - Método obsoleto, ahora el tutorial es manejado por TutorialManager
     */
    startTutorialMission() {
        console.warn('⚠️ startTutorialMission() está obsoleto');
        this.setGameState('playing');
        this.score = 0;
        this.deliveries = 0;
        this.nodes = []; // Limpiar todos los nodos
        this.convoyManager.clear();
        this.particleSystem.clear();
        
        // Botones de debug desactivados para producción
        // const debugBtn = document.getElementById('toggle-debug-btn');
        // if (debugBtn) debugBtn.style.display = 'block';
        this.droneSystem.clear();
        this.tankSystem.clear();
        this.lightVehicleSystem.clear(); // 🆕 NUEVO: Artillado ligero
        this.paused = false;
        
        // Resetear currency con valor del tutorial
        this.currency.reset();
        this.addMissionCurrency(this.tutorialManager.getTutorialMap().config.startingCurrency);
        
        // Resetear sistemas
        this.buildSystem.resetLevel();
        this.medicalSystem.reset();
        this.frontMovement.resetLevel();
        this.territory.reset();
        this.audio.resetEventFlags();
        // === LEGACY REMOVED: IA eliminada del cliente ===
        
        // Iniciar cuenta atrás de 3 segundos
        this.countdown = 3;
        this.missionStarted = false;
        
        // Reproducir secuencia de inicio (countdown + voces + motor)
        this.audio.playGameStartSequence();
        
        // Limpiar selecciones
        this.selectedNode = null;
        this.hoveredNode = null;
        
        // Definir tamaño del mundo FIJO basado en resolución base
        const baseWidth = GAME_CONFIG.BASE_WIDTH;
        const baseHeight = GAME_CONFIG.BASE_HEIGHT;
        
        this.worldWidth = baseWidth;
        this.worldHeight = baseHeight;
        
        // Reset y configurar cámara
        this.camera.reset();
        
        // Crear nodos del tutorial usando el mapa personalizado
        this.createTutorialMap();
        
        
        // Forzar actualización del territorio para que reconozca los nodos
        setTimeout(() => {
            this.territory.update(0);
        }, 100);
    }
    
    /**
     * DEPRECATED - Método obsoleto, ahora el tutorial es manejado por TutorialManager
     */
    createTutorialMap() {
        console.warn('⚠️ createTutorialMap() está obsoleto');

        const tutorialMap = this.tutorialManager.getTutorialMap();
        
        tutorialMap.nodes.forEach((nodeData, index) => {
            
            const config = getNodeConfig(nodeData.type);
            const node = new VisualNode(
                nodeData.x, 
                nodeData.y, 
                nodeData.type,
                {
                    ...config,
                    team: nodeData.team,
                    supplies: nodeData.supplies || undefined
                },
                this
            );
            
            if (node) {
                this.nodes.push(node);
            } else {
                console.error(`❌ Error creando nodo ${nodeData.type}`);
            }
        });

    }
    
    // ===== MÉTODOS DEL EDITOR DE MAPAS ELIMINADOS (LEGACY) =====
    // enterEditor, continueEditingLastMap, exitEditor, editorLoop removidos
    
    
    getGameState() {
        // Calcular rate de currency (base + bonus de plantas nucleares)
        const baseRate = this.serverBuildingConfig?.currency?.passiveRate || 3;
        const nuclearBonus = this.currency.getNuclearPlantBonus();
        const totalRate = baseRate + nuclearBonus;
        
        return {
            fobCurrency: this.currency.get(),
            currencyRate: totalRate,
            countdown: this.countdown
        };
    }
    
    /**
     * Añade currency temporal de la misión (por avance de terreno)
     */
    addMissionCurrency(amount) {
        this.currency.add(amount);
    }
    
    /**
     * Gasta currency temporal de la misión
     */
    spendMissionCurrency(amount) {
        return this.currency.spend(amount);
    }
    
    /**
     * Obtiene la currency actual de la misión
     */
    getMissionCurrency() {
        return this.currency.get();
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Maneja solicitud de construcción
     * ⚠️ LEGACY REMOVED: Este método solo debería usarse en modo tutorial o como fallback.
     * En producción, TODO debe ir a través del servidor autoritativo vía NetworkManager.
     * @param {string} buildingId - ID del edificio a construir
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     */
    handleBuildRequest(buildingId, x, y) {
        // ⚠️ LEGACY: Este método solo debería ejecutarse en tutorial o modo offline.
        // En producción, BuildingSystem ya delega al servidor vía NetworkManager.requestBuild().
        // TODO: Verificar si todavía se necesita este método o si puede eliminarse completamente.
        
        console.warn('⚠️ LEGACY: handleBuildRequest llamado - debería usar NetworkManager.requestBuild()');
        
        // Mantener código legacy solo para compatibilidad con tutorial/offline
        // Si el juego tiene NetworkManager, debería delegar al servidor
        if (this.network && this.network.roomId) {
            console.warn('⚠️ LEGACY: Redirigiendo a servidor autoritativo');
            this.network.requestBuild(buildingId, x, y);
            return;
        }
        
        // ⚠️ LEGACY: Código legacy mantenido solo para tutorial/offline
        // TODO: Migrar toda esta lógica al servidor o eliminar completamente
        console.warn('⚠️ LEGACY: Ejecutando código legacy de construcción - esto debería estar en el servidor');
    }
    /**
     * Verifica si se puede pagar un edificio
     */
    canAffordBuilding(buildingId) {
        // 🆕 NUEVO: Para drones, usar getDroneCost() que incluye el descuento del taller de drones
        let cost;
        if (this.buildSystem && this.buildSystem.isDroneWorkshopItem(buildingId)) {
            cost = this.buildSystem.getDroneCost(buildingId);
        } else {
            cost = this.serverBuildingConfig?.costs?.[buildingId] || 0;
        }
        return this.getMissionCurrency() >= cost;
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Maneja solicitud de drone
     * @param {Object} targetBase - Base objetivo del drone
     */
    handleDroneRequest(targetBase) {
        
        // Validar objetivo
        const validTargetTypes = ['fob', 'nuclearPlant', 'intelRadio', 'antiDrone', 'campaignHospital', 'droneLauncher', 'truckFactory', 'engineerCenter', 'intelCenter', 'aerialBase'];
        const isEnemyTarget = targetBase.team !== this.myTeam && validTargetTypes.includes(targetBase.type);
        
        
        // Validar currency
        // 🆕 NUEVO: Usar getDroneCost() que incluye el descuento del taller de drones
        const droneCost = this.buildSystem ? this.buildSystem.getDroneCost() : (this.serverBuildingConfig?.costs?.drone || 0);
        if (!this.canAffordBuilding('drone')) {
            return;
        }
        
        // Descontar currency
        if (!this.spendMissionCurrency(droneCost)) {
            return;
        }
        
        // Lanzar drone desde el borde izquierdo
        const droneStartX = 0;
        const droneStartY = targetBase.y;
        
        this.droneSystem.launchDrone(droneStartX, droneStartY, targetBase);
        this.matchStats.dronesLaunched++;
        
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Maneja solicitud de tanque
     * ⚠️ DEPRECATED: Este método ya no se usa. El flujo correcto es BuildingSystem.launchTank() → network.requestTank()
     * El servidor maneja toda la validación y consumo de dinero autoritativamente.
     * @param {Object} targetBase - Base objetivo del tanque
     */
    handleTankRequest(targetBase) {
        // ⚠️ DEPRECATED: Este método ya no se usa en el flujo normal
        // El consumo de dinero y validación se hace en el servidor
        // Solo mantener para compatibilidad si se llama desde algún lugar legacy
        
        // Validar objetivo (no puede atacar FOBs ni HQs)
        const validTargetTypes = ['nuclearPlant', 'antiDrone', 'campaignHospital', 'droneLauncher', 'truckFactory', 'engineerCenter', 'intelRadio', 'intelCenter', 'aerialBase', 'vigilanceTower'];
        const isEnemyTarget = targetBase.team !== this.myTeam && validTargetTypes.includes(targetBase.type);
        
        if (!isEnemyTarget) {
            return;
        }
        
        // ⚠️ NO CONSUMIR DINERO AQUÍ - El servidor lo hace autoritativamente
        // Solo validar UI para feedback inmediato
        if (!this.canAffordBuilding('tank')) {
            console.log('⚠️ No tienes suficiente currency para tanque');
            return;
        }
        
        // Lanzar tanque - delegar al servidor autoritativo
        if (!this.network || !this.network.roomId) {
            console.error('❌ No hay conexión al servidor. No se puede lanzar tanque.');
            return;
        }
        
        console.log(`🛡️ Enviando tank_request: target=${targetBase.id}`);
        this.network.requestTank(targetBase.id);
        
        this.matchStats.tanksLaunched = (this.matchStats.tanksLaunched || 0) + 1;
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Maneja solicitud de sniper
     * @param {Object} targetFront - Frente o comando objetivo del sniper
     */
    handleSniperRequest(targetFront) {
        
        // 🆕 NUEVO: Validar objetivo (puede ser frente o comando enemigo)
        const isValidTarget = targetFront.team !== this.myTeam && 
                              (targetFront.type === 'front' || targetFront.type === 'specopsCommando');
        
        if (!isValidTarget) {
            return;
        }
        
        // Validar currency
        const sniperCost = this.serverBuildingConfig?.costs?.sniperStrike || 0;
        if (!this.canAffordBuilding('sniperStrike')) {
            return;
        }
        
        // Descontar currency
        if (!this.spendMissionCurrency(sniperCost)) {
            return;
        }
        
        // Reproducir sonido
        this.audio.sounds.sniperShoot.play();
        
        // === LEGACY REMOVED: applyPenalty() eliminado ===
        // El servidor maneja todas las penalizaciones por sniper strike.
        // Ver: server/game/handlers/CombatHandler.js
        
        // Crear efecto visual
        this.particleSystem.createFloatingSprite(targetFront.x, targetFront.y - 40, 'ui-sniper-kill');
        
        // === LEGACY REMOVED: NO modificar matchStats aquí ===
        // El servidor maneja todas las estadísticas.
        
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Maneja solicitud de sabotaje FOB
     * @param {Object} targetFOB - FOB objetivo del sabotaje
     */
    handleFobSabotageRequest(targetFOB) {
        
        // Validar objetivo
        const isEnemyFOB = targetFOB.team !== this.myTeam && targetFOB.type === 'fob';
        
        if (!isEnemyFOB) {
            return;
        }
        
        // Validar currency
        if (!this.canAffordBuilding('fobSabotage')) {
            return;
        }
        
        // Obtener configuración
        const fobSabotageConfig = getNodeConfig('fobSabotage');
        if (!fobSabotageConfig) {
            return;
        }
        
        // Descontar currency
        if (!this.spendMissionCurrency(fobSabotageConfig.cost)) {
            return;
        }
        
        // Aplicar efecto sabotaje
        // ✅ CORREGIDO: Calcular porcentaje correctamente desde la configuración
        const speedPenalty = fobSabotageConfig.speedPenalty || 0.35;
        const penaltyPercent = ((1 - speedPenalty) * 100).toFixed(0);
        
        targetFOB.addEffect({
            type: 'fobSabotage',
            speedPenalty: speedPenalty,
            truckCount: fobSabotageConfig.truckCount,
            icon: fobSabotageConfig.effectIcon,
            tooltip: `Saboteada: -${penaltyPercent}% velocidad en los siguientes ${fobSabotageConfig.truckCount} camiones`
        });
        
        this.matchStats.snipersLaunched++; // Usar este contador temporalmente
        
        // Efecto visual
        if (this.particleSystem.createFallingSprite) {
            this.particleSystem.createFallingSprite(
                targetFOB.x,
                targetFOB.y - 80,
                'specops_unit',
                0.08
            );
        }
        
        // Sonido
        if (this.audio && this.audio.playChopperSound) {
            this.audio.playChopperSound();
        }
        
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Maneja solicitud de despliegue de comando especial operativo
     * @param {number} x - Posición X donde desplegar
     * @param {number} y - Posición Y donde desplegar
     */
    handleCommandoDeployRequest(x, y) {
        
        // Validar currency
        if (!this.canAffordBuilding('specopsCommando')) {
            return;
        }
        
        // Obtener configuración
        const commandoConfig = getNodeConfig('specopsCommando');
        if (!commandoConfig) {
            return;
        }
        
        // Descontar currency (el servidor es la autoridad)
        // El costo viene de serverBuildingConfig.costs.specopsCommando
        const commandoCost = this.serverBuildingConfig?.costs?.specopsCommando || commandoConfig.cost || 70;
        if (!this.spendMissionCurrency(commandoCost)) {
            return;
        }
        
        // Crear nodo del comando (similar a construir un edificio)
        this.handleBuildRequest('specopsCommando', x, y);
        
        // Sonido de despliegue de comando
        if (this.audio && this.audio.playCommandoDeploySound) {
            this.audio.playCommandoDeploySound();
        }
        
    }
    
    /**
     * Calcula el bonus de vehículos del HQ basado en Truck Factories construidas
     * @param {string} team - 'ally' o 'enemy'
     * @returns {number} Número de vehículos adicionales
     */
    getTruckFactoryBonus(team = 'ally') {
        const truckFactories = this.nodes.filter(n => 
            n.type === 'truckFactory' && 
            n.team === team && 
            n.constructed && 
            !n.isConstructing &&
            n.active &&
            !n.disabled // 🆕 NUEVO: No contar truckFactories disabled
        );
        return truckFactories.length; // +1 vehículo por cada fábrica
    }
    
    // === Acceso a sistemas (para InputHandler, BuildingSystem, ConvoyManager) ===
    get buildMode() { return this.buildSystem.isActive(); }
    get convoys() { return this.convoyManager.getConvoys(); }
    
    // === COMPATIBILIDAD: Helpers para sistemas que buscan bases/edificios ===
    get bases() { 
        // Retorna todos los nodos que son "bases" (map_node o buildable con sistema de vehículos)
        return this.nodes.filter(n => 
            n.category === 'map_node' || 
            n.category === 'enemy' || 
            (n.category === 'buildable' && n.hasVehicles)
        );
    }
    
    get buildings() {
        // Retorna nodos construibles que NO son bases tradicionales
        return this.nodes.filter(n => 
            n.category === 'buildable' && !n.hasVehicles
        );
    }
    
    get selectedBase() { return this.selectedNode; }
    set selectedBase(node) { this.selectedNode = node; }
    
    get hoveredBase() { return this.hoveredNode; }
    set hoveredBase(node) { this.hoveredNode = node; }
    
    get hoveredBuilding() { 
        return this.hoveredNode && this.hoveredNode.category === 'buildable' ? this.hoveredNode : null; 
    }
    set hoveredBuilding(node) { this.hoveredNode = node; }
    
    
    /**
     * Activa el estado de victoria
     */
    triggerVictory() {
        if (this.state === 'playing') {
            this.setGameState('victory');
            this.matchStats.endTime = Date.now();
            console.log('🎉 ¡PARTIDA GANADA!');
            
            // Mostrar overlay de victoria con estadísticas
            this.showVictoryStats();
            
            // Detener sonidos de batalla y reproducir música de victoria
            this.audio.stopBattleMusic();
            this.audio.playVictoryMarch();
        }
    }
    
    /**
     * Activa el estado de derrota
     */
    triggerDefeat() {
        if (this.state === 'playing') {
            this.setGameState('defeat');
            this.matchStats.endTime = Date.now();
            console.log('💀 ¡PARTIDA PERDIDA!');
            
            // Mostrar overlay de derrota con estadísticas
            this.showDefeatStats();
            
            // Detener sonidos de batalla
            this.audio.stopBattleMusic();
        }
    }
    
    /**
     * Muestra pantalla de victoria con estadísticas
     */
    showVictoryStats() {
        const victoryOverlay = document.getElementById('victory-overlay');
        if (!victoryOverlay) return;
        
        // Calcular duración de la partida
        const duration = this.matchStats.endTime - this.matchStats.startTime;
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Contar edificios finales
        const playerBuildings = this.nodes.filter(n => 
            n.category === 'buildable' && n.team === 'ally' && n.constructed
        ).length;
        const enemyBuildings = this.nodes.filter(n => 
            n.category === 'buildable' && n.team === 'player2' && n.constructed
        ).length;
        
        // Contar FOBs
        const playerFOBs = this.nodes.filter(n => n.type === 'fob' && n.team === 'ally' && n.constructed).length;
        const enemyFOBs = this.nodes.filter(n => n.type === 'enemy_fob' && n.constructed).length;
        
        // === LEGACY REMOVED: Stats de IA eliminadas ===
        // Las stats del enemigo ahora vienen del servidor si están disponibles
        
        // Construir HTML con las stats
        const statsHTML = `
            <div class="main-menu-container">
                <div class="menu-header">
                    <h1 class="menu-title" style="color: #4ecca3;">VICTORIA</h1>
                </div>
                
                <div class="stats-container" style="color: #ffffff; text-align: left; margin: 20px 0; padding: 20px; background: rgba(0,0,0,0.7); border-radius: 8px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 24px; font-weight: bold;">Duración: ${timeStr}</div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <h3 style="color: #4ecca3; margin-bottom: 10px;">TU RENDIMIENTO</h3>
                            <div>Currency final: ${this.getMissionCurrency()}$</div>
                            <div>FOBs: ${playerFOBs}</div>
                            <div>Edificios: ${playerBuildings}</div>
                            <div>Drones: ${this.matchStats.dronesLaunched}</div>
                            <div>Snipers: ${this.matchStats.snipersLaunched}</div>
                            <div>Convoyes: ${this.matchStats.convoysDispatched}</div>
                            <div>Emergencias: ${this.matchStats.emergenciesResolved}/${this.matchStats.emergenciesResolved + this.matchStats.emergenciesFailed}</div>
                        </div>
                        
                        <div>
                            <h3 style="color: #e74c3c; margin-bottom: 10px;">ENEMIGO</h3>
                            <div>FOBs: ${enemyFOBs}</div>
                            <div>Edificios: ${enemyBuildings}</div>
                            <div style="color: #888; font-size: 12px;">Stats del enemigo disponibles desde el servidor</div>
                        </div>
                    </div>
                </div>
                
                <div class="menu-actions">
                    <button id="victory-menu-btn" class="menu-btn primary">Volver al Menú</button>
                </div>
            </div>
        `;
        
        victoryOverlay.innerHTML = statsHTML;
        this.overlayManager.showOverlay('victory-overlay');
        
        // Reconectar el botón
        const btn = document.getElementById('victory-menu-btn');
        if (btn) {
            btn.onclick = () => this.returnToMenuFromGame();
        }
    }
    
    /**
     * Muestra pantalla de derrota con estadísticas
     */
    showDefeatStats() {
        const defeatOverlay = document.getElementById('defeat-overlay');
        if (!defeatOverlay) return;
        
        // Calcular duración de la partida
        const duration = this.matchStats.endTime - this.matchStats.startTime;
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Contar edificios finales
        const playerBuildings = this.nodes.filter(n => 
            n.category === 'buildable' && n.team === 'ally' && n.constructed
        ).length;
        const enemyBuildings = this.nodes.filter(n => 
            n.category === 'buildable' && n.team === 'player2' && n.constructed
        ).length;
        
        // Contar FOBs
        const playerFOBs = this.nodes.filter(n => n.type === 'fob' && n.team === 'ally' && n.constructed).length;
        const enemyFOBs = this.nodes.filter(n => n.type === 'enemy_fob' && n.constructed).length;
        
        // === LEGACY REMOVED: Stats de IA eliminadas ===
        // Las stats del enemigo ahora vienen del servidor si están disponibles
        
        // Construir HTML con las stats
        const statsHTML = `
            <div class="main-menu-container">
                <div class="menu-header">
                    <h1 class="menu-title" style="color: #e74c3c;">DERROTA</h1>
                </div>
                
                <div class="stats-container" style="color: #ffffff; text-align: left; margin: 20px 0; padding: 20px; background: rgba(0,0,0,0.7); border-radius: 8px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 24px; font-weight: bold;">Duración: ${timeStr}</div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <h3 style="color: #4ecca3; margin-bottom: 10px;">TU RENDIMIENTO</h3>
                            <div>Currency final: ${this.getMissionCurrency()}$</div>
                            <div>FOBs: ${playerFOBs}</div>
                            <div>Edificios: ${playerBuildings}</div>
                            <div>Drones: ${this.matchStats.dronesLaunched}</div>
                            <div>Snipers: ${this.matchStats.snipersLaunched}</div>
                            <div>Convoyes: ${this.matchStats.convoysDispatched}</div>
                            <div>Emergencias: ${this.matchStats.emergenciesResolved}/${this.matchStats.emergenciesResolved + this.matchStats.emergenciesFailed}</div>
                        </div>
                        
                        <div>
                            <h3 style="color: #e74c3c; margin-bottom: 10px;">ENEMIGO</h3>
                            <div>FOBs: ${enemyFOBs}</div>
                            <div>Edificios: ${enemyBuildings}</div>
                            <div style="color: #888; font-size: 12px;">Stats del enemigo disponibles desde el servidor</div>
                        </div>
                    </div>
                </div>
                
                <div class="menu-actions">
                    <button id="defeat-menu-btn" class="menu-btn primary">Volver al Menú</button>
                </div>
            </div>
        `;
        
        defeatOverlay.innerHTML = statsHTML;
        this.overlayManager.showOverlay('defeat-overlay');
        
        // Reconectar el botón
        const btn = document.getElementById('defeat-menu-btn');
        if (btn) {
            btn.onclick = () => this.returnToMenuFromGame();
        }
    }
    
    /**
     * Inicializa la configuración de edificios desde el servidor (fallback local)
     */
    initializeLocalBuildingConfig() {
        // Importar la configuración del servidor directamente
        Promise.all([
            import('../server/config/serverNodes.js'),
            import('../server/config/gameConfig.js')
        ]).then(([serverNodesModule, gameConfigModule]) => {
            const { SERVER_NODE_CONFIG } = serverNodesModule;
            const { GAME_CONFIG } = gameConfigModule;
            
            // Usar la configuración real del servidor
            this.serverBuildingConfig = {
                costs: SERVER_NODE_CONFIG.costs,
                buildTimes: SERVER_NODE_CONFIG.buildTimes,
                effects: SERVER_NODE_CONFIG.effects, // 🆕 Efectos de edificios (incluye taller de drones)
                descriptions: SERVER_NODE_CONFIG.descriptions,
                capacities: SERVER_NODE_CONFIG.capacities,
                gameplay: SERVER_NODE_CONFIG.gameplay,
                buildRadii: SERVER_NODE_CONFIG.buildRadius || {}, // 🆕 Radio de construcción
                detectionRadii: SERVER_NODE_CONFIG.detectionRadius,
                specialNodes: SERVER_NODE_CONFIG.specialNodes || {}, // 🆕 NUEVO: Nodos especiales (camera drone, commando, truck assault)
                temporaryEffects: SERVER_NODE_CONFIG.temporaryEffects || {}, // 🆕 NUEVO: Efectos temporales (trained, wounded)
                vehicleTypes: SERVER_NODE_CONFIG.vehicleTypes || {}, // 🆕 NUEVO: Tipos de vehículos
                vehicleSystems: SERVER_NODE_CONFIG.vehicleSystems || {}, // 🆕 NUEVO: Sistemas de vehículos por tipo de nodo
                security: SERVER_NODE_CONFIG.security,
                abandonment: GAME_CONFIG.abandonment, // 🆕 NUEVO: Configuración de abandono (tiempos de fases)
                behavior: {
                    enabled: SERVER_NODE_CONFIG.gameplay.enabled,
                    behavior: SERVER_NODE_CONFIG.gameplay.behavior
                },
                // 🆕 AGREGAR: Configuración de rutas y currency desde gameConfig
                routes: {
                    valid: {
                        'hq': ['fob'],
                        'fob': ['front', 'fob'],
                        'front': []
                    },
                    raceSpecial: {}
                },
                currency: {
                    passiveRate: 3,
                    pixelsPerCurrency: 2,
                    currencyName: 'Terreno Ganado'
                },
                frontMovement: {
                    advanceSpeed: 3,
                    retreatSpeed: 3
                },
                vehicles: {
                    // ⚠️ LEGACY: speed no se usa en multijugador (servidor autoritativo)
                    // Solo se mantiene para compatibilidad con código legacy
                    heavy_truck: { capacity: 15 },
                    truck: { capacity: 15 },
                    helicopter: { capacity: 100 },
                    ambulance: { capacity: 0 }
                }
            };
            
        }).catch(error => {
            
            // Fallback: usar configuración básica si falla la importación
            this.serverBuildingConfig = {
                costs: { fob: 120, antiDrone: 115, droneLauncher: 100 },
                buildTimes: { fob: 4, antiDrone: 4.5, droneLauncher: 2 },
                descriptions: {},
                capacities: {},
                gameplay: {},
                detectionRadii: {},
                security: {},
                behavior: { enabled: {}, behavior: {} },
                // 🆕 AGREGAR: Configuración básica de rutas y currency
                routes: {
                    valid: {
                        'hq': ['fob'],
                        'fob': ['front', 'fob'],
                        'front': []
                    },
                    raceSpecial: {}
                },
                currency: {
                    passiveRate: 3,
                    pixelsPerCurrency: 2,
                    currencyName: 'Terreno Ganado'
                },
                frontMovement: {
                    advanceSpeed: 3,
                    retreatSpeed: 3
                },
                vehicles: {
                    // ⚠️ LEGACY: speed no se usa en multijugador (servidor autoritativo)
                    // Solo se mantiene para compatibilidad con código legacy
                    heavy_truck: { capacity: 15 },
                    truck: { capacity: 15 },
                    helicopter: { capacity: 100 },
                    ambulance: { capacity: 0 }
                }
            };
        });
    }
    
    /**
     * 🆕 NUEVO: Obtiene la configuración de tipos de vehículos habilitados para un nodo
     * @param {string} nodeType - Tipo de nodo (hq, fob, front, etc.)
     * @returns {Array<string>} Array de IDs de tipos de vehículos habilitados
     */
    getEnabledVehicleTypes(nodeType) {
        const vehicleSystems = this.serverBuildingConfig?.vehicleSystems || {};
        const vehicleTypes = this.serverBuildingConfig?.vehicleTypes || {};
        const system = vehicleSystems[nodeType];
        
        if (!system) return [];
        
        // Filtrar solo tipos habilitados y que existan en vehicleTypes
        return system.enabledTypes.filter(typeId => {
            const vehicleType = vehicleTypes[typeId];
            return vehicleType && vehicleType.enabled;
        });
    }
    
    /**
     * 🆕 NUEVO: Obtiene la configuración de un tipo de vehículo
     * @param {string} vehicleTypeId - ID del tipo de vehículo
     * @returns {Object|null} Configuración del tipo de vehículo o null si no existe
     */
    getVehicleTypeConfig(vehicleTypeId) {
        const vehicleTypes = this.serverBuildingConfig?.vehicleTypes || {};
        return vehicleTypes[vehicleTypeId] || null;
    }
    
    /**
     * 🆕 NUEVO: Obtiene el número de vehículos disponibles de un tipo específico en un nodo
     * @param {Object} node - Nodo visual
     * @param {string} vehicleTypeId - ID del tipo de vehículo
     * @returns {number} Número de vehículos disponibles
     */
    getAvailableVehicleCount(node, vehicleTypeId) {
        const vehicleType = this.getVehicleTypeConfig(vehicleTypeId);
        if (!vehicleType) return 0;
        
        if (vehicleType.usesStandardSystem) {
            // Sistema estándar: usa availableVehicles/maxVehicles
            return node.availableVehicles || 0;
        } else {
            // Sistema personalizado: usa la propiedad especificada
            const availableProp = vehicleType.availableProperty;
            if (availableProp === 'availableAmbulances') {
                return node.ambulanceAvailable ? 1 : 0;
            } else if (availableProp === 'availableHelicopters') {
                return node.availableHelicopters || 0;
            } else if (availableProp === 'landedHelicopters') {
                return (node.landedHelicopters || []).length;
            } else if (availableProp === 'availableRepairVehicles') {
                return (node.availableRepairVehicles || 0);
            }
        }
        
        return 0;
    }
    
    /**
     * 🆕 NUEVO: Obtiene el máximo de vehículos de un tipo específico en un nodo
     * @param {Object} node - Nodo visual
     * @param {string} vehicleTypeId - ID del tipo de vehículo
     * @returns {number} Número máximo de vehículos
     */
    getMaxVehicleCount(node, vehicleTypeId) {
        const vehicleType = this.getVehicleTypeConfig(vehicleTypeId);
        if (!vehicleType) return 0;
        
        if (vehicleType.usesStandardSystem) {
            // Sistema estándar: usa maxVehicles
            return node.maxVehicles || node.baseMaxVehicles || 0;
        } else {
            // Sistema personalizado: usa la propiedad especificada
            const maxProp = vehicleType.maxProperty;
            if (maxProp === 'maxAmbulances') {
                return node.maxAmbulances || 0;
            } else if (maxProp === 'maxHelicopters') {
                return node.maxHelicopters || 0;
            } else if (maxProp === 'maxRepairVehicles') {
                return node.maxRepairVehicles || 0;
            }
        }
        
        return 0;
    }
    
    /**
     * 🆕 NUEVO: Verifica si un vehículo de un tipo específico está disponible
     * @param {Object} node - Nodo visual
     * @param {string} vehicleTypeId - ID del tipo de vehículo
     * @returns {boolean} True si el vehículo está disponible
     */
    isVehicleAvailable(node, vehicleTypeId) {
        const vehicleType = this.getVehicleTypeConfig(vehicleTypeId);
        if (!vehicleType) return false;
        
        if (vehicleType.usesStandardSystem) {
            return (node.availableVehicles || 0) > 0;
        } else {
            const availabilityProp = vehicleType.availabilityProperty;
            if (availabilityProp === 'ambulanceAvailable') {
                return node.ambulanceAvailable || false;
            } else if (availabilityProp === 'landedHelicopters') {
                return (node.landedHelicopters || []).length > 0;
            } else if (availabilityProp === 'availableHelicopters') {
                return (node.availableHelicopters || 0) > 0;
            } else if (availabilityProp === 'repairVehicleAvailable') {
                return (node.availableRepairVehicles || 0) > 0;
            }
        }
        
        return false;
    }
}