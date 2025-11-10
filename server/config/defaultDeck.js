// ===== MAZO PREDETERMINADO =====
// Mazo inicial que siempre estará disponible para los jugadores
// Este mazo se crea automáticamente si no hay mazos guardados

import { SERVER_NODE_CONFIG } from './serverNodes.js';
import { getServerRaceBuildings, getServerRaceConsumables } from './raceConfig.js';

/**
 * Obtiene todas las unidades habilitadas para A_Nation
 * @returns {Array<string>} Array de IDs de unidades habilitadas
 */
function getEnabledUnits() {
    const enabled = SERVER_NODE_CONFIG.gameplay.enabled;
    const buildings = getServerRaceBuildings('A_Nation');
    const consumables = getServerRaceConsumables('A_Nation');
    
    // Filtrar solo las unidades que están habilitadas en el servidor
    const enabledBuildings = buildings.filter(id => enabled[id] === true);
    const enabledConsumables = consumables.filter(id => enabled[id] === true);
    
    return [...enabledBuildings, ...enabledConsumables];
}

/**
 * Mazo predeterminado del juego
 * Incluye unidades básicas y equilibradas para empezar a jugar
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
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDefault: true
};

/**
 * Crea un nuevo mazo predeterminado con todas las unidades habilitadas
 * Útil para crear un mazo completo automáticamente
 */
export function createFullDefaultDeck() {
    const enabledUnits = getEnabledUnits();
    return {
        id: 'default',
        name: 'Mazo Predeterminado',
        units: ['hq', ...enabledUnits], // HQ siempre primero
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDefault: true
    };
}

