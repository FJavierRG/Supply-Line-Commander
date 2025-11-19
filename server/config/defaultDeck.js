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
        'lightVehicle',    // Artillado ligero
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

/**
 * Crea un nuevo mazo predeterminado con todas las unidades habilitadas
 * Útil para crear un mazo completo automáticamente
 * 🆕 NUEVO: Incluye banquillo vacío
 */
export function createFullDefaultDeck() {
    const enabledUnits = getEnabledUnits();
    // Filtrar FOB de enabledUnits si está presente (ya que se añade por defecto)
    const filteredUnits = enabledUnits.filter(id => id !== 'fob');
    return {
        id: 'default',
        name: 'Mazo Predeterminado',
        units: ['hq', 'fob', ...filteredUnits], // HQ y FOB siempre primero
        bench: [], // 🆕 NUEVO: Banquillo vacío
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDefault: true
    };
}

