// ===== MANAGER DE RAZAS =====
import { 
    getServerRaceConfig, 
    getServerRaceTransportSystem, 
    canServerRaceUseFOBs,
    getServerInitialVehiclesForRace,
    getServerRaceBuildings,
    getServerRaceConsumables
} from '../../config/raceConfig.js';
import { GAME_CONFIG } from '../../config/gameConfig.js';

export class RaceManager {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Obtiene la configuración de raza del jugador
     * @param {string} team - Equipo del jugador (player1/player2)
     * @returns {Object|null} Configuración de la raza
     */
    getPlayerRaceConfig(team) {
        const raceId = this.gameState.playerRaces[team];
        if (!raceId) return null;
        
        // 🆕 SERVIDOR COMO AUTORIDAD: Usar configuración del servidor
        return getServerRaceConfig(raceId);
    }
    
    /**
     * Verifica si el jugador puede usar FOBs según su raza
     * @param {string} team - Equipo del jugador
     * @returns {boolean} True si puede usar FOBs
     */
    canPlayerUseFOBs(team) {
        const raceConfig = this.getPlayerRaceConfig(team);
        return raceConfig ? canServerRaceUseFOBs(raceConfig.id) : true; // Fallback a true para compatibilidad
    }
    
    /**
     * Obtiene el sistema de transporte del jugador según su raza
     * @param {string} team - Equipo del jugador
     * @returns {string} Tipo de sistema de transporte (standard/aerial)
     */
    getPlayerTransportSystem(team) {
        const raceConfig = this.getPlayerRaceConfig(team);
        return raceConfig ? getServerRaceTransportSystem(raceConfig.id) : 'standard'; // Fallback a standard
    }
    
    /**
     * Obtiene rutas válidas para una raza específica
     * @param {string} fromType - Tipo de nodo origen
     * @param {string} team - Equipo del jugador
     * @returns {Array} Array de tipos de nodos válidos
     */
    getValidRoutesForPlayer(fromType, team) {
        const raceConfig = this.getPlayerRaceConfig(team);
        
        if (!raceConfig) return GAME_CONFIG.routes.valid[fromType] || [];
        
        // Si la raza tiene rutas especiales (aerial), usarlas
        if (raceConfig.specialMechanics?.transportSystem === 'aerial') {
            return GAME_CONFIG.routes.raceSpecial[raceConfig.id]?.[fromType] || GAME_CONFIG.routes.valid[fromType] || [];
        }
        
        // Si no, usar rutas normales
        return GAME_CONFIG.routes.valid[fromType] || [];
    }
    
    /**
     * Configura un nodo según la raza del jugador
     * @param {Object} node - Nodo a configurar
     * @param {string} team - Equipo del jugador
     * @returns {Object} Nodo configurado
     */
    configureNodeForRace(node, team) {
        const raceConfig = this.getPlayerRaceConfig(team);
        
        if (!raceConfig) {
            // Fallback a configuración tradicional
            return node;
        }
        
        // Configurar según mecánicas especiales
        if (raceConfig.specialMechanics?.transportSystem === 'aerial') {
            // Sistema aéreo: Agregar helicópteros
            node.hasHelicopters = true;
            node.availableHelicopters = node.type === 'hq' ? 1 : 0;
        }
        
        return node;
    }
    
    /**
     * Obtiene vehículos iniciales según la raza del jugador (SERVIDOR COMO AUTORIDAD)
     * @param {string} team - Equipo del jugador
     * @param {string} nodeType - Tipo de nodo
     * @returns {Object} Configuración de vehículos iniciales
     */
    getInitialVehiclesForRace(team, nodeType) {
        const raceConfig = this.getPlayerRaceConfig(team);
        
        if (!raceConfig) {
            // Fallback a configuración tradicional
            return {
                hasVehicles: nodeType === 'hq',
                availableVehicles: nodeType === 'hq' ? 2 : 0,
                hasHelicopters: false,
                availableHelicopters: 0
            };
        }
        
        // 🆕 SERVIDOR COMO AUTORIDAD: Usar configuración centralizada del servidor
        return getServerInitialVehiclesForRace(raceConfig.id, nodeType);
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
            // Fallback: Si no hay mazo, usar validación por raza (compatibilidad)
            const raceId = this.getPlayerRace(team);
            if (raceId) {
                const availableBuildings = getServerRaceBuildings(raceId);
                return availableBuildings.includes(unitId);
            }
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
            // Fallback: Si no hay mazo, usar edificios de raza (compatibilidad)
            const raceId = this.getPlayerRace(team);
            if (raceId) {
                return getServerRaceBuildings(raceId);
            }
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
        
        // Debug: Verificar configuración
        const raceConfig = this.getPlayerRaceConfig(team);
        console.log(`🏛️ Configuración de raza para ${team}:`, raceConfig);
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
