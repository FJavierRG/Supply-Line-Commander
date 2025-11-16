// ===== MANAGER DE REPARACIONES DE IA =====
// Gestiona el envío de vehículos mecánicos para reparar edificios rotos

import AIConfig from '../config/AIConfig.js';

export class AIRepairManager {
    constructor(gameState, io, roomId) {
        this.gameState = gameState;
        this.io = io;
        this.roomId = roomId;
    }
    
    /**
     * Maneja reparaciones de edificios rotos
     * Revisa si hay edificios rotos y envía vehículos mecánicos desde el HQ
     */
    handleRepairs(team, currency) {
        // Buscar edificios rotos del equipo
        const brokenBuildings = this.findBrokenBuildings(team);
        
        if (brokenBuildings.length === 0) {
            return; // No hay edificios rotos
        }
        
        // Obtener HQ con sistema de reparación
        const myNodes = this.gameState.nodes.filter(n => n.team === team && n.active);
        const hq = myNodes.find(n => n.type === 'hq');
        
        if (!hq || !hq.hasRepairSystem || !hq.repairVehicleAvailable || hq.availableRepairVehicles <= 0) {
            if (AIConfig.debug.logActions && brokenBuildings.length > 0) {
            }
            return;
        }
        
        // Enviar vehículo de reparación al edificio roto más prioritario
        const target = brokenBuildings[0];
        const success = this.sendRepairVehicle(hq, target, team);
        
        if (success && AIConfig.debug.logActions) {
        }
    }
    
    /**
     * Encuentra edificios rotos del equipo
     * Retorna lista ordenada por prioridad (edificios más importantes primero)
     */
    findBrokenBuildings(team) {
        const myNodes = this.gameState.nodes.filter(n => n.team === team && n.active);
        
        // Filtrar solo edificios rotos que sean reparables (no FOBs, HQs ni frentes)
        const brokenBuildings = myNodes.filter(n => 
            n.broken === true &&
            n.type !== 'fob' &&
            n.type !== 'hq' &&
            n.type !== 'front' &&
            n.constructed === true
        );
        
        // Ordenar por prioridad (edificios más importantes primero)
        // Prioridad: plantas nucleares > lanzaderas > otros edificios
        brokenBuildings.sort((a, b) => {
            const priorityA = this.getBuildingPriority(a.type);
            const priorityB = this.getBuildingPriority(b.type);
            return priorityB - priorityA; // Mayor prioridad primero
        });
        
        return brokenBuildings;
    }
    
    /**
     * Obtiene la prioridad de un edificio para reparación
     * Mayor número = mayor prioridad
     */
    getBuildingPriority(buildingType) {
        const priorities = {
            // Economía y defensa crítica primero
            'nuclearPlant': 100,      // Máxima prioridad: economía principal
            'droneLauncher': 90,      // Muy alta: habilita drones ofensivos
            'aerialBase': 85,         // Muy alta: logística aérea
            'antiDrone': 80,          // Alta: defensa frente a presión aérea
            'intelRadio': 75,         // Alta: economía/visión
            'campaignHospital': 70,   // Alta: soporte médico
            'truckFactory': 65,       // Media-alta: logística terrestre
            'engineerCenter': 60,     // Media-alta: mejora logística
            // Otros edificios: prioridad baja por defecto
        };
        
        return priorities[buildingType] || 10;
    }
    
    /**
     * Envía un vehículo de reparación desde el HQ a un edificio roto
     */
    sendRepairVehicle(hq, target, team) {
        // Verificar que el HQ tenga vehículos de reparación disponibles
        if (!hq.hasRepairSystem || !hq.repairVehicleAvailable || hq.availableRepairVehicles <= 0) {
            if (AIConfig.debug.logActions) {
            }
            return false;
        }
        
        // Verificar que el objetivo esté roto
        if (!target.broken) {
            if (AIConfig.debug.logActions) {
            }
            return false;
        }
        
        // 🎯 SIMULAR EVENTO DE JUGADOR REAL: Usar mismo handler que jugadores
        // Para enviar un vehículo de reparación, necesitamos establecer selectedResourceType en 'repair'
        // y luego usar handleConvoy
        try {
            // Guardar el tipo de recurso seleccionado original
            const originalResourceType = hq.selectedResourceType;
            
            // Establecer tipo de recurso a 'repair' para que el handler lo detecte
            hq.selectedResourceType = 'repair';
            
            // Llamar al handler de convoyes (detectará automáticamente que es reparación)
            const result = this.gameState.handleConvoy(team, hq.id, target.id);
            
            // Restaurar el tipo de recurso original
            hq.selectedResourceType = originalResourceType;
            
            if (result.success) {
                // 🎯 BROADCAST como si fuera un jugador real
                this.io.to(this.roomId).emit('convoy_spawned', {
                    convoyId: result.convoy.id,
                    fromId: hq.id,
                    toId: target.id,
                    team: team,
                    vehicleType: result.convoy.vehicleType,
                    cargo: result.convoy.cargo
                });
                
                if (AIConfig.debug.logActions) {
                }
                return true;
            } else {
                if (AIConfig.debug.logActions) {
                }
                return false;
            }
        } catch (error) {
            console.error(`❌ Error enviando vehículo de reparación de IA:`, error);
            return false;
        }
    }
}

