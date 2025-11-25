// ===== RENDERIZADO DE NIEBLA DE GUERRA =====
// Renderiza el overlay visual de niebla sobre las zonas enemigas no reveladas

/**
 * FogOfWarRenderer - Renderiza overlays de niebla de guerra
 * 
 * Responsabilidades:
 * - Dibujar rectángulos semi-transparentes sobre zonas enemigas con niebla
 * - Aplicar efectos visuales (gradientes, bordes suaves)
 * - Respetar el mirror view para player2
 */
export class FogOfWarRenderer {
    constructor(ctx, game = null, fogSystem = null) {
        this.ctx = ctx;
        this.game = game;
        this.fogSystem = fogSystem;
        
        // Configuración visual de la niebla
        this.fogColor = 'rgba(10, 14, 39, 0.75)'; // Color base oscuro semi-transparente
        this.fogGradientColor = 'rgba(10, 14, 39, 0)'; // Transparente para el gradiente
        this.borderBlur = 50; // Tamaño del degradado en el borde
        
        // Cache para patrones (opcional, para efectos de textura)
        this._fogPattern = null;
    }
    
    /**
     * Actualiza la referencia al sistema de niebla
     * @param {FogOfWarSystem} fogSystem - Sistema de niebla de guerra
     */
    setFogSystem(fogSystem) {
        this.fogSystem = fogSystem;
    }
    
    /**
     * Renderiza la niebla de guerra sobre las zonas enemigas
     * Debe llamarse después del territorio pero antes de nodos/unidades
     */
    render() {
        if (!this.fogSystem || !this.fogSystem.enabled) return;
        if (!this.game) return;
        
        // Renderizar niebla para cada carril que no esté visible
        if (this.fogSystem.shouldRenderFog(1)) {
            this._renderLaneFog(1);
        }
        
        if (this.fogSystem.shouldRenderFog(2)) {
            this._renderLaneFog(2);
        }
    }
    
    /**
     * Renderiza la niebla para un carril específico
     * @param {number} lane - Número de carril (1 o 2)
     */
    _renderLaneFog(lane) {
        const bounds = this.fogSystem.getEnemyZoneBounds(lane);
        if (!bounds) return;
        
        const ctx = this.ctx;
        ctx.save();
        
        // Calcular dimensiones
        const x = bounds.xStart;
        const y = bounds.yStart;
        const width = bounds.xEnd - bounds.xStart;
        const height = bounds.yEnd - bounds.yStart;
        
        // Crear gradiente horizontal para suavizar el borde interno
        const myTeam = this.game?.myTeam || 'player1';
        const gradientX = myTeam === 'player1' 
            ? bounds.xStart  // Gradiente desde la izquierda (centro del mapa)
            : bounds.xEnd;   // Gradiente desde la derecha (centro del mapa)
        
        const gradientEndX = myTeam === 'player1'
            ? bounds.xStart + this.borderBlur
            : bounds.xEnd - this.borderBlur;
        
        // Crear gradiente
        const gradient = ctx.createLinearGradient(gradientX, 0, gradientEndX, 0);
        gradient.addColorStop(0, this.fogGradientColor); // Transparente en el borde
        gradient.addColorStop(1, this.fogColor);          // Opaco hacia el interior
        
        // Dibujar zona de gradiente (borde suave)
        ctx.fillStyle = gradient;
        if (myTeam === 'player1') {
            ctx.fillRect(x, y, this.borderBlur, height);
        } else {
            ctx.fillRect(bounds.xEnd - this.borderBlur, y, this.borderBlur, height);
        }
        
        // Dibujar zona principal de niebla (opaca)
        ctx.fillStyle = this.fogColor;
        if (myTeam === 'player1') {
            ctx.fillRect(x + this.borderBlur, y, width - this.borderBlur, height);
        } else {
            ctx.fillRect(x, y, width - this.borderBlur, height);
        }
        
        // Opcional: Añadir un patrón de ruido o textura
        this._renderFogTexture(x, y, width, height);
        
        ctx.restore();
    }
    
    /**
     * Renderiza una textura sutil sobre la niebla (efecto de partículas/estática)
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @param {number} width - Ancho
     * @param {number} height - Alto
     */
    _renderFogTexture(x, y, width, height) {
        // Efecto de partículas de niebla animadas (opcional)
        const ctx = this.ctx;
        const time = Date.now() / 1000;
        
        // Dibujar algunas "partículas" de niebla que se mueven lentamente
        ctx.fillStyle = 'rgba(100, 120, 150, 0.1)';
        
        const particleCount = 15;
        for (let i = 0; i < particleCount; i++) {
            // Posición basada en tiempo y semilla
            const seed = i * 137.5;
            const px = x + (Math.sin(time * 0.1 + seed) * 0.5 + 0.5) * width;
            const py = y + (Math.cos(time * 0.15 + seed * 0.7) * 0.5 + 0.5) * height;
            const size = 30 + Math.sin(time + seed) * 20;
            
            // Dibujar círculo difuso
            const gradient = ctx.createRadialGradient(px, py, 0, px, py, size);
            gradient.addColorStop(0, 'rgba(80, 100, 130, 0.15)');
            gradient.addColorStop(1, 'rgba(80, 100, 130, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * Renderiza indicadores visuales de dónde están los límites de revelación
     * Útil para debug o feedback visual al jugador
     */
    renderRevealIndicators() {
        if (!this.fogSystem || !this.game) return;
        
        const ctx = this.ctx;
        const worldWidth = this.game.worldWidth || 1920;
        const centerX = worldWidth / 2;
        
        ctx.save();
        ctx.strokeStyle = 'rgba(78, 204, 163, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        
        // Línea vertical en el centro del mapa
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, this.game.worldHeight || 1080);
        ctx.stroke();
        
        // Línea horizontal que divide los carriles
        const laneDiv = this.fogSystem.laneConfig.lane1.yMax;
        ctx.beginPath();
        ctx.moveTo(0, laneDiv);
        ctx.lineTo(worldWidth, laneDiv);
        ctx.stroke();
        
        ctx.setLineDash([]);
        ctx.restore();
    }
    
    /**
     * Renderiza información de debug del sistema de niebla
     * @param {number} x - Coordenada X para el texto
     * @param {number} y - Coordenada Y para el texto
     */
    renderDebugInfo(x = 10, y = 150) {
        if (!this.fogSystem) return;
        
        const ctx = this.ctx;
        const debug = this.fogSystem.getDebugInfo();
        
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 5, y - 15, 200, 80);
        
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        
        ctx.fillText(`FOG OF WAR`, x, y);
        ctx.fillText(`Enabled: ${debug.enabled}`, x, y + 15);
        ctx.fillText(`Lane 1 (sup): ${debug.lane1Visible ? 'VISIBLE' : 'HIDDEN'}`, x, y + 30);
        ctx.fillText(`Lane 2 (inf): ${debug.lane2Visible ? 'VISIBLE' : 'HIDDEN'}`, x, y + 45);
        ctx.fillText(`Reveal dist: ${debug.revealDistance}px`, x, y + 60);
        
        ctx.restore();
    }
}

