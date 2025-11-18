// ===== GESTIÓN DE CONTEXTO DE RENDERIZADO =====
// Maneja canvas, contexto 2D, mirror view y operaciones básicas de contexto

import { GAME_CONFIG } from '../../config/constants.js';

/**
 * RenderContext - Gestiona el contexto de renderizado y operaciones de canvas
 * Responsabilidades:
 * - Configuración del canvas y contexto 2D
 * - Mirror view para multiplayer (player2)
 * - Operaciones básicas (clear, resize)
 * - Compensaciones de mirror view para UI
 */
export class RenderContext {
    constructor(canvas, game = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.game = game;
        this.mirrorViewApplied = false; // Estado de transformación de vista espejo
        
        // Pre-configurar fuente para textos flotantes (UNA SOLA VEZ)
        this.ctx.font = 'bold 32px Arial'; // +35% (24 * 1.35 = 32.4 ≈ 32)
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // 🎨 MEJORA DE CALIDAD: Habilitar suavizado de imágenes para mejor calidad al escalar
        this.ctx.imageSmoothingEnabled = true;
        if (this.ctx.imageSmoothingQuality) {
            this.ctx.imageSmoothingQuality = 'high';
        }
    }
    
    /**
     * Actualiza las dimensiones del contexto
     * @param {number} width - Nuevo ancho
     * @param {number} height - Nueva altura
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
    }
    
    /**
     * Limpia el canvas completo (solo la parte visible en pantalla)
     */
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = GAME_CONFIG.CANVAS_BG_COLOR;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    /**
     * Aplica vista espejo para player2 (flip horizontal del canvas completo)
     * Debe llamarse DESPUÉS de aplicar la cámara pero ANTES de renderizar el contenido
     */
    applyMirrorView() {
        if (!this.game || !this.game.isMultiplayer) return;
        if (this.game.myTeam !== 'player2') return;
        if (this.mirrorViewApplied) return; // Ya aplicado
        
        const worldWidth = this.game.worldWidth || this.width;
        
        this.ctx.save();
        // Trasladar al centro del mundo, hacer flip, y volver
        this.ctx.translate(worldWidth, 0);
        this.ctx.scale(-1, 1);
        this.mirrorViewApplied = true;
        
        // console.log('🔄 Mirror View aplicada para player2'); // Comentado para limpiar consola
    }
    
    /**
     * Restaura la transformación de vista espejo
     * Debe llamarse ANTES de restaurar la cámara
     */
    restoreMirrorView() {
        if (!this.mirrorViewApplied) return;
        
        this.ctx.restore();
        this.mirrorViewApplied = false;
    }
    
    /**
     * Aplica compensación del mirror view para UI centrada en un punto
     * Usar para elementos de UI que deben verse correctamente orientados (textos, iconos, botones)
     * @param {number} centerX - Coordenada X del centro del elemento
     * @param {number} centerY - Coordenada Y del centro del elemento
     * @returns {boolean} - True si se aplicó la compensación (para saber si hacer restore después)
     */
    applyMirrorCompensation(centerX, centerY) {
        if (!this.mirrorViewApplied) return false;
        
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(-1, 1);
        this.ctx.translate(-centerX, -centerY);
        return true;
    }
    
    /**
     * Restaura la compensación del mirror view aplicada con applyMirrorCompensation
     * @param {boolean} wasApplied - Resultado de applyMirrorCompensation
     */
    restoreMirrorCompensation(wasApplied) {
        if (wasApplied) {
            this.ctx.restore();
        }
    }
    
    /**
     * Ejecuta una función de renderizado con compensación automática del mirror view
     * Útil para simplificar el código y evitar olvidar el restore
     * @param {Function} renderFn - Función que realiza el renderizado
     * @param {number} centerX - Coordenada X del centro del elemento
     * @param {number} centerY - Coordenada Y del centro del elemento
     */
    renderWithMirrorCompensation(renderFn, centerX, centerY) {
        const wasApplied = this.applyMirrorCompensation(centerX, centerY);
        try {
            renderFn();
        } finally {
            this.restoreMirrorCompensation(wasApplied);
        }
    }
    
    /**
     * Aplica compensación del mirror view para elementos globales (tooltips, textos flotantes)
     * Usar para elementos que no están centrados en un nodo específico
     * @returns {boolean} - True si se aplicó la compensación
     */
    applyGlobalMirrorCompensation() {
        if (!this.mirrorViewApplied) return false;
        
        const worldWidth = this.game?.worldWidth || this.width;
        this.ctx.scale(-1, 1);
        this.ctx.translate(-worldWidth, 0);
        return true;
    }
}

