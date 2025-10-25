// ===== CALCULADOR DE TERRITORIO =====
export class TerritoryCalculator {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Verifica si una posición X está dentro del territorio de un equipo
     */
    isInTeamTerritory(x, team) {
        const fronts = this.gameState.nodes.filter(n => 
            n.type === 'front' && 
            n.team === team && 
            (n.active === undefined || n.active === true) // Considerar undefined como true
        );
        
        if (fronts.length === 0) {
            // Sin frentes, permitir construir solo cerca del HQ
            const hq = this.gameState.nodes.find(n => n.type === 'hq' && n.team === team);
            if (!hq) return false;
            
            // Permitir construcción en un radio de 300px del HQ
            return Math.abs(x - hq.x) <= 300;
        }
        
        // Calcular frontera del equipo
        const frontierGapPx = 25;
        let frontier;
        
        if (team === 'player1') {
            // Player1 avanza a la derecha
            frontier = Math.max(...fronts.map(f => f.x + frontierGapPx));
            // Player1 puede construir a la izquierda de su frontera
            const hq = this.gameState.nodes.find(n => n.type === 'hq' && n.team === team);
            return x >= (hq?.x || 0) && x <= frontier;
        } else {
            // Player2 avanza a la izquierda
            frontier = Math.min(...fronts.map(f => f.x - frontierGapPx));
            // Player2 puede construir a la derecha de su frontera
            const hq = this.gameState.nodes.find(n => n.type === 'hq' && n.team === team);
            return x <= (hq?.x || 1920) && x >= frontier;
        }
    }
}
