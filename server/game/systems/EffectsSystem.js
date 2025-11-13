// ===== SISTEMA DE EFECTOS TEMPORALES (SERVIDOR) =====
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

export class EffectsSystem {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Actualiza efectos temporales y elimina los expirados
     * 🆕 FIX: Usa originalConsumeRate guardado en el efecto para restaurar correctamente
     * @param {number} dt - Delta time en segundos
     */
    updateEffects(dt) {
        for (const node of this.gameState.nodes) {
            if (node.effects && node.effects.length > 0) {
                // Filtrar efectos expirados
                const beforeCount = node.effects.length;
                node.effects = node.effects.filter(effect => {
                    if (effect.expiresAt && this.gameState.gameTime >= effect.expiresAt) {
                        // Efecto expirado - restaurar valores
                        if (effect.type === 'wounded' && node.type === 'front') {
                            // 🆕 FIX: Restaurar usando originalConsumeRate guardado en el efecto
                            // Si no está guardado, usar fallback (dividir por multiplicador conocido)
                            if (effect.originalConsumeRate !== undefined) {
                                node.consumeRate = effect.originalConsumeRate;
                                console.log(`✅ Efecto wounded expirado en frente ${node.id} - Consumo restaurado: ${node.consumeRate}`);
                            } else {
                                // Fallback: dividir por el multiplicador conocido (2x)
                                // Esto es para compatibilidad con efectos antiguos que no tienen originalConsumeRate
                                const woundedConfig = SERVER_NODE_CONFIG.temporaryEffects.wounded;
                                node.consumeRate = (node.consumeRate || 3.2) / woundedConfig.consumeMultiplier;
                                console.log(`⚠️ Efecto wounded expirado en frente ${node.id} (sin originalConsumeRate) - Consumo restaurado: ${node.consumeRate}`);
                            }
                        } else if (effect.type === 'commandoResidual' && effect.keepsDisabled) {
                            // 🆕 NUEVO: Restaurar disabled cuando expira el efecto residual del comando
                            // Solo restaurar si no hay otros comandos activos afectándolo
                            // (CommandoSystem se encargará de esto en su update)
                            node.disabledByCommando = false;
                            // Nota: disabled será restaurado por CommandoSystem si no hay otros comandos
                        }
                        return false; // Eliminar efecto
                    }
                    return true; // Mantener efecto
                });
            }
        }
    }
}

