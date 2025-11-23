// ===== MAZO PREDETERMINADO =====
// Mazo inicial que siempre estará disponible para los jugadores
// Este mazo se crea automáticamente si no hay mazos guardados

/**
 * Mazo predeterminado del juego
 * Incluye unidades básicas y equilibradas para empezar a jugar
 * 🆕 NUEVO: Incluye banquillo con unidades adicionales
 */
export const DEFAULT_DECK = {
    id: 'default',
    name: 'Mazo Predeterminado',
    units: [
        'hq',              // Siempre incluido
        'sniperStrike',    // Ataque de francotirador
        'intelRadio',      // Radio de inteligencia
        'engineerCenter',  // Centro de ingenieros
        'truckFactory',    // Fábrica de camiones
        'factory',         // Fábrica (genera suministros)
        'fobSabotage',     // Sabotaje FOB
        'fob',             // Base de operaciones avanzada
        'antiDrone',       // Torreta anti drones
        'nuclearPlant'     // Planta nuclear (genera income pasivo)
    ],
    bench: [
        'tank',            // Tanque
        'artillery'        // Artillería
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDefault: true
};

