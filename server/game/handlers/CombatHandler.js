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
        
        // 🆕 NUEVO: Validar que sea un frente o comando enemigo
        const isValidTarget = (targetNode.type === 'front' || targetNode.type === 'specopsCommando') && 
                              targetNode.team !== playerTeam;
        
        if (!isValidTarget) {
            return { success: false, reason: 'Solo puedes disparar a frentes o comandos enemigos' };
        }
        
        // Validar que el objetivo esté activo y construido (si es comando)
        if (targetNode.type === 'specopsCommando') {
            if (!targetNode.active || !targetNode.constructed || targetNode.isAbandoning) {
                return { success: false, reason: 'El comando no está disponible como objetivo' };
            }
        }
        
        // Costo del sniper
        const sniperCost = SERVER_NODE_CONFIG.actions.sniperStrike.cost;
        
        // Verificar currency
        if (this.gameState.currency[playerTeam] < sniperCost) {
            return { success: false, reason: 'Currency insuficiente' };
        }
        
        // Descontar currency
        this.gameState.currency[playerTeam] -= sniperCost;
        
        // 🆕 NUEVO: Lógica condicional según el tipo de objetivo
        if (targetNode.type === 'specopsCommando') {
            // Guardar coordenadas antes de eliminar (para el feed de kill)
            const targetX = targetNode.x;
            const targetY = targetNode.y;
            
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
        } else {
            // Aplicar efecto "wounded" al frente (lógica original)
            const woundedConfig = SERVER_NODE_CONFIG.temporaryEffects.wounded;
            const originalConsumeRate = targetNode.consumeRate || 1.6;
            targetNode.consumeRate = originalConsumeRate * woundedConfig.consumeMultiplier;
            
            // Añadir efecto con expiración
            if (!targetNode.effects) targetNode.effects = [];
            
            const woundedEffect = {
                type: 'wounded',
                icon: woundedConfig.icon,
                tooltip: woundedConfig.tooltip,
                expiresAt: this.gameState.gameTime + woundedConfig.duration
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
        const sabotageCost = SERVER_NODE_CONFIG.actions.fobSabotage.cost;
        
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
        
        // Costo del dron
        const droneCost = SERVER_NODE_CONFIG.actions.droneLaunch.cost;
        
        // Verificar currency
        if (this.gameState.currency[playerTeam] < droneCost) {
            return { success: false, reason: 'Currency insuficiente' };
        }
        
        // Descontar currency
        this.gameState.currency[playerTeam] -= droneCost;
        
        // Lanzar dron desde la lanzadera
        const drone = this.gameState.droneSystem.launchDrone(playerTeam, launcher, targetNode);
        
        console.log(`💣 Dron ${drone.id} lanzado por ${playerTeam} → ${targetNode.type} ${targetId}`);
        
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
        
        // Costo del tanque
        const tankCost = SERVER_NODE_CONFIG.actions.tankLaunch.cost;
        
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
     * Maneja despliegue de comando especial operativo
     * 🆕 NUEVO: Crea un nodo especial que deshabilita edificios enemigos dentro de su área
     */
    handleCommandoDeploy(playerTeam, x, y) {
        const commandoConfig = SERVER_NODE_CONFIG.actions.specopsCommando;
        // 🆕 NUEVO: Usar costo de costs.specopsCommando (igual que otros edificios)
        const commandoCost = SERVER_NODE_CONFIG.costs.specopsCommando;
        const commandoDetectionRadius = commandoConfig.detectionRadius || SERVER_NODE_CONFIG.specialNodes?.specopsCommando?.detectionRadius || 200;
        
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
        
        return { success: true, commando: commandoNode };
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
        
        // Obtener hitboxRadius del servidor (similar a CommandoSystem)
        const hitboxRadii = SERVER_NODE_CONFIG.security?.hitboxRadius || {};
        
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
            
            // Calcular distancia considerando el hitbox del edificio
            const dist = Math.hypot(node.x - commando.x, node.y - commando.y);
            const nodeHitboxRadius = hitboxRadii[node.type] || node.radius || SERVER_NODE_CONFIG.radius?.[node.type] || 30;
            
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
}

