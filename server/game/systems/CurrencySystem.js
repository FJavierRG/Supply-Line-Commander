// ===== SISTEMA DE CURRENCY (SERVIDOR) =====
import { GAME_CONFIG } from '../../config/gameConfig.js';
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';
import AIConfig from '../ai/config/AIConfig.js';

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

        const passiveBonus = AIConfig.economy.passiveIncomeBonus || {};
        const aiDifficulty = this.gameState.room?.aiPlayer?.difficulty || 'medium';
        const aiPassiveBonus = passiveBonus[aiDifficulty] || 0;

        // Asumimos player2 como IA
        player2Income += aiPassiveBonus;
        
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
        
        // 🆕 Bonus de Servidores: +0.5 currency/segundo por cada servidor construido
        const serversBonus = SERVER_NODE_CONFIG.effects.servers.incomeBonus;
        const player1Servers = this.gameState.nodes.filter(n => 
            n.type === 'servers' && 
            n.team === 'player1' && 
            this.raceManager.canNodeProvideBonus(n) // 🆕 Usar función helper
        ).length;
        const player2Servers = this.gameState.nodes.filter(n => 
            n.type === 'servers' && 
            n.team === 'player2' && 
            this.raceManager.canNodeProvideBonus(n) // 🆕 Usar función helper
        ).length;
        
        player1Income += player1Servers * serversBonus;
        player2Income += player2Servers * serversBonus;
        
        // 🆕 Bonus de Torre de Telecomunicaciones: +2$/s por cada Radio Intel aliada jugada en la partida
        // No se acumula con otras torres (solo cuenta una)
        const telecomsTowerConfig = SERVER_NODE_CONFIG.effects.telecomsTower;
        
        // Verificar si hay al menos una torre de telecomunicaciones construida y no disabled para cada jugador
        const player1HasTelecomsTower = this.gameState.nodes.some(n => 
            n.type === 'telecomsTower' && 
            n.team === 'player1' && 
            this.raceManager.canNodeProvideBonus(n)
        );
        const player2HasTelecomsTower = this.gameState.nodes.some(n => 
            n.type === 'telecomsTower' && 
            n.team === 'player2' && 
            this.raceManager.canNodeProvideBonus(n)
        );
        
        // Aplicar bonus si hay al menos una torre (no se acumula con otras torres)
        if (player1HasTelecomsTower) {
            const intelRadioCount = this.gameState.intelRadiosConsumed.player1 || 0;
            const telecomsBonus = telecomsTowerConfig.baseIncomeBonus + (intelRadioCount * telecomsTowerConfig.bonusPerIntelRadio);
            player1Income += telecomsBonus;
        }
        if (player2HasTelecomsTower) {
            const intelRadioCount = this.gameState.intelRadiosConsumed.player2 || 0;
            const telecomsBonus = telecomsTowerConfig.baseIncomeBonus + (intelRadioCount * telecomsTowerConfig.bonusPerIntelRadio);
            player2Income += telecomsBonus;
        }
        
        // 🆕 DISCIPLINA: Bonus de "Combate Defensivo" (+1 currency/segundo por frente en modo hold)
        const disciplineBonus = this.applyDisciplineBonus();
        player1Income += disciplineBonus.player1;
        player2Income += disciplineBonus.player2;
        
        const p1Generated = player1Income * dt;
        const p2Generated = player2Income * dt;
        
        this.gameState.currency.player1 += p1Generated;
        this.gameState.currency.player2 += p2Generated;
        
        // Acumular currency total generado
        this.gameState.currencyGenerated.player1 += p1Generated;
        this.gameState.currencyGenerated.player2 += p2Generated;
        

    }
    
    /**
     * 🆕 NUEVO: Aplica bonus de currency de disciplinas activas
     * @returns {Object} - { player1: number, player2: number } - Bonus de income por segundo
     */
    applyDisciplineBonus() {
        let player1Bonus = 0;
        let player2Bonus = 0;
        
        // Obtener modificadores de frontMode para cada equipo
        const p1Modifiers = this.gameState.disciplineManager.getModifiersForSystem('player1', 'frontMode');
        const p2Modifiers = this.gameState.disciplineManager.getModifiersForSystem('player2', 'frontMode');
        
        // Player 1: Contar frentes en modo hold si la disciplina está activa
        if (p1Modifiers.targetMode && p1Modifiers.currencyPerSecondPerFront) {
            const frontesInHold = this.gameState.nodes.filter(n => 
                n.type === 'front' && 
                n.team === 'player1' && 
                n.frontMode === p1Modifiers.targetMode
            ).length;
            player1Bonus = frontesInHold * p1Modifiers.currencyPerSecondPerFront;
        }
        
        // Player 2: Contar frentes en modo hold si la disciplina está activa
        if (p2Modifiers.targetMode && p2Modifiers.currencyPerSecondPerFront) {
            const frontesInHold = this.gameState.nodes.filter(n => 
                n.type === 'front' && 
                n.team === 'player2' && 
                n.frontMode === p2Modifiers.targetMode
            ).length;
            player2Bonus = frontesInHold * p2Modifiers.currencyPerSecondPerFront;
        }
        
        return { player1: player1Bonus, player2: player2Bonus };
    }
}

