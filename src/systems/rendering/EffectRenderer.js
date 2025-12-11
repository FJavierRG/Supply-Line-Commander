// ===== RENDERIZADO DE EFECTOS ESPECIALES =====
// Maneja efectos visuales especiales como artillería y el destructor de mundos

import { interpolateProgress } from '../../utils/InterpolationUtils.js';
import { ObjectPool } from '../../utils/ObjectPool.js';

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
        
        // 🆕 NUEVO: Sistema de visualización de fábricas
        this.factorySupplyIcons = []; // Array de iconos de suministros viajando desde fábricas a HQs
        this.factoryTimers = new Map(); // Map: factoryId -> { lastGeneration, interval }
        
        // ⚡ OPTIMIZACIÓN: Object Pool para iconos de suministros (prevenir GC)
        this.factorySupplyIconPool = new ObjectPool(
            () => ({
                deliveryId: null,
                factoryId: null,
                hqId: null,
                team: null,
                startX: 0,
                startY: 0,
                targetX: 0,
                targetY: 0,
                currentX: 0,
                currentY: 0,
                distance: 0,
                progress: 0,
                serverProgress: 0,
                speed: 120,
                active: false
            }),
            20,  // Inicial: 20 iconos pre-creados
            40   // Máximo: 40 iconos simultáneos
        );
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
        
        // Guardar tiempo local para fallback (en milisegundos)
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
        // 🔧 FIX: Acceder a lastGameState a través de gameStateSync
        const serverGameTime = this.game?.network?.gameStateSync?.lastGameState?.gameTime;
        if (serverGameTime !== undefined) {
            this.worldDestroyerExecutionTime = serverGameTime;
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
            localStartTime: Date.now(), // Tiempo local para fallback
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
        
        const sprite = this.assetManager?.getSprite('end-of-worlds');
        if (!sprite) {
            console.warn('⚠️ Sprite end-of-worlds no encontrado');
            return;
        }
        
        const countdownDuration = 3; // 3 segundos según configuración
        const myTeam = this.game.myTeam || 'player1';
        
        // Renderizar cada bombardeo de artillería activo
        for (let i = this.artilleryStrikes.length - 1; i >= 0; i--) {
            const artillery = this.artilleryStrikes[i];
            
            // 🆕 FOG OF WAR: Verificar si el efecto de artillería enemiga es visible
            if (this.game.fogOfWar && this.game.isMultiplayer && artillery.team && artillery.team !== myTeam) {
                if (!this.game.fogOfWar.isVisible({ team: artillery.team, y: artillery.y })) {
                    continue; // No renderizar efecto de artillería oculto por niebla
                }
            }
            
            if (!artillery.active) {
                this.artilleryStrikes.splice(i, 1);
                continue;
            }
            
            // Calcular elapsed usando tiempo del servidor si está disponible, o tiempo local como fallback
            let elapsed;
            const serverGameTime = this.game?.network?.gameStateSync?.lastGameState?.gameTime;
            
            // 🔍 DEBUG: Log de acceso al gameTime del servidor
            if (!this._gameTimeAccessLogged) {
                console.log(`🔍 EffectRenderer acceso a gameTime:`, {
                    hasNetwork: !!this.game?.network,
                    hasGameStateSync: !!this.game?.network?.gameStateSync,
                    hasLastGameState: !!this.game?.network?.gameStateSync?.lastGameState,
                    serverGameTime: serverGameTime
                });
                this._gameTimeAccessLogged = true;
            }
            
            if (serverGameTime && serverGameTime > 0) {
                // Usar tiempo del servidor
                elapsed = serverGameTime - artillery.startTime;
            } else if (this.game.gameTime > 0) {
                // Usar tiempo del juego local
                elapsed = this.game.gameTime - artillery.startTime;
            } else {
                // Fallback: usar tiempo local relativo (en segundos)
                elapsed = (Date.now() - artillery.localStartTime) / 1000;
            }
            
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
        
        // === FASE 1: Countdown con sprite EndOfWorlds (7 segundos) ===
        if (this.worldDestroyerActive && this.worldDestroyerStartTime !== null) {
            // Calcular elapsed usando tiempo del servidor si está disponible, o tiempo local como fallback
            let elapsed;
            const serverGameTime = this.game?.network?.gameStateSync?.lastGameState?.gameTime;
            
            if (serverGameTime && serverGameTime > 0) {
                // Usar tiempo del servidor
                elapsed = serverGameTime - this.worldDestroyerStartTime;
            } else if (this.game.gameTime > 0) {
                // Usar tiempo del juego local
                elapsed = this.game.gameTime - this.worldDestroyerStartTime;
            } else {
                // Fallback: usar tiempo local relativo (en segundos)
                elapsed = (Date.now() - this._localStartTime) / 1000;
            }
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
            // 🔧 FIX: Acceder a lastGameState a través de gameStateSync
            let elapsedSinceExecution;
            const serverGameTime = this.game?.network?.gameStateSync?.lastGameState?.gameTime;
            if (serverGameTime !== undefined) {
                elapsedSinceExecution = serverGameTime - this.worldDestroyerExecutionTime;
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
                // 🔧 FIX: Verificar gameStateSync en lugar de lastGameState directo
                if (!this.game?.network?.gameStateSync?.lastGameState) {
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
    
    /**
     * 🆕 NUEVO: Actualiza el sistema de visualización de fábricas con interpolación suave
     * @param {number} dt - Delta time en segundos
     */
    updateFactoryVisuals(dt) {
        // ✅ INTERPOLACIÓN: Los iconos ahora usan interpolación suave hacia el progress del servidor
        // Similar a cómo funcionan convoyes y trenes
        
        if (!this.game || !this.game.nodes) return;
        
        // Actualizar posiciones de iconos existentes con interpolación suave
        for (let i = this.factorySupplyIcons.length - 1; i >= 0; i--) {
            const icon = this.factorySupplyIcons[i];
            
            // ✅ FIX: NO eliminar el icono hasta que el progress local también haya llegado a 1.0
            // Esto evita que desaparezca antes de completar el movimiento visual, especialmente
            // para jugadores con latencia que reciben actualizaciones menos frecuentes
            if (!icon.active) {
                this.factorySupplyIcons.splice(i, 1);
                continue;
            }
            
            // Solo eliminar si tanto serverProgress como progress local han llegado al destino
            // Esto asegura que el movimiento visual se complete antes de eliminar el icono
            if (icon.serverProgress !== undefined && icon.serverProgress >= 1.0 && 
                icon.progress !== undefined && icon.progress >= 0.99) {
                this.factorySupplyIcons.splice(i, 1);
                continue;
            }
            
            // ✅ INTERPOLACIÓN: Interpolar progress local hacia serverProgress
            if (icon.serverProgress !== undefined) {
                // Usar interpolateProgress para suavizar el movimiento
                interpolateProgress(icon, dt, {
                    speed: 8.0, // Velocidad base de interpolación
                    adaptiveSpeeds: {
                        large: 15.0,  // >0.1 diferencia
                        medium: 8.0,  // >0.05 diferencia
                        small: 5.0    // <=0.05 diferencia
                    },
                    threshold: 0.001
                });
                
                // Asegurar que progress no exceda 1.0
                if (icon.progress > 1.0) {
                    icon.progress = 1.0;
                }
            }
            
            // Actualizar posición visual basada en progress interpolado
            if (icon.progress !== undefined && icon.startX !== undefined && icon.targetX !== undefined) {
                const dx = icon.targetX - icon.startX;
                const dy = icon.targetY - icon.startY;
                
                icon.currentX = icon.startX + dx * icon.progress;
                icon.currentY = icon.startY + dy * icon.progress;
            }
        }
    }
    
    /**
     * 🆕 NUEVO: Renderiza las conexiones visuales entre fábricas y HQs
     */
    renderFactoryConnections() {
        if (!this.game || !this.game.nodes) return;
        
        const myTeam = this.game.myTeam || 'player1';
        
        // Buscar todas las fábricas construidas y activas
        const factories = this.game.nodes.filter(n => 
            n.type === 'factory' && 
            n.constructed && 
            n.active && 
            !n.disabled
        );
        
        // Renderizar línea roja desde cada fábrica a su HQ
        for (const factory of factories) {
            // 🆕 FOG OF WAR: Verificar si la fábrica enemiga es visible
            if (this.game.fogOfWar && this.game.isMultiplayer && factory.team && factory.team !== myTeam) {
                if (!this.game.fogOfWar.isVisible(factory)) {
                    continue; // No renderizar conexión de fábrica oculta por niebla
                }
            }
            const hq = this.game.nodes.find(n => 
                n.type === 'hq' && 
                n.team === factory.team &&
                n.active
            );
            
            if (!hq) continue;
            
            // Dibujar línea roja
            this.ctx.save();
            this.ctx.strokeStyle = '#ff0000'; // Rojo
            this.ctx.lineWidth = 2;
            this.ctx.globalAlpha = 0.3; // Más transparente
            this.ctx.beginPath();
            this.ctx.moveTo(factory.x, factory.y);
            this.ctx.lineTo(hq.x, hq.y);
            this.ctx.stroke();
            this.ctx.restore();
        }
    }
    
    /**
     * 🆕 NUEVO: Renderiza los iconos de suministros viajando
     */
    renderFactorySupplyIcons() {
        if (!this.assetManager || this.factorySupplyIcons.length === 0) return;
        
        const sprite = this.assetManager.getSprite('ui-supply-icon');
        if (!sprite) return;
        
        const iconSize = 32; // Tamaño del icono
        const myTeam = this.game?.myTeam || 'player1';
        
        // Renderizar cada icono
        for (const icon of this.factorySupplyIcons) {
            if (!icon.active) continue;
            
            // 🆕 FOG OF WAR: Verificar si el icono de suministro enemigo es visible
            // El icono viaja de factory a HQ, verificar si está en zona con niebla
            if (this.game?.fogOfWar && this.game.isMultiplayer) {
                // Determinar equipo del icono: puede venir de icon.team o de la factory origen
                const iconTeam = icon.team || icon.factoryTeam;
                if (iconTeam && iconTeam !== myTeam) {
                    if (!this.game.fogOfWar.isVisible({ team: iconTeam, y: icon.currentY })) {
                        continue; // No renderizar icono oculto por niebla
                    }
                }
            }
            
            this.ctx.save();
            this.ctx.globalAlpha = 0.7; // Más transparente
            this.ctx.drawImage(
                sprite,
                icon.currentX - iconSize / 2,
                icon.currentY - iconSize / 2,
                iconSize,
                iconSize
            );
            this.ctx.restore();
        }
    }
}

