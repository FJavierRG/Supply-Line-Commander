// ===== PERFIL DE MAZO POR DEFECTO =====
// Implementa el perfil de IA para el mazo por defecto de la IA
// 
// NOTA: Este perfil usa el mazo definido en game/ai/config/AIDecks.js (AI_DEFAULT_DECK)
// El mazo del jugador (DEFAULT_DECK en config/defaultDeck.js) es independiente
//
// MAZO DE IA: ['hq', 'fob', 'antiDrone', 'droneLauncher', 'truckFactory', 'engineerCenter', 'factory', 'nuclearPlant', 'intelRadio', 'drone', 'sniperStrike']
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
//    - factory (80$): Base 50. +20 si early, +15 si mid. Máx: 85. Ratio: 1.06
//      → Prioridad muy alta en early/mid game. Suministra al HQ (crítico)
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
                    hasExcessCurrency: 20, // +30 si tiene mucho dinero (flexibilidad para construir antes de late)
                    hasAdvantage: -50,   // 🎯 Penalización cuando tiene 2 plantas de ventaja (debe priorizar aggro)
                    hasBigAdvantage: -100, // 🎯 NUEVO: Penalización mayor cuando tiene 3+ plantas de ventaja (bloquear construcción)
                    hasNuclearPlant: -1000 // 🎯 NUEVO: Penalización enorme si ya tiene una planta nuclear (limitado a 1 por bando)
                }
            },
            'droneLauncher': {
                base: 60,
                bonuses: {}
            },
            'antiDrone': {
                // 🎯 FIX: AntiDrone solo se construye de forma reactiva (cuando hay drones enemigos)
                // Base muy baja para que no se construya proactivamente
                base: 5,
                bonuses: {
                    // No hay bonuses aquí - la construcción reactiva se maneja en handleDefensiveReaction
                }
            },
            'truckFactory': {
                base: 35,
                bonuses: {
                    notEarly: 20  // +15 si no está en fase late
                }
            },
            'engineerCenter': {
                base: 40,
                bonuses: {
                    earlyPhase: 10  // +10 si fase early
                }
            },
            'factory': {
                base: 50,
                bonuses: {
                    earlyPhase: 20,  // +20 si fase early (prioridad alta)
                    midPhase: 15     // +15 si fase mid (mantener relevante)
                }
            },
            'intelRadio': {
                base: 35,
                bonuses: {
                    earlyPhase: 15, // Priorizar antena en early como parte del núcleo eco/logístico
                    midPhase: 15    // Mantenerla relevante en mid
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
                    midPhase: 20,     // Pequeño empuje en mid
                    latePhase: 55,    // Gran empuje en late
                    hasExcessCurrency: 45, // +25 si tiene mucho dinero (flexibilidad para usar drones antes de late)
                    hasAdvantage: 45  // 🎯 NUEVO: Bonus cuando tiene ventaja (priorizar aggro)
                }
            },
            'sniperStrike': {
                // 🎯 Harass eficiente sobre todo en mid/late
                base: 10,
                bonuses: {
                    base: 20,   // Bonus base siempre aplica
                    notEarly: 20, // +20 extra en mid/late → más uso fuera de early
                    hasAdvantage: 25 // 🎯 NUEVO: Bonus cuando tiene ventaja (priorizar aggro)
                }
            }
        };
    }
    
    /**
     * Retorna las prioridades del perfil por fase
     */
    getPriorities() {
        return {
            earlyGame: ['factory', 'truckFactory', 'engineerCenter', 'sniperStrike', 'intelRadio'], // Factory primero (suministra HQ), luego talleres y pokeo
            midGame: ['factory', 'fob', 'droneLauncher', 'sniperStrike'], // Factory primero, luego FOBs para expansión, lanzadera, y pokeo continuo
            lateGame: ['drone', 'nuclearPlant', 'intelRadio'] // Drones, economía (antiDrone solo reactivo, factory ya construida)
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

        // 🛟 Actualizar colchón dinámico compartido
        this.updateCurrencyBuffer(gameState);
        const buffer = this.getCurrencyBuffer();
        const hasFobEmergency = state?.myFOBs !== undefined && state.myFOBs < 2;
        const availableCurrency = hasFobEmergency
            ? this.getRawCurrency(gameState)  // Emergencia FOB: ignorar colchón
            : this.getAvailableCurrency(gameState);
        
        // Obtener reglas de scoring del perfil
        const scoringRules = this.getScoringRules();
        
        // Evaluar todas las cartas del mazo (pasar el perfil para condiciones personalizadas)
        const actions = AICardEvaluator.evaluateDeck(
            this.deck,
            gameState,
            team,
            availableCurrency,
            state,
            scoringRules,
            this // Pasar el perfil para condiciones personalizadas
        );
        
        // 🎯 Aplicar reglas específicas del perfil (penalizaciones, etc.)
        const actionsWithProfileRules = this.applyProfileSpecificRules(actions, state, gameState, currency);
        
        // 🎯 DEBUG: Log de acciones después de aplicar reglas del perfil
        if (AIConfig?.debug?.logScoring && actionsWithProfileRules.length > 0) {
            const summary = actionsWithProfileRules
                .map(action => `${action.cardId}:${Number(action.score).toFixed(1)}`)
                .join(', ');
            console.log(`🔍 [IA][${state.phase}] Acciones después de reglas del perfil (${actionsWithProfileRules.length}): ${summary}`);
        }
        
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
                return currency >= 300;
            case 'hasAdvantage':
                // 🎯 La IA tiene ventaja moderada (a partir del minuto 5)
                // Condiciones: tiene mucho dinero (>=500) O tiene exactamente 2 plantas más que el jugador
                // A partir del minuto 5 (300 segundos) para evitar penalizar en early
                const elapsedTime = state.elapsedTime || 0;
                if (elapsedTime < 300) {
                    return false; // Antes del minuto 5, no aplicar
                }
                
                const hasMuchMoney = currency >= 500;
                const plantDifference = (state.myPlants !== undefined && state.playerPlants !== undefined) 
                    ? (state.myPlants - state.playerPlants) 
                    : 0;
                const hasPlantAdvantage2 = plantDifference === 2; // Exactamente 2 plantas de ventaja
                
                const hasAdvantage = hasMuchMoney || hasPlantAdvantage2;
                
                return hasAdvantage;
                
            case 'hasBigAdvantage':
                // 🎯 NUEVO: La IA tiene ventaja grande (3+ plantas de ventaja)
                // Penalización mayor para bloquear completamente la construcción de más plantas
                // A partir del minuto 5 (300 segundos) para evitar penalizar en early
                const elapsedTimeBig = state.elapsedTime || 0;
                if (elapsedTimeBig < 300) {
                    return false; // Antes del minuto 5, no aplicar
                }
                
                const plantDifferenceBig = (state.myPlants !== undefined && state.playerPlants !== undefined) 
                    ? (state.myPlants - state.playerPlants) 
                    : 0;
                const hasBigPlantAdvantage = plantDifferenceBig >= 3; // 3+ plantas de ventaja
                
                return hasBigPlantAdvantage;
            case 'hasNuclearPlant':
                // 🎯 NUEVO: Verificar si ya tiene una planta nuclear construida
                // Las centrales nucleares están limitadas a 1 por bando
                // Esta condición aplica una penalización enorme si ya existe una
                const hasNuclearPlant = gameState.nodes.some(n => 
                    n.team === team && 
                    n.type === 'nuclearPlant' && 
                    n.active &&
                    n.constructed &&
                    !n.isAbandoning
                );
                
                return hasNuclearPlant;
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
        
        // 🚨 EMERGENCIA CRÍTICA: si no hay fábrica, debe reconstruirse inmediatamente (el HQ necesita suministros)
        const hasFactory = gameState.nodes.some(n => 
            n.team === 'player2' && 
            n.type === 'factory' && 
            n.active &&
            n.constructed &&
            !n.isAbandoning
        );
        
        if (!hasFactory) {
            const factoryAction = filteredActions.find(action => action.cardId === 'factory');
            if (factoryAction) {
                const emergencyBoost = 1200; // Más alto que FOBs porque es crítico para el HQ
                
                if (AIConfig.debug?.logActions) {
                    console.log(`🚨 IA EMERGENCIA FÁBRICA: No hay fábrica activa. Reconstrucción prioritaria (el HQ necesita suministros).`);
                }
                
                filteredActions = filteredActions.map(action => {
                    if (action.cardId === 'factory') {
                        return {
                            ...action,
                            score: action.score + emergencyBoost,
                            emergency: 'factory_rebuild'
                        };
                    }
                    // Reducir el resto de acciones para favorecer el ahorro hasta construir la fábrica
                    return {
                        ...action,
                        score: action.score * 0.15 // Reducir más que FOBs porque es más crítico
                    };
                });
                
                // No aplicar reglas adicionales: la IA debe enfocarse en reconstruir la fábrica
                return filteredActions;
            }
        }
        
        // 🚨 EMERGENCIA: si tenemos menos de 2 FOBs, la IA debe priorizar reconstruirlos por encima de todo
        if (state?.myFOBs !== undefined && state.myFOBs < 2) {
            const fobAction = filteredActions.find(action => action.cardId === 'fob');
            if (fobAction) {
                const missingFOBs = 2 - state.myFOBs;
                const emergencyBoost = 1000; // Suficiente para colocarlo por encima de cualquier otra acción
                
                if (AIConfig.debug?.logActions) {
                    console.log(`🚨 IA DOBLE FOB: Tiene ${state.myFOBs} FOBs (<2). Reconstrucción prioritaria (faltan ${missingFOBs}).`);
                }
                
                filteredActions = filteredActions.map(action => {
                    if (action.cardId === 'fob') {
                        return {
                            ...action,
                            score: action.score + emergencyBoost,
                            emergency: 'fob_rebuild'
                        };
                    }
                    // Reducir el resto de acciones para favorecer el ahorro hasta construir el FOB
                    return {
                        ...action,
                        score: action.score * 0.2
                    };
                });
                
                // No aplicar reglas adicionales: la IA debe enfocarse en reconstruir el FOB
                return filteredActions;
            }
        }
        
        // 🚫 BLOQUEO: No construir plantas nucleares si ya tenemos 2 más que el jugador
        if (state?.myPlants !== undefined && state?.playerPlants !== undefined) {
            const plantDifference = state.myPlants - state.playerPlants;
            if (plantDifference >= 2) {
                filteredActions = filteredActions.filter(action => action.cardId !== 'nuclearPlant');
            }
        }
        
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
        
        // 🎯 Factory: solo una es suficiente (suministra al HQ)
        // NOTA: La lógica de emergencia (si no hay fábrica) ya se maneja arriba, antes de esta sección
        const factoryAction = filteredActions.find(action => action.cardId === 'factory');
        if (factoryAction) {
            // Verificar si tiene una fábrica activa (la verificación de emergencia ya se hizo arriba)
            const hasFactory = gameState.nodes.some(n => 
                n.team === 'player2' && 
                n.type === 'factory' && 
                n.active &&
                n.constructed &&
                !n.isAbandoning
            );
            if (hasFactory) {
                // Eliminar factory de las opciones si ya tiene una
                filteredActions = filteredActions.filter(action => action.cardId !== 'factory');
            }
        }
        
        // 🎯 NUEVO: Nuclear Plant: solo una es suficiente (limitado a 1 por bando)
        // Bloquear completamente la construcción si ya existe una planta nuclear
        const nuclearPlantAction = filteredActions.find(action => action.cardId === 'nuclearPlant');
        if (nuclearPlantAction) {
            const hasNuclearPlant = gameState.nodes.some(n => 
                n.team === 'player2' && 
                n.type === 'nuclearPlant' && 
                n.active &&
                n.constructed &&
                !n.isAbandoning
            );
            if (hasNuclearPlant) {
                // Eliminar nuclearPlant de las opciones si ya tiene una
                // Las centrales nucleares están limitadas a 1 por bando
                filteredActions = filteredActions.filter(action => action.cardId !== 'nuclearPlant');
                
                if (AIConfig.debug?.logActions) {
                    console.log(`🚫 IA BLOQUEO PLANTA NUCLEAR: Ya tiene una planta nuclear construida. Bloqueando construcción adicional (limitado a 1 por bando).`);
                }
            }
        }
        
        // 🎯 FIX: AntiDrone solo se construye de forma reactiva (cuando hay drones enemigos)
        // Bloquear completamente la construcción proactiva - solo se construye en handleDefensiveReaction
        const antiDroneAction = filteredActions.find(action => action.cardId === 'antiDrone');
        if (antiDroneAction) {
            // Eliminar antiDrone de las opciones proactivas
            // La construcción reactiva se maneja en handleDefensiveReaction cuando se detecta un drone enemigo
            filteredActions = filteredActions.filter(action => action.cardId !== 'antiDrone');
        }
        
        // 🎯 NOTA: El sistema de ahorro ahora se maneja completamente por el colchón dinámico en BaseProfile
        // No necesitamos márgenes adicionales 1.2/1.6 porque el colchón ya reserva dinero progresivamente
        // Las acciones se evalúan con availableCurrency (currency - buffer), así que ya están limitadas
        
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
        const randomRoll = Math.random();
        
        // 🎯 LOG: Detección de amenaza
        if (threatType === 'drone' && targetBuilding) {
            console.log(`🛡️ IA DEFENSA: Detectado drone enemigo → edificio objetivo: ${targetBuilding.type} (${targetBuilding.id.substring(0, 8)})`);
        }
        
        // Aplicar probabilidad de error humano
        if (randomRoll > reactProbability) {
            // 🎯 LOG: Fallo por probabilidad
            if (threatType === 'drone') {
                console.log(`❌ IA DEFENSA: Fallo en detección (tirada: ${(randomRoll * 100).toFixed(1)}% > ${(reactProbability * 100).toFixed(1)}%, dificultad: ${difficulty})`);
            }
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
                // NOTA: Este caso ya no se usa para drones - ahora se usa createEmergencyAntiDroneOrder
                // Se mantiene por compatibilidad con otras amenazas
                if (!targetBuilding || !targetBuilding.id) {
                    console.log(`❌ IA DEFENSA: No hay edificio objetivo válido para el drone`);
                    return null;
                }
                
                // 🎯 LOG: IA entiende que debe poner torreta
                console.log(`✅ IA DEFENSA: Entendido - debe construir antiDrone para proteger ${targetBuilding.type} (${targetBuilding.id.substring(0, 8)})`);
                
                // Verificar que tenemos currency para antiDrone
                if (currency < antiDroneCost) {
                    console.log(`❌ IA DEFENSA: Sin dinero suficiente (tiene: ${currency}, necesita: ${antiDroneCost})`);
                    return null;
                }
                
                console.log(`✅ IA DEFENSA: Decisión tomada - construir antiDrone (currency: ${currency}, coste: ${antiDroneCost})`);
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
    
    /**
     * Crea una orden de emergencia para construir antiDrone cuando se detecta un drone enemigo
     * Este método tiene prioridad absoluta sobre todas las demás decisiones
     * @param {Object} droneThreat - Datos del drone enemigo
     * @param {Object} targetBuilding - Edificio objetivo del drone
     * @param {Object} gameState - Estado completo del juego
     * @param {string} team - Equipo de la IA
     * @param {number} currency - Currency actual
     * @param {string} difficulty - Dificultad de la IA
     * @returns {Object|null} Orden de emergencia { type: 'antiDrone', targetId: string } o null si no se crea
     */
    createEmergencyAntiDroneOrder(droneThreat, targetBuilding, gameState, team, currency, difficulty) {
        if (!targetBuilding || !targetBuilding.id) {
            console.log(`❌ IA EMERGENCIA: No hay edificio objetivo válido para el drone`);
            return null;
        }
        
        // Probabilidades de reaccionar según dificultad (más altas que reacciones normales)
        const reactProbabilities = {
            easy: 0.75,    // 75% de reaccionar (más alto que reacciones normales)
            medium: 0.88,  // 88% de reaccionar
            hard: 0.95     // 95% de reaccionar
        };
        
        const reactProbability = reactProbabilities[difficulty] || 0.85;
        const randomRoll = Math.random();
        
        console.log(`🚨 IA EMERGENCIA: Detectado drone enemigo → edificio objetivo: ${targetBuilding.type} (${targetBuilding.id.substring(0, 8)})`);
        
        // Aplicar probabilidad de error humano
        if (randomRoll > reactProbability) {
            console.log(`❌ IA EMERGENCIA: Fallo en detección (tirada: ${(randomRoll * 100).toFixed(1)}% > ${(reactProbability * 100).toFixed(1)}%, dificultad: ${difficulty})`);
            return null; // No reacciona (error humano)
        }
        
        const antiDroneCost = SERVER_NODE_CONFIG.costs.antiDrone || 115;
        
        // Verificar que tenemos suficiente currency
        if (currency < antiDroneCost) {
            console.log(`❌ IA EMERGENCIA: Sin dinero suficiente (tiene: ${currency}, necesita: ${antiDroneCost})`);
            return null;
        }
        
        console.log(`✅ IA EMERGENCIA: Decisión tomada - crear orden de emergencia antiDrone (currency: ${currency}, coste: ${antiDroneCost})`);
        
        return {
            type: 'antiDrone',
            targetId: targetBuilding.id
        };
    }
}

