// ===== SISTEMA DE MOVIMIENTO DE FRENTES =====
import { BASE_CONFIG } from '../config/constants.js';

// Configuración de colisión entre frentes
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
        
        // Trackeo de avance para currency
        this.totalPixelsGainedThisLevel = 0;
        this.pendingCurrencyPixels = 0; // Acumulador de pixels sin redondear (jugador)
        this.pendingEnemyCurrencyPixels = 0; // Acumulador de pixels sin redondear (IA)
        
        // Calcular rango de colisión (radio del nodo + gap hasta frontera + zona neutral)
        const frontRadius = BASE_CONFIG.front.radius;
        this.collisionRange = frontRadius + COLLISION_CONFIG.frontierGapPx + COLLISION_CONFIG.neutralZoneGapPx;
        
        // Timer para verificación de victoria (cada 2 segundos)
        this.victoryCheckTimer = 0;
        this.victoryCheckInterval = 2000; // 2 segundos en milisegundos
    }
    
    /**
     * Actualiza el movimiento de todos los frentes (aliados y enemigos)
     * @param {number} deltaTime - Tiempo transcurrido en milisegundos
     */
    update(deltaTime) {
        // En multijugador, el servidor maneja todo el movimiento de frentes
        if (this.game.isMultiplayer) {
            return;
        }
        
        const myTeam = this.game.myTeam || 'ally';
        const allyFronts = this.game.bases.filter(b => b.type === 'front' && b.team === myTeam);
        const enemyFronts = this.game.bases.filter(b => b.type === 'front' && b.team !== myTeam && b.type === 'front');
        
        // Actualizar frentes aliados (avanzan a la derecha)
        for (const front of allyFronts) {
            this.updateAllyFrontMovement(front, deltaTime);
        }
        
        // Actualizar frentes enemigos (avanzan a la izquierda - ESPEJO)
        for (const enemyFront of enemyFronts) {
            this.updateEnemyFrontMovement(enemyFront, deltaTime);
        }
        
        // Verificar condiciones de victoria/derrota cada 2 segundos (optimización)
        this.victoryCheckTimer += deltaTime;
        if (this.victoryCheckTimer >= this.victoryCheckInterval) {
            this.checkVictoryConditions();
            this.victoryCheckTimer = 0; // Reset timer
        }
    }
    
    /**
     * Actualiza el movimiento de un frente ALIADO
     * @param {Base} front - Frente aliado a actualizar
     * @param {number} deltaTime - Tiempo transcurrido en milisegundos
     */
    updateAllyFrontMovement(front, deltaTime) {
        // Buscar el frente enemigo más cercano en el eje Y (mismo nivel vertical)
        const nearestEnemy = this.findNearestEnemyFront(front);
        
        // Calcular desplazamiento (convertir deltaTime de ms a segundos)
        const deltaSeconds = deltaTime / 1000;
        let movement = 0;
        
        // Verificar si está en rango de colisión con un enemigo
        if (nearestEnemy && this.areInCollisionRange(front, nearestEnemy)) {
            // EMPUJE: Comparar recursos
            if (front.supplies > nearestEnemy.supplies) {
                // Aliado tiene más recursos → EMPUJA (avanza)
                movement = this.advanceSpeed * deltaSeconds;
            } else if (front.supplies < nearestEnemy.supplies) {
                // Enemigo tiene más recursos → ES EMPUJADO (retrocede)
                movement = -this.retreatSpeed * deltaSeconds;
            } else {
                // Recursos IGUALES
                if (front.supplies === 0 && nearestEnemy.supplies === 0) {
                    // AMBOS sin recursos → AMBOS retroceden
                    movement = -this.retreatSpeed * deltaSeconds;
                }
                // Si ambos tienen recursos (pero iguales) → EMPATE (movement = 0)
            }
        } else {
            // SIN COLISIÓN: Movimiento normal basado en recursos
            const hasResources = front.supplies > 0;
            
            if (hasResources) {
                // Avanzar hacia la derecha (+X)
                movement = this.advanceSpeed * deltaSeconds;
                
                // Si tenía el efecto, quitarlo y resetear flag de sonido
                if (front.hasEffect('no_supplies')) {
                    front.removeEffect('no_supplies');
                    this.game.audio.resetNoAmmoFlag(front.id);
                }
            } else {
                // Retroceder hacia la izquierda (-X)
                movement = -this.retreatSpeed * deltaSeconds;
                
                // Si acaba de empezar a retroceder, reproducir sonido
                if (!front.hasEffect('no_supplies')) {
                    this.game.audio.playNoAmmoSound(front.id);
                }
                
                front.addEffect({
                    type: 'no_supplies',
                    icon: 'ui-no-supplies',
                    tooltip: 'Sin Suministros: El frente se retira'
                });
            }
        }
        
        // Aplicar movimiento
        front.x += movement;
        
        // Actualizar territorio conquistado (solo si avanza)
        if (front.x > front.maxXReached) {
            const pixelsGained = front.x - front.maxXReached;
            front.maxXReached = front.x;
            
            // Otorgar currency al jugador
            this.awardCurrencyForAdvance(pixelsGained);
        }
    }
    
    /**
     * Actualiza el movimiento de un frente ENEMIGO (ESPEJO del aliado)
     * @param {Base} enemyFront - Frente enemigo a actualizar
     * @param {number} deltaTime - Tiempo transcurrido en milisegundos
     */
    updateEnemyFrontMovement(enemyFront, deltaTime) {
        // Buscar el frente aliado más cercano en el eje Y (mismo nivel vertical)
        const nearestAlly = this.findNearestAllyFront(enemyFront);
        
        // Calcular desplazamiento (convertir deltaTime de ms a segundos)
        const deltaSeconds = deltaTime / 1000;
        let movement = 0;
        
        // Verificar si está en rango de colisión con un aliado
        if (nearestAlly && this.areInCollisionRange(nearestAlly, enemyFront)) {
            // EMPUJE: Comparar recursos
            if (enemyFront.supplies > nearestAlly.supplies) {
                // Enemigo tiene más recursos → EMPUJA (avanza a la izquierda)
                movement = -this.advanceSpeed * deltaSeconds;
            } else if (enemyFront.supplies < nearestAlly.supplies) {
                // Aliado tiene más recursos → ES EMPUJADO (retrocede a la derecha)
                movement = this.retreatSpeed * deltaSeconds;
            } else {
                // Recursos IGUALES
                if (enemyFront.supplies === 0 && nearestAlly.supplies === 0) {
                    // AMBOS sin recursos → AMBOS retroceden
                    movement = this.retreatSpeed * deltaSeconds; // Retrocede a la derecha
                }
                // Si ambos tienen recursos (pero iguales) → EMPATE (movement = 0)
            }
        } else {
            // SIN COLISIÓN: Movimiento normal basado en recursos
            const hasResources = enemyFront.supplies > 0;
            
            if (hasResources) {
                // ESPEJO: Avanzar hacia la IZQUIERDA (-X)
                movement = -this.advanceSpeed * deltaSeconds;
                
                // Si tenía el efecto, quitarlo y resetear flag de sonido
                if (enemyFront.hasEffect('no_supplies')) {
                    enemyFront.removeEffect('no_supplies');
                    this.game.audio.resetNoAmmoFlag(enemyFront.id);
                }
            } else {
                // ESPEJO: Retroceder hacia la DERECHA (+X)
                movement = this.retreatSpeed * deltaSeconds;
                enemyFront.addEffect({
                    type: 'no_supplies',
                    icon: 'ui-no-supplies',
                    tooltip: 'Sin Suministros: El frente se retira'
                });
            }
        }
        
        // Aplicar movimiento
        enemyFront.x += movement;
        
        // Trackear posición mínima alcanzada (los enemigos avanzan hacia la izquierda)
        // Si el enemigo avanza (X disminuye), otorgar currency a la IA
        if (enemyFront.minXReached === undefined) {
            // Primera vez: solo inicializar
            enemyFront.minXReached = enemyFront.x;
        } else if (enemyFront.x < enemyFront.minXReached) {
            // El frente avanzó (X disminuyó)
            const pixelsGained = enemyFront.minXReached - enemyFront.x;
            enemyFront.minXReached = enemyFront.x;
            
            // Otorgar currency a la IA enemiga
            if (pixelsGained > 0) {
                this.awardEnemyCurrencyForAdvance(pixelsGained);
            }
        }
    }
    
    /**
     * Otorga currency al jugador basándose en pixels ganados
     * @param {number} pixelsGained - Pixels ganados en este frame
     */
    awardCurrencyForAdvance(pixelsGained) {
        if (pixelsGained <= 0) return;
        
        // Acumular pixels (incluyendo decimales)
        this.pendingCurrencyPixels += pixelsGained;
        this.totalPixelsGainedThisLevel += pixelsGained;
        
        // Convertir pixels acumulados a currency (solo la parte entera)
        const pixelsPerCurrency = this.game.serverBuildingConfig?.currency?.pixelsPerCurrency || 2;
        const currencyToAward = Math.floor(this.pendingCurrencyPixels / pixelsPerCurrency);
        
        if (currencyToAward > 0) {
            this.game.addMissionCurrency(currencyToAward);
            this.pendingCurrencyPixels -= currencyToAward * pixelsPerCurrency;
            
            // Log cuando se otorga currency
            // Currency ganada (silencioso para no spamear consola)
        }
    }
    
    /**
     * Otorga currency a la IA enemiga basándose en pixels ganados por avance enemigo
     * Usa acumulador para no perder decimales (igual que el jugador)
     * @param {number} pixelsGained - Pixels ganados por el frente enemigo
     */
    awardEnemyCurrencyForAdvance(pixelsGained) {
        if (pixelsGained <= 0) return;
        
        // Acumular pixels (incluyendo decimales)
        this.pendingEnemyCurrencyPixels += pixelsGained;
        
        // Convertir pixels acumulados a currency (solo la parte entera)
        const pixelsPerCurrency = this.game.serverBuildingConfig?.currency?.pixelsPerCurrency || 2;
        const currencyToAward = Math.floor(this.pendingEnemyCurrencyPixels / pixelsPerCurrency);
        
        if (currencyToAward > 0) {
            this.game.enemyAI.addCurrency(currencyToAward);
            this.pendingEnemyCurrencyPixels -= currencyToAward * pixelsPerCurrency;
            
            // Log solo cada 50$ de avance para no spamear
            if (currencyToAward >= 50) {
                console.log(`📈 IA: +${currencyToAward}$ por avance de frente (total: ${this.game.enemyAI.getCurrency()}$)`);
            }
        }
    }
    
    /**
     * Resetea el contador de pixels ganados (nueva misión)
     */
    resetLevel() {
        this.totalPixelsGainedThisLevel = 0;
        this.pendingCurrencyPixels = 0;
        this.pendingEnemyCurrencyPixels = 0;
    }
    
    /**
     * Configura las velocidades de movimiento
     * @param {number} advance - Velocidad de avance (px/s)
     * @param {number} retreat - Velocidad de retroceso (px/s)
     */
    setMovementSpeeds(advance, retreat) {
        this.advanceSpeed = advance;
        this.retreatSpeed = retreat;
    }
    
    /**
     * Obtiene la velocidad actual de un frente
     * @param {Base} front - Frente
     * @returns {number} Velocidad en px/s (positivo=avance, negativo=retroceso)
     */
    getFrontSpeed(front) {
        return front.supplies > 0 ? this.advanceSpeed : -this.retreatSpeed;
    }
    
    /**
     * Encuentra el frente enemigo más cercano en el eje Y
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
     * Encuentra el frente aliado más cercano en el eje Y
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
     * Verifica si dos frentes están en rango de colisión
     * @param {Base} allyFront - Frente aliado
     * @param {Base} enemyFront - Frente enemigo
     * @returns {boolean} true si están en rango de colisión
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
     * Verifica las condiciones de victoria/derrota
     */
    checkVictoryConditions() {
        const myTeam = this.game.myTeam || 'ally';
        const allyFronts = this.game.nodes.filter(b => b.type === 'front' && b.team === myTeam && b.active);
        const enemyFronts = this.game.nodes.filter(b => b.type === 'front' && b.team !== myTeam && b.active);
        const allyHQ = this.game.nodes.find(b => b.type === 'hq' && b.team === myTeam && b.active);
        const enemyHQ = this.game.nodes.find(b => b.type === 'hq' && b.team !== myTeam && b.active);
        
        if (!allyHQ || !enemyHQ) return; // No hay HQs, no puede haber victoria
        
        // VICTORIA: Algún frente aliado alcanza 100px antes del HQ enemigo (balance más accesible)
        for (const front of allyFronts) {
            // El frente avanza hacia la derecha, el HQ enemigo está a la derecha
            if (front.x >= enemyHQ.x - 100) {
                this.game.triggerVictory();
                return;
            }
        }
        
        // DERROTA: Algún frente enemigo alcanza 100px antes del HQ aliado (balance más accesible)
        for (const enemyFront of enemyFronts) {
            // El frente enemigo avanza hacia la izquierda, el HQ aliado está a la izquierda
            if (enemyFront.x <= allyHQ.x + 100) {
                this.game.triggerDefeat();
                return;
            }
        }
    }
}

