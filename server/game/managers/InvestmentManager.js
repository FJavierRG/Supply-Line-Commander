// ===== MANAGER DE INVERSIONES =====
export class InvestmentManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.raceManager = gameState.raceManager; // 🆕 MODULARIZADO: Acceso al RaceManager
    }
    
    /**
     * Actualiza el sistema de inversión (intelRadio)
     * @param {number} dt - Delta time en segundos
     */
    update(dt) {
        for (const node of this.gameState.nodes) {
            if (node.type === 'intelRadio' && 
                node.investmentStarted && 
                !node.investmentCompleted &&
                this.raceManager.isNodeFunctional(node)) { // 🆕 MODULARIZADO: Usar función helper (ya verifica constructed)
                node.investmentTimer = (node.investmentTimer || 0) + dt;
                
                if (node.investmentTimer >= node.investmentTime) {
                    // Marcar como completado ANTES de hacer el pago para evitar múltiples pagos
                    node.investmentCompleted = true;
                    
                    // Pagar inversión al jugador
                    if (node.team && this.gameState.currency[node.team] !== undefined) {
                        this.gameState.currency[node.team] += node.investmentReturn;
                        console.log(`💰 intelRadio ${node.id} pagó ${node.investmentReturn}$ a ${node.team} (inversión completada)`);
                    }
                    
                    // 🆕 FIX: NO iniciar abandono aquí - dejar que AbandonmentSystem lo maneje
                    // El AbandonmentSystem.checkAbandonmentConditions() detectará investmentCompleted = true
                    // y llamará startAbandonment() correctamente con los tiempos configurados
                }
            }
        }
    }
}
