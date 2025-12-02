// ===== GESTOR DE UI DE TIENDA =====

import { getBuildableNodes, getProjectiles, getNodeConfig, getBuildableNodesByRace, getProjectilesByRace } from '../../config/nodes.js';
import { getDefaultRace } from '../../config/races.js';

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
        this.gameDeckCopy = null; // ✅ Copia temporal del mazo durante la partida (NO modifica el original)
        
        // 🆕 NUEVO: Estado del banquillo ingame
        this.benchExpanded = false; // Panel de banquillo colapsado por defecto
        this.swapMode = null; // Modo de permutación: null, { benchUnitId: 'xxx' } cuando se selecciona una carta del bench
        this.localBenchCooldowns = {}; // 🆕 NUEVO: Cooldowns locales para modo single-player
        
        // Sistema de hover para tooltips
        this.hoveredItem = null;
        this.hoverStartTime = 0;
        this.hoverDelay = 500; // 500ms antes de mostrar tooltip
        
        // Layout de la UI - SOLO ventanas desplegables
        // 🔧 REFACTOR: mainWindow y categoryButtons ahora están en TopBarManager
        this.baseResolution = { width: 1920, height: 1080 };
        this.layout = {
            // Altura del banner superior (desde TopBarManager)
            topBarHeight: 80,
            
            // Ventana desplegable debajo del banner
            deployableWindow: { x: 0, y: 0, w: 292, h: 0 },
            itemGrid: { cols: 2, itemSize: 85, padding: 15, gap: 10 }, // Botones más grandes
            
            // 🆕 NUEVO: Layout del panel de banquillo ingame
            benchPanel: { x: 0, y: 0, w: 292, h: 0 },
            benchHeader: { x: 0, y: 0, w: 292, h: 40 }, // Header del banquillo
            benchToggleBtn: { x: 250, y: 5, w: 30, h: 30 }, // Botón toggle
            benchList: { x: 10, y: 45, w: 272, h: 0 } // Lista de cartas del banquillo
        };
        
        // Categorías de items (se construyen dinámicamente desde config)
        this.updateCategories();
    }
    
    /**
     * Actualiza las categorías dinámicamente desde el mazo seleccionado
     * ✅ FIX: Usa getCurrentDeck() para obtener la copia temporal durante la partida
     * 🎯 NUEVO: Usa el mazo seleccionado en lugar de la configuración de raza
     */
    updateCategories() {
        let buildableNodes = [];
        let projectileNodes = [];
        
        // ✅ FIX: Usar getCurrentDeck() que devuelve la copia temporal si existe
        const selectedDeck = this.getCurrentDeck();
        
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
     * 🔧 REFACTOR: Ahora solo calcula posición de desplegables bajo el banner
     */
    updateLayout(canvasWidth, canvasHeight, topBarIconX = 40) {
        const topBarHeight = this.layout.topBarHeight;
        
        // Ventana desplegable debajo del icono de la tienda en el banner
        // topBarIconX es la posición X del icono clickeado (pasado desde TopBarManager)
        this.layout.deployableWindow.x = topBarIconX;
        this.layout.deployableWindow.w = 292;
        
        // Calcular altura dinámica de la ventana desplegable
        const deployableSize = this.calculateDeployableSize();
        this.layout.deployableWindow.h = deployableSize.h;
        
        // Posición debajo del banner
        this.layout.deployableWindow.y = topBarHeight;
        
        // 🆕 NUEVO: Actualizar posición del panel de banquillo (bajo el icono de bench)
        this.layout.benchPanel.w = 292;
        // La posición X se calculará cuando se renderice (desde TopBarManager)
        this.layout.benchPanel.y = topBarHeight; // Bajo el banner
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
     * 🔧 REFACTOR: Solo hitboxes de items en desplegable (categorías en TopBarManager)
     */
    updateHitRegions() {
        this.hitRegions = [];
        
        if (!this.isVisible) return;
        
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
     * 🔧 REFACTOR: Solo maneja clicks en desplegables y banquillo (no categorías)
     */
    handleClick(mouseX, mouseY) {
        if (!this.isVisible) return false;
        
        // Obtener la posición del icono del bench (guardada durante el render)
        const benchIconX = this._lastBenchIconX || null;
        
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
            if (this.handleBenchClick(mouseX, mouseY, benchIconX)) {
                return true; // Click manejado por el banquillo (puede cambiar la carta seleccionada)
            }
            
            // 🆕 FIX: Verificar si el click está fuera del bench panel y del deck cards panel
            // Si está fuera de ambos, cerrar el modo swap (igual que la tienda)
            const bench = this.getBench();
            const topBarHeight = this.layout.topBarHeight;
            const benchX = benchIconX || this.layout.benchPanel.x;
            
            const benchPanel = {
                x: benchX,
                y: topBarHeight,
                w: 292,
                h: this.benchExpanded ? this.calculateBenchPanelHeight(bench) : 0
            };
            
            // Calcular posición del panel de cartas del deck
            const currentDeck = this.getCurrentDeck();
            const deckCardsToShow = currentDeck && currentDeck.units ? 
                currentDeck.units.filter(unitId => unitId !== 'hq' && unitId !== 'fob') : [];
            
            let deckPanelX = 0, deckPanelY = 0, deckPanelW = 0, deckPanelH = 0;
            if (deckCardsToShow.length > 0) {
                const itemSize = 60;
                const padding = 10;
                const gap = 8;
                const cols = 4;
                const rows = Math.ceil(deckCardsToShow.length / cols);
                deckPanelW = (cols * itemSize) + ((cols - 1) * gap) + (padding * 2);
                const fullHeight = (rows * itemSize) + ((rows - 1) * gap) + (padding * 2) + 40;
                deckPanelH = Math.min(fullHeight, 600);
                
                if (benchPanel.x - deckPanelW - 20 > 0) {
                    deckPanelX = benchPanel.x - deckPanelW - 20;
                    deckPanelY = benchPanel.y;
                } else {
                    deckPanelX = benchPanel.x;
                    deckPanelY = benchPanel.y + benchPanel.h + 10;
                }
            }
            
            // Verificar si el click está dentro del bench panel
            const isInBenchPanel = mouseX >= benchPanel.x && mouseX <= benchPanel.x + benchPanel.w &&
                                   mouseY >= benchPanel.y && mouseY <= benchPanel.y + benchPanel.h;
            
            // Verificar si el click está dentro del deck cards panel
            const isInDeckPanel = deckPanelW > 0 && 
                                  mouseX >= deckPanelX && mouseX <= deckPanelX + deckPanelW &&
                                  mouseY >= deckPanelY && mouseY <= deckPanelY + deckPanelH;
            
            // Si el click está fuera de ambos paneles, cerrar el modo swap
            if (!isInBenchPanel && !isInDeckPanel) {
                this.exitSwapMode();
                return false; // No consumir el click, dejar que se procese normalmente
            }
            
            return false; // Click está dentro de algún panel pero no en una carta específica
        }
        
        // 🆕 NUEVO: Manejar clicks en el panel de banquillo (cuando NO está en modo permutación)
        if (this.handleBenchClick(mouseX, mouseY, benchIconX)) {
            return true;
        }
        
        // 🆕 FIX: Si el bench está expandido pero no en modo swap, cerrar si se clickea fuera
        if (this.benchExpanded && !this.swapMode) {
            const bench = this.getBench();
            const topBarHeight = this.layout.topBarHeight;
            const benchX = benchIconX || this.layout.benchPanel.x;
            
            const benchPanel = {
                x: benchX,
                y: topBarHeight,
                w: 292,
                h: this.calculateBenchPanelHeight(bench)
            };
            
            // Verificar si el click está fuera del bench panel
            const isInBenchPanel = mouseX >= benchPanel.x && mouseX <= benchPanel.x + benchPanel.w &&
                                   mouseY >= benchPanel.y && mouseY <= benchPanel.y + benchPanel.h;
            
            if (!isInBenchPanel) {
                // Cerrar el bench panel (igual que la tienda)
                this.benchExpanded = false;
                // No retornar true aquí - permitir que otros sistemas manejen el click
            }
        }
        
        // Buscar hitbox clickeada en items del desplegable
        const clickedRegion = this.hitRegions.find(region => 
            mouseX >= region.x && mouseX <= region.x + region.w &&
            mouseY >= region.y && mouseY <= region.y + region.h
        );
        
        if (clickedRegion && clickedRegion.type === 'item') {
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
     * ✅ FIX: Si hay una copia temporal del mazo (durante la partida), la usa
     * Los cambios durante la partida NO afectan el mazo original
     */
    getCurrentDeck() {
        // ✅ Si hay copia temporal (durante partida), usar esa
        if (this.gameDeckCopy) {
            return {
                units: [...this.gameDeckCopy.units],
                bench: [...(this.gameDeckCopy.bench || [])],
                id: this.currentDeckId
            };
        }
        
        // Si no hay copia temporal, usar el mazo original
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
     * ✅ Inicializa la copia temporal del mazo al iniciar la partida
     * Esta copia se usa durante la partida, NO modifica el mazo original
     */
    initializeGameDeckCopy() {
        // ✅ Obtener el mazo original directamente (sin usar getCurrentDeck que podría devolver la copia)
        if (!this.game || !this.game.deckManager) return;
        
        let originalDeck = null;
        if (this.currentDeckId) {
            originalDeck = this.game.deckManager.getDeck(this.currentDeckId);
        } else {
            originalDeck = this.game.deckManager.getSelectedDeck();
            if (!originalDeck) {
                originalDeck = this.game.deckManager.getDefaultDeck();
            }
        }
        
        if (originalDeck) {
            this.gameDeckCopy = {
                units: [...originalDeck.units],
                bench: [...(originalDeck.bench || [])]
            };
        }
    }
    
    /**
     * ✅ Limpia la copia temporal del mazo (al terminar la partida)
     */
    clearGameDeckCopy() {
        this.gameDeckCopy = null;
    }
    
    /**
     * Renderiza la UI de la tienda (solo desplegables y bench)
     * 🔧 REFACTOR: mainWindow ahora se renderiza en TopBarManager
     */
    render(ctx, benchIconX = null) {
        if (!this.isVisible) return;
        
        // Guardar benchIconX para uso en handleClick
        this._lastBenchIconX = benchIconX;
        
        this.updateHitRegions();
        
        // Renderizar ventana desplegable si hay categoría seleccionada
        if (this.selectedCategory) {
            this.renderDeployableWindow(ctx);
        }
        
        // 🔧 REFACTOR: Renderizar panel de banquillo SOLO si está expandido (igual que tienda)
        if (this.benchExpanded) {
            this.renderBenchPanel(ctx, benchIconX);
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
     * ✅ Helper genérico: Verifica si un item está bloqueado por requisitos
     * Usa buildRequirements del servidor como fuente única de verdad
     * @param {string} itemId - ID del item a verificar
     * @returns {{ isLocked: boolean, missingRequirements: Array<string>, lockMessage: string|null }}
     */
    checkItemRequirements(itemId) {
        // Obtener buildRequirements del servidor
        const serverConfig = this.game?.serverBuildingConfig;
        if (!serverConfig || !serverConfig.buildRequirements) {
            return { isLocked: false, missingRequirements: [], lockMessage: null };
        }
        
        const reqConfig = serverConfig.buildRequirements[itemId];
        if (!reqConfig || !reqConfig.required || !Array.isArray(reqConfig.required)) {
            return { isLocked: false, missingRequirements: [], lockMessage: null };
        }
        
        const myTeam = this.game?.myTeam || 'ally';
        const missingRequirements = [];
        
        // Verificar cada requisito
        for (const requiredType of reqConfig.required) {
            const hasRequired = this.game?.nodes?.some(n =>
                n.type === requiredType &&
                n.team === myTeam &&
                n.constructed &&
                !n.isAbandoning &&
                !n.disabled &&
                n.active
            );
            
            if (!hasRequired) {
                missingRequirements.push(requiredType);
            }
        }
        
        if (missingRequirements.length === 0) {
            return { isLocked: false, missingRequirements: [], lockMessage: null };
        }
        
        // Generar mensaje de bloqueo basado en los nombres de los edificios faltantes
        const descriptions = serverConfig.descriptions || {};
        const missingNames = missingRequirements.map(t =>
            descriptions[t]?.name || t
        );
        
        // Mensaje corto: solo el nombre del primer edificio que falta (sin prefijo)
        let lockMessage = null;
        if (missingNames.length >= 1) {
            lockMessage = `${missingNames[0]}`;
        }
        
        return {
            isLocked: true,
            missingRequirements,
            lockMessage
        };
    }
    
    /**
     * Renderiza un item individual
     */
    renderItem(ctx, itemId, x, y, size) {
        // ✅ SISTEMA GENÉRICO: Verificar requisitos usando buildRequirements del servidor
        const requirementCheck = this.checkItemRequirements(itemId);
        const isLocked = requirementCheck.isLocked;
        
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
        
        // ✅ SISTEMA GENÉRICO: Mostrar mensaje de bloqueo si está bloqueado
        if (isLocked && requirementCheck.lockMessage) {
            ctx.fillStyle = '#ff6666';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            
            const lockText = requirementCheck.lockMessage;
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
     * ✅ FIX: Usa getCurrentDeck() para obtener la copia temporal durante la partida
     * @returns {Array<string>} Array de IDs de unidades del banquillo
     */
    getBench() {
        const currentDeck = this.getCurrentDeck();
        return currentDeck?.bench || [];
    }
    
    /**
     * 🆕 NUEVO: Renderiza el panel de banquillo bajo el icono del banner
     * 🔧 REFACTOR: Solo se renderiza cuando está expandido (igual que la tienda)
     */
    renderBenchPanel(ctx, benchIconX = null) {
        const bench = this.getBench();
        if (!this.game || !this.game.deckManager) return;
        if (bench.length === 0) return; // No renderizar si no hay cartas
        
        // Calcular posición del panel bajo el icono del bench en el banner
        const topBarHeight = this.layout.topBarHeight;
        const benchX = benchIconX || this.layout.benchPanel.x;
        
        const benchPanel = {
            x: benchX,
            y: topBarHeight,
            w: 292,
            h: this.calculateBenchPanelHeight(bench)
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
        const benchLimit = this.game?.deckManager?.getBenchPointLimit();
        ctx.fillStyle = (benchLimit !== null && benchLimit !== undefined && benchCost >= benchLimit) ? '#e74c3c' : '#ffffff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        const limitText = benchLimit !== null && benchLimit !== undefined ? benchLimit : '-';
        ctx.fillText(`${benchCost}/${limitText}`, benchPanel.x + benchPanel.w - 50, benchPanel.y + 20);
        
        // Renderizar lista de cartas
        if (bench.length > 0) {
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
        // 🔧 FIX: Acceder a lastGameState a través de gameStateSync
        if (this.game && this.game.network && this.game.network.gameStateSync && this.game.network.gameStateSync.lastGameState) {
            return this.game.network.gameStateSync.lastGameState.gameTime || 0;
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
        // 🔧 FIX: Acceder a lastGameState a través de gameStateSync
        if (this.game && this.game.network && this.game.network.gameStateSync && this.game.network.gameStateSync.lastGameState) {
            const gameState = this.game.network.gameStateSync.lastGameState;
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
     * 🆕 NUEVO: Maneja clicks en el panel de banquillo (solo cartas)
     * 🔧 REFACTOR: Solo maneja clicks en cartas para permutación (igual que la tienda)
     */
    handleBenchClick(mouseX, mouseY, benchIconX = null) {
        if (!this.benchExpanded) return false; // Solo procesar clicks si está expandido
        
        const bench = this.getBench();
        if (bench.length === 0) return false;
        
        // Calcular posición del panel bajo el icono del bench
        const topBarHeight = this.layout.topBarHeight;
        const benchX = benchIconX || this.layout.benchPanel.x;
        
        const benchPanel = {
            x: benchX,
            y: topBarHeight,
            w: 292,
            h: this.calculateBenchPanelHeight(bench)
        };
        
        // Verificar click en cartas
        if (true) {
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
        
        // 🔧 FIX: Usar la misma lógica que handleBenchClick para calcular posición
        const bench = this.getBench();
        const topBarHeight = this.layout.topBarHeight;
        const benchX = this._lastBenchIconX || this.layout.benchPanel.x;
        
        const benchPanel = {
            x: benchX,
            y: topBarHeight,
            w: 292,
            h: this.calculateBenchPanelHeight(bench)
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
     * ✅ FIX: Usa la copia temporal del mazo (NO modifica el original)
     */
    performLocalSwap(deckUnitId, benchUnitId) {
        // ✅ Usar copia temporal si existe, si no, crear una
        if (!this.gameDeckCopy) {
            this.initializeGameDeckCopy();
        }
        
        if (!this.gameDeckCopy || !this.gameDeckCopy.units || !this.gameDeckCopy.bench) return false;
        
        const selectedDeck = this.gameDeckCopy;
        
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
