// ===== HANDLER DE COMBATE (SNIPER Y DRONES) =====
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

export class CombatHandler {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Maneja disparo de francotirador
     * 🆕 NUEVO: Puede disparar a frentes (aplica efecto wounded) o comandos (los elimina)
     */
    handleSniperStrike(playerTeam, targetId) {
        const targetNode = this.gameState.nodes.find(n => n.id === targetId);
        
        if (!targetNode) {
            return { success: false, reason: 'Objetivo no encontrado' };
        }
        
        // 🆕 NUEVO: Validar que sea un frente, comando, truck assault o camera drone enemigo
        const isValidTarget = (targetNode.type === 'front' || targetNode.type === 'specopsCommando' || targetNode.type === 'truckAssault' || targetNode.type === 'cameraDrone') && 
                              targetNode.team !== playerTeam;
        
        if (!isValidTarget) {
            return { success: false, reason: 'Solo puedes disparar a frentes, comandos, truck assaults o camera drones enemigos' };
        }
        
        // Validar que el objetivo esté activo y construido (si es comando, truck assault o camera drone)
        if (targetNode.type === 'specopsCommando' || targetNode.type === 'truckAssault' || targetNode.type === 'cameraDrone') {
            if (!targetNode.active || !targetNode.constructed || targetNode.isAbandoning) {
                return { success: false, reason: 'El objetivo no está disponible' };
            }
        }
        
        // ✅ Costo del sniper (lee de costs - fuente única de verdad)
        const sniperCost = SERVER_NODE_CONFIG.costs.sniperStrike;
        
        // Verificar currency
        if (this.gameState.currency[playerTeam] < sniperCost) {
            return { success: false, reason: 'Currency insuficiente' };
        }
        
        // Descontar currency
        this.gameState.currency[playerTeam] -= sniperCost;
        
        // 🆕 NUEVO: Lógica condicional según el tipo de objetivo
        if (targetNode.type === 'specopsCommando' || targetNode.type === 'truckAssault' || targetNode.type === 'cameraDrone') {
            // Guardar coordenadas antes de eliminar (para el feed de kill)
            const targetX = targetNode.x;
            const targetY = targetNode.y;
            
            const isCommando = targetNode.type === 'specopsCommando';
            const isTruckAssault = targetNode.type === 'truckAssault';
            const isCameraDrone = targetNode.type === 'cameraDrone';
            
            if (isCommando) {
                // 🆕 NUEVO: Obtener todos los edificios afectados por este comando ANTES de eliminarlo
                const affectedBuildings = this.getAffectedBuildingsByCommando(targetNode);
                
                // Eliminar el comando (marcar para abandono)
                targetNode.active = false;
                targetNode.isAbandoning = true;
                // El AbandonmentSystem lo limpiará automáticamente cuando abandonPhase === 3
                
                // 🆕 NUEVO: Aplicar efecto residual de disabled a los edificios afectados
                const residualDuration = SERVER_NODE_CONFIG.gameplay.specopsCommando.residualDisabledDuration;
                this.applyResidualDisabledEffect(affectedBuildings, residualDuration);
                
                console.log(`🎯 Sniper de ${playerTeam} eliminó comando ${targetId} en (${targetX.toFixed(0)}, ${targetY.toFixed(0)}) - ${affectedBuildings.length} edificios afectados por ${residualDuration}s`);
                if (affectedBuildings.length > 0) {
                    console.log(`   📋 Edificios afectados: ${affectedBuildings.map(b => `${b.type}(${b.id.substring(0, 8)})`).join(', ')}`);
                }
                
                return { 
                    success: true, 
                    targetId, 
                    eliminated: true, 
                    targetType: 'commando',
                    targetX, // 🆕 Coordenadas para el feed de kill
                    targetY,
                    affectedBuildings: affectedBuildings.map(b => b.id) // 🆕 IDs de edificios afectados
                };
            } else if (isTruckAssault) {
                // Eliminar el truck assault (marcar para abandono)
                targetNode.active = false;
                targetNode.isAbandoning = true;
                
                console.log(`🎯 Sniper de ${playerTeam} eliminó truck assault ${targetId} en (${targetX.toFixed(0)}, ${targetY.toFixed(0)})`);
                
                return { 
                    success: true, 
                    targetId, 
                    eliminated: true, 
                    targetType: 'truckAssault',
                    targetX,
                    targetY
                };
            } else if (isCameraDrone) {
                // Eliminar el camera drone (marcar para abandono)
                targetNode.active = false;
                targetNode.isAbandoning = true;
                
                console.log(`🎯 Sniper de ${playerTeam} eliminó camera drone ${targetId} en (${targetX.toFixed(0)}, ${targetY.toFixed(0)})`);
                
                return { 
                    success: true, 
                    targetId, 
                    eliminated: true, 
                    targetType: 'cameraDrone',
                    targetX,
                    targetY
                };
            }
        } else {
            // Aplicar efecto "wounded" al frente (lógica original)
            const woundedConfig = SERVER_NODE_CONFIG.temporaryEffects.wounded;
            
            // 🆕 FIX: Verificar si ya existe un efecto wounded activo
            const existingWounded = targetNode.effects?.find(e => e.type === 'wounded' && 
                e.expiresAt && this.gameState.gameTime < e.expiresAt);
            
            if (existingWounded) {
                console.log(`⚠️ Frente ${targetId} ya tiene efecto wounded activo, no se aplica duplicado`);
                return { 
                    success: false, 
                    reason: 'El frente ya tiene efecto wounded activo',
                    targetId,
                    targetType: 'front'
                };
            }
            
            // 🆕 FIX: Guardar consumo original (usar configuración si no está definido)
            const originalConsumeRate = targetNode.consumeRate || SERVER_NODE_CONFIG.gameplay.front.consumeRate;
            targetNode.consumeRate = originalConsumeRate * woundedConfig.consumeMultiplier;
            
            // Añadir efecto con expiración
            if (!targetNode.effects) targetNode.effects = [];
            
            const woundedEffect = {
                type: 'wounded',
                icon: woundedConfig.icon,
                tooltip: woundedConfig.tooltip,
                expiresAt: this.gameState.gameTime + woundedConfig.duration,
                originalConsumeRate // 🆕 FIX: Guardar valor original para restaurar correctamente
            };
            
            targetNode.effects.push(woundedEffect);
            
            console.log(`🎯 Sniper de ${playerTeam} disparó a frente ${targetId} - Consumo: ${originalConsumeRate} → ${targetNode.consumeRate} por ${woundedConfig.duration}s`);
            
            return { 
                success: true, 
                targetId, 
                effect: woundedEffect, 
                targetType: 'front',
                targetX: targetNode.x, // 🆕 Coordenadas para el feed de kill
                targetY: targetNode.y
            };
        }
    }
    
    /**
     * Maneja sabotaje de FOB
     */
    handleFobSabotage(playerTeam, targetId) {
        const targetNode = this.gameState.nodes.find(n => n.id === targetId);
        
        if (!targetNode) {
            return { success: false, reason: 'Objetivo no encontrado' };
        }
        
        // Validar que sea una FOB enemiga
        if (targetNode.type !== 'fob' || targetNode.team === playerTeam) {
            return { success: false, reason: 'Solo puedes sabotear FOBs enemigas' };
        }
        
        // 🆕 NUEVO: Validar que no haya torres de vigilancia enemigas protegiendo el FOB
        const vigilanceTowers = this.gameState.nodes.filter(n => 
            (n.type === 'vigilanceTower' || n.isVigilanceTower) &&
            n.team === targetNode.team && // Torre del mismo equipo que el FOB (protectora)
            n.active &&
            n.constructed &&
            !n.isAbandoning
        );
        
        for (const tower of vigilanceTowers) {
            const detectionRadius = tower.detectionRadius || 320;
            const dist = Math.hypot(targetNode.x - tower.x, targetNode.y - tower.y);
            
            if (dist <= detectionRadius) {
                return { success: false, reason: 'El FOB está protegido por una torre de vigilancia - no se puede sabotear' };
            }
        }
        
        // Costo del sabotaje
        // ✅ Costo del sabotaje (lee de costs - fuente única de verdad)
        const sabotageCost = SERVER_NODE_CONFIG.costs.fobSabotage;
        
        // Verificar currency
        if (this.gameState.currency[playerTeam] < sabotageCost) {
            return { success: false, reason: 'Currency insuficiente' };
        }
        
        // Descontar currency
        this.gameState.currency[playerTeam] -= sabotageCost;
        
        // Añadir efecto de sabotaje
        if (!targetNode.effects) targetNode.effects = [];
        
        const sabotageEffect = {
            type: 'fobSabotage',
            speedPenalty: 0.5, // 50% de penalización
            truckCount: 3, // Número de camiones afectados
            icon: 'ui-no-supplies',
            tooltip: 'Saboteada: -50% velocidad en los siguientes 3 camiones'
        };
        
        targetNode.effects.push(sabotageEffect);
        
        console.log(`⚡ FOB ${targetId} saboteada por ${playerTeam} - Los siguientes 3 camiones tendrán -50% velocidad`);
        
        return { success: true, targetId, effect: sabotageEffect };
    }
    
    /**
     * Maneja lanzamiento de dron
     */
    handleDroneLaunch(playerTeam, targetId) {
        const targetNode = this.gameState.nodes.find(n => n.id === targetId);
        
        if (!targetNode) {
            return { success: false, reason: 'Objetivo no encontrado' };
        }
        
        // Validar que sea un edificio enemigo válido (no HQ ni frentes)
        const validTargetTypes = SERVER_NODE_CONFIG.actions.droneLaunch.validTargets;
        
        // 🎯 DEBUG: Log para verificar qué está pasando
        console.log(`💣 Validando objetivo drone: ${targetNode.type}, team: ${targetNode.team}, playerTeam: ${playerTeam}`);
        console.log(`💣 ValidTargets disponibles:`, validTargetTypes);
        console.log(`💣 Es válido: ${validTargetTypes.includes(targetNode.type)}, Es enemigo: ${targetNode.team !== playerTeam}`);
        
        if (!validTargetTypes.includes(targetNode.type) || targetNode.team === playerTeam) {
            return { success: false, reason: 'Objetivo no válido para drones' };
        }
        
        // Validar que el objetivo esté construido (no atacar edificios en construcción)
        if (targetNode.isConstructing || !targetNode.constructed) {
            return { success: false, reason: 'No puedes atacar edificios en construcción' };
        }
        
        // Verificar que el jugador tenga una lanzadera construida
        const launcher = this.gameState.nodes.find(n => 
            n.type === 'droneLauncher' && 
            n.team === playerTeam && 
            n.constructed && 
            !n.isAbandoning
        );
        
        if (!launcher) {
            return { success: false, reason: 'Necesitas construir una Lanzadera de Drones' };
        }
        
        // ✅ Costo del dron (lee de costs - fuente única de verdad)
        let droneCost = SERVER_NODE_CONFIG.costs.drone;
        
        // 🆕 NUEVO: Aplicar descuento del 50% si hay talleres de drones y algún FOB tiene 10+ suministros
        const droneWorkshops = this.gameState.nodes.filter(n => 
            n.type === 'droneWorkshop' && 
            n.team === playerTeam && 
            n.active && 
            n.constructed &&
            !n.isAbandoning
        );
        
        if (droneWorkshops.length > 0) {
            // ✅ Leer configuración del taller de drones desde serverNodes
            const workshopConfig = SERVER_NODE_CONFIG.effects.droneWorkshop || {};
            const requiredSupplies = workshopConfig.requiredSupplies || 10;
            const discountMultiplier = workshopConfig.discountMultiplier || 0.5;
            const suppliesCost = workshopConfig.suppliesCost || 10;
            
            // Buscar FOBs aliados con suficientes suministros
            const fobs = this.gameState.nodes.filter(n => 
                n.type === 'fob' && 
                n.team === playerTeam && 
                n.active && 
                n.constructed &&
                !n.isAbandoning &&
                n.supplies !== null &&
                n.supplies >= requiredSupplies
            );
            
            if (fobs.length > 0) {
                // Aplicar descuento según configuración
                droneCost = Math.floor(droneCost * discountMultiplier);
                
                // 🆕 NUEVO: Sustraer suministros del primer FOB disponible según configuración
                const selectedFob = fobs[0];
                const oldSupplies = selectedFob.supplies;
                selectedFob.supplies = Math.max(0, selectedFob.supplies - suppliesCost);
                
                console.log(`💰 Taller de drones activo: costo de dron reducido de ${SERVER_NODE_CONFIG.costs.drone} a ${droneCost} (${(discountMultiplier * 100).toFixed(0)}% descuento)`);
                console.log(`📦 FOB ${selectedFob.id} suministros: ${oldSupplies} → ${selectedFob.supplies} (-${suppliesCost})`);
            }
        }
        
        // Verificar currency
        if (this.gameState.currency[playerTeam] < droneCost) {
            return { success: false, reason: 'Currency insuficiente' };
        }
        
        // Descontar currency
        this.gameState.currency[playerTeam] -= droneCost;
        
        // Lanzar dron desde la lanzadera
        const drone = this.gameState.droneSystem.launchDrone(playerTeam, launcher, targetNode);
        
        console.log(`💣 Dron ${drone.id} lanzado por ${playerTeam} → ${targetNode.type} ${targetId}`);
        
        // 🎯 NUEVO: Notificar a la IA si existe (amenaza inmediata con edificio objetivo)
        if (this.gameState.aiSystem) {
            this.gameState.aiSystem.onThreatDetected('drone', drone, true, targetNode);
        }
        
        return { success: true, drone, launcherId: launcher.id, targetId };
    }
    
    /**
     * Maneja lanzamiento de tanque
     * 🆕 NUEVO: Similar al dron pero no puede atacar FOBs ni HQs
     */
    handleTankLaunch(playerTeam, targetId) {
        const targetNode = this.gameState.nodes.find(n => n.id === targetId);
        
        if (!targetNode) {
            return { success: false, reason: 'Objetivo no encontrado' };
        }
        
        // Validar que sea un edificio enemigo válido (NO FOBs ni HQs)
        const validTargetTypes = SERVER_NODE_CONFIG.actions.tankLaunch.validTargets;
        
        console.log(`🛡️ Validando objetivo tanque: ${targetNode.type}, team: ${targetNode.team}, playerTeam: ${playerTeam}`);
        console.log(`🛡️ ValidTargets disponibles:`, validTargetTypes);
        console.log(`🛡️ Es válido: ${validTargetTypes.includes(targetNode.type)}, Es enemigo: ${targetNode.team !== playerTeam}`);
        
        if (!validTargetTypes.includes(targetNode.type) || targetNode.team === playerTeam) {
            return { success: false, reason: 'Objetivo no válido para tanques' };
        }
        
        // Validar que el objetivo esté construido (no atacar edificios en construcción)
        if (targetNode.isConstructing || !targetNode.constructed) {
            return { success: false, reason: 'No puedes atacar edificios en construcción' };
        }
        
        // ✅ Costo del tanque (lee de costs - fuente única de verdad)
        const tankCost = SERVER_NODE_CONFIG.costs.tank;
        
        // Verificar currency
        if (this.gameState.currency[playerTeam] < tankCost) {
            return { success: false, reason: 'Currency insuficiente' };
        }
        
        // Descontar currency
        this.gameState.currency[playerTeam] -= tankCost;
        
        // Lanzar tanque desde el extremo del mapa
        const tank = this.gameState.tankSystem.launchTank(playerTeam, targetNode);
        
        console.log(`🛡️ Tanque ${tank.id} lanzado por ${playerTeam} → ${targetNode.type} ${targetId}`);
        
        return { success: true, tank, targetId };
    }
    
    /**
     * 🆕 NUEVO: Maneja solicitud de artillado ligero
     */
    handleLightVehicleLaunch(playerTeam, targetId) {
        const targetNode = this.gameState.nodes.find(n => n.id === targetId);
        
        if (!targetNode) {
            return { success: false, reason: 'Objetivo no encontrado' };
        }
        
        // Validar que sea un edificio enemigo válido (NO FOBs ni HQs)
        const validTargetTypes = SERVER_NODE_CONFIG.actions.lightVehicleLaunch.validTargets;
        
        console.log(`🚛 Validando objetivo artillado ligero: ${targetNode.type}, team: ${targetNode.team}, playerTeam: ${playerTeam}`);
        console.log(`🚛 ValidTargets disponibles:`, validTargetTypes);
        console.log(`🚛 Es válido: ${validTargetTypes.includes(targetNode.type)}, Es enemigo: ${targetNode.team !== playerTeam}`);
        
        // Validar que sea un edificio enemigo válido (NO aliados)
        if (!validTargetTypes.includes(targetNode.type) || targetNode.team === playerTeam) {
            return { success: false, reason: 'Objetivo no válido para artillado ligero' };
        }
        
        // Validar que el objetivo esté construido (no atacar edificios en construcción)
        if (targetNode.isConstructing || !targetNode.constructed) {
            return { success: false, reason: 'No puedes atacar edificios en construcción' };
        }
        
        // 🆕 NUEVO: No atacar edificios ya rotos (no tiene sentido romperlos dos veces)
        if (targetNode.broken) {
            return { success: false, reason: 'El edificio ya está roto' };
        }
        
        // ✅ Costo del artillado ligero (lee de costs - fuente única de verdad)
        const lightVehicleCost = SERVER_NODE_CONFIG.costs.lightVehicle;
        
        // Verificar currency
        if (this.gameState.currency[playerTeam] < lightVehicleCost) {
            return { success: false, reason: 'Currency insuficiente' };
        }
        
        // Descontar currency
        this.gameState.currency[playerTeam] -= lightVehicleCost;
        
        // Lanzar artillado ligero desde el extremo del mapa
        const lightVehicle = this.gameState.lightVehicleSystem.launchLightVehicle(playerTeam, targetNode);
        
        console.log(`🚛 Artillado ligero ${lightVehicle.id} lanzado por ${playerTeam} → ${targetNode.type} ${targetId}`);

        return { success: true, lightVehicle, targetId };
    }
    
    /**
     * 🆕 NUEVO: Maneja lanzamiento de artillería en un área
     * @param {string} playerTeam - Equipo del jugador
     * @param {number} x - Coordenada X del centro del área de efecto
     * @param {number} y - Coordenada Y del centro del área de efecto
     * @returns {Object} Resultado de la operación
     */
    handleArtilleryLaunch(playerTeam, x, y) {
        // ✅ Costo de la artillería (lee de costs - fuente única de verdad)
        const artilleryCost = SERVER_NODE_CONFIG.costs.artillery;
        
        // Verificar currency
        if (this.gameState.currency[playerTeam] < artilleryCost) {
            return { success: false, reason: 'Currency insuficiente' };
        }
        
        // Descontar currency
        this.gameState.currency[playerTeam] -= artilleryCost;
        
        // Lanzar bombardeo de artillería
        const artillery = this.gameState.artillerySystem.launchArtillery(playerTeam, x, y);
        
        console.log(`💣 Artillería ${artillery.id} lanzada por ${playerTeam} en (${x}, ${y})`);
        
        return { success: true, artillery, x, y };
    }
    
    /**
     * Maneja despliegue de comando especial operativo
     * 🆕 NUEVO: Crea un nodo especial que deshabilita edificios enemigos dentro de su área
     */
    handleCommandoDeploy(playerTeam, x, y) {
        const commandoConfig = SERVER_NODE_CONFIG.actions.specopsCommando;
        // 🆕 NUEVO: Usar costo de costs.specopsCommando (igual que otros edificios)
        const commandoCost = SERVER_NODE_CONFIG.costs.specopsCommando;
        // ✅ Usar specialNodes como fuente única de verdad para detectionRadius funcional
        const commandoDetectionRadius = SERVER_NODE_CONFIG.specialNodes?.specopsCommando?.detectionRadius || 200;
        
        // Verificar currency
        if (this.gameState.currency[playerTeam] < commandoCost) {
            return { success: false, reason: 'Currency insuficiente' };
        }
        
        // 🆕 Validar que esté en territorio enemigo (NO en territorio propio)
        const inOwnTerritory = this.gameState.territoryCalculator.isInTeamTerritory(x, playerTeam);
        if (inOwnTerritory) {
            return { success: false, reason: 'El comando solo puede desplegarse en territorio enemigo' };
        }
        
        // 🆕 NUEVO: Validar que no haya torres de vigilancia enemigas cerca
        const vigilanceTowers = this.gameState.nodes.filter(n => 
            (n.type === 'vigilanceTower' || n.isVigilanceTower) &&
            n.team !== playerTeam &&
            n.active &&
            n.constructed &&
            !n.isAbandoning
        );
        
        for (const tower of vigilanceTowers) {
            const detectionRadius = tower.detectionRadius || 320;
            const dist = Math.hypot(x - tower.x, y - tower.y);
            
            if (dist <= detectionRadius) {
                return { success: false, reason: 'Hay una torre de vigilancia enemiga cerca - no se puede desplegar el comando' };
            }
        }
        
        // Validar ubicación (ignorando límites de detección)
        if (!this.gameState.buildHandler.isValidLocation(x, y, 'specopsCommando', {
            ignoreDetectionLimits: true,
            allowEnemyTerritory: true
        })) {
            return { success: false, reason: 'Ubicación no válida' };
        }
        
        // Descontar currency
        this.gameState.currency[playerTeam] -= commandoCost;
        
        // Crear nodo del comando
        const commandoNode = this.gameState.buildHandler.createNode('specopsCommando', playerTeam, x, y);
        commandoNode.constructed = true; // No necesita construcción
        commandoNode.isConstructing = false;
        commandoNode.active = true;
        commandoNode.detectionRadius = commandoDetectionRadius;
        commandoNode.isCommando = true;
        
        // 🆕 NUEVO: Añadir tiempo de expiración del comando
        const commandoDuration = SERVER_NODE_CONFIG.gameplay?.specopsCommando?.duration || 10;
        commandoNode.spawnTime = this.gameState.gameTime;
        commandoNode.expiresAt = this.gameState.gameTime + commandoDuration;
        
        // Agregar al estado del juego
        this.gameState.nodes.push(commandoNode);
        
        console.log(`🎖️ Comando especial operativo desplegado por ${playerTeam} en (${x.toFixed(0)}, ${y.toFixed(0)}) - Radio: ${commandoDetectionRadius}px, Duración: ${commandoDuration}s`);
        
        // 🎯 NUEVO: Notificar a la IA si existe (amenaza inmediata)
        if (this.gameState.aiSystem) {
            this.gameState.aiSystem.onThreatDetected('commando', commandoNode, true, null);
        }
        
        return { success: true, commando: commandoNode };
    }
    
    /**
     * Maneja despliegue de truck assault
     * 🆕 NUEVO: Crea un nodo especial que ralentiza vehículos enemigos dentro de su área
     */
    handleTruckAssaultDeploy(playerTeam, x, y) {
        const truckAssaultConfig = SERVER_NODE_CONFIG.actions.truckAssault;
        const truckAssaultCost = SERVER_NODE_CONFIG.costs.truckAssault;
        const truckAssaultDetectionRadius = SERVER_NODE_CONFIG.specialNodes?.truckAssault?.detectionRadius || 200;
        
        // Verificar currency
        if (this.gameState.currency[playerTeam] < truckAssaultCost) {
            return { success: false, reason: 'Currency insuficiente' };
        }
        
        // 🆕 Validar requisito de Centro de Inteligencia
        const hasIntelCenter = this.gameState.nodes.some(n => 
            n.type === 'intelCenter' && 
            n.team === playerTeam && 
            n.active && 
            n.constructed &&
            !n.isAbandoning
        );
        
        if (!hasIntelCenter) {
            return { success: false, reason: 'Necesitas construir un Centro de Inteligencia primero' };
        }
        
        // 🆕 Validar que esté en territorio enemigo (NO en territorio propio)
        const inOwnTerritory = this.gameState.territoryCalculator.isInTeamTerritory(x, playerTeam);
        if (inOwnTerritory) {
            return { success: false, reason: 'El truck assault solo puede desplegarse en territorio enemigo' };
        }
        
        // Validar ubicación (ignorando límites de detección)
        if (!this.gameState.buildHandler.isValidLocation(x, y, 'truckAssault', {
            ignoreDetectionLimits: true,
            allowEnemyTerritory: true
        })) {
            return { success: false, reason: 'Ubicación no válida' };
        }
        
        // Descontar currency
        this.gameState.currency[playerTeam] -= truckAssaultCost;
        
        // Crear nodo del truck assault
        const truckAssaultNode = this.gameState.buildHandler.createNode('truckAssault', playerTeam, x, y);
        truckAssaultNode.constructed = true; // No necesita construcción
        truckAssaultNode.isConstructing = false;
        truckAssaultNode.active = true;
        truckAssaultNode.detectionRadius = truckAssaultDetectionRadius;
        truckAssaultNode.isTruckAssault = true;
        
        // 🆕 NUEVO: Añadir tiempo de expiración del truck assault
        const truckAssaultDuration = SERVER_NODE_CONFIG.gameplay?.truckAssault?.duration || 25;
        truckAssaultNode.spawnTime = this.gameState.gameTime;
        truckAssaultNode.expiresAt = this.gameState.gameTime + truckAssaultDuration;
        
        // Agregar al estado del juego
        this.gameState.nodes.push(truckAssaultNode);
        
        console.log(`🚛 Truck Assault desplegado por ${playerTeam} en (${x.toFixed(0)}, ${y.toFixed(0)}) - Radio: ${truckAssaultDetectionRadius}px, Duración: ${truckAssaultDuration}s`);
        
        // 🎯 NUEVO: Notificar a la IA si existe (amenaza inmediata)
        if (this.gameState.aiSystem) {
            this.gameState.aiSystem.onThreatDetected('truckAssault', truckAssaultNode, true, null);
        }
        
        return { success: true, truckAssault: truckAssaultNode };
    }
    
    /**
     * Maneja despliegue de camera drone
     * 🆕 NUEVO: Crea un dron de vigilancia que detecta vehículos y permite construir en territorio enemigo
     */
    handleCameraDroneDeploy(playerTeam, x, y) {
        const cameraDroneCost = SERVER_NODE_CONFIG.costs.cameraDrone;
        const cameraDroneConfig = SERVER_NODE_CONFIG.specialNodes?.cameraDrone || {};
        const detectionRadius = cameraDroneConfig.detectionRadius || 200;
        
        // Verificar currency
        if (this.gameState.currency[playerTeam] < cameraDroneCost) {
            return { success: false, reason: 'Currency insuficiente' };
        }
        
        // 🆕 Validar requisito de Lanzadera de Drones
        const hasDroneLauncher = this.gameState.nodes.some(n => 
            n.type === 'droneLauncher' && 
            n.team === playerTeam && 
            n.active && 
            n.constructed &&
            !n.isAbandoning
        );
        
        if (!hasDroneLauncher) {
            return { success: false, reason: 'Necesitas construir una Lanzadera de Drones primero' };
        }
        
        // 🆕 Validar que esté en territorio enemigo (NO en territorio propio)
        const inOwnTerritory = this.gameState.territoryCalculator.isInTeamTerritory(x, playerTeam);
        if (inOwnTerritory) {
            return { success: false, reason: 'El camera drone solo puede desplegarse en territorio enemigo' };
        }
        
        // Validar ubicación (ignorando límites de detección)
        if (!this.gameState.buildHandler.isValidLocation(x, y, 'cameraDrone', {
            ignoreDetectionLimits: true,
            allowEnemyTerritory: true
        })) {
            return { success: false, reason: 'Ubicación no válida' };
        }
        
        // Descontar currency
        this.gameState.currency[playerTeam] -= cameraDroneCost;
        
        // 🆕 CRÍTICO: Camera drone sale desde el EXTREMO del mapa del jugador (igual que drones bomba)
        // Player1 (izquierda) → x=0
        // Player2 (derecha) → x=1920 (worldWidth)
        const worldWidth = 1920;
        const droneStartX = playerTeam === 'player1' ? 0 : worldWidth;
        const droneStartY = y; // Altura del objetivo
        
        // Crear nodo del camera drone (inicialmente como dron en vuelo)
        const cameraDroneNode = this.gameState.buildHandler.createNode('cameraDrone', playerTeam, droneStartX, droneStartY);
        cameraDroneNode.constructed = false; // Se construye cuando llega al destino
        cameraDroneNode.isConstructing = false;
        cameraDroneNode.active = true;
        cameraDroneNode.detectionRadius = detectionRadius;
        cameraDroneNode.isCameraDrone = true;
        cameraDroneNode.deployed = false; // Aún no está desplegado
        cameraDroneNode.targetX = x; // Posición objetivo
        cameraDroneNode.targetY = y;
        
        // Agregar al estado del juego
        this.gameState.nodes.push(cameraDroneNode);
        
        console.log(`📹 Camera Drone desplegado por ${playerTeam} desde extremo (${droneStartX}, ${droneStartY}) hacia (${x.toFixed(0)}, ${y.toFixed(0)}) - Radio: ${detectionRadius}px`);
        
        return { success: true, cameraDrone: cameraDroneNode };
    }
    
    /**
     * 🆕 NUEVO: Obtiene todos los edificios afectados por un comando específico
     * @param {Object} commando - Nodo comando
     * @returns {Array} Array de nodos edificios afectados
     */
    getAffectedBuildingsByCommando(commando) {
        const detectionRadius = commando.detectionRadius || 200;
        const commandoTeam = commando.team;
        const affectedBuildings = [];
        
        for (const node of this.gameState.nodes) {
            // Solo considerar edificios enemigos construidos y activos
            if (node.team === commandoTeam || 
                !node.active || 
                !node.constructed ||
                node.isAbandoning ||
                node.type === 'hq' ||
                node.type === 'front' ||
                node.type === 'specopsCommando') {
                continue;
            }
            
            // ✅ Calcular distancia considerando el hitbox del edificio (radius * 1.2)
            const dist = Math.hypot(node.x - commando.x, node.y - commando.y);
            const baseRadius = node.radius || SERVER_NODE_CONFIG.radius?.[node.type] || 30;
            const nodeHitboxRadius = baseRadius * 1.2; // +20% hitbox para mejor detección
            
            // Si el hitbox del edificio entra en el área de detección, está afectado
            if (dist <= (detectionRadius + nodeHitboxRadius)) {
                affectedBuildings.push(node);
            }
        }
        
        return affectedBuildings;
    }
    
    /**
     * 🆕 NUEVO: Aplica efecto residual de disabled a edificios después de eliminar un comando
     * @param {Array} buildings - Array de nodos edificios afectados
     * @param {number} duration - Duración del efecto en segundos
     */
    applyResidualDisabledEffect(buildings, duration) {
        const spawnTime = this.gameState.gameTime;
        const expiresAt = spawnTime + duration;
        
        console.log(`🔄 Aplicando efecto residual a ${buildings.length} edificios (duración: ${duration}s, expira en: ${expiresAt.toFixed(1)}s, gameTime actual: ${spawnTime.toFixed(1)}s)`);
        
        for (const building of buildings) {
            // Añadir efecto temporal
            if (!building.effects) building.effects = [];
            
            const residualEffect = {
                type: 'commandoResidual',
                icon: 'ui-disabled',
                tooltip: `Comando eliminado: Deshabilitado por ${duration}s`,
                spawnTime: spawnTime, // 🆕 Tiempo de creación del efecto
                expiresAt: expiresAt,
                keepsDisabled: true // Flag para indicar que mantiene disabled
            };
            
            building.effects.push(residualEffect);
            
            // Mantener disabled durante el efecto
            building.disabled = true;
            building.disabledByCommando = true; // Tracking interno
            
            console.log(`   ✅ Efecto aplicado a ${building.type}(${building.id.substring(0, 8)}): disabled=${building.disabled}, efectos=${building.effects.length}, commandoResidual=${building.effects.some(e => e.type === 'commandoResidual')}`);
        }
    }
    
    /**
     * 🆕 NUEVO: Maneja la activación del Destructor de mundos
     * @param {string} playerTeam - Equipo del jugador que activa el destructor
     * @returns {Object} Resultado de la operación
     */
    handleWorldDestroyer(playerTeam) {
        // ✅ Costo del destructor (lee de costs - fuente única de verdad)
        const worldDestroyerCost = SERVER_NODE_CONFIG.costs.worldDestroyer;
        
        // Verificar currency
        if (this.gameState.currency[playerTeam] < worldDestroyerCost) {
            return { success: false, reason: 'Currency insuficiente' };
        }
        
        // Verificar que el jugador tenga Construcción Prohibida construida
        const hasDeadlyBuild = this.gameState.nodes.some(n => 
            n.type === 'deadlyBuild' && 
            n.team === playerTeam && 
            n.constructed && 
            !n.isAbandoning &&
            n.active
        );
        
        if (!hasDeadlyBuild) {
            return { success: false, reason: 'Requiere tener una Construcción Prohibida construida' };
        }
        
        // Verificar si ya hay un destructor activo
        if (this.gameState.worldDestroyerActive) {
            return { success: false, reason: 'El Destructor de mundos ya está activo' };
        }
        
        // Descontar currency
        this.gameState.currency[playerTeam] -= worldDestroyerCost;
        
        // Iniciar el destructor
        const worldDestroyerConfig = SERVER_NODE_CONFIG.gameplay.worldDestroyer;
        this.gameState.worldDestroyerActive = true;
        this.gameState.worldDestroyerStartTime = this.gameState.gameTime;
        this.gameState.worldDestroyerPlayerTeam = playerTeam;
        this.gameState.worldDestroyerCountdownDuration = worldDestroyerConfig.countdownDuration;
        
        console.log(`☠️ Destructor de mundos activado por ${playerTeam} - se activará en ${worldDestroyerConfig.countdownDuration} segundos`);
        
        return { 
            success: true, 
            playerTeam,
            startTime: this.gameState.worldDestroyerStartTime,
            countdownDuration: worldDestroyerConfig.countdownDuration
        };
    }
    
    /**
     * 🆕 NUEVO: Actualiza el estado del Destructor de mundos y ejecuta efectos
     * Debe llamarse cada tick desde GameStateManager
     * @param {number} dt - Delta time en segundos
     * @returns {Object|null} Evento de activación si se ejecutó, null si no
     */
    updateWorldDestroyer(dt) {
        if (!this.gameState.worldDestroyerActive) {
            return null;
        }
        
        const worldDestroyerConfig = SERVER_NODE_CONFIG.gameplay.worldDestroyer;
        const elapsed = this.gameState.gameTime - this.gameState.worldDestroyerStartTime;
        
        // Si aún no ha pasado el tiempo de countdown, no hacer nada
        if (elapsed < worldDestroyerConfig.countdownDuration) {
            return null;
        }
        
        // Si ya se ejecutó el efecto, no hacer nada más
        if (this.gameState.worldDestroyerExecuted) {
            return null;
        }
        
        // EJECUTAR EFECTO
        console.log(`☠️ EJECUTANDO Destructor de mundos - destruyendo edificios y vaciando suministros...`);
        
        const playerTeam = this.gameState.worldDestroyerPlayerTeam;
        const enemyTeam = playerTeam === 'player1' ? 'player2' : 'player1';
        
        const destroyedBuildings = [];
        const emptiedFOBs = [];
        const emptiedFronts = [];
        
        // 1. Contar FOBs enemigos para decidir si destruirlos
        const enemyFOBs = this.gameState.nodes.filter(n => 
            n.team === enemyTeam && 
            n.type === 'fob' && 
            n.constructed && 
            n.active && 
            !n.isAbandoning
        );
        const shouldDestroyEnemyFOBs = enemyFOBs.length > 2;
        
        // 2. Destruir todos los edificios enemigos (excepto HQ y FOBs, a menos que haya >2 FOBs)
        for (const node of this.gameState.nodes) {
            if (node.team === enemyTeam && 
                node.constructed && 
                node.active && 
                !node.isAbandoning &&
                node.type !== 'hq' && 
                node.type !== 'front') {
                
                // Si es un FOB enemigo, solo destruirlo si hay más de 2
                if (node.type === 'fob' && !shouldDestroyEnemyFOBs) {
                    continue; // Saltar este FOB
                }
                
                node.active = false;
                node.destroyed = true;
                destroyedBuildings.push({
                    id: node.id,
                    type: node.type,
                    x: node.x,
                    y: node.y
                });
            }
        }
        
        // 3. Vaciar TODOS los FOBs (aliados y enemigos) que no fueron destruidos
        for (const node of this.gameState.nodes) {
            if (node.type === 'fob' && 
                node.constructed && 
                node.active && 
                !node.isAbandoning) {
                
                const oldSupplies = node.supplies || 0;
                node.supplies = 0;
                emptiedFOBs.push({
                    id: node.id,
                    team: node.team,
                    x: node.x,
                    y: node.y,
                    oldSupplies
                });
            }
        }
        
        // 4. Vaciar todos los nodos de Frente (enemigos y aliados)
        for (const node of this.gameState.nodes) {
            if (node.type === 'front' && 
                node.constructed && 
                node.active && 
                !node.isAbandoning) {
                
                const oldSupplies = node.supplies || 0;
                node.supplies = 0;
                emptiedFronts.push({
                    id: node.id,
                    team: node.team,
                    x: node.x,
                    y: node.y,
                    oldSupplies
                });
            }
        }
        
        // Marcar como ejecutado
        this.gameState.worldDestroyerExecuted = true;
        
        console.log(`☠️ Destructor de mundos ejecutado: ${destroyedBuildings.length} edificios destruidos (incluye ${shouldDestroyEnemyFOBs ? enemyFOBs.length : 0} FOBs enemigos), ${emptiedFOBs.length} FOBs vaciados, ${emptiedFronts.length} Frentes vaciados`);
        
        return {
            type: 'worldDestroyer',
            playerTeam,
            destroyedBuildings,
            emptiedFOBs,
            emptiedFronts,
            worldWidth: this.gameState.worldWidth,
            worldHeight: this.gameState.worldHeight
        };
    }
}

