// ===== SISTEMA DE ABANDONO =====
// Inicia abandono -> fases -> eliminación

export class AbandonmentSystem {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Verifica TODAS las condiciones de abandono para TODOS los nodos
     * Se llama desde GameStateManager.update() cada tick
     */
    checkAbandonmentConditions() {
        for (const node of this.gameState.nodes) {
            // Ya está abandonando, skip
            if (node.isAbandoning) {
                continue;
            }
            
            // 1. ABANDONO POR TERRITORIO (prioridad alta - afecta a TODOS los nodos excepto HQ y front)
            // Después del tiempo de gracia (outOfTerritoryTimer >= 3s), iniciar abandono
            if (node.outOfTerritoryTimer !== null && 
                node.outOfTerritoryTimer !== undefined &&
                node.outOfTerritoryTimer >= 3.0) {
                // Tiempo de gracia completado -> iniciar abandono
                console.log(`💥 ${node.type} ${node.id} - tiempo de gracia completado (${node.outOfTerritoryTimer.toFixed(1)}s) - iniciando abandono`);
                this.startAbandonment(node);
                node.outOfTerritoryTimer = null; // Resetear timer
                continue;
            }
            
            // 2. IntelRadio: abandono cuando completa inversión (si no está ya en abandono por territorio)
            if (node.type === 'intelRadio' && 
                node.investmentStarted && 
                node.constructed && 
                node.investmentCompleted) {
                this.startAbandonment(node);
                continue;
            }
            
            // 3. Base Aérea: abandono cuando supplies = 0 y sin helicópteros (si no está ya en abandono por territorio)
            if ((node.type === 'aerialBase' || node.isAerialBase) && 
                node.supplies <= 0 && 
                node.autoDestroy &&
                (!node.landedHelicopters || node.landedHelicopters.length === 0)) {
                this.startAbandonment(node);
                continue;
            }
        }
    }
    
    /**
     * Inicia el proceso de abandono de un nodo
     * Fases: 1 (gris claro) -> 2 (gris oscuro) -> 3 (eliminar)
     */
    startAbandonment(node) {
        if (node.isAbandoning) {
            return; // Ya está abandonando
        }
        
        node.isAbandoning = true;
        node.abandonPhase = 1;
        node.abandonStartTime = this.gameState.gameTime * 1000; // ms
        
        console.log(`💥 ${node.type} ${node.id} INICIANDO ABANDONO`);
    }
    
    /**
     * Actualiza las fases de abandono
     * Fase 1: 0-2000ms (gris claro)
     * Fase 2: 2000-5000ms (gris oscuro)
     * Fase 3: >5000ms (eliminar)
     */
    update(dt) {
        for (const node of this.gameState.nodes) {
            if (!node.isAbandoning) {
                continue;
            }
            
            const now = this.gameState.gameTime * 1000; // ms
            const elapsed = now - (node.abandonStartTime || now);
            
            // Actualizar fase
            if (elapsed < 2000) {
                node.abandonPhase = 1; // Gris claro
            } else if (elapsed < 5000) {
                node.abandonPhase = 2; // Gris oscuro
            } else {
                node.abandonPhase = 3; // Listo para eliminar
            }
        }
    }
    
    /**
     * Limpia nodos que han completado el abandono
     */
    cleanup() {
        const beforeCount = this.gameState.nodes.length;
        
        this.gameState.nodes = this.gameState.nodes.filter(node => {
            if (node.isAbandoning && node.abandonPhase === 3) {
                console.log(`💥 Eliminando ${node.type} ${node.id} - abandono finalizado`);
                return false;
            }
            return true;
        });
        
        if (this.gameState.nodes.length < beforeCount) {
            this.gameState.optimizationTracker.cleanupNodeTracking();
            return true;
        }
        
        return false;
    }
    
    /**
     * Reset abandono (para cuando un edificio vuelve a territorio)
     */
    resetAbandonment(node) {
        if (node.isAbandoning) {
            console.log(`✅ ${node.type} ${node.id} - reseteando abandono`);
            node.isAbandoning = false;
            node.abandonPhase = 0;
            node.abandonStartTime = null;
            node.outOfTerritoryTimer = null;
        }
    }
}
