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
import { AntiDroneSystem } from './systems/AntiDroneSystem.js';
import { FrontMovementSystem } from './systems/FrontMovementSystem.js';
import { TerritorySystem } from './systems/TerritorySystem.js';
import { BackgroundTileSystem } from './systems/BackgroundTileSystem.js';
import { CameraController } from './systems/CameraController.js';
import { LoadingScreenManager } from './systems/LoadingScreenManager.js';
import { CurrencyManager } from './systems/CurrencyManager.js';
import { StoreUIManager } from './systems/StoreUIManager.js';
import { RoadSystem } from './utils/RoadSystem.js';
import { OptionsManager } from './systems/OptionsManager.js';
import { ArsenalManager } from './systems/ArsenalManager.js';
import { EnemyAISystem } from './systems/EnemyAISystem.js';
import { AIDirector } from './ai/AIDirector.js';
import { TutorialSystem } from './systems/TutorialSystem.js';
import { TutorialManager } from './systems/TutorialManager.js';
import { NetworkManager } from './systems/NetworkManager.js';
import { RaceSelectionManager } from './systems/RaceSelectionManager.js';
import { GAME_CONFIG } from './config/constants.js';
// ELIMINADO: MAP_CONFIG, calculateAbsolutePosition - Ya no se genera el mapa en el cliente
import { getNodeConfig } from './config/nodes.js';

// === CONFIGURACIÓN DE SISTEMA DE IA ===
// 'legacy' = EnemyAISystem (umbrales fijos + RNG)
// 'hybrid' = AIDirector (scoring contextual) + EnemyAISystem (ejecución)
// 'modular' = AIDirector completo (futuro)
const AI_SYSTEM_MODE = 'hybrid';

export class Game {
    constructor(canvas) {
        // Canvas y dimensiones
        this.canvas = canvas;
        
        // Sistemas especializados
        this.assetManager = new AssetManager();
        this.renderer = new RenderSystem(canvas, this.assetManager, this);
        this.ui = new UIManager(this);
        this.audio = new AudioManager();
        this.loadingScreen = new LoadingScreenManager();
        this.currency = new CurrencyManager(this);
        this.particleSystem = new ParticleSystem(this);
        this.roadSystem = new RoadSystem(this);
        this.buildSystem = new BuildingSystem(this);
        this.storeUI = new StoreUIManager(this.assetManager, this.buildSystem, this);
        this.options = new OptionsManager(this.audio);
        this.arsenal = new ArsenalManager(this.assetManager);
        this.convoyManager = new ConvoyManager(this);
        this.medicalSystem = new MedicalEmergencySystem(this);
        this.droneSystem = new DroneSystem(this);
        this.antiDroneSystem = new AntiDroneSystem(this);
        this.frontMovement = new FrontMovementSystem(this);
        this.territory = new TerritorySystem(this);
        this.camera = new CameraController(this);
        this.inputHandler = new InputHandler(this);
        
        // Sistema de IA (configurable)
        this.aiSystemMode = AI_SYSTEM_MODE;
        this.enemyAI = null; // Se inicializará según la dificultad seleccionada
        
        if (this.aiSystemMode === 'hybrid' || this.aiSystemMode === 'modular') {
            this.aiDirector = new AIDirector(this);
            console.log(`🤖 Sistema IA: ${this.aiSystemMode.toUpperCase()} - AIDirector + EnemyAISystem`);
        } else {
            console.log(`🤖 Sistema IA: LEGACY - Solo EnemyAISystem`);
        }
        
        this.tutorialSystem = new TutorialSystem(this);
        this.tutorialManager = new TutorialManager(this);
        
        // Sistema de selección de raza
        this.raceSelection = new RaceSelectionManager(this);
        this.selectedRace = null; // Se establecerá cuando el usuario seleccione una raza
        
        // Sistema de red (multijugador)
        this.network = new NetworkManager(this);
        // 🆕 NUEVO: Hacer NetworkManager disponible globalmente para botones HTML
        window.networkManager = this.network;
        this.isMultiplayer = false;
        this.myTeam = 'ally'; // Por defecto en singleplayer
        
        // 🆕 SERVIDOR COMO AUTORIDAD: Configuración de edificios para singleplayer
        this.serverBuildingConfig = null;
        
        // Configurar canvas
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // 🆕 SERVIDOR COMO AUTORIDAD: Inicializar configuración de edificios para singleplayer
        this.initializeSingleplayerBuildingConfig();
        
        // Estado del juego
        this.state = 'menu'; // menu, playing, paused, editor
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
     * @param {string} raceId - ID de la raza seleccionada
     */
    onRaceSelected(raceId) {
        this.selectedRace = raceId;
        console.log(`🏛️ Raza seleccionada: ${raceId}`);
        
        // 🎯 NUEVO: Establecer myTeam en singleplayer
        if (!this.isMultiplayer) {
            this.myTeam = 'player1';
        }
        
        // Actualizar sistemas con la nueva raza
        this.storeUI.setRace(raceId);
        this.buildSystem.setRace(raceId);
        
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
        this.ui.hideElement('timer-display');
        this.ui.hideElement('fob-currency-display');
        this.ui.hideElement('dev-supply-enemy-btn');
        this.ui.hideElement('pause-btn');
        
        // Ocultar pantalla de carga y mostrar "Press to Continue"
        this.loadingScreen.hide();
        this.loadingScreen.showPressToContinue(() => {
            // CRÍTICO: Desbloquear el contexto de audio del navegador
            this.audio.unlockAudioContext();
            
            // Al hacer clic, mostrar el menú principal (esto activará el audio)
            if (this.state === 'menu') {
                this.showMainMenu();
            }
        });
    }
    
    startMission() {
        this.state = 'playing';
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
        this.paused = false;
        
        // Resetear currency
        this.currency.reset();
        
        // Resetear sistemas
        this.buildSystem.resetLevel();
        this.medicalSystem.reset();
        this.frontMovement.resetLevel();
        this.territory.reset();
        this.audio.resetEventFlags();
        
        // Inicializar IA con dificultad seleccionada
        if (!this.enemyAI) {
            this.initializeEnemyAI();
        } else {
            this.enemyAI.reset();
        }
        
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
        
        // 🆕 NUEVO: Crear helicóptero inicial si la raza es B_Nation
        if (this.selectedRace === 'B_Nation') {
            this.createInitialHelicopter();
        }
        
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
     * 🆕 NUEVO: Crea el helicóptero inicial para B_Nation en singleplayer
     */
    createInitialHelicopter() {
        // Buscar el HQ del jugador
        const hq = this.nodes.find(n => n.type === 'hq' && n.team === 'ally');
        if (!hq) {
            console.error('❌ No se encontró HQ del jugador para crear helicóptero');
            return;
        }
        
        // Crear helicóptero
        const heli = {
            id: `heli_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            team: 'ally',
            state: 'landed',
            currentNodeId: hq.id,
            targetNodeId: null,
            progress: null,
            initialDistance: null,
            cargo: 0
        };
        
        this.helicopters.push(heli);
        hq.landedHelicopters.push(heli.id);
        
        console.log(`🚁 SINGLEPLAYER: Helicóptero ${heli.id} creado en HQ`);
    }
    
    // ELIMINADO: generateBases() y shouldGenerateFOBs()
    // El servidor ahora genera el mapa inicial (GameStateManager.getInitialState)
    // El cliente recibe los nodos ya generados vía NetworkManager.loadInitialState
    
    /**
     * 🆕 NUEVO: Despega un helicóptero desde un nodo hacia otro (singleplayer)
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
            console.log(`🚁 SINGLEPLAYER: Helicóptero cargó 100 suministros del HQ`);
        }
        
        // Validar cargo según destino
        
        // FRONT: necesita al menos 50 de cargo
        if (toNode.type === 'front' && heli.cargo < 50) {
            console.error(`❌ Sin suficientes suministros para Front (necesita 50, tiene ${heli.cargo})`);
            return false;
        }
        
        // HQ: acepta helicópteros con cualquier cargo (recarga infinita siempre disponible)
        
        // BASE AÉREA: acepta cualquier helicóptero que no esté lleno
        const isAerialBase = toNode.type === 'aerialBase' || toNode.isAerialBase;
        if (isAerialBase) {
            // Ya está lleno - no necesita recargar
            if (heli.cargo >= 100) {
                console.error('❌ El helicóptero ya está lleno - no necesita recargar');
                return false;
            }
            
            // Base sin suministros
            if (toNode.supplies <= 0) {
                console.error('❌ La Base Aérea no tiene suministros disponibles');
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
        
        console.log(`🚁 SINGLEPLAYER: Helicóptero despegó de ${fromNode.type} hacia ${toNode.type}`);
        
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
        
        // Manejar tutorial por separado (solo si NO es multijugador)
        if (this.state === 'tutorial' && !this.isMultiplayer) {
            this.tutorialManager.update(dt);
            this.tutorialManager.render();
        } else {
            // Lógica normal del juego
            if (this.state === 'playing' && !this.paused) {
                this.update(dt);
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
        // === MULTIJUGADOR: SOLO RENDERIZADO, SIN SIMULACIÓN ===
        if (this.isMultiplayer) {
            // En multijugador, el servidor simula TODO
            // Cliente solo actualiza:
            // - Partículas (efectos visuales locales)
            // - Posiciones visuales de convoyes (basadas en progress del servidor)
            // - UI y HUD
            // - Input del mouse
            
            this.particleSystem.update(dt);
            this.ui.updateHUD(this.getGameState());
            this.inputHandler.updateHoverTooltip();
            
            // Actualizar ping/latencia
            this.network.update(dt);
            
            // Actualizar sistema de carreteras (renderizado)
            if (this.roadSystem) {
                this.roadSystem.update();
            }
            
            // CRÍTICO: Actualizar SOLO posiciones visuales de convoyes con interpolación suave
            // El progress viene del servidor, pero necesitamos interpolar suavemente entre frames
            for (const convoy of this.convoyManager.convoys) {
                convoy.update(dt); // Llama al método update() que maneja la interpolación
            }
            
            // 🆕 NUEVO: Actualizar helicópteros con interpolación suave (igual que convoys)
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
            
            // Interpolación suave de drones (usando sistema centralizado)
            for (const drone of this.droneSystem.getDrones()) {
                interpolatePosition(drone, dt, { 
                    speed: 8.0,
                    threshold: 1.0,
                    snapThreshold: 0.1
                });
            }
            
            // CRÍTICO: NO ejecutar simulación en multijugador
            return;
        }
        
        // === MODO OBSOLETO: Este código ya no se usa ===
        // Todo el juego ahora funciona con servidor autoritativo (incluso vs IA)
        console.warn('⚠️ Código de simulación local ejecutándose - esto no debería pasar');
        
        // Actualizar partículas y UI
        this.particleSystem.update(dt);
        this.ui.updateHUD(this.getGameState());
        
        // Actualizar tooltip de hover (verifica si ha pasado el tiempo necesario)
        this.inputHandler.updateHoverTooltip();
        
        // Actualizar estado de la tienda de construcción
        // Store UI se actualiza automáticamente en render()
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
        
        if (this.isMultiplayer && this.network && this.network.lastGameState) {
            // En multiplayer, usar tiempo del servidor (redondear a segundos)
            gameTime = Math.floor(this.network.lastGameState.gameTime || 0);
        } else if (this.matchStats && this.matchStats.startTime) {
            // En singleplayer, calcular desde el inicio de la partida
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
            this.state = 'playing';
            console.log('⚠️ FORZADO: Cambiado de tutorial a playing en multijugador');
        }
        
        this.renderer.clear();
        
        // Debug para multijugador
        if (this.isMultiplayer && this.nodes.length === 0) {
            console.warn('⚠️ RENDER: Sin nodos en multijugador!');
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
        this.renderer.renderBackgroundRoutes(this.nodes);
        
        
        // Carreteras debajo del territorio y de todo lo demás (solo por encima del fondo)
        this.roadSystem.render(this.renderer.ctx, this.assetManager);
        
        // Renderizar territorio controlado (debajo de las bases, por encima de carreteras)
        this.territory.render(this.renderer.ctx);
        
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
            console.log(`🚚 Renderizando ${convoys.length} convoyes`);
            this._convoyRenderLogged = true;
        }
        convoys.forEach(convoy => this.renderer.renderConvoy(convoy));
        
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
        
        // Renderizar partículas
        this.particleSystem.getParticles().forEach(p => this.renderer.renderParticle(p));
        this.particleSystem.getExplosionSprites().forEach(e => this.renderer.renderExplosionSprite(e));
        
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
        
        // Preview de construcción o dron
        if (this.buildSystem.isActive()) {
            const mousePos = this.inputHandler.getMousePosition();
            
            if (this.buildSystem.droneMode) {
                // Preview del dron: círculo vacío con X roja (o vacío si objetivo válido)
                this.renderer.renderDronePreview(mousePos.x, mousePos.y, this.hoveredNode);
            } else if (this.buildSystem.sniperMode) {
                // Preview del francotirador: mira con sprite de sniper
                this.renderer.renderSniperCursor(mousePos.x, mousePos.y, this.hoveredNode);
            } else if (this.buildSystem.fobSabotageMode) {
                // Preview del sabotaje: cursor specops_selector
                this.renderer.renderFobSabotageCursor(mousePos.x, mousePos.y, this.hoveredNode);
            } else if (this.buildSystem.commandoMode) {
                // Preview del comando: usar preview normal de construcción
                this.renderer.renderBuildPreview(mousePos.x, mousePos.y, this.nodes, 'specopsCommando');
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
                () => this.restartMission(), // Reiniciar misión
                () => this.returnToMenuFromGame() // Volver al menú principal
            );
        } else {
            this.ui.hidePauseMenu();
        }
        // Pausa toggled (silencioso)
    }

    restartMission() {
        // Reiniciar misión actual limpiamente
        this.ui.hidePauseMenu();
        this.state = 'playing';
        this.paused = false;
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.textContent = '⏸️';
            pauseBtn.classList.remove('paused');
        }
        // Re-cargar la misión actual y arrancar
        this.startMission();
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
        
        // Ocultar overlays de victoria/derrota
        const victoryOverlay = document.getElementById('victory-overlay');
        const defeatOverlay = document.getElementById('defeat-overlay');
        if (victoryOverlay) victoryOverlay.classList.add('hidden');
        if (defeatOverlay) defeatOverlay.classList.add('hidden');
        
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
        }
        
        // Resetear selector de dificultad PRIMERO (antes de cambiar estado)
        if (this.inputHandler && this.inputHandler.resetDifficultySelector) {
            this.inputHandler.resetDifficultySelector();
        }
        
        this.state = 'menu';
        // Limpiar canvas para que no quede frame congelado
        this.renderer.clear();
        
        this.showMainMenu();
    }
    
    showMainMenu() {
        this.state = 'menu';
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
     * Inicializa la IA enemiga con la dificultad seleccionada
     */
    initializeEnemyAI() {
        if (this.enemyAI) {
            // Si ya existe, limpiar referencias
            this.enemyAI = null;
        }
        this.enemyAI = new EnemyAISystem(this, this.aiDifficulty);
        console.log(`🤖 IA inicializada con dificultad: ${this.aiDifficulty}`);
    }
    
    // ELIMINADO: setAIDifficulty, startGameFromMenu, onRaceSelected
    // Ahora todo se maneja desde el lobby unificado con servidor autoritativo
    
    /**
     * Inicia el tutorial desde el menú principal
     */
    startTutorialFromMenu() {
        // Verificar que los assets estén listos antes de continuar
        if (!this.assetManager.allLoaded) {
            console.log('⚠️ Esperando a que terminen de cargar los assets...');
            return;
        }
        
        console.log('📚 Iniciando tutorial...');
        
        this.state = 'tutorial'; // Estado separado para el tutorial
        this.ui.hideMainMenu();
        
        // Iniciar tutorial con su propio sistema
        this.tutorialManager.startTutorial();
    }
    
    /**
     * DEPRECATED - Método obsoleto, ahora el tutorial es manejado por TutorialManager
     */
    startTutorialMission() {
        console.warn('⚠️ startTutorialMission() está obsoleto');
        this.state = 'playing';
        this.score = 0;
        this.deliveries = 0;
        this.nodes = []; // Limpiar todos los nodos
        this.convoyManager.clear();
        this.particleSystem.clear();
        
        // Botones de debug desactivados para producción
        // const debugBtn = document.getElementById('toggle-debug-btn');
        // if (debugBtn) debugBtn.style.display = 'block';
        this.droneSystem.clear();
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
        this.enemyAI.reset();
        
        // Desactivar IA enemiga para el tutorial
        this.enemyAI.setEnabled(false);
        if (this.aiDirector) {
            this.aiDirector.deactivate();
        }
        
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
        
        console.log('✅ Mapa del tutorial cargado');
        
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
        console.log('🔧 Creando mapa del tutorial...');
        
        const tutorialMap = this.tutorialManager.getTutorialMap();
        console.log('📋 Configuración del tutorial:', tutorialMap);
        
        tutorialMap.nodes.forEach((nodeData, index) => {
            console.log(`🔧 Creando nodo ${index + 1}:`, nodeData);
            
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
                console.log(`✅ Nodo ${nodeData.type} creado en (${nodeData.x}, ${nodeData.y})`);
            } else {
                console.error(`❌ Error creando nodo ${nodeData.type}`);
            }
        });
        
        console.log(`✅ Mapa del tutorial completado: ${this.nodes.length} nodos creados`);
        console.log('📍 Nodos creados:', this.nodes.map(n => `${n.type} en (${n.x}, ${n.y})`));
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
     * 🆕 SERVIDOR COMO AUTORIDAD: Maneja solicitud de construcción en singleplayer
     * Esta es la lógica autoritativa que debería estar en el servidor
     * @param {string} buildingId - ID del edificio a construir
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     */
    handleBuildRequest(buildingId, x, y) {
        console.log(`🏗️ Pseudo-servidor: Procesando construcción de ${buildingId} en (${x}, ${y})`);
        
        // 🆕 NUEVO: Verificar si el edificio está habilitado
        const enabled = this.serverBuildingConfig?.behavior?.enabled?.[buildingId];
        if (enabled === false) {
            console.log(`🚫 Pseudo-servidor: ${buildingId} está deshabilitado`);
            return;
        }
        
        // Obtener costo desde configuración autoritativa del servidor
        const cost = this.serverBuildingConfig?.costs?.[buildingId];
        if (!cost) {
            console.error(`❌ Pseudo-servidor: Tipo de edificio inválido: ${buildingId}`);
            return;
        }
        
        // Validar currency (AUTORITATIVA)
        if (!this.canAffordBuilding(buildingId)) {
            console.log(`❌ Pseudo-servidor: Currency insuficiente (Necesitas: ${cost}, Tienes: ${this.getMissionCurrency()})`);
            return;
        }
        
        // 🆕 NUEVO: El comando se puede construir en territorio enemigo (ignorando validación de territorio aliado)
        const isCommando = buildingId === 'specopsCommando';
        
        if (!isCommando) {
            // Validar territorio (AUTORITATIVA) - solo para edificios normales
            if (!this.territory.isInAllyTerritory(x, y)) {
                console.log(`❌ Pseudo-servidor: Fuera de territorio`);
                return;
            }
            
            // Validar colisiones (AUTORITATIVA) - solo para edificios normales
            if (!this.buildSystem.isValidLocation(x, y, buildingId)) {
                console.log(`❌ Pseudo-servidor: Muy cerca de otro edificio`);
                return;
            }
        } else {
            // Para el comando: validar que esté en territorio ENEMIGO y que no esté muy cerca físicamente
            if (this.territory.isInAllyTerritory(x, y)) {
                console.log(`❌ Pseudo-servidor: El comando solo puede desplegarse en territorio enemigo`);
                return;
            }
            
            // 🆕 NUEVO: Validar que no haya torres de vigilancia enemigas cerca
            const myTeam = this.myTeam || 'ally';
            const enemyTowers = this.nodes.filter(n => 
                (n.type === 'vigilanceTower' || n.isVigilanceTower) &&
                n.team !== myTeam &&
                n.active &&
                n.constructed &&
                !n.isAbandoning
            );
            
            for (const tower of enemyTowers) {
                const towerConfig = getNodeConfig(tower.type);
                const detectionRadius = towerConfig?.detectionRadius || tower.detectionRadius || 140;
                const dist = Math.hypot(x - tower.x, y - tower.y);
                
                if (dist <= detectionRadius) {
                    console.log(`❌ Pseudo-servidor: Hay una torre de vigilancia enemiga cerca - no se puede desplegar el comando`);
                    return;
                }
            }
            
            // Validar colisiones físicas básicas (no límites de detección)
            const allNodes = [...this.game.bases, ...this.game.nodes];
            for (const node of allNodes) {
                if (!node.active) continue;
                const dist = Math.hypot(x - node.x, y - node.y);
                const minSeparation = 25 + (node.radius || 30); // Solo colisión física básica
                if (dist < minSeparation) {
                    console.log(`❌ Pseudo-servidor: Muy cerca de otro edificio`);
                    return;
                }
            }
        }
        
        // Descontar currency (AUTORITATIVA)
        if (!this.spendMissionCurrency(cost)) {
            console.error(`❌ Pseudo-servidor: Error al gastar currency`);
            return;
        }
        
        // Obtener configuración del nodo
        const buildingConfig = getNodeConfig(buildingId);
        if (!buildingConfig) {
            console.error(`❌ Pseudo-servidor: Configuración no encontrada`);
            return;
        }
        
        // Crear nodo (AUTORITATIVA)
        const newNode = new VisualNode(x, y, buildingId, {
            ...buildingConfig,
            isConstructed: true,
            // 🆕 NUEVO: Para el comando, cambiar category a 'buildable' para que se renderice como edificio
            category: isCommando ? 'buildable' : buildingConfig.category,
            // 🆕 NUEVO: Establecer team del comando
            team: isCommando ? (this.myTeam || 'ally') : (buildingConfig.team || 'ally')
        }, this);
        
        // 🆕 NUEVO: Para el comando, establecer propiedades especiales
        if (isCommando && newNode) {
            newNode.isCommando = true;
            newNode.detectionRadius = 200; // Área de efecto
            newNode.team = this.myTeam || 'ally';
        }
        
        if (newNode) {
            // Tutorial: Agregar al array de nodos del tutorial
            if (this.state === 'tutorial' && this.tutorialManager?.tutorialNodes) {
                this.tutorialManager.tutorialNodes.push(newNode);
                
                // Tutorial: Hardcodear FOB con 0 suministros
                if (buildingId === 'fob') {
                    newNode.supplies = 0;
                    console.log('🎓 Tutorial: FOB construido con 0 suministros');
                }
            } else {
                this.nodes.push(newNode);
            }
            
            // Tutorial: Detectar si construyó un FOB
            if (buildingId === 'fob' && this.tutorialManager?.isTutorialActive) {
                this.tutorialManager.notifyAction('fob_built', { buildingId });
            }
            
            // Notificar a la IA enemiga
            if (buildingConfig.id === 'antiDrone' || 
                buildingConfig.id === 'nuclearPlant' || 
                buildingConfig.id === 'intelRadio' ||
                buildingConfig.id === 'campaignHospital') {
                if (this.enemyAI) {
                    this.enemyAI.registerPlayerAction(buildingConfig.id, { x, y });
                }
                if (this.aiDirector && this.aiSystemMode !== 'legacy') {
                    this.aiDirector.onPlayerAction(buildingConfig.id, { x, y });
                }
            }
        }
        
        // Reproducir sonido
        this.audio.playPlaceBuildingSound();
        
        // Incrementar contador
        this.matchStats.buildingsBuilt++;
        
        console.log(`✅ Pseudo-servidor: ${buildingConfig.name} construido exitosamente en (${x.toFixed(0)}, ${y.toFixed(0)})`);
    }
    
    /**
     * Verifica si se puede pagar un edificio
     */
    canAffordBuilding(buildingId) {
        const cost = this.serverBuildingConfig?.costs?.[buildingId] || 0;
        return this.getMissionCurrency() >= cost;
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Maneja solicitud de drone
     * @param {Object} targetBase - Base objetivo del drone
     */
    handleDroneRequest(targetBase) {
        console.log(`💣 Pseudo-servidor: Procesando drone hacia ${targetBase.id}`);
        
        // Validar objetivo
        const validTargetTypes = ['fob', 'nuclearPlant', 'intelRadio', 'antiDrone', 'campaignHospital', 'droneLauncher', 'truckFactory', 'engineerCenter', 'intelCenter', 'aerialBase'];
        const isEnemyTarget = targetBase.team !== this.myTeam && validTargetTypes.includes(targetBase.type);
        
        if (!isEnemyTarget) {
            if (targetBase.type === 'hq') {
                console.log('❌ Pseudo-servidor: No puedes atacar HQs');
            } else if (targetBase.type === 'front') {
                console.log('❌ Pseudo-servidor: No puedes atacar frentes');
            } else if (targetBase.team === this.myTeam) {
                console.log('❌ Pseudo-servidor: No puedes atacar tus propias bases');
            } else {
                console.log('❌ Pseudo-servidor: Objetivo no válido');
            }
            return;
        }
        
        // Validar currency
        const droneCost = this.serverBuildingConfig?.costs?.drone || 0;
        if (!this.canAffordBuilding('drone')) {
            console.log(`❌ Pseudo-servidor: Currency insuficiente`);
            return;
        }
        
        // Descontar currency
        if (!this.spendMissionCurrency(droneCost)) {
            console.error(`❌ Pseudo-servidor: Error al gastar currency`);
            return;
        }
        
        // Lanzar drone desde el borde izquierdo
        const droneStartX = 0;
        const droneStartY = targetBase.y;
        
        this.droneSystem.launchDrone(droneStartX, droneStartY, targetBase);
        this.matchStats.dronesLaunched++;
        
        console.log(`✅ Pseudo-servidor: Dron lanzado exitosamente`);
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Maneja solicitud de sniper
     * @param {Object} targetFront - Frente objetivo del sniper
     */
    handleSniperRequest(targetFront) {
        console.log(`🎯 Pseudo-servidor: Procesando sniper hacia ${targetFront.id}`);
        
        // Validar objetivo
        const isEnemyFront = targetFront.team !== this.myTeam && targetFront.type === 'front';
        
        if (!isEnemyFront) {
            console.log('❌ Pseudo-servidor: Solo puedes atacar frentes enemigos');
            return;
        }
        
        // Validar currency
        const sniperCost = this.serverBuildingConfig?.costs?.sniperStrike || 0;
        if (!this.canAffordBuilding('sniperStrike')) {
            console.log(`❌ Pseudo-servidor: Currency insuficiente`);
            return;
        }
        
        // Descontar currency
        if (!this.spendMissionCurrency(sniperCost)) {
            console.error(`❌ Pseudo-servidor: Error al gastar currency`);
            return;
        }
        
        // Reproducir sonido
        this.audio.sounds.sniperShoot.play();
        
        // Aplicar efecto "wounded"
        if (this.medicalSystem) {
            this.medicalSystem.applyPenalty(targetFront);
            this.matchStats.snipersLaunched++;
        }
        
        // Crear efecto visual
        this.particleSystem.createFloatingSprite(targetFront.x, targetFront.y - 40, 'ui-sniper-kill');
        
        console.log(`✅ Pseudo-servidor: Sniper ejecutado exitosamente`);
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Maneja solicitud de sabotaje FOB
     * @param {Object} targetFOB - FOB objetivo del sabotaje
     */
    handleFobSabotageRequest(targetFOB) {
        console.log(`⚡ Pseudo-servidor: Procesando sabotaje FOB ${targetFOB.id}`);
        
        // Validar objetivo
        const isEnemyFOB = targetFOB.team !== this.myTeam && targetFOB.type === 'fob';
        
        if (!isEnemyFOB) {
            console.log('❌ Pseudo-servidor: Solo puedes sabotear FOBs enemigas');
            return;
        }
        
        // Validar currency
        if (!this.canAffordBuilding('fobSabotage')) {
            console.log(`❌ Pseudo-servidor: Currency insuficiente`);
            return;
        }
        
        // Obtener configuración
        const fobSabotageConfig = getNodeConfig('fobSabotage');
        if (!fobSabotageConfig) {
            console.error('❌ Pseudo-servidor: Configuración no encontrada');
            return;
        }
        
        // Descontar currency
        if (!this.spendMissionCurrency(fobSabotageConfig.cost)) {
            console.error(`❌ Pseudo-servidor: Error al gastar currency`);
            return;
        }
        
        // Aplicar efecto sabotaje
        targetFOB.addEffect({
            type: 'fobSabotage',
            speedPenalty: fobSabotageConfig.speedPenalty,
            truckCount: fobSabotageConfig.truckCount,
            icon: fobSabotageConfig.effectIcon,
            tooltip: `Saboteada: -50% velocidad en los siguientes ${fobSabotageConfig.truckCount} camiones`
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
        
        console.log(`✅ Pseudo-servidor: FOB sabotajeada exitosamente`);
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Maneja solicitud de despliegue de comando especial operativo
     * @param {number} x - Posición X donde desplegar
     * @param {number} y - Posición Y donde desplegar
     */
    handleCommandoDeployRequest(x, y) {
        console.log(`🎖️ Pseudo-servidor: Procesando despliegue de comando en (${x.toFixed(0)}, ${y.toFixed(0)})`);
        
        // Validar currency
        if (!this.canAffordBuilding('specopsCommando')) {
            console.log(`❌ Pseudo-servidor: Currency insuficiente`);
            return;
        }
        
        // Obtener configuración
        const commandoConfig = getNodeConfig('specopsCommando');
        if (!commandoConfig) {
            console.error('❌ Pseudo-servidor: Configuración no encontrada');
            return;
        }
        
        // Descontar currency
        if (!this.spendMissionCurrency(commandoConfig.cost || 200)) {
            console.error(`❌ Pseudo-servidor: Error al gastar currency`);
            return;
        }
        
        // Crear nodo del comando (similar a construir un edificio)
        this.handleBuildRequest('specopsCommando', x, y);
        
        // Sonido de despliegue de comando
        if (this.audio && this.audio.playCommandoDeploySound) {
            this.audio.playCommandoDeploySound();
        }
        
        console.log(`✅ Pseudo-servidor: Comando desplegado exitosamente`);
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
            this.state = 'victory';
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
            this.state = 'defeat';
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
        
        // Obtener stats de la IA
        const aiStats = this.enemyAI.getStats();
        
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
                            <div>Currency final: ${this.enemyAI.getCurrency()}$</div>
                            <div>FOBs: ${enemyFOBs}</div>
                            <div>Edificios: ${enemyBuildings}</div>
                            <div>Drones: ${aiStats.dronesLaunched}</div>
                            <div>Snipers: ${aiStats.snipersLaunched}</div>
                            <div>Convoyes: ${aiStats.suppliesSent}</div>
                            <div>Ambulancias: ${aiStats.medicsSent}</div>
                        </div>
                    </div>
                </div>
                
                <div class="menu-actions">
                    <button id="victory-menu-btn" class="menu-btn primary">Volver al Menú</button>
                </div>
            </div>
        `;
        
        victoryOverlay.innerHTML = statsHTML;
        victoryOverlay.classList.remove('hidden');
        
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
        
        // Obtener stats de la IA
        const aiStats = this.enemyAI.getStats();
        
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
                            <div>Currency final: ${this.enemyAI.getCurrency()}$</div>
                            <div>FOBs: ${enemyFOBs}</div>
                            <div>Edificios: ${enemyBuildings}</div>
                            <div>Drones: ${aiStats.dronesLaunched}</div>
                            <div>Snipers: ${aiStats.snipersLaunched}</div>
                            <div>Convoyes: ${aiStats.suppliesSent}</div>
                            <div>Ambulancias: ${aiStats.medicsSent}</div>
                        </div>
                    </div>
                </div>
                
                <div class="menu-actions">
                    <button id="defeat-menu-btn" class="menu-btn primary">Volver al Menú</button>
                </div>
            </div>
        `;
        
        defeatOverlay.innerHTML = statsHTML;
        defeatOverlay.classList.remove('hidden');
        
        // Reconectar el botón
        const btn = document.getElementById('defeat-menu-btn');
        if (btn) {
            btn.onclick = () => this.returnToMenuFromGame();
        }
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Inicializar configuración de edificios para singleplayer
     */
    initializeSingleplayerBuildingConfig() {
        // Importar la configuración del servidor directamente
        import('../server/config/serverNodes.js').then(module => {
            const { SERVER_NODE_CONFIG } = module;
            
            // Usar la configuración real del servidor
            this.serverBuildingConfig = {
                costs: SERVER_NODE_CONFIG.costs,
                buildTimes: SERVER_NODE_CONFIG.buildTimes,
                descriptions: SERVER_NODE_CONFIG.descriptions,
                capacities: SERVER_NODE_CONFIG.capacities,
                gameplay: SERVER_NODE_CONFIG.gameplay,
                detectionRadii: SERVER_NODE_CONFIG.detectionRadius,
                security: SERVER_NODE_CONFIG.security,
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
                    raceSpecial: {
                        B_Nation: {
                            'hq': ['front', 'aerialBase'],
                            'front': ['hq', 'front', 'aerialBase'],
                            'aerialBase': ['hq', 'front']
                        }
                    }
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
            
            console.log('🏗️ Configuración de edificios inicializada para singleplayer desde servidor');
        }).catch(error => {
            console.error('❌ Error cargando configuración del servidor:', error);
            
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
                    raceSpecial: {
                        B_Nation: {
                            'hq': ['front', 'aerialBase'],
                            'front': ['hq', 'front', 'aerialBase'],
                            'aerialBase': ['hq', 'front']
                        }
                    }
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
}