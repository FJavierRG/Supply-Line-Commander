// ===== GESTOR DEL CONSTRUCTOR DE MAZOS (antes Arsenal) =====
import { getAllyNodes, getProjectiles, getBuildableNodes, getNodeConfig } from '../../config/nodes.js';
import { i18n } from '../../services/I18nService.js'; // ✅ NUEVO: Servicio de i18n

export class ArsenalManager {
    constructor(assetManager, game) {
        this.assetManager = assetManager;
        this.game = game;
        this.isVisible = false;
        this.openedFromMenu = false;
        
        // Sistema de mazo - ahora usa DeckManager
        this.deckManager = game.deckManager;
        this.handleDefaultDeckUpdated = this.handleDefaultDeckUpdated.bind(this);
        if (this.deckManager && this.deckManager.onDefaultDeckUpdated) {
            this.deckManager.onDefaultDeckUpdated(this.handleDefaultDeckUpdated);
        }
        this.currentDeckId = null; // ID del mazo que estamos editando
        this.deck = ['hq', 'fob']; // Array de IDs únicos - HQ y FOB siempre incluidos por defecto
        this.deckLimit = 20; // Límite máximo de unidades en el mazo (DEPRECATED: ahora se usa sistema de puntos)
        // 🆕 FIX: NO guardar copia del límite - siempre obtenerlo dinámicamente desde DeckManager (fuente única de verdad)
        
        // 🆕 NUEVO: Sistema de banquillo
        this.bench = []; // Array de IDs únicos del banquillo
        this.benchExpanded = false; // Estado del panel desplegable
        this.swapMode = null; // Modo de permutación: null, { benchUnitId: 'xxx' } cuando se selecciona una carta del bench
        this.destination = 'deck'; // 🆕 NUEVO: Destino por defecto: 'deck' o 'bench'
        
        // 🆕 NUEVO: Sistema de tabs (Unidades / Disciplinas)
        this.activeTab = 'units'; // Por defecto mostrar unidades
        
        // 🆕 NUEVO: Sistema de disciplinas
        this.disciplines = []; // Array de IDs de disciplinas (máximo 2)
        
        // Inicializar handlers para limpieza de eventos
        this.initHandlers();
        
        this.setupEventListeners();
    }
    
    initHandlers() {
        this.handlers = {
            arsenalBtnClick: () => {
                this.openedFromMenu = this.game.overlayManager.isOverlayVisible('main-menu-overlay');
                this.show();
            },
            backBtnClick: () => this.hide(),
            clearBtnClick: () => this.clearDeck(),
            saveBtnClick: () => this.saveDeck(),
            deckNameCancelClick: () => this.hideDeckNameModal(),
            deckNameConfirmClick: () => {
                const deckNameInput = document.getElementById('deck-name-input');
                const name = deckNameInput?.value?.trim();
                if (name && this.deckNameCallback) {
                    this.deckNameCallback(name);
                }
                this.hideDeckNameModal();
            },
            deckNameInputKeydown: (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const confirmBtn = document.getElementById('deck-name-confirm-btn');
                    confirmBtn?.click();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.hideDeckNameModal();
                }
            },
            newBtnClick: () => this.createNewDeck(),
            loadBtnClick: () => this.showDeckSelector(),
            selectorCloseBtnClick: () => this.hideDeckSelector(),
            cardZoomCloseBtnClick: () => this.hideCardZoom(),
            cardZoomOverlayClick: (e) => {
                const overlay = document.getElementById('card-zoom-overlay');
                if (e.target === overlay) {
                    this.hideCardZoom();
                }
            },
            documentKeydown: (e) => {
                const overlay = document.getElementById('card-zoom-overlay');
                if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) {
                    this.hideCardZoom();
                }
            },
            arsenalContentContextmenu: (e) => {
                // Solo prevenir si el click no fue en una carta (las cartas tienen su propio handler)
                const clickedCard = e.target.closest('.arsenal-item');
                if (!clickedCard) {
                    e.preventDefault();
                }
            },
            deckDestBtnClick: () => {
                this.setDestination('deck');
            },
            benchDestBtnClick: () => {
                this.setDestination('bench');
            },
            // 🆕 NUEVO: Handlers para tabs
            unitsTabClick: () => {
                this.setActiveTab('units');
            },
            disciplinesTabClick: () => {
                this.setActiveTab('disciplines');
            }
        };
    }
    
    setupEventListeners() {
        const arsenalBtn = document.getElementById('arsenal-btn');
        if (arsenalBtn) {
            arsenalBtn.addEventListener('click', this.handlers.arsenalBtnClick);
        }
        
        const backBtn = document.getElementById('arsenal-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', this.handlers.backBtnClick);
        }
        
        // Botones de acción del mazo
        const clearBtn = document.getElementById('deck-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', this.handlers.clearBtnClick);
        }
        
        const saveBtn = document.getElementById('deck-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', this.handlers.saveBtnClick);
        }
        
        // Event listeners del modal de nombre del mazo
        const deckNameInput = document.getElementById('deck-name-input');
        const deckNameCancelBtn = document.getElementById('deck-name-cancel-btn');
        const deckNameConfirmBtn = document.getElementById('deck-name-confirm-btn');
        
        if (deckNameCancelBtn) {
            deckNameCancelBtn.addEventListener('click', this.handlers.deckNameCancelClick);
        }
        
        if (deckNameConfirmBtn) {
            deckNameConfirmBtn.addEventListener('click', this.handlers.deckNameConfirmClick);
        }
        
        // Permitir Enter para confirmar
        if (deckNameInput) {
            deckNameInput.addEventListener('keydown', this.handlers.deckNameInputKeydown);
        }
        
        // Botón de nuevo mazo
        const newBtn = document.getElementById('arsenal-new-btn');
        if (newBtn) {
            newBtn.addEventListener('click', this.handlers.newBtnClick);
        }
        
        // Botón de cargar mazo
        const loadBtn = document.getElementById('arsenal-load-btn');
        if (loadBtn) {
            loadBtn.addEventListener('click', this.handlers.loadBtnClick);
        }
        
        // Botón de cerrar selector de mazos
        const selectorCloseBtn = document.getElementById('deck-selector-close-btn');
        if (selectorCloseBtn) {
            selectorCloseBtn.addEventListener('click', this.handlers.selectorCloseBtnClick);
        }
        
        // Event listeners del modal de vista ampliada de carta
        const cardZoomOverlay = document.getElementById('card-zoom-overlay');
        const cardZoomCloseBtn = document.getElementById('card-zoom-close-btn');
        
        if (cardZoomCloseBtn) {
            cardZoomCloseBtn.addEventListener('click', this.handlers.cardZoomCloseBtnClick);
        }
        
        // Cerrar modal al hacer click fuera del contenedor
        if (cardZoomOverlay) {
            cardZoomOverlay.addEventListener('click', this.handlers.cardZoomOverlayClick);
        }
        
        // Cerrar modal con tecla ESC
        document.addEventListener('keydown', this.handlers.documentKeydown);
        
        // Prevenir menú contextual del navegador en la zona de unidades disponibles
        const arsenalContent = document.getElementById('arsenal-content');
        if (arsenalContent) {
            arsenalContent.addEventListener('contextmenu', this.handlers.arsenalContentContextmenu);
        }
        
        // 🆕 NUEVO: Selector de destino (Mazo/Banquillo)
        const deckDestBtn = document.getElementById('destination-deck-btn');
        const benchDestBtn = document.getElementById('destination-bench-btn');
        
        if (deckDestBtn) {
            deckDestBtn.addEventListener('click', this.handlers.deckDestBtnClick);
        }
        
        if (benchDestBtn) {
            benchDestBtn.addEventListener('click', this.handlers.benchDestBtnClick);
        }
        
        // 🆕 NUEVO: Tabs de Unidades / Disciplinas
        const unitsTab = document.getElementById('arsenal-tab-units');
        const disciplinesTab = document.getElementById('arsenal-tab-disciplines');
        
        if (unitsTab) {
            unitsTab.addEventListener('click', this.handlers.unitsTabClick);
        }
        
        if (disciplinesTab) {
            disciplinesTab.addEventListener('click', this.handlers.disciplinesTabClick);
        }
    }

    /**
     * 🆕 NUEVO: Limpia los event listeners para evitar fugas de memoria
     */
    destroy() {
        // Limpiar listeners DOM
        const arsenalBtn = document.getElementById('arsenal-btn');
        if (arsenalBtn) arsenalBtn.removeEventListener('click', this.handlers.arsenalBtnClick);
        
        const backBtn = document.getElementById('arsenal-back-btn');
        if (backBtn) backBtn.removeEventListener('click', this.handlers.backBtnClick);
        
        const clearBtn = document.getElementById('deck-clear-btn');
        if (clearBtn) clearBtn.removeEventListener('click', this.handlers.clearBtnClick);
        
        const saveBtn = document.getElementById('deck-save-btn');
        if (saveBtn) saveBtn.removeEventListener('click', this.handlers.saveBtnClick);
        
        const deckNameCancelBtn = document.getElementById('deck-name-cancel-btn');
        if (deckNameCancelBtn) deckNameCancelBtn.removeEventListener('click', this.handlers.deckNameCancelClick);
        
        const deckNameConfirmBtn = document.getElementById('deck-name-confirm-btn');
        if (deckNameConfirmBtn) deckNameConfirmBtn.removeEventListener('click', this.handlers.deckNameConfirmClick);
        
        const deckNameInput = document.getElementById('deck-name-input');
        if (deckNameInput) deckNameInput.removeEventListener('keydown', this.handlers.deckNameInputKeydown);
        
        const newBtn = document.getElementById('arsenal-new-btn');
        if (newBtn) newBtn.removeEventListener('click', this.handlers.newBtnClick);
        
        const loadBtn = document.getElementById('arsenal-load-btn');
        if (loadBtn) loadBtn.removeEventListener('click', this.handlers.loadBtnClick);
        
        const selectorCloseBtn = document.getElementById('deck-selector-close-btn');
        if (selectorCloseBtn) selectorCloseBtn.removeEventListener('click', this.handlers.selectorCloseBtnClick);
        
        const cardZoomCloseBtn = document.getElementById('card-zoom-close-btn');
        if (cardZoomCloseBtn) cardZoomCloseBtn.removeEventListener('click', this.handlers.cardZoomCloseBtnClick);
        
        const cardZoomOverlay = document.getElementById('card-zoom-overlay');
        if (cardZoomOverlay) cardZoomOverlay.removeEventListener('click', this.handlers.cardZoomOverlayClick);
        
        document.removeEventListener('keydown', this.handlers.documentKeydown);
        
        const arsenalContent = document.getElementById('arsenal-content');
        if (arsenalContent) arsenalContent.removeEventListener('contextmenu', this.handlers.arsenalContentContextmenu);
        
        const deckDestBtn = document.getElementById('destination-deck-btn');
        if (deckDestBtn) deckDestBtn.removeEventListener('click', this.handlers.deckDestBtnClick);
        
        const benchDestBtn = document.getElementById('destination-bench-btn');
        if (benchDestBtn) benchDestBtn.removeEventListener('click', this.handlers.benchDestBtnClick);
        
        // 🆕 NUEVO: Limpiar listeners de tabs
        const unitsTab = document.getElementById('arsenal-tab-units');
        if (unitsTab) unitsTab.removeEventListener('click', this.handlers.unitsTabClick);
        
        const disciplinesTab = document.getElementById('arsenal-tab-disciplines');
        if (disciplinesTab) disciplinesTab.removeEventListener('click', this.handlers.disciplinesTabClick);
        
        // Limpiar suscripción al DeckManager
        /* this.deckManager se destruye con el juego, pero es buena práctica desuscribirse si existe el método */
    }

    handleDefaultDeckUpdated(defaultDeck) {
        if (!defaultDeck) return;
        
        if (this.isVisible) {
            // 🔧 FIX: Si estamos editando el default, actualizar el contenido sin resetear
            if (this.currentDeckId === 'default') {
                // Ya estamos editando el default, solo actualizar el contenido
                this.deck = [...defaultDeck.units];
                this.bench = [...(defaultDeck.bench || [])];
                this.disciplines = [...(defaultDeck.disciplines || [])]; // 🆕 NUEVO
                this.updateDeckDisplay();
            } else {
                // No estamos editando el default, usar loadSelectedDeck normalmente
                this.loadSelectedDeck();
                this.updateDeckDisplay();
            }
        } else {
            this.currentDeckId = defaultDeck.id;
            this.deck = [...defaultDeck.units];
            this.bench = [...(defaultDeck.bench || [])];
            this.disciplines = [...(defaultDeck.disciplines || [])]; // 🆕 NUEVO
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
                if (panelTitle) panelTitle.textContent = i18n.t('arsenal.your_deck');
                if (deckLimit) {
                    const limit = this.deckManager.getDeckPointLimit();
                    deckLimit.textContent = limit !== null && limit !== undefined ? limit : '-';
                }
            } else {
                deckBtn.classList.remove('active');
                benchBtn.classList.add('active');
                if (panelTitle) panelTitle.textContent = i18n.t('arsenal.bench');
                if (deckLimit) {
                    const limit = this.deckManager.getBenchPointLimit();
                    deckLimit.textContent = limit !== null && limit !== undefined ? limit : '-';
                }
            }
        }
        
        // Actualizar la visualización según el destino
        this.updateDeckDisplay();
    }
    
    /**
     * 🆕 NUEVO: Establece el tab activo (unidades o disciplinas)
     * @param {string} tab - 'units' o 'disciplines'
     */
    setActiveTab(tab) {
        this.activeTab = tab;
        
        const unitsTab = document.getElementById('arsenal-tab-units');
        const disciplinesTab = document.getElementById('arsenal-tab-disciplines');
        
        // Actualizar clases visuales de los tabs
        if (unitsTab && disciplinesTab) {
            if (tab === 'units') {
                unitsTab.classList.add('active');
                disciplinesTab.classList.remove('active');
            } else if (tab === 'disciplines') {
                unitsTab.classList.remove('active');
                disciplinesTab.classList.add('active');
            }
        }
        
        // Repoblar el contenido según el tab activo
        if (this.isVisible) {
            this.populateArsenal();
        }
    }
    
    async show() {
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
        
        // Asegurar que el mazo por defecto esté disponible antes de cargar datos
        try {
            await this.deckManager.ensureDefaultDeckReady();
        } catch (error) {
            console.error('❌ Error esperando el mazo por defecto:', error);
            this.showNotification(i18n.t('arsenal.notifications.default_deck_error'), 'error');
            // Continuar con fallback para no bloquear el arsenal
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
     * 🆕 NUEVO: También carga el banquillo y disciplinas
     * 🆕 NUEVO: Siempre empieza con mazo vacío (no carga el default automáticamente)
     * 🔧 FIX: Si ya estamos editando el default, mantenerlo o recargarlo
     */
    loadSelectedDeck() {
        const selectedDeck = this.deckManager.getSelectedDeck();
        
        // 🔧 FIX: Si ya estamos editando el default, mantenerlo o recargarlo desde el selector
        if (this.currentDeckId === 'default' && selectedDeck && selectedDeck.isDefault) {
            // Ya estamos editando el default, recargarlo desde el DeckManager
            this.deck = [...selectedDeck.units]; // Copia del array
            this.bench = [...(selectedDeck.bench || [])]; // 🆕 NUEVO: Copia del banquillo
            this.disciplines = [...(selectedDeck.disciplines || [])]; // 🆕 NUEVO: Copia de disciplinas
        }
        // Si hay un mazo seleccionado del jugador, cargarlo
        else if (selectedDeck && !selectedDeck.isDefault) {
            this.currentDeckId = selectedDeck.id;
            this.deck = [...selectedDeck.units]; // Copia del array
            this.bench = [...(selectedDeck.bench || [])]; // 🆕 NUEVO: Copia del banquillo
            this.disciplines = [...(selectedDeck.disciplines || [])]; // 🆕 NUEVO: Copia de disciplinas
        } else {
            // Solo resetear a mazo vacío si NO estamos editando el default
            if (this.currentDeckId !== 'default') {
                this.currentDeckId = null;
                this.deck = ['hq', 'fob'];
                this.bench = []; // 🆕 NUEVO: Banquillo vacío
                this.disciplines = []; // 🆕 NUEVO: Disciplinas vacías
            }
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
            // Establecer límite según el destino (viene SOLO del servidor - gameConfig.js)
            const limit = this.destination === 'bench' 
                ? this.deckManager.getBenchPointLimit() 
                : this.deckManager.getDeckPointLimit();
            deckLimitEl.textContent = limit !== null && limit !== undefined ? limit : '-';
        }
    }
    
    /**
     * 🆕 NUEVO: Crea un nuevo mazo vacío (solo con HQ y FOB)
     */
    createNewDeck() {
        // Limpiar el mazo actual y empezar con uno nuevo (solo HQ y FOB)
        this.currentDeckId = null;
        this.deck = ['hq', 'fob'];
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
        this.showNotification(i18n.t('arsenal.notifications.new_deck_created'), 'info');
        
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
        
        // Verificar límite de puntos (obtener dinámicamente desde DeckManager - gameConfig.js)
        const pointLimit = this.deckManager.getDeckPointLimit();
        if (pointLimit === null || pointLimit === undefined) {
            return { 
                canAdd: false, 
                reason: 'Esperando configuración del servidor...' 
            };
        }
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
        
        // Verificar límite de puntos del banquillo (obtener dinámicamente desde DeckManager - gameConfig.js)
        const benchPointLimit = this.deckManager.getBenchPointLimit();
        if (benchPointLimit === null || benchPointLimit === undefined) {
            return { 
                canAdd: false, 
                reason: 'Esperando configuración del servidor...' 
            };
        }
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
     * Quita una unidad del mazo (el HQ y FOB no se pueden quitar)
     */
    removeFromDeck(itemId) {
        // El HQ y FOB siempre deben estar en el mazo
        if (itemId === 'hq') {
            console.log('El HQ no se puede quitar del mazo');
            return false;
        }
        if (itemId === 'fob') {
            console.log('El FOB no se puede quitar del mazo');
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
     * Limpia el mazo completamente (excepto el HQ y FOB que siempre permanecen)
     */
    clearDeck() {
        const nonEssentialItems = this.deck.filter(id => id !== 'hq' && id !== 'fob');
        const hasBench = this.bench && this.bench.length > 0;
        const hasDisciplines = this.disciplines && this.disciplines.length > 0;
        
        if (nonEssentialItems.length === 0 && !hasBench && !hasDisciplines) return;
        
        if (confirm(i18n.t('arsenal.confirm.clear_deck'))) {
            this.deck = ['hq', 'fob']; // Mantener solo el HQ y FOB
            this.bench = []; // 🆕 NUEVO: Limpiar banquillo
            this.disciplines = []; // 🆕 NUEVO: Limpiar disciplinas
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
     * Guarda el mazo actual usando DeckManager (ahora async)
     */
    async saveDeck() {
        console.log('🔍 saveDeck() llamado');
        try {
            if (this.deck.length === 0) {
                console.log('🔍 Mazo vacío');
                this.showNotification(i18n.t('arsenal.notifications.deck_empty'), 'error');
                return;
            }
            console.log('🔍 Mazo no vacío, continuando...');
            
            // 🆕 NUEVO: Validar límite de puntos antes de guardar (obtener dinámicamente desde DeckManager - gameConfig.js)
            console.log('🔍 Calculando coste del mazo...');
            const deckCost = this.getDeckCost();
            console.log('🔍 Coste del mazo:', deckCost);
            const pointLimit = this.deckManager.getDeckPointLimit();
            console.log('🔍 Límite de puntos:', pointLimit);
            if (pointLimit === null || pointLimit === undefined) {
                console.log('🔍 Límite no disponible');
                this.showNotification(i18n.t('arsenal.notifications.waiting_server_config'), 'error');
                return;
            }
            if (deckCost > pointLimit) {
                console.log('🔍 Mazo excede límite');
                this.showNotification(i18n.t('arsenal.notifications.deck_exceeds_limit', { deckCost, pointLimit }), 'error');
                return;
            }
            console.log('🔍 Validación de límite del mazo OK');
            
            // 🆕 NUEVO: Validar también el banquillo (límite viene SOLO del servidor - gameConfig.js)
            console.log('🔍 Validando banquillo...');
            const benchCost = this.getBenchCost();
            const benchPointLimit = this.deckManager.getBenchPointLimit();
            console.log('🔍 Coste del banquillo:', benchCost);
            console.log('🔍 Límite del banquillo:', benchPointLimit);
            console.log('🔍 Comparación:', { benchCost, benchPointLimit, condition: benchCost > benchPointLimit });
            if (benchPointLimit !== null && benchPointLimit !== undefined && benchCost > benchPointLimit) {
                console.log('🔍 Banquillo excede límite');
                this.showNotification(i18n.t('arsenal.notifications.bench_exceeds_limit', { benchCost, benchPointLimit }), 'error');
                return;
            }
            console.log('🔍 Validación de banquillo OK');
            
            // 🆕 NUEVO: Si estamos editando el mazo default, siempre crear uno nuevo (nunca sobreescribir)
            console.log('🔍 Obteniendo mazo actual...');
            const currentDeck = this.currentDeckId ? this.deckManager.getDeck(this.currentDeckId) : null;
            const isDefaultDeck = this.isEditingDefaultDeck(currentDeck);
            const canUpdateExisting = this.currentDeckId && currentDeck && !isDefaultDeck;
            
            console.log('🔍 Estado del guardado:', {
                currentDeckId: this.currentDeckId,
                currentDeck: currentDeck,
                isDefaultDeck: isDefaultDeck,
                deckLength: this.deck.length
            });
            
            // Si estamos editando un mazo existente Y no es el default, actualizarlo
            if (canUpdateExisting) {
                console.log('🔍 Actualizando mazo existente:', this.currentDeckId);
                const updated = await this.deckManager.updateDeck(this.currentDeckId, {
                    units: [...this.deck],
                    bench: [...this.bench], // 🆕 NUEVO: Guardar banquillo
                    disciplines: [...this.disciplines] // 🆕 NUEVO: Guardar disciplinas
                });
                
                if (updated) {
                    console.log('Mazo actualizado:', updated.name);
                    this.showNotification(i18n.t('arsenal.notifications.deck_saved', { deckName: updated.name }), 'success');
                } else {
                    this.showNotification(i18n.t('arsenal.notifications.deck_save_error'), 'error');
                }
            } else {
                if (this.currentDeckId && !currentDeck) {
                    console.warn('⚠️ El mazo actual no se encuentra en DeckManager. Se creará una copia nueva.');
                }
                
                // Crear nuevo mazo - pedir nombre con modal
                // Esto incluye: mazo nuevo (currentDeckId === null) o mazo default (isDefaultDeck === true)
                console.log('🔍 Creando nuevo mazo - mostrando modal');
                const promptMessage = isDefaultDeck 
                    ? 'El mazo predeterminado no se puede modificar. Introduce un nombre para crear un nuevo mazo basado en él:'
                    : 'Introduce un nombre para el nuevo mazo:';
                
                console.log('🔍 Llamando showDeckNameModal con mensaje:', promptMessage);
                this.currentDeckId = null; // Forzar flujo de creación
                
                this.showDeckNameModal(async (name) => {
                    console.log('🔍 Callback del modal llamado con nombre:', name);
                    if (!name || name.trim() === '') {
                        return;
                    }
                    
                    try {
                        const newDeck = await this.deckManager.createDeck(name.trim(), [...this.deck], [...this.bench], [...this.disciplines]); // 🆕 NUEVO: Incluir banquillo y disciplinas
                        if (newDeck) {
                            this.currentDeckId = newDeck.id; // 🆕 NUEVO: Actualizar currentDeckId al nuevo mazo
                            this.deckManager.selectDeck(newDeck.id);
                            console.log('Nuevo mazo creado:', newDeck.name, isDefaultDeck ? '(basado en default)' : '');
                            this.showNotification(i18n.t('arsenal.notifications.deck_created', { deckName: newDeck.name }), 'success');
                        } else {
                            this.showNotification(i18n.t('arsenal.notifications.deck_create_error'), 'error');
                        }
                    } catch (error) {
                        console.error('❌ Error creando mazo:', error);
                        this.showNotification(i18n.t('arsenal.notifications.deck_create_error_detailed', { error: error.message }), 'error');
                    }
                }, promptMessage);
            }
        } catch (error) {
            console.error('❌ Error en saveDeck():', error);
            this.showNotification(i18n.t('arsenal.notifications.deck_save_error_detailed', { error: error.message }), 'error');
        }
    }
    
    /**
     * Carga un mazo guardado (asegurando que el HQ siempre esté presente)
     * @param {string} deckId - ID del mazo a cargar (opcional, usa el seleccionado si no se especifica)
     * 🆕 NUEVO: Permite cargar el mazo default (pero al guardar creará uno nuevo)
     */
    loadDeck(deckId = null) {
        const deckToLoad = deckId ? this.deckManager.getDeck(deckId) : this.deckManager.getSelectedDeck();
        
        if (!deckToLoad) {
            console.log('No hay mazo para cargar');
            return false;
        }
        
        // 🆕 NUEVO: Permitir cargar el mazo predeterminado (pero al guardar creará uno nuevo)
        this.currentDeckId = deckToLoad.id;
        this.deck = [...deckToLoad.units]; // Copia del array
        this.bench = [...(deckToLoad.bench || [])]; // 🆕 NUEVO: Cargar banquillo
        this.disciplines = [...(deckToLoad.disciplines || [])]; // 🆕 NUEVO: Cargar disciplinas
        this.updateDeckDisplay();
        console.log('Mazo cargado:', deckToLoad.name, deckToLoad.isDefault ? '(default - se creará nuevo al guardar)' : '');
        return true;
    }
    
    /**
     * Determina si el mazo que se está editando es el default
     * @param {Object|null} currentDeck - Opcionalmente pasar el mazo ya obtenido para evitar lookups extra
     * @returns {boolean}
     */
    isEditingDefaultDeck(currentDeck = null) {
        if (this.currentDeckId === 'default') {
            return true;
        }
        
        const deck = currentDeck || (this.currentDeckId ? this.deckManager.getDeck(this.currentDeckId) : null);
        return !!deck?.isDefault;
    }
    
    /**
     * Confirma el mazo y lo asigna al juego (ahora async)
     */
    async confirmDeck() {
        if (this.deck.length === 0) {
            this.showNotification(i18n.t('arsenal.notifications.deck_empty_add_units'), 'error');
            return;
        }
        
        // 🆕 NUEVO: Validar límite de puntos antes de confirmar (obtener dinámicamente desde DeckManager - gameConfig.js)
        const deckCost = this.getDeckCost();
        const pointLimit = this.deckManager.getDeckPointLimit();
        if (pointLimit === null || pointLimit === undefined) {
            this.showNotification(i18n.t('arsenal.notifications.waiting_server_config'), 'error');
            return;
        }
        if (deckCost > pointLimit) {
            this.showNotification(i18n.t('arsenal.notifications.deck_exceeds_limit_confirm', { deckCost, pointLimit }), 'error');
            return;
        }
        
        // 🆕 NUEVO: Validar también el banquillo (límite viene SOLO del servidor - gameConfig.js)
        const benchCost = this.getBenchCost();
        const benchPointLimit = this.deckManager.getBenchPointLimit();
        if (benchPointLimit !== null && benchPointLimit !== undefined && benchCost > benchPointLimit) {
            this.showNotification(i18n.t('arsenal.notifications.bench_exceeds_limit_confirm', { benchCost, benchPointLimit }), 'error');
            return;
        }
        
        const currentDeck = this.currentDeckId ? this.deckManager.getDeck(this.currentDeckId) : null;
        const editingDefaultDeck = this.isEditingDefaultDeck(currentDeck) || !currentDeck;
        
        // Guardar el mazo si hay cambios
        if (this.currentDeckId && !editingDefaultDeck) {
            try {
                await this.deckManager.updateDeck(this.currentDeckId, {
                    units: [...this.deck],
                    bench: [...this.bench], // 🆕 NUEVO: Guardar banquillo
                    disciplines: [...this.disciplines] // 🆕 NUEVO: Guardar disciplinas
                });
            } catch (error) {
                console.error('❌ Error guardando mazo antes de confirmar:', error);
                this.showNotification(i18n.t('arsenal.notifications.deck_save_error_detailed', { error: error.message }), 'error');
                return;
            }
        } else {
            if (editingDefaultDeck) {
                this.currentDeckId = null;
            }
            if (this.currentDeckId && !currentDeck) {
                console.warn('⚠️ El mazo actual no se encuentra en DeckManager. Se creará una copia nueva.');
            }
            // Si estamos editando el mazo default o no hay mazo actual, pedir nombre antes de crear
            this.showDeckNameModal(async (name) => {
                if (!name || name.trim() === '') {
                    return;
                }
                
                try {
                    const newDeck = await this.deckManager.createDeck(name.trim(), [...this.deck], [...this.bench], [...this.disciplines]); // 🆕 NUEVO: Incluir banquillo y disciplinas
                    if (newDeck) {
                        this.currentDeckId = newDeck.id;
                    }
                    
                    // Seleccionar este mazo como el actual
                    if (this.currentDeckId) {
                        this.deckManager.selectDeck(this.currentDeckId);
                    }
                    
                    // TODO: Enviar el mazo al servidor cuando se inicie la partida
                    console.log('Mazo confirmado:', this.deck, 'Banquillo:', this.bench, 'Disciplinas:', this.disciplines);
                    this.hide();
                } catch (error) {
                    console.error('❌ Error creando mazo antes de confirmar:', error);
                    this.showNotification(i18n.t('arsenal.notifications.deck_create_error_detailed', { error: error.message }), 'error');
                }
            });
            return; // Salir aquí porque el modal manejará el flujo
        }
        
        // TODO: Enviar el mazo al servidor cuando se inicie la partida
        console.log('Mazo confirmado:', this.deck, 'Banquillo:', this.bench, 'Disciplinas:', this.disciplines);
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
                // Cambiar color si está cerca o excede el límite (solo si el límite ya llegó del servidor)
                if (benchPointLimit !== null && benchPointLimit !== undefined) {
                    if (benchCost >= benchPointLimit) {
                        deckCountEl.style.color = '#e74c3c'; // Rojo si excede
                    } else if (benchCost >= benchPointLimit * 0.9) {
                        deckCountEl.style.color = '#f39c12'; // Naranja si está cerca (90%+)
                    } else {
                        deckCountEl.style.color = '#ffffff'; // Blanco normal
                    }
                } else {
                    deckCountEl.style.color = '#ffffff'; // Blanco normal mientras espera
                }
            }
            
            // Actualizar límite mostrado (viene SOLO del servidor - gameConfig.js)
            if (deckLimitEl) {
                deckLimitEl.textContent = benchPointLimit !== null && benchPointLimit !== undefined ? benchPointLimit : '-';
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
                // Cambiar color si está cerca o excede el límite (solo si el límite ya llegó del servidor)
                if (pointLimit !== null && pointLimit !== undefined) {
                    if (deckCost >= pointLimit) {
                        deckCountEl.style.color = '#e74c3c'; // Rojo si excede
                    } else if (deckCost >= pointLimit * 0.9) {
                        deckCountEl.style.color = '#f39c12'; // Naranja si está cerca (90%+)
                    } else {
                        deckCountEl.style.color = '#ffffff'; // Blanco normal
                    }
                } else {
                    deckCountEl.style.color = '#ffffff'; // Blanco normal mientras espera
                }
            }
            
            // Actualizar límite mostrado (viene SOLO del servidor - gameConfig.js)
            if (deckLimitEl) {
                deckLimitEl.textContent = pointLimit !== null && pointLimit !== undefined ? pointLimit : '-';
            }
            
            // Limpiar lista
            deckList.innerHTML = '';
            
            // Renderizar todas las unidades del mazo (siempre mostrar al menos el HQ y FOB)
            if (this.deck.length === 0) {
                // Por seguridad, asegurar que el HQ y FOB estén presentes
                this.deck = ['hq', 'fob'];
            }
            
            this.deck.forEach(itemId => {
                const itemConfig = this.getItemConfig(itemId);
                if (!itemConfig) return;
                
                const deckItemEl = this.createDeckItem(itemId, itemConfig);
                deckList.appendChild(deckItemEl);
            });
            
            // Si solo están el HQ y FOB, mostrar mensaje adicional
            const nonEssentialItems = this.deck.filter(id => id !== 'hq' && id !== 'fob');
            if (nonEssentialItems.length === 0) {
                const hintMsg = document.createElement('div');
                hintMsg.className = 'deck-empty';
                hintMsg.style.marginTop = '16px';
                hintMsg.style.fontSize = '12px';
                hintMsg.textContent = 'Añade más unidades para completar tu mazo.';
                deckList.appendChild(hintMsg);
            }
            
            // 🆕 NUEVO: Añadir disciplinas equipadas
            if (this.disciplines && this.disciplines.length > 0) {
                // Separador visual
                const separator = document.createElement('div');
                separator.className = 'disciplines-separator';
                separator.textContent = '⚡ Disciplinas';
                deckList.appendChild(separator);
                
                // Renderizar cada disciplina
                this.disciplines.forEach(disciplineId => {
                    const discipline = this.game?.serverDisciplineConfig?.[disciplineId];
                    if (discipline) {
                        const disciplineEl = this.createDisciplineDeckItem(disciplineId, discipline);
                        deckList.appendChild(disciplineEl);
                    }
                });
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
        
        // Resaltar las cartas del deck que se pueden permutar (todas excepto HQ y FOB)
        const deckItems = document.querySelectorAll('.deck-item');
        deckItems.forEach(item => {
            const deckUnitId = item.dataset.itemId;
            if (deckUnitId && deckUnitId !== 'hq' && deckUnitId !== 'fob') {
                item.classList.add('swap-target');
                // Añadir listener de click para permutar
                item.addEventListener('click', this.handleDeckItemSwapClick.bind(this, deckUnitId, benchUnitId), { once: true });
            }
        });
        
        this.showNotification(i18n.t('arsenal.notifications.select_card_to_swap'), 'info');
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
            this.showNotification(validation.errors[0] || i18n.t('arsenal.notifications.swap_not_allowed'), 'error');
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
            
            this.showNotification(i18n.t('arsenal.notifications.swap_success'), 'success');
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
            
            // Limpiar clases previas
            itemDiv.classList.remove('in-deck', 'in-bench', 'disabled');
            
            const isInDeck = this.deck.includes(itemId);
            const isInBench = this.bench.includes(itemId); // 🆕 NUEVO: Verificar banquillo
            
            if (isInDeck) {
                itemDiv.classList.add('in-deck');
                itemDiv.style.opacity = '0.5';
                itemDiv.style.cursor = 'not-allowed';
                // NO poner pointerEvents: 'none' para permitir click derecho
            } else if (isInBench) {
                // 🆕 NUEVO: Si está en el banquillo, marcarlo con tick amarillo
                itemDiv.classList.add('in-bench');
                itemDiv.style.opacity = '0.6';
                itemDiv.style.cursor = 'not-allowed';
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
                                        const itemConfig = this.getItemConfig(itemId);
                                        this.showNotification(i18n.t('arsenal.notifications.item_added_to_bench', { itemName: itemConfig?.name || itemId }), 'success');
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
        
        // El HQ y FOB no se pueden quitar
        const isHQ = itemId === 'hq';
        const isFOB = itemId === 'fob';
        const isLocked = isHQ || isFOB;
        if (isLocked) {
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
        
        // 🎯 NUEVO: Añadir precio (solo el número) - No mostrar precio para HQ ni FOB (son gratis)
        if (itemConfig.cost && itemConfig.cost > 0 && !isLocked) {
            const cost = document.createElement('div');
            cost.className = 'deck-item-cost';
            cost.textContent = itemConfig.cost;
            info.appendChild(cost);
        }
        
        div.appendChild(info);
        
        // Botón quitar (solo si no es HQ ni FOB)
        if (!isLocked) {
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
     * 🆕 NUEVO: Crea un elemento visual para una disciplina en el mazo
     * @param {string} disciplineId - ID de la disciplina
     * @param {Object} discipline - Configuración de la disciplina
     * @returns {HTMLElement} Elemento visual de la disciplina
     */
    createDisciplineDeckItem(disciplineId, discipline) {
        const div = document.createElement('div');
        div.className = 'deck-item discipline-deck-item'; // Clase adicional para estilos específicos
        div.dataset.disciplineId = disciplineId;
        
        // Click derecho → vista ampliada (usar método común)
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            // Adaptar disciplina al formato que espera showCardZoom
            const disciplineAsCard = {
                name: discipline.name,
                cost: 0,
                description: discipline.description || 'Sin descripción disponible.',
                details: discipline.description || '',
                spriteKey: null,
                _isDiscipline: true,
                _disciplineIcon: discipline.icon
            };
            
            this.showCardZoom(disciplineAsCard);
        });
        
        // Icono (usar imagen directamente en vez de canvas)
        const iconContainer = document.createElement('div');
        iconContainer.className = 'deck-item-icon';
        iconContainer.style.padding = '0';
        iconContainer.style.display = 'flex';
        iconContainer.style.alignItems = 'center';
        iconContainer.style.justifyContent = 'center';
        
        const icon = document.createElement('img');
        icon.src = discipline.icon;
        icon.alt = discipline.name;
        icon.style.width = '48px';
        icon.style.height = '48px';
        icon.style.objectFit = 'contain';
        
        iconContainer.appendChild(icon);
        div.appendChild(iconContainer);
        
        // Info
        const info = document.createElement('div');
        info.className = 'deck-item-info';
        
        const name = document.createElement('div');
        name.className = 'deck-item-name';
        name.textContent = discipline.name;
        info.appendChild(name);
        
        div.appendChild(info);
        
        // Botón quitar
        const removeBtn = document.createElement('button');
        removeBtn.className = 'deck-item-remove';
        removeBtn.textContent = '−';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeDisciplineFromDeck(disciplineId);
        });
        div.appendChild(removeBtn);
        
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
        
        // 🆕 NUEVO: Renderizar contenido según el tab activo
        if (this.activeTab === 'disciplines') {
            this.populateDisciplines(container);
            return;
        }
        
        // Tab 'units': Renderizar unidades (comportamiento actual)
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
    
    /**
     * 🆕 NUEVO: Renderiza el contenido de la pestaña de Disciplinas
     * @param {HTMLElement} container - Contenedor donde renderizar
     */
    populateDisciplines(container) {
        console.log('📋 populateDisciplines() llamado');
        console.log('📋 this.game:', !!this.game);
        console.log('📋 this.game.serverDisciplineConfig:', this.game?.serverDisciplineConfig);
        
        // Verificar que tengamos la configuración de disciplinas del servidor
        if (!this.game || !this.game.serverDisciplineConfig) {
            console.warn('⚠️ Configuración de disciplinas no disponible aún');
            this.showDisciplinesPlaceholder(container, i18n.t('common.loading'));
            return;
        }
        
        const disciplines = Object.values(this.game.serverDisciplineConfig);
        console.log('📋 Disciplinas encontradas:', disciplines.length);
        
        // Filtrar solo disciplinas habilitadas
        const enabledDisciplines = disciplines.filter(d => d.enabled !== false);
        console.log('📋 Disciplinas habilitadas:', enabledDisciplines.length);
        
        if (enabledDisciplines.length === 0) {
            this.showDisciplinesPlaceholder(container, 'No hay disciplinas disponibles');
            return;
        }
        
        // ✅ NUEVO: Aplicar traducciones si están disponibles
        if (this.game.disciplinesTranslated) {
            enabledDisciplines.forEach(discipline => {
                const translated = this.game.disciplinesTranslated[discipline.id];
                if (translated) {
                    discipline.name = translated.name;
                    discipline.description = translated.description;
                }
            });
        }
        
        // Crear contenedor de items similar al de unidades
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'arsenal-items';
        
        enabledDisciplines.forEach(discipline => {
            console.log('📋 Creando carta para:', discipline.id);
            const disciplineCard = this.createDisciplineCard(discipline);
            itemsContainer.appendChild(disciplineCard);
        });
        
        console.log('📋 Container appendChild ejecutado');
        container.appendChild(itemsContainer);
    }
    
    /**
     * 🆕 NUEVO: Refresca el estado visual de las cartas de disciplinas (ticks, oscurecimiento)
     */
    refreshDisciplinesView() {
        // Solo refrescar si estamos en la tab de disciplinas
        if (this.activeTab !== 'disciplines') return;
        
        const container = document.getElementById('arsenal-content');
        if (!container) return;
        
        // Limpiar y re-renderizar
        container.innerHTML = '';
        this.populateDisciplines(container);
    }
    
    /**
     * 🆕 NUEVO: Muestra un placeholder cuando no hay disciplinas
     * @param {HTMLElement} container - Contenedor donde renderizar
     * @param {string} message - Mensaje a mostrar
     */
    showDisciplinesPlaceholder(container, message) {
        const placeholder = document.createElement('div');
        placeholder.className = 'disciplines-placeholder';
        placeholder.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                padding: 40px;
                color: rgba(255, 255, 255, 0.6);
                text-align: center;
            ">
                <div style="font-size: 48px; margin-bottom: 20px;">⚡</div>
                <h3 style="
                    font-size: 20px;
                    color: #66bb6a;
                    margin-bottom: 12px;
                    font-weight: 600;
                ">${i18n.t('arsenal.disciplines')}</h3>
                <p style="
                    font-size: 14px;
                    line-height: 1.6;
                    max-width: 400px;
                ">
                    ${message}
                </p>
            </div>
        `;
        
        container.appendChild(placeholder);
    }
    
    /**
     * 🆕 NUEVO: Crea una carta de disciplina
     * @param {Object} discipline - Configuración de la disciplina
     * @returns {HTMLElement} Elemento de la carta
     */
    createDisciplineCard(discipline) {
        const card = document.createElement('div');
        card.className = 'arsenal-item discipline-card';
        card.dataset.disciplineId = discipline.id;
        
        // 🆕 NUEVO: Verificar si ya está equipada
        const isEquipped = this.disciplines.includes(discipline.id);
        const isFull = this.disciplines.length >= 2;
        
        // Estructura similar a las cartas de unidades (usando arsenal-item-icon como el resto)
        const icon = document.createElement('img');
        icon.className = 'arsenal-item-icon';
        icon.src = discipline.icon;
        icon.alt = discipline.name;
        
        const info = document.createElement('div');
        info.className = 'arsenal-item-info';
        
        const name = document.createElement('div');
        name.className = 'arsenal-item-name';
        name.textContent = discipline.name;
        
        const description = document.createElement('div');
        description.className = 'arsenal-item-description';
        description.textContent = discipline.description || 'Sin descripción disponible.';
        
        info.appendChild(name);
        info.appendChild(description);
        
        card.appendChild(icon);
        card.appendChild(info);
        
        // 🆕 NUEVO: Estados visuales
        if (isEquipped) {
            // Ya está equipada - tick naranja
            card.classList.add('in-discipline');
            card.style.opacity = '0.6';
            card.style.cursor = 'not-allowed';
        } else if (isFull) {
            // Ya hay 2 disciplinas equipadas - oscurecer
            card.classList.add('disabled');
            card.style.opacity = '0.4';
            card.style.cursor = 'not-allowed';
        }
        
        // IMPORTANTE: Click derecho - usar método común showCardZoom
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Click derecho en disciplina:', discipline.id);
            
            // Adaptar disciplina al formato que espera showCardZoom
            const disciplineAsCard = {
                name: discipline.name,
                cost: 0,
                description: discipline.description || 'Sin descripción disponible.',
                details: discipline.description || '',
                spriteKey: null,
                _isDiscipline: true,
                _disciplineIcon: discipline.icon
            };
            
            this.showCardZoom(disciplineAsCard);
            return false;
        }, true);
        
        // Click izquierdo: añadir al mazo (solo si no está equipada y no está lleno)
        if (!isEquipped && !isFull) {
            card.addEventListener('click', (e) => {
                // Solo procesar si no es click derecho
                if (e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Click izquierdo en disciplina:', discipline.id);
                this.addDisciplineToDeck(discipline.id);
            });
        }
        
        console.log('✅ Carta de disciplina creada:', discipline.id);
        
        return card;
    }
    
    /**
     * 🆕 NUEVO: Añade una disciplina al mazo
     * @param {string} disciplineId - ID de la disciplina
     */
    addDisciplineToDeck(disciplineId) {
        // Verificar que no tengamos ya 2 disciplinas
        if (this.disciplines && this.disciplines.length >= 2) {
            console.warn('⚠️ Ya tienes 2 disciplinas en el mazo');
            this.showNotification(i18n.t('arsenal.notifications.discipline_limit_reached'), 'error');
            return;
        }
        
        // Verificar que no esté duplicada
        if (this.disciplines && this.disciplines.includes(disciplineId)) {
            console.warn('⚠️ Esta disciplina ya está en el mazo');
            this.showNotification(i18n.t('arsenal.notifications.discipline_already_in_deck'), 'error');
            return;
        }
        
        // Añadir disciplina
        if (!this.disciplines) {
            this.disciplines = [];
        }
        this.disciplines.push(disciplineId);
        
        console.log('✅ Disciplina añadida:', disciplineId);
        this.showNotification(i18n.t('arsenal.notifications.discipline_added'), 'success');
        
        // Actualizar visualización
        this.updateDeckDisplay(); // Esto renderizará la disciplina en el panel derecho
        this.refreshDisciplinesView(); // 🆕 NUEVO: Actualizar estado visual de disciplinas disponibles
    }
    
    /**
     * 🆕 NUEVO: Quita una disciplina del mazo
     * @param {string} disciplineId - ID de la disciplina
     */
    removeDisciplineFromDeck(disciplineId) {
        if (!this.disciplines) return;
        
        const index = this.disciplines.indexOf(disciplineId);
        if (index > -1) {
            this.disciplines.splice(index, 1);
            console.log('✅ Disciplina quitada:', disciplineId);
            this.showNotification(i18n.t('arsenal.notifications.discipline_removed'), 'info');
            
            // Actualizar visualización
            this.updateDeckDisplay(); // Esto re-renderizará el deck sin la disciplina
            this.refreshDisciplinesView(); // 🆕 NUEVO: Actualizar estado visual de disciplinas disponibles
        }
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
        
        // 🆕 NUEVO: Verificar si esta carta requiere otro edificio para usarse
        const hasBuildRequirement = this.game?.serverBuildingConfig?.buildRequirements?.[item.id];
        
        // 🆕 NUEVO: Cambiar el UIFrame si tiene requisitos
        if (hasBuildRequirement) {
            div.style.backgroundImage = "url('assets/sprites/ui/UIFrames/card_box_unlocker.png')";
        }
        
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
        } else if (isInBench) {
            // 🆕 NUEVO: Carta en el banquillo - tick amarillo
            div.classList.add('in-bench');
            div.style.opacity = '0.6';
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
                        this.showNotification(i18n.t('arsenal.notifications.item_added_to_bench', { itemName: item.name }), 'success');
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
        
        // 🆕 NUEVO: Si tiene buildRequirement, añadir área de tooltip en esquina inferior derecha
        if (hasBuildRequirement) {
            const tooltipArea = document.createElement('div');
            tooltipArea.style.position = 'absolute';
            tooltipArea.style.bottom = '0';
            tooltipArea.style.right = '0';
            tooltipArea.style.width = '69px'; // 1/3 del ancho de la carta (207/3)
            tooltipArea.style.height = '146px'; // 1/2 del alto de la carta (293/2)
            tooltipArea.style.cursor = 'help';
            
            // 🆕 NUEVO: Obtener texto de requisitos dinámicamente
            const requirementsText = this.getBuildRequirementsText(item.id);
            tooltipArea.title = requirementsText || 'Esta carta requiere otra en mesa para poderse usar';
            tooltipArea.style.zIndex = '10';
            
            div.appendChild(tooltipArea);
            
            // Asegurar que el div padre tenga position relative
            div.style.position = 'relative';
        }
        
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
        
        // 🆕 NUEVO: Incluir el mazo default en la lista (pero marcado como no editable)
        const allDecks = this.deckManager.getAllDecks();
        const defaultDeck = allDecks.find(deck => deck.isDefault);
        const playerDecks = allDecks.filter(deck => !deck.isDefault);
        const selectedDeckId = this.deckManager.lastSelectedDeckId;
        
        // 🆕 NUEVO: Mostrar el mazo default primero si existe
        if (defaultDeck) {
            const item = document.createElement('div');
            item.className = 'deck-selector-item';
            if (defaultDeck.id === selectedDeckId) {
                item.classList.add('selected');
            }
            item.classList.add('default-deck'); // 🆕 NUEVO: Clase para estilizar el default
            
            // Info del mazo
            const info = document.createElement('div');
            info.className = 'deck-selector-item-info';
            
            const name = document.createElement('div');
            name.className = 'deck-selector-item-name';
            name.textContent = defaultDeck.name + ' (Predeterminado)';
            info.appendChild(name);
            
            const meta = document.createElement('div');
            meta.className = 'deck-selector-item-meta';
            meta.innerHTML = `
                <span>${defaultDeck.units.length} unidades</span>
                <span>•</span>
                <span>Mazo base del juego</span>
            `;
            info.appendChild(meta);
            
            item.appendChild(info);
            
            // Acciones
            const actions = document.createElement('div');
            actions.className = 'deck-selector-item-actions';
            
            // Botón cargar/seleccionar
            const loadBtn = document.createElement('button');
            loadBtn.className = 'deck-selector-item-btn';
            loadBtn.textContent = defaultDeck.id === selectedDeckId ? 'Seleccionado' : 'Cargar';
            loadBtn.disabled = defaultDeck.id === selectedDeckId;
            loadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.loadDeckFromSelector(defaultDeck.id);
            });
            actions.appendChild(loadBtn);
            
            // 🆕 NUEVO: No mostrar botón borrar para el default
            // (el default no se puede borrar)
            
            item.appendChild(actions);
            
            // Click en el item también carga el mazo
            item.addEventListener('click', (e) => {
                if (e.target === item || e.target.closest('.deck-selector-item-info')) {
                    if (defaultDeck.id !== selectedDeckId) {
                        this.loadDeckFromSelector(defaultDeck.id);
                    }
                }
            });
            
            listContainer.appendChild(item);
        }
        
        if (playerDecks.length === 0 && !defaultDeck) {
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
     * Borra un mazo desde el selector (ahora async)
     * @param {string} deckId - ID del mazo a borrar
     */
    async deleteDeckFromSelector(deckId) {
        if (!confirm(i18n.t('arsenal.confirm.delete_deck'))) {
            return;
        }
        
        try {
            await this.deckManager.deleteDeck(deckId);
            
            // Si se borró el mazo que estábamos editando, empezar con mazo vacío
            if (this.currentDeckId === deckId) {
                this.currentDeckId = null;
                this.deck = ['hq', 'fob'];
                this.updateDeckDisplay();
                this.populateArsenal();
            }
            
            // Actualizar la lista
            this.populateDeckSelector();
        } catch (error) {
            console.error('❌ Error borrando mazo:', error);
            this.showNotification(i18n.t('arsenal.notifications.deck_delete_error', { error: error.message }), 'error');
        }
    }
    
    /**
     * Muestra el modal para pedir el nombre del mazo
     * @param {Function} callback - Función a llamar cuando se confirme el nombre
     * @param {string} message - Mensaje opcional a mostrar en el modal
     */
    showDeckNameModal(callback, message = null) {
        console.log('🔍 showDeckNameModal() llamado', { callback: !!callback, message });
        this.deckNameCallback = callback;
        const modal = document.getElementById('deck-name-modal-overlay');
        const input = document.getElementById('deck-name-input');
        const messageEl = document.getElementById('deck-name-message');
        
        console.log('🔍 Elementos del modal:', { 
            modal: !!modal, 
            input: !!input, 
            messageEl: !!messageEl 
        });
        
        if (modal && input) {
            console.log('🔍 Mostrando modal - removiendo clase hidden');
            input.value = '';
            
            // 🆕 NUEVO: Mostrar mensaje personalizado si se proporciona
            if (messageEl) {
                if (message) {
                    messageEl.textContent = message;
                    messageEl.style.display = 'block';
                } else {
                    messageEl.style.display = 'none';
                }
            }
            
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
     * 🆕 NUEVO: Obtiene el texto de requisitos de construcción para una carta
     * @param {string} itemId - ID del item
     * @returns {string} Texto descriptivo de los requisitos, o cadena vacía si no tiene
     */
    getBuildRequirementsText(itemId) {
        const buildReqs = this.game?.serverBuildingConfig?.buildRequirements?.[itemId];
        if (!buildReqs || !buildReqs.required || buildReqs.required.length === 0) {
            return '';
        }
        
        // Obtener nombres de los edificios requeridos
        const requiredNames = buildReqs.required.map(reqId => {
            const config = getNodeConfig(reqId);
            return config?.name || reqId;
        });
        
        // Generar texto según la cantidad de requisitos
        if (requiredNames.length === 1) {
            return `Requiere ${requiredNames[0]} en mesa`;
        } else if (requiredNames.length === 2) {
            return `Requiere ${requiredNames[0]} y ${requiredNames[1]} en mesa`;
        } else {
            // Más de 2 requisitos (poco común)
            const lastReq = requiredNames.pop();
            return `Requiere ${requiredNames.join(', ')} y ${lastReq} en mesa`;
        }
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
        
        // 🆕 NUEVO: Soporte para disciplinas (usan path directo en vez de spriteKey)
        if (item._isDiscipline && item._disciplineIcon) {
            const img = new Image();
            img.onload = () => {
                // Calcular dimensiones manteniendo proporción
                const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
                const targetW = img.width * scale;
                const targetH = img.height * scale;
                const x = (canvas.width - targetW) / 2;
                const y = (canvas.height - targetH) / 2;
                ctx.drawImage(img, 0, 0, img.width, img.height, x, y, targetW, targetH);
            };
            img.src = item._disciplineIcon;
        } else {
            // Cartas normales usan spriteKey
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
        }
        
        // Actualizar información de la carta
        nameEl.textContent = item.name || '';
        
        if (costEl) {
            // 🆕 NUEVO: Disciplinas no muestran coste (siempre es 0)
            if (item._isDiscipline) {
                costEl.textContent = '⚡ DISCIPLINA';
                costEl.style.color = '#f39c12';
            } else {
                costEl.textContent = item.cost ? `Coste: ${item.cost} $` : '';
                costEl.style.color = '';
            }
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
                .replace(/"wounded"|wounded/gi, (m) => `<span class="tooltip" data-tip="${tip}">${m}</span>`)
                .replace(/\n/g, '<br>'); // Convertir saltos de línea a <br>
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

