// ===== EVALUADOR DE CARTAS =====
// Evalúa cartas del mazo y calcula sus scores de prioridad

import { AICardAdapter } from './AICardAdapter.js';
import { AIGameStateAnalyzer } from './AIGameStateAnalyzer.js';
import AIConfig from '../config/AIConfig.js';
import { SERVER_NODE_CONFIG } from '../../../config/serverNodes.js';

export class AICardEvaluator {
    /**
     * Evalúa una carta individual y calcula su score
     * @param {string} cardId - ID de la carta
     * @param {Object} gameState - Estado del juego
     * @param {string} team - Equipo de la IA
     * @param {number} currency - Currency actual del equipo
     * @param {Object} state - Estado analizado del juego (de AIGameStateAnalyzer)
     * @param {Object} scoringRules - Reglas de scoring del perfil
     * @param {Object} deck - Mazo del jugador
     * @param {Object} profile - Perfil de IA (opcional, para condiciones personalizadas)
     * @returns {Object|null} Objeto con { type, cardId, score, cost } o null si no está disponible
     */
    static evaluateCard(cardId, gameState, team, currency, state, scoringRules, deck, profile = null) {
        // 1. Verificar si está en mazo
        if (!AICardAdapter.isInDeck(cardId, deck)) {
            if (AIConfig?.debug?.logScoring) {
                console.log(`  ❌ ${cardId}: No está en mazo`);
            }
            return null; // No está en el mazo
        }
        
        // 2. Verificar si está habilitada
        const isEnabled = AICardAdapter.isEnabled(cardId);
        if (isEnabled === false) {
            if (AIConfig?.debug?.logScoring) {
                console.log(`  ❌ ${cardId}: Está deshabilitada`);
            }
            return null; // Está deshabilitada
        }
        
        // 3. Verificar requisitos
        const requirements = AICardAdapter.getRequirements(cardId);
        if (requirements && requirements.length > 0) {
            const missingRequirements = this.checkRequirements(requirements, gameState, team);
            if (missingRequirements.length > 0) {
                if (AIConfig?.debug?.logScoring) {
                    console.log(`  ❌ ${cardId}: Faltan requisitos: ${missingRequirements.join(', ')}`);
                }
                return null; // Faltan requisitos
            }
        }
        
        // 4. Verificar coste
        const cost = AICardAdapter.getCost(cardId);
        if (cost === null || currency < cost) {
            if (AIConfig?.debug?.logScoring) {
                console.log(`  ❌ ${cardId}: Currency insuficiente (coste: ${cost}, tiene: ${currency.toFixed(1)})`);
            }
            return null; // No tiene coste definido o no hay suficiente currency
        }
        
        // 5. Obtener reglas de scoring del perfil
        const cardScoringRules = scoringRules[cardId];
        if (!cardScoringRules) {
            if (AIConfig?.debug?.logScoring) {
                console.log(`  ❌ ${cardId}: No tiene reglas de scoring definidas`);
            }
            return null; // No tiene reglas de scoring definidas
        }
        
        // 6. Calcular score base
        let score = cardScoringRules.base || 0;
        
        // 7. Aplicar bonificaciones
        if (cardScoringRules.bonuses) {
            for (const [bonusName, bonusValue] of Object.entries(cardScoringRules.bonuses)) {
                if (this.evaluateBonusCondition(bonusName, bonusValue, state, gameState, team, profile, currency)) {
                    // Bonificaciones especiales que multiplican por cantidad
                    if (bonusName === 'perPlayerPlant' && state.playerPlants) {
                        score += bonusValue * state.playerPlants;
                    } else if (bonusName === 'perMyPlant' && state.myPlants) {
                        score += bonusValue * state.myPlants; // Valor negativo, así que resta
                    } else {
                        score += bonusValue;
                    }
                }
            }
        }
        
        // 8. Determinar tipo de acción
        // Si tiene behavior.targetType, es consumible (attack), si no, es edificio (build)
        const hasTargetType = SERVER_NODE_CONFIG.gameplay?.behavior?.[cardId]?.targetType !== undefined;
        const actionType = hasTargetType ? 'attack' : 'build';
        
        // 9. Verificaciones adicionales para edificios
        // Las verificaciones de límites (caps, edificios únicos, etc.) se manejan en el perfil
        
        // 10. Verificaciones adicionales para consumibles
        if (actionType === 'attack') {
            // Para drones, verificar que haya objetivos disponibles
            if (cardId === 'drone') {
                const hasTargets = this.hasDroneTargets(gameState, team);
                if (!hasTargets) {
                    if (AIConfig?.debug?.logScoring) {
                        console.log(`  ❌ ${cardId}: No hay objetivos disponibles para drones`);
                    }
                    return null; // No hay objetivos para drones
                }
            }
        }
        
        if (AIConfig?.debug?.logScoring) {
            console.log(`  ✅ ${cardId}: Score ${score.toFixed(1)}, coste ${cost}, tipo ${actionType}`);
        }
        
        return {
            type: actionType,
            cardId: cardId,
            score: score,
            cost: cost
        };
    }
    
    /**
     * Evalúa todas las cartas del mazo
     * @param {Object} deck - Mazo del jugador con { units, bench }
     * @param {Object} gameState - Estado del juego
     * @param {string} team - Equipo de la IA
     * @param {number} currency - Currency actual del equipo
     * @param {Object} state - Estado analizado del juego (de AIGameStateAnalyzer)
     * @param {Object} scoringRules - Reglas de scoring del perfil
     * @param {Object} profile - Perfil de IA (opcional, para condiciones personalizadas)
     * @returns {Array} Lista de acciones evaluadas ordenadas por score descendente
     */
    static evaluateDeck(deck, gameState, team, currency, state, scoringRules, profile = null) {
        const actions = [];
        const filteredCards = [];
        
        // Iterar sobre todas las cartas del mazo
        for (const cardId of deck.units) {
            const action = this.evaluateCard(cardId, gameState, team, currency, state, scoringRules, deck, profile);
            if (action) {
                actions.push(action);
            } else {
                filteredCards.push(cardId);
            }
        }
        
        // 🎯 DEBUG: Log de cartas filtradas
        if (AIConfig?.debug?.logScoring) {
            console.log(`🔍 [IA] Evaluación de mazo: ${actions.length} acciones válidas, ${filteredCards.length} filtradas`);
            if (filteredCards.length > 0) {
                console.log(`  📋 Cartas filtradas: ${filteredCards.join(', ')}`);
            }
            console.log(`  💰 Currency disponible: ${currency.toFixed(1)}`);
        }
        
        // Ordenar por score descendente
        const sorted = actions.sort((a, b) => b.score - a.score);
        
        if (AIConfig?.debug?.logScoring && sorted.length > 0) {
            const phaseLabel = state?.phase || 'unknown';
            const actionSummary = sorted
                .map(action => `${action.cardId}:${Number(action.score).toFixed(1)}`)
                .join(', ');
            console.log(`🤖 [IA][${phaseLabel}] Scores (${team}) → ${actionSummary}`);
        }
        
        return sorted;
    }
    
    /**
     * Verifica si se cumplen los requisitos de una carta
     * @param {Array<string>} requiredTypes - Array de IDs de edificios requeridos
     * @param {Object} gameState - Estado del juego
     * @param {string} team - Equipo de la IA
     * @returns {Array<string>} Array de requisitos faltantes (vacío si todos se cumplen)
     */
    static checkRequirements(requiredTypes, gameState, team) {
        const missing = [];
        
        for (const requiredType of requiredTypes) {
            const hasRequired = gameState.nodes.some(n => 
                n.type === requiredType && 
                n.team === team && 
                n.constructed && 
                n.active &&
                !n.isAbandoning
            );
            
            if (!hasRequired) {
                missing.push(requiredType);
            }
        }
        
        return missing;
    }
    
    /**
     * Evalúa una condición de bonus
     * Primero intenta condiciones genéricas, luego delega al perfil si existe
     * @param {string} bonusName - Nombre del bonus
     * @param {number} bonusValue - Valor del bonus
     * @param {Object} state - Estado del juego analizado
     * @param {Object} gameState - Estado del juego completo
     * @param {string} team - Equipo de la IA
     * @param {Object} profile - Perfil de IA (opcional, para condiciones personalizadas)
     * @returns {boolean} Si la condición se cumple
     */
    static evaluateBonusCondition(bonusName, bonusValue, state, gameState, team, profile = null, currency = 0) {
        // Condiciones genéricas (disponibles para todos los perfiles)
        switch (bonusName) {
            case 'earlyPhase':
                return state.phase === 'early';
            case 'midPhase':
                return state.phase === 'mid';
            case 'latePhase':
                return state.phase === 'late';
            case 'notLate':
                return state.phase !== 'late';
            case 'notEarly':
                return state.phase !== 'early';
            case 'perPlayerPlant':
                // Bonus por cada planta del jugador
                return state.playerPlants !== undefined && state.playerPlants > 0;
            case 'perMyPlant':
                // Penalización por cada planta propia
                return state.myPlants !== undefined && state.myPlants > 0;
            case 'hasTargets':
                // Verificar si hay objetivos disponibles (para drones, etc.)
                return this.hasDroneTargets(gameState, team);
            case 'noHospital':
                return state.myHospitals === 0;
            case 'playerHasFOBs':
                const playerFOBs = gameState.nodes.filter(n => 
                    n.team === 'player1' && 
                    n.type === 'fob' && 
                    n.constructed && 
                    n.active
                ).length;
                return playerFOBs > 0;
            case 'airThreat':
                return !!state.hasAirThreat;
            case 'airThreatHigh':
                return state.airThreatLevel === 'high';
            case 'base':
                return true; // Bonus base siempre aplica
        }
        
        // Si no es una condición genérica, delegar al perfil (si existe)
        if (profile && typeof profile.evaluateCustomBonusCondition === 'function') {
            const result = profile.evaluateCustomBonusCondition(bonusName, bonusValue, state, gameState, team, currency);
            if (result !== undefined) {
                return result;
            }
        }
        
        // Si no se encontró la condición, retornar false
        return false;
    }
    
    /**
     * Verifica si hay objetivos disponibles para drones
     * @param {Object} gameState - Estado del juego
     * @param {string} team - Equipo de la IA
     * @returns {boolean} True si hay objetivos válidos para drones
     */
    static hasDroneTargets(gameState, team) {
        const playerNodes = gameState.nodes.filter(n => n.team === 'player1' && n.active && n.constructed);
        const validTargetTypes = SERVER_NODE_CONFIG.actions?.droneLaunch?.validTargets || [];
        
        return playerNodes.some(n => validTargetTypes.includes(n.type));
    }
}

