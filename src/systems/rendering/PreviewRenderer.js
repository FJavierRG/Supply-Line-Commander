// ===== RENDERIZADO DE PREVIEWS Y CURSORS =====
// Maneja el renderizado de previews de construcción y cursors especiales

import { getNodeConfig } from '../../config/nodes.js';
import { createShakeState, triggerShake, getShakeOffset } from '../../utils/ShakeUtils.js';

/**
 * PreviewRenderer - Renderiza previews de construcción y cursors especiales
 * Responsabilidades:
 * - Preview de construcción (renderBuildPreview)
 * - Preview de artillería (renderArtilleryPreview)
 * - Cursors especiales (sniper, FOB sabotaje, comando)
 * - Preview de construcción enemiga (modo debug)
 */
export class PreviewRenderer {
    constructor(ctx, assetManager = null, game = null, nodeRenderer = null) {
        this.ctx = ctx;
        this.assetManager = assetManager;
        this.game = game;
        this.nodeRenderer = nodeRenderer; // Para acceso a isInFobBuildArea e isInCameraDroneBuildArea
        
        // 🆕 NUEVO: Estado de shake para cuando no se puede construir
        this.buildShake = createShakeState(400);
    }
    
    /**
     * 🆕 NUEVO: Activa el shake del preview de construcción
     */
    triggerBuildShake() {
        triggerShake(this.buildShake);
    }
    
    /**
     * 🆕 NUEVO: Verifica si una posición es válida para construir
     * Centraliza la lógica de validación para reutilizarla en varios lugares
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     * @param {string} buildingType - Tipo de edificio
     * @returns {boolean} true si la posición es válida
     */
    isValidBuildPosition(x, y, buildingType) {
        // Verificar si está fuera de los límites del mundo
        if (this.isOutOfWorldBounds(x, y, buildingType)) {
            return false;
        }
        
        // Combinar bases y nodos para verificar colisiones
        const allNodes = [...(this.game?.nodes || [])];
        const config = getNodeConfig(buildingType);
        
        // Tipos especiales con reglas distintas
        const isCommando = buildingType === 'specopsCommando';
        const isTruckAssault = buildingType === 'truckAssault';
        const isCameraDrone = buildingType === 'cameraDrone';
        const isVigilanceTower = buildingType === 'vigilanceTower';
        const isDroneWorkshop = buildingType === 'droneWorkshop';
        const isVehicleWorkshop = buildingType === 'vehicleWorkshop';
        
        // Verificar colisiones
        let tooClose = false;
        
        if (isCommando || isTruckAssault || isCameraDrone) {
            // Solo verificar colisión física básica (no áreas de detección)
            for (const node of allNodes) {
                if (!node.active) continue;
                const dist = Math.hypot(x - node.x, y - node.y);
                const existingConfig = getNodeConfig(node.type);
                const existingRadius = existingConfig?.radius || 30;
                const newRadius = config?.radius || 25;
                if (dist < existingRadius + newRadius) {
                    tooClose = true;
                    break;
                }
            }
            
            // Verificar torres de vigilancia enemigas cerca
            if (!tooClose) {
                const myTeam = this.game?.myTeam || 'player1';
                const enemyTowers = allNodes.filter(n => 
                    (n.type === 'vigilanceTower' || n.isVigilanceTower) &&
                    n.team !== myTeam && n.active && n.constructed
                );
                const specialNodes = this.game?.serverBuildingConfig?.specialNodes || {};
                const specialConfig = specialNodes[buildingType] || {};
                const detectionRadius = specialConfig?.detectionRadius || 200;
                for (const tower of enemyTowers) {
                    const dist = Math.hypot(x - tower.x, y - tower.y);
                    const towerConfig = getNodeConfig('vigilanceTower');
                    const towerDetectionRadius = towerConfig?.detectionRadius || 150;
                    if (dist < detectionRadius + towerDetectionRadius) {
                        tooClose = true;
                        break;
                    }
                }
            }
        } else {
            // Lógica normal de detección para otros edificios
            const buildRadii = this.game?.serverBuildingConfig?.buildRadii || {};
            const newBuildRadius = buildRadii[buildingType] || config?.detectionRadius || (config?.radius || 30) * 2.5;
            
            for (const node of allNodes) {
                if (!node.active) continue;
                
                // Excepciones especiales
                if (isVigilanceTower && node.isCommando) continue;
                if ((isDroneWorkshop || isVehicleWorkshop) && node.type === 'fob') {
                    const myTeam = this.game?.myTeam || 'player1';
                    if (node.team === myTeam && node.constructed && !node.isAbandoning) continue;
                }
                
                const dist = Math.hypot(x - node.x, y - node.y);
                const existingConfig = getNodeConfig(node.type);
                const existingBuildRadius = buildRadii[node.type] || existingConfig?.detectionRadius || (existingConfig?.radius || 30) * 2.5;
                if (dist < Math.max(existingBuildRadius, newBuildRadius)) {
                    tooClose = true;
                    break;
                }
            }
        }
        
        if (tooClose) return false;
        
        // Verificar territorio
        const inAllyTerritory = this.game?.territory?.isInAllyTerritory(x, y) || false;
        const inEnemyTerritory = !inAllyTerritory;
        
        // Verificaciones específicas por tipo
        if (isCommando || isTruckAssault || isCameraDrone) {
            return inEnemyTerritory;
        }
        
        if (isDroneWorkshop || isVehicleWorkshop) {
            const isInFobArea = this.nodeRenderer?.isInFobBuildArea(x, y) || false;
            return inAllyTerritory && isInFobArea;
        }
        
        if (isVigilanceTower) {
            const isInCameraDroneArea = this.nodeRenderer?.isInCameraDroneBuildArea(x, y) || false;
            return inAllyTerritory || (inEnemyTerritory && isInCameraDroneArea);
        }
        
        return inAllyTerritory;
    }
    
    /**
     * Renderiza preview de construcción
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @param {Array} bases - Array de bases existentes
     * @param {string} buildingType - Tipo de edificio que se está construyendo
     */
    renderBuildPreview(x, y, bases, buildingType = 'fob') {
        // 🆕 NUEVO: Verificar si está fuera de los límites del mundo
        const isOutOfBounds = this.isOutOfWorldBounds(x, y, buildingType);
        
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
            isInFobArea = this.nodeRenderer?.isInFobBuildArea(x, y) || false;
        }
        
        // 🆕 NUEVO: Para edificios que pueden construirse en territorio enemigo con camera drone, verificar si hay uno cerca
        let isInCameraDroneArea = false;
        const canBuildInEnemyTerritoryWithDrone = ['vigilanceTower', 'specopsCommando', 'truckAssault'].includes(buildingType);
        if (canBuildInEnemyTerritoryWithDrone && inEnemyTerritory) {
            isInCameraDroneArea = this.nodeRenderer?.isInCameraDroneBuildArea(x, y) || false;
        }
        
        // Usar configuración del tipo de edificio actual (ya declarada arriba)
        const radius = config ? config.radius : 30;
        
        // Color del preview (rojo si está fuera o muy cerca, verde si es válido)
        // Para comando, truck assault y camera drone: válido si está en territorio enemigo y no muy cerca
        // Para torre de vigilancia: válido si está en territorio aliado O (territorio enemigo con camera drone cerca) y no muy cerca
        // Para taller de drones y taller de vehículos: válido si está en territorio aliado, no muy cerca Y en área de FOB
        // Para otros: válido si está en territorio aliado y no muy cerca
        // 🆕 NUEVO: También verificar que no esté fuera de los límites del mundo
        let isValid;
        if (isCommando || isTruckAssault || isCameraDrone) {
            isValid = !tooClose && !isOutOfBounds && inEnemyTerritory;
        } else if (isVigilanceTower) {
            isValid = !tooClose && !isOutOfBounds && (inAllyTerritory || (inEnemyTerritory && isInCameraDroneArea));
        } else if (isDroneWorkshop || isVehicleWorkshop) {
            isValid = !tooClose && !isOutOfBounds && inAllyTerritory && isInFobArea;
        } else {
            isValid = !tooClose && !isOutOfBounds && inAllyTerritory;
        }
        const previewColor = isValid ? 'rgba(52, 152, 219, 0.5)' : 'rgba(231, 76, 60, 0.5)';
        const borderColor = isValid ? '#3498db' : '#e74c3c';
        
        // 🆕 NUEVO: Calcular offset de shake si está activo (solo cuando es inválido)
        const shakeOffset = getShakeOffset(this.buildShake, 8, 30);
        const shakeX = shakeOffset.x;
        const shakeY = shakeOffset.y;
        
        // Coordenadas con shake aplicado
        const drawX = x + shakeX;
        const drawY = y + shakeY;
        
        // Base semi-transparente
        this.ctx.fillStyle = previewColor;
        this.ctx.beginPath();
        this.ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Borde punteado
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([8, 8]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Sprite del edificio actual
        const buildingSprite = this.assetManager?.getSprite(config?.spriteKey);
        if (buildingSprite) {
            const spriteSize = radius * 2.5; // Más grande para mejor visibilidad
            this.ctx.globalAlpha = isValid ? 0.8 : 0.5;
            this.ctx.drawImage(
                buildingSprite,
                drawX - spriteSize/2,
                drawY - spriteSize/2,
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
            this.ctx.fillText(config?.icon || config?.name || buildingType.toUpperCase(), drawX, drawY);
        }
        
        // Etiqueta con nombre del edificio
        this.ctx.fillStyle = isValid ? '#fff' : '#e74c3c';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Mostrar mensaje de error específico
        let label = config?.name || buildingType.toUpperCase();
        if (isOutOfBounds) {
            label = '⚠️ FUERA DEL MAPA';
        } else if (tooClose) {
            label = '⚠️ MUY CERCA';
        } else if ((isCommando || isTruckAssault || isCameraDrone) && !inEnemyTerritory) {
            label = '⚠️ DEBE SER EN TERRITORIO ENEMIGO';
        } else if ((isDroneWorkshop || isVehicleWorkshop) && !isInFobArea) {
            label = '⚠️ DEBE ESTAR EN ÁREA DE FOB';
        } else if (!isCommando && !isTruckAssault && !isCameraDrone && !inAllyTerritory) {
            label = '⚠️ FUERA DE TERRITORIO';
        }
        this.ctx.fillText(label, drawX, drawY - radius - 10);
        
        // 🚫 DESACTIVADO: Círculo de área de detección (naranja) - confunde a los usuarios
        // Se puede reactivar descomentando si se necesita para debug
        /*
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
        this.ctx.arc(drawX, drawY, detectionRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        */
        
        // Mostrar círculo de rango de acción si el edificio tiene rango (solo si es válido)
        if (config?.showRangePreview && isValid) {
            // 🆕 Para plantas nucleares, mostrar rango de efecto sobre fábricas
            if (buildingType === 'nuclearPlant') {
                const nuclearPlantRange = this.game?.serverBuildingConfig?.ranges?.nuclearPlant || 0;
                if (nuclearPlantRange > 0) {
                    this.ctx.strokeStyle = 'rgba(0, 200, 255, 0.6)'; // Azul cian para efecto de planta nuclear
                    this.ctx.lineWidth = 2;
                    this.ctx.setLineDash([10, 5]);
                    this.ctx.beginPath();
                    this.ctx.arc(drawX, drawY, nuclearPlantRange, 0, Math.PI * 2);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                }
            }
            // Para anti-drones, mostrar rango de detección
            else if (config.detectionRange) {
                this.ctx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([10, 5]);
                this.ctx.beginPath();
                this.ctx.arc(drawX, drawY, config.detectionRange, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
            // Para hospitales, mostrar rango de acción
            else if (config.actionRange) {
                this.ctx.strokeStyle = 'rgba(0, 255, 100, 0.6)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([10, 5]);
                this.ctx.beginPath();
                this.ctx.arc(drawX, drawY, config.actionRange, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }
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
    
    /**
     * Renderiza cursor de sniper
     */
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
    
    /**
     * 🆕 NUEVO: Verifica si una posición está fuera de los límites válidos del mundo
     * Delega a NodeRenderer para evitar duplicación de código
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @param {string} buildingType - Tipo de edificio
     * @returns {boolean} True si está fuera de los límites
     */
    isOutOfWorldBounds(x, y, buildingType) {
        // Delegar a NodeRenderer (fuente única de verdad)
        return this.nodeRenderer?.isOutOfWorldBounds(x, y, buildingType) || false;
    }
}
