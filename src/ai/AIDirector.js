// ===== DIRECTOR DE IA - COORDINADOR PRINCIPAL =====
// Orquesta todos los sistemas de IA usando arquitectura modular

import AIConfig from './config/AIConfig.js';
import { StateAnalyzer } from './core/StateAnalyzer.js';
import { ActionEvaluator } from './core/ActionEvaluator.js';
import { ThreatAnalyzer } from './core/ThreatAnalyzer.js';
import { getNodeConfig } from '../config/nodes.js';

export class AIDirector {
    constructor(game) {
        this.game = game;
        this.currency = 0;
        this.active = false;
        
        // Componentes del sistema
        this.stateAnalyzer = new StateAnalyzer(game, this);
        this.actionEvaluator = new ActionEvaluator(game, this, this.stateAnalyzer);
        this.threatAnalyzer = new ThreatAnalyzer(game, this);
        
        // Timers para diferentes comportamientos
        this.timers = {
            supply: 0,
            strategic: 0,
            offensive: 0,
            harass: 0,
            statusReport: 0
        };
        
        // Intervalos (con variación para offensive)
        this.intervals = { ...AIConfig.intervals };
        this.intervals.offensive = this.getRandomOffensiveInterval();
        
        // Stats
        this.stats = {
            dronesLaunched: 0,
            snipersLaunched: 0,
            buildingsBuilt: 0,
            decisionsExecuted: 0
        };
        
        // Tracking
        this.resolvedEmergencies = new Set();
        this.lastInitiativeTime = 0;
        this.playerLastDroneTime = 0;
        this.lastThreatCheckTime = 0; // Cooldown para evitar spam de logs de amenazas
        
        console.log('🤖 IA Director: Sistema modular inicializado');
        console.log('📊 Componentes: StateAnalyzer, ActionEvaluator, ThreatAnalyzer');
    }

    /**
     * Activa la IA
     */
    activate() {
        this.active = true;
        console.log('🤖 IA Director: ¡ACTIVADO!');
        console.log(`⚙️ Intervalos: Supply(${this.intervals.supply}s) | Strategic(${this.intervals.strategic}s) | Offensive(${this.intervals.offensive.toFixed(1)}s) | Harass(${this.intervals.harass}s)`);
    }

    /**
     * Desactiva la IA
     */
    deactivate() {
        this.active = false;
        console.log('🤖 IA Director: Desactivado');
    }

    /**
     * Actualiza la IA (llamado cada frame)
     */
    update(dt) {
        if (!this.active) return;
        
        // 1. PRIORIDAD MÁX: Amenazas inmediatas (continuo)
        this.handleImmediateThreats();
        
        // 2. Responder a emergencias médicas (continuo)
        this.respondToMedicalEmergencies();
        
        // 3. Reabastecimiento (cada 2s)
        this.timers.supply += dt;
        if (this.timers.supply >= this.intervals.supply) {
            this.timers.supply = 0;
            this.handleSupply();
        }
        
        // 4. Construcciones estratégicas (cada 8s)
        this.timers.strategic += dt;
        if (this.timers.strategic >= this.intervals.strategic) {
            this.timers.strategic = 0;
            this.handleStrategicBuilding();
        }
        
        // 5. Decisiones ofensivas (cada 35-45s variable)
        this.timers.offensive += dt;
        if (this.timers.offensive >= this.intervals.offensive) {
            this.timers.offensive = 0;
            this.intervals.offensive = this.getRandomOffensiveInterval(); // Nuevo intervalo aleatorio
            this.handleOffensiveDecision();
        }
        
        // 6. Harass con sniper (cada 25s)
        this.timers.harass += dt;
        if (this.timers.harass >= this.intervals.harass) {
            this.timers.harass = 0;
            this.handleSniperHarass();
        }
        
        // 7. Reporte de estado (cada 30s)
        this.timers.statusReport += dt;
        if (this.timers.statusReport >= this.intervals.statusReport) {
            this.timers.statusReport = 0;
            this.printStatusReport();
        }
        
        // 8. Iniciativa si jugador inactivo
        this.checkInitiative();
    }

    /**
     * Maneja amenazas inmediatas (con cooldown de 0.5s para evitar spam)
     */
    handleImmediateThreats() {
        const now = Date.now();
        
        // Cooldown de 500ms para evitar spam de logs
        if (now - this.lastThreatCheckTime < 500) {
            return;
        }
        
        this.lastThreatCheckTime = now;
        const threat = this.threatAnalyzer.analyzeImmediateThreats();
        
        if (threat && threat.response) {
            if (AIConfig.debug.logThreats) {
                console.log(`🚨 IA: Amenaza ${threat.severity} detectada: ${threat.description}`);
                console.log(`   → Respuesta: ${threat.response.type} (prioridad ${threat.response.priority})`);
            }
            
            // Ejecutar respuesta si tengo currency
            const margin = this.actionEvaluator.getMargin(this.stateAnalyzer.analyze());
            if (this.canAfford(threat.response, margin)) {
                threat.response.action();
                this.stats.decisionsExecuted++;
            }
        }
    }

    /**
     * Maneja reabastecimiento (delega a EnemyAISystem)
     */
    handleSupply() {
        // Delegar al sistema legacy que ya tiene esta lógica bien probada
        if (this.game.enemyAI) {
            const enemyHQ = this.game.nodes.find(n => n.type === 'hq' && n.team === 'player2' && n.active);
            const enemyFOBs = this.getEnemyFOBs();
            const enemyFronts = this.getEnemyFronts();
            
            // Reabastecer FOBs
            this.game.enemyAI.ruleResupplyFOBs(enemyHQ, enemyFOBs);
            
            // Reabastecer frentes (necesita 3 parámetros)
            this.game.enemyAI.ruleResupplyFronts(enemyHQ, enemyFOBs, enemyFronts);
        }
    }

    /**
     * Maneja construcciones estratégicas (usa scoring contextual)
     */
    handleStrategicBuilding() {
        const bestAction = this.actionEvaluator.getBestAction('economic');
        
        if (bestAction) {
            if (AIConfig.debug.logDecisions) {
                console.log(`🏗️ IA: Construcción estratégica → ${bestAction.type} (score: ${bestAction.score.toFixed(1)})`);
            }
            bestAction.execute();
            this.stats.decisionsExecuted++;
            this.stats.buildingsBuilt++;
        }
    }

    /**
     * Maneja decisiones ofensivas (usa scoring contextual)
     */
    handleOffensiveDecision() {
        const gameState = this.stateAnalyzer.analyze();
        
        // Log de decisión
        console.log(`⚔️ IA: Decisión ofensiva (${this.intervals.offensive.toFixed(0)}s) - Fase: ${gameState.phase.toUpperCase()}, Estado: ${gameState.strategic.state.toUpperCase()}, Currency: ${this.currency}$`);
        
        // Si está desesperado o perdiendo → solo defensa/economía
        if (gameState.strategic.state === 'desperate' || gameState.strategic.state === 'losing') {
            console.log(`🛡️ IA: Modo supervivencia - Solo construcciones defensivas`);
            const defensiveAction = this.actionEvaluator.getBestAction('economic');
            if (defensiveAction) {
                defensiveAction.execute();
                this.stats.decisionsExecuted++;
            }
            return;
        }
        
        // Currency mínima para actuar
        if (this.currency < AIConfig.thresholds.minCurrencyToAct) {
            console.log(`💤 IA: Sin currency mínima (${this.currency}$ < ${AIConfig.thresholds.minCurrencyToAct}$)`);
            return;
        }
        
        // Obtener mejor acción (todas las categorías)
        const bestAction = this.actionEvaluator.getBestAction('all');
        
        if (bestAction) {
            console.log(`✅ IA: Elegido → ${bestAction.type} (score: ${bestAction.score.toFixed(1)}, cost: ${bestAction.cost}$)`);
            bestAction.execute();
            this.stats.decisionsExecuted++;
            
            if (bestAction.category === 'offensive') {
                if (bestAction.type === 'DRONE') this.stats.dronesLaunched++;
                if (bestAction.type === 'SNIPER') this.stats.snipersLaunched++;
            } else if (bestAction.category === 'economic') {
                this.stats.buildingsBuilt++;
            }
        } else {
            console.log(`⏭️ IA: Sin acción disponible (currency insuficiente o sin opciones viables)`);
        }
    }

    /**
     * Maneja harass con sniper
     */
    handleSniperHarass() {
        const gameState = this.stateAnalyzer.analyze();
        
        // Solo en early-mid game y si no hay amenazas críticas
        if (gameState.phase === 'late') return;
        
        const urgency = this.stateAnalyzer.calculateUrgency();
        if (urgency >= AIConfig.urgency.critical) return; // Demasiada urgencia
        
        // Currency en rango adecuado
        if (this.currency < 120 || this.currency > 249) return;
        
        // Probabilidad de harass
        if (Math.random() > AIConfig.probabilities.sniperHarass) {
            if (AIConfig.debug.logDecisions) {
                console.log(`🎯 IA: Harass skip (${(AIConfig.probabilities.skipHarass * 100).toFixed(0)}%)`);
            }
            return;
        }
        
        this.attemptSniperStrike();
    }

    /**
     * Verifica si puede tomar la iniciativa
     */
    checkInitiative() {
        const now = Date.now();
        
        // Cooldown de 20s
        if (now - this.lastInitiativeTime < 20000) return;
        
        // Jugador inactivo 15s+
        if (now - this.playerLastDroneTime < 15000) return;
        
        // Si no tengo lanzadera, construirla
        if (!this.hasDroneLauncher()) {
            const launcherCost = this.actionEvaluator.getRealCost('LAUNCHER');
            if (this.currency >= launcherCost) {
                console.log(`🤖 IA: [INICIATIVA] Construyendo lanzadera (prerequisito)`);
                this.attemptDroneLauncherConstruction();
                this.lastInitiativeTime = now;
            }
            return;
        }
        
        // Lanzar dron de iniciativa
        const droneCost = this.actionEvaluator.getRealCost('DRONE');
        const margin = AIConfig.margins.normal;
        if (this.currency >= droneCost + margin) {
            this.takeInitiative();
            this.lastInitiativeTime = now;
        }
    }

    /**
     * Responder a emergencias médicas
     */
    respondToMedicalEmergencies() {
        const enemyFronts = this.getEnemyFronts();
        
        enemyFronts.forEach(front => {
            if (this.game.medicalSystem && this.game.medicalSystem.hasEmergency(front.id)) {
                if (this.resolvedEmergencies.has(front.id)) return;
                
                // Probabilidad de responder
                if (Math.random() > AIConfig.probabilities.medicalResponse) {
                    this.resolvedEmergencies.add(front.id);
                    return;
                }
                
                this.sendMedicalAid(front);
                this.resolvedEmergencies.add(front.id);
                
                // Limpiar después de 30s
                setTimeout(() => {
                    this.resolvedEmergencies.delete(front.id);
                }, 30000);
            }
        });
    }

    /**
     * Registra acción del jugador
     */
    onPlayerAction(type, target) {
        this.threatAnalyzer.registerPlayerAction(type, target);
        
        if (type === 'drone') {
            this.playerLastDroneTime = Date.now();
        }
    }

    /**
     * Imprime reporte de estado
     */
    printStatusReport() {
        const state = this.stateAnalyzer.analyze();
        const urgency = this.stateAnalyzer.calculateUrgency();
        
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`🤖 IA DIRECTOR - Estado: ${state.strategic.state.toUpperCase()}`);
        console.log(`💰 Currency: ${this.currency}$ (Income: ${state.economy.myIncome}$/s vs ${state.economy.playerIncome}$/s)`);
        console.log(`🏗️ Infraestructura: ${state.territory.myFOBs} FOBs, ${state.economy.myPlants} Plantas`);
        console.log(`🚁 Lanzadera: ${state.military.hasLauncher ? '✅' : '❌'}`);
        console.log(`📊 Stats: ${this.stats.dronesLaunched} Drones, ${this.stats.snipersLaunched} Snipers, ${this.stats.buildingsBuilt} Edificios, ${this.stats.decisionsExecuted} Decisiones`);
        console.log(`⚠️ Urgencia: ${urgency.toFixed(0)}/150`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    }

    // ===== UTILIDADES Y HELPERS =====
    
    getRandomOffensiveInterval() {
        const base = AIConfig.intervals.offensive;
        const variance = AIConfig.intervals.offensiveVariance;
        return base - variance/2 + Math.random() * variance;
    }

    canAfford(action, margin = 0) {
        return this.currency >= action.cost + margin;
    }

    getEnemyFOBs() {
        return this.game.nodes.filter(n => 
            n.type === 'fob' && n.team === 'player2' && n.constructed && !n.isAbandoning
        );
    }
    
    getEnemyFronts() {
        return this.game.nodes.filter(n => 
            n.type === 'front' && n.team === 'player2' && n.constructed
        );
    }

    hasDroneLauncher() {
        // Delegar al método de EnemyAISystem que ya está probado
        if (this.game.enemyAI && this.game.enemyAI.hasDroneLauncher) {
            return this.game.enemyAI.hasDroneLauncher();
        }
        // Fallback
        return this.game.nodes.some(n => 
            n.type === 'droneLauncher' && 
            n.team === 'player2' && 
            n.constructed &&
            !n.isAbandoning
        );
    }

    // ===== ACCIONES (Delegadas a EnemyAISystem legacy por ahora) =====
    // TODO: Migrar estas funciones a módulos de acción dedicados
    
    attemptFOBConstruction() {
        // Por ahora, usar métodos del sistema legacy
        if (this.game.enemyAI && this.game.enemyAI.attemptFOBConstruction) {
            this.game.enemyAI.attemptFOBConstruction();
        }
    }

    buildNuclearPlant() {
        if (this.game.enemyAI && this.game.enemyAI.buildNuclearPlant) {
            this.game.enemyAI.buildNuclearPlant();
        }
    }

    attemptDroneLauncherConstruction() {
        if (this.game.enemyAI && this.game.enemyAI.attemptDroneLauncherConstruction) {
            this.game.enemyAI.attemptDroneLauncherConstruction();
        }
    }

    attemptDroneLaunch() {
        if (this.game.enemyAI && this.game.enemyAI.attemptDroneLaunch) {
            this.game.enemyAI.attemptDroneLaunch();
        }
    }

    attemptSniperStrike() {
        if (this.game.enemyAI && this.game.enemyAI.attemptSniperStrike) {
            this.game.enemyAI.attemptSniperStrike();
        }
    }

    buildEmergencyFOB() {
        if (this.game.enemyAI && this.game.enemyAI.buildEmergencyFOB) {
            this.game.enemyAI.buildEmergencyFOB();
        }
    }

    takeInitiative() {
        if (this.game.enemyAI && this.game.enemyAI.takeInitiative) {
            this.game.enemyAI.takeInitiative();
        }
    }

    counterDroneWithAntiDrone(target) {
        if (this.game.enemyAI && this.game.enemyAI.counterDroneWithAntiDrone) {
            this.game.enemyAI.counterDroneWithAntiDrone(target);
        }
    }

    reactToDroneableTarget(target) {
        if (this.game.enemyAI && this.game.enemyAI.reactToDroneableTarget) {
            this.game.enemyAI.reactToDroneableTarget(target);
        }
    }

    mirrorPlayerBuilding(type, target) {
        if (this.game.enemyAI && this.game.enemyAI.mirrorPlayerBuilding) {
            this.game.enemyAI.mirrorPlayerBuilding(type, target);
        }
    }

    sendMedicalAid(front) {
        if (this.game.enemyAI && this.game.enemyAI.attemptMedicalResponse) {
            this.game.enemyAI.attemptMedicalResponse(front);
        }
    }
}

export default AIDirector;

