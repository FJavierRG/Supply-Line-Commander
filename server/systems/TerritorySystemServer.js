// ===== SISTEMA DE TERRITORIO (SERVIDOR) =====
// Este sistema se ejecuta SOLO en el servidor
// Maneja abandono de FOBs fuera de territorio

import { SERVER_NODE_CONFIG } from '../config/serverNodes.js';

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
        
        // DEBUG: Log fronteras cada 5 verificaciones (reduce spam pero mantiene visibilidad)
        if (Math.floor(this.checkAbandonmentTimer * 10) % 50 === 0) {
            console.log(`🔍 Territory check - P1 frontier: ${player1Frontier.toFixed(0)} | P2 frontier: ${player2Frontier.toFixed(0)}`);
        }
        
        // Verificar TODOS los edificios de player1 (todos excepto HQ y frentes)
        // Los edificios con abandono automático (aerialBase, intelRadio) también pueden abandonarse por territorio
        const player1Buildings = this.gameState.nodes.filter(n => 
            n.team === 'player1' && 
            n.constructed && 
            n.type !== 'hq' && 
            n.type !== 'front'
        );
        
        for (const building of player1Buildings) {
            // Obtener radio del edificio (para considerar la hitbox completa)
            const buildingRadius = SERVER_NODE_CONFIG.radius[building.type] || 30;
            // El edificio está fuera de territorio cuando TODO su borde izquierdo está fuera de la frontera
            // (es decir, cuando el edificio está completamente fuera del territorio)
            const isOutOfTerritory = (building.x - buildingRadius) > player1Frontier;
            
            if (isOutOfTerritory) {
                // Edificio fuera de territorio
                if (!building.outOfTerritoryTimer) {
                    // Primera vez que se detecta fuera, iniciar timer
                    building.outOfTerritoryTimer = 0;
                    console.log(`⏱️ ${building.type} ${building.id} FUERA de territorio - iniciando gracia de ${TERRITORY_CONFIG.graceTime}s (x: ${building.x.toFixed(0)}, radius: ${buildingRadius}, leftEdge: ${(building.x - buildingRadius).toFixed(0)}, frontier: ${player1Frontier.toFixed(0)})`);
                }
                // NO incrementar el timer aquí - se hace en updateAbandonmentProgress
            } else {
                // Edificio de vuelta en territorio, cancelar timer y abandono
                if (building.outOfTerritoryTimer !== null) {
                    // console.log(`✅ ${building.type} ${building.id} DE VUELTA en territorio - cancelando timer`);
                    building.outOfTerritoryTimer = null;
                    // También resetear abandono si estaba en proceso
                    if (building.isAbandoning) {
                        this.gameState.abandonmentSystem.resetAbandonment(building);
                    }
                }
            }
        }
        
        // Verificar TODOS los edificios de player2 (todos excepto HQ y frentes)
        // Los edificios con abandono automático (aerialBase, intelRadio) también pueden abandonarse por territorio
        const player2Buildings = this.gameState.nodes.filter(n => 
            n.team === 'player2' && 
            n.constructed && 
            n.type !== 'hq' && 
            n.type !== 'front'
        );
        
        for (const building of player2Buildings) {
            // Obtener radio del edificio (para considerar la hitbox completa)
            const buildingRadius = SERVER_NODE_CONFIG.radius[building.type] || 30;
            // El edificio está fuera de territorio cuando TODO su borde derecho está fuera de la frontera
            // (es decir, cuando el edificio está completamente fuera del territorio)
            const isOutOfTerritory = (building.x + buildingRadius) < player2Frontier;
            
            if (isOutOfTerritory) {
                // Edificio fuera de territorio
                if (!building.outOfTerritoryTimer) {
                    // Primera vez que se detecta fuera, iniciar timer
                    building.outOfTerritoryTimer = 0;
                    console.log(`⏱️ ${building.type} ${building.id} FUERA de territorio - iniciando gracia de ${TERRITORY_CONFIG.graceTime}s (x: ${building.x.toFixed(0)}, radius: ${buildingRadius}, rightEdge: ${(building.x + buildingRadius).toFixed(0)}, frontier: ${player2Frontier.toFixed(0)})`);
                }
                // NO incrementar el timer aquí - se hace en updateAbandonmentProgress
            } else {
                // Edificio de vuelta en territorio, cancelar timer y abandono
                if (building.outOfTerritoryTimer !== null || building.isAbandoning) {
                    // console.log(`✅ ${building.type} ${building.id} DE VUELTA en territorio - cancelando timer`);
                    building.outOfTerritoryTimer = null;
                    this.gameState.abandonmentSystem.resetAbandonment(building);
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
     * Actualizar timer de gracia para edificios fuera de territorio
     * @param {number} dt - Delta time en segundos
     */
    updateAbandonmentProgress(dt) {
        // Incrementar timer de gracia para edificios fuera de territorio
        const buildingsOutOfTerritory = this.gameState.nodes.filter(n => 
            n.outOfTerritoryTimer !== null && 
            n.outOfTerritoryTimer !== undefined &&
            !n.isAbandoning
        );
        
        for (const building of buildingsOutOfTerritory) {
            building.outOfTerritoryTimer += dt;
        }
        
        // NOTA: El inicio del abandono (cuando timer >= 3s) y las fases de abandono
        // ahora se manejan en el AbandonmentSystem centralizado.
    }

    reset() {
        this.checkAbandonmentTimer = 0;
    }
}

