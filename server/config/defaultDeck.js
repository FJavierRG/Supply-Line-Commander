// ===== MAZO PREDETERMINADO =====
// Mazo inicial que siempre estará disponible para los jugadores
// Este mazo se crea automáticamente si no hay mazos guardados

/**
 * Mazo predeterminado del juego
 * Incluye unidades básicas y equilibradas para empezar a jugar
 * 🆕 NUEVO: Incluye banquillo con unidades adicionales
 * 🆕 NUEVO: Incluye disciplinas estratégicas
 */
export const DEFAULT_DECK = {
    id: 'default',
    name: 'Mazo Predeterminado',
    units: [
        'hq',              // Siempre incluido    // Ataque de francotirador
        'servers',      // Radio de inteligencia
        'engineerCenter',  // Centro de ingenieros   // Fábrica de camiones
        'factory',         // Fábrica (genera suministros)     // Sabotaje FOB
        'fob',             // Base de operaciones avanzada
        'antiDrone',
        'trainStation',
        'droneLauncher'    // Planta nuclear (genera income pasivo)
    ],
    bench: [
        'drone'        // Artillería
    ],
    disciplines: [
        'motorized_industry',       // Industria Motorizada
        'improved_infrastructure'   // Infraestructuras Mejoradas
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDefault: true
};

