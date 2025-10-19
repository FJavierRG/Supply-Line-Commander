// ===== SISTEMA DE TERRITORIO (SERVIDOR) =====
// Este sistema se ejecuta SOLO en el servidor
// Maneja abandono de FOBs fuera de territorio

const TERRITORY_CONFIG = {
    frontierGapPx: 25,
    checkAbandonmentInterval: 1.0, // Verificar cada 1 segundo
    graceTime: 3.0, // 3 segundos de gracia antes de empezar a derrumbarse
    phaseTime: 1.0  // 1 segundo por fase de animación
};

export class TerritorySystemServer {
    constructor(gameState) {
        this.gameState = gameState;
        this.checkAbandonmentTimer = 0;
        this.checkAbandonmentInterval = TERRITORY_CONFIG.checkAbandonmentInterval;
    }

    /**
     * Actualizar sistema de territorio
     * @param {number} dt - Delta time en segundos
     */
    update(dt) {
        // Verificar abandono de FOBs cada X segundos
        this.checkAbandonmentTimer += dt;
        
        if (this.checkAbandonmentTimer >= this.checkAbandonmentInterval) {
            this.checkAbandonmentTimer = 0;
            this.checkFOBsOutOfTerritory();
        }
    }

    /**
     * Verificar edificios fuera de territorio (FOBs y construibles)
     */
    checkFOBsOutOfTerritory() {
        // Calcular fronteras para ambos equipos
        const player1Frontier = this.calculateFrontier('player1');
        const player2Frontier = this.calculateFrontier('player2');
        
        if (!player1Frontier || !player2Frontier) {
            console.log('⚠️ No se pueden calcular fronteras - sin frentes activos');
            return;
        }
        
        // DEBUG: Log fronteras cada vez que se verifica
        console.log(`🔍 Territory check - P1 frontier: ${player1Frontier.toFixed(0)} | P2 frontier: ${player2Frontier.toFixed(0)}`);
        
        // Verificar TODOS los edificios de player1 (FOBs y construibles, pero no HQ ni frentes)
        const player1Buildings = this.gameState.nodes.filter(n => 
            n.team === 'player1' && 
            n.constructed && 
            n.type !== 'hq' && 
            n.type !== 'front'
        );
        
        for (const building of player1Buildings) {
            const isOutOfTerritory = building.x > player1Frontier;
            
            if (isOutOfTerritory) {
                // Edificio fuera de territorio
                if (!building.outOfTerritoryTimer) {
                    // Primera vez que se detecta fuera, iniciar timer
                    building.outOfTerritoryTimer = 0;
                    console.log(`⏱️ ${building.type} ${building.id} FUERA de territorio - iniciando gracia de ${TERRITORY_CONFIG.graceTime}s`);
                }
            } else {
                // Edificio de vuelta en territorio, cancelar abandono
                if (building.outOfTerritoryTimer || building.isAbandoning) {
                    console.log(`✅ ${building.type} ${building.id} DE VUELTA en territorio - cancelando abandono`);
                    building.outOfTerritoryTimer = null;
                    building.isAbandoning = false;
                    building.abandonPhase = 0;
                    building.abandonTimer = 0;
                }
            }
        }
        
        // Verificar TODOS los edificios de player2 (FOBs y construibles, pero no HQ ni frentes)
        const player2Buildings = this.gameState.nodes.filter(n => 
            n.team === 'player2' && 
            n.constructed && 
            n.type !== 'hq' && 
            n.type !== 'front'
        );
        
        for (const building of player2Buildings) {
            const isOutOfTerritory = building.x < player2Frontier;
            
            if (isOutOfTerritory) {
                // Edificio fuera de territorio
                if (!building.outOfTerritoryTimer) {
                    // Primera vez que se detecta fuera, iniciar timer
                    building.outOfTerritoryTimer = 0;
                    console.log(`⏱️ ${building.type} ${building.id} FUERA de territorio - iniciando gracia de ${TERRITORY_CONFIG.graceTime}s`);
                }
            } else {
                // Edificio de vuelta en territorio, cancelar abandono
                if (building.outOfTerritoryTimer || building.isAbandoning) {
                    console.log(`✅ ${building.type} ${building.id} DE VUELTA en territorio - cancelando abandono`);
                    building.outOfTerritoryTimer = null;
                    building.isAbandoning = false;
                    building.abandonPhase = 0;
                    building.abandonTimer = 0;
                }
            }
        }
    }

    /**
     * Calcular frontera de un equipo (posición X más avanzada)
     */
    calculateFrontier(team) {
        const fronts = this.gameState.nodes.filter(n => n.type === 'front' && n.team === team);
        
        if (fronts.length === 0) return null;
        
        if (team === 'player1') {
            // Player1 avanza a la derecha: frontera es el X más alto
            return Math.max(...fronts.map(f => f.x + TERRITORY_CONFIG.frontierGapPx));
        } else {
            // Player2 avanza a la izquierda: frontera es el X más bajo
            return Math.min(...fronts.map(f => f.x - TERRITORY_CONFIG.frontierGapPx));
        }
    }

    /**
     * Actualizar proceso de abandono de edificios
     * Timeline:
     * - 0-3s: Periodo de gracia (outOfTerritoryTimer)
     * - 3-4s: Fase 1 - Gris claro (abandonPhase = 1)
     * - 4-5s: Fase 2 - Gris oscuro (abandonPhase = 2)
     * - 5s: Eliminación
     * @param {number} dt - Delta time en segundos
     */
    updateAbandonmentProgress(dt) {
        // Procesar edificios con timer de gracia
        const buildingsOutOfTerritory = this.gameState.nodes.filter(n => 
            n.outOfTerritoryTimer !== null && 
            n.outOfTerritoryTimer !== undefined && 
            !n.isAbandoning
        );
        
        for (const building of buildingsOutOfTerritory) {
            building.outOfTerritoryTimer += dt;
            
            // Después de 4s de gracia, empezar abandono
            if (building.outOfTerritoryTimer >= TERRITORY_CONFIG.graceTime) {
                building.isAbandoning = true;
                building.abandonPhase = 0;
                building.abandonTimer = 0;
                building.outOfTerritoryTimer = null; // Ya no necesitamos este timer
                console.log(`🏚️ ${building.type} ${building.id} - INICIANDO ABANDONO (gracia terminada)`);
            }
        }
        
        // Procesar edificios en abandono
        const abandoningBuildings = this.gameState.nodes.filter(n => n.isAbandoning);
        
        for (const building of abandoningBuildings) {
            building.abandonTimer += dt;
            
            // Fase 1 (gris claro): 0 - 1.5s
            // Fase 2 (gris oscuro): 1.5s - 3s
            // Eliminación: > 3s
            
            const totalAnimTime = TERRITORY_CONFIG.phaseTime * 2; // 3 segundos total
            
            if (building.abandonTimer < TERRITORY_CONFIG.phaseTime) {
                // Fase 1: Gris claro
                if (building.abandonPhase !== 1) {
                    building.abandonPhase = 1;
                    console.log(`🏚️ ${building.type} ${building.id}: Fase 1 - Gris claro`);
                }
            } else if (building.abandonTimer < totalAnimTime) {
                // Fase 2: Gris oscuro
                if (building.abandonPhase !== 2) {
                    building.abandonPhase = 2;
                    console.log(`🏚️ ${building.type} ${building.id}: Fase 2 - Gris oscuro`);
                }
            } else {
                // Eliminación
                building.markedForDeletion = true;
                console.log(`❌ ${building.type} ${building.id} (${building.team}) completamente abandonado - ELIMINANDO`);
            }
        }
        
        // Eliminar edificios marcados
        const beforeCount = this.gameState.nodes.length;
        this.gameState.nodes = this.gameState.nodes.filter(n => !n.markedForDeletion);
        const afterCount = this.gameState.nodes.length;
        
        if (beforeCount !== afterCount) {
            console.log(`🗑️ Eliminados ${beforeCount - afterCount} edificios abandonados`);
        }
    }

    reset() {
        this.checkAbandonmentTimer = 0;
    }
}

