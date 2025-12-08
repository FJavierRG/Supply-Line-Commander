// ===== CLASE BASE DE PERFILES DE IA =====
// Define la interfaz común que todos los perfiles deben implementar

export class BaseProfile {
    constructor(deck) {
        if (!deck) {
            throw new Error('BaseProfile: deck es requerido');
        }
        this.deck = deck;

        // 🛟 Sistema de colchón dinámico compartido por todos los perfiles
        this.currencyBuffer = {
            current: 0,
            lastIncreaseTime: 0,
            hasAirThreat: false
        };
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

    /**
     * Actualiza el colchón de currency según el tiempo de partida y amenazas
     * @param {Object} gameState
     */
    updateCurrencyBuffer(gameState) {
        if (!gameState) return;

        const gameTime = gameState.gameTime || 0;
        const deltaTime = Math.max(0, gameTime - (this.currencyBuffer.lastIncreaseTime || 0));

        // Actualizar estado de amenaza aérea
        const playerHasDroneLauncher = gameState.nodes?.some?.(n =>
            n.team === 'player1' &&
            n.type === 'droneLauncher' &&
            n.active &&
            n.constructed &&
            !n.isAbandoning
        ) || false;
        this.currencyBuffer.hasAirThreat = playerHasDroneLauncher;

        const buffer = this.currencyBuffer;

        // Reseteo si la IA ha caído por debajo de 60 currency reales
        const myCurrency = gameState.currency?.player2 ?? 0;
        if (myCurrency < 60 && buffer.current > 0) {
            buffer.current = 0;
            buffer.lastIncreaseTime = gameTime;
            return;
        }

        // Primer minuto: sin colchón
        if (gameTime < 60) {
            buffer.current = 0;
            buffer.lastIncreaseTime = gameTime;
            return;
        }

        const incrementInterval = 30; // cada 30 segundos
        if (deltaTime < incrementInterval) {
            return; // aún no toca incrementar
        }

        const increments = Math.floor(deltaTime / incrementInterval);
        if (increments <= 0) return;

        // 🎯 AJUSTADO: Colchón más moderado para no bloquear estrategias
        let amountPerTick = buffer.hasAirThreat ? 50 : 20;  // Reducido de 80/35 a 50/20

        // 🎯 AJUSTADO: Tope más bajo (100$ en vez de 135$) - suficiente para antiDrone de emergencia
        const maxBuffer = 100;
        
        // Si ya alcanzó el tope, no seguir aumentando
        if (buffer.current >= maxBuffer) {
            amountPerTick = 0;
        }

        buffer.current = Math.min(maxBuffer, buffer.current + amountPerTick * increments);
        buffer.lastIncreaseTime = gameTime;
    }

    /**
     * Devuelve la currency disponible para compras (restando el colchón)
     */
    getAvailableCurrency(gameState) {
        const rawCurrency = gameState.currency?.player2 ?? 0;
        const buffer = Math.min(this.currencyBuffer.current || 0, 100);  // 🎯 AJUSTADO: Tope 100$
        return Math.max(0, rawCurrency - buffer);
    }

    /**
     * Devuelve la currency total (sin colchón)
     */
    getRawCurrency(gameState) {
        return gameState.currency?.player2 ?? 0;
    }

    /**
     * Devuelve el valor actual del colchón
     */
    getCurrencyBuffer() {
        return this.currencyBuffer.current || 0;
    }
}

