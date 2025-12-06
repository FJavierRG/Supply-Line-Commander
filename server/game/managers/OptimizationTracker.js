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
        
        // 🔧 FIX CRÍTICO: SIEMPRE enviar si gameTime cambió (≥0.1s)
        // Esto asegura que el cliente reciba updates regulares para animaciones e interpolación
        if (Math.abs(currentState.gameTime - this.lastSentState.gameTime) >= 0.1) {
            return true;
        }
        
        // Verificar cambios en currency (solo si hay diferencia ≥ $5)
        const currencyChange = Math.abs(currentState.currency.player1 - this.lastSentState.currency.player1) +
                             Math.abs(currentState.currency.player2 - this.lastSentState.currency.player2);
        if (currencyChange >= 5) {
            return true;
        }
        
        // Verificar cambios en número de entidades
        if (currentState.nodes.length !== this.lastSentState.nodes.length ||
            currentState.convoys.length !== this.lastSentState.convoys.length ||
            currentState.trains?.length !== this.lastSentState.trains?.length ||
            currentState.helicopters?.length !== this.lastSentState.helicopters?.length ||
            currentState.factorySupplyDeliveries?.length !== this.lastSentState.factorySupplyDeliveries?.length ||
            currentState.drones.length !== this.lastSentState.drones.length ||
            currentState.emergencies.length !== this.lastSentState.emergencies.length) {
            return true;
        }
        
        // Verificar eventos de sonido o visuales
        if (currentState.soundEvents.length > 0 || currentState.visualEvents?.length > 0) {
            return true;
        }
        
        // Verificar cambios específicos en nodos (construction, supplies, posición)
        const lastNodesById = new Map(this.lastSentState.nodes.map(n => [n.id, n]));
        for (const currentNode of currentState.nodes) {
            const lastNode = lastNodesById.get(currentNode.id);
            if (!lastNode) continue; // Nuevo nodo
            
            // Cambios críticos que SIEMPRE requieren actualización
            if (currentNode.constructed !== lastNode.constructed ||
                currentNode.isConstructing !== lastNode.isConstructing ||
                currentNode.active !== lastNode.active ||
                currentNode.frontMode !== lastNode.frontMode) {
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
            if (Math.abs(currentNode.x - lastNode.x) >= 0.5 || 
                Math.abs(currentNode.y - lastNode.y) >= 0.5) {
                return true;
            }
        }
        
        // 🔧 FIX: Verificar cambios en vehículos móviles POR ID (no por índice)
        // Esto detecta correctamente cambios en progress incluso si el orden cambia
        
        // Convoyes
        const lastConvoysById = new Map(this.lastSentState.convoys.map(c => [c.id, c]));
        for (const convoy of currentState.convoys) {
            const lastConvoy = lastConvoysById.get(convoy.id);
            if (!lastConvoy) continue;
            
            // Threshold de 0.05 (5%) para suavidad
            if (Math.abs(convoy.progress - lastConvoy.progress) >= 0.05 ||
                convoy.returning !== lastConvoy.returning) {
                return true;
            }
        }
        
        // Trenes
        if (currentState.trains && this.lastSentState.trains) {
            const lastTrainsById = new Map(this.lastSentState.trains.map(t => [t.id, t]));
            for (const train of currentState.trains) {
                const lastTrain = lastTrainsById.get(train.id);
                if (!lastTrain) continue;
                
                if (Math.abs(train.progress - lastTrain.progress) >= 0.05 ||
                    train.returning !== lastTrain.returning) {
                    return true;
                }
            }
        }
        
        // Helicópteros
        if (currentState.helicopters && this.lastSentState.helicopters) {
            const lastHelisById = new Map(this.lastSentState.helicopters.map(h => [h.id, h]));
            for (const heli of currentState.helicopters) {
                const lastHeli = lastHelisById.get(heli.id);
                if (!lastHeli) continue;
                
                if (heli.state !== lastHeli.state ||
                    Math.abs(heli.progress - lastHeli.progress) >= 0.05) {
                    return true;
                }
            }
        }
        
        // Factory Supply Deliveries
        if (currentState.factorySupplyDeliveries && this.lastSentState.factorySupplyDeliveries) {
            const lastDeliveriesById = new Map(this.lastSentState.factorySupplyDeliveries.map(d => [d.id, d]));
            for (const delivery of currentState.factorySupplyDeliveries) {
                const lastDelivery = lastDeliveriesById.get(delivery.id);
                if (!lastDelivery) continue;
                
                if (Math.abs(delivery.progress - lastDelivery.progress) >= 0.05) {
                    return true;
                }
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
