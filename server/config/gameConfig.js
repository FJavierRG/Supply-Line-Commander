// ===== CONFIGURACIÓN GLOBAL DEL JUEGO (SERVIDOR) =====
// Constantes y parámetros globales del servidor

export const GAME_CONFIG = {
    // ═══════════════════════════════════════════════════════════════
    // CONFIGURACIÓN DE PARTIDA
    // ═══════════════════════════════════════════════════════════════
    match: {
        duration: 520,        // Duración máxima de partida (segundos)
        countdown: 3,         // Countdown antes de empezar (segundos)
        tickRate: 20,         // Ticks por segundo (TPS)
        worldWidth: 1920,     // Ancho del mundo (px)
        worldHeight: 1080     // Alto del mundo (px)
    },

    // ═══════════════════════════════════════════════════════════════
    // CURRENCY (ECONOMÍA)
    // ═══════════════════════════════════════════════════════════════
    currency: {
        initial: 30,          // Currency inicial de cada jugador
        passiveRate: 3        // Generación pasiva base ($/s)
    },

    // ═══════════════════════════════════════════════════════════════
    // INTERVALOS DE SONIDOS AMBIENTALES
    // ═══════════════════════════════════════════════════════════════
    audio: {
        clearShootsInterval: 60,   // Cada 60s
        radioEffectInterval: 50    // Cada 50s
    },

    // ═══════════════════════════════════════════════════════════════
    // NODOS INICIALES (MAPA SIMÉTRICO)
    // ═══════════════════════════════════════════════════════════════
    initialNodes: {
        // HQ (Cuartel General)
        hq: {
            player1: { x: 100, y: 540 },
            player2: { x: 1820, y: 540 },
            supplies: 100,
            maxSupplies: 100,
            availableVehicles: 4,
            maxVehicles: 4
        },
        
        // Frentes iniciales
        fronts: [
            { id: 'front_1', x: 800, y: 200, supplies: 50 },
            { id: 'front_2', x: 800, y: 540, supplies: 50 },
            { id: 'front_3', x: 800, y: 880, supplies: 50 }
        ],
        
        // FOBs iniciales
        fobs: [
            { id: 'fob_1', x: 400, y: 200, supplies: 40, vehicles: 2 },
            { id: 'fob_2', x: 400, y: 880, supplies: 40, vehicles: 2 }
        ]
    }
};

