// ===== MANAGER DE RAZAS =====
import { getRaceConfig, getRaceTransportSystem, canRaceUseFOBs } from '../../../src/config/races.js';
import { VALID_ROUTES, RACE_SPECIAL_ROUTES } from '../../../src/config/constants.js';

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
        return getRaceConfig(raceId);
    }
    
    /**
     * Verifica si el jugador puede usar FOBs según su raza
     * @param {string} team - Equipo del jugador
     * @returns {boolean} True si puede usar FOBs
     */
    canPlayerUseFOBs(team) {
        const raceConfig = this.getPlayerRaceConfig(team);
        return raceConfig ? canRaceUseFOBs(raceConfig.id) : true; // Fallback a true para compatibilidad
    }
    
    /**
     * Obtiene el sistema de transporte del jugador según su raza
     * @param {string} team - Equipo del jugador
     * @returns {string} Tipo de sistema de transporte (standard/aerial)
     */
    getPlayerTransportSystem(team) {
        const raceConfig = this.getPlayerRaceConfig(team);
        return raceConfig ? getRaceTransportSystem(raceConfig.id) : 'standard'; // Fallback a standard
    }
    
    /**
     * Obtiene rutas válidas para una raza específica
     * @param {string} fromType - Tipo de nodo origen
     * @param {string} team - Equipo del jugador
     * @returns {Array} Array de tipos de nodos válidos
     */
    getValidRoutesForPlayer(fromType, team) {
        const raceConfig = this.getPlayerRaceConfig(team);
        
        if (!raceConfig) return VALID_ROUTES[fromType] || [];
        
        // Si la raza tiene rutas especiales (aerial), usarlas
        if (raceConfig.specialMechanics?.transportSystem === 'aerial') {
            return RACE_SPECIAL_ROUTES[raceConfig.id]?.[fromType] || VALID_ROUTES[fromType] || [];
        }
        
        // Si no, usar rutas normales
        return VALID_ROUTES[fromType] || [];
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
     * Obtiene vehículos iniciales según la raza del jugador
     * @param {string} team - Equipo del jugador
     * @param {string} nodeType - Tipo de nodo
     * @returns {Object} Configuración de vehículos iniciales
     */
    getInitialVehiclesForRace(team, nodeType) {
        const raceConfig = this.getPlayerRaceConfig(team);
        
        console.log(`🚁 DEBUG: getInitialVehiclesForRace(${team}, ${nodeType})`);
        console.log(`🚁 DEBUG: raceConfig:`, raceConfig);
        
        if (!raceConfig) {
            // Fallback a configuración tradicional
            console.log(`🚁 DEBUG: No raceConfig, usando fallback tradicional`);
            return {
                hasVehicles: nodeType === 'hq',
                availableVehicles: nodeType === 'hq' ? 2 : 0,
                hasHelicopters: false,
                availableHelicopters: 0
            };
        }
        
        if (raceConfig.specialMechanics?.transportSystem === 'aerial') {
            // Sistema aéreo: Helicópteros en lugar de camiones
            console.log(`🚁 DEBUG: Sistema aéreo detectado para ${team}`);
            return {
                hasVehicles: false,
                availableVehicles: 0,
                hasHelicopters: nodeType === 'hq',
                availableHelicopters: nodeType === 'hq' ? 1 : 0
            };
        }
        
        if (raceConfig.specialMechanics?.transportSystem === 'standard') {
            // Sistema tradicional: Camiones según tipo de nodo
            return {
                hasVehicles: nodeType === 'hq' || nodeType === 'fob',
                availableVehicles: nodeType === 'hq' ? 4 : (nodeType === 'fob' ? 2 : 0),
                hasHelicopters: false,
                availableHelicopters: 0
            };
        }
        
        // Sistema tradicional (fallback)
        return {
            hasVehicles: nodeType === 'hq',
            availableVehicles: nodeType === 'hq' ? 2 : 0,
            hasHelicopters: false,
            availableHelicopters: 0
        };
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
