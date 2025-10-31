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
        intelRadio: 70, // Costo de inversión
        aerialBase: 150, // 🆕 Base Aérea para recarga de helicópteros
        campaignHospital: 60,
        intelCenter: 150, // 🆕 Centro de Inteligencia - desbloquea comandos
        vigilanceTower: 120, // 🆕 Torre de Vigilancia - counterea comandos
        // 🆕 CONSUMIBLES/PROYECTILES
        drone: 150,
        sniperStrike: 40,
        fobSabotage: 40,
        specopsCommando: 200  // 🆕 NUEVO: Comando especial operativo
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
        aerialBase: 3, // 🆕 Base Aérea - 3 segundos
        intelCenter: 3,  // 🆕 Centro de Inteligencia - 3 segundos
        vigilanceTower: 3  // 🆕 Torre de Vigilancia - 3 segundos
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
        specopsCommando: {
            cost: 200,
            targetType: 'position', // Se despliega en una posición (no un nodo específico)
            detectionRadius: 200,  // Área de efecto que deshabilita edificios enemigos
            ignoreDetectionLimits: true // No afectado por límites de detección de otros edificios
        },
        droneLaunch: {
            cost: 150,
            validTargets: ['fob', 'nuclearPlant', 'antiDrone', 'campaignHospital', 'droneLauncher', 'truckFactory', 'engineerCenter', 'intelRadio', 'intelCenter', 'aerialBase']
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
    // ⚠️ DEPRECATED: Vehículos movidos a server/config/gameConfig.js (centralizado)
    // vehicles: {
    //     truck: { baseCapacity: 15, speed: 120 },
    //     heavy_truck: { baseCapacity: 15, speed: 100 },
    //     helicopter: { baseCapacity: 100, speed: 150, deliveryAmount: 50 },
    //     ambulance: { speed: 140 }
    // },

    // ═══════════════════════════════════════════════════════════════
    // RANGOS Y DETECCIÓN
    // ═══════════════════════════════════════════════════════════════
    ranges: {
        campaignHospital: 240 // px - rango de acción del hospital
    },
    
    // ═══════════════════════════════════════════════════════════════
    // RADIOS DE DETECCIÓN (SERVIDOR COMO AUTORIDAD - CRÍTICO PARA SEGURIDAD)
    // ═══════════════════════════════════════════════════════════════
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
        intelCenter: 130,      // 🆕 Centro de Inteligencia
        aerialBase: 130,        // 🆕 Base Aérea
        vigilanceTower: 280     // 🆕 Torre de Vigilancia (radio de protección - doble del original)
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
        intelCenter: 35,       // 🆕 Centro de Inteligencia (tamaño visual 35px)
        aerialBase: 40,     // 🆕 Base Aérea (tamaño visual 40px)
        vigilanceTower: 35     // 🆕 Torre de Vigilancia (tamaño visual 35px)
    },
    
    // 🆕 NUEVO: Configuración de nodos especiales que se despliegan como unidades
    specialNodes: {
        specopsCommando: {
            radius: 25,                    // Radio físico del comando
            detectionRadius: 200,           // Área de efecto que deshabilita edificios
            health: 50,                     // Vida del comando (puede ser destruido)
            sprite: 'specops_observer'      // Sprite del comando
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CAPACIDADES DINÁMICAS (SERVIDOR COMO AUTORIDAD)
    // ═══════════════════════════════════════════════════════════════
    capacities: {
        // Capacidades base de nodos
        hq: {
            maxVehicles: 4,
            maxAmbulances: 1,
            hasSupplies: false,
            hasVehicles: true,
            hasMedicalSystem: true
        },
        fob: {
            maxSupplies: 100,
            maxVehicles: 2,
            hasSupplies: true,
            hasVehicles: true
        },
        front: {
            maxSupplies: 100,
            maxHelicopters: 1,
            hasSupplies: true,
            hasVehicles: false,
            hasHelicopters: false
        },
        aerialBase: {
            maxSupplies: 200,
            hasSupplies: true,
            hasVehicles: false
        },
        
        // Capacidades de edificios construibles
        antiDrone: {
            hasSupplies: false,
            hasVehicles: false
        },
        droneLauncher: {
            hasSupplies: false,
            hasVehicles: false
        },
        razorNet: {
            hasSupplies: false,
            hasVehicles: false
        },
        truckFactory: {
            hasSupplies: false,
            hasVehicles: false
        },
        engineerCenter: {
            hasSupplies: false,
            hasVehicles: false
        },
        nuclearPlant: {
            hasSupplies: false,
            hasVehicles: false
        },
        machineNest: {
            hasSupplies: false,
            hasVehicles: false
        },
        campaignHospital: {
            maxVehicles: 1,
            hasSupplies: false,
            hasVehicles: true
        },
        intelRadio: {
            hasSupplies: false,
            hasVehicles: false
        },
        intelCenter: {
            hasSupplies: false,
            hasVehicles: false
        },
        aerialBase: {
            hasSupplies: true,
            hasVehicles: false
        },
        vigilanceTower: {
            hasSupplies: false,
            hasVehicles: false
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // BONUSES DE EDIFICIOS (SERVIDOR COMO AUTORIDAD)
    // ═══════════════════════════════════════════════════════════════
    bonuses: {
        truckFactory: {
            hqVehicleBonus: 1,           // +1 vehículo al HQ por cada fábrica
            heavyTruckCapacityBonus: 15,  // +15 capacidad a camiones pesados
            effect: 'increaseHQVehicles'  // Tipo de efecto
        },
        engineerCenter: {
            heavyTruckSpeedMultiplier: 1.5 // +50% velocidad a camiones pesados
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // PROPIEDADES DE SEGURIDAD (SERVIDOR COMO AUTORIDAD - ANTI-HACK)
    // ═══════════════════════════════════════════════════════════════
    security: {
        // Propiedades que afectan hitboxes y colisiones
        hitboxRadius: {
            hq: 60,              // +20% hitbox (50 * 1.2)
            fob: 48,             // +20% hitbox (40 * 1.2)
            front: 42,           // +20% hitbox (35 * 1.2)
            antiDrone: 36,       // +20% hitbox (30 * 1.2)
            droneLauncher: 36,   // +20% hitbox (30 * 1.2)
            razorNet: 30,        // +20% hitbox (25 * 1.2)
            truckFactory: 42,    // +20% hitbox (35 * 1.2)
            engineerCenter: 42,  // +20% hitbox (35 * 1.2)
            nuclearPlant: 48,    // +20% hitbox (40 * 1.2)
            machineNest: 36,     // +20% hitbox (30 * 1.2)
            campaignHospital: 42, // +20% hitbox (35 * 1.2)
            intelRadio: 36,      // +20% hitbox (30 * 1.2)
            intelCenter: 42,     // 🆕 +20% hitbox (35 * 1.2)
            aerialBase: 48,       // +20% hitbox (40 * 1.2)
            vigilanceTower: 42    // 🆕 +20% hitbox (35 * 1.2)
    },
        
        // Propiedades de construcción
        needsConstruction: {
            hq: false,
            front: false,
            fob: true,
            antiDrone: true,
            droneLauncher: true,
            razorNet: true,
            truckFactory: true,
            engineerCenter: true,
            nuclearPlant: true,
            machineNest: true,
            campaignHospital: true,
            intelRadio: true,
            intelCenter: true,    // 🆕 Centro de Inteligencia
            aerialBase: true,
            vigilanceTower: true  // 🆕 Torre de Vigilancia
        },
        
        // Propiedades de destrucción
        canBeDestroyed: {
            hq: false,
            fob: true,
            front: true,
            antiDrone: true,
            droneLauncher: true,
            razorNet: true,
            truckFactory: true,
            engineerCenter: true,
            nuclearPlant: true,
            machineNest: true,
            campaignHospital: true,
            intelRadio: true,
            intelCenter: true,    // 🆕 Centro de Inteligencia
            aerialBase: true,
            vigilanceTower: true  // 🆕 Torre de Vigilancia
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // PROPIEDADES DE GAMEPLAY (SERVIDOR COMO AUTORIDAD)
    // ═══════════════════════════════════════════════════════════════
    gameplay: {
        // Propiedades de frentes
        front: {
            consumeRate: 1.6 // Consumo de suministros por segundo
        },
        
        // Propiedades de anti-drones
        antiDrone: {
            detectionRange: 160,
            alertRange: 220,
            cooldownTime: 3000
        },
        
        // Propiedades de hospitales
        campaignHospital: {
            actionRange: 260
        },
        
        // Propiedades de plantas nucleares
        nuclearPlant: {
            passiveIncomeBonus: 2
        },
        
        // Propiedades de radio inteligencia
        intelRadio: {
            investmentTime: 12,
            investmentReturn: 100
        },
        
        // Propiedades de sniper
        sniperStrike: {
            effectDuration: 15,
            spottedSoundCooldown: 7
        },
        
        // Propiedades de sabotaje
        fobSabotage: {
            speedPenalty: 0.5,
            truckCount: 3
        },
        
        // Propiedades de comando especial operativo
        specopsCommando: {
            detectionRadius: 200,  // Área de efecto en píxeles
            disableDuration: -1    // -1 = permanente hasta que el comando sea destruido
        },
        
        // Propiedades de UI/comportamiento críticas
        enabled: {
            hq: true,
            fob: true,
            front: true,
            antiDrone: true,
            droneLauncher: true,
            razorNet: false,
            truckFactory: true,
            engineerCenter: true,
            nuclearPlant: true,
            machineNest: false,
            campaignHospital: false,
            intelRadio: true,
            intelCenter: true,    // 🆕 Centro de Inteligencia - desbloquea comandos
            aerialBase: true,
            vigilanceTower: true  // 🆕 Torre de Vigilancia - counterea comandos
        },
        
        // Propiedades de comportamiento
        behavior: {
            antiDrone: {
                isConsumable: true,
                showRangePreview: true
            },
            campaignHospital: {
                canDispatchMedical: true,
                showRangePreview: true
            },
            sniperStrike: {
                targetType: 'front',
                cursorSprite: 'sniper'
            },
            fobSabotage: {
                targetType: 'fob',
                cursorSprite: 'specops_selector',
                effectIcon: 'ui-no-supplies'
            },
            specopsCommando: {
                targetType: 'position',
                cursorSprite: 'specops_observer',
                canPlaceInEnemyTerritory: true,
                ignoreDetectionLimits: true,
                showRangePreview: true
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // DESCRIPCIONES DE EDIFICIOS (SERVIDOR COMO AUTORIDAD)
    // ═══════════════════════════════════════════════════════════════
    descriptions: {
        fob: {
            name: 'FOB (Base Avanzada)',
            description: 'Base de operaciones avanzada. Genera y envía convoyes al frente.'
        },
        antiDrone: {
            name: 'Anti-Dron',
            description: 'Defensa contra drones enemigos. Tiene un solo proyectil.'
        },
        droneLauncher: {
            name: 'Lanzador de Drones',
            description: 'Lanza drones bomba hacia objetivos enemigos.'
        },
        razorNet: {
            name: 'Red de Alambre',
            description: 'Defensa contra unidades terrestres enemigas.'
        },
        truckFactory: {
            name: 'Fábrica de Camiones',
            description: 'Aumenta la capacidad de vehículos del HQ y mejora los camiones pesados.'
        },
        engineerCenter: {
            name: 'Centro de Ingenieros',
            description: 'Mejora la velocidad de todos los convoyes.'
        },
        nuclearPlant: {
            name: 'Planta Nuclear',
            description: 'Genera energía adicional (+2$/s de ingresos pasivos).'
        },
        machineNest: {
            name: 'Nido de Ametralladoras',
            description: 'Defensa pesada contra unidades terrestres.'
        },
        campaignHospital: {
            name: 'Hospital de Campaña',
            description: 'Proporciona atención médica a unidades heridas en el área.'
        },
        intelRadio: {
            name: 'Radio Inteligencia',
            description: 'Inversión temporal. Después de 12 segundos devuelve el coste (50$) más 50$ de beneficio.'
        },
        intelCenter: {
            name: 'Centro de Inteligencia',
            description: 'Centro de operaciones especiales. Desbloquea la capacidad de desplegar comandos especiales operativos.'
        },
        aerialBase: {
            name: 'Base Aérea',
            description: 'Base especializada para recarga de helicópteros. Almacena suministros para transporte aéreo.'
        },
        vigilanceTower: {
            name: 'Torre de Vigilancia',
            description: 'Torre defensiva que detecta y elimina comandos enemigos en su área. Previene el despliegue de comandos enemigos cerca.'
        },
        drone: {
            name: 'Dron Bomba',
            description: 'Destruye un objetivo enemigo. Puede ser interceptado por Anti-Drones. Requiere tener una lanzadera en el campo.'
        },
        sniperStrike: {
            name: 'Disparo de Francotirador',
            description: 'Ataque preciso que hiere temporalmente a unidades enemigas.'
        },
        fobSabotage: {
            name: 'Sabotaje de FOB',
            description: 'Operación especial que ralentiza temporalmente las operaciones enemigas.'
        },
        specopsCommando: {
            name: 'Comando Especial Operativo',
            description: 'Unidad especial que se despliega en territorio enemigo. Deshabilita todos los edificios enemigos dentro de su área de operaciones.'
        }
    }
};

