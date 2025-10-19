// ===== CONFIGURACIÓN DE NODOS DEL SERVIDOR =====
// Contiene SOLO valores numéricos y stats para balanceo de juego
// NO incluye información visual (sprites, colores) - eso está en src/config/nodes.js

export const SERVER_NODE_CONFIG = {
    // ═══════════════════════════════════════════════════════════════
    // COSTOS DE EDIFICIOS
    // ═══════════════════════════════════════════════════════════════
    costs: {
        fob: 120,
        antiDrone: 115,
        droneLauncher: 100,
        nuclearPlant: 200,
        truckFactory: 100,
        engineerCenter: 120,
        campaignHospital: 60
    },

    // ═══════════════════════════════════════════════════════════════
    // TIEMPOS DE CONSTRUCCIÓN (segundos)
    // ═══════════════════════════════════════════════════════════════
    buildTimes: {
        fob: 4,
        antiDrone: 4.5,
        droneLauncher: 2,
        nuclearPlant: 4,
        truckFactory: 2,
        engineerCenter: 4,
        campaignHospital: 2
    },

    // ═══════════════════════════════════════════════════════════════
    // EFECTOS DE EDIFICIOS
    // ═══════════════════════════════════════════════════════════════
    effects: {
        nuclearPlant: {
            incomeBonus: 2 // +2$/s por planta
        },
        truckFactory: {
            vehicleBonus: 1,      // +1 vehículo al HQ
            capacityBonus: 15     // +15 capacidad para heavy_trucks
        },
        engineerCenter: {
            speedBonus: 0.5 // +50% velocidad de convoyes
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // COSTOS DE ACCIONES
    // ═══════════════════════════════════════════════════════════════
    actions: {
        sniperStrike: {
            cost: 40,
            targetType: 'front'
        },
        droneLaunch: {
            cost: 150,
            validTargets: ['fob', 'nuclearPlant', 'antiDrone', 'campaignHospital', 'droneLauncher', 'truckFactory', 'engineerCenter']
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // EFECTOS TEMPORALES
    // ═══════════════════════════════════════════════════════════════
    temporaryEffects: {
        wounded: {
            duration: 15,           // 15 segundos
            consumeMultiplier: 2,   // Duplica consumo
            icon: 'ui-wounded',
            tooltip: 'Herido: Consume el doble'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // VEHÍCULOS
    // ═══════════════════════════════════════════════════════════════
    vehicles: {
        truck: {
            baseCapacity: 15,
            speed: 120 // px/s
        },
        heavy_truck: {
            baseCapacity: 15,  // Base, se le suma el bonus de truckFactory
            speed: 100 // px/s
        },
        ambulance: {
            speed: 140 // px/s (más rápido que camiones)
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // RANGOS
    // ═══════════════════════════════════════════════════════════════
    ranges: {
        campaignHospital: 240 // px - rango de acción del hospital
    }
};

