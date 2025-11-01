// ===== ROUTER DE INPUTS =====

/**
 * InputRouter - Routing inteligente de eventos según estado y overlays
 * 
 * Responsabilidades:
 * - Decidir si un evento debe ir al canvas o a la UI
 * - Bloquear eventos del canvas cuando hay overlays visibles
 * - Verificar si un click está en un elemento UI
 * - Proporcionar API consistente para routing de eventos
 */
export class InputRouter {
    constructor(gameStateManager, overlayManager) {
        this.gameStateManager = gameStateManager;
        this.overlayManager = overlayManager;
    }
    
    /**
     * Determina si un evento debe ser rutado al canvas
     * @param {Event} event - Evento del navegador
     * @returns {boolean} True si debe rutearse al canvas
     */
    shouldRouteToCanvas(event) {
        // Si hay overlays visibles, NO rutear al canvas
        if (this.overlayManager.hasVisibleOverlays()) {
            return false;
        }
        
        // Verificar si el click está en un elemento UI
        if (this.isClickOnUIElement(event)) {
            return false;
        }
        
        // Solo rutear al canvas en estados de juego activo
        const state = this.gameStateManager.getCurrentState();
        const canvasStates = ['playing', 'tutorial'];
        
        return canvasStates.includes(state);
    }
    
    /**
     * Determina si un evento debe ser rutado a la UI
     * @param {Event} event - Evento del navegador
     * @returns {boolean} True si debe rutearse a la UI
     */
    shouldRouteToUI(event) {
        return this.overlayManager.hasVisibleOverlays();
    }
    
    /**
     * Verifica si un click está en un elemento HTML interactivo (botón, input, etc.)
     * @param {Event} event - Evento del click
     * @returns {boolean} True si el click está en un elemento UI
     */
    isClickOnUIElement(event) {
        const target = event.target;
        
        // Verificar si es un elemento interactivo HTML
        const interactiveTags = ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'];
        if (interactiveTags.includes(target.tagName)) {
            return true;
        }
        
        // Verificar si está dentro de un overlay visible
        const overlay = target.closest('.overlay:not(.hidden)');
        if (overlay) {
            return true;
        }
        
        // Verificar si está dentro de la ui-layer
        const uiLayer = target.closest('#ui-layer');
        if (uiLayer) {
            // Si hay overlays visibles, es UI
            if (this.overlayManager.hasVisibleOverlays()) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Determina si el input del canvas debe estar bloqueado
     * @returns {boolean} True si el canvas debe estar bloqueado
     */
    shouldBlockCanvas() {
        // Bloquear si hay overlays visibles
        if (this.overlayManager.hasVisibleOverlays()) {
            return true;
        }
        
        // Bloquear en ciertos estados
        const state = this.gameStateManager.getCurrentState();
        const blockedStates = ['menu', 'victory', 'defeat'];
        
        return blockedStates.includes(state);
    }
    
    /**
     * Verifica si se puede interactuar con el canvas
     * @returns {boolean} True si se puede interactuar
     */
    canInteractWithCanvas() {
        return !this.shouldBlockCanvas();
    }
}

