// ===== TRACKER DE OPTIMIZACIÓN =====
export class OptimizationTracker {
    constructor(gameState) {
        this.gameState = gameState;
        this.lastSentState = null;
        this.lastNodeStates = new Map(); // Trackear estado anterior de cada nodo
        this.lastConvoyStates = new Map(); // Trackear estado anterior de cada convoy
    }
    
    /**
     * Limpia tracking maps de nodos eliminados
     */
    cleanupNodeTracking() {
        const activeNodeIds = new Set(this.gameState.nodes.map(n => n.id));
        // Limpiar tracking de nodos que ya no existen
        for (const nodeId of this.lastNodeStates.keys()) {
            if (!activeNodeIds.has(nodeId)) {
                this.lastNodeStates.delete(nodeId);
            }
        }
    }
    
    /**
     * Limpia tracking maps de convoyes eliminados
     */
    cleanupConvoyTracking() {
        const activeConvoyIds = new Set(this.gameState.convoys.map(c => c.id));
        // Limpiar tracking de convoyes que ya no existen
        for (const convoyId of this.lastConvoyStates.keys()) {
            if (!activeConvoyIds.has(convoyId)) {
                this.lastConvoyStates.delete(convoyId);
            }
        }
    }
    
    /**
     * Verifica si hay cambios significativos desde el último envío
     */
    hasSignificantChanges(currentState) {
        // Si es el primer envío, siempre enviar
        if (!this.lastSentState) {
            return true;
        }
        
        // Verificar cambios en currency (solo si hay diferencia ≥ $5)
        const currencyChange = Math.abs(currentState.currency.player1 - this.lastSentState.currency.player1) +
                             Math.abs(currentState.currency.player2 - this.lastSentState.currency.player2);
        if (currencyChange >= 5) {
            return true;
        }
        
        // Verificar cambios en número de nodos
        if (currentState.nodes.length !== this.lastSentState.nodes.length) {
            return true;
        }
        
        // Verificar cambios en convoyes
        if (currentState.convoys.length !== this.lastSentState.convoys.length) {
            return true;
        }
        
        // Verificar cambios en drones
        if (currentState.drones.length !== this.lastSentState.drones.length) {
            return true;
        }
        
        // Verificar cambios en emergencias
        if (currentState.emergencies.length !== this.lastSentState.emergencies.length) {
            return true;
        }
        
        // Verificar eventos de sonido
        if (currentState.soundEvents.length > 0) {
            return true;
        }
        
        // Verificar cambios específicos en nodos (construction, supplies significativos)
        for (let i = 0; i < currentState.nodes.length; i++) {
            const currentNode = currentState.nodes[i];
            const lastNode = this.lastSentState.nodes[i];
            
            if (!lastNode) continue; // Nuevo nodo
            
            // Cambios críticos que SIEMPRE requieren actualización
            if (currentNode.constructed !== lastNode.constructed ||
                currentNode.isConstructing !== lastNode.isConstructing ||
                currentNode.active !== lastNode.active) {
                return true;
            }
            
            // Cambios significativos en supplies (≥5 unidades)
            if (currentNode.supplies !== null && lastNode.supplies !== null) {
                const supplyDiff = Math.abs(currentNode.supplies - lastNode.supplies);
                if (supplyDiff >= 5) {
                    return true;
                }
            }
            
            // Cambios en posición (crítico para frentes)
            if (currentNode.x !== lastNode.x || currentNode.y !== lastNode.y) {
                return true;
            }
        }
        
        // Verificar cambios en convoyes (progress significativo)
        for (let i = 0; i < currentState.convoys.length; i++) {
            const currentConvoy = currentState.convoys[i];
            const lastConvoy = this.lastSentState.convoys[i];
            
            if (!lastConvoy) continue;
            
            // Cambios significativos en progress (≥0.1)
            if (Math.abs(currentConvoy.progress - lastConvoy.progress) >= 0.1) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Actualiza el estado enviado para tracking
     */
    updateLastSentState(state) {
        this.lastSentState = state;
    }
    
    /**
     * Obtiene el estado anterior enviado
     */
    getLastSentState() {
        return this.lastSentState;
    }
}
