// ===== PERFIL DE MAZO OPERACIONES ESPECIALES =====
// Implementa el perfil de IA para el mazo de operaciones especiales
// 
// NOTA: Este perfil usa el mazo definido en game/ai/config/AIDecks.js (AI_SPECOPS_DECK)
// Es independiente de DefaultDeckProfile - código duplicado intencionalmente para flexibilidad
//
// MAZO: ['hq', 'fob', 'servers', 'factory', 'engineerCenter', 'trainingCamp', 'intelCenter', 'sniperStrike', 'fobSabotage', 'truckAssault']
//
// LÓGICA DEL PERFIL:
// ==================
// 1. EDIFICIOS (Buildings):
//    - fob (140$): Base 40. +30 si <2 FOBs, +20 si early phase. Máx: 90. (igual que DefaultDeckProfile)
//    - servers (45$): Base 50. +30 por cada servidor del jugador, -25 por cada servidor propio. (igual que DefaultDeckProfile)
//    - factory (80$): Base 50. +20 si early, +15 si mid. (igual que DefaultDeckProfile)
//    - engineerCenter (80$): Base 40. +10 si early. (igual que DefaultDeckProfile)
//    - trainingCamp (80$): Base 45. +20 si mid, +15 si tiene frentes activos. Fortalece frentes.
//    - intelCenter (150$): Base 60. +25 si mid. Desbloquea ops especiales (requerido para sniperStrike, fobSabotage, truckAssault)
//
// 2. CONSUMIBLES (Attacks):
//    - sniperStrike (70$): Base 30. +20 bonus base. Harass eficiente.
//    - fobSabotage (90$): Base 40. +30 si hay FOBs enemigos activos. Ralentiza logística enemiga.
//    - truckAssault (90$): Base 35. +25 si mid/late. Despliega en territorio enemigo.
//
// 3. PRIORIDADES POR FASE (getPriorities):
//    - earlyGame: ['factory', 'engineerCenter', 'fob'] → Economía y logística primero
//    - midGame: ['intelCenter', 'trainingCamp', 'servers', 'sniperStrike'] → Ops especiales y fortalecimiento
//    - lateGame: ['fobSabotage', 'truckAssault', 'sniperStrike'] → Harass agresivo

import { BaseProfile } from './BaseProfile.js';
import { AICardEvaluator } from '../core/AICardEvaluator.js';
import { AIGameStateAnalyzer } from '../core/AIGameStateAnalyzer.js';
import AIConfig from '../config/AIConfig.js';
import { SERVER_NODE_CONFIG } from '../../../config/serverNodes.js';

export class SpecOpsDeckProfile extends BaseProfile {
    constructor(deck) {
        super(deck);
    }
    
    /**
     * Retorna el ID único del perfil
     */
    getProfileId() {
        return 'specops';
    }
    
    /**
     * Retorna las reglas de scoring del perfil
     */
    getScoringRules() {
        return {
            // ═══════════════════════════════════════════════════════════════
            // EDIFICIOS - Igual que DefaultDeckProfile para fob, servers, factory, engineerCenter
            // ═══════════════════════════════════════════════════════════════
            'fob': {
                base: 40,
                bonuses: {
                    earlyPhase: 20,
                    hasLessThan2: 30,
                    midPhaseAndLessThan3: 30,
                    latePhaseAndLessThan4: 25,
                    has4OrMore: -999,
                    midPhaseAndHas2OrMore: -50
                }
            },
            'servers': {
                base: 50,
                bonuses: {
                    perPlayerServer: 30,
                    perMyServer: -25,
                    midPhase: 15,
                    latePhase: 25,
                    hasExcessCurrency: 20,
                    hasServerAdvantage: -50,
                    hasServerBigAdvantage: -100
                }
            },
            'factory': {
                base: 50,
                bonuses: {
                    earlyPhase: 20,
                    midPhase: 15
                }
            },
            'engineerCenter': {
                base: 40,
                bonuses: {
                    earlyPhase: 10
                }
            },
            
            // ═══════════════════════════════════════════════════════════════
            // EDIFICIOS ESPECÍFICOS DE SPECOPS
            // ═══════════════════════════════════════════════════════════════
            'trainingCamp': {
                base: 45,
                bonuses: {
                    midPhase: 20,
                    hasActiveFronts: 15,  // +15 si tiene frentes activos (fortalece tropas)
                    latePhase: 10
                }
            },
            'intelCenter': {
                base: 60,
                bonuses: {
                    midPhase: 25,  // Priorizar en mid para desbloquear ops especiales
                    earlyPhase: -20,  // Penalizar en early (muy caro, mejor economía primero)
                    noIntelCenter: 40  // +40 si no tiene ninguno (necesario para consumibles)
                }
            },
            
            // ═══════════════════════════════════════════════════════════════
            // CONSUMIBLES
            // ═══════════════════════════════════════════════════════════════
            'sniperStrike': {
                base: 30,
                bonuses: {
                    base: 20,
                    notEarly: 20,
                    hasAdvantage: 25
                }
            },
            'fobSabotage': {
                base: 40,
                bonuses: {
                    hasEnemyFOBs: 30,  // +30 si hay FOBs enemigos activos
                    midPhase: 15,
                    latePhase: 20,
                    hasAdvantage: 20
                }
            },
            'truckAssault': {
                base: 35,
                bonuses: {
                    midPhase: 20,
                    latePhase: 25,
                    hasEnemyConvoys: 15,  // +15 si hay convoyes enemigos activos
                    allEnemyFOBsSabotaged: 40  // +40 si todos los FOBs enemigos ya están saboteados
                }
            }
        };
    }
    
    /**
     * Retorna las prioridades del perfil por fase
     */
    getPriorities() {
        return {
            earlyGame: ['factory', 'engineerCenter', 'fob'],
            midGame: ['intelCenter', 'trainingCamp', 'servers', 'sniperStrike'],
            lateGame: ['fobSabotage', 'truckAssault', 'sniperStrike', 'servers']
        };
    }
    
    /**
     * Configuración de caps de FOBs por fase (igual que DefaultDeckProfile)
     */
    getFOBPhaseCaps() {
        return {
            early: 2,
            mid: 5,
            late: 6
        };
    }
    
    /**
     * Configuración de presupuesto de consumibles por fase
     */
    getConsumableBudgetConfig() {
        return {
            early: 0.25,
            mid: 0.45,  // Un poco más agresivo que default
            late: 0.65
        };
    }
    
    /**
     * Configuración de cooldown de consumibles por fase (en segundos)
     */
    getConsumableCooldownConfig() {
        return {
            early: {
                sniperStrike: 25,
                fobSabotage: 35,
                truckAssault: 40
            },
            mid: {
                sniperStrike: 12,  // Más agresivo con sniper
                fobSabotage: 20,
                truckAssault: 25
            },
            late: {
                sniperStrike: 8,
                fobSabotage: 15,
                truckAssault: 18
            }
        };
    }
    
    /**
     * Evalúa acciones estratégicas disponibles
     */
    evaluateStrategicActions(gameState, team, currency, state = null) {
        if (!state) {
            state = AIGameStateAnalyzer.analyzeState(team, gameState);
        }

        // Actualizar colchón dinámico compartido
        this.updateCurrencyBuffer(gameState);
        const hasFobEmergency = state?.myFOBs !== undefined && state.myFOBs < 2;
        const availableCurrency = hasFobEmergency
            ? this.getRawCurrency(gameState)
            : this.getAvailableCurrency(gameState);
        
        const scoringRules = this.getScoringRules();
        
        // Evaluar todas las cartas del mazo
        const actions = AICardEvaluator.evaluateDeck(
            this.deck,
            gameState,
            team,
            availableCurrency,
            state,
            scoringRules,
            this
        );
        
        // LOG
        if (actions.length > 0) {
            const actionsList = actions.slice(0, 5)
                .map(a => `${a.cardId}(${a.score.toFixed(0)})`)
                .join(', ');
            console.log(`📋 IA SpecOps [${state.phase}]: Acciones evaluadas (${actions.length}): ${actionsList}`);
        } else {
            console.log(`⚠️ IA SpecOps [${state.phase}]: No hay acciones disponibles`);
        }
        
        // Aplicar reglas específicas del perfil
        const actionsWithProfileRules = this.applyProfileSpecificRules(actions, state, gameState, currency);
        
        return this.applyPhasePriorities(actionsWithProfileRules, state.phase);
    }
    
    /**
     * Evalúa condiciones personalizadas de bonus específicas del perfil
     */
    evaluateCustomBonusCondition(bonusName, bonusValue, state, gameState, team, currency = 0) {
        switch (bonusName) {
            // Condiciones de FOBs (igual que DefaultDeckProfile)
            case 'hasLessThan2':
                return state.myFOBs !== undefined && state.myFOBs < 2;
            case 'hasLessThan3':
                return state.myFOBs !== undefined && state.myFOBs < 3;
            case 'hasLessThan4':
                return state.myFOBs !== undefined && state.myFOBs < 4;
            case 'has4OrMore':
                return state.myFOBs !== undefined && state.myFOBs >= 4;
            case 'midPhaseAndLessThan3':
                return state.phase === 'mid' && state.myFOBs !== undefined && state.myFOBs < 3;
            case 'latePhaseAndLessThan4':
                return state.phase === 'late' && state.myFOBs !== undefined && state.myFOBs < 4;
            case 'midPhaseAndHas2OrMore':
                return state.phase === 'mid' && state.myFOBs !== undefined && state.myFOBs >= 2;
            
            // Condiciones de currency (igual que DefaultDeckProfile)
            case 'hasExcessCurrency':
                return currency >= 300;
            
            // Condiciones de ventaja (igual que DefaultDeckProfile)
            case 'hasAdvantage':
                const elapsedTime = state.elapsedTime || 0;
                if (elapsedTime < 300) return false;
                const hasMuchMoney = currency >= 500;
                const plantDifference = (state.myPlants !== undefined && state.playerPlants !== undefined) 
                    ? (state.myPlants - state.playerPlants) : 0;
                return hasMuchMoney || plantDifference >= 2;
            
            case 'hasServerAdvantage':
                const elapsedTimeServer = state.elapsedTime || 0;
                if (elapsedTimeServer < 300) return false;
                const serverDiff = (state.myServers !== undefined && state.playerServers !== undefined) 
                    ? (state.myServers - state.playerServers) : 0;
                return serverDiff === 2;
            
            case 'hasServerBigAdvantage':
                const elapsedTimeBigServer = state.elapsedTime || 0;
                if (elapsedTimeBigServer < 300) return false;
                const serverDiffBig = (state.myServers !== undefined && state.playerServers !== undefined) 
                    ? (state.myServers - state.playerServers) : 0;
                return serverDiffBig >= 3;
            
            // ═══════════════════════════════════════════════════════════════
            // CONDICIONES ESPECÍFICAS DE SPECOPS
            // ═══════════════════════════════════════════════════════════════
            case 'hasActiveFronts':
                // Tiene frentes activos con supplies
                const myFronts = gameState.nodes.filter(n => 
                    n.team === team && 
                    n.type === 'front' && 
                    n.active && 
                    n.supplies > 0
                );
                return myFronts.length > 0;
            
            case 'noIntelCenter':
                // No tiene ningún centro de inteligencia
                const hasIntelCenter = gameState.nodes.some(n => 
                    n.team === team && 
                    n.type === 'intelCenter' && 
                    n.active && 
                    n.constructed &&
                    !n.isAbandoning
                );
                return !hasIntelCenter;
            
            case 'hasEnemyFOBs':
                // Hay FOBs enemigos activos
                const enemyFOBs = gameState.nodes.filter(n => 
                    n.team !== team && 
                    n.type === 'fob' && 
                    n.active && 
                    n.constructed
                );
                return enemyFOBs.length > 0;
            
            case 'hasEnemyConvoys':
                // Hay convoyes enemigos activos (verificar en gameState.convoys si existe)
                if (gameState.convoys && Array.isArray(gameState.convoys)) {
                    const enemyConvoys = gameState.convoys.filter(c => 
                        c.team !== team && c.active
                    );
                    return enemyConvoys.length > 0;
                }
                return false;
            
            case 'allEnemyFOBsSabotaged':
                // TODOS los FOBs enemigos ya tienen el efecto de sabotaje activo
                const enemyTeamForSabotage = team === 'player1' ? 'player2' : 'player1';
                const allEnemyFOBs = gameState.nodes.filter(n => 
                    n.team === enemyTeamForSabotage && 
                    n.type === 'fob' && 
                    n.active && 
                    n.constructed
                );
                
                // Si no hay FOBs enemigos, no aplica
                if (allEnemyFOBs.length === 0) return false;
                
                // Verificar si TODOS tienen el efecto de sabotaje
                const allSabotaged = allEnemyFOBs.every(fob => 
                    fob.effects && fob.effects.some(e => e.type === 'fobSabotage')
                );
                
                if (allSabotaged) {
                    console.log(`🎯 IA SpecOps: Todos los FOBs enemigos (${allEnemyFOBs.length}) están saboteados → priorizar truckAssault`);
                }
                
                return allSabotaged;
            
            default:
                return undefined;
        }
    }
    
    /**
     * Aplica reglas específicas del perfil SpecOps
     */
    applyProfileSpecificRules(actions, state, gameState, currency) {
        if (!Array.isArray(actions) || actions.length === 0) {
            return actions;
        }
        
        let filteredActions = actions;
        const team = 'player2';
        
        // ═══════════════════════════════════════════════════════════════
        // EMERGENCIA: Factory (igual que DefaultDeckProfile)
        // ═══════════════════════════════════════════════════════════════
        const hasFactory = gameState.nodes.some(n => 
            n.team === team && 
            n.type === 'factory' && 
            n.active &&
            n.constructed &&
            !n.isAbandoning
        );
        
        if (!hasFactory) {
            const factoryAction = filteredActions.find(action => action.cardId === 'factory');
            if (factoryAction) {
                const emergencyBoost = 1200;
                
                if (AIConfig.debug?.logActions) {
                    console.log(`🚨 IA SpecOps EMERGENCIA FÁBRICA: No hay fábrica activa.`);
                }
                
                filteredActions = filteredActions.map(action => {
                    if (action.cardId === 'factory') {
                        return { ...action, score: action.score + emergencyBoost, emergency: 'factory_rebuild' };
                    }
                    return { ...action, score: action.score * 0.15 };
                });
                
                return filteredActions;
            }
        }
        
        // ═══════════════════════════════════════════════════════════════
        // EMERGENCIA: FOBs (igual que DefaultDeckProfile)
        // ═══════════════════════════════════════════════════════════════
        if (state?.myFOBs !== undefined && state.myFOBs < 2) {
            const fobAction = filteredActions.find(action => action.cardId === 'fob');
            if (fobAction) {
                const missingFOBs = 2 - state.myFOBs;
                const emergencyBoost = 1000;
                
                if (AIConfig.debug?.logActions) {
                    console.log(`🚨 IA SpecOps DOBLE FOB: Tiene ${state.myFOBs} FOBs (<2).`);
                }
                
                filteredActions = filteredActions.map(action => {
                    if (action.cardId === 'fob') {
                        return { ...action, score: action.score + emergencyBoost, emergency: 'fob_rebuild' };
                    }
                    return { ...action, score: action.score * 0.2 };
                });
                
                return filteredActions;
            }
        }
        
        // ═══════════════════════════════════════════════════════════════
        // BLOQUEO: Servidores (igual que DefaultDeckProfile)
        // ═══════════════════════════════════════════════════════════════
        if (state?.myServers !== undefined && state?.playerServers !== undefined) {
            const serverDifference = state.myServers - state.playerServers;
            if (serverDifference >= 2) {
                filteredActions = filteredActions.filter(action => action.cardId !== 'servers');
            }
        }
        
        // ═══════════════════════════════════════════════════════════════
        // CAPS DE FOBS POR FASE
        // ═══════════════════════════════════════════════════════════════
        const fobAction = filteredActions.find(action => action.cardId === 'fob');
        if (fobAction && state.myFOBs !== undefined) {
            const fobCaps = this.getFOBPhaseCaps();
            const phaseCap = fobCaps[state.phase] ?? 3;
            if (state.myFOBs >= phaseCap) {
                filteredActions = filteredActions.filter(action => action.cardId !== 'fob');
            }
        }
        
        // ═══════════════════════════════════════════════════════════════
        // EDIFICIOS ÚNICOS
        // ═══════════════════════════════════════════════════════════════
        
        // Engineer Center: solo uno
        const hasEngineerCenter = gameState.nodes.some(n => 
            n.team === team && n.type === 'engineerCenter' && n.active && n.constructed
        );
        if (hasEngineerCenter) {
            filteredActions = filteredActions.filter(action => action.cardId !== 'engineerCenter');
        }
        
        // Factory: máximo 2
        const factoryCount = gameState.nodes.filter(n => 
            n.team === team && n.type === 'factory' && n.active && n.constructed && !n.isAbandoning
        ).length;
        if (factoryCount >= 2) {
            filteredActions = filteredActions.filter(action => action.cardId !== 'factory');
        }
        
        // Training Camp: solo uno
        const hasTrainingCamp = gameState.nodes.some(n => 
            n.team === team && n.type === 'trainingCamp' && n.active && n.constructed
        );
        if (hasTrainingCamp) {
            filteredActions = filteredActions.filter(action => action.cardId !== 'trainingCamp');
        }
        
        // Intel Center: solo uno
        const hasIntelCenter = gameState.nodes.some(n => 
            n.team === team && n.type === 'intelCenter' && n.active && n.constructed
        );
        if (hasIntelCenter) {
            filteredActions = filteredActions.filter(action => action.cardId !== 'intelCenter');
        }
        
        // ═══════════════════════════════════════════════════════════════
        // REQUISITOS DE CONSUMIBLES
        // ═══════════════════════════════════════════════════════════════
        // sniperStrike, fobSabotage, truckAssault requieren intelCenter
        if (!hasIntelCenter) {
            filteredActions = filteredActions.filter(action => 
                action.cardId !== 'sniperStrike' && 
                action.cardId !== 'fobSabotage' && 
                action.cardId !== 'truckAssault'
            );
        }
        
        return filteredActions;
    }
    
    /**
     * Ajusta los scores según las prioridades configuradas para la fase actual
     */
    applyPhasePriorities(actions, phase) {
        if (!Array.isArray(actions) || actions.length === 0) {
            return actions;
        }
        
        if (typeof this.getPriorities !== 'function') {
            return actions;
        }
        
        const phaseMap = {
            early: 'earlyGame',
            mid: 'midGame',
            late: 'lateGame'
        };
        const priorities = this.getPriorities();
        const phaseKey = phaseMap[phase];
        const phasePriorities = priorities?.[phaseKey];
        
        if (!Array.isArray(phasePriorities) || phasePriorities.length === 0) {
            return actions;
        }
        
        const PRIORITY_MAX_BOOST = 25;
        const PRIORITY_DECAY = 5;
        const priorityBoostMap = new Map();
        phasePriorities.forEach((cardId, index) => {
            const boost = Math.max(PRIORITY_MAX_BOOST - (PRIORITY_DECAY * index), PRIORITY_DECAY);
            priorityBoostMap.set(cardId, boost);
        });
        
        const boostedActions = actions.map(action => {
            const boost = priorityBoostMap.get(action.cardId);
            if (boost) {
                return { ...action, score: action.score + boost };
            }
            return action;
        });
        
        const sorted = boostedActions.sort((a, b) => b.score - a.score);
        
        if (AIConfig?.debug?.logScoring && sorted.length > 0) {
            const summary = sorted
                .map(action => `${action.cardId}:${Number(action.score).toFixed(1)}`)
                .join(', ');
            console.log(`🤖 [IA SpecOps][${phaseKey}] Prioridades → ${summary}`);
        }
        
        return sorted;
    }
    
    /**
     * Crea una orden de emergencia para construir antiDrone cuando se detecta un drone enemigo
     * ⚠️ SPECOPS NO TIENE ANTIDRONE - Este método siempre retorna null
     * @param {Object} droneThreat - Datos del drone enemigo
     * @param {Object} targetBuilding - Edificio objetivo del drone
     * @param {Object} gameState - Estado completo del juego
     * @param {string} team - Equipo de la IA
     * @param {number} currency - Currency actual
     * @param {string} difficulty - Dificultad de la IA
     * @returns {null} Siempre retorna null ya que no tiene antiDrone
     */
    createEmergencyAntiDroneOrder(droneThreat, targetBuilding, gameState, team, currency, difficulty) {
        // SpecOps NO tiene antiDrone en su mazo - no puede defenderse de drones
        console.log(`⚠️ IA SpecOps EMERGENCIA: Detectado drone enemigo pero NO TIENE antiDrone en el mazo. No puede defenderse.`);
        return null;
    }
    
    /**
     * Maneja reacciones defensivas (simplificado - sin antiDrone en este mazo)
     */
    handleDefensiveReaction(threatType, threatData, isDeployed, targetBuilding, gameState, team, currency, difficulty) {
        // Este perfil no tiene antiDrone, solo puede responder con sniper a algunas amenazas
        const reactProbabilities = {
            easy: 0.65,
            medium: 0.82,
            hard: 0.92
        };
        
        const reactProbability = reactProbabilities[difficulty] || 0.75;
        const randomRoll = Math.random();
        
        if (randomRoll > reactProbability) {
            return null;
        }
        
        const sniperCost = SERVER_NODE_CONFIG.costs.sniperStrike || 70;
        
        // Verificar que tiene intelCenter para usar sniper
        const hasIntelCenter = gameState.nodes.some(n => 
            n.team === team && n.type === 'intelCenter' && n.active && n.constructed
        );
        
        if (!hasIntelCenter) {
            return null; // No puede reaccionar sin intelCenter
        }
        
        switch (threatType) {
            case 'commando':
            case 'truckAssault':
            case 'cameraDrone':
                if (!threatData || !threatData.id) return null;
                if (currency < sniperCost) return null;
                
                return {
                    type: 'sniper',
                    targetId: threatData.id
                };
            
            case 'drone':
                // Sin antiDrone, no puede defenderse de drones
                // Podría usar sniper en el frente atacado, pero es menos efectivo
                return null;
            
            default:
                return null;
        }
    }
}
