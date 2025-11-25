// ===== MANAGER DE SUMINISTROS =====
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

export class SupplyManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.lastSupplyLog = {}; // Para debug de consumo
    }
    
    /**
     * Obtiene el multiplicador de consumo según el modo del frente
     * @param {Object} node - Nodo de frente
     * @returns {number} Multiplicador de consumo (0.75 para HOLD, 1.0 para otros)
     */
    getConsumeMultiplierForMode(node) {
        if (!node.frontMode) return 1.0;
        
        const modes = SERVER_NODE_CONFIG.gameplay.front.modes;
        const modeConfig = modes[node.frontMode];
        
        return modeConfig ? modeConfig.consumeMultiplier : 1.0;
    }
    
    /**
     * 🆕 NUEVO: Aplica modificadores de disciplinas activas al consumo de suministros
     * @param {Object} node - Nodo de frente
     * @param {number} currentMultiplier - Multiplicador actual de consumo
     * @returns {number} Multiplicador modificado con efectos de disciplina
     */
    applyDisciplineModifiers(node, currentMultiplier) {
        // Obtener modificadores de la disciplina activa del jugador
        const modifiers = this.gameState.disciplineManager.getModifiersForSystem(node.team, 'frontMode');
        
        // Verificar si hay efectos de modo de frente y si el frente está en el modo correcto
        if (modifiers.targetMode && modifiers.targetMode === node.frontMode) {
            // Aplicar bonus de reducción de consumo (si existe)
            if (modifiers.consumeMultiplierBonus) {
                currentMultiplier += modifiers.consumeMultiplierBonus;
                // Asegurar que nunca sea negativo
                currentMultiplier = Math.max(0, currentMultiplier);
            }
        }
        
        return currentMultiplier;
    }

    /**
     * Actualiza el consumo de supplies en frentes usando configuración del servidor
     * 🆕 FIX: Ahora usa node.consumeRate para respetar efectos temporales (wounded, etc.)
     * 🆕 SISTEMA DE MODOS: Aplica multiplicador de consumo según el modo (HOLD = 75%)
     * @param {number} dt - Delta time en segundos
     */
    update(dt) {
        // === CONSUMO DE SUPPLIES EN FRENTES ===
        for (const node of this.gameState.nodes) {
            if (node.type === 'front' && node.hasSupplies) {
                // 🆕 FIX: Usar consumeRate del nodo (puede estar modificado por efectos como wounded)
                // Si no está definido, usar el valor por defecto de la configuración
                const baseConsumeRate = node.consumeRate || SERVER_NODE_CONFIG.gameplay.front.consumeRate;
                
                // 🆕 SISTEMA DE MODOS: Aplicar multiplicador según el modo
                // HOLD consume al 75%, ADVANCE y RETREAT al 100%
                let modeMultiplier = this.getConsumeMultiplierForMode(node);
                
                // 🆕 DISCIPLINA: Aplicar bonus adicional si hay disciplina activa
                modeMultiplier = this.applyDisciplineModifiers(node, modeMultiplier);
                
                const finalConsumeRate = baseConsumeRate * modeMultiplier;
                
                const beforeSupplies = node.supplies;
                node.supplies = Math.max(0, node.supplies - finalConsumeRate * dt);
                
            }
        }
        
        // === REGENERACIÓN PASIVA DE SUPPLIES EN HQ ===
        // 🆕 REWORK: El HQ regenera suministros de forma pasiva
        for (const node of this.gameState.nodes) {
            if (node.type === 'hq' && node.hasSupplies && node.supplyRegenerationRate) {
                // El HQ es inmune a estados alterados, no necesita verificar disabled/broken
                // Solo verificar que esté activo
                if (node.active) {
                    const regenAmount = node.supplyRegenerationRate * dt;
                    node.supplies = Math.min(node.maxSupplies, node.supplies + regenAmount);
                }
            }
        }
        
        // === GENERACIÓN DE SUMINISTROS POR FÁBRICAS ===
        // ✅ REMOVIDO: La generación de suministros ahora se maneja en FactorySupplySystem
        // Las fábricas crean envíos reales que viajan al HQ (similar a trenes)
    }
}
