// ===== SISTEMA DE IA (SERVIDOR) =====
// Sistema completo de IA para el enemigo player2

import { AIActionHandler } from '../handlers/AIActionHandler.js';
import AIConfig from '../ai/config/AIConfig.js';
import { GAME_CONFIG } from '../../config/gameConfig.js';
import { 
    getRaceAIConfig, 
    getDifficultyMultipliers,
    getAdjustedInterval,
    getAdjustedScore,
    getAdjustedThreshold
} from '../ai/config/RaceAIConfig.js';

export class AISystem {
    constructor(gameState, io, roomId) {
        this.gameState = gameState;
        this.io = io;           // Socket.IO para emitir eventos
        this.roomId = roomId;   // ID de la sala para broadcast
        this.aiActionHandler = new AIActionHandler(gameState, io, roomId);
        
        // Estado interno
        this.active = false;
        this.currency = 0;
        this.lastCurrencyUpdate = 0;
        
        // Timers
        this.timers = {
            supply: 0,
            fobCheck: 0,        // Timer para revisar FOBs
            frontCheck: 0,      // Timer para revisar frentes
            helicopterCheck: 0, // 🆕 Timer para revisar helicópteros (B_Nation)
            strategic: 0,
            offensive: 0,
            harass: 0,
            statusReport: 0,
            reaction: 0,
            medical: 0
        };
        
        // 🎯 ENCAPSULACIÓN: Intervalos ajustados por raza y dificultad
        // Nota: Para obtener la dificultad correcta, necesitamos calcularlos después de establecer difficulty
        // Por ahora usamos valores temporales, se recalcularán en activate()
        this.intervals = {
            supply: AIConfig.intervals.supply,
            fobCheck: 2.0,        // Revisar FOBs cada 2s (desde HQ)
            frontCheck: 3.0,     // Revisar frentes cada 3s (desde FOBs)
            helicopterCheck: 1.5, // 🆕 Revisar helicópteros cada 1.5s (B_Nation)
            strategic: Math.min(4.0, AIConfig.intervals.strategic), // Primera decisión más rápida
            offensive: AIConfig.intervals.offensive,
            harass: AIConfig.intervals.harass,
            reaction: 0.5  // Reacciones cada 0.5s (muy responsivo)
        };
        
        // Flag para primera decisión estratégica
        this.firstStrategicDecision = true;
        
        // Sistema de dificultad
        this.difficulty = this.gameState.room?.aiPlayer?.difficulty || 'medium';
        this.difficultyMultipliers = getDifficultyMultipliers(this.difficulty);
        
        // 🎯 ENCAPSULACIÓN: Obtener raza actual y configuración
        this.raceId = this.getCurrentRace();
        this.raceConfig = getRaceAIConfig(this.raceId);
        
        // 🎯 OPTIMIZACIÓN: Validar edificios disponibles UNA VEZ al inicio
        this.availableBuildings = this.calculateAvailableBuildings();
        this.availableConsumables = this.calculateAvailableConsumables();
        
        // Tracking de amenazas del jugador
        this.lastPlayerActions = [];
        this.lastDroneLaunchTime = 0;
        
        // Stats
        this.stats = {
            dronesLaunched: 0,
            snipersLaunched: 0,
            buildingsBuilt: 0,
            decisionsExecuted: 0
        };
        
        console.log('🤖 Sistema de IA inicializado en servidor');
    }
    
    /**
     * Activa la IA
     */
    activate() {
        this.active = true;
        
        // 🎯 RECALCULAR edificios disponibles al activar (por si la raza se configuró después)
        this.availableBuildings = this.calculateAvailableBuildings();
        this.availableConsumables = this.calculateAvailableConsumables();
        
        // 🎯 ENCAPSULACIÓN: Recalcular raza y configuración
        this.raceId = this.getCurrentRace();
        this.raceConfig = getRaceAIConfig(this.raceId);
        this.difficultyMultipliers = getDifficultyMultipliers(this.difficulty);
        
        // 🎯 ENCAPSULACIÓN: Recalcular intervalos ajustados por raza y dificultad
        const base = getAdjustedInterval('offensive', this.raceId, this.difficulty);
        const variance = AIConfig.intervals.offensiveVariance;
        const randomOffensive = base + (Math.random() * variance * 2) - variance;
        
        this.intervals = {
            supply: AIConfig.intervals.supply,
            fobCheck: 2.0,
            frontCheck: 3.0,
            helicopterCheck: 1.5, // 🆕 Revisar helicópteros cada 1.5s (B_Nation)
            strategic: Math.min(4.0, getAdjustedInterval('strategic', this.raceId, this.difficulty)), // Primera decisión más rápida
            offensive: randomOffensive,
            harass: AIConfig.intervals.harass,
            reaction: getAdjustedInterval('reaction', this.raceId, this.difficulty)
        };
        
        // Debug: Verificar nodos iniciales
        const team = 'player2';
        const myNodes = this.gameState.nodes.filter(n => n.team === team);
        const hq = myNodes.find(n => n.type === 'hq');
        const myFOBs = myNodes.filter(n => n.type === 'fob');
        const myFronts = myNodes.filter(n => n.type === 'front');
        
        console.log(`🤖 IA ACTIVADA: ${this.raceId} (${this.difficulty})`);
        if (AIConfig.debug.logSupply) {
            console.log(`🤖 IA DEBUG: Estado inicial - HQ: ${hq ? 'SÍ' : 'NO'}, FOBs: ${myFOBs.length}, Frentes: ${myFronts.length}`);
            if (myFOBs.length > 0) {
                myFOBs.forEach(fob => {
                    console.log(`   - FOB ${fob.id}: ${fob.supplies}/${fob.maxSupplies} supplies, ${fob.availableVehicles || 0} vehículos`);
                });
            }
        }
    }
    
    /**
     * Desactiva la IA
     */
    deactivate() {
        this.active = false;
        console.log('🤖 IA DESACTIVADA');
    }
    
    /**
     * Debe activarse la IA?
     */
    shouldActivate() {
        const hasAIPlayer = this.gameState.room?.aiPlayer !== undefined;
        const hasAIFlag = this.gameState.room?.hasAI === true;
        
        if (hasAIPlayer && !hasAIFlag) {
            console.log('🤖 WARNING: aiPlayer existe pero hasAI no está en true');
        }
        
        return hasAIPlayer && hasAIFlag;
    }
    
    /**
     * Calcula qué edificios puede construir la IA (una vez al inicio)
     */
    calculateAvailableBuildings() {
        const raceManager = this.gameState.raceManager;
        const team = 'player2';
        const playerRace = raceManager.getPlayerRace(team);
        
        if (!playerRace) {
            console.warn('⚠️ IA: No se pudo obtener raza del jugador');
            return [];
        }
        
        const raceConfig = raceManager.getPlayerRaceConfig(team);
        const buildings = raceConfig?.buildings || [];
        
        if (AIConfig.debug.logActions) {
            console.log(`🤖 IA: Edificios disponibles para ${playerRace}: ${buildings.join(', ')}`);
        }
        
        return buildings;
    }
    
    /**
     * Calcula qué consumibles puede usar la IA (una vez al inicio)
     */
    calculateAvailableConsumables() {
        const raceManager = this.gameState.raceManager;
        const team = 'player2';
        const playerRace = raceManager.getPlayerRace(team);
        
        if (!playerRace) return [];
        
        const raceConfig = raceManager.getPlayerRaceConfig(team);
        return raceConfig?.consumables || [];
    }
    
    /**
     * Verifica si puede construir un edificio (usando cache)
     */
    canBuild(buildingType) {
        return this.availableBuildings.includes(buildingType);
    }
    
    /**
     * Verifica si puede usar un consumible (usando cache)
     */
    canUse(consumableType) {
        return this.availableConsumables.includes(consumableType);
    }
    
    /**
     * Obtiene la raza actual del jugador IA
     */
    getCurrentRace() {
        const raceManager = this.gameState.raceManager;
        const team = 'player2';
        return raceManager.getPlayerRace(team) || 'A_Nation'; // Fallback a A_Nation
    }
    
    /**
     * Actualiza la IA (llamado cada tick)
     */
    update(dt) {
        // Solo activar si hay IA en la partida
        if (!this.shouldActivate()) {
            this.active = false;
            return;
        }
        
        // Activar si no está activa
        if (!this.active) {
            this.activate();
            console.log(`🤖 IA configurada: ${this.gameState.room?.aiPlayer?.race} (${this.difficulty})`);
        }
        
        // Debug: Log cada 10s para ver qué está pasando
        if (this.timers.statusReport % 10 < 0.5 && this.timers.statusReport > 0) {
            const currency = this.gameState.currency?.player2 || 0;
            console.log(`🤖 IA UPDATE: active=${this.active}, currency=${currency.toFixed(0)}$, timers=${JSON.stringify(this.timers)}`);
        }
        
        // Actualizar currency
        this.updateCurrency(dt);
        
        // Obtener recursos locales
        const enemyTeam = 'player2';
        const currency = this.gameState.currency[enemyTeam] || 0;
        
        // 1. Reabastecimiento FOBs desde HQ (cada 2 segundos)
        this.timers.fobCheck += dt;
        if (this.timers.fobCheck >= this.intervals.fobCheck) {
            this.timers.fobCheck = 0;
            this.ruleResupplyFOBs(enemyTeam);
        }
        
        // 2. Reabastecimiento frentes desde FOBs (cada 3 segundos)
        this.timers.frontCheck += dt;
        if (this.timers.frontCheck >= this.intervals.frontCheck) {
            this.timers.frontCheck = 0;
            this.ruleResupplyFronts(enemyTeam);
        }
        
        // 🆕 2.5. Reabastecimiento con helicópteros (B_Nation) - cada 1.5 segundos
        if (this.raceId === 'B_Nation') {
            this.timers.helicopterCheck += dt;
            if (this.timers.helicopterCheck >= this.intervals.helicopterCheck) {
                this.timers.helicopterCheck = 0;
                this.ruleResupplyHelicopters(enemyTeam);
            }
        }
        
        // 2. Construcciones estratégicas (cada X segundos)
        this.timers.strategic += dt;
        if (this.timers.strategic >= this.intervals.strategic) {
            this.timers.strategic = 0;
            this.handleStrategicBuilding(enemyTeam, currency);
        }
        
        // 3. Decisiones ofensivas (cada X segundos variable)
        this.timers.offensive += dt;
        if (this.timers.offensive >= this.intervals.offensive) {
            this.timers.offensive = 0;
            const base = AIConfig.intervals.offensive;
            const variance = AIConfig.intervals.offensiveVariance;
            this.intervals.offensive = base + (Math.random() * variance * 2) - variance;
            this.handleOffensiveDecision(enemyTeam, currency);
        }
        
        // 5. Reacciones a amenazas del jugador (cada 0.5s)
        this.timers.reaction += dt;
        if (this.timers.reaction >= this.intervals.reaction) {
            this.timers.reaction = 0;
            this.handleReactions(enemyTeam, currency);
        }
        
        // 6. Emergencias médicas (cada 3s)
        this.timers.medical += dt;
        if (this.timers.medical >= 3.0) {
            this.timers.medical = 0;
            this.handleMedicalEmergencies(enemyTeam, currency);
        }
        
        // 7. Reporte de estado (cada 30s)
        this.timers.statusReport += dt;
        if (this.timers.statusReport >= AIConfig.intervals.statusReport) {
            this.timers.statusReport = 0;
            this.logStatus(enemyTeam, currency);
        }
    }
    
    /**
     * Actualiza currency de IA
     */
    updateCurrency(dt) {
        // Currency se maneja en CurrencySystem
        // Solo trackeamos el valor actual
        if (this.gameState.currency) {
            const newCurrency = this.gameState.currency.player2 || 0;
            
            // Debug: Detectar incrementos sospechosos de currency
            if (AIConfig.debug.logActions && this.currency > 0) {
                const currencyIncrease = newCurrency - this.currency;
                if (currencyIncrease > 50) {
                    console.log(`⚠️ IA CURRENCY WARNING: Incremento grande detectado: +${currencyIncrease.toFixed(0)}$ (${this.currency.toFixed(0)}$ → ${newCurrency.toFixed(0)}$)`);
                }
            }
            
            this.currency = newCurrency;
        }
    }
    
    /**
     * REGLA 1: Reabastecer FOBs desde HQ (cada 2 segundos)
     * Envía convoyes a TODOS los FOBs que necesiten suministros (<50%)
     */
    ruleResupplyFOBs(team) {
        const myNodes = this.gameState.nodes.filter(n => n.team === team && n.active);
        const hq = myNodes.find(n => n.type === 'hq');
        const myFOBs = myNodes.filter(n => n.type === 'fob');
        
        // Debug: Verificar qué nodos tiene la IA
        if (AIConfig.debug.logSupply && myFOBs.length === 0) {
            const allNodes = this.gameState.nodes.filter(n => n.team === team);
            console.log(`🤖 IA DEBUG: No se encontraron FOBs para ${team}`);
            console.log(`   - Total nodos de ${team}: ${allNodes.length}`);
            console.log(`   - Tipos encontrados: ${allNodes.map(n => n.type).join(', ')}`);
            console.log(`   - HQ encontrado: ${hq ? 'SÍ' : 'NO'}`);
        }
        
        if (!hq || !myFOBs || myFOBs.length === 0) return;
        
        // Enviar a TODOS los FOBs que cumplan la condición (no solo al primero)
        for (const fob of myFOBs) {
            if (!fob.active) continue;
            
            // Verificar si el FOB necesita suministros
            const supplyPercentage = (fob.supplies / fob.maxSupplies) * 100;
            
            // 🎯 ENCAPSULACIÓN: Usar umbral ajustado por raza y dificultad
            const threshold = getAdjustedThreshold('fobSupply', this.raceId, this.difficulty) || 50;
            
            if (supplyPercentage <= threshold) {
                // Intentar enviar convoy desde el HQ
                const success = this.sendSupplyConvoy(hq, fob, team);
                
                if (success) {
                    if (AIConfig.debug.logSupply || AIConfig.debug.logActions) {
                        console.log(`🤖 IA SUPPLY: Enviando suministros al FOB ${fob.id} (${supplyPercentage.toFixed(0)}% suministros)`);
                    }
                    // NO hacer return - continuar revisando otros FOBs
                }
            }
        }
    }
    
    /**
     * REGLA 2: Reabastecer Frentes desde FOBs (cada 3 segundos)
     * Envía convoyes a TODOS los frentes que necesiten suministros (<70%)
     */
    ruleResupplyFronts(team) {
        const myNodes = this.gameState.nodes.filter(n => n.team === team && n.active);
        const myFOBs = myNodes.filter(n => n.type === 'fob');
        const myFronts = myNodes.filter(n => n.type === 'front'); // Los frentes se crean como 'front', no 'campaignFront'
        
        if (!myFronts || myFronts.length === 0) return;
        
        // Revisar TODOS los frentes (no solo el primero)
        for (const front of myFronts) {
            if (!front.active) continue;
            
            // Verificar si el frente necesita suministros
            const supplyPercentage = (front.supplies / front.maxSupplies) * 100;
            
            // 🎯 ENCAPSULACIÓN: Usar umbral ajustado por raza y dificultad
            const threshold = getAdjustedThreshold('frontSupply', this.raceId, this.difficulty) || 70;
            
            if (supplyPercentage < threshold) {
                // Buscar el FOB más cercano con recursos y vehículos disponibles
                const closestFOB = this.findClosestFOBWithResources(front, myFOBs);
                
                if (closestFOB) {
                    const success = this.sendSupplyConvoy(closestFOB, front, team);
                    
                    if (success) {
                        if (AIConfig.debug.logSupply || AIConfig.debug.logActions) {
                            console.log(`🤖 IA SUPPLY: Enviando suministros al Frente ${front.id} desde FOB ${closestFOB.id} (${supplyPercentage.toFixed(0)}% suministros)`);
                        }
                        // NO hacer return - continuar revisando otros Frentes
                        continue; // Pasar al siguiente frente
                    }
                }
            }
        }
    }
    
    /**
     * 🆕 REGLA 2.5: Reabastecimiento con helicópteros (B_Nation)
     * - Envía helicópteros desde HQ a frentes (sin importar umbral de suministros)
     * - Regresa helicópteros vacíos a Base Aérea (si existe) o HQ para recargar
     */
    ruleResupplyHelicopters(team) {
        const myNodes = this.gameState.nodes.filter(n => n.team === team && n.active);
        const hq = myNodes.find(n => n.type === 'hq');
        const myFronts = myNodes.filter(n => n.type === 'front');
        const myAerialBases = myNodes.filter(n => (n.type === 'aerialBase' || n.isAerialBase) && n.active);
        
        if (!hq) return;
        
        // Obtener todos los helicópteros del equipo
        const myHelicopters = this.gameState.helicopters.filter(h => h.team === team);
        
        if (myHelicopters.length === 0) {
            if (AIConfig.debug.logSupply) {
                console.log(`🚁 IA HELICOPTER: No hay helicópteros para ${team}`);
            }
            return;
        }
        
        const heliConfig = GAME_CONFIG.vehicles.helicopter;
        
        // Helper: Encontrar Base Aérea más cercana con suministros disponibles
        const findClosestAerialBaseWithSupplies = (fromNode) => {
            let closestBase = null;
            let minDistance = Infinity;
            
            for (const base of myAerialBases) {
                if (!base.active) continue;
                
                // Verificar que tenga suministros disponibles
                const availableSupplies = base.supplies || 0;
                if (availableSupplies <= 0) continue;
                
                const dx = base.x - fromNode.x;
                const dy = base.y - fromNode.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestBase = base;
                }
            }
            
            return closestBase;
        };
        
        // Helper: Determinar destino para recargar (Base Aérea prioritaria sobre HQ)
        const getRechargeDestination = (fromNode) => {
            const aerialBase = findClosestAerialBaseWithSupplies(fromNode);
            if (aerialBase) {
                return aerialBase;
            }
            return hq; // Fallback a HQ si no hay Base Aérea disponible
        };
        
        // PRIORIDAD 1: Enviar helicópteros llenos desde HQ o Base Aérea a frentes
        // Primero intentar desde Bases Aéreas (más cercanas a los frentes)
        for (const aerialBase of myAerialBases) {
            if (!aerialBase.active || !aerialBase.landedHelicopters || aerialBase.landedHelicopters.length === 0) continue;
            
            for (const heliId of aerialBase.landedHelicopters) {
                const heli = myHelicopters.find(h => h.id === heliId);
                if (!heli || heli.state !== 'landed') continue;
                
                // El helicóptero debe tener carga completa para enviar a frentes
                if (heli.cargo >= heliConfig.deliveryAmount && myFronts.length > 0) {
                    let closestFront = null;
                    let minDistance = Infinity;
                    
                    for (const front of myFronts) {
                        if (!front.active) continue;
                        
                        const dx = front.x - aerialBase.x;
                        const dy = front.y - aerialBase.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestFront = front;
                        }
                    }
                    
                    if (closestFront) {
                        const success = this.sendSupplyConvoy(aerialBase, closestFront, team);
                        if (success) {
                            if (AIConfig.debug.logSupply || AIConfig.debug.logActions) {
                                console.log(`🚁 IA HELICOPTER: Enviando helicóptero ${heliId} desde Base Aérea ${aerialBase.id} a Frente ${closestFront.id}`);
                            }
                            return; // Solo enviar uno por ciclo para evitar spam
                        }
                    }
                }
            }
        }
        
        // También enviar desde HQ si hay helicópteros disponibles
        if (hq.landedHelicopters && hq.landedHelicopters.length > 0) {
            for (const heliId of hq.landedHelicopters) {
                const heli = myHelicopters.find(h => h.id === heliId);
                if (!heli || heli.state !== 'landed') continue;
                
                // El helicóptero en HQ ya tiene carga completa (se carga al aterrizar, no al despegar)
                // Buscar el frente más cercano
                if (myFronts.length > 0) {
                    let closestFront = null;
                    let minDistance = Infinity;
                    
                    for (const front of myFronts) {
                        if (!front.active) continue;
                        
                        const dx = front.x - hq.x;
                        const dy = front.y - hq.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestFront = front;
                        }
                    }
                    
                    if (closestFront) {
                        const success = this.sendSupplyConvoy(hq, closestFront, team);
                        if (success) {
                            if (AIConfig.debug.logSupply || AIConfig.debug.logActions) {
                                console.log(`🚁 IA HELICOPTER: Enviando helicóptero ${heliId} desde HQ a Frente ${closestFront.id}`);
                            }
                            return; // Solo enviar uno por ciclo para evitar spam
                        }
                    }
                }
            }
        }
        
        // PRIORIDAD 1.5: Mover helicópteros con cargo parcial desde frentes a otros frentes o recargar
        for (const front of myFronts) {
            if (!front.active || !front.landedHelicopters || front.landedHelicopters.length === 0) continue;
            
            for (const heliId of front.landedHelicopters) {
                const heli = myHelicopters.find(h => h.id === heliId);
                if (!heli || heli.state !== 'landed') continue;
                
                // Solo procesar si tiene cargo pero no está completamente vacío
                if (heli.cargo > 0 && heli.cargo < heliConfig.baseCapacity) {
                    // Si tiene suficiente cargo para otra entrega, enviarlo a otro frente
                    if (heli.cargo >= heliConfig.deliveryAmount) {
                        // Buscar otro frente (no el actual)
                        let targetFront = null;
                        let minDistance = Infinity;
                        
                        for (const otherFront of myFronts) {
                            if (!otherFront.active || otherFront.id === front.id) continue;
                            
                            const dx = otherFront.x - front.x;
                            const dy = otherFront.y - front.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            if (distance < minDistance) {
                                minDistance = distance;
                                targetFront = otherFront;
                            }
                        }
                        
                        if (targetFront) {
                            const success = this.sendSupplyConvoy(front, targetFront, team);
                            if (success) {
                                if (AIConfig.debug.logSupply || AIConfig.debug.logActions) {
                                    console.log(`🚁 IA HELICOPTER: Moviendo helicóptero ${heliId} con cargo parcial (${heli.cargo}) desde Frente ${front.id} a Frente ${targetFront.id}`);
                                }
                                return; // Solo enviar uno por ciclo
                            }
                        }
                    } else {
                        // Cargo insuficiente para otra entrega, regresar a Base Aérea o HQ
                        const rechargeDest = getRechargeDestination(front);
                        const success = this.sendSupplyConvoy(front, rechargeDest, team);
                        if (success) {
                            if (AIConfig.debug.logSupply || AIConfig.debug.logActions) {
                                const destType = rechargeDest.type === 'aerialBase' ? 'Base Aérea' : 'HQ';
                                console.log(`🚁 IA HELICOPTER: Regresando helicóptero con cargo insuficiente (${heli.cargo}) desde Frente ${front.id} a ${destType} ${rechargeDest.id}`);
                            }
                            return; // Solo enviar uno por ciclo
                        }
                    }
                }
            }
        }
        
        // PRIORIDAD 2: Regresar helicópteros vacíos desde frentes a Base Aérea o HQ
        for (const front of myFronts) {
            if (!front.active || !front.landedHelicopters || front.landedHelicopters.length === 0) continue;
            
            for (const heliId of front.landedHelicopters) {
                const heli = myHelicopters.find(h => h.id === heliId);
                if (!heli || heli.state !== 'landed') continue;
                
                // Verificar si el helicóptero está completamente vacío
                if (heli.cargo <= 0) {
                    const rechargeDest = getRechargeDestination(front);
                    const success = this.sendSupplyConvoy(front, rechargeDest, team);
                    if (success) {
                        if (AIConfig.debug.logSupply || AIConfig.debug.logActions) {
                            const destType = rechargeDest.type === 'aerialBase' ? 'Base Aérea' : 'HQ';
                            console.log(`🚁 IA HELICOPTER: Regresando helicóptero vacío ${heliId} desde Frente ${front.id} a ${destType} ${rechargeDest.id}`);
                        }
                        return; // Solo enviar uno por ciclo
                    }
                }
            }
        }
        
        // PRIORIDAD 3: Regresar helicópteros vacíos desde otras bases a Base Aérea o HQ
        for (const node of myNodes) {
            if (node.type === 'hq' || node.type === 'front') continue; // Ya procesados
            if (!node.active || !node.landedHelicopters || node.landedHelicopters.length === 0) continue;
            
            for (const heliId of node.landedHelicopters) {
                const heli = myHelicopters.find(h => h.id === heliId);
                if (!heli || heli.state !== 'landed') continue;
                
                // Verificar si el helicóptero está vacío o casi vacío
                if (heli.cargo <= 0) {
                    const rechargeDest = getRechargeDestination(node);
                    const success = this.sendSupplyConvoy(node, rechargeDest, team);
                    if (success) {
                        if (AIConfig.debug.logSupply || AIConfig.debug.logActions) {
                            const destType = rechargeDest.type === 'aerialBase' ? 'Base Aérea' : 'HQ';
                            console.log(`🚁 IA HELICOPTER: Regresando helicóptero vacío ${heliId} desde ${node.type} ${node.id} a ${destType} ${rechargeDest.id}`);
                        }
                        return; // Solo enviar uno por ciclo
                    }
                }
            }
        }
    }
    
    /**
     * Encuentra el FOB más cercano con recursos y vehículos disponibles
     */
    findClosestFOBWithResources(targetNode, fobs) {
        let closestFOB = null;
        let minDistance = Infinity;
        
        for (const fob of fobs) {
            if (!fob.active) continue;
            
            // Verificar que tenga recursos y vehículos
            if (!fob.availableVehicles || fob.availableVehicles <= 0) continue;
            if (!fob.supplies || fob.supplies < 10) continue;
            
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
     * Envía convoy de suministros (simulando evento de jugador real)
     * 🆕 MEJORADO: Soporta helicópteros para B_Nation
     */
    sendSupplyConvoy(from, to, team) {
        // 🆕 NUEVO: Para B_Nation, verificar helicópteros en lugar de vehículos
        const raceManager = this.gameState.raceManager;
        const playerRace = raceManager.getPlayerRace(team);
        const isHelicopterRace = playerRace === 'B_Nation';
        
        if (isHelicopterRace) {
            // Verificar helicópteros disponibles
            if (!from.landedHelicopters || from.landedHelicopters.length === 0) {
                if (AIConfig.debug.logSupply) {
                    console.log(`🚁 IA HELICOPTER: No hay helicópteros disponibles en ${from.id}`);
                }
                return false;
            }
        } else {
            // Verificar vehículos disponibles (sistema tradicional)
            if (!from.availableVehicles || from.availableVehicles <= 0) {
                if (AIConfig.debug.logSupply) {
                    console.log(`🤖 IA SUPPLY: No hay vehículos disponibles en ${from.id}`);
                }
                return false;
            }
        }
        
        // 🎯 SIMULAR EVENTO DE JUGADOR REAL: Usar mismo handler que jugadores
        try {
            const result = this.gameState.handleConvoy(team, from.id, to.id);
            
            if (result.success) {
                // 🎯 BROADCAST como si fuera un jugador real
                if (result.helicopter) {
                    // Es un helicóptero
                    this.io.to(this.roomId).emit('helicopter_dispatched', {
                        helicopterId: result.helicopter.id,
                        fromId: from.id,
                        toId: to.id,
                        team: team
                    });
                } else {
                    // Es un convoy tradicional
                    this.io.to(this.roomId).emit('convoy_spawned', {
                        convoyId: result.convoy.id,
                        fromId: from.id,
                        toId: to.id,
                        team: team,
                        vehicleType: result.convoy.vehicleType,
                        cargo: result.convoy.cargo
                    });
                }
                
                if (AIConfig.debug.logSupply) {
                    console.log(`🤖 IA SUPPLY: ✅ Convoy creado: ${result.convoy?.id || result.helicopter?.id || 'unknown'} desde ${from.id} a ${to.id}`);
                }
                return true;
            } else {
                if (AIConfig.debug.logSupply) {
                    console.log(`🤖 IA SUPPLY: ❌ handleConvoy falló: ${result.reason || 'unknown'}`);
                }
                return false;
            }
        } catch (error) {
            console.error(`❌ Error enviando convoy de IA:`, error);
            return false;
        }
    }
    
    /**
     * Maneja construcciones estratégicas (FOBs, plantas, etc)
     */
    handleStrategicBuilding(team, currency) {
        // Después de la primera decisión, usar intervalo normal ajustado
        if (this.firstStrategicDecision) {
            this.firstStrategicDecision = false;
            this.intervals.strategic = getAdjustedInterval('strategic', this.raceId, this.difficulty);
        }
        
        // 🎯 ENCAPSULACIÓN: Usar umbral ajustado por raza y dificultad
        // Nota: currencyThreshold ahora es 1.0 para todas las dificultades (solo velocidad cambia)
        const threshold = getAdjustedThreshold('currencyStrategic', this.raceId, this.difficulty) || 50;
        if (currency < threshold) {
            if (AIConfig.debug.logActions) {
                console.log(`🤖 IA: Currency insuficiente (${currency.toFixed(0)}$ < ${threshold.toFixed(0)}$)`);
            }
            return;
        }
        
        const state = this.analyzeState(team);
        const recommendations = this.evaluateActions(team, currency, state);
        
        if (recommendations.length === 0) {
            if (AIConfig.debug.logActions) {
                console.log(`🤖 IA: No hay acciones disponibles (currency: ${currency.toFixed(0)}$, phase: ${state.phase})`);
            }
            return;
        }
        
        // 🎯 ENCAPSULACIÓN: Los scores ya vienen ajustados de evaluateActions
        // Nota: actionScore ahora es 1.0 para todas las dificultades (solo velocidad cambia)
        
        // Ejecutar mejor acción si hay alguna
        if (recommendations.length > 0) {
            const bestAction = recommendations[0];
            if (AIConfig.debug.logActions) {
                console.log(`🤖 IA: Mejor acción: ${bestAction.buildingType} (score: ${bestAction.score.toFixed(1)}, cost: ${bestAction.cost}$)`);
            }
            this.executeAction(bestAction, team);
        }
    }
    
    /**
     * Maneja decisiones ofensivas (drones, snipers)
     */
    handleOffensiveDecision(team, currency) {
        const buildHandler = this.gameState.buildHandler;
        const costs = buildHandler.getBuildingCosts();
        const minCost = Math.min(
            costs['sniperStrike'] || 60,
            costs['drone'] || 150
        );
        const threshold = minCost * this.difficultyMultipliers.currencyThreshold;
        
        if (currency < threshold) return;
        
        const recommendations = this.evaluateOffensiveActions(team, currency);
        
        // 🎯 ENCAPSULACIÓN: Los scores ya vienen ajustados de evaluateOffensiveActions
        // No necesitamos aplicar multiplicador de dificultad aquí (ya está en getAdjustedScore)
        
        if (recommendations.length > 0) {
            const bestAction = recommendations[0];
            this.executeAction(bestAction, team);
        }
    }
    
    /**
     * Analiza el estado del juego
     */
    analyzeState(team) {
        const myNodes = this.gameState.nodes.filter(n => n.team === team);
        const playerNodes = this.gameState.nodes.filter(n => n.team === 'player1');
        
        const myFOBs = myNodes.filter(n => n.type === 'fob');
        const myPlants = myNodes.filter(n => n.type === 'nuclearPlant');
        const hasLauncher = myNodes.some(n => n.type === 'droneLauncher');
        const playerPlants = playerNodes.filter(n => n.type === 'nuclearPlant');
        
        // 🆕 NUEVO: Contar Bases Aéreas, antenas y hospitales para B_Nation
        const myAerialBases = myNodes.filter(n => (n.type === 'aerialBase' || n.isAerialBase) && n.active);
        const myIntelRadios = myNodes.filter(n => n.type === 'intelRadio' && n.active);
        const myHospitals = myNodes.filter(n => n.type === 'campaignHospital' && n.active);
        
        const currency = this.gameState.currency[team] || 0;
        
        return {
            phase: currency < 200 ? 'early' : currency < 400 ? 'mid' : 'late',
            myFOBs: myFOBs.length,
            myPlants: myPlants.length,
            playerPlants: playerPlants.length,
            hasLauncher: hasLauncher,
            currency: currency,
            myAerialBases: myAerialBases.length,  // 🆕 NUEVO
            myIntelRadios: myIntelRadios.length,  // 🆕 NUEVO
            myHospitals: myHospitals.length       // 🆕 NUEVO
        };
    }
    
    /**
     * Evalúa acciones posibles usando costes dinámicos del servidor
     */
    evaluateActions(team, currency, state) {
        const actions = [];
        const buildHandler = this.gameState.buildHandler;
        const costs = buildHandler.getBuildingCosts();
        
        // Debug: Verificar edificios disponibles
        if (AIConfig.debug.logActions && this.availableBuildings.length === 0) {
            console.warn(`⚠️ IA: availableBuildings está vacío! Recalculando...`);
            this.availableBuildings = this.calculateAvailableBuildings();
        }
        
        // Helper: Obtener coste dinámico
        const getCost = (buildingType) => {
            return costs[buildingType] || 999;
        };
        
        // 🎯 ENCAPSULACIÓN: Usar configuración por raza y dificultad
        // Helper para evaluar construcción
        const evaluateBuilding = (buildingType, context = {}) => {
            if (!this.canBuild(buildingType) || currency < getCost(buildingType)) {
                return null;
            }
            
            // Verificar si ya tiene el edificio (para algunos edificios)
            const hasBuilding = this.gameState.nodes.some(n => 
                n.team === team && n.type === buildingType && n.active
            );
            
            // Si ya tiene el edificio y no debe tener múltiples, retornar null
            if (hasBuilding && ['truckFactory', 'antiDrone', 'engineerCenter', 'droneLauncher'].includes(buildingType)) {
                return null;
            }
            
            // Obtener score ajustado por raza y dificultad
            const score = getAdjustedScore('building', buildingType, this.raceId, this.difficulty, {
                phase: state.phase,
                myFOBs: state.myFOBs,
                myPlants: state.myPlants,
                playerPlants: state.playerPlants,
                hasLauncher: state.hasLauncher,
                ...context
            });
            
            // Si score es null, el edificio no está disponible para esta raza
            if (score === null) {
                return null;
            }
            
            return {
                type: 'build',
                buildingType: buildingType,
                score: score,
                cost: getCost(buildingType)
            };
        };
        
        // 🆕 NUEVO: PRIORIDADES ESPECIALES PARA B_Nation
        if (this.raceId === 'B_Nation') {
            // PRIORIDAD 1: Asegurar al menos 1 Base Aérea
            if (state.myAerialBases < 1) {
                const aerialBaseAction = evaluateBuilding('aerialBase');
                if (aerialBaseAction) {
                    // Score muy alto para forzar construcción
                    aerialBaseAction.score = 999;
                    actions.push(aerialBaseAction);
                    if (AIConfig.debug.logActions) {
                        console.log(`🎯 IA B_Nation PRIORIDAD 1: Necesita Base Aérea (tiene ${state.myAerialBases})`);
                    }
                    // Solo permitir Base Aérea hasta tenerla
                    return actions.sort((a, b) => b.score - a.score);
                } else {
                    // No puede construir Base Aérea aún (falta currency o no está disponible)
                    // Bloquear otras construcciones hasta tener Base Aérea
                    if (AIConfig.debug.logActions) {
                        console.log(`🎯 IA B_Nation PRIORIDAD 1: Bloqueando otras construcciones - necesita Base Aérea primero`);
                    }
                    return []; // No permitir otras construcciones
                }
            }
            
            // PRIORIDAD 2: Asegurar al menos 2 antenas (intelRadio)
            if (state.myAerialBases >= 1 && state.myIntelRadios < 2) {
                const intelRadioAction = evaluateBuilding('intelRadio');
                if (intelRadioAction) {
                    // Score muy alto para forzar construcción
                    intelRadioAction.score = 998;
                    actions.push(intelRadioAction);
                    if (AIConfig.debug.logActions) {
                        console.log(`🎯 IA B_Nation PRIORIDAD 2: Necesita antenas (tiene ${state.myIntelRadios}/2)`);
                    }
                    // Solo permitir antenas hasta tener 2
                    return actions.sort((a, b) => b.score - a.score);
                } else {
                    // No puede construir antena aún (falta currency o no está disponible)
                    // Bloquear otras construcciones hasta tener 2 antenas
                    if (AIConfig.debug.logActions) {
                        console.log(`🎯 IA B_Nation PRIORIDAD 2: Bloqueando otras construcciones - necesita antenas primero (${state.myIntelRadios}/2)`);
                    }
                    return []; // No permitir otras construcciones
                }
            }
        }
        
        // Evaluar todos los edificios disponibles (solo si se cumplen las prioridades para B_Nation)
        const buildingsToEvaluate = [
            'intelRadio',
            'truckFactory',
            'fob',
            'nuclearPlant',
            'droneLauncher',
            'antiDrone',
            'engineerCenter',
            'campaignHospital',
            'aerialBase'
        ];
        
        for (const buildingType of buildingsToEvaluate) {
            // Casos especiales que requieren lógica adicional
            if (buildingType === 'droneLauncher' && state.hasLauncher) {
                continue; // Ya tiene lanzadera
            }
            
            // 🆕 NUEVO: Para B_Nation, saltar edificios que ya cumplen las prioridades
            if (this.raceId === 'B_Nation') {
                // Si ya tiene Base Aérea, no evaluarla de nuevo (ya se evaluó en prioridad 1)
                // Pero permitir múltiples si quiere (por ahora solo 1)
                if (buildingType === 'aerialBase' && state.myAerialBases >= 1) {
                    continue;
                }
                // Si ya tiene 2 antenas básicas, permitir más antenas pero con score normal
                // (no bloqueamos más antenas después de tener las 2 básicas)
                // 🆕 NUEVO: Aumentar score de antenas adicionales para priorizarlas
                if (buildingType === 'intelRadio' && state.myIntelRadios >= 2) {
                    // Permitir más antenas, pero aumentar su score para priorizarlas
                    const intelRadioAction = evaluateBuilding('intelRadio');
                    if (intelRadioAction) {
                        // Aumentar score significativamente para priorizar antenas adicionales
                        intelRadioAction.score *= 1.5; // +50% de score
                        if (AIConfig.debug.logActions) {
                            console.log(`🎯 IA B_Nation: Priorizando antena adicional (score aumentado a ${intelRadioAction.score.toFixed(1)})`);
                        }
                        actions.push(intelRadioAction);
                        continue; // Ya agregamos la acción, continuar con siguiente edificio
                    }
                }
                // 🆕 NUEVO: Limitar hospitales a solo 1 máximo
                if (buildingType === 'campaignHospital' && state.myHospitals >= 1) {
                    if (AIConfig.debug.logActions) {
                        console.log(`🎯 IA B_Nation: Ya tiene hospital (${state.myHospitals}), bloqueando más hospitales`);
                    }
                    continue; // No construir más hospitales
                }
            }
            
            if (buildingType === 'nuclearPlant') {
                // Contexto especial para plantas nucleares
                const action = evaluateBuilding(buildingType, {
                    perPlayerPlant: state.playerPlants,
                    perMyPlant: state.myPlants
                });
                if (action) actions.push(action);
            } else {
                const action = evaluateBuilding(buildingType);
                if (action) actions.push(action);
            }
        }
        
        // Debug: Mostrar qué acciones se evaluaron
        if (AIConfig.debug.logActions && actions.length === 0) {
            console.log(`🤖 IA DEBUG: evaluateActions evaluó ${this.availableBuildings.length} edificios disponibles:`);
            console.log(`   - Available: ${this.availableBuildings.join(', ')}`);
            console.log(`   - Currency: ${currency}$`);
            console.log(`   - TruckFactory cost: ${getCost('truckFactory')}$, canBuild: ${this.canBuild('truckFactory')}`);
            console.log(`   - FOB cost: ${getCost('fob')}$, canBuild: ${this.canBuild('fob')}`);
            console.log(`   - NuclearPlant cost: ${getCost('nuclearPlant')}$, canBuild: ${this.canBuild('nuclearPlant')}`);
        }
        
        // Ordenar por score
        return actions.sort((a, b) => b.score - a.score);
    }
    
    /**
     * Evalúa acciones ofensivas usando costes dinámicos
     * 🎯 ENCAPSULACIÓN: Usa configuración por raza y dificultad
     */
    evaluateOffensiveActions(team, currency) {
        const actions = [];
        const buildHandler = this.gameState.buildHandler;
        const costs = buildHandler.getBuildingCosts();
        
        const myNodes = this.gameState.nodes.filter(n => n.team === team);
        const hasLauncher = myNodes.some(n => n.type === 'droneLauncher');
        const playerNodes = this.gameState.nodes.filter(n => n.team === 'player1');
        const hasTargets = playerNodes.some(n => n.type === 'nuclearPlant' || n.type === 'campaignHospital');
        
        // Dron
        const droneCost = costs['drone'] || 150;
        if (hasLauncher && currency >= droneCost && hasTargets && this.canUse('drone')) {
            const score = getAdjustedScore('attack', 'drone', this.raceId, this.difficulty, {
                hasTargets: hasTargets
            });
            
            if (score !== null) {
                actions.push({
                    type: 'attack',
                    attackType: 'drone',
                    score: score,
                    cost: droneCost
                });
            }
        }
        
        // Sniper
        const sniperCost = costs['sniperStrike'] || 60;
        if (currency >= sniperCost && this.canUse('sniperStrike')) {
            const score = getAdjustedScore('attack', 'sniper', this.raceId, this.difficulty, {});
            
            if (score !== null) {
                actions.push({
                    type: 'attack',
                    attackType: 'sniper',
                    score: score,
                    cost: sniperCost
                });
            }
        }
        
        // FOB Sabotage (solo para B_Nation)
        if (this.canUse('fobSabotage')) {
            const fobSabotageCost = costs['fobSabotage'] || 80;
            const playerFOBs = playerNodes.filter(n => n.type === 'fob').length;
            
            // 🆕 NUEVO: Solo permitir sabotaje si se cumplen las prioridades 1 y 2
            const myNodes = this.gameState.nodes.filter(n => n.team === team);
            const myAerialBases = myNodes.filter(n => (n.type === 'aerialBase' || n.isAerialBase) && n.active);
            const myIntelRadios = myNodes.filter(n => n.type === 'intelRadio' && n.active);
            
            const hasPriority1 = myAerialBases.length >= 1;
            const hasPriority2 = myIntelRadios.length >= 2;
            
            if (currency >= fobSabotageCost && playerFOBs > 0 && hasPriority1 && hasPriority2) {
                const score = getAdjustedScore('attack', 'fobSabotage', this.raceId, this.difficulty, {
                    playerFOBs: playerFOBs
                });
                
                if (score !== null) {
                    // 🆕 NUEVO: Aumentar score de sabotajes para priorizarlos después de cumplir prioridades
                    const boostedScore = score * 1.8; // +80% de score para priorizar sabotajes
                    actions.push({
                        type: 'attack',
                        attackType: 'fobSabotage',
                        score: boostedScore,
                        cost: fobSabotageCost
                    });
                    if (AIConfig.debug.logActions) {
                        console.log(`🎯 IA B_Nation: Sabotaje disponible (score aumentado a ${boostedScore.toFixed(1)}, base: ${score.toFixed(1)})`);
                    }
                }
            } else if (AIConfig.debug.logActions && this.raceId === 'B_Nation') {
                if (!hasPriority1) {
                    console.log(`🎯 IA B_Nation: No puede usar sabotaje - falta Base Aérea (tiene ${myAerialBases.length})`);
                } else if (!hasPriority2) {
                    console.log(`🎯 IA B_Nation: No puede usar sabotaje - faltan antenas (tiene ${myIntelRadios.length}/2)`);
                }
            }
        }
        
        return actions.sort((a, b) => b.score - a.score);
    }
    
    /**
     * Ejecuta una acción
     */
    async executeAction(action, team) {
        this.stats.decisionsExecuted++;
        
        try {
            const result = await this.aiActionHandler.executeAction(action, team);
            
            if (action.type === 'build') {
                this.stats.buildingsBuilt++;
                if (AIConfig.debug.logActions) {
                    console.log(`🤖 IA: Construyendo ${action.buildingType} (${action.cost}$) - ${result ? 'ÉXITO' : 'FALLÓ'}`);
                }
            } else if (action.type === 'attack') {
                if (action.attackType === 'drone') {
                    this.stats.dronesLaunched++;
                } else if (action.attackType === 'sniper') {
                    this.stats.snipersLaunched++;
                }
                if (AIConfig.debug.logActions) {
                    console.log(`🤖 IA: ${action.attackType} (${action.cost}$) - ${result ? 'ÉXITO' : 'FALLÓ'}`);
                }
            }
        } catch (error) {
            console.error(`❌ Error ejecutando acción de IA:`, error);
        }
    }
    
    /**
     * Log de estado
     */
    logStatus(team, currency) {
        const state = this.analyzeState(team);
        console.log(`🤖 IA (${this.raceId}, ${this.difficulty}): ${state.phase} | ${currency}$ | FOBs:${state.myFOBs} Plants:${state.myPlants} | Drones:${this.stats.dronesLaunched} | Decs:${this.stats.decisionsExecuted}`);
    }
    
    /**
     * Obtiene multiplicadores según dificultad
     * 🎯 DEPRECATED: Ahora usa getDifficultyMultipliers de RaceAIConfig
     * Mantenido por compatibilidad, pero debería eliminarse
     */
    getDifficultyMultipliers() {
        return getDifficultyMultipliers(this.difficulty);
    }
    
    /**
     * Maneja reacciones a amenazas del jugador
     */
    handleReactions(team, currency) {
        const playerNodes = this.gameState.nodes.filter(n => n.team === 'player1' && n.active);
        const myNodes = this.gameState.nodes.filter(n => n.team === team && n.active);
        
        // Detectar plantas nucleares del jugador
        const playerPlants = playerNodes.filter(n => n.type === 'nuclearPlant');
        const myPlants = myNodes.filter(n => n.type === 'nuclearPlant');
        
        // Detectar lanzaderas del jugador
        const playerHasLauncher = playerNodes.some(n => n.type === 'droneLauncher');
        
        // Urgencia: Si jugador tiene más plantas que yo, debo construir una
        // Nota: currencyThreshold ahora es 1.0, así que el umbral es el mismo para todas las dificultades
        const plantCost = this.gameState.buildHandler.getBuildingCosts()['nuclearPlant'] || 200;
        if (playerPlants.length > myPlants.length && currency >= plantCost) {
            this.stats.decisionsExecuted++;
            if (AIConfig.debug.logActions) {
                console.log(`🤖 IA REACCIÓN: Construir planta (jugador ${playerPlants.length} vs yo ${myPlants.length})`);
            }
            this.executeAction({ type: 'build', buildingType: 'nuclearPlant', cost: plantCost }, team);
            return;
        }
        
        // Detectar si jugador lanzó dron recientemente
        const recentDrone = this.gameState.droneSystem?.drones?.some(d => 
            d.team === 'player1' && 
            Date.now() - d.createdAt < 10000 // Últimos 10s
        ) || false;
        
        // Si jugador tiene lanzadera y lanzó dron: construir anti-drone
        // Nota: currencyThreshold ahora es 1.0, así que el umbral es el mismo para todas las dificultades
        const antiDroneCost = this.gameState.buildHandler.getBuildingCosts()['antiDrone'] || 115;
        if (playerHasLauncher && recentDrone && currency >= antiDroneCost) {
            const hasAntiDrone = myNodes.some(n => n.type === 'antiDrone');
            if (!hasAntiDrone && Math.random() < 0.6) {
                this.stats.decisionsExecuted++;
                if (AIConfig.debug.logActions) {
                    console.log(`🤖 IA REACCIÓN: Construir anti-drone (jugador lanzó dron)`);
                }
                this.executeAction({ type: 'build', buildingType: 'antiDrone', cost: antiDroneCost }, team);
            }
        }
    }
    
    /**
     * Maneja emergencias médicas
     * Usa el sistema de emergencias activas del MedicalSystem
     */
    handleMedicalEmergencies(team, currency) {
        // Obtener emergencias activas del sistema médico
        const medicalSystem = this.gameState.medicalSystem;
        if (!medicalSystem || !medicalSystem.activeEmergencies) {
            return;
        }
        
        // Buscar emergencias activas para nuestro equipo
        const myEmergencyFronts = [];
        for (const [frontId, emergency] of medicalSystem.activeEmergencies.entries()) {
            if (emergency.resolved) continue; // Ya resuelta
            
            const front = this.gameState.nodes.find(n => 
                n.id === frontId && 
                n.team === team && 
                n.active &&
                n.type === 'front' // Los frentes son 'front', no 'campaignFront'
            );
            
            if (front) {
                myEmergencyFronts.push({ front, emergency });
            }
        }
        
        if (myEmergencyFronts.length === 0) {
            return; // No hay emergencias activas para nuestro equipo
        }
        
        // Intentar enviar ambulancia si tengo HQ o hospital
        const myNodes = this.gameState.nodes.filter(n => n.team === team && n.active);
        const hq = myNodes.find(n => n.type === 'hq');
        const hospital = myNodes.find(n => n.type === 'campaignHospital');
        
        const ambulanceSource = hospital || hq;
        
        if (!ambulanceSource || !ambulanceSource.availableVehicles || ambulanceSource.availableVehicles <= 0) {
            if (AIConfig.debug.logActions && myEmergencyFronts.length > 0) {
                console.log(`🤖 IA MEDICAL: Hay ${myEmergencyFronts.length} emergencias pero no hay vehículos disponibles`);
            }
            return;
        }
        
        // Enviar ambulancia a la primera emergencia encontrada (70% probabilidad)
        if (Math.random() < 0.7) {
            const { front, emergency } = myEmergencyFronts[0];
            
            try {
                // 🎯 USAR HANDLER DE CONVOYES (mismo que jugadores humanos)
                const result = this.gameState.convoyHandler.handleAmbulance(
                    team,
                    ambulanceSource.id,
                    front.id
                );
                
                if (result.success) {
                    // 🎯 BROADCAST como si fuera un jugador real
                    this.io.to(this.roomId).emit('ambulance_dispatched', {
                        convoyId: result.convoy.id,
                        fromId: ambulanceSource.id,
                        toId: front.id,
                        team: team
                    });
                    
                    if (AIConfig.debug.logActions) {
                        console.log(`🤖 IA MEDICAL: ✅ Ambulancia enviada al frente ${front.id} (emergencia activa)`);
                    }
                } else {
                    if (AIConfig.debug.logActions) {
                        console.log(`🤖 IA MEDICAL: ❌ No se pudo enviar ambulancia: ${result.reason || 'unknown'}`);
                    }
                }
            } catch (error) {
                if (AIConfig.debug.logActions) {
                    console.log(`🤖 IA MEDICAL: Error enviando ambulancia: ${error.message}`);
                }
            }
        }
    }
}

