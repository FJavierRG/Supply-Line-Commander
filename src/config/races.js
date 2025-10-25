// ===== CONFIGURACIÓN DE RAZAS/NACIONES =====
// Sistema de razas diferentes con edificios y consumibles específicos

export const RACE_CONFIG = {
    A_Nation: {
        id: 'A_Nation',
        name: 'Fuerzas Unificadas',
        description: 'Ejército estándar con tecnología equilibrada',
        color: '#2ecc71',
        icon: 'race-default',
        
        buildings: [
            'fob', 'antiDrone', 'droneLauncher',
            'truckFactory', 'engineerCenter', 'nuclearPlant'
        ],
        
        consumables: [
            'drone', 'sniperStrike'
        ],
        
        // 🆕 NUEVO: Mecánicas especiales
        specialMechanics: {
            canUseFOBs: true,
            transportSystem: 'standard', // 'standard' | 'aerial'
            specialVehicles: []
        }
    },
    
    B_Nation: {
        id: 'B_Nation',
        name: 'Fuerza de Asalto Directa',
        description: 'Ejército de asalto rápido sin puntos intermedios',
        color: '#e74c3c',
        icon: 'race-military',
        
        buildings: [
            // 'fob',  // ❌ NO construye FOBs
            'intelRadio',
            'campaignHospital',
            'aerialBase'  // 🆕 NUEVO: Base Aérea para recarga de helicópteros
        ],
        
        consumables: [
            'fobSabotage'
        ],
        
        // 🆕 NUEVO: Mecánicas especiales
        specialMechanics: {
            canUseFOBs: false,
            transportSystem: 'aerial'  // 🆕 CAMBIO: Sistema aéreo
        }
    }
};

/**
 * Obtiene la configuración de una raza por ID
 * @param {string} raceId - ID de la raza
 * @returns {Object|null} Configuración de la raza o null si no existe
 */
export function getRaceConfig(raceId) {
    return RACE_CONFIG[raceId] || null;
}

/**
 * Obtiene todas las razas disponibles
 * @returns {Array} Array con todas las configuraciones de razas
 */
export function getAllRaces() {
    return Object.values(RACE_CONFIG);
}

/**
 * Obtiene los edificios disponibles para una raza específica
 * @param {string} raceId - ID de la raza
 * @returns {Array} Array con los IDs de edificios disponibles
 */
export function getRaceBuildings(raceId) {
    const raceConfig = getRaceConfig(raceId);
    return raceConfig ? raceConfig.buildings : [];
}

/**
 * Obtiene los consumibles disponibles para una raza específica
 * @param {string} raceId - ID de la raza
 * @returns {Array} Array con los IDs de consumibles disponibles
 */
export function getRaceConsumables(raceId) {
    const raceConfig = getRaceConfig(raceId);
    return raceConfig ? raceConfig.consumables : [];
}

/**
 * Verifica si un edificio está disponible para una raza específica
 * @param {string} raceId - ID de la raza
 * @param {string} buildingId - ID del edificio
 * @returns {boolean} true si el edificio está disponible para la raza
 */
export function isBuildingAvailableForRace(raceId, buildingId) {
    const raceBuildings = getRaceBuildings(raceId);
    return raceBuildings.includes(buildingId);
}

/**
 * Verifica si un consumible está disponible para una raza específica
 * @param {string} raceId - ID de la raza
 * @param {string} consumableId - ID del consumible
 * @returns {boolean} true si el consumible está disponible para la raza
 */
export function isConsumableAvailableForRace(raceId, consumableId) {
    const raceConsumables = getRaceConsumables(raceId);
    return raceConsumables.includes(consumableId);
}

/**
 * Obtiene la raza por defecto (fallback)
 * @returns {string} ID de la raza por defecto
 */
export function getDefaultRace() {
    return 'default';
}

/**
 * Valida que una raza existe
 * @param {string} raceId - ID de la raza a validar
 * @returns {boolean} true si la raza existe
 */
export function isValidRace(raceId) {
    return raceId in RACE_CONFIG;
}

// 🆕 NUEVAS FUNCIONES PARA MECÁNICAS ESPECIALES

/**
 * Verifica si una raza puede usar FOBs
 * @param {string} raceId - ID de la raza
 * @returns {boolean} true si la raza puede usar FOBs
 */
export function canRaceUseFOBs(raceId) {
    const raceConfig = getRaceConfig(raceId);
    return raceConfig?.specialMechanics?.canUseFOBs !== false;
}

/**
 * Obtiene el sistema de transporte de una raza
 * @param {string} raceId - ID de la raza
 * @returns {string} 'standard' | 'aerial'
 */
export function getRaceTransportSystem(raceId) {
    const raceConfig = getRaceConfig(raceId);
    return raceConfig?.specialMechanics?.transportSystem || 'standard';
}

/**
 * Obtiene los vehículos especiales de una raza
 * @param {string} raceId - ID de la raza
 * @returns {Array} Array de IDs de vehículos especiales
 */
export function getRaceSpecialVehicles(raceId) {
    const raceConfig = getRaceConfig(raceId);
    return raceConfig?.specialMechanics?.specialVehicles || [];
}
