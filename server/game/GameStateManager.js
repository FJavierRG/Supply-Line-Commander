// ===== GESTOR DE ESTADO DEL JUEGO =====
import { v4 as uuidv4 } from 'uuid';
import { MedicalSystemServer } from '../systems/MedicalSystemServer.js';
import { FrontMovementSystemServer } from '../systems/FrontMovementSystemServer.js';
import { TerritorySystemServer } from '../systems/TerritorySystemServer.js';
import { DroneSystemServer } from '../systems/DroneSystemServer.js';
import { SERVER_NODE_CONFIG } from '../config/serverNodes.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { BuildHandler } from './handlers/BuildHandler.js';
import { ConvoyHandler } from './handlers/ConvoyHandler.js';
import { CombatHandler } from './handlers/CombatHandler.js';
import { CurrencySystem } from './systems/CurrencySystem.js';
import { ConstructionSystem } from './systems/ConstructionSystem.js';
import { EffectsSystem } from './systems/EffectsSystem.js';

export class GameStateManager {
    constructor(room) {
        this.room = room;
        this.nodes = [];
        this.convoys = [];
        this.currency = {
            player1: GAME_CONFIG.currency.initial,
            player2: GAME_CONFIG.currency.initial
        };
        this.currencyGenerated = {
            player1: GAME_CONFIG.currency.initial,
            player2: GAME_CONFIG.currency.initial
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
        
        // Handlers de acciones
        this.buildHandler = new BuildHandler(this);
        this.convoyHandler = new ConvoyHandler(this);
        this.combatHandler = new CombatHandler(this);
        
        // Sistemas de actualización
        this.currencySystem = new CurrencySystem(this);
        this.constructionSystem = new ConstructionSystem(this);
        this.effectsSystem = new EffectsSystem(this);
        
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
    
    /**
     * Obtiene el estado inicial del juego
     */
    getInitialState() {
        // Generar mapa simétrico (misma estructura que Mission20)
        const baseWidth = 1920;
        const baseHeight = 1080;
        
        // HQ Jugador 1 (izquierda)
        this.nodes.push(this.createNode('hq', 'player1', baseWidth * 0.06, baseHeight * 0.5));
        
        // HQ Jugador 2 (derecha)
        this.nodes.push(this.createNode('hq', 'player2', baseWidth * 0.94, baseHeight * 0.5));
        
        // FOBs Jugador 1
        this.nodes.push(this.createNode('fob', 'player1', baseWidth * 0.208, baseHeight * 0.722, 50));
        this.nodes.push(this.createNode('fob', 'player1', baseWidth * 0.208, baseHeight * 0.259, 50));
        
        // FOBs Jugador 2
        this.nodes.push(this.createNode('fob', 'player2', baseWidth * 0.792, baseHeight * 0.722, 50));
        this.nodes.push(this.createNode('fob', 'player2', baseWidth * 0.792, baseHeight * 0.259, 50));
        
        // Frentes Jugador 1
        this.nodes.push(this.createNode('front', 'player1', baseWidth * 0.35, baseHeight * 0.722, 100));
        this.nodes.push(this.createNode('front', 'player1', baseWidth * 0.35, baseHeight * 0.259, 100));
        
        // Frentes Jugador 2
        this.nodes.push(this.createNode('front', 'player2', baseWidth * 0.65, baseHeight * 0.722, 100));
        this.nodes.push(this.createNode('front', 'player2', baseWidth * 0.65, baseHeight * 0.259, 100));
        
        return {
            nodes: this.serializeNodes(),
            currency: { ...this.currency },
            duration: this.duration,
            worldWidth: baseWidth,
            worldHeight: baseHeight
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
            isConstructing: false
        };
        
        // Propiedades según tipo
        if (type === 'hq') {
            node.hasSupplies = false;
            node.supplies = null; // Infinitos
            node.hasVehicles = true;
            node.maxVehicles = 4;
            node.availableVehicles = 4;
            // Sistema médico para ambulancias
            node.hasMedicalSystem = true;
            node.ambulanceAvailable = true;
            node.maxAmbulances = 1;
        } else if (type === 'fob') {
            node.hasSupplies = true;
            node.maxSupplies = 100;
            node.supplies = supplies !== null ? supplies : 0;
            node.hasVehicles = true;
            node.maxVehicles = 2;
            node.availableVehicles = 2;
        } else if (type === 'front') {
            node.hasSupplies = true;
            node.maxSupplies = 100;
            node.supplies = supplies !== null ? supplies : 100;
            node.consumeRate = 1.6;
            node.maxXReached = x;
        }
        
        return node;
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
     * Verifica si un nodo tiene cambios significativos desde el último envío
     */
    hasNodeSignificantChanges(node) {
        const lastNodeState = this.lastNodeStates.get(node.id);
        
        // Si es la primera vez que vemos este nodo, enviarlo
        if (!lastNodeState) {
            return true;
        }
        
        // Cambios críticos que SIEMPRE requieren actualización
        if (node.constructed !== lastNodeState.constructed ||
            node.isConstructing !== lastNodeState.isConstructing ||
            node.active !== lastNodeState.active ||
            node.isAbandoning !== lastNodeState.isAbandoning) {
            return true;
        }
        
        // Cambios en posición (crítico para frentes)
        if (Math.abs(node.x - lastNodeState.x) > 0.1 || 
            Math.abs(node.y - lastNodeState.y) > 0.1) {
            return true;
        }
        
        // Cambios significativos en supplies (≥5 unidades)
        if (node.supplies !== null && lastNodeState.supplies !== null) {
            if (Math.abs(node.supplies - lastNodeState.supplies) >= 5) {
                return true;
            }
        }
        
        // Cambios en vehículos disponibles
        if (node.availableVehicles !== lastNodeState.availableVehicles) {
            return true;
        }
        
        // Cambios en ambulance availability
        if (node.ambulanceAvailable !== lastNodeState.ambulanceAvailable) {
            return true;
        }
        
        // Construction timer - actualizar más frecuentemente para barrita fluida
        if (node.isConstructing && node.constructionTimer !== undefined && lastNodeState.constructionTimer !== undefined) {
            if (Math.abs(node.constructionTimer - lastNodeState.constructionTimer) >= 0.03) {
                return true; // Actualizar cada ~0.03s para 30+ FPS suaves
            }
        }
        
        // Cambios en efectos
        if (node.effects && node.effects.length !== (lastNodeState.effects?.length || 0)) {
            return true;
        }
        
        return false;
    }

    /**
     * Serializa nodos para enviar a cliente - SOLO los que han cambiado significativamente
     */
    serializeNodes() {
        // Filtrar nodos destruidos (active: false) y solo enviar los que han cambiado
        return this.nodes
            .filter(node => node.active !== false && this.hasNodeSignificantChanges(node))
            .map(node => {
                // Guardar estado actual para próxima comparación
                this.lastNodeStates.set(node.id, {
                    x: node.x,
                    y: node.y,
                    active: node.active,
                    constructed: node.constructed,
                    isConstructing: node.isConstructing,
                    constructionTimer: node.constructionTimer || 0,
                    supplies: node.supplies,
                    availableVehicles: node.availableVehicles,
                    ambulanceAvailable: node.ambulanceAvailable,
                    isAbandoning: node.isAbandoning,
                    effects: node.effects ? [...node.effects] : []
                });
                
                return {
                    id: node.id,
                    type: node.type,
                    team: node.team,
                    x: node.x,
                    y: node.y,
                    active: node.active,
                    constructed: node.constructed,
                    isConstructing: node.isConstructing,
                    constructionTimer: node.constructionTimer || 0,
                    constructionTime: node.constructionTime || 2,
                    supplies: node.supplies,
                    maxSupplies: node.maxSupplies,
                    availableVehicles: node.availableVehicles,
                    maxVehicles: node.maxVehicles,
                    consumeRate: node.consumeRate,
                    maxXReached: node.maxXReached,
                    minXReached: node.minXReached,
                    isAbandoning: node.isAbandoning,
                    abandonPhase: node.abandonPhase,
                    effects: node.effects || [],
                    // Propiedades del sistema médico
                    hasMedicalSystem: node.hasMedicalSystem || false,
                    ambulanceAvailable: node.ambulanceAvailable || false,
                    maxAmbulances: node.maxAmbulances || 0
                };
            });
    }
    
    /**
     * Verifica si un convoy tiene cambios significativos desde el último envío
     */
    hasConvoySignificantChanges(convoy) {
        const lastConvoyState = this.lastConvoyStates.get(convoy.id);
        
        // Si es la primera vez que vemos este convoy, enviarlo
        if (!lastConvoyState) {
            return true;
        }
        
        // Cambios significativos en progress (≥0.1 según roadmap)
        if (Math.abs(convoy.progress - lastConvoyState.progress) >= 0.1) {
            return true;
        }
        
        // Cambios críticos
        if (convoy.returning !== lastConvoyState.returning) {
            return true;
        }
        
        return false;
    }

    /**
     * Serializa convoyes para enviar a cliente - SOLO los que han cambiado significativamente
     */
    serializeConvoys() {
        return this.convoys
            .filter(convoy => this.hasConvoySignificantChanges(convoy))
            .map(convoy => {
                // Guardar estado actual para próxima comparación
                this.lastConvoyStates.set(convoy.id, {
                    progress: convoy.progress,
                    returning: convoy.returning
                });
                
                return {
                    id: convoy.id,
                    fromId: convoy.fromId,
                    toId: convoy.toId,
                    team: convoy.team,
                    vehicleType: convoy.vehicleType,
                    cargo: convoy.cargo,
                    progress: convoy.progress,
                    returning: convoy.returning,
                    isMedical: convoy.isMedical || false,
                    targetFrontId: convoy.targetFrontId || null
                };
            });
    }

    /**
     * Serializa TODOS los nodos para envío inicial (sin filtrado)
     */
    serializeAllNodes() {
        // Filtrar solo nodos destruidos, pero enviar todos los demás sin filtrado de cambios
        return this.nodes
            .filter(node => node.active !== false)
            .map(node => {
                // Guardar estado para tracking (aunque sea inicial)
                this.lastNodeStates.set(node.id, {
                    x: node.x,
                    y: node.y,
                    active: node.active,
                    constructed: node.constructed,
                    isConstructing: node.isConstructing,
                    constructionTimer: node.constructionTimer || 0,
                    supplies: node.supplies,
                    availableVehicles: node.availableVehicles,
                    ambulanceAvailable: node.ambulanceAvailable,
                    isAbandoning: node.isAbandoning,
                    effects: node.effects ? [...node.effects] : []
                });
                
                return {
                    id: node.id,
                    type: node.type,
                    team: node.team,
                    x: node.x,
                    y: node.y,
                    active: node.active,
                    constructed: node.constructed,
                    isConstructing: node.isConstructing,
                    constructionTimer: node.constructionTimer || 0,
                    constructionTime: node.constructionTime || 2,
                    supplies: node.supplies,
                    maxSupplies: node.maxSupplies,
                    availableVehicles: node.availableVehicles,
                    maxVehicles: node.maxVehicles,
                    consumeRate: node.consumeRate,
                    maxXReached: node.maxXReached,
                    minXReached: node.minXReached,
                    isAbandoning: node.isAbandoning,
                    abandonPhase: node.abandonPhase,
                    effects: node.effects || [],
                    // Propiedades del sistema médico
                    hasMedicalSystem: node.hasMedicalSystem || false,
                    ambulanceAvailable: node.ambulanceAvailable || false,
                    maxAmbulances: node.maxAmbulances || 0
                };
            });
    }

    /**
     * Serializa TODOS los convoyes para envío inicial (sin filtrado)
     */
    serializeAllConvoys() {
        return this.convoys.map(convoy => {
            // Guardar estado para tracking (aunque sea inicial)
            this.lastConvoyStates.set(convoy.id, {
                progress: convoy.progress,
                returning: convoy.returning
            });
            
            return {
                id: convoy.id,
                fromId: convoy.fromId,
                toId: convoy.toId,
                team: convoy.team,
                vehicleType: convoy.vehicleType,
                cargo: convoy.cargo,
                progress: convoy.progress,
                returning: convoy.returning,
                isMedical: convoy.isMedical || false,
                targetFrontId: convoy.targetFrontId || null
            };
        });
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
     * Maneja lanzamiento de dron
     */
    handleDroneLaunch(playerTeam, targetId) {
        return this.combatHandler.handleDroneLaunch(playerTeam, targetId);
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
                console.log(`🏆 Enviando evento de victoria: ${this.victoryResult.winner}`);
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
                console.log('🎮 Servidor: Countdown terminado - INICIANDO SIMULACIÓN');
                
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
        for (let i = this.convoys.length - 1; i >= 0; i--) {
            const convoy = this.convoys[i];
            
            // Calcular velocidad basada en distancia y velocidad del vehículo
            const fromNode = this.nodes.find(n => n.id === convoy.fromId);
            const toNode = this.nodes.find(n => n.id === convoy.toId);
            
            if (!fromNode || !toNode) {
                // Nodo no existe, eliminar convoy
                console.warn(`⚠️ Convoy ${convoy.id} tiene nodo inexistente, eliminando`);
                this.convoys.splice(i, 1);
                continue;
            }
            
            // Usar distancia inicial fija (no recalcular cada frame)
            const distance = convoy.initialDistance || 1; // Fallback a 1 para convoys viejos
            
            if (distance < 1) {
                // Distancia inválida, eliminar convoy
                console.warn(`⚠️ Convoy ${convoy.id} tiene distancia 0, eliminando`);
                this.convoys.splice(i, 1);
                continue;
            }
            
            // Velocidad del vehículo (píxeles por segundo) - IGUAL para ida y vuelta
            let vehicleSpeed;
            if (convoy.vehicleType === 'heavy_truck') {
                vehicleSpeed = 40; // Camión pesado
            } else if (convoy.vehicleType === 'ambulance') {
                vehicleSpeed = 60; // Ambulancia: 20% más rápida que truck (50 * 1.2 = 60)
            } else {
                vehicleSpeed = 50; // Truck normal
            }
            
            // Bonus de EngineerCenter: +50% velocidad
            const hasEngineerCenter = this.nodes.some(n => 
                n.type === 'engineerCenter' && n.team === convoy.team && n.constructed
            );
            if (hasEngineerCenter) {
                vehicleSpeed *= 1.5; // +50% velocidad
            }
            
            // Progress por segundo = velocidad / distancia (usa distancia fija)
            const progressPerSecond = vehicleSpeed / distance;
            
            // Actualizar progress
            convoy.progress += progressPerSecond * dt;
            
            // Llegó al destino
            if (convoy.progress >= 1) {
                if (!convoy.returning) {
                    // === AMBULANCIA: Resolver emergencia e iniciar regreso ===
                    if (convoy.isMedical) {
                        this.medicalSystem.resolveEmergency(convoy.targetFrontId);
                        console.log(`🚑 Ambulancia ${convoy.id} llegó - Emergencia resuelta en ${convoy.targetFrontId} - Regresando al HQ`);
                        
                        // Iniciar regreso (igual que convoy normal)
                        convoy.returning = true;
                        convoy.progress = 0;
                        continue;
                    }
                    
                    // === CONVOY NORMAL: Entregar cargo ===
                    const toNode = this.nodes.find(n => n.id === convoy.toId);
                    if (toNode && toNode.hasSupplies && toNode.supplies !== null) {
                        toNode.supplies = Math.min(toNode.maxSupplies, toNode.supplies + convoy.cargo);
                    }
                    
                    // Iniciar regreso
                    convoy.returning = true;
                    convoy.progress = 0;
                } else {
                    // Llegó de vuelta, devolver vehículo/ambulancia
                    const fromNode = this.nodes.find(n => n.id === convoy.fromId);
                    
                    if (convoy.isMedical && fromNode) {
                        // === AMBULANCIA: Devolver al sistema correspondiente ===
                        if (fromNode.hasMedicalSystem && fromNode.type === 'hq') {
                            // HQ: devolver al sistema médico
                            fromNode.ambulanceAvailable = true;
                            console.log(`🚑 Ambulancia ${convoy.id} regresó al HQ ${fromNode.team} - Disponible: ${fromNode.ambulanceAvailable}`);
                        } else if (fromNode.hasVehicles && fromNode.type === 'campaignHospital') {
                            // Hospital de campaña: devolver vehículo
                            fromNode.availableVehicles = Math.min(fromNode.maxVehicles, fromNode.availableVehicles + 1);
                            console.log(`🚑 Ambulancia ${convoy.id} regresó al Hospital ${fromNode.team} - Vehículos disponibles: ${fromNode.availableVehicles}`);
                        } else {
                            console.warn(`⚠️ Ambulancia ${convoy.id} intentó regresar pero fromNode no tiene sistema médico/vehículos válido:`, fromNode ? `${fromNode.type} ${fromNode.team} hasMedical=${fromNode.hasMedicalSystem} hasVehicles=${fromNode.hasVehicles}` : 'null');
                        }
                    } else if (fromNode && fromNode.hasVehicles) {
                        // === CONVOY NORMAL: Devolver vehículo ===
                        fromNode.availableVehicles = Math.min(fromNode.maxVehicles, fromNode.availableVehicles + 1);
                        console.log(`🚛 Vehículo ${convoy.id} regresó al ${fromNode.type} ${fromNode.team} - Vehículos: ${fromNode.availableVehicles}/${fromNode.maxVehicles}`);
                    } else {
                        console.warn(`⚠️ Convoy ${convoy.id} intentó regresar pero fromNode no válido:`, fromNode ? `${fromNode.type} hasVehicles=${fromNode.hasVehicles}` : 'null');
                    }
                    
                    // Eliminar convoy
                    this.convoys.splice(i, 1);
                }
            }
        }
        
        // === CONSUMO DE SUPPLIES EN FRENTES ===
        for (const node of this.nodes) {
            if (node.type === 'front' && node.hasSupplies) {
                const consumeRate = node.consumeRate || 1.6;
                const beforeSupplies = node.supplies;
                node.supplies = Math.max(0, node.supplies - consumeRate * dt);
                
                // DEBUG: Log consumo cada 3 segundos
                if (!this._lastSupplyLog) this._lastSupplyLog = {};
                if (!this._lastSupplyLog[node.id] || Date.now() - this._lastSupplyLog[node.id] > 3000) {
                    const consumed = beforeSupplies - node.supplies;
                    console.log(`⛽ ${node.team} frente: ${node.supplies.toFixed(1)} supplies (consumió ${consumed.toFixed(2)} en ${dt.toFixed(2)}s @ ${consumeRate}x/s)`);
                    this._lastSupplyLog[node.id] = Date.now();
                }
            }
        }
        
        // === SISTEMAS DE SIMULACIÓN ===
        
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
        
        // Limpiar nodos destruidos del servidor (eliminados del array)
        if (droneResult.impacts.length > 0 || droneResult.interceptions.length > 0) {
            const beforeCount = this.nodes.length;
            this.nodes = this.nodes.filter(n => n.active !== false);
            
            // Limpiar tracking de nodos eliminados
            if (this.nodes.length < beforeCount) {
                this.cleanupNodeTracking();
            }
        }
        
        // === ACTUALIZAR EFECTOS TEMPORALES ===
        this.effectsSystem.updateEffects(dt);
        
        // === LIMPIAR TRACKING MAPS (cada 60 ticks para optimizar) ===
        if (this.tickCounter % 60 === 0) {
            this.cleanupConvoyTracking();
        }
        
        // === PREPARAR ESTADO COMPLETO PARA ENVIAR ===
        return this.getGameState();
    }
    
    /**
     * Limpia tracking maps de nodos/convoyes eliminados
     */
    cleanupNodeTracking() {
        const activeNodeIds = new Set(this.nodes.map(n => n.id));
        // Limpiar tracking de nodos que ya no existen
        for (const nodeId of this.lastNodeStates.keys()) {
            if (!activeNodeIds.has(nodeId)) {
                this.lastNodeStates.delete(nodeId);
            }
        }
    }
    
    cleanupConvoyTracking() {
        const activeConvoyIds = new Set(this.convoys.map(c => c.id));
        // Limpiar tracking de convoyes que ya no existen
        for (const convoyId of this.lastConvoyStates.keys()) {
            if (!activeConvoyIds.has(convoyId)) {
                this.lastConvoyStates.delete(convoyId);
            }
        }
    }
    
    /**
     * Verifica si hay cambios significativos desde el último envío
     */
    hasSignificantChanges(currentState) {
        // Si es el primer envío, siempre enviar
        if (!this.lastSentState) {
            return true;
        }
        
        // Verificar cambios en currency (solo si hay diferencia ≥ $5)
        const currencyChange = Math.abs(currentState.currency.player1 - this.lastSentState.currency.player1) +
                             Math.abs(currentState.currency.player2 - this.lastSentState.currency.player2);
        if (currencyChange >= 5) {
            return true;
        }
        
        // Verificar cambios en número de nodos
        if (currentState.nodes.length !== this.lastSentState.nodes.length) {
            return true;
        }
        
        // Verificar cambios en convoyes
        if (currentState.convoys.length !== this.lastSentState.convoys.length) {
            return true;
        }
        
        // Verificar cambios en drones
        if (currentState.drones.length !== this.lastSentState.drones.length) {
            return true;
        }
        
        // Verificar cambios en emergencias
        if (currentState.emergencies.length !== this.lastSentState.emergencies.length) {
            return true;
        }
        
        // Verificar eventos de sonido
        if (currentState.soundEvents.length > 0) {
            return true;
        }
        
        // Verificar cambios específicos en nodos (construction, supplies significativos)
        for (let i = 0; i < currentState.nodes.length; i++) {
            const currentNode = currentState.nodes[i];
            const lastNode = this.lastSentState.nodes[i];
            
            if (!lastNode) continue; // Nuevo nodo
            
            // Cambios críticos que SIEMPRE requieren actualización
            if (currentNode.constructed !== lastNode.constructed ||
                currentNode.isConstructing !== lastNode.isConstructing ||
                currentNode.active !== lastNode.active) {
                return true;
            }
            
            // Cambios significativos en supplies (≥5 unidades)
            if (currentNode.supplies !== null && lastNode.supplies !== null) {
                const supplyDiff = Math.abs(currentNode.supplies - lastNode.supplies);
                if (supplyDiff >= 5) {
                    return true;
                }
            }
            
            // Cambios en posición (crítico para frentes)
            if (currentNode.x !== lastNode.x || currentNode.y !== lastNode.y) {
                return true;
            }
        }
        
        // Verificar cambios en convoyes (progress significativo)
        for (let i = 0; i < currentState.convoys.length; i++) {
            const currentConvoy = currentState.convoys[i];
            const lastConvoy = this.lastSentState.convoys[i];
            
            if (!lastConvoy) continue;
            
            // Cambios significativos en progress (≥0.1)
            if (Math.abs(currentConvoy.progress - lastConvoy.progress) >= 0.1) {
                return true;
            }
        }
        
        return false;
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
            nodes: this.serializeAllNodes(),
            convoys: this.serializeAllConvoys(), // También todos los convoyes
            drones: this.droneSystem.getDrones(), // Drones activos con posiciones
            emergencies: this.medicalSystem.getEmergencies(),
            currency: {
                player1: Math.floor(this.currency.player1),
                player2: Math.floor(this.currency.player2)
            },
            soundEvents: this.getSoundEvents() // Eventos de sonido de este tick
        };
        
        // Durante sync inicial, siempre enviar. Después, aplicar optimización
        if (!isInitialSync && !this.hasSignificantChanges(state)) {
            return null; // Skip update - no envía nada
        }
        
        // Guardar estado actual como referencia para próxima comparación
        this.lastSentState = JSON.parse(JSON.stringify(state));
        
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
     * Verifica si una posición X está dentro del territorio de un equipo
     */
    isInTeamTerritory(x, team) {
        const fronts = this.nodes.filter(n => 
            n.type === 'front' && 
            n.team === team && 
            (n.active === undefined || n.active === true) // Considerar undefined como true
        );
        
        if (fronts.length === 0) {
            // Sin frentes, permitir construir solo cerca del HQ
            const hq = this.nodes.find(n => n.type === 'hq' && n.team === team);
            if (!hq) return false;
            
            // Permitir construcción en un radio de 300px del HQ
            return Math.abs(x - hq.x) <= 300;
        }
        
        // Calcular frontera del equipo
        const frontierGapPx = 25;
        let frontier;
        
        if (team === 'player1') {
            // Player1 avanza a la derecha
            frontier = Math.max(...fronts.map(f => f.x + frontierGapPx));
            // Player1 puede construir a la izquierda de su frontera
            const hq = this.nodes.find(n => n.type === 'hq' && n.team === team);
            return x >= (hq?.x || 0) && x <= frontier;
        } else {
            // Player2 avanza a la izquierda
            frontier = Math.min(...fronts.map(f => f.x - frontierGapPx));
            // Player2 puede construir a la derecha de su frontera
            const hq = this.nodes.find(n => n.type === 'hq' && n.team === team);
            return x <= (hq?.x || 1920) && x >= frontier;
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
}

