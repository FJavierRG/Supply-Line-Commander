// ===== GESTOR DEL CONSTRUCTOR DE MAZOS (antes Arsenal) =====
import { getAllyNodes, getProjectiles, getBuildableNodes, getNodeConfig } from '../config/nodes.js';

export class ArsenalManager {
    constructor(assetManager, game) {
        this.assetManager = assetManager;
        this.game = game;
        this.isVisible = false;
        this.openedFromMenu = false;
        
        // Sistema de mazo - ahora usa DeckManager
        this.deckManager = game.deckManager;
        this.currentDeckId = null; // ID del mazo que estamos editando
        this.deck = ['hq']; // Array de IDs únicos - HQ siempre incluido por defecto
        this.deckLimit = 20; // Límite máximo de unidades en el mazo (DEPRECATED: ahora se usa sistema de puntos)
        this.deckPointLimit = this.deckManager.getDeckPointLimit(); // 🆕 NUEVO: Límite de puntos
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const arsenalBtn = document.getElementById('arsenal-btn');
        if (arsenalBtn) {
            arsenalBtn.addEventListener('click', () => {
                this.openedFromMenu = this.game.overlayManager.isOverlayVisible('main-menu-overlay');
                this.show();
            });
        }
        
        const backBtn = document.getElementById('arsenal-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.hide());
        }
        
        // Botones de acción del mazo
        const clearBtn = document.getElementById('deck-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearDeck());
        }
        
        const saveBtn = document.getElementById('deck-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveDeck());
        }
        
        const confirmBtn = document.getElementById('deck-confirm-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.confirmDeck());
        }
        
        // Botón de cargar mazo
        const loadBtn = document.getElementById('arsenal-load-btn');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => this.showDeckSelector());
        }
        
        // Botón de cerrar selector de mazos
        const selectorCloseBtn = document.getElementById('deck-selector-close-btn');
        if (selectorCloseBtn) {
            selectorCloseBtn.addEventListener('click', () => this.hideDeckSelector());
        }
    }
    
    show() {
        this.isVisible = true;
        if (this.game.overlayManager.isOverlayVisible('main-menu-overlay')) {
            this.game.overlayManager.hideOverlay('main-menu-overlay');
        }
        
        // Asegurar que serverBuildingConfig esté inicializado antes de mostrar
        if (!this.game.serverBuildingConfig) {
            this.game.initializeLocalBuildingConfig();
            // Esperar un momento para que se inicialice (es asíncrono)
            setTimeout(() => {
                this.loadSelectedDeck();
                this.game.overlayManager.showOverlay('arsenal-overlay');
                this.populateArsenal();
                this.updateDeckDisplay();
            }, 100);
        } else {
            this.loadSelectedDeck();
        this.game.overlayManager.showOverlay('arsenal-overlay');
        this.populateArsenal();
            this.updateDeckDisplay();
        }
    }
    
    /**
     * Carga el mazo seleccionado desde DeckManager
     * Si hay un mazo seleccionado del jugador, lo carga; si no, empieza con mazo vacío
     */
    loadSelectedDeck() {
        const selectedDeck = this.deckManager.getSelectedDeck();
        
        // Solo cargar si es un mazo creado por el jugador (no predeterminado)
        if (selectedDeck && !selectedDeck.isDefault) {
            this.currentDeckId = selectedDeck.id;
            this.deck = [...selectedDeck.units]; // Copia del array
        } else {
            // Empezar con mazo vacío (solo HQ)
            this.currentDeckId = null;
            this.deck = ['hq'];
        }
    }
    
    hide() {
        this.isVisible = false;
        this.game.overlayManager.hideOverlay('arsenal-overlay');
        if (this.openedFromMenu && this.game.state === 'menu') {
            this.game.overlayManager.showOverlay('main-menu-overlay');
        }
        this.openedFromMenu = false;
    }
    
    /**
     * Calcula el costo total del mazo actual
     * @returns {number} Costo total en puntos
     */
    getDeckCost() {
        return this.deckManager.calculateDeckCost(this.deck);
    }
    
    /**
     * Verifica si se puede añadir una unidad al mazo (sin exceder límite de puntos)
     * @param {string} itemId - ID de la unidad
     * @returns {Object} { canAdd: boolean, reason: string }
     */
    canAddToDeck(itemId) {
        // Verificar si ya está en el mazo
        if (this.deck.includes(itemId)) {
            return { canAdd: false, reason: 'Esta unidad ya está en el mazo' };
        }
        
        // Obtener el costo de la unidad
        const itemConfig = this.getItemConfig(itemId);
        const unitCost = itemConfig?.cost || 0;
        
        // Calcular el costo actual del mazo
        const currentCost = this.getDeckCost();
        const newCost = currentCost + unitCost;
        
        // Verificar límite de puntos
        if (newCost > this.deckPointLimit) {
            return { 
                canAdd: false, 
                reason: `Excede el límite de puntos (${newCost}/${this.deckPointLimit})` 
            };
        }
        
        return { canAdd: true, reason: '' };
    }
    
    /**
     * Añade una unidad al mazo (sin duplicados)
     */
    addToDeck(itemId) {
        // Verificar si se puede añadir
        const check = this.canAddToDeck(itemId);
        if (!check.canAdd) {
            console.log(check.reason);
            alert(check.reason);
            return false;
        }
        
        this.deck.push(itemId);
        this.updateDeckDisplay();
        return true;
    }
    
    /**
     * Quita una unidad del mazo (el HQ no se puede quitar)
     */
    removeFromDeck(itemId) {
        // El HQ siempre debe estar en el mazo
        if (itemId === 'hq') {
            console.log('El HQ no se puede quitar del mazo');
            return false;
        }
        
        const index = this.deck.indexOf(itemId);
        if (index === -1) return false;
        
        this.deck.splice(index, 1);
        this.updateDeckDisplay();
        return true;
    }
    
    /**
     * Obtiene el número total de unidades en el mazo
     */
    getDeckCount() {
        return this.deck.length;
    }
    
    /**
     * Limpia el mazo completamente (excepto el HQ que siempre permanece)
     */
    clearDeck() {
        const nonHQItems = this.deck.filter(id => id !== 'hq');
        if (nonHQItems.length === 0) return;
        
        if (confirm('¿Estás seguro de que quieres limpiar el mazo? (El HQ permanecerá)')) {
            this.deck = ['hq']; // Mantener solo el HQ
            this.updateDeckDisplay();
        }
    }
    
    /**
     * Guarda el mazo actual usando DeckManager
     */
    saveDeck() {
        if (this.deck.length === 0) {
            alert('El mazo está vacío');
            return;
        }
        
        // 🆕 NUEVO: Validar límite de puntos antes de guardar
        const deckCost = this.getDeckCost();
        if (deckCost > this.deckPointLimit) {
            alert(`El mazo excede el límite de puntos (${deckCost}/${this.deckPointLimit}). Elimina algunas unidades antes de guardar.`);
            return;
        }
        
        // Si estamos editando un mazo existente, actualizarlo
        if (this.currentDeckId) {
            const updated = this.deckManager.updateDeck(this.currentDeckId, {
                units: [...this.deck]
            });
            
            if (updated) {
                console.log('Mazo actualizado:', updated.name);
                alert(`Mazo "${updated.name}" guardado correctamente`);
            } else {
                alert('Error al guardar el mazo');
            }
        } else {
            // Crear nuevo mazo
            const name = prompt('Nombre del nuevo mazo:', 'Mi Mazo');
            if (!name || name.trim() === '') {
                return;
            }
            
            const newDeck = this.deckManager.createDeck(name.trim(), [...this.deck]);
            if (newDeck) {
                this.currentDeckId = newDeck.id;
                this.deckManager.selectDeck(newDeck.id);
                console.log('Nuevo mazo creado:', newDeck.name);
                alert(`Mazo "${newDeck.name}" creado y guardado`);
            } else {
                alert('Error al crear el mazo');
            }
        }
    }
    
    /**
     * Carga un mazo guardado (asegurando que el HQ siempre esté presente)
     * @param {string} deckId - ID del mazo a cargar (opcional, usa el seleccionado si no se especifica)
     */
    loadDeck(deckId = null) {
        const deckToLoad = deckId ? this.deckManager.getDeck(deckId) : this.deckManager.getSelectedDeck();
        
        if (!deckToLoad) {
            console.log('No hay mazo para cargar');
            return false;
        }
        
        // No permitir cargar el mazo predeterminado
        if (deckToLoad.isDefault) {
            console.log('No se puede cargar el mazo predeterminado');
            return false;
        }
        
        this.currentDeckId = deckToLoad.id;
        this.deck = [...deckToLoad.units]; // Copia del array
        this.updateDeckDisplay();
        console.log('Mazo cargado:', deckToLoad.name);
        return true;
    }
    
    /**
     * Confirma el mazo y lo asigna al juego
     */
    confirmDeck() {
        if (this.deck.length === 0) {
            alert('El mazo está vacío. Añade unidades antes de confirmar.');
            return;
        }
        
        // 🆕 NUEVO: Validar límite de puntos antes de confirmar
        const deckCost = this.getDeckCost();
        if (deckCost > this.deckPointLimit) {
            alert(`El mazo excede el límite de puntos (${deckCost}/${this.deckPointLimit}). Elimina algunas unidades antes de confirmar.`);
            return;
        }
        
        // Guardar el mazo si hay cambios
        if (this.currentDeckId) {
            this.deckManager.updateDeck(this.currentDeckId, {
                units: [...this.deck]
            });
        } else {
            // Si no hay mazo actual, crear uno con nombre por defecto
            const defaultName = `Mazo ${new Date().toLocaleDateString()}`;
            const newDeck = this.deckManager.createDeck(defaultName, [...this.deck]);
            if (newDeck) {
                this.currentDeckId = newDeck.id;
            }
        }
        
        // Seleccionar este mazo como el actual
        if (this.currentDeckId) {
            this.deckManager.selectDeck(this.currentDeckId);
        }
        
        // TODO: Enviar el mazo al servidor cuando se inicie la partida
        console.log('Mazo confirmado:', this.deck);
        this.hide();
    }
    
    /**
     * Actualiza la visualización del mazo
     */
    updateDeckDisplay() {
        const deckList = document.getElementById('deck-list');
        const deckCountEl = document.getElementById('deck-count');
        const deckLimitEl = document.getElementById('deck-limit');
        
        if (!deckList) return;
        
        // 🆕 NUEVO: Calcular costo total del mazo
        const deckCost = this.getDeckCost();
        const pointLimit = this.deckPointLimit;
        
        // Actualizar contador de puntos (reemplaza el contador de unidades)
        if (deckCountEl) {
            deckCountEl.textContent = deckCost;
            // Cambiar color si está cerca o excede el límite
            if (deckCost >= pointLimit) {
                deckCountEl.style.color = '#e74c3c'; // Rojo si excede
            } else if (deckCost >= pointLimit * 0.9) {
                deckCountEl.style.color = '#f39c12'; // Naranja si está cerca (90%+)
            } else {
                deckCountEl.style.color = '#ffffff'; // Blanco normal
            }
        }
        
        // Actualizar límite mostrado
        if (deckLimitEl) {
            deckLimitEl.textContent = pointLimit;
        }
        
        // Limpiar lista
        deckList.innerHTML = '';
        
        // Renderizar todas las unidades del mazo (siempre mostrar al menos el HQ)
        if (this.deck.length === 0) {
            // Por seguridad, asegurar que el HQ esté presente
            this.deck = ['hq'];
        }
        
        this.deck.forEach(itemId => {
            const itemConfig = this.getItemConfig(itemId);
            if (!itemConfig) return;
            
            const deckItemEl = this.createDeckItem(itemId, itemConfig);
            deckList.appendChild(deckItemEl);
        });
        
        // Si solo está el HQ, mostrar mensaje adicional
        const nonHQItems = this.deck.filter(id => id !== 'hq');
        if (nonHQItems.length === 0) {
            const hintMsg = document.createElement('div');
            hintMsg.className = 'deck-empty';
            hintMsg.style.marginTop = '16px';
            hintMsg.style.fontSize = '12px';
            hintMsg.textContent = 'Añade más unidades para completar tu mazo.';
            deckList.appendChild(hintMsg);
        }
        
        // Actualizar estado visual de items disponibles
        this.updateAvailableItemsState();
    }
    
    /**
     * Actualiza el estado visual de los items disponibles según si están en el mazo
     * 🆕 ACTUALIZADO: También verifica si se puede añadir sin exceder límite de puntos
     */
    updateAvailableItemsState() {
        const items = document.querySelectorAll('.arsenal-item');
        const currentCost = this.getDeckCost();
        
        items.forEach(itemDiv => {
            const itemId = itemDiv.dataset.itemId;
            if (!itemId) return;
            
            const isInDeck = this.deck.includes(itemId);
            
            if (isInDeck) {
                itemDiv.classList.add('in-deck');
                itemDiv.style.opacity = '0.5';
                itemDiv.style.cursor = 'not-allowed';
                itemDiv.style.pointerEvents = 'none';
            } else {
                // 🆕 NUEVO: Verificar si se puede añadir sin exceder límite
                const check = this.canAddToDeck(itemId);
                if (!check.canAdd) {
                    itemDiv.classList.add('disabled');
                    itemDiv.style.opacity = '0.4';
                    itemDiv.style.cursor = 'not-allowed';
                    itemDiv.title = check.reason; // Mostrar razón en tooltip
                } else {
                    itemDiv.classList.remove('disabled');
                    itemDiv.style.opacity = '1';
                    itemDiv.style.cursor = 'pointer';
                    itemDiv.title = ''; // Limpiar tooltip
                }
                itemDiv.classList.remove('in-deck');
                itemDiv.style.pointerEvents = 'auto';
            }
        });
    }
    
    /**
     * Crea un elemento visual para una unidad en el mazo
     */
    createDeckItem(itemId, itemConfig) {
        const div = document.createElement('div');
        div.className = 'deck-item';
        
        // El HQ no se puede quitar
        const isHQ = itemId === 'hq';
        if (isHQ) {
            div.classList.add('deck-item-locked');
        }
        
        // Hover → panel de detalle
        div.addEventListener('mouseenter', () => this.showDetail(itemConfig));
        
        // Icono
        const icon = document.createElement('canvas');
        icon.className = 'deck-item-icon';
        icon.width = 48;
        icon.height = 48;
        
        const sprite = this.assetManager.getSprite(itemConfig.spriteKey);
        if (sprite) {
            const ctx = icon.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(sprite, 0, 0, 48, 48);
        }
        
        div.appendChild(icon);
        
        // Info
        const info = document.createElement('div');
        info.className = 'deck-item-info';
        
        const name = document.createElement('div');
        name.className = 'deck-item-name';
        name.textContent = itemConfig.name;
        if (isHQ) {
            name.textContent;
        }
        info.appendChild(name);
        
        // 🎯 NUEVO: Añadir precio (solo el número)
        if (itemConfig.cost && itemConfig.cost > 0) {
            const cost = document.createElement('div');
            cost.className = 'deck-item-cost';
            cost.textContent = itemConfig.cost;
            info.appendChild(cost);
        }
        
        div.appendChild(info);
        
        // Botón quitar (solo si no es HQ)
        if (!isHQ) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'deck-item-remove';
            removeBtn.textContent = '−';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFromDeck(itemId);
            });
            div.appendChild(removeBtn);
        }
        
        return div;
    }
    
    /**
     * Obtiene la configuración de un item por ID
     * Usa getNodeConfig para obtener descripciones del servidor si están disponibles
     */
    getItemConfig(itemId) {
        return getNodeConfig(itemId);
    }
    
    populateArsenal() {
        const container = document.getElementById('arsenal-content');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Categoría 1: HQ (solo el HQ)
        const hqNode = getAllyNodes().find(n => n.id === 'hq');
        if (hqNode) {
            // Usar getNodeConfig para obtener descripción del servidor si está disponible
            const hqConfig = getNodeConfig('hq');
            const hqCategory = this.createCategory('HQ', [{
                id: hqConfig.id,
                name: hqConfig.name || hqNode.name,
                description: hqConfig.description || hqNode.description,
                spriteKey: hqConfig.spriteKey || hqNode.spriteKey,
                cost: hqConfig.cost || hqNode.cost
            }]);
            container.appendChild(hqCategory);
        }
        
        // Categoría 2: Edificios
        const buildings = getAllyNodes().filter(n => 
            n.id !== 'hq' && n.id !== 'front' && n.category === 'buildable'
        );
        const buildingsCategory = this.createCategory('Edificios', buildings.map(b => {
            // Usar getNodeConfig para obtener descripción del servidor si está disponible
            const nodeConfig = getNodeConfig(b.id);
            return {
            id: b.id,
                name: nodeConfig?.name || b.name,
                description: nodeConfig?.description || b.description,
                spriteKey: nodeConfig?.spriteKey || b.spriteKey,
                cost: nodeConfig?.cost || b.cost
            };
        }));
        container.appendChild(buildingsCategory);
        
        // Categoría 3: Consumibles
        const projectiles = getProjectiles();
        console.log('🎴 Consumibles obtenidos:', projectiles.length, projectiles.map(p => p.id));
        
        if (projectiles.length > 0) {
            const projectilesCategory = this.createCategory('Consumibles', projectiles.map(p => {
                // Usar getNodeConfig para obtener descripción del servidor si está disponible
                const nodeConfig = getNodeConfig(p.id);
                return {
                id: p.id,
                    name: nodeConfig?.name || p.name,
                    description: nodeConfig?.description || p.description,
                    spriteKey: nodeConfig?.spriteKey || p.spriteKey,
                    cost: nodeConfig?.cost || p.cost
                };
            }));
            container.appendChild(projectilesCategory);
        } else {
            console.warn('⚠️ No se encontraron consumibles para mostrar');
        }
        
        // Actualizar estado visual de items ya en el mazo
        this.updateAvailableItemsState();
    }
    
    createCategory(title, items) {
        const category = document.createElement('div');
        category.className = 'arsenal-category';
        
        const categoryTitle = document.createElement('h3');
        categoryTitle.className = 'arsenal-category-title';
        categoryTitle.textContent = title;
        category.appendChild(categoryTitle);
        
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'arsenal-items';
        
        items.forEach(item => {
            const itemElement = this.createItem(item);
            itemsContainer.appendChild(itemElement);
        });
        
        category.appendChild(itemsContainer);
        return category;
    }
    
    createItem(item) {
        const div = document.createElement('div');
        div.className = 'arsenal-item';
        div.dataset.itemId = item.id; // Añadir data attribute para identificar el item
        
        // Verificar si ya está en el mazo
        const isInDeck = this.deck.includes(item.id);
        
        // Verificar si el dron está bloqueado (solo si buildSystem está disponible)
        const isDroneLocked = this.buildSystem && item.id === 'drone' && !this.buildSystem.hasDroneLauncher();
        
        // Verificar si el comando está bloqueado (solo si buildSystem está disponible)
        const isCommandoLocked = this.buildSystem && item.id === 'specopsCommando' && !this.buildSystem.hasIntelCenter();
        
        // 🆕 NUEVO: Verificar si se puede añadir sin exceder límite de puntos
        let canAddCheck = { canAdd: true, reason: '' };
        try {
            canAddCheck = this.canAddToDeck(item.id);
        } catch (error) {
            console.warn('Error al verificar si se puede añadir:', error);
            // Si hay error, permitir añadir (fallback)
        }
        const cannotAdd = !canAddCheck.canAdd && !isInDeck;
        
        if (isInDeck) {
            div.classList.add('in-deck');
            div.style.opacity = '0.5';
            div.style.cursor = 'not-allowed';
        } else if (cannotAdd) {
            // No se puede añadir (excede límite o ya está)
            div.classList.add('disabled');
            div.style.opacity = '0.4';
            div.style.cursor = 'not-allowed';
            div.title = canAddCheck.reason;
        } else {
            div.addEventListener('click', () => {
                if (this.addToDeck(item.id)) {
                    // Feedback visual
                    div.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        div.style.transform = '';
                        div.classList.add('in-deck');
                        div.style.opacity = '0.5';
                        div.style.cursor = 'not-allowed';
                    }, 150);
                }
            });
        }
        
        // Hover → panel de detalle
        div.addEventListener('mouseenter', () => this.showDetail(item));
        div.addEventListener('focus', () => this.showDetail(item));
        
        // Icono - Reducido 15% (80 * 0.85 = 68)
        const icon = document.createElement('canvas');
        icon.className = 'arsenal-item-icon';
        icon.width = 68;
        icon.height = 68;
        
        const sprite = this.assetManager.getSprite(item.spriteKey);
        if (sprite) {
            const ctx = icon.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(sprite, 0, 0, 68, 68);
        }
        
        div.appendChild(icon);
        
        // Info
        const info = document.createElement('div');
        info.className = 'arsenal-item-info';
        
        const name = document.createElement('h4');
        name.className = 'arsenal-item-name';
        name.textContent = item.name;
        info.appendChild(name);
        
        // Descripción (siempre visible)
        if (item.description) {
            const description = document.createElement('p');
            description.className = 'arsenal-item-description';
            description.textContent = item.description;
            info.appendChild(description);
        }
        
        // Coste (opcional, solo si tiene coste)
        if (item.cost) {
        const cost = document.createElement('p');
            cost.className = 'arsenal-item-cost';
            cost.textContent = `Coste: ${item.cost} $`;
        info.appendChild(cost);
        }
        
        div.appendChild(info);
        
        return div;
    }

    showDetail(item) {
        const nameEl = document.querySelector('#arsenal-detail .detail-name');
        const costEl = document.querySelector('#arsenal-detail .detail-cost');
        const descEl = document.querySelector('#arsenal-detail .detail-desc');
        const canvas = document.getElementById('detail-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        
        const sprite = this.assetManager.getSprite(item.spriteKey);
        if (sprite) {
            const targetW = Math.min(canvas.width, sprite.width);
            const targetH = Math.min(canvas.height, sprite.height);
            const x = (canvas.width - targetW) / 2;
            const y = (canvas.height - targetH) / 2;
            ctx.drawImage(sprite, 0, 0, sprite.width, sprite.height, x, y, targetW, targetH);
        }
        if (nameEl) nameEl.textContent = item.name || '';
        if (costEl) costEl.textContent = item.cost ? `Coste: ${item.cost} $` : '';
        if (descEl) {
            const tip = 'Wounded: el frente consume +100% suministros';
            const safeDesc = (item.description || '')
                .replace(/"wounded"|wounded/gi, (m) => `<span class="tooltip" data-tip="${tip}">${m}</span>`);
            descEl.innerHTML = safeDesc;
        }
    }
    
    /**
     * Muestra el selector de mazos
     */
    showDeckSelector() {
        const overlay = document.getElementById('deck-selector-overlay');
        if (!overlay) return;
        
        this.populateDeckSelector();
        overlay.classList.remove('hidden');
        
        // Cerrar al hacer clic fuera del contenedor
        overlay.addEventListener('click', this.handleDeckSelectorClick);
    }
    
    /**
     * Maneja el clic en el overlay del selector
     */
    handleDeckSelectorClick = (e) => {
        const overlay = document.getElementById('deck-selector-overlay');
        const container = overlay?.querySelector('.deck-selector-container');
        
        // Si el clic fue fuera del contenedor, cerrar
        if (container && !container.contains(e.target)) {
            this.hideDeckSelector();
        }
    }
    
    /**
     * Oculta el selector de mazos
     */
    hideDeckSelector() {
        const overlay = document.getElementById('deck-selector-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.removeEventListener('click', this.handleDeckSelectorClick);
        }
    }
    
    /**
     * Pobla la lista de mazos en el selector
     * Solo muestra mazos creados por el jugador (excluye el predeterminado)
     */
    populateDeckSelector() {
        const listContainer = document.getElementById('deck-selector-list');
        if (!listContainer) return;
        
        listContainer.innerHTML = '';
        
        // Filtrar solo mazos creados por el jugador (excluir predeterminados)
        const allDecks = this.deckManager.getAllDecks();
        const playerDecks = allDecks.filter(deck => !deck.isDefault);
        const selectedDeckId = this.deckManager.lastSelectedDeckId;
        
        if (playerDecks.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'deck-selector-empty';
            emptyMsg.textContent = 'No hay mazos guardados. Crea uno desde el constructor.';
            listContainer.appendChild(emptyMsg);
            return;
        }
        
        playerDecks.forEach(deck => {
            const item = document.createElement('div');
            item.className = 'deck-selector-item';
            if (deck.id === selectedDeckId) {
                item.classList.add('selected');
            }
            
            // Info del mazo
            const info = document.createElement('div');
            info.className = 'deck-selector-item-info';
            
            const name = document.createElement('div');
            name.className = 'deck-selector-item-name';
            name.textContent = deck.name;
            info.appendChild(name);
            
            const meta = document.createElement('div');
            meta.className = 'deck-selector-item-meta';
            meta.innerHTML = `
                <span>${deck.units.length} unidades</span>
                <span>•</span>
                <span>${new Date(deck.updatedAt).toLocaleDateString()}</span>
            `;
            info.appendChild(meta);
            
            item.appendChild(info);
            
            // Acciones
            const actions = document.createElement('div');
            actions.className = 'deck-selector-item-actions';
            
            // Botón cargar/seleccionar
            const loadBtn = document.createElement('button');
            loadBtn.className = 'deck-selector-item-btn';
            loadBtn.textContent = deck.id === selectedDeckId ? 'Seleccionado' : 'Cargar';
            loadBtn.disabled = deck.id === selectedDeckId;
            loadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.loadDeckFromSelector(deck.id);
            });
            actions.appendChild(loadBtn);
            
            // Botón borrar (todos los mazos del jugador se pueden borrar)
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'deck-selector-item-btn delete';
            deleteBtn.textContent = 'Borrar';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteDeckFromSelector(deck.id);
            });
            actions.appendChild(deleteBtn);
            
            item.appendChild(actions);
            
            // Click en el item también carga el mazo
            item.addEventListener('click', (e) => {
                if (e.target === item || e.target.closest('.deck-selector-item-info')) {
                    if (deck.id !== selectedDeckId) {
                        this.loadDeckFromSelector(deck.id);
                    }
                }
            });
            
            listContainer.appendChild(item);
        });
    }
    
    /**
     * Carga un mazo desde el selector
     * @param {string} deckId - ID del mazo a cargar
     */
    loadDeckFromSelector(deckId) {
        const success = this.loadDeck(deckId);
        if (success) {
            this.deckManager.selectDeck(deckId);
            this.hideDeckSelector();
            // Actualizar la visualización del arsenal
            this.populateArsenal();
            this.updateDeckDisplay();
        }
    }
    
    /**
     * Borra un mazo desde el selector
     * @param {string} deckId - ID del mazo a borrar
     */
    deleteDeckFromSelector(deckId) {
        if (!confirm('¿Estás seguro de que quieres borrar este mazo? Esta acción no se puede deshacer.')) {
            return;
        }
        
        const success = this.deckManager.deleteDeck(deckId);
        if (success) {
            // Si se borró el mazo que estábamos editando, empezar con mazo vacío
            if (this.currentDeckId === deckId) {
                this.currentDeckId = null;
                this.deck = ['hq'];
                this.updateDeckDisplay();
                this.populateArsenal();
            }
            
            // Actualizar la lista
            this.populateDeckSelector();
        }
    }
}

