// ===== HANDLER DE ACCIONES DE IA =====
// Ejecuta decisiones tomadas por la IA

import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';
import AIConfig from '../ai/config/AIConfig.js';

export class AIActionHandler {
    constructor(gameState, io, roomId) {
        this.gameState = gameState;
        this.io = io;
        this.roomId = roomId;
        this.buildHandler = gameState.buildHandler;
        this.combatHandler = gameState.combatHandler;
    }
    
    /**
     * Ejecuta una acción de la IA
     * @param {Object} action - Acción a ejecutar {type, ...}
     * @param {string} team - Team de la IA (player2)
     */
    async executeAction(action, team) {
        if (!action) return false;
        
        try {
            switch (action.type) {
                case 'build':
                    return await this.executeBuild(action, team);
                case 'attack':
                    return await this.executeAttack(action, team);
                default:
                    console.warn(`⚠️ Acción desconocida: ${action.type}`);
                    return false;
            }
        } catch (error) {
            console.error(`❌ Error ejecutando acción de IA:`, error);
            return false;
        }
    }
    
    /**
     * Ejecuta construcción (simulando evento de jugador real)
     * @param {string} team - Team de la IA
     * @param {string} cardId - ID de la carta/edificio a construir
     */
    async executeBuild(team, cardId, specificPosition = null) {
        if (!cardId) {
            console.warn('⚠️ Building type no especificado');
            return false;
        }
        
        // 🎯 PROTECCIÓN: Verificar que no se intente construir un consumible como edificio
        // Los consumibles tienen targetType en SERVER_NODE_CONFIG, los edificios no
        const hasTargetType = SERVER_NODE_CONFIG.gameplay?.behavior?.[cardId]?.targetType !== undefined;
        if (hasTargetType) {
            console.error(`❌ IA ERROR: Intento de construir consumible "${cardId}" como edificio. Esto no debería pasar.`);
            return false;
        }
        
        // Obtener nodos del equipo
        const myNodes = this.gameState.nodes.filter(n => n.team === team);
        const myHQ = myNodes.find(n => n.type === 'hq');
        
        if (!myHQ) {
            console.warn('⚠️ HQ no encontrado para IA');
            return false;
        }
        
        // Si se proporciona una posición específica, usarla (para construcciones reactivas)
        let buildPosition = specificPosition;
        
        // Si no hay posición específica, calcular posición cerca del HQ
        if (!buildPosition) {
            buildPosition = this.calculateBuildPosition(myHQ, myNodes, cardId);
        }
        
        if (!buildPosition) {
            console.warn('⚠️ No se pudo calcular posición de construcción');
            return false;
        }
        
        // 🎯 SIMULAR EVENTO DE JUGADOR REAL: Usar mismo handler que jugadores
        const result = this.gameState.handleBuild(team, cardId, buildPosition.x, buildPosition.y);
        
        if (result.success) {
            // 🎯 BROADCAST como si fuera un jugador real
            this.io.to(this.roomId).emit('building_created', {
                nodeId: result.node.id,
                type: cardId,
                x: buildPosition.x,
                y: buildPosition.y,
                team: team,
                constructionTime: result.node.constructionTime
            });
        }
        
        return result.success;
    }
    
    /**
     * Calcula posición para antiDrone reactivo: delante del edificio objetivo (en dirección al drone enemigo)
     * @param {Object} targetBuilding - Edificio objetivo que necesita protección
     * @param {Object} droneThreat - Datos del drone enemigo (opcional, para calcular dirección)
     * @param {string} team - Equipo de la IA
     * @returns {Object|null} Posición { x, y } o null si no se puede calcular
     */
    calculateReactiveAntiDronePosition(targetBuilding, droneThreat, team) {
        const ANTI_DRONE_RANGE = 160; // Rango de intercepción del antiDrone
        const territoryCalculator = this.gameState.territoryCalculator;
        
        if (!targetBuilding) {
            return null;
        }
        
        const targetRadius = SERVER_NODE_CONFIG.radius[targetBuilding.type] || 30;
        const optimalDistance = targetRadius + 20; // 20px de margen delante del edificio
        
        // Calcular dirección: si hay drone, usar dirección del drone al edificio
        // Si no hay drone, usar dirección desde el centro del mapa hacia el edificio
        let directionAngle = 0;
        let droneX = null;
        let droneY = null;
        
        // Intentar obtener coordenadas del drone
        if (droneThreat) {
            // Si el drone tiene coordenadas directamente
            if (droneThreat.x !== undefined && droneThreat.y !== undefined) {
                droneX = droneThreat.x;
                droneY = droneThreat.y;
            } else if (droneThreat.id) {
                // Si tiene ID, buscar el drone en el sistema de drones
                if (this.gameState.droneSystem && this.gameState.droneSystem.drones) {
                    const activeDrone = this.gameState.droneSystem.drones.find(d => 
                        d.id === droneThreat.id && d.team === 'player1'
                    );
                    if (activeDrone && activeDrone.x !== undefined && activeDrone.y !== undefined) {
                        droneX = activeDrone.x;
                        droneY = activeDrone.y;
                    }
                }
            }
        }
        
        if (droneX !== null && droneY !== null) {
            // Dirección desde el drone hacia el edificio (el antiDrone va delante, en dirección opuesta)
            const dx = targetBuilding.x - droneX;
            const dy = targetBuilding.y - droneY;
            directionAngle = Math.atan2(dy, dx);
        } else {
            // Si no hay drone o no se encontraron coordenadas, usar dirección desde el centro del mapa
            // Player2 está a la derecha, así que el drone viene desde la izquierda
            const worldCenterX = 960;
            const dx = targetBuilding.x - worldCenterX;
            const dy = targetBuilding.y - (this.gameState.worldHeight || 1080) / 2;
            directionAngle = Math.atan2(dy, dx);
        }
        
        // Intentar colocar el antiDrone delante del edificio (en dirección al drone)
        // Probar varias distancias para encontrar una posición válida
        const distances = [optimalDistance, optimalDistance + 10, optimalDistance + 20, optimalDistance - 10];
        
        for (const distance of distances) {
            const x = targetBuilding.x + Math.cos(directionAngle) * distance;
            const y = targetBuilding.y + Math.sin(directionAngle) * distance;
            
            // Verificar que esté en territorio propio y sea una ubicación válida
            if (this.buildHandler.isValidLocation(x, y, 'antiDrone') && 
                territoryCalculator.isInTeamTerritory(x, team)) {
                
                // Verificar que esté dentro del rango de intercepción del objetivo
                const distanceToTarget = Math.hypot(x - targetBuilding.x, y - targetBuilding.y);
                if (distanceToTarget <= ANTI_DRONE_RANGE) {
                    return { x, y };
                }
            }
        }
        
        // Si no se encontró posición exacta, probar ángulos cercanos (±30 grados)
        const angleVariations = [-Math.PI/6, -Math.PI/12, Math.PI/12, Math.PI/6];
        for (const angleVariation of angleVariations) {
            const adjustedAngle = directionAngle + angleVariation;
            for (const distance of distances) {
                const x = targetBuilding.x + Math.cos(adjustedAngle) * distance;
                const y = targetBuilding.y + Math.sin(adjustedAngle) * distance;
                
                if (this.buildHandler.isValidLocation(x, y, 'antiDrone') && 
                    territoryCalculator.isInTeamTerritory(x, team)) {
                    
                    const distanceToTarget = Math.hypot(x - targetBuilding.x, y - targetBuilding.y);
                    if (distanceToTarget <= ANTI_DRONE_RANGE) {
                        return { x, y };
                    }
                }
            }
        }
        
        // Fallback: usar lógica estándar
        const myNodes = this.gameState.nodes.filter(n => n.team === team);
        const myHQ = myNodes.find(n => n.type === 'hq');
        if (myHQ) {
            return this.calculateAntiDronePosition(myHQ, myNodes);
        }
        
        return null;
    }
    
    /**
     * Ejecuta ataque/consumible
     * @param {string} team - Team de la IA
     * @param {string} cardId - ID de la carta/consumible a usar
     */
    async executeAttack(team, cardId) {
        if (!cardId) {
            console.warn('⚠️ Attack type no especificado');
            return false;
        }
        
        const myNodes = this.gameState.nodes.filter(n => n.team === team);
        
        // Enrutar según el tipo de consumible
        switch (cardId) {
            case 'drone':
                return await this.executeDroneAttack(myNodes, team);
            case 'sniperStrike':
                return await this.executeSniperAttack(myNodes, team);
            case 'fobSabotage':
                return await this.executeFobSabotage(myNodes, team);
            case 'specopsCommando':
                return await this.executeSpecopsCommando(myNodes, team);
            case 'cameraDrone':
                return await this.executeCameraDrone(myNodes, team);
            case 'truckAssault':
                return await this.executeTruckAssault(myNodes, team);
            case 'artillery':
                return await this.executeArtillery(myNodes, team);
            case 'lightVehicle':
                return await this.executeLightVehicle(myNodes, team);
            default:
                console.warn(`⚠️ Tipo de consumible no reconocido: ${cardId}`);
                return false;
        }
    }
    
    /**
     * Ejecuta ataque con dron
     * 🎯 CORREGIDO: Usa CombatHandler.handleDroneLaunch para validar currency y descuentos
     */
    async executeDroneAttack(myNodes, team) {
        // Encontrar lanzadera
        const launcher = myNodes.find(n => n.type === 'droneLauncher' && n.active && n.constructed);
        
        if (!launcher) {
            if (AIConfig.debug.logActions) {
                console.warn('⚠️ IA: No se encontró lanzadera para lanzar dron');
            }
            return false;
        }
        
        // Encontrar objetivo prioritario
        const target = this.findBestDroneTarget();
        
        if (!target) {
            if (AIConfig.debug.logActions) {
                console.warn('⚠️ IA: No se encontró objetivo válido para dron');
            }
            return false;
        }
        
        // 🎯 USAR CombatHandler.handleDroneLaunch (valida currency, descuenta dinero, maneja descuentos, etc.)
        const result = this.combatHandler.handleDroneLaunch(team, target.id);
        
        if (result.success) {
            // Broadcast como si fuera un jugador real
            this.io.to(this.roomId).emit('drone_launched', {
                droneId: result.drone.id,
                launcherId: result.launcherId,
                targetId: result.targetId,
                team: team,
                x: result.drone.x,
                y: result.drone.y
            });
            
            if (AIConfig.debug.logActions) {
                console.log(`💣 IA: Dron lanzado exitosamente → ${target.type} ${target.id} en (${result.drone.x}, ${result.drone.y})`);
            }
            
            return true;
        } else {
            if (AIConfig.debug.logActions) {
                console.warn(`⚠️ IA: Fallo al lanzar dron: ${result.reason}`);
            }
            return false;
        }
    }
    
    /**
     * Ejecuta ataque con sniper
     * @param {Array} myNodes - Nodos del equipo de la IA
     * @param {string} team - Equipo de la IA
     * @param {string} targetId - (Opcional) ID del objetivo específico a atacar
     */
    async executeSniperAttack(myNodes, team, targetId = null) {
        let target = null;
        
        // Si se especifica un targetId, usarlo directamente
        if (targetId) {
            target = this.gameState.nodes.find(n => n.id === targetId && n.team === 'player1' && n.active);
            if (!target) {
                return false;
            }
        } else {
            // Buscar objetivos válidos del jugador
            const playerNodes = this.gameState.nodes.filter(n => n.team === 'player1' && n.active);
            const targets = playerNodes.filter(n => 
                n.type === 'front' || 
                n.type === 'specopsCommando' || 
                n.type === 'truckAssault' || 
                n.type === 'cameraDrone'
            );
            
            if (targets.length === 0) {
                return false;
            }
            
            // Seleccionar objetivo prioritario (comandos primero, luego frentes)
            target = targets.find(n => n.type === 'specopsCommando' || n.type === 'truckAssault' || n.type === 'cameraDrone');
            if (!target) {
                target = targets.find(n => n.type === 'front');
            }
            if (!target) {
                target = targets[0];
            }
        }
        
        // Llamar al handler
        const result = this.combatHandler.handleSniperStrike(team, target.id);
        
        if (result.success) {
            // 🎯 FIX: Emitir el mismo evento que cuando un jugador dispara (sniper_fired)
            // Esto asegura que el cliente reciba los sonidos, efectos visuales y feed correctos
            this.io.to(this.roomId).emit('sniper_fired', {
                shooterId: team,
                targetId: result.targetId,
                effect: result.effect,
                targetType: result.targetType || 'front',
                eliminated: result.eliminated || false,
                targetX: result.targetX,
                targetY: result.targetY
            });
        }
        
        return result.success;
    }
    
    /**
     * Ejecuta sabotaje de FOB
     */
    async executeFobSabotage(myNodes, team) {
        // Encontrar FOBs enemigas
        const playerNodes = this.gameState.nodes.filter(n => n.team === 'player1' && n.active && n.type === 'fob');
        
        if (playerNodes.length === 0) {
            return false;
        }
        
        // Seleccionar FOB más cercana al HQ enemigo (o aleatoria)
        const target = playerNodes[Math.floor(Math.random() * playerNodes.length)];
        
        // Llamar al handler
        const result = this.combatHandler.handleFobSabotage(team, target.id);
        
        if (result.success) {
            // Broadcast
            this.io.to(this.roomId).emit('fob_sabotage', {
                targetId: target.id,
                team: team
            });
        }
        
        return result.success;
    }
    
    /**
     * Ejecuta despliegue de comando especial
     */
    async executeSpecopsCommando(myNodes, team) {
        // Encontrar posición en territorio enemigo
        const position = this.findEnemyTerritoryPosition(team);
        
        if (!position) {
            return false;
        }
        
        // Llamar al handler
        const result = this.combatHandler.handleCommandoDeploy(team, position.x, position.y);
        
        if (result.success) {
            // Broadcast
            this.io.to(this.roomId).emit('commando_deployed', {
                nodeId: result.commando.id,
                x: position.x,
                y: position.y,
                team: team
            });
        }
        
        return result.success;
    }
    
    /**
     * Ejecuta despliegue de camera drone
     */
    async executeCameraDrone(myNodes, team) {
        // Encontrar posición en territorio enemigo
        const position = this.findEnemyTerritoryPosition(team);
        
        if (!position) {
            return false;
        }
        
        // Llamar al handler
        const result = this.combatHandler.handleCameraDroneDeploy(team, position.x, position.y);
        
        if (result.success) {
            // Broadcast
            this.io.to(this.roomId).emit('camera_drone_deployed', {
                nodeId: result.cameraDrone.id,
                x: position.x,
                y: position.y,
                team: team
            });
        }
        
        return result.success;
    }
    
    /**
     * Ejecuta despliegue de truck assault
     */
    async executeTruckAssault(myNodes, team) {
        // Encontrar posición en territorio enemigo (cerca de rutas de convoyes)
        const position = this.findEnemyTerritoryPosition(team);
        
        if (!position) {
            return false;
        }
        
        // Llamar al handler
        const result = this.combatHandler.handleTruckAssaultDeploy(team, position.x, position.y);
        
        if (result.success) {
            // Broadcast
            this.io.to(this.roomId).emit('truck_assault_deployed', {
                nodeId: result.truckAssault.id,
                x: position.x,
                y: position.y,
                team: team
            });
        }
        
        return result.success;
    }
    
    /**
     * Ejecuta ataque de artillería
     */
    async executeArtillery(myNodes, team) {
        // Encontrar área con múltiples edificios enemigos
        const position = this.findArtilleryTargetPosition(team);
        
        if (!position) {
            return false;
        }
        
        // Llamar al handler
        const result = this.combatHandler.handleArtilleryLaunch(team, position.x, position.y);
        
        if (result.success) {
            // Broadcast
            this.io.to(this.roomId).emit('artillery_launched', {
                artilleryId: result.artillery.id,
                x: position.x,
                y: position.y,
                team: team
            });
        }
        
        return result.success;
    }
    
    /**
     * Ejecuta ataque de artillado ligero
     */
    async executeLightVehicle(myNodes, team) {
        // Encontrar edificios enemigos válidos
        const playerNodes = this.gameState.nodes.filter(n => n.team === 'player1' && n.active && n.constructed);
        const validTargetTypes = SERVER_NODE_CONFIG.actions?.lightVehicleLaunch?.validTargets || [];
        
        const targets = playerNodes.filter(n => 
            validTargetTypes.includes(n.type) && 
            !n.broken
        );
        
        if (targets.length === 0) {
            return false;
        }
        
        // Priorizar plantas nucleares
        let target = targets.find(n => n.type === 'nuclearPlant');
        if (!target) {
            target = targets[Math.floor(Math.random() * targets.length)];
        }
        
        // Llamar al handler
        const result = this.combatHandler.handleLightVehicleLaunch(team, target.id);
        
        if (result.success) {
            // Broadcast
            this.io.to(this.roomId).emit('light_vehicle_launched', {
                lightVehicleId: result.lightVehicle.id,
                targetId: target.id,
                team: team
            });
        }
        
        return result.success;
    }
    
    /**
     * Encuentra mejor objetivo para dron
     */
    findBestDroneTarget() {
        const playerNodes = this.gameState.nodes.filter(n => n.team === 'player1' && n.active && n.constructed);
        const validTargetTypes = SERVER_NODE_CONFIG.actions?.droneLaunch?.validTargets || [];
        
        const validTargets = playerNodes.filter(n => validTargetTypes.includes(n.type));
        
        // Prioridad: Plantas > Hospitales > FOBs > Otros
        let target = validTargets.find(n => n.type === 'nuclearPlant');
        if (!target) target = validTargets.find(n => n.type === 'campaignHospital');
        if (!target) target = validTargets.find(n => n.type === 'fob');
        if (!target) target = validTargets[0];
        
        return target;
    }
    
    /**
     * Encuentra una posición en territorio enemigo para desplegar unidades especiales
     */
    findEnemyTerritoryPosition(team) {
        const enemyTeam = team === 'player1' ? 'player2' : 'player1';
        const enemyNodes = this.gameState.nodes.filter(n => n.team === enemyTeam && n.active);
        
        // Buscar cerca de edificios enemigos importantes
        const priorityTargets = enemyNodes.filter(n => 
            n.type === 'fob' || 
            n.type === 'nuclearPlant' || 
            n.type === 'campaignHospital'
        );
        
        if (priorityTargets.length > 0) {
            const target = priorityTargets[Math.floor(Math.random() * priorityTargets.length)];
            // Posición cerca del objetivo pero en territorio enemigo
            const angle = Math.random() * Math.PI * 2;
            const distance = 150 + Math.random() * 100;
            return {
                x: target.x + Math.cos(angle) * distance,
                y: target.y + Math.sin(angle) * distance
            };
        }
        
        // Fallback: posición aleatoria en el lado enemigo del mapa
        const worldWidth = 1920;
        const centerX = team === 'player1' ? worldWidth * 0.75 : worldWidth * 0.25;
        const centerY = 540; // Centro vertical del mapa
        
        return {
            x: centerX + (Math.random() - 0.5) * 400,
            y: centerY + (Math.random() - 0.5) * 200
        };
    }
    
    /**
     * Encuentra posición óptima para artillería (área con múltiples edificios)
     */
    findArtilleryTargetPosition(team) {
        const enemyTeam = team === 'player1' ? 'player2' : 'player1';
        const enemyNodes = this.gameState.nodes.filter(n => n.team === enemyTeam && n.active && n.constructed);
        
        if (enemyNodes.length === 0) {
            return null;
        }
        
        // Buscar área con mayor concentración de edificios
        let bestPosition = null;
        let maxBuildings = 0;
        const searchRadius = 200;
        
        for (const node of enemyNodes) {
            const nearbyBuildings = enemyNodes.filter(n => {
                const dist = Math.hypot(n.x - node.x, n.y - node.y);
                return dist <= searchRadius;
            }).length;
            
            if (nearbyBuildings > maxBuildings) {
                maxBuildings = nearbyBuildings;
                bestPosition = { x: node.x, y: node.y };
            }
        }
        
        return bestPosition || { x: enemyNodes[0].x, y: enemyNodes[0].y };
    }
    
    /**
     * Calcula posición para construcción (usando mismo sistema que BuildHandler)
     */
    calculateBuildPosition(hq, myNodes, buildingType) {
        // 🎯 CASO ESPECIAL: antiDrone debe colocarse cerca del diámetro del nodo objetivo prioritario
        if (buildingType === 'antiDrone') {
            return this.calculateAntiDronePosition(hq, myNodes);
        }
        
        const territoryCalculator = this.gameState.territoryCalculator;
        const team = hq.team;
        
        // Estrategia 1: Círculo alrededor del HQ (múltiples distancias y ángulos)
        const distances = [200, 250, 300, 150, 350, 400];
        const angles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4];
        for (const distance of distances) {
            for (const angle of angles) {
                const x = hq.x + Math.cos(angle) * distance;
                const y = hq.y + Math.sin(angle) * distance;
                // Usar isValidLocation del BuildHandler (mismo sistema de validación)
                if (this.buildHandler.isValidLocation(x, y, buildingType) && 
                    territoryCalculator.isInTeamTerritory(x, team)) {
                    return { x, y };
                }
            }
        }
        
        // Estrategia 2: Espiral desde el HQ
        const step = 50;
        const maxRadius = 500;
        for (let radius = 150; radius <= maxRadius; radius += step) {
            const steps = Math.max(8, Math.floor((radius * 2 * Math.PI) / step));
            for (let i = 0; i < steps; i++) {
                const angle = (i / steps) * Math.PI * 2;
                const x = hq.x + Math.cos(angle) * radius;
                const y = hq.y + Math.sin(angle) * radius;
                if (this.buildHandler.isValidLocation(x, y, buildingType) && 
                    territoryCalculator.isInTeamTerritory(x, team)) {
                    return { x, y };
                }
            }
        }
        
        // Estrategia 3: Grid alrededor del HQ
        const gridSize = 150;
        const range = 5;
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                if (dx === 0 && dy === 0) continue;
                const x = hq.x + dx * gridSize;
                const y = hq.y + dy * gridSize;
                if (this.buildHandler.isValidLocation(x, y, buildingType) && 
                    territoryCalculator.isInTeamTerritory(x, team)) {
                    return { x, y };
                }
            }
        }
        
        // Último fallback: posición aleatoria lejos del HQ
        for (let attempt = 0; attempt < 100; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 200 + Math.random() * 400;
            const x = hq.x + Math.cos(angle) * distance;
            const y = hq.y + Math.sin(angle) * distance;
            if (this.buildHandler.isValidLocation(x, y, buildingType) && 
                territoryCalculator.isInTeamTerritory(x, team)) {
                return { x, y };
            }
        }
        
        // Si TODO falla
        console.warn(`⚠️ IA: No se pudo encontrar posición válida para ${buildingType} después de 100+ intentos`);
        return { 
            x: hq.x + 200, 
            y: hq.y 
        };
    }
    
    /**
     * Calcula posición óptima para antiDrone: lo más cerca posible del diámetro del nodo objetivo prioritario
     * El antiDrone debe estar dentro de su rango de intercepción (160px) del objetivo
     */
    calculateAntiDronePosition(hq, myNodes) {
        const ANTI_DRONE_RANGE = 160; // Rango de intercepción del antiDrone
        const territoryCalculator = this.gameState.territoryCalculator;
        const team = hq.team;
        
        // 1. Identificar objetivos prioritarios de drones enemigos (edificios propios que necesitan protección)
        // Prioridad: Plantas nucleares > Lanzaderas > Hospitales > FOBs > Otros edificios importantes
        const priorityTargets = myNodes.filter(n => 
            n.active && 
            n.constructed && 
            !n.isAbandoning &&
            (n.type === 'nuclearPlant' || 
             n.type === 'droneLauncher' || 
             n.type === 'campaignHospital' || 
             n.type === 'fob' ||
             n.type === 'truckFactory' ||
             n.type === 'engineerCenter')
        );
        
        // Ordenar por prioridad
        const targetPriority = {
            'nuclearPlant': 100,
            'droneLauncher': 90,
            'campaignHospital': 80,
            'fob': 70,
            'truckFactory': 60,
            'engineerCenter': 50
        };
        
        priorityTargets.sort((a, b) => {
            const priorityA = targetPriority[a.type] || 0;
            const priorityB = targetPriority[b.type] || 0;
            return priorityB - priorityA;
        });
        
        // 2. Para cada objetivo prioritario, intentar colocar antiDrone cerca de su diámetro
        for (const target of priorityTargets) {
            const targetRadius = SERVER_NODE_CONFIG.radius[target.type] || 30;
            
            // Calcular distancia óptima: justo en el borde del radio del nodo + pequeño margen
            // Pero asegurando que esté dentro del rango de intercepción (160px)
            const optimalDistance = targetRadius + 10; // 10px de margen para evitar solapamiento
            
            // Si el objetivo es muy grande y el rango no alcanza, usar distancia máxima posible
            const maxDistance = Math.min(optimalDistance, ANTI_DRONE_RANGE - 5); // 5px de margen de seguridad
            
            // Probar múltiples ángulos alrededor del objetivo
            const angles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4];
            
            for (const angle of angles) {
                const x = target.x + Math.cos(angle) * maxDistance;
                const y = target.y + Math.sin(angle) * maxDistance;
                
                // Verificar que esté en territorio propio y sea una ubicación válida
                if (this.buildHandler.isValidLocation(x, y, 'antiDrone') && 
                    territoryCalculator.isInTeamTerritory(x, team)) {
                    
                    // Verificar que esté dentro del rango de intercepción del objetivo
                    const distanceToTarget = Math.hypot(x - target.x, y - target.y);
                    if (distanceToTarget <= ANTI_DRONE_RANGE) {
                        return { x, y };
                    }
                }
            }
            
            // Si no se encontró posición exacta, probar con distancias variables
            for (let distance = targetRadius + 5; distance <= ANTI_DRONE_RANGE - 5; distance += 10) {
                for (const angle of angles) {
                    const x = target.x + Math.cos(angle) * distance;
                    const y = target.y + Math.sin(angle) * distance;
                    
                    if (this.buildHandler.isValidLocation(x, y, 'antiDrone') && 
                        territoryCalculator.isInTeamTerritory(x, team)) {
                        return { x, y };
                    }
                }
            }
        }
        
        // 3. Fallback: si no hay objetivos prioritarios o no se encontró posición, usar lógica estándar cerca del HQ
        // Intentar posiciones cerca del HQ en círculo
        const distances = [150, 200, 250, 100, 300];
        const angles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4];
        for (const distance of distances) {
            for (const angle of angles) {
                const x = hq.x + Math.cos(angle) * distance;
                const y = hq.y + Math.sin(angle) * distance;
                if (this.buildHandler.isValidLocation(x, y, 'antiDrone') && 
                    territoryCalculator.isInTeamTerritory(x, team)) {
                    return { x, y };
                }
            }
        }
        
        // Último fallback: posición cerca del HQ
        return { 
            x: hq.x + 200, 
            y: hq.y 
        };
    }
}

