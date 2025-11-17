// ===== SISTEMA DE IA (SERVIDOR) =====
// Sistema completo de IA para el enemigo player2

import { AIActionHandler } from '../handlers/AIActionHandler.js';
import { AICoreSystem } from '../ai/core/AICoreSystem.js';
import { DefaultDeckProfile } from '../ai/profiles/DefaultDeckProfile.js';
import { AIGameStateAnalyzer } from '../ai/core/AIGameStateAnalyzer.js';
import { AIActionSelector } from '../ai/core/AIActionSelector.js';
import { AICardEvaluator } from '../ai/core/AICardEvaluator.js';
import AIConfig from '../ai/config/AIConfig.js';
import { GAME_CONFIG } from '../../config/gameConfig.js';
import { DEFAULT_DECK } from '../../config/defaultDeck.js';
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';
import { 
    getRaceAIConfig, 
    getDifficultyMultipliers,
    getAdjustedInterval,
    getAdjustedScore,
    getAdjustedThreshold
} from '../ai/config/RaceAIConfig.js';

export class AISystem {
    constructor(gameState, io, roomId) {
        this.gameState = gameState;
        this.io = io;           // Socket.IO para emitir eventos
        this.roomId = roomId;   // ID de la sala para broadcast
        this.aiActionHandler = new AIActionHandler(gameState, io, roomId);
        
        // 🎯 NUEVO: Sistema core para lógica común (abastecimiento, emergencias, reparaciones)
        this.raceId = this.getCurrentRace();
        this.difficulty = this.gameState.room?.aiPlayer?.difficulty || 'medium';
        this.coreSystem = new AICoreSystem(gameState, io, roomId, this.raceId, this.difficulty);
        
        // 🎯 NUEVO: Sistema de perfiles - HARDCODEADO para usar DefaultDeckProfile
        // TODO FUTURO: Seleccionar perfil aleatoriamente o según configuración
        // Por ahora, siempre usar DefaultDeckProfile con el mazo del jugador IA
        const aiDeck = this.gameState.getPlayerDeck('player2') || DEFAULT_DECK;
        
        // 🎯 HARDCODEADO: Siempre usar DefaultDeckProfile (en el futuro será random)
        if (!aiDeck || !aiDeck.units || aiDeck.units.length === 0) {
            console.warn('⚠️ IA: No se encontró mazo para player2, usando DEFAULT_DECK');
            this.profile = new DefaultDeckProfile(DEFAULT_DECK);
        } else {
            this.profile = new DefaultDeckProfile(aiDeck);
        }
        
        // Verificar que el perfil se creó correctamente
        if (!this.profile) {
            console.error('❌ IA: Error creando perfil, usando DEFAULT_DECK como fallback');
            this.profile = new DefaultDeckProfile(DEFAULT_DECK);
        }
        
        // Estado interno
        this.active = false;
        this.currency = 0;
        this.lastCurrencyUpdate = 0;
        
        // Timers (solo para decisiones estratégicas y ofensivas, el core maneja su propio timing)
        this.timers = {
            strategic: 0,
            offensive: 0,
            harass: 0,
            statusReport: 0,
            reaction: 0
        };
        
        // 🎯 ENCAPSULACIÓN: Intervalos ajustados por raza y dificultad
        // Nota: Para obtener la dificultad correcta, necesitamos calcularlos después de establecer difficulty
        // Por ahora usamos valores temporales, se recalcularán en activate()
        this.intervals = {
            strategic: AIConfig.intervals.strategic, // Temporal, se ajustará en activate()
            offensive: AIConfig.intervals.offensive,  // Temporal, se ajustará en activate()
            harass: AIConfig.intervals.harass,  // Temporal, se ajustará en activate()
            reaction: 0.5  // Temporal, se ajustará en activate()
        };
        
        // Flag para primera decisión estratégica
        this.firstStrategicDecision = true;
        
        // Sistema de dificultad (ya establecido arriba)
        this.difficultyMultipliers = getDifficultyMultipliers(this.difficulty);
        
        // 🎯 ENCAPSULACIÓN: Obtener raza actual y configuración
        this.raceConfig = getRaceAIConfig(this.raceId);
        
        // 🎯 OPTIMIZACIÓN: Validar edificios disponibles UNA VEZ al inicio
        this.availableBuildings = this.calculateAvailableBuildings();
        this.availableConsumables = this.calculateAvailableConsumables();
        
        // Tracking de amenazas del jugador
        this.lastPlayerActions = [];
        this.lastDroneLaunchTime = 0;
        
        // 🎯 Tracking de últimas construcciones (para evitar spam de mismo edificio)
        this.lastBuildings = []; // Array de los últimos buildingIds construidos (máx 5)
        
        // 🎯 Sistema de reacciones defensivas programadas (con delay para que el cliente vea la amenaza)
        this.pendingReactions = []; // Array de { executeAt, reaction, threatType, threatData, targetBuilding }
        
        // Stats
        this.stats = {
            dronesLaunched: 0,
            snipersLaunched: 0,
            buildingsBuilt: 0,
            decisionsExecuted: 0
        };
        
        // Cooldowns internos de consumibles (por tipo de carta)
        this.lastConsumableUse = {};
        
    }
    
    /**
     * Activa la IA
     */
    activate() {
        this.active = true;
        
        // 🎯 RECALCULAR edificios disponibles al activar (por si la raza se configuró después)
        this.availableBuildings = this.calculateAvailableBuildings();
        this.availableConsumables = this.calculateAvailableConsumables();
        
        // 🎯 ENCAPSULACIÓN: Recalcular raza y configuración
        this.raceId = this.getCurrentRace();
        this.raceConfig = getRaceAIConfig(this.raceId);
        this.difficultyMultipliers = getDifficultyMultipliers(this.difficulty);
        
        // 🎯 NUEVO: Actualizar coreSystem con raza y dificultad actualizadas
        // Nota: El coreSystem ya se creó en el constructor, pero necesitamos actualizar sus referencias
        // Por ahora el coreSystem se crea con los valores correctos, pero si cambian, habría que recrearlo
        // Por simplicidad, asumimos que no cambian después de la creación
        
        // 🎯 ENCAPSULACIÓN: Recalcular intervalos ajustados por raza y dificultad
        // Nota: Los intervalos de abastecimiento, emergencias y reparaciones están en AICoreSystem
        const base = getAdjustedInterval('offensive', this.raceId, this.difficulty);
        const variance = AIConfig.intervals.offensiveVariance;
        const randomOffensive = base + (Math.random() * variance * 2) - variance;
        
        this.intervals = {
            strategic: Math.min(4.0 * this.difficultyMultipliers.buildingMultiplier, getAdjustedInterval('strategic', this.raceId, this.difficulty)), // Primera decisión más rápida (ajustada por dificultad)
            offensive: randomOffensive,
            harass: getAdjustedInterval('harass', this.raceId, this.difficulty),
            reaction: getAdjustedInterval('reaction', this.raceId, this.difficulty)
        };
        
        // Debug: Verificar nodos iniciales
        const team = 'player2';
        const myNodes = this.gameState.nodes.filter(n => n.team === team);
        const hq = myNodes.find(n => n.type === 'hq');
        const myFOBs = myNodes.filter(n => n.type === 'fob');
        const myFronts = myNodes.filter(n => n.type === 'front');
        
        if (AIConfig.debug.logSupply) {
            if (myFOBs.length > 0) {
                myFOBs.forEach(fob => {
                });
            }
        }
    }
    
    /**
     * Desactiva la IA
     */
    deactivate() {
        this.active = false;
    }
    
    /**
     * Debe activarse la IA?
     */
    shouldActivate() {
        const hasAIPlayer = this.gameState.room?.aiPlayer !== undefined;
        const hasAIFlag = this.gameState.room?.hasAI === true;
        
        if (hasAIPlayer && !hasAIFlag) {
        }
        
        return hasAIPlayer && hasAIFlag;
    }
    
    /**
     * Calcula qué edificios puede construir la IA (una vez al inicio)
     * 🎯 NUEVO: Obtiene edificios desde el mazo del perfil
     */
    calculateAvailableBuildings() {
        // Obtener edificios desde el mazo del perfil
        const deck = this.profile?.getDeck();
        if (!deck || !deck.units) {
            return [];
        }
        
        // Filtrar solo edificios (no consumibles)
        // Los edificios no tienen targetType en SERVER_NODE_CONFIG
        const buildings = deck.units.filter(cardId => {
            const hasTargetType = SERVER_NODE_CONFIG.gameplay?.behavior?.[cardId]?.targetType !== undefined;
            return !hasTargetType; // Edificios no tienen targetType
        });
        
        return buildings;
    }
    
    /**
     * Calcula qué consumibles puede usar la IA (una vez al inicio)
     * 🎯 NUEVO: Obtiene consumibles desde el mazo del perfil
     */
    calculateAvailableConsumables() {
        // Obtener consumibles desde el mazo del perfil
        const deck = this.profile?.getDeck();
        if (!deck || !deck.units) {
            return [];
        }
        
        // Filtrar solo consumibles (tienen targetType en SERVER_NODE_CONFIG)
        const consumables = deck.units.filter(cardId => {
            const hasTargetType = SERVER_NODE_CONFIG.gameplay?.behavior?.[cardId]?.targetType !== undefined;
            return hasTargetType; // Consumibles tienen targetType
        });
        
        return consumables;
    }
    
    /**
     * Verifica si puede construir un edificio (usando cache)
     */
    canBuild(buildingType) {
        return this.availableBuildings.includes(buildingType);
    }
    
    /**
     * Verifica si puede usar un consumible (usando cache)
     */
    canUse(consumableType) {
        return this.availableConsumables.includes(consumableType);
    }
    
    /**
     * Obtiene la raza actual del jugador IA
     */
    getCurrentRace() {
        const raceManager = this.gameState.raceManager;
        const team = 'player2';
        return raceManager.getPlayerRace(team) || 'A_Nation'; // Fallback a A_Nation
    }
    
    /**
     * Actualiza la IA (llamado cada tick)
     */
    update(dt) {
        // Solo activar si hay IA en la partida
        if (!this.shouldActivate()) {
            this.active = false;
            return;
        }
        
        // Activar si no está activa
        if (!this.active) {
            this.activate();
        }
        
        // Debug: Log cada 10s para ver qué está pasando
        if (this.timers.statusReport % 10 < 0.5 && this.timers.statusReport > 0) {
            const currency = this.gameState.currency?.player2 || 0;
        }
        
        // Actualizar currency
        this.updateCurrency(dt);
        
        // Obtener recursos locales
        const enemyTeam = 'player2';
        const currency = this.gameState.currency[enemyTeam] || 0;
        
        // 🎯 NUEVO: Delegar lógica común al sistema core
        // El core maneja: abastecimiento (FOBs, frentes, helicópteros), emergencias médicas, reparaciones
        this.coreSystem.update(dt);
        
        // Construcciones estratégicas (cada X segundos)
        this.timers.strategic += dt;
        if (this.timers.strategic >= this.intervals.strategic) {
            this.timers.strategic = 0;
            this.handleStrategicBuilding(enemyTeam, currency);
        }
        
        // Decisiones ofensivas (cada X segundos variable)
        this.timers.offensive += dt;
        if (this.timers.offensive >= this.intervals.offensive) {
            this.timers.offensive = 0;
            // 🐛 FIX: Usar getAdjustedInterval para respetar multiplicador de dificultad
            const base = getAdjustedInterval('offensive', this.raceId, this.difficulty);
            const variance = AIConfig.intervals.offensiveVariance;
            this.intervals.offensive = base + (Math.random() * variance * 2) - variance;
            this.handleOffensiveDecision(enemyTeam, currency);
        }
        
        // Reacciones a amenazas del jugador (cada 0.5s)
        this.timers.reaction += dt;
        if (this.timers.reaction >= this.intervals.reaction) {
            this.timers.reaction = 0;
            this.handleReactions(enemyTeam, currency);
        }
        
        // 🎯 NUEVO: Procesar reacciones defensivas programadas (con delay)
        this.processPendingReactions();
        
        // Reporte de estado (cada 30s)
        this.timers.statusReport += dt;
        if (this.timers.statusReport >= AIConfig.intervals.statusReport) {
            this.timers.statusReport = 0;
            this.logStatus(enemyTeam, currency);
        }
    }
    
    /**
     * Actualiza currency de IA
     */
    updateCurrency(dt) {
        // Currency se maneja en CurrencySystem
        // Solo trackeamos el valor actual
        if (this.gameState.currency) {
            const newCurrency = this.gameState.currency.player2 || 0;
            
            // Debug: Detectar incrementos sospechosos de currency
            if (AIConfig.debug.logActions && this.currency > 0) {
                const currencyIncrease = newCurrency - this.currency;
                if (currencyIncrease > 50) {
                }
            }
            
            this.currency = newCurrency;
        }
    }
    
    /**
     * Maneja construcciones estratégicas (FOBs, plantas, etc)
     * 🎯 NUEVO: Usa sistema de perfiles
     */
    async handleStrategicBuilding(team, currency) {
        // Después de la primera decisión, usar intervalo normal ajustado
        if (this.firstStrategicDecision) {
            this.firstStrategicDecision = false;
            this.intervals.strategic = getAdjustedInterval('strategic', this.raceId, this.difficulty);
        }
        
        // 🎯 ENCAPSULACIÓN: Usar umbral ajustado por raza y dificultad
        // Nota: currencyThreshold ahora es 1.0 para todas las dificultades (solo velocidad cambia)
        const threshold = getAdjustedThreshold('currencyStrategic', this.raceId, this.difficulty) || 50;
        if (currency < threshold) {
            if (AIConfig.debug.logActions) {
            }
            return;
        }
        
        // 🎯 NUEVO: Usar sistema de perfiles para evaluar acciones
        const state = AIGameStateAnalyzer.analyzeState(team, this.gameState);
        // 🎯 Añadir historial de últimas construcciones al state
        state.lastBuildings = this.lastBuildings;
        const recommendations = this.profile.evaluateStrategicActions(this.gameState, team, currency, state);
        
        // Filtrar solo edificios (no consumibles)
        const buildingActions = recommendations.filter(action => action.type === 'build');
        
        if (buildingActions.length === 0) {
            if (AIConfig.debug.logActions) {
            }
            return;
        }
        
        // Seleccionar mejor acción
        const bestAction = AIActionSelector.selectBestAction(buildingActions, currency);
        
        if (!bestAction) {
            if (AIConfig.debug.logActions) {
            }
            return;
        }
        
        // Ejecutar acción
        if (bestAction.type === 'build') {
            if (AIConfig.debug.logActions) {
            }
            const success = await this.aiActionHandler.executeBuild(team, bestAction.cardId);
            
            // 🎯 Registrar construcción en historial (solo si fue exitosa)
            if (success) {
                this.lastBuildings.push(bestAction.cardId);
                // Mantener solo las últimas 5 construcciones
                if (this.lastBuildings.length > 5) {
                    this.lastBuildings.shift();
                }
            }
        }
    }
    
    /**
     * Maneja decisiones ofensivas (drones, snipers, etc)
     * 🎯 NUEVO: Usa sistema de perfiles
     */
    handleOffensiveDecision(team, currency) {
        const buildHandler = this.gameState.buildHandler;
        const costs = buildHandler.getBuildingCosts();
        const minCost = Math.min(
            costs['sniperStrike'] || 60,
            costs['drone'] || 150
        );
        const threshold = minCost * this.difficultyMultipliers.currencyThreshold;
        
        if (currency < threshold) return;
        
        // 🎯 NUEVO: Usar sistema de perfiles para evaluar consumibles
        const state = AIGameStateAnalyzer.analyzeState(team, this.gameState);
        const scoringRules = this.profile.getScoringRules();
        
        // 🎯 PRESUPUESTO DE CONSUMIBLES POR FASE
        let maxConsumableBudget = currency;
        if (typeof this.profile.getConsumableBudgetConfig === 'function') {
            const budgetConfig = this.profile.getConsumableBudgetConfig();
            const phaseBudgetFraction = budgetConfig?.[state.phase];
            if (typeof phaseBudgetFraction === 'number' && phaseBudgetFraction > 0) {
                maxConsumableBudget = currency * phaseBudgetFraction;
            }
        }
        
        const recommendations = AICardEvaluator.evaluateDeck(
            this.profile.getDeck(),
            this.gameState,
            team,
            currency,
            state,
            scoringRules,
            this.profile // Pasar el perfil para condiciones personalizadas
        );
        
        // Filtrar solo consumibles (no edificios)
        let consumableActions = recommendations.filter(action => action.type === 'attack');
        
        // Aplicar presupuesto de consumibles por fase
        consumableActions = consumableActions.filter(action => action.cost <= maxConsumableBudget);
        
        // 🎯 RATE-LIMIT DE HARASS (sniper, sabotajes) POR FASE
        const now = this.gameState.gameTime || 0;
        if (typeof this.profile.getConsumableCooldownConfig === 'function') {
            const cooldownConfig = this.profile.getConsumableCooldownConfig() || {};
            const phaseCooldowns = cooldownConfig[state.phase] || {};
            
            consumableActions = consumableActions.filter(action => {
                const cardId = action.cardId;
                const cooldownSeconds = phaseCooldowns[cardId];
                
                // Si no hay cooldown configurado para este consumible en esta fase, dejarlo pasar
                if (!cooldownSeconds || cooldownSeconds <= 0) {
                    return true;
                }
                
                const lastUse = this.lastConsumableUse[cardId] ?? -Infinity;
                return (now - lastUse) >= cooldownSeconds;
            });
        }
        
        if (typeof this.profile.applyPhasePriorities === 'function' && consumableActions.length > 0) {
            consumableActions = this.profile.applyPhasePriorities(consumableActions, state.phase);
        }
        
        if (consumableActions.length === 0) {
            return;
        }
        
        // Seleccionar mejor acción
        const bestAction = AIActionSelector.selectBestAction(consumableActions, currency);
        
        if (!bestAction) {
            return;
        }
        
        // Ejecutar acción
        if (bestAction.type === 'attack') {
            this.aiActionHandler.executeAttack(team, bestAction.cardId);
            // Registrar uso para cooldowns
            const now = this.gameState.gameTime || 0;
            this.lastConsumableUse[bestAction.cardId] = now;
        }
    }
    
    /**
     * Log de estado
     */
    logStatus(team, currency) {
        const state = AIGameStateAnalyzer.analyzeState(team, this.gameState);
    }
    
    /**
     * Obtiene multiplicadores según dificultad
     * 🎯 DEPRECATED: Ahora usa getDifficultyMultipliers de RaceAIConfig
     * Mantenido por compatibilidad, pero debería eliminarse
     */
    getDifficultyMultipliers() {
        return getDifficultyMultipliers(this.difficulty);
    }
    
    /**
     * Maneja detección de amenazas del jugador (llamado desde handlers cuando se despliegan amenazas)
     * @param {string} threatType - Tipo de amenaza ('commando', 'truckAssault', 'cameraDrone', 'drone')
     * @param {Object} threatData - Datos de la amenaza (nodo, posición, etc.)
     * @param {boolean} isDeployed - Si la amenaza está desplegada/lista para atacar (para camera drone)
     * @param {Object} targetBuilding - Para drones bomba, el edificio objetivo
     */
    onThreatDetected(threatType, threatData, isDeployed = true, targetBuilding = null) {
        if (!this.active || !this.profile) {
            return;
        }
        
        const team = 'player2';
        const currency = this.gameState.currency[team] || 0;
        
        // Delegar al perfil para decidir la respuesta
        const reaction = this.profile.handleDefensiveReaction(
            threatType,
            threatData,
            isDeployed,
            targetBuilding,
            this.gameState,
            team,
            currency,
            this.difficulty
        );
        
        if (!reaction) {
            return; // No reacciona
        }
        
        // 🎯 FIX: Programar la reacción con un delay para que el cliente pueda ver la amenaza
        // Delays según dificultad (simula tiempo de reacción humano)
        const reactionDelays = {
            easy: 2.5,    // 2.5 segundos (más lento, más error humano)
            medium: 1.8,  // 1.8 segundos (medio)
            hard: 1.2     // 1.2 segundos (más rápido, pero aún con delay)
        };
        
        const baseDelay = reactionDelays[this.difficulty] || 1.8;
        // Añadir variación aleatoria (±0.3s) para simular reacciones más naturales
        const variance = 0.3;
        const randomVariation = (Math.random() * variance * 2) - variance;
        const reactionDelay = Math.max(1.0, baseDelay + randomVariation); // Mínimo 1 segundo
        
        const gameTime = this.gameState.gameTime || 0;
        const executeAt = gameTime + reactionDelay;
        
        // Programar la reacción
        this.pendingReactions.push({
            executeAt,
            reaction,
            threatType,
            threatData,
            targetBuilding
        });
        
                    if (AIConfig.debug.logActions) {
            console.log(`⏱️ IA: Reacción programada contra ${threatType} para ejecutarse en ${reactionDelay.toFixed(1)}s`);
        }
    }
    
    /**
     * Procesa reacciones defensivas programadas que ya deben ejecutarse
     */
    processPendingReactions() {
        if (!this.active || this.pendingReactions.length === 0) {
            return;
        }
        
        const gameTime = this.gameState.gameTime || 0;
        const team = 'player2';
        
        // Filtrar reacciones que ya deben ejecutarse
        const reactionsToExecute = this.pendingReactions.filter(pr => gameTime >= pr.executeAt);
        
        // Eliminar las reacciones que vamos a ejecutar
        this.pendingReactions = this.pendingReactions.filter(pr => gameTime < pr.executeAt);
        
        // Ejecutar cada reacción
        for (const pendingReaction of reactionsToExecute) {
            const { reaction, threatType, threatData, targetBuilding } = pendingReaction;
            
            // Verificar que la amenaza aún existe (puede haber sido eliminada)
            if (reaction.type === 'sniper' && threatData && threatData.id) {
                const threatStillExists = this.gameState.nodes.find(n => 
                    n.id === threatData.id && 
                    n.active && 
                    !n.isAbandoning
                );
                
                if (!threatStillExists) {
                    if (AIConfig.debug.logActions) {
                        console.log(`⚠️ IA: Amenaza ${threatType} ${threatData.id} ya no existe, cancelando reacción`);
                    }
                    continue;
                }
            }
            
            // Ejecutar la reacción
            if (reaction.type === 'sniper') {
                // Lanzar sniper strike contra el objetivo específico
                if (AIConfig.debug.logActions) {
                    console.log(`🎯 IA REACCIÓN: Sniper strike contra ${threatType} ${reaction.targetId}`);
                }
                this.aiActionHandler.executeSniperAttack(
                    this.gameState.nodes.filter(n => n.team === team && n.active),
                    team,
                    reaction.targetId
                );
            } else if (reaction.type === 'antiDrone') {
                // Construir antiDrone delante del edificio objetivo (en dirección al drone)
                if (AIConfig.debug.logActions) {
                    console.log(`🛡️ IA REACCIÓN: Construir antiDrone delante de edificio ${reaction.targetId} (amenaza: ${threatType})`);
                }
                
                // Obtener el edificio objetivo
                const targetBuilding = this.gameState.nodes.find(n => 
                    n.id === reaction.targetId && 
                    n.team === team &&
                    n.active
                );
                
                if (!targetBuilding) {
                    console.warn(`⚠️ IA: Edificio objetivo ${reaction.targetId} no encontrado para antiDrone`);
                    return;
                }
                
                // Calcular posición delante del edificio (en dirección al drone)
                const antiDronePosition = this.aiActionHandler.calculateReactiveAntiDronePosition(
                    targetBuilding,
                    threatData, // Datos del drone enemigo para calcular dirección
                    team
                );
                
                if (!antiDronePosition) {
                    console.warn(`⚠️ IA: No se pudo calcular posición para antiDrone cerca de ${targetBuilding.type}`);
                    return;
                }
                
                console.log(`✅ IA DEFENSA: Construyendo antiDrone en (${antiDronePosition.x.toFixed(0)}, ${antiDronePosition.y.toFixed(0)}) delante de ${targetBuilding.type}`);
                
                // Construir antiDrone en la posición calculada
                this.aiActionHandler.executeBuild(team, 'antiDrone', antiDronePosition);
            }
        }
    }
    
    /**
     * Maneja reacciones a amenazas del jugador
     */
    handleReactions(team, currency) {
        const playerNodes = this.gameState.nodes.filter(n => n.team === 'player1' && n.active);
        const myNodes = this.gameState.nodes.filter(n => n.team === team && n.active);
        
        // Detectar plantas nucleares del jugador
        const playerPlants = playerNodes.filter(n => n.type === 'nuclearPlant');
        const myPlants = myNodes.filter(n => n.type === 'nuclearPlant');
        
        // Detectar lanzaderas del jugador
        const playerHasLauncher = playerNodes.some(n => n.type === 'droneLauncher');
        
        // Urgencia: Si jugador tiene más plantas que yo, debo construir una
        // Nota: currencyThreshold ahora es 1.0, así que el umbral es el mismo para todas las dificultades
        const plantCost = this.gameState.buildHandler.getBuildingCosts()['nuclearPlant'] || 200;
        if (playerPlants.length > myPlants.length && currency >= plantCost) {
            this.stats.decisionsExecuted++;
            if (AIConfig.debug.logActions) {
            }
            this.aiActionHandler.executeBuild(team, 'nuclearPlant');
            return;
        }
        
        // Detectar presión aérea usando el analizador de estado
        const state = AIGameStateAnalyzer.analyzeState(team, this.gameState);
        
        // Si jugador tiene lanzadera o hay presión aérea reciente: considerar construir anti-drone
        const antiDroneCost = this.gameState.buildHandler.getBuildingCosts()['antiDrone'] || 115;
        if ((playerHasLauncher || state.hasAirThreat) && currency >= antiDroneCost) {
            const hasAntiDrone = myNodes.some(n => n.type === 'antiDrone');
            if (!hasAntiDrone) {
                // Probabilidad de "acierto" dependiente de dificultad
                let reactProbability = 0.7; // medium por defecto
                if (this.difficulty === 'easy') {
                    reactProbability = 0.45;
                } else if (this.difficulty === 'hard') {
                    reactProbability = 0.9;
                }
                
                if (Math.random() < reactProbability) {
                    this.stats.decisionsExecuted++;
                    if (AIConfig.debug.logActions) {
                        console.log(`🤖 IA REACCIÓN: Construir anti-drone (presión aérea detectada, dificultad=${this.difficulty})`);
                    }
                    this.aiActionHandler.executeBuild(team, 'antiDrone');
                }
            }
        }
    }
    
}

