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
     * Maneja lanzamiento de dron
     */
    handleDroneLaunch(playerTeam, targetId) {
        const targetNode = this.gameState.nodes.find(n => n.id === targetId);
        
        if (!targetNode) {
            return { success: false, reason: 'Objetivo no encontrado' };
        }
        
        // Validar que sea un edificio enemigo válido (no HQ ni frentes)
        const validTargetTypes = SERVER_NODE_CONFIG.actions.droneLaunch.validTargets;
        
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
}

