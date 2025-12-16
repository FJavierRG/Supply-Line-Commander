// ===== CONFIGURACIÓN DE NODOS DEL SERVIDOR =====
// Contiene SOLO valores numéricos y stats para balanceo de juego
// NO incluye información visual (sprites, colores) - eso está en src/config/nodes.js

import { NODE_DESCRIPTIONS } from './nodeDescriptions.js';

export const SERVER_NODE_CONFIG = {
    // ═══════════════════════════════════════════════════════════════
    // COSTES DE EDIFICIOS
    // ═══════════════════════════════════════════════════════════════
    costs: {
        fob: 140,
        antiDrone: 135,
        droneLauncher: 150,
        nuclearPlant: 125,
        truckFactory: 80,
        engineerCenter: 80,
        factory: 80,
        intelRadio: 75, 
        aerialBase: 170, 
        campaignHospital: 50,
        intelCenter: 150, 
        vigilanceTower: 140, 
        trainStation: 150,
        droneWorkshop: 125,
        vehicleWorkshop: 90,
        armoredFactory: 150,
        physicStudies: 80,
        secretLaboratory: 90,
        trainingCamp: 80,
        deadlyBuild: 140,
        servers: 45,
        // 🆕 CONSUMIBLES/PROYECTILES
        drone: 170,
        sniperStrike: 70,
        fobSabotage: 90,
        specopsCommando: 90,  
        tank: 120,
        lightVehicle: 90, 
        truckAssault: 90,
        cameraDrone: 60,
        artillery: 120,
        worldDestroyer: 300
    },

    // ═══════════════════════════════════════════════════════════════
    // TIEMPOS DE CONSTRUCCIÓN (segundos)
    // ═══════════════════════════════════════════════════════════════
    buildTimes: {
        fob: 5,
        antiDrone: 2.1,
        droneLauncher: 5,
        nuclearPlant: 6,
        truckFactory: 4,
        engineerCenter: 4,
        factory: 5,
        campaignHospital: 3,
        intelRadio: 4, 
        aerialBase: 4, 
        intelCenter: 4, 
        vigilanceTower: 4, 
        trainStation: 7,
        droneWorkshop: 5,
        vehicleWorkshop: 5,
        armoredFactory: 5,
        physicStudies: 5,
        secretLaboratory: 5,
        trainingCamp: 6,
        deadlyBuild: 7,
        servers: 3
    },

    // ═══════════════════════════════════════════════════════════════
    // EFECTOS DE EDIFICIOS
    // ═══════════════════════════════════════════════════════════════
    effects: {
        nuclearPlant: {
            incomeBonus: 1, // +1$/s por planta
            factorySpeedBonus: 1 // 🆕 -1 segundo en intervalo de producción de fábricas en rango
        },
        truckFactory: {
            vehicleBonus: 1,      // +1 vehículo al HQ
            capacityBonus: 5     // +5 capacidad para heavy_trucks
        },
        engineerCenter: {
            speedMultiplier: 1.5,        // +50% velocidad para heavy_truck
            affectedVehicles: ['heavy_truck']
        },
        trainStation: {
            trainInterval: 15,      // Segundos BASE entre envíos de tren
            trainSpeed: 60,         // Velocidad del tren (píxeles por segundo)
            trainCargo: 35,         // Suministros que entrega cada tren
            // Escalado de intervalo por número de FOBs
            fobThreshold: 2,        // FOBs sin penalización de intervalo
            intervalPenaltyPerFOB: 4 // +4s por cada FOB después del threshold
        },
        droneLauncher: {
            maxUses: 3                   // 🆕 Número máximo de usos antes de entrar en abandono
        },
        droneWorkshop: {
            discountMultiplier: 0.7,     // Descuento del 30% (70% del costo base)
            requiredSupplies: 15,        // Suministros mínimos requeridos en FOB
            suppliesCost: 15,            // Suministros que se sustraen del FOB al aplicar el descuento
            discountedDroneTypes: ['drone', 'cameraDrone'] // Tipos de dron afectados
        },
        vehicleWorkshop: {
            vehicleBonus: 1,             // 🆕 +1 vehículo máximo y disponible a FOBs en su área
            speedBonus: 20,               // 🆕 +20 px/s de velocidad para camiones ligeros (truck) del FOB
            affectedVehicles: ['truck'],  // 🆕 Vehículos afectados por el bonus de velocidad
            enhancedSprite: 'truck_2'     // 🆕 Sprite mejorado para camiones con bonus
        },
        factory: {
            supplyGeneration: {
                amount: 6,              // Suministros generados por cada ciclo
                interval: 5,            // Intervalo en segundos entre envíos
                speed: 120              // Velocidad de movimiento en píxeles por segundo
            }
        },
        physicStudies: {
            nuclearPlantBonus: 1         // 🆕 +1 currency/segundo a todas las plantas nucleares si hay al menos una universidad
        },
        secretLaboratory: {
            nuclearPlantBonus: 1         // 🆕 +1 currency/segundo a todas las plantas nucleares si hay al menos un laboratorio secreto (acumulable con Estudios de Física)
        },
        trainingCamp: {
            appliesTrainedEffect: true   // 🆕 Aplica efecto "trained" a los frentes del jugador
        },
        deadlyBuild: {
            // Sin efectos directos - desbloquea consumible "Destructor de mundos"
        },
        servers: {
            incomeBonus: 0.5         // 🆕 +0.5 currency/segundo pasivo
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURACIÓN DE ACCIONES
    // ═══════════════════════════════════════════════════════════════
    // ✅ NOTA: Los costos están en costs.* (fuente única de verdad)
    // - costs.sniperStrike, costs.fobSabotage, costs.drone, costs.tank, costs.specopsCommando
        actions: {
        sniperStrike: {
            targetType: ['front', 'specopsCommando', 'truckAssault', 'cameraDrone']
        },
        fobSabotage: {
            targetType: 'fob'
        },
        specopsCommando: {
            targetType: 'position', // Se despliega en una posición (no un nodo específico)
            ignoreDetectionLimits: true // No afectado por límites de detección de otros edificios
        },
        truckAssault: {
            targetType: 'position', // Se despliega en una posición (no un nodo específico)
            ignoreDetectionLimits: true // No afectado por límites de detección de otros edificios
        },
        droneLaunch: {
            validTargets: ['fob', 'nuclearPlant', 'antiDrone', 'campaignHospital', 'droneLauncher', 'truckFactory', 'factory', 'engineerCenter', 'intelRadio', 'intelCenter', 'aerialBase', 'trainStation','vigilanceTower','vehicleWorkshop', 'droneWorkshop', 'physicStudies', 'secretLaboratory', 'trainingCamp', 'deadlyBuild', 'servers']
        },
        tankLaunch: {
            validTargets: ['nuclearPlant', 'antiDrone', 'campaignHospital', 'droneLauncher', 'truckFactory', 'factory', 'engineerCenter', 'intelRadio', 'intelCenter', 'aerialBase', 'vigilanceTower', 'trainStation', 'vehicleWorkshop', 'droneWorkshop', 'physicStudies', 'secretLaboratory', 'trainingCamp', 'deadlyBuild', 'servers']
        },
        lightVehicleLaunch: { // 🆕 NUEVO: Artillado ligero (aplica broken en vez de destruir)
            validTargets: ['nuclearPlant', 'antiDrone', 'campaignHospital', 'droneLauncher', 'truckFactory', 'factory', 'engineerCenter', 'intelRadio', 'intelCenter', 'aerialBase', 'vigilanceTower', 'trainStation', 'vehicleWorkshop', 'droneWorkshop', 'physicStudies', 'secretLaboratory', 'trainingCamp', 'deadlyBuild', 'servers']
        },
        artilleryLaunch: { // 🆕 NUEVO: Artillería (efecto de área que rompe edificios)
            targetType: 'area' // Se selecciona un área en vez de un edificio específico
            // ✅ areaRadius está en gameplay.artillery.areaRadius (fuente única de verdad)
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // EFECTOS TEMPORALES
    // Bufos y debufos
    // ═══════════════════════════════════════════════════════════════
    temporaryEffects: {
        wounded: {
            duration: 15,           // 15 segundos
            consumeMultiplier: 2,   // Duplica consumo
            icon: 'ui-wounded',
            tooltip: 'Herido: Consume el doble'
        },
        trained: {
            duration: null,         // null = permanente (no expira)
            currencyBonus: 1,       // +1 currency adicional por avance
            icon: 'ui-vigor-up',
            tooltip: 'Entrenado: +1 currency por avance'
        }
    },


    // ═══════════════════════════════════════════════════════════════
    // RANGOS Y DETECCIÓN
    // ═══════════════════════════════════════════════════════════════
    ranges: {
        campaignHospital: 240, // px - rango de acción del hospital
        nuclearPlant: 200 // 🆕 px - rango de efecto sobre fábricas
    },
    
    // ═══════════════════════════════════════════════════════════════
    // RADIOS DE CONSTRUCCIÓN (proximidad para evitar stacking)
    // ═══════════════════════════════════════════════════════════════
    // Radio usado para validar proximidad al construir (evitar stacking de edificios)
    buildRadius: {
        fob: 140,              
        antiDrone: 120,        
        droneLauncher: 120,    
        razorNet: 100,       
        truckFactory: 130,   
        engineerCenter: 130,   
        nuclearPlant: 140,    
        machineNest: 120,     
        campaignHospital: 130,
        intelRadio: 120,      
        intelCenter: 130,     
        aerialBase: 130,       
        vigilanceTower: 130,   
        trainStation: 130,
        droneWorkshop: 130,
        vehicleWorkshop: 130,
        armoredFactory: 130,
        physicStudies: 130,
        secretLaboratory: 130,
        trainingCamp: 130,
        deadlyBuild: 140,
        servers: 120
    },
    
    // ═══════════════════════════════════════════════════════════════
    // RADIOS DE DETECCIÓN (Solo para edificios que realmente detectan algo)
    // ═══════════════════════════════════════════════════════════════
    // ✅ Solo para edificios con capacidad de detección real (no para prevenir stacking)
    detectionRadius: {
        vigilanceTower: 320   // Área de protección contra comandos enemigos
    },
    
    // ═══════════════════════════════════════════════════════════════
    // TAMAÑO VISUAL / HITBOX (radio del sprite)
    // ═══════════════════════════════════════════════════════════════
    // Radio base del sprite del edificio (tamaño visual y hitbox para colisiones físicas)
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
        intelCenter: 35,      
        aerialBase: 40,    
        vigilanceTower: 35,   
        trainStation: 40,
        droneWorkshop: 35,
        vehicleWorkshop: 35,
        armoredFactory: 35,
        physicStudies: 35,
        secretLaboratory: 35,
        trainingCamp: 35,
        deadlyBuild: 40,
        servers: 30
    },
    
    // 🆕 NUEVO: Configuración de nodos especiales que se despliegan como unidades
    specialNodes: {
        specopsCommando: {
            radius: 25,                    // Radio físico del comando
            detectionRadius: 200,           // Área de efecto que deshabilita edificios
            health: 50,                     // Vida del comando (puede ser destruido)
            sprite: 'specops_observer'      // Sprite del comando
        },
        truckAssault: {
            radius: 25,                    // Radio físico del truck assault
            detectionRadius: 200,           // Área de efecto que ralentiza vehículos (25% de reducción)
            health: 50,                     // Vida del truck assault (puede ser destruido)
            sprite: 'truckassault'          // Sprite del truck assault
        },
        cameraDrone: {
            radius: 25,                    // Radio físico del camera drone
            detectionRadius: 120,           // Área de detección de vehículos ligeros
            buildRadius: 300,               // Radio para permitir construcción en territorio enemigo
            health: 50,                     // Vida del camera drone (puede ser destruido por sniper)
            currencyReward: 10,             // Currency otorgado por cada camión ligero detectado
            duration: 20,                   // 🆕 NUEVO: Duración en segundos antes de expirar (tras desplegarse)
            sprite: 'camera-drone'          // Sprite del camera drone
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // TIPOS DE VEHÍCULOS (SERVIDOR COMO AUTORIDAD)
    // ═══════════════════════════════════════════════════════════════
    // Definición centralizada de tipos de vehículos disponibles
    vehicleTypes: {
        ammo: {
            id: 'ammo',
            name: 'Suministros',
            icon: 'ui-vehicle-icon',
            enabled: true,
            // Se usa el sistema tradicional de availableVehicles/maxVehicles
            usesStandardSystem: true
        },
        medical: {
            id: 'medical',
            name: 'Médico',
            icon: 'ui-medic-vehicle-icon',
            enabled: true,
            // Usa availableAmbulances/maxAmbulances
            usesStandardSystem: false,
            availabilityProperty: 'ambulanceAvailable',
            maxProperty: 'maxAmbulances',
            availableProperty: 'availableAmbulances'
        },
        helicopter: {
            id: 'helicopter',
            name: 'Aéreo',
            icon: 'ui-chopper-icon',
            enabled: true,
            // Usa landedHelicopters/maxHelicopters
            usesStandardSystem: false,
            availabilityProperty: 'landedHelicopters',
            maxProperty: 'maxHelicopters',
            availableProperty: 'availableHelicopters'
        },
        repair: {
            id: 'repair',
            name: 'Mecánico',
            icon: 'ui-repair-vehicle-icon',
            enabled: true,
            // Usa availableRepairVehicles/maxRepairVehicles
            usesStandardSystem: false,
            availabilityProperty: 'repairVehicleAvailable',
            maxProperty: 'maxRepairVehicles',
            availableProperty: 'availableRepairVehicles'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // SISTEMAS DE VEHÍCULOS POR TIPO DE NODO (SERVIDOR COMO AUTORIDAD)
    // ═══════════════════════════════════════════════════════════════
    // Define qué tipos de vehículos están disponibles para cada nodo
    vehicleSystems: {
        hq: {
            enabledTypes: ['ammo', 'medical', 'repair'], // Tipos de vehículos disponibles en el HQ
            defaultType: 'ammo' // Tipo seleccionado por defecto
        },
        fob: {
            enabledTypes: ['ammo'], // Solo camiones en FOBs
            defaultType: 'ammo'
        },
        front: {
            enabledTypes: ['helicopter'], // Solo helicópteros en frentes (si tienen)
            defaultType: 'helicopter'
        },
        aerialBase: {
            enabledTypes: ['helicopter'],
            defaultType: 'helicopter'
        },
        campaignHospital: {
            enabledTypes: ['medical'], // Solo ambulancias
            defaultType: 'medical'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CAPACIDADES DE EDIFICIOS (SERVIDOR COMO AUTORIDAD)
    // ═══════════════════════════════════════════════════════════════
    // Los valores por defecto son: hasSupplies=false, hasVehicles=false, hasHelicopters=false
    capacities: {
        // Capacidades base de nodos
        hq: {
            // 🆕 REWORK: maxSupplies está en GAME_CONFIG.initialNodes.hq.maxSupplies (fuente única de verdad)
            hasSupplies: true,          // 🆕 REWORK: HQ ahora tiene suministros
            maxVehicles: 4,
            maxAmbulances: 1,
            maxRepairVehicles: 1, // 🆕 NUEVO: Camión mecánico
            hasVehicles: true,
            hasMedicalSystem: true,
            hasRepairSystem: true // 🆕 NUEVO: Sistema de reparación
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
            hasHelicopters: true  // ✅ Agregado para soporte de helicópteros en frentes
        },
        aerialBase: {
            maxSupplies: 200,
            hasSupplies: true
        },
        campaignHospital: {
            maxVehicles: 1,
            hasVehicles: true
        }
    },
    

    // ═══════════════════════════════════════════════════════════════
    // PROPIEDADES DE SEGURIDAD (SERVIDOR COMO AUTORIDAD - ANTI-HACK)
    // ═══════════════════════════════════════════════════════════════
    // Propiedades críticas enviadas al cliente para prevenir manipulación
    security: {
        // Propiedades de construcción (solo excepciones - valor por defecto: true)
        needsConstruction: {
            hq: false,      // HQ ya está construido al inicio
            front: false    // Front ya está construido al inicio
        },
        
        // Propiedades de destrucción (solo excepciones - valor por defecto: true)
        canBeDestroyed: {
            hq: false    // HQ no puede ser destruido
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // PROPIEDADES DE GAMEPLAY (SERVIDOR COMO AUTORIDAD)
    // ═══════════════════════════════════════════════════════════════
    gameplay: {
        // Propiedades de frentes
        front: {
            consumeRate: 1.6, // Consumo de suministros por segundo
            
            // 🆕 SISTEMA DE MODOS DE COMPORTAMIENTO DE FRENTES
            modes: {
                // Modo Avanzar: Comportamiento por defecto
                advance: {
                    id: 'advance',
                    name: 'Avanzar',
                    icon: 'ui-mode-advance',
                    consumeMultiplier: 1.0,    // Consumo normal (100%)
                    currencyMultiplier: 1.0,   // Ganancia normal (100%)
                    canAdvance: true,          // Puede avanzar
                    canRetreat: false,         // No retrocede voluntariamente
                    isAnchor: false            // No es ancla (puede ser empujado)
                },
                // Modo Retroceder: Retroceso voluntario
                retreat: {
                    id: 'retreat',
                    name: 'Retroceder',
                    icon: 'ui-mode-retreat',
                    consumeMultiplier: 0.75,    // Consumo normal (100%)
                    currencyMultiplier: 0.75,  // 75% de ganancia por pixel retrocedido
                    canAdvance: false,         // No avanza
                    canRetreat: true,          // Retrocede voluntariamente
                    isAnchor: false            // No es ancla
                },
                // Modo Mantener: Ancla defensiva
                hold: {
                    id: 'hold',
                    name: 'Mantener',
                    icon: 'ui-mode-hold',
                    consumeMultiplier: 0.60,   // 75% de consumo
                    currencyMultiplier: 0,     // No gana currency (no se mueve)
                    canAdvance: false,         // No avanza
                    canRetreat: false,         // No retrocede voluntariamente
                    isAnchor: true             // ES ancla (no puede ser empujado, EXCEPTO con supplies=0)
                },
                // Configuración general de modos
                defaultMode: 'advance',        // Modo por defecto al inicio
                cooldownDuration: 5           // Segundos de cooldown al cambiar de modo
            }
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
            investmentTime: 20,      // Tiempo en segundos antes de pagar
            investmentBonus: 30       // Beneficio adicional (se suma al costo del edificio)
        },
        
        // Propiedades de sniper
        sniperStrike: {
            effectDuration: 15,
            spottedSoundCooldown: 7
        },
        
        // Propiedades de sabotaje
        fobSabotage: {
            speedPenalty: 0.40,
            truckCount: 2
        },
        
        // Propiedades de comando especial operativo
        specopsCommando: {
            // ✅ detectionRadius está en specialNodes.specopsCommando.detectionRadius (fuente única de verdad)
            duration: 15,           // Duración en segundos antes de que el comando expire (10s)
            residualDisabledDuration: 3  // 🆕 NUEVO: Duración en segundos que los edificios permanecen disabled después de eliminar el comando (3s)
        },
        
        // Propiedades de truck assault
        truckAssault: {
            // ✅ detectionRadius está en specialNodes.truckAssault.detectionRadius (fuente única de verdad)
            duration: 25,          // Duración en segundos antes de que el truck assault expire (25s)
            speedPenalty: 0.75     // Multiplicador de velocidad (0.75 = 25% de ralentización)
        },
        
        // Propiedades del Destructor de mundos
        worldDestroyer: {
            countdownDuration: 7,  // Segundos antes de activarse (7s)
            whiteScreenDuration: 2, // Duración del pantallazo blanco (2s)
            fadeOutDuration: 2      // Duración del desvanecimiento (2s)
        },
        
        // Propiedades de artillería
        artillery: {
            countdownDuration: 3,  // Segundos antes de aplicar efecto (3s)
            areaRadius: 150         // Radio del área de efecto en píxeles (fuente única de verdad)
        },
        
        // Activar / Desactivar nodos por completo, usar para dev y testing
        enabled: {
            hq: true,
            fob: true,
            front: true,
            antiDrone: true,
            droneLauncher: true,
            razorNet: false,
            truckFactory: true,
            engineerCenter: true,
            factory: true,
            nuclearPlant: true,
            machineNest: false,
            campaignHospital: false,
            intelRadio: true,
            intelCenter: true,   
            aerialBase: false,
            vigilanceTower: false,  
            trainStation: true,
            droneWorkshop: true,
            vehicleWorkshop: true,
            physicStudies: false,
            secretLaboratory: true,
            trainingCamp: true,
            deadlyBuild: true,
            servers: true,
            armoredFactory: true, // ✅ Fábrica de Vehículos Artillados
            // 🆕 CONSUMIBLES/PROYECTILES
            drone: true,
            sniperStrike: true,
            fobSabotage: true,
            specopsCommando: true,
            tank: true,
            lightVehicle: true, // 🆕 NUEVO: Artillado ligero
            truckAssault: true,
            cameraDrone: true,
            artillery: true, // 🆕 NUEVO: Artillería
            worldDestroyer: true
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
                targetType: ['front', 'specopsCommando'], 
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
            },
            truckAssault: {
                targetType: 'position',
                cursorSprite: 'truckassault',
                canPlaceInEnemyTerritory: true,
                ignoreDetectionLimits: true,
                showRangePreview: true
            },
            cameraDrone: {
                targetType: 'position',
                cursorSprite: 'camera-drone',
                canPlaceInEnemyTerritory: true,
                ignoreDetectionLimits: true,
                showRangePreview: true
            },
            artillery: {
                targetType: 'area',
                cursorSprite: 'vehicle-artillery',
                showRangePreview: true
                // ✅ areaRadius está en gameplay.artillery.areaRadius (fuente única de verdad)
            },
            nuclearPlant: {
                showRangePreview: true // 🆕 Muestra rango de efecto sobre fábricas
            },
            drone: {
                targetType: ['building'], // Requiere un edificio enemigo como objetivo
                cursorSprite: 'vehicle-drone'
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURACIÓN DE VUELO DE DRONES
    // ═══════════════════════════════════════════════════════════════
    // Parámetros de vuelo para todos los tipos de drones (velocidad, etc.)
    // Centralizado para evitar hardcodeo en múltiples sistemas
    droneFlightConfig: {
        default: {
            speed: 300  // Velocidad por defecto (px/s)
        },
        drone: {
            speed: 300  // Velocidad del dron bomba (px/s)
        },
        cameraDrone: {
            speed: 300  // Velocidad del camera drone (px/s) - igual que bomba
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // LÍMITES DE CONSTRUCCIÓN
    // ═══════════════════════════════════════════════════════════════
    // Límites por equipo (cada bando puede tener hasta X de este edificio)
    buildLimits: {
        nuclearPlant: {
            maxPerGame: 1  // Cada bando solo puede tener 1 central nuclear construida
        },
        trainStation: {
            maxPerGame: 1  // Cada bando solo puede tener 1 estación de trenes
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // REQUISITOS DE CONSTRUCCIÓN Y ACCIONES
    // ═══════════════════════════════════════════════════════════════
    // Mapa genérico de requisitos:
    // - Clave: ID de edificio o consumible/acción
    // - Valor: { required: ['otroEdificio', ...] }
    // Se usa tanto para construcción (BuildHandler) como para consumibles (AI, CombatHandler)
    buildRequirements: {
        // Construcción Prohibida requiere nuclearPlant + secretLaboratory
        deadlyBuild: {
            required: ['nuclearPlant', 'secretLaboratory'] // Requiere tener al menos uno de cada tipo en mesa
        },
        
        // Consumibles que dependen de edificios específicos
        // Dron bomba y camera drone requieren Lanzadera de Drones
        drone: {
            required: ['droneLauncher']
        },
        cameraDrone: {
            required: ['droneLauncher']
        },
        
        // Operaciones especiales que requieren Centro de Inteligencia
        specopsCommando: {
            required: ['intelCenter']
        },
        truckAssault: {
            required: ['intelCenter']
        },
        // 🆕 NUEVO: Sniper y sabotaje de FOBs también requieren Centro de Inteligencia
        sniperStrike: {
            required: ['intelCenter']
        },
        fobSabotage: {
            required: ['intelCenter']
        },
        
        // 🆕 NUEVO: Fábrica de Vehículos Artillados
        // Desbloquea tanque, artillado ligero y artillería
        tank: {
            required: ['armoredFactory']
        },
        lightVehicle: {
            required: ['armoredFactory']
        },
        artillery: {
            required: ['armoredFactory']
        },
        
        // 🆕 NUEVO: Destructor de mundos requiere Construcción Prohibida
        worldDestroyer: {
            required: ['deadlyBuild']
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // DESCRIPCIONES DE EDIFICIOS (SERVIDOR COMO AUTORIDAD)
    // ═══════════════════════════════════════════════════════════════
    // Importado desde nodeDescriptions.js para mejorar modularidad
    descriptions: NODE_DESCRIPTIONS
};

/**
 * ✅ Helper: Obtiene el radio de construcción de un edificio con fallback
 * Prioridad: buildRadius → (radius * 2.5)
 * @param {string} buildingType - Tipo de edificio
 * @returns {number} Radio de construcción en píxeles
 */
export function getBuildRadius(buildingType) {
    // 1. Si tiene buildRadius específico, usarlo
    if (SERVER_NODE_CONFIG.buildRadius?.[buildingType]) {
        return SERVER_NODE_CONFIG.buildRadius[buildingType];
    }
    
    // 2. Fallback final: calcular desde radius base (tamaño visual)
    const baseRadius = SERVER_NODE_CONFIG.radius?.[buildingType] || 30;
    return baseRadius * 2.5;
}

