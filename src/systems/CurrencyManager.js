// ===== GESTOR DE CURRENCY =====

export class CurrencyManager {
    constructor(game = null) {
        this.game = game; // Referencia al juego para acceder a edificios
        this.missionCurrency = 0; // Currency temporal de la misión
        this.passiveCurrencyAccumulator = 0; // Acumulador para fracciones de segundo
    }
    
    /**
     * Resetea la currency al inicio de una misión
     */
    reset() {
        this.missionCurrency = 0;
        this.passiveCurrencyAccumulator = 0;
    }
    
    /**
     * Actualiza la currency pasiva (generación constante)
     * ⚠️ LEGACY REMOVED: El servidor maneja toda la generación de currency.
     * El cliente solo debe leer la currency que viene del estado del servidor.
     * @param {number} dt - Delta time en segundos
     */
    updatePassiveCurrency(dt) {
        // ⚠️ LEGACY REMOVED: El servidor autoritativo maneja toda la generación de currency.
        // El cliente solo debe leer la currency que viene del estado del servidor.
        // Este método debe mantenerse vacío o solo para compatibilidad con código legacy.
        
        // NO calcular currency aquí - el servidor maneja esto
        // La currency debe venir del estado del servidor vía NetworkManager.applyGameState()
    }
    
    /**
     * Calcula el bonus de currency de las plantas nucleares activas
     * @returns {number} Bonus total de currency por segundo
     */
    getNuclearPlantBonus() {
        if (!this.game || !this.game.nodes) return 0;
        
        // Solo contar plantas nucleares de MI equipo
        const myTeam = this.game.myTeam || 'player1';
        const nuclearPlants = this.game.nodes.filter(n => 
            n.type === 'nuclearPlant' && 
            n.team === myTeam &&
            n.constructed && 
            !n.isConstructing &&
            !n.isAbandoning
        );
        
        // Cada planta nuclear añade +2 currency/segundo
        return nuclearPlants.length * 2;
    }
    
    /**
     * Añade currency temporal de la misión (por avance de terreno)
     * ⚠️ LEGACY REMOVED: El servidor maneja todos los cambios de currency.
     * Este método solo debería usarse cuando el servidor notifica cambios.
     * @param {number} amount - Cantidad a añadir
     */
    add(amount) {
        // ⚠️ LEGACY: El servidor debería notificar cuando la currency cambia.
        // Este método solo debería ejecutarse cuando el servidor envía actualización de currency.
        // Por ahora, mantener para compatibilidad pero agregar warning.
        console.warn('⚠️ LEGACY: CurrencyManager.add() llamado - debería venir del servidor');
        this.missionCurrency += amount;
    }
    
    /**
     * Gasta currency temporal de la misión
     * ⚠️ LEGACY REMOVED: El servidor maneja todos los gastos de currency.
     * Este método solo debería usarse para validación local o efectos visuales.
     * @param {number} amount - Cantidad a gastar
     * @returns {boolean} true si se pudo gastar, false si no hay suficiente
     */
    spend(amount) {
        // ⚠️ LEGACY: El servidor debería validar y ejecutar todos los gastos.
        // Este método solo debería usarse para validación local o efectos visuales.
        // NO debería modificar el estado real - el servidor es la autoridad.
        console.warn('⚠️ LEGACY: CurrencyManager.spend() llamado - debería validarse en el servidor');
        if (this.missionCurrency >= amount) {
            this.missionCurrency -= amount;
            return true;
        }
        return false;
    }
    
    /**
     * Obtiene la currency actual de la misión
     * @returns {number} Currency disponible
     */
    get() {
        return this.missionCurrency;
    }
    
    /**
     * Verifica si hay suficiente currency
     * @param {number} amount - Cantidad a verificar
     * @returns {boolean} true si hay suficiente
     */
    canAfford(amount) {
        return this.missionCurrency >= amount;
    }
}













