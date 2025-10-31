// ===== CONFIGURACIÓN DE RAZAS/NACIONES (SERVIDOR COMO AUTORIDAD - ANTI-HACK) =====
// Configuración crítica de razas que controla el comportamiento del juego

export const SERVER_RACE_CONFIG = {
    A_Nation: {
        id: 'A_Nation',
        name: 'Fuerzas Unificadas',
        description: 'Ejército estándar con tecnología equilibrada',
        color: '#2ecc71',
        icon: 'race-default',
        
        // 🚨 CRÍTICO: Edificios disponibles (ANTI-HACK)
        buildings: [
            'fob', 'antiDrone', 'droneLauncher',
            'truckFactory', 'engineerCenter', 'nuclearPlant',
            'vigilanceTower'  // 🆕 Torre de Vigilancia - counterea comandos
        ],
        
        // 🚨 CRÍTICO: Consumibles disponibles (ANTI-HACK)
        consumables: [
            'drone', 'sniperStrike'
        ],
        
        // 🚨 CRÍTICO: Mecánicas especiales (ANTI-HACK)
        specialMechanics: {
            canUseFOBs: true,
            transportSystem: 'standard', // 'standard' | 'aerial'
            specialVehicles: []
        },
        
        // 🚨 CRÍTICO: Configuración de vehículos iniciales (ANTI-HACK)
        initialVehicles: {
            hq: {
                hasVehicles: true,
                availableVehicles: 4,
                hasHelicopters: false,
                availableHelicopters: 0
            },
            fob: {
                hasVehicles: true,
                availableVehicles: 2,
                hasHelicopters: false,
                availableHelicopters: 0
            },
            front: {
                hasVehicles: false,
                availableVehicles: 0,
                hasHelicopters: false,
                availableHelicopters: 0
            }
        }
    },
    
    B_Nation: {
        id: 'B_Nation',
        name: 'Fuerza de Asalto Directa',
        description: 'Ejército de asalto rápido sin puntos intermedios',
        color: '#e74c3c',
        icon: 'race-military',
        
        // 🚨 CRÍTICO: Edificios disponibles (ANTI-HACK)
        buildings: [
            // 'fob',  // ❌ NO construye FOBs
            'intelRadio',
            'intelCenter', // 🆕 Centro de Inteligencia - desbloquea comandos
            'campaignHospital',
            'aerialBase',  // 🆕 NUEVO: Base Aérea para recarga de helicópteros
            'antiDrone',   // ✅ Disponible para B_Nation
            'vigilanceTower'  // 🆕 Torre de Vigilancia - counterea comandos
        ],
        
        // 🚨 CRÍTICO: Consumibles disponibles (ANTI-HACK)
        consumables: [
            'fobSabotage',  // ✅ Ataque especial de B_Nation
            'sniperStrike',   // ✅ Disponible para B_Nation (menos prioritario según IA)
            'specopsCommando' // 🆕 NUEVO: Comando especial operativo
        ],
        
        // 🚨 CRÍTICO: Mecánicas especiales (ANTI-HACK)
        specialMechanics: {
            canUseFOBs: false,
            transportSystem: 'aerial'  // 🆕 CAMBIO: Sistema aéreo
        },
        
        // 🚨 CRÍTICO: Configuración de vehículos iniciales (ANTI-HACK)
        initialVehicles: {
            hq: {
                hasVehicles: false,
                availableVehicles: 0,
                hasHelicopters: true,
                availableHelicopters: 1
            },
            fob: {
                hasVehicles: false,
                availableVehicles: 0,
                hasHelicopters: false,
                availableHelicopters: 0
            },
            front: {
                hasVehicles: false,
                availableVehicles: 0,
                hasHelicopters: false,
                availableHelicopters: 0
            }
        }
    }
};

/**
 * Obtiene la configuración de una raza por ID (SERVIDOR COMO AUTORIDAD)
 * @param {string} raceId - ID de la raza
 * @returns {Object|null} Configuración de la raza o null si no existe
 */
export function getServerRaceConfig(raceId) {
    return SERVER_RACE_CONFIG[raceId] || null;
}

/**
 * Obtiene todas las razas disponibles (SERVIDOR COMO AUTORIDAD)
 * @returns {Array} Array con todas las configuraciones de razas
 */
export function getAllServerRaces() {
    return Object.values(SERVER_RACE_CONFIG);
}

/**
 * Obtiene los edificios disponibles para una raza específica (SERVIDOR COMO AUTORIDAD)
 * @param {string} raceId - ID de la raza
 * @returns {Array} Array con los IDs de edificios disponibles
 */
export function getServerRaceBuildings(raceId) {
    const raceConfig = getServerRaceConfig(raceId);
    return raceConfig ? raceConfig.buildings : [];
}

/**
 * Obtiene los consumibles disponibles para una raza específica (SERVIDOR COMO AUTORIDAD)
 * @param {string} raceId - ID de la raza
 * @returns {Array} Array con los IDs de consumibles disponibles
 */
export function getServerRaceConsumables(raceId) {
    const raceConfig = getServerRaceConfig(raceId);
    return raceConfig ? raceConfig.consumables : [];
}

/**
 * Verifica si un edificio está disponible para una raza específica (SERVIDOR COMO AUTORIDAD)
 * @param {string} raceId - ID de la raza
 * @param {string} buildingId - ID del edificio
 * @returns {boolean} true si el edificio está disponible para la raza
 */
export function isServerBuildingAvailableForRace(raceId, buildingId) {
    const raceBuildings = getServerRaceBuildings(raceId);
    return raceBuildings.includes(buildingId);
}

/**
 * Verifica si un consumible está disponible para una raza específica (SERVIDOR COMO AUTORIDAD)
 * @param {string} raceId - ID de la raza
 * @param {string} consumableId - ID del consumible
 * @returns {boolean} true si el consumible está disponible para la raza
 */
export function isServerConsumableAvailableForRace(raceId, consumableId) {
    const raceConsumables = getServerRaceConsumables(raceId);
    return raceConsumables.includes(consumableId);
}

/**
 * Verifica si una raza puede usar FOBs (SERVIDOR COMO AUTORIDAD)
 * @param {string} raceId - ID de la raza
 * @returns {boolean} true si la raza puede usar FOBs
 */
export function canServerRaceUseFOBs(raceId) {
    const raceConfig = getServerRaceConfig(raceId);
    return raceConfig?.specialMechanics?.canUseFOBs !== false;
}

/**
 * Obtiene el sistema de transporte de una raza (SERVIDOR COMO AUTORIDAD)
 * @param {string} raceId - ID de la raza
 * @returns {string} 'standard' | 'aerial'
 */
export function getServerRaceTransportSystem(raceId) {
    const raceConfig = getServerRaceConfig(raceId);
    return raceConfig?.specialMechanics?.transportSystem || 'standard';
}

/**
 * Obtiene los vehículos especiales de una raza (SERVIDOR COMO AUTORIDAD)
 * @param {string} raceId - ID de la raza
 * @returns {Array} Array de IDs de vehículos especiales
 */
export function getServerRaceSpecialVehicles(raceId) {
    const raceConfig = getServerRaceConfig(raceId);
    return raceConfig?.specialMechanics?.specialVehicles || [];
}

/**
 * Obtiene la configuración de vehículos iniciales para una raza y tipo de nodo (SERVIDOR COMO AUTORIDAD)
 * @param {string} raceId - ID de la raza
 * @param {string} nodeType - Tipo de nodo
 * @returns {Object} Configuración de vehículos iniciales
 */
export function getServerInitialVehiclesForRace(raceId, nodeType) {
    const raceConfig = getServerRaceConfig(raceId);
    
    if (!raceConfig) {
        // Fallback a configuración tradicional
        return {
            hasVehicles: nodeType === 'hq',
            availableVehicles: nodeType === 'hq' ? 2 : 0,
            hasHelicopters: false,
            availableHelicopters: 0
        };
    }
    
    // Usar configuración específica de la raza
    const vehicleConfig = raceConfig.initialVehicles[nodeType];
    if (vehicleConfig) {
        return { ...vehicleConfig };
    }
    
    // Fallback si no hay configuración específica para este tipo de nodo
    return {
        hasVehicles: false,
        availableVehicles: 0,
        hasHelicopters: false,
        availableHelicopters: 0
    };
}
