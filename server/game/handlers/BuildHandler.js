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
        
        // Validar que esté dentro del territorio del jugador
        const inOwnTerritory = this.gameState.isInTeamTerritory(x, playerTeam);
        if (!inOwnTerritory) {
            console.log(`❌ Construcción rechazada: fuera de territorio (${playerTeam} en x=${x})`);
            return { success: false, reason: 'Fuera de tu territorio' };
        }
        
        // TODO: Validar colisiones con otros edificios
        
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
                break;
        }
    }
    
    /**
     * Crea un nodo del servidor
     */
    createNode(type, team, x, y, supplies = null) {
        const nodeId = `node_${uuidv4().substring(0, 8)}`;
        
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
            supplies: supplies,
            maxSupplies: supplies,
            availableVehicles: this.getInitialVehicles(type),
            maxVehicles: this.getInitialVehicles(type),
            constructed: type === 'hq' || type === 'front' || type === 'fob', // HQ, frentes y FOBs ya están construidos
            isConstructing: false
        };
        
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
        return type === 'hq' || type === 'fob' || type === 'front';
    }
    
    /**
     * Determina si un tipo de nodo tiene vehículos
     */
    hasVehicles(type) {
        return type === 'hq' || type === 'fob';
    }
    
    /**
     * Obtiene vehículos iniciales según tipo de nodo
     */
    getInitialVehicles(type) {
        if (type === 'hq') return 4;
        if (type === 'fob') return 2;
        return 0;
    }
}

