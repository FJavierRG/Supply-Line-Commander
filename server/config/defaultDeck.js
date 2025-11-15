// ===== MAZO PREDETERMINADO =====
// Mazo inicial que siempre estará disponible para los jugadores
// Este mazo se crea automáticamente si no hay mazos guardados

import { SERVER_NODE_CONFIG } from './serverNodes.js';

/**
 * ✅ REDISTRIBUIDO: Edificios disponibles para el mazo predeterminado
 * Movido desde raceConfig.js ya que solo se usa aquí
 */
const DEFAULT_DECK_BUILDINGS = [
    'fob', 'antiDrone', 'droneLauncher',
    'truckFactory', 'engineerCenter', 'nuclearPlant',
    'vigilanceTower', 'intelRadio', 'intelCenter'
];

/**
 * ✅ REDISTRIBUIDO: Consumibles disponibles para el mazo predeterminado
 * Movido desde raceConfig.js ya que solo se usa aquí
 */
const DEFAULT_DECK_CONSUMABLES = [
    'drone', 'sniperStrike', 'specopsCommando', 'fobSabotage'
];

/**
 * Obtiene todas las unidades habilitadas para el mazo predeterminado
 * @returns {Array<string>} Array de IDs de unidades habilitadas
 */
function getEnabledUnits() {
    const enabled = SERVER_NODE_CONFIG.gameplay.enabled;
    
    // Filtrar solo las unidades que están habilitadas en el servidor
    const enabledBuildings = DEFAULT_DECK_BUILDINGS.filter(id => enabled[id] === true);
    const enabledConsumables = DEFAULT_DECK_CONSUMABLES.filter(id => enabled[id] === true);
    
    return [...enabledBuildings, ...enabledConsumables];
}

/**
 * Mazo predeterminado del juego
 * Incluye unidades básicas y equilibradas para empezar a jugar
 * 🆕 NUEVO: Incluye banquillo vacío (se rellenará después)
 */
export const DEFAULT_DECK = {
    id: 'default',
    name: 'Mazo Predeterminado',
    units: [
        'hq',              // Siempre incluido
        'fob',             // Base de operaciones avanzada
        'antiDrone',       // Defensa anti-dron
        'droneLauncher',   // Lanzador de drones
        'truckFactory',    // Fábrica de camiones
        'engineerCenter',  // Centro de ingenieros
        'intelRadio',      // Radio de inteligencia
        'drone',           // Dron consumible
        'sniperStrike'     // Ataque de francotirador
    ],
    bench: [], // 🆕 NUEVO: Banquillo vacío (se rellenará después)
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDefault: true
};

/**
 * Crea un nuevo mazo predeterminado con todas las unidades habilitadas
 * Útil para crear un mazo completo automáticamente
 * 🆕 NUEVO: Incluye banquillo vacío
 */
export function createFullDefaultDeck() {
    const enabledUnits = getEnabledUnits();
    return {
        id: 'default',
        name: 'Mazo Predeterminado',
        units: ['hq', ...enabledUnits], // HQ siempre primero
        bench: [], // 🆕 NUEVO: Banquillo vacío
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDefault: true
    };
}

