// ===== GESTOR DE CURRENCY (SOLO VISUAL) =====
// ⚠️ IMPORTANTE: Este sistema SOLO muestra currency del servidor.
// NO calcula ni modifica currency - el servidor es la autoridad.

export class CurrencyManager {
    constructor(game = null) {
        this.game = game;
        // Currency mostrada (viene del servidor)
        this.missionCurrency = 0;
    }
    
    /**
     * Resetea la currency al inicio de una misión
     */
    reset() {
        this.missionCurrency = 0;
    }
    
    /**
     * === LEGACY REMOVED: updatePassiveCurrency eliminado ===
     * El servidor maneja toda la generación de currency.
     */
    
    /**
     * Calcula el bonus de currency de las plantas nucleares activas
     * SOLO para visualización - el servidor calcula el bonus real
     * @returns {number} Bonus total de currency por segundo (visual)
     */
    getNuclearPlantBonus() {
        if (!this.game || !this.game.nodes) return 0;
        
        // Solo contar plantas nucleares de MI equipo (para visualización)
        const myTeam = this.game.myTeam || 'player1';
        const nuclearPlants = this.game.nodes.filter(n => 
            n.type === 'nuclearPlant' && 
            n.team === myTeam &&
            n.constructed && 
            !n.isConstructing &&
            !n.isAbandoning
        );
        
        // Cada planta nuclear añade +2 currency/segundo (visual)
        return nuclearPlants.length * 2;
    }
    
    /**
     * Añade currency temporal de la misión (por avance de terreno)
     * ⚠️ SOLO PARA VISUALIZACIÓN: El servidor maneja todos los cambios de currency.
     * Este método solo actualiza el valor visual cuando el servidor notifica cambios.
     * @param {number} amount - Cantidad a añadir
     */
    add(amount) {
        // ⚠️ SOLO VISUAL: El servidor es la autoridad
        this.missionCurrency += amount;
    }
    
    /**
     * Gasta currency temporal de la misión
     * ⚠️ SOLO PARA VALIDACIÓN UI LOCAL: El servidor valida y ejecuta todos los gastos.
     * Este método solo se usa para validación previa en la UI.
     * @param {number} amount - Cantidad a gastar
     * @returns {boolean} true si hay suficiente (visual)
     */
    spend(amount) {
        // ⚠️ SOLO VALIDACIÓN UI: El servidor valida y ejecuta
        if (this.missionCurrency >= amount) {
            this.missionCurrency -= amount;
            return true;
        }
        return false;
    }
    
    /**
     * Obtiene la currency actual de la misión (visual)
     * @returns {number} Currency disponible (viene del servidor)
     */
    get() {
        return this.missionCurrency;
    }
    
    /**
     * Verifica si hay suficiente currency (validación UI)
     * @param {number} amount - Cantidad a verificar
     * @returns {boolean} true si hay suficiente (visual)
     */
    canAfford(amount) {
        return this.missionCurrency >= amount;
    }
    
    /**
     * Actualiza la currency desde el estado del servidor
     * @param {number} newCurrency - Nueva currency del servidor
     */
    updateFromServer(newCurrency) {
        this.missionCurrency = newCurrency;
    }
}













