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
                    latePhase: 25        // En late, aún más peso si vamos por detrás
                }
            },
            'droneLauncher': {
                base: 60,
                bonuses: {}
            },
            'antiDrone': {
                // Base defensiva baja, pero con grandes boosts cuando hay amenaza aérea
                base: 20,
                bonuses: {
                    airThreat: 25,      // Bonus cuando hay cualquier amenaza aérea
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
                    latePhase: 40     // Gran empuje en late
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
            earlyGame: ['fob', 'truckFactory', 'engineerCenter'],
            midGame: ['nuclearPlant', 'droneLauncher', 'intelRadio'],
            lateGame: ['antiDrone', 'drone', 'sniperStrike']
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
        
        // Evaluar todas las cartas del mazo
        const actions = AICardEvaluator.evaluateDeck(
            this.deck,
            gameState,
            team,
            currency,
            state,
            scoringRules
        );
        
        return actions;
    }
}

