// ===== CONTROLADOR DE CÁMARA =====

export class CameraController {
    constructor(game) {
        this.game = game;
        
        // Dimensiones del mundo (definidas externamente por Game)
        this.worldWidth = 0;
        this.worldHeight = 0;
        
        // Viewport (lo que se ve en pantalla)
        this.viewportWidth = game.canvas.width;
        this.viewportHeight = game.canvas.height;
        
        // Posición de la cámara (esquina superior izquierda del viewport)
        this.x = 0;
        this.y = 0;
        
        // Límites
        this.minX = 0;
        this.maxX = 0;
        this.minY = 0;
        this.maxY = 0;
    }
    
    /**
     * Convierte coordenadas de pantalla a coordenadas del mundo
     */
    screenToWorld(screenX, screenY) {
        return {
            x: screenX + this.x,
            y: screenY + this.y
        };
    }
    
    /**
     * Convierte coordenadas del mundo a coordenadas de pantalla
     */
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.x,
            y: worldY - this.y
        };
    }
    
    /**
     * Verifica si un punto del mundo está visible en el viewport
     */
    isVisible(worldX, worldY, margin = 0) {
        return worldX >= this.x - margin &&
               worldX <= this.x + this.viewportWidth + margin &&
               worldY >= this.y - margin &&
               worldY <= this.y + this.viewportHeight + margin;
    }
    
    /**
     * Centra la cámara en un punto del mundo
     */
    centerOn(worldX, worldY) {
        this.x = this.clamp(worldX - this.viewportWidth / 2, this.minX, this.maxX);
        this.y = this.clamp(worldY - this.viewportHeight / 2, this.minY, this.maxY);
    }
    
    /**
     * Aplica el offset de cámara al contexto de renderizado
     */
    applyToContext(ctx) {
        ctx.save();
        ctx.translate(-this.x, -this.y);
    }
    
    /**
     * Restaura el contexto después de renderizar
     */
    restoreContext(ctx) {
        ctx.restore();
    }
    
    /**
     * Establece el tamaño del mundo (llamado por Game al iniciar misión)
     */
    setWorldSize(width, height) {
        this.worldWidth = width;
        this.worldHeight = height;
        this.updateLimits();
    }
    
    /**
     * Actualiza el viewport cuando cambia el tamaño de ventana
     */
    updateViewport(canvasWidth, canvasHeight) {
        this.viewportWidth = canvasWidth;
        this.viewportHeight = canvasHeight;
        this.updateLimits();
    }
    
    /**
     * Recalcula los límites de la cámara
     */
    updateLimits() {
        this.maxX = Math.max(0, this.worldWidth - this.viewportWidth);
        this.maxY = Math.max(0, this.worldHeight - this.viewportHeight);
        
        // Ajustar posición si está fuera de límites
        this.x = this.clamp(this.x, this.minX, this.maxX);
        this.y = this.clamp(this.y, this.minY, this.maxY);
    }
    
    /**
     * Obtiene las dimensiones del mundo
     */
    getWorldDimensions() {
        return {
            width: this.worldWidth,
            height: this.worldHeight
        };
    }
    
    /**
     * Helper: clamp value between min and max
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    /**
     * Reset camera to initial position
     */
    reset() {
        this.x = 0;
        this.y = 0;
    }
}













