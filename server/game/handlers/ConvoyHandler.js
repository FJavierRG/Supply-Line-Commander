// ===== HANDLER DE CONVOYES Y AMBULANCIAS =====
import { v4 as uuidv4 } from 'uuid';
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';
import { getRaceConfig, getRaceTransportSystem, canRaceUseFOBs } from '../../../src/config/races.js';
import { VALID_ROUTES, RACE_SPECIAL_ROUTES } from '../../../src/config/constants.js';

export class ConvoyHandler {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    // ===== FUNCIONES CENTRALIZADAS MODULARES =====
    
    /**
     * Obtiene la configuración de raza del jugador
     * @param {string} playerTeam - Equipo del jugador
     * @returns {Object|null} Configuración de la raza
     */
    getPlayerRaceConfig(playerTeam) {
        const raceId = this.gameState.playerRaces[playerTeam];
        return getRaceConfig(raceId);
    }
    
    /**
     * Obtiene rutas válidas para una raza específica
     * @param {string} fromType - Tipo de nodo origen
     * @param {Object} raceConfig - Configuración de la raza
     * @returns {Array} Array de tipos de nodos válidos
     */
    getValidRoutesForRace(fromType, raceConfig) {
        if (!raceConfig) return VALID_ROUTES[fromType] || [];
        
        // Si la raza tiene rutas especiales (aerial), usarlas
        if (raceConfig.specialMechanics?.transportSystem === 'aerial') {
            return RACE_SPECIAL_ROUTES[raceConfig.id]?.[fromType] || VALID_ROUTES[fromType] || [];
        }
        
        // Si no, usar rutas normales
        return VALID_ROUTES[fromType] || [];
    }
    
    /**
     * Selecciona el tipo de vehículo según la raza
     * @param {Object} fromNode - Nodo origen
     * @param {Object} raceConfig - Configuración de la raza
     * @returns {string} Tipo de vehículo
     */
    selectVehicleTypeForRace(fromNode, raceConfig) {
        if (!raceConfig) {
            // Fallback al sistema tradicional
            return fromNode.type === 'hq' ? 'heavy_truck' : 'truck';
        }
        
        // Si es HQ y la raza tiene transporte aéreo
        if (fromNode.type === 'hq' && raceConfig.specialMechanics?.transportSystem === 'aerial') {
            return 'helicopter';
        }
        
        // Si es Front y la raza tiene transporte aéreo
        if (fromNode.type === 'front' && raceConfig.specialMechanics?.transportSystem === 'aerial') {
            return 'helicopter';
        }
        
        // Sistema tradicional
        return fromNode.type === 'hq' ? 'heavy_truck' : 'truck';
    }
    
    /**
     * Obtiene el sistema de cargo según la raza
     * @param {Object} raceConfig - Configuración de la raza
     * @returns {Object} Configuración del sistema de cargo
     */
    getCargoSystemForRace(raceConfig) {
        if (!raceConfig) {
            return { type: 'traditional', requiresSupplies: true };
        }
        
        if (raceConfig.specialMechanics?.transportSystem === 'aerial') {
            return { 
                type: 'aerial', 
                requiresSupplies: false
            };
        }
        
        return { type: 'traditional', requiresSupplies: true };
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
        
        // Validar que ambos sean del mismo equipo
        if (fromNode.team !== playerTeam || toNode.team !== playerTeam) {
            return { success: false, reason: 'No puedes enviar a nodos enemigos' };
        }
        
        // 🆕 CENTRALIZADO: Obtener configuración de raza
        const raceConfig = this.getPlayerRaceConfig(playerTeam);
        
        // 🆕 CENTRALIZADO: Validar rutas según la raza
        const validRoutes = this.getValidRoutesForRace(fromNode.type, raceConfig);
        if (!validRoutes.includes(toNode.type)) {
            return { success: false, reason: 'Ruta no válida para tu raza' };
        }
        
        // 🆕 NUEVO: Detectar si es un helicóptero (sistema aéreo)
        if (fromNode.landedHelicopters && fromNode.landedHelicopters.length > 0) {
            // Es un helicóptero - usar nuevo sistema
            return this.handleHelicopterDispatch(playerTeam, fromNode, toNode);
        }
        
        // Sistema tradicional de camiones
        const vehicleType = this.selectVehicleTypeForRace(fromNode, raceConfig);
        
        // 🆕 CENTRALIZADO: Obtener sistema de cargo según la raza
        const cargoSystem = this.getCargoSystemForRace(raceConfig);
        
        // Validar vehículos disponibles
        if (!fromNode.hasVehicles || fromNode.availableVehicles <= 0) {
            return { success: false, reason: 'No hay vehículos disponibles' };
        }
        
        // 🆕 CENTRALIZADO: Validar suministros según el sistema de cargo
        if (cargoSystem.requiresSupplies && fromNode.hasSupplies && fromNode.supplies < 10) {
            return { success: false, reason: 'Suministros insuficientes' };
        }
        
        // Tomar vehículo
        fromNode.availableVehicles--;
        
        // 🆕 CENTRALIZADO: Calcular suministros según el sistema de cargo
        let suppliesToTransport = 0;
        
        if (cargoSystem.type === 'aerial') {
            // Sistema aéreo: Solo carga cuando sale del HQ
            if (fromNode.type === 'hq') {
                const capacity = SERVER_NODE_CONFIG.vehicles[vehicleType].baseCapacity;
                suppliesToTransport = Math.min(capacity, fromNode.supplies);
                fromNode.supplies -= suppliesToTransport;
            }
            // Si sale de un Front, no transporta suministros
        } else {
            // Sistema tradicional: Carga normal
            let capacity = SERVER_NODE_CONFIG.vehicles[vehicleType].baseCapacity;
            
            // Bonus de TruckFactory (solo para heavy_truck)
            if (vehicleType === 'heavy_truck') {
                const truckFactories = this.gameState.nodes.filter(n => 
                    n.type === 'truckFactory' && n.team === playerTeam && n.constructed
                ).length;
                
                if (truckFactories > 0) {
                    const bonusPerFactory = SERVER_NODE_CONFIG.effects.truckFactory.capacityBonus;
                    capacity += truckFactories * bonusPerFactory;
                    console.log(`🚚 Heavy truck con ${truckFactories} fábrica(s): capacidad = ${capacity}`);
                }
            }
            
            suppliesToTransport = Math.min(capacity, fromNode.supplies);
            
            // Quitar suministros del nodo origen
            if (fromNode.hasSupplies) {
                fromNode.supplies -= suppliesToTransport;
            }
        }
        
        // Calcular distancia inicial (fija) para velocidad consistente
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
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
            // 🆕 CENTRALIZADO: Agregar información del sistema de cargo
            cargoSystem: cargoSystem
        };
        
        this.gameState.convoys.push(convoy);
        
        // SONIDOS: Truck sound (si es desde HQ) o dispatch sound
        if (fromNode.type === 'hq') {
            this.gameState.addSoundEvent('hq_dispatch', { team: playerTeam }); // HQ sound con cooldown 3s
        }
        this.gameState.addSoundEvent('truck_dispatch', { team: playerTeam }); // Truck sound con cooldown 2s
        
        return { success: true, convoy };
    }
    
    /**
     * 🆕 NUEVO: Maneja el despegue de un helicóptero
     * @param {string} playerTeam - Equipo del jugador
     * @param {Object} fromNode - Nodo de origen
     * @param {Object} toNode - Nodo de destino
     * @returns {Object} Resultado del despegue
     */
    handleHelicopterDispatch(playerTeam, fromNode, toNode) {
        const heliConfig = SERVER_NODE_CONFIG.vehicles.helicopter;
        
        // Buscar helicóptero en el nodo
        const heliId = fromNode.landedHelicopters[0];
        const heli = this.gameState.helicopters.find(h => h.id === heliId);
        
        if (!heli) {
            return { success: false, reason: 'No se encontró el helicóptero' };
        }
        
        // Cargar suministros si sale del HQ (ANTES de validar cargo)
        if (fromNode.type === 'hq') {
            // HQ tiene suministros infinitos (supplies = null)
            heli.cargo = heliConfig.baseCapacity;
            console.log(`🚁 Helicóptero ${heli.id} cargó ${heli.cargo} suministros del HQ (infinitos)`);
        }
        
        // 🆕 NUEVO: Validar Base Aérea - solo acepta helicópteros no llenos
        const isAerialBase = toNode.type === 'aerialBase' || toNode.isAerialBase;
        if (isAerialBase && heli.cargo >= heliConfig.baseCapacity) {
            return { success: false, reason: 'El helicóptero ya está lleno - no necesita recargar' };
        }
        
        // Validar cargo según destino (DESPUÉS de cargar)
        if (toNode.type === 'front' && heli.cargo < heliConfig.deliveryAmount) {
            return { success: false, reason: `Sin suficientes suministros (necesita ${heliConfig.deliveryAmount}, tiene ${heli.cargo})` };
        }
        
        if (toNode.type === 'hq' && heli.cargo > 0) {
            return { success: false, reason: 'El helicóptero aún tiene suministros - no necesita recargar' };
        }
        
        // Cambiar estado a volando
        heli.state = 'flying';
        heli.targetNodeId = toNode.id;
        heli.progress = 0;
        
        // Calcular distancia
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        heli.initialDistance = Math.sqrt(dx * dx + dy * dy);
        
        // Remover del nodo origen
        fromNode.landedHelicopters = fromNode.landedHelicopters.filter(id => id !== heliId);
        
        console.log(`🚁 Helicóptero ${heli.id} despegó de ${fromNode.type} ${fromNode.id} hacia ${toNode.type} ${toNode.id} (cargo: ${heli.cargo})`);
        
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

