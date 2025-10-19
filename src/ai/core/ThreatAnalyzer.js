// ===== ANALIZADOR DE AMENAZAS =====
// Detecta amenazas inmediatas y determina respuestas apropiadas

import AIConfig from '../config/AIConfig.js';
import { getNodeConfig } from '../../config/nodes.js';

export class ThreatAnalyzer {
    constructor(game, aiSystem) {
        this.game = game;
        this.ai = aiSystem;
        
        // Tracking de acciones del jugador
        this.playerActions = [];
        this.recentThreats = [];
    }
    
    /**
     * Obtiene el costo real de un edificio desde nodes.js
     */
    getRealCost(nodeType) {
        const config = getNodeConfig(nodeType);
        return config?.cost || 0;
    }

    /**
     * Registra una acción del jugador para análisis
     */
    registerPlayerAction(type, target) {
        this.playerActions.push({
            type: type,
            target: target,
            timestamp: Date.now()
        });
        
        // Mantener solo últimos 60s
        const cutoff = Date.now() - 60000;
        this.playerActions = this.playerActions.filter(a => a.timestamp > cutoff);
    }

    /**
     * Analiza amenazas inmediatas y devuelve respuesta recomendada
     * @returns {Object|null} {threat, response, priority}
     */
    analyzeImmediateThreats() {
        // Verificar amenazas en orden de prioridad
        
        // 1. Dron enemigo detectado
        const droneThreats = this.checkDroneThreats();
        if (droneThreats) return droneThreats;
        
        // 2. Construcción amenazante del jugador
        const buildThreats = this.checkBuildThreats();
        if (buildThreats) return buildThreats;
        
        // 3. Presión económica
        const economicThreats = this.checkEconomicThreats();
        if (economicThreats) return economicThreats;
        
        // 4. Presión territorial
        const territorialThreats = this.checkTerritorialThreats();
        if (territorialThreats) return territorialThreats;
        
        return null;
    }

    /**
     * Verifica amenazas de drones
     */
    checkDroneThreats() {
        // Buscar acción de dron reciente (últimos 3s)
        const recentDrone = this.playerActions.find(a => 
            a.type === 'drone' && 
            (Date.now() - a.timestamp) < 3000
        );
        
        if (!recentDrone) return null;
        
        // Determinar target del dron
        const target = recentDrone.target;
        
        // Probabilidad de respuesta
        const roll = Math.random();
        if (roll > AIConfig.probabilities.counterDrone) {
            // Silencioso - no spamear logs cuando no responde
            return null;
        }
        
        return {
            threat: 'player_drone',
            severity: 'high',
            description: `Dron del jugador hacia ${target.type}`,
            response: {
                type: 'counter_drone',
                action: () => this.ai.counterDroneWithAntiDrone(target),
                priority: 90
            }
        };
    }

    /**
     * Verifica amenazas de construcciones
     */
    checkBuildThreats() {
        // Buscar construcciones recientes (últimos 5s)
        const recentBuilds = this.playerActions.filter(a => 
            (a.type === 'nuclearPlant' || a.type === 'campaignHospital' || a.type === 'antiDrone') &&
            (Date.now() - a.timestamp) < 5000
        );
        
        if (recentBuilds.length === 0) return null;
        
        // Analizar la construcción más reciente
        const build = recentBuilds[recentBuilds.length - 1];
        
        // Planta Nuclear = amenaza económica alta
        if (build.type === 'nuclearPlant') {
            const roll = Math.random();
            
            // 25% copiar planta
            if (roll < AIConfig.probabilities.mirrorPlant) {
                return {
                    threat: 'player_plant',
                    severity: 'high',
                    description: 'Jugador construyó Planta Nuclear',
                    response: {
                        type: 'mirror_plant',
                        action: () => this.ai.mirrorPlayerBuilding(build.type, build.target),
                        priority: 75
                    }
                };
            }
            
            // 35% lanzar dron
            const droneCost = this.getRealCost('drone');
            if (roll < 0.60 && this.ai.hasDroneLauncher() && this.ai.currency >= droneCost) {
                return {
                    threat: 'player_plant',
                    severity: 'high',
                    description: 'Jugador construyó Planta Nuclear',
                    response: {
                        type: 'drone_strike',
                        action: () => this.ai.reactToDroneableTarget(build.target),
                        priority: 80
                    }
                };
            }
            
            // Si no puede responder, log
            if (AIConfig.debug.logThreats) {
                console.log(`🤖 IA: Planta detectada pero sin respuesta adecuada (roll: ${roll.toFixed(2)}, launcher: ${this.ai.hasDroneLauncher()}, $: ${this.ai.currency})`);
            }
        }
        
        // Hospital = amenaza táctica media
        if (build.type === 'campaignHospital') {
            const roll = Math.random();
            
            // 20% copiar hospital
            if (roll < AIConfig.probabilities.mirrorHospital) {
                return {
                    threat: 'player_hospital',
                    severity: 'medium',
                    description: 'Jugador construyó Hospital',
                    response: {
                        type: 'mirror_hospital',
                        action: () => this.ai.mirrorPlayerBuilding(build.type, build.target),
                        priority: 60
                    }
                };
            }
            
            // 30% lanzar dron
            const droneCost = this.getRealCost('drone');
            if (roll < 0.50 && this.ai.hasDroneLauncher() && this.ai.currency >= droneCost) {
                return {
                    threat: 'player_hospital',
                    severity: 'medium',
                    description: 'Jugador construyó Hospital',
                    response: {
                        type: 'drone_strike',
                        action: () => this.ai.reactToDroneableTarget(build.target),
                        priority: 65
                    }
                };
            }
        }
        
        // Anti-Drone = respuesta táctica
        if (build.type === 'antiDrone') {
            const roll = Math.random();
            
            // 30% copiar anti-drone
            if (roll < AIConfig.probabilities.mirrorAntiDrone) {
                return {
                    threat: 'player_antidrone',
                    severity: 'low',
                    description: 'Jugador construyó Anti-Drone',
                    response: {
                        type: 'mirror_antidrone',
                        action: () => this.ai.mirrorPlayerBuilding(build.type, build.target),
                        priority: 50
                    }
                };
            }
        }
        
        return null;
    }

    /**
     * Verifica amenazas económicas
     */
    checkEconomicThreats() {
        const myPlants = this.game.nodes.filter(n => 
            n.type === 'nuclearPlant' && n.team === 'player2' && n.constructed
        ).length;
        
        const playerPlants = this.game.nodes.filter(n => 
            n.type === 'nuclearPlant' && n.team === 'ally' && n.constructed
        ).length;
        
        // Si jugador tiene 2+ plantas más que yo = URGENTE
        if (playerPlants - myPlants >= 2) {
            return {
                threat: 'economic_gap',
                severity: 'high',
                description: `Jugador tiene ${playerPlants} plantas vs ${myPlants} nuestras`,
                response: {
                    type: 'build_plant',
                    action: () => this.ai.buildNuclearPlant(),
                    priority: 85
                }
            };
        }
        
        return null;
    }

    /**
     * Verifica amenazas territoriales
     */
    checkTerritorialThreats() {
        const myFOBs = this.game.nodes.filter(n => 
            n.type === 'fob' && n.team === 'player2' && n.constructed && !n.isAbandoning
        ).length;
        
        // Si tengo 0 FOBs = EMERGENCIA
        if (myFOBs === 0) {
            return {
                threat: 'no_fobs',
                severity: 'critical',
                description: 'Sin FOBs operativos',
                response: {
                    type: 'emergency_fob',
                    action: () => this.ai.buildEmergencyFOB(),
                    priority: 100
                }
            };
        }
        
        // Si tengo 1 FOB = URGENTE
        if (myFOBs === 1) {
            return {
                threat: 'low_fobs',
                severity: 'high',
                description: 'Solo 1 FOB operativo',
                response: {
                    type: 'build_fob',
                    action: () => this.ai.attemptFOBConstruction(),
                    priority: 95
                }
            };
        }
        
        return null;
    }

    /**
     * Calcula score de urgencia global
     */
    calculateGlobalUrgency() {
        let urgency = 0;
        
        // Drones activos del jugador
        const playerDrones = this.game.droneSystem?.drones?.filter(d => d.team === 'ally') || [];
        urgency += playerDrones.length * AIConfig.urgency.underDroneAttack;
        
        // Gap económico
        const myPlants = this.game.nodes.filter(n => 
            n.type === 'nuclearPlant' && n.team === 'player2' && n.constructed
        ).length;
        
        const playerPlants = this.game.nodes.filter(n => 
            n.type === 'nuclearPlant' && n.team === 'ally' && n.constructed
        ).length;
        
        if (playerPlants > myPlants) {
            urgency += (playerPlants - myPlants) * AIConfig.urgency.playerHasMorePlants;
        }
        
        // FOBs críticos
        const myFOBs = this.game.nodes.filter(n => 
            n.type === 'fob' && n.team === 'player2' && n.constructed && !n.isAbandoning
        );
        
        const lowSupplyFOBs = myFOBs.filter(fob => 
            fob.supplies / fob.maxSupplies < 0.3
        );
        
        urgency += lowSupplyFOBs.length * AIConfig.urgency.fobsUnder30Percent;
        
        return urgency;
    }
}

export default ThreatAnalyzer;

