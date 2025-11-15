// ===== SISTEMA DE CURRENCY (SERVIDOR) =====
import { GAME_CONFIG } from '../../config/gameConfig.js';
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

export class CurrencySystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.raceManager = gameState.raceManager; // 🆕 MODULARIZADO: Acceso al RaceManager
    }
    
    /**
     * Actualiza la generación de currency pasiva
     * @param {number} dt - Delta time en segundos
     */
    updateCurrency(dt) {
        // Base pasiva
        let player1Income = GAME_CONFIG.currency.passiveRate;
        let player2Income = GAME_CONFIG.currency.passiveRate;
        
        // Bonus de Plantas Nucleares (solo si no están disabled)
        const nuclearBonus = SERVER_NODE_CONFIG.effects.nuclearPlant.incomeBonus;
        const player1Plants = this.gameState.nodes.filter(n => 
            n.type === 'nuclearPlant' && 
            n.team === 'player1' && 
            this.raceManager.canNodeProvideBonus(n) // 🆕 MODULARIZADO: Usar función helper
        ).length;
        const player2Plants = this.gameState.nodes.filter(n => 
            n.type === 'nuclearPlant' && 
            n.team === 'player2' && 
            this.raceManager.canNodeProvideBonus(n) // 🆕 MODULARIZADO: Usar función helper
        ).length;
        
        player1Income += player1Plants * nuclearBonus;
        player2Income += player2Plants * nuclearBonus;
        
        // 🆕 Bonus de Estudios de Física: +1 currency/segundo por planta nuclear si hay al menos una universidad
        const physicStudiesBonus = SERVER_NODE_CONFIG.effects.physicStudies.nuclearPlantBonus;
        
        // Verificar si hay al menos una universidad de física construida y no disabled para cada jugador
        const player1HasPhysicStudies = this.gameState.nodes.some(n => 
            n.type === 'physicStudies' && 
            n.team === 'player1' && 
            this.raceManager.canNodeProvideBonus(n) // 🆕 MODULARIZADO: Usar función helper
        );
        const player2HasPhysicStudies = this.gameState.nodes.some(n => 
            n.type === 'physicStudies' && 
            n.team === 'player2' && 
            this.raceManager.canNodeProvideBonus(n) // 🆕 MODULARIZADO: Usar función helper
        );
        
        // Aplicar bonus si hay al menos una universidad (no se acumula con otras universidades)
        if (player1HasPhysicStudies && player1Plants > 0) {
            player1Income += player1Plants * physicStudiesBonus;
        }
        if (player2HasPhysicStudies && player2Plants > 0) {
            player2Income += player2Plants * physicStudiesBonus;
        }
        
        // 🆕 Bonus de Laboratorio Secreto: +1 currency/segundo por planta nuclear si hay al menos un laboratorio secreto
        // Este bonus es INDEPENDIENTE de Estudios de Física (se acumula con él)
        const secretLaboratoryBonus = SERVER_NODE_CONFIG.effects.secretLaboratory.nuclearPlantBonus;
        
        // Verificar si hay al menos un laboratorio secreto construido y no disabled para cada jugador
        const player1HasSecretLaboratory = this.gameState.nodes.some(n => 
            n.type === 'secretLaboratory' && 
            n.team === 'player1' && 
            this.raceManager.canNodeProvideBonus(n) // 🆕 MODULARIZADO: Usar función helper
        );
        const player2HasSecretLaboratory = this.gameState.nodes.some(n => 
            n.type === 'secretLaboratory' && 
            n.team === 'player2' && 
            this.raceManager.canNodeProvideBonus(n) // 🆕 MODULARIZADO: Usar función helper
        );
        
        // Aplicar bonus si hay al menos un laboratorio secreto (no se acumula con otros laboratorios secretos, pero SÍ con Estudios de Física)
        if (player1HasSecretLaboratory && player1Plants > 0) {
            player1Income += player1Plants * secretLaboratoryBonus;
        }
        if (player2HasSecretLaboratory && player2Plants > 0) {
            player2Income += player2Plants * secretLaboratoryBonus;
        }
        
        const p1Generated = player1Income * dt;
        const p2Generated = player2Income * dt;
        
        this.gameState.currency.player1 += p1Generated;
        this.gameState.currency.player2 += p2Generated;
        
        // Acumular currency total generado
        this.gameState.currencyGenerated.player1 += p1Generated;
        this.gameState.currencyGenerated.player2 += p2Generated;
        

    }
}

