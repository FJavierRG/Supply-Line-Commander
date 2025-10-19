// ===== SISTEMA DE CONSTRUCCIÓN (SERVIDOR) =====

export class ConstructionSystem {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Actualiza el progreso de construcción de edificios
     * @param {number} dt - Delta time en segundos
     */
    updateConstructions(dt) {
        for (const node of this.gameState.nodes) {
            if (node.isConstructing && !node.constructed) {
                node.constructionTimer = (node.constructionTimer || 0) + dt;
                
                // Verificar si terminó la construcción
                if (node.constructionTimer >= node.constructionTime) {
                    node.isConstructing = false;
                    node.constructed = true;
                    console.log(`✅ Construcción completada: ${node.type} ${node.id}`);
                    
                    // Aplicar efectos inmediatos al completar construcción
                    this.gameState.applyBuildingEffects(node);
                }
            }
        }
    }
}

