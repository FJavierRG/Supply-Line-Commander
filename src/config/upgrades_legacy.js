// ===== SISTEMA DE MEJORAS PERMANENTES =====

export const UPGRADES = {
    // ===== CATEGORÍA: CONSTRUCCIÓN Y EXPANSIÓN =====
    build: {
        id: 'build',
        key: 'build',
        name: 'Construcción Avanzada',
        description: 'Los FOBs construidos empiezan con +50% de recursos',
        icon: '🔨',
        cost: 1,
        isFree: false,
        category: 'construccion',
        apply: (game) => {
            console.log('🔨 Construcción avanzada desbloqueada');
        }
    },
    
    doubleBuild: {
        id: 'double-build',
        key: 'doubleBuild',
        name: 'Descuento en FOBs',
        description: 'Reduce el costo de construir FOBs en 50 currency',
        icon: '🏗️',
        cost: 2,
        isFree: false,
        category: 'construccion',
        requires: 'build',
        apply: (game) => {
            console.log('🏗️ Descuento en construcción de FOBs aplicado');
        }
    },
    
    quickBuild: {
        id: 'quick-build',
        key: 'quickBuild',
        name: 'Construcción Rápida',
        description: 'Los FOBs construidos obtienen +30 recursos adicionales',
        icon: '💰',
        cost: 1,
        isFree: false,
        category: 'construccion',
        requires: 'build',
        apply: (game) => {
            console.log('💰 FOBs obtienen +30 recursos adicionales al construirse');
        }
    },
    
    fortifiedFobs: {
        id: 'fortified-fobs',
        key: 'fortifiedFobs',
        name: 'FOBs Fortificados',
        description: 'Los FOBs construidos tienen +30 capacidad máxima',
        icon: '🛡️',
        cost: 2,
        isFree: false,
        category: 'construccion',
        apply: (game) => {
            console.log('🛡️ FOBs fortificados: +30 capacidad');
        }
    },
    
    // ===== CATEGORÍA: VEHÍCULOS Y CAPACIDAD =====
    fobVehicles: {
        id: 'fob-vehicles',
        key: 'fobVehicles',
        name: 'Vehículos FOB Mejorados',
        description: 'Los FOBs tienen +1 vehículo (3 total)',
        icon: '🚛',
        cost: 1,
        isFree: false,
        category: 'vehiculos',
        apply: (game) => {
            game.bases.forEach(base => {
                if (base.type === 'fob') {
                    base.maxVehicles += 1;
                    base.availableVehicles += 1;
                    console.log(`⛺ FOB: +1 vehículo (total: ${base.maxVehicles})`);
                }
            });
        }
    },
    
    hqVehicles: {
        id: 'hq-vehicles',
        key: 'hqVehicles',
        name: 'Flota HQ Ampliada',
        description: 'El HQ tiene +2 vehículos (8 total)',
        icon: '🏭',
        cost: 1,
        isFree: false,
        category: 'vehiculos',
        apply: (game) => {
            game.bases.forEach(base => {
                if (base.type === 'hq') {
                    base.maxVehicles += 2;
                    base.availableVehicles += 2;
                    console.log(`🏠 HQ: +2 vehículos (total: ${base.maxVehicles})`);
                }
            });
        }
    },
    
    megaFleet: {
        id: 'mega-fleet',
        key: 'megaFleet',
        name: 'Mega Flota',
        description: 'HQ +3 vehículos, FOB +2 vehículos adicionales',
        icon: '🚚',
        cost: 3,
        isFree: false,
        category: 'vehiculos',
        requires: 'hqVehicles',
        apply: (game) => {
            game.bases.forEach(base => {
                if (base.type === 'hq') {
                    base.maxVehicles += 3;
                    base.availableVehicles += 3;
                } else if (base.type === 'fob') {
                    base.maxVehicles += 2;
                    base.availableVehicles += 2;
                }
            });
            console.log('🚚 Mega Flota activada');
        }
    },
    
    largerConvoys: {
        id: 'larger-convoys',
        key: 'largerConvoys',
        name: 'Convoyes Pesados',
        description: '+50% capacidad de carga en todos los vehículos',
        icon: '📦',
        cost: 2,
        isFree: false,
        category: 'vehiculos',
        apply: (game) => {
            console.log('📦 Capacidad de carga aumentada +50%');
        }
    },
    
    // ===== CATEGORÍA: VELOCIDAD Y EFICIENCIA =====
    fasterConvoys: {
        id: 'faster-convoys',
        key: 'fasterConvoys',
        name: 'Motores Mejorados',
        description: 'Todos los vehículos se mueven +30% más rápido',
        icon: '⚡',
        cost: 2,
        isFree: false,
        category: 'velocidad',
        apply: (game) => {
            console.log('⚡ Velocidad de vehículos +30%');
        }
    },
    
    turboMode: {
        id: 'turbo-mode',
        key: 'turboMode',
        name: 'Modo Turbo',
        description: 'Velocidad de vehículos +50% adicional (total +80%)',
        icon: '💨',
        cost: 3,
        isFree: false,
        category: 'velocidad',
        requires: 'fasterConvoys',
        apply: (game) => {
            console.log('💨 Modo Turbo activado: +80% velocidad total');
        }
    },
    
    returnSpeed: {
        id: 'return-speed',
        key: 'returnSpeed',
        name: 'Retorno Rápido',
        description: 'Los vehículos vuelven +100% más rápido',
        icon: '⏪',
        cost: 2,
        isFree: false,
        category: 'velocidad',
        apply: (game) => {
            console.log('⏪ Velocidad de retorno aumentada');
        }
    },
    
    multiDispatch: {
        id: 'multi-dispatch',
        key: 'multiDispatch',
        name: 'Doble Despacho',
        description: 'HQ y FOBs pueden enviar 2 vehículos al mismo tiempo',
        icon: '🚀',
        cost: 1,
        isFree: false,
        category: 'velocidad',
        apply: (game) => {
            console.log('🚀 Despacho múltiple activado');
        }
    },
    
    // ===== CATEGORÍA: RECURSOS Y ECONOMÍA =====
    fastTransfer: {
        id: 'fast-transfer',
        key: 'fastTransfer',
        name: 'Transferencia Prioritaria',
        description: 'FOBs pueden almacenar +50 recursos (130 total)',
        icon: '🏭',
        cost: 2,
        isFree: false,
        category: 'recursos',
        apply: (game) => {
            game.bases.forEach(base => {
                if (base.type === 'fob') {
                    base.maxSupplies += 50;
                    console.log(`🏭 FOB: +50 capacidad máxima`);
                }
            });
        }
    },
    
    largerStorage: {
        id: 'larger-storage',
        key: 'largerStorage',
        name: 'Almacenes Ampliados',
        description: 'Todas las bases tienen +30% capacidad máxima',
        icon: '📦',
        cost: 2,
        isFree: false,
        category: 'recursos',
        apply: (game) => {
            game.bases.forEach(base => {
                base.maxSupplies = Math.floor(base.maxSupplies * 1.3);
                console.log(`📦 Capacidad de ${base.type} aumentada +30%`);
            });
        }
    },
    
    frontBuffer: {
        id: 'front-buffer',
        key: 'frontBuffer',
        name: 'Búnkers Reforzados',
        description: 'Los frentes tienen +30% capacidad máxima',
        icon: '🛢️',
        cost: 1,
        isFree: false,
        category: 'recursos',
        apply: (game) => {
            game.bases.forEach(base => {
                if (base.type === 'front') {
                    base.maxSupplies = Math.floor(base.maxSupplies * 1.3);
                    console.log('🛢️ Frente: +30% capacidad');
                }
            });
        }
    },
    
    startingSupplies: {
        id: 'starting-supplies',
        key: 'startingSupplies',
        name: 'Suministros Iniciales',
        description: 'Los frentes empiezan con recursos al máximo',
        icon: '💎',
        cost: 2,
        isFree: false,
        category: 'recursos',
        apply: (game) => {
            game.bases.forEach(base => {
                if (base.type === 'front') {
                    base.supplies = base.maxSupplies;
                    console.log('💎 Frente empieza con recursos completos');
                }
            });
        }
    },
    
    // ===== CATEGORÍA: HABILIDADES PASIVAS =====
    emergencyHeli: {
        id: 'emergency-heli',
        key: 'emergencyHeli',
        name: 'Helicóptero de Emergencia',
        description: 'Cada 15s, el HQ envía 20 recursos a cada FOB automáticamente',
        icon: '🚁',
        cost: 1,
        isFree: false,
        category: 'pasivas',
        apply: (game) => {
            console.log('🚁 Sistema de helicóptero de emergencia activado');
        }
    },
    
    autoSupply: {
        id: 'auto-supply',
        key: 'autoSupply',
        name: 'Logística Automática',
        description: 'FOBs envían automáticamente suministros a frentes críticos',
        icon: '🤖',
        cost: 3,
        isFree: false,
        category: 'pasivas',
        apply: (game) => {
            console.log('🤖 Sistema de logística automática activado');
        }
    },
    
    efficientRoutes: {
        id: 'efficient-routes',
        key: 'efficientRoutes',
        name: 'Rutas Eficientes',
        description: 'Los vehículos regresan instantáneamente a su base',
        icon: '🛡️',
        cost: 2,
        isFree: false,
        category: 'pasivas',
        apply: (game) => {
            console.log('🛡️ Rutas eficientes activadas');
        }
    },
    
    slowConsumption: {
        id: 'slow-consumption',
        key: 'slowConsumption',
        name: 'Racionamiento Eficiente',
        description: 'Los frentes consumen -20% de recursos',
        icon: '📉',
        cost: 2,
        isFree: false,
        category: 'pasivas',
        apply: (game) => {
            game.bases.forEach(base => {
                if (base.type === 'front') {
                    base.consumeRate *= 0.8;
                    console.log('📉 Consumo de frentes reducido -20%');
                }
            });
        }
    }
};

// ===== FUNCIONES HELPER =====

/**
 * Obtener todas las mejoras como array
 */
export function getAllUpgrades() {
    return Object.values(UPGRADES);
}

/**
 * Obtener mejora por ID
 */
export function getUpgradeById(id) {
    return Object.values(UPGRADES).find(u => u.id === id);
}

/**
 * Obtener mejora por key
 */
export function getUpgradeByKey(key) {
    return UPGRADES[key];
}

/**
 * Verificar si una mejora está desbloqueada
 */
export function isUpgradeUnlocked(progressData, upgradeKey) {
    return progressData.upgrades[upgradeKey] === true;
}

/**
 * Verificar si el jugador puede comprar una mejora
 */
export function canPurchaseUpgrade(progressData, upgrade) {
    // Si es gratis, requiere al menos 1 surrender
    if (upgrade.isFree) {
        return progressData.loopCount > 0 && !isUpgradeUnlocked(progressData, upgrade.key);
    }
    
    // Todas las demás mejoras están desbloqueadas por defecto (sin coste de medallas)
    return !isUpgradeUnlocked(progressData, upgrade.key);
}

/**
 * Obtener el estado de una mejora para UI
 */
export function getUpgradeStatus(progressData, upgrade) {
    const isUnlocked = isUpgradeUnlocked(progressData, upgrade.key);
    const canPurchase = canPurchaseUpgrade(progressData, upgrade);
    
    return {
        isUnlocked,
        canPurchase,
        insufficientFunds: false, // Ya no hay costes
        displayCost: upgrade.isFree ? 'Gratis' : 'Disponible'
    };
}

/**
 * Aplicar todas las mejoras desbloqueadas a las bases
 */
export function applyAllUpgrades(game) {
    const progressData = game.progressData;
    
    // Aplicar mejoras de vehículos
    if (isUpgradeUnlocked(progressData, 'hqVehicles')) {
        UPGRADES.hqVehicles.apply(game);
    }
    
    if (isUpgradeUnlocked(progressData, 'fobVehicles')) {
        UPGRADES.fobVehicles.apply(game);
    }
    
    // El helicóptero de emergencia se activa automáticamente en ConvoyManager
    // cuando detecta que el upgrade está desbloqueado (no necesita inicialización)
}

/**
 * Crear estructura por defecto de upgrades para progressData
 */
export function getDefaultUpgradesState() {
    const state = {};
    Object.keys(UPGRADES).forEach(key => {
        state[key] = false;
    });
    return state;
}

/**
 * Validar que progressData.upgrades tenga todas las propiedades
 */
export function validateUpgradesState(upgradesState) {
    const defaultState = getDefaultUpgradesState();
    let needsUpdate = false;
    
    // Añadir propiedades faltantes
    Object.keys(defaultState).forEach(key => {
        if (upgradesState[key] === undefined) {
            upgradesState[key] = false;
            needsUpdate = true;
        }
    });
    
    return needsUpdate;
}
