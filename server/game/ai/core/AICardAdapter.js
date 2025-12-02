// ===== ADAPTADOR DE CONFIGURACIÓN DE CARTAS =====
// Lee metadata de cartas desde SERVER_NODE_CONFIG (sin duplicar datos)

import { SERVER_NODE_CONFIG } from '../../../config/serverNodes.js';

export class AICardAdapter {
    /**
     * Obtiene el coste de una carta
     * @param {string} cardId - ID de la carta
     * @returns {number|null} Coste de la carta o null si no existe
     */
    static getCost(cardId) {
        const cost = SERVER_NODE_CONFIG.costs[cardId];
        return cost !== undefined ? cost : null;
    }
    
    /**
     * Obtiene los requisitos de una carta (directos e indirectos)
     * @param {string} cardId - ID de la carta
     * @returns {Array<string>} Array de IDs de edificios requeridos, o array vacío si no hay requisitos
     */
    static getRequirements(cardId) {
        const requirements = [];
        
        // 1. Requisitos directos (desde buildRequirements)
        const buildReqs = SERVER_NODE_CONFIG.buildRequirements?.[cardId]?.required;
        if (buildReqs && Array.isArray(buildReqs)) {
            requirements.push(...buildReqs);
        }
        
        // 2. Requisitos indirectos (para consumibles)
        const indirectReqs = this.getIndirectRequirements(cardId);
        if (indirectReqs && indirectReqs.length > 0) {
            requirements.push(...indirectReqs);
        }
        
        return requirements;
    }
    
    /**
     * Obtiene requisitos indirectos de consumibles
     * ⚠️ NOTA: Los requisitos principales deben venir de SERVER_NODE_CONFIG.buildRequirements
     * Este método queda como extensión para reglas especiales que no encajen bien en configuración
     * @param {string} cardId - ID de la carta
     * @returns {Array<string>} Array de IDs de edificios requeridos
     */
    static getIndirectRequirements(cardId) {
        // Actualmente todos los requisitos están modelados en buildRequirements
        // Se deja este hook para futura lógica especial si fuera necesaria
        return [];
    }
    
    /**
     * Verifica si una carta está en el mazo del jugador
     * @param {string} cardId - ID de la carta
     * @param {Object} deck - Objeto del mazo con { units, bench }
     * @returns {boolean} True si la carta está en el mazo
     */
    static isInDeck(cardId, deck) {
        if (!deck || !deck.units) {
            return false;
        }
        
        // Buscar en units (mazo principal)
        if (deck.units.includes(cardId)) {
            return true;
        }
        
        // También buscar en bench (banquillo) si existe
        if (deck.bench && deck.bench.includes(cardId)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Verifica si una carta está habilitada en el juego
     * @param {string} cardId - ID de la carta
     * @returns {boolean|null} True si está habilitada, false si está deshabilitada, null si no existe
     */
    static isEnabled(cardId) {
        const enabled = SERVER_NODE_CONFIG.gameplay?.enabled?.[cardId];
        
        if (enabled === undefined) {
            return null; // No existe en la configuración
        }
        
        return enabled === true;
    }
}

