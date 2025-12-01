// ===== MANAGER DE MOVIMIENTO DE CONVOYES =====
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';
import { GAME_CONFIG } from '../../config/gameConfig.js';
import { TruckAssaultSystem } from '../systems/TruckAssaultSystem.js';

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
            
            // ✅ FIX CRÍTICO: Si el origen no existe, siempre devolver vehículo y eliminar
            if (!fromNode) {
                console.warn(`⚠️ Convoy ${convoy.id} tiene nodo origen inexistente (fromId: ${convoy.fromId}), devolviendo vehículo y eliminando`);
                // No podemos devolver el vehículo si el origen no existe
                this.gameState.convoys.splice(i, 1);
                continue;
            }
            
            // ✅ FIX CRÍTICO: Manejo especial para heavy_trucks cuando el destino desaparece
            // Si es un heavy_truck del HQ y el destino desapareció, hacer que regrese inmediatamente
            if (!toNode) {
                const isHeavyTruckFromHQ = convoy.vehicleType === 'heavy_truck' && fromNode.type === 'hq';
                // Destino no existe
                if (isHeavyTruckFromHQ) {
                    // Heavy_truck del HQ con destino desaparecido: regresar inmediatamente al HQ
                    console.warn(`⚠️ Heavy_truck ${convoy.id} tiene destino desaparecido (FOB ${convoy.toId} eliminado), regresando inmediatamente al HQ`);
                    
                    // Si ya está regresando, puede continuar normalmente (está viajando hacia el HQ)
                    if (convoy.returning) {
                        // Continuar el regreso normalmente, el convoy está viajando hacia fromNode (HQ)
                        // No necesitamos toNode para regresar
                    } else {
                        // Si no está regresando, iniciar el regreso inmediatamente
                        convoy.returning = true;
                        convoy.progress = 0; // Resetear progress para el viaje de vuelta
                    }
                    // Continuar el loop para que el convoy regrese normalmente (sin toNode)
                    // Necesitamos usar la distancia inicial guardada para calcular el regreso
                } else {
                    // Para trucks normales u otros vehículos con destino desaparecido
                    console.warn(`⚠️ Convoy ${convoy.id} tiene destino inexistente (toId: ${convoy.toId}), devolviendo vehículo y eliminando`);
                    this.returnVehicleToOrigin(convoy, fromNode);
                    this.gameState.convoys.splice(i, 1);
                    continue;
                }
            }
            
            // 🆕 CORREGIDO: Manejo diferenciado según tipo de vehículo y nodo origen
            // - Camiones pesados del HQ (heavy_truck): continúan aunque el FOB destino esté destruido
            // - Camiones ligeros del FOB (truck): se eliminan si el FOB origen está destruido
            // - Si el HQ está destruido, eliminar todos los convoyes (no debería pasar)
            const isHeavyTruckFromHQ = convoy.vehicleType === 'heavy_truck' && fromNode.type === 'hq';
            const isOriginDestroyed = fromNode.active === false;
            // ✅ FIX: Solo verificar isDestinationDestroyed si toNode existe
            const isDestinationDestroyed = toNode ? toNode.active === false : false;
            
            if (isOriginDestroyed) {
                // ✅ FIX: Si el origen está destruido, devolver vehículo antes de eliminar convoy
                // (incluye HQ destruido, aunque no debería pasar)
                console.warn(`⚠️ Convoy ${convoy.id} tiene nodo origen destruido (fromId: ${convoy.fromId}, type: ${fromNode.type}), devolviendo vehículo y eliminando`);
                
                // Intentar devolver el vehículo (aunque el nodo esté destruido, puede que aún exista en el array)
                this.returnVehicleToOrigin(convoy, fromNode);
                
                this.gameState.convoys.splice(i, 1);
                continue;
            }
            
            if (isDestinationDestroyed) {
                // Si el destino está destruido:
                if (isHeavyTruckFromHQ) {
                    // Camiones pesados del HQ: permitir que continúen y regresen al HQ
                    // No eliminar, el convoy llegará al destino destruido y regresará
                    // (se maneja en handleConvoyArrival)
                } else {
                    // ✅ FIX: Camiones ligeros del FOB u otros: devolver vehículo antes de eliminar si el destino está destruido
                    console.warn(`⚠️ Convoy ${convoy.id} tiene nodo destino destruido (toId: ${convoy.toId}, type: ${toNode.type}), devolviendo vehículo y eliminando`);
                    
                    // Devolver el vehículo al nodo origen
                    this.returnVehicleToOrigin(convoy, fromNode);
                    
                    this.gameState.convoys.splice(i, 1);
                    continue;
                }
            }
            
            // ✅ FIX: Cuando toNode es null (heavy_truck regresando), usar fromNode como destino
            // Cuando está regresando, el destino es el nodo origen (HQ)
            const actualToNode = (convoy.returning && !toNode) ? fromNode : toNode;
            
            // Usar distancia inicial fija (no recalcular cada frame)
            let distance = convoy.initialDistance || 1; // Fallback a 1 para convoys viejos
            
            // ✅ FIX: Si estamos regresando sin toNode (FOB desapareció), calcular distancia restante al HQ
            if (convoy.returning && !toNode && fromNode && distance >= 1) {
                // El convoy estaba viajando al FOB que desapareció
                // Si tenía progress p (ej: 0.5 = 50% del camino), la distancia restante al HQ es aproximadamente
                // distance * (1 - progress_original). Pero como resetamos progress a 0, usamos la distancia completa
                // como aproximación (el convoy regresa desde donde estaba, que podría ser cerca del FOB desaparecido)
                // Usar la distancia inicial completa es una buena aproximación
                distance = convoy.initialDistance || distance;
            } else if ((distance < 1 || !distance) && convoy.returning && !toNode && fromNode) {
                // Si no hay distancia inicial guardada, calcular distancia estimada al HQ
                distance = 100; // Fallback razonable
            }
            
            if (distance < 1) {
                // ✅ FIX: Distancia inválida, devolver vehículo antes de eliminar convoy
                console.warn(`⚠️ Convoy ${convoy.id} tiene distancia inválida (${distance}), devolviendo vehículo y eliminando`);
                
                // Devolver el vehículo al nodo origen
                this.returnVehicleToOrigin(convoy, fromNode);
                
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
            
            // 🆕 NUEVO: Bonus de VehicleWorkshop: +20 px/s para camiones ligeros (truck)
            vehicleSpeed = this.applyVehicleWorkshopBonus(convoy, vehicleSpeed);
            
            // 🆕 NUEVO: Modificadores de disciplinas activas
            vehicleSpeed = this.applyDisciplineModifiers(convoy, vehicleSpeed);
            
            // Progress por segundo = velocidad / distancia (usa distancia fija)
            const progressPerSecond = vehicleSpeed / distance;
            
            // Actualizar progress
            convoy.progress += progressPerSecond * dt;
            
            // Llegó al destino
            if (convoy.progress >= 1) {
                // ✅ FIX: Si está regresando sin toNode, el destino es fromNode (HQ)
                this.handleConvoyArrival(convoy, fromNode, actualToNode || fromNode, i);
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
     * ✅ CORREGIDO: El contador se consume cuando el camión SALE (en ConvoyHandler), no aquí
     * @param {Object} convoy - Convoy
     * @param {Object} fromNode - Nodo origen
     * @param {number} vehicleSpeed - Velocidad actual
     * @returns {number} Velocidad con penalización aplicada
     */
    applySabotagePenalty(convoy, fromNode, vehicleSpeed) {
        // ✅ CORREGIDO: Solo aplicar si el convoy tiene el flag (se establece cuando SALE)
        if (convoy.sabotagePenaltyApplied) {
            // ✅ SERVIDOR COMO AUTORIDAD: Obtener speedPenalty del efecto del FOB (fuente única de verdad)
            // Si el efecto ya fue eliminado, usar configuración por defecto
            let speedPenalty = SERVER_NODE_CONFIG.gameplay.fobSabotage.speedPenalty;
            
            if (fromNode && fromNode.effects) {
                const sabotageEffect = fromNode.effects.find(e => e.type === 'fobSabotage');
                if (sabotageEffect && sabotageEffect.speedPenalty) {
                    // Usar el speedPenalty del efecto (puede variar si se modifica la configuración)
                    speedPenalty = sabotageEffect.speedPenalty;
                }
            }
            
            vehicleSpeed *= speedPenalty;
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
            this.gameState.raceManager.canNodeProvideBonus(n) // 🆕 MODULARIZADO: Usar función helper
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
     * 🆕 NUEVO: Aplica bonus de VehicleWorkshop
     * Aumenta la velocidad de los camiones ligeros (truck) en +20 px/s si el convoy tiene el bonus
     * @param {Object} convoy - Convoy
     * @param {number} vehicleSpeed - Velocidad actual
     * @returns {number} Velocidad con bonus aplicado
     */
    applyVehicleWorkshopBonus(convoy, vehicleSpeed) {
        // Solo aplicar si el convoy tiene el flag de vehicleWorkshopBonus
        if (convoy.hasVehicleWorkshopBonus) {
            // ✅ SERVIDOR COMO AUTORIDAD: Usar configuración de serverNodes (fuente única de verdad)
            const bonusConfig = SERVER_NODE_CONFIG.effects.vehicleWorkshop;
            if (bonusConfig.affectedVehicles.includes(convoy.vehicleType)) {
                vehicleSpeed += bonusConfig.speedBonus;
            }
        }
        return vehicleSpeed;
    }
    
    /**
     * 🆕 NUEVO: Aplica modificadores de disciplinas activas
     * @param {Object} convoy - Convoy
     * @param {number} vehicleSpeed - Velocidad actual
     * @returns {number} Velocidad con modificadores de disciplina aplicados
     */
    applyDisciplineModifiers(convoy, vehicleSpeed) {
        // Obtener modificadores de la disciplina activa del jugador
        const modifiers = this.gameState.disciplineManager.getModifiersForSystem(convoy.team, 'convoy');
        
        // 🆕 NUEVO: Aplicar multiplicadores específicos por tipo de vehículo
        if (modifiers.speedMultipliers) {
            const vehicleType = convoy.vehicleType; // 'truck', 'heavy_truck', 'train', etc.
            const multiplier = modifiers.speedMultipliers[vehicleType] || modifiers.speedMultipliers.default || 1.0;
            vehicleSpeed *= multiplier;
        }
        
        // deploymentCost se maneja en ConvoyHandler.handleConvoy(), no aquí
        
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
            // === CAMIÓN DE REPARACIÓN: Reparar edificio ===
            if (convoy.isRepair) {
                // 🆕 NUEVO: Reparar el edificio roto
                if (toNode && toNode.broken) {
                    toNode.broken = false;
                    toNode.disabled = false; // También restaurar si estaba disabled
                    console.log(`🔧 Edificio ${toNode.type} ${toNode.id} reparado por camión de reparación ${convoy.id}`);
                    
                    // Regresar el camión al HQ (similar a ambulancia del HQ)
                    convoy.returning = true;
                    convoy.progress = 0; // RESETEAR progress para el viaje de vuelta
                    return;
                } else {
                    console.warn(`⚠️ Camión de reparación ${convoy.id} llegó a un edificio que no está roto: ${toNode?.type} ${toNode?.id}`);
                    // ✅ FIX: Devolver vehículo antes de eliminar convoy si el edificio ya no está roto
                    this.returnVehicleToOrigin(convoy, fromNode);
                    this.gameState.convoys.splice(convoyIndex, 1);
                    return;
                }
            }
            
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
            // 🆕 CORREGIDO: Si el destino está destruido (solo puede pasar con heavy_truck del HQ),
            // no entregar cargo y regresar directamente al HQ
            if (toNode.active === false) {
                // Destino destruido: regresar al HQ sin entregar
                console.log(`⚠️ Convoy ${convoy.id} (heavy_truck) llegó a FOB destruido ${toNode.id}, regresando al HQ sin entregar`);
                convoy.returning = true;
                convoy.progress = 0; // RESETEAR progress para el viaje de vuelta
                return;
            }
            
            this.deliverCargo(convoy, toNode);
            
            // Iniciar regreso
            convoy.returning = true;
            convoy.progress = 0; // RESETEAR progress para el viaje de vuelta
            // NO cambiar fromId/toId - el cliente los interpreta según returning=true
        } else {
            // Llegó de vuelta, devolver vehículo/ambulancia
            // Cuando returning=true, el convoy está viajando de vuelta al nodo origen original
            // fromNode = nodo con ID convoy.fromId (origen original: HQ/FOB)
            // toNode = nodo con ID convoy.toId (destino original: front/edificio)
            // El convoy regresa al nodo origen original (fromNode), así que fromNode es correcto
            console.log(`🔄 Convoy ${convoy.id} regresando: fromNode=${fromNode?.type} ${fromNode?.id}, toNode=${toNode?.type} ${toNode?.id}, returning=${convoy.returning}`);
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
     * ✅ FIX: Devuelve un vehículo al nodo origen sin eliminar el convoy
     * Útil cuando se necesita devolver un vehículo antes de eliminar el convoy por condiciones excepcionales
     * @param {Object} convoy - Convoy
     * @param {Object} fromNode - Nodo origen (puede ser null si no existe)
     * @returns {boolean} true si se devolvió el vehículo, false si no se pudo
     */
    returnVehicleToOrigin(convoy, fromNode) {
        if (!fromNode) {
            return false;
        }

        // === CAMIÓN DE REPARACIÓN: Devolver al HQ ===
        if (convoy.isRepair) {
            if (fromNode.hasRepairSystem && fromNode.type === 'hq') {
                fromNode.availableRepairVehicles = Math.min(fromNode.maxRepairVehicles, fromNode.availableRepairVehicles + 1);
                fromNode.repairVehicleAvailable = fromNode.availableRepairVehicles > 0;
                console.log(`✅ Camión de reparación ${convoy.id} devuelto al HQ - Disponibles: ${fromNode.availableRepairVehicles}/${fromNode.maxRepairVehicles}`);
                return true;
            }
            return false;
        }

        // === AMBULANCIA: Solo HQ regresa, Hospital se consume ===
        if (convoy.isMedical) {
            if (fromNode.hasMedicalSystem && fromNode.type === 'hq') {
                fromNode.ambulanceAvailable = true;
                console.log(`✅ Ambulancia ${convoy.id} devuelta al HQ`);
                return true;
            }
            // Hospital de campaña: NO devolver - se consume (comportamiento intencional)
            return false;
        }

        // === CONVOY NORMAL: Devolver vehículo ===
        if (fromNode.hasVehicles) {
            fromNode.availableVehicles = Math.min(fromNode.maxVehicles, fromNode.availableVehicles + 1);
            console.log(`✅ Vehículo ${convoy.vehicleType} ${convoy.id} devuelto a ${fromNode.type} ${fromNode.id} - Disponibles: ${fromNode.availableVehicles}/${fromNode.maxVehicles}`);
            return true;
        }

        return false;
    }

    /**
     * Devuelve el vehículo al nodo origen
     * @param {Object} convoy - Convoy
     * @param {Object} fromNode - Nodo origen
     * @param {number} convoyIndex - Índice del convoy en el array
     */
    returnVehicle(convoy, fromNode, convoyIndex) {
        // === CAMIÓN DE REPARACIÓN: Devolver al HQ ===
        if (convoy.isRepair && fromNode) {
            if (fromNode.hasRepairSystem && fromNode.type === 'hq') {
                // HQ: devolver camión de reparación
                fromNode.availableRepairVehicles = Math.min(fromNode.maxRepairVehicles, fromNode.availableRepairVehicles + 1);
                fromNode.repairVehicleAvailable = fromNode.availableRepairVehicles > 0;
                console.log(`🔧 Camión de reparación ${convoy.id} regresó al HQ - Disponibles: ${fromNode.availableRepairVehicles}/${fromNode.maxRepairVehicles}`);
            } else {
                console.warn(`⚠️ Camión de reparación ${convoy.id} intentó regresar pero fromNode no tiene sistema de reparación válido:`, fromNode ? `${fromNode.type} hasRepairSystem=${fromNode.hasRepairSystem}` : 'null');
            }
        } else if (convoy.isMedical && fromNode) {
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
