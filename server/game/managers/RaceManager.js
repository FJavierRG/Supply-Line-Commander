// ===== MANAGER DE RAZAS =====
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';
import { GAME_CONFIG } from '../../config/gameConfig.js';

export class RaceManager {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * ⚠️ LEGACY: Obtiene la configuración de raza del jugador
     * Ya no hay sistema de naciones, siempre devuelve null
     * @param {string} team - Equipo del jugador (player1/player2)
     * @returns {null} Siempre null (mantenido para compatibilidad)
     */
    getPlayerRaceConfig(team) {
        // ✅ ELIMINADO: Ya no hay sistema de naciones, siempre devuelve null
        return null;
    }
    
    /**
     * Verifica si el jugador puede usar FOBs
     * ✅ SIMPLIFICADO: Siempre devuelve true (ya no hay sistema de naciones)
     * @param {string} team - Equipo del jugador
     * @returns {boolean} Siempre true
     */
    canPlayerUseFOBs(team) {
        return true; // ✅ SIMPLIFICADO: Siempre se pueden usar FOBs
    }
    
    /**
     * Obtiene rutas válidas para un tipo de nodo
     * ✅ SIMPLIFICADO: Ya no hay rutas especiales por raza
     * @param {string} fromType - Tipo de nodo origen
     * @param {string} team - Equipo del jugador
     * @returns {Array} Array de tipos de nodos válidos
     */
    getValidRoutesForPlayer(fromType, team) {
        return GAME_CONFIG.routes.valid[fromType] || [];
    }
    
    /**
     * Configura un nodo según la raza del jugador
     * ✅ SIMPLIFICADO: Ya no hay configuraciones especiales por raza
     * @param {Object} node - Nodo a configurar
     * @param {string} team - Equipo del jugador
     * @returns {Object} Nodo configurado (sin cambios)
     */
    configureNodeForRace(node, team) {
        // ✅ SIMPLIFICADO: Ya no hay configuraciones especiales por raza
        return node;
    }
    
    /**
     * Obtiene vehículos iniciales según el tipo de nodo
     * ✅ REDISTRIBUIDO: Lee directamente de SERVER_NODE_CONFIG.capacities (movido desde raceConfig.js)
     * @param {string} team - Equipo del jugador (no usado, mantenido para compatibilidad)
     * @param {string} nodeType - Tipo de nodo
     * @returns {Object} Configuración de vehículos iniciales
     */
    getInitialVehiclesForRace(team, nodeType) {
        const capacityConfig = SERVER_NODE_CONFIG.capacities[nodeType];
        
        const hasVehicles = capacityConfig?.hasVehicles ?? false;
        const maxVehicles = capacityConfig?.maxVehicles ?? 0;
        const hasHelicopters = capacityConfig?.hasHelicopters ?? false;
        const maxHelicopters = capacityConfig?.maxHelicopters ?? 0;
        
        return {
            hasVehicles: hasVehicles,
            availableVehicles: hasVehicles ? maxVehicles : 0,
            hasHelicopters: hasHelicopters,
            availableHelicopters: hasHelicopters ? maxHelicopters : 0
        };
    }
    
    /**
     * Establece el mazo de un jugador
     * 🎯 ACTUALIZADO: También establece A_Nation como raza por defecto para vehículos iniciales
     * @param {string} team - Equipo del jugador
     * @param {Object} deck - Objeto del mazo con { id, name, units }
     */
    setPlayerDeck(team, deck) {
        if (!deck || !deck.units || !Array.isArray(deck.units)) {
            console.error(`❌ Mazo inválido para ${team}:`, deck);
            return;
        }
        
        // Almacenar el mazo completo
        if (!this.gameState.playerDecks) {
            this.gameState.playerDecks = {};
        }
        this.gameState.playerDecks[team] = deck;
        
        // 🎯 NUEVO: Establecer A_Nation como raza por defecto automáticamente
        // Esto es necesario para los vehículos iniciales del HQ/FOB y otras configuraciones
        // El usuario nunca verá esto, solo ve mazos
        this.gameState.playerRaces[team] = 'A_Nation';
        
        console.log(`🎴 Mazo establecido: ${team} = "${deck.name}" (${deck.units.length} unidades)`);
        console.log(`🏛️ Raza establecida automáticamente: ${team} = A_Nation (para vehículos iniciales)`);
    }
    
    /**
     * Obtiene el mazo de un jugador
     * @param {string} team - Equipo del jugador
     * @returns {Object|null} Objeto del mazo o null si no existe
     */
    getPlayerDeck(team) {
        return this.gameState.playerDecks?.[team] || null;
    }
    
    /**
     * Verifica si el jugador puede construir/usar una unidad según su mazo
     * @param {string} team - Equipo del jugador
     * @param {string} unitId - ID de la unidad
     * @returns {boolean} True si la unidad está en el mazo
     */
    canPlayerUseUnit(team, unitId) {
        const deck = this.getPlayerDeck(team);
        if (!deck || !deck.units) {
            // ✅ ELIMINADO: Ya no hay fallback por raza, siempre hay mazo
            return false;
        }
        
        return deck.units.includes(unitId);
    }
    
    /**
     * Obtiene las unidades disponibles del mazo del jugador
     * @param {string} team - Equipo del jugador
     * @returns {Array<string>} Array de IDs de unidades disponibles
     */
    getPlayerAvailableUnits(team) {
        const deck = this.getPlayerDeck(team);
        if (!deck || !deck.units) {
            // ✅ ELIMINADO: Ya no hay fallback por raza, siempre hay mazo
            return [];
        }
        
        return [...deck.units]; // Copia del array
    }
    
    /**
     * Establece la raza de un jugador
     * @param {string} team - Equipo del jugador
     * @param {string} raceId - ID de la raza
     */
    setPlayerRace(team, raceId) {
        this.gameState.playerRaces[team] = raceId;
        console.log(`🏛️ Raza establecida: ${team} = ${raceId}`);
        console.log(`🏛️ playerRaces actual:`, this.gameState.playerRaces);
        
        // ✅ ELIMINADO: Ya no hay configuración de raza que verificar
    }
    
    /**
     * Obtiene la raza de un jugador
     * @param {string} team - Equipo del jugador
     * @returns {string|null} ID de la raza
     */
    getPlayerRace(team) {
        return this.gameState.playerRaces[team];
    }
}
