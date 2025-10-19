// ===== SISTEMA DE IA ENEMIGA =====
// Sistema modular basado en reglas para controlar las acciones del enemigo
// Completamente aislado del resto de sistemas

import { FOB_CURRENCY_CONFIG } from '../config/constants.js';
import { getNodeConfig } from '../config/nodes.js';

export class EnemyAISystem {
    constructor(game, difficulty = 'medium') {
        this.game = game;
        this.difficulty = difficulty;
        
        // Aplicar configuración según dificultad
        this.applyDifficultyConfig();
        
        // Timers independientes para cada comportamiento
        this.fobCheckTimer = 0;
        this.frontCheckTimer = 0;
        // reactCheckTimer eliminado - Las reacciones son cada frame ahora
        this.harassCheckTimer = 0;
        this.offensiveCheckTimer = 0;
        this.buildCheckTimer = 0;
        this.emergencyFobCheckTimer = 0;
        this.lastAutoFobTime = 0; // Cooldown para FOB automático
        this.truckFactoryTimer = 0; // Timer para Truck Factory automática
        this.statusReportTimer = 0; // Timer para reporte de estado cada 30s
        this.statusReportInterval = 30.0; // Reporte cada 30 segundos
        
        // Sistema de currency enemigo (independiente del jugador)
        this.currency = 0;
        this.currencyAccumulator = 0;
        
        // Tracking de acciones del jugador
        this.playerLastAction = null; // { type: 'drone'|'antiDrone'|'nuclearPlant'|'hospital', target: {x, y}, timestamp: Date.now() }
        this.playerLastDroneTime = 0; // Timestamp del último dron del jugador
        this.lastInitiativeTime = 0; // Cooldown para iniciativa
        this.lastDroneLaunchTime = 0; // Timestamp del último dron lanzado por la IA
        this.hasLaunchedDroneRecently = false; // Flag para evaluar necesidades estratégicas
        
        // Tracking de emergencias médicas atendidas (para no enviar múltiples ambulancias)
        this.medicalEmergenciesHandled = new Set(); // frontIds de emergencias ya atendidas
        
        // Estado interno
        this.enabled = true; // Puede desactivarse para testing
        this.debugMode = false; // Logs detallados (desactivar para producción)
        
        // Estadísticas (para debugging)
        this.stats = {
            decisions: 0,
            suppliesSent: 0,
            medicsSent: 0,
            buildingsBuilt: 0,
            dronesLaunched: 0,
            snipersLaunched: 0
        };
    }
    
    /**
     * Aplica configuración según dificultad seleccionada
     */
    applyDifficultyConfig() {
        const configs = {
            easy: {
                // COMPORTAMIENTO: Más conservadora
                fobCheckInterval: 4.0,        // Menos frecuente (vs 2.0 actual)
                frontCheckInterval: 6.0,      // Menos frecuente (vs 3.0 actual)
                harassCheckInterval: 45.0,    // Harass menos frecuente (vs 25.0)
                offensiveCheckInterval: 60.0, // Ataques más espaciados (vs 40.0)
                buildCheckInterval: 12.0,     // Construcciones más lentas (vs 8.0)
                emergencyFobCheckInterval: 5.0, // Emergencias menos frecuentes (vs 3.0)
                truckFactoryInterval: 240.0,  // Más lento (vs 180.0)
                
                // REACCIONES: Más lentas y menos agresivas
                reactionWindow: 5.0,          // Tiempo para reaccionar (vs 3.0 actual)
                mirrorSuccessRate: 0.2,       // 20% éxito copiando (vs 30%)
                counterDroneRate: 0.4,        // 40% éxito contra drones (vs 60%)
                
                // INICIATIVA: Menos agresiva
                initiativeDelay: 30.0,        // Más tiempo inactivo antes de actuar (vs 15.0)
                offensiveChance: 0.3,         // 30% chance de atacar (vs 50%)
                
                // MARGENES: Más conservadora económicamente
                currencyMargin: 80,           // +80$ margen de seguridad (vs 50$)
                
                name: 'Defensiva'
            },
            medium: {
                // COMPORTAMIENTO ACTUAL del sistema
                fobCheckInterval: 2.0,
                frontCheckInterval: 3.0,
                harassCheckInterval: 25.0,
                offensiveCheckInterval: 40.0,
                buildCheckInterval: 8.0,
                emergencyFobCheckInterval: 3.0,
                truckFactoryInterval: 180.0,
                
                reactionWindow: 3.0,
                mirrorSuccessRate: 0.3,
                counterDroneRate: 0.6,
                
                initiativeDelay: 15.0,
                offensiveChance: 0.5,
                
                currencyMargin: 50,
                
                name: 'Equilibrada'
            },
            hard: {
                // COMPORTAMIENTO: Más agresiva y reactiva
                fobCheckInterval: 1.5,        // Más frecuente (vs 2.0 actual)
                frontCheckInterval: 2.0,      // Más frecuente (vs 3.0 actual)
                harassCheckInterval: 20.0,    // Harass más frecuente (vs 25.0)
                offensiveCheckInterval: 30.0, // Ataques más frecuentes (vs 40.0)
                buildCheckInterval: 6.0,      // Construcciones más rápidas (vs 8.0)
                emergencyFobCheckInterval: 2.0, // Emergencias más frecuentes (vs 3.0)
                truckFactoryInterval: 150.0,  // Más rápido (vs 180.0)
                
                // REACCIONES: Más rápidas y efectivas
                reactionWindow: 2.0,          // Reacciona más rápido (vs 3.0)
                mirrorSuccessRate: 0.5,       // 50% éxito copiando (vs 30%)
                counterDroneRate: 0.8,        // 80% éxito contra drones (vs 60%)
                
                // INICIATIVA: Más agresiva
                initiativeDelay: 10.0,        // Menos tiempo inactivo (vs 15.0)
                offensiveChance: 0.7,         // 70% chance de atacar (vs 50%)
                
                // MARGENES: Más agresiva económicamente
                currencyMargin: 30,           // Solo +30$ margen (vs 50$)
                
                name: 'Agresiva'
            }
        };
        
        const config = configs[this.difficulty] || configs.medium;
        
        // Aplicar configuración
        this.fobCheckInterval = config.fobCheckInterval;
        this.frontCheckInterval = config.frontCheckInterval;
        this.harassCheckInterval = config.harassCheckInterval;
        this.offensiveCheckInterval = config.offensiveCheckInterval;
        this.buildCheckInterval = config.buildCheckInterval;
        this.emergencyFobCheckInterval = config.emergencyFobCheckInterval;
        this.truckFactoryInterval = config.truckFactoryInterval;
        
        // Almacenar configuraciones de comportamiento
        this.reactionWindow = config.reactionWindow;
        this.mirrorSuccessRate = config.mirrorSuccessRate;
        this.counterDroneRate = config.counterDroneRate;
        this.initiativeDelay = config.initiativeDelay;
        this.offensiveChance = config.offensiveChance;
        this.currencyMargin = config.currencyMargin;
        this.difficultyName = config.name;
        
        console.log(`🤖 IA: Dificultad "${config.name}" aplicada (${this.difficulty})`);
    }
    
    /**
     * Actualiza la IA enemiga
     * Cada comportamiento tiene su propio intervalo (APM simulado)
     */
    update(dt) {
        if (!this.enabled) return;
        
        // Actualizar currency pasiva del enemigo
        this.updateCurrency(dt);
        
        // Obtener nodos enemigos (una sola vez)
        const enemyHQ = this.getEnemyHQ();
        const enemyFOBs = this.getEnemyFOBs();
        const enemyFronts = this.getEnemyFronts();
        
        if (!enemyHQ) return;
        
        // === COMPORTAMIENTO 1: Comprobar FOBs cada 2 segundos ===
        this.fobCheckTimer += dt;
        if (this.fobCheckTimer >= this.fobCheckInterval) {
            this.fobCheckTimer = 0;
            this.ruleResupplyFOBs(enemyHQ, enemyFOBs);
        }
        
        // === COMPORTAMIENTO 2: Comprobar Frentes cada 3 segundos ===
        this.frontCheckTimer += dt;
        if (this.frontCheckTimer >= this.frontCheckInterval) {
            this.frontCheckTimer = 0;
            this.ruleResupplyFronts(enemyHQ, enemyFOBs, enemyFronts);
        }
        
        // === COMPORTAMIENTO 3: Reaccionar al jugador ===
        // Amenazas económicas/médicas: CADA FRAME (inmediato)
        // Otras reacciones: cada 2.5s
        this.ruleReactToPlayer();
        
        // === COMPORTAMIENTO 4: EMERGENCIA - Construir FOB si tiene 0 FOBs (cada 3s) ===
        this.emergencyFobCheckTimer += dt;
        if (this.emergencyFobCheckTimer >= this.emergencyFobCheckInterval) {
            this.emergencyFobCheckTimer = 0;
            const hasEmergency = this.ruleEmergencyFOB();
            
            // Si hubo emergencia y se construyó, no hacer más en este ciclo
            if (hasEmergency) {
            return;
        }
        }
        
        // === COMPORTAMIENTO 5: Harass con sniper cada 25 segundos (early game) ===
        this.harassCheckTimer += dt;
        if (this.harassCheckTimer >= this.harassCheckInterval) {
            this.harassCheckTimer = 0;
            this.ruleSniperHarass();
        }
        
        // === COMPORTAMIENTO 6: Ataque ofensivo programado cada 40 segundos ===
        this.offensiveCheckTimer += dt;
        if (this.offensiveCheckTimer >= this.offensiveCheckInterval) {
            this.offensiveCheckTimer = 0;
            this.ruleOffensiveStrike();
        }
        
        // === COMPORTAMIENTO 7: Construcciones estratégicas cada 8 segundos ===
        this.buildCheckTimer += dt;
        if (this.buildCheckTimer >= this.buildCheckInterval) {
            this.buildCheckTimer = 0;
            this.ruleStrategicBuilding();
        }
        
        // === COMPORTAMIENTO 8: Truck Factory automática cada 3 minutos ===
        this.truckFactoryTimer += dt;
        if (this.truckFactoryTimer >= this.truckFactoryInterval) {
            this.truckFactoryTimer = 0;
            this.spawnEnemyTruckFactory();
        }
        
        // === COMPORTAMIENTO 9: Responder a emergencias médicas (CONTINUO, CADA FRAME) ===
        // NOTA: Las emergencias se crean en MedicalEmergencySystem (sistema global)
        // La IA solo RESPONDE a emergencias, no las crea
        this.respondToMedicalEmergencies();
        
        // === REPORTE DE ESTADO: Cada 30 segundos ===
        this.statusReportTimer += dt;
        if (this.statusReportTimer >= this.statusReportInterval) {
            this.statusReportTimer = 0;
            this.printStatusReport();
        }
    }
    
    /**
     * Imprime un reporte consolidado del estado de la IA
     */
    printStatusReport() {
        const enemyFOBs = this.getEnemyFOBs();
        const enemyPlants = this.game.nodes.filter(n => 
            n.type === 'nuclearPlant' && n.team === 'player2' && n.constructed
        ).length;
        const enemyHospitals = this.game.nodes.filter(n => 
            n.type === 'campaignHospital' && n.team === 'player2' && n.constructed
        ).length;
        const hasLauncher = this.hasDroneLauncher();
        const gameState = this.analyzeGameState();
        
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`🤖 IA STATUS - Estado: ${gameState.toUpperCase()}`);
        console.log(`💰 Currency: ${this.currency}$ (tasa: ${3 + enemyPlants * 2}$/s)`);
        console.log(`🏗️ Infraestructura: ${enemyFOBs.length} FOBs, ${enemyPlants} Plantas, ${enemyHospitals} Hospitales`);
        console.log(`🚁 Lanzadera: ${hasLauncher ? '✅ Activa' : '❌ No construida'}`);
        console.log(`📊 Stats: ${this.stats.dronesLaunched} Drones, ${this.stats.snipersLaunched} Snipers, ${this.stats.buildingsBuilt} Edificios`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    }
    
    /**
     * Actualiza la currency enemiga (generación pasiva + bonus de plantas nucleares)
     */
    updateCurrency(dt) {
        // Calcular bonus de plantas nucleares enemigas
        const enemyNuclearPlants = this.game.nodes.filter(n => 
            n.type === 'nuclearPlant' && 
            n.team === 'player2' &&
            n.constructed && 
            !n.isConstructing
        );
        
        const nuclearBonus = enemyNuclearPlants.length * 2;
        const aiAdvantageRate = 1/3; // +1$ cada 3s (0.33$/s) para compensar limitaciones de IA
        const totalRate = FOB_CURRENCY_CONFIG.passiveRate + nuclearBonus + aiAdvantageRate;
        
        this.currencyAccumulator += dt * totalRate;
        
        // Cuando acumulamos al menos 1, otorgar currency
        if (this.currencyAccumulator >= 1) {
            const currencyToAdd = Math.floor(this.currencyAccumulator);
            this.currency += currencyToAdd;
            this.currencyAccumulator -= currencyToAdd;
            
            // Log solo cada 100$ para no spamear
            if (this.currency % 100 <= currencyToAdd && this.currency >= 100) {
                console.log(`💰 IA: Currency acumulada: ${this.currency}$ (tasa: ${totalRate}$/s)`);
            }
        }
    }
    
    // ========================================
    // REGLAS DE IA
    // ========================================
    
    /**
     * REGLA 1: Reabastecer FOBs con menos del 50% de suministros
     */
    ruleResupplyFOBs(enemyHQ, enemyFOBs) {
        if (!enemyHQ || !enemyFOBs || enemyFOBs.length === 0) return;
        
        // Enviar a TODOS los FOBs que cumplan la condición (no solo al primero)
        for (const fob of enemyFOBs) {
            // Verificar si el FOB necesita suministros
            const supplyPercentage = (fob.supplies / fob.maxSupplies) * 100;
            
            if (supplyPercentage < 50) {
                // Intentar enviar convoy desde el HQ
                const success = this.sendSupplyConvoy(enemyHQ, fob);
                
                if (success) {
                    this.stats.suppliesSent++;
                    if (this.debugMode) {
                        console.log(`🤖 IA: Enviando suministros al FOB enemigo (${supplyPercentage.toFixed(0)}% suministros)`);
                    }
                    // NO hacer return - continuar revisando otros FOBs
                }
            }
        }
    }
    
    /**
     * REGLA 2: Reabastecer Frentes con menos del 50% de suministros
     * Revisa TODOS los frentes y envía a los que cumplan la condición
     */
    ruleResupplyFronts(enemyHQ, enemyFOBs, enemyFronts) {
        if (!enemyFronts || enemyFronts.length === 0) {
            if (this.debugMode) {
                console.log('🤖 IA: No hay frentes enemigos detectados');
            }
            return;
        }
        
        // Revisar TODOS los frentes (no solo el primero)
        for (const front of enemyFronts) {
            // Verificar si el frente necesita suministros
            const supplyPercentage = (front.supplies / front.maxSupplies) * 100;
            
            if (this.debugMode && supplyPercentage < 70) {
                console.log(`🤖 IA: Frente enemigo necesita suministros (${supplyPercentage.toFixed(0)}%)`);
            }
            
            if (supplyPercentage < 70) {
                // Buscar el FOB más cercano con suministros y vehículos disponibles
                const closestFOB = this.findClosestFOBWithResources(front, enemyFOBs);
                
                if (closestFOB) {
                    const success = this.sendSupplyConvoy(closestFOB, front);
                    
                    if (success) {
                        this.stats.suppliesSent++;
                        if (this.debugMode) {
                            console.log(`🤖 IA: Enviando suministros al Frente enemigo desde FOB (${supplyPercentage.toFixed(0)}% suministros)`);
                        }
                        // NO hacer return - continuar revisando otros Frentes
                        continue; // Pasar al siguiente frente
                    }
                }
            }
        }
    }
    
    /**
     * REGLA 3: Reaccionar a las acciones del jugador
     * Analiza la última acción del jugador y reacciona/copia/contrarresta
     * NOTA: Se ejecuta CADA FRAME para reacciones rápidas a amenazas económicas
     */
    ruleReactToPlayer() {
        const now = Date.now();
        
        // === REACCIÓN A ACCIONES DEL JUGADOR ===
        if (this.playerLastAction) {
            const actionAge = (now - this.playerLastAction.timestamp) / 1000; // En segundos
            
            // Solo reaccionar si la acción es MUY reciente (según dificultad)
            if (actionAge < this.reactionWindow) {
                this.reactToPlayerAction(this.playerLastAction);
                // Limpiar la acción procesada
                this.playerLastAction = null;
                return; // No hacer más en este ciclo
            } else {
                // Acción demasiado vieja, limpiarla
                this.playerLastAction = null;
            }
        }
        
        // === INICIATIVA: Si el jugador no ha hecho nada ===
        const timeSinceLastDrone = (now - this.playerLastDroneTime) / 1000; // En segundos
        const timeSinceLastInitiative = (now - this.lastInitiativeTime) / 1000; // En segundos
        
        // Si el jugador lleva tiempo sin lanzar dron Y han pasado tiempo desde la última iniciativa (según dificultad)
        if (timeSinceLastDrone >= this.initiativeDelay && timeSinceLastInitiative >= 20) {
            const initiated = this.takeInitiative();
            if (initiated) {
                this.lastInitiativeTime = now;
            }
        }
    }
    
    /**
     * Reacciona a una acción específica del jugador
     */
    reactToPlayerAction(action) {
        if (!action || !action.type) return;
        
        switch(action.type) {
            case 'drone':
                // Jugador lanzó un dron → IA intenta colocar anti-drone (según dificultad)
                if (Math.random() < this.counterDroneRate) {
                    this.counterDroneWithAntiDrone(action.target);
                } else if (this.debugMode) {
                    console.log(`🤖 IA: Fallé en detectar el dron del jugador (${((1-this.counterDroneRate)*100).toFixed(0)}% fallo)`);
                }
                break;
                
            case 'antiDrone':
                // Jugador construyó anti-drone → IA copia en mirror (según dificultad)
                if (Math.random() < this.mirrorSuccessRate) {
                    this.mirrorPlayerBuilding(action.type, action.target);
                } else if (this.debugMode) {
                    console.log(`🤖 IA: No copié el anti-drone del jugador (${((1-this.mirrorSuccessRate)*100).toFixed(0)}% fallo)`);
                }
                break;
                
            case 'nuclearPlant':
                // Jugador construyó planta nuclear → IA debe REACCIONAR
                const roll = Math.random();
                const droneConfig = getNodeConfig('drone');
                
                console.log(`🤖 IA: [REACCIÓN] 🏭 Planta Nuclear detectada - Currency IA: ${this.currency}$, Roll: ${roll.toFixed(2)}`);
                
                if (roll < 0.25) {
                    // 25% - Copiar en espejo
                    console.log(`🤖 IA: [REACCIÓN] → Decidió COPIAR planta (25%)`);
                    this.mirrorPlayerBuilding(action.type, action.target);
                } else if (roll < 0.6) {
                    // 35% - Lanzar dron para destruirla (SIN MARGEN - trade económico directo)
                    if (!this.hasDroneLauncher()) {
                        console.log('🤖 IA: [REACCIÓN] → ❌ BLOQUEADO - Sin lanzadera para atacar planta nuclear');
                    } else if (this.currency >= (droneConfig?.cost || 175)) {
                        console.log('🤖 IA: [REACCIÓN] → ⚠️ AMENAZA ECONÓMICA - Lanzando dron REACTIVO (trade: 175$ vs 200$)');
                        this.reactToDroneableTarget(action.target, 'nuclearPlant');
                    } else {
                        console.log(`🤖 IA: [REACCIÓN] → ❌ SIN CURRENCY para dron reactivo (${this.currency}$/175$)`);
                    }
                } else {
                    // 40% - Ignorar
                    console.log(`🤖 IA: [REACCIÓN] → Decidió IGNORAR planta (40% - ahorrando)`);
                }
                break;
                
            case 'campaignHospital':
                // Jugador construyó hospital → Amenaza médica moderada
                const hospitalRoll = Math.random();
                const droneConfig2 = getNodeConfig('drone');
                
                console.log(`🤖 IA: [REACCIÓN] 🏥 Hospital detectado - Currency IA: ${this.currency}$, Roll: ${hospitalRoll.toFixed(2)}`);
                
                if (hospitalRoll < 0.2) {
                    // 20% - Copiar en espejo
                    console.log(`🤖 IA: [REACCIÓN] → Decidió COPIAR hospital (20%)`);
                    this.mirrorPlayerBuilding(action.type, action.target);
                } else if (hospitalRoll < 0.5) {
                    // 30% - Lanzar dron para destruirlo (SIN MARGEN - trade económico)
                    if (!this.hasDroneLauncher()) {
                        console.log('🤖 IA: [REACCIÓN] → ❌ BLOQUEADO - Sin lanzadera para atacar hospital');
                    } else if (this.currency >= (droneConfig2?.cost || 175)) {
                        console.log('🤖 IA: [REACCIÓN] → ⚠️ AMENAZA MÉDICA - Lanzando dron REACTIVO (trade: 175$ vs 125$)');
                        this.reactToDroneableTarget(action.target, 'campaignHospital');
                    } else {
                        console.log(`🤖 IA: [REACCIÓN] → ❌ SIN CURRENCY para dron reactivo (${this.currency}$/175$)`);
                    }
                } else {
                    // 50% - Ignorar
                    console.log(`🤖 IA: [REACCIÓN] → Decidió IGNORAR hospital (50% - ahorrando)`);
                }
                break;
        }
    }
    
    /**
     * Reacciona a una amenaza económica/médica lanzando un dron inmediato
     * (aunque la IA esté en mid game, <300$)
     * NOTA: SIN MARGEN de reserva - Es un trade económico directo
     * @param {Object} targetPos - Posición {x, y} del edificio amenazante
     * @param {string} buildingType - Tipo de edificio ('nuclearPlant' o 'campaignHospital')
     */
    reactToDroneableTarget(targetPos, buildingType) {
        // EVALUAR NECESIDADES ESTRATÉGICAS: ¿Debería construir algo antes?
        if (this.shouldBuildBeforeDrone()) {
            return; // Construyó algo, no lanzar dron reactivo esta vez
        }
        
        // Verificar si tiene lanzadera
        if (!this.hasDroneLauncher()) {
            if (this.debugMode) {
                console.log(`🤖 IA: [REACCIÓN] ❌ No tiene lanzadera de drones para reaccionar`);
            }
            return;
        }
        
        const droneConfig = getNodeConfig('drone');
        if (!droneConfig || this.currency < droneConfig.cost) return; // SIN MARGEN
        
        // Buscar el edificio construido (puede no estar exactamente en targetPos por construcción)
        const target = this.game.nodes.find(n => 
            n.type === buildingType &&
            n.team === 'ally' &&
            n.constructed &&
            Math.hypot(n.x - targetPos.x, n.y - targetPos.y) < 50 // Cerca de donde se construyó
        );
        
        if (!target) {
            console.log(`🤖 IA: [REACCIÓN] ❌ No encontré el ${buildingType} para atacar`);
            return;
        }
        
        // Lanzar dron reactivo (INCLUSO en mid game)
        const droneStartX = this.game.worldWidth;
        const droneStartY = target.y;
        
        this.game.droneSystem.launchDrone(droneStartX, droneStartY, target, 'enemy');
        this.currency -= droneConfig.cost;
        this.stats.dronesLaunched++;
        this.lastDroneLaunchTime = Date.now(); // Actualizar timestamp del último dron
        this.hasLaunchedDroneRecently = true; // Marcar que lanzó un dron recientemente
        
        const threatType = buildingType === 'nuclearPlant' ? 'Planta' : 'Hospital';
        console.log(`🤖 IA: 🚁 DRON REACTIVO → ${threatType} destruido | ${this.currency}$ restantes`);
    }
    
    /**
     * Contrarresta un dron del jugador colocando un anti-drone en el objetivo
     */
    counterDroneWithAntiDrone(targetNode) {
        if (!targetNode || !targetNode.x || !targetNode.y) return;
        
        const antiDroneConfig = getNodeConfig('antiDrone');
        if (!antiDroneConfig || !antiDroneConfig.enabled) return;
        
        // Verificar si tenemos currency + margen de seguridad (según dificultad)
        if (this.currency < antiDroneConfig.cost + this.currencyMargin) {
            if (this.debugMode) {
                console.log(`🤖 IA: No tengo currency para anti-drone (tengo ${this.currency}$, necesito ${antiDroneConfig.cost + this.currencyMargin}$)`);
            }
            return;
        }
        
        // Colocar anti-drone en el objetivo del dron del jugador
        const antiDrone = this.game.baseFactory.createBase(
            targetNode.x + Math.random() * 80 - 50, // Pequeña variación para no ser exacto
            targetNode.y + Math.random() * 60 - 40,
            'antiDrone',
            { isConstructed: true, team: 'player2' }
        );
        
        if (antiDrone) {
            this.game.nodes.push(antiDrone);
            this.currency -= antiDroneConfig.cost;
            this.stats.buildingsBuilt++;
            
            console.log(`🤖 IA: 🛡️ ANTI-DRONE colocado (contramedida) | ${this.currency}$ restantes`);
        }
    }
    
    /**
     * Copia un edificio del jugador en posición espejo (mirror)
     */
    mirrorPlayerBuilding(buildingType, targetPos) {
        const config = getNodeConfig(buildingType);
        
        if (!config || !config.enabled) return;
        
        // Verificar si tenemos currency + margen de seguridad (según dificultad)
        if (this.currency < config.cost + this.currencyMargin) {
            if (this.debugMode) {
                console.log(`🤖 IA: No tengo currency para ${buildingType} (tengo ${this.currency}$, necesito ${config.cost + this.currencyMargin}$)`);
                        }
                        return;
                    }
        
        // Calcular posición espejo (relativo al centro del canvas)
        const centerX = this.game.canvas.width / 2;
        const mirrorX = centerX + (centerX - targetPos.x);
        const mirrorY = targetPos.y; // Misma Y
        
        // Determinar el tipo a usar para construcción
        // antiDrone tiene enemy_antiDrone, pero nuclearPlant y campaignHospital usan el mismo tipo con team: 'player2'
        const typeToUse = buildingType === 'antiDrone' ? 'enemy_antiDrone' : buildingType;
        
        // Crear edificio enemigo
        const building = this.game.baseFactory.createBase(
            mirrorX,
            mirrorY,
            typeToUse,
            { isConstructed: true, team: 'player2' }
        );
        
        if (building) {
            this.game.nodes.push(building);
            this.currency -= config.cost;
            this.stats.buildingsBuilt++;
            
            const buildingName = buildingType === 'nuclearPlant' ? 'Planta Nuclear' : 
                                buildingType === 'campaignHospital' ? 'Hospital' : 'Anti-Drone';
            console.log(`🤖 IA: 🏗️ ${buildingName} copiado (mirror) | ${this.currency}$ restantes`);
        }
    }
    
    /**
     * La IA toma la iniciativa cuando el jugador lleva tiempo inactivo
     * @returns {boolean} true si se lanzó un dron con éxito
     */
    takeInitiative() {
        // Verificar si tiene lanzadera
        if (!this.hasDroneLauncher()) {
            // Si no tiene lanzadera pero tiene currency, construirla
            if (this.currency >= 200) {
                console.log(`🤖 IA: [INICIATIVA] Construyendo lanzadera (prerequisito para drones)`);
                this.attemptDroneLauncherConstruction();
                return true;
            }
            if (this.debugMode) {
                console.log(`🤖 IA: [INICIATIVA] No tiene lanzadera y sin currency suficiente (${this.currency}$/200$)`);
            }
            return false;
        }
        
        const droneConfig = getNodeConfig('drone');
        if (!droneConfig || !droneConfig.enabled) return false;
        
        // Verificar si tenemos currency + margen de seguridad (50$)
        if (this.currency < droneConfig.cost + 50) {
            if (this.debugMode) {
                console.log(`🤖 IA: No tengo currency para dron (tengo ${this.currency}$, necesito ${droneConfig.cost + 50}$)`);
            }
            return false;
        }
        
        // Buscar TODOS los edificios aliados destruibles
        const allyTargets = this.game.nodes.filter(n => 
            (n.type === 'fob' || 
             n.type === 'nuclearPlant' || 
             n.type === 'campaignHospital') &&
            n.team === 'ally' &&
            n.constructed &&
            !n.isAbandoning
        );
        
        if (allyTargets.length === 0) return false;
        
        // Seleccionar el mejor objetivo según priorización estratégica
        const bestTarget = this.selectBestDroneTarget(allyTargets);
        
        // Lanzar dron enemigo desde el borde derecho
        const droneStartX = this.game.worldWidth;
        const droneStartY = bestTarget.y;
        
        this.game.droneSystem.launchDrone(droneStartX, droneStartY, bestTarget, 'enemy');
        this.currency -= droneConfig.cost;
        this.stats.dronesLaunched++;
        
        // Resetear el timer de inactividad del jugador
        this.playerLastDroneTime = Date.now();
        
        console.log(`🤖 IA: 🚁 DRON INICIATIVA → ${bestTarget.name} (jugador inactivo) | ${this.currency}$ restantes`);
        return true;
    }
    
    /**
     * REGLA 4: MODO EMERGENCIA - Construir FOB si tiene 0 FOBs
     * Máxima prioridad - Se ejecuta cada 3 segundos
     * @returns {boolean} true si hubo emergencia (con o sin éxito en construcción)
     */
    ruleEmergencyFOB() {
        const enemyFOBs = this.getEnemyFOBs();
        
        // Si tenemos FOBs, no hay emergencia (silencioso)
        if (enemyFOBs.length > 0) {
            return false;
        }
        
        console.log(`🤖 IA: [EMERGENCIA] ⚠️ SIN FOBs - Intentando construir`);
        
        
        // ¡EMERGENCIA! Sin FOBs
        const fobConfig = getNodeConfig('fob');
        if (!fobConfig || !fobConfig.enabled) {
            console.log(`🤖 IA: [EMERGENCIA] ❌ CANCELADO - Configuración no disponible`);
            return true; // Sí hay emergencia, pero no se puede resolver
        }
        
        // Verificar si tenemos currency
        if (this.currency < fobConfig.cost) {
            console.log(`🤖 IA: [EMERGENCIA] ❌ CANCELADO - Sin currency suficiente (tengo ${this.currency}$, necesito ${fobConfig.cost}$)`);
            return true; // Sí hay emergencia, pero no hay dinero
        }
        
        console.log(`🤖 IA: [EMERGENCIA] ✅ CONSTRUYENDO FOB - Currency: ${this.currency}$`);
        // Construir FOB de emergencia
        this.buildEmergencyFOB();
        return true; // Emergencia resuelta
    }
    
    /**
     * Construye un FOB de emergencia entre el frente más alejado y el HQ
     * Posicionamiento: Entre el frente más a la izquierda y el HQ enemigo (distribución inteligente)
     */
    buildEmergencyFOB() {
        const fobConfig = getNodeConfig('fob');
        if (!fobConfig || this.currency < fobConfig.cost) return;
        
        const enemyHQ = this.getEnemyHQ();
        const enemyFronts = this.getEnemyFronts();
        
        if (!enemyHQ) {
            console.log('🚨 IA: EMERGENCIA - No se encontró HQ enemigo');
            return;
        }
        
        let posX, posY;
        
        if (enemyFronts.length > 0) {
            // Buscar el frente más alejado (más a la izquierda)
            const farthestFront = enemyFronts.reduce((min, front) => 
                front.x < min.x ? front : min
            );
            
            // Calcular bordes disponibles
            const frontEdge = farthestFront.x - 60; // Borde izquierdo del frente
            const hqEdge = enemyHQ.x + 60; // Borde derecho del HQ
            
            // Usar distribución inteligente para X (zona con menos FOBs)
            // En emergencia, preferir zona central (50%)
            posX = this.getSmartFOBPositionX(frontEdge, hqEdge, 0.5);
            // Usar distribución inteligente para Y (mitad con menos FOBs)
            posY = this.getSmartFOBPositionY();
        } else {
            // Sin frentes, colocar cerca del HQ
            posX = enemyHQ.x - 200; // 200px a la izquierda del HQ
            // Usar distribución inteligente para Y (mitad con menos FOBs)
            posY = this.getSmartFOBPositionY();
        }
        
        // Crear FOB enemigo de emergencia
        const fob = this.game.baseFactory.createBase(
            posX,
            posY,
            'fob',
            { isConstructed: true, startingSuppliesPercent: 0.5, team: 'player2' } // Empieza con 50% recursos
        );
        
        if (fob) {
            this.game.nodes.push(fob);
            this.currency -= fobConfig.cost;
            this.stats.buildingsBuilt++;
            
            console.log(`🤖 IA: 🚨 FOB EMERGENCIA construido | ${this.currency}$ restantes`);
        }
    }
    
    /**
     * REGLA 5: Harass con sniper (early game)
     * Cada 25 segundos, CONSIDERA lanzar sniper strike
     * SOLO si el jugador NO está construyendo amenazas Y la IA NO está perdiendo
     */
    ruleSniperHarass() {
        const sniperConfig = getNodeConfig('sniperStrike');
        if (!sniperConfig || !sniperConfig.enabled) return;
        
        // Solo en early game (currency entre 120$ y 249$)
        if (this.currency < 120 || this.currency >= 250) {
            return;
        }
        
        // Si está perdiendo, NO hacer harass (priorizar supervivencia)
        const gameState = this.analyzeGameState();
        if (gameState === 'desperate' || gameState === 'losing') {
            if (this.debugMode) {
                console.log(`🤖 IA: [HARASS] ⏭️ SKIP - Estado: ${gameState.toUpperCase()} (no harass, priorizar supervivencia)`);
            }
            return;
        }
        
        // Si el jugador tiene plantas o hospitales, NO hacer harass (priorizar defensa/ataques serios)
        const playerThreats = this.game.nodes.filter(n => 
            (n.type === 'nuclearPlant' || n.type === 'campaignHospital') &&
            n.team === 'ally' &&
            n.constructed
        );
        
        if (playerThreats.length > 0) {
            if (this.debugMode) {
                console.log(`🤖 IA: [HARASS] ⏭️ SKIP - Jugador tiene amenazas (${playerThreats.length}), no harass`);
            }
            return;
        }
        
        // 40% de probabilidad de NO hacer nada (más balanceado)
        if (Math.random() < 0.4) {
            if (this.debugMode) {
                console.log(`🤖 IA: [HARASS] ⏭️ SKIP - Decidió no harass (40% aleatorio)`);
            }
            return;
        }
        
        console.log(`🤖 IA: [HARASS] Analizando - Currency: ${this.currency}$`);
        
        // Verificar si tenemos currency suficiente + RESERVA (reducida)
        if (this.currency < sniperConfig.cost + 40) { // +40$ de reserva (más agresivo)
            console.log(`🤖 IA: [HARASS] ❌ CANCELADO - Necesito reserva económica (tengo ${this.currency}$, necesito ${sniperConfig.cost + 40}$)`);
            return;
        }
        
        // Buscar frentes aliados
        const allyFronts = this.game.nodes.filter(n => n.type === 'front' && n.team === 'ally' && n.constructed);
        if (allyFronts.length === 0) {
            console.log(`🤖 IA: [HARASS] ❌ CANCELADO - No hay frentes aliados`);
            return;
        }
        
        // Elegir frente aliado aleatorio
        const targetFront = allyFronts[Math.floor(Math.random() * allyFronts.length)];
        
        // Lanzar sniper strike
        if (this.game.medicalSystem) {
            // Reproducir sonido de disparo de francotirador (igual que el jugador)
            if (this.game.audio && this.game.audio.sounds.sniperShoot) {
                this.game.audio.sounds.sniperShoot.play();
            }
            
            // Aplicar efecto "wounded" directamente (sin emergencia médica)
            this.game.medicalSystem.applyPenalty(targetFront);
            
            // Crear sprite flotante de sniper kill feed (igual que el jugador)
            if (this.game.particleSystem) {
                this.game.particleSystem.createFloatingSprite(
                    targetFront.x, 
                    targetFront.y - 40, 
                    'ui-sniper-kill'
                );
            }
            
            // Gastar currency y actualizar stats
            this.currency -= sniperConfig.cost;
            this.stats.snipersLaunched++;
            
            console.log(`🤖 IA: 🎯 SNIPER HARASS (wounded en frente #${targetFront.id}) | ${this.currency}$ restantes`);
        }
    }
    
    /**
     * REGLA 6: Ataque ofensivo programado
     * Cada 40 segundos, la IA decide qué hacer según su economía
     * Early/Mid game (<300$): 50% Sniper, 50% construir
     * Late game (≥300$): Decide entre dron o FOB según situación
     */
    ruleOffensiveStrike() {
        const enemyFOBs = this.getEnemyFOBs();
        const droneConfig = getNodeConfig('drone');
        const sniperConfig = getNodeConfig('sniperStrike');
        const fobConfig = getNodeConfig('fob');
        
        // Analizar estado de la partida
        const gameState = this.analyzeGameState();
        
        console.log(`🤖 IA: [DECISIÓN 40s] Estado: ${gameState.toUpperCase()}, Currency: ${this.currency}$, FOBs: ${enemyFOBs.length}`);
        
        // Si está desesperada o perdiendo → NO atacar, solo construir/recuperar
        if (gameState === 'desperate' || gameState === 'losing') {
            console.log(`🤖 IA: [DECISIÓN 40s] 🛡️ MODO SUPERVIVENCIA - Priorizando recuperación económica`);
            
            // Priorizar construir FOBs o plantas nucleares para recuperarse
            if (enemyFOBs.length < 2 && this.currency >= 130) {
                console.log(`🤖 IA: [DECISIÓN 40s] ✅ ELEGIDO: FOB (reconstruir infraestructura)`);
                this.attemptFOBConstruction();
            } else if (this.currency >= 250) {
                console.log(`🤖 IA: [DECISIÓN 40s] ✅ ELEGIDO: PLANTA NUCLEAR (acelerar economía)`);
                this.buildNuclearPlant();
            } else {
                console.log(`🤖 IA: [DECISIÓN 40s] ⏭️ SKIP - Ahorrando para recuperación`);
            }
            return; // NO hacer ataques ofensivos
        }
        
        // Verificar si tenemos currency mínima
        if (this.currency < 80) {
            console.log(`🤖 IA: [DECISIÓN 40s] ❌ CANCELADO - Sin currency mínima (tengo ${this.currency}$, necesito 80$+)`);
            return;
        }
        
        // === EARLY/MID GAME (< 300$): Decisión más variada ===
        if (this.currency < 300) {
            const roll = Math.random();
            console.log(`🤖 IA: [DECISIÓN 40s] Early/Mid game (<300$) - Roll: ${roll.toFixed(2)}`);
            
            // Si tiene muy poco dinero (<150$), priorizar construcción
            if (this.currency < 150) {
                if (enemyFOBs.length < 2 && roll < 0.7) {
                    // 70% - Construir FOB
                    console.log(`🤖 IA: [DECISIÓN 40s] ✅ ELEGIDO: FOB (70% - currency baja)`);
                    this.attemptFOBConstruction();
                } else {
                    // 30% - Nada (ahorrar)
                    console.log(`🤖 IA: [DECISIÓN 40s] ⏭️ SKIP - Ahorrando (30%)`);
                }
                return;
            }
            
            // Si tiene dinero medio (150-299$), más variedad
            // PRIORIDAD: Construir lanzadera si no tiene (80% probabilidad)
            if (!this.hasDroneLauncher() && this.currency >= 200) {
                const launcherRoll = Math.random();
                if (launcherRoll < 0.8) {
                    // 80% - Construir lanzadera (requisito para drones)
                    console.log(`🤖 IA: [DECISIÓN 40s] ✅ ELEGIDO: LANZADERA (80% - habilitar drones futuras)`);
                    if (this.attemptDroneLauncherConstruction()) {
                        return;
                    }
                } else {
                    console.log(`🤖 IA: [DECISIÓN 40s] ⏭️ SKIP LANZADERA - Decidió no construirla aún (20%)`);
                }
            }
            
            // Generar nuevo roll para la siguiente decisión
            const actionRoll = Math.random();
            if (actionRoll < 0.3) {
                // 30% - Lanzar sniper
                console.log(`🤖 IA: [DECISIÓN 40s] ✅ ELEGIDO: SNIPER (30%)`);
                this.attemptSniperStrike();
            } else if (actionRoll < 0.7 && enemyFOBs.length < 2) {
                // 40% - Construir FOB
                console.log(`🤖 IA: [DECISIÓN 40s] ✅ ELEGIDO: FOB (40%)`);
                this.attemptFOBConstruction();
            } else {
                // 30% - Nada (ahorrar para late game)
                console.log(`🤖 IA: [DECISIÓN 40s] ⏭️ SKIP - Ahorrando para late game (30%)`);
            }
            return;
        }
        
        // === LATE GAME (≥ 300$): Presión ofensiva con drones ===
        console.log(`🤖 IA: [DECISIÓN 40s] Late game (≥300$) - Estado: ${gameState.toUpperCase()}, FOBs: ${enemyFOBs.length}`);
        
        // Ajustar agresividad según estado de partida
        let droneChance = 0.5; // Base
        let skipChance = 0.15; // Base
        
        if (gameState === 'winning') {
            // Si está ganando, ser MÁS agresivo
            droneChance = 0.8; // 80% dron
            skipChance = 0.05; // 5% skip
            console.log(`🤖 IA: ⚔️ MODO AGRESIVO - Aprovechando ventaja`);
        }
        
        // Si tiene <2 FOBs, considerar construir más
        if (enemyFOBs.length < 2) {
            const lateGameRoll = Math.random();
            if (lateGameRoll < droneChance) {
                // Variable según estado
                if (!this.hasDroneLauncher()) {
                    // Si quiere lanzar dron pero no tiene lanzadera → construirla primero
                    if (this.currency >= 200) {
                        console.log(`🤖 IA: [DECISIÓN 40s] ✅ CONSTRUYENDO LANZADERA (prerequisito para drones)`);
                        this.attemptDroneLauncherConstruction();
                    } else {
                        console.log(`🤖 IA: [DECISIÓN 40s] ⏭️ AHORRANDO para lanzadera (${this.currency}$/200$)`);
                    }
                } else {
                    console.log(`🤖 IA: [DECISIÓN 40s] ✅ ELEGIDO: DRON (${(droneChance*100).toFixed(0)}%)`);
                    this.attemptDroneLaunch();
                }
            } else if (lateGameRoll < droneChance + (0.85 - skipChance)) {
                // Construir FOB
                console.log(`🤖 IA: [DECISIÓN 40s] ✅ ELEGIDO: FOB`);
                this.attemptFOBConstruction();
            } else {
                // Skip
                console.log(`🤖 IA: [DECISIÓN 40s] ⏭️ SKIP - Reservando (${(skipChance*100).toFixed(0)}%)`);
            }
        } else {
            // Si tiene ≥2 FOBs, enfoque ofensivo
            const offensiveThreshold = gameState === 'winning' ? 0.9 : 0.75;
            const lateGameRoll = Math.random();
            
            if (lateGameRoll < offensiveThreshold) {
                // Variable: 75-90% según estado
                if (!this.hasDroneLauncher()) {
                    // Si quiere lanzar dron pero no tiene lanzadera → construirla primero
                    if (this.currency >= 200) {
                        console.log(`🤖 IA: [DECISIÓN 40s] ✅ CONSTRUYENDO LANZADERA (prerequisito para drones)`);
                        this.attemptDroneLauncherConstruction();
                    } else {
                        console.log(`🤖 IA: [DECISIÓN 40s] ⏭️ AHORRANDO para lanzadera (${this.currency}$/200$)`);
                    }
                } else {
                    console.log(`🤖 IA: [DECISIÓN 40s] ✅ ELEGIDO: DRON (${(offensiveThreshold*100).toFixed(0)}%)`);
                    this.attemptDroneLaunch();
                }
            } else {
                // Ahorrar
                console.log(`🤖 IA: [DECISIÓN 40s] ⏭️ SKIP - Acumulando para ofensiva mayor`);
            }
        }
    }
    
    /**
     * Intenta lanzar un sniper strike si tiene currency suficiente
     */
    attemptSniperStrike() {
        const sniperConfig = getNodeConfig('sniperStrike');
        if (!sniperConfig || !sniperConfig.enabled) {
            console.log(`🤖 IA: [SNIPER] ❌ CANCELADO - Configuración no disponible`);
            return;
        }
        
        if (this.currency < sniperConfig.cost + 20) {
            console.log(`🤖 IA: [SNIPER] ❌ CANCELADO - Sin currency suficiente (tengo ${this.currency}$, necesito ${sniperConfig.cost + 20}$)`);
            return;
        }
        
        // Buscar frentes aliados como objetivos
        const allyFronts = this.game.nodes.filter(n => n.type === 'front' && n.team === 'ally' && n.constructed);
        if (allyFronts.length === 0) {
            console.log(`🤖 IA: [SNIPER] ❌ CANCELADO - No hay frentes aliados disponibles`);
            return;
        }
        
        // Seleccionar frente aleatorio
        const targetFront = allyFronts[Math.floor(Math.random() * allyFronts.length)];
        
        // Lanzar sniper strike
        if (this.game.medicalSystem) {
            // Reproducir sonido de disparo de francotirador (igual que el jugador)
            if (this.game.audio && this.game.audio.sounds.sniperShoot) {
                this.game.audio.sounds.sniperShoot.play();
            }
            
            // Aplicar efecto "wounded" directamente (sin emergencia médica)
            this.game.medicalSystem.applyPenalty(targetFront);
            
            // Crear sprite flotante de sniper kill feed (igual que el jugador)
            if (this.game.particleSystem) {
                this.game.particleSystem.createFloatingSprite(
                    targetFront.x, 
                    targetFront.y - 40, 
                    'ui-sniper-kill'
                );
            }
            
            // Gastar currency y actualizar stats
            this.currency -= sniperConfig.cost;
            this.stats.snipersLaunched++;
            
            console.log(`🤖 IA: 🎯 SNIPER lanzado (wounded en frente #${targetFront.id}) | ${this.currency}$ restantes`);
        }
    }
    
    /**
     * Verifica si existe al menos una lanzadera de drones enemiga construida
     */
    hasDroneLauncher() {
        return this.game.nodes.some(n => 
            n.type === 'droneLauncher' && 
            n.constructed && 
            !n.isAbandoning &&
            n.team === 'player2'
        );
    }
    
    /**
     * Intenta construir una lanzadera de drones
     */
    attemptDroneLauncherConstruction() {
        const launcherConfig = getNodeConfig('droneLauncher');
        if (!launcherConfig || !launcherConfig.enabled) {
            console.log(`🤖 IA: [LANZADERA] ❌ CANCELADO - Configuración no disponible`);
            return false;
        }
        
        if (this.currency < launcherConfig.cost + 50) {
            console.log(`🤖 IA: [LANZADERA] ❌ CANCELADO - Sin currency suficiente (tengo ${this.currency}$, necesito ${launcherConfig.cost + 50}$)`);
            return false;
        }
        
        // Copiar lógica de construcción de mirrorPlayerBuilding pero para posición estratégica
        const centerX = this.game.canvas.width / 2;
        const mirrorX = this.game.worldWidth - 200; // Cerca del borde enemigo
        const mirrorY = this.game.canvas.height / 2; // Centro vertical
        
        // Verificar que esté en territorio enemigo
        if (!this.game.territory.isInEnemyTerritory(mirrorX, mirrorY)) {
            console.log(`🤖 IA: [LANZADERA] ❌ CANCELADO - Posición fuera de territorio enemigo`);
            return false;
        }
        
        // Crear lanzadera enemiga
        const launcher = this.game.baseFactory.createBase(mirrorX, mirrorY, 'droneLauncher', {
            isEnemy: true,
            team: 'player2',
            isConstructed: true  // Construida inmediatamente
        });
        
        if (launcher) {
            // ¡CRÍTICO! Agregar a nodes para que sea detectada
            this.game.nodes.push(launcher);
            
            this.currency -= launcherConfig.cost;
            this.stats.buildingsBuilt++;
            console.log(`🤖 IA: 🚀 LANZADERA DE DRONES construida (drones habilitados) | ${this.currency}$ restantes`);
            return true;
        }
        
        return false;
    }
    
    /**
     * Evalúa si la IA debería construir algo estratégico antes de lanzar otro dron
     * @returns {boolean} true si encontró algo que construir, false si puede lanzar dron
     */
    shouldBuildBeforeDrone() {
        if (!this.hasLaunchedDroneRecently) return false; // Solo evaluar después de lanzar un dron
        
        const enemyFOBs = this.getEnemyFOBs();
        const enemyNuclearPlants = this.game.nodes.filter(n => 
            n.type === 'nuclearPlant' && 
            n.team === 'player2' &&
            n.constructed && 
            !n.isConstructing
        );
        
        const droneConfig = getNodeConfig('drone');
        const fobConfig = getNodeConfig('fob');
        const nuclearConfig = getNodeConfig('nuclearPlant');
        
        // PRIORIDAD 1: Construir FOB si tiene pocos (menos de 2) y currency suficiente
        if (fobConfig && 
            this.currency >= fobConfig.cost + 50 && // Currency para FOB + margen
            enemyFOBs.length < 2) {
            
            console.log(`🤖 IA: [ESTRATÉGICO] 🔨 Construyendo FOB antes del siguiente dron (FOBs: ${enemyFOBs.length})`);
            this.buildStrategicFOB();
            this.hasLaunchedDroneRecently = false; // Reset flag
            return true;
        }
        
        // PRIORIDAD 2: Construir planta nuclear si tiene pocas (menos de 2) y currency suficiente
        if (nuclearConfig && 
            this.currency >= nuclearConfig.cost + 50 && // Currency para planta + margen
            enemyNuclearPlants.length < 2) {
            
            console.log(`🤖 IA: [ESTRATÉGICO] ⚡ Construyendo planta nuclear antes del siguiente dron (Plantas: ${enemyNuclearPlants.length})`);
            this.buildNuclearPlant();
            this.hasLaunchedDroneRecently = false; // Reset flag
            return true;
        }
        
        // PRIORIDAD 3: Construir lanzadera si no tiene y tiene currency
        if (!this.hasDroneLauncher() && this.currency >= 200) {
            console.log(`🤖 IA: [ESTRATÉGICO] 🚀 Construyendo lanzadera antes del siguiente dron`);
            this.attemptDroneLauncherConstruction();
            this.hasLaunchedDroneRecently = false; // Reset flag
            return true;
        }
        
        // No hay necesidades estratégicas urgentes, puede lanzar dron
        return false;
    }

    /**
     * Intenta lanzar un dron si tiene currency suficiente
     * Selecciona el objetivo más valioso estratégicamente
     */
    attemptDroneLaunch() {
        // EVALUAR NECESIDADES ESTRATÉGICAS: ¿Debería construir algo antes?
        if (this.shouldBuildBeforeDrone()) {
            return; // Construyó algo, intentar dron en el siguiente ciclo
        }
        
        // Verificar si tiene lanzadera
        if (!this.hasDroneLauncher()) {
            if (this.debugMode) {
                console.log(`🤖 IA: [DRON] ❌ CANCELADO - No tiene lanzadera de drones`);
            }
            return;
        }
        
        const droneConfig = getNodeConfig('drone');
        if (!droneConfig || !droneConfig.enabled) {
            console.log(`🤖 IA: [DRON] ❌ CANCELADO - Configuración no disponible`);
            return;
        }
        
        if (this.currency < droneConfig.cost + this.currencyMargin) {
            console.log(`🤖 IA: [DRON] ❌ CANCELADO - Sin currency suficiente (tengo ${this.currency}$, necesito ${droneConfig.cost + this.currencyMargin}$)`);
            return;
        }
        
        // Buscar TODOS los edificios aliados destruibles
        const allyTargets = this.game.nodes.filter(n => 
            (n.type === 'fob' || 
             n.type === 'nuclearPlant' || 
             n.type === 'campaignHospital') &&
            n.team === 'ally' &&
            n.constructed &&
            !n.isAbandoning
        );
        
        if (allyTargets.length === 0) {
            console.log(`🤖 IA: [DRON] ❌ CANCELADO - No hay objetivos aliados disponibles`);
            return;
        }
        
        // Seleccionar el mejor objetivo según priorización estratégica
        const bestTarget = this.selectBestDroneTarget(allyTargets);
        
        // Lanzar dron enemigo desde el borde derecho
        const droneStartX = this.game.worldWidth;
        const droneStartY = bestTarget.y;
        
        this.game.droneSystem.launchDrone(droneStartX, droneStartY, bestTarget, 'enemy');
        this.currency -= droneConfig.cost;
        this.stats.dronesLaunched++;
        this.lastDroneLaunchTime = Date.now(); // Actualizar timestamp del último dron
        this.hasLaunchedDroneRecently = true; // Marcar que lanzó un dron recientemente
        
        console.log(`🤖 IA: 🚁 DRON lanzado → ${bestTarget.name} | ${this.currency}$ restantes`);
    }
    
    /**
     * Intenta construir un FOB si tiene currency suficiente
     */
    attemptFOBConstruction() {
        const fobConfig = getNodeConfig('fob');
        if (!fobConfig || !fobConfig.enabled) {
            console.log(`🤖 IA: [FOB] ❌ CANCELADO - Configuración no disponible`);
            return;
        }
        
        // Margen reducido en early game para ser más agresivo
        const margin = this.currency < 200 ? 20 : 50;
        const required = fobConfig.cost + margin;
        
        if (this.currency < required) {
            console.log(`🤖 IA: [FOB] ❌ CANCELADO - Sin currency suficiente (tengo ${this.currency}$, necesito ${required}$)`);
            return;
        }
        
        // Usar la lógica existente de construcción de FOB
        this.buildStrategicFOB();
    }
    
    /**
     * REGLA 6: Construcciones estratégicas
     * Decide si construir FOBs o Plantas Nucleares según la situación económica
     */
    ruleStrategicBuilding() {
        const enemyFOBs = this.getEnemyFOBs();
        const enemyNuclearPlants = this.game.nodes.filter(n => 
            n.type === 'nuclearPlant' && 
            n.team === 'player2' &&
            n.constructed && 
            !n.isConstructing
        );
        
        // PRIORIDAD 1: FOB (expansión logística)
        // Condición: Tiene 180$+, tiene menos de 2 FOBs, y 80% probabilidad
        const fobConfig = getNodeConfig('fob');
        if (fobConfig && 
            this.currency >= 180 && 
            enemyFOBs.length < 2 && 
            Math.random() > 0.2) { // 80% de éxito
            
            console.log(`🤖 IA: [CONSTRUCCIÓN] ✅ FOB ESTRATÉGICO (${this.currency}$)`);
            this.buildStrategicFOB();
            return; // Solo una construcción por ciclo
        }
        
        // PRIORIDAD 2: Planta Nuclear (boost económico)
        // Condición: Tiene 250$+, tiene menos de 2 plantas, y 70% probabilidad
        const nuclearConfig = getNodeConfig('nuclearPlant');
        if (nuclearConfig && 
            this.currency >= 250 && 
            enemyNuclearPlants.length < 2 && 
            Math.random() > 0.3) { // 70% de éxito
            
            console.log(`🤖 IA: [CONSTRUCCIÓN] ✅ PLANTA NUCLEAR (${this.currency}$)`);
            this.buildNuclearPlant();
            return; // Solo una construcción por ciclo
        }
        
        // Silencioso cuando no hace nada
    }
    
    /**
     * REGLA 7: Responder a emergencias médicas (se ejecuta cada frame)
     * Independiente de todos los demás comportamientos
     */
    respondToMedicalEmergencies() {
        const enemyFronts = this.getEnemyFronts();
        if (enemyFronts.length === 0) return;
        
        // Buscar frentes enemigos que tienen emergencia médica activa
        const frontsWithEmergency = enemyFronts.filter(front => 
            this.game.medicalSystem && 
            this.game.medicalSystem.hasEmergency(front.id)
        );
        
        // Limpiar tracking de emergencias resueltas
        for (const frontId of this.medicalEmergenciesHandled) {
            const stillHasEmergency = this.game.medicalSystem && 
                                     this.game.medicalSystem.hasEmergency(frontId);
            if (!stillHasEmergency) {
                this.medicalEmergenciesHandled.delete(frontId);
            }
        }
        
        // Si hay emergencias activas, intentar resolverlas (solo una vez por emergencia)
        for (const front of frontsWithEmergency) {
            // Si ya se intentó atender esta emergencia, skip
            if (this.medicalEmergenciesHandled.has(front.id)) continue;
            
            // Marcar como atendida (para no intentar de nuevo)
            this.medicalEmergenciesHandled.add(front.id);
            
            // Intentar respuesta
            this.attemptMedicalResponse(front);
        }
    }
    
    /**
     * Intenta responder a una emergencia médica enviando ambulancia
     */
    attemptMedicalResponse(front) {
        // 20% de probabilidad de fallar (no enviar nada)
        if (Math.random() < 0.2) {
            // Fallo silencioso (80% de éxito es bueno)
            return;
        }
        
        // Buscar fuentes de ambulancias enemigas: HQ enemigo O hospitales enemigos
        const medicalSources = [];
        
        // 1. Buscar HQ enemigo (siempre tiene ambulancia disponible)
        const enemyHQ = this.getEnemyHQ();
        if (enemyHQ && enemyHQ.ambulanceAvailable) {
            medicalSources.push(enemyHQ);
        }
        
        // 2. Buscar hospitales enemigos con ambulancia disponible
        const enemyHospitals = this.game.nodes.filter(n => 
            n.type === 'campaignHospital' && 
            n.team === 'player2' &&
            n.constructed && 
            !n.isConstructing &&
            n.availableVehicles > 0
        );
        medicalSources.push(...enemyHospitals);
        
        if (medicalSources.length === 0) {
            console.log(`🤖 IA: [MÉDICO] ❌ CANCELADO - No hay ambulancias disponibles (ni en HQ ni en hospitales enemigos)`);
            return;
        }
        
        // Encontrar la fuente médica más cercana al frente con emergencia
        let closestSource = null;
        let minDistance = Infinity;
        
        for (const source of medicalSources) {
            const distance = this.getDistance(source, front);
            if (distance < minDistance) {
                minDistance = distance;
                closestSource = source;
            }
        }
        
        if (!closestSource) {
            console.log(`🤖 IA: [MÉDICO] ❌ CANCELADO - No se encontró fuente médica cercana`);
            return;
        }
        
        // Enviar ambulancia (usar el sistema de convoyes médico)
        try {
            // Crear ruta médica usando el sistema existente
            this.game.convoyManager.createMedicalRoute(closestSource, front);
            this.stats.medicsSent++;
            
            console.log(`🤖 IA: 🚑 AMBULANCIA enviada a frente #${front.id}`);
            
            // NOTA: NO resolver la emergencia aquí
            // El convoy la resolverá automáticamente cuando llegue (ver ConvoyManager.deliverSupplies())
            
        } catch (error) {
            console.log(`🤖 IA: [MÉDICO] ❌ ERROR - No se pudo enviar ambulancia: ${error.message}`);
        }
    }
    
    /**
     * Construye un FOB enemigo en posición estratégica
     * Posición: Entre el frente más alejado y el HQ (distribución inteligente en X e Y)
     */
    buildStrategicFOB() {
        const fobConfig = getNodeConfig('fob');
        if (!fobConfig || this.currency < fobConfig.cost) return;
        
        const enemyHQ = this.getEnemyHQ();
        const enemyFronts = this.getEnemyFronts();
        
        if (!enemyHQ) return;
        
        let posX, posY;
        
        if (enemyFronts.length > 0) {
            // Buscar el frente más alejado (más a la izquierda)
            const farthestFront = enemyFronts.reduce((min, front) => 
                front.x < min.x ? front : min
            );
            
            // Calcular bordes disponibles
            const frontEdge = farthestFront.x - 60; // Borde izquierdo del frente
            const hqEdge = enemyHQ.x + 60; // Borde derecho del HQ
            
            // Usar distribución inteligente para X (zona con menos FOBs)
            posX = this.getSmartFOBPositionX(frontEdge, hqEdge);
            // Usar distribución inteligente para Y (mitad con menos FOBs)
            posY = this.getSmartFOBPositionY();
        } else {
            // Sin frentes, colocar cerca del HQ
            posX = enemyHQ.x - 200; // 200px a la izquierda del HQ
            // Usar distribución inteligente para Y (mitad con menos FOBs)
            posY = this.getSmartFOBPositionY();
        }
        
        // Crear FOB enemigo
        const fob = this.game.baseFactory.createBase(
            posX,
            posY,
            'fob',
            { isConstructed: true, startingSuppliesPercent: 0.5, team: 'player2' } // Empieza con 50% recursos
        );
        
        if (fob) {
            this.game.nodes.push(fob);
            this.currency -= fobConfig.cost;
            this.stats.buildingsBuilt++;
            
            console.log(`🤖 IA: 🏗️ FOB construido | ${this.currency}$ restantes`);
        }
    }
    
    /**
     * Construye una Planta Nuclear enemiga cerca del HQ (zona segura)
     */
    buildNuclearPlant() {
        const nuclearConfig = getNodeConfig('nuclearPlant');
        if (!nuclearConfig || this.currency < nuclearConfig.cost) return;
        
        const enemyHQ = this.getEnemyHQ();
        if (!enemyHQ) return;
        
        // Posición: Cerca del HQ enemigo (zona segura)
        const angle = Math.random() * Math.PI * 2;
        const distance = 150 + Math.random() * 100; // Entre 150-250px del HQ
        const posX = enemyHQ.x + Math.cos(angle) * distance;
        const posY = enemyHQ.y + Math.sin(angle) * distance;
        
        // Crear Planta Nuclear enemiga
        const plant = this.game.baseFactory.createBase(
            posX,
            posY,
            'nuclearPlant',
            { isConstructed: true, team: 'player2' }
        );
        
        if (plant) {
            this.game.nodes.push(plant);
            this.currency -= nuclearConfig.cost;
            this.stats.buildingsBuilt++;
            
            console.log(`🤖 IA: ⚡ PLANTA NUCLEAR construida | ${this.currency}$ restantes`);
        }
    }
    
    // ========================================
    // ACCIONES DE IA
    // ========================================
    
    /**
     * Envía un convoy de suministros entre dos nodos
     * @returns {boolean} true si tuvo éxito
     */
    sendSupplyConvoy(from, to) {
        // Verificar que los nodos no estén abandonando
        if (from.isAbandoning || to.isAbandoning) {
            if (this.debugMode) console.log(`🤖 IA: Nodo abandonando, no se envía convoy`);
            return false;
        }
        
        // Verificar que el origen tenga vehículos disponibles
        if (!from.hasAvailableVehicle()) {
            if (this.debugMode) console.log(`🤖 IA: ${from.type} sin vehículos disponibles`);
            return false;
        }
        
        // Verificar que el origen tenga suministros suficientes
        if (!from.hasEnoughSupplies(10)) {
            if (this.debugMode) console.log(`🤖 IA: ${from.type} sin suministros suficientes`);
            return false;
        }
        
        // Usar el sistema de convoyes del juego
        try {
            this.game.convoyManager.createRoute(from, to);
            this.stats.decisions++;
            return true;
        } catch (error) {
            if (this.debugMode) console.error('🤖 IA Error:', error);
            return false;
        }
    }
    
    /**
     * Selecciona el mejor objetivo para un ataque con dron
     * Usa un sistema de scoring basado en valor estratégico
     * @param {Array} targets - Array de edificios aliados destruibles
     * @returns {MapNode} El objetivo con mayor prioridad
     */
    selectBestDroneTarget(targets) {
        if (targets.length === 1) return targets[0];
        
        // Calcular score para cada objetivo
        const scoredTargets = targets.map(target => ({
            target: target,
            score: this.calculateTargetScore(target)
        }));
        
        // Ordenar por score (mayor a menor)
        scoredTargets.sort((a, b) => b.score - a.score);
        
        // Log de priorización (solo top 3)
        if (this.debugMode) {
            console.log('🎯 IA: Priorización de objetivos:');
            scoredTargets.slice(0, 3).forEach((t, i) => {
                console.log(`  ${i+1}. ${t.target.name} - Score: ${t.score.toFixed(1)}`);
            });
        }
        
        // Elegir entre los top 2 (añadir aleatoriedad)
        if (scoredTargets.length >= 2 && Math.random() < 0.3) {
            // 30% de probabilidad de atacar el segundo mejor objetivo
            return scoredTargets[1].target;
        }
        
        return scoredTargets[0].target;
    }
    
    /**
     * Calcula el score estratégico de un objetivo
     * Mayor score = Mayor prioridad de ataque
     * @param {MapNode} target - Edificio a evaluar
     * @returns {number} Score del objetivo
     */
    calculateTargetScore(target) {
        let score = 0;
        
        // === SCORE BASE POR TIPO ===
        if (target.type === 'fob') {
            score += 45; // FOB importante (logística)
        } else if (target.type === 'nuclearPlant') {
            score += 55; // Planta Nuclear SIEMPRE prioritaria (amenaza económica)
        } else if (target.type === 'campaignHospital') {
            score += 50; // Hospital muy prioritario (respuesta médica)
        }
        
        // === MODIFICADORES POR FASE DE JUEGO ===
        // Detectar fase según currency del jugador (aproximado)
        const estimatedPlayerCurrency = this.game.getMissionCurrency();
        
        if (estimatedPlayerCurrency < 200) {
            // EARLY GAME: Plantas y Hospitales SON AMENAZAS (hay que destruirlas ANTES del ROI)
            if (target.type === 'nuclearPlant') score += 25; // MUY prioritario (ROI = 100s)
            if (target.type === 'campaignHospital') score += 20; // Prioritario
            if (target.type === 'fob') score += 15; // Menos crítico
        } else if (estimatedPlayerCurrency >= 400) {
            // LATE GAME: Todos importantes pero Plantas críticas
            if (target.type === 'nuclearPlant') score += 30; // Máxima prioridad
            if (target.type === 'campaignHospital') score += 20;
            if (target.type === 'fob') score += 10;
        } else {
            // MID GAME: Balance (200-399$)
            if (target.type === 'nuclearPlant') score += 20;
            if (target.type === 'campaignHospital') score += 15;
            if (target.type === 'fob') score += 15;
        }
        
        // === BONUS CRÍTICO: Plantas/Hospitales recién construidos ===
        // Si se construyó hace menos de 120 segundos, ALTA prioridad (destruir antes del ROI)
        const buildAge = (Date.now() - (target.constructionCompletedTime || 0)) / 1000;
        if (buildAge < 120) {
            if (target.type === 'nuclearPlant') {
                score += 40; // CRÍTICO: Destruir antes de que se pague (ROI = 100s)
                console.log(`🎯 IA Scoring: Planta NUEVA detectada (${buildAge.toFixed(0)}s) - Bonus +40`);
            }
            if (target.type === 'campaignHospital') {
                score += 25; // Importante: Reducir capacidad médica temprano
            }
        }
        
        // === MULTIPLICADOR POR CANTIDAD ===
        const sameTypeCount = this.game.nodes.filter(n => 
            n.type === target.type && n.team === 'ally' && n.constructed
        ).length;
        
        if (target.type === 'nuclearPlant' && sameTypeCount >= 2) {
            // Si tiene ≥2 plantas, MÁXIMA prioridad (economía multiplicada)
            score += 35;
        }
        
        if (target.type === 'campaignHospital' && sameTypeCount >= 2) {
            // Si tiene ≥2 hospitales, alta prioridad
            score += 25;
        }
        
        if (target.type === 'fob' && sameTypeCount >= 4) {
            // Si tiene muchos FOBs, reducir prioridad (diversificar)
            score -= 15;
        }
        
        // === FACTOR ALEATORIO (±10 puntos) ===
        score += (Math.random() - 0.5) * 20;
        
        return score;
    }
    
    // ========================================
    // ANÁLISIS DE SITUACIÓN
    // ========================================
    
    /**
     * Analiza la situación de la partida para la IA
     * @returns {string} 'winning' | 'even' | 'losing' | 'desperate'
     */
    analyzeGameState() {
        const enemyFOBs = this.getEnemyFOBs();
        const allyFOBs = this.game.nodes.filter(n => n.type === 'fob' && n.team === 'ally' && n.constructed);
        const enemyFronts = this.getEnemyFronts();
        const allyFronts = this.game.nodes.filter(n => n.type === 'front' && n.team === 'ally' && n.constructed);
        
        // === FACTOR 1: Número de FOBs ===
        let fobScore = 0;
        if (enemyFOBs.length < allyFOBs.length - 1) {
            fobScore -= 2; // Muy por debajo
        } else if (enemyFOBs.length < allyFOBs.length) {
            fobScore -= 1; // Por debajo
        } else if (enemyFOBs.length > allyFOBs.length) {
            fobScore += 1; // Por encima
        }
        
        // === FACTOR 2: Posición de frentes (territorio) ===
        let territoryScore = 0;
        if (enemyFronts.length > 0 && allyFronts.length > 0) {
            // Comparar posición X promedio de frentes
            const avgEnemyFrontX = enemyFronts.reduce((sum, f) => sum + f.x, 0) / enemyFronts.length;
            const avgAllyFrontX = allyFronts.reduce((sum, f) => sum + f.x, 0) / allyFronts.length;
            const centerX = this.game.worldWidth / 2;
            
            // Si frente enemigo está muy a la izquierda (perdiendo territorio)
            if (avgEnemyFrontX < centerX - 200) {
                territoryScore -= 2; // Muy por detrás
            } else if (avgEnemyFrontX < centerX) {
                territoryScore -= 1; // Por detrás
            } else if (avgEnemyFrontX > centerX + 200) {
                territoryScore += 2; // Muy por delante
            } else if (avgEnemyFrontX > centerX) {
                territoryScore += 1; // Por delante
            }
        }
        
        // === FACTOR 3: Currency relativa ===
        let economyScore = 0;
        const playerCurrency = this.game.getMissionCurrency();
        
        if (this.currency < playerCurrency * 0.5) {
            economyScore -= 1; // Economía muy por debajo
        } else if (this.currency > playerCurrency * 1.5) {
            economyScore += 1; // Economía superior
        }
        
        // === CALCULAR ESTADO FINAL ===
        const totalScore = fobScore + territoryScore + economyScore;
        
        if (totalScore <= -3) {
            return 'desperate'; // Muy mal - Solo sobrevivir
        } else if (totalScore <= -1) {
            return 'losing'; // Por debajo - Priorizar recuperación
        } else if (totalScore >= 2) {
            return 'winning'; // Ganando - Ser agresivo
        } else {
            return 'even'; // Equilibrado
        }
    }
    
    // ========================================
    // UTILIDADES
    // ========================================
    
    /**
     * Obtiene el HQ enemigo
     */
    getEnemyHQ() {
        return this.game.nodes.find(n => n.type === 'hq' && n.team === 'player2');
    }
    
    /**
     * Obtiene todos los FOBs enemigos
     */
    getEnemyFOBs() {
        return this.game.nodes.filter(n => n.type === 'fob' && n.team === 'player2');
    }
    
    /**
     * Obtiene todos los Frentes enemigos
     */
    getEnemyFronts() {
        return this.game.nodes.filter(n => n.type === 'front' && n.team === 'player2');
    }
    
    /**
     * Encuentra el FOB más cercano a un nodo que tenga recursos y vehículos
     */
    findClosestFOBWithResources(targetNode, fobs) {
        let closestFOB = null;
        let minDistance = Infinity;
        
        for (const fob of fobs) {
            // Verificar que tenga recursos y vehículos
            if (!fob.hasAvailableVehicle() || !fob.hasEnoughSupplies(10)) {
                continue;
            }
            
            // Calcular distancia
            const dx = fob.x - targetNode.x;
            const dy = fob.y - targetNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestFOB = fob;
            }
        }
        
        return closestFOB;
    }
    
    /**
     * Calcula la distancia entre dos nodos
     */
    getDistance(nodeA, nodeB) {
        const dx = nodeA.x - nodeB.x;
        const dy = nodeA.y - nodeB.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Calcula una posición X inteligente para un nuevo FOB
     * Distribuye los FOBs entre el frente y el HQ en 3 zonas
     * eligiendo la zona que tenga menos FOBs
     * @param {number} frontEdge - Coordenada X del borde del frente (izquierda)
     * @param {number} hqEdge - Coordenada X del borde del HQ (derecha)
     * @param {number} fallbackPercent - Porcentaje de fallback si no hay FOBs (default 0.6)
     * @returns {number} Posición X para el nuevo FOB
     */
    getSmartFOBPositionX(frontEdge, hqEdge, fallbackPercent = 0.6) {
        const enemyFOBs = this.getEnemyFOBs();
        
        // Si no hay FOBs, usar el fallback
        if (enemyFOBs.length === 0) {
            const posX = frontEdge + (hqEdge - frontEdge) * fallbackPercent;
            return posX + (Math.random() - 0.5) * 100; // ±50px de variación
        }
        
        // Dividir el espacio entre frente y HQ en 3 zonas
        const totalDistance = hqEdge - frontEdge;
        const zone1Boundary = frontEdge + totalDistance * 0.33;  // Zona 1: 0-33% (cerca del frente)
        const zone2Boundary = frontEdge + totalDistance * 0.67;  // Zona 2: 33-67% (intermedia)
        // Zona 3: 67-100% (cerca del HQ)
        
        // Contar FOBs en cada zona
        let zone1Count = 0;
        let zone2Count = 0;
        let zone3Count = 0;
        
        for (const fob of enemyFOBs) {
            if (fob.x < zone1Boundary) {
                zone1Count++;
            } else if (fob.x < zone2Boundary) {
                zone2Count++;
            } else {
                zone3Count++;
            }
        }
        
        // Encontrar la zona con menos FOBs
        let targetZone = 1;
        let minCount = zone1Count;
        
        if (zone2Count < minCount) {
            targetZone = 2;
            minCount = zone2Count;
        }
        if (zone3Count < minCount) {
            targetZone = 3;
            minCount = zone3Count;
        }
        
        // Si hay empate, elegir aleatoriamente entre las zonas con menos FOBs
        const minZones = [];
        if (zone1Count === minCount) minZones.push(1);
        if (zone2Count === minCount) minZones.push(2);
        if (zone3Count === minCount) minZones.push(3);
        
        if (minZones.length > 1) {
            targetZone = minZones[Math.floor(Math.random() * minZones.length)];
        }
        
        // Calcular posición X según la zona elegida
        let posX;
        if (targetZone === 1) {
            // Zona 1: 25% del camino (cerca del frente)
            posX = frontEdge + totalDistance * 0.25;
            if (this.debugMode) {
                console.log(`🤖 IA: [DISTRIBUCIÓN X] Zona 1 (cerca frente) elegida (Z1: ${zone1Count}, Z2: ${zone2Count}, Z3: ${zone3Count})`);
            }
        } else if (targetZone === 2) {
            // Zona 2: 50% del camino (intermedia)
            posX = frontEdge + totalDistance * 0.50;
            if (this.debugMode) {
                console.log(`🤖 IA: [DISTRIBUCIÓN X] Zona 2 (intermedia) elegida (Z1: ${zone1Count}, Z2: ${zone2Count}, Z3: ${zone3Count})`);
            }
        } else {
            // Zona 3: 75% del camino (cerca del HQ)
            posX = frontEdge + totalDistance * 0.75;
            if (this.debugMode) {
                console.log(`🤖 IA: [DISTRIBUCIÓN X] Zona 3 (cerca HQ) elegida (Z1: ${zone1Count}, Z2: ${zone2Count}, Z3: ${zone3Count})`);
            }
        }
        
        // Añadir variación aleatoria ±50px
        posX += (Math.random() - 0.5) * 100;
        
        // Asegurar que no se salga de los límites
        posX = Math.max(frontEdge + 50, Math.min(hqEdge - 50, posX));
        
        return posX;
    }
    
    /**
     * Calcula una posición Y inteligente para un nuevo FOB
     * Distribuye los FOBs entre la mitad superior e inferior del mapa
     * eligiendo la mitad que tenga menos FOBs
     * @returns {number} Posición Y para el nuevo FOB
     */
    getSmartFOBPositionY() {
        const worldHeight = this.game.worldHeight;
        const halfHeight = worldHeight / 2;
        
        // Obtener todos los FOBs enemigos existentes
        const enemyFOBs = this.getEnemyFOBs();
        
        // Contar FOBs en cada mitad del mapa
        let upperHalfCount = 0;
        let lowerHalfCount = 0;
        
        for (const fob of enemyFOBs) {
            if (fob.y < halfHeight) {
                upperHalfCount++;
            } else {
                lowerHalfCount++;
            }
        }
        
        // Elegir la mitad con menos FOBs
        const preferUpperHalf = upperHalfCount <= lowerHalfCount;
        
        let posY;
        if (preferUpperHalf) {
            // Colocar en la mitad superior (0 a halfHeight)
            // Centrado en el cuarto superior (25% de la altura total)
            const quarterHeight = worldHeight * 0.25;
            posY = quarterHeight + (Math.random() - 0.5) * 150; // ±75px de variación
            
            if (this.debugMode) {
                console.log(`🤖 IA: [DISTRIBUCIÓN Y] Mitad SUPERIOR elegida (Superior: ${upperHalfCount} FOBs, Inferior: ${lowerHalfCount} FOBs)`);
            }
        } else {
            // Colocar en la mitad inferior (halfHeight a worldHeight)
            // Centrado en el cuarto inferior (75% de la altura total)
            const quarterHeight = worldHeight * 0.75;
            posY = quarterHeight + (Math.random() - 0.5) * 150; // ±75px de variación
            
            if (this.debugMode) {
                console.log(`🤖 IA: [DISTRIBUCIÓN Y] Mitad INFERIOR elegida (Superior: ${upperHalfCount} FOBs, Inferior: ${lowerHalfCount} FOBs)`);
            }
        }
        
        // Asegurar que no se salga de los límites del mapa (con margen)
        const margin = 80; // Margen desde los bordes
        posY = Math.max(margin, Math.min(worldHeight - margin, posY));
        
        return posY;
    }
    
    // ========================================
    // CONTROL Y DEBUG
    // ========================================
    
    /**
     * Activa/desactiva el modo debug
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`🤖 IA Debug Mode: ${enabled ? 'ON' : 'OFF'}`);
    }
    
    /**
     * Activa/desactiva la IA
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`🤖 IA: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }
    
    /**
     * Obtiene estadísticas de la IA
     */
    getStats() {
        return { ...this.stats };
    }
    
    /**
     * Resetea estadísticas
     */
    resetStats() {
        this.stats = {
            decisions: 0,
            suppliesSent: 0,
            medicsSent: 0,
            buildingsBuilt: 0,
            dronesLaunched: 0,
            snipersLaunched: 0
        };
    }
    
    /**
     * Registra una acción del jugador para que la IA pueda reaccionar
     * @param {string} type - Tipo de acción: 'drone', 'antiDrone', 'nuclearPlant', 'campaignHospital'
     * @param {object} target - Objeto con {x, y} de la acción
     */
    registerPlayerAction(type, target) {
        this.playerLastAction = {
            type: type,
            target: target,
            timestamp: Date.now()
        };
        
        // Si es un dron, actualizar el timestamp de último dron
        if (type === 'drone') {
            this.playerLastDroneTime = Date.now();
        }
        
        if (this.debugMode) {
            console.log(`🤖 IA: Registrada acción del jugador: ${type} en (${target.x?.toFixed(0)}, ${target.y?.toFixed(0)})`);
        }
    }
    
    /**
     * Spawnea automáticamente una Truck Factory enemiga cada 3 minutos
     * Posición: Cerca del HQ enemigo en Y, aleatoria en el lado enemigo
     */
    spawnEnemyTruckFactory() {
        const enemyHQ = this.game.nodes.find(n => n.type === 'hq' && n.team === 'player2' && n.active);
        if (!enemyHQ) return;
        
        // Posición X: Cerca del HQ enemigo (entre HQ y 200px hacia el centro)
        const minX = enemyHQ.x - 200;
        const maxX = enemyHQ.x - 50;
        const x = minX + Math.random() * (maxX - minX);
        
        // Posición Y: Aleatoria en el rango válido del mapa
        const minY = 100;
        const maxY = this.game.worldHeight - 100;
        const y = minY + Math.random() * (maxY - minY);
        
        // Crear la Truck Factory enemiga usando BaseFactory
        const truckFactory = this.game.baseFactory.createBase(x, y, 'truckFactory', {
            team: 'player2',
            isConstructed: false // Se crea sin construcción para que se ejecute la lógica
        });
        
        if (truckFactory) {
            // Marcar como construida para evitar tiempo de construcción
            truckFactory.constructed = true;
            truckFactory.isConstructing = false;
            
            this.game.nodes.push(truckFactory);
            
            // Añadir vehículo al HQ enemigo inmediatamente
            if (enemyHQ && enemyHQ.hasVehicles) {
                enemyHQ.availableVehicles++;
                console.log(`🤖 IA: 🏭 TRUCK FACTORY spawneada (+1 vehículo)`);
            }
        }
    }
    
    /**
     * Añade currency a la IA enemiga (por avance de terreno)
     */
    addCurrency(amount) {
        this.currency += amount;
    }
    
    /**
     * Obtiene la currency actual de la IA
     */
    getCurrency() {
        return this.currency;
    }
    
    /**
     * Limpia el estado de la IA (al iniciar nueva misión)
     */
    reset() {
        this.fobCheckTimer = 0;
        this.frontCheckTimer = 0;
        // reactCheckTimer eliminado - Las reacciones son cada frame
        this.harassCheckTimer = 0;
        this.offensiveCheckTimer = 0;
        this.buildCheckTimer = 0;
        this.emergencyFobCheckTimer = 0;
        this.lastAutoFobTime = 0;
        this.truckFactoryTimer = 0; // Reset del timer de Truck Factory
        this.statusReportTimer = 0; // Reset del timer de reporte
        this.medicalEmergenciesHandled.clear();
        this.currency = 0;
        this.currencyAccumulator = 0;
        this.playerLastAction = null;
        this.playerLastDroneTime = 0;
        this.lastInitiativeTime = 0;
        this.lastDroneLaunchTime = 0;
        this.hasLaunchedDroneRecently = false;
        this.resetStats();
        
        // Log de inicio
        console.log(`🤖 IA ENEMIGA ACTIVADA - Dificultad: ${this.difficultyName || this.difficulty.toUpperCase()}`);
        console.log(`📊 Intervalos: FOBs(${this.fobCheckInterval}s) | Frentes(${this.frontCheckInterval}s) | Reacción(${this.reactionWindow}s) | Harass(${this.harassCheckInterval}s) | Emergencia FOB(${this.emergencyFobCheckInterval}s) | Ataque(${this.offensiveCheckInterval}s) | Construcción(${this.buildCheckInterval}s)`);
        console.log(`💰 Currency inicial: 0$ (tasa: 3$/s - Jugador: 2$/s) - IA tiene +1$/s de ventaja`);
        console.log(`🎯 Reacciones: ${(this.counterDroneRate*100).toFixed(0)}% anti-dron, ${(this.mirrorSuccessRate*100).toFixed(0)}% copiar edificios, margen: ${this.currencyMargin}$`);
        console.log(`🚁 Evaluación estratégica: Antes de lanzar drones, evalúa necesidades de construcción`);
        console.log(`🏥 Sistema médico: Emergencias aleatorias por MedicalEmergencySystem (global)`);
    }
}








 


