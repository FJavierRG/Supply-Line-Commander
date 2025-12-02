// ===== SISTEMA DE MOVIMIENTO DE FRENTES (SERVIDOR) =====
// Este sistema se ejecuta SOLO en el servidor
// El cliente solo renderiza las posiciones que el servidor envía

import { GAME_CONFIG } from '../../config/gameConfig.js';
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

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
        
        // Timer para verificación de victoria (1 vez por segundo)
        this.lastVictoryCheck = 0;
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
        
        // Verificar condiciones de victoria/derrota (solo cada 1 segundo)
        // Retorna resultado de victoria si la hay
        const currentTime = Date.now();
        if (currentTime - this.lastVictoryCheck >= 1000) {
            this.lastVictoryCheck = currentTime;
            return this.checkVictoryConditions(player1Fronts, player2Fronts);
        }
        
        return null;
    }

    /**
     * Obtiene la configuración del modo actual del frente
     * @param {Object} front - Frente
     * @returns {Object} Configuración del modo
     */
    getFrontModeConfig(front) {
        const modes = SERVER_NODE_CONFIG.gameplay.front.modes;
        return modes[front.frontMode] || modes.advance;
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
        
        // 🆕 SISTEMA DE MODOS: Obtener configuración del modo actual
        const modeConfig = this.getFrontModeConfig(front);
        
        let movement = 0;
        let inCollision = false;
        let reason = '';
        let isVoluntaryRetreat = false; // Para tracking de currency por retroceso voluntario
        
        // Verificar colisión con enemigo
        if (nearestEnemy && this.areInCollisionRange(front, nearestEnemy, direction)) {
            inCollision = true;
            
            // SONIDO: Primer contacto enemigo (solo una vez global)
            if (!this.gameState.hasPlayedEnemyContact) {
                this.gameState.addSoundEvent('enemy_contact');
                this.gameState.hasPlayedEnemyContact = true;
            }
            
            // 🆕 MODO HOLD (ANCLA): No puede ser empujado mientras tenga supplies > 0
            if (modeConfig.isAnchor && front.supplies > 0) {
                // HOLD con supplies: ancla inmóvil, no puede ser empujado
                movement = 0;
                reason = `HOLD-ANCLA (supplies: ${front.supplies.toFixed(0)})`;
            } else if (modeConfig.isAnchor && front.supplies === 0) {
                // HOLD SIN supplies: pierde ancla y retrocede
                movement = -this.retreatSpeed * dt * direction;
                reason = `HOLD-SIN-SUMINISTROS (retrocede)`;
                
                // SONIDO: No ammo
                if (!this.noAmmoSoundPlayed.has(front.id)) {
                    this.gameState.addSoundEvent('no_ammo', { frontId: front.id });
                    this.noAmmoSoundPlayed.add(front.id);
                }
            } else {
                // Comportamiento normal de colisión (modos ADVANCE y RETREAT en colisión)
                // Nota: RETREAT no puede colisionar normalmente porque va hacia atrás,
                // pero si el enemigo lo alcanza, se aplica la lógica de empuje
                
                // 🆕 FIX: Verificar si el enemigo está en modo HOLD (ancla)
                // Un ancla con supplies > 0 NO puede ser empujado, el atacante debe detenerse
                const enemyModeConfig = this.getFrontModeConfig(nearestEnemy);
                const enemyIsAnchor = enemyModeConfig.isAnchor && nearestEnemy.supplies > 0;
                
                // 🆕 FIX: PRIORIDAD - Retroceso automático cuando hay 0 recursos
                // Si este frente tiene 0 recursos, debe retroceder automáticamente
                // EXCEPTO si está siendo empujado activamente por un enemigo en modo ADVANCE
                if (front.supplies === 0) {
                    // Verificar si el enemigo está empujando activamente
                    // El enemigo solo empuja activamente si está en modo ADVANCE y tiene más recursos
                    const enemyIsActivelyPushing = enemyModeConfig.canAdvance && nearestEnemy.supplies > 0;
                    
                    if (!enemyIsActivelyPushing) {
                        // No está siendo empujado activamente → retrocede automáticamente
                        movement = -this.retreatSpeed * dt * direction;
                        reason = `RETROCEDE-AUTO (0 supplies, enemigo no empuja activamente)`;
                        
                        if (!this.noAmmoSoundPlayed.has(front.id)) {
                            this.gameState.addSoundEvent('no_ammo', { frontId: front.id });
                            this.noAmmoSoundPlayed.add(front.id);
                        }
                    } else {
                        // Está siendo empujado activamente → continuar con lógica de empuje
                        const pushSpeed = this.advanceSpeed;
                        movement = -pushSpeed * dt * direction;
                        reason = `EMPUJADO-ACTIVO (0 supplies, enemigo empuja)`;
                    }
                }
                // Si este frente NO tiene 0 recursos, aplicar lógica normal de empuje
                else if (enemyIsAnchor) {
                    // 🆕 El enemigo es un ANCLA - no se puede empujar, quedarse bloqueado
                    movement = 0;
                    reason = `BLOQUEADO POR ANCLA (enemigo en HOLD con ${nearestEnemy.supplies.toFixed(0)} supplies)`;
                }
                // EMPUJE: Comparar suministros (solo si el enemigo NO es ancla)
                else if (front.supplies > nearestEnemy.supplies) {
                    // Este frente tiene más → EMPUJA (si no está en modo retreat)
                    if (modeConfig.canAdvance) {
                        const pushSpeed = this.advanceSpeed;
                        movement = pushSpeed * dt * direction;
                        reason = `EMPUJA (${front.supplies.toFixed(0)} > ${nearestEnemy.supplies.toFixed(0)})`;
                    } else {
                        // En RETREAT durante colisión: no empuja, mantiene posición
                        movement = 0;
                        reason = `RETREAT-COLISION (${front.supplies.toFixed(0)})`;
                    }
                } else if (front.supplies < nearestEnemy.supplies) {
                    // Enemigo tiene más → ES EMPUJADO (solo si el enemigo está empujando activamente)
                    if (enemyModeConfig.canAdvance) {
                        const pushSpeed = this.advanceSpeed;
                        movement = -pushSpeed * dt * direction;
                        reason = `EMPUJADO (${front.supplies.toFixed(0)} < ${nearestEnemy.supplies.toFixed(0)})`;
                    } else {
                        // Enemigo tiene más recursos pero NO está empujando activamente (está en HOLD/RETREAT)
                        // Mantener posición según nuestro modo
                        if (modeConfig.canRetreat) {
                            movement = -this.retreatSpeed * dt * direction;
                            reason = `RETREAT-COLISION (enemigo no empuja)`;
                        } else {
                            movement = 0;
                            reason = `MANTIENE (enemigo no empuja activamente)`;
                        }
                    }
                } else {
                    // Recursos IGUALES
                    if (nearestEnemy.supplies === 0) {
                        // AMBOS sin recursos → AMBOS retroceden
                        movement = -this.retreatSpeed * dt * direction;
                        reason = `AMBOS SIN RECURSOS (retroceden)`;
                        
                        if (!this.noAmmoSoundPlayed.has(front.id)) {
                            this.gameState.addSoundEvent('no_ammo', { frontId: front.id });
                            this.noAmmoSoundPlayed.add(front.id);
                        }
                    } else {
                        // Recursos iguales pero > 0 → EMPATE
                        movement = 0;
                        reason = `EMPATE (${front.supplies.toFixed(0)} = ${nearestEnemy.supplies.toFixed(0)})`;
                    }
                }
            }
        } else {
            // SIN COLISIÓN: Movimiento según modo
            
            // 🆕 MODO HOLD (sin colisión)
            if (modeConfig.isAnchor) {
                if (front.supplies > 0) {
                    // HOLD con supplies: inmóvil
                    movement = 0;
                    reason = `HOLD (supplies: ${front.supplies.toFixed(0)})`;
                    
                    if (this.noAmmoSoundPlayed.has(front.id)) {
                        this.noAmmoSoundPlayed.delete(front.id);
                    }
                } else {
                    // HOLD SIN supplies: pierde ancla y retrocede
                    movement = -this.retreatSpeed * dt * direction;
                    reason = `HOLD-SIN-SUMINISTROS (retrocede)`;
                    
                    if (!this.noAmmoSoundPlayed.has(front.id)) {
                        this.gameState.addSoundEvent('no_ammo', { frontId: front.id });
                        this.noAmmoSoundPlayed.add(front.id);
                    }
                }
            }
            // 🆕 MODO RETREAT (sin colisión)
            else if (modeConfig.canRetreat) {
                if (front.supplies > 0) {
                    // RETREAT con supplies: retrocede voluntariamente
                    movement = -this.retreatSpeed * dt * direction;
                    reason = `RETREAT (supplies: ${front.supplies.toFixed(0)})`;
                    isVoluntaryRetreat = true; // Marca para ganar currency
                    
                    if (this.noAmmoSoundPlayed.has(front.id)) {
                        this.noAmmoSoundPlayed.delete(front.id);
                    }
                } else {
                    // RETREAT SIN supplies: retrocede igual
                    movement = -this.retreatSpeed * dt * direction;
                    reason = `RETREAT-SIN-SUMINISTROS (retrocede)`;
                    
                    if (!this.noAmmoSoundPlayed.has(front.id)) {
                        this.gameState.addSoundEvent('no_ammo', { frontId: front.id });
                        this.noAmmoSoundPlayed.add(front.id);
                    }
                }
            }
            // 🆕 MODO ADVANCE (comportamiento original)
            else if (modeConfig.canAdvance) {
                if (front.supplies > 0) {
                    // Avanzar
                    movement = this.advanceSpeed * dt * direction;
                    reason = `AVANZA (supplies: ${front.supplies.toFixed(0)})`;
                    
                    if (this.noAmmoSoundPlayed.has(front.id)) {
                        this.noAmmoSoundPlayed.delete(front.id);
                    }
                } else {
                    // Sin recursos: retrocede
                    movement = -this.retreatSpeed * dt * direction;
                    reason = `RETROCEDE (sin supplies)`;
                    
                    if (!this.noAmmoSoundPlayed.has(front.id)) {
                        this.gameState.addSoundEvent('no_ammo', { frontId: front.id });
                        this.noAmmoSoundPlayed.add(front.id);
                    }
                }
            }
        }
        
        // Aplicar movimiento
        front.x += movement;
        
        // Trackear movimiento para currency
        if (direction === 1) {
            // Player1: avanza a la derecha (+X)
            if (!front.maxXReached) front.maxXReached = front.x;
            
            if (front.x < front.maxXReached) {
                // Retrocedió
                if (isVoluntaryRetreat) {
                    // 🆕 RETREAT: Ganar currency por retroceso voluntario
                    const pixelsRetreated = front.maxXReached - front.x;
                    this.awardCurrencyForRetreat('player1', pixelsRetreated, front);
                }
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
            
            if (front.x > front.minXReached) {
                // Retrocedió
                if (isVoluntaryRetreat) {
                    // 🆕 RETREAT: Ganar currency por retroceso voluntario
                    const pixelsRetreated = front.x - front.minXReached;
                    this.awardCurrencyForRetreat('player2', pixelsRetreated, front);
                }
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
        
        // 🆕 SISTEMA DE MODOS: Solo el modo ADVANCE gana currency por avance normal
        const modeConfig = front ? this.getFrontModeConfig(front) : null;
        const currencyMultiplier = modeConfig ? modeConfig.currencyMultiplier : 1.0;
        
        // Si el multiplicador es 0 (modo HOLD), no otorgar currency
        if (currencyMultiplier === 0) return;
        
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
            
            // 🆕 Aplicar multiplicador del modo (normalmente 1.0 para ADVANCE)
            finalCurrencyToAward = Math.floor(finalCurrencyToAward * currencyMultiplier);
            
            this.gameState.currency[team] += finalCurrencyToAward;
            this.pendingCurrencyPixels[team] -= currencyToAward * GAME_CONFIG.currency.pixelsPerCurrency;
            
            // Log solo cada 50$ para no spamear (o si hay bonus de trained)
            if (finalCurrencyToAward >= 50 || (front && front.effects?.some(e => e.type === 'trained'))) {
                console.log(`📈 ${team}: +${finalCurrencyToAward}$ por avance de frente (total: ${this.gameState.currency[team]}$)`);
            }
        }
    }

    /**
     * 🆕 Otorga currency por retroceso VOLUNTARIO de frentes (modo RETREAT)
     * @param {string} team - Equipo del jugador ('player1' o 'player2')
     * @param {number} pixelsRetreated - Píxeles retrocedidos voluntariamente
     * @param {Object} front - Frente que está retrocediendo
     */
    awardCurrencyForRetreat(team, pixelsRetreated, front) {
        if (pixelsRetreated <= 0 || !front) return;
        
        // Obtener configuración del modo RETREAT
        const modeConfig = this.getFrontModeConfig(front);
        const currencyMultiplier = modeConfig.currencyMultiplier; // 0.75 para RETREAT
        
        // Si no está en modo retreat o multiplicador es 0, no otorgar
        if (!modeConfig.canRetreat || currencyMultiplier === 0) return;
        
        // Inicializar acumulador de retroceso si no existe
        if (!this.pendingRetreatPixels) {
            this.pendingRetreatPixels = { player1: 0, player2: 0 };
        }
        
        // Acumular pixels de retroceso
        this.pendingRetreatPixels[team] += pixelsRetreated;
        
        // Convertir a currency base (sin multiplicador todavía)
        const baseCurrency = Math.floor(this.pendingRetreatPixels[team] / GAME_CONFIG.currency.pixelsPerCurrency);
        
        if (baseCurrency > 0) {
            // Aplicar multiplicador del modo RETREAT (75%)
            const currencyToAward = Math.floor(baseCurrency * currencyMultiplier);
            
            if (currencyToAward > 0) {
                this.gameState.currency[team] += currencyToAward;
                this.pendingRetreatPixels[team] -= baseCurrency * GAME_CONFIG.currency.pixelsPerCurrency;
                
                // Log para retrocesos significativos
                if (currencyToAward >= 10) {
                    console.log(`🔙 ${team}: +${currencyToAward}$ por retroceso voluntario (75% de ${baseCurrency}$) - total: ${this.gameState.currency[team]}$`);
                }
            }
        }
    }

    /**
     * Verificar condiciones de victoria/derrota
     * Ganas si empujas algún nodo de frente enemigo hasta la línea de victoria
     * @param {Array} player1Fronts - Frentes de player1
     * @param {Array} player2Fronts - Frentes de player2
     */
    checkVictoryConditions(player1Fronts, player2Fronts) {
        // Calcular líneas de victoria desde config (no hardcodear)
        const worldWidth = GAME_CONFIG.match.worldWidth;
        const victoryLineLeft = GAME_CONFIG.match.victoryLineLeft * worldWidth;  // 15% del ancho
        const victoryLineRight = GAME_CONFIG.match.victoryLineRight * worldWidth; // 85% del ancho
        
        // Player1 gana si empujó algún frente de player2 hasta la línea derecha (85%)
        for (const enemyFront of player2Fronts) {
            if (enemyFront.x >= victoryLineRight) {
                console.log(`🎉 VICTORIA PLAYER1: Empujó frente enemigo hasta línea de victoria (${victoryLineRight.toFixed(0)}px = ${(GAME_CONFIG.match.victoryLineRight * 100)}%)`);
                console.log(`   Frente enemigo en: ${enemyFront.x.toFixed(0)}px (Y=${enemyFront.y.toFixed(0)})`);
                return { winner: 'player1', reason: 'enemy_front_pushed' };
            }
        }
        
        // Player2 gana si empujó algún frente de player1 hasta la línea izquierda (15%)
        for (const enemyFront of player1Fronts) {
            if (enemyFront.x <= victoryLineLeft) {
                console.log(`🎉 VICTORIA PLAYER2: Empujó frente enemigo hasta línea de victoria (${victoryLineLeft.toFixed(0)}px = ${(GAME_CONFIG.match.victoryLineLeft * 100)}%)`);
                console.log(`   Frente enemigo en: ${enemyFront.x.toFixed(0)}px (Y=${enemyFront.y.toFixed(0)})`);
                return { winner: 'player2', reason: 'enemy_front_pushed' };
            }
        }
        
        return null; // No hay victoria aún
    }

    reset() {
        this.pendingCurrencyPixels = {
            player1: 0,
            player2: 0
        };
        // 🆕 Reset acumulador de retroceso voluntario
        this.pendingRetreatPixels = {
            player1: 0,
            player2: 0
        };
    }
}

