// ===== SISTEMA DE RENDERIZADO =====
import { GAME_CONFIG } from '../config/constants.js';
import { getNodeConfig } from '../config/nodes.js';
import { getBuildAreaVisual, getExclusionRadius } from '../config/buildAreaVisual.js';

export class RenderSystem {
    constructor(canvas, assetManager = null, game = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.assetManager = assetManager; // Gestor de sprites (opcional)
        this.game = game; // Referencia al juego (para acceder a la cámara)
        this.backgroundPattern = null; // Patrón de fondo (se crea al cargar sprite)
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
        
        // 🆕 NUEVO: Estado del Destructor de mundos (efectos visuales)
        this.worldDestroyerActive = false;
        this.worldDestroyerStartTime = null;
        this.worldDestroyerCountdownDuration = 7;
        this.worldDestroyerExecuted = false;
        this.worldDestroyerExecutionTime = null;
        
        // 🆕 NUEVO: Estado de artillería (efectos visuales)
        this.artilleryStrikes = []; // Array de bombardeos de artillería activos
    }
    
    /**
     * 🆕 GENERALIZADO: Determina si un nodo siempre debe mirar hacia el oponente
     * @param {Object} node - Nodo a verificar
     * @returns {boolean} True si el nodo siempre debe orientarse hacia el enemigo
     */
    shouldAlwaysFaceOpponent(node) {
        // Lista de tipos/identificadores que deben orientarse hacia el enemigo
        return node.isCommando || 
               node.isTruckAssault ||
               node.isCameraDrone || 
               node.type === 'droneLauncher';
    }
    
    resize(width, height) {
        this.width = width;
        this.height = height;
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
     * 🆕 NUEVO: Aplica compensación del mirror view para UI centrada en un punto
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
     * 🆕 NUEVO: Restaura la compensación del mirror view aplicada con applyMirrorCompensation
     * @param {boolean} wasApplied - Resultado de applyMirrorCompensation
     */
    restoreMirrorCompensation(wasApplied) {
        if (wasApplied) {
            this.ctx.restore();
        }
    }
    
    /**
     * 🆕 NUEVO: Ejecuta una función de renderizado con compensación automática del mirror view
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
     * 🆕 NUEVO: Aplica compensación del mirror view para elementos globales (tooltips, textos flotantes)
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
    
    clear() {
        // Limpiar el canvas completo (solo la parte visible en pantalla)
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = GAME_CONFIG.CANVAS_BG_COLOR;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    renderBackground() {
        // Renderizar fondo del mundo (debe llamarse dentro del contexto de la cámara)
        const worldWidth = this.game?.worldWidth || this.width;
        const worldHeight = this.game?.worldHeight || this.height;
        
        // Fondo sólido que cubre todo el mundo
        this.ctx.fillStyle = GAME_CONFIG.CANVAS_BG_COLOR;
        this.ctx.fillRect(0, 0, worldWidth, worldHeight);
        
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
                    this.ctx.fillRect(0, 0, worldWidth, worldHeight);
                }
            }
        }
    }
    
    renderGrid() {
        this.ctx.strokeStyle = GAME_CONFIG.GRID_COLOR;
        this.ctx.lineWidth = 1;
        
        // Usar mundo expandido (2x ancho) para el grid
        const worldWidth = this.game?.worldWidth || this.width;
        const worldHeight = this.game?.worldHeight || this.height;
        
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
    
    // ========== MÉTODO UNIFICADO ==========
    renderNode(node, isSelected = false, isHovered = false, game = null) {
        // Permitir renderizar nodos abandonando (necesitan animación de grises)
        if (!node) return;
        if (!node.active && !node.isAbandoning) return;
        
        // Determinar orientación dinámica basada en equipo
        // Los edificios deben mirar hacia el centro del mapa (hacia el enemigo)
        const myTeam = this.game?.myTeam || 'player1';
        
        // Normalizar node.team a 'player1' o 'player2' para comparación
        let nodeTeamNormalized = node.team;
        if (node.team === 'ally') {
            nodeTeamNormalized = 'player1';
        } else if (node.team === 'enemy') {
            nodeTeamNormalized = 'player2';
        }
        // Si node.team ya es 'player1' o 'player2', mantenerlo así
        
        // Comparación estricta para determinar si es mi edificio
        const isMyBuilding = nodeTeamNormalized === myTeam;
        const worldWidth = this.game?.worldWidth || this.width;
        const centerX = worldWidth / 2;
        
        // 🆕 NUEVO: Obtener raza del nodo antes de determinar el volteo
        let nodeRaceId = null;
        if (game && game.playerRaces && node.team) {
            // En multiplayer, node.team puede ser 'player1' o 'player2'
            // Puede ser 'ally' o 'enemy' según el equipo
            let playerKey = node.team;
            if (node.team === 'ally') playerKey = 'player1';
            if (node.team === 'enemy') playerKey = 'player2';
            
            nodeRaceId = game.playerRaces[playerKey];
        }
        
        // Determinar si el sprite necesita volteo adicional por ser enemigo
        // Los sprites de A_Nation enemigos ya vienen volteados (base-enemy-*)
        // Los sprites enemigos necesitan volteo manual porque
        // no tienen versión enemiga volteada en los archivos
        // NOTA: Los frentes también necesitan volteo cuando son de naciones específicas y son enemigos
        const isEnemy = !isMyBuilding;
        const usesRaceSpecificSprite = nodeRaceId && nodeRaceId !== 'A_Nation';
        const needsEnemyFlip = isEnemy && usesRaceSpecificSprite;
        
        // COMPENSAR MIRROR VIEW: Si la vista está mirroreada, invertir la lógica de orientación
        let shouldFlipBuilding = false;
        // Los frentes tienen lógica simple: propios miran derecha, enemigos miran izquierda
        if (node.type === 'front') {
            // 🎯 Lógica simple para frentes:
            // - Frentes propios → miran hacia la derecha (no flip = false)
            // - Frentes enemigos → miran hacia la izquierda (flip = true)
            // 
            // Con mirror view (player2): el mundo está volteado, así que:
            // - Frentes propios → deben voltearse para verse mirando derecha después del volteo global
            // - Frentes enemigos → NO deben voltearse para verse mirando izquierda después del volteo global
            if (this.mirrorViewApplied) {
                // Con mirror view: invertir la lógica
                shouldFlipBuilding = !isEnemy; // Propios se voltean, enemigos no
            } else {
                // Sin mirror view: lógica normal
                shouldFlipBuilding = isEnemy; // Enemigos se voltean, propios no
            }
        } else {
            // 🆕 GENERALIZADO: Edificios que siempre miran hacia el oponente
            if (this.shouldAlwaysFaceOpponent(node)) {
                // Determinar dirección hacia el oponente:
                // - Player1 → debe mirar hacia la derecha (hacia player2) → no flip
                // - Player2 → debe mirar hacia la izquierda (hacia player1) → flip
                const nodeTeam = nodeTeamNormalized || node.team;
                if (nodeTeam === 'player1') {
                    // Player1: mirar hacia la derecha (no flip)
                    shouldFlipBuilding = false;
                } else {
                    // Player2: mirar hacia la izquierda (flip)
                    shouldFlipBuilding = true;
                }
            } else {
                // Otros edificios: lógica basada en posición
                if (isMyBuilding) {
                    // Mi edificio: si está a la izquierda del centro, mirar derecha (no flip)
                    // si está a la derecha del centro, mirar izquierda (flip)
                    shouldFlipBuilding = node.x > centerX;
                } else {
                    // Edificio enemigo: lógica basada en posición
                    // Los edificios enemigos deben mirar hacia el centro (hacia el jugador)
                    shouldFlipBuilding = node.x < centerX;
                    
                    // Si el sprite necesita volteo adicional por ser enemigo (naciones específicas),
                    // aplicar volteo adicional para compensar que estos sprites no tienen versión enemiga volteada
                    if (needsEnemyFlip) {
                        // Los sprites no tienen versión enemiga volteada,
                        // por lo que necesitan volteo adicional para que miren hacia el jugador
                        // Invertir la lógica de posición para estos sprites
                        shouldFlipBuilding = node.x > centerX;
                    }
                }
            }
        }
        
        // Detectar si Mirror View está activo (para compensar el flip)
        // Los frentes ya tienen su lógica de volteo aplicada arriba, no necesitan compensación adicional
        const needsMirrorCompensation = this.mirrorViewApplied && node.type !== 'front';
        
        // COMPENSAR MIRROR VIEW: Solo para edificios (no frentes)
        // Los frentes ya tienen su lógica de volteo aplicada arriba
        if (this.mirrorViewApplied && node.type !== 'front') {
            shouldFlipBuilding = !shouldFlipBuilding;
        }
        
        // Todos los nodos se renderizan igual, la única diferencia es el sprite que usan
        const isCritical = node.isCritical ? node.isCritical() : false;
        const pulseIntensity = isCritical ? Math.sin(Date.now() / 200) * 0.5 + 0.5 : 1;
        
        // Emergencia médica
        const hasEmergency = game && game.medicalSystem && game.medicalSystem.hasEmergency(node.id);
        const emergencyPulse = hasEmergency ? Math.sin(Date.now() / 300) * 0.5 + 0.5 : 1;
        
        // Verificar si el frente está en retirada (sin munición)
        const hasNoAmmo = node.type === 'front' && node.hasEffect && node.hasEffect('no_supplies');
        
        // isMyBuilding ya está definido arriba (línea 142)
        
        // Obtener sprite
        let sprite = null;
        let spriteKey = node.spriteKey;
        
        // Si está en construcción, usar sprite de construcción
        if (node.isConstructing) {
            spriteKey = 'building-construction';
            sprite = this.assetManager.getSprite(spriteKey);
        } else {
            // Intentar usar getBaseSprite para nodos base (tiene lógica de estados)
            // También usar para FOBs que necesitan sprites diferentes según equipo
            if (node.category === 'map_node' || node.type === 'fob') {
                // Pasar 'ally' o 'enemy' según si es mi equipo
                sprite = this.assetManager?.getBaseSprite(node.type, false, false, isCritical, hasNoAmmo, isMyBuilding ? 'ally' : 'enemy', nodeRaceId);
            } else {
                // Para edificios construibles, usar spriteKey directamente
                sprite = this.assetManager.getSprite(spriteKey);
            }
        }
        
        // Solo HQs tienen resplandor - determinar color según si es mi equipo
        const isHQ = node.type === 'hq';
        if (isHQ) {
            // Azul para mi equipo, rojo para enemigo
            this.ctx.shadowColor = isMyBuilding ? '#3498db' : '#e74c3c';
        } else {
            this.ctx.shadowColor = 'transparent';
        }
        this.ctx.shadowBlur = isHQ ? 20 : 0;
        
        // Calcular tamaño del sprite
        let spriteSize = node.radius * 2 * 1.875;
        
        // Reducir tamaño de HQs y FOBs un 15%
        if (node.type === 'hq' || node.type === 'fob') {
            spriteSize *= 0.85;
        }
        
        // Reducir tamaño de los frentes un 15%
        if (node.type === 'front') {
            spriteSize *= 0.85;
        }
        
        // Aplicar multiplicador personalizado (anti-drone, etc)
        if (!node.isConstructing && node.sizeMultiplier) {
            spriteSize *= node.sizeMultiplier;
        }
        
        // 🆕 NUEVO: Mantener relación de aspecto del sprite para evitar estiramientos
        let spriteWidth = spriteSize;
        let spriteHeight = spriteSize;
        if (sprite && sprite.width && sprite.height) {
            const aspectRatio = sprite.width / sprite.height;
            // Si el sprite no es cuadrado, mantener su relación de aspecto
            if (Math.abs(aspectRatio - 1) > 0.1) { // Si la diferencia es > 10%
                if (aspectRatio > 1) {
                    // Sprite más ancho que alto
                    spriteWidth = spriteSize * aspectRatio;
                    spriteHeight = spriteSize;
                } else {
                    // Sprite más alto que ancho
                    spriteWidth = spriteSize;
                    spriteHeight = spriteSize / aspectRatio;
                }
            }
        }
        
        // 🆕 NUEVO: Saltar renderizado del sprite base si es camera drone volando
        // (se renderiza específicamente más abajo en renderCameraDroneFlying)
        const shouldSkipBaseSprite = node.isCameraDrone && node.active && !node.deployed;
        
        // Renderizar sprite
        if (sprite && !shouldSkipBaseSprite) {
            // Aplicar filtro de grises si el FOB está abandonando
            if (node.isAbandoning) {
                this.ctx.save();
                
                // Fase 1: Gris claro (grayscale 50%)
                if (node.abandonPhase === 1) {
                    this.ctx.filter = 'grayscale(50%) brightness(0.9)';
                } 
                // Fase 2: Gris oscuro (grayscale 100% + brightness reducido)
                else if (node.abandonPhase === 2) {
                    this.ctx.filter = 'grayscale(100%) brightness(0.5)';
                }
                
                // Compensar Mirror View si está activo
                if (needsMirrorCompensation) {
                    this.ctx.translate(node.x, node.y);
                    this.ctx.scale(-1, 1); // Compensar el flip global
                    
                    // Aplicar orientación dinámica del edificio o del frente
                    if (shouldFlipBuilding) {
                        this.ctx.scale(-1, 1);
                    }
                    
                    this.ctx.drawImage(sprite, -spriteWidth/2, -spriteHeight/2, spriteWidth, spriteHeight);
                } else if (shouldFlipBuilding) {
                    this.ctx.translate(node.x, node.y);
                    this.ctx.scale(-1, 1);
                    this.ctx.drawImage(sprite, -spriteWidth/2, -spriteHeight/2, spriteWidth, spriteHeight);
                } else {
                    this.ctx.drawImage(sprite, node.x - spriteWidth/2, node.y - spriteHeight/2, spriteWidth, spriteHeight);
                }
                
                this.ctx.filter = 'none'; // Resetear filtro
                this.ctx.restore();
            } 
            // 🆕 NUEVO: Aplicar filtro de grises si el edificio está roto (prioridad sobre disabled)
            else if (node.broken) {
                this.ctx.save();
                // Gris completo para edificios rotos (igual que disabled)
                this.ctx.filter = 'grayscale(100%) brightness(0.6)';
                
                // Compensar Mirror View si está activo
                if (needsMirrorCompensation) {
                    this.ctx.translate(node.x, node.y);
                    this.ctx.scale(-1, 1); // Compensar el flip global
                    
                    // Aplicar orientación dinámica del edificio o del frente
                    if (shouldFlipBuilding) {
                        this.ctx.scale(-1, 1);
                    }
                    
                    this.ctx.drawImage(sprite, -spriteWidth/2, -spriteHeight/2, spriteWidth, spriteHeight);
                } else if (shouldFlipBuilding) {
                    this.ctx.translate(node.x, node.y);
                    this.ctx.scale(-1, 1);
                    this.ctx.drawImage(sprite, -spriteWidth/2, -spriteHeight/2, spriteWidth, spriteHeight);
                } else {
                    this.ctx.drawImage(sprite, node.x - spriteWidth/2, node.y - spriteHeight/2, spriteWidth, spriteHeight);
                }
                
                this.ctx.filter = 'none'; // Resetear filtro
                this.ctx.restore();
                
                // 🆕 NUEVO: Renderizar overlay "repairable.png" sobre el edificio roto
                const repairableOverlay = this.assetManager.getSprite('repairable');
                if (repairableOverlay) {
                    // Usar el mismo tamaño que el sprite del edificio
                    const overlayWidth = spriteWidth;
                    const overlayHeight = spriteHeight;
                    
                    if (needsMirrorCompensation) {
                        this.ctx.save();
                        this.ctx.translate(node.x, node.y);
                        this.ctx.scale(-1, 1);
                        if (shouldFlipBuilding) {
                            this.ctx.scale(-1, 1);
                        }
                        this.ctx.drawImage(repairableOverlay, -overlayWidth/2, -overlayHeight/2, overlayWidth, overlayHeight);
                        this.ctx.restore();
                    } else if (shouldFlipBuilding) {
                        this.ctx.save();
                        this.ctx.translate(node.x, node.y);
                        this.ctx.scale(-1, 1);
                        this.ctx.drawImage(repairableOverlay, -overlayWidth/2, -overlayHeight/2, overlayWidth, overlayHeight);
                        this.ctx.restore();
                    } else {
                        this.ctx.drawImage(repairableOverlay, node.x - overlayWidth/2, node.y - overlayHeight/2, overlayWidth, overlayHeight);
                    }
                }
            }
            // 🆕 NUEVO: Aplicar filtro de grises si el edificio está deshabilitado (pero no roto)
            else if (node.disabled) {
                this.ctx.save();
                // Gris completo para edificios deshabilitados
                this.ctx.filter = 'grayscale(100%) brightness(0.6)';
                
                // Compensar Mirror View si está activo
                if (needsMirrorCompensation) {
                    this.ctx.translate(node.x, node.y);
                    this.ctx.scale(-1, 1); // Compensar el flip global
                    
                    // Aplicar orientación dinámica del edificio o del frente
                    if (shouldFlipBuilding) {
                        this.ctx.scale(-1, 1);
                    }
                    
                    this.ctx.drawImage(sprite, -spriteWidth/2, -spriteHeight/2, spriteWidth, spriteHeight);
                } else if (shouldFlipBuilding) {
                    this.ctx.translate(node.x, node.y);
                    this.ctx.scale(-1, 1);
                    this.ctx.drawImage(sprite, -spriteWidth/2, -spriteHeight/2, spriteWidth, spriteHeight);
                } else {
                    this.ctx.drawImage(sprite, node.x - spriteWidth/2, node.y - spriteHeight/2, spriteWidth, spriteHeight);
                }
                
                this.ctx.filter = 'none'; // Resetear filtro
                this.ctx.restore();
            } 
            else {
                // Renderizado normal sin filtro
                this.ctx.save();
                
                // Compensar Mirror View si está activo
                if (needsMirrorCompensation) {
                    this.ctx.translate(node.x, node.y);
                    this.ctx.scale(-1, 1); // Compensar el flip global
                    
                    // Aplicar orientación dinámica del edificio o del frente
                    if (shouldFlipBuilding) {
                        this.ctx.scale(-1, 1);
                    }
                    
                    this.ctx.drawImage(sprite, -spriteWidth/2, -spriteHeight/2, spriteWidth, spriteHeight);
                } else if (shouldFlipBuilding) {
                    this.ctx.translate(node.x, node.y);
                    this.ctx.scale(-1, 1);
                    this.ctx.drawImage(sprite, -spriteWidth/2, -spriteHeight/2, spriteWidth, spriteHeight);
                } else {
                    this.ctx.drawImage(sprite, node.x - spriteWidth/2, node.y - spriteHeight/2, spriteWidth, spriteHeight);
                }
                
                this.ctx.restore();
            }
            
            this.ctx.shadowBlur = 0;
            
            // Aro de selección/hover (saltar si es camera drone volando)
            if (!shouldSkipBaseSprite && (isSelected || isHovered)) {
                this.ctx.strokeStyle = isSelected ? '#f39c12' : '#fff';
                this.ctx.lineWidth = isSelected ? 4 : 3;
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, node.radius * 1.6, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        } else if (!shouldSkipBaseSprite) {
            // Fallback si no hay sprite (solo si no es camera drone volando)
            console.warn(`⚠️ Sprite no encontrado:`, spriteKey, 'para nodo', node.type);
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = '#555';
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Barra de construcción
        if (node.isConstructing && node.getConstructionProgress) {
            const progress = node.getConstructionProgress();
            const barWidth = Math.max(spriteWidth, spriteHeight) * 0.8;
            const barHeight = 8;
            const barX = node.x - barWidth / 2;
            const barY = node.y + Math.max(spriteWidth, spriteHeight) / 2 + 10;
            
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(barX, barY, barWidth, barHeight);
            this.ctx.fillStyle = '#2ecc71';
            this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
        
        // DEBUG: Renderizar hitboxes y áreas de detección (solo si está activo el modo debug visual)
        if (game && game.debugVisualMode) {
            this.renderDebugInfo(node);
        }
        
        // Renderizar UI específica del nodo
        this.renderNodeUI(node, game, spriteSize, isSelected);
    }
    
    /**
     * DEBUG: Renderiza información de debug (hitbox verde y área de detección naranja)
     */
    renderDebugInfo(node) {
        // Solo renderizar para edificios construibles y FOBs
        if (!node.active) return;
        
        const config = getNodeConfig(node.type);
        if (!config) return;
        
        // Renderizar hitbox (verde) - radio base
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)'; // Verde
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([]);
        this.ctx.beginPath();
        const hitboxRadius = node.hitboxRadius || node.radius;
        this.ctx.arc(node.x, node.y, hitboxRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Renderizar área de detección (naranja) - solo si tiene detectionRadius
        if (config.detectionRadius) {
            this.ctx.strokeStyle = 'rgba(255, 165, 0, 0.6)'; // Naranja
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([8, 8]);
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, config.detectionRadius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }
    
    // ========== COMPATIBILIDAD ==========
    renderBase(base, isSelected = false, isHovered = false, game = null) {
        this.renderNode(base, isSelected, isHovered, game);
    }
    
    renderBuilding(building) {
        this.renderNode(building, false, false, this.game);
    }
    
    // ========== UI ESPECÍFICA DE CADA NODO ==========
    renderNodeUI(node, game, spriteSize, isSelected) {
        // Icono de emergencia médica
        const isFront = node.type === 'front';
        const hasEmergency = game && game.medicalSystem && game.medicalSystem.hasEmergency(node.id);
        
        if (hasEmergency && isFront) {
            const emergencyPulse = Math.sin(Date.now() / 300) * 0.5 + 0.5;
            const progress = game.medicalSystem.getEmergencyProgress(node.id);
            
            const iconX = node.x + node.radius + 15;
            const iconY = node.y - node.radius;
            const spriteSize = 28;
            
            // Anillo circular de progreso alrededor del icono (usando función genérica)
            const ringRadius = spriteSize / 2 + 4; // 4px de padding alrededor del sprite
            this.renderProgressRing(iconX, iconY, ringRadius, 1 - progress, {
                width: 3,
                colorStart: { r: 255, g: 255, b: 0 }, // Amarillo
                colorEnd: { r: 255, g: 0, b: 0 },    // Rojo
                reverse: true, // El progreso va en sentido contrario (se llena hacia atrás)
                backgroundAlpha: 0.5
            });
            
            // Renderizar sprite de emergencia médica encima del anillo
            const emergencySprite = this.assetManager?.getSprite('ui-emergency-medic');
            if (emergencySprite) {
                this.ctx.save();
                this.ctx.globalAlpha = emergencyPulse;
                this.ctx.drawImage(
                    emergencySprite,
                    iconX - spriteSize / 2,
                    iconY - spriteSize / 2,
                    spriteSize,
                    spriteSize
                );
                this.ctx.restore();
            }
        }
        
        // Selector de recursos del HQ
        if ((isSelected || node === game?.hoveredNode) && node.type === 'hq') {
            this.renderResourceSelector(node);
        }
        
        // 🆕 NUEVO: Anillo de duración del comando
        if (node.isCommando && node.active) {
            this.renderCommandoDurationRing(node, game);
        }
        
        // 🆕 NUEVO: Anillo de duración del truck assault
        if (node.isTruckAssault && node.active) {
            this.renderTruckAssaultDurationRing(node, game);
        }
        
        // 🆕 NUEVO: Renderizar camera drone volando o desplegado
        if (node.isCameraDrone && node.active) {
            if (!node.deployed) {
                // Camera drone volando - renderizar como dron
                this.renderCameraDroneFlying(node);
            } else {
                // Camera drone desplegado - renderizar área de detección si está seleccionado
                if (isSelected || node === game?.hoveredNode) {
                    this.renderCameraDroneDetectionArea(node);
                }
            }
        }
        
        // 🆕 NUEVO: Anillo de progreso de inversión de intelRadio
        if (node.type === 'intelRadio' && node.investmentStarted && !node.investmentCompleted) {
            this.renderIntelRadioInvestmentRing(node, game);
        }
        
        // 🆕 NUEVO: Anillo de efecto residual del comando eliminado
        // La función renderCommandoResidualRing ya verifica correctamente el efecto activo
        if (node.effects && node.effects.some(e => e.type === 'commandoResidual')) {
            this.renderCommandoResidualRing(node, game);
        }
        
        // Efectos (debuffs/buffs)
        if (node.effects && node.effects.length > 0) {
            this.renderEffects(node);
        }
        
        // Barra de suministros (sin contadores de vehículos, esos se renderizan en renderVehicleUI)
        if (node.type === 'hq') {
            // HQ no muestra barra de suministros, solo vehículos (que se renderizan en renderVehicleUI)
            // No renderizar nada aquí
        } else if (node.type === 'campaignHospital' && node.constructed && !node.isConstructing) {
            // Hospital de campaña: solo vehículos (que se renderizan en renderVehicleUI)
            // No renderizar nada aquí
        } else if (node.hasSupplies !== false || node.hasVehicles) {
            // Resto de nodos: barra de suministros (sin contadores de vehículos)
            this.renderSupplyBar(node);
        }
    }
    
    // ========== CONTADOR DE VEHÍCULOS DEL HQ ==========
    renderHQVehicles(node) {
        if (!this.game) return;
        
        // 🆕 NUEVO: Compensar Mirror View usando método unificado
        const wasCompensated = this.applyMirrorCompensation(node.x, node.y);
        
        const barWidth = node.radius * 2;
        const barHeight = 9;
        const barX = node.x - barWidth / 2;
        const barY = node.y + node.radius + 20;
        
        // Calcular offset de shake si está activo
        let shakeX = 0;
        let shakeY = 0;
        if (node.noVehiclesShake) {
            const shakeIntensity = 3;
            const shakeSpeed = 30;
            shakeX = Math.sin(node.noVehiclesShakeTime * shakeSpeed) * shakeIntensity;
            shakeY = Math.cos(node.noVehiclesShakeTime * shakeSpeed * 1.5) * shakeIntensity;
        }
        
        // 🆕 NUEVO: Obtener tipo de vehículo seleccionado dinámicamente
        const selectedTypeId = node.selectedResourceType || 'ammo'; // Fallback a 'ammo' si no hay selección
        const vehicleType = this.game.getVehicleTypeConfig(selectedTypeId);
        
        if (!vehicleType) return; // No hay tipo configurado, no renderizar
        
        // 🆕 NUEVO: Obtener contadores dinámicamente usando métodos helper
        const availableCount = this.game.getAvailableVehicleCount(node, selectedTypeId);
        const maxCount = this.game.getMaxVehicleCount(node, selectedTypeId);
        const vehicleText = `${availableCount}/${maxCount}`;
        
        // 🆕 NUEVO: Renderizar icono dinámicamente
        const iconSprite = this.assetManager.getSprite(vehicleType.icon);
        const iconSize = 45;
        const iconX = node.x + shakeX - 45;
        const iconY = barY + 26 + shakeY - iconSize / 2 - 3;
        
        if (iconSprite) {
            this.ctx.drawImage(iconSprite, iconX, iconY, iconSize, iconSize);
        }
        
        // Renderizar texto del contador
        this.ctx.fillStyle = node.noVehiclesShake && availableCount === 0 ? '#e74c3c' : '#fff';
        this.ctx.font = 'bold 21px monospace';
        this.ctx.textAlign = 'center';
        
        const textX = node.x + shakeX + 15;
        
        // Contorno negro para mejor legibilidad
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeText(vehicleText, textX, barY + 26 + shakeY);
        this.ctx.fillText(vehicleText, textX, barY + 26 + shakeY);
        
        // 🆕 NUEVO: Restaurar Mirror View usando método unificado
        this.restoreMirrorCompensation(wasCompensated);
    }
    
    // ========== UI DEL HOSPITAL DE CAMPAÑA ==========
    renderHospitalUI(node, spriteSize, isSelected) {
        // Contador de vehículos médicos
        const vehicleIconSprite = this.assetManager.getSprite('ui-medic-vehicle-icon');
        const iconSize = 30;
        const iconX = node.x - iconSize - 10;
        const iconY = node.y + spriteSize / 2 - 10;
        
        if (vehicleIconSprite) {
            this.ctx.drawImage(vehicleIconSprite, iconX, iconY, iconSize, iconSize);
        }
        
        // Texto del contador
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 3;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        
        const counterText = `${node.availableVehicles}/${node.maxVehicles}`;
        const textX = iconX + iconSize + 5;
        const textY = iconY + iconSize / 2;
        
        this.ctx.strokeText(counterText, textX, textY);
        this.ctx.fillText(counterText, textX, textY);
        
        // Círculo de rango (solo si está seleccionado)
        if (this.game && this.game.selectedNode === node) {
            this.ctx.strokeStyle = 'rgba(0, 255, 100, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([10, 5]);
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.actionRange, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }
    
    // ========== RENDERIZADO TIPO BASE ==========
    renderBaseTypeNode(base, isSelected = false, isHovered = false, game = null) {
        const isCritical = base.isCritical();
        const pulseIntensity = isCritical ? Math.sin(Date.now() / 200) * 0.5 + 0.5 : 1;
        
        // Emergencia médica
        const hasEmergency = game && game.medicalSystem && game.medicalSystem.hasEmergency(base.id);
        const emergencyPulse = hasEmergency ? Math.sin(Date.now() / 300) * 0.5 + 0.5 : 1;
        
        // Verificar si el frente está en retirada (sin munición)
        const hasNoAmmo = base.type === 'front' && base.hasEffect && base.hasEffect('no_supplies');
        
        // 🆕 NUEVO: Obtener raza del nodo
        let nodeRaceId = null;
        if (game && game.playerRaces && base.team) {
            let playerKey = base.team;
            if (base.team === 'ally') playerKey = 'player1';
            if (base.team === 'enemy') playerKey = 'player2';
            
            nodeRaceId = game.playerRaces[playerKey];
        }
        
        // Normalizar base.team a 'ally' o 'enemy' para getBaseSprite
        const myTeam = this.game?.myTeam || game?.myTeam || 'player1';
        let nodeTeamNormalized = base.team;
        if (base.team === 'ally') {
            nodeTeamNormalized = 'player1';
        } else if (base.team === 'enemy') {
            nodeTeamNormalized = 'player2';
        }
        // Determinar si es mi edificio para pasar 'ally' o 'enemy' a getBaseSprite
        const isMyBuilding = nodeTeamNormalized === myTeam;
        const teamForSprite = isMyBuilding ? 'ally' : 'enemy';
        
        // Intentar usar sprite si está disponible (SIEMPRE usar sprite normal, no placeholder)
        const sprite = this.assetManager?.getBaseSprite(base.type, false, false, isCritical, hasNoAmmo, teamForSprite, nodeRaceId);
        
        if (sprite) {
            // RENDERIZADO CON SPRITE
            // Solo HQs tienen resplandor azul (sin glow en otros nodos)
            const isHQ = base.type === 'hq';
            this.ctx.shadowColor = isHQ ? base.shadowColor : 'transparent';
            this.ctx.shadowBlur = isHQ ? 20 : 0;
            
            // Calcular tamaño del sprite (mantener proporción, usar radius como referencia)
            // +50% inicial + 25% adicional = 1.5 * 1.25 = 1.875
            let spriteSize = base.radius * 2 * 1.875;
            
            // Reducir tamaño de HQs y FOBs un 15%
            if (base.type === 'hq' || base.type === 'fob') {
                spriteSize *= 0.85; // -15%
            }
            
            // Reducir tamaño de los frentes un 15%
            if (base.type === 'front') {
                spriteSize *= 0.85; // -15%
            }
            
            this.ctx.drawImage(
                sprite,
                base.x - spriteSize / 2,
                base.y - spriteSize / 2,
                spriteSize,
                spriteSize
            );
            
            this.ctx.shadowBlur = 0;
            
            // Aro de selección/hover
            if (isSelected || isHovered) {
                this.ctx.strokeStyle = isSelected ? '#f39c12' : '#fff';
                this.ctx.lineWidth = isSelected ? 4 : 3;
                this.ctx.beginPath();
                this.ctx.arc(base.x, base.y, base.radius * 1.6, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        } else {
            // FALLBACK: RENDERIZADO PLACEHOLDER (código original)
            // Sombra: Solo HQs tienen resplandor azul, el resto solo cuando están críticos (rojo)
            const isHQ = base.type === 'hq';
            this.ctx.shadowColor = isCritical ? '#ff0000' : (isHQ ? base.shadowColor : 'transparent');
            this.ctx.shadowBlur = isCritical ? 30 * pulseIntensity : (isHQ ? 20 : 0);
            
            // Base
            this.ctx.fillStyle = base.color;
            this.ctx.beginPath();
            this.ctx.arc(base.x, base.y, base.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Borde
            this.ctx.strokeStyle = isCritical ? `rgba(255, 0, 0, ${pulseIntensity})` :
                                  isSelected ? '#f39c12' : 
                                  isHovered ? '#fff' : '#555';
            this.ctx.lineWidth = isCritical ? 4 : isSelected ? 4 : 2;
            this.ctx.stroke();
            
            this.ctx.shadowBlur = 0;
            
            // Icono (+20% size)
            this.ctx.fillStyle = '#fff';
            this.ctx.font = base.type === 'hq' ? '44px Arial' : '33px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(base.icon, base.x, base.y);
        }
        
        // Labels quitados (solo mostrar alerta si está crítico)
        if (isCritical) {
            this.ctx.fillStyle = '#ff0000';
        this.ctx.font = 'bold 12px Arial';
            this.ctx.fillText('⚠️', base.x, base.y - base.radius - 12);
        }
        
        // Icono de emergencia médica
        if (hasEmergency && base.type === 'front') {
            const progress = game.medicalSystem.getEmergencyProgress(base.id);
            
            const iconX = base.x + base.radius + 15;
            const iconY = base.y - base.radius;
            const spriteSize = 28;
            
            // Anillo circular de progreso alrededor del icono (usando función genérica)
            const ringRadius = spriteSize / 2 + 4; // 4px de padding alrededor del sprite
            this.renderProgressRing(iconX, iconY, ringRadius, 1 - progress, {
                width: 3,
                colorStart: { r: 255, g: 255, b: 0 }, // Amarillo
                colorEnd: { r: 255, g: 0, b: 0 },    // Rojo
                reverse: true, // El progreso va en sentido contrario (se llena hacia atrás)
                backgroundAlpha: 0.5
            });
            
            // Renderizar sprite de emergencia médica encima del anillo
            const emergencySprite = this.assetManager?.getSprite('ui-emergency-medic');
            if (emergencySprite) {
                this.ctx.save();
                this.ctx.globalAlpha = emergencyPulse;
                this.ctx.drawImage(
                    emergencySprite,
                    iconX - spriteSize / 2,
                    iconY - spriteSize / 2,
                    spriteSize,
                    spriteSize
                );
                this.ctx.restore();
            }
        }
        
        // Selector de tipo de recurso en HQ (si está en hover/seleccionado)
        if ((isHovered || isSelected) && base.type === 'hq') {
            this.renderResourceSelector(base);
        }
        
        // Renderizar efectos (debuffs/buffs) en cuadrícula 3x3
        if (base.effects && base.effects.length > 0) {
            this.renderEffects(base);
        }
        
        // Barra de suministros - SIEMPRE SE MUESTRA
        this.renderSupplyBar(base);
    }
    
    renderResourceSelector(base) {
        if (!this.game) return;
        
        // 🆕 NUEVO: Obtener tipos de vehículos habilitados desde la configuración del servidor
        const enabledTypes = this.game.getEnabledVehicleTypes(base.type);
        if (enabledTypes.length === 0) return; // No hay tipos habilitados, no renderizar
        
        // 🆕 NUEVO: Compensar mirror view para que la UI se vea correctamente orientada
        const wasCompensated = this.applyMirrorCompensation(base.x, base.y);
        
        try {
            const buttonSize = 40; // +15% más grande (35 * 1.15 = 40.25 ≈ 40)
            const buttonRadius = buttonSize / 2;
            
            // Color verde militar
            const militaryGreen = '#4a5d23';
            const militaryGreenSolid = '#4a5d23'; // 100% opaco
            
            // 🆕 NUEVO: Calcular posición de los botones en un arco alrededor del HQ
            // El arco comienza desde arriba-izquierda y se distribuye uniformemente
            const ringRadius = base.radius * 1.6; // Radio del anillo de selección
            const buttonDistance = ringRadius + 35; // Distancia del centro del HQ al centro de los botones
            
            // Ángulo inicial: comenzar desde arriba-izquierda (aproximadamente -135 grados desde arriba)
            // Distribuir los botones en un arco que va de arriba-izquierda a arriba-derecha
            const startAngle = -Math.PI * 0.75; // -135 grados (arriba-izquierda)
            const endAngle = -Math.PI * 0.25; // -45 grados (arriba-derecha)
            const angleSpan = endAngle - startAngle; // Rango total del arco
            
            // 🆕 NUEVO: Calcular espaciado dinámicamente según el número de botones
            // Si hay 1 botón, se centra en el medio del arco
            // Si hay más, se distribuyen uniformemente
            const angleStep = enabledTypes.length > 1 ? angleSpan / (enabledTypes.length - 1) : 0;
            const centerAngle = enabledTypes.length === 1 ? (startAngle + endAngle) / 2 : null;
            
            enabledTypes.forEach((vehicleTypeId, index) => {
                const vehicleType = this.game.getVehicleTypeConfig(vehicleTypeId);
                if (!vehicleType) return;
                
                // Calcular ángulo para este botón
                // Si solo hay 1 botón, centrarlo en el medio del arco
                // Si hay más, distribuirlos uniformemente
                const angle = centerAngle !== null ? centerAngle : (startAngle + (angleStep * index));
                
                // Calcular posición en el círculo
                const centerX = base.x + Math.cos(angle) * buttonDistance;
                const centerY = base.y + Math.sin(angle) * buttonDistance;
                
                const isSelected = base.selectedResourceType === vehicleTypeId;
                const isAvailable = this.game.isVehicleAvailable(base, vehicleTypeId);
                
                // Color más apagado si no está disponible
                const bgColor = !isAvailable ? 'rgba(100, 100, 100, 0.5)' : 
                               isSelected ? militaryGreenSolid : 'rgba(0, 0, 0, 0.7)';
                const borderColor = !isAvailable ? 'rgba(150, 150, 150, 0.5)' :
                                   isSelected ? militaryGreen : 'rgba(74, 93, 35, 0.5)';
                
                // Renderizar botón (REDONDO)
                this.ctx.fillStyle = bgColor;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, buttonRadius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.strokeStyle = borderColor;
                this.ctx.lineWidth = isSelected ? 3 : 2;
                this.ctx.stroke();
                
                // Renderizar icono del tipo de vehículo
                const icon = this.assetManager.getSprite(vehicleType.icon);
                if (icon) {
                    const iconSize = 34; // Tamaño del icono +20% (28 * 1.2 = 33.6 ≈ 34)
                    // Aplicar opacidad si no está disponible
                    if (!isAvailable) {
                        this.ctx.globalAlpha = 0.4;
                    }
                    this.ctx.drawImage(icon, 
                        centerX - iconSize/2, centerY - iconSize/2, 
                        iconSize, iconSize);
                    if (!isAvailable) {
                        this.ctx.globalAlpha = 1.0; // Restaurar opacidad
                    }
                } else {
                    // Fallback a emoji si no hay sprite
                    this.ctx.font = '25px Arial';
                    this.ctx.fillStyle = isAvailable ? '#fff' : '#999';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    // 🆕 NUEVO: Emoji por defecto según el tipo (genérico para cualquier tipo)
                    // Mapeo de tipos conocidos a emojis
                    const emojiMap = {
                        'medical': '🚑',
                        'helicopter': '🚁',
                        'repair': '🔧',
                        'ammo': '🚛'
                    };
                    const emoji = emojiMap[vehicleTypeId] || '🚚'; // Fallback genérico si no hay mapeo
                    this.ctx.fillText(emoji, centerX, centerY);
                }
            });
            
            // 🆕 NUEVO: Texto indicador del modo seleccionado (arriba del HQ, encima de los botones)
            const selectedType = this.game.getVehicleTypeConfig(base.selectedResourceType);
            const modeText = selectedType ? selectedType.name.toUpperCase() : 'SELECCIONAR';
            const modeColor = '#4a5d23'; // Verde militar
            
            // Posición del texto arriba del HQ (encima de los botones en el arco)
            // Calcular la posición más alta de los botones para colocar el texto arriba
            const topButtonY = base.y + Math.sin(startAngle) * buttonDistance; // Y del primer botón (más arriba)
            const textY = topButtonY - 70; // 50px arriba del botón más alto para no tapar los botones
            
            // Fondo para el texto
            this.ctx.font = 'bold 17px Arial'; // +20% (14 * 1.2 = 16.8 ≈ 17)
            const textMetrics = this.ctx.measureText(modeText);
            const textWidth = textMetrics.width;
            const textHeight = 19; // +20% (16 * 1.2 = 19.2 ≈ 19)
            const textX = base.x - textWidth / 2;
            
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(textX - 4, textY - textHeight / 2, textWidth + 8, textHeight);
            
            this.ctx.strokeStyle = modeColor;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(textX - 4, textY - textHeight / 2, textWidth + 8, textHeight);
            
            this.ctx.fillStyle = modeColor;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(modeText, base.x, textY);
        } finally {
            this.restoreMirrorCompensation(wasCompensated);
        }
    }
    
    renderSupplyBar(base) {
        // 🆕 NUEVO: Ancho de barra específico para base aérea (más pequeño)
        let barWidth;
        if (base.type === 'aerialBase' || base.isAerialBase) {
            barWidth = 50; // Ancho fijo más pequeño para base aérea
        } else {
            barWidth = base.radius * 2;
        }
        
        const barHeight = 9;  // +50%
        const barX = base.x - barWidth / 2;
        const barY = base.y + base.radius + 20;  // Bajado 25% más (16 * 1.25 = 20)
        
        // HQ ALIADO no muestra barra de recursos
        // Los vehículos se renderizan en renderVehicleUI() para evitar duplicación
        if (base.type === 'hq' && !base.type.startsWith('enemy_')) {
            return;
        }
        
        // Calcular offset de shake si está activo
        let shakeX = 0;
        let shakeY = 0;
        if (base.noVehiclesShake) {
            const shakeIntensity = 3;
            const shakeSpeed = 30;
            shakeX = Math.sin(base.noVehiclesShakeTime * shakeSpeed) * shakeIntensity;
            shakeY = Math.cos(base.noVehiclesShakeTime * shakeSpeed * 1.5) * shakeIntensity;
        }
        
        // 🆕 NUEVO: Compensar Mirror View usando método unificado
        const wasCompensated = this.applyMirrorCompensation(base.x, base.y);
        
        // Icono de recursos (para FOB y Frentes)
        const resourceIcon = this.assetManager?.getSprite('ui-supplies');
        if (resourceIcon) {
            // Usar sprite de recurso
            const iconSize = 29; // +20% (24 * 1.2 = 28.8)
            this.ctx.drawImage(
                resourceIcon,
                barX - iconSize - 4,
                barY - 4,  // Ajustado verticalmente para centrar mejor
                iconSize,
                iconSize
            );
        } else {
            // Fallback: emoji
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '14px monospace';
            this.ctx.textAlign = 'right';
            this.ctx.fillText('📦', barX - 6, barY + barHeight);
        }
        
        // Barra de recursos
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        
        const fillWidth = (base.supplies / base.maxSupplies) * barWidth;
        this.ctx.fillStyle = base.supplies < 20 ? '#e74c3c' : '#4ecca3';
        this.ctx.fillRect(barX, barY, fillWidth, barHeight);
        
        // Los contadores de vehículos se renderizan en renderVehicleUI() para evitar duplicación
        
        // 🆕 NUEVO: Restaurar Mirror View usando método unificado
        this.restoreMirrorCompensation(wasCompensated);
    }
    
    renderEffects(base) {
        // Configuración de la cuadrícula 3x3
        const iconSize = 36;  // +15% adicional (31 * 1.15 = 35.65)
        const spacing = 6;  // Aumentado proporcionalmente
        const iconsPerRow = 3;
        
        // Posicionar arriba del nodo (más alto para no tapar el sprite)
        const startY = base.y - base.radius - 60;
        const totalWidth = (iconSize + spacing) * iconsPerRow - spacing;
        const startX = base.x - totalWidth / 2;
        
        // Renderizar cada efecto
        base.effects.forEach((effect, index) => {
            const row = Math.floor(index / iconsPerRow);
            const col = index % iconsPerRow;
            
            const x = startX + col * (iconSize + spacing);
            const y = startY + row * (iconSize + spacing);
            
            // Obtener sprite del efecto
            const sprite = this.assetManager?.getSprite(effect.icon);
            
            if (sprite) {
                // Fondo oscuro semi-transparente
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(x, y, iconSize, iconSize);
                
                // Borde
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(x, y, iconSize, iconSize);
                
                // Renderizar sprite
                this.ctx.drawImage(sprite, x, y, iconSize, iconSize);
            }
        });
    }
    
    renderEffectTooltip(hoveredEffect) {
        const padding = 8;
        const fontSize = 14;
        const offsetX = 15;
        const offsetY = -10;
        
        this.ctx.save();
        
        // 🆕 NUEVO: Compensar Mirror View usando método unificado para elementos globales
        const wasCompensated = this.applyGlobalMirrorCompensation();
        
        this.ctx.font = `${fontSize}px Arial`;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        
        // Medir texto
        const textWidth = this.ctx.measureText(hoveredEffect.tooltip).width;
        const boxWidth = textWidth + padding * 2;
        const boxHeight = fontSize + padding * 2;
        
        // Posicionar (debajo y a la derecha del cursor)
        let x = hoveredEffect.x + offsetX;
        let y = hoveredEffect.y + offsetY;
        
        // Ajustar si se sale de la pantalla
        if (x + boxWidth > this.width) x = hoveredEffect.x - boxWidth - offsetX;
        if (y + boxHeight > this.height) y = hoveredEffect.y - boxHeight + offsetY;
        
        // Fondo
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(x, y, boxWidth, boxHeight);
        
        // Borde
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, boxWidth, boxHeight);
        
        // Texto
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(hoveredEffect.tooltip, x + padding, y + padding);
        
        this.ctx.restore();
    }
    
    /**
     * Renderiza tooltip de hover prolongado (en coordenadas de pantalla) y, si procede,
     * los rangos asociados en coordenadas de mundo alrededor del objetivo.
     */
    renderHoverTooltip(hover) {
        if (!hover) return;
        const padding = 8;
        const titleSize = 14;
        const textSize = 12;
        const offsetX = 14;
        const offsetY = -14;
        
        // Medidas
        this.ctx.font = `bold ${titleSize}px Arial`;
        const titleWidth = this.ctx.measureText(hover.name).width;
        this.ctx.font = `${textSize}px Arial`;
        const descWidth = this.ctx.measureText(hover.description).width;
        const boxWidth = Math.max(titleWidth, descWidth) + padding * 2;
        const boxHeight = titleSize + 6 + textSize + padding * 2;
        
        // Posición cerca del cursor (coordenadas de pantalla)
        let x = hover.x + offsetX;
        let y = hover.y + offsetY;
        if (x + boxWidth > this.width) x = hover.x - boxWidth - offsetX;
        if (y + boxHeight > this.height) y = hover.y - boxHeight + offsetY;
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        
        // Fondo y borde
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(x, y, boxWidth, boxHeight);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, boxWidth, boxHeight);
        
        // Texto
        this.ctx.fillStyle = '#fff';
        this.ctx.font = `bold ${titleSize}px Arial`;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(hover.name, x + padding, y + padding + titleSize/2);
        this.ctx.font = `${textSize}px Arial`;
        this.ctx.fillText(hover.description, x + padding, y + padding + titleSize + 6 + textSize/2);
        
        // Dibujar rangos en coordenadas de mundo (aplicar cámara temporalmente)
        if (hover.ranges && hover.ranges.length > 0 && this.game) {
            this.game.camera.applyToContext(this.ctx);
            hover.ranges.forEach(r => {
                this.ctx.strokeStyle = r.color || 'rgba(255,255,255,0.5)';
                this.ctx.lineWidth = 2;
                if (r.dash) this.ctx.setLineDash(r.dash); else this.ctx.setLineDash([10, 5]);
                this.ctx.beginPath();
                this.ctx.arc(hover.anchorX, hover.anchorY, r.radius, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            });
            this.game.camera.restoreContext(this.ctx);
        }
    }
    
    renderFloatingText(text) {
        // DEPRECATED - Usar renderFloatingTextsBatch() en su lugar
        if (text.alpha < 0.01) return;
        
        this.ctx.save();
        this.ctx.globalAlpha = text.alpha;
        this.ctx.fillStyle = text.color;
        this.ctx.fillText(text.text, text.x, text.y);
        this.ctx.restore();
    }
    
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
            const fontSize = isDisabledText ? 'bold 18px Arial' : 'bold 16px Arial';
            this.ctx.font = fontSize;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            this.ctx.fillStyle = color;
            
            for (const text of colorTexts) {
                this.ctx.globalAlpha = text.alpha;
                
                // 🆕 Compensar Mirror View para textos "Disabled" (no deben verse volteados)
                if (isDisabledText && this.mirrorViewApplied) {
                    this.ctx.save();
                    // 🆕 NUEVO: Compensar el mirror view usando método unificado para elementos globales
                    this.applyGlobalMirrorCompensation();
                    
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
     * 🗑️ ELIMINADO: renderCargoCapacityBar (obsoleto)
     * La barra de cargo para helicópteros ahora se renderiza en renderHelicopter()
     * Los helicópteros ya no son convoys, sino entidades persistentes
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
    
    renderConvoy(convoy) {
        // 🆕 SKIP: Los helicópteros ya no se renderizan como convoys
        // Ahora son entidades persistentes renderizadas en renderHelicopter()
        if (convoy.vehicleType === 'helicopter') {
            return;
        }
        
        // Si está volviendo, renderizar en blanco y negro semi-transparente
        const isReturning = convoy.returning;
        const vehicleColor = isReturning ? '#888' : (convoy.vehicle?.color || '#4CAF50'); // Fallback a verde si no hay color
        const opacity = isReturning ? 0.8 : 1; // 80% opacidad para convoyes que regresan (más visible)
        
        // Detectar si es un convoy enemigo (origen es nodo enemigo)
        const myTeam = this.game?.myTeam || 'ally';
        const isEnemy = convoy.originBase && convoy.originBase.team !== myTeam;
        
        this.ctx.globalAlpha = opacity;
        
        // Usar sprites para todos los vehículos (incluida ambulancia y camión de reparación)
        let vehicleSpriteKey;
        if (convoy.isMedical) {
            vehicleSpriteKey = 'ambulance';
        } else if (convoy.vehicleType === 'repair' || convoy.vehicleType === 'repair_truck' || convoy.isRepair) {
            vehicleSpriteKey = 'repair_truck';
        } else {
            vehicleSpriteKey = convoy.vehicleType;
        }
        // No usar sprites "returning"; aplicamos estilos dinámicamente
        const sprite = this.assetManager?.getVehicleSprite(vehicleSpriteKey, false);
        const angle = convoy.getAngle();
        
        if (sprite) {
            // RENDERIZADO CON SPRITE
            // Sin glowing effect para camiones normales, solo ambulancias
            this.ctx.shadowColor = convoy.isMedical ? '#ff3333' : 'transparent';
            this.ctx.shadowBlur = convoy.isMedical ? 30 : 0;
            
            this.ctx.save();
            this.ctx.translate(convoy.x, convoy.y);
            
            // Determinar dirección basada en movimiento hacia el objetivo
            let shouldFlip = false;
            
            // Obtener nodo destino según estado (yendo o regresando)
            const destinationNode = convoy.returning ? convoy.fromBase : convoy.toBase;
            
            if (destinationNode) {
                const dx = destinationNode.x - convoy.x;
                
                // LÓGICA SIMPLIFICADA: Siempre usar la misma lógica independientemente del modo
                // Si va hacia la izquierda (dx < 0), flip
                // Si va hacia la derecha (dx > 0), no flip
                shouldFlip = dx < 0;
            } else {
                // Fallback: lógica antigua para compatibilidad
                shouldFlip = isEnemy ? !isReturning : isReturning;
            }
            
            // DEBUG: Log desactivado - spam excesivo en consola
            
            // COMPENSAR MIRROR VIEW: Si la vista está mirroreada, NO invertir el flip
            // porque el mundo ya está volteado horizontalmente
            // if (this.mirrorViewApplied) {
            //     shouldFlip = !shouldFlip;
            // }
            
            if (shouldFlip) {
                this.ctx.scale(-1, 1);
            }
            
            // Dibujar sprite (rectangular, +95% + 25% = 1.95 * 1.25 = 2.4375)
            const baseSize = 32 * 2.4375;
            const spriteWidth = baseSize * 1.2; // mantener relación de aspecto alargada
            const spriteHeight = baseSize;
            // Filtro gris para returning
            this.ctx.filter = isReturning ? 'grayscale(100%)' : 'none';
            this.ctx.drawImage(
                sprite,
                -spriteWidth / 2,
                -spriteHeight / 2,
                spriteWidth,
                spriteHeight
            );
            
            this.ctx.restore();
            this.ctx.filter = 'none';
            this.ctx.shadowBlur = 0;
            
            // 🆕 NOTA: La barra de cargo para helicópteros ahora se renderiza en renderHelicopter()
            // Los helicópteros ya no son convoys, sino entidades persistentes
        } else {
            // FALLBACK: RENDERIZADO PLACEHOLDER (código original)
            
            // Ambulancias médicas: círculo rojo grande (+30% + 25% = 1.3 * 1.25 = 1.625)
            const size = convoy.isMedical ? 19 : 16; // 12*1.625=19.5≈19, 10*1.625=16.25≈16
            const shadowBlur = convoy.isMedical ? 30 : (isReturning ? 10 : 18);
            
            // Sombra
            this.ctx.shadowColor = vehicleColor;
            this.ctx.shadowBlur = shadowBlur;
            
            // Vehículo
            this.ctx.fillStyle = vehicleColor;
            this.ctx.beginPath();
            this.ctx.arc(convoy.x, convoy.y, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Icono según tipo de vehículo
            this.ctx.save();
            this.ctx.translate(convoy.x, convoy.y);
            if (isReturning) {
                // Solo mirar a la izquierda, sin rotación
            } else {
                // Ir al objetivo mirando a la derecha (sin rotación)
            }
            
            if (convoy.vehicleType === 'helicopter') {
                // Icono de helicóptero: símbolo 🚁 (+30% + 25% = 1.625)
                // No hay rotación en ningún caso ahora
                this.ctx.font = '29px Arial'; // 18*1.625=29.25≈29
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('🚁', 0, 0);
            } else {
                // Flecha normal para camiones (+30% + 25% = 1.625)
                this.ctx.fillStyle = isReturning ? '#aaa' : '#fff';
                this.ctx.beginPath();
                if (isReturning) {
                    // Flecha hacia la izquierda (12*1.625=19.5≈20, 6*1.625=9.75≈10)
                    this.ctx.moveTo(-20, 0);
                    this.ctx.lineTo(0, -10);
                    this.ctx.lineTo(0, 10);
                } else {
                    // Flecha hacia delante (según ángulo)
                    this.ctx.moveTo(20, 0);
                    this.ctx.lineTo(0, -10);
                    this.ctx.lineTo(0, 10);
                }
                this.ctx.fill();
            }
            
            this.ctx.restore();
            this.ctx.shadowBlur = 0;
        }
        
        // Línea al destino - SOLO MOSTRAR PARA CONVOYES PROPIOS (no enemigos)
        // Y solo si está activo el modo debug visual (F1)
        if (!isEnemy && this.game && this.game.debugVisualMode) {
            const destinationNode = convoy.returning ? convoy.fromBase : convoy.toBase;
            
            if (destinationNode) {
                this.ctx.strokeStyle = vehicleColor + (isReturning ? '20' : '40');
                this.ctx.lineWidth = isReturning ? 1.2 : 2.4;
                this.ctx.setLineDash([6, 6]);
                this.ctx.beginPath();
                this.ctx.moveTo(convoy.x, convoy.y);
                this.ctx.lineTo(destinationNode.x, destinationNode.y);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    /**
     * 🆕 NUEVO: Renderizar tren
     */
    renderTrain(train) {
        if (!train) return;
        
        const sprite = this.assetManager?.getSprite('train');
        
        if (sprite) {
            this.ctx.save();
            this.ctx.translate(train.x, train.y);
            
            // Determinar dirección basada en movimiento hacia el objetivo (igual que convoyes)
            let shouldFlip = false;
            
            // Obtener nodo destino según estado (yendo o regresando)
            const destinationNode = train.returning ? train.fromBase : train.toBase;
            
            if (destinationNode) {
                const dx = destinationNode.x - train.x;
                // Si va hacia la izquierda (dx < 0), flip horizontal
                // Si va hacia la derecha (dx > 0), no flip
                shouldFlip = dx < 0;
            }
            
            if (shouldFlip) {
                this.ctx.scale(-1, 1);
            }
            
            // Dibujar sprite del tren (10% más pequeño: multiplicar por 0.9)
            const baseSize = 32 * 2.5 * 0.9; // 10% más pequeño
            const spriteWidth = baseSize * 1.5;
            const spriteHeight = baseSize;
            
            this.ctx.drawImage(
                sprite,
                -spriteWidth / 2,
                -spriteHeight / 2,
                spriteWidth,
                spriteHeight
            );
            
            this.ctx.restore();
        } else {
            // Fallback: círculo gris
            this.ctx.fillStyle = '#666';
            this.ctx.beginPath();
            this.ctx.arc(train.x, train.y, 20, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    /**
     * 🆕 NUEVO: Renderizar helicóptero persistente
     */
    renderHelicopter(heli) {
        if (!heli || heli.state !== 'flying') return;
        
        // Obtener nodos de origen y destino
        const fromNode = this.game.nodes.find(n => n.id === heli.currentNodeId);
        const toNode = this.game.nodes.find(n => n.id === heli.targetNodeId);
        
        if (!fromNode || !toNode) return;
        
        // Calcular posición basada en el progress (ya interpolado en Game.updateHelicopterPosition)
        const progress = heli.progress || 0;
        const x = fromNode.x + (toNode.x - fromNode.x) * progress;
        const y = fromNode.y + (toNode.y - fromNode.y) * progress;
        
        // Determinar si es enemigo
        const isEnemy = heli.team !== this.game.myTeam;
        const heliColor = heli.team === 'player1' ? '#4CAF50' : '#FF5722';
        
        // 🆕 NUEVO: Animación de aspas - Alternar entre helicopter y helicopter2 cada 30 frames
        // Usar frame count global para sincronizar todos los helicópteros
        if (!this._heliFrameCount) this._heliFrameCount = 0;
        this._heliFrameCount++;
        
        const useFrame2 = Math.floor(this._heliFrameCount / 30) % 2 === 1;
        const spriteKey = useFrame2 ? 'helicopter2' : 'helicopter';
        const sprite = this.assetManager?.getSprite(spriteKey);
        
        if (sprite) {
            // RENDERIZADO CON SPRITE (sin glow/shadow)
            this.ctx.save();
            this.ctx.translate(x, y);
            
            // Determinar dirección (izquierda o derecha)
            const dx = toNode.x - fromNode.x;
            let shouldFlip = dx < 0; // Si va hacia la izquierda, flip
            
            // DEBUG: Log para helicópteros problemáticos
            if (Math.random() < 0.01) { // Solo 1% de las veces para no spamear
                console.log(`🚁 Helicóptero ${heli.id}: from=${fromNode.x.toFixed(0)}, to=${toNode.x.toFixed(0)}, dx=${dx.toFixed(0)}, shouldFlip=${shouldFlip}, team=${heli.team}, myTeam=${this.game.myTeam}`);
            }
            
            // COMPENSAR MIRROR VIEW: Si la vista está mirroreada, NO invertir el flip
            // porque el mundo ya está volteado horizontalmente
            // if (this.mirrorViewApplied) {
            //     shouldFlip = !shouldFlip;
            // }
            
            if (shouldFlip) {
                this.ctx.scale(-1, 1);
            }
            
            // 🆕 NUEVO: Tamaño aumentado +20% (rectangular, +95% + 25% = 2.4375, luego *1.2 = 2.925)
            const baseSize = 32 * 2.925; // Aumentado de 2.4375 a 2.925 (+20%)
            const spriteWidth = baseSize * 1.2; // mantener relación de aspecto alargada
            const spriteHeight = baseSize;
            
            this.ctx.drawImage(
                sprite,
                -spriteWidth / 2,
                -spriteHeight / 2,
                spriteWidth,
                spriteHeight
            );
            
            this.ctx.restore();
            
            // Renderizar barra de cargo capacity
            const percentage = (heli.cargo / 100) * 100; // cargo ya está en 0-100
            const barWidth = 40;
            const barHeight = 6;
            const barY = y - 40; // Posición más arriba para no tapar el helicóptero
            
            // Fondo de la barra (gris oscuro)
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(
                x - barWidth / 2,
                barY - barHeight / 2,
                barWidth,
                barHeight
            );
            
            // Barra de progreso (verde a amarillo a rojo)
            let barColor;
            if (percentage > 50) {
                barColor = '#4ecca3'; // Verde (100-50%)
            } else if (percentage > 0) {
                barColor = '#f39c12'; // Amarillo (50-0%)
            } else {
                barColor = '#e74c3c'; // Rojo (0%)
            }
            
            this.ctx.fillStyle = barColor;
            this.ctx.fillRect(
                x - barWidth / 2,
                barY - barHeight / 2,
                (barWidth * percentage) / 100,
                barHeight
            );
            
            // Borde de la barra
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(
                x - barWidth / 2,
                barY - barHeight / 2,
                barWidth,
                barHeight
            );
            
            // Mostrar porcentaje de cargo
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                `${Math.round(percentage)}%`,
                x,
                barY - 10
            );
        }
        
        // Línea al destino - SOLO MOSTRAR PARA HELICÓPTEROS PROPIOS
        if (!isEnemy) {
            this.ctx.strokeStyle = heliColor + '40';
            this.ctx.lineWidth = 2.4;
            this.ctx.setLineDash([6, 6]);
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(toNode.x, toNode.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    renderParticle(particle) {
        this.ctx.globalAlpha = particle.alpha;
        this.ctx.fillStyle = particle.color;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
    }
    
    renderExplosionSprite(explosion) {
        // Animación de 3 frames: explosion-1, explosion-2, explosion-3
        // Cada frame: 0.2s (total 0.6s)
        if (!explosion || typeof explosion.life === 'undefined') return;
        
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
     * 🆕 NUEVO: Renderiza una explosión de dron (2 frames)
     * @param {DroneFrameExplosion} explosion - Explosión de dron
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
    
    renderImpactMark(impactMark) {
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
    
    // ========== RENDERIZADO TIPO EDIFICIO ==========
    renderBuildingTypeNode(building) {
        if (!building || !building.active) return;
        
        // Debug temporal
        if (!building.spriteKey) {
            console.warn(`⚠️ Edificio sin spriteKey:`, building.type, building);
        }
        
        // Si está en construcción, mostrar sprite de construcción
        const spriteKey = building.isConstructing ? 'building-construction' : building.spriteKey;
        const sprite = this.assetManager.getSprite(spriteKey);
        
        // Tamaño del sprite: +25% (bases) + 20% adicional = 1.875 * 1.2 = 2.25
        const baseSize = 60; // Tamaño base
        let spriteSize = baseSize * 2.25; // +25% + 20% = 2.25x
        
        // Aplicar multiplicador de tamaño personalizado si existe (solo cuando NO está en construcción)
        if (!building.isConstructing && building.sizeMultiplier) {
            spriteSize *= building.sizeMultiplier;
        }
        
        if (sprite) {
            // Sin resplandor
            this.ctx.shadowBlur = 0;
            
            // Aplicar flip horizontal si es necesario
            if (building.flipHorizontal && !building.isConstructing) {
                this.ctx.save();
                this.ctx.translate(building.x, building.y);
                this.ctx.scale(-1, 1); // Flip horizontal
                this.ctx.drawImage(
                    sprite,
                    -spriteSize/2,
                    -spriteSize/2,
                    spriteSize,
                    spriteSize
                );
                this.ctx.restore();
            } else {
                // Renderizar sprite del edificio (o construcción) normal
                this.ctx.drawImage(
                    sprite,
                    building.x - spriteSize/2,
                    building.y - spriteSize/2,
                    spriteSize,
                    spriteSize
                );
            }
            
            // Si está en construcción, mostrar barra de progreso
            if (building.isConstructing) {
                const progress = building.getConstructionProgress();
                const barWidth = spriteSize * 0.8;
                const barHeight = 8;
                const barX = building.x - barWidth / 2;
                const barY = building.y + spriteSize / 2 + 10;
                
                // Fondo de la barra
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.ctx.fillRect(barX, barY, barWidth, barHeight);
                
                // Progreso de la barra
                this.ctx.fillStyle = '#2ecc71';
                this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);
                
                // Borde de la barra
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(barX, barY, barWidth, barHeight);
            }
        } else {
            // Fallback: círculo con emoji (sin resplandor)
            this.ctx.shadowBlur = 0;
            
            this.ctx.fillStyle = '#555';
            this.ctx.beginPath();
            this.ctx.arc(building.x, building.y, building.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.font = '30px Arial';
            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('🏗️', building.x, building.y);
        }
        
        // Renderizar círculo de rango del hospital de campaña (solo si está seleccionado)
        // NOTA: El contador de vehículos se renderiza en renderVehicleUI() para evitar duplicación
        if (building.type === 'campaignHospital' && building.constructed && !building.isConstructing) {
            if (this.game && this.game.selectedBase === building) {
                this.ctx.strokeStyle = 'rgba(0, 255, 100, 0.5)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([10, 5]);
                this.ctx.beginPath();
                this.ctx.arc(building.x, building.y, building.actionRange, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }
    }
    
    renderDrone(drone) {
        const droneSprite = this.assetManager.getSprite('vehicle-drone');
        const size = 50 * 1.15; // Tamaño del sprite del dron +15%
        
        if (droneSprite) {
            // Dibujar sprite del dron con sombra
            // Drones enemigos: sombra roja, aliados: naranja
            this.ctx.shadowColor = drone.isEnemy ? '#ff0000' : '#ff6600';
            this.ctx.shadowBlur = 15;
            
            this.ctx.save();
            this.ctx.translate(drone.x, drone.y);
            
            // Determinar dirección basada en movimiento hacia el objetivo
            let shouldFlip = false;
            if (drone.target) {
                const dx = drone.target.x - drone.x;
                shouldFlip = dx < 0; // Si va hacia la izquierda, flip
            } else {
                // Fallback: voltear drones enemigos horizontalmente
                shouldFlip = drone.isEnemy;
            }
            
            // COMPENSAR MIRROR VIEW: Si la vista está mirroreada, NO invertir el flip
            // porque el mundo ya está volteado horizontalmente
            // if (this.mirrorViewApplied) {
            //     shouldFlip = !shouldFlip;
            // }
            
            if (shouldFlip) {
                this.ctx.scale(-1, 1);
            }
            
            this.ctx.drawImage(
                droneSprite,
                -size/2,
                -size/2,
                size,
                size
            );
            
            this.ctx.restore();
            this.ctx.shadowBlur = 0;
        } else {
            // Fallback: círculo naranja/rojo
            this.ctx.shadowColor = drone.isEnemy ? '#ff0000' : '#ff6600';
            this.ctx.shadowBlur = 25;
            this.ctx.fillStyle = drone.isEnemy ? '#ff0000' : '#ff6600';
            this.ctx.beginPath();
            this.ctx.arc(drone.x, drone.y, 12, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            
            // Icono de bomba
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText('💣', drone.x, drone.y);
        }
        
        // Línea hacia el objetivo (roja para enemigos, naranja para aliados)
        this.ctx.strokeStyle = drone.isEnemy ? 'rgba(255, 0, 0, 0.4)' : 'rgba(255, 102, 0, 0.4)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([6, 6]);
        this.ctx.beginPath();
        this.ctx.moveTo(drone.x, drone.y);
        this.ctx.lineTo(drone.target.x, drone.target.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    /**
     * 🆕 NUEVO: Renderiza un camera drone volando hacia su objetivo
     */
    renderCameraDroneFlying(cameraDrone) {
        const cameraDroneSprite = this.assetManager.getSprite('camera-drone');
        // Usar el mismo cálculo de tamaño que otros nodos (basado en radius)
        const size = (cameraDrone.radius || 25) * 2 * 1.875; // Mismo cálculo que renderNode
        
        if (cameraDroneSprite) {
            // Dibujar sprite del camera drone con sombra azul
            this.ctx.shadowColor = '#3498db';
            this.ctx.shadowBlur = 15;
            
            this.ctx.save();
            this.ctx.translate(cameraDrone.x, cameraDrone.y);
            
            // Determinar dirección basada en movimiento hacia el objetivo
            let shouldFlip = false;
            if (cameraDrone.targetX !== undefined && cameraDrone.targetY !== undefined) {
                const dx = cameraDrone.targetX - cameraDrone.x;
                shouldFlip = dx < 0; // Si va hacia la izquierda, flip
            }
            
            if (shouldFlip) {
                this.ctx.scale(-1, 1);
            }
            
            this.ctx.drawImage(
                cameraDroneSprite,
                -size/2,
                -size/2,
                size,
                size
            );
            
            this.ctx.restore();
            this.ctx.shadowBlur = 0;
        } else {
            // Fallback: círculo azul
            this.ctx.shadowColor = '#3498db';
            this.ctx.shadowBlur = 25;
            this.ctx.fillStyle = '#3498db';
            this.ctx.beginPath();
            this.ctx.arc(cameraDrone.x, cameraDrone.y, 12, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            
            // Icono de cámara
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText('📹', cameraDrone.x, cameraDrone.y);
        }
        
        // Línea hacia el objetivo (azul)
        if (cameraDrone.targetX !== undefined && cameraDrone.targetY !== undefined) {
            this.ctx.strokeStyle = 'rgba(52, 152, 219, 0.4)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([6, 6]);
            this.ctx.beginPath();
            this.ctx.moveTo(cameraDrone.x, cameraDrone.y);
            this.ctx.lineTo(cameraDrone.targetX, cameraDrone.targetY);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }
    
    /**
     * 🆕 NUEVO: Renderiza el área de detección del camera drone
     */
    renderCameraDroneDetectionArea(cameraDrone) {
        if (!cameraDrone.deployed || !cameraDrone.detectionRadius) return;
        
        // Círculo de área de detección
        this.ctx.strokeStyle = 'rgba(52, 152, 219, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 5]);
        this.ctx.beginPath();
        this.ctx.arc(cameraDrone.x, cameraDrone.y, cameraDrone.detectionRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    /**
     * ✅ REFACTORIZADO: Método genérico para renderizar vehículos de combate
     * @param {Object} vehicle - El vehículo a renderizar (tank, lightVehicle, etc.)
     * @param {Object} config - Configuración del vehículo:
     *   - getSpriteKey: función(vehicle) -> string - Devuelve la clave del sprite a usar
     *   - fallbackEmoji: string - Emoji a mostrar si no hay sprite
     *   - size: number - Tamaño del sprite (default: 100)
     *   - shadowEnabled: boolean - Si debe tener sombra/glow (default: true)
     */
    renderCombatVehicle(vehicle, config) {
        const { getSpriteKey, fallbackEmoji, size = 100, shadowEnabled = true } = config;
        
        // Obtener sprite key (puede ser función o string)
        const spriteKey = typeof getSpriteKey === 'function' 
            ? getSpriteKey(vehicle) 
            : getSpriteKey;
        
        const vehicleSprite = this.assetManager.getSprite(spriteKey);
        
        if (vehicleSprite) {
            // Dibujar sprite del vehículo con sombra (opcional)
            if (shadowEnabled) {
                this.ctx.shadowColor = vehicle.team === 'player1' ? '#4ecca3' : '#e74c3c';
                this.ctx.shadowBlur = 15;
            } else {
                this.ctx.shadowColor = 'transparent';
                this.ctx.shadowBlur = 0;
            }
            
            this.ctx.save();
            this.ctx.translate(vehicle.x, vehicle.y);
            
            // Determinar dirección basada en movimiento hacia el objetivo
            let shouldFlip = false;
            if (vehicle.targetId) {
                const targetNode = this.game?.nodes?.find(n => n.id === vehicle.targetId);
                if (targetNode) {
                    const dx = targetNode.x - vehicle.x;
                    shouldFlip = dx < 0; // Si va hacia la izquierda, flip
                }
            }
            
            if (shouldFlip) {
                this.ctx.scale(-1, 1);
            }
            
            this.ctx.drawImage(
                vehicleSprite,
                -size/2,
                -size/2,
                size,
                size
            );
            
            this.ctx.restore();
            this.ctx.shadowBlur = 0;
        } else {
            // Fallback: círculo con color del equipo
            const color = vehicle.team === 'player1' ? '#4ecca3' : '#e74c3c';
            if (shadowEnabled) {
                this.ctx.shadowColor = color;
                this.ctx.shadowBlur = 25;
            } else {
                this.ctx.shadowColor = 'transparent';
                this.ctx.shadowBlur = 0;
            }
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(vehicle.x, vehicle.y, 15, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            
            // Icono de fallback
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(fallbackEmoji || '🚗', vehicle.x, vehicle.y);
        }
        
        // Línea hacia el objetivo eliminada - ya no se muestra
    }
    
    /**
     * Renderiza un tanque
     * Usa renderCombatVehicle con configuración específica del tanque
     */
    renderTank(tank) {
        this.renderCombatVehicle(tank, {
            getSpriteKey: (tank) => {
                // Determinar qué sprite usar según el estado
                if (tank.state === 'shooting' || tank.showShotOnImpact) {
                    // Mostrar sprite de shot durante el estado shooting o cuando ocurre el impacto
                    return 'vehicle-tank-shot';
                } else {
                    // Alternar entre tank_1 y tank_2 mientras se mueve
                    return tank.spriteFrame === 1 ? 'vehicle-tank-1' : 'vehicle-tank-2';
                }
            },
            fallbackEmoji: '🛡️',
            size: 100
        });
    }
    
    /**
     * Renderiza un artillado ligero
     * Usa renderCombatVehicle con configuración específica del artillado ligero
     */
    renderLightVehicle(lightVehicle) {
        this.renderCombatVehicle(lightVehicle, {
            getSpriteKey: (lightVehicle) => {
                // Determinar qué sprite usar según el estado
                if (lightVehicle.state === 'shooting' || lightVehicle.showShotOnImpact) {
                    // Mostrar sprite de disparo durante el estado shooting o cuando ocurre el impacto
                    return 'vehicle-light-2';
                } else {
                    // Sprite normal mientras se mueve
                    return 'vehicle-light-1';
                }
            },
            fallbackEmoji: '🚛',
            size: 100,
            shadowEnabled: false // 🆕 Sin glow/sombra verde para el artillado ligero
        });
    }
    
    renderRoutePreview(from, to) {
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'; // Negro semi-transparente
        this.ctx.lineWidth = 3.6;  // +20% (3→3.6)
        this.ctx.setLineDash([12, 6]);  // +20% (10→12, 5→6)
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    /**
     * ✅ Helper centralizado: Verifica si una posición está en el área de construcción de un FOB aliado
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @returns {boolean} True si está en el área de construcción de un FOB aliado
     */
    isInFobBuildArea(x, y) {
        if (!this.game) return false;
        
        const myTeam = this.game.myTeam || 'player1';
        const buildRadii = this.game.serverBuildingConfig?.buildRadii || {};
        const fobBuildRadius = buildRadii.fob || 140;
        const allNodes = [...(this.game.bases || []), ...(this.game.nodes || [])];
        const allyFOBs = allNodes.filter(n => 
            n.type === 'fob' && 
            n.team === myTeam && 
            n.active && 
            n.constructed &&
            !n.isAbandoning
        );
        
        for (const fob of allyFOBs) {
            const dist = Math.hypot(x - fob.x, y - fob.y);
            if (dist <= fobBuildRadius) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * ✅ Helper centralizado: Verifica si una posición está en el área de construcción permitida por un camera drone
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @returns {boolean} True si hay un camera drone aliado que permite construir aquí
     */
    isInCameraDroneBuildArea(x, y) {
        if (!this.game) return false;
        
        const myTeam = this.game.myTeam || 'player1';
        const specialNodes = this.game.serverBuildingConfig?.specialNodes || {};
        const cameraDroneConfig = specialNodes.cameraDrone || {};
        const buildRadius = cameraDroneConfig.buildRadius || 300;
        const allNodes = [...(this.game.bases || []), ...(this.game.nodes || [])];
        const allyCameraDrones = allNodes.filter(n => 
            n.isCameraDrone && 
            n.team === myTeam && 
            n.active && 
            n.constructed &&
            !n.isAbandoning &&
            n.deployed
        );
        
        for (const cameraDrone of allyCameraDrones) {
            const dist = Math.hypot(x - cameraDrone.x, y - cameraDrone.y);
            if (dist <= buildRadius) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Renderiza el overlay visual de áreas válidas/inválidas para construcción
     * @param {string} buildingType - Tipo de edificio que se está construyendo
     */
    renderBuildAreaOverlay(buildingType) {
        if (!this.game || !buildingType) return;
        
        const rules = getBuildAreaVisual(buildingType);
        const allNodes = [...(this.game.bases || []), ...(this.game.nodes || [])];
        
        // 1. Renderizar territorio válido en verde (solo si territoryType no es null)
        if (rules.territoryType !== null) {
            this.renderTerritoryOverlay(rules.territoryType);
        }
        
        // 🆕 NUEVO: Para el taller de drones y taller de vehículos, mostrar áreas válidas de FOBs aliados
        if ((buildingType === 'droneWorkshop' || buildingType === 'vehicleWorkshop') && rules.showFobAreas) {
            const myTeam = this.game?.myTeam || 'player1';
            const buildRadii = this.game?.serverBuildingConfig?.buildRadii || {};
            const fobBuildRadius = buildRadii.fob || 140; // Radio de construcción del FOB
            
            const allyFOBs = allNodes.filter(node => 
                node.type === 'fob' && 
                node.team === myTeam && 
                node.active && 
                node.constructed &&
                !node.isAbandoning
            );
            
            // Mostrar áreas válidas alrededor de FOBs aliados en verde
            for (const fob of allyFOBs) {
                this.ctx.strokeStyle = 'rgba(46, 204, 113, 0.4)'; // Verde semi-transparente
                this.ctx.lineWidth = 3;
                this.ctx.setLineDash([10, 5]);
                this.ctx.beginPath();
                this.ctx.arc(fob.x, fob.y, fobBuildRadius, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }
        
        // 2. Renderizar áreas de exclusión en rojo según las reglas
        for (const rule of rules.exclusionRules) {
            const filteredNodes = allNodes.filter(node => 
                node.active && rule.filter(node, this.game)
            );
            
            for (const node of filteredNodes) {
                const radius = getExclusionRadius(node, rule.radiusType, this.game);
                this.renderExclusionCircle(node.x, node.y, radius, rule.color);
            }
        }
    }
    
    /**
     * Renderiza overlay del territorio válido (verde semi-transparente)
     * @param {string} territoryType - 'ally' | 'enemy'
     */
    renderTerritoryOverlay(territoryType) {
        if (!this.game || !this.game.territory) return;
        
        const worldWidth = this.game.worldWidth;
        const worldHeight = this.game.worldHeight;
        
        // Determinar qué territorio mostrar
        const showAllyTerritory = territoryType === 'ally';
        const vertices = showAllyTerritory ? 
            this.game.territory.allyFrontierVertices : 
            this.game.territory.enemyFrontierVertices;
        
        if (vertices.length === 0) return;
        
        this.ctx.save();
        
        // Color verde semi-transparente para área válida
        this.ctx.fillStyle = 'rgba(46, 204, 113, 0.15)'; // Verde claro semi-transparente
        
        // Determinar si estamos en mirror view
        const myTeam = this.game.myTeam || 'player1';
        const isPlayer2 = myTeam === 'player2';
        const mirrorViewApplied = this.mirrorViewApplied;
        
        // Dibujar polígono del territorio válido
        this.ctx.beginPath();
        
        if (showAllyTerritory) {
            // Territorio aliado
            if (mirrorViewApplied) {
                // Player2 con mirror view: territorio aliado desde la derecha visual
                this.ctx.moveTo(worldWidth, 0);
                this.ctx.lineTo(worldWidth, worldHeight);
                for (let i = vertices.length - 1; i >= 0; i--) {
                    this.ctx.lineTo(vertices[i].x, vertices[i].y);
                }
            } else {
                // Player1: territorio aliado desde la izquierda
                this.ctx.moveTo(0, 0);
                for (const vertex of vertices) {
                    this.ctx.lineTo(vertex.x, vertex.y);
                }
                this.ctx.lineTo(0, worldHeight);
            }
        } else {
            // Territorio enemigo
            if (mirrorViewApplied) {
                // Player2 con mirror view: territorio enemigo desde la izquierda visual
                this.ctx.moveTo(0, 0);
                for (const vertex of vertices) {
                    this.ctx.lineTo(vertex.x, vertex.y);
                }
                this.ctx.lineTo(0, worldHeight);
            } else {
                // Player1: territorio enemigo desde la derecha
                this.ctx.moveTo(worldWidth, 0);
                this.ctx.lineTo(worldWidth, worldHeight);
                for (let i = vertices.length - 1; i >= 0; i--) {
                    this.ctx.lineTo(vertices[i].x, vertices[i].y);
                }
            }
        }
        
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    /**
     * Renderiza un círculo de exclusión (área donde no se puede construir)
     * @param {number} x - Posición X del centro
     * @param {number} y - Posición Y del centro
     * @param {number} radius - Radio del círculo
     * @param {string} color - Color del círculo (rgba)
     */
    renderExclusionCircle(x, y, radius, color) {
        this.ctx.save();
        
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Borde más oscuro para mejor visibilidad
        this.ctx.strokeStyle = color.replace('0.2', '0.5').replace('0.15', '0.4').replace('0.3', '0.6');
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    /**
     * 🎯 NUEVO: Renderiza el rango de intercepción de una torreta anti-drone (cuando se selecciona)
     * Usa el mismo visual que se muestra para las torretas enemigas en modo drone
     * @param {number} x - Coordenada X de la torreta
     * @param {number} y - Coordenada Y de la torreta
     */
    renderAntiDroneInterceptionRange(x, y) {
        // Leer el rango de intercepción desde la configuración del servidor
        const interceptionRange = this.game?.serverBuildingConfig?.specialNodes?.antiDrone?.detectionRange || 160;
        
        // Si el rango es 0 o no válido, no renderizar nada
        if (!interceptionRange || interceptionRange <= 0) {
            return;
        }
        
        this.ctx.save();
        
        // Círculo de rango de intercepción (mismo estilo que en renderEnemyBuildPreview y tooltip de hover)
        this.ctx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 5]);
        this.ctx.beginPath();
        this.ctx.arc(x, y, interceptionRange, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        this.ctx.restore();
    }
    
    renderBuildPreview(x, y, bases, buildingType = 'fob') {
        // Verificar colisiones usando la nueva lógica de detectionRadius
        let tooClose = false;
        
        // Combinar bases y nodos para verificar colisiones
        const allNodes = [...(bases || []), ...(this.game?.nodes || [])];
        
        // Obtener configuración del edificio que se está construyendo
        const config = getNodeConfig(buildingType);
        
        // 🆕 NUEVO: El comando ignora límites de detección (solo verifica colisión física básica)
        const isCommando = buildingType === 'specopsCommando';
        // 🆕 NUEVO: El truck assault ignora límites de detección (solo verifica colisión física básica)
        const isTruckAssault = buildingType === 'truckAssault';
        // 🆕 NUEVO: El camera drone ignora límites de detección (solo verifica colisión física básica)
        const isCameraDrone = buildingType === 'cameraDrone';
        // 🆕 NUEVO: La torre de vigilancia puede construirse cerca de comandos enemigos
        const isVigilanceTower = buildingType === 'vigilanceTower';
        // 🆕 NUEVO: El taller de drones puede construirse cerca de FOBs aliados
        const isDroneWorkshop = buildingType === 'droneWorkshop';
        // 🆕 NUEVO: El taller de vehículos puede construirse cerca de FOBs aliados
        const isVehicleWorkshop = buildingType === 'vehicleWorkshop';
        
        if (isCommando || isTruckAssault || isCameraDrone) {
            // Solo verificar colisión física básica (no áreas de detección)
            for (const node of allNodes) {
                if (!node.active) continue;
                
                const dist = Math.hypot(x - node.x, y - node.y);
                const existingConfig = getNodeConfig(node.type);
                const existingRadius = existingConfig?.radius || 30;
                const newRadius = config?.radius || 25;
                const minSeparation = existingRadius + newRadius; // Solo colisión física
                
                if (dist < minSeparation) {
                    tooClose = true;
                    break;
                }
            }
            
            // 🆕 NUEVO: Verificar si hay torres de vigilancia enemigas cerca
            const myTeam = this.game?.myTeam || 'player1';
            const enemyTowers = allNodes.filter(n => 
                (n.type === 'vigilanceTower' || n.isVigilanceTower) &&
                n.team !== myTeam &&
                n.active &&
                n.constructed &&
                !n.isAbandoning
            );
            
            for (const tower of enemyTowers) {
                const towerConfig = getNodeConfig(tower.type);
                const detectionRadius = towerConfig?.detectionRadius || tower.detectionRadius || 320;
                const dist = Math.hypot(x - tower.x, y - tower.y);
                
                if (dist <= detectionRadius) {
                    tooClose = true;
                    break;
                }
            }
        } else {
            // Lógica normal de detección para otros edificios
            // 🆕 NUEVO: Usar buildRadius si existe (para construcción), o detectionRadius como fallback
            const buildRadii = this.game?.serverBuildingConfig?.buildRadii || {};
            const newBuildRadius = buildRadii[buildingType] || 
                                  config?.detectionRadius || 
                                  (config?.radius || 30) * 2.5;
            
            for (const node of allNodes) {
                if (!node.active) continue;
                
                // 🆕 NUEVO: Si estamos construyendo una torre de vigilancia, ignorar comandos enemigos
                if (isVigilanceTower && node.isCommando) {
                    // Solo verificar colisión física básica con comandos (no área de detección)
                    const dist = Math.hypot(x - node.x, y - node.y);
                    const existingConfig = getNodeConfig(node.type);
                    const existingRadius = existingConfig?.radius || 25;
                    const newRadius = config?.radius || 35;
                    const minPhysicalSeparation = existingRadius + newRadius;
                    if (dist < minPhysicalSeparation) {
                        tooClose = true;
                        break; // Solo bloquear si hay colisión física directa
                    }
                    continue; // Saltar la verificación de área de detección para comandos
                }
                
                // 🆕 NUEVO: Si estamos construyendo un taller de drones o taller de vehículos, ignorar FOBs aliados en la validación de colisiones
                // (solo verificar colisión física básica, no área de construcción)
                if ((isDroneWorkshop || isVehicleWorkshop) && node.type === 'fob') {
                    const myTeam = this.game?.myTeam || 'player1';
                    if (node.team === myTeam && node.constructed && !node.isAbandoning) {
                        const dist = Math.hypot(x - node.x, y - node.y);
                        const existingConfig = getNodeConfig(node.type);
                        const existingRadius = existingConfig?.radius || 40;
                        const newRadius = config?.radius || 35;
                        const minPhysicalSeparation = existingRadius + newRadius;
                        if (dist < minPhysicalSeparation) {
                            tooClose = true;
                            break; // Solo bloquear si hay colisión física directa
                        }
                        continue; // Saltar la verificación de área de construcción para FOBs aliados
                    }
                }
                
                const dist = Math.hypot(x - node.x, y - node.y);
                
                // Obtener radio de construcción del nodo existente (usar buildRadius si existe)
                const existingConfig = getNodeConfig(node.type);
                const existingBuildRadius = buildRadii[node.type] || 
                                           existingConfig?.detectionRadius || 
                                           (existingConfig?.radius || 30) * 2.5;
                
                // Verificar colisión: ningún edificio puede estar dentro del área de construcción del otro
                const minSeparation = Math.max(existingBuildRadius, newBuildRadius);
                
                if (dist < minSeparation) {
                    tooClose = true;
                    break;
                }
            }
        }
        
        // Verificar si está dentro del territorio aliado (o enemigo para comando)
        const inAllyTerritory = this.game && this.game.territory && this.game.territory.isInAllyTerritory(x, y);
        const inEnemyTerritory = this.game && this.game.territory && !inAllyTerritory;
        
        // 🆕 NUEVO: Para el taller de drones y taller de vehículos, verificar que esté en el área de construcción de un FOB aliado
        let isInFobArea = false;
        if (isDroneWorkshop || isVehicleWorkshop) {
            isInFobArea = this.isInFobBuildArea(x, y);
        }
        
        // 🆕 NUEVO: Para edificios que pueden construirse en territorio enemigo con camera drone, verificar si hay uno cerca
        let isInCameraDroneArea = false;
        const canBuildInEnemyTerritoryWithDrone = ['vigilanceTower', 'specopsCommando', 'truckAssault'].includes(buildingType);
        if (canBuildInEnemyTerritoryWithDrone && inEnemyTerritory) {
            isInCameraDroneArea = this.isInCameraDroneBuildArea(x, y);
        }
        
        // Usar configuración del tipo de edificio actual (ya declarada arriba)
        const radius = config ? config.radius : 30;
        
        // Color del preview (rojo si está fuera o muy cerca, verde si es válido)
        // Para comando, truck assault y camera drone: válido si está en territorio enemigo y no muy cerca
        // Para torre de vigilancia: válido si está en territorio aliado O (territorio enemigo con camera drone cerca) y no muy cerca
        // Para taller de drones y taller de vehículos: válido si está en territorio aliado, no muy cerca Y en área de FOB
        // Para otros: válido si está en territorio aliado y no muy cerca
        let isValid;
        if (isCommando || isTruckAssault || isCameraDrone) {
            isValid = !tooClose && inEnemyTerritory;
        } else if (isVigilanceTower) {
            isValid = !tooClose && (inAllyTerritory || (inEnemyTerritory && isInCameraDroneArea));
        } else if (isDroneWorkshop || isVehicleWorkshop) {
            isValid = !tooClose && inAllyTerritory && isInFobArea;
        } else {
            isValid = !tooClose && inAllyTerritory;
        }
        const previewColor = isValid ? 'rgba(52, 152, 219, 0.5)' : 'rgba(231, 76, 60, 0.5)';
        const borderColor = isValid ? '#3498db' : '#e74c3c';
        
        // Base semi-transparente
        this.ctx.fillStyle = previewColor;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Borde punteado
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([8, 8]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Sprite del edificio actual
        const buildingSprite = this.assetManager.getSprite(config.spriteKey);
        if (buildingSprite) {
            const spriteSize = radius * 2.5; // Más grande para mejor visibilidad
            this.ctx.globalAlpha = isValid ? 0.8 : 0.5;
            this.ctx.drawImage(
                buildingSprite,
                x - spriteSize/2,
                y - spriteSize/2,
                spriteSize,
                spriteSize
            );
            this.ctx.globalAlpha = 1;
        } else {
            // Fallback: icono con nombre del edificio
        this.ctx.fillStyle = isValid ? '#fff' : '#e74c3c';
            this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
            this.ctx.fillText(config.icon || config.name || buildingType.toUpperCase(), x, y);
        }
        
        // Etiqueta con nombre del edificio
        this.ctx.fillStyle = isValid ? '#fff' : '#e74c3c';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Mostrar mensaje de error específico
        let label = config.name || buildingType.toUpperCase();
        if (tooClose) {
            label = '⚠️ MUY CERCA';
        } else if ((isCommando || isTruckAssault || isCameraDrone) && !inEnemyTerritory) {
            label = '⚠️ DEBE SER EN TERRITORIO ENEMIGO';
        } else if ((isDroneWorkshop || isVehicleWorkshop) && !isInFobArea) {
            label = '⚠️ DEBE ESTAR EN ÁREA DE FOB';
        } else if (!isCommando && !isTruckAssault && !isCameraDrone && !inAllyTerritory) {
            label = '⚠️ FUERA DE TERRITORIO';
        }
        this.ctx.fillText(label, x, y - radius - 10);
        
        // Círculo de área de detección (naranja) - siempre visible para dev
        // ✅ Para comando, truck assault y camera drone, usar specialNodes del servidor (fuente única de verdad)
        let detectionRadius;
        if (buildingType === 'specopsCommando' || buildingType === 'truckAssault' || buildingType === 'cameraDrone') {
            const specialNodes = this.game?.serverBuildingConfig?.specialNodes || {};
            const specialNodeConfig = specialNodes[buildingType];
            detectionRadius = specialNodeConfig?.detectionRadius || 200;
        } else {
            detectionRadius = config?.detectionRadius || (config?.radius || 30) * 2.5;
        }
        this.ctx.strokeStyle = 'rgba(255, 165, 0, 0.6)'; // Naranja
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([8, 8]);
        this.ctx.beginPath();
        this.ctx.arc(x, y, detectionRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Mostrar círculo de rango de acción si el edificio tiene rango (solo si es válido)
        if (config.showRangePreview && isValid) {
            // Para anti-drones, mostrar rango de detección
            if (config.detectionRange) {
                this.ctx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([10, 5]);
                this.ctx.beginPath();
                this.ctx.arc(x, y, config.detectionRange, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
            // Para hospitales, mostrar rango de acción
            else if (config.actionRange) {
                this.ctx.strokeStyle = 'rgba(0, 255, 100, 0.6)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([10, 5]);
                this.ctx.beginPath();
                this.ctx.arc(x, y, config.actionRange, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }
    }
    
    renderDronePreview(x, y, hoveredBase) {
        const radius = 30;
        
        // 🎯 NUEVO: Usar configuración del servidor para validar objetivos
        let validTarget = false;
        if (hoveredBase && hoveredBase.team !== this.game?.myTeam) {
            // Obtener validTargets desde la configuración del servidor
            const validTargets = this.game?.serverBuildingConfig?.actions?.droneLaunch?.validTargets || 
                                 ['fob', 'nuclearPlant', 'antiDrone', 'campaignHospital', 'droneLauncher', 'truckFactory', 'engineerCenter', 'intelRadio', 'intelCenter', 'aerialBase'];
            validTarget = validTargets.includes(hoveredBase.type) && 
                         hoveredBase.constructed && 
                         !hoveredBase.isConstructing && 
                         !hoveredBase.isAbandoning;
        }
        
        // Círculo vacío con borde blanco punteado
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([8, 8]);
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Si NO es un objetivo válido, mostrar X roja
        if (!validTarget) {
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 4;
            const crossSize = 15;
            
            // X roja
            this.ctx.beginPath();
            this.ctx.moveTo(x - crossSize, y - crossSize);
            this.ctx.lineTo(x + crossSize, y + crossSize);
            this.ctx.moveTo(x + crossSize, y - crossSize);
            this.ctx.lineTo(x - crossSize, y + crossSize);
            this.ctx.stroke();
        }
    }
    
    /**
     * ✅ REFACTORIZADO: Método genérico para renderizar preview de vehículos de combate
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @param {Object} hoveredBase - El nodo sobre el que se hace hover
     * @param {Object} config - Configuración del preview:
     *   - actionName: string - Nombre de la acción en serverBuildingConfig (ej: "tankLaunch", "lightVehicleLaunch")
     *   - validColor: string - Color cuando el objetivo es válido (ej: "rgba(78, 204, 163, 0.8)")
     *   - textColor: string - Color del texto cuando es válido (ej: "#4ecca3")
     *   - label: string - Etiqueta a mostrar (ej: "TANQUE", "ARTILLADO")
     *   - additionalValidation: función(hoveredBase) -> boolean - Validación adicional opcional
     *   - getInvalidLabel: función(hoveredBase) -> string - Función para obtener label cuando es inválido
     */
    renderCombatVehiclePreview(x, y, hoveredBase, config) {
        const { 
            actionName, 
            validColor, 
            textColor, 
            label, 
            additionalValidation = null,
            getInvalidLabel = null
        } = config;
        
        const radius = 30;
        
        // 🎯 Validar objetivos permitidos
        let validTarget = false;
        if (hoveredBase && hoveredBase.team !== this.game?.myTeam) {
            // Obtener validTargets desde la configuración del servidor
            const validTargets = this.game?.serverBuildingConfig?.actions?.[actionName]?.validTargets || 
                                 ['nuclearPlant', 'antiDrone', 'campaignHospital', 'droneLauncher', 'truckFactory', 'engineerCenter', 'intelRadio', 'intelCenter', 'aerialBase', 'vigilanceTower'];
            
            validTarget = validTargets.includes(hoveredBase.type) && 
                         hoveredBase.constructed && 
                         !hoveredBase.isConstructing && 
                         !hoveredBase.isAbandoning;
            
            // Validación adicional si se proporciona
            if (validTarget && additionalValidation) {
                validTarget = additionalValidation(hoveredBase);
            }
        }
        
        // Círculo vacío con borde punteado
        this.ctx.strokeStyle = validTarget ? validColor : 'rgba(255, 0, 0, 0.8)';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([8, 8]);
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Si NO es un objetivo válido, mostrar X roja
        if (!validTarget) {
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 4;
            const crossSize = 15;
            
            // X roja
            this.ctx.beginPath();
            this.ctx.moveTo(x - crossSize, y - crossSize);
            this.ctx.lineTo(x + crossSize, y + crossSize);
            this.ctx.moveTo(x + crossSize, y - crossSize);
            this.ctx.lineTo(x - crossSize, y + crossSize);
            this.ctx.stroke();
        }
        
        // Etiqueta
        this.ctx.fillStyle = validTarget ? textColor : '#ff0000';
        this.ctx.font = 'bold 11px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        let displayLabel = label;
        
        if (!validTarget) {
            if (getInvalidLabel) {
                displayLabel = getInvalidLabel(hoveredBase);
            } else {
                // Fallback genérico
                if (hoveredBase && (hoveredBase.type === 'fob' || hoveredBase.type === 'hq')) {
                    displayLabel = 'NO FOBs/HQs';
                } else {
                    displayLabel = 'NO VÁLIDO';
                }
            }
        }
        
        this.ctx.fillText(displayLabel, x, y - radius - 12);
    }
    
    /**
     * Renderiza preview del tanque
     * Usa renderCombatVehiclePreview con configuración específica del tanque
     */
    renderTankPreview(x, y, hoveredBase) {
        this.renderCombatVehiclePreview(x, y, hoveredBase, {
            actionName: 'tankLaunch',
            validColor: 'rgba(78, 204, 163, 0.8)',
            textColor: '#4ecca3',
            label: 'TANQUE',
            getInvalidLabel: (hoveredBase) => {
                if (hoveredBase && (hoveredBase.type === 'fob' || hoveredBase.type === 'hq')) {
                    return 'NO FOBs/HQs';
                }
                return 'NO VÁLIDO';
            }
        });
    }
    
    /**
     * Renderiza preview del artillado ligero
     * Usa renderCombatVehiclePreview con configuración específica del artillado ligero
     */
    renderLightVehiclePreview(x, y, hoveredBase) {
        this.renderCombatVehiclePreview(x, y, hoveredBase, {
            actionName: 'lightVehicleLaunch',
            validColor: 'rgba(255, 140, 0, 0.8)',
            textColor: '#ff8c00',
            label: 'ARTILLADO',
            additionalValidation: (hoveredBase) => !hoveredBase.broken,
            getInvalidLabel: (hoveredBase) => {
                if (hoveredBase && (hoveredBase.type === 'fob' || hoveredBase.type === 'hq')) {
                    return 'NO FOBs/HQs';
                } else if (hoveredBase && hoveredBase.broken) {
                    return 'YA ROTO';
                }
                return 'NO VÁLIDO';
            }
        });
    }
    
    /**
     * Renderiza preview de artillería
     * 🆕 NUEVO: Muestra área de efecto circular con sprite de artillery
     */
    renderArtilleryPreview(x, y, hoveredBase) {
        // Renderizar sprite de artillery como cursor
        const sprite = this.assetManager?.getSprite('vehicle-artillery');
        
        if (sprite) {
            // Usar sprite de artillery
            const size = 60; // Tamaño del sprite (más pequeño que comando/truck assault)
            this.ctx.globalAlpha = 0.9;
            this.ctx.drawImage(
                sprite,
                x - size/2,
                y - size/2,
                size,
                size
            );
            this.ctx.globalAlpha = 1.0;
        } else {
            // Fallback: círculo con símbolo de artillería
            this.ctx.strokeStyle = '#ff8c00';
            this.ctx.fillStyle = 'rgba(255, 140, 0, 0.2)';
            this.ctx.lineWidth = 3;
            
            const radius = 30;
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }
        
        // Renderizar área de efecto - leer del servidor (gameplay.artillery.areaRadius - fuente única de verdad)
        const areaRadius = this.game?.serverBuildingConfig?.gameplay?.artillery?.areaRadius || 150;
        
        // Área de efecto con color distintivo (naranja para artillería)
        this.ctx.strokeStyle = '#ff8c00';
        this.ctx.fillStyle = 'rgba(255, 140, 0, 0.1)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, areaRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
        
        // Etiqueta indicando que afecta un área
        this.ctx.fillStyle = '#ff8c00';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('ARTILLERÍA', x, y - areaRadius - 15);
    }
    
    renderSniperCursor(x, y, hoveredBase) {
        // Renderizar mira de francotirador usando sprite
        const sprite = this.assetManager?.getSprite('sniper');
        
        if (sprite) {
            // Usar sprite de mira
            const size = 80;
            this.ctx.globalAlpha = 0.9;
            this.ctx.drawImage(
                sprite,
                x - size/2,
                y - size/2,
                size,
                size
            );
            this.ctx.globalAlpha = 1.0;
        } else {
            // Fallback: renderizar mira básica con círculos
            const radius1 = 40;
            const radius2 = 20;
            
            this.ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
            this.ctx.lineWidth = 2;
            
            // Círculo externo
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius1, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Círculo interno
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius2, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Cruz de mira
            this.ctx.beginPath();
            this.ctx.moveTo(x - radius1, y);
            this.ctx.lineTo(x + radius1, y);
            this.ctx.moveTo(x, y - radius1);
            this.ctx.lineTo(x, y + radius1);
            this.ctx.stroke();
        }
        
        // Indicador de objetivo inválido (si no es un frente enemigo)
        const validTarget = hoveredBase && hoveredBase.type === 'front' && hoveredBase.team === 'player2';
        if (!validTarget) {
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 4;
            const crossSize = 15;
            
            // X roja
            this.ctx.beginPath();
            this.ctx.moveTo(x - crossSize, y - crossSize);
            this.ctx.lineTo(x + crossSize, y + crossSize);
            this.ctx.moveTo(x + crossSize, y - crossSize);
            this.ctx.lineTo(x - crossSize, y + crossSize);
            this.ctx.stroke();
        }
    }
    
    /**
     * Renderiza el cursor de Fob Sabotaje
     */
    renderFobSabotageCursor(x, y, hoveredBase) {
        // Renderizar cursor specops_selector usando sprite
        const sprite = this.assetManager?.getSprite('specops_selector');
        
        if (sprite) {
            // Usar sprite del cursor
            const size = 80;
            this.ctx.globalAlpha = 0.9;
            this.ctx.drawImage(
                sprite,
                x - size/2,
                y - size/2,
                size,
                size
            );
            this.ctx.globalAlpha = 1.0;
        } else {
            // Fallback: renderizar cursor básico
            const radius = 40;
            
            this.ctx.strokeStyle = 'rgba(255, 100, 0, 0.8)';
            this.ctx.lineWidth = 2;
            
            // Círculo externo
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Flecha hacia abajo
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - radius + 10);
            this.ctx.lineTo(x, y + radius - 10);
            this.ctx.moveTo(x - 8, y + radius - 20);
            this.ctx.lineTo(x, y + radius - 10);
            this.ctx.lineTo(x + 8, y + radius - 20);
            this.ctx.stroke();
        }
        
        // Indicador de objetivo inválido (si no es una FOB enemiga)
        const myTeam = this.game?.myTeam || 'player1';
        const validTarget = hoveredBase && hoveredBase.type === 'fob' && hoveredBase.team !== myTeam;
        
        // 🆕 NUEVO: Verificar si el FOB está protegido por una torre de vigilancia
        let isProtected = false;
        if (validTarget && hoveredBase) {
            const vigilanceTowers = (this.game?.nodes || []).filter(n => 
                (n.type === 'vigilanceTower' || n.isVigilanceTower) &&
                n.team === hoveredBase.team && // Torre del mismo equipo que el FOB (protectora)
                n.active &&
                n.constructed &&
                !n.isAbandoning
            );
            
            for (const tower of vigilanceTowers) {
                const detectionRadius = tower.detectionRadius || 320;
                const dist = Math.hypot(hoveredBase.x - tower.x, hoveredBase.y - tower.y);
                
                if (dist <= detectionRadius) {
                    isProtected = true;
                    break;
                }
            }
        }
        
        if (!validTarget) {
            // X roja para objetivo inválido
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 4;
            const crossSize = 15;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x - crossSize, y - crossSize);
            this.ctx.lineTo(x + crossSize, y + crossSize);
            this.ctx.moveTo(x + crossSize, y - crossSize);
            this.ctx.lineTo(x - crossSize, y + crossSize);
            this.ctx.stroke();
        } else if (isProtected) {
            // 🆕 Indicador de protección: escudo o símbolo de bloqueo
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            this.ctx.lineWidth = 3;
            
            // Círculo amarillo alrededor del cursor
            this.ctx.beginPath();
            this.ctx.arc(x, y, 50, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            
            // Símbolo de escudo/bloqueo
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            // Escudo simple (forma de U con línea horizontal arriba)
            this.ctx.moveTo(x, y - 10);
            this.ctx.lineTo(x - 12, y + 5);
            this.ctx.lineTo(x, y + 10);
            this.ctx.lineTo(x + 12, y + 5);
            this.ctx.closePath();
            this.ctx.stroke();
        }
    }
    
    /**
     * Renderiza el cursor de Comando Especial Operativo
     * 🆕 NUEVO
     */
    /**
     * 🆕 NUEVO: Función genérica para renderizar anillos de progreso (reutilizable)
     * @param {number} x - Posición X del centro
     * @param {number} y - Posición Y del centro
     * @param {number} radius - Radio del anillo
     * @param {number} progress - Progreso de 0 a 1 (1 = completo, 0 = vacío)
     * @param {Object} options - Opciones de configuración
     * @param {number} options.width - Grosor del anillo (default: 3)
     * @param {Object} options.colorStart - Color inicial {r, g, b} (default: {255, 255, 0} - amarillo)
     * @param {Object} options.colorEnd - Color final {r, g, b} (default: {255, 0, 0} - rojo)
     * @param {boolean} options.reverse - Si true, el progreso va en sentido contrario (default: false)
     * @param {boolean} options.pulse - Si true, añade efecto de pulso (default: false)
     * @param {number} options.pulseSpeed - Velocidad del pulso en ms (default: 300)
     * @param {number} options.pulseRange - Rango del pulso 0-1 (default: 0.3)
     * @param {number} options.backgroundAlpha - Alpha del anillo de fondo (default: 0.5)
     */
    renderProgressRing(x, y, radius, progress, options = {}) {
        const {
            width = 3,
            colorStart = { r: 255, g: 255, b: 0 }, // Amarillo
            colorEnd = { r: 255, g: 0, b: 0 },     // Rojo
            reverse = false,
            pulse = false,
            pulseSpeed = 300,
            pulseRange = 0.3,
            backgroundAlpha = 0.5
        } = options;
        
        this.ctx.save();
        
        // Anillo de fondo (gris oscuro)
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(0, 0, 0, ${backgroundAlpha})`;
        this.ctx.lineWidth = width;
        this.ctx.stroke();
        
        // Anillo de progreso
        if (progress > 0) {
            // Calcular pulso si está habilitado
            let alphaMultiplier = 1;
            if (pulse) {
                const pulseValue = Math.sin(Date.now() / pulseSpeed) * pulseRange + (1 - pulseRange);
                alphaMultiplier = pulseValue;
            }
            
            // Usar siempre colorStart (amarillo) sin interpolación
            const r = colorStart.r;
            const g = colorStart.g;
            const b = colorStart.b;
            const alpha = progress * alphaMultiplier;
            
            this.ctx.beginPath();
            // Empezar desde arriba (-PI/2) y dibujar en sentido horario
            const startAngle = -Math.PI / 2;
            const progressAngle = reverse ? (1 - progress) : progress;
            const endAngle = startAngle + (Math.PI * 2 * progressAngle);
            this.ctx.arc(x, y, radius, startAngle, endAngle);
            
            this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            this.ctx.lineWidth = width;
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    /**
     * 🆕 NUEVO: Renderiza el anillo de efecto residual alrededor de un edificio afectado por comando eliminado
     * @param {Object} node - Nodo edificio afectado
     * @param {Object} game - Instancia del juego (para obtener gameTime)
     */
    renderCommandoResidualRing(node, game) {
        // Obtener gameTime del servidor (a través de network.lastGameState)
        const gameTime = game?.network?.lastGameState?.gameTime || 0;
        
        if (!gameTime) return; // No renderizar si no hay gameTime disponible
        
        // Encontrar el efecto residual activo
        const residualEffect = node.effects?.find(e => 
            e.type === 'commandoResidual' && 
            e.keepsDisabled && 
            e.spawnTime !== undefined &&
            e.expiresAt !== undefined &&
            gameTime >= e.spawnTime &&
            gameTime < e.expiresAt
        );
        
        if (!residualEffect) return;
        
        // Calcular progreso del efecto (0 a 1, donde 1 = recién aplicado, 0 = a punto de expirar)
        const duration = residualEffect.expiresAt - residualEffect.spawnTime;
        const elapsed = gameTime - residualEffect.spawnTime;
        const progress = Math.max(0, Math.min(1, 1 - (elapsed / duration)));
        
        // No renderizar si el efecto ya expiró o el progreso es 0
        if (progress <= 0) return;
        
        // Radio del anillo (alrededor del edificio completo)
        const nodeRadius = node.radius || 30;
        const ringRadius = nodeRadius + 8; // 8px de padding alrededor del edificio
        
        // Usar función genérica de anillo de progreso
        // El progreso muestra el tiempo restante (1 = recién aplicado, 0 = a punto de expirar)
        this.renderProgressRing(node.x, node.y, ringRadius, progress, {
            width: 4,
            colorStart: { r: 255, g: 100, b: 0 }, // Naranja (recién aplicado)
            colorEnd: { r: 255, g: 0, b: 0 },     // Rojo (a punto de expirar)
            pulse: true,
            pulseSpeed: 300,
            pulseRange: 0.3,
            backgroundAlpha: 0.4
        });
    }
    
    /**
     * 🆕 NUEVO: Renderiza el anillo de duración del comando
     * @param {Object} node - Nodo comando
     * @param {Object} game - Instancia del juego (para obtener gameTime)
     */
    renderCommandoDurationRing(node, game) {
        if (!node.isCommando || !node.expiresAt) return;
        
        // Obtener gameTime del servidor (a través de network.lastGameState)
        const gameTime = game?.network?.lastGameState?.gameTime || 0;
        if (!gameTime) return;
        
        // Calcular progreso del comando (0 a 1, donde 1 = recién creado, 0 = a punto de expirar)
        let progress = 1;
        if (node.spawnTime && node.expiresAt) {
            const duration = node.expiresAt - node.spawnTime;
            const elapsed = gameTime - node.spawnTime;
            progress = Math.max(0, Math.min(1, 1 - (elapsed / duration)));
        }
        
        // Radio del anillo (alrededor del comando completo)
        const nodeRadius = node.radius || 25;
        const ringRadius = nodeRadius + 6; // 6px de padding alrededor del comando
        
        // Usar función genérica de anillo de progreso
        this.renderProgressRing(node.x, node.y, ringRadius, progress, {
            width: 3,
            colorStart: { r: 0, g: 255, b: 0 },   // Verde (recién creado)
            colorEnd: { r: 255, g: 165, b: 0 },  // Naranja (a punto de expirar)
            pulse: true,
            pulseSpeed: 400,
            pulseRange: 0.2,
            backgroundAlpha: 0.3
        });
    }
    
    /**
     * 🆕 NUEVO: Renderiza el anillo de duración del truck assault
     * @param {Object} node - Nodo truck assault
     * @param {Object} game - Instancia del juego (para obtener gameTime)
     */
    renderTruckAssaultDurationRing(node, game) {
        if (!node.isTruckAssault || !node.expiresAt) return;
        
        // Obtener gameTime del servidor (a través de network.lastGameState)
        const gameTime = game?.network?.lastGameState?.gameTime || 0;
        if (!gameTime) return;
        
        // Calcular progreso del truck assault (0 a 1, donde 1 = recién creado, 0 = a punto de expirar)
        let progress = 1;
        if (node.spawnTime && node.expiresAt) {
            const duration = node.expiresAt - node.spawnTime;
            const elapsed = gameTime - node.spawnTime;
            progress = Math.max(0, Math.min(1, 1 - (elapsed / duration)));
        }
        
        // Radio del anillo (alrededor del truck assault completo)
        const nodeRadius = node.radius || 25;
        const ringRadius = nodeRadius + 6; // 6px de padding alrededor del truck assault
        
        // Usar función genérica de anillo de progreso
        this.renderProgressRing(node.x, node.y, ringRadius, progress, {
            width: 3,
            colorStart: { r: 0, g: 255, b: 0 },   // Verde (recién creado)
            colorEnd: { r: 255, g: 165, b: 0 },  // Naranja (a punto de expirar)
            pulse: true,
            pulseSpeed: 400,
            pulseRange: 0.2,
            backgroundAlpha: 0.3
        });
    }
    
    /**
     * 🆕 NUEVO: Renderiza el anillo de progreso de inversión de intelRadio
     * @param {Object} node - Nodo intelRadio
     * @param {Object} game - Instancia del juego (no se usa, pero se mantiene para consistencia)
     */
    renderIntelRadioInvestmentRing(node, game) {
        if (!node.investmentStarted || node.investmentCompleted || !node.investmentTime) return;
        
        // Calcular progreso de la inversión (0 a 1, donde 1 = recién iniciado, 0 = a punto de completar)
        const progress = Math.max(0, Math.min(1, (node.investmentTimer || 0) / node.investmentTime));
        
        // Radio del anillo (alrededor del edificio completo)
        const nodeRadius = node.radius || 30;
        const ringRadius = nodeRadius + 6; // 6px de padding alrededor del edificio
        
        // Usar función genérica de anillo de progreso
        // El progreso va de 0 a 1, pero queremos mostrar el tiempo restante (1 - progress)
        this.renderProgressRing(node.x, node.y, ringRadius, 1 - progress, {
            width: 3,
            colorStart: { r: 0, g: 200, b: 255 },  // Azul claro (recién iniciado)
            colorEnd: { r: 0, g: 255, b: 0 },      // Verde (a punto de completar)
            pulse: true,
            pulseSpeed: 500,
            pulseRange: 0.15,
            backgroundAlpha: 0.3
        });
    }
    
    /**
     * Renderiza el cursor de Comando Especial Operativo
     * 🆕 NUEVO
     */
    renderCommandoCursor(x, y, hoveredBase) {
        // Renderizar cursor specops_observer usando sprite
        const sprite = this.assetManager?.getSprite('specops_observer');
        
        if (sprite) {
            // Usar sprite del cursor
            const size = 80;
            this.ctx.globalAlpha = 0.9;
            this.ctx.drawImage(
                sprite,
                x - size/2,
                y - size/2,
                size,
                size
            );
            this.ctx.globalAlpha = 1.0;
        } else {
            // Fallback: círculo con símbolo
            this.ctx.strokeStyle = '#9b59b6';
            this.ctx.fillStyle = 'rgba(155, 89, 182, 0.2)';
            this.ctx.lineWidth = 3;
            
            const radius = 30;
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }
        
        // ✅ Renderizar área de efecto - leer del servidor (specialNodes.specopsCommando.detectionRadius)
        const detectionRadius = this.game?.serverBuildingConfig?.specialNodes?.specopsCommando?.detectionRadius || 200;
        this.ctx.strokeStyle = '#e74c3c';
        this.ctx.fillStyle = 'rgba(231, 76, 60, 0.1)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, detectionRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
        
        // Indicador de territorio enemigo necesario
        // En territorio enemigo: verde, en territorio propio: rojo
        const myTeam = this.game?.myTeam || 'player1';
        const isInEnemyTerritory = this.game?.territoryCalculator?.isInTeamTerritory ? 
            !this.game.territoryCalculator.isInTeamTerritory(x, myTeam) : true; // Fallback: permitir por defecto
        
        if (!isInEnemyTerritory) {
            // No está en territorio enemigo
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 4;
            const crossSize = 20;
            
            // X roja
            this.ctx.beginPath();
            this.ctx.moveTo(x - crossSize, y - crossSize);
            this.ctx.lineTo(x + crossSize, y + crossSize);
            this.ctx.moveTo(x + crossSize, y - crossSize);
            this.ctx.lineTo(x - crossSize, y + crossSize);
            this.ctx.stroke();
        }
    }
    
    /**
     * Preview de dron ENEMIGO (modo debug)
     */
    renderEnemyDronePreview(x, y, hoveredBase, hoveredBuilding) {
        const radius = 30;
        
        // Verificar si el objetivo es válido (cualquier base o edificio aliado)
        const validTarget = (hoveredBase && !hoveredBase.type.includes('enemy')) || 
                           (hoveredBuilding && !hoveredBuilding.isEnemy);
        
        // Círculo rojo punteado
        this.ctx.strokeStyle = validTarget ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 0, 0, 0.4)';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([8, 8]);
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Texto de ayuda
        this.ctx.fillStyle = validTarget ? '#ff0000' : '#ffffff';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(validTarget ? 'ATACAR' : 'Selecciona objetivo', x, y - radius - 15);
    }
    
    /**
     * Preview de construcción enemiga (modo debug)
     */
    renderEnemyBuildPreview(x, y) {
        const radius = 30;
        
        // Círculo rojo semi-transparente
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Borde rojo punteado
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([8, 8]);
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Texto
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('TORRETA ENEMIGA', x, y - radius - 15);
        
        // Mostrar rango de detección
        this.ctx.strokeStyle = 'rgba(255, 200, 0, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 5]);
        this.ctx.beginPath();
        this.ctx.arc(x, y, 160, 0, Math.PI * 2); // Rango de detección del anti-drone
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    renderDevGrid() {
        // Cuadrícula de desarrollo con coordenadas cartesianas
        // Sistema: (0,0) = esquina inferior izquierda
        
        this.ctx.save();
        
        // Usar dimensiones del mundo expandido
        const worldWidth = this.game?.camera?.worldWidth || this.width;
        const worldHeight = this.game?.camera?.worldHeight || this.height;
        
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
    
    /**
     * Renderiza SOLO la UI de vehículos e iconos del HQ
     * Se llama después de renderizar todos los nodos para que siempre quede encima
     */
    renderVehicleUI(node, game) {
        if (!node || (!node.active && !node.isAbandoning)) return;
        
        // Calcular spriteSize igual que en renderNode
        let spriteSize = node.radius * 2 * 1.875;
        if (node.type === 'hq' || node.type === 'fob') {
            spriteSize *= 0.85;
        }
        if (node.type === 'front') {
            spriteSize *= 0.85;
        }
        if (!node.isConstructing && node.sizeMultiplier) {
            spriteSize *= node.sizeMultiplier;
        }
        
        const isSelected = node === game?.selectedNode;
        const isHovered = node === game?.hoveredNode;
        
        // Renderizar selector de recursos del HQ (SOLO si está seleccionado o en hover)
        if ((isSelected || isHovered) && node.type === 'hq') {
            this.renderResourceSelector(node);
        }
        
        // Renderizar contador de vehículos según el tipo de nodo
        if (node.type === 'hq' && !node.type.startsWith('enemy_')) {
            // HQ aliado: usa renderHQVehicles
            this.renderHQVehicles(node);
        } else if (node.type === 'campaignHospital' && node.constructed && !node.isConstructing) {
            // 🆕 NUEVO: Compensar Mirror View usando método unificado
            const wasCompensated1 = this.applyMirrorCompensation(node.x, node.y);
            
            // Hospital de campaña: solo contador de vehículos (sin rango)
            const vehicleIconSprite = this.assetManager.getSprite('ui-medic-vehicle-icon');
            const iconSize = 30;
            const iconX = node.x - iconSize - 10;
            const iconY = node.y + spriteSize / 2 - 10;
            
            if (vehicleIconSprite) {
                this.ctx.drawImage(vehicleIconSprite, iconX, iconY, iconSize, iconSize);
            }
            
            this.ctx.font = 'bold 18px Arial';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 3;
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'middle';
            
            const counterText = `${node.availableVehicles}/${node.maxVehicles}`;
            const textX = iconX + iconSize + 5;
            const textY = iconY + iconSize / 2;
            
            this.ctx.strokeText(counterText, textX, textY);
            this.ctx.fillText(counterText, textX, textY);
            
            // 🆕 NUEVO: Restaurar Mirror View usando método unificado
            this.restoreMirrorCompensation(wasCompensated1);
        } else if (node.maxVehicles > 0 && node.type !== 'hq' && !node.type.startsWith('enemy_') && node.hasSupplies !== false) {
            // 🆕 NUEVO: Compensar Mirror View usando método unificado
            const wasCompensated2 = this.applyMirrorCompensation(node.x, node.y);
            
            // FOBs y otros nodos con vehículos (no HQ, no enemigos)
            const barWidth = node.radius * 2;
            const barHeight = 9;
            const barX = node.x - barWidth / 2;
            const barY = node.y + node.radius + 20;
            
            // Shake si aplica
            let shakeX = 0;
            let shakeY = 0;
            if (node.noVehiclesShake) {
                const shakeIntensity = 3;
                const shakeSpeed = 30;
                shakeX = Math.sin(node.noVehiclesShakeTime * shakeSpeed) * shakeIntensity;
                shakeY = Math.cos(node.noVehiclesShakeTime * shakeSpeed * 1.5) * shakeIntensity;
            }
            
            const vehicleIconSprite = this.assetManager.getSprite('ui-vehicle-icon');
            const iconSize = 36;
            const iconX = node.x + shakeX - 40;
            const iconY = barY + barHeight + 26 + shakeY - iconSize / 2 - 3;
            
            if (vehicleIconSprite) {
                this.ctx.drawImage(vehicleIconSprite, iconX, iconY, iconSize, iconSize);
            }
            
            const vehicleText = `${node.availableVehicles}/${node.maxVehicles}`;
            const availableCount = node.availableVehicles;
            
            this.ctx.fillStyle = node.noVehiclesShake && availableCount === 0 ? '#e74c3c' : '#fff';
            this.ctx.font = 'bold 21px monospace';
            this.ctx.textAlign = 'center';
            
            const textX = node.x + shakeX + 15;
            
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeText(vehicleText, textX, barY + barHeight + 26 + shakeY);
            this.ctx.fillText(vehicleText, textX, barY + barHeight + 26 + shakeY);
            
            // 🆕 NUEVO: Restaurar Mirror View usando método unificado
            this.restoreMirrorCompensation(wasCompensated2);
        }
        
        // 🆕 NUEVO: Renderizar helicópteros aterrizados
        if (node.landedHelicopters && node.landedHelicopters.length > 0 && game.helicopters) {
            // 🆕 NUEVO: Compensar Mirror View usando método unificado
            const wasCompensated3 = this.applyMirrorCompensation(node.x, node.y);
            
            // Obtener sprite del helicóptero
            const helicopterSprite = this.assetManager?.getSprite('ui-chopper-icon');
            if (helicopterSprite) {
                const spriteWidth = helicopterSprite.width;
                const spriteHeight = helicopterSprite.height;
                const aspectRatio = spriteWidth / spriteHeight;
                
                const iconHeight = 32;
                const iconWidth = iconHeight * aspectRatio;
                
                // Posición: a la izquierda del nodo
                const iconX = node.x - node.radius - iconWidth / 2 - 15;
                const iconY = node.y;
                
                this.ctx.drawImage(
                    helicopterSprite,
                    iconX - iconWidth / 2,
                    iconY - iconHeight / 2,
                    iconWidth,
                    iconHeight
                );
                
                // Contador si hay más de 1
                if (node.landedHelicopters.length > 1) {
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = 'bold 12px monospace';
                    this.ctx.textAlign = 'center';
                    this.ctx.strokeStyle = '#000';
                    this.ctx.lineWidth = 2;
                    
                    const textX = iconX;
                    const textY = iconY + iconHeight / 2 + 15;
                    
                    this.ctx.strokeText(`x${node.landedHelicopters.length}`, textX, textY);
                    this.ctx.fillText(`x${node.landedHelicopters.length}`, textX, textY);
                }
                
                // Renderizar barra de cargo para el helicóptero aterrizado
                const heliId = node.landedHelicopters[0];
                const heli = game.helicopters?.find(h => h.id === heliId);
                if (heli) {
                    // 🎯 CORREGIR: Manejar cargo undefined/null y calcular porcentaje correctamente
                    // cargo ya está en 0-100 según el servidor
                    const cargo = heli.cargo ?? 0; // Si es undefined/null, usar 0
                    const percentage = Math.max(0, Math.min(100, cargo)); // Asegurar rango 0-100
                    
                    const barWidth = 30; // Más pequeña para el icono
                    const barHeight = 4;
                    const barY = iconY - 20; // Encima del icono
                    
                    // Fondo de la barra (gris oscuro)
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    this.ctx.fillRect(
                        iconX - barWidth / 2,
                        barY - barHeight / 2,
                        barWidth,
                        barHeight
                    );
                    
                    // Barra de progreso (verde a amarillo a rojo)
                    let barColor;
                    if (percentage > 50) {
                        barColor = '#4ecca3'; // Verde (100-50%)
                    } else if (percentage > 0) {
                        barColor = '#f39c12'; // Amarillo (50-0%)
                    } else {
                        barColor = '#e74c3c'; // Rojo (0%)
                    }
                    
                    this.ctx.fillStyle = barColor;
                    this.ctx.fillRect(
                        iconX - barWidth / 2,
                        barY - barHeight / 2,
                        (barWidth * percentage) / 100,
                        barHeight
                    );
                    
                    // Borde de la barra
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(
                        iconX - barWidth / 2,
                        barY - barHeight / 2,
                        barWidth,
                        barHeight
                    );
                    
                    // Mostrar porcentaje de cargo (más pequeño)
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    this.ctx.font = '8px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(
                        `${Math.round(percentage)}%`,
                        iconX,
                        barY - 8
                    );
                }
            }
            
            // 🆕 NUEVO: Restaurar Mirror View usando método unificado
            this.restoreMirrorCompensation(wasCompensated3);
        }
    }
    
    // ========== ICONO DE HELICÓPTERO ==========
    
    /**
     * Renderiza el icono de helicóptero para frentes que tienen helicópteros
     * @param {MapNode} node - Nodo front con helicópteros
     */
    renderHelicopterIcon(node) {
        // Posición del icono: a la izquierda del nodo
        const iconX = node.x - node.radius - 25; // 25px a la izquierda del borde
        const iconY = node.y;
        
        // Obtener sprite del icono de helicóptero
        const helicopterSprite = this.assetManager?.getSprite('ui-chopper-icon');
        if (helicopterSprite) {
            this.ctx.save();
            
            // Calcular dimensiones manteniendo proporciones del sprite original
            const spriteWidth = helicopterSprite.width;   // 1023px
            const spriteHeight = helicopterSprite.height; // 386px
            const aspectRatio = spriteWidth / spriteHeight; // 1023/386 ≈ 2.65
            
            // Usar la altura como referencia y calcular el ancho proporcional
            const iconHeight = 32;
            const iconWidth = iconHeight * aspectRatio; // 32 * 2.65 ≈ 85px
            
            // Dibujar el icono manteniendo proporciones
            this.ctx.drawImage(
                helicopterSprite,
                iconX - iconWidth / 2,
                iconY - iconHeight / 2,
                iconWidth,
                iconHeight
            );
            
            // Dibujar un pequeño indicador de cantidad si hay más de 1
            if (node.availableHelicopters > 1) {
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 12px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.strokeStyle = '#000';
                this.ctx.lineWidth = 2;
                
                const textX = iconX;
                const textY = iconY + iconHeight / 2 + 15;
                
                this.ctx.strokeText(node.availableHelicopters.toString(), textX, textY);
                this.ctx.fillText(node.availableHelicopters.toString(), textX, textY);
            }
            
            this.ctx.restore();
        }
    }
    
    /**
     * 🆕 ELIMINADO: Renderizado de cargo capacity antiguo
     * Se reimplementará con la nueva arquitectura de helicópteros persistentes
     */
    renderCargoCapacityBarForIcon(node, iconX, iconY) {
        // TODO: Reimplementar con nueva arquitectura
        const percentage = 0;
        const barWidth = 30; // Más pequeña para el icono
        const barHeight = 4;
        const barY = iconY - 20; // Encima del icono
        
        // Fondo de la barra (gris oscuro)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(
            iconX - barWidth / 2,
            barY - barHeight / 2,
            barWidth,
            barHeight
        );
        
        // Barra de progreso (verde a amarillo a rojo)
        let barColor;
        if (percentage > 50) {
            barColor = '#4ecca3'; // Verde (100-50%)
        } else if (percentage > 0) {
            barColor = '#f39c12'; // Amarillo (50-0%)
        } else {
            barColor = '#e74c3c'; // Rojo (0%)
        }
        
        this.ctx.fillStyle = barColor;
        this.ctx.fillRect(
            iconX - barWidth / 2,
            barY - barHeight / 2,
            (barWidth * percentage) / 100,
            barHeight
        );
        
        // Borde de la barra
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            iconX - barWidth / 2,
            barY - barHeight / 2,
            barWidth,
            barHeight
        );
        
        // Mostrar porcentaje de cargo (más pequeño)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.font = '8px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            `${Math.round(percentage)}%`,
            iconX,
            barY - 8
        );
    }
    
    /**
     * 🆕 NUEVO: Inicia el efecto visual del Destructor de mundos
     * @param {number} startTime - Tiempo de inicio del countdown (gameTime del servidor)
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
     * 🆕 NUEVO: Ejecuta el efecto visual del Destructor de mundos (pantallazo blanco)
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
     * 🆕 NUEVO: Inicia el efecto visual de artillería
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
     * 🆕 NUEVO: Renderiza los efectos visuales de artillería
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
     * 🆕 NUEVO: Renderiza los efectos visuales del Destructor de mundos
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
     * 🆕 NUEVO: Renderiza el sprite EndOfWorlds durante el countdown
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
        const centerX = (this.game?.worldWidth || this.width) / 2;
        const centerY = (this.game?.worldHeight || this.height) / 2;
        
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
     * 🆕 NUEVO: Renderiza el pantallazo blanco
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
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.restore();
    }
    
}
