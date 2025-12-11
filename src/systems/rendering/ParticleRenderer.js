// ===== RENDERIZADO DE PARTÍCULAS Y EFECTOS =====
// Maneja el renderizado de partículas, explosiones, impactos y textos/sprites flotantes

/**
 * ParticleRenderer - Renderiza partículas, explosiones, impactos y efectos flotantes
 * Responsabilidades:
 * - Renderizado de partículas básicas
 * - Renderizado de explosiones (edificios y drones)
 * - Renderizado de marcas de impacto
 * - Renderizado de textos flotantes (batch optimizado)
 * - Renderizado de sprites flotantes
 * - Renderizado de sprites cayendo
 */
export class ParticleRenderer {
    constructor(ctx, assetManager = null, renderContext = null) {
        this.ctx = ctx;
        this.assetManager = assetManager;
        this.renderContext = renderContext; // Necesario para mirror view compensation
    }
    
    /**
     * Renderiza una partícula básica
     * @param {Object} particle - Partícula a renderizar
     */
    renderParticle(particle) {
        this.ctx.globalAlpha = particle.alpha;
        this.ctx.fillStyle = particle.color;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
    }
    
    /**
     * Renderiza un sprite de explosión (3 frames)
     * @param {Object} explosion - Explosión a renderizar
     */
    renderExplosionSprite(explosion) {
        // Animación de 3 frames: explosion-1, explosion-2, explosion-3
        // Cada frame: 0.2s (total 0.6s)
        if (!explosion || typeof explosion.life === 'undefined') return;
        
        // 🆕 FOG OF WAR: Verificar si la explosión está en zona con niebla
        const game = this.renderContext?.game;
        if (game?.fogOfWar && game.isMultiplayer) {
            const myTeam = game.myTeam || 'player1';
            const enemyTeam = myTeam === 'player1' ? 'player2' : 'player1';
            const worldWidth = game.worldWidth || 1920;
            const centerX = worldWidth / 2;
            
            // Determinar si la explosión está en territorio enemigo
            const isInEnemyTerritory = (myTeam === 'player1' && explosion.x > centerX) ||
                                        (myTeam === 'player2' && explosion.x < centerX);
            
            if (isInEnemyTerritory) {
                // Verificar si esa zona tiene niebla
                if (!game.fogOfWar.isVisible({ team: enemyTeam, y: explosion.y })) {
                    return; // No renderizar explosión oculta por niebla
                }
            }
        }
        
        // Obtener el frame actual según el progreso
        const currentFrame = explosion.getCurrentFrame ? explosion.getCurrentFrame() : 'explosion-1';
        const sprite = this.assetManager.getSprite(currentFrame);
        if (!sprite) return;
        
        // Tamaño aumentado 35%: 120 * 1.35 = 162
        const size = 162;
        
        this.ctx.drawImage(
            sprite,
            explosion.x - size/2,
            explosion.y - size/2,
            size,
            size
        );
    }
    
    /**
     * Renderiza una explosión de dron (2 frames)
     * @param {Object} explosion - Explosión de dron a renderizar
     */
    renderDroneExplosionSprite(explosion) {
        // Animación de 2 frames: drone-explosion-1, drone-explosion-2
        // Cada frame: 0.2s (total 0.4s)
        if (!explosion || typeof explosion.life === 'undefined') return;
        
        // Obtener el frame actual según el progreso
        const currentFrame = explosion.getCurrentFrame ? explosion.getCurrentFrame() : 'drone-explosion-1';
        const sprite = this.assetManager.getSprite(currentFrame);
        if (!sprite) return;
        
        // Tamaño más pequeño que explosiones de edificios (drones son más pequeños)
        const size = 100; // Tamaño apropiado para explosión de dron
        
        this.ctx.drawImage(
            sprite,
            explosion.x - size/2,
            explosion.y - size/2,
            size,
            size
        );
    }
    
    /**
     * Renderiza una marca de impacto
     * @param {Object} impactMark - Marca de impacto a renderizar
     */
    renderImpactMark(impactMark) {
        // 🆕 FOG OF WAR: Verificar si la marca de impacto está en zona con niebla
        const game = this.renderContext?.game;
        if (game?.fogOfWar && game.isMultiplayer) {
            const myTeam = game.myTeam || 'player1';
            const enemyTeam = myTeam === 'player1' ? 'player2' : 'player1';
            
            // Si la marca tiene equipo, usar ese. Sino, determinar por posición
            if (impactMark.team) {
                // La marca tiene equipo asignado
                if (impactMark.team !== myTeam) {
                    if (!game.fogOfWar.isVisible({ team: impactMark.team, y: impactMark.y })) {
                        return; // No renderizar marca de impacto oculta por niebla
                    }
                }
            } else {
                // Determinar por posición en el mapa
                const worldWidth = game.worldWidth || 1920;
                const centerX = worldWidth / 2;
                
                // Determinar si la marca está en territorio enemigo
                const isInEnemyTerritory = (myTeam === 'player1' && impactMark.x > centerX) ||
                                            (myTeam === 'player2' && impactMark.x < centerX);
                
                if (isInEnemyTerritory) {
                    // Verificar si esa zona tiene niebla
                    if (!game.fogOfWar.isVisible({ team: enemyTeam, y: impactMark.y })) {
                        return; // No renderizar marca de impacto oculta por niebla
                    }
                }
            }
        }
        
        const sprite = this.assetManager.getSprite(impactMark.spriteKey);
        if (!sprite) return;
        
        const baseSize = 96; // Tamaño base de la marca de impacto (+20%)
        const size = baseSize * (impactMark.scale || 1.0); // Aplicar escala personalizada
        
        this.ctx.save();
        this.ctx.globalAlpha = impactMark.alpha; // 50% de opacidad
        this.ctx.translate(impactMark.x, impactMark.y);
        
        // Aplicar flip horizontal si está activado
        if (impactMark.flipH) {
            this.ctx.scale(-1, 1);
        }
        
        this.ctx.drawImage(
            sprite,
            -size/2,
            -size/2,
            size,
            size
        );
        this.ctx.restore();
    }
    
    /**
     * Renderiza un texto flotante individual (DEPRECATED - usar renderFloatingTextsBatch)
     * @param {Object} text - Texto flotante a renderizar
     */
    renderFloatingText(text) {
        // DEPRECATED - Usar renderFloatingTextsBatch() en su lugar
        if (text.alpha < 0.01) return;
        
        this.ctx.save();
        this.ctx.globalAlpha = text.alpha;
        this.ctx.fillStyle = text.color;
        this.ctx.fillText(text.text, text.x, text.y);
        this.ctx.restore();
    }
    
    /**
     * Renderiza múltiples textos flotantes en batch (optimizado)
     * @param {Array} texts - Array de textos flotantes a renderizar
     */
    renderFloatingTextsBatch(texts) {
        // OPTIMIZACIÓN MÁXIMA: Renderizar todos los textos en un solo batch
        // Compatible con todos los navegadores (Chrome/Opera/Firefox)
        
        if (texts.length === 0) return;
        
        // Agrupar textos por color para minimizar cambios de estado
        const textsByColor = new Map();
        for (const text of texts) {
            if (text.alpha < 0.01) continue; // Skip textos invisibles
            
            if (!textsByColor.has(text.color)) {
                textsByColor.set(text.color, []);
            }
            textsByColor.get(text.color).push(text);
        }
        
        // Renderizar por grupos de color (máxima eficiencia)
        for (const [color, colorTexts] of textsByColor) {
            // 🆕 NUEVO: Configurar estilo según el tipo de texto
            const isDisabledText = colorTexts.some(t => t.text === 'Disabled');
            const isCurrencyText = colorTexts.some(t => t.text.startsWith('-') || t.text.startsWith('+'));
            
            // Tamaño según tipo de texto
            let fontSize = 'bold 16px Arial';
            if (isDisabledText) fontSize = 'bold 18px Arial';
            if (isCurrencyText) fontSize = 'bold 22px Arial'; // 🆕 NUEVO: Más grande para currency pero no excesivo
            
            this.ctx.font = fontSize;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            this.ctx.fillStyle = color;
            
            for (const text of colorTexts) {
                // 🆕 NUEVO: Alpha más suave para textos de currency (multiplicar por 0.5 = 50% más transparente)
                const textAlpha = isCurrencyText ? (text.alpha * 0.5) : text.alpha;
                this.ctx.globalAlpha = textAlpha;
                
                // 🆕 Compensar Mirror View para textos "Disabled" (no deben verse volteados)
                if (isDisabledText && this.renderContext && this.renderContext.mirrorViewApplied) {
                    this.ctx.save();
                    // 🆕 NUEVO: Compensar el mirror view usando método unificado para elementos globales
                    this.renderContext.applyGlobalMirrorCompensation();
                    
                    // Contorno negro (stroke) para mejor legibilidad
                    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
                    this.ctx.lineWidth = 3;
                    this.ctx.strokeText(text.text, text.x, text.y);
                    // Texto principal en rojo
                    this.ctx.fillText(text.text, text.x, text.y);
                    this.ctx.restore();
                } else if (isDisabledText) {
                    this.ctx.save();
                    // Contorno negro (stroke) para mejor legibilidad
                    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
                    this.ctx.lineWidth = 3;
                    this.ctx.strokeText(text.text, text.x, text.y);
                    // Texto principal en rojo
                    this.ctx.fillText(text.text, text.x, text.y);
                    this.ctx.restore();
                } else {
                    // Textos normales (incluye currency) sin contorno
                    this.ctx.fillText(text.text, text.x, text.y);
                }
            }
        }
        
        // Resetear alpha y font
        this.ctx.globalAlpha = 1;
        this.ctx.font = 'bold 32px Arial'; // Restaurar font por defecto
    }
    
    /**
     * Renderiza sprites flotantes (ej: sniper kill feed)
     * @param {Array} sprites - Array de sprites flotantes a renderizar
     */
    renderFloatingSprites(sprites) {
        if (sprites.length === 0) return;
        
        for (const sprite of sprites) {
            if (sprite.alpha < 0.01) continue; // Skip sprites invisibles
            
            const spriteImg = this.assetManager?.getSprite(sprite.spriteKey);
            if (!spriteImg) continue;
            
            this.ctx.save();
            this.ctx.globalAlpha = sprite.alpha;
            
            const width = spriteImg.width * sprite.scale;
            const height = spriteImg.height * sprite.scale;
            
            // Las coordenadas del sprite están en coordenadas del mundo del servidor
            // Cuando Mirror View está activo, el canvas está volteado con ctx.scale(-1, 1)
            // después de ctx.translate(worldWidth, 0), lo que significa que un punto en x del mundo
            // se renderiza visualmente en worldWidth - x. Pero como el canvas está volteado,
            // necesitamos usar las coordenadas directamente sin transformación adicional.
            // El sprite se renderiza correctamente porque el canvas ya está volteado.
            this.ctx.drawImage(
                spriteImg,
                sprite.x - width / 2,
                sprite.y - height / 2,
                width,
                height
            );
            
            this.ctx.restore();
        }
    }
    
    /**
     * Renderiza sprites cayendo
     * @param {Array} sprites - Array de sprites cayendo a renderizar
     */
    renderFallingSprites(sprites) {
        if (sprites.length === 0) return;
        
        for (const sprite of sprites) {
            if (sprite.alpha < 0.01) continue; // Skip sprites invisibles
            
            const spriteImg = this.assetManager?.getSprite(sprite.spriteKey);
            if (!spriteImg) continue;
            
            this.ctx.save();
            this.ctx.globalAlpha = sprite.alpha;
            
            const width = spriteImg.width * sprite.scale;
            const height = spriteImg.height * sprite.scale;
            
            this.ctx.drawImage(
                spriteImg,
                sprite.x - width / 2,
                sprite.y - height / 2,
                width,
                height
            );
            
            this.ctx.restore();
        }
    }
}

