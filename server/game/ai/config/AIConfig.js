// ===== CONFIGURACIÓN DE IA (SERVIDOR) =====

/**
 * Umbrales de la IA (anteriormente en RaceAIConfig, ahora centralizados)
 */
const AI_THRESHOLDS = {
    fobSupply: 55,        // Reabastecer FOBs cuando <55%
    frontSupply: 75       // Reabastecer frentes cuando <75%
    // 🗑️ REMOVED: currencyStrategic - Era legacy, el sistema de colchón dinámico ya maneja esto
};

/**
 * Configuración de multiplicadores por dificultad
 * 🎯 SISTEMA MEJORADO: Multiplicadores específicos por tipo de acción
 * Permite control fino de cada aspecto de la IA
 */
const DIFFICULTY_MULTIPLIERS = {
    easy: {
        // ⭐ MULTIPLICADORES ESPECÍFICOS POR TIPO DE ACCIÓN
        supplyMultiplier: 2.0,         // Reabastecimiento 2x más lento
        buildingMultiplier: 2.0,       // Construcciones 2x más lentas
        attackMultiplier: 2.0,         // Ataques (drones, snipers) 2x más lentos
        reactionMultiplier: 2.0,       // Reacciones 2x más lentas
        
        // Fallback para compatibilidad (usa buildingMultiplier)
        intervalMultiplier: 2.0
    },
    medium: {
        // ⭐ VELOCIDAD NORMAL (multiplicador 1.0)
        supplyMultiplier: 1.5,
        buildingMultiplier: 1.5,
        attackMultiplier: 1.5,
        reactionMultiplier: 1.5,
        
        intervalMultiplier: 1.5
    },
    hard: {
        // ⭐ ACCIONES MÁS RÁPIDAS
        supplyMultiplier: 1.0,        // Reabastecimiento 30% más rápido
        buildingMultiplier: 1.0,      // Construcciones 35% más rápidas
        attackMultiplier: 1.0,        // Ataques 35% más rápidos
        reactionMultiplier: 1.0,      // Reacciones 30% más rápidas
        
        intervalMultiplier: 1.0
    }
};

// 🔧 Crear el objeto AIConfig DESPUÉS de definir las constantes
const AIConfig = {
    // === INTERVALOS DE ACTUALIZACIÓN ===
    intervals: {
        // Reabastecimiento (ajustados por dificultad)
        supplyFob: 4.0,           // Revisar FOBs cada 4s (base, se ajusta por dificultad)
        supplyFront: 6.0,         // Revisar frentes cada 6s (base, se ajusta por dificultad)
        supplyHelicopter: 3.0,    // Revisar helicópteros cada 3s (base, se ajusta por dificultad)
        
        // Decisiones estratégicas
        strategic: 8.0,            // Construcciones estratégicas (ajustado por dificultad)
        offensive: 40.0,           // Decisiones ofensivas (variable, ajustado por dificultad)
        offensiveVariance: 10.0,   // ±10s de variación
        harass: 25.0,             // Harass con sniper (ajustado por dificultad)
        
        // Sistemas core (no ajustados por dificultad)
        medical: 3.0,             // Emergencias médicas
        repair: 4.0,              // Reparaciones
        
        // Debug
        statusReport: 30.0        // Logs de estado
    },
    
    // === UMBRALES ===
    thresholds: AI_THRESHOLDS,
    
    // === MULTIPLICADORES DE DIFICULTAD ===
    difficultyMultipliers: DIFFICULTY_MULTIPLIERS,
    
    // === DEBUGGING ===
    // ⚠️ IMPORTANTE: Mantener en false para producción (causan lag severo al minuto 1)
    debug: {
        logScoring: false,       // Logs de evaluación de cartas (MUY VERBOSE)
        logDecisions: false,     // Logs de decisiones estratégicas
        logThreats: false,       // Logs de detección de amenazas
        logActions: false,       // Logs de acciones (construcción, ataques)
        logSupply: false         // Logs de reabastecimiento
    },

    // === BUFFS ECONÓMICOS ===
    economy: {
        passiveIncomeBonus: {
            easy: 0.35,
            medium: 0.85,
            hard: 1.35
        }
    }
};

/**
 * Obtiene multiplicadores de dificultad
 * @param {string} difficulty - 'easy', 'medium', 'hard'
 * @returns {Object} Multiplicadores de dificultad
 */
export function getDifficultyMultipliers(difficulty) {
    return AIConfig.difficultyMultipliers[difficulty] || AIConfig.difficultyMultipliers.medium;
}

/**
 * Obtiene un intervalo ajustado por dificultad
 * 🎯 SIMPLIFICADO: Ya no hay sistema de razas, solo dificultad
 * @param {string} intervalName - Nombre del intervalo ('supplyFob', 'supplyFront', 'supplyHelicopter', 'strategic', 'offensive', 'harass', 'reaction', 'medical', 'repair')
 * @param {string} difficulty - Dificultad ('easy', 'medium', 'hard')
 * @returns {number} Intervalo ajustado en segundos (o valor fijo si no se ajusta por dificultad)
 */
export function getAdjustedInterval(intervalName, difficulty) {
    const difficultyMultipliers = getDifficultyMultipliers(difficulty);
    
    // 1. Obtener valor base desde AIConfig.intervals
    const baseInterval = AIConfig.intervals[intervalName];
    
    // 2. Si no existe el intervalo, usar fallback
    if (baseInterval === undefined || baseInterval === null) {
        return 8.0; // Fallback por defecto
    }
    
    // 3. Intervalos que NO se ajustan por dificultad (valores fijos)
    if (intervalName === 'medical' || intervalName === 'repair' || intervalName === 'statusReport' || intervalName === 'offensiveVariance') {
        return baseInterval;
    }
    
    // 4. Mapear nombre de intervalo a multiplicador específico
    let multiplier;
    switch (intervalName) {
        case 'supplyFob':
        case 'supplyFront':
        case 'supplyHelicopter':
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
    
    // 5. Aplicar multiplicador de dificultad específico
    return baseInterval * multiplier;
}

/**
 * Obtiene un umbral ajustado por dificultad
 * 🎯 SIMPLIFICADO: Ya no hay sistema de razas, solo dificultad
 * @param {string} thresholdName - Nombre del umbral ('fobSupply', 'frontSupply', etc)
 * @param {string} difficulty - Dificultad ('easy', 'medium', 'hard')
 * @returns {number|null} Umbral ajustado o null si no aplica
 */
export function getAdjustedThreshold(thresholdName, difficulty) {
    const threshold = AIConfig.thresholds[thresholdName];
    if (threshold === null || threshold === undefined) {
        return null;
    }
    
    // 🎯 Los umbrales actuales (fobSupply, frontSupply) no se ajustan por dificultad
    // Se mantienen constantes para consistencia
    return threshold;
}

export default AIConfig;


