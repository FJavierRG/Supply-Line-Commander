// ===== RENDERIZADO DE FONDO =====
// Maneja el renderizado del fondo del mundo

import { GAME_CONFIG } from '../../config/constants.js';

// Configuración de líneas de victoria (sincronizado con server/config/gameConfig.js)
const VICTORY_LINES = {
    left: 0.13,   // 13% del ancho - línea de victoria para player2
    right: 0.87   // 87% del ancho - línea de victoria para player1
};

/**
 * BackgroundRenderer - Renderiza el fondo del mundo
 * Responsabilidades:
 * - Renderizado del fondo del mundo (sólido o con tiles)
 * - Renderizado de líneas de victoria ondulantes
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
        
        // Renderizar líneas de victoria ondulantes
        this.renderVictoryLines(width, height);
    }
    
    /**
     * Renderiza las líneas de victoria con curvas y punteado
     * @param {number} worldWidth - Ancho del mundo
     * @param {number} worldHeight - Alto del mundo
     */
    renderVictoryLines(worldWidth, worldHeight) {
        const ctx = this.ctx;
        ctx.save();
        
        // Configuración visual
        const lineColor = 'rgba(19, 19, 19, 0.5)'; // Gris discreto
        const lineWidth = 2;
        const waveAmplitude = 6; // Amplitud de la onda en píxeles
        const waveFrequency = 0.012; // Frecuencia de la onda
        
        // Calcular posiciones X de las líneas
        const leftLineX = worldWidth * VICTORY_LINES.left;
        const rightLineX = worldWidth * VICTORY_LINES.right;
        
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash([8, 12]); // Punteado: 8px línea, 12px espacio
        ctx.lineCap = 'round';
        
        // Dibujar línea izquierda (curva estática)
        this.drawWavyLine(ctx, leftLineX, 0, worldHeight, waveAmplitude, waveFrequency, 0);
        
        // Dibujar línea derecha (curva estática, desfasada)
        this.drawWavyLine(ctx, rightLineX, 0, worldHeight, waveAmplitude, waveFrequency, Math.PI);
        
        ctx.setLineDash([]); // Resetear punteado
        ctx.restore();
        
        // Renderizar iconos de advertencia debajo de cada línea
        this.renderVictoryIcons(leftLineX, rightLineX, worldHeight);
    }
    
    /**
     * Renderiza los iconos de advertencia debajo de las líneas de victoria
     * @param {number} leftX - Posición X de la línea izquierda
     * @param {number} rightX - Posición X de la línea derecha
     * @param {number} worldHeight - Alto del mundo
     */
    renderVictoryIcons(leftX, rightX, worldHeight) {
        const sprite = this.assetManager?.getSprite('ui-victory-lanes');
        if (!sprite) return;
        
        const iconSize = 32; // Tamaño del icono
        const bottomMargin = 20; // Margen desde el borde inferior
        const iconY = worldHeight - iconSize - bottomMargin;
        
        this.ctx.save();
        this.ctx.globalAlpha = 0.6; // Semi-transparente
        
        // Icono en línea izquierda
        this.ctx.drawImage(sprite, leftX - iconSize / 2, iconY, iconSize, iconSize);
        
        // Icono en línea derecha
        this.ctx.drawImage(sprite, rightX - iconSize / 2, iconY, iconSize, iconSize);
        
        this.ctx.restore();
    }
    
    /**
     * Dibuja una línea vertical con curvas
     * @param {CanvasRenderingContext2D} ctx - Contexto de canvas
     * @param {number} baseX - Posición X base de la línea
     * @param {number} startY - Y inicial
     * @param {number} endY - Y final
     * @param {number} amplitude - Amplitud de la onda
     * @param {number} frequency - Frecuencia de la onda
     * @param {number} phaseOffset - Desfase de la onda
     */
    drawWavyLine(ctx, baseX, startY, endY, amplitude, frequency, phaseOffset) {
        ctx.beginPath();
        
        const step = 4; // Resolución de la curva
        
        for (let y = startY; y <= endY; y += step) {
            // Calcular offset X usando función seno (estático)
            const waveOffset = Math.sin(y * frequency + phaseOffset) * amplitude;
            const x = baseX + waveOffset;
            
            if (y === startY) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
    }
    
}

