// ===== MANAGER DE EMERGENCIAS MÉDICAS DE IA =====
// Gestiona el envío de ambulancias para resolver emergencias médicas

import AIConfig from '../config/AIConfig.js';

export class AIMedicalManager {
    constructor(gameState, io, roomId) {
        this.gameState = gameState;
        this.io = io;
        this.roomId = roomId;
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
        const myEmergencyFronts = this.findEmergencyFronts(team);
        
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
                    }
                } else {
                    if (AIConfig.debug.logActions) {
                    }
                }
            } catch (error) {
                if (AIConfig.debug.logActions) {
                }
            }
        }
    }
    
    /**
     * Encuentra frentes con emergencias médicas activas
     */
    findEmergencyFronts(team) {
        const medicalSystem = this.gameState.medicalSystem;
        if (!medicalSystem || !medicalSystem.activeEmergencies) {
            return [];
        }
        
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
        
        return myEmergencyFronts;
    }
}

