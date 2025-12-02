// ===== GESTOR DE OVERLAYS CENTRALIZADO =====

/**
 * OverlayManager - Gestión centralizada de todos los overlays del juego
 * 
 * Responsabilidades:
 * - Registrar todos los overlays disponibles
 * - Mostrar/ocultar overlays de forma consistente
 * - Mantener registro de overlays visibles
 * - Gestionar pointer-events del canvas automáticamente
 */
export class OverlayManager {
    constructor() {
        this.overlays = new Map(); // id -> overlay element
        this.visibleOverlays = new Set(); // IDs de overlays visibles
        this.registerAllOverlays();
    }
    
    /**
     * Registra todos los overlays existentes en el DOM
     */
    registerAllOverlays() {
        const overlayIds = [
            'loading-screen',
            'press-to-continue-screen',
            'main-menu-overlay',
            'multiplayer-lobby-overlay',
            'arsenal-overlay',
            'victory-overlay',
            'defeat-overlay',
            'pause-overlay',
            'upgrades-overlay',
            'mission-overlay',        // 🆕 NUEVO: Overlay de briefing de misión
            'mission-complete-overlay' // 🆕 NUEVO: Overlay de misión completada
        ];
        
        overlayIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.overlays.set(id, element);
            } else {
                console.warn(`⚠️ Overlay ${id} no encontrado en el DOM`);
            }
        });
        
    }
    
    /**
     * Muestra un overlay específico
     * @param {string} id - ID del overlay
     * @returns {boolean} True si se mostró correctamente
     */
    showOverlay(id) {
        const overlay = this.overlays.get(id);
        if (!overlay) {
            console.warn(`⚠️ Overlay ${id} no encontrado`);
            return false;
        }
        
        // Remover clase hidden
        overlay.classList.remove('hidden');
        this.visibleOverlays.add(id);
        
        // Actualizar pointer-events del canvas
        this.updateCanvasPointerEvents();
        
        return true;
    }
    
    /**
     * Oculta un overlay específico
     * @param {string} id - ID del overlay
     * @returns {boolean} True si se ocultó correctamente
     */
    hideOverlay(id) {
        const overlay = this.overlays.get(id);
        if (!overlay) {
            return false;
        }
        
        // Añadir clase hidden
        overlay.classList.add('hidden');
        this.visibleOverlays.delete(id);
        
        // Actualizar pointer-events del canvas
        this.updateCanvasPointerEvents();
        
        return true;
    }
    
    /**
     * Oculta todos los overlays visibles
     */
    hideAllOverlays() {
        const idsToHide = Array.from(this.visibleOverlays);
        idsToHide.forEach(id => {
            this.hideOverlay(id);
        });
    }
    
    /**
     * Verifica si un overlay está visible
     * @param {string} id - ID del overlay
     * @returns {boolean} True si está visible
     */
    isOverlayVisible(id) {
        return this.visibleOverlays.has(id);
    }
    
    /**
     * Obtiene array de IDs de overlays visibles
     * @returns {Array<string>} Array de IDs visibles
     */
    getVisibleOverlays() {
        return Array.from(this.visibleOverlays);
    }
    
    /**
     * Verifica si hay algún overlay visible
     * @returns {boolean} True si hay al menos un overlay visible
     */
    hasVisibleOverlays() {
        return this.visibleOverlays.size > 0;
    }
    
    /**
     * Actualiza pointer-events del canvas según overlays visibles
     * Esto se maneja principalmente con CSS, pero podemos forzar actualización si es necesario
     */
    updateCanvasPointerEvents() {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) return;
        
        // Si hay overlays visibles, bloquear canvas
        if (this.visibleOverlays.size > 0) {
            canvas.style.pointerEvents = 'none';
        } else {
            canvas.style.pointerEvents = 'auto';
        }
    }
    
    /**
     * Toggle (mostrar/ocultar) un overlay
     * @param {string} id - ID del overlay
     * @returns {boolean} True si ahora está visible
     */
    toggleOverlay(id) {
        if (this.isOverlayVisible(id)) {
            this.hideOverlay(id);
            return false;
        } else {
            this.showOverlay(id);
            return true;
        }
    }
}

