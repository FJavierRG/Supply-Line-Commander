// ===== GESTOR DE ESTADO DEL JUEGO =====
import { v4 as uuidv4 } from 'uuid';
import { MedicalSystemServer } from '../systems/MedicalSystemServer.js';
import { FrontMovementSystemServer } from '../systems/FrontMovementSystemServer.js';
import { TerritorySystemServer } from '../systems/TerritorySystemServer.js';
import { DroneSystemServer } from '../systems/DroneSystemServer.js';
import { TankSystemServer } from '../systems/TankSystemServer.js';
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
        
        // Sistema de eventos de sonido
        this.soundEvents = [];
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
        
        // 3. 🆕 CENTRALIZADO: FOBs solo para jugadores que pueden usarlos
        if (this.raceManager.canPlayerUseFOBs('player1')) {
            MAP_CONFIG.fobs.player1.forEach(fobPos => {
                const absPos = calculateAbsolutePosition(
                    fobPos.xPercent,
                    fobPos.yPercent,
                    baseWidth,
                    baseHeight
                );
                this.nodes.push(this.createNode('fob', 'player1', absPos.x, absPos.y, 50));
            });
        }
        
        if (this.raceManager.canPlayerUseFOBs('player2')) {
            MAP_CONFIG.fobs.player2.forEach(fobPos => {
                const absPos = calculateAbsolutePosition(
                    fobPos.xPercent,
                    fobPos.yPercent,
                    baseWidth,
                    baseHeight
                );
                this.nodes.push(this.createNode('fob', 'player2', absPos.x, absPos.y, 50));
            });
        }
        
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
        
        // 🆕 NUEVO: Crear helicópteros iniciales para B_Nation
        const player1Config = this.raceManager.getPlayerRaceConfig('player1');
        const player2Config = this.raceManager.getPlayerRaceConfig('player2');
        
        if (player1Config?.specialMechanics?.transportSystem === 'aerial') {
            const hqNode = this.nodes.find(n => n.type === 'hq' && n.team === 'player1');
            if (hqNode) {
                const heli = this.helicopterManager.createHelicopter('player1', hqNode.id);
                if (!hqNode.landedHelicopters) hqNode.landedHelicopters = [];
                hqNode.landedHelicopters.push(heli.id);
            }
        }
        
        if (player2Config?.specialMechanics?.transportSystem === 'aerial') {
            const hqNode = this.nodes.find(n => n.type === 'hq' && n.team === 'player2');
            if (hqNode) {
                const heli = this.helicopterManager.createHelicopter('player2', hqNode.id);
                if (!hqNode.landedHelicopters) hqNode.landedHelicopters = [];
                hqNode.landedHelicopters.push(heli.id);
            }
        }
        
        return {
            nodes: this.stateSerializer.serializeNodes(),
            helicopters: this.stateSerializer.serializeAllHelicopters(), // Incluir helicópteros
            currency: { ...this.currency },
            duration: this.duration,
            worldWidth: baseWidth,
            worldHeight: baseHeight,
            // 🆕 CENTRALIZADO: Incluir información de razas en estado inicial
            playerRaces: { ...this.playerRaces },
            raceConfigs: {
                player1: this.raceManager.getPlayerRaceConfig('player1'),
                player2: this.raceManager.getPlayerRaceConfig('player2')
            },
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
                security: this.buildHandler.getSecurityProperties(),
                behavior: this.buildHandler.getBehaviorProperties()
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
            landedHelicopters: [] // 🆕 Array para helicópteros aterrizados
        };
        
        // 🆕 CENTRALIZADO: Obtener configuración de vehículos según la raza
        const vehicleConfig = this.raceManager.getInitialVehiclesForRace(team, type);
        
        // Propiedades según tipo
        if (type === 'hq') {
            node.hasSupplies = false;
            node.supplies = null; // Infinitos
            // 🆕 CENTRALIZADO: Usar configuración de vehículos según raza
            node.hasVehicles = vehicleConfig.hasVehicles;
            node.maxVehicles = vehicleConfig.hasVehicles ? 4 : 0;
            node.availableVehicles = vehicleConfig.availableVehicles;
            node.hasHelicopters = vehicleConfig.hasHelicopters;
            node.maxHelicopters = vehicleConfig.hasHelicopters ? 1 : 0;
            node.availableHelicopters = vehicleConfig.availableHelicopters;
            // Sistema médico para ambulancias
            node.hasMedicalSystem = true;
            node.ambulanceAvailable = true;
            node.maxAmbulances = 1;
        } else if (type === 'fob') {
            node.hasSupplies = true;
            node.maxSupplies = 100;
            node.supplies = supplies !== null ? supplies : 30;
            // 🆕 CENTRALIZADO: Usar configuración de vehículos según raza
            node.hasVehicles = vehicleConfig.hasVehicles;
            node.maxVehicles = vehicleConfig.hasVehicles ? 2 : 0;
            node.availableVehicles = vehicleConfig.availableVehicles;
            node.hasHelicopters = vehicleConfig.hasHelicopters;
            node.maxHelicopters = vehicleConfig.hasHelicopters ? 1 : 0;
            node.availableHelicopters = vehicleConfig.availableHelicopters;
        } else if (type === 'front') {
            node.hasSupplies = true;
            node.maxSupplies = 100;
            node.supplies = supplies !== null ? supplies : 100;
            node.consumeRate = 1.6;
            node.maxXReached = x;
            // 🆕 CENTRALIZADO: Usar configuración de vehículos según raza
            node.hasVehicles = vehicleConfig.hasVehicles;
            node.maxVehicles = vehicleConfig.hasVehicles ? 1 : 0;
            node.availableVehicles = vehicleConfig.availableVehicles;
            node.hasHelicopters = vehicleConfig.hasHelicopters;
            node.maxHelicopters = vehicleConfig.hasHelicopters ? 1 : 0;
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
     * Maneja despliegue de comando especial operativo
     * 🆕 NUEVO
     */
    handleCommandoDeploy(playerTeam, x, y) {
        return this.combatHandler.handleCommandoDeploy(playerTeam, x, y);
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
        const abandonmentNodesChanged = this.abandonmentSystem.cleanup();
        if (abandonmentNodesChanged) {
            this.optimizationTracker.cleanupNodeTracking();
            nodesChanged = true;
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
            emergencies: this.medicalSystem.getEmergencies(),
            currency: {
                player1: Math.floor(this.currency.player1),
                player2: Math.floor(this.currency.player2)
            },
            soundEvents: this.getSoundEvents() // Eventos de sonido de este tick
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
     * Obtiene el sistema de transporte del jugador según su raza
     * @param {string} team - Equipo del jugador
     * @returns {string} Tipo de sistema de transporte (standard/aerial)
     */
    getPlayerTransportSystem(team) {
        return this.raceManager.getPlayerTransportSystem(team);
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
    
}

