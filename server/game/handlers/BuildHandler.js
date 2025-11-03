// ===== HANDLER DE CONSTRUCCIÓN =====
import { v4 as uuidv4 } from 'uuid';
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';
import { getServerRaceBuildings } from '../../config/raceConfig.js';

export class BuildHandler {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Obtiene costos de edificios
     */
    getBuildingCosts() {
        return { ...SERVER_NODE_CONFIG.costs };
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Obtiene tiempos de construcción
     */
    getBuildingTimes() {
        return { ...SERVER_NODE_CONFIG.buildTimes };
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Obtiene efectos de edificios
     */
    getBuildingEffects() {
        return { ...SERVER_NODE_CONFIG.effects };
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Obtiene descripciones de edificios
     */
    getBuildingDescriptions() {
        return { ...SERVER_NODE_CONFIG.descriptions };
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Obtiene capacidades dinámicas
     */
    getBuildingCapacities() {
        return { ...SERVER_NODE_CONFIG.capacities };
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Obtiene bonuses de edificios
     */
    getBuildingBonuses() {
        return { ...SERVER_NODE_CONFIG.bonuses };
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Obtiene propiedades de gameplay
     */
    getGameplayProperties() {
        return { ...SERVER_NODE_CONFIG.gameplay };
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Obtiene radios de construcción (proximidad para evitar stacking)
     */
    getBuildRadii() {
        return { ...SERVER_NODE_CONFIG.buildRadius };
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Obtiene radios de detección (CRÍTICO PARA SEGURIDAD)
     */
    getDetectionRadii() {
        return { ...SERVER_NODE_CONFIG.detectionRadius };
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Obtiene propiedades de seguridad (ANTI-HACK)
     */
    getSecurityProperties() {
        return { ...SERVER_NODE_CONFIG.security };
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Obtiene propiedades de comportamiento críticas
     */
    getBehaviorProperties() {
        return {
            enabled: SERVER_NODE_CONFIG.gameplay.enabled,
            behavior: SERVER_NODE_CONFIG.gameplay.behavior
        };
    }
    
    /**
     * Maneja solicitud de construcción
     */
    handleBuild(playerTeam, buildingType, x, y) {
        // 🆕 NUEVO: Verificar si el edificio está habilitado
        const enabled = SERVER_NODE_CONFIG.gameplay.enabled[buildingType];
        if (enabled === false) {
            console.log(`🚫 Construcción rechazada: ${buildingType} está deshabilitado`);
            return { success: false, reason: 'Edificio deshabilitado' };
        }
        
        // Obtener costo del edificio desde configuración
        const cost = SERVER_NODE_CONFIG.costs[buildingType];
        if (!cost) {
            return { success: false, reason: 'Tipo de edificio inválido' };
        }
        
        // Verificar currency
        if (this.gameState.currency[playerTeam] < cost) {
            return { success: false, reason: 'Currency insuficiente' };
        }
        
        // 🆕 NUEVO: Validar construcción según raza del jugador
        const playerRace = this.gameState.getPlayerRace(playerTeam);
        if (!this.canBuildBuilding(playerRace, buildingType)) {
            return { success: false, reason: 'Tu nación no puede construir este edificio' };
        }
        
        // Validar que esté dentro del territorio del jugador
        const inOwnTerritory = this.gameState.territoryCalculator.isInTeamTerritory(x, playerTeam);
        if (!inOwnTerritory) {
            console.log(`❌ Construcción rechazada: fuera de territorio (${playerTeam} en x=${x})`);
            return { success: false, reason: 'Fuera de tu territorio' };
        }
        
        // Validar colisiones con otros edificios usando detectionRadius
        if (!this.isValidLocation(x, y, buildingType)) {
            console.log(`❌ Construcción rechazada: muy cerca de otro edificio (${buildingType} en x=${x}, y=${y})`);
            return { success: false, reason: 'Muy cerca de otro edificio' };
        }
        
        // Descontar currency
        this.gameState.currency[playerTeam] -= cost;
        
        // Crear nodo
        const node = this.createNode(buildingType, playerTeam, x, y);
        node.isConstructing = true;
        node.constructed = false;
        node.constructionTime = SERVER_NODE_CONFIG.buildTimes[buildingType] || 2;
        node.constructionTimer = 0;
        
        this.gameState.nodes.push(node);
        
        return { success: true, node };
    }
    
    /**
     * Aplica efectos de edificios cuando se completan
     */
    applyBuildingEffects(node) {
        if (!node || !node.constructed) return;
        
        switch(node.type) {
            case 'truckFactory':
                // Añadir vehículo al HQ del equipo
                const hq = this.gameState.nodes.find(n => n.type === 'hq' && n.team === node.team);
                const bonus = SERVER_NODE_CONFIG.effects.truckFactory.vehicleBonus;
                if (hq && hq.hasVehicles) {
                    const oldMax = hq.maxVehicles || 4;
                    hq.maxVehicles = oldMax + bonus;
                    // Solo ajustar availableVehicles si excede el nuevo máximo, NO aumentar directamente
                    // Esto evita reponer camiones desplegados
                    if (hq.availableVehicles > hq.maxVehicles) {
                        hq.availableVehicles = hq.maxVehicles;
                    }
                    console.log(`🚚 TruckFactory completada - ${node.team} HQ ahora tiene ${hq.maxVehicles} vehículos máximos (disponibles: ${hq.availableVehicles})`);
                }
                break;
                
            case 'engineerCenter':
                // El bonus de velocidad se aplica automáticamente al calcular velocidad de convoyes
                const speedBonus = SERVER_NODE_CONFIG.effects.engineerCenter.speedBonus;
                console.log(`🔧 EngineerCenter completado - ${node.team} tendrá +${speedBonus * 100}% velocidad en convoyes`);
                break;
                
            case 'nuclearPlant':
                // El bonus de currency se aplica automáticamente en el loop de currency
                const incomeBonus = SERVER_NODE_CONFIG.effects.nuclearPlant.incomeBonus;
                console.log(`⚡ NuclearPlant completada - ${node.team} recibirá +${incomeBonus}$/s`);
                break;
                
            case 'campaignHospital':
                // El hospital puede enviar ambulancias (implementado en handleMedicalRequest)
                console.log(`🏥 CampaignHospital completado - ${node.team} puede enviar ambulancias desde este hospital`);
                
                // Notificar al hospital sobre emergencias activas
                if (this.gameState.medicalSystem) {
                    this.gameState.medicalSystem.notifyNewHospital(node);
                }
                break;
                
            case 'intelRadio':
                // Iniciar sistema de inversión para intelRadio
                if (node.investmentTime > 0) {
                    node.investmentStarted = true;
                    node.investmentTimer = 0;
                    console.log(`💰 intelRadio ${node.id} iniciando inversión - ${node.investmentTime}s para obtener ${node.investmentReturn}$`);
                }
                break;
                
            case 'vigilanceTower':
                // 🆕 NUEVO: Eliminar comandos enemigos dentro del área cuando se completa la construcción
                this.eliminateEnemyCommandosInRange(node);
                console.log(`🗼 Torre de Vigilancia ${node.id} completada - protegiendo área de ${node.detectionRadius || 140}px`);
                break;
        }
    }
    
    /**
     * Crea un nodo del servidor
     */
    createNode(type, team, x, y, supplies = null) {
        const nodeId = `node_${uuidv4().substring(0, 8)}`;
        
        // Establecer valores por defecto según tipo de nodo
        let initialSupplies = supplies;
        let maxSupplies = supplies;
        
        if (supplies === null) {
            // Valores por defecto según tipo
            if (type === 'fob') {
                initialSupplies = 0;
                maxSupplies = 100;
            } else if (type === 'front') {
                initialSupplies = 100;
                maxSupplies = 100;
            } else if (type === 'hq') {
                initialSupplies = null; // Infinitos
                maxSupplies = null;
            }
        }
        
        const node = {
            id: nodeId,
            type: type,
            team: team,
            x: x,
            y: y,
            active: true,
            category: this.getNodeCategory(type),
            hasSupplies: this.hasSupplies(type),
            hasVehicles: this.hasVehicles(type),
            supplies: initialSupplies,
            maxSupplies: maxSupplies,
            availableVehicles: this.getInitialVehicles(type),
            maxVehicles: this.getInitialVehicles(type),
            constructed: type === 'hq' || type === 'front' || type === 'fob', // HQ, frentes y FOBs ya están construidos
            isConstructing: false
        };
        
        // Propiedades específicas por tipo de edificio
        if (type === 'campaignHospital') {
            node.hasVehicles = true;
            node.maxVehicles = 1;
            node.availableVehicles = 1;
            node.actionRange = 240; // rango del hospital
            node.canDispatchMedical = true;
            node.lastAutoResponse = 0; // Para cooldown de respuesta automática
        } else if (type === 'aerialBase') {
            // 🆕 NUEVO: Base Aérea - suministros limitados para recarga de helicópteros
            const aerialConfig = SERVER_NODE_CONFIG.effects.aerialBase;
            node.hasSupplies = true;
            node.supplies = aerialConfig.maxSupplies; // Iniciar con suministros máximos
            node.maxSupplies = aerialConfig.maxSupplies;
            node.isAerialBase = true;
            node.autoDestroy = aerialConfig.autoDestroy;
            node.landedHelicopters = []; // Array para helicópteros aterrizados
            // Propiedades de abandono
            node.isAbandoning = false;
            node.abandonPhase = 0;
            node.abandonPhase1Duration = 2000; // 2 segundos - fase 1
            node.abandonPhase2Duration = 3000; // 3 segundos - fase 2
            console.log(`🚁 AerialBase creada ${nodeId} por ${team}: supplies=${node.supplies}/${node.maxSupplies}`);
        } else if (type === 'intelRadio') {
            // Propiedades específicas para intelRadio
            const intelConfig = SERVER_NODE_CONFIG.effects.intelRadio;
            node.investmentTime = intelConfig.investmentTime;
            node.investmentReturn = intelConfig.investmentReturn;
            node.investmentTimer = 0;
            node.investmentStarted = false;
            node.investmentCompleted = false;
            node.isAbandoning = false;
            node.abandonPhase = 0;
            node.abandonPhase1Duration = 500; // 0.5 segundos (rápido)
            node.abandonPhase2Duration = 500; // 0.5 segundos (rápido)
        } else if (type === 'specopsCommando') {
            // 🆕 NUEVO: Propiedades del comando especial operativo
            const commandoConfig = SERVER_NODE_CONFIG.specialNodes?.specopsCommando || {};
            node.isCommando = true;
            node.detectionRadius = commandoConfig.detectionRadius || 200;
            node.health = commandoConfig.health || 50;
            node.maxHealth = commandoConfig.health || 50;
            node.hasSupplies = false;
            node.hasVehicles = false;
            node.constructed = true; // No necesita construcción
            node.isConstructing = false;
        } else if (type === 'vigilanceTower') {
            // 🆕 NUEVO: Torre de Vigilancia - counterea comandos
            node.isVigilanceTower = true;
            node.detectionRadius = SERVER_NODE_CONFIG.detectionRadius.vigilanceTower || 400;
            node.hasSupplies = false;
            node.hasVehicles = false;
            
            // Eliminar comandos enemigos dentro del área de detección
            this.eliminateEnemyCommandosInRange(node);
        }
        
        // Debug log para FOBs
        if (type === 'fob') {
            console.log(`🏗️ FOB creado ${nodeId} por ${team}: supplies=${initialSupplies}, maxSupplies=${maxSupplies}, hasSupplies=${node.hasSupplies}`);
        }
        
        return node;
    }
    
    /**
     * 🆕 NUEVO: Elimina comandos enemigos dentro del área de detección de la torre
     * @param {Object} tower - Nodo de la torre de vigilancia
     */
    eliminateEnemyCommandosInRange(tower) {
        const detectionRadius = tower.detectionRadius || 400;
        const towerTeam = tower.team;
        
        // Buscar comandos enemigos dentro del área
        const enemyCommandos = this.gameState.nodes.filter(node => 
            node.isCommando &&
            node.team !== towerTeam &&
            node.active &&
            node.constructed &&
            !node.isAbandoning
        );
        
        const eliminated = [];
        for (const commando of enemyCommandos) {
            const dist = Math.hypot(commando.x - tower.x, commando.y - tower.y);
            
            if (dist <= detectionRadius) {
                // Eliminar el comando
                commando.active = false;
                commando.isAbandoning = true;
                eliminated.push(commando.id);
                
                console.log(`🗑️ Torre de Vigilancia ${tower.id} eliminó comando enemigo ${commando.id} en (${commando.x.toFixed(0)}, ${commando.y.toFixed(0)})`);
            }
        }
        
        if (eliminated.length > 0) {
            console.log(`🗑️ Torre de Vigilancia ${tower.id} eliminó ${eliminated.length} comando(s) enemigo(s)`);
        }
    }
    
    /**
     * Determina la categoría de un nodo
     */
    getNodeCategory(type) {
        if (type === 'hq' || type === 'fob') return 'map_node';
        if (type === 'front') return 'front';
        return 'buildable';
    }
    
    /**
     * Determina si un tipo de nodo tiene suministros
     */
    hasSupplies(type) {
        return type === 'hq' || type === 'fob' || type === 'front' || type === 'aerialBase';
    }
    
    /**
     * Determina si un tipo de nodo tiene vehículos
     */
    hasVehicles(type) {
        return type === 'hq' || type === 'fob' || type === 'campaignHospital';
    }
    
    /**
     * Obtiene vehículos iniciales según tipo de nodo
     */
    getInitialVehicles(type) {
        if (type === 'hq') return 4;
        if (type === 'fob') return 2;
        if (type === 'campaignHospital') return 1;
        return 0;
    }
    
    /**
     * Verifica si una ubicación es válida para construir (sin colisiones)
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     * @param {string} buildingType - Tipo de edificio
     * @param {Object} options - Opciones adicionales
     * @param {boolean} options.ignoreDetectionLimits - Si es true, ignora límites de detección (para specopsCommando)
     * @param {boolean} options.allowEnemyTerritory - Si es true, permite construir en territorio enemigo
     * @returns {boolean} True si la ubicación es válida
     */
    isValidLocation(x, y, buildingType, options = {}) {
        const { ignoreDetectionLimits = false, allowEnemyTerritory = false } = options;
        
        // Si ignoreDetectionLimits está activado, solo verificar colisiones físicas básicas (no áreas de detección)
        if (ignoreDetectionLimits) {
            // Solo verificar que no haya otro nodo exactamente en la misma posición
            for (const node of this.gameState.nodes) {
                if (!node.active) continue;
                
                const dist = Math.hypot(x - node.x, y - node.y);
                const minSeparation = (SERVER_NODE_CONFIG.radius[buildingType] || 25) + 
                                    (SERVER_NODE_CONFIG.radius[node.type] || 30);
                
                if (dist < minSeparation) {
                    return false;
                }
            }
            return true;
        }
        
        // Lógica normal de detección
        // 🆕 NUEVO: Usar buildRadius para construcción (proximidad), detectionRadius para detección de comandos
        // Obtener radio de construcción del edificio que se está construyendo
        const newBuildRadius = SERVER_NODE_CONFIG.buildRadius?.[buildingType] || 
                              SERVER_NODE_CONFIG.detectionRadius[buildingType] || 
                              (SERVER_NODE_CONFIG.radius[buildingType] || 30) * 2.5;
        
        // Verificar colisiones con todos los nodos existentes (incluye bases iniciales y edificios construidos)
        for (const node of this.gameState.nodes) {
            if (!node.active) continue;
            
            const dist = Math.hypot(x - node.x, y - node.y);
            
            // Obtener radio de construcción del nodo existente (usar buildRadius si existe)
            const existingBuildRadius = SERVER_NODE_CONFIG.buildRadius?.[node.type] || 
                                       SERVER_NODE_CONFIG.detectionRadius[node.type] || 
                                       (SERVER_NODE_CONFIG.radius[node.type] || 30) * 2.5;
            
            // Verificar colisión: ningún edificio puede estar dentro del área de construcción del otro
            const minSeparation = Math.max(existingBuildRadius, newBuildRadius);
            
            if (dist < minSeparation) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Verifica si una raza puede construir un tipo de edificio específico
     * 🎯 CORREGIDO: Usa configuración centralizada de raceConfig (SERVIDOR COMO AUTORIDAD)
     * @param {string} raceId - ID de la raza
     * @param {string} buildingType - Tipo de edificio
     * @returns {boolean} True si puede construir, false si no
     */
    canBuildBuilding(raceId, buildingType) {
        // Si no hay raza seleccionada, permitir todo (fallback)
        if (!raceId) {
            return true;
        }
        
        // 🎯 USAR CONFIGURACIÓN CENTRALIZADA: Obtener edificios disponibles desde raceConfig
        const availableBuildings = getServerRaceBuildings(raceId);
        
        if (!availableBuildings || availableBuildings.length === 0) {
            console.log(`⚠️ Configuración de raza no encontrada o sin edificios: ${raceId}`);
            return true; // Fallback: permitir construcción
        }
        
        const canBuild = availableBuildings.includes(buildingType);
        console.log(`🏗️ ${raceId} intenta construir ${buildingType}: ${canBuild ? 'PERMITIDO' : 'DENEGADO'} (disponibles: ${availableBuildings.join(', ')})`);
        
        return canBuild;
    }
}

