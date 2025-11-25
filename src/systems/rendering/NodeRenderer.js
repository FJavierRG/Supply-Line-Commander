// ===== RENDERIZADO DE NODOS Y EDIFICIOS =====
// Maneja el renderizado de nodos, bases, edificios y su UI

import { getNodeConfig } from '../../config/nodes.js';
import { getBuildAreaVisual, getExclusionRadius } from '../../config/buildAreaVisual.js';

/**
 * NodeRenderer - Renderiza nodos, bases, edificios y su UI
 * Responsabilidades:
 * - Renderizado principal de nodos (renderNode)
 * - Renderizado de bases y edificios (wrappers)
 * - UI específica de nodos (barras, selectores, iconos)
 * - Efectos visuales de nodos (anillos de progreso, tooltips)
 * - Debug info (hitboxes, áreas de detección)
 */
export class NodeRenderer {
    constructor(ctx, assetManager = null, game = null, renderContext = null, droneRenderer = null) {
        this.ctx = ctx;
        this.assetManager = assetManager;
        this.game = game;
        this.renderContext = renderContext; // Para acceso a mirrorViewApplied, width, height, y métodos de compensación
        this.droneRenderer = droneRenderer; // Para renderCameraDroneFlying y renderCameraDroneDetectionArea
    }
    
    /**
     * Helper: Determina si un nodo siempre debe mirar hacia el oponente
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
    
    /**
     * Helper: Acceso a mirrorViewApplied a través de renderContext
     */
    get mirrorViewApplied() {
        return this.renderContext?.mirrorViewApplied || false;
    }
    
    /**
     * Helper: Acceso a width a través de renderContext
     */
    get width() {
        return this.renderContext?.width || this.ctx.canvas.width;
    }
    
    /**
     * Helper: Acceso a height a través de renderContext
     */
    get height() {
        return this.renderContext?.height || this.ctx.canvas.height;
    }
    
    /**
     * Helper: Acceso a applyMirrorCompensation a través de renderContext
     */
    applyMirrorCompensation(centerX, centerY) {
        return this.renderContext?.applyMirrorCompensation(centerX, centerY) || false;
    }
    
    /**
     * Helper: Acceso a restoreMirrorCompensation a través de renderContext
     */
    restoreMirrorCompensation(wasApplied) {
        return this.renderContext?.restoreMirrorCompensation(wasApplied);
    }
    
    /**
     * Helper: Acceso a applyGlobalMirrorCompensation a través de renderContext
     */
    applyGlobalMirrorCompensation() {
        return this.renderContext?.applyGlobalMirrorCompensation() || false;
    }
    
    /**
     * Helper: Acceso a restoreGlobalMirrorCompensation a través de renderContext
     */
    restoreGlobalMirrorCompensation(wasApplied) {
        return this.renderContext?.restoreGlobalMirrorCompensation(wasApplied);
    }
    
    /**
     * Helper: Acceso a renderCameraDroneFlying a través de droneRenderer
     */
    renderCameraDroneFlying(cameraDrone) {
        return this.droneRenderer?.renderCameraDroneFlying(cameraDrone);
    }
    
    /**
     * Helper: Acceso a renderCameraDroneDetectionArea a través de droneRenderer
     */
    renderCameraDroneDetectionArea(cameraDrone) {
        return this.droneRenderer?.renderCameraDroneDetectionArea(cameraDrone);
    }
    
    // ========== RENDERIZADO PRINCIPAL DE NODOS ==========
    
    /**
     * Renderiza un nodo (método principal unificado)
     */
    renderNode(node, isSelected = false, isHovered = false, game = null) {
        // Permitir renderizar nodos abandonando (necesitan animación de grises)
        if (!node) return;
        if (!node.active && !node.isAbandoning) return;
        
        // 🆕 FOG OF WAR: Verificar si el nodo enemigo es visible
        if (game?.fogOfWar && game.isMultiplayer) {
            if (!game.fogOfWar.isVisible(node)) {
                return; // No renderizar nodo oculto por niebla
            }
        }
        
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
        
        // 🆕 NUEVO: Selector de modos de frente (advance, retreat, hold)
        if ((isSelected || node === game?.hoveredNode) && node.type === 'front') {
            this.renderFrontModeSelector(node);
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
        // 🆕 REWORK: HQ ahora muestra barra de suministros (tiene suministros finitos)
        if (node.type === 'campaignHospital' && node.constructed && !node.isConstructing) {
            // Hospital de campaña: solo vehículos (que se renderizan en renderVehicleUI)
            // No renderizar nada aquí
        } else if (node.hasSupplies !== false || node.hasVehicles) {
            // Todos los nodos con suministros (incluyendo HQ) o vehículos: mostrar barra de suministros
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
    
    /**
     * 🆕 NUEVO: Renderiza el selector de modos de comportamiento para nodos de frente
     * Los modos son: advance (avanzar), retreat (retroceder), hold (mantener/ancla)
     * Los botones se muestran verticalmente hacia el lado del enemigo
     */
    renderFrontModeSelector(front) {
        if (!this.game) return;
        if (!front || front.type !== 'front') return;
        
        // Solo mostrar para frentes propios (no enemigos)
        const isMyFront = front.team === this.game.myTeam || 
                         (front.team === 'ally' && this.game.myTeam === 'player1') ||
                         (front.team === 'player1' && this.game.myTeam === 'player1') ||
                         (front.team === 'player2' && this.game.myTeam === 'player2');
        if (!isMyFront) return;
        
        // 🆕 NUEVO: Compensar mirror view para que la UI se vea correctamente orientada
        const wasCompensated = this.applyMirrorCompensation(front.x, front.y);
        
        try {
            const buttonSize = 36;
            const buttonRadius = buttonSize / 2;
            
            // Colores para los modos
            const modeColors = {
                advance: { bg: '#2d5016', border: '#4a8f29' },  // Verde (avance)
                retreat: { bg: '#6b3a1a', border: '#a65b2a' },  // Naranja/marrón (retroceso)
                hold: { bg: '#1a4a6b', border: '#2a7aa6' }      // Azul (defensa/ancla)
            };
            
            // Configuración de los modos
            const modes = [
                { id: 'advance', icon: 'ui-mode-advance', name: 'Avanzar' },
                { id: 'retreat', icon: 'ui-mode-retreat', name: 'Retroceder' },
                { id: 'hold', icon: 'ui-mode-hold', name: 'Mantener' }
            ];
            
            // 🆕 MODIFICADO: Botones alineados verticalmente hacia el lado del enemigo
            // Player1 avanza hacia la derecha (enemigo a la derecha) -> botones a la derecha
            // Player2 avanza hacia la izquierda (enemigo a la izquierda) -> botones a la izquierda
            const isPlayer1 = front.team === 'player1' || front.team === 'ally';
            const directionToEnemy = isPlayer1 ? 1 : -1; // +1 = derecha, -1 = izquierda
            
            const buttonDistanceX = front.radius + 45; // Distancia horizontal del centro
            const buttonSpacingY = 40; // Espacio vertical entre botones
            
            // Verificar cooldown
            const currentTime = Date.now();
            const isOnCooldown = front.modeCooldownUntil && currentTime < front.modeCooldownUntil;
            const cooldownRemaining = isOnCooldown ? Math.ceil((front.modeCooldownUntil - currentTime) / 1000) : 0;
            
            modes.forEach((mode, index) => {
                // Posición vertical: distribuir arriba, centro, abajo
                const offsetY = (index - 1) * buttonSpacingY; // -1, 0, 1 -> -40, 0, 40
                
                // Posición horizontal: hacia el lado del enemigo
                const centerX = front.x + (buttonDistanceX * directionToEnemy);
                const centerY = front.y + offsetY;
                
                const isSelected = front.frontMode === mode.id;
                const colors = modeColors[mode.id];
                
                // Color más apagado si está en cooldown y no es el modo actual
                const isAvailable = !isOnCooldown || isSelected;
                const bgColor = !isAvailable ? 'rgba(60, 60, 60, 0.7)' : 
                               isSelected ? colors.bg : 'rgba(0, 0, 0, 0.7)';
                const borderColor = !isAvailable ? 'rgba(100, 100, 100, 0.5)' :
                                   isSelected ? colors.border : 'rgba(100, 100, 100, 0.5)';
                
                // Renderizar botón (REDONDO)
                this.ctx.fillStyle = bgColor;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, buttonRadius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.strokeStyle = borderColor;
                this.ctx.lineWidth = isSelected ? 3 : 2;
                this.ctx.stroke();
                
                // Renderizar icono del modo
                const icon = this.assetManager.getSprite(mode.icon);
                if (icon) {
                    const iconSize = 28;
                    if (!isAvailable) {
                        this.ctx.globalAlpha = 0.4;
                    }
                    this.ctx.drawImage(icon, 
                        centerX - iconSize/2, centerY - iconSize/2, 
                        iconSize, iconSize);
                    if (!isAvailable) {
                        this.ctx.globalAlpha = 1.0;
                    }
                } else {
                    // Fallback a emoji si no hay sprite
                    const emojiMap = {
                        'advance': '⚔️',
                        'retreat': '🔙',
                        'hold': '🛡️'
                    };
                    this.ctx.font = '20px Arial';
                    this.ctx.fillStyle = isAvailable ? '#fff' : '#666';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(emojiMap[mode.id] || '?', centerX, centerY);
                }
            });
            
            // Texto indicador del modo actual y cooldown (debajo del frente)
            const currentMode = modes.find(m => m.id === front.frontMode);
            let modeText = currentMode ? currentMode.name.toUpperCase() : 'AVANZAR';
            
            if (isOnCooldown) {
                modeText += ` (${cooldownRemaining}s)`;
            }
            
            // Color según el modo actual
            const modeTextColor = modeColors[front.frontMode]?.border || '#4a5d23';
            
            // Posición del texto debajo del frente
            const textY = front.y + front.radius + 55;
            
            // Fondo para el texto
            this.ctx.font = 'bold 14px Arial';
            const textMetrics = this.ctx.measureText(modeText);
            const textWidth = textMetrics.width;
            const textHeight = 16;
            const textX = front.x - textWidth / 2;
            
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(textX - 4, textY - textHeight / 2, textWidth + 8, textHeight);
            
            this.ctx.strokeStyle = modeTextColor;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(textX - 4, textY - textHeight / 2, textWidth + 8, textHeight);
            
            this.ctx.fillStyle = modeTextColor;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(modeText, front.x, textY);
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
        
        // 🆕 REWORK: HQ ahora muestra barra de suministros (tiene suministros finitos)
        // Los vehículos se renderizan en renderVehicleUI() para evitar duplicación
        
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
        
        // 🆕 NUEVO: Calcular color basado en cuántos vehículos se pueden enviar
        // Solo aplica para HQ y FOB (otros nodos usan lógica anterior)
        let barColor;
        
        if (base.type === 'hq' || base.type === 'fob') {
            // Obtener capacidad dinámica del vehículo considerando bonos de edificios
            // Esta capacidad se recalcula en cada render, por lo que se actualiza automáticamente
            // cuando se construye, destruye, habilita o deshabilita un edificio que modifica la capacidad
            let vehicleCapacity = 0;
            if (this.game) {
                const vehicleType = base.type === 'hq' ? 'heavy_truck' : 'truck';
                // Normalizar team del nodo (puede ser 'ally'/'enemy' o 'player1'/'player2')
                let nodeTeam = base.team || this.game.myTeam || 'player1';
                if (nodeTeam === 'ally') {
                    nodeTeam = this.game.myTeam || 'player1';
                } else if (nodeTeam === 'enemy') {
                    const myTeam = this.game.myTeam || 'player1';
                    nodeTeam = myTeam === 'player1' ? 'player2' : 'player1';
                }
                vehicleCapacity = this.game.getVehicleCapacityWithBonuses(vehicleType, nodeTeam);
            } else {
                // Fallback: usar valores por defecto de la configuración
                vehicleCapacity = base.type === 'hq' ? 15 : 20;
            }
            
            // Calcular cuántos vehículos se pueden enviar
            const vehiclesCanSend = vehicleCapacity > 0 ? Math.floor((base.supplies || 0) / vehicleCapacity) : 0;
            
            // Aplicar color según la cantidad de vehículos que se pueden enviar
            if (vehiclesCanSend === 0) {
                // Rojo: no se puede enviar ni un vehículo
                barColor = '#e74c3c';
            } else if (vehiclesCanSend === 1) {
                // Naranja: solo se puede enviar 1 vehículo
                barColor = '#f39c12';
            } else if (vehiclesCanSend === 2) {
                // Amarillo: se pueden enviar 2 vehículos
                barColor = '#f1c40f';
            } else {
                // Verde: se pueden enviar 3 o más vehículos
                barColor = '#4ecca3';
            }
        } else {
            // Para otros tipos de nodos (frentes, etc.), usar lógica anterior
            barColor = (base.supplies || 0) < 20 ? '#e74c3c' : '#4ecca3';
        }
        
        this.ctx.fillStyle = barColor;
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
    
    // ========== RENDERIZADO DE UI DE VEHÍCULOS ==========
    /**
     * Renderiza SOLO la UI de vehículos e iconos del HQ
     * Se llama después de renderizar todos los nodos para que siempre quede encima
     */
    renderVehicleUI(node, game) {
        if (!node || (!node.active && !node.isAbandoning)) return;
        
        // 🆕 FOG OF WAR: Verificar si el nodo enemigo es visible
        if (game?.fogOfWar && game.isMultiplayer) {
            if (!game.fogOfWar.isVisible(node)) {
                return; // No renderizar UI de nodo oculto por niebla
            }
        }
        
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
        
        // 🆕 NUEVO: Renderizar contador de usos restantes para lanzadera de drones
        if (node.type === 'droneLauncher' && node.constructed && !node.isConstructing) {
            // 🆕 NUEVO: Compensar Mirror View usando método unificado
            const wasCompensated4 = this.applyMirrorCompensation(node.x, node.y);
            
            // Obtener configuración del servidor para maxUses
            const maxUses = this.game?.serverBuildingConfig?.effects?.droneLauncher?.maxUses || 3;
            const currentUses = typeof node.uses === 'number' ? node.uses : 0;
            const remainingUses = Math.max(0, maxUses - currentUses);
            
            // Solo mostrar si hay usos restantes
            if (remainingUses > 0) {
                // Renderizar texto "x N" donde N son los usos restantes
                const usesText = `x ${remainingUses}`;
                
                // Color del texto: blanco normalmente, amarillo si quedan pocos usos, rojo si está en abandono
                let textColor = '#fff';
                if (node.isAbandoning) {
                    textColor = '#e74c3c'; // Rojo si está abandonando
                } else if (remainingUses === 1) {
                    textColor = '#f39c12'; // Amarillo si queda 1 uso
                }
                
                this.ctx.fillStyle = textColor;
                this.ctx.font = 'bold 21px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                
                // 🔧 Ajustar posición: más cerca del sprite (reducir distancia desde node.y + node.radius)
                const textX = node.x;
                const textY = node.y + node.radius + 10; // Más cerca del sprite (antes era +55)
                
                // Borde negro para mejor legibilidad
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 2;
                this.ctx.strokeText(usesText, textX, textY);
                this.ctx.fillText(usesText, textX, textY);
            }
            
            // 🆕 NUEVO: Restaurar Mirror View usando método unificado
            this.restoreMirrorCompensation(wasCompensated4);
        }
    }
    
    // ========== DEBUG INFO ==========
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
    
    // ========== ANILLOS DE PROGRESO ==========
    /**
     * 🆕 NUEVO: Función genérica para renderizar anillos de progreso (reutilizable)
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
            
            // Usar siempre colorStart sin interpolación
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
     */
    renderCommandoResidualRing(node, game) {
        // 🔧 FIX: Obtener gameTime del servidor (a través de network.gameStateSync.lastGameState)
        const gameTime = game?.network?.gameStateSync?.lastGameState?.gameTime || 0;
        
        if (!gameTime) return;
        
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
        
        if (progress <= 0) return;
        
        // Radio del anillo (alrededor del edificio completo)
        const nodeRadius = node.radius || 30;
        const ringRadius = nodeRadius + 8; // 8px de padding alrededor del edificio
        
        // Usar función genérica de anillo de progreso
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
     */
    renderCommandoDurationRing(node, game) {
        if (!node.isCommando || !node.expiresAt) return;
        
        // 🔧 FIX: Obtener gameTime del servidor (a través de network.gameStateSync.lastGameState)
        const gameTime = game?.network?.gameStateSync?.lastGameState?.gameTime || 0;
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
     */
    renderTruckAssaultDurationRing(node, game) {
        if (!node.isTruckAssault || !node.expiresAt) return;
        
        // 🔧 FIX: Obtener gameTime del servidor (a través de network.gameStateSync.lastGameState)
        const gameTime = game?.network?.gameStateSync?.lastGameState?.gameTime || 0;
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
     * 🆕 ELIMINADO: Renderizado de cargo capacity antiguo
     */
    renderCargoCapacityBarForIcon(node, iconX, iconY) {
        // TODO: Reimplementar con nueva arquitectura
        const percentage = 0;
        const barWidth = 30;
        const barHeight = 4;
        const barY = iconY - 20;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(
            iconX - barWidth / 2,
            barY - barHeight / 2,
            barWidth,
            barHeight
        );
        
        let barColor;
        if (percentage > 50) {
            barColor = '#4ecca3';
        } else if (percentage > 0) {
            barColor = '#f39c12';
        } else {
            barColor = '#e74c3c';
        }
        
        this.ctx.fillStyle = barColor;
        this.ctx.fillRect(
            iconX - barWidth / 2,
            barY - barHeight / 2,
            (barWidth * percentage) / 100,
            barHeight
        );
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            iconX - barWidth / 2,
            barY - barHeight / 2,
            barWidth,
            barHeight
        );
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.font = '8px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            `${Math.round(percentage)}%`,
            iconX,
            barY - 8
        );
    }
    
    // ========== PREVIEW Y OVERLAYS ==========
    /**
     * Renderiza el overlay visual de áreas válidas/inválidas para construcción
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
            const fobBuildRadius = buildRadii.fob || 140;
            
            const allyFOBs = allNodes.filter(node => 
                node.type === 'fob' && 
                node.team === myTeam && 
                node.active && 
                node.constructed &&
                !node.isAbandoning
            );
            
            for (const fob of allyFOBs) {
                this.ctx.strokeStyle = 'rgba(46, 204, 113, 0.4)';
                this.ctx.lineWidth = 3;
                this.ctx.setLineDash([10, 5]);
                this.ctx.beginPath();
                this.ctx.arc(fob.x, fob.y, fobBuildRadius, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }
        
        // 2. Renderizar áreas de exclusión en rojo según las reglas
        const myTeam = this.game?.myTeam || 'player1';
        
        for (const rule of rules.exclusionRules) {
            const filteredNodes = allNodes.filter(node => 
                node.active && rule.filter(node, this.game)
            );
            
            for (const node of filteredNodes) {
                // 🆕 FOG OF WAR: No mostrar círculos de exclusión de edificios enemigos ocultos por niebla
                if (this.game?.fogOfWar && this.game.isMultiplayer) {
                    if (node.team && node.team !== myTeam) {
                        if (!this.game.fogOfWar.isVisible(node)) {
                            continue; // No renderizar círculo de nodo oculto por niebla
                        }
                    }
                }
                
                const radius = getExclusionRadius(node, rule.radiusType, this.game);
                this.renderExclusionCircle(node.x, node.y, radius, rule.color);
            }
        }
    }
    
    /**
     * Renderiza overlay del territorio válido (verde semi-transparente)
     */
    renderTerritoryOverlay(territoryType) {
        if (!this.game || !this.game.territory) return;
        
        const worldWidth = this.game.worldWidth;
        const worldHeight = this.game.worldHeight;
        
        const showAllyTerritory = territoryType === 'ally';
        const vertices = showAllyTerritory ? 
            this.game.territory.allyFrontierVertices : 
            this.game.territory.enemyFrontierVertices;
        
        if (vertices.length === 0) return;
        
        this.ctx.save();
        
        this.ctx.fillStyle = 'rgba(46, 204, 113, 0.15)';
        
        const myTeam = this.game.myTeam || 'player1';
        const mirrorViewApplied = this.renderContext?.mirrorViewApplied || false;
        
        this.ctx.beginPath();
        
        if (showAllyTerritory) {
            if (mirrorViewApplied) {
                this.ctx.moveTo(worldWidth, 0);
                this.ctx.lineTo(worldWidth, worldHeight);
                for (let i = vertices.length - 1; i >= 0; i--) {
                    this.ctx.lineTo(vertices[i].x, vertices[i].y);
                }
            } else {
                this.ctx.moveTo(0, 0);
                for (const vertex of vertices) {
                    this.ctx.lineTo(vertex.x, vertex.y);
                }
                this.ctx.lineTo(0, worldHeight);
            }
        } else {
            if (mirrorViewApplied) {
                this.ctx.moveTo(0, 0);
                for (const vertex of vertices) {
                    this.ctx.lineTo(vertex.x, vertex.y);
                }
                this.ctx.lineTo(0, worldHeight);
            } else {
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
     */
    renderExclusionCircle(x, y, radius, color) {
        this.ctx.save();
        
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = color.replace('0.2', '0.5').replace('0.15', '0.4').replace('0.3', '0.6');
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    /**
     * 🎯 NUEVO: Renderiza el rango de intercepción de una torreta anti-drone (cuando se selecciona)
     */
    renderAntiDroneInterceptionRange(x, y) {
        const interceptionRange = this.game?.serverBuildingConfig?.specialNodes?.antiDrone?.detectionRange || 160;
        
        if (!interceptionRange || interceptionRange <= 0) {
            return;
        }
        
        this.ctx.save();
        
        this.ctx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 5]);
        this.ctx.beginPath();
        this.ctx.arc(x, y, interceptionRange, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        this.ctx.restore();
    }
    
    // ========== HELPERS ==========
    /**
     * Helper: Verifica si una posición está en el área de construcción de un FOB aliado
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
     * Helper: Verifica si una posición está en el área de construcción permitida por un camera drone
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
     * Helper: Verifica si un nodo siempre debe mirar hacia el oponente
     */
    shouldAlwaysFaceOpponent(node) {
        return node.isCommando || 
               node.isTruckAssault ||
               node.isCameraDrone || 
               node.type === 'droneLauncher';
    }
    
    // Nota: renderBuildPreview ha sido movido a PreviewRenderer
}
