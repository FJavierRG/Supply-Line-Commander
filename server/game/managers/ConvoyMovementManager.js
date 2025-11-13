// ===== MANAGER DE MOVIMIENTO DE CONVOYES =====
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';
import { GAME_CONFIG } from '../../config/gameConfig.js';
import { TruckAssaultSystem } from '../../systems/TruckAssaultSystem.js';

export class ConvoyMovementManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.truckAssaultSystem = new TruckAssaultSystem(gameState);
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
            
            // 🆕 NUEVO: Si el nodo origen o destino está destruido (inactivo), eliminar convoy
            // Esto evita que los camiones se queden atascados cuando un FOB es destruido
            if (fromNode.active === false || toNode.active === false) {
                console.warn(`⚠️ Convoy ${convoy.id} tiene nodo destruido (fromId: ${convoy.fromId}, toId: ${convoy.toId}), eliminando`);
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
            
            // Penalización por fobSabotage (aplicar tanto en ida como en vuelta)
            // La penalización se aplica siempre que el convoy tenga el flag sabotagePenaltyApplied
            // Esto asegura que el efecto se aplique tanto al ir como al volver
            vehicleSpeed = this.applySabotagePenalty(convoy, fromNode, vehicleSpeed);
            
            // 🆕 NUEVO: Penalización por truck assault enemigo (25% de ralentización)
            vehicleSpeed = this.applyTruckAssaultPenalty(convoy, vehicleSpeed);
            
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
     * La penalización se aplica tanto en la ida como en la vuelta
     * @param {Object} convoy - Convoy
     * @param {Object} fromNode - Nodo origen
     * @param {number} vehicleSpeed - Velocidad actual
     * @returns {number} Velocidad con penalización aplicada
     */
    applySabotagePenalty(convoy, fromNode, vehicleSpeed) {
        // Si el convoy ya tiene la penalización aplicada (flag), aplicar la velocidad reducida
        // Esto asegura que se aplique tanto al ir como al volver
        if (convoy.sabotagePenaltyApplied) {
            // 🆕 SERVIDOR COMO AUTORIDAD: Usar configuración centralizada
            vehicleSpeed *= GAME_CONFIG.convoy.penalties.sabotage;
            return vehicleSpeed;
        }
        
        // Si aún no se ha aplicado, verificar si el nodo origen tiene el efecto de sabotaje
        if (fromNode && fromNode.effects) {
            const sabotageEffect = fromNode.effects.find(e => e.type === 'fobSabotage');
            if (sabotageEffect && sabotageEffect.truckCount > 0) {
                // 🆕 SERVIDOR COMO AUTORIDAD: Usar configuración centralizada
                vehicleSpeed *= GAME_CONFIG.convoy.penalties.sabotage;
                
                // Marcar como aplicado para que se mantenga en el viaje de vuelta
                convoy.sabotagePenaltyApplied = true;
                
                // Consumir un camión del contador (solo una vez cuando se crea el convoy)
                sabotageEffect.truckCount--;
                
                // Eliminar efecto si se agotaron los camiones
                if (sabotageEffect.truckCount <= 0) {
                    fromNode.effects = fromNode.effects.filter(e => e.type !== 'fobSabotage');
                }
                
                console.log(`🐌 Convoy ${convoy.id} afectado por sabotaje FOB ${fromNode.id} - velocidad reducida a 50% (ida y vuelta)`);
            }
        }
        return vehicleSpeed;
    }
    
    /**
     * 🆕 NUEVO: Aplica penalización por truck assault enemigo
     * Ralentiza vehículos enemigos que pasan por el área de efecto del truck assault
     * @param {Object} convoy - Convoy
     * @param {number} vehicleSpeed - Velocidad actual
     * @returns {number} Velocidad con penalización aplicada
     */
    applyTruckAssaultPenalty(convoy, vehicleSpeed) {
        // Verificar si el convoy está dentro del área de efecto de algún truck assault enemigo
        const affectingAssault = this.truckAssaultSystem.getAffectingTruckAssault(convoy);
        
        if (affectingAssault) {
            // Aplicar penalización de velocidad (25% de reducción = multiplicador 0.75)
            const speedPenalty = SERVER_NODE_CONFIG.gameplay?.truckAssault?.speedPenalty || 0.75;
            vehicleSpeed *= speedPenalty;
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
            // ✅ SERVIDOR COMO AUTORIDAD: Usar configuración de serverNodes (fuente única de verdad)
            const bonusConfig = SERVER_NODE_CONFIG.effects.engineerCenter;
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
                    convoy.returning = true;
                    convoy.progress = 0; // RESETEAR progress para el viaje de vuelta
                    return;
                } else if (fromNode && fromNode.type === 'campaignHospital') {
                    // Hospital: consumir ambulancia - NO regresar
                    
                    // Verificar si el hospital se queda sin ambulancias para eliminarlo
                    if (fromNode.availableVehicles <= 0) {
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
            } else if (fromNode.hasVehicles && fromNode.type === 'campaignHospital') {
                // Hospital de campaña: NO devolver - se consume
            } else {
                console.warn(`⚠️ Ambulancia ${convoy.id} intentó regresar pero fromNode no tiene sistema médico/vehículos válido:`, fromNode ? `${fromNode.type} ${fromNode.team} hasMedical=${fromNode.hasMedicalSystem} hasVehicles=${fromNode.hasVehicles}` : 'null');
            }
        } else if (fromNode && fromNode.hasVehicles) {
            // === CONVOY NORMAL: Devolver vehículo ===
            fromNode.availableVehicles = Math.min(fromNode.maxVehicles, fromNode.availableVehicles + 1);
        } else {
            console.warn(`⚠️ Convoy ${convoy.id} intentó regresar pero fromNode no válido:`, fromNode ? `${fromNode.type} hasVehicles=${fromNode.hasVehicles}` : 'null');
        }
        
        // Eliminar convoy
        this.gameState.convoys.splice(convoyIndex, 1);
    }
}
