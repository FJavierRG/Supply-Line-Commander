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
        // 🆕 FIX: NO guardar copia del límite - siempre obtenerlo dinámicamente desde DeckManager (fuente única de verdad)
        
        // 🆕 NUEVO: Sistema de banquillo
        this.bench = []; // Array de IDs únicos del banquillo
        this.benchExpanded = false; // Estado del panel desplegable
        this.swapMode = null; // Modo de permutación: null, { benchUnitId: 'xxx' } cuando se selecciona una carta del bench
        this.destination = 'deck'; // 🆕 NUEVO: Destino por defecto: 'deck' o 'bench'
        
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
        
        // Event listeners del modal de nombre del mazo
        const deckNameModal = document.getElementById('deck-name-modal-overlay');
        const deckNameInput = document.getElementById('deck-name-input');
        const deckNameCancelBtn = document.getElementById('deck-name-cancel-btn');
        const deckNameConfirmBtn = document.getElementById('deck-name-confirm-btn');
        
        if (deckNameCancelBtn) {
            deckNameCancelBtn.addEventListener('click', () => this.hideDeckNameModal());
        }
        
        if (deckNameConfirmBtn) {
            deckNameConfirmBtn.addEventListener('click', () => {
                const name = deckNameInput?.value?.trim();
                if (name && this.deckNameCallback) {
                    this.deckNameCallback(name);
                }
                this.hideDeckNameModal();
            });
        }
        
        // Permitir Enter para confirmar
        if (deckNameInput) {
            deckNameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    deckNameConfirmBtn?.click();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.hideDeckNameModal();
                }
            });
        }
        
        // Botón de nuevo mazo
        const newBtn = document.getElementById('arsenal-new-btn');
        if (newBtn) {
            newBtn.addEventListener('click', () => this.createNewDeck());
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
        
        // Event listeners del modal de vista ampliada de carta
        const cardZoomOverlay = document.getElementById('card-zoom-overlay');
        const cardZoomCloseBtn = document.getElementById('card-zoom-close-btn');
        
        if (cardZoomCloseBtn) {
            cardZoomCloseBtn.addEventListener('click', () => this.hideCardZoom());
        }
        
        // Cerrar modal al hacer click fuera del contenedor
        if (cardZoomOverlay) {
            cardZoomOverlay.addEventListener('click', (e) => {
                if (e.target === cardZoomOverlay) {
                    this.hideCardZoom();
                }
            });
        }
        
        // Cerrar modal con tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && cardZoomOverlay && !cardZoomOverlay.classList.contains('hidden')) {
                this.hideCardZoom();
            }
        });
        
        // Prevenir menú contextual del navegador en la zona de unidades disponibles
        const arsenalContent = document.getElementById('arsenal-content');
        if (arsenalContent) {
            arsenalContent.addEventListener('contextmenu', (e) => {
                // Solo prevenir si el click no fue en una carta (las cartas tienen su propio handler)
                const clickedCard = e.target.closest('.arsenal-item');
                if (!clickedCard) {
                    e.preventDefault();
                }
            });
        }
        
        // 🆕 NUEVO: Selector de destino (Mazo/Banquillo)
        const deckDestBtn = document.getElementById('destination-deck-btn');
        const benchDestBtn = document.getElementById('destination-bench-btn');
        
        if (deckDestBtn) {
            deckDestBtn.addEventListener('click', () => {
                this.setDestination('deck');
            });
        }
        
        if (benchDestBtn) {
            benchDestBtn.addEventListener('click', () => {
                this.setDestination('bench');
            });
        }
    }
    
    /**
     * 🆕 NUEVO: Establece el destino de las cartas (mazo o banquillo)
     */
    setDestination(dest) {
        this.destination = dest;
        
        const deckBtn = document.getElementById('destination-deck-btn');
        const benchBtn = document.getElementById('destination-bench-btn');
        const panelTitle = document.getElementById('deck-panel-title');
        const deckList = document.getElementById('deck-list');
        const deckCounter = document.getElementById('deck-count');
        const deckLimit = document.getElementById('deck-limit');
        
        if (deckBtn && benchBtn) {
            if (dest === 'deck') {
                deckBtn.classList.add('active');
                benchBtn.classList.remove('active');
                if (panelTitle) panelTitle.textContent = 'Tu Mazo';
                if (deckLimit) {
                    const limit = this.deckManager.getDeckPointLimit();
                    deckLimit.textContent = limit;
                }
            } else {
                deckBtn.classList.remove('active');
                benchBtn.classList.add('active');
                if (panelTitle) panelTitle.textContent = 'Banquillo';
                if (deckLimit) {
                    const limit = this.deckManager.getBenchPointLimit();
                    deckLimit.textContent = limit;
                }
            }
        }
        
        // Actualizar la visualización según el destino
        this.updateDeckDisplay();
    }
    
    show() {
        this.isVisible = true;
        
        // 🆕 FIX: Pausar renderizado ANTES de mostrar el arsenal (canvas sigue visible pero limpio)
        if (this.game.canvasManager) {
            this.game.canvasManager.pause();
        }
        
        // 🆕 NUEVO: Usar ScreenManager para mostrar el arsenal
        if (this.game.screenManager) {
            this.game.screenManager.show('ARSENAL');
        }
        
        // Mantener compatibilidad con código existente
        if (this.game.overlayManager.isOverlayVisible('main-menu-overlay')) {
            this.game.overlayManager.hideOverlay('main-menu-overlay');
        }
        
        // Asegurar que el overlay del menú esté completamente oculto
        const menuOverlay = document.getElementById('main-menu-overlay');
        if (menuOverlay) {
            menuOverlay.classList.add('hidden');
            menuOverlay.style.display = 'none';
            menuOverlay.style.visibility = 'hidden';
            menuOverlay.style.pointerEvents = 'none';
        }
        
        // Asegurar que serverBuildingConfig esté inicializado antes de mostrar
        if (!this.game.serverBuildingConfig) {
            this.game.initializeLocalBuildingConfig();
            // Esperar un momento para que se inicialice (es asíncrono)
            setTimeout(() => {
                this.loadSelectedDeck();
                this.game.overlayManager.showOverlay('arsenal-overlay');
                
                // 🆕 FIX: Asegurar que el arsenal tenga z-index alto y sea interactivo
                const arsenalOverlay = document.getElementById('arsenal-overlay');
                if (arsenalOverlay) {
                    arsenalOverlay.style.zIndex = '10';
                    arsenalOverlay.style.pointerEvents = 'auto';
                }
                
                this.populateArsenal();
                this.initializePointLimits();
                this.updateDeckDisplay();
            }, 100);
        } else {
            this.loadSelectedDeck();
            this.game.overlayManager.showOverlay('arsenal-overlay');
            
            // 🆕 FIX: Asegurar que el arsenal tenga z-index alto y sea interactivo
            const arsenalOverlay = document.getElementById('arsenal-overlay');
            if (arsenalOverlay) {
                arsenalOverlay.style.zIndex = '10';
                arsenalOverlay.style.pointerEvents = 'auto';
            }
            
            this.populateArsenal();
            this.initializePointLimits();
            this.updateDeckDisplay();
        }
    }
    
    /**
     * Carga el mazo seleccionado desde DeckManager
     * Si hay un mazo seleccionado del jugador, lo carga; si no, empieza con mazo vacío
     * 🆕 NUEVO: También carga el banquillo
     */
    loadSelectedDeck() {
        const selectedDeck = this.deckManager.getSelectedDeck();
        
        // Solo cargar si es un mazo creado por el jugador (no predeterminado)
        if (selectedDeck && !selectedDeck.isDefault) {
            this.currentDeckId = selectedDeck.id;
            this.deck = [...selectedDeck.units]; // Copia del array
            this.bench = [...(selectedDeck.bench || [])]; // 🆕 NUEVO: Copia del banquillo
        } else {
            // Empezar con mazo vacío (solo HQ)
            this.currentDeckId = null;
            this.deck = ['hq'];
            this.bench = []; // 🆕 NUEVO: Banquillo vacío
        }
        
        // 🆕 NUEVO: Inicializar el selector de destino y actualizar límites
        this.setDestination(this.destination || 'deck');
    }
    
    /**
     * 🆕 NUEVO: Inicializa los límites de puntos en el HTML
     */
    initializePointLimits() {
        const deckLimitEl = document.getElementById('deck-limit');
        if (deckLimitEl && this.deckManager) {
            // Establecer límite inicial según el destino
            if (this.destination === 'bench') {
                deckLimitEl.textContent = this.deckManager.getBenchPointLimit();
            } else {
                deckLimitEl.textContent = this.deckManager.getDeckPointLimit();
            }
        }
    }
    
    /**
     * 🆕 NUEVO: Crea un nuevo mazo vacío (solo con HQ)
     */
    createNewDeck() {
        // Limpiar el mazo actual y empezar con uno nuevo (solo HQ)
        this.currentDeckId = null;
        this.deck = ['hq'];
        this.bench = []; // 🆕 NUEVO: Limpiar banquillo
        
        // Salir del modo permutación si está activo
        if (this.swapMode) {
            this.exitSwapMode();
        }
        
        // Actualizar la visualización
        this.updateDeckDisplay();
        
        // 🆕 NUEVO: Actualizar el estado de los items disponibles para que se puedan añadir
        this.updateAvailableItemsState();
        
        // Mostrar notificación
        this.showNotification('Nuevo mazo creado. Empieza añadiendo unidades.', 'info');
        
        console.log('📝 Nuevo mazo creado (vacío)');
    }
    
    hide() {
        this.isVisible = false;
        
        // 🆕 FIX: Si se abrió desde el menú, asegurar estado 'menu' ANTES de cambiar pantallas
        if (this.openedFromMenu) {
            // 🆕 FIX: Cambiar estado a menú PRIMERO (antes de ocultar arsenal)
            // Esto asegura que el listener de ScreenManager pausará el canvas correctamente
            if (this.game.setGameState) {
                this.game.setGameState('menu');
            }
            
            // 🆕 FIX: Pausar renderizado explícitamente ANTES de cambiar pantallas
            if (this.game.canvasManager) {
                this.game.canvasManager.pause();
            }
            
            // 🆕 FIX: Si el estado es 'playing', limpiar el estado primero
            if (this.game.state === 'playing') {
                console.warn('⚠️ Estado es "playing" al ocultar arsenal, limpiando estado...');
                if (this.game.clearGameState) {
                    this.game.clearGameState();
                }
            }
        }
        
        // 🆕 NUEVO: Usar ScreenManager para ocultar el arsenal
        if (this.game.screenManager) {
            this.game.screenManager.hide('ARSENAL');
        }
        
        // Mantener compatibilidad
        this.game.overlayManager.hideOverlay('arsenal-overlay');
        
        // 🆕 FIX: Si se abrió desde el menú, mostrar el menú
        if (this.openedFromMenu && this.game.state === 'menu') {
            // 🆕 FIX: Asegurar que el estado sea 'menu' (por si acaso)
            if (this.game.setGameState) {
                this.game.setGameState('menu');
            }
            
            // 🆕 FIX: Pausar canvas explícitamente ANTES de mostrar el menú
            // Esto previene cualquier problema de timing con el listener
            if (this.game.canvasManager) {
                this.game.canvasManager.pause();
            }
            
            // Mostrar menú principal usando ScreenManager
            // El listener de ScreenManager ya pausará el canvas porque hay pantalla activa
            if (this.game.screenManager) {
                this.game.screenManager.show('MAIN_MENU');
            }
            
            // 🆕 FIX: Pausar canvas OTRA VEZ después de mostrar el menú (por si acaso)
            // Esto asegura que el canvas esté pausado incluso si el listener se ejecuta de forma asíncrona
            setTimeout(() => {
                if (this.game.canvasManager && this.game.state === 'menu') {
                    this.game.canvasManager.pause();
                }
            }, 0);
            
            // Mantener compatibilidad
            this.game.overlayManager.showOverlay('main-menu-overlay');
            const menuOverlay = document.getElementById('main-menu-overlay');
            if (menuOverlay) {
                menuOverlay.classList.remove('hidden');
                menuOverlay.style.display = 'block';
                menuOverlay.style.visibility = 'visible';
                menuOverlay.style.opacity = '1';
                // El CSS ya maneja el z-index con variables
                menuOverlay.style.pointerEvents = 'auto';
                
                // Asegurar que los botones sean interactivos
                const buttons = menuOverlay.querySelectorAll('button, a, .menu-btn');
                buttons.forEach(btn => {
                    btn.style.pointerEvents = 'auto';
                });
            }
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
    /**
     * Verifica si se puede añadir una unidad al mazo
     */
    canAddToDeck(itemId) {
        // Verificar si ya está en el mazo
        if (this.deck.includes(itemId)) {
            return { canAdd: false, reason: 'Esta unidad ya está en el mazo' };
        }
        
        // Obtener el costo de la unidad
        const itemConfig = this.getItemConfig(itemId);
        if (!itemConfig) {
            return { canAdd: false, reason: 'Unidad no encontrada' };
        }
        
        const unitCost = itemConfig.cost || 0;
        
        // Calcular el costo actual del mazo
        const currentCost = this.getDeckCost();
        const newCost = currentCost + unitCost;
        
        // Verificar límite de puntos (obtener dinámicamente desde DeckManager)
        const pointLimit = this.deckManager.getDeckPointLimit();
        if (newCost > pointLimit) {
            return { 
                canAdd: false, 
                reason: `Excede el límite de puntos (${newCost}/${pointLimit})` 
            };
        }
        
        return { canAdd: true, reason: '' };
    }
    
    /**
     * 🆕 NUEVO: Verifica si se puede añadir una unidad al banquillo
     */
    canAddToBench(itemId) {
        // Verificar si ya está en el banquillo
        if (this.bench.includes(itemId)) {
            return { canAdd: false, reason: 'Esta unidad ya está en el banquillo' };
        }
        
        // Verificar que no esté en el mazo
        if (this.deck.includes(itemId)) {
            return { canAdd: false, reason: 'Esta unidad ya está en el mazo' };
        }
        
        // Obtener el costo de la unidad
        const itemConfig = this.getItemConfig(itemId);
        if (!itemConfig) {
            return { canAdd: false, reason: 'Unidad no encontrada' };
        }
        
        const unitCost = itemConfig.cost || 0;
        
        // Calcular el costo actual del banquillo
        const currentCost = this.getBenchCost();
        const newCost = currentCost + unitCost;
        
        // Verificar límite de puntos del banquillo (obtener dinámicamente desde DeckManager)
        const benchPointLimit = this.deckManager.getBenchPointLimit();
        if (newCost > benchPointLimit) {
            return { 
                canAdd: false, 
                reason: `Excede el límite del banquillo (${newCost}/${benchPointLimit})` 
            };
        }
        
        return { canAdd: true, reason: '' };
    }
    
    /**
     * Verifica si se puede añadir una unidad según el destino actual
     */
    canAddToDestination(itemId) {
        if (this.destination === 'bench') {
            return this.canAddToBench(itemId);
        } else {
            return this.canAddToDeck(itemId);
        }
    }
    
    /**
     * Añade una unidad al mazo (sin duplicados)
     */
    addToDeck(itemId) {
        // Verificar si se puede añadir
        const check = this.canAddToDeck(itemId);
        if (!check.canAdd) {
            console.log(check.reason);
            this.showNotification(check.reason, 'error');
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
     * Muestra una notificación en lugar de alert()
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de notificación: 'success', 'error', 'info'
     */
    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // Trigger animación
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Auto-ocultar después de 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * Guarda el mazo actual usando DeckManager
     */
    saveDeck() {
        if (this.deck.length === 0) {
            this.showNotification('El mazo está vacío', 'error');
            return;
        }
        
        // 🆕 NUEVO: Validar límite de puntos antes de guardar (obtener dinámicamente desde DeckManager)
        const deckCost = this.getDeckCost();
        const pointLimit = this.deckManager.getDeckPointLimit();
        if (deckCost > pointLimit) {
            this.showNotification(`El mazo excede el límite de puntos (${deckCost}/${pointLimit}). Elimina algunas unidades antes de guardar.`, 'error');
            return;
        }
        
        // 🆕 NUEVO: Validar también el banquillo
        const benchCost = this.getBenchCost();
        const benchPointLimit = this.deckManager.getBenchPointLimit();
        if (benchCost > benchPointLimit) {
            this.showNotification(`El banquillo excede el límite de puntos (${benchCost}/${benchPointLimit}). Elimina algunas unidades antes de guardar.`, 'error');
            return;
        }
        
        // Si estamos editando un mazo existente, actualizarlo
        if (this.currentDeckId) {
            const updated = this.deckManager.updateDeck(this.currentDeckId, {
                units: [...this.deck],
                bench: [...this.bench] // 🆕 NUEVO: Guardar banquillo
            });
            
            if (updated) {
                console.log('Mazo actualizado:', updated.name);
                this.showNotification(`Mazo "${updated.name}" guardado correctamente`, 'success');
            } else {
                this.showNotification('Error al guardar el mazo', 'error');
            }
        } else {
            // Crear nuevo mazo - pedir nombre con modal
            this.showDeckNameModal((name) => {
                if (!name || name.trim() === '') {
                    return;
                }
                
                const newDeck = this.deckManager.createDeck(name.trim(), [...this.deck], [...this.bench]); // 🆕 NUEVO: Incluir banquillo
                if (newDeck) {
                    this.currentDeckId = newDeck.id;
                    this.deckManager.selectDeck(newDeck.id);
                    console.log('Nuevo mazo creado:', newDeck.name);
                    this.showNotification(`Mazo "${newDeck.name}" creado y guardado`, 'success');
                } else {
                    this.showNotification('Error al crear el mazo', 'error');
                }
            });
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
        this.bench = [...(deckToLoad.bench || [])]; // 🆕 NUEVO: Cargar banquillo
        this.updateDeckDisplay();
        console.log('Mazo cargado:', deckToLoad.name);
        return true;
    }
    
    /**
     * Confirma el mazo y lo asigna al juego
     */
    confirmDeck() {
        if (this.deck.length === 0) {
            this.showNotification('El mazo está vacío. Añade unidades antes de confirmar.', 'error');
            return;
        }
        
        // 🆕 NUEVO: Validar límite de puntos antes de confirmar (obtener dinámicamente desde DeckManager)
        const deckCost = this.getDeckCost();
        const pointLimit = this.deckManager.getDeckPointLimit();
        if (deckCost > pointLimit) {
            this.showNotification(`El mazo excede el límite de puntos (${deckCost}/${pointLimit}). Elimina algunas unidades antes de confirmar.`, 'error');
            return;
        }
        
        // 🆕 NUEVO: Validar también el banquillo
        const benchCost = this.getBenchCost();
        const benchPointLimit = this.deckManager.getBenchPointLimit();
        if (benchCost > benchPointLimit) {
            this.showNotification(`El banquillo excede el límite de puntos (${benchCost}/${benchPointLimit}). Elimina algunas unidades antes de confirmar.`, 'error');
            return;
        }
        
        // Guardar el mazo si hay cambios
        if (this.currentDeckId) {
            this.deckManager.updateDeck(this.currentDeckId, {
                units: [...this.deck],
                bench: [...this.bench] // 🆕 NUEVO: Guardar banquillo
            });
        } else {
            // Si no hay mazo actual, pedir nombre antes de crear
            this.showDeckNameModal((name) => {
                if (!name || name.trim() === '') {
                    return;
                }
                
                const newDeck = this.deckManager.createDeck(name.trim(), [...this.deck], [...this.bench]); // 🆕 NUEVO: Incluir banquillo
                if (newDeck) {
                    this.currentDeckId = newDeck.id;
                }
                
                // Seleccionar este mazo como el actual
                if (this.currentDeckId) {
                    this.deckManager.selectDeck(this.currentDeckId);
                }
                
                // TODO: Enviar el mazo al servidor cuando se inicie la partida
                console.log('Mazo confirmado:', this.deck, 'Banquillo:', this.bench);
                this.hide();
            });
            return; // Salir aquí, el modal manejará el resto
        }
        
        // Seleccionar este mazo como el actual
        if (this.currentDeckId) {
            this.deckManager.selectDeck(this.currentDeckId);
        }
        
        // TODO: Enviar el mazo al servidor cuando se inicie la partida
        console.log('Mazo confirmado:', this.deck, 'Banquillo:', this.bench);
        this.hide();
    }
    
    /**
     * Actualiza la visualización del mazo o banquillo según el destino seleccionado
     */
    updateDeckDisplay() {
        const deckList = document.getElementById('deck-list');
        const deckCountEl = document.getElementById('deck-count');
        const deckLimitEl = document.getElementById('deck-limit');
        
        if (!deckList) return;
        
        // 🆕 NUEVO: Mostrar mazo o banquillo según el destino seleccionado
        if (this.destination === 'bench') {
            // Mostrar banquillo
            const benchCost = this.getBenchCost();
            const benchPointLimit = this.deckManager.getBenchPointLimit();
            
            // Actualizar contador de puntos
            if (deckCountEl) {
                deckCountEl.textContent = benchCost;
                // Cambiar color si está cerca o excede el límite
                if (benchCost >= benchPointLimit) {
                    deckCountEl.style.color = '#e74c3c'; // Rojo si excede
                } else if (benchCost >= benchPointLimit * 0.9) {
                    deckCountEl.style.color = '#f39c12'; // Naranja si está cerca (90%+)
                } else {
                    deckCountEl.style.color = '#ffffff'; // Blanco normal
                }
            }
            
            // Actualizar límite mostrado
            if (deckLimitEl) {
                deckLimitEl.textContent = benchPointLimit;
            }
            
            // Limpiar lista
            deckList.innerHTML = '';
            
            // Renderizar todas las unidades del banquillo
            if (this.bench.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.className = 'deck-empty';
                emptyMsg.textContent = 'El banquillo está vacío. Selecciona "Banquillo" y haz clic en las unidades disponibles para añadirlas.';
                deckList.appendChild(emptyMsg);
            } else {
                this.bench.forEach(itemId => {
                    const itemConfig = this.getItemConfig(itemId);
                    if (!itemConfig) return;
                    
                    const benchItemEl = this.createBenchItem(itemId, itemConfig);
                    deckList.appendChild(benchItemEl);
                });
            }
        } else {
            // Mostrar mazo
            const deckCost = this.getDeckCost();
            const pointLimit = this.deckManager.getDeckPointLimit();
            
            // Actualizar contador de puntos
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
        }
        
        // Actualizar estado visual de items disponibles
        this.updateAvailableItemsState();
    }
    
    /**
     * 🆕 NUEVO: Crea un elemento visual para una unidad en el banquillo
     */
    createBenchItem(itemId, itemConfig) {
        const div = document.createElement('div');
        div.className = 'bench-item';
        div.dataset.itemId = itemId;
        
        // Click → entrar en modo permutación
        div.addEventListener('click', () => {
            this.enterSwapMode(itemId);
        });
        
        // Click derecho → vista ampliada
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showCardZoom(itemConfig);
        });
        
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
            ctx.imageSmoothingEnabled = true;
            if (ctx.imageSmoothingQuality) {
                ctx.imageSmoothingQuality = 'high';
            }
            ctx.drawImage(sprite, 0, 0, 48, 48);
        }
        
        div.appendChild(icon);
        
        // Info
        const info = document.createElement('div');
        info.className = 'deck-item-info';
        
        const name = document.createElement('div');
        name.className = 'deck-item-name';
        name.textContent = itemConfig.name;
        info.appendChild(name);
        
        // Precio
        if (itemConfig.cost && itemConfig.cost > 0) {
            const cost = document.createElement('div');
            cost.className = 'deck-item-cost';
            cost.textContent = itemConfig.cost;
            info.appendChild(cost);
        }
        
        div.appendChild(info);
        
        // Botón quitar (todas las cartas del banquillo se pueden quitar)
        const removeBtn = document.createElement('button');
        removeBtn.className = 'deck-item-remove'; // Usar la misma clase que el deck para mantener consistencia
        removeBtn.textContent = '−';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar que active el modo permutación
            this.removeFromBench(itemId);
        });
        div.appendChild(removeBtn);
        
        return div;
    }
    
    /**
     * 🆕 NUEVO: Calcula el costo total del banquillo
     */
    getBenchCost() {
        return this.deckManager.calculateBenchCost(this.bench);
    }
    
    /**
     * 🆕 NUEVO: Añade una unidad al banquillo
     */
    addToBench(unitId) {
        // Usar la función de validación unificada
        const check = this.canAddToBench(unitId);
        if (!check.canAdd) {
            this.showNotification(check.reason, 'error');
            return false;
        }
        
        // Añadir al banquillo
        this.bench.push(unitId);
        this.updateDeckDisplay();
        this.updateAvailableItemsState();
        
        return true;
    }
    
    /**
     * 🆕 NUEVO: Quita una unidad del banquillo
     */
    removeFromBench(unitId) {
        const index = this.bench.indexOf(unitId);
        if (index >= 0) {
            this.bench.splice(index, 1);
            this.updateDeckDisplay();
            this.updateAvailableItemsState();
            return true;
        }
        return false;
    }
    
    /**
     * 🆕 NUEVO: Entra en modo permutación (click en carta del banquillo)
     */
    enterSwapMode(benchUnitId) {
        this.swapMode = { benchUnitId };
        
        // Añadir clase al contenedor para estilos CSS
        const arsenalContainer = document.querySelector('.arsenal-container');
        if (arsenalContainer) {
            arsenalContainer.classList.add('swap-mode-active');
        }
        
        // Resaltar la carta del banquillo seleccionada
        const benchItems = document.querySelectorAll('.bench-item');
        benchItems.forEach(item => {
            if (item.dataset.itemId === benchUnitId) {
                item.classList.add('swap-selected');
            } else {
                item.classList.remove('swap-selected');
            }
        });
        
        // Resaltar las cartas del deck que se pueden permutar (todas excepto HQ)
        const deckItems = document.querySelectorAll('.deck-item');
        deckItems.forEach(item => {
            const deckUnitId = item.dataset.itemId;
            if (deckUnitId && deckUnitId !== 'hq') {
                item.classList.add('swap-target');
                // Añadir listener de click para permutar
                item.addEventListener('click', this.handleDeckItemSwapClick.bind(this, deckUnitId, benchUnitId), { once: true });
            }
        });
        
        this.showNotification('Selecciona una carta del mazo para permutar', 'info');
    }
    
    /**
     * 🆕 NUEVO: Maneja el click en una carta del deck durante modo permutación
     */
    handleDeckItemSwapClick(deckUnitId, benchUnitId) {
        this.performSwap(deckUnitId, benchUnitId);
    }
    
    /**
     * 🆕 NUEVO: Realiza la permutación entre mazo y banquillo
     */
    performSwap(deckUnitId, benchUnitId) {
        // Validar permutación
        const currentDeck = {
            units: [...this.deck],
            bench: [...this.bench]
        };
        
        const validation = this.deckManager.validateSwap(currentDeck, deckUnitId, benchUnitId);
        if (!validation.valid) {
            this.showNotification(validation.errors[0] || 'No se puede realizar la permutación', 'error');
            this.exitSwapMode();
            return false;
        }
        
        // Realizar permutación
        const deckIndex = this.deck.indexOf(deckUnitId);
        const benchIndex = this.bench.indexOf(benchUnitId);
        
        if (deckIndex >= 0 && benchIndex >= 0) {
            this.deck[deckIndex] = benchUnitId;
            this.bench[benchIndex] = deckUnitId;
            
            this.updateDeckDisplay();
            this.updateAvailableItemsState();
            this.exitSwapMode();
            
            this.showNotification('Permutación realizada', 'success');
            return true;
        }
        
        this.exitSwapMode();
        return false;
    }
    
    /**
     * 🆕 NUEVO: Sale del modo permutación
     */
    exitSwapMode() {
        this.swapMode = null;
        
        // Remover clase del contenedor
        const arsenalContainer = document.querySelector('.arsenal-container');
        if (arsenalContainer) {
            arsenalContainer.classList.remove('swap-mode-active');
        }
        
        // Remover clases de resaltado
        document.querySelectorAll('.bench-item').forEach(item => {
            item.classList.remove('swap-selected');
        });
        
        document.querySelectorAll('.deck-item').forEach(item => {
            item.classList.remove('swap-target');
        });
    }
    
    /**
     * Actualiza el estado visual de los items disponibles según si están en el mazo
     * 🆕 ACTUALIZADO: También verifica si se puede añadir sin exceder límite de puntos
     * 🆕 FIX: Re-añade event listeners si faltan para permitir añadir items
     */
    updateAvailableItemsState() {
        const items = document.querySelectorAll('.arsenal-item');
        const currentCost = this.getDeckCost();
        
        items.forEach(itemDiv => {
            const itemId = itemDiv.dataset.itemId;
            if (!itemId) return;
            
            const isInDeck = this.deck.includes(itemId);
            const isInBench = this.bench.includes(itemId); // 🆕 NUEVO: Verificar banquillo
            
            if (isInDeck) {
                itemDiv.classList.add('in-deck');
                itemDiv.style.opacity = '0.5';
                itemDiv.style.cursor = 'not-allowed';
                // NO poner pointerEvents: 'none' para permitir click derecho
            } else if (isInBench) {
                // 🆕 NUEVO: Si está en el banquillo, marcarlo visualmente pero permitir añadir al mazo
                itemDiv.classList.add('in-bench');
                itemDiv.style.opacity = '0.7';
                itemDiv.style.cursor = 'pointer';
                itemDiv.title = 'Esta unidad está en el banquillo. Click para añadir al mazo, click derecho para ver detalles.';
            } else {
                // 🆕 NUEVO: Verificar si se puede añadir sin exceder límite
                const check = this.canAddToDestination(itemId);
                if (!check.canAdd) {
                    itemDiv.classList.add('disabled');
                    itemDiv.style.opacity = '0.4';
                    itemDiv.style.cursor = 'not-allowed';
                    itemDiv.title = check.reason; // Mostrar razón en tooltip
                    // NO poner pointerEvents: 'none' para permitir click derecho en todas las cartas
                } else {
                    itemDiv.classList.remove('disabled');
                    itemDiv.style.opacity = '1';
                    itemDiv.style.cursor = 'pointer';
                    itemDiv.title = ''; // Limpiar tooltip
                    // NO cambiar pointerEvents, mantener para permitir click derecho
                    
                    // 🆕 FIX: Re-añadir event listener si no existe (necesario cuando se crea un nuevo mazo)
                    // Usar una marca para evitar añadir listeners duplicados
                    if (!itemDiv.dataset.hasClickListener) {
                        // Obtener la configuración del item para re-añadir listeners
                        const itemConfig = this.getItemConfig(itemId);
                        if (itemConfig) {
                            // Remover listeners antiguos clonando el elemento (sin listeners)
                            const newDiv = itemDiv.cloneNode(false);
                            // Copiar todos los hijos (canvas, etc.)
                            while (itemDiv.firstChild) {
                                newDiv.appendChild(itemDiv.firstChild);
                            }
                            // Copiar atributos y estilos
                            Array.from(itemDiv.attributes).forEach(attr => {
                                if (attr.name !== 'data-has-click-listener') {
                                    newDiv.setAttribute(attr.name, attr.value);
                                }
                            });
                            newDiv.style.cssText = itemDiv.style.cssText;
                            
                            // Asegurar que se remueva la clase 'in-deck' antes de reemplazar
                            newDiv.classList.remove('in-deck');
                            
                            // Reemplazar el elemento
                            itemDiv.parentNode.replaceChild(newDiv, itemDiv);
                            
                            // Marcar que ya tiene listener
                            newDiv.dataset.hasClickListener = 'true';
                            
                            // Añadir event listener de click (según destino)
                            newDiv.addEventListener('click', () => {
                                if (this.destination === 'bench') {
                                    if (this.addToBench(itemId)) {
                                        this.showNotification(`${itemId} añadido al banquillo`, 'success');
                                        // Feedback visual
                                        newDiv.style.transform = 'scale(0.95)';
                                        setTimeout(() => {
                                            newDiv.style.transform = '';
                                            this.updateAvailableItemsState();
                                        }, 150);
                                    }
                                } else {
                                    if (this.addToDeck(itemId)) {
                                        // Feedback visual
                                        newDiv.style.transform = 'scale(0.95)';
                                        setTimeout(() => {
                                            newDiv.style.transform = '';
                                            newDiv.classList.add('in-deck');
                                            newDiv.style.opacity = '0.5';
                                            newDiv.style.cursor = 'not-allowed';
                                        }, 150);
                                    }
                                }
                            });
                            
                            // Re-añadir click derecho → vista ampliada (siempre disponible)
                            newDiv.addEventListener('contextmenu', (e) => {
                                e.preventDefault();
                                this.showCardZoom(itemConfig);
                            });
                            
                            // Re-añadir hover listeners
                            newDiv.addEventListener('mouseenter', () => this.showDetail(itemConfig));
                            newDiv.addEventListener('focus', () => this.showDetail(itemConfig));
                        }
                    } else {
                        // Si ya tiene listener, solo asegurar que no tenga la clase 'in-deck'
                        itemDiv.classList.remove('in-deck');
                    }
                }
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
        
        // Click derecho → vista ampliada
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevenir menú contextual del navegador
            this.showCardZoom(itemConfig);
        });
        
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
            ctx.imageSmoothingEnabled = true;
            if (ctx.imageSmoothingQuality) {
                ctx.imageSmoothingQuality = 'high';
            }
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
        if (!container) {
            console.error('❌ No se encontró el contenedor arsenal-content');
            return;
        }
        
        container.innerHTML = '';
        
        // Obtener todas las cartas (HQ, edificios y consumibles)
        const allyNodes = getAllyNodes();
        const projectiles = getProjectiles();
        
        // Recopilar todas las cartas en un solo array
        const allItems = [];
        
        // Añadir HQ
        const hqNode = allyNodes.find(n => n.id === 'hq');
        if (hqNode) {
            const hqConfig = getNodeConfig('hq');
            if (hqConfig) {
                allItems.push({
                    id: hqConfig.id || hqNode.id,
                    name: hqConfig.name || hqNode.name,
                    description: hqConfig.description || hqNode.description,
                    details: hqConfig.details,
                    spriteKey: hqConfig.spriteKey || hqNode.spriteKey,
                    cost: hqConfig.cost || hqNode.cost || 0
                });
            }
        }
        
        // Añadir edificios (excluyendo HQ y front)
        const buildings = allyNodes.filter(n => 
            n.id !== 'hq' && n.id !== 'front' && n.category === 'buildable'
        );
        buildings.forEach(b => {
            const nodeConfig = getNodeConfig(b.id);
            allItems.push({
                id: b.id,
                name: nodeConfig?.name || b.name,
                description: nodeConfig?.description || b.description,
                details: nodeConfig?.details,
                spriteKey: nodeConfig?.spriteKey || b.spriteKey,
                cost: nodeConfig?.cost || b.cost || 0
            });
        });
        
        // Añadir consumibles
        projectiles.forEach(p => {
            const nodeConfig = getNodeConfig(p.id);
            allItems.push({
                id: p.id,
                name: nodeConfig?.name || p.name,
                description: nodeConfig?.description || p.description,
                details: nodeConfig?.details,
                spriteKey: nodeConfig?.spriteKey || p.spriteKey,
                cost: nodeConfig?.cost || p.cost || 0
            });
        });
        
        // Ordenar todas las cartas por precio (coste)
        allItems.sort((a, b) => {
            const costA = a.cost || 0;
            const costB = b.cost || 0;
            return costA - costB;
        });
        
        // Crear un solo contenedor de items sin categorías
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'arsenal-items';
        
        allItems.forEach(item => {
            const itemElement = this.createItem(item);
            itemsContainer.appendChild(itemElement);
        });
        
        container.appendChild(itemsContainer);
        
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
        
        // Verificar si ya está en el mazo o banquillo
        const isInDeck = this.deck.includes(item.id);
        const isInBench = this.bench.includes(item.id);
        
        // Verificar si el dron está bloqueado (solo si buildSystem está disponible)
        const isDroneLocked = this.buildSystem && item.id === 'drone' && !this.buildSystem.hasDroneLauncher();
        
        // Verificar si el comando está bloqueado (solo si buildSystem está disponible)
        const isCommandoLocked = this.buildSystem && item.id === 'specopsCommando' && !this.buildSystem.hasIntelCenter();
        
        // Verificar si el truck assault está bloqueado (solo si buildSystem está disponible)
        const isTruckAssaultLocked = this.buildSystem && item.id === 'truckAssault' && !this.buildSystem.hasIntelCenter();
        
        // Verificar si el camera drone está bloqueado (solo si buildSystem está disponible)
        const isCameraDroneLocked = this.buildSystem && item.id === 'cameraDrone' && !this.buildSystem.hasDroneLauncher();
        
        // 🆕 NUEVO: Verificar si el destructor de mundos está bloqueado
        const isWorldDestroyerLocked = this.buildSystem && item.id === 'worldDestroyer' && !this.buildSystem.hasDeadlyBuild();
        
        // 🆕 NUEVO: Verificar si se puede añadir sin exceder límite de puntos (según destino)
        let canAddCheck = { canAdd: true, reason: '' };
        try {
            canAddCheck = this.canAddToDestination(item.id);
        } catch (error) {
            console.warn('Error al verificar si se puede añadir:', error);
            // Si hay error, permitir añadir (fallback)
        }
        const cannotAdd = !canAddCheck.canAdd && !isInDeck && !isInBench;
        const isLocked = isDroneLocked || isCommandoLocked || isTruckAssaultLocked || isCameraDroneLocked || isWorldDestroyerLocked;
        
        if (isInDeck) {
            div.classList.add('in-deck');
            div.style.opacity = '0.5';
            div.style.cursor = 'not-allowed';
        } else if (cannotAdd || isLocked) {
            // No se puede añadir (excede límite, ya está, o está bloqueado)
            div.classList.add('disabled');
            div.style.opacity = '0.4';
            div.style.cursor = 'not-allowed';
            // NO poner pointerEvents: 'none' para permitir click derecho en todas las cartas
            if (isLocked) {
                if (isDroneLocked) {
                    div.title = 'Necesitas construir una Lanzadera de Drones primero';
                } else if (isCommandoLocked || isTruckAssaultLocked) {
                    div.title = 'Necesitas construir un Centro de Inteligencia primero';
                } else if (isCameraDroneLocked) {
                    div.title = 'Necesitas construir una Lanzadera de Drones primero';
                } else if (isWorldDestroyerLocked) {
                    div.title = 'Necesitas construir una Construcción Prohibida primero';
                }
            } else {
                div.title = canAddCheck.reason;
            }
        } else {
            // Marcar que este item tiene el listener de click
            div.dataset.hasClickListener = 'true';
            
            div.addEventListener('click', () => {
                // 🆕 NUEVO: Añadir al destino seleccionado (mazo o banquillo)
                if (this.destination === 'bench') {
                    if (this.addToBench(item.id)) {
                        this.showNotification(`${item.name} añadido al banquillo`, 'success');
                        // Feedback visual
                        div.style.transform = 'scale(0.95)';
                        setTimeout(() => {
                            div.style.transform = '';
                            this.updateAvailableItemsState();
                        }, 150);
                    }
                } else {
                    // Destino: mazo
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
                }
            });
        }
        
        // Click derecho → mostrar detalles (siempre)
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevenir menú contextual del navegador
            
            // Si está en modo permutación, salir del modo
            if (this.swapMode) {
                this.exitSwapMode();
                return;
            }
            
            // Siempre mostrar vista ampliada
            this.showCardZoom(item);
        });
        
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
            ctx.imageSmoothingEnabled = true;
            if (ctx.imageSmoothingQuality) {
                ctx.imageSmoothingQuality = 'high';
            }
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
        ctx.imageSmoothingEnabled = true;
        if (ctx.imageSmoothingQuality) {
            ctx.imageSmoothingQuality = 'high';
        }
        
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
            // Usar details para la vista detallada, fallback a description si no hay details
            let descText = item.details || item.description || '';
            
            // Si hay details, reemplazar placeholders dinámicos
            if (item.details) {
                descText = this.replaceDetailsPlaceholders(item.details, item.id);
            }
            
            const safeDesc = descText
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
        
        // 🆕 FIX: Asegurar que el overlay capture eventos explícitamente
        overlay.style.pointerEvents = 'auto';
        overlay.style.zIndex = '9999'; // Asegurar que esté por encima de todo
        
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
            // 🆕 FIX: Limpiar estilos inline al ocultar
            overlay.style.pointerEvents = '';
            overlay.style.zIndex = '';
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
    
    /**
     * Muestra el modal para pedir el nombre del mazo
     * @param {Function} callback - Función a llamar cuando se confirme el nombre
     */
    showDeckNameModal(callback) {
        this.deckNameCallback = callback;
        const modal = document.getElementById('deck-name-modal-overlay');
        const input = document.getElementById('deck-name-input');
        
        if (modal && input) {
            input.value = '';
            // Remover la clase hidden para mostrar el modal
            modal.classList.remove('hidden');
            // 🆕 FIX: Asegurar que el modal capture eventos explícitamente
            modal.style.pointerEvents = 'auto';
            modal.style.zIndex = '9999'; // Asegurar que esté por encima de todo
            
            // Enfocar el input después de un pequeño delay para asegurar que el modal esté visible
            setTimeout(() => {
                input.focus();
                // 🆕 FIX: Asegurar que el input capture eventos
                input.style.pointerEvents = 'auto';
            }, 100);
        }
    }
    
    /**
     * Oculta el modal de nombre del mazo
     */
    hideDeckNameModal() {
        const modal = document.getElementById('deck-name-modal-overlay');
        const input = document.getElementById('deck-name-input');
        
        if (modal) {
            // Agregar la clase hidden para ocultar el modal
            modal.classList.add('hidden');
            // 🆕 FIX: Limpiar estilos inline al ocultar
            modal.style.pointerEvents = '';
            modal.style.zIndex = '';
        }
        if (input) {
            input.value = '';
            input.style.pointerEvents = '';
        }
        this.deckNameCallback = null;
    }
    
    /**
     * Reemplaza placeholders dinámicos en la descripción con valores desde serverNodes
     * @param {string} details - Texto con placeholders {x}, {n}, etc.
     * @param {string} itemId - ID del item
     * @returns {string} Texto con placeholders reemplazados
     */
    replaceDetailsPlaceholders(details, itemId) {
        if (!details) return '';
        
        const serverConfig = this.game?.serverBuildingConfig;
        if (!serverConfig) return details;
        
        let result = details;
        
        // Obtener valores dinámicos desde serverNodes
        const effects = serverConfig.effects?.[itemId] || {};
        const gameplay = serverConfig.gameplay?.[itemId] || {};
        const gameplayGlobal = serverConfig.gameplay || {}; // Para acceder a propiedades globales como worldDestroyer
        const capacities = serverConfig.capacities?.[itemId] || {};
        const specialNodes = serverConfig.specialNodes?.[itemId] || {};
        const temporaryEffects = serverConfig.temporaryEffects || {}; // 🆕 NUEVO: Efectos temporales (trained, wounded)
        const cost = serverConfig.costs?.[itemId] || 0;
        const detectionRadius = serverConfig.detectionRadii?.[itemId];
        
        // Reemplazos comunes
        result = result.replace(/{cost}/g, cost);
        
        // Reemplazos específicos según el item
        switch (itemId) {
            case 'hq':
                result = result.replace(/{maxVehicles}/g, capacities.maxVehicles || 4);
                result = result.replace(/{maxAmbulances}/g, capacities.maxAmbulances || 1);
                break;
                
            case 'fob':
                result = result.replace(/{maxSupplies}/g, capacities.maxSupplies || 100);
                result = result.replace(/{maxVehicles}/g, capacities.maxVehicles || 2);
                break;
                
            case 'antiDrone':
                result = result.replace(/{detectionRange}/g, gameplay.detectionRange || 160);
                result = result.replace(/{cooldownTime}/g, gameplay.cooldownTime || 3000);
                break;
                
            case 'campaignHospital':
                result = result.replace(/{actionRange}/g, gameplay.actionRange || 260);
                result = result.replace(/{maxVehicles}/g, capacities.maxVehicles || 1);
                break;
                
            case 'aerialBase':
                result = result.replace(/{maxSupplies}/g, capacities.maxSupplies || 200);
                break;
                
            case 'vigilanceTower':
                result = result.replace(/{detectionRadius}/g, detectionRadius || 320);
                break;
                
            case 'droneWorkshop':
                result = result.replace(/{requiredSupplies}/g, effects.requiredSupplies || 15);
                result = result.replace(/{discountPercent}/g, Math.round((1 - (effects.discountMultiplier || 0.5)) * 100) + '%');
                result = result.replace(/{suppliesCost}/g, effects.suppliesCost || 15);
                break;
                
            case 'truckFactory':
                result = result.replace(/{vehicleBonus}/g, effects.vehicleBonus || 1);
                result = result.replace(/{capacityBonus}/g, effects.capacityBonus || 15);
                break;
                
            case 'engineerCenter':
                result = result.replace(/{speedPercent}/g, Math.round(((effects.speedMultiplier || 1.5) - 1) * 100));
                break;
                
            case 'nuclearPlant':
                result = result.replace(/{incomeBonus}/g, effects.incomeBonus || 2);
                break;
                
            case 'trainStation':
                result = result.replace(/{trainInterval}/g, effects.trainInterval || 12);
                result = result.replace(/{trainCargo}/g, effects.trainCargo || 25);
                break;
                
            case 'vehicleWorkshop':
                result = result.replace(/{vehicleBonus}/g, effects.vehicleBonus || 1);
                break;
                
            case 'intelRadio':
                result = result.replace(/{investmentTime}/g, gameplay.investmentTime || 20);
                result = result.replace(/{investmentBonus}/g, gameplay.investmentBonus || 15);
                break;
                
            case 'specopsCommando':
                result = result.replace(/{detectionRadius}/g, specialNodes.detectionRadius || 200);
                result = result.replace(/{health}/g, specialNodes.health || 50);
                break;
                
            case 'truckAssault':
                result = result.replace(/{detectionRadius}/g, specialNodes.detectionRadius || 200);
                result = result.replace(/{health}/g, specialNodes.health || 50);
                break;
                
            case 'cameraDrone':
                result = result.replace(/{detectionRadius}/g, specialNodes.detectionRadius || 120);
                result = result.replace(/{currencyReward}/g, specialNodes.currencyReward || 10);
                result = result.replace(/{buildRadius}/g, specialNodes.buildRadius || 300);
                result = result.replace(/{health}/g, specialNodes.health || 50);
                break;
                
            case 'physicStudies':
                result = result.replace(/{nuclearPlantBonus}/g, effects.nuclearPlantBonus || 1);
                break;
                
            case 'secretLaboratory':
                result = result.replace(/{nuclearPlantBonus}/g, effects.nuclearPlantBonus || 1);
                break;
                
            case 'trainingCamp':
                // 🆕 NUEVO: Obtener currencyBonus desde temporaryEffects.trained
                const trainedEffect = temporaryEffects.trained || {};
                result = result.replace(/{currencyBonus}/g, trainedEffect.currencyBonus || 1);
                break;
                
            case 'worldDestroyer':
                const worldDestroyerConfig = gameplayGlobal.worldDestroyer || {};
                result = result.replace(/{countdownDuration}/g, worldDestroyerConfig.countdownDuration || 7);
                break;
        }
        
        return result;
    }
    
    /**
     * Muestra el modal de vista ampliada de carta
     * @param {Object} item - Configuración del item a mostrar
     */
    showCardZoom(item) {
        const overlay = document.getElementById('card-zoom-overlay');
        const canvas = document.getElementById('card-zoom-canvas');
        const nameEl = document.getElementById('card-zoom-name');
        const costEl = document.getElementById('card-zoom-cost');
        const descEl = document.getElementById('card-zoom-desc');
        
        if (!overlay || !canvas || !nameEl) return;
        
        // Remover la clase hidden para mostrar el modal
        overlay.classList.remove('hidden');
        overlay.style.pointerEvents = 'auto';
        overlay.style.zIndex = '9999';
        
        // Renderizar sprite en el canvas ampliado
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        if (ctx.imageSmoothingQuality) {
            ctx.imageSmoothingQuality = 'high';
        }
        
        const sprite = this.assetManager.getSprite(item.spriteKey);
        if (sprite) {
            // Calcular dimensiones manteniendo proporción
            const scale = Math.min(canvas.width / sprite.width, canvas.height / sprite.height);
            const targetW = sprite.width * scale;
            const targetH = sprite.height * scale;
            const x = (canvas.width - targetW) / 2;
            const y = (canvas.height - targetH) / 2;
            ctx.drawImage(sprite, 0, 0, sprite.width, sprite.height, x, y, targetW, targetH);
        }
        
        // Actualizar información de la carta
        nameEl.textContent = item.name || '';
        
        if (costEl) {
            costEl.textContent = item.cost ? `Coste: ${item.cost} $` : '';
        }
        
        if (descEl) {
            // 🆕 NUEVO: Usar details si está disponible, sino usar description
            let descriptionText = item.details || item.description || '';
            
            // Si hay details, reemplazar placeholders dinámicos
            if (item.details) {
                descriptionText = this.replaceDetailsPlaceholders(item.details, item.id);
            }
            
            // Aplicar tooltip para "wounded"
            const tip = 'Wounded: el frente consume +100% suministros';
            const safeDesc = descriptionText
                .replace(/"wounded"|wounded/gi, (m) => `<span class="tooltip" data-tip="${tip}">${m}</span>`);
            descEl.innerHTML = safeDesc;
        }
    }
    
    /**
     * Oculta el modal de vista ampliada de carta
     */
    hideCardZoom() {
        const overlay = document.getElementById('card-zoom-overlay');
        
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.style.pointerEvents = '';
            overlay.style.zIndex = '';
        }
    }
}

