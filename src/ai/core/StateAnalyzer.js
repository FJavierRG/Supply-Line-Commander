// ===== ANALIZADOR DE ESTADO DEL JUEGO =====
// Proporciona contexto y métricas para la toma de decisiones

import AIConfig from '../config/AIConfig.js';

export class StateAnalyzer {
    constructor(game, aiSystem) {
        this.game = game;
        this.ai = aiSystem;
    }

    /**
     * Analiza el estado completo del juego
     * @returns {Object} Estado con métricas y contexto
     */
    analyze() {
        return {
            // Fase del juego
            phase: this.getGamePhase(),
            
            // Estado estratégico
            strategic: this.analyzeStrategicState(),
            
            // Economía
            economy: this.analyzeEconomy(),
            
            // Militar
            military: this.analyzeMilitary(),
            
            // Territorio
            territory: this.analyzeTerritory(),
            
            // Amenazas
            threats: this.identifyThreats()
        };
    }

    /**
     * Determina la fase del juego (early/mid/late)
     */
    getGamePhase() {
        const currency = this.ai.currency;
        
        if (currency < AIConfig.thresholds.earlyGame) {
            return 'early';
        } else if (currency < AIConfig.thresholds.midGame) {
            return 'mid';
        } else {
            return 'late';
        }
    }

    /**
     * Analiza el estado estratégico general
     */
    analyzeStrategicState() {
        const myFOBs = this.getEnemyFOBs().length;
        const territory = this.getTerritoryPercentage();

        let state = 'even';
        
        if (myFOBs === 0) {
            state = 'desperate';
        } else if (territory < 30) {
            state = 'losing';
        } else if (territory > 70) {
            state = 'winning';
        }

        return {
            state: state,
            fobCount: myFOBs,
            territoryPercent: territory
        };
    }

    /**
     * Analiza la economía
     */
    analyzeEconomy() {
        const myPlants = this.getMyPlants().length;
        const playerPlants = this.getPlayerPlants().length;
        
        const myIncome = 3 + (myPlants * 2); // Base 3$/s + 2$/s por planta
        const playerIncome = 2 + (playerPlants * 2); // Base 2$/s + 2$/s por planta
        
        const economyDiff = myIncome - playerIncome;
        
        return {
            myIncome: myIncome,
            playerIncome: playerIncome,
            difference: economyDiff,
            isBehind: economyDiff < 0,
            isAhead: economyDiff > 1,
            myPlants: myPlants,
            playerPlants: playerPlants
        };
    }

    /**
     * Analiza capacidades militares
     */
    analyzeMilitary() {
        const hasLauncher = this.ai.hasDroneLauncher();
        const myAntiDrones = this.game.nodes.filter(n => 
            n.type === 'antiDrone' && n.team === 'player2' && n.constructed
        ).length;
        
        const playerAntiDrones = this.game.nodes.filter(n => 
            n.type === 'antiDrone' && n.team === 'ally' && n.constructed
        ).length;

        return {
            hasLauncher: hasLauncher,
            myAntiDrones: myAntiDrones,
            playerAntiDrones: playerAntiDrones,
            canLaunchDrones: hasLauncher
        };
    }

    /**
     * Analiza control de territorio
     */
    analyzeTerritory() {
        const myFOBs = this.getEnemyFOBs();
        const playerFOBs = this.getPlayerFOBs();
        
        return {
            myFOBs: myFOBs.length,
            playerFOBs: playerFOBs.length,
            fobDifference: myFOBs.length - playerFOBs.length,
            needsFOB: myFOBs.length < 2
        };
    }

    /**
     * Identifica amenazas inmediatas
     */
    identifyThreats() {
        const threats = [];
        
        // Amenaza: Jugador tiene más plantas
        const economy = this.analyzeEconomy();
        if (economy.playerPlants > economy.myPlants) {
            threats.push({
                type: 'economic',
                severity: 'high',
                description: `Jugador tiene ${economy.playerPlants} plantas vs ${economy.myPlants} nuestras`
            });
        }
        
        // Amenaza: FOBs bajo de suministros
        const lowSupplyFOBs = this.getEnemyFOBs().filter(fob => 
            fob.supplies / fob.maxSupplies < 0.3
        );
        if (lowSupplyFOBs.length > 0) {
            threats.push({
                type: 'supply',
                severity: 'medium',
                description: `${lowSupplyFOBs.length} FOB(s) con suministros <30%`
            });
        }
        
        // Amenaza: Jugador construyó planta recientemente
        const recentPlayerPlants = this.getPlayerPlants().filter(plant => {
            const age = (Date.now() - (plant.constructionCompletedTime || 0)) / 1000;
            return age < 60; // Últimos 60 segundos
        });
        
        if (recentPlayerPlants.length > 0) {
            threats.push({
                type: 'expansion',
                severity: 'high',
                description: `Jugador construyó ${recentPlayerPlants.length} planta(s) recientemente`
            });
        }

        return threats;
    }

    /**
     * Calcula urgencia global (0-100+)
     */
    calculateUrgency() {
        let urgency = 0;
        const threats = this.identifyThreats();
        
        // Sumar urgencia por amenazas
        threats.forEach(threat => {
            if (threat.type === 'economic') {
                urgency += AIConfig.urgency.playerHasMorePlants;
            } else if (threat.type === 'expansion') {
                urgency += AIConfig.urgency.playerPlantDetected;
            } else if (threat.type === 'supply') {
                urgency += AIConfig.urgency.fobsUnder30Percent;
            }
        });
        
        // Estado estratégico
        const strategic = this.analyzeStrategicState();
        if (strategic.state === 'losing') {
            urgency += 30;
        } else if (strategic.state === 'desperate') {
            urgency += 60;
        }
        
        return Math.min(urgency, 150); // Cap a 150
    }

    // === HELPERS ===
    
    getEnemyFOBs() {
        return this.game.nodes.filter(n => 
            n.type === 'fob' && n.team === 'player2' && n.constructed && !n.isAbandoning
        );
    }

    getPlayerFOBs() {
        return this.game.nodes.filter(n => 
            n.type === 'fob' && n.team === 'ally' && n.constructed && !n.isAbandoning
        );
    }

    getMyPlants() {
        return this.game.nodes.filter(n => 
            n.type === 'nuclearPlant' && n.team === 'player2' && n.constructed
        );
    }

    getPlayerPlants() {
        return this.game.nodes.filter(n => 
            n.type === 'nuclearPlant' && n.team === 'ally' && n.constructed
        );
    }

    getTerritoryPercentage() {
        const myFOBs = this.getEnemyFOBs().length;
        const playerFOBs = this.getPlayerFOBs().length;
        const total = myFOBs + playerFOBs;
        
        if (total === 0) return 50;
        return (myFOBs / total) * 100;
    }
}

export default StateAnalyzer;

