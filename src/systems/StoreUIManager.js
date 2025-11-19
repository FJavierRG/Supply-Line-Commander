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
        this.currentRace = getDefaultRace(); // Raza actual (por defecto 'default') - DEPRECATED: Mantener para compatibilidad
        this.currentDeckId = null; // 🆕 NUEVO: ID del mazo actualmente seleccionado
        
        // 🆕 NUEVO: Estado del banquillo ingame
        this.benchExpanded = false; // Panel de banquillo colapsado por defecto
        this.swapMode = null; // Modo de permutación: null, { benchUnitId: 'xxx' } cuando se selecciona una carta del bench
        this.localBenchCooldowns = {}; // 🆕 NUEVO: Cooldowns locales para modo single-player
        
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
            itemGrid: { cols: 2, itemSize: 85, padding: 15, gap: 10 }, // Botones más grandes
            // 🆕 NUEVO: Layout del panel de banquillo ingame
            benchPanel: { x: 40, y: 0, w: 292, h: 0 }, // Debajo de deployableWindow, mismo ancho
            benchHeader: { x: 0, y: 0, w: 292, h: 40 }, // Header del banquillo
            benchToggleBtn: { x: 250, y: 5, w: 30, h: 30 }, // Botón toggle
            benchList: { x: 10, y: 45, w: 272, h: 0 } // Lista de cartas del banquillo
        };
        
        // Categorías de items (se construyen dinámicamente desde config)
        this.updateCategories();
    }
    
    /**
     * Actualiza las categorías dinámicamente desde el mazo seleccionado
     * 🎯 NUEVO: Usa el mazo seleccionado en lugar de la configuración de raza
     */
    updateCategories() {
        let buildableNodes = [];
        let projectileNodes = [];
        
        // 🎯 NUEVO: Obtener mazo seleccionado
        let selectedDeck = null;
        
        if (this.currentDeckId && this.game && this.game.deckManager) {
            // Usar el mazo especificado por currentDeckId
            selectedDeck = this.game.deckManager.getDeck(this.currentDeckId);
        } else if (this.game && this.game.deckManager) {
            // Si no hay mazo específico, usar el mazo seleccionado o el predeterminado
            selectedDeck = this.game.deckManager.getSelectedDeck();
            if (!selectedDeck) {
                // Si no hay mazo seleccionado del jugador, usar el predeterminado
                selectedDeck = this.game.deckManager.getDefaultDeck();
            }
        }
        
        if (selectedDeck && selectedDeck.units) {
            // 🎯 NUEVO: Filtrar unidades del mazo por tipo (edificios vs consumibles)
            const allBuildableNodes = getBuildableNodes();
            const allProjectiles = getProjectiles();
            
            // Crear sets de IDs para búsqueda rápida
            const buildableIds = new Set(allBuildableNodes.map(n => n.id));
            const projectileIds = new Set(allProjectiles.map(n => n.id));
            
            // Separar las unidades del mazo en edificios y consumibles
            const deckUnits = selectedDeck.units || [];
            
            buildableNodes = allBuildableNodes.filter(node => 
                deckUnits.includes(node.id) && buildableIds.has(node.id)
            );
            
            projectileNodes = allProjectiles.filter(node => 
                deckUnits.includes(node.id) && projectileIds.has(node.id)
            );
            
            // console.log(`🎴 Tienda cargada desde mazo "${selectedDeck.name}": ${buildableNodes.length} edificios, ${projectileNodes.length} consumibles`);
        } else {
            // ✅ ELIMINADO: Ya no hay fallback por raza, siempre hay mazo
            // Fallback genérico: mostrar todos los nodos disponibles
            buildableNodes = getBuildableNodes();
            projectileNodes = getProjectiles();
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
     * Actualiza el layout según el tamaño del canvas
     * 🆕 NUEVO: Calcula también la posición del panel de banquillo
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
        
        // 🆕 NUEVO: Actualizar posición del panel de banquillo (esquina superior derecha)
        this.layout.benchPanel.w = 292;
        // Posición en esquina superior derecha (ajustar según ancho del canvas)
        this.layout.benchPanel.x = canvasWidth - this.layout.benchPanel.w - 40;
        this.layout.benchPanel.y = 40; // Misma altura que la tienda principal
    }
    
    /**
     * Muestra/oculta la tienda
     */
    toggleStore() {
        // Tutorial simple: no hay interacción
        if (this.game.state === 'tutorial') {
            return;
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
     * 🆕 NUEVO: También maneja clicks en el banquillo y modo permutación
     */
    handleClick(mouseX, mouseY) {
        if (!this.isVisible) return false;
        
        // 🆕 NUEVO: Si está en modo permutación, verificar click en cartas del deck
        if (this.swapMode) {
            // Verificar click en panel de cartas del mazo para permutación (SIEMPRE, sin necesidad de categoría)
            if (this.handleDeckCardsSwapClick(mouseX, mouseY)) {
                return true;
            }
            
            // Buscar si se clickeó en una carta del deck (en la ventana desplegable de la tienda)
            if (this.selectedCategory) {
                const items = this.getSelectedCategoryItems();
                const deployableWindow = this.layout.deployableWindow;
                const { cols, itemSize, padding, gap } = this.layout.itemGrid;
                
                const totalGridWidth = (cols * itemSize) + ((cols - 1) * gap);
                const startX = deployableWindow.x + (deployableWindow.w - totalGridWidth) / 2;
                const startY = deployableWindow.y + padding + 30;
                
                for (let i = 0; i < items.length; i++) {
                    const row = Math.floor(i / cols);
                    const col = i % cols;
                    const x = startX + (col * (itemSize + gap));
                    const y = startY + (row * (itemSize + gap));
                    
                    if (mouseX >= x && mouseX <= x + itemSize &&
                        mouseY >= y && mouseY <= y + itemSize) {
                        // Click en carta del deck durante modo permutación
                        const deckUnitId = items[i];
                        // Verificar que la carta esté en el mazo actual (no solo disponible)
                        const currentDeck = this.getCurrentDeck();
                        if (currentDeck && currentDeck.units && currentDeck.units.includes(deckUnitId)) {
                            return this.handleDeckCardSwapClick(deckUnitId);
                        }
                    }
                }
            }
            
            // Verificar si el click fue en el banquillo (para permitir cambiar de carta del banquillo)
            if (this.handleBenchClick(mouseX, mouseY)) {
                return true; // Click manejado por el banquillo (puede cambiar la carta seleccionada)
            }
            
            // Si se clickeó fuera del panel de cartas del mazo y del banquillo, salir del modo permutación
            // Verificar si fue click en otra parte de la UI
            const clickedRegion = this.hitRegions.find(region => 
                mouseX >= region.x && mouseX <= region.x + region.w &&
                mouseY >= region.y && mouseY <= region.y + region.h
            );
            // Solo salir si no fue click en categoría (para permitir cambiar de categoría sin salir)
            if (!clickedRegion || clickedRegion.type !== 'category') {
                this.exitSwapMode();
            }
            return false; // No consumir el click, dejar que se procese normalmente
        }
        
        // 🆕 NUEVO: Manejar clicks en el panel de banquillo (cuando NO está en modo permutación)
        if (this.handleBenchClick(mouseX, mouseY)) {
            return true;
        }
        
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
                // 🆕 NUEVO: Salir del modo permutación si se cambia de categoría
                if (this.swapMode) {
                    this.exitSwapMode();
                }
                return true;
            }
            
            if (clickedRegion.type === 'item') {
                const itemId = clickedRegion.itemId;
                
                // 🆕 NUEVO: Si está en modo permutación, verificar si la carta está en el deck
                if (this.swapMode) {
                    const currentDeck = this.getCurrentDeck();
                    if (currentDeck && currentDeck.units && currentDeck.units.includes(itemId)) {
                        return this.handleDeckCardSwapClick(itemId);
                    }
                }
                
                // Verificar si el dron está bloqueado
                if (itemId === 'drone' && !this.buildSystem.hasDroneLauncher()) {
                    return true; // Consumir el click pero no activar
                }
                
                // Verificar si el comando está bloqueado
                if (itemId === 'specopsCommando' && !this.buildSystem.hasIntelCenter()) {
                    return true; // Consumir el click pero no activar
                }
                
                // Verificar si el truck assault está bloqueado
                if (itemId === 'truckAssault' && !this.buildSystem.hasIntelCenter()) {
                    return true; // Consumir el click pero no activar
                }
                
                // Verificar si el camera drone está bloqueado
                if (itemId === 'cameraDrone' && !this.buildSystem.hasDroneLauncher()) {
                    return true; // Consumir el click pero no activar
                }
                
                // 🆕 NUEVO: Verificar si el destructor de mundos está bloqueado
                if (itemId === 'worldDestroyer' && !this.buildSystem.hasDeadlyBuild()) {
                    return true; // Consumir el click pero no activar
                }
                
                this.buildSystem.activateBuildMode(itemId);
                // Ocultar desplegable para no tapar el mapa
                this.selectedCategory = null;
                // 🆕 NUEVO: Salir del modo permutación
                if (this.swapMode) {
                    this.exitSwapMode();
                }
                return true;
            }
        }
        
        // Si no se clickeó en ninguna región Y no hay nada en construcción, cerrar desplegable
        if (!clickedRegion && !this.buildSystem.isActive()) {
            this.selectedCategory = null;
            // 🆕 NUEVO: Salir del modo permutación si se clickea fuera
            if (this.swapMode) {
                this.exitSwapMode();
            }
            // NO retornar true aquí - permitir que otros sistemas manejen el click
        }
        
        return false;
    }
    
    /**
     * 🆕 NUEVO: Obtiene el mazo actual
     */
    getCurrentDeck() {
        if (!this.game || !this.game.deckManager) return null;
        
        if (this.currentDeckId) {
            return this.game.deckManager.getDeck(this.currentDeckId);
        } else {
            let selectedDeck = this.game.deckManager.getSelectedDeck();
            if (!selectedDeck) {
                selectedDeck = this.game.deckManager.getDefaultDeck();
            }
            return selectedDeck;
        }
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
        
        // 🆕 NUEVO: Renderizar panel de banquillo ingame
        this.renderBenchPanel(ctx);
        
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
     * 🆕 NUEVO: Resalta cartas del deck durante modo permutación
     */
    renderItemsGrid(ctx, deployableWindow) {
        const items = this.getSelectedCategoryItems();
        const { cols, itemSize, padding, gap } = this.layout.itemGrid;
        
        // Calcular posición inicial del grid (centrado horizontalmente)
        const totalGridWidth = (cols * itemSize) + ((cols - 1) * gap);
        const startX = deployableWindow.x + (deployableWindow.w - totalGridWidth) / 2;
        const startY = deployableWindow.y + padding + 30; // +30 para margen superior
        
        // 🆕 NUEVO: Obtener mazo actual para resaltar cartas durante permutación
        const currentDeck = this.swapMode ? this.getCurrentDeck() : null;
        
        items.forEach((itemId, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            
            const x = startX + (col * (itemSize + gap));
            const y = startY + (row * (itemSize + gap));
            
            // 🆕 NUEVO: Resaltar si está en modo permutación y la carta está en el deck
            const isInDeck = currentDeck && currentDeck.units && currentDeck.units.includes(itemId);
            const isSwapTarget = this.swapMode && isInDeck && itemId !== 'hq' && itemId !== 'fob';
            
            if (isSwapTarget) {
                // Resaltar carta del deck durante permutación
                ctx.save();
                ctx.fillStyle = 'rgba(255, 152, 0, 0.3)';
                ctx.fillRect(x - 2, y - 2, itemSize + 4, itemSize + 4);
                ctx.strokeStyle = '#ff9800';
                ctx.lineWidth = 3;
                ctx.strokeRect(x - 2, y - 2, itemSize + 4, itemSize + 4);
                ctx.restore();
            }
            
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
        
        // Verificar si el truck assault está bloqueado (requiere centro de inteligencia)
        const isTruckAssaultLocked = itemId === 'truckAssault' && !this.buildSystem.hasIntelCenter();
        
        // Verificar si el camera drone está bloqueado (requiere lanzadera de drones)
        const isCameraDroneLocked = itemId === 'cameraDrone' && !this.buildSystem.hasDroneLauncher();
        
        // 🆕 NUEVO: Verificar si el destructor de mundos está bloqueado (requiere Construcción Prohibida)
        const isWorldDestroyerLocked = itemId === 'worldDestroyer' && !this.buildSystem.hasDeadlyBuild();
        
        const isLocked = isDroneLocked || isCommandoLocked || isTruckAssaultLocked || isCameraDroneLocked || isWorldDestroyerLocked;
        
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
        
        // 🆕 NUEVO: Para drones, obtener el costo real considerando el descuento del taller de drones
        let displayCost = config.cost;
        const usesDroneWorkshopDiscount = this.buildSystem?.isDroneWorkshopItem?.(itemId);
        if (usesDroneWorkshopDiscount) {
            displayCost = this.buildSystem.getDroneCost(itemId);
        }
        
        // Icono del item (+20% más grande)
        const sprite = this.assetManager.getSprite(config.spriteKey);
        if (sprite) {
            const iconSize = size * 0.9; // +20% adicional (de 0.75 a 0.9)
            const iconX = x + (size - iconSize) / 2;
            const iconY = y + (size - iconSize) / 2 - 8; // Ajustado para el precio
            
            // Si está bloqueado, renderizar en gris
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
        // 🆕 NUEVO: Para drones, usar el costo real con descuento
        let canAfford = false;
        if (this.buildSystem) {
            if (usesDroneWorkshopDiscount) {
                canAfford = !isLocked && this.game.currency.canAfford(displayCost);
            } else {
                canAfford = !isLocked && this.buildSystem.canAffordBuilding(itemId);
            }
        }
        
        // Precio (más legible) - color rojo si no se puede permitir, gris si está bloqueado
        if (isLocked) {
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
        
        // Contorno del precio (usar displayCost que incluye descuentos)
        ctx.strokeText(`${displayCost}`, priceX, priceY);
        ctx.fillText(`${displayCost}`, priceX, priceY);
        
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
        
        if (isTruckAssaultLocked) {
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
        
        if (isCameraDroneLocked) {
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
        
        // 🆕 NUEVO: Mensaje de bloqueo para Destructor de mundos
        if (isWorldDestroyerLocked) {
            ctx.fillStyle = '#ff6666';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            
            const lockText = 'Requiere Const. Prohibida';
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
     * Establece el mazo actual y actualiza las categorías
     * @param {string} deckId - ID del mazo a establecer
     */
    setDeck(deckId) {
        if (this.currentDeckId !== deckId) {
            this.currentDeckId = deckId;
            this.updateCategories();
            this.selectedCategory = null; // Limpiar selección actual
            // console.log(`🎴 Tienda actualizada para mazo: ${deckId}`);
        } else {
            // Mismo mazo, pero forzar actualización por si cambió el contenido
            this.updateCategories();
        }
    }
    
    /**
     * Establece la raza actual y actualiza las categorías
     * @param {string} raceId - ID de la raza a establecer
     * @deprecated Usar setDeck() en su lugar. Mantenido para compatibilidad.
     */
    setRace(raceId) {
        if (this.currentRace !== raceId) {
            this.currentRace = raceId;
            
            // ✅ ELIMINADO: Ya no hay sistema de naciones, solo actualizar categorías
            this.updateCategories();
            
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
    
    /**
     * 🆕 NUEVO: Obtiene el banquillo del mazo actual
     * @returns {Array<string>} Array de IDs de unidades del banquillo
     */
    getBench() {
        if (!this.game || !this.game.deckManager) return [];
        
        let selectedDeck = null;
        if (this.currentDeckId) {
            selectedDeck = this.game.deckManager.getDeck(this.currentDeckId);
        } else {
            selectedDeck = this.game.deckManager.getSelectedDeck();
            if (!selectedDeck) {
                selectedDeck = this.game.deckManager.getDefaultDeck();
            }
        }
        
        return selectedDeck?.bench || [];
    }
    
    /**
     * 🆕 NUEVO: Renderiza el panel de banquillo ingame (esquina superior derecha)
     */
    renderBenchPanel(ctx) {
        const bench = this.getBench();
        // ✅ FIX: Siempre renderizar el panel (al menos el header) si existe el game y deckManager
        if (!this.game || !this.game.deckManager) return; // Solo no renderizar si no hay sistema de mazos
        
        // Obtener dimensiones del canvas para posicionar en esquina superior derecha
        const canvasWidth = ctx.canvas.width;
        
        // Calcular posición del panel (esquina superior derecha)
        // Usar layout si está actualizado, sino calcular desde canvas
        const benchPanel = {
            x: this.layout.benchPanel.x || (canvasWidth - 292 - 40),
            y: this.layout.benchPanel.y || 40,
            w: this.layout.benchPanel.w || 292,
            h: this.benchExpanded ? this.calculateBenchPanelHeight(bench) : 40 // Solo header si está colapsado
        };
        
        // Renderizar fondo del panel
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.strokeStyle = 'rgba(255, 152, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.fillRect(benchPanel.x, benchPanel.y, benchPanel.w, benchPanel.h);
        ctx.strokeRect(benchPanel.x, benchPanel.y, benchPanel.w, benchPanel.h);
        
        // Renderizar header
        ctx.fillStyle = '#ff9800';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Banquillo', benchPanel.x + 10, benchPanel.y + 20);
        
        // Renderizar contador de puntos
        const benchCost = this.calculateBenchCost();
        // ✅ FIX: Siempre usar el límite del servidor (si no hay deckManager, usar 300 como fallback)
        const benchLimit = this.game?.deckManager?.getBenchPointLimit() || 300;
        ctx.fillStyle = benchCost >= benchLimit ? '#e74c3c' : '#ffffff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`${benchCost}/${benchLimit}`, benchPanel.x + benchPanel.w - 50, benchPanel.y + 20);
        
        // Renderizar botón toggle
        const toggleBtn = {
            x: benchPanel.x + benchPanel.w - 35,
            y: benchPanel.y + 5,
            w: 30,
            h: 30
        };
        
        ctx.fillStyle = 'rgba(255, 152, 0, 0.3)';
        ctx.fillRect(toggleBtn.x, toggleBtn.y, toggleBtn.w, toggleBtn.h);
        ctx.strokeStyle = 'rgba(255, 152, 0, 0.6)';
        ctx.strokeRect(toggleBtn.x, toggleBtn.y, toggleBtn.w, toggleBtn.h);
        
        ctx.fillStyle = '#ff9800';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.benchExpanded ? '▲' : '▼', toggleBtn.x + toggleBtn.w / 2, toggleBtn.y + toggleBtn.h / 2);
        
        // Renderizar lista de cartas si está expandido
        if (this.benchExpanded && bench.length > 0) {
            const itemSize = 60;
            const padding = 10;
            const gap = 8;
            const cols = 2;
            const startX = benchPanel.x + padding;
            const startY = benchPanel.y + 45;
            
            bench.forEach((unitId, index) => {
                const row = Math.floor(index / cols);
                const col = index % cols;
                const x = startX + (col * (itemSize + gap));
                const y = startY + (row * (itemSize + gap));
                
                // Resaltar si está seleccionado para permutación
                if (this.swapMode && this.swapMode.benchUnitId === unitId) {
                    ctx.fillStyle = 'rgba(255, 152, 0, 0.3)';
                    ctx.fillRect(x - 2, y - 2, itemSize + 4, itemSize + 4);
                }
                
                // Renderizar carta
                this.renderBenchCard(ctx, unitId, x, y, itemSize);
            });
        }
        
        ctx.restore();
        
        // 🆕 NUEVO: Si está en modo permutación, renderizar cartas del mazo
        if (this.swapMode) {
            this.renderDeckCardsForSwap(ctx, benchPanel);
        }
    }
    
    /**
     * 🆕 NUEVO: Renderiza las cartas del mazo para permutación
     */
    renderDeckCardsForSwap(ctx, benchPanel) {
        const currentDeck = this.getCurrentDeck();
        if (!currentDeck || !currentDeck.units) return;
        
        // Obtener TODAS las cartas del mazo (excluyendo HQ y FOB) para permutación
        const deckCardsToShow = currentDeck.units.filter(unitId => unitId !== 'hq' && unitId !== 'fob');
        
        if (deckCardsToShow.length === 0) return;
        
        // Renderizar panel de cartas del mazo al lado o abajo del banquillo
        const itemSize = 60;
        const padding = 10;
        const gap = 8;
        const cols = 4; // 🆕 NUEVO: 4 columnas para mostrar más cartas
        const rows = Math.ceil(deckCardsToShow.length / cols);
        const panelWidth = (cols * itemSize) + ((cols - 1) * gap) + (padding * 2);
        // 🆕 NUEVO: Calcular altura completa para mostrar todas las cartas (máximo 600px para no ocupar toda la pantalla)
        const fullHeight = (rows * itemSize) + ((rows - 1) * gap) + (padding * 2) + 40;
        const panelHeight = Math.min(fullHeight, 600); // Máximo 600px de altura
        
        // Posicionar al lado del banquillo (a la izquierda) o abajo si no cabe
        const canvasWidth = ctx.canvas.width;
        let deckPanelX, deckPanelY;
        
        // Intentar al lado izquierdo primero
        if (benchPanel.x - panelWidth - 20 > 0) {
            deckPanelX = benchPanel.x - panelWidth - 20;
            deckPanelY = benchPanel.y;
        } else {
            // Si no cabe, ponerlo abajo
            deckPanelX = benchPanel.x;
            deckPanelY = benchPanel.y + benchPanel.h + 10;
        }
        
        // Renderizar fondo del panel
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.strokeStyle = 'rgba(78, 204, 163, 0.4)';
        ctx.lineWidth = 2;
        ctx.fillRect(deckPanelX, deckPanelY, panelWidth, panelHeight);
        ctx.strokeRect(deckPanelX, deckPanelY, panelWidth, panelHeight);
        
        // Renderizar header
        ctx.fillStyle = '#4ecca3';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Tu Mazo (permutar)', deckPanelX + 10, deckPanelY + 20);
        
        // Renderizar TODAS las cartas (sin límite de visibles)
        const startX = deckPanelX + padding;
        const startY = deckPanelY + 45;
        
        deckCardsToShow.forEach((unitId, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            const x = startX + (col * (itemSize + gap));
            const y = startY + (row * (itemSize + gap));
            
            // Solo renderizar si está dentro del panel visible
            if (y + itemSize <= deckPanelY + panelHeight - padding) {
                // Resaltar como objetivo de permutación
                ctx.fillStyle = 'rgba(78, 204, 163, 0.2)';
                ctx.fillRect(x - 2, y - 2, itemSize + 4, itemSize + 4);
                ctx.strokeStyle = '#4ecca3';
                ctx.lineWidth = 2;
                ctx.strokeRect(x - 2, y - 2, itemSize + 4, itemSize + 4);
                
                // Renderizar carta (usar estilo verde para diferenciarlo del banquillo)
                this.renderDeckCardForSwap(ctx, unitId, x, y, itemSize);
            }
        });
        
        // Mostrar indicador si hay más cartas fuera del panel visible
        const maxVisibleRows = Math.floor((panelHeight - 45 - padding) / (itemSize + gap));
        const visibleCards = maxVisibleRows * cols;
        if (deckCardsToShow.length > visibleCards) {
            ctx.fillStyle = 'rgba(78, 204, 163, 0.8)';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`+${deckCardsToShow.length - visibleCards} más (scroll)`, deckPanelX + panelWidth / 2, deckPanelY + panelHeight - 15);
        }
        
        ctx.restore();
    }
    
    /**
     * 🆕 NUEVO: Calcula la altura del panel de banquillo
     */
    calculateBenchPanelHeight(bench) {
        if (bench.length === 0) return 40; // Solo header
        
        const itemSize = 60;
        const gap = 8;
        const cols = 2;
        const rows = Math.ceil(bench.length / cols);
        const contentHeight = (rows * itemSize) + ((rows - 1) * gap) + 45; // +45 para header
        
        return Math.max(40, contentHeight);
    }
    
    /**
     * 🆕 NUEVO: Calcula el costo del banquillo
     */
    calculateBenchCost() {
        const bench = this.getBench();
        if (!this.game || !this.game.deckManager) return 0;
        return this.game.deckManager.calculateBenchCost(bench);
    }
    
    /**
     * 🆕 NUEVO: Obtiene el tiempo de juego actual (local o del servidor)
     * @returns {number} Tiempo de juego en segundos
     */
    getCurrentGameTime() {
        // Intentar obtener del servidor primero
        if (this.game && this.game.network && this.game.network.lastGameState) {
            return this.game.network.lastGameState.gameTime || 0;
        }
        
        // Fallback: calcular desde el inicio de la partida local
        if (this.game && this.game.matchStats && this.game.matchStats.startTime) {
            return (Date.now() - this.game.matchStats.startTime) / 1000;
        }
        
        // Si no hay partida iniciada, usar tiempo desde que se creó el StoreUIManager
        if (!this._localGameStartTime) {
            this._localGameStartTime = Date.now();
        }
        return (Date.now() - this._localGameStartTime) / 1000;
    }
    
    /**
     * 🆕 NUEVO: Obtiene el tiempo restante de cooldown de una carta del banquillo
     * @param {string} unitId - ID de la unidad
     * @returns {number} Tiempo restante en segundos (0 si no está en cooldown)
     */
    getBenchCooldownRemaining(unitId) {
        const gameTime = this.getCurrentGameTime();
        
        // Intentar obtener cooldowns del servidor primero
        if (this.game && this.game.network && this.game.network.lastGameState) {
            const gameState = this.game.network.lastGameState;
            const benchCooldowns = gameState.benchCooldowns || {};
            const myTeam = this.game.network.myTeam || 'player1';
            const teamCooldowns = benchCooldowns[myTeam] || {};
            
            if (teamCooldowns[unitId]) {
                const cooldownEndTime = teamCooldowns[unitId];
                const remaining = cooldownEndTime - gameTime;
                return Math.max(0, remaining);
            }
        }
        
        // Fallback: usar cooldowns locales
        if (this.localBenchCooldowns[unitId]) {
            const cooldownEndTime = this.localBenchCooldowns[unitId];
            const remaining = cooldownEndTime - gameTime;
            return Math.max(0, remaining);
        }
        
        return 0;
    }
    
    /**
     * 🆕 NUEVO: Verifica si una carta del banquillo está en cooldown
     * @param {string} unitId - ID de la unidad
     * @returns {boolean} True si está en cooldown
     */
    isBenchCardOnCooldown(unitId) {
        return this.getBenchCooldownRemaining(unitId) > 0;
    }
    
    /**
     * 🆕 NUEVO: Renderiza una carta del banquillo
     */
    renderBenchCard(ctx, unitId, x, y, size) {
        const config = getNodeConfig(unitId);
        if (!config) return;
        
        const isOnCooldown = this.isBenchCardOnCooldown(unitId);
        const cooldownRemaining = this.getBenchCooldownRemaining(unitId);
        const COOLDOWN_DURATION = 60; // 1 minuto
        // El progreso va de 0 (cooldown completo) a 1 (cooldown terminado)
        // Cuando cooldownRemaining es 60, progress es 0; cuando es 0, progress es 1
        const cooldownProgress = isOnCooldown ? (1 - (cooldownRemaining / COOLDOWN_DURATION)) : 1;
        
        // Fondo (naranja para banquillo, más oscuro si está en cooldown)
        ctx.fillStyle = isOnCooldown ? 'rgba(100, 100, 100, 0.3)' : 'rgba(255, 152, 0, 0.2)';
        ctx.strokeStyle = isOnCooldown ? 'rgba(100, 100, 100, 0.5)' : 'rgba(255, 152, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, size, size);
        ctx.strokeRect(x, y, size, size);
        
        // Icono (en gris si está en cooldown)
        const sprite = this.assetManager.getSprite(config.spriteKey);
        if (sprite) {
            const iconSize = size * 0.7;
            const iconX = x + (size - iconSize) / 2;
            const iconY = y + (size - iconSize) / 2 - 8; // Ajustado para el precio
            
            ctx.save();
            if (isOnCooldown) {
                // Aplicar filtro de gris
                ctx.globalAlpha = 0.5;
                ctx.filter = 'grayscale(100%)';
            }
            ctx.drawImage(sprite, iconX, iconY, iconSize, iconSize);
            ctx.restore();
        }
        
        // 🆕 NUEVO: Renderizar anillo de progreso de cooldown
        if (isOnCooldown && this.game && this.game.renderer && this.game.renderer.renderProgressRing) {
            const centerX = x + size / 2;
            const centerY = y + size / 2;
            const ringRadius = size / 2 - 2;
            
            // Usar la función renderProgressRing del RenderSystem (sin pulso)
            this.game.renderer.renderProgressRing(centerX, centerY, ringRadius, cooldownProgress, {
                width: 3,
                colorStart: { r: 255, g: 100, b: 0 }, // Naranja
                colorEnd: { r: 255, g: 200, b: 0 },   // Naranja claro
                pulse: false, // 🆕 NUEVO: Sin efecto de pulso
                backgroundAlpha: 0.3
            });
            
            // 🆕 NUEVO: Mostrar segundos restantes en el centro
            const secondsRemaining = Math.ceil(cooldownRemaining);
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Sombra/contorno para mejor legibilidad
            ctx.strokeText(`${secondsRemaining}`, centerX, centerY);
            ctx.fillText(`${secondsRemaining}`, centerX, centerY);
            ctx.restore();
        } else if (isOnCooldown && (!this.game || !this.game.renderer || !this.game.renderer.renderProgressRing)) {
            // Debug: si no se puede renderizar el anillo, mostrar un mensaje
            console.warn('⚠️ No se puede renderizar anillo de cooldown: renderer no disponible');
        }
        
        // Precio (solo mostrar si no está en cooldown, para no tapar el contador)
        if (!isOnCooldown) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`${config.cost || 0}`, x + size / 2, y + size - 4);
        }
    }
    
    /**
     * 🆕 NUEVO: Renderiza una carta del mazo para permutación (estilo verde)
     */
    renderDeckCardForSwap(ctx, unitId, x, y, size) {
        const config = getNodeConfig(unitId);
        if (!config) return;
        
        // Fondo (verde para mazo)
        ctx.fillStyle = 'rgba(78, 204, 163, 0.2)';
        ctx.strokeStyle = 'rgba(78, 204, 163, 0.5)';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, size, size);
        ctx.strokeRect(x, y, size, size);
        
        // Icono
        const sprite = this.assetManager.getSprite(config.spriteKey);
        if (sprite) {
            const iconSize = size * 0.7;
            const iconX = x + (size - iconSize) / 2;
            const iconY = y + (size - iconSize) / 2 - 8; // Ajustado para el precio
            ctx.drawImage(sprite, iconX, iconY, iconSize, iconSize);
        }
        
        // Precio
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${config.cost || 0}`, x + size / 2, y + size - 4);
    }
    
    /**
     * 🆕 NUEVO: Maneja clicks en el panel de banquillo
     */
    handleBenchClick(mouseX, mouseY) {
        const bench = this.getBench();
        if (bench.length === 0) return false;
        
        // Obtener dimensiones del canvas para calcular posición
        const canvasWidth = this.game?.canvas?.width || 1920;
        
        // Calcular posición del panel (esquina superior derecha)
        const benchPanel = {
            x: this.layout.benchPanel.x || (canvasWidth - 292 - 40),
            y: this.layout.benchPanel.y || 40,
            w: 292,
            h: this.benchExpanded ? this.calculateBenchPanelHeight(bench) : 40
        };
        
        // Verificar click en el header (toggle)
        const headerY = benchPanel.y;
        const headerH = 40;
        if (mouseX >= benchPanel.x && mouseX <= benchPanel.x + benchPanel.w &&
            mouseY >= headerY && mouseY <= headerY + headerH) {
            // Click en botón toggle
            const toggleBtn = {
                x: benchPanel.x + benchPanel.w - 35,
                y: benchPanel.y + 5,
                w: 30,
                h: 30
            };
            
            if (mouseX >= toggleBtn.x && mouseX <= toggleBtn.x + toggleBtn.w &&
                mouseY >= toggleBtn.y && mouseY <= toggleBtn.y + toggleBtn.h) {
                this.benchExpanded = !this.benchExpanded;
                return true;
            }
            
            // Click en el header (también toggle)
            this.benchExpanded = !this.benchExpanded;
            return true;
        }
        
        // Verificar click en cartas si está expandido
        if (this.benchExpanded) {
            const itemSize = 60;
            const padding = 10;
            const gap = 8;
            const cols = 2;
            const startX = benchPanel.x + padding;
            const startY = benchPanel.y + 45;
            
            for (let i = 0; i < bench.length; i++) {
                const row = Math.floor(i / cols);
                const col = i % cols;
                const x = startX + (col * (itemSize + gap));
                const y = startY + (row * (itemSize + gap));
                
                if (mouseX >= x && mouseX <= x + itemSize &&
                    mouseY >= y && mouseY <= y + itemSize) {
                    // 🆕 NUEVO: Verificar cooldown antes de entrar en modo permutación
                    const unitId = bench[i];
                    if (this.isBenchCardOnCooldown(unitId)) {
                        // No permitir permutación si está en cooldown
                        const remaining = this.getBenchCooldownRemaining(unitId);
                        console.log(`⏱️ Carta ${unitId} está en cooldown (${remaining.toFixed(1)}s restantes)`);
                        return true; // Consumir el click pero no hacer nada
                    }
                    
                    // Click en carta del banquillo → entrar en modo permutación
                    this.enterSwapMode(unitId);
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * 🆕 NUEVO: Entra en modo permutación (click en carta del banquillo)
     */
    enterSwapMode(benchUnitId) {
        this.swapMode = { benchUnitId };
        console.log('🔄 Modo permutación activado:', benchUnitId);
    }
    
    /**
     * 🆕 NUEVO: Sale del modo permutación
     */
    exitSwapMode() {
        this.swapMode = null;
    }
    
    /**
     * 🆕 NUEVO: Maneja clicks en el panel de cartas del mazo para permutación
     */
    handleDeckCardsSwapClick(mouseX, mouseY) {
        if (!this.swapMode) return false;
        
        const currentDeck = this.getCurrentDeck();
        if (!currentDeck || !currentDeck.units) return false;
        
        // Obtener TODAS las cartas del mazo (excluyendo HQ y FOB)
        const deckCardsToShow = currentDeck.units.filter(unitId => unitId !== 'hq' && unitId !== 'fob');
        
        if (deckCardsToShow.length === 0) return false;
        
        // Calcular posición del panel de cartas del mazo
        const canvasWidth = this.game?.canvas?.width || 1920;
        
        const bench = this.getBench();
        const benchPanel = {
            x: this.layout.benchPanel.x || (canvasWidth - 292 - 40),
            y: this.layout.benchPanel.y || 40,
            w: 292,
            h: this.benchExpanded ? this.calculateBenchPanelHeight(bench) : 40
        };
        
        const itemSize = 60;
        const padding = 10;
        const gap = 8;
        const cols = 4; // Mismo que en render
        const rows = Math.ceil(deckCardsToShow.length / cols);
        const panelWidth = (cols * itemSize) + ((cols - 1) * gap) + (padding * 2);
        const fullHeight = (rows * itemSize) + ((rows - 1) * gap) + (padding * 2) + 40;
        const panelHeight = Math.min(fullHeight, 600); // Mismo que en render
        
        let deckPanelX, deckPanelY;
        if (benchPanel.x - panelWidth - 20 > 0) {
            deckPanelX = benchPanel.x - panelWidth - 20;
            deckPanelY = benchPanel.y;
        } else {
            deckPanelX = benchPanel.x;
            deckPanelY = benchPanel.y + benchPanel.h + 10;
        }
        
        // Verificar si el click está en el panel
        if (mouseX < deckPanelX || mouseX > deckPanelX + panelWidth ||
            mouseY < deckPanelY || mouseY > deckPanelY + panelHeight) {
            return false;
        }
        
        // Verificar si el click está en una carta (excluyendo el header)
        if (mouseY < deckPanelY + 45) return false;
        
        const startX = deckPanelX + padding;
        const startY = deckPanelY + 45;
        const relativeX = mouseX - startX;
        const relativeY = mouseY - startY;
        
        // Verificar que el click esté dentro del área de cartas
        if (relativeX < 0 || relativeY < 0) return false;
        
        const col = Math.floor(relativeX / (itemSize + gap));
        const row = Math.floor(relativeY / (itemSize + gap));
        
        // Verificar que el click esté dentro de una carta (no en el espacio entre cartas)
        const cardX = col * (itemSize + gap);
        const cardY = row * (itemSize + gap);
        if (relativeX < cardX || relativeX > cardX + itemSize ||
            relativeY < cardY || relativeY > cardY + itemSize) {
            return false;
        }
        
        const index = row * cols + col;
        
        // Verificar que el índice sea válido (puede haber cartas fuera del área visible)
        if (index >= 0 && index < deckCardsToShow.length) {
            // Verificar que la carta esté dentro del área visible del panel
            const cardAbsoluteY = deckPanelY + 45 + cardY;
            if (cardAbsoluteY + itemSize <= deckPanelY + panelHeight - padding) {
                const deckUnitId = deckCardsToShow[index];
                return this.handleDeckCardSwapClick(deckUnitId);
            }
        }
        
        return false;
    }
    
    /**
     * 🆕 NUEVO: Maneja click en carta del deck durante modo permutación
     */
    handleDeckCardSwapClick(deckUnitId) {
        if (!this.swapMode) return false;
        
        const benchUnitId = this.swapMode.benchUnitId;
        
        // Enviar permutación al servidor
        if (this.game && this.game.networkManager && this.game.networkManager.isMultiplayer) {
            this.game.networkManager.socket.emit('swap_card', {
                roomId: this.game.networkManager.roomId,
                deckUnitId: deckUnitId,
                benchUnitId: benchUnitId
            });
        } else {
            // Modo local (tutorial o single player) - permutar directamente
            this.performLocalSwap(deckUnitId, benchUnitId);
        }
        
        this.exitSwapMode();
        return true;
    }
    
    /**
     * 🆕 NUEVO: Realiza permutación local (sin servidor)
     */
    performLocalSwap(deckUnitId, benchUnitId) {
        if (!this.game || !this.game.deckManager) return false;
        
        let selectedDeck = null;
        if (this.currentDeckId) {
            selectedDeck = this.game.deckManager.getDeck(this.currentDeckId);
        } else {
            selectedDeck = this.game.deckManager.getSelectedDeck();
            if (!selectedDeck) {
                selectedDeck = this.game.deckManager.getDefaultDeck();
            }
        }
        
        if (!selectedDeck || !selectedDeck.units || !selectedDeck.bench) return false;
        
        // 🆕 NUEVO: NO validar límites de puntos durante la permutación ingame
        // Los límites solo se aplican en el editor. Durante la partida, se puede permutar libremente.
        // Solo validar que las unidades existan y que no se intente intercambiar el HQ
        if (!selectedDeck.units.includes(deckUnitId)) {
            console.error('La unidad no está en el mazo');
            return false;
        }
        
        if (!selectedDeck.bench.includes(benchUnitId)) {
            console.error('La unidad no está en el banquillo');
            return false;
        }
        
        if (deckUnitId === 'hq' || deckUnitId === 'fob') {
            console.error('No se puede intercambiar el HQ ni el FOB');
            return false;
        }
        
        // 🆕 NUEVO: Verificar cooldown de la carta que entra al banquillo
        if (this.isBenchCardOnCooldown(benchUnitId)) {
            const remaining = this.getBenchCooldownRemaining(benchUnitId);
            console.log(`⏱️ Carta ${benchUnitId} está en cooldown (${remaining.toFixed(1)}s restantes)`);
            return false;
        }
        
        // Realizar permutación
        const deckIndex = selectedDeck.units.indexOf(deckUnitId);
        const benchIndex = selectedDeck.bench.indexOf(benchUnitId);
        
        if (deckIndex >= 0 && benchIndex >= 0) {
            selectedDeck.units[deckIndex] = benchUnitId;
            selectedDeck.bench[benchIndex] = deckUnitId;
            
            // 🆕 NUEVO: Establecer cooldown local para la carta que entra al banquillo
            const gameTime = this.getCurrentGameTime();
            const COOLDOWN_DURATION = 60; // 1 minuto
            this.localBenchCooldowns[deckUnitId] = gameTime + COOLDOWN_DURATION;
            console.log(`⏱️ Cooldown local establecido para ${deckUnitId} (gameTime: ${gameTime.toFixed(1)}, cooldown hasta: ${this.localBenchCooldowns[deckUnitId].toFixed(1)})`);
            
            // 🆕 NUEVO: Limpiar cooldown de la carta que sale del banquillo
            if (this.localBenchCooldowns[benchUnitId]) {
                delete this.localBenchCooldowns[benchUnitId];
                console.log(`✅ Cooldown local limpiado para ${benchUnitId} (salió del banquillo)`);
            }
            
            // Actualizar la tienda para reflejar los cambios
            this.updateCategories();
            console.log('🔄 Permutación local realizada:', deckUnitId, '↔', benchUnitId);
            return true;
        }
        
        return false;
    }
}
