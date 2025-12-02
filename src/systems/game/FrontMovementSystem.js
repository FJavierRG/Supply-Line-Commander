// ===== SISTEMA DE MOVIMIENTO DE FRENTES (SOLO VISUAL) =====
// ⚠️ IMPORTANTE: Este sistema SOLO calcula velocidades visuales y renderiza.
// NO simula movimiento ni otorga currency - el servidor es la autoridad.

import { BASE_CONFIG } from '../../config/constants.js';

// Configuración de colisión entre frentes (SOLO VISUAL)
const COLLISION_CONFIG = {
    frontierGapPx: 25,  // Distancia desde el nodo hasta su frontera
    neutralZoneGapPx: 25  // Espacio entre frontera aliada y frontera enemiga (zona neutral)
};

export class FrontMovementSystem {
    constructor(game) {
        this.game = game;
        
        // Velocidades configurables (píxeles por segundo) - desde configuración del servidor
        this.advanceSpeed = this.game.serverBuildingConfig?.frontMovement?.advanceSpeed || 3;
        this.retreatSpeed = this.game.serverBuildingConfig?.frontMovement?.retreatSpeed || 3;
        
        // Calcular rango de colisión (radio del nodo + gap hasta frontera + zona neutral)
        const frontRadius = BASE_CONFIG.front.radius;
        this.collisionRange = frontRadius + COLLISION_CONFIG.frontierGapPx + COLLISION_CONFIG.neutralZoneGapPx;
    }
    
    /**
     * === LEGACY REMOVED: update(), updateAllyFrontMovement(), updateEnemyFrontMovement() ===
     * El servidor maneja toda la lógica de movimiento de frentes.
     * El cliente solo renderiza las posiciones que vienen del servidor.
     * Ver: server/systems/FrontMovementSystemServer.js
     */
    
    /**
     * === LEGACY REMOVED: awardCurrencyForAdvance(), awardEnemyCurrencyForAdvance() ===
     * El servidor maneja toda la otorgación de currency por avance.
     * Ver: server/game/systems/CurrencySystem.js
     */
    
    /**
     * === LEGACY REMOVED: checkVictoryConditions() ===
     * El servidor maneja todas las condiciones de victoria/derrota.
     * Ver: server/game/GameStateManager.js
     */
    
    /**
     * Obtiene la velocidad visual actual de un frente
     * SOLO para renderizado - el servidor calcula el movimiento real
     * @param {Base} front - Frente
     * @returns {number} Velocidad en px/s (positivo=avance, negativo=retroceso)
     */
    getFrontSpeed(front) {
        return front.supplies > 0 ? this.advanceSpeed : -this.retreatSpeed;
    }
    
    /**
     * Configura las velocidades de movimiento (visual)
     * @param {number} advance - Velocidad de avance (px/s)
     * @param {number} retreat - Velocidad de retroceso (px/s)
     */
    setMovementSpeeds(advance, retreat) {
        this.advanceSpeed = advance;
        this.retreatSpeed = retreat;
    }
    
    /**
     * Encuentra el frente enemigo más cercano en el eje Y (SOLO VISUAL)
     * @param {Base} allyFront - Frente aliado
     * @returns {Base|null} Frente enemigo más cercano o null
     */
    findNearestEnemyFront(allyFront) {
        const myTeam = this.game.myTeam || 'ally';
        const enemyFronts = this.game.bases.filter(b => b.type === 'front' && b.team !== myTeam);
        
        if (enemyFronts.length === 0) return null;
        
        // Encontrar el enemigo con la menor distancia en Y
        let nearest = null;
        let minDistanceY = Infinity;
        
        for (const enemy of enemyFronts) {
            const distanceY = Math.abs(enemy.y - allyFront.y);
            if (distanceY < minDistanceY) {
                minDistanceY = distanceY;
                nearest = enemy;
            }
        }
        
        return nearest;
    }
    
    /**
     * Encuentra el frente aliado más cercano en el eje Y (SOLO VISUAL)
     * @param {Base} enemyFront - Frente enemigo
     * @returns {Base|null} Frente aliado más cercano o null
     */
    findNearestAllyFront(enemyFront) {
        const allyFronts = this.game.bases.filter(b => b.type === 'front');
        
        if (allyFronts.length === 0) return null;
        
        // Encontrar el aliado con la menor distancia en Y
        let nearest = null;
        let minDistanceY = Infinity;
        
        for (const ally of allyFronts) {
            const distanceY = Math.abs(ally.y - enemyFront.y);
            if (distanceY < minDistanceY) {
                minDistanceY = distanceY;
                nearest = ally;
            }
        }
        
        return nearest;
    }
    
    /**
     * Verifica si dos frentes están en rango de colisión (SOLO VISUAL)
     * @param {Base} allyFront - Frente aliado
     * @param {Base} enemyFront - Frente enemigo
     * @returns {boolean} true si están en rango de colisión (visual)
     */
    areInCollisionRange(allyFront, enemyFront) {
        // Calcular posición de las fronteras
        const frontRadius = BASE_CONFIG.front.radius;
        const gap = COLLISION_CONFIG.frontierGapPx;
        
        // Frontera aliada está DELANTE del nodo aliado (a la derecha)
        const allyFrontierX = allyFront.x + frontRadius + gap;
        
        // Frontera enemiga está DELANTE del nodo enemigo (a la izquierda)
        const enemyFrontierX = enemyFront.x - frontRadius - gap;
        
        // Distancia entre las dos fronteras
        const frontierDistance = enemyFrontierX - allyFrontierX;
        
        // Están en rango de colisión si las fronteras están a menos de neutralZoneGapPx
        const inRange = frontierDistance <= COLLISION_CONFIG.neutralZoneGapPx;
        
        if (inRange) {
            // Reproducir sonido de enemy contact (solo la primera vez)
            this.game.audio.playEnemyContact();
        }
        
        return inRange;
    }
    
    /**
     * Resetea el sistema (nueva misión)
     */
    resetLevel() {
        // No hay estado que resetear - solo visual
    }
}
