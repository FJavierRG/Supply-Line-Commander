// ===== SISTEMA DE TALLER DE VEHÍCULOS =====
// Maneja el efecto de aumentar vehículos de FOBs en el área del taller

import { SERVER_NODE_CONFIG } from '../config/serverNodes.js';

/**
 * Helper: Obtiene el radio de construcción de un edificio con fallback
 * Prioridad: buildRadius → (radius * 2.5)
 * @param {string} buildingType - Tipo de edificio
 * @returns {number} Radio de construcción en píxeles
 */
function getBuildRadius(buildingType) {
    const buildRadii = SERVER_NODE_CONFIG.buildRadius || {};
    if (buildRadii[buildingType]) {
        return buildRadii[buildingType];
    }
    
    // Fallback: radius * 2.5
    const radius = SERVER_NODE_CONFIG.radius?.[buildingType] || 30;
    return radius * 2.5;
}

export class VehicleWorkshopSystem {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Actualiza el sistema de talleres de vehículos
     * Aplica +1 vehículo máximo y disponible a FOBs en el área de cada taller
     * 🆕 NUEVO: Destruye talleres que no tienen FOBs en su área
     * @param {number} dt - Delta time en segundos
     */
    update(dt) {
        // Encontrar todos los talleres de vehículos activos
        const vehicleWorkshops = this.gameState.nodes.filter(n => 
            n.type === 'vehicleWorkshop' && 
            n.active && 
            n.constructed &&
            !n.isAbandoning
        );
        
        if (vehicleWorkshops.length === 0) {
            // Si no hay talleres, resetear todos los FOBs a sus valores base
            this.resetFOBVehicles();
            return;
        }
        
        // Obtener configuración del efecto
        const vehicleBonus = SERVER_NODE_CONFIG.effects?.vehicleWorkshop?.vehicleBonus || 1;
        const fobBuildRadius = getBuildRadius('fob'); // Radio de construcción del FOB (140px)
        
        // NOTA: La destrucción de talleres sin FOBs se maneja en WorkshopSystem
        
        // Para cada equipo, recalcular vehículos de FOBs
        const teams = ['player1', 'player2'];
        
        for (const team of teams) {
            // Obtener FOBs del equipo
            const fobs = this.gameState.nodes.filter(n => 
                n.type === 'fob' && 
                n.team === team && 
                n.active &&
                n.constructed &&
                !n.isAbandoning &&
                n.hasVehicles
            );
            
            // Para cada FOB, contar talleres de vehículos en su área
            for (const fob of fobs) {
                let workshopsInArea = 0;
                
                // Contar talleres del mismo equipo en el área del FOB
                for (const workshop of vehicleWorkshops) {
                    if (workshop.team !== team) continue;
                    
                    const dist = Math.hypot(fob.x - workshop.x, fob.y - workshop.y);
                    if (dist <= fobBuildRadius) {
                        workshopsInArea++;
                    }
                }
                
                // Calcular nuevos valores de vehículos
                const baseVehicles = SERVER_NODE_CONFIG.capacities.fob.maxVehicles || 2;
                const newMaxVehicles = baseVehicles + (workshopsInArea * vehicleBonus);
                
                // Solo actualizar si cambió (evitar spam de logs)
                if (fob.maxVehicles !== newMaxVehicles) {
                    const oldMax = fob.maxVehicles || baseVehicles;
                    const oldAvailable = fob.availableVehicles || 0;
                    
                    // Actualizar máximo
                    fob.maxVehicles = newMaxVehicles;
                    
                    // Actualizar disponibles: mantener la diferencia si ya tenía vehículos disponibles
                    // Si tenía menos disponibles que el máximo anterior, mantener la misma diferencia
                    const oldDifference = oldMax - oldAvailable;
                    const newAvailable = Math.max(0, newMaxVehicles - oldDifference);
                    
                    // Asegurar que availableVehicles no exceda maxVehicles
                    fob.availableVehicles = Math.min(newAvailable, newMaxVehicles);
                    
                    // Si el nuevo máximo es mayor, dar el bonus adicional inmediatamente
                    if (newMaxVehicles > oldMax) {
                        const bonus = newMaxVehicles - oldMax;
                        fob.availableVehicles = Math.min(fob.availableVehicles + bonus, newMaxVehicles);
                    }
                    
                    console.log(`🔧 Vehicle Workshop afectando FOB ${fob.id} (${team}): ${oldMax}→${newMaxVehicles} máx, ${oldAvailable}→${fob.availableVehicles} disp (${workshopsInArea} talleres en área)`);
                }
            }
        }
    }
    
    /**
     * Resetea los vehículos de todos los FOBs a sus valores base
     */
    resetFOBVehicles() {
        const baseVehicles = SERVER_NODE_CONFIG.capacities.fob.maxVehicles || 2;
        
        for (const node of this.gameState.nodes) {
            if (node.type === 'fob' && node.hasVehicles) {
                if (node.maxVehicles !== baseVehicles) {
                    const oldMax = node.maxVehicles || baseVehicles;
                    const oldAvailable = node.availableVehicles || 0;
                    
                    node.maxVehicles = baseVehicles;
                    
                    // Ajustar disponibles proporcionalmente
                    if (oldMax > 0) {
                        const ratio = oldAvailable / oldMax;
                        node.availableVehicles = Math.floor(baseVehicles * ratio);
                    } else {
                        node.availableVehicles = baseVehicles;
                    }
                }
            }
        }
    }
    
}

