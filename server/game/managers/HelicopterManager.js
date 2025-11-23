// ===== MANAGER DE HELICÓPTEROS =====
import { GAME_CONFIG } from '../../config/gameConfig.js';

export class HelicopterManager {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Crea un helicóptero persistente
     * @param {string} team - Equipo del helicóptero ('player1' o 'player2')
     * @param {string} nodeId - ID del nodo donde está aterrizado
     * @returns {Object} Helicóptero creado
     */
    createHelicopter(team, nodeId) {
        // Generar ID simple sin uuid (para evitar async)
        const helicopterId = `heli_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // 🆕 REWORK: Verificar si el nodo es HQ para cargar inicialmente (consume suministros)
        const node = this.gameState.nodes.find(n => n.id === nodeId);
        const heliConfig = GAME_CONFIG.vehicles.helicopter;
        let initialCargo = 0;
        if (node && node.type === 'hq' && node.hasSupplies) {
            // HQ: cargar desde suministros disponibles
            initialCargo = Math.min(heliConfig.baseCapacity, node.supplies || 0);
            if (initialCargo > 0) {
                node.supplies -= initialCargo;
            }
        }
        
        const helicopter = {
            id: helicopterId,
            team: team,
            
            // Estado del helicóptero
            state: 'landed',  // 'landed' o 'flying'
            
            // Cargo
            cargo: initialCargo,  // 🆕 Carga completa si está en HQ, 0 si no
            
            // Posición
            currentNodeId: nodeId,  // Donde está aterrizado
            targetNodeId: null,     // null si está aterrizado
            progress: null,         // 0-1, null si está aterrizado
            initialDistance: null   // Para calcular velocidad
        };
        
        this.gameState.helicopters.push(helicopter);
        
        if (initialCargo > 0) {
            console.log(`🚁 Helicóptero ${helicopter.id} creado para ${team} en HQ ${nodeId} con carga completa (${initialCargo})`);
        } else {
            console.log(`🚁 Helicóptero ${helicopter.id} creado para ${team} en nodo ${nodeId} sin carga`);
        }
        
        return helicopter;
    }
    
    /**
     * Actualiza todos los helicópteros volando
     * @param {number} dt - Delta time en segundos
     */
    update(dt) {
        // 🎯 CORREGIR: Usar misma fuente de velocidad que convoyes (convoy.vehicleSpeeds)
        // Los convoyes usan GAME_CONFIG.convoy.vehicleSpeeds, el helicóptero debe usar lo mismo
        const vehicleSpeed = GAME_CONFIG.convoy.vehicleSpeeds.helicopter || 80;
        
        for (let i = this.gameState.helicopters.length - 1; i >= 0; i--) {
            const heli = this.gameState.helicopters[i];
            
            if (heli.state !== 'flying') continue;
            
            const toNode = this.gameState.nodes.find(n => n.id === heli.targetNodeId);
            if (!toNode) {
                console.error(`⚠️ Helicóptero ${heli.id} tiene destino inválido: ${heli.targetNodeId}`);
                continue;
            }
            
            // Calcular velocidad y actualizar progress (igual que convoyes)
            const progressPerSecond = vehicleSpeed / heli.initialDistance;
            heli.progress += progressPerSecond * dt;
            
            // Llegó al destino
            if (heli.progress >= 1) {
                this.handleArrival(heli, toNode);
            }
        }
    }
    
    /**
     * Maneja la llegada de un helicóptero a su destino
     * @param {Object} heli - Helicóptero que llegó
     * @param {Object} toNode - Nodo de destino
     */
    handleArrival(heli, toNode) {
        const heliConfig = GAME_CONFIG.vehicles.helicopter;
        
        if (toNode.type === 'front') {
            // Entregar suministros si tiene suficiente cargo
            if (heli.cargo >= heliConfig.deliveryAmount) {
                const deliveryAmount = heliConfig.deliveryAmount;
                heli.cargo -= deliveryAmount;
                
                if (toNode.hasSupplies && toNode.supplies !== null) {
                    const oldSupplies = toNode.supplies;
                    toNode.supplies = Math.min(toNode.maxSupplies, toNode.supplies + deliveryAmount);
                    console.log(`🚁 Helicóptero ${heli.id} entregó ${deliveryAmount} suministros a Front ${toNode.id}: ${oldSupplies} → ${toNode.supplies}/${toNode.maxSupplies} (cargo restante: ${heli.cargo})`);
                }
            } else {
                console.log(`🚁 Helicóptero ${heli.id} llegó a Front ${toNode.id} sin suficientes suministros (tiene ${heli.cargo}, necesita ${heliConfig.deliveryAmount})`);
            }
        } else if (toNode.type === 'hq') {
            // 🆕 REWORK: Recargar cargo al llegar al HQ (consume suministros finitos)
            const neededCargo = heliConfig.baseCapacity - heli.cargo;
            if (toNode.hasSupplies && neededCargo > 0) {
                const availableCargo = toNode.supplies || 0;
                const rechargeAmount = Math.min(neededCargo, availableCargo);
                heli.cargo += rechargeAmount;
                toNode.supplies -= rechargeAmount;
                console.log(`🚁 Helicóptero ${heli.id} llegó al HQ ${toNode.id} - cargo recargado ${heli.cargo - rechargeAmount} → ${heli.cargo} (HQ: ${toNode.supplies + rechargeAmount} → ${toNode.supplies}/${toNode.maxSupplies})`);
            } else {
                console.log(`🚁 Helicóptero ${heli.id} llegó al HQ ${toNode.id} - sin suministros disponibles para recargar (cargo actual: ${heli.cargo})`);
            }
        } else if (toNode.type === 'aerialBase' || toNode.isAerialBase) {
            // Recargar en Base Aérea (suministros limitados)
            const neededCargo = heliConfig.baseCapacity - heli.cargo;
            const availableCargo = toNode.supplies || 0;
            const rechargeAmount = Math.min(neededCargo, availableCargo);
            
            heli.cargo += rechargeAmount;
            toNode.supplies -= rechargeAmount;
            
            const oldSupplies = toNode.supplies + rechargeAmount;
            console.log(`🚁 Helicóptero ${heli.id} recargó ${rechargeAmount} suministros en Base Aérea ${toNode.id}: cargo ${heli.cargo - rechargeAmount} → ${heli.cargo}, Base Aérea ${oldSupplies} → ${toNode.supplies}/${toNode.maxSupplies}`);
            
            // Verificar si se agotó la Base Aérea
            if (toNode.supplies <= 0) {
                console.log(`💥 ===== Base Aérea ${toNode.id} SE AGOTÓ =====`);
                console.log(`   📊 Estado: supplies=${toNode.supplies}, landedHelicopters=${toNode.landedHelicopters?.length || 0}`);
                console.log(`   🔍 Condiciones para abandono:`);
                console.log(`      - supplies <= 0: ${toNode.supplies <= 0}`);
                console.log(`      - autoDestroy: ${toNode.autoDestroy}`);
                console.log(`      - landedHelicopters vacío: ${(!toNode.landedHelicopters || toNode.landedHelicopters.length === 0)}`);
                console.log(`      - isAbandoning: ${toNode.isAbandoning}`);
                console.log(`   ⚠️ La base tiene ${toNode.landedHelicopters?.length || 0} helicópteros aterrizados - esperando a que despeguen`);
            }
        }
        
        // Aterrizar
        heli.state = 'landed';
        heli.currentNodeId = toNode.id;
        heli.targetNodeId = null;
        heli.progress = null;
        
        // Agregar al nodo
        if (!toNode.landedHelicopters) {
            toNode.landedHelicopters = [];
        }
        toNode.landedHelicopters.push(heli.id);
        
        console.log(`🚁 Helicóptero ${heli.id} aterrizó en ${toNode.type} ${toNode.id}`);
    }
}
