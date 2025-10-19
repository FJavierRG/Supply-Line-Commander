// ===== CONFIGURACIÓN CENTRALIZADA DE LA IA =====

export const AIConfig = {
    // === INTERVALOS DE ACTUALIZACIÓN ===
    intervals: {
        supply: 2.0,           // Reabastecimiento FOBs/Frentes
        strategic: 8.0,        // Construcciones estratégicas
        offensive: 40.0,       // Decisiones ofensivas (variable)
        offensiveVariance: 10.0, // ±10s de variación
        harass: 25.0,          // Harass con sniper
        medical: 0,            // Continuo (cada frame)
        statusReport: 30.0     // Logs de estado
    },

    // === UMBRALES BASE (se ajustan dinámicamente) ===
    thresholds: {
        earlyGame: 200,    // < 200$ = early
        midGame: 400,      // 200-400$ = mid
        lateGame: 400,     // >= 400$ = late
        
        minCurrencyToAct: 80  // Mínimo para tomar decisiones
    },

    // === MÁRGENES DE SEGURIDAD ===
    margins: {
        normal: 50,
        earlyGame: 20,
        desperate: 10,
        winning: 80
    },

    // === COSTOS DE ACCIONES ===
    // NOTA: Ahora se obtienen dinámicamente de nodes.js (getNodeConfig)
    // Este objeto es legacy, se mantiene como fallback
    costs: {
        fob: 130,           // fob (nodes.js)
        plant: 200,         // nuclearPlant
        hospital: 125,      // campaignHospital
        launcher: 200,      // droneLauncher
        drone: 150,         // drone (actualizado de 175 → 150)
        sniper: 60,         // sniperStrike
        antiDrone: 115,     // antiDrone
        truckFactory: 90    // truckFactory (actualizado de 150 → 90)
    },

    // === SCORING WEIGHTS (pesos para evaluación) ===
    scoring: {
        // Construcción de FOBs
        fob: {
            base: 40,
            perExistingFOB: -25,        // Menos prioritario si ya tengo
            ifLessThan2: 30,            // Bonus si tengo <2
            earlyGameBonus: 20,         // Bonus en early game
            lateGamePenalty: -15        // Menos prioritario en late
        },

        // Planta Nuclear
        plant: {
            base: 50,
            perPlayerPlant: 30,         // +30 por cada planta del jugador
            perMyPlant: -25,            // -25 por cada planta mía
            ifEconomyBehind: 40,        // Bonus si mi economía < jugador
            earlyGamePenalty: -20       // Menos prioritario en early
        },

        // Lanzadera de Drones
        launcher: {
            base: 60,
            ifPlayerHasTargets: 25,     // Si jugador tiene plantas/hospitales
            ifMidGame: 20,              // Bonus en mid-game
            ifAlreadyHave: -9999        // Prohibido si ya tengo (más negativo)
        },

        // Dron
        drone: {
            base: 65,                   // Aumentado (antes 45)
            perHighValueTarget: 40,     // Bonus por objetivo valioso (antes 35)
            ifNoLauncher: -9999,        // Prohibido sin lanzadera
            perExistingDrone: -10,      // Menos si ya hay drones volando
            ifWinning: 25,              // Bonus si estoy ganando (antes 20)
            ifLateGame: 30              // Bonus en late game
        },

        // Sniper
        sniper: {
            base: 30,
            ifEarlyGame: 20,            // Bonus en early
            ifPlayerWeak: 15,           // Bonus si jugador débil
            ifLateGame: -10             // Menos prioritario en late
        },

        // Hospital
        hospital: {
            base: 35,
            ifHighCasualties: 25,       // Si tengo muchas bajas
            perMyHospital: -30,         // Ya tengo
            ifPlayerHas: 15             // Si jugador tiene
        }
    },

    // === PROBABILIDADES BASE ===
    probabilities: {
        medicalResponse: 0.8,    // 80% responder a emergencias
        sniperHarass: 0.6,       // 60% lanzar sniper
        skipHarass: 0.4,         // 40% saltarse harass
        
        // Construcción estratégica
        buildFOB: 0.8,
        buildPlant: 0.7,
        
        // Reacciones
        counterDrone: 0.6,
        mirrorAntiDrone: 0.3,
        mirrorPlant: 0.25,
        mirrorHospital: 0.2
    },

    // === NIVELES DE URGENCIA ===
    urgency: {
        // Valores que incrementan urgencia
        playerPlantDetected: 50,
        playerHospitalDetected: 30,
        fobsUnder30Percent: 30,
        underDroneAttack: 60,
        playerHasMorePlants: 40,
        playerHasMoreFOBs: 25,
        
        // Umbrales
        high: 70,      // > 70 = urgencia alta
        critical: 100  // > 100 = urgencia crítica
    },

    // === ESTADOS DEL JUEGO ===
    gameStates: {
        desperate: 'desperate',  // FOBs < 1
        losing: 'losing',        // Territorio < 30%
        even: 'even',            // Equilibrado
        winning: 'winning'       // Territorio > 70%
    },

    // === CONFIGURACIÓN DE ESTRATEGIAS ===
    strategies: {
        earlyGame: {
            focusFOBs: true,
            focusEconomy: false,
            aggressiveness: 0.3
        },
        midGame: {
            focusFOBs: true,
            focusEconomy: true,
            aggressiveness: 0.6
        },
        lateGame: {
            focusFOBs: false,
            focusEconomy: true,
            aggressiveness: 0.8
        }
    },

    // === DEBUGGING ===
    debug: {
        logScoring: false,
        logDecisions: true,
        logThreats: false,      // Desactivado: Spam excesivo con drones
        logActions: true
    }
};

export default AIConfig;

