// ===== SISTEMA DE ABANDONO =====
// Inicia abandono -> fases -> eliminación

import { GAME_CONFIG } from '../config/gameConfig.js';

export class AbandonmentSystem {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Obtiene los tiempos de abandono para un tipo específico de nodo
     */
    getAbandonmentTimes(nodeType) {
        // Usar tiempos específicos si existen, sino usar los por defecto
        const specificTimes = GAME_CONFIG.abandonment[nodeType];
        if (specificTimes) {
            return specificTimes;
        }
        return GAME_CONFIG.abandonment.default;
    }
    
    /**
     * Verifica TODAS las condiciones de abandono para TODOS los nodos
     * Se llama desde GameStateManager.update() cada tick
     */
    checkAbandonmentConditions() {
        for (const node of this.gameState.nodes) {
            // Ya está abandonando, skip
            if (node.isAbandoning) {
                continue;
            }
            
            // 1. ABANDONO POR TERRITORIO (prioridad alta - afecta a TODOS los nodos excepto HQ, front y specopsCommando)
            // Después del tiempo de gracia (outOfTerritoryTimer >= 3s), iniciar abandono
            // 🆕 Excluir specopsCommando: está diseñado para desplegarse en territorio enemigo
            if (node.type !== 'specopsCommando' &&
                node.outOfTerritoryTimer !== null && 
                node.outOfTerritoryTimer !== undefined &&
                node.outOfTerritoryTimer >= 3.0) {
                // Tiempo de gracia completado -> iniciar abandono
                console.log(`💥 ${node.type} ${node.id} - tiempo de gracia completado (${node.outOfTerritoryTimer.toFixed(1)}s) - iniciando abandono`);
                this.startAbandonment(node);
                node.outOfTerritoryTimer = null; // Resetear timer
                continue;
            }
            
            // 2. IntelRadio: abandono cuando completa inversión (si no está ya en abandono por territorio)
            if (node.type === 'intelRadio' && 
                node.investmentStarted && 
                node.constructed && 
                node.investmentCompleted) {
                this.startAbandonment(node);
                continue;
            }
            
            // 3. Base Aérea: abandono cuando supplies = 0 y sin helicópteros (si no está ya en abandono por territorio)
            if ((node.type === 'aerialBase' || node.isAerialBase) && 
                node.supplies <= 0 && 
                node.autoDestroy &&
                (!node.landedHelicopters || node.landedHelicopters.length === 0)) {
                this.startAbandonment(node);
                continue;
            }
        }
    }
    
    /**
     * Inicia el proceso de abandono de un nodo
     * Fases: 1 (gris claro) -> 2 (gris oscuro) -> 3 (eliminar)
     */
    startAbandonment(node) {
        if (node.isAbandoning) {
            return; // Ya está abandonando
        }
        
        // Obtener tiempos específicos para este tipo de nodo
        const times = this.getAbandonmentTimes(node.type);
        
        node.isAbandoning = true;
        node.abandonPhase = 1;
        node.abandonStartTime = this.gameState.gameTime * 1000; // ms
        
        // 🆕 NUEVO: Marcar si el abandono fue causado por territorio
        // Si tiene outOfTerritoryTimer, guardar que fue por territorio antes de resetearlo
        // Si no tiene outOfTerritoryTimer, marcar que NO fue por territorio
        if (node.outOfTerritoryTimer !== null && node.outOfTerritoryTimer !== undefined) {
            node.abandonmentCause = 'territory'; // Fue causado por territorio
            node.outOfTerritoryTimer = null; // Resetear timer después de guardar la causa
        } else {
            node.abandonmentCause = 'auto'; // Fue causado por abandono automático (investmentCompleted, supplies, etc)
        }
        
        // Almacenar tiempos específicos en el nodo para referencia
        node.abandonPhase1Duration = times.phase1Duration;
        node.abandonPhase2Duration = times.phase2Duration;
        
        console.log(`💥 ${node.type} ${node.id} INICIANDO ABANDONO (causa: ${node.abandonmentCause})`);
        console.log(`   ⏳ Tiempos: fase1=${times.phase1Duration}ms, fase2=${times.phase2Duration}ms`);
    }
    
    /**
     * Actualiza las fases de abandono usando configuración del servidor
     * Fase 1: 0-phase1Duration (gris claro)
     * Fase 2: phase1Duration-phase1Duration+phase2Duration (gris oscuro)
     * Fase 3: >phase1Duration+phase2Duration (eliminar)
     */
    update(dt) {
        for (const node of this.gameState.nodes) {
            if (!node.isAbandoning) {
                continue;
            }
            
            const now = this.gameState.gameTime * 1000; // ms
            const elapsed = now - (node.abandonStartTime || now);
            
            // Obtener tiempos específicos para este nodo
            const times = this.getAbandonmentTimes(node.type);
            const phase1Duration = times.phase1Duration;
            const phase2Duration = times.phase2Duration;
            const totalDuration = phase1Duration + phase2Duration;
            
            // Actualizar fase usando configuración del servidor
            if (elapsed < phase1Duration) {
                node.abandonPhase = 1; // Gris claro
            } else if (elapsed < totalDuration) {
                node.abandonPhase = 2; // Gris oscuro
            } else {
                node.abandonPhase = 3; // Listo para eliminar
            }
        }
    }
    
    /**
     * Limpia nodos que han completado el abandono
     */
    cleanup() {
        const beforeCount = this.gameState.nodes.length;
        
        this.gameState.nodes = this.gameState.nodes.filter(node => {
            if (node.isAbandoning && node.abandonPhase === 3) {
                console.log(`💥 Eliminando ${node.type} ${node.id} - abandono finalizado`);
                return false;
            }
            return true;
        });
        
        if (this.gameState.nodes.length < beforeCount) {
            this.gameState.optimizationTracker.cleanupNodeTracking();
            return true;
        }
        
        return false;
    }
    
    /**
     * Reset abandono (para cuando un edificio vuelve a territorio)
     * 🆕 FIX: Solo resetear si el abandono fue causado por territorio
     * NO resetear si el abandono fue por otras razones (investmentCompleted, supplies agotados)
     */
    resetAbandonment(node) {
        if (node.isAbandoning) {
            // 🆕 FIX: Solo resetear si el abandono fue causado por territorio
            // NO resetear si fue por abandono automático (investmentCompleted, supplies, etc)
            if (node.abandonmentCause !== 'territory') {
                // El abandono fue por otra razón (investmentCompleted, supplies, etc)
                // NO resetear - dejar que complete el proceso
                return;
            }
            
            console.log(`✅ ${node.type} ${node.id} - reseteando abandono`);
            node.isAbandoning = false;
            node.abandonPhase = 0;
            node.abandonStartTime = null;
            node.abandonmentCause = null;
            node.outOfTerritoryTimer = null;
        }
    }
}
