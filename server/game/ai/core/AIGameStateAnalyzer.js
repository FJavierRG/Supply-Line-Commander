// ===== ANALIZADOR DE ESTADO DEL JUEGO =====
// Analiza el estado actual del juego desde la perspectiva de la IA

export class AIGameStateAnalyzer {
    /**
     * Analiza el estado completo del juego
     * @param {string} team - Equipo de la IA
     * @param {Object} gameState - Estado del juego
     * @returns {Object} Objeto con información del estado: { phase, myFOBs, myPlants, playerPlants, hasLauncher, currency, ... }
     */
    static analyzeState(team, gameState) {
        const myNodes = gameState.nodes.filter(n => n.team === team && n.active);
        const playerNodes = gameState.nodes.filter(n => n.team === 'player1' && n.active);
        
        // Contar edificios propios
        const myFOBs = myNodes.filter(n => n.type === 'fob' && n.constructed).length;
        const myPlants = myNodes.filter(n => n.type === 'nuclearPlant' && n.constructed).length;
        const myServers = myNodes.filter(n => n.type === 'servers' && n.constructed).length;
        const myAerialBases = myNodes.filter(n => (n.type === 'aerialBase' || n.isAerialBase) && n.constructed && n.active).length;
        const myIntelRadios = myNodes.filter(n => n.type === 'intelRadio' && n.constructed && n.active).length;
        const myHospitals = myNodes.filter(n => n.type === 'campaignHospital' && n.constructed && n.active).length;
        
        // Contar edificios del jugador
        const playerPlants = playerNodes.filter(n => n.type === 'nuclearPlant' && n.constructed).length;
        const playerServers = playerNodes.filter(n => n.type === 'servers' && n.constructed).length;
        
        // Verificar si tiene lanzadera propia y enemiga
        const hasLauncher = myNodes.some(n => n.type === 'droneLauncher' && n.constructed && n.active);
        const enemyHasLauncher = playerNodes.some(n => n.type === 'droneLauncher' && n.constructed && n.active);
        
        // Obtener currency actual
        const currency = gameState.currency[team] || 0;

        // Tiempo transcurrido de partida (segundos)
        // Preferimos gameTime (servidor) y caemos a elapsedTime si existe por compatibilidad
        const elapsedTime = typeof gameState.gameTime === 'number'
            ? gameState.gameTime
            : (gameState.elapsedTime || 0);
        const elapsedMinutes = elapsedTime / 60;
        
        // Calcular fase del juego (basada principalmente en tiempo)
        const phase = this.getGamePhase(elapsedTime, gameState);

        // Detectar presión aérea enemiga básica
        let enemyActiveDrones = 0;
        let hasRecentEnemyDrone = false;
        const DRONE_RECENT_WINDOW = 15; // segundos

        if (gameState.droneSystem && Array.isArray(gameState.droneSystem.drones)) {
            const now = elapsedTime;
            const drones = gameState.droneSystem.drones;
            enemyActiveDrones = drones.filter(d => d.team === 'player1').length;
            hasRecentEnemyDrone = drones.some(d => 
                d.team === 'player1' &&
                typeof d.createdAt === 'number' &&
                (now - d.createdAt) <= DRONE_RECENT_WINDOW
            );
        }

        const hasAirThreat = enemyHasLauncher || hasRecentEnemyDrone || enemyActiveDrones > 0;
        const airThreatLevel = !hasAirThreat
            ? 'none'
            : (enemyActiveDrones >= 2 || hasRecentEnemyDrone ? 'high' : 'low');
        
        return {
            phase: phase,
            elapsedTime,
            elapsedMinutes,
            myFOBs: myFOBs,
            myPlants: myPlants,
            myServers: myServers,
            playerPlants: playerPlants,
            playerServers: playerServers,
            hasLauncher: hasLauncher,
            enemyHasLauncher,
            hasAirThreat,
            airThreatLevel,
            enemyActiveDrones,
            currency: currency,
            myAerialBases: myAerialBases,
            myIntelRadios: myIntelRadios,
            myHospitals: myHospitals
        };
    }
    
    /**
     * Calcula la fase del juego basándose en el tiempo transcurrido
     * @param {number} elapsedTime - Tiempo transcurrido de partida en segundos
     * @param {Object} gameState - Estado completo del juego (opcional, por si se quiere usar contexto extra)
     * @returns {string} 'early' | 'mid' | 'late'
     */
    static getGamePhase(elapsedTime, gameState = null) {
        // Fases definidas principalmente por tiempo de partida:

        if (elapsedTime < 70) {
            return 'early';
        } else if (elapsedTime < 250) {
            return 'mid';
        } else {
            return 'late';
        }
    }
}

