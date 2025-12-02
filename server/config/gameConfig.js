// ===== CONFIGURACIÓN GLOBAL DEL JUEGO (SERVIDOR) =====
// Constantes y parámetros globales del servidor

export const GAME_CONFIG = {
    // ═══════════════════════════════════════════════════════════════
    // CONFIGURACIÓN DE PARTIDA
    // ═══════════════════════════════════════════════════════════════
    match: {
        countdown: 3,         // Countdown antes de empezar (segundos)
        tickRate: 10,         // Ticks por segundo (TPS) - Optimización: reducido de 20 a 10
        worldWidth: 1920,     // Ancho del mundo (px)
        worldHeight: 1080,    // Alto del mundo (px)
        victoryLineLeft: 0.13,    // 10% del ancho línea de victoria para player2
        victoryLineRight: 0.87     // 90% del ancho línea de victoria para player1
    },

    // ═══════════════════════════════════════════════════════════════
    // MAZOS (DECKS)
    // ═══════════════════════════════════════════════════════════════
    deck: {
        pointLimit: 700,        // 🎯 Límite de puntos por mazo (ANTI-HACK: validado en servidor)
        benchPointLimit: 300    // 🆕 NUEVO: Límite de puntos para el banquillo (ANTI-HACK: validado en servidor)
    },

    // ═══════════════════════════════════════════════════════════════
    // CURRENCY (ECONOMÍA)
    // ═══════════════════════════════════════════════════════════════
    currency: {
        initial: 0,          // Currency inicial de cada jugador
        passiveRate: 1,       // Generación pasiva base ($/s)
        pixelsPerCurrency: 2,  // Nº de pixeles necesarios para generar 1 currency
        currencyName: 'Terreno Ganado' // Nombre de la currency
    },

    // ═══════════════════════════════════════════════════════════════
    // VEHÍCULOS (SERVIDOR COMO AUTORIDAD - ANTI-HACK)
    // ═══════════════════════════════════════════════════════════════
    vehicles: {
        heavy_truck: {
            capacity: 15,  // ✅ USADO: Cantidad de suministros por viaje
        },
        truck: {
            capacity: 20,  // ✅ USADO: Cantidad de suministros por viaje
        },
        helicopter: {
            capacity: 100,      // Capacidad total inicial (legacy, usar baseCapacity)
            baseCapacity: 100,  // ✅ USADO: Capacidad máxima del helicóptero (0-100)
            deliveryAmount: 50, // ✅ USADO: Cantidad que entrega a frentes por viaje
        },
        ambulance: {
            capacity: 0,    // ✅ USADO: No transporta suministros, solo misiones médicas
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // MOVIMIENTO DE FRENTES (SERVIDOR COMO AUTORIDAD - ANTI-HACK)
    // ═══════════════════════════════════════════════════════════════
    frontMovement: {
        advanceSpeed: 4,    // Velocidad de avance (px/s) cuando tiene recursos
        retreatSpeed: 4     // Velocidad de retroceso (px/s) cuando NO tiene recursos
    },

    // ═══════════════════════════════════════════════════════════════
    // INTERVALOS DE SONIDOS AMBIENTALES
    // ═══════════════════════════════════════════════════════════════
    audio: {
        clearShootsInterval: 60,   // Cada 60s
        radioEffectInterval: 50    // Cada 50s
    },

    // ═══════════════════════════════════════════════════════════════
    // RUTAS DE CONVOYES (SERVIDOR COMO AUTORIDAD - ANTI-HACK)
    // ═══════════════════════════════════════════════════════════════
    routes: {
        // Rutas base válidas
        valid: {
            'hq': ['fob'],
            'fob': ['front', 'fob'],
            'front': []          // Los frentes solo reciben, nunca envían
        },
        
        // Rutas especiales por raza (vacío - ya no hay sistema de razas)
        raceSpecial: {}
    },

    // ═══════════════════════════════════════════════════════════════
    // NODOS INICIALES (MAPA SIMÉTRICO)
    // ═══════════════════════════════════════════════════════════════
    initialNodes: {
        // HQ (Cuartel General)
        hq: {
            player1: { x: 100, y: 540 },
            player2: { x: 1820, y: 540 },
            // 🆕 REWORK: Sistema de suministros del HQ
            supplies: 100,                  // Suministros iniciales
            maxSupplies: 100,               // Capacidad máxima
            supplyRegenerationRate: 1,      // Suministros por segundo (regeneración pasiva)
            availableVehicles: 4,
            maxVehicles: 4, //heavy trucks de suministro
            // Sistema médico (ambulancias)
            ambulanceAvailable: true,
            maxAmbulances: 1,
            // Sistema de reparación (camiones mecánicos)
            availableRepairVehicles: 1,
            maxRepairVehicles: 1
        },
        
        // Frentes iniciales
        fronts: [
            { id: 'front_1', x: 800, y: 200, supplies: 50 },
            { id: 'front_2', x: 800, y: 540, supplies: 50 },
            { id: 'front_3', x: 800, y: 880, supplies: 50 }
        ],
        
        // FOBs iniciales
        fobs: [
            { id: 'fob_1', x: 400, y: 200, vehicles: 2 },
            { id: 'fob_2', x: 400, y: 880, vehicles: 2 }
        ],
        
        // 🆕 Configuración de FOBs (centralizada)
        fob: {
            initialSupplies: 20,    // Suministros iniciales para FOBs del mapa al empezar partida
            builtSupplies: 30,      // Suministros iniciales para FOBs construidos manualmente
            maxSupplies: 100        // Capacidad máxima de suministros
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURACIÓN DE CONVOYES (SERVIDOR COMO AUTORIDAD - ANTI-HACK)
    // ═══════════════════════════════════════════════════════════════
    convoy: {
        // Velocidades base de vehículos (píxeles por segundo)
        vehicleSpeeds: {
            heavy_truck: 40,    // Camión pesado (HQ → FOB)
            truck: 50,          // Camión normal (FOB → Front)
            ambulance: 70,      // Ambulancia 
            repair_truck: 40,   // Camión de reparación (HQ → edificios rotos) 
            helicopter: 80      // Helicóptero (más rápido)
        },

        // Penalizaciones y efectos
        penalties: {
            sabotage: 0.4,      // penalización por sabotaje FOB. Se aplica a los camiones que salen de la FOB sabotada.
            harassment: 0.5     //penalización por acoso. Se aplica a los camiones que pasan por el área de efecto del acoso.
        },

        // Bonuses de edificios
        bonuses: {
            engineerCenter: {
                speedMultiplier: 1.5,    // +50% velocidad para heavy_truck
                affectedVehicles: ['heavy_truck']
            }
            // ✅ truckFactory bonuses movidos a serverNodes.js (effects.truckFactory) - fuente única de verdad
            // Nota: capacityBonus ahora está en SERVER_NODE_CONFIG.effects.truckFactory.capacityBonus
        },

        // Configuración de cargo
        cargo: {
            baseCapacity: 15,           // Capacidad base de camiones
            helicopterCapacity: 100,   // Capacidad de helicópteros
            ambulanceCapacity: 0        // Ambulancias no transportan cargo
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // TIEMPOS DE ABANDONO (SERVIDOR COMO AUTORIDAD - ANTI-HACK)
    // ═══════════════════════════════════════════════════════════════
    abandonment: {
        // Tiempos por defecto (milisegundos)
        default: {
            phase1Duration: 2000,      // 2 segundos en gris claro
            phase2Duration: 3000       // 3 segundos en gris oscuro
        },
        
        // Tiempos específicos por tipo de edificio
        intelRadio: {
            phase1Duration: 500,       // 0.5 segundos en gris claro
            phase2Duration: 500        // 0.5 segundos en gris oscuro (total 1s)
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // CONFIGURACIÓN DE TERRITORIO MEZCLADO DE FORMA CAÓTICA CON ABANDONO
    // ═══════════════════════════════════════════════════════════════
    territory: {
        frontierGapPx: 25,                    // Gap entre frontera y edificios
        checkAbandonmentInterval: 0.2,        // Verificar cada 0.2 segundos (5 veces por segundo) - FIX: reducido para consistencia
        graceTime: 3.0                       // 3 segundos de gracia antes de iniciar abandono
    },
    
    // ═══════════════════════════════════════════════════════════════
    // DISCIPLINAS
    // ═══════════════════════════════════════════════════════════════
    disciplines: {
        maxEquipped: 2,      // Máximo de disciplinas por mazo
        activationCost: 0    // Coste para activar (0 = gratis)
    }
};

