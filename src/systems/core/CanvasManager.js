// ===== GESTOR DEL CANVAS INDEPENDIENTE DE UI =====

/**
 * CanvasManager - Control del canvas independiente de la UI
 * 
 * Responsabilidades:
 * - Controlar pausa/reanudación del renderizado
 * - Mantener el canvas limpio cuando no se renderiza
 * - 🆕 IMPORTANTE: El canvas NUNCA se oculta, solo cambia lo que se dibuja
 */
export class CanvasManager {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('game-canvas');
        this.isRunning = false;
        
        // 🆕 FIX: El canvas siempre está visible, solo controlamos el renderizado
        if (this.canvas) {
            this.canvas.style.display = 'block';
            this.canvas.style.visibility = 'visible';
            this.canvas.style.opacity = '1';
            this.canvas.style.zIndex = '1'; // Canvas siempre en z-index 1 (debajo de UI)
            // pointer-events se maneja con CSS cuando hay overlays visibles
        }
    }
    
    /**
     * Reanuda el renderizado del canvas
     * El canvas ya está visible, solo activamos el renderizado
     */
    resume() {
        this.isRunning = true;
    }
    
    /**
     * Pausa el renderizado del canvas
     * El canvas sigue visible, solo dejamos de renderizar
     */
    pause() {
        this.isRunning = false;
        // Limpiar el canvas cuando se pausa
        this.clear();
    }
    
    /**
     * Limpia el canvas (lo deja en negro/vacío)
     */
    clear() {
        if (this.game && this.game.renderer) {
            this.game.renderer.clear();
        }
    }
    
    /**
     * Verifica si el canvas está renderizando
     * @returns {boolean} True si está corriendo
     */
    getRunning() {
        return this.isRunning;
    }
}

