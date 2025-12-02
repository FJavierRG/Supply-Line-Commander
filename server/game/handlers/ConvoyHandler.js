// ===== HANDLER DE CONVOYES Y AMBULANCIAS =====
import { v4 as uuidv4 } from 'uuid';
import { GAME_CONFIG } from '../../config/gameConfig.js';
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

export class ConvoyHandler {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    // ===== FUNCIONES CENTRALIZADAS MODULARES =====
    
    /**
     * Obtiene rutas válidas para un tipo de nodo
     * ✅ SIMPLIFICADO: Ya no hay rutas especiales por raza
     * @param {string} fromType - Tipo de nodo origen
     * @returns {Array} Array de tipos de nodos válidos
     */
    getValidRoutesForRace(fromType) {
        return GAME_CONFIG.routes.valid[fromType] || [];
    }
    
    /**
     * Selecciona el tipo de vehículo según el nodo origen
     * ✅ SIMPLIFICADO: Ya no hay sistema aéreo por raza
     * @param {Object} fromNode - Nodo origen
     * @returns {string} Tipo de vehículo
     */
    selectVehicleTypeForRace(fromNode) {
        // ✅ SIMPLIFICADO: Sistema tradicional siempre
        return fromNode.type === 'hq' ? 'heavy_truck' : 'truck';
    }
    
    
    /**
     * Maneja solicitud de convoy
     */
    handleConvoy(playerTeam, fromId, toId) {
        const fromNode = this.gameState.nodes.find(n => n.id === fromId);
        const toNode = this.gameState.nodes.find(n => n.id === toId);
        
        if (!fromNode || !toNode) {
            return { success: false, reason: 'Nodos no encontrados' };
        }
        
        // 🆕 NUEVO: Detectar si es un camión de reparación
        const isRepairVehicle = fromNode.type === 'hq' && fromNode.selectedResourceType === 'repair';
        
        // 🆕 MODULARIZADO: Validar que el nodo origen sea usable
        if (!this.gameState.raceManager.isNodeUsable(fromNode)) {
            return { success: false, reason: 'Nodo origen deshabilitado o roto' };
        }
        
        // Validar que ambos sean del mismo equipo
        if (fromNode.team !== playerTeam || toNode.team !== playerTeam) {
            return { success: false, reason: 'No puedes enviar a nodos enemigos' };
        }
        
        // 🆕 NUEVO: Detectar si es un helicóptero (sistema aéreo)
        if (fromNode.landedHelicopters && fromNode.landedHelicopters.length > 0) {
            // Es un helicóptero - usar nuevo sistema
            return this.handleHelicopterDispatch(playerTeam, fromNode, toNode);
        }
        
        // 🆕 NUEVO: Detectar si es un camión de reparación
        if (isRepairVehicle) {
            // 🆕 NUEVO: Validar destino - debe ser un edificio roto (no FOB/HQ)
            if (!toNode.broken) {
                return { success: false, reason: 'El camión de reparación solo puede ir a edificios rotos' };
            }
            
            // Validar que no sea FOB ni HQ (solo edificios construibles)
            if (toNode.type === 'fob' || toNode.type === 'hq' || toNode.type === 'front') {
                return { success: false, reason: 'No se puede reparar FOBs, HQs ni Frentes' };
            }
            // Validar que el HQ tenga vehículo de reparación disponible
            if (!fromNode.hasRepairSystem || !fromNode.repairVehicleAvailable || fromNode.availableRepairVehicles <= 0) {
                return { success: false, reason: 'No hay camiones de reparación disponibles' };
            }
            
            // Tomar vehículo de reparación
            fromNode.availableRepairVehicles--;
            fromNode.repairVehicleAvailable = fromNode.availableRepairVehicles > 0;
            
            // Calcular distancia inicial (fija) para velocidad consistente
            const dx = toNode.x - fromNode.x;
            const dy = toNode.y - fromNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Crear convoy de reparación
            const convoy = {
                id: `convoy_${uuidv4().substring(0, 8)}`,
                fromId,
                toId,
                team: playerTeam,
                vehicleType: 'repair_truck',
                cargo: 0, // Camiones de reparación no llevan suministros
                progress: 0,
                returning: false,
                isRepair: true, // 🆕 Flag para identificar convoy de reparación
                initialDistance: distance
            };
            
            this.gameState.convoys.push(convoy);
            
            // SONIDOS: Truck sound
            if (fromNode.type === 'hq') {
                this.gameState.addSoundEvent('hq_dispatch', { team: playerTeam });
            }
            this.gameState.addSoundEvent('truck_dispatch', { team: playerTeam });
            
            console.log(`🔧 Camión de reparación creado: ${fromId} → ${toId}`);
            
            return { success: true, convoy };
        }
        
        // 🆕 MODULARIZADO: Validar destino - permitir edificios rotos solo si es camión de reparación
        // (Ya pasamos la validación de reparación, así que aquí rechazamos rotos)
        if (!this.gameState.raceManager.isNodeUsable(toNode)) {
            return { success: false, reason: 'Nodo destino deshabilitado o roto' };
        }
        
        // ✅ Validar rutas estándar (solo para convoyes normales, no reparación)
        const validRoutes = this.getValidRoutesForRace(fromNode.type, null);
        if (!validRoutes.includes(toNode.type)) {
            return { success: false, reason: 'Ruta no válida para tu raza' };
        }
        
        // Sistema tradicional de camiones
        const vehicleType = this.selectVehicleTypeForRace(fromNode);
        
        // ✅ ELIMINADO: Ya no hay sistema de cargo por raza, siempre tradicional
        // Sistema tradicional: siempre requiere suministros si el nodo los tiene
        
        // Validar vehículos disponibles
        if (!fromNode.hasVehicles || fromNode.availableVehicles <= 0) {
            return { success: false, reason: 'No hay vehículos disponibles' };
        }
        
        // Sistema tradicional: Carga normal
        let capacity = GAME_CONFIG.vehicles[vehicleType].capacity;
        
        // Bonus de TruckFactory (solo para heavy_truck, solo si no están disabled)
        if (vehicleType === 'heavy_truck') {
            const truckFactories = this.gameState.nodes.filter(n => 
                n.type === 'truckFactory' && 
                n.team === playerTeam && 
                this.gameState.raceManager.canNodeProvideBonus(n) // 🆕 MODULARIZADO: Usar función helper
            ).length;
            
            if (truckFactories > 0) {
                // ✅ Usar configuración de serverNodes (fuente única de verdad)
                const bonusPerFactory = SERVER_NODE_CONFIG.effects.truckFactory.capacityBonus;
                capacity += truckFactories * bonusPerFactory;
            }
        }
        
        // 🆕 REWORK: Validar que el nodo tenga suficientes suministros para la capacidad completa
        // Los camiones deben cargar su capacidad completa, no pueden llevar menos
        if (fromNode.hasSupplies) {
            if (fromNode.supplies < capacity) {
                return { success: false, reason: `Suministros insuficientes. Necesitas ${capacity} suministros (tienes ${fromNode.supplies})` };
            }
        } else {
            // Nodos sin suministros: validación mínima (comportamiento legacy)
            if (fromNode.supplies !== null && fromNode.supplies < 10) {
                return { success: false, reason: 'Suministros insuficientes' };
            }
        }
        
        // Tomar vehículo
        fromNode.availableVehicles--;
        
        // 🆕 REWORK: Los camiones cargan exactamente su capacidad completa (valor plano)
        // Si el nodo tiene suministros, consumir exactamente la capacidad
        let suppliesToTransport = capacity;
        if (fromNode.hasSupplies) {
            fromNode.supplies -= suppliesToTransport;
        }
        
        // Calcular distancia inicial (fija) para velocidad consistente
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 🆕 NUEVO: Aplicar costo de despliegue de disciplinas (si hay alguna activa)
        const disciplineModifiers = this.gameState.disciplineManager.getModifiersForSystem(playerTeam, 'convoy');
        if (disciplineModifiers.deploymentCost && disciplineModifiers.deploymentCost > 0) {
            const deploymentCost = disciplineModifiers.deploymentCost;
            const deploymentSpendCheck = this.gameState.canSpendCurrency(playerTeam, deploymentCost);
            if (!deploymentSpendCheck.canSpend) {
                return { success: false, reason: deploymentSpendCheck.reason || 'Currency insuficiente para desplegar vehículo' };
            }
            
            const deploymentSpendResult = this.gameState.spendCurrency(playerTeam, deploymentCost, 'vehicle_deployment_discipline');
            if (!deploymentSpendResult.success) {
                return { success: false, reason: deploymentSpendResult.reason || 'Currency insuficiente para desplegar vehículo' };
            }
            
            // Log silenciado para optimización de rendimiento
            // console.log(`💰 Costo de despliegue: ${deploymentCost}`);
        }
        
        // ✅ CRÍTICO: Aplicar sabotaje cuando el camión SALE (no cuando regresa)
        // Consumir contador de sabotaje si el FOB está saboteado
        let sabotagePenaltyApplied = false;
        if (fromNode.type === 'fob' && fromNode.effects) {
            const sabotageEffect = fromNode.effects.find(e => e.type === 'fobSabotage');
            if (sabotageEffect && sabotageEffect.truckCount > 0) {
                // Marcar este convoy como afectado por sabotaje
                sabotagePenaltyApplied = true;
                
                // Consumir un camión del contador (cuando SALE, no cuando regresa)
                sabotageEffect.truckCount--;
                
                console.log(`🐌 Convoy desde FOB ${fromId} afectado por sabotaje - quedan ${sabotageEffect.truckCount} camiones por afectar`);
                
                // Eliminar efecto si se agotaron los camiones
                if (sabotageEffect.truckCount <= 0) {
                    fromNode.effects = fromNode.effects.filter(e => e.type !== 'fobSabotage');
                    console.log(`✅ Efecto de sabotaje eliminado del FOB ${fromId} - todos los camiones afectados`);
                }
            }
        }
        
        // Crear convoy
        const convoy = {
            id: `convoy_${uuidv4().substring(0, 8)}`,
            fromId,
            toId,
            team: playerTeam,
            vehicleType,
            cargo: suppliesToTransport,
            progress: 0, // 0 a 1
            returning: false,
            initialDistance: distance, // Guardar distancia fija
            sabotagePenaltyApplied: sabotagePenaltyApplied // ✅ Flag para aplicar penalización durante todo el viaje
        };
        
        // 🆕 NUEVO: Verificar si el convoy sale de un FOB con vehicleWorkshop en su área
        if (fromNode.type === 'fob' && vehicleType === 'truck') {
            const workshopBonus = this.checkVehicleWorkshopBonus(fromNode, playerTeam);
            if (workshopBonus) {
                convoy.hasVehicleWorkshopBonus = true;
            }
        }
        
        this.gameState.convoys.push(convoy);
        
        // 🆕 NUEVO: Trackear camiones enviados por tipo
        if (this.gameState.trucksDispatched && this.gameState.trucksDispatched[playerTeam]) {
            const truckStats = this.gameState.trucksDispatched[playerTeam];
            truckStats.total++;
            if (vehicleType === 'heavy_truck') {
                truckStats.heavy++;
            } else if (vehicleType === 'truck') {
                truckStats.light++;
            }
        }
        
        // SONIDOS: Truck sound (si es desde HQ) o dispatch sound
        if (fromNode.type === 'hq') {
            this.gameState.addSoundEvent('hq_dispatch', { team: playerTeam }); // HQ sound con cooldown 3s
        }
        this.gameState.addSoundEvent('truck_dispatch', { team: playerTeam }); // Truck sound con cooldown 2s
        
        return { success: true, convoy };
    }
    
    /**
     * 🆕 NUEVO: Verifica si un FOB tiene vehicleWorkshop en su área
     * @param {Object} fobNode - Nodo FOB
     * @param {string} team - Equipo del FOB
     * @returns {boolean} true si tiene vehicleWorkshop en su área
     */
    checkVehicleWorkshopBonus(fobNode, team) {
        // Obtener radio de construcción del FOB
        const fobBuildRadius = this.getBuildRadius('fob');
        
        // Buscar vehicleWorkshops del mismo equipo en el área del FOB
        const hasWorkshopInArea = this.gameState.nodes.some(n => 
            n.type === 'vehicleWorkshop' && 
            n.team === team && 
            n.active &&
            n.constructed &&
            !n.isAbandoning &&
            Math.hypot(fobNode.x - n.x, fobNode.y - n.y) <= fobBuildRadius
        );
        
        return hasWorkshopInArea;
    }
    
    /**
     * Helper: Obtiene el radio de construcción de un edificio
     * @param {string} buildingType - Tipo de edificio
     * @returns {number} Radio de construcción en píxeles
     */
    getBuildRadius(buildingType) {
        const buildRadii = SERVER_NODE_CONFIG.buildRadius || {};
        if (buildRadii[buildingType]) {
            return buildRadii[buildingType];
        }
        
        // Fallback: radius * 2.5
        const radius = SERVER_NODE_CONFIG.radius?.[buildingType] || 30;
        return radius * 2.5;
    }
    
    /**
     * 🆕 NUEVO: Maneja el despegue de un helicóptero
     * @param {string} playerTeam - Equipo del jugador
     * @param {Object} fromNode - Nodo de origen
     * @param {Object} toNode - Nodo de destino
     * @returns {Object} Resultado del despegue
     */
    handleHelicopterDispatch(playerTeam, fromNode, toNode) {
        const heliConfig = GAME_CONFIG.vehicles.helicopter;
        
        // Buscar helicóptero en el nodo
        const heliId = fromNode.landedHelicopters[0];
        const heli = this.gameState.helicopters.find(h => h.id === heliId);
        
        if (!heli) {
            return { success: false, reason: 'No se encontró el helicóptero' };
        }
        
        // 🆕 CAMBIO: Ya NO cargamos al despegar - la carga se hace al aterrizar en HQ
        // Validar Base Aérea - solo acepta helicópteros no llenos
        const isAerialBase = toNode.type === 'aerialBase' || toNode.isAerialBase;
        if (isAerialBase && heli.cargo >= heliConfig.baseCapacity) {
            return { success: false, reason: 'El helicóptero ya está lleno - no necesita recargar' };
        }
        
        // Validar cargo según destino
        if (toNode.type === 'front' && heli.cargo < heliConfig.deliveryAmount) {
            return { success: false, reason: `Sin suficientes suministros (necesita ${heliConfig.deliveryAmount}, tiene ${heli.cargo})` };
        }
        
        if (toNode.type === 'hq' && heli.cargo > 0) {
            return { success: false, reason: 'El helicóptero aún tiene suministros - no necesita recargar' };
        }
        
        // CRÍTICO: Actualizar currentNodeId ANTES de cambiar el estado a 'flying'
        // Esto evita que el cliente renderice el helicóptero en el destino antes de empezar a moverse
        // (igual que con convoyes: fromId y toId se establecen antes de crear el convoy)
        heli.currentNodeId = fromNode.id; // Mantener origen hasta que llegue al destino
        
        // Cambiar estado a volando
        heli.state = 'flying';
        heli.targetNodeId = toNode.id;
        heli.progress = 0;
        
        // Calcular distancia (usar currentNodeId como origen)
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        heli.initialDistance = Math.sqrt(dx * dx + dy * dy);
        
        // Remover del nodo origen (DESPUÉS de establecer currentNodeId)
        fromNode.landedHelicopters = fromNode.landedHelicopters.filter(id => id !== heliId);
        
        console.log(`🚁 Helicóptero ${heli.id} despegó de ${fromNode.type} ${fromNode.id} hacia ${toNode.type} ${toNode.id} (cargo actual: ${heli.cargo})`);
        
        // Sonidos
        if (fromNode.type === 'hq') {
            this.gameState.addSoundEvent('hq_dispatch', { team: playerTeam });
        }
        this.gameState.addSoundEvent('chopper', { team: playerTeam });
        
        return { success: true, helicopter: heli };
    }
    
    /**
     * Maneja solicitud de ambulancia (emergencia médica)
     */
    handleAmbulance(playerTeam, fromId, toId) {
        const fromNode = this.gameState.nodes.find(n => n.id === fromId);
        const toNode = this.gameState.nodes.find(n => n.id === toId);
        
        if (!fromNode || !toNode) {
            return { success: false, reason: 'Nodos no encontrados' };
        }
        
        // 🆕 MODULARIZADO: Validar que el nodo origen sea usable
        if (!this.gameState.raceManager.isNodeUsable(fromNode)) {
            return { success: false, reason: 'Origen deshabilitado' };
        }
        
        // Validar origen (HQ o Campaign Hospital)
        const validOrigin = fromNode.type === 'hq' || fromNode.type === 'campaignHospital';
        if (!validOrigin) {
            return { success: false, reason: 'Origen inválido para ambulancia' };
        }
        
        // Validar destino (debe ser frente con emergencia)
        if (toNode.type !== 'front') {
            return { success: false, reason: 'Destino debe ser un frente' };
        }
        
        // Validar que el frente tenga emergencia activa
        const hasEmergency = this.gameState.medicalSystem.activeEmergencies.has(toNode.id);
        if (!hasEmergency) {
            return { success: false, reason: 'Frente no tiene emergencia activa' };
        }
        
        // Validar que el origen sea del mismo equipo
        if (fromNode.team !== playerTeam) {
            return { success: false, reason: 'No puedes usar nodos enemigos' };
        }
        
        // Validar rango si es campaignHospital
        if (fromNode.type === 'campaignHospital') {
            const dx = toNode.x - fromNode.x;
            const dy = toNode.y - fromNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const hospitalRange = SERVER_NODE_CONFIG.ranges.campaignHospital;
            
            if (distance > hospitalRange) {
                console.log(`⚠️ Hospital fuera de rango: ${distance.toFixed(0)}px > ${hospitalRange}px`);
                return { success: false, reason: 'Frente fuera del rango del hospital' };
            }
            
            console.log(`🏥 Hospital en rango: ${distance.toFixed(0)}px <= ${hospitalRange}px`);
        }
        
        // Validar y tomar ambulancia del sistema médico
        if (fromNode.type === 'hq') {
            // Validar que el HQ tenga ambulancia disponible
            if (!fromNode.hasMedicalSystem || !fromNode.ambulanceAvailable) {
                return { success: false, reason: 'No hay ambulancias disponibles en el HQ' };
            }
            // Marcar ambulancia como no disponible
            fromNode.ambulanceAvailable = false;
            console.log(`🚑 Ambulancia tomada del HQ ${fromNode.team} - Disponible: ${fromNode.ambulanceAvailable}`);
        } else if (fromNode.type === 'campaignHospital') {
            // Para hospitales de campaña, usar sistema de vehículos
            if (!fromNode.hasVehicles || fromNode.availableVehicles <= 0) {
                return { success: false, reason: 'No hay vehículos disponibles en el hospital' };
            }
            fromNode.availableVehicles--;
            console.log(`🚑 Ambulancia tomada del Hospital ${fromNode.team} - Vehículos disponibles: ${fromNode.availableVehicles}`);
        }
        
        // Calcular distancia inicial (fija) para velocidad consistente
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Crear convoy de ambulancia
        const convoy = {
            id: `convoy_${uuidv4().substring(0, 8)}`,
            fromId,
            toId,
            team: playerTeam,
            vehicleType: 'ambulance',
            cargo: 0, // Ambulancias no llevan suministros
            progress: 0,
            returning: false,
            isMedical: true,
            targetFrontId: toId,
            initialDistance: distance // Guardar distancia fija
        };
        
        this.gameState.convoys.push(convoy);
        
        // SONIDOS: Ambulancia (similar a convoy)
        if (fromNode.type === 'hq') {
            this.gameState.addSoundEvent('hq_dispatch', { team: playerTeam }); // HQ sound con cooldown 3s
        }
        this.gameState.addSoundEvent('truck_dispatch', { team: playerTeam }); // Truck sound para ambulancia
        
        console.log(`🚑 Ambulancia creada: ${fromId} → ${toId} (emergencia en ${toId})`);
        
        return { success: true, convoy };
    }
}

