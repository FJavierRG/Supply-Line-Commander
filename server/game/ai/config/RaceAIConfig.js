// ===== CONFIGURACIÓN DE IA POR RAZA Y DIFICULTAD =====
// Sistema encapsulado para evitar que cambios en una raza afecten a otra

import AIConfig from './AIConfig.js';

/**
 * Configuración base de IA para cada raza
 * Cada raza tiene sus propios scores, intervalos y estrategias
 */
const RACE_AI_CONFIG = {
    A_Nation: {
        // === SCORES DE CONSTRUCCIÓN ===
        buildingScores: {
            intelRadio: null, // No disponible para A_Nation
            truckFactory: {
                base: 45,
                bonuses: {
                    notLate: 15  // +15 si no está en fase late
                }
            },
            fob: {
                base: 40,
                bonuses: {
                    hasLessThan2: 30,  // +30 si tiene <2 FOBs
                    earlyPhase: 20     // +20 si fase early
                }
            },
            nuclearPlant: {
                base: 50,
                bonuses: {
                    perPlayerPlant: 30,  // +30 por cada planta del jugador
                    perMyPlant: -25      // -25 por cada planta propia (evitar spam)
                }
            },
            droneLauncher: {
                base: 60,
                bonuses: {}
            },
            antiDrone: {
                base: 30,
                bonuses: {}
            },
            engineerCenter: {
                base: 40,
                bonuses: {
                    earlyPhase: 10
                }
            },
            campaignHospital: null, // No disponible para A_Nation
            aerialBase: null         // No disponible para A_Nation
        },
        
        // === SCORES DE ATAQUES ===
        attackScores: {
            drone: {
                base: 65,
                bonuses: {
                    hasTargets: 40
                }
            },
            sniper: {
                base: 30,
                bonuses: {
                    base: 20
                }
            },
            fobSabotage: null  // No disponible para A_Nation
        },
        
        // === INTERVALOS ESPECÍFICOS (sobrescriben AIConfig.intervals) ===
        intervals: {
            // null = usar valor por defecto de AIConfig
            strategic: null,
            offensive: null,
            reaction: null
        },
        
        // === ESTRATEGIAS ESPECÍFICAS ===
        strategies: {
            focusFOBs: true,      // A_Nation depende de FOBs
            focusEconomy: true,   // Construye plantas para economía
            aggressiveness: 0.6   // Agresividad media-alta
        },
        
        // === UMBRALES ESPECÍFICOS ===
        thresholds: {
            fobSupply: 50,        // Reabastecer FOBs cuando <50%
            frontSupply: 70,      // Reabastecer frentes cuando <70%
            currencyStrategic: 50 // Mínimo currency para decisiones estratégicas
        }
    },
    
    B_Nation: {
        // === SCORES DE CONSTRUCCIÓN ===
        buildingScores: {
            intelRadio: {
                base: 35,
                bonuses: {
                    earlyPhase: 15  // Muy importante temprano
                }
            },
            truckFactory: null, // No disponible para B_Nation
            fob: null,            // No disponible para B_Nation
            nuclearPlant: {
                base: 60,  // Más prioritario para B_Nation
                bonuses: {
                    perPlayerPlant: 35,
                    perMyPlant: -30
                }
            },
            droneLauncher: {
                base: 70,  // Más prioritario para B_Nation
                bonuses: {}
            },
            antiDrone: {
                base: 40,  // Más defensivo
                bonuses: {}
            },
            engineerCenter: null, // No disponible para B_Nation
            campaignHospital: {
                base: 45,
                bonuses: {
                    earlyPhase: 15,
                    noHospital: 30  // +30 si no tiene hospital
                }
            },
            aerialBase: {
                base: 50,
                bonuses: {
                    earlyPhase: 20,
                    forHelicopters: 30  // Necesario para recargar helicópteros
                }
            }
        },
        
        // === SCORES DE ATAQUES ===
        attackScores: {
            drone: {
                base: 70,  // Más agresivo con drones
                bonuses: {
                    hasTargets: 50
                }
            },
            sniper: {
                base: 25,  // Menos prioritario
                bonuses: {
                    base: 15
                }
            },
            fobSabotage: {
                base: 55,
                bonuses: {
                    playerHasFOBs: 20
                }
            }
        },
        
        // === INTERVALOS ESPECÍFICOS ===
        intervals: {
            strategic: 7.0,   // Más rápido (B_Nation es más agresiva)
            offensive: 35.0,  // Más frecuente
            reaction: 0.4     // Reacciona más rápido
        },
        
        // === ESTRATEGIAS ESPECÍFICAS ===
        strategies: {
            focusFOBs: false,     // B_Nation NO usa FOBs
            focusEconomy: true,   // Construye plantas
            aggressiveness: 0.8   // Muy agresiva
        },
        
        // === UMBRALES ESPECÍFICOS ===
        thresholds: {
            fobSupply: null,       // No aplica (no usa FOBs)
            frontSupply: 60,      // Reabastecer frentes cuando <60% (más agresivo)
            currencyStrategic: 40  // Actúa con menos currency
        }
    }
};

/**
 * Configuración de multiplicadores por dificultad
 * 🎯 FOCO PRINCIPAL: Velocidad de acciones (APM)
 * Fácil = acciones más lentas, Difícil = acciones más rápidas
 */
const DIFFICULTY_MULTIPLIERS = {
    easy: {
        actionScore: 1.0,         // Scores normales (no cambia agresividad)
        currencyThreshold: 1.0,  // Umbrales normales
        reactionSpeed: 1.0,       // Velocidad de reacción normal (no usado actualmente)
        intervalMultiplier: 1.5   // ⭐ ACCIONES 50% MÁS LENTAS (intervalos 1.5x más largos)
    },
    medium: {
        actionScore: 1.0,
        currencyThreshold: 1.0,
        reactionSpeed: 1.0,
        intervalMultiplier: 1.0   // ⭐ VELOCIDAD NORMAL
    },
    hard: {
        actionScore: 1.0,         // Scores normales (no cambia agresividad)
        currencyThreshold: 1.0,  // Umbrales normales
        reactionSpeed: 1.0,       // Velocidad de reacción normal (no usado actualmente)
        intervalMultiplier: 0.65   // ⭐ ACCIONES 35% MÁS RÁPIDAS (intervalos 35% más cortos)
    }
};

/**
 * Obtiene la configuración de IA para una raza específica
 * @param {string} raceId - ID de la raza (A_Nation, B_Nation, etc)
 * @returns {Object} Configuración de la raza o configuración por defecto
 */
export function getRaceAIConfig(raceId) {
    return RACE_AI_CONFIG[raceId] || RACE_AI_CONFIG.A_Nation; // Fallback a A_Nation
}

/**
 * Obtiene multiplicadores de dificultad
 * @param {string} difficulty - 'easy', 'medium', 'hard'
 * @returns {Object} Multiplicadores de dificultad
 */
export function getDifficultyMultipliers(difficulty) {
    return DIFFICULTY_MULTIPLIERS[difficulty] || DIFFICULTY_MULTIPLIERS.medium;
}

/**
 * Obtiene un intervalo ajustado por raza y dificultad
 * @param {string} intervalName - Nombre del intervalo ('strategic', 'offensive', etc)
 * @param {string} raceId - ID de la raza
 * @param {string} difficulty - Dificultad
 * @returns {number} Intervalo ajustado en segundos
 */
export function getAdjustedInterval(intervalName, raceId, difficulty) {
    const raceConfig = getRaceAIConfig(raceId);
    const difficultyMultipliers = getDifficultyMultipliers(difficulty);
    
    // 1. Obtener valor base (raza específico o por defecto)
    let baseInterval = raceConfig.intervals?.[intervalName];
    if (baseInterval === null || baseInterval === undefined) {
        baseInterval = AIConfig.intervals[intervalName] || 8.0;
    }
    
    // 2. Aplicar multiplicador de dificultad
    return baseInterval * difficultyMultipliers.intervalMultiplier;
}

/**
 * Obtiene un score ajustado por raza y dificultad
 * @param {string} actionType - Tipo de acción ('building' o 'attack')
 * @param {string} actionName - Nombre de la acción ('fob', 'drone', etc)
 * @param {string} raceId - ID de la raza
 * @param {string} difficulty - Dificultad
 * @param {Object} context - Contexto adicional (phase, state, etc)
 * @returns {number|null} Score ajustado o null si no está disponible
 */
export function getAdjustedScore(actionType, actionName, raceId, difficulty, context = {}) {
    const raceConfig = getRaceAIConfig(raceId);
    const difficultyMultipliers = getDifficultyMultipliers(difficulty);
    
    // Obtener configuración de score según tipo
    const scoreConfig = actionType === 'building' 
        ? raceConfig.buildingScores?.[actionName]
        : raceConfig.attackScores?.[actionName];
    
    // Si no está disponible para esta raza, retornar null
    if (scoreConfig === null || scoreConfig === undefined) {
        return null;
    }
    
    // Calcular score base
    let score = scoreConfig.base || 0;
    
    // Aplicar bonificaciones
    if (scoreConfig.bonuses) {
        for (const [bonusName, bonusValue] of Object.entries(scoreConfig.bonuses)) {
            // Evaluar condición del bonus
            if (evaluateBonusCondition(bonusName, bonusValue, context)) {
                // Bonificaciones especiales que multiplican por cantidad
                if (bonusName === 'perPlayerPlant' && context.playerPlants) {
                    score += bonusValue * context.playerPlants;
                } else if (bonusName === 'perMyPlant' && context.myPlants) {
                    score += bonusValue * context.myPlants; // Valor negativo, así que resta
                } else {
                    score += bonusValue;
                }
            }
        }
    }
    
    // Aplicar multiplicador de dificultad
    score *= difficultyMultipliers.actionScore;
    
    return score;
}

/**
 * Evalúa una condición de bonus
 * @param {string} bonusName - Nombre del bonus
 * @param {number} bonusValue - Valor del bonus
 * @param {Object} context - Contexto con información del juego
 * @returns {boolean} Si la condición se cumple
 */
function evaluateBonusCondition(bonusName, bonusValue, context) {
    switch (bonusName) {
        case 'earlyPhase':
            return context.phase === 'early';
        case 'notLate':
            return context.phase !== 'late';
        case 'hasLessThan2':
            return context.myFOBs !== undefined && context.myFOBs < 2;
        case 'perPlayerPlant':
            // Bonus por cada planta del jugador
            return context.playerPlants !== undefined && context.playerPlants > 0;
        case 'perMyPlant':
            // Penalización por cada planta propia
            return context.myPlants !== undefined && context.myPlants > 0;
        case 'hasTargets':
            return context.hasTargets === true;
        case 'noHospital':
            return context.hasHospital === false;
        case 'forHelicopters':
            return context.needsHelicopterResupply === true;
        case 'playerHasFOBs':
            return context.playerFOBs !== undefined && context.playerFOBs > 0;
        case 'base':
            return true; // Bonus base siempre aplica
        default:
            return false;
    }
}

/**
 * Obtiene un umbral ajustado por raza y dificultad
 * @param {string} thresholdName - Nombre del umbral ('fobSupply', 'currencyStrategic', etc)
 * @param {string} raceId - ID de la raza
 * @param {string} difficulty - Dificultad
 * @returns {number|null} Umbral ajustado o null si no aplica
 */
export function getAdjustedThreshold(thresholdName, raceId, difficulty) {
    const raceConfig = getRaceAIConfig(raceId);
    const difficultyMultipliers = getDifficultyMultipliers(difficulty);
    
    const threshold = raceConfig.thresholds?.[thresholdName];
    if (threshold === null || threshold === undefined) {
        return null;
    }
    
    // Aplicar multiplicador de dificultad
    return threshold * difficultyMultipliers.currencyThreshold;
}

export default {
    RACE_AI_CONFIG,
    DIFFICULTY_MULTIPLIERS,
    getRaceAIConfig,
    getDifficultyMultipliers,
    getAdjustedInterval,
    getAdjustedScore,
    getAdjustedThreshold
};

