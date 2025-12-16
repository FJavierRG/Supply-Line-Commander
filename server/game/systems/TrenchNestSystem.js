// ===== SISTEMA DE NIDO TRINCHERA (SERVIDOR) =====
// Detecta cuando un frente aliado pasa por encima de un Nido Trinchera
// y aplica el efecto "trenchHold" que fuerza modo "hold" temporalmente

import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

export class TrenchNestSystem {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Actualiza el sistema de nidos trinchera
     * Detecta colisiones entre frentes aliados y nidos
     * @param {number} dt - Delta time en segundos
     */
    update(dt) {
        // Obtener configuración
        const nestConfig = SERVER_NODE_CONFIG.effects?.machineNest;
        const trenchHoldConfig = SERVER_NODE_CONFIG.temporaryEffects?.trenchHold;
        
        if (!nestConfig || !trenchHoldConfig) return;
        
        const detectionRadius = nestConfig.detectionRadius || 30;
        const holdDuration = trenchHoldConfig.duration || 10;
        
        // Obtener todos los nidos trinchera activos y construidos
        const activeNests = this.gameState.nodes.filter(n => 
            n.type === 'machineNest' && 
            n.active && 
            n.constructed && 
            !n.isAbandoning &&
            !n.disabled &&
            !n.broken
        );
        
        if (activeNests.length === 0) return;
        
        // Obtener todos los frentes activos
        const activeFronts = this.gameState.nodes.filter(n => 
            n.type === 'front' && 
            n.active && 
            n.constructed
        );
        
        // Verificar colisiones
        for (const nest of activeNests) {
            for (const front of activeFronts) {
                // Solo afecta a frentes aliados
                if (front.team !== nest.team) continue;
                
                // Calcular distancia entre centros
                const dist = Math.hypot(front.x - nest.x, front.y - nest.y);
                
                // Si los centros están dentro del radio de detección
                if (dist <= detectionRadius) {
                    // Verificar si ya tiene el efecto trenchHold activo
                    const hasActiveEffect = front.effects?.some(e => 
                        e.type === 'trenchHold' && 
                        (!e.expiresAt || this.gameState.gameTime < e.expiresAt)
                    );
                    
                    if (!hasActiveEffect) {
                        // Aplicar efecto trenchHold
                        this.applyTrenchHoldEffect(front, nest, holdDuration);
                    }
                }
            }
        }
    }
    
    /**
     * Aplica el efecto trenchHold a un frente
     * @param {Object} front - Nodo de frente
     * @param {Object} nest - Nodo del nido trinchera
     * @param {number} duration - Duración del efecto en segundos
     */
    applyTrenchHoldEffect(front, nest, duration) {
        const trenchHoldConfig = SERVER_NODE_CONFIG.temporaryEffects.trenchHold;
        
        // Guardar el modo original antes de forzar
        const originalMode = front.frontMode || 'advance';
        
        // Solo aplicar si no está ya en modo hold
        if (front.frontMode === 'hold') {
            console.log(`🏠 Nido Trinchera ${nest.id.substring(0, 8)}: Frente ${front.id.substring(0, 8)} ya está en modo hold, no se aplica efecto`);
            return;
        }
        
        // Inicializar array de efectos si no existe
        if (!front.effects) front.effects = [];
        
        // Crear el efecto
        const trenchHoldEffect = {
            type: 'trenchHold',
            icon: trenchHoldConfig.icon,
            tooltip: trenchHoldConfig.tooltip,
            expiresAt: this.gameState.gameTime + duration,
            originalMode: originalMode,  // Guardar modo original para restaurar
            nestId: nest.id              // Referencia al nido que causó el efecto
        };
        
        front.effects.push(trenchHoldEffect);
        
        // Forzar modo hold
        front.frontMode = 'hold';
        
        // NO aplicar cooldown de cambio de modo (es un efecto forzado, no voluntario)
        // El jugador podrá cambiar manualmente después si quiere
        
        console.log(`🏠 Nido Trinchera ${nest.id.substring(0, 8)} activó efecto en Frente ${front.id.substring(0, 8)}: ${originalMode} → hold (${duration}s)`);
        
        // 🆕 Consumir el nido trinchera (se quita de mesa tras activarse)
        this.consumeNest(nest);
    }
    
    /**
     * Consume y elimina el nido trinchera de mesa
     * @param {Object} nest - Nodo del nido trinchera a consumir
     */
    consumeNest(nest) {
        // Marcar como inactivo
        nest.active = false;
        nest.consumed = true;
        
        // Eliminar del array de nodos
        const index = this.gameState.nodes.indexOf(nest);
        if (index > -1) {
            this.gameState.nodes.splice(index, 1);
        }
        
        console.log(`🏠 Nido Trinchera ${nest.id.substring(0, 8)} consumido y eliminado de mesa`);
    }
}

