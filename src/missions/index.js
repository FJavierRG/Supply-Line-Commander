// ===== ÍNDICE DE MISIONES =====
// Solo habilitamos la Misión 20 para jugar

import { Mission20 } from './Mission20.js';

/**
 * Array de todas las misiones del juego
 * Para agregar una nueva misión:
 * 1. Crea un nuevo archivo MissionX.js
 * 2. Extiende la clase Mission
 * 3. Importa y agrega aquí
 */
export const MISSIONS = [
    Mission20
];

/**
 * Obtiene una instancia de misión por número
 * @param {number} missionNumber - Número de misión (1-indexed)
 * @returns {Mission} Instancia de la misión
 */
export function getMission(missionNumber) {
    // Solo existe la misión 20, devolver siempre esa
    return new Mission20();
}

/**
 * Obtiene el número total de misiones
 */
export function getTotalMissions() {
    return MISSIONS.length;
}

