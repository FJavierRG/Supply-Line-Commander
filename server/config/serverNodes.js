// ===== CONFIGURACIÓN DE NODOS DEL SERVIDOR =====
// Contiene SOLO valores numéricos y stats para balanceo de juego
// NO incluye información visual (sprites, colores) - eso está en src/config/nodes.js

import { NODE_DESCRIPTIONS } from './nodeDescriptions.js';

export const SERVER_NODE_CONFIG = {
    // ═══════════════════════════════════════════════════════════════
    // COSTES DE EDIFICIOS
    // ═══════════════════════════════════════════════════════════════
    costs: {
        fob: 120,
        antiDrone: 115,
        droneLauncher: 100,
        nuclearPlant: 200,
        truckFactory: 100,
        engineerCenter: 120,
        intelRadio: 70, 
        aerialBase: 150, 
        campaignHospital: 60,
        intelCenter: 150, 
        vigilanceTower: 120, 
        trainStation: 170, 
        // 🆕 CONSUMIBLES/PROYECTILES
        drone: 150,
        sniperStrike: 40,
        fobSabotage: 40,
        specopsCommando: 70,  
        tank: 100
    },

    // ═══════════════════════════════════════════════════════════════
    // TIEMPOS DE CONSTRUCCIÓN (segundos)
    // ═══════════════════════════════════════════════════════════════
    buildTimes: {
        fob: 4,
        antiDrone: 4,
        droneLauncher: 2,
        nuclearPlant: 4,
        truckFactory: 2,
        engineerCenter: 4,
        campaignHospital: 2,
        intelRadio: 2, 
        aerialBase: 3, 
        intelCenter: 3, 
        vigilanceTower: 3, 
        trainStation: 4  
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
            speedMultiplier: 1.5,        // +50% velocidad para heavy_truck
            affectedVehicles: ['heavy_truck']
        },
        aerialBase: { // En dev aún, probablemente a descartar
            // ✅ maxSupplies movido a capacities.aerialBase (fuente única de verdad)
            autoDestroy: true       // 🆕 Se autodestruye cuando se agota
        },
        trainStation: {
            trainInterval: 12,      // 🆕 Segundos entre envíos de tren
            trainSpeed: 55,        // 🆕 Velocidad del tren (píxeles por segundo)
            trainCargo: 25          // 🆕 Suministros que entrega cada tren
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURACIÓN DE ACCIONES
    // ═══════════════════════════════════════════════════════════════
    // ✅ NOTA: Los costos están en costs.* (fuente única de verdad)
    // - costs.sniperStrike, costs.fobSabotage, costs.drone, costs.tank, costs.specopsCommando
    actions: {
        sniperStrike: {
            targetType: ['front', 'specopsCommando']
        },
        fobSabotage: {
            targetType: 'fob'
        },
        specopsCommando: {
            targetType: 'position', // Se despliega en una posición (no un nodo específico)
            ignoreDetectionLimits: true // No afectado por límites de detección de otros edificios
        },
        droneLaunch: {
            validTargets: ['fob', 'nuclearPlant', 'antiDrone', 'campaignHospital', 'droneLauncher', 'truckFactory', 'engineerCenter', 'intelRadio', 'intelCenter', 'aerialBase', 'trainStation']
        },
        tankLaunch: {
            validTargets: ['nuclearPlant', 'antiDrone', 'campaignHospital', 'droneLauncher', 'truckFactory', 'engineerCenter', 'intelRadio', 'intelCenter', 'aerialBase', 'vigilanceTower', 'trainStation']
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
    // RANGOS Y DETECCIÓN
    // ═══════════════════════════════════════════════════════════════
    ranges: {
        campaignHospital: 240 // px - rango de acción del hospital
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
        trainStation: 130       
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
        trainStation: 40     
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
    // CAPACIDADES DE EDIFICIOS (SERVIDOR COMO AUTORIDAD)
    // ═══════════════════════════════════════════════════════════════
    // Los valores por defecto son: hasSupplies=false, hasVehicles=false, hasHelicopters=false
    capacities: {
        // Capacidades base de nodos
        hq: {
            maxVehicles: 4,
            maxAmbulances: 1,
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
            investmentTime: 20,      // Tiempo en segundos antes de pagar
            investmentBonus: 25       // Beneficio adicional (se suma al costo del edificio)
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
            detectionRadius: 200,  // Área visual de efecto (para mostrar en el cliente) - valor funcional está en specialNodes.specopsCommando.detectionRadius
            duration: 10,           // Duración en segundos antes de que el comando expire (10s)
            residualDisabledDuration: 3  // 🆕 NUEVO: Duración en segundos que los edificios permanecen disabled después de eliminar el comando (3s)
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
            nuclearPlant: true,
            machineNest: false,
            campaignHospital: false,
            intelRadio: true,
            intelCenter: true,   
            aerialBase: false,
            vigilanceTower: false,  
            trainStation: true,    
            // 🆕 CONSUMIBLES/PROYECTILES
            drone: true,
            sniperStrike: true,
            fobSabotage: true,
            specopsCommando: true,
            tank: true
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
            }
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

