// ===== HANDLER DE COMBATE (SNIPER Y DRONES) =====
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

export class CombatHandler {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Maneja disparo de francotirador
     */
    handleSniperStrike(playerTeam, targetId) {
        const targetNode = this.gameState.nodes.find(n => n.id === targetId);
        
        if (!targetNode) {
            return { success: false, reason: 'Objetivo no encontrado' };
        }
        
        // Validar que sea un frente enemigo
        if (targetNode.type !== 'front' || targetNode.team === playerTeam) {
            return { success: false, reason: 'Solo puedes disparar a frentes enemigos' };
        }
        
        // Costo del sniper
        const sniperCost = SERVER_NODE_CONFIG.actions.sniperStrike.cost;
        
        // Verificar currency
        if (this.gameState.currency[playerTeam] < sniperCost) {
            return { success: false, reason: 'Currency insuficiente' };
        }
        
        // Descontar currency
        this.gameState.currency[playerTeam] -= sniperCost;
        
        // Aplicar efecto "wounded"
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
        
        return { success: true, targetId, effect: woundedEffect };
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
        const commandoCost = commandoConfig.cost;
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
            const detectionRadius = tower.detectionRadius || 400;
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
        
        // Agregar al estado del juego
        this.gameState.nodes.push(commandoNode);
        
        console.log(`🎖️ Comando especial operativo desplegado por ${playerTeam} en (${x.toFixed(0)}, ${y.toFixed(0)}) - Radio: ${commandoDetectionRadius}px`);
        
        return { success: true, commando: commandoNode };
    }
}

