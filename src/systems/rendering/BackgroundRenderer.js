// ===== RENDERIZADO DE FONDO Y GRID =====
// Maneja el renderizado del fondo del mundo y la cuadrícula de debug

import { GAME_CONFIG } from '../../config/constants.js';

/**
 * BackgroundRenderer - Renderiza el fondo y la cuadrícula del mundo
 * Responsabilidades:
 * - Renderizado del fondo del mundo (sólido o con tiles)
 * - Renderizado de la cuadrícula de debug
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
    
    /**
     * Renderiza la cuadrícula de debug
     */
    renderGrid() {
        this.ctx.strokeStyle = GAME_CONFIG.GRID_COLOR;
        this.ctx.lineWidth = 1;
        
        // Usar mundo expandido (2x ancho) para el grid
        const worldWidth = this.game?.worldWidth || this.ctx.canvas.width;
        const worldHeight = this.game?.worldHeight || this.ctx.canvas.height;
        
        const gridSize = GAME_CONFIG.GRID_SIZE;
        for (let x = 0; x <= worldWidth; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, worldHeight);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= worldHeight; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(worldWidth, y);
            this.ctx.stroke();
        }
    }
    
    /**
     * Renderiza cuadrícula de desarrollo con coordenadas cartesianas
     * Sistema: (0,0) = esquina inferior izquierda
     */
    renderDevGrid() {
        // Cuadrícula de desarrollo con coordenadas cartesianas
        // Sistema: (0,0) = esquina inferior izquierda
        
        this.ctx.save();
        
        // Usar dimensiones del mundo expandido
        const worldWidth = this.game?.camera?.worldWidth || this.game?.worldWidth || this.ctx.canvas.width;
        const worldHeight = this.game?.camera?.worldHeight || this.game?.worldHeight || this.ctx.canvas.height;
        
        // Configuración
        const step = 0.1; // Cada 10%
        const gridColor = 'rgba(0, 150, 255, 0.3)';
        const axisColor = 'rgba(0, 200, 255, 0.8)';
        const textColor = 'rgba(255, 255, 255, 0.9)';
        
        // Líneas verticales y horizontales
        this.ctx.strokeStyle = gridColor;
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i <= 1; i += step) {
            const x = worldWidth * i;
            const y = worldHeight * (1 - i); // Invertir Y (sistema cartesiano)
            
            // Líneas verticales
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, worldHeight);
            this.ctx.stroke();
            
            // Líneas horizontales
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(worldWidth, y);
            this.ctx.stroke();
        }
        
        // Ejes principales (X=0.5, Y=0.5)
        this.ctx.strokeStyle = axisColor;
        this.ctx.lineWidth = 2;
        
        // Eje vertical central (X = 0.5)
        this.ctx.beginPath();
        this.ctx.moveTo(worldWidth * 0.5, 0);
        this.ctx.lineTo(worldWidth * 0.5, worldHeight);
        this.ctx.stroke();
        
        // Eje horizontal central (Y = 0.5)
        this.ctx.beginPath();
        this.ctx.moveTo(0, worldHeight * 0.5);
        this.ctx.lineTo(worldWidth, worldHeight * 0.5);
        this.ctx.stroke();
        
        // Etiquetas de coordenadas
        this.ctx.fillStyle = textColor;
        this.ctx.font = 'bold 11px monospace';
        this.ctx.textAlign = 'center';
        
        // Etiquetas en eje X (abajo)
        for (let i = 0; i <= 1; i += step) {
            const x = worldWidth * i;
            const label = i.toFixed(1);
            this.ctx.fillText(label, x, worldHeight - 5);
        }
        
        // Etiquetas en eje Y (izquierda) - Sistema cartesiano
        this.ctx.textAlign = 'left';
        for (let i = 0; i <= 1; i += step) {
            const y = worldHeight * (1 - i); // Invertir para mostrar correctamente
            const label = i.toFixed(1);
            this.ctx.fillText(label, 5, y + 4);
        }
        
        // Etiquetas de ejes
        this.ctx.font = 'bold 14px monospace';
        this.ctx.fillStyle = axisColor;
        
        // Etiqueta X (derecha abajo)
        this.ctx.textAlign = 'right';
        this.ctx.fillText('X →', worldWidth - 10, worldHeight - 20);
        
        // Etiqueta Y (izquierda arriba)
        this.ctx.textAlign = 'left';
        this.ctx.fillText('↑ Y', 10, 20);
        
        // Nota del sistema
        this.ctx.textAlign = 'left';
        this.ctx.font = 'bold 12px monospace';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.fillText('Sistema Cartesiano: (0,0) = Inferior Izquierda', 10, worldHeight - 40);
        
        this.ctx.restore();
    }
}

