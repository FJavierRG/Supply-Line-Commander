// ===== CONFIGURACIÓN DE IA POR RAZA Y DIFICULTAD =====
// Sistema encapsulado para evitar que cambios en una raza afecten a otra

import AIConfig from './AIConfig.js';

/**
 * Configuración base de IA para cada raza
 * 🎯 SIMPLIFICADO: Ahora solo contiene intervalos y umbrales
 * Los scores y unidades disponibles están en los perfiles de mazo
 */
const RACE_AI_CONFIG = {
    A_Nation: {
        // === INTERVALOS ESPECÍFICOS (sobrescriben AIConfig.intervals) ===
        intervals: {
            // null = usar valor por defecto de AIConfig
            strategic: null,
            offensive: null,
            reaction: null
        },
        
        // === UMBRALES ESPECÍFICOS ===
        thresholds: {
            fobSupply: 50,        // Reabastecer FOBs cuando <50%
            frontSupply: 70,      // Reabastecer frentes cuando <70%
            currencyStrategic: 50 // Mínimo currency para decisiones estratégicas
        }
    }
};

/**
 * Configuración de multiplicadores por dificultad
 * 🎯 SISTEMA MEJORADO: Multiplicadores específicos por tipo de acción
 * Permite control fino de cada aspecto de la IA
 */
const DIFFICULTY_MULTIPLIERS = {
    easy: {
        actionScore: 1.0,              // Scores normales (no cambia agresividad)
        currencyThreshold: 1.5,       // Umbrales de currency más altos
        
        // ⭐ MULTIPLICADORES ESPECÍFICOS POR TIPO DE ACCIÓN
        supplyMultiplier: 2.0,         // Reabastecimiento 2x más lento
        buildingMultiplier: 2.0,       // Construcciones 2x más lentas
        attackMultiplier: 2.0,         // Ataques (drones, snipers) 2x más lentos
        reactionMultiplier: 2.0,       // Reacciones 2x más lentas
        
        // Fallback para compatibilidad (usa buildingMultiplier)
        intervalMultiplier: 2.0
    },
    medium: {
        actionScore: 1.0,
        currencyThreshold: 1.0,
        
        // ⭐ VELOCIDAD NORMAL (multiplicador 1.0)
        supplyMultiplier: 1.0,
        buildingMultiplier: 1.0,
        attackMultiplier: 1.0,
        reactionMultiplier: 1.0,
        
        intervalMultiplier: 1.0
    },
    hard: {
        actionScore: 1.0,
        currencyThreshold: 0.9,       // Umbrales de currency más bajos (actúa antes)
        
        // ⭐ ACCIONES MÁS RÁPIDAS
        supplyMultiplier: 0.7,        // Reabastecimiento 30% más rápido
        buildingMultiplier: 0.65,      // Construcciones 35% más rápidas
        attackMultiplier: 0.65,        // Ataques 35% más rápidos
        reactionMultiplier: 0.7,      // Reacciones 30% más rápidas
        
        intervalMultiplier: 0.65
    }
};

/**
 * Obtiene la configuración de IA para una raza específica
 * @param {string} raceId - ID de la raza (A_Nation, etc)
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
 * 🎯 MEJORADO: Usa multiplicadores específicos por tipo de acción
 * @param {string} intervalName - Nombre del intervalo ('strategic', 'offensive', 'supply', 'harass', 'reaction')
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
    
    // 2. Mapear nombre de intervalo a multiplicador específico
    let multiplier;
    switch (intervalName) {
        case 'supply':
            multiplier = difficultyMultipliers.supplyMultiplier;
            break;
        case 'strategic':
            multiplier = difficultyMultipliers.buildingMultiplier;
            break;
        case 'offensive':
        case 'harass':
            multiplier = difficultyMultipliers.attackMultiplier;
            break;
        case 'reaction':
            multiplier = difficultyMultipliers.reactionMultiplier;
            break;
        default:
            // Fallback al multiplicador general para compatibilidad
            multiplier = difficultyMultipliers.intervalMultiplier;
    }
    
    // 3. Aplicar multiplicador de dificultad específico
    return baseInterval * multiplier;
}

/**
 * 🗑️ OBSOLETO: Los scores ahora están en los perfiles de mazo
 * Obtiene un score ajustado por raza y dificultad
 * @deprecated Usar perfiles de mazo (DefaultDeckProfile, etc.) en su lugar
 * @param {string} actionType - Tipo de acción ('building' o 'attack')
 * @param {string} actionName - Nombre de la acción ('fob', 'drone', etc)
 * @param {string} raceId - ID de la raza
 * @param {string} difficulty - Dificultad
 * @param {Object} context - Contexto adicional (phase, state, etc)
 * @returns {number|null} Score ajustado o null si no está disponible
 */
export function getAdjustedScore(actionType, actionName, raceId, difficulty, context = {}) {
    // ⚠️ DEPRECATED: Esta función solo se mantiene por compatibilidad con métodos obsoletos
    // Los scores ahora se obtienen desde los perfiles de mazo
    console.warn(`⚠️ getAdjustedScore() está obsoleto. Usar perfiles de mazo en su lugar.`);
    return null;
}

/**
 * 🗑️ OBSOLETO: Ya no se usa
 * Evalúa una condición de bonus
 */
function evaluateBonusCondition(bonusName, bonusValue, context) {
    // ⚠️ DEPRECATED: Ya no se usa
    return false;
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
    getAdjustedScore, // ⚠️ DEPRECATED
    getAdjustedThreshold
};

