// ===== MANAGER DE SUMINISTROS =====
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

export class SupplyManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.lastSupplyLog = {}; // Para debug de consumo
    }
    
    /**
     * Actualiza el consumo de supplies en frentes usando configuración del servidor
     * @param {number} dt - Delta time en segundos
     */
    update(dt) {
        for (const node of this.gameState.nodes) {
            if (node.type === 'front' && node.hasSupplies) {
                // Usar configuración del servidor para el consumo
                const consumeRate = SERVER_NODE_CONFIG.gameplay.front.consumeRate;
                const beforeSupplies = node.supplies;
                node.supplies = Math.max(0, node.supplies - consumeRate * dt);
                
                // DEBUG: Log consumo cada 3 segundos (comentado para limpiar consola)
                // if (!this.lastSupplyLog[node.id] || Date.now() - this.lastSupplyLog[node.id] > 3000) {
                //     const consumed = beforeSupplies - node.supplies;
                //     console.log(`⛽ ${node.team} frente: ${node.supplies.toFixed(1)} supplies (consumió ${consumed.toFixed(2)} en ${dt.toFixed(2)}s @ ${consumeRate}x/s)`);
                //     this.lastSupplyLog[node.id] = Date.now();
                // }
            }
        }
    }
}
