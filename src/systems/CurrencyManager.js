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
     * @param {number} dt - Delta time en segundos
     */
    updatePassiveCurrency(dt) {
        // Calcular bonus de plantas nucleares
        const nuclearBonus = this.getNuclearPlantBonus();
        const passiveRate = this.game?.serverBuildingConfig?.currency?.passiveRate || 3;
        const totalRate = passiveRate + nuclearBonus;
        
        this.passiveCurrencyAccumulator += dt * totalRate;
        
        // Cuando acumulamos al menos 1, otorgar currency
        if (this.passiveCurrencyAccumulator >= 1) {
            const currencyToAdd = Math.floor(this.passiveCurrencyAccumulator);
            this.missionCurrency += currencyToAdd;
            this.passiveCurrencyAccumulator -= currencyToAdd;
        }
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
     * @param {number} amount - Cantidad a añadir
     */
    add(amount) {
        this.missionCurrency += amount;
    }
    
    /**
     * Gasta currency temporal de la misión
     * @param {number} amount - Cantidad a gastar
     * @returns {boolean} true si se pudo gastar, false si no hay suficiente
     */
    spend(amount) {
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













