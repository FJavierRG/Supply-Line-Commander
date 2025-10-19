// ===== CONFIGURACIÓN UNIFICADA DE NODOS DEL JUEGO =====
// Incluye: Nodos base del mapa, edificios construibles y proyectiles

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
        
        radius: 40,
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
        
        radius: 35,
        canBeDestroyed: true,
        needsConstruction: false,
        cost: null,
        
        hasSupplies: true,
        maxSupplies: 100,
        consumeRate: 1.6, // 👈 BALANCEO: Consumo por segundo
        
        hasVehicles: false,
        maxVehicles: 0,
        
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
        
        radius: 30,
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
        
        radius: 30,
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
        
        radius: 25,
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
        
        radius: 35,
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
        
        radius: 35,
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
        
        radius: 40,
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
        
        radius: 30,
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
        enabled: true, // ✅ HABILITADO
        
        radius: 35,
        canBeDestroyed: true,
        needsConstruction: true,
        cost: 100, // ⚖️ BALANCEADO
        constructionTime: 2,
        
        // Hospital NO tiene suministros, solo ambulancias
        hasSupplies: false,
        
        maxVehicles: 1,
        actionRange: 260, // Ampliado 30% (era 200)
        canDispatchMedical: true,
        showRangePreview: true
    },
    
    // ========== PROYECTILES ==========
    drone: {
        id: 'drone',
        name: 'Dron Bomba',
        description: 'Destruye un objetivo enemigo. Puede ser interceptado por Anti-Drones. Requiere tener una lanzadera en el campo.',
        spriteKey: 'vehicle-drone',
        category: 'projectile',
        enabled: true, // ✅ HABILITADO
        
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
        
        radius: 0,
        canBeDestroyed: false,
        needsConstruction: false,
        cost: 40, // Sincronizado con servidor
        cursorSprite: 'sniper',
        targetType: 'front', // Cualquier frente (validación de team en runtime)
        effectDuration: 15, // Duración del efecto wounded en segundos
        spottedSoundCooldown: 7 // Cooldown del sonido sniper_spotted
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

















