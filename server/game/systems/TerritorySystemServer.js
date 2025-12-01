// ===== SISTEMA DE TERRITORIO (SERVIDOR) =====
// Este sistema se ejecuta SOLO en el servidor
// Maneja abandono de FOBs fuera de territorio

import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';
import { GAME_CONFIG } from '../../config/gameConfig.js';

export class TerritorySystemServer {
    constructor(gameState) {
        this.gameState = gameState;
        this.checkAbandonmentTimer = 0;
        this.checkAbandonmentInterval = GAME_CONFIG.territory.checkAbandonmentInterval;
        
        // 🐛 DEBUG: Activar logs detallados (cambiar a true para debuggear)
        this.debugMode = false;
        
        // 📊 MONITOR: Logs cada segundo para verificar territorio
        this.monitorTimer = 0;
        this.monitorInterval = 1.0; // Cada 1 segundo
        this.monitorEnabled = false; // ← Cambiar a true para activar durante testing
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
        
        // 📊 Monitor de territorio cada segundo
        if (this.monitorEnabled) {
            this.monitorTimer += dt;
            if (this.monitorTimer >= this.monitorInterval) {
                this.monitorTimer = 0;
                this.logTerritoryStatus();
            }
        }
    }

    /**
     * Verificar edificios fuera de territorio (FOBs y construibles)
     */
    checkFOBsOutOfTerritory() {
        // Obtener frentes de ambos equipos
        const fronts = {
            player1: this.gameState.nodes.filter(n => n.type === 'front' && n.team === 'player1'),
            player2: this.gameState.nodes.filter(n => n.type === 'front' && n.team === 'player2')
        };
        
        // Verificar que haya frentes
        if (fronts.player1.length === 0 || fronts.player2.length === 0) {
            console.log('⚠️ No se pueden calcular fronteras - sin frentes activos');
            return;
        }
        
        // 🐛 DEBUG: Log de frentes
        if (this.debugMode) {
            console.log(`🎯 Frentes encontrados:
  Player1: ${fronts.player1.length} frentes
  Player2: ${fronts.player2.length} frentes`);
        }
        
        // Verificar edificios de ambos equipos con interpolación
        for (const team of ['player1', 'player2']) {
            this.checkTeamBuildings(team, fronts[team]);
        }
    }
    
    /**
     * Verifica edificios de un equipo para ver si están fuera de territorio
     * @param {string} team - Equipo a verificar ('player1' o 'player2')
     * @param {Array} fronts - Array de frentes del equipo
     */
    checkTeamBuildings(team, fronts) {
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
            const isOut = this.isBuildingOutOfTerritory(building, fronts, team);
            const frontierAtY = this.getFrontierXAtY(building.y, fronts, team);
            this.handleBuildingTerritoryStatus(building, isOut, team, frontierAtY);
        }
    }
    
    /**
     * Determina si un edificio está fuera del territorio de su equipo
     * ✅ SIMPLE: Usa el CENTRO del edificio, no los bordes
     * @param {Object} building - El edificio a verificar
     * @param {Array} fronts - Array de frentes del equipo
     * @param {string} team - El equipo del edificio ('player1' o 'player2')
     * @returns {boolean} true si el edificio está fuera de territorio
     */
    isBuildingOutOfTerritory(building, fronts, team) {
        // ✅ INTERPOLACIÓN: Calcular la frontera según la Y del edificio
        const frontierAtY = this.getFrontierXAtY(building.y, fronts, team);
        
        if (team === 'player1') {
            // Player1: Edificio FUERA si su CENTRO está más a la derecha que la frontera
            const isOut = building.x > frontierAtY;
            
            // 🐛 DEBUG: Log detallado
            if (this.debugMode && isOut) {
                console.log(`   🔍 P1 ${building.type} FUERA: x=${building.x.toFixed(0)}, y=${building.y.toFixed(0)}, frontierAtY=${frontierAtY.toFixed(0)}`);
            }
            
            return isOut;
        } else {
            // Player2: Edificio FUERA si su CENTRO está más a la izquierda que la frontera
            const isOut = building.x < frontierAtY;
            
            // 🐛 DEBUG: Log detallado
            if (this.debugMode && isOut) {
                console.log(`   🔍 P2 ${building.type} FUERA: x=${building.x.toFixed(0)}, y=${building.y.toFixed(0)}, frontierAtY=${frontierAtY.toFixed(0)}`);
            }
            
            return isOut;
        }
    }
    
    /**
     * Maneja el estado de un edificio respecto al territorio (iniciar o cancelar abandono)
     * @param {Object} building - El edificio a manejar
     * @param {boolean} isOut - Si el edificio está fuera de territorio
     * @param {string} team - El equipo del edificio
     * @param {number} frontierAtY - La frontera interpolada en la Y del edificio
     */
    handleBuildingTerritoryStatus(building, isOut, team, frontierAtY) {
        if (isOut) {
            // Edificio fuera de territorio
            if (building.outOfTerritoryTimer === null || building.outOfTerritoryTimer === undefined) {
                // Primera vez que se detecta fuera, iniciar timer
                building.outOfTerritoryTimer = 0;
                const config = this.getConfig();
                
                console.log(`⏱️ [${team.toUpperCase()}] ${building.type} ${building.id} FUERA de territorio - iniciando gracia de ${config.graceTime}s (centro: x=${building.x.toFixed(0)}, y=${building.y.toFixed(0)}, frontierAtY=${frontierAtY.toFixed(0)})`);
            }
            // NO incrementar el timer aquí - se hace en updateAbandonmentProgress
        } else {
            // Edificio de vuelta en territorio, cancelar timer y abandono
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

    /**
     * ✅ INTERPOLACIÓN CORRECTA: Obtiene la posición X de la frontera a una altura Y específica
     * Interpola entre los BORDES de los frentes (no centros) + gap configurado
     * @param {number} y - Altura Y donde buscar la frontera
     * @param {Array} fronts - Array de frentes del equipo
     * @param {string} team - El equipo ('player1' o 'player2')
     * @returns {number} Posición X de la frontera a esa altura (borde + gap)
     */
    getFrontierXAtY(y, fronts, team) {
        if (!fronts || fronts.length === 0) {
            return team === 'player1' ? 0 : this.gameState.worldWidth || 1920;
        }
        
        const config = this.getConfig();
        const gap = config.frontierGapPx;
        
        // Ordenar frentes por Y
        const sortedFronts = [...fronts].sort((a, b) => a.y - b.y);
        
        // ✅ PASO 1: Calcular BORDES de cada frente (no centros)
        const frontierPoints = sortedFronts.map(front => {
            const radius = SERVER_NODE_CONFIG.radius[front.type] || 40;
            
            // Calcular el borde exterior del frente según el equipo
            const edgeX = team === 'player1'
                ? front.x + radius  // Player1: borde DERECHO
                : front.x - radius; // Player2: borde IZQUIERDO
            
            return {
                y: front.y,
                x: edgeX
            };
        });
        
        // Si solo hay un frente, usar ese borde + gap
        if (frontierPoints.length === 1) {
            return team === 'player1'
                ? frontierPoints[0].x + gap
                : frontierPoints[0].x - gap;
        }
        
        // ✅ PASO 2: Interpolar entre BORDES (no centros)
        for (let i = 0; i < frontierPoints.length - 1; i++) {
            const point1 = frontierPoints[i];
            const point2 = frontierPoints[i + 1];
            
            if (y >= point1.y && y <= point2.y) {
                // Interpolar linealmente entre los dos bordes
                const t = (y - point1.y) / (point2.y - point1.y);
                const interpolatedEdgeX = point1.x + (point2.x - point1.x) * t;
                
                // ✅ PASO 3: Aplicar gap configurado
                return team === 'player1'
                    ? interpolatedEdgeX + gap
                    : interpolatedEdgeX - gap;
            }
        }
        
        // Si Y está fuera del rango, usar el punto más cercano
        if (y < frontierPoints[0].y) {
            return team === 'player1'
                ? frontierPoints[0].x + gap
                : frontierPoints[0].x - gap;
        }
        
        if (y > frontierPoints[frontierPoints.length - 1].y) {
            const lastPoint = frontierPoints[frontierPoints.length - 1];
            return team === 'player1'
                ? lastPoint.x + gap
                : lastPoint.x - gap;
        }
        
        // Fallback
        return team === 'player1' ? 0 : this.gameState.worldWidth || 1920;
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
        this.monitorTimer = 0;
    }
    
    /**
     * 📊 LOG DE MONITOREO: Muestra estado del territorio cada segundo
     * ✅ AHORA CON INTERPOLACIÓN - Muestra frontera específica por edificio
     */
    logTerritoryStatus() {
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('📊 MONITOR DE TERRITORIO (CON INTERPOLACIÓN)');
        console.log('═══════════════════════════════════════════════════════');
        
        // Obtener frentes
        const fronts = {
            player1: this.gameState.nodes.filter(n => n.type === 'front' && n.team === 'player1'),
            player2: this.gameState.nodes.filter(n => n.type === 'front' && n.team === 'player2')
        };
        
        // Mostrar frentes
        for (const team of ['player1', 'player2']) {
            const teamFronts = fronts[team];
            
            console.log(`\n🛡️  ${team.toUpperCase()} - FRENTES:`);
            
            if (teamFronts.length > 0) {
                teamFronts.forEach((front, i) => {
                    console.log(`   Front ${i+1}: x=${front.x.toFixed(0)}, y=${front.y.toFixed(0)}`);
                });
            } else {
                console.log('   ⚠️  Sin frentes');
            }
        }
        
        // Mostrar edificios de cada equipo con frontera interpolada
        for (const team of ['player1', 'player2']) {
            const teamFronts = fronts[team];
            if (!teamFronts || teamFronts.length === 0) continue;
            
            const buildings = this.gameState.nodes.filter(n => 
                n.team === team && 
                n.constructed && 
                n.type !== 'hq' && 
                n.type !== 'front' &&
                n.type !== 'specopsCommando' &&
                n.type !== 'truckAssault' &&
                n.type !== 'cameraDrone'
            );
            
            console.log(`\n🏢 ${team.toUpperCase()} - EDIFICIOS:`);
            
            if (buildings.length === 0) {
                console.log('   (sin edificios)');
                continue;
            }
            
            buildings.forEach(building => {
                const isOut = this.isBuildingOutOfTerritory(building, teamFronts, team);
                
                // ✅ Calcular frontera INTERPOLADA en la Y del edificio
                const frontierAtY = this.getFrontierXAtY(building.y, teamFronts, team);
                
                const status = isOut ? '❌ FUERA' : '✅ DENTRO';
                const timerInfo = building.outOfTerritoryTimer !== null && building.outOfTerritoryTimer !== undefined
                    ? ` [Timer: ${building.outOfTerritoryTimer.toFixed(1)}s]`
                    : '';
                
                console.log(`   ${building.type.padEnd(15)} | centro: x=${building.x.toFixed(0).padStart(4)}, y=${building.y.toFixed(0).padStart(4)} | frontierAtY=${frontierAtY.toFixed(0).padStart(4)} | ${status}${timerInfo}`);
            });
        }
        
        console.log('\n═══════════════════════════════════════════════════════\n');
    }
}





