// ===== MANAGER DE ABASTECIMIENTO DE IA =====
// Gestiona el reabastecimiento de FOBs, frentes y helicópteros

import AIConfig from '../config/AIConfig.js';
import { GAME_CONFIG } from '../../../config/gameConfig.js';
import { getAdjustedThreshold } from '../config/RaceAIConfig.js';

export class AISupplyManager {
    constructor(gameState, io, roomId, raceId, difficulty) {
        this.gameState = gameState;
        this.io = io;
        this.roomId = roomId;
        this.raceId = raceId;
        this.difficulty = difficulty;
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
                        }
                        // NO hacer return - continuar revisando otros Frentes
                        continue; // Pasar al siguiente frente
                    }
                }
            }
        }
    }
    
    /**
     * 🆕 REGLA 2.5: Reabastecimiento con helicópteros
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
     */
    sendSupplyConvoy(from, to, team) {
        // Verificar helicópteros si es un nodo que los usa
        if (from.type === 'front' && from.hasHelicopters) {
            // Verificar helicópteros disponibles
            if (!from.landedHelicopters || from.landedHelicopters.length === 0) {
                if (AIConfig.debug.logSupply) {
                }
                return false;
            }
        } else {
            // Verificar vehículos disponibles (sistema tradicional)
            if (!from.availableVehicles || from.availableVehicles <= 0) {
                if (AIConfig.debug.logSupply) {
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
                }
                return true;
            } else {
                if (AIConfig.debug.logSupply) {
                }
                return false;
            }
        } catch (error) {
            console.error(`❌ Error enviando convoy de IA:`, error);
            return false;
        }
    }
}

