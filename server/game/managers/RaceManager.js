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
     * 🆕 NUEVO: Obtiene la configuración de tipos de vehículos para un tipo de nodo
     * @param {string} nodeType - Tipo de nodo
     * @returns {Object|null} Configuración del sistema de vehículos o null si no existe
     */
    getVehicleSystemForNode(nodeType) {
        return SERVER_NODE_CONFIG.vehicleSystems?.[nodeType] || null;
    }
    
    /**
     * 🆕 NUEVO: Obtiene los tipos de vehículos habilitados para un nodo
     * @param {string} nodeType - Tipo de nodo
     * @returns {Array<string>} Array de IDs de tipos de vehículos habilitados
     */
    getEnabledVehicleTypes(nodeType) {
        const system = this.getVehicleSystemForNode(nodeType);
        if (!system) return [];
        
        // Filtrar solo tipos habilitados y que existan en vehicleTypes
        return system.enabledTypes.filter(typeId => {
            const vehicleType = SERVER_NODE_CONFIG.vehicleTypes?.[typeId];
            return vehicleType && vehicleType.enabled;
        });
    }
    
    /**
     * 🆕 NUEVO: Obtiene el tipo de vehículo por defecto para un nodo
     * @param {string} nodeType - Tipo de nodo
     * @returns {string|null} ID del tipo de vehículo por defecto o null
     */
    getDefaultVehicleType(nodeType) {
        const system = this.getVehicleSystemForNode(nodeType);
        if (!system) return null;
        
        // Verificar que el tipo por defecto esté habilitado
        const enabledTypes = this.getEnabledVehicleTypes(nodeType);
        if (enabledTypes.includes(system.defaultType)) {
            return system.defaultType;
        }
        
        // Si el tipo por defecto no está habilitado, devolver el primero disponible
        return enabledTypes.length > 0 ? enabledTypes[0] : null;
    }
    
    /**
     * 🆕 NUEVO: Obtiene la configuración de un tipo de vehículo
     * @param {string} vehicleTypeId - ID del tipo de vehículo
     * @returns {Object|null} Configuración del tipo de vehículo o null si no existe
     */
    getVehicleTypeConfig(vehicleTypeId) {
        return SERVER_NODE_CONFIG.vehicleTypes?.[vehicleTypeId] || null;
    }
    
    /**
     * 🆕 NUEVO: Obtiene el número de vehículos disponibles de un tipo específico en un nodo
     * @param {Object} node - Nodo del servidor
     * @param {string} vehicleTypeId - ID del tipo de vehículo
     * @returns {number} Número de vehículos disponibles
     */
    getAvailableVehicleCount(node, vehicleTypeId) {
        const vehicleType = this.getVehicleTypeConfig(vehicleTypeId);
        if (!vehicleType) return 0;
        
        if (vehicleType.usesStandardSystem) {
            // Sistema estándar: usa availableVehicles/maxVehicles
            return node.availableVehicles || 0;
        } else {
            // Sistema personalizado: usa la propiedad especificada
            const availableProp = vehicleType.availableProperty;
            if (availableProp === 'availableAmbulances') {
                return node.ambulanceAvailable ? 1 : 0;
            } else if (availableProp === 'availableHelicopters') {
                return node.availableHelicopters || 0;
            } else if (availableProp === 'landedHelicopters') {
                return (node.landedHelicopters || []).length;
            } else if (availableProp === 'availableRepairVehicles') {
                return node.availableRepairVehicles || 0;
            }
        }
        
        return 0;
    }
    
    /**
     * 🆕 NUEVO: Obtiene el máximo de vehículos de un tipo específico en un nodo
     * @param {Object} node - Nodo del servidor
     * @param {string} vehicleTypeId - ID del tipo de vehículo
     * @returns {number} Número máximo de vehículos
     */
    getMaxVehicleCount(node, vehicleTypeId) {
        const vehicleType = this.getVehicleTypeConfig(vehicleTypeId);
        if (!vehicleType) return 0;
        
        if (vehicleType.usesStandardSystem) {
            // Sistema estándar: usa maxVehicles
            return node.maxVehicles || 0;
        } else {
            // Sistema personalizado: usa la propiedad especificada
            const maxProp = vehicleType.maxProperty;
            if (maxProp === 'maxAmbulances') {
                return node.maxAmbulances || 0;
            } else if (maxProp === 'maxHelicopters') {
                return node.maxHelicopters || 0;
            } else if (maxProp === 'maxRepairVehicles') {
                return node.maxRepairVehicles || 0;
            }
        }
        
        return 0;
    }
    
    /**
     * Establece el mazo de un jugador
     * 🎯 ACTUALIZADO: También establece A_Nation como raza por defecto para vehículos iniciales
     * 🆕 NUEVO: Maneja el banquillo
     * @param {string} team - Equipo del jugador
     * @param {Object} deck - Objeto del mazo con { id, name, units, bench }
     */
    setPlayerDeck(team, deck) {
        if (!deck || !deck.units || !Array.isArray(deck.units)) {
            console.error(`❌ Mazo inválido para ${team}:`, deck);
            return;
        }
        
        // 🆕 NUEVO: Asegurar que el banquillo existe
        if (!deck.bench || !Array.isArray(deck.bench)) {
            deck.bench = [];
        }
        
        // Almacenar el mazo completo (incluyendo banquillo)
        if (!this.gameState.playerDecks) {
            this.gameState.playerDecks = {};
        }
        this.gameState.playerDecks[team] = {
            ...deck,
            bench: [...deck.bench] // Copia del banquillo
        };
        
        // 🆕 NUEVO: Inicializar cooldowns del banquillo si no existen
        if (!this.gameState.benchCooldowns) {
            this.gameState.benchCooldowns = {};
        }
        if (!this.gameState.benchCooldowns[team]) {
            this.gameState.benchCooldowns[team] = {};
        }
        
        // 🎯 NUEVO: Establecer A_Nation como raza por defecto automáticamente
        // Esto es necesario para los vehículos iniciales del HQ/FOB y otras configuraciones
        // El usuario nunca verá esto, solo ve mazos
        this.gameState.playerRaces[team] = 'A_Nation';
        
        console.log(`🎴 Mazo establecido: ${team} = "${deck.name}" (${deck.units.length} unidades, ${deck.bench.length} en banquillo)`);
        console.log(`🏛️ Raza establecida automáticamente: ${team} = A_Nation (para vehículos iniciales)`);
    }
    
    /**
     * 🆕 NUEVO: Establece el cooldown de una carta que entra al banquillo
     * @param {string} team - Equipo del jugador
     * @param {string} unitId - ID de la unidad
     * @param {number} gameTime - Tiempo del juego en segundos
     */
    setBenchCooldown(team, unitId, gameTime) {
        if (!this.gameState.benchCooldowns) {
            this.gameState.benchCooldowns = {};
        }
        if (!this.gameState.benchCooldowns[team]) {
            this.gameState.benchCooldowns[team] = {};
        }
        
        // Cooldown de 1 minuto (60 segundos)
        const COOLDOWN_DURATION = 60;
        this.gameState.benchCooldowns[team][unitId] = gameTime + COOLDOWN_DURATION;
    }
    
    /**
     * 🆕 NUEVO: Verifica si una carta del banquillo está en cooldown
     * @param {string} team - Equipo del jugador
     * @param {string} unitId - ID de la unidad
     * @param {number} gameTime - Tiempo del juego en segundos
     * @returns {boolean} True si está en cooldown
     */
    isBenchCardOnCooldown(team, unitId, gameTime) {
        if (!this.gameState.benchCooldowns?.[team]?.[unitId]) {
            return false;
        }
        
        const cooldownEndTime = this.gameState.benchCooldowns[team][unitId];
        return gameTime < cooldownEndTime;
    }
    
    /**
     * 🆕 NUEVO: Obtiene el tiempo restante de cooldown de una carta del banquillo
     * @param {string} team - Equipo del jugador
     * @param {string} unitId - ID de la unidad
     * @param {number} gameTime - Tiempo del juego en segundos
     * @returns {number} Tiempo restante en segundos (0 si no está en cooldown)
     */
    getBenchCooldownRemaining(team, unitId, gameTime) {
        if (!this.gameState.benchCooldowns?.[team]?.[unitId]) {
            return 0;
        }
        
        const cooldownEndTime = this.gameState.benchCooldowns[team][unitId];
        const remaining = cooldownEndTime - gameTime;
        return Math.max(0, remaining);
    }
    
    /**
     * 🆕 NUEVO: Limpia cooldowns de cartas que ya no están en el banquillo
     * @param {string} team - Equipo del jugador
     */
    cleanupBenchCooldowns(team) {
        if (!this.gameState.benchCooldowns?.[team]) {
            return;
        }
        
        const deck = this.getPlayerDeck(team);
        if (!deck || !deck.bench) {
            // Si no hay banquillo, limpiar todos los cooldowns
            this.gameState.benchCooldowns[team] = {};
            return;
        }
        
        // Eliminar cooldowns de cartas que ya no están en el banquillo
        const benchSet = new Set(deck.bench);
        Object.keys(this.gameState.benchCooldowns[team]).forEach(unitId => {
            if (!benchSet.has(unitId)) {
                delete this.gameState.benchCooldowns[team][unitId];
            }
        });
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
    
    /**
     * 🆕 MODULARIZADO: Verifica si un nodo es funcional
     * Un nodo es funcional si está construido, activo, no deshabilitado y no roto
     * @param {Object} node - Nodo del servidor
     * @returns {boolean} True si el nodo es funcional
     */
    isNodeFunctional(node) {
        if (!node) return false;
        
        // Debe estar construido y activo
        if (!node.constructed || !node.active) return false;
        
        // No debe estar deshabilitado ni roto
        if (node.disabled || node.broken) return false;
        
        return true;
    }
    
    /**
     * 🆕 MODULARIZADO: Verifica si un nodo puede proporcionar bonos
     * Similar a isNodeFunctional pero enfocado en bonos de efectos
     * @param {Object} node - Nodo del servidor
     * @returns {boolean} True si el nodo puede proporcionar bonos
     */
    canNodeProvideBonus(node) {
        return this.isNodeFunctional(node);
    }
    
    /**
     * 🆕 MODULARIZADO: Verifica si un nodo puede ser usado (para convoyes, construcciones, etc.)
     * Similar a isNodeFunctional pero puede incluir verificaciones adicionales
     * @param {Object} node - Nodo del servidor
     * @param {boolean} allowBrokenForRepair - Si true, permite nodos rotos (útil para camiones de reparación)
     * @returns {boolean} True si el nodo puede ser usado
     */
    isNodeUsable(node, allowBrokenForRepair = false) {
        if (!node) return false;
        
        // Debe estar construido y activo
        if (!node.constructed || !node.active) return false;
        
        // No debe estar deshabilitado
        if (node.disabled) return false;
        
        // No debe estar roto (a menos que se permita explícitamente para reparación)
        if (node.broken && !allowBrokenForRepair) return false;
        
        return true;
    }
}
