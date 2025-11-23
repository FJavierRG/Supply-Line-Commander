// ===== CONFIGURACIÓN UNIFICADA DE NODOS DEL JUEGO =====
// Incluye: Nodos base del mapa, edificios construibles y proyectiles

import { getRaceConfig } from './races.js';

export const NODE_CONFIG = {
    // ========== NODOS BASE DEL MAPA ==========
    hq: {
        id: 'hq',
        spriteKey: 'base-hq',
        category: 'map_node',
        
        
        // Propiedades
        radius: 50,
        
        // Renderizado
        shadowColor: '#3498db'
    },
    
    fob: {
        id: 'fob',
        spriteKey: 'base-fob',
        category: 'buildable', // Puede construirse Y aparecer en el mapa
        
        
        radius: 40, // Tamaño visual del sprite
        
        shadowColor: '#2ecc71'
    },
    
    front: {
        id: 'front',
        spriteKey: 'base-front',
        category: 'map_node',
        
        
        radius: 35, // Tamaño visual del sprite
    
        shadowColor: '#e67e22'
    },
    
    // ========== EDIFICIOS CONSTRUIBLES ==========
    antiDrone: {
        id: 'antiDrone',
        spriteKey: 'building-anti-drone',
        category: 'buildable',
                
        radius: 30, // Tamaño visual del sprite
        
        sizeMultiplier: 0.85,
       
    },
    
    droneLauncher: {
        id: 'droneLauncher',
        spriteKey: 'building-drone-launcher',
        category: 'buildable',
        
        
        radius: 30, // Tamaño visual del sprite
        
        sizeMultiplier: 0.9
    },
    
    razorNet: {
        id: 'razorNet',
        spriteKey: 'building-razor-net',
        category: 'buildable',
        
        
        radius: 25, // Tamaño visual del sprite
        
    },
    
    truckFactory: {
        id: 'truckFactory',
        spriteKey: 'building-truck-factory',
        category: 'buildable',
        
        
        radius: 35, // Tamaño visual del sprite
       
    },
    
    factory: {
        id: 'factory',
        spriteKey: 'building-factory',
        category: 'buildable',
        
        
        radius: 40, // Tamaño visual del sprite
        
    },
    
    engineerCenter: {
        id: 'engineerCenter',
        spriteKey: 'building-engineer-center',
        category: 'buildable',
        
        
        radius: 35, // Tamaño visual del sprite
        
    },
    
    nuclearPlant: {
        id: 'nuclearPlant',
        spriteKey: 'building-nuclear-plant',
        category: 'buildable',
        
        
        radius: 40, // Tamaño visual del sprite
       
    },
    
    machineNest: {
        id: 'machineNest',
        spriteKey: 'building-machine-nest',
        category: 'buildable',
        
        
        radius: 30, // Tamaño visual del sprite
        
        sizeMultiplier: 1.15,
        flipHorizontal: true
    },
    
    campaignHospital: {
        id: 'campaignHospital',
        spriteKey: 'building-campaign-hospital',
        category: 'buildable',
        
        
        radius: 35, 
        sizeMultiplier: 0.8, 
        
    },
    
    intelRadio: {
        id: 'intelRadio',
        spriteKey: 'building-intel-radio', // Sprite específico para intelRadio
        category: 'buildable',
        
        
        radius: 30, 
       
    },
    
    intelCenter: {
        id: 'intelCenter',
        spriteKey: 'building-intel-center', // 🆕 Sprite del centro de inteligencia
        category: 'buildable',
        
        
        radius: 35, // Tamaño visual del sprite
        
    },
    
    aerialBase: {
        id: 'aerialBase',
        spriteKey: 'building-aerial-base',
        category: 'buildable', // ✅ RESTAURADO: Para que aparezca en la tienda
        
        radius: 40, // Tamaño visual del sprite
        
        sizeMultiplier: 0.66, // 🆕 AUMENTADO: 50% más grande (0.44 * 1.5 = 0.66)
        
        isAerialBase: true, // Flag para identificación
        autoDestroy: true // Se destruye cuando supplies llega a 0
    },
    
    vigilanceTower: {
        id: 'vigilanceTower',
        spriteKey: 'building-vigilance-tower',
        category: 'buildable',
        
        radius: 35, // Tamaño visual del sprite
        sizeMultiplier: 0.85, // 🆕 Reducir tamaño visual 15% (solo sprite, no afecta áreas)
       
        isVigilanceTower: true // Flag para identificación
    },
    
    trainStation: {
        id: 'trainStation',
        spriteKey: 'building-train-station',
        category: 'buildable',
        
        radius: 40, // Tamaño visual del sprite
        
        isTrainStation: true // Flag para identificación
    },
    
    droneWorkshop: {
        id: 'droneWorkshop',
        spriteKey: 'building-drone-workshop',
        category: 'buildable',
        
        radius: 35, // Tamaño visual del sprite
        
        isDroneWorkshop: true // Flag para identificación
    },
    
    vehicleWorkshop: {
        id: 'vehicleWorkshop',
        spriteKey: 'vehicle_workshop',
        category: 'buildable',
        
        radius: 35, // Tamaño visual del sprite
        
        isVehicleWorkshop: true // Flag para identificación
    },
    
    physicStudies: {
        id: 'physicStudies',
        spriteKey: 'building-physic-studies',
        category: 'buildable',
        
        radius: 35, // Tamaño visual del sprite
        
        isPhysicStudies: true // Flag para identificación
    },
    
    secretLaboratory: {
        id: 'secretLaboratory',
        spriteKey: 'building-secret-laboratory',
        category: 'buildable',
        
        radius: 35, // Tamaño visual del sprite
        
        isSecretLaboratory: true // Flag para identificación
    },
    
    trainingCamp: {
        id: 'trainingCamp',
        spriteKey: 'building-training-camp',
        category: 'buildable',
        
        radius: 35, // Tamaño visual del sprite
        
        isTrainingCamp: true // Flag para identificación
    },
    
    deadlyBuild: {
        id: 'deadlyBuild',
        spriteKey: 'building-deadly-build',
        category: 'buildable',
        
        radius: 40, // Tamaño visual del sprite
        
        isDeadlyBuild: true // Flag para identificación
    },
    
    servers: {
        id: 'servers',
        spriteKey: 'building-servers',
        category: 'buildable',
        
        radius: 30, // Tamaño visual del sprite
        
        isServers: true // Flag para identificación
    },
    
    // ========== PROYECTILES ==========
    drone: {
        id: 'drone',
        spriteKey: 'vehicle-drone',
        category: 'projectile',
        
        
        radius: 0,
        
        sizeMultiplier: 1.15
    },
    
    sniperStrike: {
        id: 'sniperStrike',
        spriteKey: 'vehicle-sniper_shoot_icon',
        category: 'projectile',
        
        
        radius: 0,
       
    },
    
    fobSabotage: {
        id: 'fobSabotage',
        spriteKey: 'specops_unit', // Sprite del consumible
        category: 'projectile',
        
        
        radius: 0,
        
    },
    
    specopsCommando: {
        id: 'specopsCommando',
        spriteKey: 'specops_observer', // 🆕 NUEVO: Sprite del comando especial operativo
        category: 'projectile',
        
        
        radius: 25, // 🆕 Radio físico del comando
       
    },
    
    cameraDrone: {
        id: 'cameraDrone',
        spriteKey: 'camera-drone',
        category: 'projectile',
        
        radius: 25,
        
        shadowColor: '#3498db',
        isCameraDrone: true
    },
    
    truckAssault: {
        id: 'truckAssault',
        spriteKey: 'truckassault', // 🆕 NUEVO: Sprite del truck assault
        category: 'projectile',
        
        
        radius: 25, // Radio físico del truck assault
       
    },
    
    tank: {
        id: 'tank',
        spriteKey: 'vehicle-tank-1', // Sprite base del tanque
        category: 'projectile',
        
        
        radius: 0,
       
        sizeMultiplier: 1.0
    },
    
    lightVehicle: {
        id: 'lightVehicle',
        spriteKey: 'vehicle-light-1', // Sprite del artillado ligero
        category: 'projectile',
        
        radius: 0,
        sizeMultiplier: 1.0
    },
    
    artillery: {
        id: 'artillery',
        spriteKey: 'vehicle-artillery', // Sprite de artillería
        category: 'projectile',
        
        radius: 0,
        sizeMultiplier: 1.0
    },
    
    worldDestroyer: {
        id: 'worldDestroyer',
        spriteKey: 'world-destroyer',
        category: 'projectile',
        
        radius: 0
    }
};

/**
 * Obtiene la configuración de un nodo por ID
 * SIEMPRE usa configuración del servidor (autoridad)
 */
export function getNodeConfig(nodeId) {
    const config = NODE_CONFIG[nodeId] || null;
    
    // Si no hay configuración del servidor, devolver configuración local básica
    if (!window.game?.serverBuildingConfig) {
        return config;
    }
    
    // Usar configuración del servidor (autoridad)
    const serverConfig = window.game.serverBuildingConfig;
    
    if (config && serverConfig) {
        // Crear una copia de la configuración local
        const hybridConfig = { ...config };
        
        // Sobrescribir con valores del servidor
        if (serverConfig.costs && serverConfig.costs[nodeId] !== undefined) {
            hybridConfig.cost = serverConfig.costs[nodeId];
        }
        
        if (serverConfig.buildTimes && serverConfig.buildTimes[nodeId] !== undefined) {
            hybridConfig.constructionTime = serverConfig.buildTimes[nodeId];
        }
        
        if (serverConfig.descriptions && serverConfig.descriptions[nodeId]) {
            hybridConfig.name = serverConfig.descriptions[nodeId].name;
            hybridConfig.description = serverConfig.descriptions[nodeId].description;
            // 🆕 NUEVO: Incluir details si está disponible
            if (serverConfig.descriptions[nodeId].details) {
                hybridConfig.details = serverConfig.descriptions[nodeId].details;
            }
        }
        
        if (serverConfig.capacities && serverConfig.capacities[nodeId]) {
            const capacities = serverConfig.capacities[nodeId];
            Object.keys(capacities).forEach(key => {
                hybridConfig[key] = capacities[key];
            });
        }
        
        if (serverConfig.gameplay && serverConfig.gameplay[nodeId]) {
            const gameplay = serverConfig.gameplay[nodeId];
            Object.keys(gameplay).forEach(key => {
                hybridConfig[key] = gameplay[key];
            });
        }
        
        if (serverConfig.detectionRadii && serverConfig.detectionRadii[nodeId] !== undefined) {
            hybridConfig.detectionRadius = serverConfig.detectionRadii[nodeId];
        }
        
        if (serverConfig.security && serverConfig.security[nodeId]) {
            const security = serverConfig.security[nodeId];
            Object.keys(security).forEach(key => {
                hybridConfig[key] = security[key];
            });
        }
        
        if (serverConfig.behavior && serverConfig.behavior.enabled) {
            // 🆕 NUEVO: enabled viene de behavior.enabled
            const enabledValue = serverConfig.behavior.enabled[nodeId];
            if (enabledValue !== undefined) {
                hybridConfig.enabled = enabledValue;
            }
        }
        
        if (serverConfig.behavior && serverConfig.behavior.behavior) {
            const behavior = serverConfig.behavior.behavior[nodeId];
            if (behavior) {
                Object.keys(behavior).forEach(key => {
                    hybridConfig[key] = behavior[key];
                });
            }
        }
        
        return hybridConfig;
    }
    
    return config;
}

/**
 * Obtiene todos los nodos construibles (buildings) HABILITADOS
 * Compatible con servidor como autoridad: enabled puede venir del servidor
 */
export function getBuildableNodes() {
    const allNodes = Object.values(NODE_CONFIG).filter(n => n.category === 'buildable');
    
    // 🆕 NUEVO: Verificar enabled desde configuración del servidor si está disponible
    if (window.game?.serverBuildingConfig?.behavior?.enabled) {
        const serverEnabled = window.game.serverBuildingConfig.behavior.enabled;
        return allNodes.filter(n => {
            // Si el servidor tiene configuración de enabled, usarla
            if (serverEnabled.hasOwnProperty(n.id)) {
                return serverEnabled[n.id] === true;
            }
            // Si no está en el servidor, usar configuración local
            return (n.enabled === undefined || n.enabled !== false);
        });
    }
    
    // Fallback: usar configuración local
    return allNodes.filter(n => (n.enabled === undefined || n.enabled !== false));
}

/**
 * Obtiene todos los proyectiles HABILITADOS
 * Compatible con servidor como autoridad: enabled puede venir del servidor
 */
export function getProjectiles() {
    const allNodes = Object.values(NODE_CONFIG).filter(n => n.category === 'projectile');
    
    // 🆕 NUEVO: Verificar enabled desde configuración del servidor si está disponible
    if (window.game?.serverBuildingConfig?.behavior?.enabled) {
        const serverEnabled = window.game.serverBuildingConfig.behavior.enabled;
        return allNodes.filter(n => {
            // Si el servidor tiene configuración de enabled para este nodo, usarla
            if (serverEnabled.hasOwnProperty(n.id)) {
                return serverEnabled[n.id] === true;
            }
            // 🎯 CORREGIDO: Si NO está en el servidor, usar configuración local (permitir por defecto)
            // Esto es importante porque los consumibles pueden no estar en la lista de enabled del servidor
            return (n.enabled === undefined || n.enabled !== false);
        });
    }
    
    // Fallback: usar configuración local
    return allNodes.filter(n => (n.enabled === undefined || n.enabled !== false));
}

/**
 * Obtiene todos los nodos del mapa (aliados, no construibles durante el juego)
 */
export function getMapNodes() {
    return Object.values(NODE_CONFIG).filter(n => n.category === 'map_node');
}

/**
 * Obtiene todos los nodos aliados HABILITADOS (para el Arsenal)
 * Compatible con servidor como autoridad: enabled puede venir del servidor
 */
export function getAllyNodes() {
    const allNodes = Object.values(NODE_CONFIG).filter(n => 
        n.category === 'map_node' || n.category === 'buildable'
    );
    
    // Verificar enabled desde configuración del servidor si está disponible
    if (window.game?.serverBuildingConfig?.behavior?.enabled) {
        const serverEnabled = window.game.serverBuildingConfig.behavior.enabled;
        return allNodes.filter(n => {
            // Si el servidor tiene configuración de enabled, usarla
            if (serverEnabled.hasOwnProperty(n.id)) {
                return serverEnabled[n.id] === true;
            }
            // Si no está en el servidor, usar configuración local
            return (n.enabled === undefined || n.enabled !== false);
        });
    }
    
    // Fallback: usar configuración local
    return allNodes.filter(n => (n.enabled === undefined || n.enabled !== false));
}

/**
 * Obtiene todos los edificios construibles disponibles para una raza específica
 * Compatible con servidor como autoridad: enabled puede venir del servidor
 * @param {string} raceId - ID de la raza
 * @returns {Array} Array con los edificios construibles disponibles para la raza
 */
/**
 * Obtiene los nodos construibles para una raza específica (SOLO VISUAL - FALLBACK)
 * ⚠️ DEPRECATED: La lógica real está en el servidor (autoridad - ANTI-HACK)
 * @param {string} raceId - ID de la raza
 * @returns {Array} Array con los nodos construibles (fallback seguro)
 */
export function getBuildableNodesByRace(raceId) {
    // ⚠️ DEPRECATED: raceConfig.buildings movido al servidor
    // Usar fallback seguro: todos los edificios construibles por defecto
    // La validación real se hace en el servidor
    return Object.values(NODE_CONFIG)
        .filter(node => node.category === 'buildable' && 
                (node.enabled === undefined || node.enabled !== false));
}

/**
 * Obtiene todos los proyectiles/consumibles disponibles para una raza específica
 * @param {string} raceId - ID de la raza
 * @returns {Array} Array con los proyectiles disponibles para la raza
 */
/**
 * Obtiene los proyectiles/consumibles para una raza específica (SOLO VISUAL - FALLBACK)
 * ⚠️ DEPRECATED: La lógica real está en el servidor (autoridad - ANTI-HACK)
 * @param {string} raceId - ID de la raza
 * @returns {Array} Array con los proyectiles (fallback seguro)
 */
export function getProjectilesByRace(raceId) {
    // ⚠️ DEPRECATED: raceConfig.consumables movido al servidor
    // Usar fallback seguro: todos los proyectiles por defecto
    // La validación real se hace en el servidor
    return Object.values(NODE_CONFIG)
        .filter(node => node.category === 'projectile');
}

/**
 * Verifica si un nodo está disponible para una raza específica
 * @param {string} nodeId - ID del nodo
 * @param {string} raceId - ID de la raza
 * @returns {boolean} true si el nodo está disponible para la raza
 */
/**
 * Verifica si un nodo está disponible para una raza específica (SOLO VISUAL - FALLBACK)
 * ⚠️ DEPRECATED: La lógica real está en el servidor (autoridad - ANTI-HACK)
 * @param {string} nodeId - ID del nodo
 * @param {string} raceId - ID de la raza
 * @returns {boolean} true si el nodo está disponible (fallback seguro)
 */
export function isNodeAvailableForRace(nodeId, raceId) {
    // ⚠️ DEPRECATED: raceConfig.buildings y raceConfig.consumables movidos al servidor
    // Usar fallback seguro: asumir que todos los nodos están disponibles
    // La validación real se hace en el servidor
    return true;
}

















