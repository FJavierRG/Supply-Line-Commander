// ===== SISTEMA DE EFECTOS TEMPORALES (SERVIDOR) =====

export class EffectsSystem {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Actualiza efectos temporales y elimina los expirados
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
                            // Restaurar consumo normal (dividir por el multiplicador)
                            node.consumeRate = (node.consumeRate || 3.2) / 2;
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

