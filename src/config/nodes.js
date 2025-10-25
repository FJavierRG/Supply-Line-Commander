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
        hitboxRadius: 60, // +20% hitbox (50 * 1.2)
        canBeDestroyed: false,
        needsConstruction: false,
        cost: null,
        
        // Sistema de suministros
        hasSupplies: false, // HQ tiene suministros infinitos
        maxSupplies: null,
        
        // Sistema de vehículos
        hasVehicles: true,
        maxVehicles: 4,
        
        // Sistema médico
        hasMedicalSystem: true,
        maxAmbulances: 1,
        
        // Renderizado
        shadowColor: '#3498db'
    },
    
    fob: {
        id: 'fob',
        name: 'FOB (Base Avanzada)',
        description: 'Base de operaciones avanzada. Genera y envía convoyes al frente.',
        spriteKey: 'base-fob',
        category: 'buildable', // Puede construirse Y aparecer en el mapa
        enabled: true, // ✅ HABILITADO
        
        
        radius: 40, // Tamaño visual del sprite
        hitboxRadius: 48, // +20% hitbox (40 * 1.2)
        detectionRadius: 140, // Valor original (sin +15%)
        canBeDestroyed: true,
        needsConstruction: true,
        cost: 130, // ⚖️ BALANCEADO (era 150)
        constructionTime: 2,
        
        hasSupplies: true,
        maxSupplies: 100,
        
        hasVehicles: true,
        maxVehicles: 2,
        
        shadowColor: '#2ecc71'
    },
    
    front: {
        id: 'front',
        name: 'Frente',
        description: 'Nodo de avance en el frente. Consume suministros para empujar. Asegúrate de que tenga más recursos que el frente enemigo.',
        spriteKey: 'base-front',
        category: 'map_node',
        
        
        radius: 35, // Tamaño visual del sprite
        hitboxRadius: 42, // +20% hitbox (35 * 1.2)
        canBeDestroyed: true,
        needsConstruction: false,
        cost: null,
        
        hasSupplies: true,
        maxSupplies: 100,
        consumeRate: 1.6, // 👈 BALANCEO: Consumo por segundo
        
        hasVehicles: false,
        maxVehicles: 0,
        
        // 🆕 NUEVO: Sistema de helicópteros para segunda nación
        hasHelicopters: false, // Se activará dinámicamente para militaryBasic
        maxHelicopters: 1,
        
        shadowColor: '#e67e22'
    },
    
    // ========== EDIFICIOS CONSTRUIBLES ==========
    antiDrone: {
        id: 'antiDrone',
        name: 'Anti-Dron',
        description: 'Defensa contra drones enemigos. Tiene un solo proyectil.',
        spriteKey: 'building-anti-drone',
        category: 'buildable',
        enabled: true, // ✅ HABILITADO
        
        // Sistema de razas
        
        radius: 30, // Tamaño visual del sprite
        hitboxRadius: 36, // +20% hitbox (30 * 1.2)
        detectionRadius: 120, // Valor original (sin +15%)
        canBeDestroyed: true,
        needsConstruction: true,
        cost: 115, //
        constructionTime: 2,
        sizeMultiplier: 0.85,
        
        // Propiedades específicas anti-drone
        detectionRange: 160,
        alertRange: 220,
        cooldownTime: 3000,
        isConsumable: true,
        showRangePreview: true
    },
    
    droneLauncher: {
        id: 'droneLauncher',
        name: 'Lanzadera de Drones',
        description: 'Desbloquea el uso de drones bomba.',
        spriteKey: 'building-drone-launcher',
        category: 'buildable',
        enabled: true,
        
        // Sistema de razas
        
        radius: 30, // Tamaño visual del sprite
        hitboxRadius: 36, // +20% hitbox (30 * 1.2)
        detectionRadius: 120, // Valor original (sin +15%)
        canBeDestroyed: true,
        needsConstruction: true,
        cost: 100,
        constructionTime: 3,
        sizeMultiplier: 0.9
    },
    
    razorNet: {
        id: 'razorNet',
        name: 'Red de Alambre',
        description: 'Ralentiza el avance enemigo',
        spriteKey: 'building-razor-net',
        category: 'buildable',
        enabled: false, // ⚠️ DESACTIVADO - Cambia a true para habilitar
        
        // Sistema de razas
        
        radius: 25, // Tamaño visual del sprite
        hitboxRadius: 30, // +20% hitbox (25 * 1.2)
        detectionRadius: 100, // Valor original calculado
        canBeDestroyed: true,
        needsConstruction: true,
        cost: 100,
        constructionTime: 2
    },
    
    truckFactory: {
        id: 'truckFactory',
        name: 'Fábrica de Camiones',
        description: 'Añade +1 vehículo al HQ y +15 de capacidad de carga a camiones pesados.',
        spriteKey: 'building-truck-factory',
        category: 'buildable',
        enabled: true, // ✅ ACTIVADO
        
        // Sistema de razas
        
        radius: 35, // Tamaño visual del sprite
        hitboxRadius: 42, // +20% hitbox (35 * 1.2)
        detectionRadius: 130, // Valor original (sin +15%)
        canBeDestroyed: true,
        needsConstruction: true,
        cost: 100, // ⚖️ BALANCEADO
        constructionTime: 2,
        
        // Efectos:
        effect: 'increaseHQVehicles',
        vehicleBonus: 1,              // +1 vehículo al HQ
        heavyTruckCapacityBonus: 15   // +15 capacidad a camiones pesados
    },
    
    engineerCenter: {
        id: 'engineerCenter',
        name: 'Centro de Ingenieros',
        description: 'Asfalta los caminos del HQ a las FOBs aumentando +50% la velocidad de los camiones pesados.',
        spriteKey: 'building-engineer-center',
        category: 'buildable',
        enabled: true,
        
        // Sistema de razas
        
        radius: 35, // Tamaño visual del sprite
        hitboxRadius: 42, // +20% hitbox (35 * 1.2)
        detectionRadius: 130, // Valor original (sin +15%)
        canBeDestroyed: true,
        needsConstruction: true,
        cost: 100,
        constructionTime: 3
    },
    
    nuclearPlant: {
        id: 'nuclearPlant',
        name: 'Planta Nuclear',
        description: 'Aumenta la generación pasiva de recursos en +2/s por cada planta construida.',
        spriteKey: 'building-nuclear-plant',
        category: 'buildable',
        enabled: true, // ✅ HABILITADO
        
        // Sistema de razas
        
        radius: 40, // Tamaño visual del sprite
        hitboxRadius: 48, // +20% hitbox (40 * 1.2)
        detectionRadius: 161, // +15% (140 * 1.15)
        canBeDestroyed: true,
        needsConstruction: true,
        cost: 200, // ⚖️ BALANCEADO
        constructionTime: 2,
        
        passiveIncomeBonus: 2
    },
    
    machineNest: {
        id: 'machineNest',
        name: 'Nido de Ametralladoras',
        description: 'Torreta defensiva contra frentes enemigos. Tiene un solo proyectil.',
        spriteKey: 'building-machine-nest',
        category: 'buildable',
        enabled: false, // ⚠️ DESACTIVADO - Cambia a true para habilitar
        
        // Sistema de razas
        
        radius: 30, // Tamaño visual del sprite
        hitboxRadius: 36, // +20% hitbox (30 * 1.2)
        detectionRadius: 138, // +15% (120 base calculado: 120 * 1.15)
        canBeDestroyed: true,
        needsConstruction: true,
        cost: 250,
        constructionTime: 2,
        sizeMultiplier: 1.15,
        flipHorizontal: true
    },
    
    campaignHospital: {
        id: 'campaignHospital',
        name: 'Hospital de Campaña',
        description: 'Envía vehículos médicos a frentes aliados. Tiene rango limitado.',
        spriteKey: 'building-campaign-hospital',
        category: 'buildable',
        enabled: false, // ✅ HABILITADO
        
        // Sistema de razas
        
        radius: 35, // Tamaño visual del sprite
        hitboxRadius: 42, // +20% hitbox (35 * 1.2)
        detectionRadius: 130, // Valor original (sin +15%)
        canBeDestroyed: true,
        needsConstruction: true,
        cost: 100, // ⚖️ BALANCEADO
        constructionTime: 2,
        sizeMultiplier: 0.8, // Reducir sprite 20%
        
        // Hospital NO tiene suministros, solo ambulancias
        hasSupplies: false,
        
        maxVehicles: 1,
        actionRange: 260, // Ampliado 30% (era 200)
        canDispatchMedical: true,
        showRangePreview: true
    },
    
    intelRadio: {
        id: 'intelRadio',
        name: 'Radio Inteligencia',
        description: 'Inversión temporal. Después de 12 segundos devuelve el coste (50$) más 50$ de beneficio.',
        spriteKey: 'building-intel-radio', // Sprite específico para intelRadio
        category: 'buildable',
        enabled: true, // ✅ HABILITADO
        
        // Sistema de razas
        
        radius: 30, // Tamaño visual del sprite
        hitboxRadius: 36, // +20% hitbox (30 * 1.2)
        detectionRadius: 120, // Valor original (sin +15%)
        canBeDestroyed: true,
        needsConstruction: true,
        cost: 50, // Coste de inversión
        constructionTime: 1, // Construcción rápida
        
        // Propiedades de inversión
        investmentTime: 12, // Tiempo en segundos antes de pagar
        investmentReturn: 100, // Total a pagar (coste + beneficio)
        
        hasSupplies: false, // No genera suministros
        hasVehicles: false // No maneja vehículos
    },
    
    aerialBase: {
        id: 'aerialBase',
        name: 'Base Aérea',
        description: 'Punto de recarga para helicópteros. Suministra hasta 200 de cargo. Se destruye cuando se agota.',
        spriteKey: 'building-aerial-base',
        category: 'buildable', // ✅ RESTAURADO: Para que aparezca en la tienda
        enabled: true, // ✅ HABILITADO
        
        radius: 40, // Tamaño visual del sprite
        hitboxRadius: 48, // +20% hitbox (40 * 1.2)
        detectionRadius: 130,
        canBeDestroyed: true,
        needsConstruction: true,
        cost: 150, // Coste de construcción
        constructionTime: 3, // Tiempo de construcción
        sizeMultiplier: 0.66, // 🆕 AUMENTADO: 50% más grande (0.44 * 1.5 = 0.66)
        
        // Sistema de suministros (para recarga de helicópteros)
        hasSupplies: true,
        maxSupplies: 200, // Capacidad máxima de cargo
        
        // No maneja vehículos tradicionales
        hasVehicles: false,
        
        // Propiedades especiales
        isAerialBase: true, // Flag para identificación
        autoDestroy: true // Se destruye cuando supplies llega a 0
    },
    
    // ========== PROYECTILES ==========
    drone: {
        id: 'drone',
        name: 'Dron Bomba',
        description: 'Destruye un objetivo enemigo. Puede ser interceptado por Anti-Drones. Requiere tener una lanzadera en el campo.',
        spriteKey: 'vehicle-drone',
        category: 'projectile',
        enabled: true, // ✅ HABILITADO
        
        // Sistema de razas
        
        radius: 0,
        canBeDestroyed: false,
        needsConstruction: false,
        cost: 150, //  BALANCEADO
        sizeMultiplier: 1.15
    },
    
    sniperStrike: {
        id: 'sniperStrike',
        name: 'Disparo de Francotirador',
        description: 'Ordena un ataque de francotirador a un frente enemigo. Causa el efecto wounded durante 15 segundos.',
        spriteKey: 'vehicle-sniper_shoot_icon',
        category: 'projectile',
        enabled: true, // ✅ HABILITADO
        
        // Sistema de razas
        
        radius: 0,
        canBeDestroyed: false,
        needsConstruction: false,
        cost: 40, // Sincronizado con servidor
        cursorSprite: 'sniper',
        targetType: 'front', // Cualquier frente (validación de team en runtime)
        effectDuration: 15, // Duración del efecto wounded en segundos
        spottedSoundCooldown: 7 // Cooldown del sonido sniper_spotted
    },
    
    fobSabotage: {
        id: 'fobSabotage',
        name: 'Fob Sabotaje',
        description: 'Sabotear una FOB enemiga aplicando una penalización del 50% de velocidad a los siguientes 3 camiones que envíe.',
        spriteKey: 'specops_unit', // Sprite del consumible
        category: 'projectile',
        enabled: true, // ✅ HABILITADO
        
        // Sistema de razas
        
        radius: 0,
        canBeDestroyed: false,
        needsConstruction: false,
        cost: 40, // Balanceado
        cursorSprite: 'specops_selector', // Sprite del cursor
        targetType: 'fob', // Solo FOBs (validación de team en runtime)
        speedPenalty: 0.5, // 50% de penalización
        truckCount: 3, // Número de camiones afectados
        effectIcon: 'ui-no-supplies' // Icono temporal para mostrar el efecto
    }
};

/**
 * Obtiene la configuración de un nodo por ID
 */
export function getNodeConfig(nodeId) {
    return NODE_CONFIG[nodeId] || null;
}

/**
 * Obtiene todos los nodos construibles (buildings) HABILITADOS
 */
export function getBuildableNodes() {
    return Object.values(NODE_CONFIG).filter(n => n.category === 'buildable' && n.enabled !== false);
}

/**
 * Obtiene todos los proyectiles HABILITADOS
 */
export function getProjectiles() {
    return Object.values(NODE_CONFIG).filter(n => n.category === 'projectile' && n.enabled !== false);
}

/**
 * Obtiene todos los nodos del mapa (aliados, no construibles durante el juego)
 */
export function getMapNodes() {
    return Object.values(NODE_CONFIG).filter(n => n.category === 'map_node');
}

/**
 * ⚠️ DEPRECATED: Usar filtrado por team en lugar de categoría
 * Mantener para compatibilidad temporal durante migración
 */
export function getEnemyNodes() {
    console.warn('⚠️ getEnemyNodes() está deprecated. Usar filtrado por team.');
    return []; // Ya no hay nodos con category 'enemy'
}

/**
 * Obtiene todos los nodos aliados HABILITADOS (para el Arsenal)
 */
export function getAllyNodes() {
    return Object.values(NODE_CONFIG).filter(n => 
        (n.category === 'map_node' || n.category === 'buildable') && n.enabled !== false
    );
}

/**
 * Obtiene configuración de nodos que pueden ser usados por cualquier equipo
 * (para crear instancias con diferentes teams)
 */
export function getTeamCapableNodes() {
    return Object.values(NODE_CONFIG).filter(n => 
        n.category === 'map_node' || n.category === 'buildable'
    );
}

/**
 * Obtiene todos los nodos disponibles para una raza específica
 * @param {string} raceId - ID de la raza
 * @returns {Array} Array con los nodos disponibles para la raza
 */
export function getNodesByRace(raceId) {
    return Object.values(NODE_CONFIG).filter(n => 
        n.races && n.races.includes(raceId)
    );
}

/**
 * Obtiene todos los edificios construibles disponibles para una raza específica
 * @param {string} raceId - ID de la raza
 * @returns {Array} Array con los edificios construibles disponibles para la raza
 */
export function getBuildableNodesByRace(raceId) {
    const raceConfig = getRaceConfig(raceId);
    
    if (!raceConfig) return [];
    
    return raceConfig.buildings.map(buildingId => NODE_CONFIG[buildingId])
        .filter(node => node && node.category === 'buildable' && node.enabled !== false);
}

/**
 * Obtiene todos los proyectiles/consumibles disponibles para una raza específica
 * @param {string} raceId - ID de la raza
 * @returns {Array} Array con los proyectiles disponibles para la raza
 */
export function getProjectilesByRace(raceId) {
    const raceConfig = getRaceConfig(raceId);
    
    if (!raceConfig) return [];
    
    return raceConfig.consumables.map(consumableId => NODE_CONFIG[consumableId])
        .filter(node => node && node.category === 'projectile');
}

/**
 * Verifica si un nodo está disponible para una raza específica
 * @param {string} nodeId - ID del nodo
 * @param {string} raceId - ID de la raza
 * @returns {boolean} true si el nodo está disponible para la raza
 */
export function isNodeAvailableForRace(nodeId, raceId) {
    const raceConfig = getRaceConfig(raceId);
    
    if (!raceConfig) return false;
    
    // Verificar si está en buildings o consumibles
    return raceConfig.buildings.includes(nodeId) || raceConfig.consumables.includes(nodeId);
}

















