// ===== CONFIGURACIÓN UNIFICADA DE NODOS DEL JUEGO =====
// Incluye: Nodos base del mapa, edificios construibles y proyectiles

import { getRaceConfig } from './races.js';

export const NODE_CONFIG = {
    // ========== NODOS BASE DEL MAPA ==========
    hq: {
        id: 'hq',
        name: 'HQ (Cuartel General)',
        description: 'Nodo principal: gestiona recursos, vehículos y ambulancias.',
        spriteKey: 'base-hq',
        category: 'map_node',
        
        
        // Propiedades
        radius: 50,
        // hitboxRadius: Definido por el servidor (autoridad - ANTI-HACK)
        // canBeDestroyed: Definido por el servidor (autoridad - ANTI-HACK)
        // needsConstruction: Definido por el servidor (autoridad - ANTI-HACK)
        // cost: Definido por el servidor (autoridad)
        
        // Sistema de suministros
        // hasSupplies: Definido por el servidor (autoridad - ANTI-HACK)
        // maxSupplies: Definido por el servidor (autoridad)
        
        // Sistema de vehículos
        // hasVehicles: Definido por el servidor (autoridad - ANTI-HACK)
        // maxVehicles: Definido por el servidor (autoridad)
        
        // Sistema médico
        // hasMedicalSystem: Definido por el servidor (autoridad - ANTI-HACK)
        // maxAmbulances: Definido por el servidor (autoridad)
        
        // Renderizado
        shadowColor: '#3498db'
    },
    
    fob: {
        id: 'fob',
        // name y description: Definidos por el servidor (autoridad)
        spriteKey: 'base-fob',
        category: 'buildable', // Puede construirse Y aparecer en el mapa
        // enabled: Definido por el servidor (autoridad - ANTI-HACK)
        
        
        radius: 40, // Tamaño visual del sprite
        // hitboxRadius: Definido por el servidor (autoridad - ANTI-HACK)
        // detectionRadius: Definido por el servidor (autoridad - CRÍTICO PARA SEGURIDAD)
        // canBeDestroyed: Definido por el servidor (autoridad - ANTI-HACK)
        // needsConstruction: Definido por el servidor (autoridad - ANTI-HACK)
        // cost y constructionTime: Definidos por el servidor (autoridad)
        
        // Sistema de suministros
        // hasSupplies: Definido por el servidor (autoridad - ANTI-HACK)
        // maxSupplies: Definido por el servidor (autoridad)
        
        // Sistema de vehículos
        // hasVehicles: Definido por el servidor (autoridad - ANTI-HACK)
        // maxVehicles: Definido por el servidor (autoridad)
        
        shadowColor: '#2ecc71'
    },
    
    front: {
        id: 'front',
        name: 'Frente',
        description: 'Nodo de avance en el frente. Consume suministros para empujar. Asegúrate de que tenga más recursos que el frente enemigo.',
        spriteKey: 'base-front',
        category: 'map_node',
        
        
        radius: 35, // Tamaño visual del sprite
        // hitboxRadius: Definido por el servidor (autoridad - ANTI-HACK)
        // canBeDestroyed: Definido por el servidor (autoridad - ANTI-HACK)
        // needsConstruction: Definido por el servidor (autoridad - ANTI-HACK)
        // cost: Definido por el servidor (autoridad)
        
        // Sistema de suministros
        // hasSupplies: Definido por el servidor (autoridad - ANTI-HACK)
        // maxSupplies: Definido por el servidor (autoridad)
        // consumeRate: Definido por el servidor (autoridad)
        
        // Sistema de vehículos
        // hasVehicles: Definido por el servidor (autoridad - ANTI-HACK)
        // maxVehicles: Definido por el servidor (autoridad)
        
        // 🆕 NUEVO: Sistema de helicópteros para segunda nación
        // hasHelicopters: Definido por el servidor (autoridad - ANTI-HACK)
        // maxHelicopters: Definido por el servidor (autoridad)
        
        shadowColor: '#e67e22'
    },
    
    // ========== EDIFICIOS CONSTRUIBLES ==========
    antiDrone: {
        id: 'antiDrone',
        // name y description: Definidos por el servidor (autoridad)
        spriteKey: 'building-anti-drone',
        category: 'buildable',
        // enabled: Definido por el servidor (autoridad - ANTI-HACK)
        
        // Sistema de razas
        
        radius: 30, // Tamaño visual del sprite
        // hitboxRadius: Definido por el servidor (autoridad - ANTI-HACK)
        // detectionRadius: Definido por el servidor (autoridad - CRÍTICO PARA SEGURIDAD)
        // canBeDestroyed: Definido por el servidor (autoridad - ANTI-HACK)
        // needsConstruction: Definido por el servidor (autoridad - ANTI-HACK)
        // cost y constructionTime: Definidos por el servidor (autoridad)
        sizeMultiplier: 0.85,
        
        // Propiedades específicas anti-drone
        // detectionRange, alertRange, cooldownTime: Definidos por el servidor (autoridad)
        // isConsumable, showRangePreview: Definidos por el servidor (autoridad - ANTI-HACK)
    },
    
    droneLauncher: {
        id: 'droneLauncher',
        // name y description: Definidos por el servidor (autoridad)
        spriteKey: 'building-drone-launcher',
        category: 'buildable',
        // enabled: Definido por el servidor (autoridad - ANTI-HACK)
        
        // Sistema de razas
        
        radius: 30, // Tamaño visual del sprite
        // hitboxRadius: Definido por el servidor (autoridad - ANTI-HACK)
        // detectionRadius: Definido por el servidor (autoridad - CRÍTICO PARA SEGURIDAD)
        // canBeDestroyed: Definido por el servidor (autoridad - ANTI-HACK)
        // needsConstruction: Definido por el servidor (autoridad - ANTI-HACK)
        // cost y constructionTime: Definidos por el servidor (autoridad)
        sizeMultiplier: 0.9
    },
    
    razorNet: {
        id: 'razorNet',
        // name y description: Definidos por el servidor (autoridad)
        spriteKey: 'building-razor-net',
        category: 'buildable',
        // enabled: Definido por el servidor (autoridad - ANTI-HACK)
        
        // Sistema de razas
        
        radius: 25, // Tamaño visual del sprite
        // hitboxRadius: Definido por el servidor (autoridad - ANTI-HACK)
        // detectionRadius: Definido por el servidor (autoridad - CRÍTICO PARA SEGURIDAD)
        // canBeDestroyed: Definido por el servidor (autoridad - ANTI-HACK)
        // needsConstruction: Definido por el servidor (autoridad - ANTI-HACK)
        // cost y constructionTime: Definidos por el servidor (autoridad)
    },
    
    truckFactory: {
        id: 'truckFactory',
        // name y description: Definidos por el servidor (autoridad)
        spriteKey: 'building-truck-factory',
        category: 'buildable',
        // enabled: Definido por el servidor (autoridad - ANTI-HACK)
        
        // Sistema de razas
        
        radius: 35, // Tamaño visual del sprite
        // hitboxRadius: Definido por el servidor (autoridad - ANTI-HACK)
        // detectionRadius: Definido por el servidor (autoridad - CRÍTICO PARA SEGURIDAD)
        // canBeDestroyed: Definido por el servidor (autoridad - ANTI-HACK)
        // needsConstruction: Definido por el servidor (autoridad - ANTI-HACK)
        // cost y constructionTime: Definidos por el servidor (autoridad)
        
        // Efectos:
        // effect, vehicleBonus, heavyTruckCapacityBonus: Definidos por el servidor (autoridad)
    },
    
    engineerCenter: {
        id: 'engineerCenter',
        // name y description: Definidos por el servidor (autoridad)
        spriteKey: 'building-engineer-center',
        category: 'buildable',
        // enabled: Definido por el servidor (autoridad - ANTI-HACK)
        
        // Sistema de razas
        
        radius: 35, // Tamaño visual del sprite
        // hitboxRadius: Definido por el servidor (autoridad - ANTI-HACK)
        // detectionRadius: Definido por el servidor (autoridad - CRÍTICO PARA SEGURIDAD)
        // canBeDestroyed: Definido por el servidor (autoridad - ANTI-HACK)
        // needsConstruction: Definido por el servidor (autoridad - ANTI-HACK)
        // cost y constructionTime: Definidos por el servidor (autoridad)
    },
    
    nuclearPlant: {
        id: 'nuclearPlant',
        // name y description: Definidos por el servidor (autoridad)
        spriteKey: 'building-nuclear-plant',
        category: 'buildable',
        // enabled: Definido por el servidor (autoridad - ANTI-HACK)
        
        // Sistema de razas
        
        radius: 40, // Tamaño visual del sprite
        // hitboxRadius: Definido por el servidor (autoridad - ANTI-HACK)
        // detectionRadius: Definido por el servidor (autoridad - CRÍTICO PARA SEGURIDAD)
        // canBeDestroyed: Definido por el servidor (autoridad - ANTI-HACK)
        // needsConstruction: Definido por el servidor (autoridad - ANTI-HACK)
        // cost y constructionTime: Definidos por el servidor (autoridad)
        
        // passiveIncomeBonus: Definido por el servidor (autoridad)
    },
    
    machineNest: {
        id: 'machineNest',
        // name y description: Definidos por el servidor (autoridad)
        spriteKey: 'building-machine-nest',
        category: 'buildable',
        // enabled: Definido por el servidor (autoridad - ANTI-HACK)
        
        // Sistema de razas
        
        radius: 30, // Tamaño visual del sprite
        // hitboxRadius: Definido por el servidor (autoridad - ANTI-HACK)
        // detectionRadius: Definido por el servidor (autoridad - CRÍTICO PARA SEGURIDAD)
        // canBeDestroyed: Definido por el servidor (autoridad - ANTI-HACK)
        // needsConstruction: Definido por el servidor (autoridad - ANTI-HACK)
        // cost y constructionTime: Definidos por el servidor (autoridad)
        sizeMultiplier: 1.15,
        flipHorizontal: true
    },
    
    campaignHospital: {
        id: 'campaignHospital',
        // name y description: Definidos por el servidor (autoridad)
        spriteKey: 'building-campaign-hospital',
        category: 'buildable',
        // enabled: Definido por el servidor (autoridad - ANTI-HACK)
        
        // Sistema de razas
        
        radius: 35, // Tamaño visual del sprite
        // hitboxRadius: Definido por el servidor (autoridad - ANTI-HACK)
        // detectionRadius: Definido por el servidor (autoridad - CRÍTICO PARA SEGURIDAD)
        // canBeDestroyed: Definido por el servidor (autoridad - ANTI-HACK)
        // needsConstruction: Definido por el servidor (autoridad - ANTI-HACK)
        // cost y constructionTime: Definidos por el servidor (autoridad)
        sizeMultiplier: 0.8, // Reducir sprite 20%
        
        // Hospital NO tiene suministros, solo ambulancias
        // hasSupplies: Definido por el servidor (autoridad - ANTI-HACK)
        
        // maxVehicles: Definido por el servidor (autoridad)
        // actionRange: Definido por el servidor (autoridad)
        // canDispatchMedical: Definido por el servidor (autoridad - ANTI-HACK)
        // showRangePreview: Definido por el servidor (autoridad - ANTI-HACK)
    },
    
    intelRadio: {
        id: 'intelRadio',
        // name y description: Definidos por el servidor (autoridad)
        spriteKey: 'building-intel-radio', // Sprite específico para intelRadio
        category: 'buildable',
        // enabled: Definido por el servidor (autoridad - ANTI-HACK)
        
        // Sistema de razas
        
        radius: 30, // Tamaño visual del sprite
        // hitboxRadius: Definido por el servidor (autoridad - ANTI-HACK)
        // detectionRadius: Definido por el servidor (autoridad - CRÍTICO PARA SEGURIDAD)
        // canBeDestroyed: Definido por el servidor (autoridad - ANTI-HACK)
        // needsConstruction: Definido por el servidor (autoridad - ANTI-HACK)
        // cost y constructionTime: Definidos por el servidor (autoridad)
        
        // Propiedades de inversión
        // investmentTime, investmentReturn: Definidos por el servidor (autoridad)
        
        // hasSupplies: Definido por el servidor (autoridad - ANTI-HACK)
        // hasVehicles: Definido por el servidor (autoridad - ANTI-HACK)
    },
    
    intelCenter: {
        id: 'intelCenter',
        // name y description: Definidos por el servidor (autoridad)
        spriteKey: 'building-intel-center', // 🆕 Sprite del centro de inteligencia
        category: 'buildable',
        // enabled: Definido por el servidor (autoridad - ANTI-HACK)
        
        // Sistema de razas
        
        radius: 35, // Tamaño visual del sprite
        // hitboxRadius: Definido por el servidor (autoridad - ANTI-HACK)
        // detectionRadius: Definido por el servidor (autoridad - CRÍTICO PARA SEGURIDAD)
        // canBeDestroyed: Definido por el servidor (autoridad - ANTI-HACK)
        // needsConstruction: Definido por el servidor (autoridad - ANTI-HACK)
        // cost y constructionTime: Definidos por el servidor (autoridad)
    },
    
    aerialBase: {
        id: 'aerialBase',
        // name y description: Definidos por el servidor (autoridad)
        spriteKey: 'building-aerial-base',
        category: 'buildable', // ✅ RESTAURADO: Para que aparezca en la tienda
        // enabled: Definido por el servidor (autoridad - ANTI-HACK)
        
        radius: 40, // Tamaño visual del sprite
        // hitboxRadius: Definido por el servidor (autoridad - ANTI-HACK)
        // detectionRadius: Definido por el servidor (autoridad - CRÍTICO PARA SEGURIDAD)
        // canBeDestroyed: Definido por el servidor (autoridad - ANTI-HACK)
        // needsConstruction: Definido por el servidor (autoridad - ANTI-HACK)
        // cost y constructionTime: Definidos por el servidor (autoridad)
        sizeMultiplier: 0.66, // 🆕 AUMENTADO: 50% más grande (0.44 * 1.5 = 0.66)
        
        // Sistema de suministros (para recarga de helicópteros)
        // hasSupplies: Definido por el servidor (autoridad - ANTI-HACK)
        // maxSupplies: Definido por el servidor (autoridad)
        
        // No maneja vehículos tradicionales
        // hasVehicles: Definido por el servidor (autoridad - ANTI-HACK)
        
        // Propiedades especiales
        isAerialBase: true, // Flag para identificación
        autoDestroy: true // Se destruye cuando supplies llega a 0
    },
    
    vigilanceTower: {
        id: 'vigilanceTower',
        // name y description: Definidos por el servidor (autoridad)
        spriteKey: 'building-vigilance-tower',
        category: 'buildable',
        // enabled: Definido por el servidor (autoridad - ANTI-HACK)
        
        radius: 35, // Tamaño visual del sprite
        // hitboxRadius: Definido por el servidor (autoridad - ANTI-HACK)
        // detectionRadius: Definido por el servidor (autoridad - CRÍTICO PARA SEGURIDAD)
        // canBeDestroyed: Definido por el servidor (autoridad - ANTI-HACK)
        // needsConstruction: Definido por el servidor (autoridad - ANTI-HACK)
        // cost y constructionTime: Definidos por el servidor (autoridad)
        
        // No maneja suministros ni vehículos
        // hasSupplies: Definido por el servidor (autoridad - ANTI-HACK)
        // hasVehicles: Definido por el servidor (autoridad - ANTI-HACK)
        
        // Propiedades especiales
        isVigilanceTower: true // Flag para identificación
    },
    
    // ========== PROYECTILES ==========
    drone: {
        id: 'drone',
        name: 'Dron Bomba',
        description: 'Destruye un objetivo enemigo. Puede ser interceptado por Anti-Drones. Requiere tener una lanzadera en el campo.',
        spriteKey: 'vehicle-drone',
        category: 'projectile',
        // enabled: Definido por el servidor (autoridad - ANTI-HACK)
        
        // Sistema de razas
        
        radius: 0,
        // canBeDestroyed: Definido por el servidor (autoridad - ANTI-HACK)
        // needsConstruction: Definido por el servidor (autoridad - ANTI-HACK)
        // cost: Definido por el servidor (autoridad)
        sizeMultiplier: 1.15
    },
    
    sniperStrike: {
        id: 'sniperStrike',
        // name y description: Definidos por el servidor (autoridad)
        spriteKey: 'vehicle-sniper_shoot_icon',
        category: 'projectile',
        // enabled: Definido por el servidor (autoridad - ANTI-HACK)
        
        // Sistema de razas
        
        radius: 0,
        // canBeDestroyed: Definido por el servidor (autoridad - ANTI-HACK)
        // needsConstruction: Definido por el servidor (autoridad - ANTI-HACK)
        // cost: Definido por el servidor (autoridad)
        // cursorSprite, targetType: Definidos por el servidor (autoridad - ANTI-HACK)
        // effectDuration, spottedSoundCooldown: Definidos por el servidor (autoridad)
    },
    
    fobSabotage: {
        id: 'fobSabotage',
        // name y description: Definidos por el servidor (autoridad)
        spriteKey: 'specops_unit', // Sprite del consumible
        category: 'projectile',
        // enabled: Definido por el servidor (autoridad - ANTI-HACK)
        
        // Sistema de razas
        
        radius: 0,
        // canBeDestroyed: Definido por el servidor (autoridad - ANTI-HACK)
        // needsConstruction: Definido por el servidor (autoridad - ANTI-HACK)
        // cost: Definido por el servidor (autoridad)
        // cursorSprite, targetType: Definidos por el servidor (autoridad - ANTI-HACK)
        // speedPenalty, truckCount: Definidos por el servidor (autoridad)
        // effectIcon: Definido por el servidor (autoridad - ANTI-HACK)
    },
    
    specopsCommando: {
        id: 'specopsCommando',
        // name y description: Definidos por el servidor (autoridad)
        spriteKey: 'specops_observer', // 🆕 NUEVO: Sprite del comando especial operativo
        category: 'projectile',
        // enabled: Definido por el servidor (autoridad - ANTI-HACK)
        
        // Sistema de razas
        
        radius: 25, // 🆕 Radio físico del comando
        // canBeDestroyed: Definido por el servidor (autoridad - ANTI-HACK)
        // needsConstruction: Definido por el servidor (autoridad - ANTI-HACK)
        // cost: Definido por el servidor (autoridad)
        // cursorSprite, targetType: Definidos por el servidor (autoridad - ANTI-HACK)
        // detectionRadius: Definido por el servidor (autoridad)
    },
    
    tank: {
        id: 'tank',
        name: 'Tanque',
        description: 'Unidad blindada que destruye edificios enemigos. No puede atacar FOBs ni HQs. Se detiene en el borde del objetivo para disparar.',
        spriteKey: 'vehicle-tank-1', // Sprite base del tanque
        category: 'projectile',
        // enabled: Definido por el servidor (autoridad - ANTI-HACK)
        
        // Sistema de razas
        
        radius: 0,
        // canBeDestroyed: Definido por el servidor (autoridad - ANTI-HACK)
        // needsConstruction: Definido por el servidor (autoridad - ANTI-HACK)
        // cost: Definido por el servidor (autoridad)
        sizeMultiplier: 1.0
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
    return Object.values(NODE_CONFIG).filter(n => 
        (n.category === 'map_node' || n.category === 'buildable') && 
        (n.enabled === undefined || n.enabled !== false)
    );
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

















