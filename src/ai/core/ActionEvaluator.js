// ===== EVALUADOR DE ACCIONES CON SCORING CONTEXTUAL =====
// Evalúa todas las acciones posibles y recomienda la mejor según el contexto

import AIConfig from '../config/AIConfig.js';
import { getNodeConfig } from '../../config/nodes.js';

export class ActionEvaluator {
    constructor(game, aiSystem, stateAnalyzer) {
        this.game = game;
        this.ai = aiSystem;
        this.state = stateAnalyzer;
    }
    
    /**
     * Obtiene el costo real de un tipo de acción desde nodes.js
     */
    getRealCost(actionType) {
        const configMap = {
            'FOB': 'fob',
            'PLANT': 'nuclearPlant',
            'HOSPITAL': 'campaignHospital',
            'LAUNCHER': 'droneLauncher',
            'DRONE': 'drone',
            'SNIPER': 'sniperStrike',
            'ANTIDRONE': 'antiDrone',
            'TRUCK_FACTORY': 'truckFactory'
        };
        
        const configKey = configMap[actionType];
        if (!configKey) return AIConfig.costs[actionType.toLowerCase()] || 0;
        
        const config = getNodeConfig(configKey);
        return config?.cost || AIConfig.costs[actionType.toLowerCase()] || 0;
    }

    /**
     * Evalúa todas las acciones posibles y devuelve la mejor
     * @param {string} category - 'offensive', 'defensive', 'economic', 'all'
     * @returns {Object|null} Mejor acción {type, score, cost, execute()}
     */
    getBestAction(category = 'all') {
        const gameState = this.state.analyze();
        const actions = this.evaluateAllActions(gameState);
        
        // Filtrar por categoría si se especificó
        let filteredActions = actions;
        if (category !== 'all') {
            filteredActions = actions.filter(a => a.category === category);
        }
        
        // Filtrar acciones que podemos pagar (con margen)
        const margin = this.getMargin(gameState);
        const affordable = filteredActions.filter(a => 
            this.ai.currency >= a.cost + margin
        );
        
        if (affordable.length === 0) {
            return null;
        }
        
        // Ordenar por score (mayor a menor)
        affordable.sort((a, b) => b.score - a.score);
        
        // Log top 3 si debug activo
        if (AIConfig.debug.logScoring) {
            console.log('🎯 Top 3 acciones evaluadas:');
            affordable.slice(0, 3).forEach((action, i) => {
                console.log(`  ${i+1}. ${action.type}: ${action.score.toFixed(1)} pts (${action.cost}$)`);
            });
        }
        
        return affordable[0];
    }

    /**
     * Evalúa todas las acciones posibles
     */
    evaluateAllActions(gameState) {
        return [
            this.evaluateFOB(gameState),
            this.evaluatePlant(gameState),
            this.evaluateLauncher(gameState),
            this.evaluateDrone(gameState),
            this.evaluateSniper(gameState),
            this.evaluateHospital(gameState)
        ].filter(action => action.score > 0); // Solo acciones con score positivo
    }

    /**
     * Evalúa construcción de FOB
     */
    evaluateFOB(gameState) {
        const weights = AIConfig.scoring.fob;
        let score = weights.base;
        
        // Contexto: Cuántos FOBs tengo
        const myFOBs = gameState.territory.myFOBs;
        score += myFOBs * weights.perExistingFOB;
        
        // Bonus si tengo menos de 2
        if (myFOBs < 2) {
            score += weights.ifLessThan2;
        }
        
        // Fase del juego
        if (gameState.phase === 'early') {
            score += weights.earlyGameBonus;
        } else if (gameState.phase === 'late') {
            score += weights.lateGamePenalty;
        }
        
        // Urgencia: Si estoy desperate o losing
        if (gameState.strategic.state === 'desperate') {
            score += 100; // MÁXIMA PRIORIDAD
        } else if (gameState.strategic.state === 'losing') {
            score += 50;
        }
        
        return {
            type: 'FOB',
            category: 'economic',
            score: score,
            cost: this.getRealCost('FOB'),
            execute: () => this.ai.attemptFOBConstruction()
        };
    }

    /**
     * Evalúa construcción de Planta Nuclear
     */
    evaluatePlant(gameState) {
        const weights = AIConfig.scoring.plant;
        let score = weights.base;
        
        // Contexto: Plantas del jugador vs mías
        const playerPlants = gameState.economy.playerPlants;
        const myPlants = gameState.economy.myPlants;
        
        score += playerPlants * weights.perPlayerPlant;
        score += myPlants * weights.perMyPlant;
        
        // Si estoy detrás económicamente
        if (gameState.economy.isBehind) {
            score += weights.ifEconomyBehind;
        }
        
        // Fase del juego
        if (gameState.phase === 'early') {
            score += weights.earlyGamePenalty;
        }
        
        // Urgencia: Amenazas económicas
        const economicThreats = gameState.threats.filter(t => t.type === 'economic');
        if (economicThreats.length > 0) {
            score += 40;
        }
        
        return {
            type: 'PLANT',
            category: 'economic',
            score: score,
            cost: this.getRealCost('PLANT'),
            execute: () => this.ai.buildNuclearPlant()
        };
    }

    /**
     * Evalúa construcción de Lanzadera
     */
    evaluateLauncher(gameState) {
        const weights = AIConfig.scoring.launcher;
        
        // Si ya tengo lanzadera → PROHIBIDO
        if (this.ai.hasDroneLauncher()) {
            return {
                type: 'LAUNCHER',
                category: 'military',
                score: weights.ifAlreadyHave,
                cost: this.getRealCost('LAUNCHER'),
                execute: () => {}
            };
        }
        
        let score = weights.base;
        
        // Si jugador tiene objetivos valiosos
        const playerPlants = gameState.economy.playerPlants;
        const playerHospitals = this.getPlayerHospitals().length;
        if (playerPlants + playerHospitals > 0) {
            score += weights.ifPlayerHasTargets;
        }
        
        // Mid-game es ideal
        if (gameState.phase === 'mid') {
            score += weights.ifMidGame;
        }
        
        // Late-game y sin lanzadera = URGENTE
        if (gameState.phase === 'late') {
            score += 80; // ALTA PRIORIDAD
        }
        
        return {
            type: 'LAUNCHER',
            category: 'military',
            score: score,
            cost: this.getRealCost('LAUNCHER'),
            execute: () => this.ai.attemptDroneLauncherConstruction()
        };
    }

    /**
     * Evalúa lanzar Dron
     */
    evaluateDrone(gameState) {
        const weights = AIConfig.scoring.drone;
        
        // Sin lanzadera → PROHIBIDO
        if (!gameState.military.hasLauncher) {
            return {
                type: 'DRONE',
                category: 'offensive',
                score: weights.ifNoLauncher,
                cost: this.getRealCost('DRONE'),
                execute: () => {}
            };
        }
        
        let score = weights.base;
        
        // Objetivos de alto valor
        const playerPlants = gameState.economy.playerPlants;
        const playerHospitals = this.getPlayerHospitals().length;
        const highValueTargets = playerPlants + playerHospitals;
        
        score += highValueTargets * weights.perHighValueTarget;
        
        // Si estoy ganando, ser más agresivo
        if (gameState.strategic.state === 'winning') {
            score += weights.ifWinning;
        }
        
        // Late game = más drones
        if (gameState.phase === 'late') {
            score += weights.ifLateGame;
        }
        
        // Drones activos (no saturar)
        const activeDrones = this.game.droneSystem?.drones?.filter(d => d.team === 'player2')?.length || 0;
        score += activeDrones * weights.perExistingDrone;
        
        return {
            type: 'DRONE',
            category: 'offensive',
            score: score,
            cost: this.getRealCost('DRONE'),
            execute: () => this.ai.attemptDroneLaunch()
        };
    }

    /**
     * Evalúa lanzar Sniper
     */
    evaluateSniper(gameState) {
        const weights = AIConfig.scoring.sniper;
        let score = weights.base;
        
        // Early game = ideal para harass
        if (gameState.phase === 'early') {
            score += weights.ifEarlyGame;
        } else if (gameState.phase === 'late') {
            score += weights.ifLateGame;
        }
        
        // Si jugador parece débil (pocos FOBs)
        if (gameState.territory.playerFOBs < 2) {
            score += weights.ifPlayerWeak;
        }
        
        return {
            type: 'SNIPER',
            category: 'offensive',
            score: score,
            cost: this.getRealCost('SNIPER'),
            execute: () => this.ai.attemptSniperStrike()
        };
    }

    /**
     * Evalúa construcción de Hospital
     */
    evaluateHospital(gameState) {
        const weights = AIConfig.scoring.hospital;
        let score = weights.base;
        
        // Si ya tengo hospital
        const myHospitals = this.game.nodes.filter(n => 
            n.type === 'campaignHospital' && n.team === 'player2' && n.constructed
        ).length;
        
        score += myHospitals * weights.perMyHospital;
        
        // Si jugador tiene hospital
        const playerHospitals = this.getPlayerHospitals().length;
        if (playerHospitals > 0) {
            score += weights.ifPlayerHas;
        }
        
        // TODO: Añadir métrica de "bajas" cuando exista el sistema
        
        return {
            type: 'HOSPITAL',
            category: 'support',
            score: score,
            cost: this.getRealCost('HOSPITAL'),
            execute: () => {} // TODO: Implementar construcción de hospital
        };
    }

    /**
     * Calcula el margen de seguridad según contexto
     */
    getMargin(gameState) {
        const urgency = this.state.calculateUrgency();
        
        // Urgencia crítica → margen mínimo
        if (urgency >= AIConfig.urgency.critical) {
            return AIConfig.margins.desperate;
        }
        
        // Urgencia alta → margen reducido
        if (urgency >= AIConfig.urgency.high) {
            return AIConfig.margins.earlyGame;
        }
        
        // Estado del juego
        if (gameState.strategic.state === 'winning') {
            return AIConfig.margins.winning; // Conservador
        } else if (gameState.strategic.state === 'desperate' || gameState.strategic.state === 'losing') {
            return AIConfig.margins.desperate;
        }
        
        // Early game → margen reducido
        if (gameState.phase === 'early') {
            return AIConfig.margins.earlyGame;
        }
        
        return AIConfig.margins.normal;
    }

    // === HELPERS ===
    
    getPlayerHospitals() {
        return this.game.nodes.filter(n => 
            n.type === 'campaignHospital' && n.team === 'ally' && n.constructed
        );
    }
}

export default ActionEvaluator;

