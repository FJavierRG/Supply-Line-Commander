// ===== SISTEMA DE IA (SERVIDOR) =====
// Sistema completo de IA para el enemigo player2

import { AIActionHandler } from '../handlers/AIActionHandler.js';
import { AICoreSystem } from '../ai/core/AICoreSystem.js';
import { DefaultDeckProfile } from '../ai/profiles/DefaultDeckProfile.js';
import { AIGameStateAnalyzer } from '../ai/core/AIGameStateAnalyzer.js';
import { AIActionSelector } from '../ai/core/AIActionSelector.js';
import { AICardEvaluator } from '../ai/core/AICardEvaluator.js';
import AIConfig, { 
    getDifficultyMultipliers,
    getAdjustedInterval,
    getAdjustedThreshold
} from '../ai/config/AIConfig.js';
import { GAME_CONFIG } from '../../config/gameConfig.js';
import { DEFAULT_DECK } from '../../config/defaultDeck.js';
import { getDefaultAIDeck } from '../ai/config/AIDecks.js';
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

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
        
        // 🎯 NUEVO: Sistema de perfiles - Usa mazos de IA separados del mazo del jugador
        // Los mazos de IA están definidos en game/ai/config/AIDecks.js
        // TODO FUTURO: Seleccionar perfil aleatoriamente o según configuración
        const aiDeck = getDefaultAIDeck();
        
        // 🎯 HARDCODEADO: Siempre usar DefaultDeckProfile con el mazo default de IA
        if (!aiDeck || !aiDeck.units || aiDeck.units.length === 0) {
            console.error('❌ IA: Error cargando mazo de IA, usando fallback');
            // Fallback: usar DEFAULT_DECK del servidor (solo en caso de error)
            this.profile = new DefaultDeckProfile(DEFAULT_DECK);
        } else {
            this.profile = new DefaultDeckProfile(aiDeck);
            console.log(`✅ IA: Mazo cargado desde AIDecks: ${aiDeck.name} (${aiDeck.units.length} unidades)`);
        }
        
        // Verificar que el perfil se creó correctamente
        if (!this.profile) {
            console.error('❌ IA: Error creando perfil, usando fallback');
            this.profile = new DefaultDeckProfile(DEFAULT_DECK);
        }
        
        // Estado interno
        this.active = false;
        this.currency = 0;
        this.lastCurrencyUpdate = 0;
        
        // 🎯 NUEVO: Sistema de órdenes de emergencia (prioridad absoluta)
        this.emergencyOrders = []; // Órdenes que deben ejecutarse inmediatamente
        
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
        
        // 🎯 NOTA: Sistema de razas obsoleto, solo se usa dificultad ahora
        
        // 🎯 OPTIMIZACIÓN: Validar edificios disponibles UNA VEZ al inicio
        this.availableBuildings = this.calculateAvailableBuildings();
        this.availableConsumables = this.calculateAvailableConsumables();
        
        // Tracking de amenazas del jugador
        this.lastPlayerActions = [];
        this.lastDroneLaunchTime = 0;
        
        // 🎯 Tracking de últimas construcciones (para evitar spam de mismo edificio)
        this.lastBuildings = []; // Array de los últimos buildingIds construidos (máx 5)
        
        // 🎯 Tracking de últimos objetivos atacados con drones (máx 2)
        this.lastDroneTargets = []; // Array de los últimos targetIds atacados (máx 2)
        
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
        
        // 🎯 NOTA: Sistema de razas obsoleto, solo se usa dificultad ahora
        this.raceId = this.getCurrentRace(); // Se mantiene por compatibilidad pero no se usa
        this.difficultyMultipliers = getDifficultyMultipliers(this.difficulty);
        
        // 🎯 NUEVO: Actualizar coreSystem con raza y dificultad actualizadas
        // Nota: El coreSystem ya se creó en el constructor, pero necesitamos actualizar sus referencias
        // Por ahora el coreSystem se crea con los valores correctos, pero si cambian, habría que recrearlo
        // Por simplicidad, asumimos que no cambian después de la creación
        
        // 🎯 Recalcular intervalos ajustados por dificultad
        // Nota: Los intervalos de abastecimiento, emergencias y reparaciones están en AICoreSystem
        const base = getAdjustedInterval('offensive', this.difficulty);
        const variance = AIConfig.intervals.offensiveVariance;
        const randomOffensive = base + (Math.random() * variance * 2) - variance;
        
        this.intervals = {
            strategic: Math.min(4.0 * this.difficultyMultipliers.buildingMultiplier, getAdjustedInterval('strategic', this.difficulty)), // Primera decisión más rápida (ajustada por dificultad)
            offensive: randomOffensive,
            harass: getAdjustedInterval('harass', this.difficulty),
            reaction: getAdjustedInterval('reaction', this.difficulty)
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
        
        // 🎯 PRIORIDAD ABSOLUTA: Procesar órdenes de emergencia ANTES que cualquier otra cosa
        this.processEmergencyOrders();
        
        // 🎯 NUEVO: Delegar lógica común al sistema core
        // El core maneja: abastecimiento (FOBs, frentes, helicópteros), emergencias médicas, reparaciones
        this.coreSystem.update(dt);
        
        // 🎯 NUEVO: Evaluación unificada de todas las acciones (edificios + consumibles)
        // Esto evita que se ejecuten decisiones separadas que compiten por el mismo dinero
        this.timers.strategic += dt;
        if (this.timers.strategic >= this.intervals.strategic) {
            this.timers.strategic = 0;
            this.handleUnifiedDecision(enemyTeam, currency);
        }
        
        // Decisiones ofensivas (cada X segundos variable) - MANTENER para cooldowns y timing específico
        this.timers.offensive += dt;
        if (this.timers.offensive >= this.intervals.offensive) {
            this.timers.offensive = 0;
            // 🐛 FIX: Usar getAdjustedInterval para respetar multiplicador de dificultad
            const base = getAdjustedInterval('offensive', this.difficulty);
            const variance = AIConfig.intervals.offensiveVariance;
            this.intervals.offensive = base + (Math.random() * variance * 2) - variance;
            // 🎯 NOTA: handleOffensiveDecision ahora solo se usa para consumibles con cooldowns específicos
            // La decisión principal se toma en handleUnifiedDecision
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
     * 🎯 NUEVO: Maneja decisiones unificadas (edificios + consumibles)
     * Evalúa TODAS las acciones juntas y ejecuta la mejor, evitando que decisiones separadas compitan por dinero
     */
    async handleUnifiedDecision(team, currency) {
        // Después de la primera decisión, usar intervalo normal ajustado
        if (this.firstStrategicDecision) {
            this.firstStrategicDecision = false;
            this.intervals.strategic = getAdjustedInterval('strategic', this.difficulty);
        }
        
        // 🎯 NOTA: Ya no se usa currencyStrategic - el sistema de colchón dinámico maneja el ahorro
        // Las acciones se evalúan con availableCurrency (currency - buffer), así que si no hay suficiente,
        // simplemente no se ejecutarán (ver línea 389)
        
        // 🎯 NUEVO: Usar sistema de perfiles para evaluar TODAS las acciones
        const state = AIGameStateAnalyzer.analyzeState(team, this.gameState);
        state.lastBuildings = this.lastBuildings;
        
        // 🎯 Obtener currency disponible (ya con colchón descontado)
        this.profile.updateCurrencyBuffer(this.gameState);
        const hasFobEmergency = state?.myFOBs !== undefined && state.myFOBs < 2;
        const availableCurrency = hasFobEmergency
            ? this.profile.getRawCurrency(this.gameState)
            : this.profile.getAvailableCurrency(this.gameState);
        
        // Evaluar TODAS las acciones (edificios + consumibles) juntas
        // 🎯 IMPORTANTE: Evaluar con currency real, no availableCurrency, para calcular scores correctos
        const allActions = this.profile.evaluateStrategicActions(this.gameState, team, currency, state);
        
        if (allActions.length === 0) {
            return;
        }
        
        // 🎯 NUEVO: Seleccionar la mejor acción por score (sin filtrar por currency)
        // Ordenar por score descendente y tomar la primera
        const sortedActions = allActions.sort((a, b) => b.score - a.score);
        const bestAction = sortedActions[0];
        
        if (!bestAction) {
            return;
        }
        
        // 🎯 NUEVO: Verificar si la mejor acción tiene suficiente currency disponible
        // Si no la tiene, ESPERAR en lugar de ejecutar una acción de menor prioridad
        if (bestAction.cost > availableCurrency) {
            if (AIConfig.debug?.logActions) {
                console.log(`⏳ IA: Mejor acción ${bestAction.cardId} (score: ${bestAction.score.toFixed(1)}) requiere ${bestAction.cost}, tiene ${availableCurrency.toFixed(1)} → ESPERANDO`);
            }
            return; // Esperar a la siguiente evaluación
        }
        
        // Ejecutar la mejor acción (puede ser build o attack)
        if (bestAction.type === 'build') {
            const success = await this.aiActionHandler.executeBuild(team, bestAction.cardId);
                        if (success) {
                this.lastBuildings.push(bestAction.cardId);
                if (this.lastBuildings.length > 5) {
                    this.lastBuildings.shift();
                }
            }
        } else if (bestAction.type === 'attack') {
            // 🎯 Si es un drone, pasar historial y función de actualización
            if (bestAction.cardId === 'drone') {
                // Función para actualizar el historial de objetivos atacados
                const updateDroneTargets = (targetId) => {
                    this.lastDroneTargets.push(targetId);
                    // Mantener solo los últimos 2
                    if (this.lastDroneTargets.length > 2) {
                        this.lastDroneTargets.shift();
                    }
                };
                
                this.aiActionHandler.executeAttack(
                    team, 
                    bestAction.cardId, 
                    this.lastDroneTargets, 
                    updateDroneTargets
                );
            } else {
                this.aiActionHandler.executeAttack(team, bestAction.cardId);
            }
            
            const now = this.gameState.gameTime || 0;
            this.lastConsumableUse[bestAction.cardId] = now;
        }
    }
    
    /**
     * Maneja construcciones estratégicas (FOBs, plantas, etc)
     * 🎯 DEPRECATED: Ahora se usa handleUnifiedDecision, pero mantenemos esto para compatibilidad
     * @deprecated Usar handleUnifiedDecision en su lugar
     */
    async handleStrategicBuilding(team, currency) {
        // Después de la primera decisión, usar intervalo normal ajustado
        if (this.firstStrategicDecision) {
            this.firstStrategicDecision = false;
            this.intervals.strategic = getAdjustedInterval('strategic', this.difficulty);
        }
        
        // 🎯 NOTA: Ya no se usa currencyStrategic - el sistema de colchón dinámico maneja el ahorro
        // Las acciones se evalúan con availableCurrency (currency - buffer), así que si no hay suficiente,
        // simplemente no se ejecutarán
        
        // 🎯 NUEVO: Usar sistema de perfiles para evaluar acciones
        const state = AIGameStateAnalyzer.analyzeState(team, this.gameState);
        // 🎯 Añadir historial de últimas construcciones al state
        state.lastBuildings = this.lastBuildings;
        
        // 🎯 Obtener currency disponible (ya con colchón descontado)
        this.profile.updateCurrencyBuffer(this.gameState);
        const hasFobEmergency = state?.myFOBs !== undefined && state.myFOBs < 2;
        const availableCurrency = hasFobEmergency
            ? this.profile.getRawCurrency(this.gameState)  // Emergencia FOB: ignorar colchón
            : this.profile.getAvailableCurrency(this.gameState);
        
        const recommendations = this.profile.evaluateStrategicActions(this.gameState, team, currency, state);
        
        // Filtrar solo edificios (no consumibles)
        const buildingActions = recommendations.filter(action => action.type === 'build');
        
        if (buildingActions.length === 0) {
            if (AIConfig.debug.logActions) {
            }
            return;
        }
        
        // Seleccionar mejor acción usando availableCurrency (con colchón ya descontado)
        const bestAction = AIActionSelector.selectBestAction(buildingActions, availableCurrency);
        
        if (!bestAction) {
            if (AIConfig.debug.logActions) {
            }
            return;
        }
        
        // 🎯 NOTA: El sistema de ahorro se maneja por el colchón dinámico en BaseProfile
        // Las acciones ya fueron evaluadas con availableCurrency (currency - buffer)
        // Si la mejor acción pasó el filtro, significa que tiene suficiente margen
        // No necesitamos verificación adicional aquí
        
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
        // 🎯 NOTA: Ya no se usa currencyThreshold - el sistema de colchón dinámico maneja el ahorro
        // Las acciones se evalúan con availableCurrency (currency - buffer), así que si no hay suficiente,
        // simplemente no se ejecutarán
        
        // 🎯 NUEVO: Usar sistema de perfiles para evaluar consumibles
        const state = AIGameStateAnalyzer.analyzeState(team, this.gameState);
        
        // 🎯 Obtener currency disponible (ya con colchón descontado)
        this.profile.updateCurrencyBuffer(this.gameState);
        const hasFobEmergency = state?.myFOBs !== undefined && state.myFOBs < 2;
        const availableCurrency = hasFobEmergency
            ? this.profile.getRawCurrency(this.gameState)  // Emergencia FOB: ignorar colchón
            : this.profile.getAvailableCurrency(this.gameState);
        
        const scoringRules = this.profile.getScoringRules();
        
        // 🎯 PRESUPUESTO DE CONSUMIBLES POR FASE
        let maxConsumableBudget = availableCurrency;
        if (typeof this.profile.getConsumableBudgetConfig === 'function') {
            const budgetConfig = this.profile.getConsumableBudgetConfig();
            const phaseBudgetFraction = budgetConfig?.[state.phase];
            if (typeof phaseBudgetFraction === 'number' && phaseBudgetFraction > 0) {
                maxConsumableBudget = availableCurrency * phaseBudgetFraction;
            }
        }
        
        const recommendations = AICardEvaluator.evaluateDeck(
            this.profile.getDeck(),
            this.gameState,
            team,
            availableCurrency,
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
        
        // Seleccionar mejor acción usando availableCurrency (con colchón ya descontado)
        const bestAction = AIActionSelector.selectBestAction(consumableActions, availableCurrency);
        
        if (!bestAction) {
            return;
        }
        
        // 🎯 NOTA: El sistema de ahorro se maneja por el colchón dinámico en BaseProfile
        // Las acciones ya fueron evaluadas con availableCurrency (currency - buffer)
        // Si la mejor acción pasó el filtro, significa que tiene suficiente margen
        // No necesitamos verificación adicional aquí
        
        // Ejecutar acción
        if (bestAction.type === 'attack') {
            // 🎯 Si es un drone, pasar historial y función de actualización
            if (bestAction.cardId === 'drone') {
                // Función para actualizar el historial de objetivos atacados
                const updateDroneTargets = (targetId) => {
                    this.lastDroneTargets.push(targetId);
                    // Mantener solo los últimos 2
                    if (this.lastDroneTargets.length > 2) {
                        this.lastDroneTargets.shift();
                    }
                };
                
                this.aiActionHandler.executeAttack(
                    team, 
                    bestAction.cardId, 
                    this.lastDroneTargets, 
                    updateDroneTargets
                );
            } else {
                this.aiActionHandler.executeAttack(team, bestAction.cardId);
            }
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
     * 🎯 DEPRECATED: Ahora usa getDifficultyMultipliers de AIConfig
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
        
        // 🎯 NUEVO: Para drones, crear orden de emergencia (prioridad absoluta)
        if (threatType === 'drone' && targetBuilding) {
            // Delegar al perfil para crear orden de emergencia
            const emergencyOrder = this.profile.createEmergencyAntiDroneOrder(
                threatData,
                targetBuilding,
                this.gameState,
                team,
                currency,
                this.difficulty
            );
            
            if (emergencyOrder) {
                const gameTime = this.gameState.gameTime || 0;
                const executeAt = gameTime; // Sin delay: reacción inmediata
                
                this.emergencyOrders.push({
                    executeAt,
                    order: emergencyOrder,
                    threatType,
                    threatData,
                    targetBuilding
                });
                
                // Procesar inmediatamente
                this.processEmergencyOrders();
                return; // No procesar como reacción normal
            }
        }
        
        // Para otras amenazas, usar sistema de reacciones normal
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
        
        // Para drones, ejecutar la reacción inmediatamente (sin delay extra)
        if (threatType === 'drone' && reaction.type === 'antiDrone') {
            this.buildReactiveAntiDrone(reaction.targetId, threatData, team);
            return;
        }
        
        // Programar la reacción (para amenazas no aéreas)
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
     * Procesa órdenes de emergencia (prioridad absoluta sobre todo lo demás)
     */
    processEmergencyOrders() {
        if (!this.active || this.emergencyOrders.length === 0) {
            return;
        }
        
        const gameTime = this.gameState.gameTime || 0;
        const team = 'player2';

        // Filtrar órdenes que ya deben ejecutarse
        const ordersToExecute = this.emergencyOrders.filter(eo => gameTime >= eo.executeAt);
        
        // Eliminar las órdenes que vamos a ejecutar
        this.emergencyOrders = this.emergencyOrders.filter(eo => gameTime < eo.executeAt);
        
        // Ejecutar cada orden de emergencia
        for (const emergencyOrder of ordersToExecute) {
            const { order, threatType, threatData, targetBuilding } = emergencyOrder;
            
            if (order.type === 'antiDrone') {
                console.log(`🚨 IA EMERGENCIA: Ejecutando orden de emergencia antiDrone para proteger ${targetBuilding?.type || 'edificio'}`);
                this.buildReactiveAntiDrone(order.targetId, threatData, team);
            }
        }
    }

    /**
     * Construye un antiDrone delante del edificio objetivo (sin delays)
     */
    buildReactiveAntiDrone(targetId, threatData, team) {
        if (!targetId) {
            console.warn('⚠️ IA: Orden antiDrone sin targetId');
            return false;
        }

        console.log(`🔍 buildReactiveAntiDrone: Buscando edificio con ID ${targetId.substring(0, 8)} para team ${team}`);

        const targetBuilding = this.gameState.nodes.find(n => 
            n.id === targetId && 
            n.team === team &&
            n.active
        );

        if (!targetBuilding) {
            console.warn(`⚠️ IA: Edificio objetivo ${targetId.substring(0, 8)} no encontrado para antiDrone`);
            // Listar todos los nodos del team para debug
            const teamNodes = this.gameState.nodes.filter(n => n.team === team && n.active);
            console.log(`🔍 Nodos del team ${team}: ${teamNodes.map(n => `${n.type}(${n.id.substring(0, 8)})`).join(', ')}`);
            return false;
        }

        console.log(`✅ buildReactiveAntiDrone: Edificio encontrado = ${targetBuilding.type} (${targetBuilding.id.substring(0, 8)}) en (${targetBuilding.x.toFixed(0)}, ${targetBuilding.y.toFixed(0)})`);

        const antiDronePosition = this.aiActionHandler.calculateReactiveAntiDronePosition(
            targetBuilding,
            threatData,
            team
        );

        if (!antiDronePosition) {
            console.warn(`⚠️ IA: No se pudo calcular posición para antiDrone cerca de ${targetBuilding.type}`);
            return false;
        }

        const antiDroneCost = SERVER_NODE_CONFIG.costs.antiDrone || 115;
        const currentCurrency = this.gameState.currency[team] || 0;

        if (currentCurrency < antiDroneCost) {
            console.warn(`⚠️ IA: Sin dinero suficiente para antiDrone (tiene: ${currentCurrency}, necesita: ${antiDroneCost})`);
            return false;
        }

        console.log(`✅ IA DEFENSA: Construyendo antiDrone en (${antiDronePosition.x.toFixed(0)}, ${antiDronePosition.y.toFixed(0)}) delante de ${targetBuilding.type} (${targetBuilding.id.substring(0, 8)})`);
        this.aiActionHandler.executeBuild(team, 'antiDrone', antiDronePosition);
        return true;
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
                if (AIConfig.debug.logActions) {
                    console.log(`🛡️ IA REACCIÓN: Construir antiDrone delante de edificio ${reaction.targetId} (amenaza: ${threatType})`);
                }
                this.buildReactiveAntiDrone(reaction.targetId, threatData, team);
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
        
        // (AntiDrone proactivo eliminado: se gestiona exclusivamente vía perfil y sistema de reacciones)
    }
    
}

