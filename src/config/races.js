// ===== CONFIGURACIÓN VISUAL DE RAZAS/NACIONES (CLIENTE) =====
// Solo información visual - datos críticos están en el servidor (ANTI-HACK)

export const RACE_CONFIG = {
    A_Nation: {
        id: 'A_Nation',
        name: 'Fuerzas Unificadas',
        description: 'Ejército estándar con tecnología equilibrada',
        color: '#2ecc71',
        icon: 'race-default'
        // ⚠️ DEPRECATED: buildings, consumables, specialMechanics movidos al servidor (autoridad - ANTI-HACK)
    },
    
};

/**
 * Obtiene la configuración visual de una raza por ID (SOLO VISUAL)
 * @param {string} raceId - ID de la raza
 * @returns {Object|null} Configuración visual de la raza o null si no existe
 */
export function getRaceConfig(raceId) {
    return RACE_CONFIG[raceId] || null;
}

/**
 * Obtiene todas las razas disponibles (SOLO VISUAL)
 * @returns {Array} Array con todas las configuraciones visuales de razas
 */
export function getAllRaces() {
    return [RACE_CONFIG.A_Nation];
}

/**
 * Valida que una raza existe (SOLO VISUAL)
 * @param {string} raceId - ID de la raza a validar
 * @returns {boolean} true si la raza existe
 */
export function isValidRace(raceId) {
    return raceId in RACE_CONFIG;
}


/**
 * @returns {string} ID de la raza por defecto
 */
export function getDefaultRace() {
    return 'A_Nation'; // Cambiado de 'default' a 'A_Nation' para consistencia
}
