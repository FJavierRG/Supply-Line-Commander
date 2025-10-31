// ===== GENERADOR DE MAPAS COMPARTIDO =====
// Lógica de generación de mapas que se usa tanto en singleplayer como multiplayer

/**
 * Configuración de nodos para el mapa simétrico
 * Estos valores definen las posiciones de todos los nodos en el mapa
 */
export const MAP_CONFIG = {
    // Tamaño base del mapa
    width: 1920,
    height: 1080,
    
    // Posiciones de HQ (Cuartel General)
    hq: {
        player1: { xPercent: 0.06, yPercent: 0.5 },   // Izquierda
        player2: { xPercent: 0.94, yPercent: 0.5 }    // Derecha (espejo)
    },
    
    // Posiciones de FOBs (Base Avanzada)
    fobs: {
        player1: [
            { xPercent: 0.208, yPercent: 0.722 },
            { xPercent: 0.208, yPercent: 0.259 }
        ],
        player2: [
            { xPercent: 0.792, yPercent: 0.722 },  // Espejo de 0.208
            { xPercent: 0.792, yPercent: 0.259 }
        ]
    },
    
    // Posiciones de Frentes
    fronts: {
        player1: [
            { xPercent: 0.35, yPercent: 0.722 },
            { xPercent: 0.35, yPercent: 0.259 }
        ],
        player2: [
            { xPercent: 0.65, yPercent: 0.722 },
            { xPercent: 0.65, yPercent: 0.259 }
        ]
    }
};

/**
 * Genera la configuración de nodos para el mapa inicial
 * @param {string} team - 'player1' o 'player2' o 'ally'/'enemy' para singleplayer
 * @returns {Array} Array de configuración de nodos
 */
export function generateMapNodes(team = 'ally') {
    const nodes = [];
    
    // Mapear equipo a formato de servidor
    const playerTeam = team === 'ally' ? 'player1' : (team === 'enemy' ? 'player2' : team);
    
    // 1. Generar HQ
    nodes.push({
        type: 'hq',
        config: MAP_CONFIG.hq[playerTeam || 'player1'],
        team: playerTeam || 'ally'
    });
    
    // 2. Generar FOBs
    const fobConfig = MAP_CONFIG.fobs[playerTeam];
    if (fobConfig) {
        fobConfig.forEach(fobPos => {
            nodes.push({
                type: 'fob',
                config: fobPos,
                team: playerTeam || 'ally',
                supplies: 50 // Inicial para FOBs
            });
        });
    }
    
    // 3. Generar Frentes
    const frontConfig = MAP_CONFIG.fronts[playerTeam];
    if (frontConfig) {
        frontConfig.forEach(frontPos => {
            nodes.push({
                type: 'front',
                config: frontPos,
                team: playerTeam || 'ally',
                supplies: 100 // Inicial para Frentes
            });
        });
    }
    
    return nodes;
}

/**
 * Genera el mapa completo (jugador + enemigo) para singleplayer
 * @returns {Object} Objeto con nodes del jugador y enemigo
 */
export function generateSingleplayerMap() {
    return {
        ally: generateMapNodes('ally'),
        enemy: generateMapNodes('enemy')
    };
}

/**
 * Calcula coordenadas absolutas desde porcentajes
 * @param {number} xPercent - Porcentaje en X (0-1)
 * @param {number} yPercent - Porcentaje en Y (0-1)
 * @param {number} canvasWidth - Ancho del canvas
 * @param {number} canvasHeight - Alto del canvas
 * @returns {Object} {x, y} coordenadas absolutas
 */
export function calculateAbsolutePosition(xPercent, yPercent, canvasWidth, canvasHeight) {
    return {
        x: canvasWidth * xPercent,
        y: canvasHeight * (1 - yPercent) // Invertir Y (sistema cartesiano: 0 = abajo)
    };
}

