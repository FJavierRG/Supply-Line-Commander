// ===== HANDLER DE CONSTRUCCIÓN =====
import { v4 as uuidv4 } from 'uuid';
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

export class BuildHandler {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Maneja solicitud de construcción
     */
    handleBuild(playerTeam, buildingType, x, y) {
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
                    hq.maxVehicles = (hq.maxVehicles || 4) + bonus;
                    hq.availableVehicles = (hq.availableVehicles || 4) + bonus;
                    console.log(`🚚 TruckFactory completada - ${node.team} HQ ahora tiene ${hq.maxVehicles} vehículos`);
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
        }
        
        // Debug log para FOBs
        if (type === 'fob') {
            console.log(`🏗️ FOB creado ${nodeId} por ${team}: supplies=${initialSupplies}, maxSupplies=${maxSupplies}, hasSupplies=${node.hasSupplies}`);
        }
        
        return node;
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
     */
    isValidLocation(x, y, buildingType) {
        // Obtener radio de detección del edificio que se está construyendo
        const newDetectionRadius = SERVER_NODE_CONFIG.detectionRadius[buildingType] || 
                                 (SERVER_NODE_CONFIG.radius[buildingType] || 30) * 2.5;
        
        // Verificar colisiones con todos los nodos existentes (incluye bases iniciales y edificios construidos)
        for (const node of this.gameState.nodes) {
            if (!node.active) continue;
            
            const dist = Math.hypot(x - node.x, y - node.y);
            
            // Obtener radio de detección del nodo existente
            const existingDetectionRadius = SERVER_NODE_CONFIG.detectionRadius[node.type] || 
                                          (SERVER_NODE_CONFIG.radius[node.type] || 30) * 2.5;
            
            // Verificar colisión: ningún edificio puede estar dentro del área de detección del otro
            const minSeparation = Math.max(existingDetectionRadius, newDetectionRadius);
            
            if (dist < minSeparation) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Verifica si una raza puede construir un tipo de edificio específico
     * @param {string} raceId - ID de la raza
     * @param {string} buildingType - Tipo de edificio
     * @returns {boolean} True si puede construir, false si no
     */
    canBuildBuilding(raceId, buildingType) {
        // Si no hay raza seleccionada, permitir todo (fallback)
        if (!raceId) {
            return true;
        }
        
        // Configuración de edificios permitidos por raza
        const raceBuildingConfig = {
            'A_Nation': {
                // A_Nation puede construir todos los edificios
                allowed: ['fob', 'antiDrone', 'droneLauncher', 'nuclearPlant', 'truckFactory', 'engineerCenter', 'intelRadio', 'campaignHospital']
            },
            'B_Nation': {
                // B_Nation NO puede construir FOBs, pero sí Base Aérea
                allowed: ['antiDrone', 'droneLauncher', 'nuclearPlant', 'truckFactory', 'engineerCenter', 'intelRadio', 'campaignHospital', 'aerialBase']
            }
        };
        
        const config = raceBuildingConfig[raceId];
        if (!config) {
            console.log(`⚠️ Configuración de raza no encontrada: ${raceId}`);
            return true; // Fallback: permitir construcción
        }
        
        const canBuild = config.allowed.includes(buildingType);
        console.log(`🏗️ ${raceId} intenta construir ${buildingType}: ${canBuild ? 'PERMITIDO' : 'DENEGADO'}`);
        
        return canBuild;
    }
}

