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
        intelRadio: 50, // Costo de inversión
        aerialBase: 150, // 🆕 Base Aérea para recarga de helicópteros
        //campaignHospital: 60,
        // fobSabotage: REMOVIDO - es un consumible, no un edificio. Solo debe estar en 'actions'
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
        campaignHospital: 2,
        intelRadio: 2, // Construcción rápida
        aerialBase: 3  // 🆕 Base Aérea - 3 segundos
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
        },
        intelRadio: {
            investmentTime: 20,   // Tiempo en segundos antes de pagar
            investmentReturn: 75 // Total a pagar (coste + beneficio)
        },
        aerialBase: {
            maxSupplies: 200,       // 🆕 Capacidad máxima de suministros
            autoDestroy: true       // 🆕 Se autodestruye cuando se agota
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
        fobSabotage: {
            cost: 40, // Sincronizado con src/config/nodes.js
            targetType: 'fob'
        },
        droneLaunch: {
            cost: 150,
            validTargets: ['fob', 'nuclearPlant', 'antiDrone', 'campaignHospital', 'droneLauncher', 'truckFactory', 'engineerCenter', 'intelRadio']
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
        helicopter: {
            baseCapacity: 100,      // Suministros totales que carga del HQ
            speed: 150,             // px/s - velocidad de vuelo
            deliveryAmount: 50      // Suministros por entrega a un Front
        },
        ambulance: {
            speed: 140 // px/s (más rápido que camiones)
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // RANGOS Y DETECCIÓN
    // ═══════════════════════════════════════════════════════════════
    ranges: {
        campaignHospital: 240 // px - rango de acción del hospital
    },
    
    // Radios para detección de colisiones (sincronizado con src/config/nodes.js)
    detectionRadius: {
        fob: 140,              // Valor original (sin +15%)
        antiDrone: 120,        // Valor original (sin +15%)
        droneLauncher: 120,    // Valor original (sin +15%)
        razorNet: 100,         // Valor original calculado
        truckFactory: 130,     // Valor original (sin +15%)
        engineerCenter: 130,   // Valor original (sin +15%)
        nuclearPlant: 140,     // Valor original (sin +15%)
        machineNest: 120,      // Valor original calculado
        campaignHospital: 130, // Valor original (sin +15%)
        intelRadio: 120,       // Valor original (sin +15%)
        aerialBase: 130        // 🆕 Base Aérea
    },
    
    // Radios base para fallback si no se define detectionRadius
    radius: {
        fob: 40,
        antiDrone: 30,
        droneLauncher: 30,
        razorNet: 25,
        truckFactory: 35,
        engineerCenter: 35,
        nuclearPlant: 40,
        machineNest: 30,
        campaignHospital: 35,
        intelRadio: 30,
        aerialBase: 40     // 🆕 Base Aérea (tamaño visual 40px)
    }
};

