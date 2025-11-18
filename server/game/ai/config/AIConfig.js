// ===== CONFIGURACIÓN DE IA (SERVIDOR) =====

export default {
    // === INTERVALOS DE ACTUALIZACIÓN ===
    intervals: {
        supply: 2.0,           // Reabastecimiento FOBs/Frentes
        strategic: 8.0,        // Construcciones estratégicas
        offensive: 40.0,       // Decisiones ofensivas (variable)
        offensiveVariance: 10.0, // ±10s de variación
        harass: 25.0,          // Harass con sniper
        statusReport: 30.0     // Logs de estado
    },
    
    // === DEBUGGING ===
    debug: {
        logScoring: true,
        logDecisions: true,
        logThreats: true,
        logActions: true,        // Logs de acciones (construcción, ataques)
        logSupply: true          // Logs de reabastecimiento
    },

    // === BUFFS ECONÓMICOS ===
    economy: {
        passiveIncomeBonus: {
            easy: 0.5,
            medium: 1.0,
            hard: 1.5
        }
    }
};


