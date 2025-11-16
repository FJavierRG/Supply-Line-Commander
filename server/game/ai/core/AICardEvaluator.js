// ===== EVALUADOR DE CARTAS =====
// Evalúa cartas del mazo y calcula sus scores de prioridad

import { AICardAdapter } from './AICardAdapter.js';
import { AIGameStateAnalyzer } from './AIGameStateAnalyzer.js';
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
     * @returns {Object|null} Objeto con { type, cardId, score, cost } o null si no está disponible
     */
    static evaluateCard(cardId, gameState, team, currency, state, scoringRules, deck) {
        // 1. Verificar si está en mazo
        if (!AICardAdapter.isInDeck(cardId, deck)) {
            return null; // No está en el mazo
        }
        
        // 2. Verificar si está habilitada
        const isEnabled = AICardAdapter.isEnabled(cardId);
        if (isEnabled === false) {
            return null; // Está deshabilitada
        }
        
        // 3. Verificar requisitos
        const requirements = AICardAdapter.getRequirements(cardId);
        if (requirements && requirements.length > 0) {
            const missingRequirements = this.checkRequirements(requirements, gameState, team);
            if (missingRequirements.length > 0) {
                return null; // Faltan requisitos
            }
        }
        
        // 4. Verificar coste
        const cost = AICardAdapter.getCost(cardId);
        if (cost === null || currency < cost) {
            return null; // No tiene coste definido o no hay suficiente currency
        }
        
        // 5. Obtener reglas de scoring del perfil
        const cardScoringRules = scoringRules[cardId];
        if (!cardScoringRules) {
            return null; // No tiene reglas de scoring definidas
        }
        
        // 6. Calcular score base
        let score = cardScoringRules.base || 0;
        
        // 7. Aplicar bonificaciones
        if (cardScoringRules.bonuses) {
            for (const [bonusName, bonusValue] of Object.entries(cardScoringRules.bonuses)) {
                if (this.evaluateBonusCondition(bonusName, bonusValue, state, gameState, team)) {
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
        if (actionType === 'build') {
            // Verificar si ya tiene el edificio (para algunos edificios que no se pueden tener múltiples)
            const hasBuilding = gameState.nodes.some(n => 
                n.team === team && 
                n.type === cardId && 
                n.active &&
                n.constructed
            );
            
            // Edificios que solo se pueden tener uno
            const singleOnlyBuildings = ['truckFactory', 'antiDrone', 'engineerCenter', 'droneLauncher'];
            if (hasBuilding && singleOnlyBuildings.includes(cardId)) {
                return null; // Ya tiene este edificio y no puede tener múltiples
            }
            
            // Casos especiales
            if (cardId === 'droneLauncher' && state.hasLauncher) {
                return null; // Ya tiene lanzadera
            }
            
            if (cardId === 'aerialBase' && state.myAerialBases >= 1) {
                return null; // Ya tiene base aérea (o ajustar según estrategia)
            }
            
            if (cardId === 'campaignHospital' && state.myHospitals >= 1) {
                return null; // Ya tiene hospital
            }
            
            // Antenas: si ya tiene 2, aumentar score para priorizar más
            if (cardId === 'intelRadio' && state.myIntelRadios >= 2) {
                score *= 1.5; // +50% de score para priorizar antenas adicionales
            }
        }
        
        // 10. Verificaciones adicionales para consumibles
        if (actionType === 'attack') {
            // Para drones, verificar que haya objetivos disponibles
            if (cardId === 'drone') {
                const hasTargets = this.hasDroneTargets(gameState, team);
                if (!hasTargets) {
                    return null; // No hay objetivos para drones
                }
            }
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
     * @returns {Array} Lista de acciones evaluadas ordenadas por score descendente
     */
    static evaluateDeck(deck, gameState, team, currency, state, scoringRules) {
        const actions = [];
        
        // Iterar sobre todas las cartas del mazo
        for (const cardId of deck.units) {
            const action = this.evaluateCard(cardId, gameState, team, currency, state, scoringRules, deck);
            if (action) {
                actions.push(action);
            }
        }
        
        // Ordenar por score descendente
        return actions.sort((a, b) => b.score - a.score);
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
     * @param {string} bonusName - Nombre del bonus
     * @param {number} bonusValue - Valor del bonus
     * @param {Object} state - Estado del juego analizado
     * @param {Object} gameState - Estado del juego completo
     * @param {string} team - Equipo de la IA
     * @returns {boolean} Si la condición se cumple
     */
    static evaluateBonusCondition(bonusName, bonusValue, state, gameState, team) {
        switch (bonusName) {
            case 'earlyPhase':
                return state.phase === 'early';
            case 'notLate':
                return state.phase !== 'late';
            case 'hasLessThan2':
                return state.myFOBs !== undefined && state.myFOBs < 2;
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
            case 'forHelicopters':
                // Verificar si necesita reabastecimiento con helicópteros
                // Por ahora retornar false, se puede implementar después
                return false;
            case 'playerHasFOBs':
                const playerFOBs = gameState.nodes.filter(n => 
                    n.team === 'player1' && 
                    n.type === 'fob' && 
                    n.constructed && 
                    n.active
                ).length;
                return playerFOBs > 0;
            case 'base':
                return true; // Bonus base siempre aplica
            default:
                return false;
        }
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

