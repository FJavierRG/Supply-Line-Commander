// ===== CLASE BASE DE PERFILES DE IA =====
// Define la interfaz común que todos los perfiles deben implementar

export class BaseProfile {
    constructor(deck) {
        if (!deck) {
            throw new Error('BaseProfile: deck es requerido');
        }
        this.deck = deck;
    }
    
    /**
     * Retorna el ID único del perfil
     * @returns {string} ID del perfil
     */
    getProfileId() {
        throw new Error('BaseProfile: getProfileId() debe ser implementado por la subclase');
    }
    
    /**
     * Retorna el mazo del perfil
     * @returns {Object} Objeto del mazo con { units, bench }
     */
    getDeck() {
        return this.deck;
    }
    
    /**
     * Retorna las reglas de scoring del perfil
     * @returns {Object} Objeto con reglas de scoring para cada carta
     */
    getScoringRules() {
        throw new Error('BaseProfile: getScoringRules() debe ser implementado por la subclase');
    }
    
    /**
     * Retorna las prioridades del perfil por fase
     * @returns {Object} Objeto con prioridades: { earlyGame: [...], midGame: [...], lateGame: [...] }
     */
    getPriorities() {
        throw new Error('BaseProfile: getPriorities() debe ser implementado por la subclase');
    }
}

