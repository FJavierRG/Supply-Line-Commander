// ===== SISTEMA DE TERRITORIO (SERVIDOR) =====
// Este sistema se ejecuta SOLO en el servidor
// Maneja abandono de FOBs fuera de territorio

import { SERVER_NODE_CONFIG } from '../config/serverNodes.js';
import { GAME_CONFIG } from '../config/gameConfig.js';

export class TerritorySystemServer {
    constructor(gameState) {
        this.gameState = gameState;
        this.checkAbandonmentTimer = 0;
        this.checkAbandonmentInterval = GAME_CONFIG.territory.checkAbandonmentInterval;
    }
    
    /**
     * Obtiene la configuración de territorio
     */
    getConfig() {
        return GAME_CONFIG.territory;
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
        
        // Verificar edificios de ambos equipos usando función común
        this.checkBuildingsForTeam('player1', player1Frontier, (building, radius) => {
            // Player1: edificio fuera si su borde izquierdo está fuera de la frontera
            return (building.x - radius) > player1Frontier;
        }, 'leftEdge');
        
        this.checkBuildingsForTeam('player2', player2Frontier, (building, radius) => {
            // Player2: edificio fuera si su borde derecho está fuera de la frontera
            return (building.x + radius) < player2Frontier;
        }, 'rightEdge');
    }
    
    /**
     * Verifica edificios de un equipo para ver si están fuera de territorio
     * @param {string} team - Equipo a verificar ('player1' o 'player2')
     * @param {number} frontier - Frontera calculada para este equipo
     * @param {Function} isOutOfTerritoryFn - Función que calcula si un edificio está fuera (recibe building, radius)
     * @param {string} edgeName - Nombre del borde para logs ('leftEdge' o 'rightEdge')
     */
    checkBuildingsForTeam(team, frontier, isOutOfTerritoryFn, edgeName) {
        // Filtrar edificios del equipo (todos excepto HQ, frentes y unidades especiales)
        // Los edificios con abandono automático (aerialBase, intelRadio) también pueden abandonarse por territorio
        // Excluir specopsCommando, truckAssault y cameraDrone: están diseñados para desplegarse en territorio enemigo
        const buildings = this.gameState.nodes.filter(n => 
            n.team === team && 
            n.constructed && 
            n.type !== 'hq' && 
            n.type !== 'front' &&
            n.type !== 'specopsCommando' &&
            n.type !== 'truckAssault' &&
            n.type !== 'cameraDrone'
        );
        
        for (const building of buildings) {
            const buildingRadius = SERVER_NODE_CONFIG.radius[building.type] || 30;
            const isOutOfTerritory = isOutOfTerritoryFn(building, buildingRadius);
            
            if (isOutOfTerritory) {
                // Edificio fuera de territorio
                if (!building.outOfTerritoryTimer) {
                    // Primera vez que se detecta fuera, iniciar timer
                    building.outOfTerritoryTimer = 0;
                    const config = this.getConfig();
                    const edgePosition = edgeName === 'leftEdge' 
                        ? (building.x - buildingRadius).toFixed(0)
                        : (building.x + buildingRadius).toFixed(0);
                    console.log(`⏱️ ${building.type} ${building.id} FUERA de territorio - iniciando gracia de ${config.graceTime}s (x: ${building.x.toFixed(0)}, radius: ${buildingRadius}, ${edgeName}: ${edgePosition}, frontier: ${frontier.toFixed(0)})`);
                }
                // NO incrementar el timer aquí - se hace en updateAbandonmentProgress
            } else {
                // Edificio de vuelta en territorio, cancelar timer y abandono
                // FIX: Solo resetear abandono si fue causado por territorio
                // NO resetear si el abandono fue iniciado por otras razones (investmentCompleted, supplies agotados)
                if (building.outOfTerritoryTimer !== null) {
                    building.outOfTerritoryTimer = null;
                    // Solo resetear abandono si estaba en proceso Y NO es intelRadio o aerialBase (tienen abandono automático)
                    if (building.isAbandoning && 
                        building.type !== 'intelRadio' && 
                        building.type !== 'aerialBase' && 
                        !building.isAerialBase) {
                        this.gameState.abandonmentSystem.resetAbandonment(building);
                    }
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
        
        const config = this.getConfig();
        if (team === 'player1') {
            // Player1 avanza a la derecha: frontera es el X más alto
            return Math.max(...fronts.map(f => f.x + config.frontierGapPx));
        } else {
            // Player2 avanza a la izquierda: frontera es el X más bajo
            return Math.min(...fronts.map(f => f.x - config.frontierGapPx));
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

