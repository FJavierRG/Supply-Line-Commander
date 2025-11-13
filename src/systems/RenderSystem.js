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
        // Los sprites de otras naciones (como B_Nation) necesitan volteo manual porque
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
            // 🆕 NUEVO: Comando y truck assault siempre miran hacia el oponente
            if (node.isCommando || node.isTruckAssault) {
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
                        // Los sprites de naciones específicas (como B_Nation) no tienen versión enemiga volteada,
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
        
        // Renderizar sprite
        if (sprite) {
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
            // 🆕 NUEVO: Aplicar filtro de grises si el edificio está deshabilitado
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
            
            // Aro de selección/hover
            if (isSelected || isHovered) {
                this.ctx.strokeStyle = isSelected ? '#f39c12' : '#fff';
                this.ctx.lineWidth = isSelected ? 4 : 3;
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, node.radius * 1.6, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        } else {
            // Fallback si no hay sprite
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
        
        // 🆕 NUEVO: Icono de helicóptero para frentes de B_Nation con helicópteros
        if (node.type === 'front' && this.game.selectedRace === 'B_Nation' && node.availableHelicopters > 0) {
            this.renderHelicopterIcon(node);
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
        // Compensar Mirror View si está activo
        if (this.mirrorViewApplied) {
            this.ctx.save();
            this.ctx.translate(node.x, node.y);
            this.ctx.scale(-1, 1);
            this.ctx.translate(-node.x, -node.y);
        }
        
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
        
        let vehicleText;
        let availableCount;
        
        // Determinar qué mostrar según el modo
        if (node.selectedResourceType === 'medical') {
            // Modo médico: mostrar ambulancias
            const ambulanceAvailable = node.ambulanceAvailable ? 1 : 0;
            const medicIconSprite = this.assetManager.getSprite('ui-medic-vehicle-icon');
            const iconSize = 45;
            const iconX = node.x + shakeX - 45;
            const iconY = barY + 26 + shakeY - iconSize / 2 - 3;
            
            if (medicIconSprite) {
                this.ctx.drawImage(medicIconSprite, iconX, iconY, iconSize, iconSize);
            }
            
            vehicleText = `${ambulanceAvailable}/${node.maxAmbulances || 1}`;
            availableCount = ambulanceAvailable;
        } else if (this.game.selectedRace === 'B_Nation' && node.hasHelicopters) {
            // Modo B_Nation: mostrar helicópteros
            const helicopterIconSprite = this.assetManager.getSprite('ui-vehicle-icon'); // Usar el mismo icono por ahora
            const iconSize = 45;
            const iconX = node.x + shakeX - 45;
            const iconY = barY + 26 + shakeY - iconSize / 2 - 3;
            
            if (helicopterIconSprite) {
                this.ctx.drawImage(helicopterIconSprite, iconX, iconY, iconSize, iconSize);
            }
            
            // 🆕 NUEVO: Contar helicópteros aterrizados en lugar de availableHelicopters
            const landedCount = node.landedHelicopters?.length || 0;
            vehicleText = `${landedCount}/${node.maxHelicopters}`;
            availableCount = landedCount;
        } else {
            // Modo normal: mostrar camiones
            const vehicleIconSprite = this.assetManager.getSprite('ui-vehicle-icon');
            const iconSize = 45;
            const iconX = node.x + shakeX - 45;
            const iconY = barY + 26 + shakeY - iconSize / 2 - 3;
            
            if (vehicleIconSprite) {
                this.ctx.drawImage(vehicleIconSprite, iconX, iconY, iconSize, iconSize);
            }
            
            vehicleText = `${node.availableVehicles}/${node.maxVehicles}`;
            availableCount = node.availableVehicles;
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
        
        // Restaurar Mirror View si está activo
        if (this.mirrorViewApplied) {
            this.ctx.restore();
        }
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
        const buttonSize = 40; // +15% más grande (35 * 1.15 = 40.25 ≈ 40)
        const buttonRadius = buttonSize / 2;
        const spacing = 10;
        const baseY = base.y - base.radius - 75; // Subido 15% más (de -65 a -75)
        
        // Botón munición (REDONDO)
        const ammoCenterX = base.x - buttonRadius - spacing/2;
        const ammoCenterY = baseY + buttonRadius;
        const ammoSelected = base.selectedResourceType === 'ammo';
        
        // Color verde militar
        const militaryGreen = '#4a5d23';
        const militaryGreenSolid = '#4a5d23'; // 100% opaco
        
        this.ctx.fillStyle = ammoSelected ? militaryGreenSolid : 'rgba(0, 0, 0, 0.7)';
        this.ctx.beginPath();
        this.ctx.arc(ammoCenterX, ammoCenterY, buttonRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = ammoSelected ? militaryGreen : 'rgba(74, 93, 35, 0.5)';
        this.ctx.lineWidth = ammoSelected ? 3 : 2;
        this.ctx.stroke();
        // Renderizar icono de vehículo (ui-vehicle-icon)
        const vehicleIcon = this.assetManager.getSprite('ui-vehicle-icon');
        if (vehicleIcon) {
            const iconSize = 34; // Tamaño del icono +20% (28 * 1.2 = 33.6 ≈ 34)
            this.ctx.drawImage(vehicleIcon, 
                ammoCenterX - iconSize/2, ammoCenterY - iconSize/2, 
                iconSize, iconSize);
        } else {
            // Fallback a emoji si no hay sprite
            this.ctx.font = '25px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
            this.ctx.fillText('🚛', ammoCenterX, ammoCenterY);
        }
        
        // Botón médico (REDONDO)
        const medCenterX = base.x + buttonRadius + spacing/2;
        const medCenterY = baseY + buttonRadius;
        const medSelected = base.selectedResourceType === 'medical';
        const ambulanceAvailable = base.ambulanceAvailable;
        
        // Color más apagado si no está disponible (sin tachar)
        const medBgColor = !ambulanceAvailable ? 'rgba(100, 100, 100, 0.5)' : 
                           medSelected ? militaryGreenSolid : 'rgba(0, 0, 0, 0.7)';
        const medBorderColor = !ambulanceAvailable ? 'rgba(150, 150, 150, 0.5)' :
                               medSelected ? militaryGreen : 'rgba(74, 93, 35, 0.5)';
        
        this.ctx.fillStyle = medBgColor;
            this.ctx.beginPath();
        this.ctx.arc(medCenterX, medCenterY, buttonRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = medBorderColor;
        this.ctx.lineWidth = medSelected ? 3 : 2;
            this.ctx.stroke();
        // Renderizar icono de vehículo médico (ui-medic-vehicle-icon)
        const medicIcon = this.assetManager.getSprite('ui-medic-vehicle-icon');
        if (medicIcon) {
            const iconSize = 34; // Tamaño del icono +20% (28 * 1.2 = 33.6 ≈ 34)
            // Aplicar opacidad si no está disponible
            if (!ambulanceAvailable) {
                this.ctx.globalAlpha = 0.4;
            }
            this.ctx.drawImage(medicIcon, 
                medCenterX - iconSize/2, medCenterY - iconSize/2, 
                iconSize, iconSize);
            if (!ambulanceAvailable) {
                this.ctx.globalAlpha = 1.0; // Restaurar opacidad
            }
        } else {
            // Fallback a emoji si no hay sprite
            this.ctx.font = '25px Arial';
            this.ctx.fillStyle = ambulanceAvailable ? '#fff' : '#999';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('🚑', medCenterX, medCenterY);
        }
        
        // Texto indicador del modo seleccionado (más visible)
        this.ctx.font = 'bold 17px Arial'; // +20% (14 * 1.2 = 16.8 ≈ 17)
        const modeText = medSelected ? 'MÉDICO' : 'SUMINISTROS';
        const modeColor = '#4a5d23'; // Verde militar para ambos
        
        // Fondo para el texto
        const textMetrics = this.ctx.measureText(modeText);
        const textWidth = textMetrics.width;
        const textHeight = 19; // +20% (16 * 1.2 = 19.2 ≈ 19)
        const textX = base.x - textWidth / 2;
        const textY = baseY - 22;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(textX - 4, textY - textHeight / 2, textWidth + 8, textHeight);
        
        this.ctx.strokeStyle = modeColor;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(textX - 4, textY - textHeight / 2, textWidth + 8, textHeight);
        
        this.ctx.fillStyle = modeColor;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(modeText, base.x, textY);
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
        
        // Calcular offset de shake si está activo
        let shakeX = 0;
        let shakeY = 0;
        if (base.noVehiclesShake) {
            const shakeIntensity = 3;
            const shakeSpeed = 30;
            shakeX = Math.sin(base.noVehiclesShakeTime * shakeSpeed) * shakeIntensity;
            shakeY = Math.cos(base.noVehiclesShakeTime * shakeSpeed * 1.5) * shakeIntensity;
        }
        
        // Compensar Mirror View si está activo
        if (this.mirrorViewApplied) {
            this.ctx.save();
            this.ctx.translate(base.x, base.y);
            this.ctx.scale(-1, 1);
            this.ctx.translate(-base.x, -base.y);
        }
        
        // HQ ALIADO no muestra barra de recursos
        // Los vehículos se renderizan en renderVehicleUI() para evitar duplicación
        if (base.type === 'hq' && !base.type.startsWith('enemy_')) {
            return;
        }
        
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
        
        // Restaurar Mirror View si está activo
        if (this.mirrorViewApplied) {
            this.ctx.restore();
        }
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
        
        // Compensar Mirror View si está activo (para que texto no salga al revés)
        if (this.mirrorViewApplied) {
            this.ctx.scale(-1, 1);
            this.ctx.translate(-this.game.worldWidth, 0);
        }
        
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
                    // Compensar el mirror view con un flip adicional
                    const worldWidth = this.game?.worldWidth || this.width;
                    this.ctx.scale(-1, 1);
                    this.ctx.translate(-worldWidth, 0);
                    
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
        
        // Usar sprites para todos los vehículos (incluida ambulancia)
        const vehicleSpriteKey = convoy.isMedical ? 'ambulance' : convoy.vehicleType;
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
     * Renderiza un tanque
     * 🆕 NUEVO: Renderiza el tanque con sprites alternantes y animación de disparo
     */
    renderTank(tank) {
        // Determinar qué sprite usar según el estado
        let spriteKey;
        if (tank.state === 'shooting' || tank.showShotOnImpact) {
            // Mostrar sprite de shot durante el estado shooting o cuando ocurre el impacto
            spriteKey = 'vehicle-tank-shot';
        } else {
            // Alternar entre tank_1 y tank_2 mientras se mueve
            spriteKey = tank.spriteFrame === 1 ? 'vehicle-tank-1' : 'vehicle-tank-2';
        }
        
        const tankSprite = this.assetManager.getSprite(spriteKey);
        const size = 100; // Tamaño del sprite del tanque (60 * 1.25 = 75)
        
        if (tankSprite) {
            // Dibujar sprite del tanque con sombra
            this.ctx.shadowColor = tank.team === 'player1' ? '#4ecca3' : '#e74c3c';
            this.ctx.shadowBlur = 15;
            
            this.ctx.save();
            this.ctx.translate(tank.x, tank.y);
            
            // Determinar dirección basada en movimiento hacia el objetivo
            let shouldFlip = false;
            if (tank.targetId) {
                const targetNode = this.game?.nodes?.find(n => n.id === tank.targetId);
                if (targetNode) {
                    const dx = targetNode.x - tank.x;
                    shouldFlip = dx < 0; // Si va hacia la izquierda, flip
                }
            }
            
            if (shouldFlip) {
                this.ctx.scale(-1, 1);
            }
            
            this.ctx.drawImage(
                tankSprite,
                -size/2,
                -size/2,
                size,
                size
            );
            
            this.ctx.restore();
            this.ctx.shadowBlur = 0;
        } else {
            // Fallback: círculo con color del equipo
            const color = tank.team === 'player1' ? '#4ecca3' : '#e74c3c';
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 25;
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(tank.x, tank.y, 15, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            
            // Icono de tanque
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText('🛡️', tank.x, tank.y);
        }
        
        // Línea hacia el objetivo (si está moviéndose)
        if (tank.state === 'moving' && tank.targetId) {
            const targetNode = this.game?.nodes?.find(n => n.id === tank.targetId);
            if (targetNode) {
                const color = tank.team === 'player1' ? '#4ecca3' : '#e74c3c';
                this.ctx.strokeStyle = color + '80'; // 50% opacidad
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([6, 6]);
                this.ctx.beginPath();
                this.ctx.moveTo(tank.x, tank.y);
                this.ctx.lineTo(targetNode.x, targetNode.y);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }
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
        // 🆕 NUEVO: La torre de vigilancia puede construirse cerca de comandos enemigos
        const isVigilanceTower = buildingType === 'vigilanceTower';
        // 🆕 NUEVO: El taller de drones puede construirse cerca de FOBs aliados
        const isDroneWorkshop = buildingType === 'droneWorkshop';
        // 🆕 NUEVO: El taller de vehículos puede construirse cerca de FOBs aliados
        const isVehicleWorkshop = buildingType === 'vehicleWorkshop';
        
        if (isCommando || isTruckAssault) {
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
        
        // 🆕 NUEVO: Para el taller de drones y taller de vehículos, verificar que esté en el área de detección de un FOB aliado
        let isInFobArea = false;
        if (isDroneWorkshop || isVehicleWorkshop) {
            const myTeam = this.game?.myTeam || 'player1';
            const buildRadii = this.game?.serverBuildingConfig?.buildRadii || {};
            const fobBuildRadius = buildRadii.fob || 140;
            const allNodes = [...(bases || []), ...(this.game?.nodes || [])];
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
                    isInFobArea = true;
                    break;
                }
            }
        }
        
        // Usar configuración del tipo de edificio actual (ya declarada arriba)
        const radius = config ? config.radius : 30;
        
        // Color del preview (rojo si está fuera o muy cerca, verde si es válido)
        // Para comando y truck assault: válido si está en territorio enemigo y no muy cerca
        // Para taller de drones y taller de vehículos: válido si está en territorio aliado, no muy cerca Y en área de FOB
        // Para otros: válido si está en territorio aliado y no muy cerca
        let isValid;
        if (isCommando || isTruckAssault) {
            isValid = !tooClose && inEnemyTerritory;
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
        } else if ((isCommando || isTruckAssault) && !inEnemyTerritory) {
            label = '⚠️ DEBE SER EN TERRITORIO ENEMIGO';
        } else if ((isDroneWorkshop || isVehicleWorkshop) && !isInFobArea) {
            label = '⚠️ DEBE ESTAR EN ÁREA DE FOB';
        } else if (!isCommando && !isTruckAssault && !inAllyTerritory) {
            label = '⚠️ FUERA DE TERRITORIO';
        }
        this.ctx.fillText(label, x, y - radius - 10);
        
        // Círculo de área de detección (naranja) - siempre visible para dev
        // ✅ Para comando y truck assault, usar specialNodes del servidor (fuente única de verdad)
        let detectionRadius;
        if (buildingType === 'specopsCommando' || buildingType === 'truckAssault') {
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
     * Renderiza preview del tanque (similar al dron pero solo para edificios válidos, NO FOBs ni HQs)
     * 🆕 NUEVO
     */
    renderTankPreview(x, y, hoveredBase) {
        const radius = 30;
        
        // 🎯 Validar objetivos permitidos para tanque (NO FOBs ni HQs)
        let validTarget = false;
        if (hoveredBase && hoveredBase.team !== this.game?.myTeam) {
            // Obtener validTargets desde la configuración del servidor
            const validTargets = this.game?.serverBuildingConfig?.actions?.tankLaunch?.validTargets || 
                                 ['nuclearPlant', 'antiDrone', 'campaignHospital', 'droneLauncher', 'truckFactory', 'engineerCenter', 'intelRadio', 'intelCenter', 'aerialBase', 'vigilanceTower'];
            validTarget = validTargets.includes(hoveredBase.type) && 
                         hoveredBase.constructed && 
                         !hoveredBase.isConstructing && 
                         !hoveredBase.isAbandoning;
        }
        
        // Círculo vacío con borde verde punteado (para diferenciarlo del dron)
        this.ctx.strokeStyle = validTarget ? 'rgba(78, 204, 163, 0.8)' : 'rgba(255, 0, 0, 0.8)';
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
        
        // Etiqueta específica para tanque
        this.ctx.fillStyle = validTarget ? '#4ecca3' : '#ff0000';
        this.ctx.font = 'bold 11px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        let label = 'TANQUE';
        if (!validTarget) {
            if (hoveredBase && (hoveredBase.type === 'fob' || hoveredBase.type === 'hq')) {
                label = 'NO FOBs/HQs';
            } else {
                label = 'NO VÁLIDO';
            }
        }
        this.ctx.fillText(label, x, y - radius - 12);
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
            // Compensar Mirror View si está activo
            if (this.mirrorViewApplied) {
                this.ctx.save();
                this.ctx.translate(node.x, node.y);
                this.ctx.scale(-1, 1);
                this.ctx.translate(-node.x, -node.y);
            }
            
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
            
            // Restaurar Mirror View si está activo
            if (this.mirrorViewApplied) {
                this.ctx.restore();
            }
        } else if (node.maxVehicles > 0 && node.type !== 'hq' && !node.type.startsWith('enemy_') && node.hasSupplies !== false) {
            // Compensar Mirror View si está activo
            if (this.mirrorViewApplied) {
                this.ctx.save();
                this.ctx.translate(node.x, node.y);
                this.ctx.scale(-1, 1);
                this.ctx.translate(-node.x, -node.y);
            }
            
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
            
            // Restaurar Mirror View si está activo
            if (this.mirrorViewApplied) {
                this.ctx.restore();
            }
        }
        
        // 🆕 NUEVO: Renderizar helicópteros aterrizados
        if (node.landedHelicopters && node.landedHelicopters.length > 0 && game.helicopters) {
            // Compensar Mirror View si está activo
            if (this.mirrorViewApplied) {
                this.ctx.save();
                this.ctx.translate(node.x, node.y);
                this.ctx.scale(-1, 1);
                this.ctx.translate(-node.x, -node.y);
            }
            
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
            
            // Restaurar Mirror View si está activo
            if (this.mirrorViewApplied) {
                this.ctx.restore();
            }
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
    
}
