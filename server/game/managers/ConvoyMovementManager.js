// ===== MANAGER DE MOVIMIENTO DE CONVOYES =====
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';
import { GAME_CONFIG } from '../../config/gameConfig.js';

export class ConvoyMovementManager {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Actualiza todos los convoyes (movimiento y llegadas)
     * @param {number} dt - Delta time en segundos
     */
    update(dt) {
        for (let i = this.gameState.convoys.length - 1; i >= 0; i--) {
            const convoy = this.gameState.convoys[i];
            
            // Calcular velocidad basada en distancia y velocidad del vehículo
            const fromNode = this.gameState.nodes.find(n => n.id === convoy.fromId);
            const toNode = this.gameState.nodes.find(n => n.id === convoy.toId);
            
            if (!fromNode || !toNode) {
                // Nodo no existe, eliminar convoy
                console.warn(`⚠️ Convoy ${convoy.id} tiene nodo inexistente, eliminando`);
                this.gameState.convoys.splice(i, 1);
                continue;
            }
            
            // Usar distancia inicial fija (no recalcular cada frame)
            const distance = convoy.initialDistance || 1; // Fallback a 1 para convoys viejos
            
            if (distance < 1) {
                // Distancia inválida, eliminar convoy
                console.warn(`⚠️ Convoy ${convoy.id} tiene distancia 0, eliminando`);
                this.gameState.convoys.splice(i, 1);
                continue;
            }
            
            // Velocidad del vehículo (píxeles por segundo) - IGUAL para ida y vuelta
            let vehicleSpeed = this.getVehicleSpeed(convoy.vehicleType);
            
            // Penalización por fobSabotage (verificar solo una vez por convoy)
            vehicleSpeed = this.applySabotagePenalty(convoy, fromNode, vehicleSpeed);
            
            // Bonus de EngineerCenter: +50% velocidad
            vehicleSpeed = this.applyEngineerCenterBonus(convoy, vehicleSpeed);
            
            // Progress por segundo = velocidad / distancia (usa distancia fija)
            const progressPerSecond = vehicleSpeed / distance;
            
            // Actualizar progress
            convoy.progress += progressPerSecond * dt;
            
            // Llegó al destino
            if (convoy.progress >= 1) {
                this.handleConvoyArrival(convoy, fromNode, toNode, i);
            }
        }
    }
    
    /**
     * Obtiene la velocidad base del vehículo
     * @param {string} vehicleType - Tipo de vehículo
     * @returns {number} Velocidad en píxeles por segundo
     */
    getVehicleSpeed(vehicleType) {
        // 🆕 SERVIDOR COMO AUTORIDAD: Usar configuración centralizada
        return GAME_CONFIG.convoy.vehicleSpeeds[vehicleType] || GAME_CONFIG.convoy.vehicleSpeeds.truck;
    }
    
    /**
     * Aplica penalización por sabotaje de FOB
     * @param {Object} convoy - Convoy
     * @param {Object} fromNode - Nodo origen
     * @param {number} vehicleSpeed - Velocidad actual
     * @returns {number} Velocidad con penalización aplicada
     */
    applySabotagePenalty(convoy, fromNode, vehicleSpeed) {
        if (!convoy.sabotagePenaltyApplied && fromNode && fromNode.effects) {
            const sabotageEffect = fromNode.effects.find(e => e.type === 'fobSabotage');
            if (sabotageEffect && sabotageEffect.truckCount > 0) {
                // 🆕 SERVIDOR COMO AUTORIDAD: Usar configuración centralizada
                vehicleSpeed *= GAME_CONFIG.convoy.penalties.sabotage;
                convoy.sabotagePenaltyApplied = true; // Marcar como aplicado
                
                // Consumir un camión del contador
                sabotageEffect.truckCount--;
                
                // Eliminar efecto si se agotaron los camiones
                if (sabotageEffect.truckCount <= 0) {
                    fromNode.effects = fromNode.effects.filter(e => e.type !== 'fobSabotage');
                    console.log(`⚡ FOB ${fromNode.id}: efecto sabotaje completado`);
                }
            }
        }
        return vehicleSpeed;
    }
    
    /**
     * Aplica bonus de EngineerCenter
     * @param {Object} convoy - Convoy
     * @param {number} vehicleSpeed - Velocidad actual
     * @returns {number} Velocidad con bonus aplicado
     */
    applyEngineerCenterBonus(convoy, vehicleSpeed) {
        const hasEngineerCenter = this.gameState.nodes.some(n => 
            n.type === 'engineerCenter' && 
            n.team === convoy.team && 
            n.constructed &&
            !n.disabled // 🆕 NUEVO: No aplicar bonus si está disabled
        );
        if (hasEngineerCenter) {
            // 🆕 SERVIDOR COMO AUTORIDAD: Usar configuración centralizada
            const bonusConfig = GAME_CONFIG.convoy.bonuses.engineerCenter;
            if (bonusConfig.affectedVehicles.includes(convoy.vehicleType)) {
                vehicleSpeed *= bonusConfig.speedMultiplier;
            }
        }
        return vehicleSpeed;
    }
    
    /**
     * Maneja la llegada de un convoy a su destino
     * @param {Object} convoy - Convoy que llegó
     * @param {Object} fromNode - Nodo origen
     * @param {Object} toNode - Nodo destino
     * @param {number} convoyIndex - Índice del convoy en el array
     */
    handleConvoyArrival(convoy, fromNode, toNode, convoyIndex) {
        // DEBUG: Log desactivado
        // console.log(`🎯 handleConvoyArrival: convoy=${convoy.id}, cargo=${convoy.cargo}, returning=${convoy.returning}`);
        
        if (!convoy.returning) {
            // === AMBULANCIA: Resolver emergencia ===
            if (convoy.isMedical) {
                this.gameState.medicalSystem.resolveEmergency(convoy.targetFrontId);
                
                // Verificar si es del HQ o del hospital
                if (fromNode && fromNode.type === 'hq') {
                    // HQ: regresar ambulancia
                    console.log(`🚑 Ambulancia ${convoy.id} llegó - Emergencia resuelta en ${convoy.targetFrontId} - Regresando al HQ`);
                    convoy.returning = true;
                    convoy.progress = 0; // RESETEAR progress para el viaje de vuelta
                    return;
                } else if (fromNode && fromNode.type === 'campaignHospital') {
                    // Hospital: consumir ambulancia - NO regresar
                    console.log(`🚑 Ambulancia ${convoy.id} llegó - Emergencia resuelta en ${convoy.targetFrontId} - CONSUMIDA del Hospital`);
                    
                    // Verificar si el hospital se queda sin ambulancias para eliminarlo
                    if (fromNode.availableVehicles <= 0) {
                        console.log(`🏥 Hospital ${fromNode.id} sin ambulancias - ELIMINANDO`);
                        fromNode.active = false; // Marcar para eliminación
                    }
                    
                    // Eliminar convoy (no regresa)
                    this.gameState.convoys.splice(convoyIndex, 1);
                    return;
                }
            }
            
            // === CONVOY NORMAL: Entregar cargo ===
            this.deliverCargo(convoy, toNode);
            
            // Iniciar regreso
            convoy.returning = true;
            convoy.progress = 0; // RESETEAR progress para el viaje de vuelta
            // NO cambiar fromId/toId - el cliente los interpreta según returning=true
        } else {
            // Llegó de vuelta, devolver vehículo/ambulancia
            this.returnVehicle(convoy, fromNode, convoyIndex);
        }
    }
    
    /**
     * Entrega cargo del convoy al nodo destino
     * @param {Object} convoy - Convoy
     * @param {Object} toNode - Nodo destino
     */
    deliverCargo(convoy, toNode) {
        // Entrega normal de suministros (solo camiones tradicionales)
        if (toNode && toNode.hasSupplies && toNode.supplies !== null) {
            const oldSupplies = toNode.supplies;
            toNode.supplies = Math.min(toNode.maxSupplies, toNode.supplies + convoy.cargo);
            console.log(`🚛 Convoy ${convoy.id} entregó ${convoy.cargo} suministros a ${toNode.type} ${toNode.id}: ${oldSupplies} → ${toNode.supplies}/${toNode.maxSupplies}`);
        } else {
            console.log(`⚠️ Convoy ${convoy.id} no pudo entregar cargo a nodo ${convoy.toId}: hasSupplies=${toNode?.hasSupplies}, supplies=${toNode?.supplies}`);
        }
    }
    
    /**
     * Devuelve el vehículo al nodo origen
     * @param {Object} convoy - Convoy
     * @param {Object} fromNode - Nodo origen
     * @param {number} convoyIndex - Índice del convoy en el array
     */
    returnVehicle(convoy, fromNode, convoyIndex) {
        if (convoy.isMedical && fromNode) {
            // === AMBULANCIA: Solo HQ regresa, Hospital se consume ===
            if (fromNode.hasMedicalSystem && fromNode.type === 'hq') {
                // HQ: devolver al sistema médico
                fromNode.ambulanceAvailable = true;
                console.log(`🚑 Ambulancia ${convoy.id} regresó al HQ ${fromNode.team} - Disponible: ${fromNode.ambulanceAvailable}`);
            } else if (fromNode.hasVehicles && fromNode.type === 'campaignHospital') {
                // Hospital de campaña: NO devolver - se consume
                console.log(`🚑 Ambulancia ${convoy.id} CONSUMIDA del Hospital ${fromNode.team} - Vehículos disponibles: ${fromNode.availableVehicles}`);
            } else {
                console.warn(`⚠️ Ambulancia ${convoy.id} intentó regresar pero fromNode no tiene sistema médico/vehículos válido:`, fromNode ? `${fromNode.type} ${fromNode.team} hasMedical=${fromNode.hasMedicalSystem} hasVehicles=${fromNode.hasVehicles}` : 'null');
            }
        } else if (fromNode && fromNode.hasVehicles) {
            // === CONVOY NORMAL: Devolver vehículo ===
            fromNode.availableVehicles = Math.min(fromNode.maxVehicles, fromNode.availableVehicles + 1);
            console.log(`🚛 Vehículo ${convoy.id} regresó al ${fromNode.type} ${fromNode.team} - Vehículos: ${fromNode.availableVehicles}/${fromNode.maxVehicles}`);
        } else {
            console.warn(`⚠️ Convoy ${convoy.id} intentó regresar pero fromNode no válido:`, fromNode ? `${fromNode.type} hasVehicles=${fromNode.hasVehicles}` : 'null');
        }
        
        // Eliminar convoy
        this.gameState.convoys.splice(convoyIndex, 1);
    }
}
