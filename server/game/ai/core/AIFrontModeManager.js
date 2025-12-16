// ===== GESTOR DE MODOS DE FRENTE PARA IA =====
// Gestiona las decisiones de cambio de modo (ADVANCE, RETREAT, HOLD) para los frentes de la IA
//
// LÓGICA DE DECISIÓN:
// - ADVANCE: Cuando tiene más supplies que el enemigo → empujar y ganar terreno/currency
// - RETREAT: Cuando el enemigo tiene más supplies → retroceder voluntariamente y ganar currency (75%)
// - HOLD: Cuando necesita ganar tiempo → ancla defensiva que bloquea avance enemigo
//
// FACTOR DIFICULTAD:
// - Easy: 60% de tomar decisión óptima, 3s de delay
// - Medium: 80% de tomar decisión óptima, 1.5s de delay
// - Hard: 95% de tomar decisión óptima, 0.5s de delay

import AIConfig from '../config/AIConfig.js';

export class AIFrontModeManager {
    constructor(gameState, difficulty) {
        this.gameState = gameState;
        this.difficulty = difficulty;
        
        // Timer para evaluaciones periódicas
        this.evaluationTimer = 0;
        
        // Decisiones pendientes (con delay por dificultad)
        this.pendingDecisions = []; // { executeAt, frontId, newMode }
        
        // Cache de último modo por frente (para evitar spam de logs)
        this.lastModeByFront = new Map();
    }
    
    /**
     * Actualiza el gestor de modos de frente
     * @param {number} dt - Delta time en segundos
     */
    update(dt) {
        const team = 'player2';
        const config = AIConfig.frontModes;
        
        // 1. Procesar decisiones pendientes (con delay)
        this.processPendingDecisions();
        
        // 2. Evaluación periódica de frentes
        this.evaluationTimer += dt;
        if (this.evaluationTimer >= config.evaluationInterval) {
            this.evaluationTimer = 0;
            this.evaluateFronts(team);
        }
    }
    
    /**
     * Evalúa todos los frentes de la IA y decide si cambiar de modo
     * @param {string} team - Equipo de la IA
     */
    evaluateFronts(team) {
        const myFronts = this.gameState.nodes.filter(n => 
            n.team === team && 
            n.type === 'front' && 
            n.active
        );
        
        const enemyFronts = this.gameState.nodes.filter(n => 
            n.team !== team && 
            n.type === 'front' && 
            n.active
        );
        
        if (myFronts.length === 0) return;
        
        for (const front of myFronts) {
            // Encontrar el frente enemigo más cercano (en Y)
            const nearestEnemy = this.findNearestEnemyFront(front, enemyFronts);
            
            // Calcular el modo óptimo
            const optimalMode = this.calculateOptimalMode(front, nearestEnemy);
            
            // Si el modo óptimo es diferente al actual, programar cambio
            if (optimalMode && optimalMode !== front.frontMode) {
                this.scheduleDecision(front, optimalMode);
            }
        }
    }
    
    /**
     * Encuentra el frente enemigo más cercano (por distancia Y)
     * @param {Object} myFront - Frente propio
     * @param {Array} enemyFronts - Lista de frentes enemigos
     * @returns {Object|null} Frente enemigo más cercano
     */
    findNearestEnemyFront(myFront, enemyFronts) {
        if (enemyFronts.length === 0) return null;
        
        let nearest = null;
        let minDistanceY = Infinity;
        
        for (const enemy of enemyFronts) {
            const distanceY = Math.abs(enemy.y - myFront.y);
            if (distanceY < minDistanceY) {
                minDistanceY = distanceY;
                nearest = enemy;
            }
        }
        
        return nearest;
    }
    
    /**
     * Calcula el modo óptimo para un frente dado el contexto
     * @param {Object} myFront - Frente propio
     * @param {Object|null} enemyFront - Frente enemigo más cercano
     * @returns {string|null} Modo óptimo ('advance', 'retreat', 'hold') o null si no hay cambio
     */
    calculateOptimalMode(myFront, enemyFront) {
        const config = AIConfig.frontModes;
        const thresholds = config.thresholds;
        
        // Si no hay enemigo cercano, avanzar
        if (!enemyFront) {
            return 'advance';
        }
        
        // Calcular ratio de supplies
        const mySupplies = myFront.supplies || 0;
        const enemySupplies = enemyFront.supplies || 0;
        
        // Evitar división por cero
        if (enemySupplies === 0) {
            // Enemigo sin supplies → avanzar para empujarlo
            return mySupplies > 0 ? 'advance' : 'retreat';
        }
        
        const supplyRatio = mySupplies / enemySupplies;
        
        // LÓGICA DE DECISIÓN:
        
        // 1. Si tenemos mucho más que el enemigo → ADVANCE (empujar)
        if (supplyRatio >= thresholds.advanceWhenAhead) {
            return 'advance';
        }
        
        // 2. Si tenemos mucho menos que el enemigo → RETREAT (ganar currency retrocediendo)
        if (supplyRatio <= thresholds.retreatWhenBehind) {
            // Caso especial: si estamos muy bajo (< holdWhenDefending), considerar HOLD
            if (supplyRatio <= thresholds.holdWhenDefending && mySupplies > 0) {
                // HOLD para ganar tiempo si tenemos algo de supplies
                // Esto evita que nos empujen mientras esperamos reabastecimiento
                return 'hold';
            }
            return 'retreat';
        }
        
        // 3. En zona neutral (entre 0.7 y 1.2) → mantener modo actual o ADVANCE por defecto
        // Si estamos en RETREAT o HOLD sin necesidad, volver a ADVANCE
        if (myFront.frontMode === 'retreat' || myFront.frontMode === 'hold') {
            return 'advance';
        }
        
        // Mantener modo actual (no cambiar)
        return null;
    }
    
    /**
     * Programa una decisión de cambio de modo (con delay por dificultad)
     * @param {Object} front - Frente a cambiar
     * @param {string} newMode - Nuevo modo
     */
    scheduleDecision(front, newMode) {
        const config = AIConfig.frontModes;
        const difficultyMods = config.difficultyModifiers[this.difficulty] || config.difficultyModifiers.medium;
        
        // Aplicar probabilidad de tomar decisión correcta
        const roll = Math.random();
        if (roll > difficultyMods.decisionAccuracy) {
            // Falló la decisión → no hacer nada (error humano)
            if (AIConfig.debug?.logActions) {
                console.log(`🎲 IA FrontMode: Decisión fallida (${(roll * 100).toFixed(1)}% > ${(difficultyMods.decisionAccuracy * 100).toFixed(1)}%)`);
            }
            return;
        }
        
        // Verificar si ya hay una decisión pendiente para este frente
        const existingDecision = this.pendingDecisions.find(d => d.frontId === front.id);
        if (existingDecision) {
            // Ya hay una decisión pendiente, no duplicar
            return;
        }
        
        // Calcular tiempo de ejecución (con delay por dificultad)
        const gameTime = this.gameState.gameTime || 0;
        const executeAt = gameTime + difficultyMods.reactionDelay;
        
        this.pendingDecisions.push({
            executeAt,
            frontId: front.id,
            newMode,
            currentMode: front.frontMode
        });
        
        if (AIConfig.debug?.logActions) {
            console.log(`⏱️ IA FrontMode: Decisión programada - frente ${front.id.substring(0, 8)} → ${newMode} (ejecutar en ${difficultyMods.reactionDelay}s)`);
        }
    }
    
    /**
     * Procesa las decisiones pendientes que ya deben ejecutarse
     */
    processPendingDecisions() {
        if (this.pendingDecisions.length === 0) return;
        
        const gameTime = this.gameState.gameTime || 0;
        const team = 'player2';
        
        // Filtrar decisiones que ya deben ejecutarse
        const decisionsToExecute = this.pendingDecisions.filter(d => gameTime >= d.executeAt);
        
        // Eliminar las decisiones que vamos a ejecutar
        this.pendingDecisions = this.pendingDecisions.filter(d => gameTime < d.executeAt);
        
        // Ejecutar cada decisión
        for (const decision of decisionsToExecute) {
            this.executeDecision(team, decision);
        }
    }
    
    /**
     * Ejecuta una decisión de cambio de modo
     * @param {string} team - Equipo de la IA
     * @param {Object} decision - Decisión a ejecutar { frontId, newMode, currentMode }
     */
    executeDecision(team, decision) {
        const { frontId, newMode, currentMode } = decision;
        
        // Verificar que el frente aún existe y está activo
        const front = this.gameState.nodes.find(n => 
            n.id === frontId && 
            n.team === team && 
            n.type === 'front' && 
            n.active
        );
        
        if (!front) {
            // Frente ya no existe
            return;
        }
        
        // Verificar que el modo no haya cambiado mientras esperábamos
        if (front.frontMode !== currentMode) {
            // El modo ya cambió (probablemente por otra razón), cancelar
            return;
        }
        
        // 🎯 LLAMAR AL MISMO HANDLER QUE USA EL JUGADOR
        const result = this.gameState.handleFrontModeChange(team, frontId, newMode);
        
        if (result.success) {
            console.log(`🎮 IA FrontMode: Frente ${frontId.substring(0, 8)} cambió ${currentMode} → ${newMode}`);
            this.lastModeByFront.set(frontId, newMode);
        } else {
            // Falló (probablemente cooldown)
            if (AIConfig.debug?.logActions) {
                console.log(`❌ IA FrontMode: Fallo al cambiar modo - ${result.reason}`);
            }
        }
    }
    
    /**
     * Resetea el estado del manager
     */
    reset() {
        this.evaluationTimer = 0;
        this.pendingDecisions = [];
        this.lastModeByFront.clear();
    }
}
