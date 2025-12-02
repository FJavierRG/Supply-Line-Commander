// ===== HANDLER DE CONSTRUCCIÓN =====
import { v4 as uuidv4 } from 'uuid';
import { SERVER_NODE_CONFIG, getBuildRadius } from '../../config/serverNodes.js';
import { GAME_CONFIG } from '../../config/gameConfig.js';

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
     * 🆕 SERVIDOR COMO AUTORIDAD: Obtiene efectos temporales (trained, wounded, etc.)
     */
    getTemporaryEffects() {
        return { ...SERVER_NODE_CONFIG.temporaryEffects };
    }
    
    /**
     * 🆕 NUEVO: SERVIDOR COMO AUTORIDAD: Obtiene tipos de vehículos
     */
    getVehicleTypes() {
        return { ...SERVER_NODE_CONFIG.vehicleTypes };
    }
    
    /**
     * 🆕 NUEVO: SERVIDOR COMO AUTORIDAD: Obtiene sistemas de vehículos por tipo de nodo
     */
    getVehicleSystems() {
        return { ...SERVER_NODE_CONFIG.vehicleSystems };
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Obtiene radios de detección (CRÍTICO PARA SEGURIDAD)
     */
    getDetectionRadii() {
        return { ...SERVER_NODE_CONFIG.detectionRadius };
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Obtiene rangos de acción de edificios
     */
    getRanges() {
        return { ...SERVER_NODE_CONFIG.ranges };
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
     * ✅ SERVIDOR COMO AUTORIDAD: Obtiene requisitos de construcción y acciones
     */
    getBuildRequirements() {
        return { ...SERVER_NODE_CONFIG.buildRequirements };
    }
    
    /**
     * 🆕 SERVIDOR COMO AUTORIDAD: Obtiene configuración de nodos especiales
     */
    getSpecialNodes() {
        return { ...SERVER_NODE_CONFIG.specialNodes };
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
        
        // Verificar currency (considerando disciplinas)
        const spendCheck = this.gameState.canSpendCurrency(playerTeam, cost);
        if (!spendCheck.canSpend) {
            return { success: false, reason: spendCheck.reason };
        }
        
        // 🎯 NUEVO: Validar construcción según mazo del jugador
        if (!this.canBuildBuilding(playerTeam, buildingType)) {
            return { success: false, reason: 'Tu mazo no incluye este edificio' };
        }
        
        // 🆕 NUEVO: Validar límites de construcción por equipo (maxPerGame por bando)
        const buildLimit = SERVER_NODE_CONFIG.buildLimits?.[buildingType];
        if (buildLimit && buildLimit.maxPerGame) {
            // Contar cuántas instancias de este edificio ya tiene este equipo (construidas o en construcción)
            const existingCount = this.gameState.nodes.filter(n => 
                n.type === buildingType && 
                n.team === playerTeam &&
                n.active && 
                !n.isAbandoning
            ).length;
            
            if (existingCount >= buildLimit.maxPerGame) {
                const buildingName = SERVER_NODE_CONFIG.descriptions[buildingType]?.name || buildingType;
                console.log(`❌ Construcción rechazada: ${playerTeam} ya tiene ${buildLimit.maxPerGame} ${buildingName} construida(s)`);
                return { success: false, reason: `Solo puedes tener ${buildLimit.maxPerGame} ${buildingName} construida` };
            }
        }
        
        // 🆕 NUEVO: Validar requisitos de construcción (edificios requeridos)
        const requirements = SERVER_NODE_CONFIG.buildRequirements?.[buildingType];
        if (requirements && requirements.required) {
            const missingRequirements = [];
            
            for (const requiredType of requirements.required) {
                const hasRequired = this.gameState.nodes.some(n => 
                    n.type === requiredType && 
                    n.team === playerTeam && 
                    n.constructed && 
                    !n.isAbandoning &&
                    n.active
                );
                
                if (!hasRequired) {
                    missingRequirements.push(requiredType);
                }
            }
            
            if (missingRequirements.length > 0) {
                const buildingName = SERVER_NODE_CONFIG.descriptions[buildingType]?.name || buildingType;
                const missingNames = missingRequirements.map(t => 
                    SERVER_NODE_CONFIG.descriptions[t]?.name || t
                ).join(', ');
                
                console.log(`❌ Construcción rechazada: ${buildingName} requiere ${missingNames} (${playerTeam})`);
                return { success: false, reason: `Requiere: ${missingNames}` };
            }
        }
        
        // Validar que esté dentro del territorio del jugador
        const inOwnTerritory = this.gameState.territoryCalculator.isInTeamTerritory(x, playerTeam);
        
        // 🆕 NUEVO: Permitir construcción en territorio enemigo si hay un camera drone cerca
        // Solo para edificios específicos: vigilanceTower, specopsCommando, truckAssault
        const canBuildInEnemyTerritory = ['vigilanceTower', 'specopsCommando', 'truckAssault'].includes(buildingType);
        
        if (!inOwnTerritory) {
            if (canBuildInEnemyTerritory && this.gameState.cameraDroneSystem) {
                // Verificar si hay un camera drone que permita construir aquí
                const canBuild = this.gameState.cameraDroneSystem.canBuildInEnemyTerritory(x, y, playerTeam);
                if (canBuild) {
                    console.log(`✅ Construcción permitida en territorio enemigo por camera drone (${playerTeam} en x=${x})`);
                    // Continuar con la validación
                } else {
                    console.log(`❌ Construcción rechazada: fuera de territorio y sin camera drone cercano (${playerTeam} en x=${x})`);
                    return { success: false, reason: 'Fuera de tu territorio. Necesitas un camera drone cercano para construir aquí.' };
                }
            } else {
                console.log(`❌ Construcción rechazada: fuera de territorio (${playerTeam} en x=${x})`);
                return { success: false, reason: 'Fuera de tu territorio' };
            }
        }
        
        // 🆕 NUEVO: Validar que el taller de drones o taller de vehículos esté en el área de construcción de un FOB aliado
        if (buildingType === 'droneWorkshop' || buildingType === 'vehicleWorkshop') {
            const buildingName = buildingType === 'droneWorkshop' ? 'taller de drones' : 'taller de vehículos';
            if (!this.isInFobBuildArea(x, y, playerTeam)) {
                console.log(`❌ Construcción rechazada: ${buildingName} debe estar en el área de construcción de un FOB aliado (${playerTeam} en x=${x}, y=${y})`);
                return { success: false, reason: `El ${buildingName} solo se puede construir en el área de construcción de FOBs aliados` };
            }
        }
        
        // Validar colisiones con otros edificios usando detectionRadius
        // Pasar playerTeam para que isValidLocation pueda identificar FOBs aliados
        if (!this.isValidLocation(x, y, buildingType, { playerTeam })) {
            console.log(`❌ Construcción rechazada: muy cerca de otro edificio (${buildingType} en x=${x}, y=${y})`);
            return { success: false, reason: 'Muy cerca de otro edificio' };
        }
        
        // Descontar currency y emitir evento visual
        const spendResult = this.gameState.spendCurrency(playerTeam, cost, `build_${buildingType}`);
        if (!spendResult.success) {
            return { success: false, reason: spendResult.reason || 'Currency insuficiente' };
        }
        
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
                // 🆕 FIX: El efecto de truckFactory se maneja en CommandoSystem.recalculateHQVehicles()
                // para evitar duplicación y manejar correctamente cuando se habilita/deshabilita
                // Solo necesitamos disparar el recálculo
                if (this.gameState.commandoSystem) {
                    this.gameState.commandoSystem.recalculateHQVehicles();
                }
                break;
                
            case 'engineerCenter':
                // El bonus de velocidad se aplica automáticamente al calcular velocidad de convoyes
                const engineerConfig = SERVER_NODE_CONFIG.effects.engineerCenter;
                const speedMultiplier = engineerConfig.speedMultiplier;
                console.log(`🔧 EngineerCenter completado - ${node.team} tendrá +${(speedMultiplier - 1) * 100}% velocidad en ${engineerConfig.affectedVehicles.join(', ')}`);
                break;
                
            case 'nuclearPlant':
                // El bonus de currency se aplica automáticamente en el loop de currency
                const incomeBonus = SERVER_NODE_CONFIG.effects.nuclearPlant.incomeBonus;
                console.log(`⚡ NuclearPlant completada - ${node.team} recibirá +${incomeBonus}$/s`);
                break;
                
            case 'physicStudies':
                // El bonus a plantas nucleares se aplica automáticamente en el loop de currency
                const physicStudiesConfig = SERVER_NODE_CONFIG.effects.physicStudies;
                console.log(`🔬 Estudios de Física completados - ${node.team} recibirá +${physicStudiesConfig.nuclearPlantBonus}$/s adicional por cada planta nuclear`);
                break;
                
            case 'secretLaboratory':
                // El bonus a plantas nucleares se aplica automáticamente en el loop de currency
                // Este bonus es independiente de Estudios de Física (se acumula con él)
                const secretLaboratoryConfig = SERVER_NODE_CONFIG.effects.secretLaboratory;
                console.log(`🔬 Laboratorio Secreto completado - ${node.team} recibirá +${secretLaboratoryConfig.nuclearPlantBonus}$/s adicional por cada planta nuclear (acumulable con Estudios de Física)`);
                break;
                
            case 'trainingCamp':
                // 🆕 NUEVO: Aplicar efecto "trained" a todos los frentes del jugador
                this.applyTrainedEffectToFronts(node.team);
                const trainedConfig = SERVER_NODE_CONFIG.temporaryEffects.trained;
                console.log(`🎓 Campo de Entrenamiento completado - ${node.team} ahora tiene efecto "trained" en todos sus frentes (+${trainedConfig.currencyBonus}$ por avance)`);
                break;
                
            case 'deadlyBuild':
                // Desbloquea el consumible "Destructor de mundos" en la tienda
                console.log(`☠️ Construcción Prohibida completada - ${node.team} ahora puede comprar "Destructor de mundos" en la tienda`);
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
                    const intelConfig = SERVER_NODE_CONFIG.gameplay.intelRadio;
                    const intelCost = SERVER_NODE_CONFIG.costs.intelRadio || 70;
                    const totalReturn = intelCost + intelConfig.investmentBonus;
                    console.log(`💰 intelRadio ${node.id} iniciando inversión - ${node.investmentTime}s para obtener ${totalReturn}$ (costo: ${intelCost}$ + beneficio: ${intelConfig.investmentBonus}$)`);
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
     * 🆕 NUEVO: Aplica el efecto "trained" a todos los frentes del jugador
     * @param {string} team - Equipo del jugador ('player1' o 'player2')
     */
    applyTrainedEffectToFronts(team) {
        const trainedConfig = SERVER_NODE_CONFIG.temporaryEffects.trained;
        const playerFronts = this.gameState.nodes.filter(n => 
            n.type === 'front' && 
            n.team === team
        );
        
        for (const front of playerFronts) {
            // Verificar si ya tiene el efecto "trained" activo
            const existingTrained = front.effects?.find(e => 
                e.type === 'trained' && 
                (!e.expiresAt || this.gameState.gameTime < e.expiresAt)
            );
            
            if (!existingTrained) {
                // Añadir efecto "trained" (permanente, no expira)
                if (!front.effects) front.effects = [];
                
                front.effects.push({
                    type: 'trained',
                    icon: trainedConfig.icon,
                    tooltip: trainedConfig.tooltip,
                    expiresAt: null // Permanente
                });
                
                console.log(`🎓 Efecto "trained" aplicado a frente ${front.id} de ${team}`);
            }
        }
    }
    
    /**
     * Crea un nodo del servidor
     */
    createNode(type, team, x, y, supplies = null) {
        const nodeId = `node_${uuidv4().substring(0, 8)}`;
        
        // ✅ Establecer valores por defecto según tipo de nodo (lee de capacities)
        let initialSupplies = supplies;
        let maxSupplies = supplies;
        
        if (supplies === null) {
            // Valores por defecto según tipo
            const capacity = SERVER_NODE_CONFIG.capacities[type];
            if (type === 'fob') {
                // ✅ CONFIGURACIÓN CENTRALIZADA: Leer desde gameConfig (FOBs construidos manualmente)
                const fobConfig = GAME_CONFIG.initialNodes.fob || {};
                initialSupplies = fobConfig.builtSupplies ?? 30;
                maxSupplies = fobConfig.maxSupplies ?? (capacity?.maxSupplies ?? 100);
            } else if (type === 'front') {
                initialSupplies = capacity?.maxSupplies ?? 100;
                maxSupplies = capacity?.maxSupplies ?? 100;
            } else if (type === 'hq') {
                initialSupplies = null; // Infinitos
                maxSupplies = null;
            } else if (capacity?.maxSupplies) {
                // Si tiene maxSupplies definido en capacities, usarlo
                maxSupplies = capacity.maxSupplies;
                initialSupplies = capacity.maxSupplies;
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
            // ✅ hasVehicles y maxVehicles ya están establecidos por los métodos helper
            node.availableVehicles = this.getInitialVehicles(type);
            node.actionRange = 240; // rango del hospital
            node.canDispatchMedical = true;
            node.lastAutoResponse = 0; // Para cooldown de respuesta automática
        } else if (type === 'aerialBase') {
            // 🆕 NUEVO: Base Aérea - suministros limitados para recarga de helicópteros
            // ✅ hasSupplies y maxSupplies ya están establecidos por los métodos helper y createNode
            const aerialConfig = SERVER_NODE_CONFIG.effects.aerialBase;
            node.supplies = node.maxSupplies; // Iniciar con suministros máximos (ya establecido arriba)
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
            // ✅ Propiedades específicas para intelRadio (lee de gameplay.intelRadio)
            const intelConfig = SERVER_NODE_CONFIG.gameplay.intelRadio;
            const intelCost = SERVER_NODE_CONFIG.costs.intelRadio || 70;
            node.investmentTime = intelConfig.investmentTime;
            // ✅ Calcular investmentReturn como costo + beneficio
            node.investmentReturn = intelCost + intelConfig.investmentBonus;
            node.investmentTimer = 0;
            node.investmentStarted = false;
            node.investmentCompleted = false;
            node.isAbandoning = false;
            node.abandonPhase = 0;
            node.abandonPhase1Duration = 500; // 0.5 segundos (rápido)
            node.abandonPhase2Duration = 500; // 0.5 segundos (rápido)
        } else if (type === 'specopsCommando') {
            // 🆕 NUEVO: Propiedades del comando especial operativo
            // ✅ hasSupplies y hasVehicles ya están establecidos por los métodos helper (ambos false por defecto)
            const commandoConfig = SERVER_NODE_CONFIG.specialNodes?.specopsCommando || {};
            node.isCommando = true;
            node.detectionRadius = commandoConfig.detectionRadius || 200;
            node.health = commandoConfig.health || 50;
            node.maxHealth = commandoConfig.health || 50;
            node.constructed = true; // No necesita construcción
            node.isConstructing = false;
        } else if (type === 'truckAssault') {
            // 🆕 NUEVO: Propiedades del truck assault
            // ✅ hasSupplies y hasVehicles ya están establecidos por los métodos helper (ambos false por defecto)
            const truckAssaultConfig = SERVER_NODE_CONFIG.specialNodes?.truckAssault || {};
            node.isTruckAssault = true;
            node.detectionRadius = truckAssaultConfig.detectionRadius || 200;
            node.health = truckAssaultConfig.health || 50;
            node.maxHealth = truckAssaultConfig.health || 50;
            node.constructed = true; // No necesita construcción
            node.isConstructing = false;
        } else if (type === 'vigilanceTower') {
            // 🆕 NUEVO: Torre de Vigilancia - counterea comandos
            // ✅ hasSupplies y hasVehicles ya están establecidos por los métodos helper (ambos false por defecto)
            node.isVigilanceTower = true;
            node.detectionRadius = SERVER_NODE_CONFIG.detectionRadius.vigilanceTower || 320;
            
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
        const detectionRadius = tower.detectionRadius || 320;
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
     * ✅ Determina si un tipo de nodo tiene suministros (lee de capacities)
     */
    hasSupplies(type) {
        return SERVER_NODE_CONFIG.capacities[type]?.hasSupplies ?? false;
    }
    
    /**
     * ✅ Determina si un tipo de nodo tiene vehículos (lee de capacities)
     */
    hasVehicles(type) {
        return SERVER_NODE_CONFIG.capacities[type]?.hasVehicles ?? false;
    }
    
    /**
     * ✅ Obtiene vehículos iniciales según tipo de nodo (lee de capacities)
     */
    getInitialVehicles(type) {
        return SERVER_NODE_CONFIG.capacities[type]?.maxVehicles ?? 0;
    }
    
    /**
     * ✅ Helper centralizado: Verifica si una posición está en el área de construcción de un FOB aliado
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @param {string} playerTeam - Equipo del jugador
     * @returns {boolean} True si está en el área de construcción de un FOB aliado
     */
    isInFobBuildArea(x, y, playerTeam) {
        const fobBuildRadius = getBuildRadius('fob'); // Radio de construcción del FOB (140px)
        const nearbyFOBs = this.gameState.nodes.filter(n => 
            n.type === 'fob' && 
            n.team === playerTeam && 
            n.active && 
            n.constructed &&
            !n.isAbandoning
        );
        
        for (const fob of nearbyFOBs) {
            const dist = Math.hypot(x - fob.x, y - fob.y);
            if (dist <= fobBuildRadius) {
                return true;
            }
        }
        
        return false;
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
        const { ignoreDetectionLimits = false, allowEnemyTerritory = false, playerTeam = null } = options;
        
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
        
        // 🆕 NUEVO: La torre de vigilancia puede construirse incluso si hay comandos enemigos cerca
        // (su propósito es eliminarlos, así que no debe estar bloqueada por ellos)
        const isVigilanceTower = buildingType === 'vigilanceTower';
        
        // 🆕 NUEVO: El taller de drones puede construirse cerca de FOBs aliados
        // (debe estar dentro del área de detección del FOB, así que no debe estar bloqueado por ellos)
        const isDroneWorkshop = buildingType === 'droneWorkshop';
        
        // 🆕 NUEVO: El taller de vehículos puede construirse cerca de FOBs aliados
        // (debe estar dentro del área de detección del FOB, así que no debe estar bloqueado por ellos)
        const isVehicleWorkshop = buildingType === 'vehicleWorkshop';
        
        // Lógica normal de detección
        // ✅ Usar función helper centralizada para obtener buildRadius con fallback
        const newBuildRadius = getBuildRadius(buildingType);
        
        // Verificar colisiones con todos los nodos existentes (incluye bases iniciales y edificios construidos)
        for (const node of this.gameState.nodes) {
            if (!node.active) continue;
            
            // 🆕 NUEVO: Si estamos construyendo una torre de vigilancia, ignorar comandos enemigos
            if (isVigilanceTower && node.isCommando) {
                // Solo verificar colisión física básica con comandos (no área de detección)
                const dist = Math.hypot(x - node.x, y - node.y);
                const minPhysicalSeparation = (SERVER_NODE_CONFIG.radius[buildingType] || 35) + 
                                             (SERVER_NODE_CONFIG.radius[node.type] || 25);
                if (dist < minPhysicalSeparation) {
                    return false; // Solo bloquear si hay colisión física directa
                }
                continue; // Saltar la verificación de área de detección para comandos
            }
            
            // 🆕 NUEVO: Si estamos construyendo un taller de drones o taller de vehículos, ignorar FOBs aliados en la validación de colisiones
            // (la validación de estar en el área del FOB se hace antes de llamar a isValidLocation)
            if ((isDroneWorkshop || isVehicleWorkshop) && node.type === 'fob' && playerTeam && node.team === playerTeam && 
                node.constructed && !node.isAbandoning) {
                // Solo verificar colisión física básica con FOBs aliados (no área de construcción)
                const dist = Math.hypot(x - node.x, y - node.y);
                const minPhysicalSeparation = (SERVER_NODE_CONFIG.radius[buildingType] || 35) + 
                                             (SERVER_NODE_CONFIG.radius[node.type] || 40);
                if (dist < minPhysicalSeparation) {
                    return false; // Solo bloquear si hay colisión física directa
                }
                continue; // Saltar la verificación de área de construcción para FOBs aliados
            }
            
            const dist = Math.hypot(x - node.x, y - node.y);
            
            // ✅ Obtener radio de construcción del nodo existente usando función helper centralizada
            const existingBuildRadius = getBuildRadius(node.type);
            
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
     * 🎯 ACTUALIZADO: Ahora usa el mazo del jugador en lugar de la raza
     * @param {string} team - Equipo del jugador (player1/player2)
     * @param {string} buildingType - Tipo de edificio
     * @returns {boolean} True si puede construir, false si no
     */
    canBuildBuilding(team, buildingType) {
        // 🎯 NUEVO: Usar mazo del jugador si está disponible
        const deck = this.gameState.getPlayerDeck(team);
        
        if (deck && deck.units) {
            // 🆕 NUEVO: Verificar tanto en el mazo principal como en el banquillo
            const isInDeck = deck.units.includes(buildingType);
            const isInBench = deck.bench && deck.bench.includes(buildingType);
            const canBuild = isInDeck || isInBench;
            
            if (!canBuild) {
                // 🆕 NUEVO: Log detallado cuando se deniega la construcción
                console.log(`🚫 ${team} (mazo "${deck.name}") NO puede construir ${buildingType}`);
                console.log(`   📋 Unidades en el mazo: [${deck.units.join(', ')}]`);
                if (deck.bench && deck.bench.length > 0) {
                    console.log(`   📋 Unidades en el banquillo: [${deck.bench.join(', ')}]`);
                } else {
                    console.log(`   📋 Banquillo vacío`);
                }
                console.log(`   🔍 Buscando: ${buildingType}`);
            } else {
                const location = isInDeck ? 'mazo' : 'banquillo';
                console.log(`✅ ${team} (mazo "${deck.name}") puede construir ${buildingType} (en ${location})`);
            }
            return canBuild;
        }
        
        // ✅ ELIMINADO: Ya no hay fallback por raza, siempre hay mazo
        // Si no hay mazo, permitir construcción (fallback de seguridad)
        console.log(`⚠️ No hay mazo para ${team}, permitiendo construcción (fallback de seguridad)`);
        return true;
    }
}

