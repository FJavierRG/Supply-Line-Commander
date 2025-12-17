// ===== SISTEMA DE SOMBRAS DE NUBES =====
// Renderiza sombras de nubes pasando por el terreno usando sprites

/**
 * CloudShadowRenderer - Sistema de sombras de nubes ambientales
 * 
 * Responsabilidades:
 * - Renderizar sombras de nubes que pasan lentamente por el mapa
 * - Usar sprites de nubes (cloud1-4.png) con variación aleatoria
 * - Crear ambiente cinematográfico sin afectar gameplay
 * 
 * Optimizaciones aplicadas:
 * - Número fijo de nubes (6-8 max)
 * - Movimiento lineal simple (sin física compleja)
 * - Sprites precargados del AssetManager
 * - Reciclaje de nubes cuando salen del mapa
 */
export class CloudShadowRenderer {
    constructor(ctx, game = null, assetManager = null) {
        this.ctx = ctx;
        this.game = game;
        this.assetManager = assetManager;
        
        // Configuración de las sombras de nubes
        this.config = {
            enabled: true,
            cloudCount: 7,          // Número de nubes
            minSize: 500,           // Tamaño mínimo de sombra
            maxSize: 750,           // Tamaño máximo de sombra
            minSpeed: 10,           // Velocidad mínima (px/s)
            maxSpeed: 35,           // Velocidad máxima (px/s)
            opacity: 0.75,          // Opacidad base de las sombras
            verticalDrift: 6,       // Deriva vertical máxima (px/s)
            spriteCount: 4,         // Número de sprites disponibles (cloud1-4)
            minSeparation: 400,     // Separación mínima entre nubes (px)
        };
        
        // Array de nubes activas
        this.clouds = [];
        
        // Contador para espaciar nubes nuevas en X
        this._spawnOffsetAccumulator = 0;
        
        // Flag para inicialización lazy
        this._initialized = false;
    }
    
    /**
     * Inicializa las nubes con posiciones distribuidas uniformemente
     * Se llama de forma lazy en el primer render
     */
    init() {
        if (this._initialized) return;
        
        const worldWidth = this.game?.worldWidth || this.ctx.canvas.width;
        const worldHeight = this.game?.worldHeight || this.ctx.canvas.height;
        
        this.clouds = [];
        this._spawnOffsetAccumulator = 0;
        
        // Distribuir nubes uniformemente por el mapa para evitar amontonamiento
        const cols = Math.ceil(Math.sqrt(this.config.cloudCount * (worldWidth / worldHeight)));
        const rows = Math.ceil(this.config.cloudCount / cols);
        const cellWidth = worldWidth / cols;
        const cellHeight = worldHeight / rows;
        
        for (let i = 0; i < this.config.cloudCount; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            
            // Posición base en la celda + variación aleatoria dentro de la celda
            const baseX = col * cellWidth + Math.random() * cellWidth * 0.6;
            const baseY = row * cellHeight + Math.random() * cellHeight * 0.6;
            
            this.clouds.push(this._createCloudAtPosition(worldWidth, worldHeight, baseX, baseY));
        }
        
        this._initialized = true;
        console.log(`🌥️ CloudShadowRenderer: ${this.clouds.length} nubes inicializadas (separación: ${this.config.minSeparation}px)`);
    }
    
    /**
     * Crea una nueva nube en una posición específica
     * @param {number} worldWidth - Ancho del mundo
     * @param {number} worldHeight - Alto del mundo
     * @param {number} startX - Posición X inicial
     * @param {number} startY - Posición Y inicial
     */
    _createCloudAtPosition(worldWidth, worldHeight, startX, startY) {
        const size = this.config.minSize + Math.random() * (this.config.maxSize - this.config.minSize);
        const speed = this.config.minSpeed + Math.random() * (this.config.maxSpeed - this.config.minSpeed);
        
        // Velocidad diagonal: X positivo (hacia derecha) + Y positivo (hacia abajo)
        const diagonalRatio = 0.4 + Math.random() * 0.3;
        const verticalSpeed = speed * diagonalRatio;
        
        const spriteIndex = Math.floor(Math.random() * this.config.spriteCount) + 1;
        
        return {
            x: startX,
            y: startY,
            size: size,
            speed: speed,
            verticalSpeed: verticalSpeed,
            spriteKey: `cloud-${spriteIndex}`,
            flipH: Math.random() < 0.5,
            flipV: Math.random() < 0.5,
            opacityMultiplier: 0.7 + Math.random() * 0.5,
            rotation: (Math.random() - 0.5) * 0.52,
        };
    }
    
    /**
     * Crea una nueva nube para reciclaje (entra desde la izquierda con separación)
     * Movimiento: DIAGONAL de izquierda-arriba hacia derecha-abajo
     * @param {number} worldWidth - Ancho del mundo
     * @param {number} worldHeight - Alto del mundo
     */
    _createCloud(worldWidth, worldHeight) {
        const size = this.config.minSize + Math.random() * (this.config.maxSize - this.config.minSize);
        const speed = this.config.minSpeed + Math.random() * (this.config.maxSpeed - this.config.minSpeed);
        
        // Velocidad diagonal: X positivo (hacia derecha) + Y positivo (hacia abajo)
        const diagonalRatio = 0.4 + Math.random() * 0.3;
        const verticalSpeed = speed * diagonalRatio;
        
        const spriteIndex = Math.floor(Math.random() * this.config.spriteCount) + 1;
        
        // Acumular offset para separación entre nubes que salen
        // Esto evita que múltiples nubes recicladas salgan en el mismo frame
        this._spawnOffsetAccumulator += this.config.minSeparation + Math.random() * this.config.minSeparation;
        
        // Nueva nube: entra desde la izquierda con offset de separación
        const startX = -size - this._spawnOffsetAccumulator;
        const startY = Math.random() * worldHeight * 0.7 - size * 0.2;
        
        return {
            x: startX,
            y: startY,
            size: size,
            speed: speed,
            verticalSpeed: verticalSpeed,
            spriteKey: `cloud-${spriteIndex}`,
            flipH: Math.random() < 0.5,
            flipV: Math.random() < 0.5,
            opacityMultiplier: 0.7 + Math.random() * 0.5,
            rotation: (Math.random() - 0.5) * 0.52,
        };
    }
    
    /**
     * Actualiza la posición de las nubes
     * Movimiento DIAGONAL: izquierda→derecha y arriba→abajo
     * @param {number} dt - Delta time en segundos
     */
    update(dt) {
        if (!this.config.enabled || !this._initialized) return;
        
        const worldWidth = this.game?.worldWidth || this.ctx.canvas.width;
        const worldHeight = this.game?.worldHeight || this.ctx.canvas.height;
        
        // Reducir el acumulador de spawn gradualmente (las nubes avanzan)
        if (this._spawnOffsetAccumulator > 0) {
            // Reducir basado en la velocidad promedio de las nubes
            const avgSpeed = (this.config.minSpeed + this.config.maxSpeed) / 2;
            this._spawnOffsetAccumulator = Math.max(0, this._spawnOffsetAccumulator - avgSpeed * dt);
        }
        
        for (let i = 0; i < this.clouds.length; i++) {
            const cloud = this.clouds[i];
            
            // Mover la nube en diagonal: hacia DERECHA y hacia ABAJO
            cloud.x += cloud.speed * dt;
            cloud.y += cloud.verticalSpeed * dt;
            
            // Reciclar nube si sale por la derecha O por abajo
            const outOfBoundsRight = cloud.x > worldWidth + cloud.size;
            const outOfBoundsBottom = cloud.y > worldHeight + cloud.size;
            
            if (outOfBoundsRight || outOfBoundsBottom) {
                // Reusar el objeto en lugar de crear uno nuevo (evitar GC)
                const newCloud = this._createCloud(worldWidth, worldHeight);
                cloud.x = newCloud.x;
                cloud.y = newCloud.y;
                cloud.size = newCloud.size;
                cloud.speed = newCloud.speed;
                cloud.verticalSpeed = newCloud.verticalSpeed;
                cloud.spriteKey = newCloud.spriteKey;
                cloud.flipH = newCloud.flipH;
                cloud.flipV = newCloud.flipV;
                cloud.opacityMultiplier = newCloud.opacityMultiplier;
                cloud.rotation = newCloud.rotation;
            }
        }
    }
    
    /**
     * Renderiza todas las sombras de nubes
     * Debe llamarse DESPUÉS del territorio y ANTES de los nodos
     */
    render() {
        if (!this.config.enabled) return;
        
        // Necesitamos el assetManager para los sprites
        const assetManager = this.assetManager || this.game?.assetManager;
        if (!assetManager) {
            console.warn('🌥️ CloudShadowRenderer: No hay assetManager!');
            return;
        }
        
        // Inicialización lazy
        if (!this._initialized) {
            this.init();
            
            // DEBUG: Verificar que los sprites existen
            for (let i = 1; i <= 4; i++) {
                const sprite = assetManager.getSprite(`cloud-${i}`);
                console.log(`🌥️ Sprite cloud-${i}:`, sprite ? '✅ OK' : '❌ NO ENCONTRADO');
            }
        }
        
        const ctx = this.ctx;
        
        for (let i = 0; i < this.clouds.length; i++) {
            const cloud = this.clouds[i];
            this._renderCloudShadow(ctx, cloud, assetManager);
        }
    }
    
    /**
     * Renderiza una sombra de nube individual usando sprite
     * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
     * @param {Object} cloud - Datos de la nube
     * @param {Object} assetManager - Gestor de assets
     */
    _renderCloudShadow(ctx, cloud, assetManager) {
        const sprite = assetManager.getSprite(cloud.spriteKey);
        
        const { x, y, size, flipH, flipV, opacityMultiplier, rotation } = cloud;
        const opacity = this.config.opacity * opacityMultiplier;
        
        ctx.save();
        
        // Posicionar en el centro de la nube
        ctx.translate(x, y);
        
        // Aplicar rotación
        if (rotation !== 0) {
            ctx.rotate(rotation);
        }
        
        // Aplicar mirror (flip)
        const scaleX = flipH ? -1 : 1;
        const scaleY = flipV ? -1 : 1;
        ctx.scale(scaleX, scaleY);
        
        // Aplicar opacidad
        ctx.globalAlpha = opacity;
        
        if (sprite) {
            // Dibujar el sprite centrado
            ctx.drawImage(
                sprite,
                -size / 2,
                -size / 2,
                size,
                size
            );
        } else {
            // FALLBACK: Si no hay sprite, dibujar un círculo gris
            ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
            ctx.beginPath();
            ctx.ellipse(0, 0, size / 2, size / 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    /**
     * Activa o desactiva el sistema de sombras
     * @param {boolean} enabled - Estado deseado
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
    }
    
    /**
     * Verifica si el sistema está habilitado
     * @returns {boolean}
     */
    isEnabled() {
        return this.config.enabled;
    }
    
    /**
     * Actualiza la configuración de las sombras
     * @param {Object} newConfig - Nueva configuración parcial
     */
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
    }
    
    /**
     * Reinicia el sistema con nuevas nubes
     */
    reset() {
        this._initialized = false;
        this.clouds = [];
        this._spawnOffsetAccumulator = 0;
    }
}
