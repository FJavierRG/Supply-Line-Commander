// ===== RENDERIZADO DE FONDO =====
// Maneja el renderizado del fondo del mundo

import { GAME_CONFIG } from '../../config/constants.js';

/**
 * BackgroundRenderer - Renderiza el fondo del mundo
 * Responsabilidades:
 * - Renderizado del fondo del mundo (sólido o con tiles)
 */
export class BackgroundRenderer {
    constructor(ctx, assetManager = null, game = null) {
        this.ctx = ctx;
        this.assetManager = assetManager;
        this.game = game;
        this.backgroundPattern = null; // Patrón de fondo (se crea al cargar sprite)
    }
    
    /**
     * Actualiza el patrón de fondo (útil para sincronización con RenderSystem)
     * @param {CanvasPattern|null} pattern - Patrón de fondo a usar
     */
    setBackgroundPattern(pattern) {
        this.backgroundPattern = pattern;
    }
    
    /**
     * Renderiza el fondo del mundo (debe llamarse dentro del contexto de la cámara)
     */
    renderBackground() {
        const width = this.game?.worldWidth || this.ctx.canvas.width;
        const height = this.game?.worldHeight || this.ctx.canvas.height;
        
        // Fondo sólido que cubre todo el mundo
        this.ctx.fillStyle = GAME_CONFIG.CANVAS_BG_COLOR;
        this.ctx.fillRect(0, 0, width, height);
        
        // Sistema de tiles del background (si existe)
        if (this.game?.backgroundTiles) {
            this.game.backgroundTiles.render(this.ctx, this.assetManager);
        } else {
            // Fallback: patrón de fondo antiguo
            const bgSprite = this.assetManager?.getSprite('ui-background');
            if (bgSprite) {
                if (!this.backgroundPattern) {
                    this.backgroundPattern = this.ctx.createPattern(bgSprite, 'repeat');
                }
                if (this.backgroundPattern) {
                    this.ctx.fillStyle = this.backgroundPattern;
                    this.ctx.fillRect(0, 0, width, height);
                }
            }
        }
    }
    
}

