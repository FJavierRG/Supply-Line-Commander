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
        const myAerialBases = myNodes.filter(n => (n.type === 'aerialBase' || n.isAerialBase) && n.constructed && n.active).length;
        const myIntelRadios = myNodes.filter(n => n.type === 'intelRadio' && n.constructed && n.active).length;
        const myHospitals = myNodes.filter(n => n.type === 'campaignHospital' && n.constructed && n.active).length;
        
        // Contar edificios del jugador
        const playerPlants = playerNodes.filter(n => n.type === 'nuclearPlant' && n.constructed).length;
        
        // Verificar si tiene lanzadera
        const hasLauncher = myNodes.some(n => n.type === 'droneLauncher' && n.constructed && n.active);
        
        // Obtener currency actual
        const currency = gameState.currency[team] || 0;
        
        // Calcular fase del juego
        const phase = this.getGamePhase(currency);
        
        return {
            phase: phase,
            myFOBs: myFOBs,
            myPlants: myPlants,
            playerPlants: playerPlants,
            hasLauncher: hasLauncher,
            currency: currency,
            myAerialBases: myAerialBases,
            myIntelRadios: myIntelRadios,
            myHospitals: myHospitals
        };
    }
    
    /**
     * Calcula la fase del juego basándose en el currency
     * @param {number} currency - Currency actual del equipo
     * @returns {string} 'early' | 'mid' | 'late'
     */
    static getGamePhase(currency) {
        if (currency < 200) {
            return 'early';
        } else if (currency < 400) {
            return 'mid';
        } else {
            return 'late';
        }
    }
}

