// ===== GESTOR DE ESTADOS DEL JUEGO =====

/**
 * GameStateManager - Gestión centralizada de estados del juego
 * 
 * Responsabilidades:
 * - Mantener estado actual del juego
 * - Validar transiciones de estado
 * - Notificar cambios de estado a listeners
 * - Proporcionar API consistente para cambios de estado
 */
export class GameStateManager {
    constructor() {
        this.currentState = 'menu';
        this.previousState = null;
        this.listeners = new Map(); // state -> [callbacks]
    }
    
    /**
     * Obtiene el estado actual del juego
     * @returns {string} Estado actual
     */
    getCurrentState() {
        return this.currentState;
    }
    
    /**
     * Obtiene el estado anterior
     * @returns {string|null} Estado anterior o null
     */
    getPreviousState() {
        return this.previousState;
    }
    
    /**
     * Cambia el estado del juego
     * @param {string} newState - Nuevo estado
     * @returns {boolean} True si el cambio fue exitoso
     */
    setState(newState) {
        // No cambiar si es el mismo estado
        if (this.currentState === newState) {
            return true;
        }
        
        // Validar transición
        if (!this.canTransitionTo(newState)) {
            console.warn(`⚠️ Transición de estado inválida: ${this.currentState} → ${newState}`);
            return false;
        }
        
        // Guardar estado anterior
        const oldState = this.currentState;
        this.previousState = oldState;
        this.currentState = newState;
        
        // Notificar listeners
        this.notifyStateChange(oldState, newState);
        
        console.log(`🎮 GameStateManager: ${oldState} → ${newState}`);
        return true;
    }
    
    /**
     * Verifica si se puede transicionar a un nuevo estado
     * @param {string} newState - Nuevo estado
     * @returns {boolean} True si la transición es válida
     */
    canTransitionTo(newState) {
        // Por ahora permitir todas las transiciones
        // En el futuro se pueden añadir reglas específicas
        const validStates = [
            'menu',
            'playing',
            'paused',
            'tutorial',
            'editor',
            'victory',
            'defeat'
        ];
        
        return validStates.includes(newState);
    }
    
    /**
     * Registra un listener para cambios de estado
     * @param {Function} callback - Función a llamar cuando cambia el estado
     */
    onStateChange(callback) {
        if (!this.listeners.has('*')) {
            this.listeners.set('*', []);
        }
        this.listeners.get('*').push(callback);
    }
    
    /**
     * Registra un listener para cambios a un estado específico
     * @param {string} state - Estado a escuchar
     * @param {Function} callback - Función a llamar cuando se cambia a ese estado
     */
    onStateChangeTo(state, callback) {
        if (!this.listeners.has(state)) {
            this.listeners.set(state, []);
        }
        this.listeners.get(state).push(callback);
    }
    
    /**
     * Elimina un listener específico
     * @param {Function} callback - Callback a eliminar
     */
    removeListener(callback) {
        // Buscar y eliminar de todos los arrays
        this.listeners.forEach((callbacks, key) => {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        });
    }
    
    /**
     * Notifica a todos los listeners sobre un cambio de estado
     * @param {string} oldState - Estado anterior
     * @param {string} newState - Estado nuevo
     */
    notifyStateChange(oldState, newState) {
        // Notificar listeners generales
        const generalListeners = this.listeners.get('*') || [];
        generalListeners.forEach(cb => {
            try {
                cb(newState, oldState);
            } catch (error) {
                console.error(`❌ Error en listener de estado:`, error);
            }
        });
        
        // Notificar listeners específicos del nuevo estado
        const specificListeners = this.listeners.get(newState) || [];
        specificListeners.forEach(cb => {
            try {
                cb(newState, oldState);
            } catch (error) {
                console.error(`❌ Error en listener de estado ${newState}:`, error);
            }
        });
    }
    
    /**
     * Resetea el estado al estado inicial
     */
    reset() {
        const oldState = this.currentState;
        this.currentState = 'menu';
        this.previousState = oldState;
        this.notifyStateChange(oldState, 'menu');
    }
}

