// ===== PERFIL DE MAZO POR DEFECTO =====
// Implementa el perfil de IA para el mazo por defecto del juego
//
// MAZO: ['hq', 'fob', 'antiDrone', 'droneLauncher', 'truckFactory', 'engineerCenter', 'nuclearPlant', 'intelRadio', 'drone', 'sniperStrike']
//
// LÓGICA DEL PERFIL:
// ==================
// 1. EDIFICIOS (Buildings):
//    - fob (140$): Base 40. +30 si <2 FOBs, +20 si early phase. Máx: 90. Ratio: 0.64
//      → Prioridad alta en early game para expandir territorio
//    - nuclearPlant (200$): Base 50. +30 por cada planta del jugador, -25 por cada planta propia. Ratio: 0.25 base
//      → Prioridad media-alta en mid game. Penaliza spam para evitar sobre-construcción
//    - droneLauncher (120$): Base 60. Sin bonuses. Ratio: 0.5
//      → Prioridad alta en mid game. Requerido para usar drones
//    - antiDrone (135$): Base 30. Sin bonuses. Ratio: 0.22
//      → Prioridad baja, defensivo. Útil en late game contra drones enemigos
//    - truckFactory (90$): Base 45. +15 si no late. Máx: 60. Ratio: 0.67
//      → Prioridad alta en early game. Mejora logística
//    - engineerCenter (80$): Base 40. +10 si early. Máx: 50. Ratio: 0.625
//      → Prioridad alta en early game. Mejora velocidad de convoyes
//    - intelRadio (90$): Base 35. Sin bonuses. Ratio: 0.39
//      → Prioridad media en mid game. Mejora detección
//
// 2. CONSUMIBLES (Attacks):
//    - drone (170$): Base 65. +40 si hay targets. Máx: 105. Ratio: 0.62
//      → Prioridad alta en late game. Requiere droneLauncher construido
//    - sniperStrike (40$): Base 30. +20 bonus base (siempre). Total: 50. Ratio: 1.25
//      → Prioridad alta en late game. Muy eficiente, bajo coste
//
// 3. PRIORIDADES POR FASE (getPriorities):
//    - earlyGame: ['fob', 'truckFactory', 'engineerCenter'] → Expansión y logística
//    - midGame: ['nuclearPlant', 'droneLauncher', 'intelRadio'] → Economía y capacidad ofensiva
//    - lateGame: ['antiDrone', 'drone', 'sniperStrike'] → Defensa y ataques
//
// NOTA: Las prioridades por fase están definidas pero NO se usan actualmente.
//       El sistema funciona solo con scores calculados dinámicamente.

import { BaseProfile } from './BaseProfile.js';
import { AICardEvaluator } from '../core/AICardEvaluator.js';
import { AIGameStateAnalyzer } from '../core/AIGameStateAnalyzer.js';
import AIConfig from '../config/AIConfig.js';
import { SERVER_NODE_CONFIG } from '../../../config/serverNodes.js';

export class DefaultDeckProfile extends BaseProfile {
    constructor(deck) {
        super(deck);
    }
    
    /**
     * Retorna el ID único del perfil
     */
    getProfileId() {
        return 'default';
    }
    
    /**
     * Retorna las reglas de scoring del perfil
     */
    getScoringRules() {
        return {
            'fob': {
                base: 40,
                bonuses: {
                    // Early: puede construir FOBs normalmente (hasta cierto punto)
                    earlyPhase: 20,     // +20 si fase early
                    hasLessThan2: 30,   // +30 si tiene <2 FOBs (primeros FOBs)
                    // Mid: solo construir si tiene <3 FOBs (objetivo: 3 FOBs en mid)
                    // NOTA: hasLessThan3 solo aplica en mid/late, no en early
                    midPhaseAndLessThan3: 30,  // +30 si está en mid Y tiene <3 FOBs
                    // Late: solo construir si tiene <4 FOBs (objetivo: 4 FOBs en late)
                    latePhaseAndLessThan4: 25, // +25 si está en late Y tiene <4 FOBs
                    // Penalización si tiene demasiados FOBs
                    has4OrMore: -999,   // Penalización enorme si tiene >=4 FOBs
                    // Penalización adicional: en mid, si ya tiene 2 FOBs, no construir más
                    midPhaseAndHas2OrMore: -50  // Penalización en mid si tiene >=2 FOBs
                }
            },
            'nuclearPlant': {
                base: 50,
                bonuses: {
                    perPlayerPlant: 30,  // +30 por cada planta del jugador
                    perMyPlant: -25,     // -25 por cada planta propia (evitar spam)
                    midPhase: 15,        // En mid, empujar a construir si es viable
                    latePhase: 25,       // En late, aún más peso si vamos por detrás
                    hasExcessCurrency: 20 // +20 si tiene mucho dinero (flexibilidad para construir antes de late)
                }
            },
            'droneLauncher': {
                base: 60,
                bonuses: {}
            },
            'antiDrone': {
                // Base defensiva baja, pero con grandes boosts cuando hay amenaza aérea
                base: 10,
                bonuses: {
                    airThreat: 95,      // Bonus cuando hay cualquier amenaza aérea
                    airThreatHigh: 25,  // Extra si la presión aérea es alta
                    latePhase: 15       // Más relevante en late
                }
            },
            'truckFactory': {
                base: 45,
                bonuses: {
                    notLate: 15  // +15 si no está en fase late
                }
            },
            'engineerCenter': {
                base: 40,
                bonuses: {
                    earlyPhase: 10  // +10 si fase early
                }
            },
            'intelRadio': {
                base: 35,
                bonuses: {
                    earlyPhase: 15, // Priorizar antena en early como parte del núcleo eco/logístico
                    midPhase: 10    // Mantenerla relevante en mid
                }
            },
            'drone': {
                // 🎯 Ajustado a comportamiento por fases:
                // - Early: fuertemente penalizado (prácticamente no se usa)
                // - Mid: empieza a ser interesante pero aún contenido
                // - Late: prioridad alta contra objetivos importantes
                base: 20,
                bonuses: {
                    hasTargets: 40,   // +40 si hay objetivos disponibles
                    earlyPhase: -999, // Penalización enorme en early → se filtra al fondo de la lista
                    midPhase: 15,     // Pequeño empuje en mid
                    latePhase: 40,    // Gran empuje en late
                    hasExcessCurrency: 25 // +25 si tiene mucho dinero (flexibilidad para usar drones antes de late)
                }
            },
            'sniperStrike': {
                // 🎯 Harass eficiente sobre todo en mid/late
                base: 10,
                bonuses: {
                    base: 20,   // Bonus base siempre aplica
                    notEarly: 20 // +20 extra en mid/late → más uso fuera de early
                }
            },
            // 🎯 Preparado para futuros mazos que incluyan fobSabotage
            'fobSabotage': {
                base: 20,
                bonuses: {
                    playerHasFOBs: 20, // Solo tiene sentido si el jugador tiene FOBs
                    midPhase: 20,      // Relevante en mid
                    latePhase: 20      // Y en late
                }
            }
        };
    }
    
    /**
     * Retorna las prioridades del perfil por fase
     */
    getPriorities() {
        return {
            earlyGame: ['truckFactory', 'engineerCenter', 'sniperStrike', 'intelRadio'], // FOB removido, prioridad en talleres y pokeo
            midGame: ['fob', 'droneLauncher', 'sniperStrike'], // FOBs para expansión, lanzadera, y pokeo continuo
            lateGame: ['drone', 'nuclearPlant', 'intelRadio', 'antiDrone'] // Drones, economía, y defensa
        };
    }
    
    /**
     * Configuración de caps de FOBs por fase
     * Define cuántos FOBs máximo puede construir la IA en cada fase
     */
    getFOBPhaseCaps() {
        return {
            early: 2,  // Early: máximo 2 FOBs (no es tan necesario al principio)
            mid: 5,    // Mid: hasta 5 FOBs (expansión: 2 más que early)
            late: 6    // Late: hasta 6 FOBs
        };
    }
    
    /**
     * Configuración de presupuesto de consumibles por fase
     * Los valores son fracción de la currency actual que se permite gastar
     * en un único consumible ofensivo (drone, sniper, sabotajes, etc).
     */
    getConsumableBudgetConfig() {
        return {
            early: 0.25, // Early: ~20–25% de la currency actual
            mid: 0.4,    // Mid: ~35–40%
            late: 0.6    // Late: hasta ~50–60% si la economía está sana
        };
    }
    
    /**
     * Configuración de cooldown de consumibles por fase (en segundos)
     * Pensado para limitar el harass en early sin bloquear mid/late.
     */
    getConsumableCooldownConfig() {
        return {
            early: {
                sniperStrike: 25, // Máx. 1 sniper cada ~25s en early
                fobSabotage: 35   // Máx. 1 sabotaje cada ~35s en early (si está en el mazo)
            },
            mid: {
                sniperStrike: 15,
                fobSabotage: 25
            },
            late: {
                sniperStrike: 10,
                fobSabotage: 20
            }
        };
    }
    
    /**
     * Evalúa acciones estratégicas disponibles
     * @param {Object} gameState - Estado del juego
     * @param {string} team - Equipo de la IA
     * @param {number} currency - Currency actual del equipo
     * @param {Object} state - Estado analizado del juego (opcional, se calculará si no se proporciona)
     * @returns {Array} Lista de acciones evaluadas ordenadas por score
     */
    evaluateStrategicActions(gameState, team, currency, state = null) {
        // Si no se proporciona el estado, analizarlo
        if (!state) {
            state = AIGameStateAnalyzer.analyzeState(team, gameState);
        }
        
        // Obtener reglas de scoring del perfil
        const scoringRules = this.getScoringRules();
        
        // Evaluar todas las cartas del mazo (pasar el perfil para condiciones personalizadas)
        const actions = AICardEvaluator.evaluateDeck(
            this.deck,
            gameState,
            team,
            currency,
            state,
            scoringRules,
            this // Pasar el perfil para condiciones personalizadas
        );
        
        // 🎯 Aplicar reglas específicas del perfil (penalizaciones, etc.)
        const actionsWithProfileRules = this.applyProfileSpecificRules(actions, state, gameState, currency);
        
        return this.applyPhasePriorities(actionsWithProfileRules, state.phase);
    }
    
    /**
     * Evalúa condiciones personalizadas de bonus específicas del perfil
     * @param {string} bonusName - Nombre del bonus
     * @param {number} bonusValue - Valor del bonus
     * @param {Object} state - Estado analizado del juego
     * @param {Object} gameState - Estado completo del juego
     * @param {string} team - Equipo de la IA
     * @returns {boolean|undefined} Si la condición se cumple, o undefined si no es una condición de este perfil
     */
    evaluateCustomBonusCondition(bonusName, bonusValue, state, gameState, team, currency = 0) {
        // Condiciones específicas del perfil default
        switch (bonusName) {
            case 'hasLessThan2':
                return state.myFOBs !== undefined && state.myFOBs < 2;
            case 'hasLessThan3':
                return state.myFOBs !== undefined && state.myFOBs < 3;
            case 'hasLessThan4':
                return state.myFOBs !== undefined && state.myFOBs < 4;
            case 'has4OrMore':
                return state.myFOBs !== undefined && state.myFOBs >= 4;
            case 'midPhaseAndLessThan3':
                // Solo en mid Y si tiene <3 FOBs
                return state.phase === 'mid' && state.myFOBs !== undefined && state.myFOBs < 3;
            case 'latePhaseAndLessThan4':
                // Solo en late Y si tiene <4 FOBs
                return state.phase === 'late' && state.myFOBs !== undefined && state.myFOBs < 4;
            case 'midPhaseAndHas2OrMore':
                // Penalización: en mid, si ya tiene >=2 FOBs
                return state.phase === 'mid' && state.myFOBs !== undefined && state.myFOBs >= 2;
            case 'hasExcessCurrency':
                // 🎯 NUEVO: Tiene mucho dinero (más de 400) - permite flexibilidad para construir antes de late
                // Esto permite que la IA use drones y plantas nucleares en mid si tiene mucho dinero
                return currency >= 400;
            case 'forHelicopters':
                // Verificar si necesita reabastecimiento con helicópteros
                // Por ahora retornar false, se puede implementar después
                return false;
            default:
                return undefined; // No es una condición de este perfil
        }
    }
    
    /**
     * Aplica reglas específicas del perfil default (penalizaciones, etc.)
     * @param {Array} actions - Lista de acciones evaluadas
     * @param {Object} state - Estado analizado del juego
     * @param {Object} gameState - Estado completo del juego
     * @param {number} currency - Currency actual
     * @returns {Array} Lista de acciones con reglas del perfil aplicadas
     */
    applyProfileSpecificRules(actions, state, gameState, currency) {
        if (!Array.isArray(actions) || actions.length === 0) {
            return actions;
        }
        
        let filteredActions = actions;
        
        // 🎯 REGLA ESPECÍFICA DEL PERFIL DEFAULT: Bloquear spam de intelRadio
        // Si las últimas 2 construcciones fueron intelRadio, BLOQUEAR completamente la tercera
        if (state.lastBuildings && state.lastBuildings.length >= 2) {
            const lastTwo = state.lastBuildings.slice(-2);
            if (lastTwo[0] === 'intelRadio' && lastTwo[1] === 'intelRadio') {
                // Eliminar completamente la opción de construir otra intelRadio
                filteredActions = filteredActions.filter(action => action.cardId !== 'intelRadio');
            }
        }
        
        // 🎯 ALGORITMO DE EVALUACIÓN DE INTEL RADIO EN MID GAME
        // Intel radio es una inversión, solo construirla si:
        // 1. Estamos en mid game
        // 2. Tenemos menos de 2 intel radios
        // 3. Tenemos suficiente currency (coste + margen de seguridad del 50%)
        // 4. Tenemos al menos 1 planta nuclear (economía estable) O tenemos mucha currency
        if (state.phase === 'mid') {
            const intelRadioAction = filteredActions.find(action => action.cardId === 'intelRadio');
            if (intelRadioAction) {
                const intelRadioCost = intelRadioAction.cost || 50;
                const hasEnoughCurrency = currency >= (intelRadioCost * 1.5); // Margen de seguridad 50%
                const hasStableEconomy = (state.myPlants >= 1) || (currency >= intelRadioCost * 3); // Planta nuclear o mucha currency
                const hasLessThan2Radios = (state.myIntelRadios || 0) < 2;
                
                // Si no cumple las condiciones, eliminar intel radio de las opciones
                if (!hasEnoughCurrency || !hasStableEconomy || !hasLessThan2Radios) {
                    filteredActions = filteredActions.filter(action => action.cardId !== 'intelRadio');
                }
            }
        }
        
        // 🎯 CAPS DE FOBS POR FASE (específico del perfil)
        // Aplicar límites de FOBs según la fase actual
        const fobAction = filteredActions.find(action => action.cardId === 'fob');
        if (fobAction && state.myFOBs !== undefined) {
            const fobCaps = this.getFOBPhaseCaps();
            const phaseCap = fobCaps[state.phase] ?? 3;
            if (state.myFOBs >= phaseCap) {
                // Eliminar FOB de las opciones si ya se alcanzó el cap
                filteredActions = filteredActions.filter(action => action.cardId !== 'fob');
            }
        }
        
        // 🎯 EDIFICIOS ÚNICOS: Solo se puede tener uno de cada
        // Truck Factory: solo uno en early es suficiente
        const truckFactoryAction = filteredActions.find(action => action.cardId === 'truckFactory');
        if (truckFactoryAction) {
            const hasTruckFactory = gameState.nodes.some(n => 
                n.team === 'player2' && 
                n.type === 'truckFactory' && 
                n.active &&
                n.constructed
            );
            if (hasTruckFactory) {
                // Eliminar truckFactory de las opciones si ya tiene uno
                filteredActions = filteredActions.filter(action => action.cardId !== 'truckFactory');
            }
        }
        
        // Engineer Center: solo uno es suficiente
        const engineerCenterAction = filteredActions.find(action => action.cardId === 'engineerCenter');
        if (engineerCenterAction) {
            const hasEngineerCenter = gameState.nodes.some(n => 
                n.team === 'player2' && 
                n.type === 'engineerCenter' && 
                n.active &&
                n.constructed
            );
            if (hasEngineerCenter) {
                // Eliminar engineerCenter de las opciones si ya tiene uno
                filteredActions = filteredActions.filter(action => action.cardId !== 'engineerCenter');
            }
        }
        
        // 🎯 NUEVO: Drone Launcher: solo una es suficiente (evitar spam)
        const droneLauncherAction = filteredActions.find(action => action.cardId === 'droneLauncher');
        if (droneLauncherAction) {
            const hasDroneLauncher = gameState.nodes.some(n => 
                n.team === 'player2' && 
                n.type === 'droneLauncher' && 
                n.active &&
                n.constructed
            );
            if (hasDroneLauncher) {
                // Eliminar droneLauncher de las opciones si ya tiene una
                filteredActions = filteredActions.filter(action => action.cardId !== 'droneLauncher');
            }
        }
        
        // 🎯 NUEVO: Lógica de ahorro cuando tiene mucho dinero
        // Si tiene más de 400 de currency y tiene los talleres y radios, reducir scores para permitir ahorro
        const hasTruckFactory = gameState.nodes.some(n => 
            n.team === 'player2' && 
            n.type === 'truckFactory' && 
            n.active &&
            n.constructed
        );
        const hasEngineerCenter = gameState.nodes.some(n => 
            n.team === 'player2' && 
            n.type === 'engineerCenter' && 
            n.active &&
            n.constructed
        );
        const intelRadiosCount = gameState.nodes.filter(n => 
            n.team === 'player2' && 
            n.type === 'intelRadio' && 
            n.active &&
            n.constructed
        ).length;
        
        // Si tiene los dos talleres y al menos 2 radios, y tiene mucho dinero, reducir scores para permitir ahorro
        if (currency >= 400 && hasTruckFactory && hasEngineerCenter && intelRadiosCount >= 2) {
            // Reducir scores de todas las acciones para que sea menos probable que gaste todo
            // Esto permite que la IA ahorre dinero para usar drones y plantas nucleares
            filteredActions = filteredActions.map(action => ({
                ...action,
                score: action.score * 0.7 // Reducir score en 30% para hacer menos probable el gasto
            }));
        }
        
        return filteredActions;
    }
    
    /**
     * Ajusta los scores según las prioridades configuradas para la fase actual
     * @param {Array} actions - Lista de acciones evaluadas
     * @param {string} phase - Fase del juego ('early' | 'mid' | 'late')
     * @returns {Array} Lista reordenada con boosts aplicados
     */
    applyPhasePriorities(actions, phase) {
        if (!Array.isArray(actions) || actions.length === 0) {
            return actions;
        }
        
        if (typeof this.getPriorities !== 'function') {
            return actions;
        }
        
        const phaseMap = {
            early: 'earlyGame',
            mid: 'midGame',
            late: 'lateGame'
        };
        const priorities = this.getPriorities();
        const phaseKey = phaseMap[phase];
        const phasePriorities = priorities?.[phaseKey];
        
        if (!Array.isArray(phasePriorities) || phasePriorities.length === 0) {
        return actions;
        }
        
        // Boost decreciente para respetar el orden relativo dentro de la lista
        const PRIORITY_MAX_BOOST = 25;
        const PRIORITY_DECAY = 5;
        const priorityBoostMap = new Map();
        phasePriorities.forEach((cardId, index) => {
            const boost = Math.max(PRIORITY_MAX_BOOST - (PRIORITY_DECAY * index), PRIORITY_DECAY);
            priorityBoostMap.set(cardId, boost);
        });
        
        const boostedActions = actions.map(action => {
            const boost = priorityBoostMap.get(action.cardId);
            if (boost) {
                return {
                    ...action,
                    score: action.score + boost
                };
            }
            return action;
        });
        
        const sorted = boostedActions.sort((a, b) => b.score - a.score);
        
        if (AIConfig?.debug?.logScoring && sorted.length > 0) {
            const phaseLabel = phaseKey || phase || 'unknown';
            const summary = sorted
                .map(action => `${action.cardId}:${Number(action.score).toFixed(1)}`)
                .join(', ');
            console.log(`🤖 [IA][${phaseLabel}] Prioridades (${this.getProfileId?.() || 'profile'}) → ${summary}`);
        }
        
        return sorted;
    }
    
    /**
     * Maneja reacciones defensivas a amenazas del jugador
     * @param {string} threatType - Tipo de amenaza ('commando', 'truckAssault', 'cameraDrone', 'drone')
     * @param {Object} threatData - Datos de la amenaza (nodo, posición, etc.)
     * @param {boolean} isDeployed - Si la amenaza está desplegada/lista para atacar (para camera drone)
     * @param {Object} targetBuilding - Para drones bomba, el edificio objetivo
     * @param {Object} gameState - Estado completo del juego
     * @param {string} team - Equipo de la IA
     * @param {number} currency - Currency actual
     * @param {string} difficulty - Dificultad de la IA ('easy', 'medium', 'hard')
     * @returns {Object|null} Acción a ejecutar { type: 'sniper' | 'antiDrone', targetId?: string, targetX?: number, targetY?: number } o null si no reacciona
     */
    handleDefensiveReaction(threatType, threatData, isDeployed, targetBuilding, gameState, team, currency, difficulty) {
        // Probabilidades de reaccionar según dificultad
        const reactProbabilities = {
            easy: 0.65,    // 65% de reaccionar
            medium: 0.82,  // 82% de reaccionar
            hard: 0.92     // 92% de reaccionar
        };
        
        const reactProbability = reactProbabilities[difficulty] || 0.75;
        
        // Aplicar probabilidad de error humano
        if (Math.random() > reactProbability) {
            return null; // No reacciona (error humano)
        }
        
        // 🎯 FIX: Definir costos antes del switch para que estén disponibles en todos los casos
        const sniperCost = SERVER_NODE_CONFIG.costs.sniperStrike || 60;
        const antiDroneCost = SERVER_NODE_CONFIG.costs.antiDrone || 115;
        
        // Manejar según tipo de amenaza
        switch (threatType) {
            case 'commando':
            case 'truckAssault':
                // Amenazas inmediatas: responder con sniper
                if (!threatData || !threatData.id) {
                    return null;
                }
                
                // Verificar que tenemos currency para sniper
                if (currency < sniperCost) {
                    return null;
                }
                
                return {
                    type: 'sniper',
                    targetId: threatData.id
                };
                
            case 'cameraDrone':
                // Camera drone: solo reaccionar cuando está desplegado
                if (!isDeployed || !threatData || !threatData.id) {
                    return null;
                }
                
                // Verificar que tenemos currency para sniper
                if (currency < sniperCost) {
                    return null;
                }
                
                return {
                    type: 'sniper',
                    targetId: threatData.id
                };
                
            case 'drone':
                // Drones bomba: construir antiDrone cerca del edificio objetivo
                if (!targetBuilding || !targetBuilding.id) {
                    return null;
                }
                
                // Verificar que tenemos currency para antiDrone
                if (currency < antiDroneCost) {
                    return null;
                }
                
                // Verificar que no tenemos ya un antiDrone cerca de este edificio
                const existingAntiDrone = gameState.nodes.find(n => 
                    n.type === 'antiDrone' && 
                    n.team === team && 
                    n.active && 
                    n.constructed &&
                    !n.isAbandoning
                );
                
                // Si ya tenemos un antiDrone, no construir otro (por ahora)
                // TODO: En el futuro podríamos verificar si está cerca del edificio objetivo
                if (existingAntiDrone) {
                    return null;
                }
                
                return {
                    type: 'antiDrone',
                    targetId: targetBuilding.id,
                    targetX: targetBuilding.x,
                    targetY: targetBuilding.y
                };
                
            default:
                return null;
        }
    }
}

