// ===== SISTEMA CORE DE IA =====
// Orquesta toda la lógica común de la IA (abastecimiento, emergencias, reparaciones)

import { AISupplyManager } from './AISupplyManager.js';
import { AIMedicalManager } from './AIMedicalManager.js';
import { AIRepairManager } from './AIRepairManager.js';
import AIConfig from '../config/AIConfig.js';
import { getAdjustedInterval } from '../config/AIConfig.js';

export class AICoreSystem {
    constructor(gameState, io, roomId, raceId, difficulty) {
        this.gameState = gameState;
        this.io = io;
        this.roomId = roomId;
        this.raceId = raceId;
        this.difficulty = difficulty;
        
        // Crear instancias de los managers
        this.supplyManager = new AISupplyManager(gameState, io, roomId, raceId, difficulty);
        this.medicalManager = new AIMedicalManager(gameState, io, roomId);
        this.repairManager = new AIRepairManager(gameState, io, roomId);
        
        // Timers para cada tipo de acción
        this.timers = {
            fobCheck: 0,        // Revisar FOBs
            frontCheck: 0,      // Revisar frentes
            helicopterCheck: 0, // Revisar helicópteros
            medical: 0,         // Revisar emergencias médicas
            repair: 0           // Revisar reparaciones
        };
        
        // 🎯 INTERVALOS AJUSTADOS POR DIFICULTAD usando getAdjustedInterval
        // Ahora los intervalos están definidos directamente en AIConfig.intervals
        this.intervals = {
            fobCheck: getAdjustedInterval('supplyFob', difficulty),
            frontCheck: getAdjustedInterval('supplyFront', difficulty),
            helicopterCheck: getAdjustedInterval('supplyHelicopter', difficulty),
            medical: getAdjustedInterval('medical', difficulty),
            repair: getAdjustedInterval('repair', difficulty)
        };
        
        // Currency tracking
        this.currency = 0;
    }
    
    /**
     * Actualiza el sistema core (llamado cada frame/tick)
     */
    update(dt) {
        const team = 'player2';
        
        // Actualizar currency
        this.updateCurrency(dt);
        const currency = this.gameState.currency[team] || 0;
        
        // 1. Reabastecimiento FOBs desde HQ (cada 2 segundos)
        this.timers.fobCheck += dt;
        if (this.timers.fobCheck >= this.intervals.fobCheck) {
            this.timers.fobCheck = 0;
            this.supplyManager.ruleResupplyFOBs(team);
        }
        
        // 2. Reabastecimiento frentes desde FOBs (cada 3 segundos)
        this.timers.frontCheck += dt;
        if (this.timers.frontCheck >= this.intervals.frontCheck) {
            this.timers.frontCheck = 0;
            this.supplyManager.ruleResupplyFronts(team);
        }
        
        // 3. Reabastecimiento con helicópteros (cada 1.5 segundos)
        this.timers.helicopterCheck += dt;
        if (this.timers.helicopterCheck >= this.intervals.helicopterCheck) {
            this.timers.helicopterCheck = 0;
            this.supplyManager.ruleResupplyHelicopters(team);
        }
        
        // 4. Emergencias médicas (cada 3 segundos)
        this.timers.medical += dt;
        if (this.timers.medical >= this.intervals.medical) {
            this.timers.medical = 0;
            this.medicalManager.handleMedicalEmergencies(team, currency);
        }
        
        // 5. Reparaciones (cada 4 segundos)
        this.timers.repair += dt;
        if (this.timers.repair >= this.intervals.repair) {
            this.timers.repair = 0;
            this.repairManager.handleRepairs(team, currency);
        }
    }
    
    /**
     * Actualiza el tracking de currency
     */
    updateCurrency(dt) {
        // Currency se maneja en CurrencySystem
        // Solo trackeamos el valor actual
        if (this.gameState.currency) {
            const newCurrency = this.gameState.currency.player2 || 0;
            
            // Debug: Detectar incrementos sospechosos de currency
            if (AIConfig.debug.logActions && this.currency > 0) {
                const currencyIncrease = newCurrency - this.currency;
                if (currencyIncrease > 50) {
                    // Log desactivado por ahora
                }
            }
            
            this.currency = newCurrency;
        }
    }
}

