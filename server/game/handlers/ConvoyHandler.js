// ===== HANDLER DE CONVOYES Y AMBULANCIAS =====
import { v4 as uuidv4 } from 'uuid';
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

export class ConvoyHandler {
    constructor(gameState) {
        this.gameState = gameState;
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
        
        // Validar vehículos disponibles
        if (!fromNode.hasVehicles || fromNode.availableVehicles <= 0) {
            return { success: false, reason: 'No hay vehículos disponibles' };
        }
        
        // Validar suministros (mínimo 10)
        if (fromNode.hasSupplies && fromNode.supplies < 10) {
            return { success: false, reason: 'Suministros insuficientes' };
        }
        
        // Tomar vehículo
        fromNode.availableVehicles--;
        
        // Determinar tipo de vehículo
        const vehicleType = fromNode.type === 'hq' ? 'heavy_truck' : 'truck';
        
        // Capacidad base
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
        
        // Tomar cargo
        const cargo = fromNode.hasSupplies && fromNode.supplies !== null 
            ? Math.min(capacity, fromNode.supplies) 
            : capacity;
        
        if (fromNode.supplies !== null) {
            fromNode.supplies -= cargo;
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
            cargo,
            progress: 0, // 0 a 1
            returning: false,
            initialDistance: distance // Guardar distancia fija
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

