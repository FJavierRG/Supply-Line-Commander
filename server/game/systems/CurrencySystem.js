// ===== SISTEMA DE CURRENCY (SERVIDOR) =====
import { GAME_CONFIG } from '../../config/gameConfig.js';
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

export class CurrencySystem {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Actualiza la generación de currency pasiva
     * @param {number} dt - Delta time en segundos
     */
    updateCurrency(dt) {
        // Base pasiva
        let player1Income = GAME_CONFIG.currency.passiveRate;
        let player2Income = GAME_CONFIG.currency.passiveRate;
        
        // Bonus de Plantas Nucleares
        const nuclearBonus = SERVER_NODE_CONFIG.effects.nuclearPlant.incomeBonus;
        const player1Plants = this.gameState.nodes.filter(n => 
            n.type === 'nuclearPlant' && n.team === 'player1' && n.constructed
        ).length;
        const player2Plants = this.gameState.nodes.filter(n => 
            n.type === 'nuclearPlant' && n.team === 'player2' && n.constructed
        ).length;
        
        player1Income += player1Plants * nuclearBonus;
        player2Income += player2Plants * nuclearBonus;
        
        const p1Generated = player1Income * dt;
        const p2Generated = player2Income * dt;
        
        this.gameState.currency.player1 += p1Generated;
        this.gameState.currency.player2 += p2Generated;
        
        // Acumular currency total generado
        this.gameState.currencyGenerated.player1 += p1Generated;
        this.gameState.currencyGenerated.player2 += p2Generated;
        
        // DEBUG: Log currency cada 5 segundos
        if (!this._lastCurrencyLog || Date.now() - this._lastCurrencyLog > 5000) {
            const p1Bonus = player1Plants > 0 ? ` (+${player1Plants * nuclearBonus}/s plantas)` : '';
            const p2Bonus = player2Plants > 0 ? ` (+${player2Plants * nuclearBonus}/s plantas)` : '';
            console.log(`💰 Currency: P1=${this.gameState.currency.player1.toFixed(1)}$${p1Bonus} | P2=${this.gameState.currency.player2.toFixed(1)}$${p2Bonus}`);
            this._lastCurrencyLog = Date.now();
        }
    }
}

