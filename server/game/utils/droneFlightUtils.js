// ===== UTILIDADES DE VUELO DE DRONES =====
// Módulo compartido para la lógica de vuelo de todos los tipos de drones
// Centraliza el cálculo de movimiento y configuración de velocidad

import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

/**
 * Obtiene la configuración de vuelo para un tipo de dron
 * @param {string} droneType - Tipo de dron ('drone', 'cameraDrone', etc.)
 * @returns {{ speed: number }} Configuración de vuelo
 */
export function getDroneFlightConfig(droneType) {
    const droneFlightConfigs = SERVER_NODE_CONFIG.droneFlightConfig;
    
    // Si existe configuración específica para el tipo, usarla
    if (droneFlightConfigs?.[droneType]) {
        return droneFlightConfigs[droneType];
    }
    
    // Fallback a configuración por defecto
    return droneFlightConfigs?.default || { speed: 300 };
}

/**
 * Calcula la nueva posición de un dron en vuelo hacia su objetivo
 * @param {Object} currentPos - Posición actual { x, y }
 * @param {Object} targetPos - Posición objetivo { x, y }
 * @param {number} speed - Velocidad del dron (px/s)
 * @param {number} dt - Delta time en segundos
 * @returns {{ x: number, y: number, arrived: boolean, distance: number }}
 */
export function calculateDroneFlightPosition(currentPos, targetPos, speed, dt) {
    const dx = targetPos.x - currentPos.x;
    const dy = targetPos.y - currentPos.y;
    const distance = Math.hypot(dx, dy);
    
    // Calcular cuánto se movería este frame
    const moveDistance = speed * dt;
    
    // Si está muy cerca O si el próximo movimiento lo pasaría, ha llegado
    if (distance < 5 || distance <= moveDistance) {
        return {
            x: targetPos.x,
            y: targetPos.y,
            arrived: true,
            distance: 0
        };
    }
    
    // Calcular nueva posición (movimiento hacia el objetivo)
    const vx = (dx / distance) * moveDistance;
    const vy = (dy / distance) * moveDistance;
    
    return {
        x: currentPos.x + vx,
        y: currentPos.y + vy,
        arrived: false,
        distance: distance - moveDistance
    };
}

/**
 * Calcula la posición inicial de un dron según el equipo
 * @param {string} team - Equipo del jugador ('player1' o 'player2')
 * @param {number} targetY - Coordenada Y del objetivo
 * @param {number} worldWidth - Ancho del mundo (default 1920)
 * @returns {{ x: number, y: number }}
 */
export function getDroneStartPosition(team, targetY, worldWidth = 1920) {
    // Player1 (izquierda) → x=0
    // Player2 (derecha) → x=worldWidth
    return {
        x: team === 'player1' ? 0 : worldWidth,
        y: targetY
    };
}

