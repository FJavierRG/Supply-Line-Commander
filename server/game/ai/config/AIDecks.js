// ===== MAZOS DE IA =====
// Define los mazos que la IA puede usar en las partidas
// Estos mazos están separados del mazo default del jugador para permitir
// balanceo independiente y estrategias específicas de IA

/**
 * Mazo default de la IA
 * Este es el mazo que la IA sabe usar correctamente con todas sus reglas de scoring
 * y prioridades configuradas en DefaultDeckProfile
 * 
 * MAZO: ['hq', 'fob', 'antiDrone', 'droneLauncher', 'truckFactory', 'engineerCenter', 'factory', 'servers', 'intelRadio', 'drone', 'cameraDrone', 'sniperStrike']
 */
export const AI_DEFAULT_DECK = {
    id: 'ai_default',
    name: 'IA - Mazo Predeterminado',
    units: [
        'hq',              // Siempre incluido
        'fob',             // Base de operaciones avanzada
        'antiDrone',       // Defensa anti-dron
        'droneLauncher',   // Lanzador de drones
        'truckFactory',    // Fábrica de camiones
        'engineerCenter',  // Centro de ingenieros
        'factory',         // Fábrica (suministra al HQ)
        'servers',         // Servidores (genera income pasivo)
        'intelRadio',      // Radio de inteligencia
        'drone',           // Dron bomba consumible
        'cameraDrone',     // Dron cámara (genera recursos)
        'sniperStrike'     // Ataque de francotirador
    ],
    bench: [], // Sin banquillo por ahora
    isDefault: true
};

/**
 * Mazo de Operaciones Especiales de la IA
 * Orientado a harass, sabotaje y fortalecimiento de frentes
 * Usa SpecOpsDeckProfile para sus reglas de scoring
 * 
 * MAZO: ['hq', 'fob', 'servers', 'factory', 'engineerCenter', 'trainingCamp', 'intelCenter', 'sniperStrike', 'fobSabotage', 'truckAssault']
 */
export const AI_SPECOPS_DECK = {
    id: 'ai_specops',
    name: 'IA - Operaciones Especiales',
    units: [
        'hq',              // Siempre incluido
        'fob',             // Base de operaciones avanzada
        'servers',         // Servidores (genera income pasivo)
        'factory',         // Fábrica (suministra al HQ)
        'engineerCenter',  // Centro de ingenieros
        'trainingCamp',    // Campo de entrenamiento (fortalece frentes)
        'intelCenter',     // Centro de inteligencia (desbloquea ops especiales)
        'sniperStrike',    // Ataque de francotirador
        'fobSabotage',     // Sabotaje de FOB enemiga
        'truckAssault'     // Truck assault (ralentiza vehículos enemigos)
    ],
    bench: [],
    isDefault: false
};

/**
 * Obtiene un mazo de IA por ID
 * @param {string} deckId - ID del mazo de IA (también acepta valores legacy como 'A_Nation')
 * @returns {Object|null} El mazo de IA o null si no existe
 */
export function getAIDeck(deckId) {
    switch (deckId) {
        case 'ai_default':
        case 'default':
        case 'A_Nation':  // Compatibilidad con valor legacy del selector
            return AI_DEFAULT_DECK;
        case 'ai_specops':
        case 'specops':
            return AI_SPECOPS_DECK;
        default:
            return null;
    }
}

/**
 * Obtiene todos los mazos de IA disponibles
 * @returns {Array<Object>} Array de mazos de IA
 */
export function getAllAIDecks() {
    return [AI_DEFAULT_DECK, AI_SPECOPS_DECK];
}

/**
 * Obtiene el mazo default de la IA
 * @returns {Object} El mazo default de la IA
 */
export function getDefaultAIDeck() {
    return AI_DEFAULT_DECK;
}

