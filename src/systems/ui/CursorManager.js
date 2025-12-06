// ===== GESTOR CENTRALIZADO DE CURSORES =====

import { CURSOR_TYPES, CUSTOM_CURSOR_CONFIG } from '../../config/cursors.js';

export class CursorManager {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.ctx = game.ctx;
        
        // Estado actual del cursor
        this.currentType = CURSOR_TYPES.CROSSHAIR;
        this.currentConfig = null;
        
        // Posición del mouse (para cursores custom)
        this.mouseX = 0;
        this.mouseY = 0;
        
        // Estado de cursores custom
        this.customCursorActive = false;
        
        console.log('🖱️ CursorManager inicializado');
    }
    
    /**
     * Cambiar el cursor actual
     * @param {string} type - Tipo de cursor (de CURSOR_TYPES)
     * @param {Object} options - Opciones adicionales (override config)
     */
    setCursor(type, options = {}) {
        // Validar tipo
        if (!Object.values(CURSOR_TYPES).includes(type)) {
            console.warn(`⚠️ Tipo de cursor desconocido: ${type}`);
            return;
        }
        
        this.currentType = type;
        
        // Verificar si es un cursor custom (sprite)
        if (CUSTOM_CURSOR_CONFIG[type]) {
            this.activateCustomCursor(type, options);
        } else {
            this.activateNativeCursor(type);
        }
        
        console.log(`🖱️ Cursor cambiado a: ${type}`);
    }
    
    /**
     * Activar cursor nativo del navegador
     * @param {string} type - Tipo de cursor CSS
     */
    activateNativeCursor(type) {
        this.customCursorActive = false;
        this.currentConfig = null;
        this.canvas.style.cursor = type;
    }
    
    /**
     * Activar cursor custom (sprite renderizado)
     * @param {string} type - Tipo de cursor custom
     * @param {Object} options - Opciones adicionales
     */
    activateCustomCursor(type, options = {}) {
        const config = CUSTOM_CURSOR_CONFIG[type];
        
        if (!config) {
            console.warn(`⚠️ Configuración de cursor custom no encontrada: ${type}`);
            this.activateNativeCursor(CURSOR_TYPES.DEFAULT);
            return;
        }
        
        // Mezclar configuración con opciones
        this.currentConfig = {
            ...config,
            ...options
        };
        
        this.customCursorActive = true;
        
        // Ocultar cursor nativo si la config lo indica
        if (this.currentConfig.hideNativeCursor) {
            this.canvas.style.cursor = 'none';
        } else {
            this.canvas.style.cursor = CURSOR_TYPES.DEFAULT;
        }
    }
    
    /**
     * Actualizar posición del cursor (llamado por InputHandler)
     * @param {number} x - Posición X en coordenadas del mundo
     * @param {number} y - Posición Y en coordenadas del mundo
     */
    updatePosition(x, y) {
        this.mouseX = x;
        this.mouseY = y;
    }
    
    /**
     * Renderizar cursor custom (llamado en el loop de render)
     */
    render() {
        if (!this.customCursorActive || !this.currentConfig) {
            return;
        }
        
        const sprite = this.game.assetManager?.getSprite(this.currentConfig.spriteKey);
        
        if (!sprite) {
            console.warn(`⚠️ Sprite de cursor no encontrado: ${this.currentConfig.spriteKey}`);
            return;
        }
        
        // Convertir coordenadas del mundo a coordenadas de pantalla
        const screenPos = this.game.camera.worldToScreen(this.mouseX, this.mouseY);
        
        const size = this.currentConfig.size;
        const offsetX = this.currentConfig.offset.x;
        const offsetY = this.currentConfig.offset.y;
        const alpha = this.currentConfig.alpha || 1.0;
        const rotation = this.currentConfig.rotation || 0;
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        // Aplicar transformaciones si hay rotación
        if (rotation !== 0) {
            this.ctx.translate(screenPos.x + offsetX, screenPos.y + offsetY);
            this.ctx.rotate(rotation);
            this.ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
        } else {
            this.ctx.drawImage(
                sprite,
                screenPos.x + offsetX - size / 2,
                screenPos.y + offsetY - size / 2,
                size,
                size
            );
        }
        
        this.ctx.restore();
    }
    
    /**
     * Resetear al cursor por defecto del juego
     */
    reset() {
        this.setCursor(CURSOR_TYPES.CROSSHAIR);
    }
    
    /**
     * Verificar si hay un cursor custom activo
     * @returns {boolean}
     */
    hasCustomCursor() {
        return this.customCursorActive;
    }
    
    /**
     * Obtener el tipo de cursor actual
     * @returns {string}
     */
    getCurrentType() {
        return this.currentType;
    }
    
    /**
     * Ocultar completamente el cursor
     */
    hide() {
        this.setCursor(CURSOR_TYPES.NONE);
    }
    
    /**
     * Mostrar cursor por defecto del sistema
     */
    showDefault() {
        this.setCursor(CURSOR_TYPES.DEFAULT);
    }
    
    /**
     * Mostrar cursor crosshair (por defecto del juego)
     */
    showCrosshair() {
        this.setCursor(CURSOR_TYPES.CROSSHAIR);
    }
    
    /**
     * Helpers rápidos para modos comunes
     */
    showSniper() {
        this.setCursor(CURSOR_TYPES.SNIPER);
    }
    
    showArtillery() {
        this.setCursor(CURSOR_TYPES.ARTILLERY);
    }
    
    showFobSabotage() {
        this.setCursor(CURSOR_TYPES.FOB_SABOTAGE);
    }
}

