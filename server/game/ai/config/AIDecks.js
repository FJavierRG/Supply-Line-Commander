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
 * Obtiene un mazo de IA por ID
 * @param {string} deckId - ID del mazo de IA
 * @returns {Object|null} El mazo de IA o null si no existe
 */
export function getAIDeck(deckId) {
    switch (deckId) {
        case 'ai_default':
        case 'default':
            return AI_DEFAULT_DECK;
        default:
            return null;
    }
}

/**
 * Obtiene todos los mazos de IA disponibles
 * @returns {Array<Object>} Array de mazos de IA
 */
export function getAllAIDecks() {
    return [AI_DEFAULT_DECK];
}

/**
 * Obtiene el mazo default de la IA
 * @returns {Object} El mazo default de la IA
 */
export function getDefaultAIDeck() {
    return AI_DEFAULT_DECK;
}

