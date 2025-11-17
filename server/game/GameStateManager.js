// ===== GESTOR DE ESTADO DEL JUEGO =====
import { v4 as uuidv4 } from 'uuid';
import { MedicalSystemServer } from '../systems/MedicalSystemServer.js';
import { FrontMovementSystemServer } from '../systems/FrontMovementSystemServer.js';
import { TerritorySystemServer } from '../systems/TerritorySystemServer.js';
import { DroneSystemServer } from '../systems/DroneSystemServer.js';
import { TankSystemServer } from '../systems/TankSystemServer.js';
import { LightVehicleSystemServer } from '../systems/LightVehicleSystemServer.js'; // 🆕 NUEVO: Sistema de artillado ligero
import { ArtillerySystemServer } from '../systems/ArtillerySystemServer.js'; // 🆕 NUEVO: Sistema de artillería
import { TrainSystemServer } from '../systems/TrainSystemServer.js';
import { SERVER_NODE_CONFIG } from '../config/serverNodes.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { BuildHandler } from './handlers/BuildHandler.js';
import { ConvoyHandler } from './handlers/ConvoyHandler.js';
import { CombatHandler } from './handlers/CombatHandler.js';
import { HelicopterManager } from './managers/HelicopterManager.js';
import { StateSerializer } from './managers/StateSerializer.js';
import { OptimizationTracker } from './managers/OptimizationTracker.js';
import { TerritoryCalculator } from './managers/TerritoryCalculator.js';
import { RaceManager } from './managers/RaceManager.js';
import { ConvoyMovementManager } from './managers/ConvoyMovementManager.js';
import { SupplyManager } from './managers/SupplyManager.js';
import { InvestmentManager } from './managers/InvestmentManager.js';
import { AISystem } from './managers/AISystem.js';
import { CurrencySystem } from './systems/CurrencySystem.js';
import { ConstructionSystem } from './systems/ConstructionSystem.js';
import { EffectsSystem } from './systems/EffectsSystem.js';
import { AbandonmentSystem } from '../systems/AbandonmentSystem.js';
import { CommandoSystem } from '../systems/CommandoSystem.js';
import { TruckAssaultSystem } from '../systems/TruckAssaultSystem.js';
import { VehicleWorkshopSystem } from '../systems/VehicleWorkshopSystem.js';
import { CameraDroneSystem } from '../systems/CameraDroneSystem.js';
import { MAP_CONFIG, calculateAbsolutePosition } from '../utils/mapGenerator.js';

export class GameStateManager {
    constructor(room) {
        this.room = room;
        this.nodes = [];
        this.convoys = [];
        this.trains = []; // 🆕 NUEVO: Array de trenes
        this.helicopters = []; // 🆕 NUEVO: Array de helicópteros persistentes
        this.currency = {
            player1: GAME_CONFIG.currency.initial,
            player2: GAME_CONFIG.currency.initial
        };
        this.currencyGenerated = {
            player1: GAME_CONFIG.currency.initial,
            player2: GAME_CONFIG.currency.initial
        };
        // 🆕 NUEVO: Razas seleccionadas por equipo
        this.playerRaces = {
            player1: null,
            player2: null
        };
        this.gameTime = 0;
        this.benchCooldowns = {}; // 🆕 NUEVO: Cooldowns del banquillo por team
        this.tickCounter = 0;
        this.duration = GAME_CONFIG.match.duration;
        this.tickRate = GAME_CONFIG.match.tickRate;
        this.updateInterval = null;
        
        // Countdown antes de empezar simulación
        this.countdown = GAME_CONFIG.match.countdown;
        this.gameStarted = false;
        
        // Sistemas de simulación
        this.medicalSystem = new MedicalSystemServer(this);
        this.frontMovement = new FrontMovementSystemServer(this);
        this.territory = new TerritorySystemServer(this);
        this.droneSystem = new DroneSystemServer(this);
        this.tankSystem = new TankSystemServer(this);
        this.lightVehicleSystem = new LightVehicleSystemServer(this); // 🆕 NUEVO: Sistema de artillado ligero
        this.artillerySystem = new ArtillerySystemServer(this); // 🆕 NUEVO: Sistema de artillería
        this.trainSystem = new TrainSystemServer(this); // 🆕 NUEVO: Sistema de trenes
        
        // Handlers de acciones
        this.buildHandler = new BuildHandler(this);
        this.convoyHandler = new ConvoyHandler(this);
        this.combatHandler = new CombatHandler(this);
        
        // Managers especializados
        this.helicopterManager = new HelicopterManager(this);
        this.stateSerializer = new StateSerializer(this);
        this.optimizationTracker = new OptimizationTracker(this);
        this.territoryCalculator = new TerritoryCalculator(this);
        this.raceManager = new RaceManager(this);
        this.convoyMovementManager = new ConvoyMovementManager(this);
        this.supplyManager = new SupplyManager(this);
        this.investmentManager = new InvestmentManager(this);
        // AISystem se inicializa después con io y roomId
        this.aiSystem = null;
        
        // Sistemas de actualización
        this.currencySystem = new CurrencySystem(this);
        this.constructionSystem = new ConstructionSystem(this);
        this.effectsSystem = new EffectsSystem(this);
        this.abandonmentSystem = new AbandonmentSystem(this);
        this.commandoSystem = new CommandoSystem(this); // 🆕 NUEVO: Sistema de comandos
        this.truckAssaultSystem = new TruckAssaultSystem(this); // 🆕 NUEVO: Sistema de truck assault
        this.vehicleWorkshopSystem = new VehicleWorkshopSystem(this); // 🆕 NUEVO: Sistema de taller de vehículos
        this.cameraDroneSystem = new CameraDroneSystem(this); // 🆕 NUEVO: Sistema de camera drone
        
        // 🆕 NUEVO: Estado del Destructor de mundos
        this.worldDestroyerActive = false;
        this.worldDestroyerExecuted = false;
        this.worldDestroyerStartTime = null;
        this.worldDestroyerPlayerTeam = null;
        this.worldDestroyerCountdownDuration = null;
        
        // 🆕 NUEVO: Eventos de impacto de artillado ligero
        this.lightVehicleImpacts = [];
        
        // 🆕 NUEVO: Eventos de artillería
        this.artilleryEvent = null;
        
        // Sistema de eventos de sonido
        this.soundEvents = [];
        // 🆕 NUEVO: Sistema de eventos visuales (para números flotantes, efectos, etc.)
        this.visualEvents = [];
        this.hasPlayedEnemyContact = false;
        this.clearShootsTimer = 0;
        this.radioEffectTimer = 0;
        
        // Sistema de optimización - estado anterior para detectar cambios
        this.lastSentState = null;
        this.lastCurrencySnapshot = {
            player1: GAME_CONFIG.currency.initial,
            player2: GAME_CONFIG.currency.initial
        };
        this.lastNodeStates = new Map(); // Trackear estado anterior de cada nodo
        this.lastConvoyStates = new Map(); // Trackear estado anterior de cada convoy
        this.lastConstructionUpdate = 0; // Timer para construction updates
        this.gameStartTicks = 0; // Contador de ticks desde inicio del juego
        this.INITIAL_SYNC_TICKS = 30; // Enviar estado completo los primeros 30 ticks (3 segundos @ 10TPS)
    }
    
    // ===== FUNCIONES CENTRALIZADAS MODULARES =====
    
    
    /**
     * Obtiene el estado inicial del juego
     * 🆕 USO: Ahora usa configuración compartida del generador de mapas
     */
    getInitialState() {
        // 🆕 USAR CONFIGURACIÓN COMPARTIDA DEL GENERADOR DE MAPAS
        const baseWidth = MAP_CONFIG.width;
        const baseHeight = MAP_CONFIG.height;
        
        // 1. Generar HQ Jugador 1 (izquierda)
        const hq1Pos = calculateAbsolutePosition(
            MAP_CONFIG.hq.player1.xPercent,
            MAP_CONFIG.hq.player1.yPercent,
            baseWidth,
            baseHeight
        );
        this.nodes.push(this.createNode('hq', 'player1', hq1Pos.x, hq1Pos.y));
        
        // 2. Generar HQ Jugador 2 (derecha)
        const hq2Pos = calculateAbsolutePosition(
            MAP_CONFIG.hq.player2.xPercent,
            MAP_CONFIG.hq.player2.yPercent,
            baseWidth,
            baseHeight
        );
        this.nodes.push(this.createNode('hq', 'player2', hq2Pos.x, hq2Pos.y));
        
        // 3. ✅ SIMPLIFICADO: FOBs siempre se crean (ya no hay sistema de naciones)
        MAP_CONFIG.fobs.player1.forEach(fobPos => {
            const absPos = calculateAbsolutePosition(
                fobPos.xPercent,
                fobPos.yPercent,
                baseWidth,
                baseHeight
            );
            this.nodes.push(this.createNode('fob', 'player1', absPos.x, absPos.y, 50));
        });
        
        MAP_CONFIG.fobs.player2.forEach(fobPos => {
            const absPos = calculateAbsolutePosition(
                fobPos.xPercent,
                fobPos.yPercent,
                baseWidth,
                baseHeight
            );
            this.nodes.push(this.createNode('fob', 'player2', absPos.x, absPos.y, 50));
        });
        
        // 4. Generar Frentes Jugador 1
        MAP_CONFIG.fronts.player1.forEach(frontPos => {
            const absPos = calculateAbsolutePosition(
                frontPos.xPercent,
                frontPos.yPercent,
                baseWidth,
                baseHeight
            );
            this.nodes.push(this.createNode('front', 'player1', absPos.x, absPos.y, 100));
        });
        
        // 5. Generar Frentes Jugador 2
        MAP_CONFIG.fronts.player2.forEach(frontPos => {
            const absPos = calculateAbsolutePosition(
                frontPos.xPercent,
                frontPos.yPercent,
                baseWidth,
                baseHeight
            );
            this.nodes.push(this.createNode('front', 'player2', absPos.x, absPos.y, 100));
        });
        
        // ✅ SIMPLIFICADO: Ya no hay sistema de naciones, no se crean helicópteros iniciales
        
        return {
            nodes: this.stateSerializer.serializeNodes(),
            helicopters: this.stateSerializer.serializeAllHelicopters(), // Incluir helicópteros
            currency: { ...this.currency },
            duration: this.duration,
            worldWidth: baseWidth,
            worldHeight: baseHeight,
            // ✅ ELIMINADO: Ya no hay sistema de naciones, solo se mantiene playerRaces para compatibilidad
            playerRaces: { ...this.playerRaces },
            // 🆕 SERVIDOR COMO AUTORIDAD: Configuración de edificios
            buildingConfig: {
                costs: this.buildHandler.getBuildingCosts(),
                buildTimes: this.buildHandler.getBuildingTimes(),
                effects: this.buildHandler.getBuildingEffects(),
                descriptions: this.buildHandler.getBuildingDescriptions(),
                capacities: this.buildHandler.getBuildingCapacities(),
                bonuses: this.buildHandler.getBuildingBonuses(),
                gameplay: this.buildHandler.getGameplayProperties(),
                buildRadii: this.buildHandler.getBuildRadii(), // 🆕 Radio de construcción (proximidad)
                detectionRadii: this.buildHandler.getDetectionRadii(),
                temporaryEffects: this.buildHandler.getTemporaryEffects(), // 🆕 NUEVO: Efectos temporales (trained, wounded)
                security: this.buildHandler.getSecurityProperties(),
                behavior: this.buildHandler.getBehaviorProperties(),
                specialNodes: this.buildHandler.getSpecialNodes(), // 🆕 Configuración de nodos especiales (comando, truck assault)
                vehicleTypes: this.buildHandler.getVehicleTypes(), // 🆕 NUEVO: Tipos de vehículos
                vehicleSystems: this.buildHandler.getVehicleSystems() // 🆕 NUEVO: Sistemas de vehículos por tipo de nodo
            }
        };
    }
    
    /**
     * Crea un nodo del servidor
     */
    createNode(type, team, x, y, supplies = null) {
        const nodeId = `node_${uuidv4().substring(0, 8)}`;
        
        const node = {
            id: nodeId,
            type,
            team,
            x,
            y,
            active: true,
            constructed: true,
            isConstructing: false,
            landedHelicopters: [], // 🆕 Array para helicópteros aterrizados
            disabled: false, // 🆕 Estado disabled (para comandos)
            broken: false // 🆕 Estado broken (roto - requiere reparación con camión mecánico)
        };
        
        // 🆕 CENTRALIZADO: Obtener configuración de vehículos según la raza
        const vehicleConfig = this.raceManager.getInitialVehiclesForRace(team, type);
        
        // 🆕 Obtener configuración de capacidades del nodo
        const capacityConfig = SERVER_NODE_CONFIG.capacities[type] || {};
        
        // Propiedades según tipo
        if (type === 'hq') {
            node.hasSupplies = false;
            node.supplies = null; // Infinitos
            
            // ✅ CONFIGURACIÓN INICIAL: Leer valores iniciales desde GAME_CONFIG.initialNodes.hq
            const initialConfig = GAME_CONFIG.initialNodes.hq || {};
            
            // ✅ CONSOLIDADO: Usar configuración de vehículos desde vehicleConfig (lee de SERVER_NODE_CONFIG.capacities)
            node.hasVehicles = vehicleConfig.hasVehicles;
            // Valores iniciales disponibles desde gameConfig, máximos desde serverNodes
            node.maxVehicles = vehicleConfig.hasVehicles ? (initialConfig.maxVehicles ?? vehicleConfig.availableVehicles) : 0;
            node.availableVehicles = vehicleConfig.hasVehicles ? (initialConfig.availableVehicles ?? vehicleConfig.availableVehicles) : 0;
            node.hasHelicopters = vehicleConfig.hasHelicopters;
            node.maxHelicopters = vehicleConfig.hasHelicopters ? vehicleConfig.availableHelicopters : 0;
            node.availableHelicopters = vehicleConfig.availableHelicopters;
            
            // Sistema médico para ambulancias - valores iniciales desde gameConfig
            node.hasMedicalSystem = true;
            node.ambulanceAvailable = initialConfig.ambulanceAvailable ?? true;
            node.maxAmbulances = initialConfig.maxAmbulances ?? (capacityConfig.maxAmbulances || 1);
            
            // 🆕 NUEVO: Sistema de reparación para camión mecánico - valores iniciales desde gameConfig
            node.hasRepairSystem = capacityConfig.hasRepairSystem || false;
            node.maxRepairVehicles = initialConfig.maxRepairVehicles ?? (capacityConfig.maxRepairVehicles || 1);
            node.availableRepairVehicles = initialConfig.availableRepairVehicles ?? (capacityConfig.maxRepairVehicles || 1);
            node.repairVehicleAvailable = node.availableRepairVehicles > 0;
            
            // 🆕 NUEVO: Inicializar tipo de recurso seleccionado por defecto
            const defaultType = this.raceManager.getDefaultVehicleType('hq');
            node.selectedResourceType = defaultType || 'ammo';
        } else if (type === 'fob') {
            node.hasSupplies = true;
            node.maxSupplies = 100;
            node.supplies = supplies !== null ? supplies : 30;
            // ✅ CONSOLIDADO: Usar configuración de vehículos desde vehicleConfig (lee de SERVER_NODE_CONFIG.capacities)
            node.hasVehicles = vehicleConfig.hasVehicles;
            node.maxVehicles = vehicleConfig.hasVehicles ? vehicleConfig.availableVehicles : 0;
            node.availableVehicles = vehicleConfig.availableVehicles;
            node.hasHelicopters = vehicleConfig.hasHelicopters;
            node.maxHelicopters = vehicleConfig.hasHelicopters ? vehicleConfig.availableHelicopters : 0;
            node.availableHelicopters = vehicleConfig.availableHelicopters;
        } else if (type === 'front') {
            node.hasSupplies = true;
            node.maxSupplies = 100;
            node.supplies = supplies !== null ? supplies : 100;
            node.consumeRate = 1.6;
            node.maxXReached = x;
            // ✅ CONSOLIDADO: Usar configuración de vehículos desde vehicleConfig (lee de SERVER_NODE_CONFIG.capacities)
            node.hasVehicles = vehicleConfig.hasVehicles;
            node.maxVehicles = vehicleConfig.hasVehicles ? vehicleConfig.availableVehicles : 0;
            node.availableVehicles = vehicleConfig.availableVehicles;
            node.hasHelicopters = vehicleConfig.hasHelicopters;
            node.maxHelicopters = vehicleConfig.hasHelicopters ? vehicleConfig.availableHelicopters : 0;
            node.availableHelicopters = vehicleConfig.availableHelicopters;
        }
        
        // 🆕 CENTRALIZADO: Configurar nodo según la raza
        return this.raceManager.configureNodeForRace(node, team);
    }
    
    
    /**
     * Añade un evento de sonido a la cola
     */
    addSoundEvent(type, data = {}) {
        this.soundEvents.push({ type, ...data, timestamp: this.gameTime });
    }
    
    /**
     * Obtiene y limpia eventos de sonido
     */
    getSoundEvents() {
        const events = [...this.soundEvents];
        this.soundEvents = []; // Limpiar después de leer
        return events;
    }
    
    /**
     * 🆕 NUEVO: Agrega un evento visual para el cliente (números flotantes, efectos, etc.)
     * @param {string} type - Tipo de evento visual
     * @param {Object} data - Datos del evento
     */
    addVisualEvent(type, data = {}) {
        this.visualEvents.push({ type, ...data, timestamp: this.gameTime });
    }
    
    /**
     * 🆕 NUEVO: Obtiene todos los eventos visuales pendientes y los limpia
     * @returns {Array} Array de eventos visuales
     */
    getVisualEvents() {
        const events = [...this.visualEvents];
        this.visualEvents = []; // Limpiar después de leer
        return events;
    }
    
    /**
     * Aplica efectos de edificios cuando se completan
     */
    applyBuildingEffects(node) {
        this.buildHandler.applyBuildingEffects(node);
    }
    

    

    
    /**
     * Maneja solicitud de construcción
     */
    handleBuild(playerTeam, buildingType, x, y) {
        return this.buildHandler.handleBuild(playerTeam, buildingType, x, y);
    }
    
    /**
     * 🆕 NUEVO: Maneja activación del Destructor de mundos
     */
    handleWorldDestroyer(playerTeam) {
        return this.combatHandler.handleWorldDestroyer(playerTeam);
    }
    
    /**
     * Maneja solicitud de convoy
     */
    handleConvoy(playerTeam, fromId, toId) {
        return this.convoyHandler.handleConvoy(playerTeam, fromId, toId);
    }
    
    /**
     * Maneja solicitud de ambulancia (emergencia médica)
     */
    handleAmbulance(playerTeam, fromId, toId) {
        return this.convoyHandler.handleAmbulance(playerTeam, fromId, toId);
    }
    
    /**
     * Maneja disparo de francotirador
     */
    handleSniperStrike(playerTeam, targetId) {
        return this.combatHandler.handleSniperStrike(playerTeam, targetId);
    }
    
    /**
     * Maneja sabotaje de FOB
     */
    handleFobSabotage(playerTeam, targetId) {
        return this.combatHandler.handleFobSabotage(playerTeam, targetId);
    }
    
    /**
     * Maneja lanzamiento de dron
     */
    handleDroneLaunch(playerTeam, targetId) {
        return this.combatHandler.handleDroneLaunch(playerTeam, targetId);
    }
    
    /**
     * Maneja lanzamiento de tanque
     * 🆕 NUEVO
     */
    handleTankLaunch(playerTeam, targetId) {
        return this.combatHandler.handleTankLaunch(playerTeam, targetId);
    }
    
    /**
     * Maneja lanzamiento de artillado ligero
     * 🆕 NUEVO
     */
    handleLightVehicleLaunch(playerTeam, targetId) {
        return this.combatHandler.handleLightVehicleLaunch(playerTeam, targetId);
    }
    
    /**
     * Maneja lanzamiento de artillería
     * 🆕 NUEVO
     */
    handleArtilleryLaunch(playerTeam, x, y) {
        return this.combatHandler.handleArtilleryLaunch(playerTeam, x, y);
    }
    
    /**
     * Maneja despliegue de comando especial operativo
     * 🆕 NUEVO
     */
    handleCommandoDeploy(playerTeam, x, y) {
        return this.combatHandler.handleCommandoDeploy(playerTeam, x, y);
    }
    
    /**
     * Maneja despliegue de camera drone
     * 🆕 NUEVO
     */
    handleCameraDroneDeploy(playerTeam, x, y) {
        return this.combatHandler.handleCameraDroneDeploy(playerTeam, x, y);
    }
    
    /**
     * Actualiza el vuelo de camera drones hacia su objetivo
     * 🆕 NUEVO: Maneja el movimiento inicial de camera drones antes de desplegarse
     */
    updateCameraDronesFlight(dt) {
        const cameraDroneSpeed = 300; // Velocidad del camera drone (px/s) - igual que drones bomba
        
        // Buscar todos los camera drones que aún no están desplegados
        const cameraDrones = this.nodes.filter(n => 
            n.isCameraDrone && 
            n.active && 
            !n.deployed &&
            n.targetX !== undefined &&
            n.targetY !== undefined
        );
        
        for (const cameraDrone of cameraDrones) {
            // Calcular distancia al objetivo
            const dx = cameraDrone.targetX - cameraDrone.x;
            const dy = cameraDrone.targetY - cameraDrone.y;
            const distance = Math.hypot(dx, dy);
            
            // Calcular cuánto se movería este frame
            const speed = cameraDroneSpeed * dt;
            
            // Si está muy cerca O si el próximo movimiento lo pasaría, desplegar
            if (distance < 5 || distance <= speed) {
                // Llegó al destino - desplegar
                cameraDrone.x = cameraDrone.targetX;
                cameraDrone.y = cameraDrone.targetY;
                cameraDrone.deployed = true;
                cameraDrone.constructed = true;
                cameraDrone.isConstructing = false;
                
                console.log(`📹 Camera Drone ${cameraDrone.id.substring(0, 8)} desplegado en (${cameraDrone.x.toFixed(0)}, ${cameraDrone.y.toFixed(0)})`);
                
                // 🎯 NUEVO: Notificar a la IA si existe (amenaza ahora desplegada)
                if (this.aiSystem) {
                    this.aiSystem.onThreatDetected('cameraDrone', cameraDrone, true, null);
                }
            } else {
                // Mover hacia el objetivo
                const vx = (dx / distance) * cameraDroneSpeed * dt;
                const vy = (dy / distance) * cameraDroneSpeed * dt;
                
                cameraDrone.x += vx;
                cameraDrone.y += vy;
            }
        }
    }
    
    /**
     * Inicia el loop de actualización del juego
     */
    startGameLoop(updateCallback, victoryCallback = null) {
        const tickInterval = 1000 / this.tickRate; // 50ms para 20 TPS
        
        this.updateInterval = setInterval(() => {
            // Actualizar simulación del juego
            const gameState = this.update(tickInterval / 1000); // dt en segundos
            
            // Enviar estado completo cada tick (20 TPS)
            if (gameState) {
                updateCallback(gameState);
            }
            
            // CRÍTICO: Si hay victoria, enviar evento de victoria
            if (this.victoryResult && victoryCallback) {
                victoryCallback(this.victoryResult);
                this.victoryResult = null; // Limpiar para evitar spam
            }
        }, tickInterval);
        
        console.log(`🎮 Game loop iniciado: ${this.tickRate} TPS (cada ${tickInterval}ms)`);
    }
    
    /**
     * Actualiza el estado del juego (SERVIDOR AUTORITATIVO COMPLETO)
     */
    update(dt) {
        // Incrementar tick counter
        this.tickCounter++;
        
        // === COUNTDOWN ANTES DE EMPEZAR ===
        if (!this.gameStarted) {
            this.countdown -= dt;
            
            if (this.countdown <= 0) {
                this.countdown = 0;
                this.gameStarted = true;
                this.gameStartTicks = 0; // Reset contador para sync inicial
                
                // Evento de sonido: secuencia de inicio (engine + infantry moves)
                this.addSoundEvent('game_start_sequence');
                this.addSoundEvent('start_battle_music');
            } else {
                // Durante countdown: NO simular nada, solo enviar estado inicial
                return this.getGameState();
            }
        }
        
        // Actualizar tiempo (solo después del countdown)
        this.gameTime += dt;
        
        // 🆕 NUEVO: Limpiar cooldowns de cartas que ya no están en el banquillo
        if (this.raceManager) {
            this.raceManager.cleanupBenchCooldowns('player1');
            this.raceManager.cleanupBenchCooldowns('player2');
        }
        
        // Incrementar contador de ticks desde inicio del juego
        if (this.gameStartTicks < this.INITIAL_SYNC_TICKS) {
            this.gameStartTicks++;
        }
        
        // === SONIDOS AMBIENTALES (timers) ===
        this.clearShootsTimer += dt;
        this.radioEffectTimer += dt;
        
        // Clear shoots
        if (this.clearShootsTimer >= GAME_CONFIG.audio.clearShootsInterval) {
            this.addSoundEvent('clear_shoots');
            this.clearShootsTimer = 0;
        }
        
        // Radio effect
        if (this.radioEffectTimer >= GAME_CONFIG.audio.radioEffectInterval) {
            this.addSoundEvent('random_radio_effect');
            this.radioEffectTimer = 0;
        }
        
        // === CURRENCY PASIVA ===
        this.currencySystem.updateCurrency(dt);
        
        // === ACTUALIZAR CONSTRUCCIONES ===
        this.constructionSystem.updateConstructions(dt);
        
        // === ACTUALIZAR CONVOYES (MOVIMIENTO + LLEGADAS) ===
        this.convoyMovementManager.update(dt);
        
        // === ACTUALIZAR TRENES (MOVIMIENTO + LLEGADAS) ===
        this.trainSystem.update(dt);
        
        // === CONSUMO DE SUPPLIES EN FRENTES ===
        this.supplyManager.update(dt);
        
        // === SISTEMA DE INVERSIÓN (intelRadio) ===
        this.investmentManager.update(dt);
        
        // === SISTEMA DE ABANDONO (centralizado) ===
        this.abandonmentSystem.checkAbandonmentConditions();
        this.abandonmentSystem.update(dt);
        
        // === SISTEMA DE COMANDOS ESPECIALES OPERATIVOS ===
        this.commandoSystem.update(dt);
        this.truckAssaultSystem.update(dt); // 🆕 NUEVO: Actualizar sistema de truck assault
        this.updateCameraDronesFlight(dt); // 🆕 NUEVO: Actualizar vuelo de camera drones
        this.cameraDroneSystem.update(dt); // 🆕 NUEVO: Actualizar sistema de camera drone (detección)
        this.vehicleWorkshopSystem.update(dt); // 🆕 NUEVO: Actualizar sistema de taller de vehículos
        
        // === SISTEMA DE IA (solo si hay IA en la partida) ===
        if (this.room?.hasAI) {
            this.aiSystem.update(dt);
        }
        
        // === SISTEMAS DE SIMULACIÓN ===
        
        // Sistema de helicópteros (actualizar helicópteros volando)
        this.helicopterManager.update(dt);
        
        // Sistema médico (emergencias)
        this.medicalSystem.update(dt);
        
        // Movimiento de frentes (avance/retroceso) - puede retornar victoria
        const victoryResult = this.frontMovement.update(dt);
        
        // CRÍTICO: Si hay victoria, detener simulación
        if (victoryResult) {
            console.log(`🏆 PARTIDA TERMINADA: ${victoryResult.winner} ganó (${victoryResult.reason})`);
            this.stopGameLoop();
            
            // Añadir estadísticas de la partida
            victoryResult.stats = this.getGameStats();
            
            // Marcar room como terminada
            if (this.room) {
                this.room.status = 'finished';
            }
            
            // Enviar evento de victoria a los clientes
            this.victoryResult = victoryResult;
            
            // Retornar estado final
            return this.getGameState();
        }
        
        // Sistema de territorio (abandono de FOBs)
        this.territory.update(dt);
        this.territory.updateAbandonmentProgress(dt);
        
        // 🆕 FIX: Removido checkAbandonmentConditions() duplicado - ya se llama arriba
        // Solo actualizar fases de abandono (el update ya maneja las fases)
        this.abandonmentSystem.update(dt);
        
        // === ACTUALIZAR DRONES (MOVIMIENTO + IMPACTOS + INTERCEPCIONES + ALERTAS) ===
        const droneResult = this.droneSystem.update(dt);
        
        // Guardar eventos para enviar a clientes
        if (droneResult.impacts.length > 0) {
            this.droneImpacts = droneResult.impacts;
        }
        
        if (droneResult.interceptions.length > 0) {
            this.droneInterceptions = droneResult.interceptions;
        }
        
        if (droneResult.alerts.length > 0) {
            this.droneAlerts = droneResult.alerts;
        }
        
        // === ACTUALIZAR TANQUES (MOVIMIENTO + IMPACTOS) ===
        const tankResult = this.tankSystem.update(dt);
        
        // Guardar eventos para enviar a clientes
        if (tankResult.impacts.length > 0) {
            this.tankImpacts = tankResult.impacts;
        }
        
        // === ACTUALIZAR ARTILLADO LIGERO (MOVIMIENTO + IMPACTOS) ===
        const lightVehicleResult = this.lightVehicleSystem.update(dt);
        
        // Guardar eventos para enviar a clientes
        if (lightVehicleResult.impacts.length > 0) {
            this.lightVehicleImpacts = lightVehicleResult.impacts;
        }
        
        // === ACTUALIZAR ARTILLERÍA (EFECTOS DE ÁREA) ===
        const artilleryEvent = this.artillerySystem.update(dt);
        
        // Guardar eventos para enviar a clientes
        if (artilleryEvent) {
            this.artilleryEvent = artilleryEvent;
        }
        
        // 🆕 NUEVO: Actualizar Destructor de mundos
        const worldDestroyerEvent = this.combatHandler.updateWorldDestroyer(dt);
        if (worldDestroyerEvent) {
            // Guardar evento para enviar a clientes
            this.worldDestroyerEvent = worldDestroyerEvent;
            // Limpiar nodos destruidos
            this.nodes = this.nodes.filter(n => n.active !== false);
        }
        
        // 🆕 NUEVO: Verificar talleres cuando se destruyen FOBs
        const destroyedFOBs = [];
        if (droneResult.impacts.length > 0 || tankResult.impacts.length > 0) {
            // Encontrar FOBs que fueron destruidos en este tick
            const allImpacts = [...droneResult.impacts, ...tankResult.impacts];
            for (const impact of allImpacts) {
                const destroyedNode = this.nodes.find(n => n.id === impact.targetId && n.type === 'fob' && !n.active);
                if (destroyedNode) {
                    destroyedFOBs.push(destroyedNode);
                }
            }
        }
        
        // Verificar talleres afectados por FOBs destruidos
        if (destroyedFOBs.length > 0) {
            this.checkWorkshopsAfterFobDestroyed(destroyedFOBs);
        }
        
        // Limpiar nodos destruidos del servidor (eliminados del array)
        let nodesChanged = false;
        if (droneResult.impacts.length > 0 || droneResult.interceptions.length > 0 || tankResult.impacts.length > 0) {
            const beforeCount = this.nodes.length;
            this.nodes = this.nodes.filter(n => n.active !== false);
            
            // Limpiar tracking de nodos eliminados
            if (this.nodes.length < beforeCount) {
                this.optimizationTracker.cleanupNodeTracking();
                nodesChanged = true;
            }
        }
        
        // Limpiar hospitales sin ambulancias
        const beforeHospitalCount = this.nodes.length;
        this.nodes = this.nodes.filter(node => {
            if (node.type === 'campaignHospital' && node.active === false) {
                console.log(`🏥 Eliminando hospital ${node.id} - sin ambulancias disponibles`);
                return false;
            }
            return true;
        });
        
        if (this.nodes.length < beforeHospitalCount) {
            this.optimizationTracker.cleanupNodeTracking();
            nodesChanged = true;
        }
        
        // Limpiar nodos en abandono (centralizado en AbandonmentSystem)
        // 🆕 NUEVO: Capturar FOBs que van a ser eliminados por abandono antes de limpiarlos
        const fobsBeforeCleanup = this.nodes.filter(n => n.type === 'fob' && n.isAbandoning && n.abandonPhase === 3);
        const abandonmentNodesChanged = this.abandonmentSystem.cleanup();
        if (abandonmentNodesChanged) {
            this.optimizationTracker.cleanupNodeTracking();
            nodesChanged = true;
            
            // 🆕 NUEVO: Verificar talleres si se eliminaron FOBs por abandono
            if (fobsBeforeCleanup.length > 0) {
                this.checkWorkshopsAfterFobDestroyed(fobsBeforeCleanup);
            }
        }
        
        // === ACTUALIZAR EFECTOS TEMPORALES ===
        this.effectsSystem.updateEffects(dt);
        
        // === LIMPIAR TRACKING MAPS (cada 60 ticks para optimizar) ===
        if (this.tickCounter % 60 === 0) {
            this.optimizationTracker.cleanupConvoyTracking();
        }
        
        // === PREPARAR ESTADO COMPLETO PARA ENVIAR ===
        return this.getGameState();
    }
    

    /**
     * Obtiene el estado completo del juego para sincronizar con clientes
     */
    getGameState() {
        // Durante el período inicial, enviar estado completo sin filtrado para asegurar sincronización
        const isInitialSync = this.gameStartTicks < this.INITIAL_SYNC_TICKS;
        
        const state = {
            tick: this.tickCounter,
            gameTime: this.gameTime,
            // SIEMPRE enviar todos los nodos activos - la optimización está en la frecuencia, no en filtrar nodos
            nodes: this.stateSerializer.serializeAllNodes(),
            convoys: this.stateSerializer.serializeAllConvoys(), // También todos los convoyes
            trains: this.stateSerializer.serializeAllTrains(), // 🆕 NUEVO: Trenes
            helicopters: this.stateSerializer.serializeAllHelicopters(), // Helicópteros
            drones: this.droneSystem.getDrones(), // Drones activos con posiciones
            tanks: this.tankSystem.getTanks(), // Tanques activos con posiciones
            lightVehicles: this.lightVehicleSystem.getLightVehicles(), // 🆕 NUEVO: Artillados ligeros activos con posiciones
            artilleryStrikes: this.artillerySystem.getArtilleryStrikes(), // 🆕 NUEVO: Bombardeos de artillería activos
            emergencies: this.medicalSystem.getEmergencies(),
            currency: {
                player1: Math.floor(this.currency.player1),
                player2: Math.floor(this.currency.player2)
            },
            soundEvents: this.getSoundEvents(), // Eventos de sonido de este tick
            visualEvents: this.getVisualEvents(), // 🆕 NUEVO: Eventos visuales de este tick
            benchCooldowns: this.benchCooldowns ? { ...this.benchCooldowns } : {} // 🆕 NUEVO: Cooldowns del banquillo
        };
        
        // Durante sync inicial, siempre enviar. Después, aplicar optimización
        if (!isInitialSync && !this.optimizationTracker.hasSignificantChanges(state)) {
            return null; // Skip update - no envía nada
        }
        
        // Guardar estado actual como referencia para próxima comparación
        this.optimizationTracker.updateLastSentState(JSON.parse(JSON.stringify(state)));
        
        return state;
    }
    
    /**
     * 🆕 NUEVO: Cambia el tipo de recurso seleccionado de un nodo
     * @param {string} playerTeam - Equipo del jugador
     * @param {string} nodeId - ID del nodo
     * @param {string} resourceType - Tipo de recurso seleccionado (ammo, medical, helicopter, etc.)
     * @returns {Object} Resultado con success y reason
     */
    changeNodeResourceType(playerTeam, nodeId, resourceType) {
        const node = this.nodes.find(n => n.id === nodeId);
        
        if (!node) {
            return { success: false, reason: 'Nodo no encontrado' };
        }
        
        // Verificar que el nodo pertenezca al jugador
        if (node.team !== playerTeam) {
            return { success: false, reason: 'No puedes cambiar el tipo de recurso de nodos enemigos' };
        }
        
        // Verificar que el tipo de recurso sea válido para este nodo
        const enabledTypes = this.raceManager.getEnabledVehicleTypes(node.type);
        if (!enabledTypes.includes(resourceType)) {
            return { success: false, reason: `Tipo de recurso ${resourceType} no válido para este nodo` };
        }
        
        // Cambiar el tipo de recurso seleccionado
        node.selectedResourceType = resourceType;
        
        return { success: true };
    }
    
    /**
     * Detiene el game loop
     */
    stopGameLoop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    
    /**
     * Obtiene estadísticas de la partida
     */
    getGameStats() {
        // Contar edificios construidos por equipo
        const player1Buildings = this.nodes.filter(n => 
            n.team === 'player1' && 
            n.type !== 'hq' && 
            n.type !== 'fob' && 
            n.type !== 'front' &&
            n.constructed
        ).length;
        
        const player2Buildings = this.nodes.filter(n => 
            n.team === 'player2' && 
            n.type !== 'hq' && 
            n.type !== 'fob' && 
            n.type !== 'front' &&
            n.constructed
        ).length;
        
        // Calcular fronteras finales (avance territorial)
        const player1Fronts = this.nodes.filter(n => n.type === 'front' && n.team === 'player1');
        const player2Fronts = this.nodes.filter(n => n.type === 'front' && n.team === 'player2');
        
        const player1MaxX = player1Fronts.length > 0 ? Math.max(...player1Fronts.map(f => f.x)) : 0;
        const player2MinX = player2Fronts.length > 0 ? Math.min(...player2Fronts.map(f => f.x)) : 1920;
        
        return {
            duration: Math.floor(this.gameTime), // Duración en segundos
            player1: {
                buildings: player1Buildings,
                maxAdvance: player1MaxX,
                finalCurrency: Math.floor(this.currency.player1),
                totalCurrency: Math.floor(this.currencyGenerated.player1)
            },
            player2: {
                buildings: player2Buildings,
                maxAdvance: player2MinX,
                finalCurrency: Math.floor(this.currency.player2),
                totalCurrency: Math.floor(this.currencyGenerated.player2)
            }
        };
    }
    
    // ===== MÉTODOS DELEGADOS A MANAGERS =====
    
    /**
     * Obtiene la configuración de raza del jugador
     * @param {string} team - Equipo del jugador (player1/player2)
     * @returns {Object|null} Configuración de la raza
     */
    getPlayerRaceConfig(team) {
        return this.raceManager.getPlayerRaceConfig(team);
    }
    
    /**
     * Verifica si el jugador puede usar FOBs según su raza
     * @param {string} team - Equipo del jugador
     * @returns {boolean} True si puede usar FOBs
     */
    canPlayerUseFOBs(team) {
        return this.raceManager.canPlayerUseFOBs(team);
    }
    
    /**
     * Obtiene rutas válidas para una raza específica
     * @param {string} fromType - Tipo de nodo origen
     * @param {string} team - Equipo del jugador
     * @returns {Array} Array de tipos de nodos válidos
     */
    getValidRoutesForPlayer(fromType, team) {
        return this.raceManager.getValidRoutesForPlayer(fromType, team);
    }
    
    /**
     * Configura un nodo según la raza del jugador
     * @param {Object} node - Nodo a configurar
     * @param {string} team - Equipo del jugador
     * @returns {Object} Nodo configurado
     */
    configureNodeForRace(node, team) {
        return this.raceManager.configureNodeForRace(node, team);
    }
    
    /**
     * Obtiene vehículos iniciales según la raza del jugador
     * @param {string} team - Equipo del jugador
     * @param {string} nodeType - Tipo de nodo
     * @returns {Object} Configuración de vehículos iniciales
     */
    getInitialVehiclesForRace(team, nodeType) {
        return this.raceManager.getInitialVehiclesForRace(team, nodeType);
    }
    
    /**
     * Establece el mazo de un jugador
     * @param {string} team - Equipo del jugador
     * @param {Object} deck - Objeto del mazo con { id, name, units }
     */
    setPlayerDeck(team, deck) {
        return this.raceManager.setPlayerDeck(team, deck);
    }
    
    /**
     * Obtiene el mazo de un jugador
     * @param {string} team - Equipo del jugador
     * @returns {Object|null} Objeto del mazo o null si no existe
     */
    getPlayerDeck(team) {
        return this.raceManager.getPlayerDeck(team);
    }
    
    /**
     * Establece la raza de un jugador
     * @param {string} team - Equipo del jugador
     * @param {string} raceId - ID de la raza
     */
    setPlayerRace(team, raceId) {
        return this.raceManager.setPlayerRace(team, raceId);
    }
    
    /**
     * Obtiene la raza de un jugador
     * @param {string} team - Equipo del jugador
     * @returns {string|null} ID de la raza
     */
    getPlayerRace(team) {
        return this.raceManager.getPlayerRace(team);
    }
    
    /**
     * Verifica si una posición X está dentro del territorio de un equipo
     * @param {number} x - Posición X
     * @param {string} team - Equipo del jugador
     * @returns {boolean} True si está en territorio
     */
    isInTeamTerritory(x, team) {
        return this.territoryCalculator.isInTeamTerritory(x, team);
    }
    
    /**
     * 🆕 NUEVO: Verifica y destruye talleres que quedan sin FOBs en su área después de que se destruye un FOB
     * @param {Array} destroyedFOBs - Array de FOBs que fueron destruidos
     */
    checkWorkshopsAfterFobDestroyed(destroyedFOBs) {
        if (destroyedFOBs.length === 0) return;
        
        // Helper: Obtiene el radio de construcción del FOB
        function getBuildRadius(buildingType) {
            const buildRadii = SERVER_NODE_CONFIG.buildRadius || {};
            if (buildRadii[buildingType]) {
                return buildRadii[buildingType];
            }
            const radius = SERVER_NODE_CONFIG.radius?.[buildingType] || 30;
            return radius * 2.5;
        }
        
        const fobBuildRadius = getBuildRadius('fob'); // Radio de construcción del FOB (140px)
        
        // Encontrar todos los talleres activos (drones y vehículos)
        const workshops = this.nodes.filter(n => 
            (n.type === 'droneWorkshop' || n.type === 'vehicleWorkshop') && 
            n.active && 
            n.constructed &&
            !n.isAbandoning
        );
        
        // Para cada taller, verificar si todavía tiene FOBs en su área
        for (const workshop of workshops) {
            const nearbyFOBs = this.nodes.filter(n => 
                n.type === 'fob' && 
                n.team === workshop.team && 
                n.active && 
                n.constructed &&
                !n.isAbandoning
            );
            
            let hasFobInArea = false;
            for (const fob of nearbyFOBs) {
                const dist = Math.hypot(workshop.x - fob.x, workshop.y - fob.y);
                if (dist <= fobBuildRadius) {
                    hasFobInArea = true;
                    break;
                }
            }
            
            if (!hasFobInArea) {
                // No hay FOBs en el área, marcar para destrucción
                workshop.active = false;
                workshop.isAbandoning = true;
                const workshopType = workshop.type === 'droneWorkshop' ? 'Drone Workshop' : 'Vehicle Workshop';
                console.log(`🗑️ ${workshopType} ${workshop.id} destruido - no hay FOBs en su área`);
            }
        }
    }
    
}

