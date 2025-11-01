// ===== GESTOR DE UI DE TIENDA =====

import { getBuildableNodes, getProjectiles, getNodeConfig, getBuildableNodesByRace, getProjectilesByRace } from '../config/nodes.js';
import { getDefaultRace } from '../config/races.js';

export class StoreUIManager {
    constructor(assetManager, buildSystem, game = null) {
        this.assetManager = assetManager;
        this.buildSystem = buildSystem;
        this.game = game; // 🆕 NUEVO: Acceso al juego para obtener configuración del servidor
        
        // Estado de la tienda
        this.isVisible = true; // Visible por defecto
        this.selectedCategory = null; // Sin categoría seleccionada por defecto
        this.currentRace = getDefaultRace(); // Raza actual (por defecto 'default')
        
        // Sistema de hover para tooltips
        this.hoveredItem = null;
        this.hoverStartTime = 0;
        this.hoverDelay = 500; // 500ms antes de mostrar tooltip
        
        // Layout de la UI - esquina superior izquierda, layout vertical
        this.baseResolution = { width: 1920, height: 1080 };
        this.layout = {
            mainWindow: { x: 40, y: 40, w: 292, h: 125 }, // Tamaño real del sprite: 292x125
            deployableWindow: { x: 40, y: 0, w: 292, h: 0 }, // Debajo de main, mismo ancho
            categoryButtons: {
                // Hitboxes más precisas basadas en el sprite real
                buildings: { x: 20, y: 20, w: 100, h: 80 }, // Botón izquierdo (martillo) - más pequeño y centrado
                vehicles: { x: 172, y: 20, w: 100, h: 80 }  // Botón derecho (rueda) - más pequeño y centrado
            },
            itemGrid: { cols: 2, itemSize: 85, padding: 15, gap: 10 } // Botones más grandes
        };
        
        // Categorías de items (se construyen dinámicamente desde config)
        this.updateCategories();
    }
    
    /**
     * Actualiza las categorías dinámicamente desde la configuración (filtrado por raza)
     * 🎯 CORREGIDO: Usa configuración del servidor cuando esté disponible
     */
    updateCategories() {
        // 🎯 SERVIDOR COMO AUTORIDAD: Usar configuración del servidor cuando esté disponible
        let buildableNodes = [];
        let projectileNodes = [];
        
        // Determinar team (multijugador usa myTeam, singleplayer usa 'player1')
        const team = this.game?.myTeam || 'player1';
        
        // Verificar que existe la configuración del servidor
        if (!this.game || !this.game.raceConfigs || !this.game.raceConfigs[team]) {
            // 🎯 FALLBACK TEMPORAL: Si no hay configuración del servidor aún, usar configuración local basada en currentRace
            // Esto puede pasar durante la inicialización antes de que llegue raceConfigs del servidor
            // console.warn(`⚠️ No hay configuración del servidor para team ${team} aún, usando fallback temporal basado en currentRace: ${this.currentRace}`); // Log removido
            
            const allBuildableNodes = getBuildableNodes();
            const allProjectiles = getProjectiles();
            
            // Fallback temporal basado en currentRace
            if (this.currentRace === 'A_Nation') {
                buildableNodes = allBuildableNodes.filter(n => 
                    ['fob', 'antiDrone', 'droneLauncher', 'truckFactory', 'engineerCenter', 'nuclearPlant', 'campaignHospital', 'intelRadio', 'aerialBase', 'vigilanceTower'].includes(n.id)
                );
                projectileNodes = allProjectiles.filter(n => 
                    ['drone', 'sniperStrike'].includes(n.id)
                );
            } else if (this.currentRace === 'B_Nation') {
                buildableNodes = allBuildableNodes.filter(n => 
                    ['intelRadio', 'intelCenter', 'campaignHospital', 'aerialBase', 'antiDrone', 'vigilanceTower'].includes(n.id)
                );
                projectileNodes = allProjectiles.filter(n => 
                    ['fobSabotage', 'sniperStrike', 'specopsCommando'].includes(n.id)
                );
            } else {
                // Fallback genérico: mostrar todos (no debería pasar)
                console.error(`❌ Raza desconocida en fallback: ${this.currentRace}`);
                buildableNodes = allBuildableNodes;
                projectileNodes = allProjectiles;
            }
        } else {
            // Usar configuración del servidor (SERVIDOR COMO AUTORIDAD)
            const myRaceConfig = this.game.raceConfigs[team];
            if (!myRaceConfig || !myRaceConfig.buildings || !myRaceConfig.consumables) {
                console.error(`❌ ERROR CRÍTICO: Configuración de raza incompleta para team ${team}:`, myRaceConfig);
                // No mostrar nada hasta que llegue la configuración completa
                this.categories = {
                    buildings: { name: 'Edificios', icon: 'hammer_wrench', items: [] },
                    vehicles: { name: 'Vehículos', icon: 'wheel', items: [] }
                };
                this.hitRegions = [];
                return;
            }
            
            const availableBuildings = myRaceConfig.buildings || [];
            const availableConsumables = myRaceConfig.consumables || [];
            
            // Obtener todos los nodos construibles y filtrar por los disponibles
            const allBuildableNodes = getBuildableNodes();
            buildableNodes = allBuildableNodes.filter(node => 
                availableBuildings.includes(node.id)
            );
            
            // Obtener todos los proyectiles y filtrar por los disponibles
            const allProjectiles = getProjectiles();
            projectileNodes = allProjectiles.filter(node => 
                availableConsumables.includes(node.id)
            );
            
        }
        
        // console.log(`🏛️ Edificios mostrados en tienda: ${buildableNodes.map(n => n.id).join(', ')}`); // Log removido
        
        this.categories = {
            buildings: {
                name: 'Edificios',
                icon: 'hammer_wrench',
                items: buildableNodes.map(n => n.id)
            },
            vehicles: {
                name: 'Vehículos',
                icon: 'wheel',
                items: projectileNodes.map(n => n.id)
            }
        };
        
        // console.log(`🏛️ CATEGORÍAS FINALES - Edificios (${this.categories.buildings.items.length}): ${this.categories.buildings.items.join(', ')}, Consumibles (${this.categories.vehicles.items.length}): ${this.categories.vehicles.items.join(', ')}`); // Log removido
        
        // Hitboxes para interacción
        this.hitRegions = [];
    }
    
    /**
     * 🆕 Crea configuración de raza para singleplayer desde el servidor
     */
    async createSingleplayerRaceConfig(raceId) {
        try {
            // Importar configuración del servidor
            const raceConfigModule = await import('../../server/config/raceConfig.js');
            const { getServerRaceConfig } = raceConfigModule;
            
            const raceConfig = getServerRaceConfig(raceId);
            if (raceConfig) {
                // Crear raceConfigs en el formato esperado
                if (!this.game.raceConfigs) {
                    this.game.raceConfigs = {};
                }
                
                // En singleplayer, el jugador es 'player1'
                this.game.raceConfigs['player1'] = raceConfig;
                this.game.myTeam = 'player1'; // Asegurar que myTeam esté establecido
                
                
                // Actualizar categorías después de crear la configuración
                this.updateCategories();
            }
        } catch (error) {
            console.error(`❌ Error creando configuración de raza para singleplayer:`, error);
        }
    }
    
    /**
     * Actualiza el layout según el tamaño del canvas
     */
    updateLayout(canvasWidth, canvasHeight) {
        // Posiciones FIJAS en coordenadas del mundo (anclado al mundo, no a la pantalla)
        // Se verá afectado por el zoom de la cámara como cualquier otro sprite
        this.layout.mainWindow.x = 40;
        this.layout.mainWindow.y = 40;
        this.layout.mainWindow.w = 292; // Tamaño real del sprite
        this.layout.mainWindow.h = 125; // Tamaño real del sprite
        
        // Ventana desplegable debajo de la principal
        this.layout.deployableWindow.x = 40;
        this.layout.deployableWindow.w = 292; // Mismo ancho que main window
        
        // Calcular altura dinámica de la ventana desplegable
        const deployableSize = this.calculateDeployableSize();
        this.layout.deployableWindow.h = deployableSize.h;
        
        // Posición debajo de la ventana principal
        this.layout.deployableWindow.y = this.layout.mainWindow.y + this.layout.mainWindow.h;
    }
    
    /**
     * Muestra/oculta la tienda
     */
    toggleStore() {
        // Tutorial: Verificar permisos
        if (this.game.tutorialManager && this.game.tutorialManager.isTutorialActive) {
            if (!this.game.tutorialManager.isActionAllowed('canOpenStore')) {
                return;
            }
        }
        
        this.isVisible = !this.isVisible;
        if (!this.isVisible) {
            this.selectedCategory = null;
        }
    }
    
    /**
     * Selecciona una categoría
     */
    selectCategory(categoryId) {
        if (this.categories[categoryId]) {
            this.selectedCategory = categoryId;
            // 🎯 NUEVO: Forzar actualización de categorías antes de mostrar items
            // Esto asegura que las categorías estén actualizadas con la raza correcta
            this.updateCategories();
            this.updateHitRegions(); // Actualizar hitboxes
        }
    }
    
    /**
     * Obtiene los items de la categoría seleccionada
     */
    getSelectedCategoryItems() {
        if (!this.selectedCategory) return [];
        return this.categories[this.selectedCategory].items;
    }
    
    /**
     * Calcula el tamaño necesario para la ventana desplegable según el contenido
     */
    calculateDeployableSize() {
        if (!this.selectedCategory) return { w: 0, h: 0 };
        
        const items = this.getSelectedCategoryItems();
        const { cols, itemSize, padding, gap } = this.layout.itemGrid;
        const rows = Math.ceil(items.length / cols);
        
        // Calcular altura basada en el grid vertical (2 columnas)
        const contentHeight = (rows * itemSize) + ((rows - 1) * gap) + (padding * 2) + 40; // +40 para margen superior
        
        return {
            w: 292, // Ancho fijo igual a la ventana principal
            h: Math.max(contentHeight, 100) // Mínimo 100px de altura
        };
    }
    
    /**
     * Actualiza las hitboxes para la interacción
     */
    updateHitRegions() {
        this.hitRegions = [];
        
        if (!this.isVisible) return;
        
        // Hitboxes de botones de categoría (en main window)
        const mainWindow = this.layout.mainWindow;
        
        Object.keys(this.categories).forEach(categoryId => {
            const buttonLayout = this.layout.categoryButtons[categoryId];
            this.hitRegions.push({
                id: `category_${categoryId}`,
                x: mainWindow.x + buttonLayout.x,
                y: mainWindow.y + buttonLayout.y,
                w: buttonLayout.w,
                h: buttonLayout.h,
                type: 'category'
            });
        });
        
        // Hitboxes de items en ventana desplegable
        if (this.selectedCategory) {
            const items = this.getSelectedCategoryItems();
            const deployableWindow = this.layout.deployableWindow;
            const { cols, itemSize, padding, gap } = this.layout.itemGrid;
            
            // Calcular posición inicial del grid (centrado horizontalmente) - IGUAL que en renderItemsGrid
            const totalGridWidth = (cols * itemSize) + ((cols - 1) * gap);
            const startX = deployableWindow.x + (deployableWindow.w - totalGridWidth) / 2;
            const startY = deployableWindow.y + padding + 30; // +30 para margen superior - IGUAL que en renderItemsGrid
            
            items.forEach((itemId, index) => {
                const row = Math.floor(index / cols);
                const col = index % cols;
                
                const x = startX + (col * (itemSize + gap));
                const y = startY + (row * (itemSize + gap));
                
                this.hitRegions.push({
                    id: `item_${itemId}`,
                    x: x,
                    y: y,
                    w: itemSize,
                    h: itemSize,
                    type: 'item',
                    itemId: itemId
                });
            });
        }
    }
    
    /**
     * Renderiza el tooltip de descripción del item
     */
    renderTooltip(ctx) {
        if (!this.hoveredItem) return;
        
        const item = this.hoveredItem;
        const padding = 12;
        const titleSize = 16;
        const descSize = 14;
        const costSize = 14;
        
        // Medir texto
        ctx.font = `bold ${titleSize}px Arial`;
        const titleWidth = ctx.measureText(item.name).width;
        
        ctx.font = `${descSize}px Arial`;
        const descWidth = ctx.measureText(item.description).width;
        
        ctx.font = `${costSize}px Arial`;
        const costText = `Costo: ${item.cost}$`;
        const costWidth = ctx.measureText(costText).width;
        
        // Calcular dimensiones del tooltip
        const boxWidth = Math.max(titleWidth, descWidth, costWidth) + padding * 2;
        const boxHeight = titleSize + 8 + descSize + 8 + costSize + padding * 2;
        
        // Posición: debajo del UIFrame de currency
        // Currency está en x=340, y=40, width=210, height=83
        // Tooltip debajo: x=340, y=40+83+10=133
        const tooltipX = 340;
        const tooltipY = 40 + 83 + 10; // Debajo del currency frame
        
        // Fondo del tooltip
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(tooltipX, tooltipY, boxWidth, boxHeight);
        
        // Borde
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(tooltipX, tooltipY, boxWidth, boxHeight);
        
        // Texto del título
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${titleSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(item.name, tooltipX + padding, tooltipY + padding);
        
        // Texto de descripción
        ctx.fillStyle = '#cccccc';
        ctx.font = `${descSize}px Arial`;
        ctx.fillText(item.description, tooltipX + padding, tooltipY + padding + titleSize + 8);
        
        // Texto de costo
        ctx.fillStyle = '#ffd700';
        ctx.font = `${costSize}px Arial`;
        ctx.fillText(costText, tooltipX + padding, tooltipY + padding + titleSize + 8 + descSize + 8);
        
        ctx.restore();
    }
    
    /**
     * Maneja el hover del mouse sobre items de la tienda
     */
    handleMouseMove(mouseX, mouseY) {
        if (!this.isVisible) return;
        
        // Buscar item bajo el cursor
        const hoveredRegion = this.hitRegions.find(region => 
            region.type === 'item' &&
            mouseX >= region.x && mouseX <= region.x + region.w &&
            mouseY >= region.y && mouseY <= region.y + region.h
        );
        
        if (hoveredRegion) {
            const itemId = hoveredRegion.itemId;
            const nodeConfig = getNodeConfig(itemId);
            
            if (nodeConfig && nodeConfig !== this.hoveredItem) {
                this.hoveredItem = nodeConfig;
                this.hoverStartTime = Date.now();
            }
        } else {
            this.hoveredItem = null;
            this.hoverStartTime = 0;
        }
    }
    
    /**
     * Verifica si debe mostrar el tooltip
     */
    shouldShowTooltip() {
        return this.hoveredItem && 
               (Date.now() - this.hoverStartTime) >= this.hoverDelay;
    }
    
    /**
     * Maneja clicks en la UI
     */
    handleClick(mouseX, mouseY) {
        if (!this.isVisible) return false;
        
        // Buscar hitbox clickeada
        const clickedRegion = this.hitRegions.find(region => 
            mouseX >= region.x && mouseX <= region.x + region.w &&
            mouseY >= region.y && mouseY <= region.y + region.h
        );
        
        if (clickedRegion) {
            if (clickedRegion.type === 'category') {
                const categoryId = clickedRegion.id.replace('category_', '');
                this.selectCategory(categoryId);
                this.updateHitRegions(); // Actualizar hitboxes
                return true;
            }
            
            if (clickedRegion.type === 'item') {
                const itemId = clickedRegion.itemId;
                
                // Verificar si el dron está bloqueado
                if (itemId === 'drone' && !this.buildSystem.hasDroneLauncher()) {
                    return true; // Consumir el click pero no activar
                }
                
                // Verificar si el comando está bloqueado
                if (itemId === 'specopsCommando' && !this.buildSystem.hasIntelCenter()) {
                    return true; // Consumir el click pero no activar
                }
                
                this.buildSystem.activateBuildMode(itemId);
                // Ocultar desplegable para no tapar el mapa
                this.selectedCategory = null;
                return true;
            }
        }
        
        // Si no se clickeó en ninguna región Y no hay nada en construcción, cerrar desplegable
        if (!clickedRegion && !this.buildSystem.isActive()) {
            this.selectedCategory = null;
            // NO retornar true aquí - permitir que otros sistemas manejen el click
        }
        
        return false;
    }
    
    /**
     * Renderiza la UI de la tienda
     */
    render(ctx) {
        if (!this.isVisible) return;
        
        this.updateHitRegions();
        
        // Renderizar ventana principal
        this.renderMainWindow(ctx);
        
        // Renderizar ventana desplegable si hay categoría seleccionada
        if (this.selectedCategory) {
            this.renderDeployableWindow(ctx);
        }
        
        // Renderizar tooltip si debe mostrarse
        if (this.shouldShowTooltip()) {
            this.renderTooltip(ctx);
        }
        
        // DEBUG: Renderizar hitboxes (comentar cuando no sea necesario)
        // this.renderDebugHitboxes(ctx);
    }
    
    /**
     * DEBUG: Renderiza las hitboxes para visualizar su posición
     */
    renderDebugHitboxes(ctx) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
        
        this.hitRegions.forEach(region => {
            ctx.strokeRect(region.x, region.y, region.w, region.h);
            ctx.fillRect(region.x, region.y, region.w, region.h);
            
            // Texto con el ID
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.fillText(region.id, region.x + 5, region.y + 15);
            ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
        });
    }
    
    /**
     * Renderiza la ventana principal con botones de categoría
     */
    renderMainWindow(ctx) {
        const mainWindow = this.layout.mainWindow;
        const mainSprite = this.assetManager.getSprite('ui-store-main');
        
        if (mainSprite) {
            ctx.drawImage(mainSprite, mainWindow.x, mainWindow.y, mainWindow.w, mainWindow.h);
        } else {
            // Fallback temporal hasta que tengas los sprites
            ctx.fillStyle = '#1a3a1a';
            ctx.fillRect(mainWindow.x, mainWindow.y, mainWindow.w, mainWindow.h);
            ctx.strokeStyle = '#4a5d23';
            ctx.lineWidth = 3;
            ctx.strokeRect(mainWindow.x, mainWindow.y, mainWindow.w, mainWindow.h);
        }
        
        // Los botones de categoría ya vienen dibujados en el sprite
        // Indicador de selección removido
    }
    
    /**
     * Renderiza indicador de categoría seleccionada
     */
    renderCategorySelection(ctx) {
        const mainWindow = this.layout.mainWindow;
        const buttonLayout = this.layout.categoryButtons[this.selectedCategory];
        
        const buttonX = mainWindow.x + buttonLayout.x;
        const buttonY = mainWindow.y + buttonLayout.y;
        
        // Resaltar categoría seleccionada
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(buttonX - 2, buttonY - 2, buttonLayout.w + 4, buttonLayout.h + 4);
    }
    
    /**
     * Renderiza la ventana desplegable con items
     */
    renderDeployableWindow(ctx) {
        const deployableWindow = this.layout.deployableWindow;
        const deployableSprite = this.assetManager.getSprite('ui-store-deployable');
        
        if (deployableSprite) {
            // 9-Slice: anclar esquinas superiores, estirar hacia abajo
            this.render9SliceVertical(ctx, deployableSprite, deployableWindow);
        } else {
            // Fallback temporal
            ctx.fillStyle = '#1a3a1a';
            ctx.fillRect(deployableWindow.x, deployableWindow.y, deployableWindow.w, deployableWindow.h);
            ctx.strokeStyle = '#4a5d23';
            ctx.lineWidth = 3;
            ctx.strokeRect(deployableWindow.x, deployableWindow.y, deployableWindow.w, deployableWindow.h);
        }
        
        // Renderizar grid de items
        this.renderItemsGrid(ctx, deployableWindow);
    }
    
    /**
     * Renderiza un sprite con 9-slice vertical (anclar esquinas superiores)
     */
    render9SliceVertical(ctx, sprite, destRect) {
        const sliceSize = 20; // Tamaño de las esquinas (ajustar según tu sprite)
        const spriteW = sprite.width;
        const spriteH = sprite.height;
        
        // Esquinas superiores (fijas)
        const topLeft = { x: 0, y: 0, w: sliceSize, h: sliceSize };
        const topRight = { x: spriteW - sliceSize, y: 0, w: sliceSize, h: sliceSize };
        
        // Esquinas inferiores (fijas)
        const bottomLeft = { x: 0, y: spriteH - sliceSize, w: sliceSize, h: sliceSize };
        const bottomRight = { x: spriteW - sliceSize, y: spriteH - sliceSize, w: sliceSize, h: sliceSize };
        
        // Bordes laterales (se repiten verticalmente)
        const leftEdge = { x: 0, y: sliceSize, w: sliceSize, h: spriteH - (sliceSize * 2) };
        const rightEdge = { x: spriteW - sliceSize, y: sliceSize, w: sliceSize, h: spriteH - (sliceSize * 2) };
        
        // Bordes superior e inferior (se estiran horizontalmente)
        const topEdge = { x: sliceSize, y: 0, w: spriteW - (sliceSize * 2), h: sliceSize };
        const bottomEdge = { x: sliceSize, y: spriteH - sliceSize, w: spriteW - (sliceSize * 2), h: sliceSize };
        
        // Centro (se estira en ambas direcciones)
        const center = { x: sliceSize, y: sliceSize, w: spriteW - (sliceSize * 2), h: spriteH - (sliceSize * 2) };
        
        // Dibujar esquinas superiores
        ctx.drawImage(sprite, topLeft.x, topLeft.y, topLeft.w, topLeft.h, 
                     destRect.x, destRect.y, sliceSize, sliceSize);
        ctx.drawImage(sprite, topRight.x, topRight.y, topRight.w, topRight.h, 
                     destRect.x + destRect.w - sliceSize, destRect.y, sliceSize, sliceSize);
        
        // Dibujar esquinas inferiores
        ctx.drawImage(sprite, bottomLeft.x, bottomLeft.y, bottomLeft.w, bottomLeft.h, 
                     destRect.x, destRect.y + destRect.h - sliceSize, sliceSize, sliceSize);
        ctx.drawImage(sprite, bottomRight.x, bottomRight.y, bottomRight.w, bottomRight.h, 
                     destRect.x + destRect.w - sliceSize, destRect.y + destRect.h - sliceSize, sliceSize, sliceSize);
        
        // Dibujar bordes laterales (repetir verticalmente)
        const edgeHeight = destRect.h - (sliceSize * 2);
        const edgeRepeat = Math.ceil(edgeHeight / leftEdge.h);
        for (let i = 0; i < edgeRepeat; i++) {
            const y = destRect.y + sliceSize + (i * leftEdge.h);
            const h = Math.min(leftEdge.h, destRect.y + destRect.h - sliceSize - y);
            ctx.drawImage(sprite, leftEdge.x, leftEdge.y, leftEdge.w, leftEdge.h, 
                         destRect.x, y, sliceSize, h);
            ctx.drawImage(sprite, rightEdge.x, rightEdge.y, rightEdge.w, rightEdge.h, 
                         destRect.x + destRect.w - sliceSize, y, sliceSize, h);
        }
        
        // Dibujar bordes superior e inferior (estirar horizontalmente)
        ctx.drawImage(sprite, topEdge.x, topEdge.y, topEdge.w, topEdge.h, 
                     destRect.x + sliceSize, destRect.y, destRect.w - (sliceSize * 2), sliceSize);
        ctx.drawImage(sprite, bottomEdge.x, bottomEdge.y, bottomEdge.w, bottomEdge.h, 
                     destRect.x + sliceSize, destRect.y + destRect.h - sliceSize, destRect.w - (sliceSize * 2), sliceSize);
        
        // Dibujar centro (estirar en ambas direcciones)
        ctx.drawImage(sprite, center.x, center.y, center.w, center.h, 
                     destRect.x + sliceSize, destRect.y + sliceSize, 
                     destRect.w - (sliceSize * 2), destRect.h - (sliceSize * 2));
    }
    
    /**
     * Renderiza el grid de items
     */
    renderItemsGrid(ctx, deployableWindow) {
        const items = this.getSelectedCategoryItems();
        const { cols, itemSize, padding, gap } = this.layout.itemGrid;
        
        // Calcular posición inicial del grid (centrado horizontalmente)
        const totalGridWidth = (cols * itemSize) + ((cols - 1) * gap);
        const startX = deployableWindow.x + (deployableWindow.w - totalGridWidth) / 2;
        const startY = deployableWindow.y + padding + 30; // +30 para margen superior
        
        items.forEach((itemId, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            
            const x = startX + (col * (itemSize + gap));
            const y = startY + (row * (itemSize + gap));
            
            this.renderItem(ctx, itemId, x, y, itemSize);
        });
    }
    
    /**
     * Renderiza un item individual
     */
    renderItem(ctx, itemId, x, y, size) {
        // Verificar si el dron está bloqueado (requiere lanzadera)
        const isDroneLocked = itemId === 'drone' && !this.buildSystem.hasDroneLauncher();
        
        // Verificar si el comando está bloqueado (requiere centro de inteligencia)
        const isCommandoLocked = itemId === 'specopsCommando' && !this.buildSystem.hasIntelCenter();
        
        // Fondo del botón usando el sprite bton_background
        const buttonBg = this.assetManager.getSprite('ui-button-background');
        
        if (buttonBg) {
            ctx.drawImage(buttonBg, x, y, size, size);
        } else {
            // Fallback temporal
            ctx.fillStyle = '#2a4a2a';
            ctx.fillRect(x, y, size, size);
            ctx.strokeStyle = '#4a5d23';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, size, size);
        }
        
        // Obtener configuración del item
        const config = getNodeConfig(itemId);
        if (!config) return;
        
        // Icono del item (+20% más grande)
        const sprite = this.assetManager.getSprite(config.spriteKey);
        if (sprite) {
            const iconSize = size * 0.9; // +20% adicional (de 0.75 a 0.9)
            const iconX = x + (size - iconSize) / 2;
            const iconY = y + (size - iconSize) / 2 - 8; // Ajustado para el precio
            
            // Si está bloqueado, renderizar en gris
            const isLocked = isDroneLocked || isCommandoLocked;
            if (isLocked) {
                ctx.save();
                ctx.globalAlpha = 0.4;
                ctx.filter = 'grayscale(100%)';
            }
            
            ctx.drawImage(sprite, iconX, iconY, iconSize, iconSize);
            
            if (isLocked) {
                ctx.restore();
            }
        }
        
        // Verificar si se puede permitir (solo si no está bloqueado)
        const canAfford = !isDroneLocked && !isCommandoLocked && this.buildSystem.canAffordBuilding(itemId);
        
        // Precio (más legible) - color rojo si no se puede permitir, gris si está bloqueado
        if (isDroneLocked || isCommandoLocked) {
            ctx.fillStyle = '#888888';
        } else {
            ctx.fillStyle = canAfford ? '#ffffff' : '#ff4444';
        }
        
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        
        const priceY = y + size - 6;
        const priceX = x + size / 2;
        
        // Contorno del precio
        ctx.strokeText(`${config.cost}`, priceX, priceY);
        ctx.fillText(`${config.cost}`, priceX, priceY);
        
        // Si está bloqueado, mostrar mensaje
        if (isDroneLocked) {
            ctx.fillStyle = '#ff6666';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            
            const lockText = 'Necesita lanzadera';
            const lockY = y + size + 2;
            
            ctx.strokeText(lockText, priceX, lockY);
            ctx.fillText(lockText, priceX, lockY);
        }
        
        if (isCommandoLocked) {
            ctx.fillStyle = '#ff6666';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            
            const lockText = 'Necesita centro';
            const lockY = y + size + 2;
            
            ctx.strokeText(lockText, priceX, lockY);
            ctx.fillText(lockText, priceX, lockY);
        }
    }
    
    /**
     * Verifica si un punto está dentro de la UI de la tienda
     */
    isPointInStore(x, y) {
        if (!this.isVisible) return false;
        
        const mainWindow = this.layout.mainWindow;
        if (x >= mainWindow.x && x <= mainWindow.x + mainWindow.w &&
            y >= mainWindow.y && y <= mainWindow.y + mainWindow.h) {
            return true;
        }
        
        if (this.selectedCategory) {
            const size = this.calculateDeployableSize();
            const deployableWindow = {
                ...this.layout.deployableWindow,
                w: size.w,
                h: size.h
            };
            
            if (x >= deployableWindow.x && x <= deployableWindow.x + deployableWindow.w &&
                y >= deployableWindow.y && y <= deployableWindow.y + deployableWindow.h) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Establece la raza actual y actualiza las categorías
     * @param {string} raceId - ID de la raza a establecer
     */
    setRace(raceId) {
        if (this.currentRace !== raceId) {
            this.currentRace = raceId;
            
            // 🎯 NUEVO: En singleplayer, crear configuración desde el servidor si no existe
            if (this.game && (!this.game.isMultiplayer || this.game.isMultiplayer === false)) {
                if (!this.game.raceConfigs || !this.game.raceConfigs['player1']) {
                    this.createSingleplayerRaceConfig(raceId).then(() => {
                        // Actualizar categorías después de crear la configuración
                        this.updateCategories();
                    });
                } else {
                    // Ya existe configuración, solo actualizar
                    this.updateCategories();
                }
            } else {
                // Multijugador: solo actualizar categorías
                this.updateCategories();
            }
            
            this.selectedCategory = null; // Limpiar selección actual
            // console.log(`🏛️ Tienda actualizada para raza: ${raceId}`); // Log removido
        } else {
            // Misma raza, pero forzar actualización por si cambió la configuración
            this.updateCategories();
        }
    }
    
    /**
     * Obtiene la raza actual
     * @returns {string} ID de la raza actual
     */
    getCurrentRace() {
        return this.currentRace;
    }
}
