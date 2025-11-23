// ===== MANAGER DE SUMINISTROS =====
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

export class SupplyManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.lastSupplyLog = {}; // Para debug de consumo
    }
    
    /**
     * Actualiza el consumo de supplies en frentes usando configuración del servidor
     * 🆕 FIX: Ahora usa node.consumeRate para respetar efectos temporales (wounded, etc.)
     * @param {number} dt - Delta time en segundos
     */
    update(dt) {
        // === CONSUMO DE SUPPLIES EN FRENTES ===
        for (const node of this.gameState.nodes) {
            if (node.type === 'front' && node.hasSupplies) {
                // 🆕 FIX: Usar consumeRate del nodo (puede estar modificado por efectos como wounded)
                // Si no está definido, usar el valor por defecto de la configuración
                const consumeRate = node.consumeRate || SERVER_NODE_CONFIG.gameplay.front.consumeRate;
                const beforeSupplies = node.supplies;
                node.supplies = Math.max(0, node.supplies - consumeRate * dt);
                
            }
        }
        
        // === REGENERACIÓN PASIVA DE SUPPLIES EN HQ ===
        // 🆕 REWORK: El HQ regenera suministros de forma pasiva
        for (const node of this.gameState.nodes) {
            if (node.type === 'hq' && node.hasSupplies && node.supplyRegenerationRate) {
                // El HQ es inmune a estados alterados, no necesita verificar disabled/broken
                // Solo verificar que esté activo
                if (node.active) {
                    const regenAmount = node.supplyRegenerationRate * dt;
                    node.supplies = Math.min(node.maxSupplies, node.supplies + regenAmount);
                }
            }
        }
        
        // === GENERACIÓN DE SUMINISTROS POR FÁBRICAS ===
        // ✅ REMOVIDO: La generación de suministros ahora se maneja en FactorySupplySystem
        // Las fábricas crean envíos reales que viajan al HQ (similar a trenes)
    }
}
