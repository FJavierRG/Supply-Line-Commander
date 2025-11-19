// ===== SISTEMA DE MOVIMIENTO DE FRENTES (SERVIDOR) =====
// Este sistema se ejecuta SOLO en el servidor
// El cliente solo renderiza las posiciones que el servidor envía

import { GAME_CONFIG } from '../config/gameConfig.js';
import { SERVER_NODE_CONFIG } from '../config/serverNodes.js';

// Configuración específica del sistema (no duplicada con gameConfig.js)
const SYSTEM_CONFIG = {
    frontRadius: 40,
    frontierGapPx: 25,
    neutralZoneGapPx: 25
};

export class FrontMovementSystemServer {
    constructor(gameState) {
        this.gameState = gameState;
        // Usar configuración centralizada del servidor
        this.advanceSpeed = GAME_CONFIG.frontMovement.advanceSpeed;
        this.retreatSpeed = GAME_CONFIG.frontMovement.retreatSpeed;
        
        // Acumuladores de currency por avance
        this.pendingCurrencyPixels = {
            player1: 0,
            player2: 0
        };
        
        // Calcular rango de colisión
        this.collisionRange = SYSTEM_CONFIG.frontRadius + SYSTEM_CONFIG.frontierGapPx + SYSTEM_CONFIG.neutralZoneGapPx;
        
        // Flags para sonidos únicos por frente
        this.noAmmoSoundPlayed = new Set(); // IDs de frentes que ya reprodujeron no_ammo
    }

    /**
     * Actualizar movimiento de todos los frentes
     * @param {number} dt - Delta time en segundos
     */
    update(dt) {
        const player1Fronts = this.gameState.nodes.filter(n => n.type === 'front' && n.team === 'player1');
        const player2Fronts = this.gameState.nodes.filter(n => n.type === 'front' && n.team === 'player2');
        
        // Actualizar frentes player1 (avanzan a la derecha)
        for (const front of player1Fronts) {
            this.updateFrontMovement(front, player2Fronts, 1, dt); // dirección +1 = derecha
        }
        
        // Actualizar frentes player2 (avanzan a la izquierda)
        for (const front of player2Fronts) {
            this.updateFrontMovement(front, player1Fronts, -1, dt); // dirección -1 = izquierda
        }
        
        // Verificar condiciones de victoria/derrota (solo cada 2 segundos)
        // Retorna resultado de victoria si la hay
        return this.checkVictoryConditions();
    }

    /**
     * Actualizar movimiento de un frente
     * @param {Object} front - Frente a actualizar
     * @param {Array} enemyFronts - Frentes del equipo opuesto
     * @param {number} direction - Dirección de avance (+1 derecha, -1 izquierda)
     * @param {number} dt - Delta time en segundos
     */
    updateFrontMovement(front, enemyFronts, direction, dt) {
        // Buscar frente enemigo más cercano verticalmente
        const nearestEnemy = this.findNearestEnemyFrontVertical(front, enemyFronts);
        
        let movement = 0;
        let inCollision = false;
        let reason = '';
        
        // Verificar colisión con enemigo
        if (nearestEnemy && this.areInCollisionRange(front, nearestEnemy, direction)) {
            inCollision = true;
            
            // SONIDO: Primer contacto enemigo (solo una vez global)
            if (!this.gameState.hasPlayedEnemyContact) {
                this.gameState.addSoundEvent('enemy_contact');
                this.gameState.hasPlayedEnemyContact = true;
            }
            
            // EMPUJE: Comparar suministros
            if (front.supplies > nearestEnemy.supplies) {
                // Este frente tiene más → EMPUJA (avanza hacia el enemigo)
                // PERO debe avanzar a la MISMA velocidad que el enemigo retrocede
                // Así la distancia se mantiene constante
                const pushSpeed = this.advanceSpeed; // 8 px/s
                movement = pushSpeed * dt * direction;
                reason = `EMPUJA (${front.supplies.toFixed(0)} > ${nearestEnemy.supplies.toFixed(0)})`;
            } else if (front.supplies < nearestEnemy.supplies) {
                // Enemigo tiene más → ES EMPUJADO (retrocede alejándose del enemigo)
                // CRÍTICO: Retroceder a la MISMA velocidad que el enemigo avanza
                // para mantener distancia constante
                const pushSpeed = this.advanceSpeed; // Mismo que el empuje (8 px/s)
                movement = -pushSpeed * dt * direction;
                reason = `EMPUJADO (${front.supplies.toFixed(0)} < ${nearestEnemy.supplies.toFixed(0)})`;
            } else {
                // Recursos IGUALES
                if (front.supplies === 0 && nearestEnemy.supplies === 0) {
                    // AMBOS sin recursos → AMBOS retroceden (alejándose)
                    movement = -this.retreatSpeed * dt * direction;
                    reason = `AMBOS SIN RECURSOS (retroceden)`;
                } else {
                    // Recursos iguales pero > 0 → EMPATE (no se mueven)
                    movement = 0;
                    reason = `EMPATE (${front.supplies.toFixed(0)} = ${nearestEnemy.supplies.toFixed(0)})`;
                }
            }
        } else {
            // SIN COLISIÓN: Movimiento normal basado en recursos
            if (front.supplies > 0) {
                // Avanzar
                movement = this.advanceSpeed * dt * direction;
                reason = `AVANZA (supplies: ${front.supplies.toFixed(0)})`;
                
                // Resetear flag de no_ammo si volvió a tener supplies
                if (this.noAmmoSoundPlayed.has(front.id)) {
                    this.noAmmoSoundPlayed.delete(front.id);
                }
            } else {
                // Retroceder (sin recursos)
                movement = -this.retreatSpeed * dt * direction;
                reason = `RETROCEDE (sin supplies)`;
                
                // SONIDO: No ammo (solo una vez por frente)
                if (!this.noAmmoSoundPlayed.has(front.id)) {
                    this.gameState.addSoundEvent('no_ammo', { frontId: front.id });
                    this.noAmmoSoundPlayed.add(front.id);
                }
            }
        }
        
        // DEBUG: Log movimiento cada 2 segundos (COMENTADO - reduce spam)
        // if (!this._lastFrontLog) this._lastFrontLog = {};
        // if (!this._lastFrontLog[front.id] || Date.now() - this._lastFrontLog[front.id] > 2000) {
        //     const dirStr = direction === 1 ? '→' : '←';
        //     const enemyDist = nearestEnemy ? Math.abs(front.x - nearestEnemy.x).toFixed(0) : 'N/A';
        //     console.log(`🎯 ${front.team} frente ${dirStr} x=${front.x.toFixed(0)} | ${reason} | dist=${enemyDist}px | col=${inCollision}`);
        //     this._lastFrontLog[front.id] = Date.now();
        // }
        
        // Aplicar movimiento
        front.x += movement;
        
        // Trackear avance para currency
        if (direction === 1) {
            // Player1: avanza a la derecha (+X)
            if (!front.maxXReached) front.maxXReached = front.x;
            
            // 🔧 FIX: Si retrocedió, actualizar maxXReached para que cuente desde la nueva posición
            if (front.x < front.maxXReached) {
                front.maxXReached = front.x;
            } else if (front.x > front.maxXReached) {
                // Avanzó: otorgar currency
                const pixelsGained = front.x - front.maxXReached;
                front.maxXReached = front.x;
                this.awardCurrencyForAdvance('player1', pixelsGained, front);
            }
        } else {
            // Player2: avanza a la izquierda (-X)
            if (!front.minXReached) front.minXReached = front.x;
            
            // 🔧 FIX: Si retrocedió, actualizar minXReached para que cuente desde la nueva posición
            if (front.x > front.minXReached) {
                front.minXReached = front.x;
            } else if (front.x < front.minXReached) {
                // Avanzó: otorgar currency
                const pixelsGained = front.minXReached - front.x;
                front.minXReached = front.x;
                this.awardCurrencyForAdvance('player2', pixelsGained, front);
            }
        }
    }

    /**
     * Encuentra el frente enemigo más cercano verticalmente
     */
    findNearestEnemyFrontVertical(front, enemyFronts) {
        if (enemyFronts.length === 0) return null;
        
        let nearest = null;
        let minDistanceY = Infinity;
        
        for (const enemy of enemyFronts) {
            const distanceY = Math.abs(enemy.y - front.y);
            if (distanceY < minDistanceY) {
                minDistanceY = distanceY;
                nearest = enemy;
            }
        }
        
        return nearest;
    }

    /**
     * Verifica si dos frentes están en rango de colisión
     */
    areInCollisionRange(front1, front2, direction) {
        const frontRadius = SYSTEM_CONFIG.frontRadius;
        const gap = SYSTEM_CONFIG.frontierGapPx;
        
        // Calcular posiciones de fronteras
        let frontier1X, frontier2X;
        
        if (direction === 1) {
            // Front1 avanza a la derecha
            frontier1X = front1.x + frontRadius + gap;
            frontier2X = front2.x - frontRadius - gap;
        } else {
            // Front1 avanza a la izquierda
            frontier1X = front1.x - frontRadius - gap;
            frontier2X = front2.x + frontRadius + gap;
        }
        
        // Distancia entre fronteras
        const frontierDistance = Math.abs(frontier2X - frontier1X);
        
        // En rango si están a menos de neutralZoneGapPx
        return frontierDistance <= SYSTEM_CONFIG.neutralZoneGapPx;
    }

    /**
     * Otorga currency por avance de frentes
     * @param {string} team - Equipo del jugador ('player1' o 'player2')
     * @param {number} pixelsGained - Píxeles ganados por el avance
     * @param {Object} front - Frente que está avanzando (para verificar efectos)
     */
    awardCurrencyForAdvance(team, pixelsGained, front = null) {
        if (pixelsGained <= 0) return;
        
        // Acumular pixels
        this.pendingCurrencyPixels[team] += pixelsGained;
        
        // Convertir a currency (solo parte entera)
        const currencyToAward = Math.floor(this.pendingCurrencyPixels[team] / GAME_CONFIG.currency.pixelsPerCurrency);
        
        if (currencyToAward > 0) {
            let finalCurrencyToAward = currencyToAward;
            
            // 🆕 NUEVO: Verificar efecto "trained" en el frente que avanza
            if (front) {
                const trainedEffect = front.effects?.find(e => 
                    e.type === 'trained' && 
                    (!e.expiresAt || this.gameState.gameTime < e.expiresAt)
                );
                
                if (trainedEffect) {
                    const trainedConfig = SERVER_NODE_CONFIG.temporaryEffects.trained;
                    // Añadir bonus de currency del efecto trained
                    finalCurrencyToAward += trainedConfig.currencyBonus;
                    console.log(`🎓 Frente ${front.id} tiene efecto "trained" - Bonus: +${trainedConfig.currencyBonus}$ por avance`);
                }
            }
            
            this.gameState.currency[team] += finalCurrencyToAward;
            this.pendingCurrencyPixels[team] -= currencyToAward * GAME_CONFIG.currency.pixelsPerCurrency;
            
            // Log solo cada 50$ para no spamear (o si hay bonus de trained)
            if (finalCurrencyToAward >= 50 || (front && front.effects?.some(e => e.type === 'trained'))) {
                console.log(`📈 ${team}: +${finalCurrencyToAward}$ por avance de frente (total: ${this.gameState.currency[team]}$)`);
            }
        }
    }

    /**
     * Verificar condiciones de victoria/derrota
     * Hay DOS formas de ganar:
     * 1. Tu frente empuja hasta el HQ enemigo (victoria activa)
     * 2. La frontera enemiga retrocede hasta su propio HQ (victoria pasiva)
     */
    checkVictoryConditions() {
        const player1Fronts = this.gameState.nodes.filter(n => n.type === 'front' && n.team === 'player1' && n.active !== false);
        const player2Fronts = this.gameState.nodes.filter(n => n.type === 'front' && n.team === 'player2' && n.active !== false);
        const player1HQ = this.gameState.nodes.find(n => n.type === 'hq' && n.team === 'player1' && n.active !== false);
        const player2HQ = this.gameState.nodes.find(n => n.type === 'hq' && n.team === 'player2' && n.active !== false);
        
        if (!player1HQ || !player2HQ) return null; // No hay HQs, no puede haber victoria
        
        // Calcular fronteras (usando la misma lógica que TerritorySystem)
        const player1Frontier = this.calculateFrontier('player1', player1Fronts);
        const player2Frontier = this.calculateFrontier('player2', player2Fronts);
        
        // Calcular líneas de victoria basadas en porcentajes (15% y 85% del ancho)
        const worldWidth = GAME_CONFIG.match.worldWidth;
        const victoryLineLeft = GAME_CONFIG.match.victoryLineLeft * worldWidth;  // 15% = 288px
        const victoryLineRight = GAME_CONFIG.match.victoryLineRight * worldWidth; // 85% = 1632px
        
        // CONDICIÓN 1: VICTORIA ACTIVA - Tu frente empuja hasta la línea de victoria
        // VICTORIA PLAYER1: Algún frente player1 alcanza el 85% del ancho (1632px)
        for (const front of player1Fronts) {
            if (front.x >= victoryLineRight) {
                console.log(`🎉 VICTORIA PLAYER1: Frente alcanzó línea de victoria (${(victoryLineRight).toFixed(0)}px = ${(GAME_CONFIG.match.victoryLineRight * 100).toFixed(0)}%)`);
                return { winner: 'player1', reason: 'front_reached_hq' };
            }
        }
        
        // VICTORIA PLAYER2: Algún frente player2 alcanza el 15% del ancho (288px)
        for (const front of player2Fronts) {
            if (front.x <= victoryLineLeft) {
                console.log(`🎉 VICTORIA PLAYER2: Frente alcanzó línea de victoria (${(victoryLineLeft).toFixed(0)}px = ${(GAME_CONFIG.match.victoryLineLeft * 100).toFixed(0)}%)`);
                return { winner: 'player2', reason: 'front_reached_hq' };
            }
        }
        
        // CONDICIÓN 2: VICTORIA PASIVA - La frontera enemiga retrocede hasta las líneas de victoria
        // DEBUG: Log cada 5 segundos (COMENTADO - reduce spam)
        // if (!this._lastFrontierLog || Date.now() - this._lastFrontierLog > 5000) {
        //     console.log(`🔍 Fronteras: P1=${player1Frontier?.toFixed(0) || 'null'} (HQ=${player1HQ.x.toFixed(0)}) | P2=${player2Frontier?.toFixed(0) || 'null'} (HQ=${player2HQ.x.toFixed(0)})`);
        //     console.log(`🔍 Líneas victoria: Izquierda=${(victoryLineLeft).toFixed(0)}px (${(GAME_CONFIG.match.victoryLineLeft * 100)}%) | Derecha=${(victoryLineRight).toFixed(0)}px (${(GAME_CONFIG.match.victoryLineRight * 100)}%)`);
        //     this._lastFrontierLog = Date.now();
        // }
        
        // DERROTA PLAYER1: Su frontera retrocede hasta la línea del 15% (victoria para player2)
        if (player1Frontier !== null && player1Frontier <= victoryLineLeft) {
            console.log(`🎉 VICTORIA PLAYER2: Frontera de player1 retrocedió hasta línea de victoria (${(victoryLineLeft).toFixed(0)}px = ${(GAME_CONFIG.match.victoryLineLeft * 100)}%)`);
            console.log(`   Frontera P1: ${player1Frontier.toFixed(0)} | Límite: ${(victoryLineLeft).toFixed(0)}`);
            return { winner: 'player2', reason: 'frontier_collapsed' };
        }
        
        // DERROTA PLAYER2: Su frontera retrocede hasta la línea del 85% (victoria para player1)
        if (player2Frontier !== null && player2Frontier >= victoryLineRight) {
            console.log(`🎉 VICTORIA PLAYER1: Frontera de player2 retrocedió hasta línea de victoria (${(victoryLineRight).toFixed(0)}px = ${(GAME_CONFIG.match.victoryLineRight * 100)}%)`);
            console.log(`   Frontera P2: ${player2Frontier.toFixed(0)} | Límite: ${(victoryLineRight).toFixed(0)}`);
            return { winner: 'player1', reason: 'frontier_collapsed' };
        }
        
        return null; // No hay victoria aún
    }
    
    /**
     * Calcular frontera de un equipo (posición X más avanzada)
     * Misma lógica que TerritorySystemServer.calculateFrontier()
     */
    calculateFrontier(team, fronts) {
        if (fronts.length === 0) return null;
        
        const frontierGapPx = 25; // Mismo gap que en TerritorySystem
        
        if (team === 'player1') {
            // Player1 avanza a la derecha: frontera es el X más alto
            return Math.max(...fronts.map(f => f.x + frontierGapPx));
        } else {
            // Player2 avanza a la izquierda: frontera es el X más bajo
            return Math.min(...fronts.map(f => f.x - frontierGapPx));
        }
    }

    reset() {
        this.pendingCurrencyPixels = {
            player1: 0,
            player2: 0
        };
    }
}

