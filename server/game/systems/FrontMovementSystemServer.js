// ═══════════════════════════════════════════════════════════════════════════
// ===== SISTEMA DE MOVIMIENTO DE FRENTES (SERVIDOR) =====
// ═══════════════════════════════════════════════════════════════════════════
//
// Este sistema se ejecuta SOLO en el servidor.
// El cliente solo renderiza las posiciones que el servidor envía.
//
// ───────────────────────────────────────────────────────────────────────────
// 📋 REGLAS DE COMPORTAMIENTO POR MODO
// ───────────────────────────────────────────────────────────────────────────
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ MODO ADVANCE (Avanzar) - Comportamiento ofensivo                        │
// └─────────────────────────────────────────────────────────────────────────┘
//   Sin colisión:
//     • Con supplies > 0  → Avanza hacia adelante
//     • Sin supplies (=0) → Retrocede automáticamente
//
//   Con colisión:
//     • Más supplies que enemigo     → Empuja al enemigo
//     • Menos supplies que enemigo   → Es empujado por el enemigo
//     • Supplies iguales (>0)        → Empate (ambos quietos)
//     • Ambos sin supplies           → Ambos retroceden
//     • Enemigo es ancla (HOLD)      → Bloqueado (no puede empujar)
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ MODO RETREAT (Retroceder) - Retroceso estratégico                       │
// └─────────────────────────────────────────────────────────────────────────┘
//   Sin colisión:
//     • SIEMPRE retrocede (con o sin supplies)
//     • Gana currency por retroceso voluntario (75% del valor de avance)
//
//   Con colisión:
//     • SIEMPRE retrocede (ignora comparación de supplies)
//     • Excepción: Si el enemigo lo empuja MÁS RÁPIDO hacia atrás,
//                  usa la velocidad del enemigo
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ MODO HOLD (Mantener) - Defensa estática / Ancla                         │
// └─────────────────────────────────────────────────────────────────────────┘
//   Sin colisión:
//     • Con supplies > 0  → Inmóvil (ancla)
//     • Sin supplies (=0) → Pierde ancla, retrocede
//
//   Con colisión:
//     • Con supplies > 0  → ANCLA INMÓVIL (no puede ser empujado)
//     • Sin supplies (=0) → Pierde ancla, es empujado/retrocede
//
// ───────────────────────────────────────────────────────────────────────────
// 🏗️ ARQUITECTURA DEL SISTEMA
// ───────────────────────────────────────────────────────────────────────────
//
// El sistema está diseñado con arquitectura de "Intención + Fuerzas Externas":
//
//   1. INTENCIÓN: Cada frente tiene una "voluntad" según su modo
//      → getIntendedMovement(front, direction, dt)
//
//   2. FUERZAS EXTERNAS: Las colisiones pueden anular la intención
//      → canFrontPush(pusher, pushed)
//      → calculateCollisionForce(pusher, pushed, direction, dt)
//
//   3. RESOLUCIÓN: Se combina intención + fuerzas para movimiento final
//      → updateFrontMovement(front, enemyFronts, direction, dt)
//
// Esta arquitectura facilita extender el sistema con nuevos modos o
// modificadores (disciplinas, efectos temporales, etc.).
//
// ───────────────────────────────────────────────────────────────────────────
// 🎯 CONDICIONES DE VICTORIA
// ───────────────────────────────────────────────────────────────────────────
//
// Un equipo gana cuando:
//   • Uno de sus frentes alcanza el HQ enemigo (empuja hasta la base)
//   • El frente enemigo retrocede más allá de su HQ
//
// ═══════════════════════════════════════════════════════════════════════════

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
     * 🆕 Aplica modificadores de disciplinas activas a la velocidad de avance
     * @param {Object} front - Frente
     * @param {number} baseSpeed - Velocidad base de avance
     * @returns {number} Velocidad con modificadores aplicados
     */
    applyDisciplineModifiers(front, baseSpeed) {
        // Obtener modificadores de la disciplina activa del jugador
        const modifiers = this.gameState.disciplineManager.getModifiersForSystem(front.team, 'frontMode');
        
        // Verificar si hay efectos de modo de frente y si el frente está en el modo correcto
        if (modifiers.targetMode && modifiers.targetMode === front.frontMode) {
            // Aplicar multiplicador de velocidad de avance (si existe)
            if (modifiers.advanceSpeedMultiplier) {
                baseSpeed *= modifiers.advanceSpeedMultiplier;
            }
        }
        
        return baseSpeed;
    }

    // ═══════════════════════════════════════════════════════════════
    // 🏗️ FUNCIONES BASE DEL SISTEMA
    // ═══════════════════════════════════════════════════════════════
    // Estas funciones implementan la arquitectura de "Intención + Fuerzas"
    // y facilitan la extensibilidad del sistema.
    // ═══════════════════════════════════════════════════════════════

    /**
     * ✅ FASE 1.4: Verifica si un frente es un ancla inmóvil
     * Un frente es ancla si está en modo HOLD (independientemente de supplies)
     * @param {Object} front - Frente a verificar
     * @returns {boolean} True si es ancla
     */
    isAnchor(front) {
        const modeConfig = this.getFrontModeConfig(front);
        return modeConfig.isAnchor; // HOLD siempre es ancla, con o sin supplies
    }

    /**
     * 🔊 Helper: Maneja el sonido de "no ammo" para un frente
     * Solo se reproduce una vez por frente hasta que recupere supplies
     * @param {Object} front - Frente sin supplies
     */
    handleNoAmmoSound(front) {
        if (!this.noAmmoSoundPlayed.has(front.id)) {
            this.gameState.addSoundEvent('no_ammo', { frontId: front.id });
            this.noAmmoSoundPlayed.add(front.id);
        }
    }

    /**
     * ✅ FASE 1.1: Calcula el movimiento que QUIERE hacer el frente (sin considerar colisiones)
     * Esta es la "intención" del frente según su modo
     * @param {Object} front - Frente
     * @param {number} direction - Dirección de avance (+1 derecha, -1 izquierda)
     * @param {number} dt - Delta time en segundos
     * @returns {Object} { movement: number, reason: string, isVoluntaryRetreat: boolean }
     */
    getIntendedMovement(front, direction, dt) {
        const modeConfig = this.getFrontModeConfig(front);
        let movement = 0;
        let reason = '';
        let isVoluntaryRetreat = false;

        // MODO HOLD: Ancla defensiva - SIEMPRE quieto (con o sin supplies)
        if (modeConfig.isAnchor) {
            movement = 0;
            if (front.supplies > 0) {
                reason = `HOLD (supplies: ${front.supplies.toFixed(0)})`;
            } else {
                reason = `HOLD-SIN-SUMINISTROS (quieto)`;
            }
        }
        // MODO RETREAT: Retroceso voluntario
        else if (modeConfig.canRetreat) {
            // Retrocede SIEMPRE (con o sin supplies)
            movement = -this.retreatSpeed * dt * direction;
            if (front.supplies > 0) {
                reason = `RETREAT (supplies: ${front.supplies.toFixed(0)})`;
                isVoluntaryRetreat = true; // Marca para ganar currency
            } else {
                reason = `RETREAT-SIN-SUMINISTROS (retrocede)`;
            }
        }
        // MODO ADVANCE: Comportamiento por defecto
        else if (modeConfig.canAdvance) {
            if (front.supplies > 0) {
                // Con supplies: avanza
                let advanceSpeed = this.advanceSpeed;
                advanceSpeed = this.applyDisciplineModifiers(front, advanceSpeed);
                movement = advanceSpeed * dt * direction;
                reason = `AVANZA (supplies: ${front.supplies.toFixed(0)})`;
            } else {
                // Sin supplies: retrocede
                movement = -this.retreatSpeed * dt * direction;
                reason = `RETROCEDE (sin supplies)`;
            }
        }

        return { movement, reason, isVoluntaryRetreat };
    }

    /**
     * ✅ FASE 1.2: Verifica si un frente PUEDE empujar a otro
     * Solo puede empujar si:
     * 1. Está en modo ADVANCE
     * 2. Tiene más supplies que el enemigo
     * 3. El enemigo NO está en modo HOLD (ancla)
     * @param {Object} pusher - Frente que intenta empujar
     * @param {Object} pushed - Frente que podría ser empujado
     * @returns {boolean} True si puede empujar
     */
    canFrontPush(pusher, pushed) {
        const pusherMode = this.getFrontModeConfig(pusher);
        
        // Solo puede empujar en modo ADVANCE
        if (!pusherMode.canAdvance) {
            return false;
        }
        
        // No puede empujar si el enemigo está en modo HOLD (ancla inmóvil)
        if (this.isAnchor(pushed)) {
            return false;
        }
        
        // Debe tener más supplies que el enemigo
        return pusher.supplies > pushed.supplies;
    }

    /**
     * ✅ FASE 1.3: Calcula la fuerza de empuje que ejerce un frente sobre otro
     * Retorna la velocidad de movimiento resultante (puede ser 0)
     * @param {Object} pusher - Frente que empuja
     * @param {Object} pushed - Frente empujado
     * @param {number} direction - Dirección del frente empujado (+1 derecha, -1 izquierda)
     * @param {number} dt - Delta time en segundos
     * @returns {number} Velocidad de movimiento (positiva = avanza, negativa = retrocede)
     */
    calculateCollisionForce(pusher, pushed, direction, dt) {
        // Si el empujador puede empujar al empujado
        if (this.canFrontPush(pusher, pushed)) {
            // Usar velocidad del empujador (con sus modificadores)
            let pushSpeed = this.advanceSpeed;
            pushSpeed = this.applyDisciplineModifiers(pusher, pushSpeed);
            // El empujado retrocede (signo negativo)
            return -pushSpeed * dt * direction;
        }
        
        // No hay fuerza de empuje
        return 0;
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎮 LÓGICA PRINCIPAL DE MOVIMIENTO
    // ═══════════════════════════════════════════════════════════════

    /**
     * ✅ REFACTORIZADO: Actualizar movimiento de un frente
     * Nueva arquitectura: Intención + Fuerzas Externas + Resolución
     * @param {Object} front - Frente a actualizar
     * @param {Array} enemyFronts - Frentes del equipo opuesto
     * @param {number} direction - Dirección de avance (+1 derecha, -1 izquierda)
     * @param {number} dt - Delta time en segundos
     */
    updateFrontMovement(front, enemyFronts, direction, dt) {
        // Buscar frente enemigo más cercano verticalmente
        const nearestEnemy = this.findNearestEnemyFrontVertical(front, enemyFronts);
        const modeConfig = this.getFrontModeConfig(front);
        
        let movement = 0;
        let reason = '';
        let isVoluntaryRetreat = false;
        
        // ═══════════════════════════════════════════════════════════════
        // PASO 1: ¿HAY COLISIÓN CON ENEMIGO?
        // ═══════════════════════════════════════════════════════════════
        const inCollision = nearestEnemy && this.areInCollisionRange(front, nearestEnemy, direction);
        
        if (inCollision) {
            // SONIDO: Primer contacto enemigo (solo una vez global)
            if (!this.gameState.hasPlayedEnemyContact) {
                this.gameState.addSoundEvent('enemy_contact');
                this.gameState.hasPlayedEnemyContact = true;
            }
            
            // ═══════════════════════════════════════════════════════════════
            // PASO 2: RESOLVER COLISIÓN
            // ═══════════════════════════════════════════════════════════════
            
            // CASO A: Este frente es ANCLA (modo HOLD) - siempre quieto
            if (this.isAnchor(front)) {
                movement = 0;
                if (front.supplies > 0) {
                    reason = `HOLD-ANCLA (supplies: ${front.supplies.toFixed(0)})`;
                } else {
                    reason = `HOLD-SIN-SUMINISTROS (quieto)`;
                    this.handleNoAmmoSound(front);
                }
            }
            
            // CASO B: Este frente NO tiene supplies y NO es HOLD (retrocede automáticamente)
            else if (front.supplies === 0) {
                // Verificar si el enemigo lo está empujando activamente
                const enemyPushForce = this.calculateCollisionForce(nearestEnemy, front, direction, dt);
                
                if (enemyPushForce !== 0) {
                    // El enemigo lo empuja → usar su velocidad
                    movement = enemyPushForce;
                    reason = `EMPUJADO-SIN-SUPPLIES (0 supplies)`;
                } else {
                    // El enemigo NO empuja → retrocede automáticamente
                    movement = -this.retreatSpeed * dt * direction;
                    reason = `RETROCEDE-AUTO (0 supplies)`;
                }
                this.handleNoAmmoSound(front);
            }
            
            // CASO D: Este frente está en modo RETREAT 🔧 BUG FIX
            else if (modeConfig.canRetreat) {
                // ✅ RETREAT SIEMPRE retrocede, ignorando comparación de supplies
                movement = -this.retreatSpeed * dt * direction;
                reason = `RETREAT-COLISION (retrocede, supplies: ${front.supplies.toFixed(0)})`;
                isVoluntaryRetreat = true;
                
                // EXCEPCIÓN: Si el enemigo lo empuja MÁS RÁPIDO hacia atrás, usar esa velocidad
                const enemyPushForce = this.calculateCollisionForce(nearestEnemy, front, direction, dt);
                if (enemyPushForce < movement) { // Más negativo = más rápido hacia atrás
                    movement = enemyPushForce;
                    reason = `RETREAT-EMPUJADO (enemigo empuja más rápido)`;
                }
            }
            
            // CASO E: El enemigo es ANCLA (no se puede empujar)
            else if (this.isAnchor(nearestEnemy)) {
                    movement = 0;
                reason = `BLOQUEADO POR ANCLA (enemigo: ${nearestEnemy.supplies.toFixed(0)})`;
            }
            
            // CASO F: Este frente PUEDE empujar al enemigo
            else if (this.canFrontPush(front, nearestEnemy)) {
                        let pushSpeed = this.advanceSpeed;
                        pushSpeed = this.applyDisciplineModifiers(front, pushSpeed);
                        movement = pushSpeed * dt * direction;
                        reason = `EMPUJA (${front.supplies.toFixed(0)} > ${nearestEnemy.supplies.toFixed(0)})`;
            }
            
            // CASO G: El enemigo PUEDE empujar a este frente
            else if (this.canFrontPush(nearestEnemy, front)) {
                const enemyPushForce = this.calculateCollisionForce(nearestEnemy, front, direction, dt);
                movement = enemyPushForce;
                reason = `EMPUJADO (${front.supplies.toFixed(0)} < ${nearestEnemy.supplies.toFixed(0)})`;
            }
            
            // CASO H: EMPATE (mismo supplies > 0)
            else if (front.supplies === nearestEnemy.supplies && front.supplies > 0) {
                        movement = 0;
                        reason = `EMPATE (${front.supplies.toFixed(0)} = ${nearestEnemy.supplies.toFixed(0)})`;
            }
            
            // CASO I: AMBOS sin supplies
            else if (front.supplies === 0 && nearestEnemy.supplies === 0) {
                    movement = -this.retreatSpeed * dt * direction;
                reason = `AMBOS SIN RECURSOS (retroceden)`;
                this.handleNoAmmoSound(front);
            }
            
            // CASO J: Mantener posición (fallback)
            else {
                movement = 0;
                reason = `MANTIENE (sin condiciones de movimiento)`;
            }
        } 
        // ═══════════════════════════════════════════════════════════════
        // PASO 3: SIN COLISIÓN - MOVIMIENTO LIBRE SEGÚN INTENCIÓN
        // ═══════════════════════════════════════════════════════════════
        else {
            const intention = this.getIntendedMovement(front, direction, dt);
            movement = intention.movement;
            reason = intention.reason;
            isVoluntaryRetreat = intention.isVoluntaryRetreat;
            
            // Manejar sonidos según el caso
            if (front.supplies === 0) {
                this.handleNoAmmoSound(front);
            } else {
                // Limpiar flag de sonido si tiene supplies
                    if (this.noAmmoSoundPlayed.has(front.id)) {
                        this.noAmmoSoundPlayed.delete(front.id);
                }
            }
        }
        
        // Aplicar movimiento
        front.x += movement;
        
        // Trackear movimiento para currency (delegado a función helper)
        this.trackCurrencyForMovement(front, direction, isVoluntaryRetreat);
    }

    /**
     * 📊 Helper: Trackea el movimiento del frente y otorga currency por avance/retroceso
     * Centraliza la lógica de tracking que antes estaba duplicada
     * @param {Object} front - Frente que se movió
     * @param {number} direction - Dirección (+1 derecha, -1 izquierda)
     * @param {boolean} isVoluntaryRetreat - Si es retroceso voluntario (para currency)
     */
    trackCurrencyForMovement(front, direction, isVoluntaryRetreat) {
        const team = front.team;
        
        if (direction === 1) {
            // Player1: avanza a la derecha (+X)
            if (!front.maxXReached) front.maxXReached = front.x;
            
            if (front.x < front.maxXReached) {
                // Retrocedió
                if (isVoluntaryRetreat) {
                    const pixelsRetreated = front.maxXReached - front.x;
                    this.awardCurrencyForRetreat(team, pixelsRetreated, front);
                }
                front.maxXReached = front.x;
            } else if (front.x > front.maxXReached) {
                // Avanzó
                const pixelsGained = front.x - front.maxXReached;
                front.maxXReached = front.x;
                this.awardCurrencyForAdvance(team, pixelsGained, front);
            }
        } else {
            // Player2: avanza a la izquierda (-X)
            if (!front.minXReached) front.minXReached = front.x;
            
            if (front.x > front.minXReached) {
                // Retrocedió
                if (isVoluntaryRetreat) {
                    const pixelsRetreated = front.x - front.minXReached;
                    this.awardCurrencyForRetreat(team, pixelsRetreated, front);
                }
                front.minXReached = front.x;
            } else if (front.x < front.minXReached) {
                // Avanzó
                const pixelsGained = front.minXReached - front.x;
                front.minXReached = front.x;
                this.awardCurrencyForAdvance(team, pixelsGained, front);
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
                }
            }
            
            // 🆕 Aplicar multiplicador del modo (normalmente 1.0 para ADVANCE)
            finalCurrencyToAward = Math.floor(finalCurrencyToAward * currencyMultiplier);
            
            this.gameState.currency[team] += finalCurrencyToAward;
            // 🔧 FIX: También sumar al total generado para estadísticas
            if (this.gameState.currencyGenerated) {
                this.gameState.currencyGenerated[team] += finalCurrencyToAward;
            }
            this.pendingCurrencyPixels[team] -= currencyToAward * GAME_CONFIG.currency.pixelsPerCurrency;
            
            // 🆕 NUEVO: Emitir evento al cliente para mostrar texto flotante
            if (front && finalCurrencyToAward > 0) {
                if (this.gameState.addVisualEvent) {
                    this.gameState.addVisualEvent('front_currency_gained', {
                        frontId: front.id,
                        team: team,
                        amount: finalCurrencyToAward,
                        x: front.x,
                        y: front.y,
                        mode: front.frontMode || 'advance'
                    });
                }
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
                // 🔧 FIX: También sumar al total generado para estadísticas
                if (this.gameState.currencyGenerated) {
                    this.gameState.currencyGenerated[team] += currencyToAward;
                }
                this.pendingRetreatPixels[team] -= baseCurrency * GAME_CONFIG.currency.pixelsPerCurrency;
                
                // 🆕 NUEVO: Emitir evento al cliente para mostrar texto flotante
                if (front && currencyToAward > 0) {
                    if (this.gameState.addVisualEvent) {
                        this.gameState.addVisualEvent('front_currency_gained', {
                            frontId: front.id,
                            team: team,
                            amount: currencyToAward,
                            x: front.x,
                            y: front.y,
                            mode: front.frontMode || 'retreat'
                        });
                    }
                }
                
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

