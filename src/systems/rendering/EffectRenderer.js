// ===== RENDERIZADO DE EFECTOS ESPECIALES =====
// Maneja efectos visuales especiales como artillería y el destructor de mundos

/**
 * EffectRenderer - Renderiza efectos visuales especiales
 * Responsabilidades:
 * - Efectos de artillería (countdown con sprite EndOfWorlds)
 * - Efectos del destructor de mundos (countdown + pantallazo blanco)
 * - Gestión de estado de efectos activos
 */
export class EffectRenderer {
    constructor(ctx, assetManager = null, game = null) {
        this.ctx = ctx;
        this.assetManager = assetManager;
        this.game = game;
        
        // Estado del Destructor de mundos (efectos visuales)
        this.worldDestroyerActive = false;
        this.worldDestroyerStartTime = null;
        this.worldDestroyerCountdownDuration = 7;
        this.worldDestroyerExecuted = false;
        this.worldDestroyerExecutionTime = null;
        this._localStartTime = null;
        this._localExecutionStartTime = null;
        this._localElapsedSinceExecution = null;
        this._localExecutionTime = null;
        
        // Estado de artillería (efectos visuales)
        this.artilleryStrikes = []; // Array de bombardeos de artillería activos
    }
    
    /**
     * Inicia el efecto visual del Destructor de mundos (countdown)
     * @param {number} startTime - Tiempo de inicio del efecto
     * @param {number} countdownDuration - Duración del countdown en segundos
     */
    startWorldDestroyerEffect(startTime, countdownDuration) {
        this.worldDestroyerActive = true;
        this.worldDestroyerStartTime = startTime;
        this.worldDestroyerCountdownDuration = countdownDuration || 7;
        this.worldDestroyerExecuted = false;
        this.worldDestroyerExecutionTime = null;
        
        // Guardar tiempo local para fallback
        this._localStartTime = Date.now();
        
        console.log(`☠️ Iniciando efectos visuales del Destructor de mundos - countdown: ${this.worldDestroyerCountdownDuration}s, startTime: ${startTime}`);
    }
    
    /**
     * Ejecuta el efecto visual del Destructor de mundos (pantallazo blanco)
     * @param {Object} eventData - Datos del evento de ejecución
     */
    executeWorldDestroyerEffect(eventData) {
        this.worldDestroyerExecuted = true;
        
        // Usar tiempo del servidor si está disponible, o tiempo local como fallback
        if (this.game?.network?.lastGameState?.gameTime !== undefined) {
            this.worldDestroyerExecutionTime = this.game.network.lastGameState.gameTime;
        } else if (this.game?.gameTime !== undefined) {
            this.worldDestroyerExecutionTime = this.game.gameTime;
        } else {
            // Fallback: calcular desde el countdown
            this.worldDestroyerExecutionTime = (this.worldDestroyerStartTime || 0) + (this.worldDestroyerCountdownDuration || 7);
        }
        
        this.worldDestroyerActive = false; // Detener el countdown visual
        this._localExecutionStartTime = Date.now();
        this._localElapsedSinceExecution = 0;
        
        console.log(`☠️ Ejecutando pantallazo blanco del Destructor de mundos - executionTime: ${this.worldDestroyerExecutionTime}`);
    }
    
    /**
     * Inicia el efecto visual de artillería
     * @param {Object} data - Datos del bombardeo de artillería
     */
    executeArtilleryEffect(data) {
        // Agregar bombardeo de artillería a la lista activa
        this.artilleryStrikes.push({
            id: data.artilleryId,
            x: data.x,
            y: data.y,
            startTime: data.startTime || (this.game?.network?.lastGameState?.gameTime || 0),
            active: true
        });
        
        console.log(`💣 Iniciando efecto visual de artillería ${data.artilleryId} en (${data.x}, ${data.y})`);
    }
    
    /**
     * Renderiza los efectos visuales de artillería
     * Usa el sprite EndOfWorlds pero pequeño y en el área de efecto
     */
    renderArtilleryEffects() {
        if (!this.game) return;
        
        // Obtener tiempo del servidor si está disponible
        let currentTime = 0;
        if (this.game.network && this.game.network.lastGameState && this.game.network.lastGameState.gameTime !== undefined) {
            currentTime = this.game.network.lastGameState.gameTime;
        } else if (this.game.gameTime !== undefined) {
            currentTime = this.game.gameTime;
        }
        
        const sprite = this.assetManager?.getSprite('end-of-worlds');
        if (!sprite) return;
        
        const countdownDuration = 3; // 3 segundos según configuración
        
        // Renderizar cada bombardeo de artillería activo
        for (let i = this.artilleryStrikes.length - 1; i >= 0; i--) {
            const artillery = this.artilleryStrikes[i];
            
            if (!artillery.active) {
                this.artilleryStrikes.splice(i, 1);
                continue;
            }
            
            const elapsed = currentTime - artillery.startTime;
            
            if (elapsed >= 0 && elapsed < countdownDuration) {
                // Renderizar countdown con sprite EndOfWorlds pequeño
                const progress = Math.min(elapsed / countdownDuration, 1);
                
                // Tamaño: desde 50% hasta 300% (más pequeño que world destroyer)
                const baseSize = 80; // Tamaño base más pequeño
                const sizeMultiplier = 1 + (progress * 2); // De 1x a 3x (en vez de 6x)
                const currentSize = baseSize * sizeMultiplier;
                
                // Alpha: desde 10% hasta 100%
                const alpha = 0.1 + (progress * 0.9); // De 0.1 a 1.0
                
                // Renderizar sprite centrado en la posición del bombardeo
                this.ctx.save();
                this.ctx.globalAlpha = alpha;
                this.ctx.translate(artillery.x, artillery.y);
                
                // Renderizar el sprite centrado
                this.ctx.drawImage(
                    sprite,
                    -currentSize / 2,
                    -currentSize / 2,
                    currentSize,
                    currentSize
                );
                
                this.ctx.restore();
            } else if (elapsed >= countdownDuration) {
                // Countdown terminado, eliminar de la lista
                artillery.active = false;
            }
        }
    }
    
    /**
     * Renderiza los efectos visuales del Destructor de mundos
     * Incluye el sprite EndOfWorlds durante el countdown y el pantallazo blanco
     */
    renderWorldDestroyerEffects() {
        if (!this.game) return;
        
        // Obtener tiempo del servidor si está disponible, o usar tiempo local
        let currentTime = 0;
        if (this.game.network && this.game.network.lastGameState && this.game.network.lastGameState.gameTime !== undefined) {
            currentTime = this.game.network.lastGameState.gameTime;
        } else if (this.game.gameTime !== undefined) {
            currentTime = this.game.gameTime;
        } else {
            // Fallback: usar tiempo relativo local desde activación
            if (this.worldDestroyerActive && this._localStartTime) {
                currentTime = (Date.now() - this._localStartTime) / 1000;
            } else if (this.worldDestroyerExecuted && this._localExecutionTime) {
                currentTime = (Date.now() - this._localExecutionTime) / 1000 + this.worldDestroyerCountdownDuration;
            }
        }
        
        // === FASE 1: Countdown con sprite EndOfWorlds (7 segundos) ===
        if (this.worldDestroyerActive && this.worldDestroyerStartTime !== null) {
            const elapsed = currentTime - this.worldDestroyerStartTime;
            const countdownDuration = this.worldDestroyerCountdownDuration || 7;
            
            if (elapsed >= 0 && elapsed < countdownDuration) {
                this.renderWorldDestroyerCountdown(elapsed, countdownDuration);
            } else if (elapsed >= countdownDuration) {
                // Countdown terminado, debería ejecutarse (el servidor maneja esto)
                // Pero si el cliente aún está activo, esperar la ejecución del servidor
            }
        }
        
        // === FASE 2: Pantallazo blanco (2 segundos + 2 segundos de fade out = 4 segundos total) ===
        if (this.worldDestroyerExecuted && this.worldDestroyerExecutionTime !== null) {
            // Usar tiempo relativo desde la ejecución
            let elapsedSinceExecution;
            if (this.game.network && this.game.network.lastGameState && this.game.network.lastGameState.gameTime !== undefined) {
                elapsedSinceExecution = this.game.network.lastGameState.gameTime - this.worldDestroyerExecutionTime;
            } else {
                elapsedSinceExecution = this._localElapsedSinceExecution || 0;
            }
            
            const whiteScreenDuration = 2;
            const fadeOutDuration = 2;
            const totalDuration = whiteScreenDuration + fadeOutDuration; // 4 segundos total
            
            if (elapsedSinceExecution >= 0 && elapsedSinceExecution < totalDuration) {
                // Actualizar tiempo local si no tenemos tiempo del servidor
                if (!this._localExecutionStartTime) {
                    this._localExecutionStartTime = Date.now();
                }
                if (!this.game.network || !this.game.network.lastGameState) {
                    elapsedSinceExecution = (Date.now() - this._localExecutionStartTime) / 1000;
                    this._localElapsedSinceExecution = elapsedSinceExecution;
                }
                
                this.renderWhiteScreen(elapsedSinceExecution, whiteScreenDuration, fadeOutDuration);
            } else if (elapsedSinceExecution >= totalDuration) {
                // Terminó el efecto, limpiar
                this.worldDestroyerExecuted = false;
                this.worldDestroyerExecutionTime = null;
                this._localExecutionStartTime = null;
                this._localElapsedSinceExecution = null;
            }
        }
    }
    
    /**
     * Renderiza el sprite EndOfWorlds durante el countdown
     * @param {number} elapsed - Tiempo transcurrido desde el inicio
     * @param {number} countdownDuration - Duración total del countdown
     */
    renderWorldDestroyerCountdown(elapsed, countdownDuration) {
        const sprite = this.assetManager?.getSprite('end-of-worlds');
        if (!sprite) return;
        
        // Calcular progreso (0 a 1)
        const progress = Math.min(elapsed / countdownDuration, 1);
        
        // Tamaño: desde 100% hasta 600% (6x el tamaño original)
        const baseSize = 200; // Tamaño base del sprite
        const sizeMultiplier = 1 + (progress * 5); // De 1x a 6x
        const currentSize = baseSize * sizeMultiplier;
        
        // Alpha: desde 10% hasta 100%
        const alpha = 0.1 + (progress * 0.9); // De 0.1 a 1.0
        
        // Calcular centro del mapa
        const width = this.game?.worldWidth || this.ctx.canvas.width;
        const height = this.game?.worldHeight || this.ctx.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Renderizar sprite con transformaciones
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.translate(centerX, centerY);
        
        // Renderizar el sprite centrado
        this.ctx.drawImage(
            sprite,
            -currentSize / 2,
            -currentSize / 2,
            currentSize,
            currentSize
        );
        
        this.ctx.restore();
    }
    
    /**
     * Renderiza el pantallazo blanco
     * @param {number} elapsed - Tiempo transcurrido desde la ejecución
     * @param {number} whiteScreenDuration - Duración del pantallazo blanco completo (2s)
     * @param {number} fadeOutDuration - Duración del desvanecimiento (2s)
     */
    renderWhiteScreen(elapsed, whiteScreenDuration, fadeOutDuration) {
        let alpha = 1.0;
        
        // Durante los primeros 2 segundos: pantallazo blanco completo (alpha = 100%)
        if (elapsed <= whiteScreenDuration) {
            alpha = 1.0;
        } else {
            // Durante los siguientes 2 segundos: desvanecer de 100% a 0%
            const fadeProgress = (elapsed - whiteScreenDuration) / fadeOutDuration;
            alpha = Math.max(0, 1.0 - fadeProgress);
        }
        
        // Renderizar pantallazo blanco sobre todo
        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, width, height);
        this.ctx.restore();
    }
}

