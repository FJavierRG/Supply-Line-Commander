// ===== GESTOR DE MAZOS (v2) =====
// Usa DeckService (API) en lugar de localStorage
// Solo guarda lastSelectedDeckId en localStorage

import { DeckService } from '../services/DeckService.js';
import { authService } from '../services/AuthService.js';
import { getNodeConfig } from '../config/nodes.js';

const STORAGE_KEY = 'slc_deck_state'; // Solo guarda lastSelectedDeckId

export class DeckManager {
    constructor(game) {
        this.game = game;
        this.deckService = new DeckService();
        
        // Caché en memoria
        this.decks = new Map(); // deckId -> deck
        this.defaultDeck = null;
        
        // Estado
        this.lastSelectedDeckId = null;
        this.deckPointLimit = null; // Viene del servidor (gameConfig.js)
        this.benchPointLimit = null; // Viene del servidor (gameConfig.js)
        
        // Inicialización asíncrona
        this.isReady = false;
        this.readyPromise = null;
        this.defaultDeckReady = false;
        this.defaultDeckPromise = null;
        
        // Listeners
        this.defaultDeckListeners = new Set();
        this.decksChangedListeners = new Set();
        
        // Cargar lastSelectedDeckId desde localStorage
        this.loadLastSelectedDeckId();
        
        // Inicializar en background (no bloquea)
        this.bootstrap();
    }

    /**
     * Cargar lastSelectedDeckId desde localStorage
     */
    loadLastSelectedDeckId() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const state = JSON.parse(stored);
                this.lastSelectedDeckId = state.lastSelectedDeckId || null;
            }
        } catch (error) {
            console.warn('Error cargando estado de mazo:', error);
        }
    }
    
    /**
     * Guardar lastSelectedDeckId en localStorage
     */
    saveLastSelectedDeckId() {
        try {
            const state = {
                lastSelectedDeckId: this.lastSelectedDeckId
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.warn('Error guardando estado de mazo:', error);
        }
    }
    
    /**
     * Inicialización asíncrona (en background)
     */
    async bootstrap() {
        try {
            // Cargar límites desde el servidor (si están disponibles)
            if (this.game.networkManager) {
                // Esperar a que llegue game_config
                this.game.networkManager.once('game_config', (config) => {
                    if (config.deckPointLimit !== undefined) {
                        this.deckPointLimit = config.deckPointLimit;
                    }
                    if (config.benchPointLimit !== undefined) {
                        this.benchPointLimit = config.benchPointLimit;
                    }
                });
            }
            
            // Cargar mazo por defecto
            await this.ensureDefaultDeckReady();
            
            // Cargar mazos del usuario (si está autenticado)
            await this.refreshDecks();
            
            this.isReady = true;
        } catch (error) {
            console.error('Error inicializando DeckManager:', error);
            // Continuar aunque falle (modo offline/fallback)
            this.isReady = true;
        }
    }

    /**
     * Esperar a que el DeckManager esté listo
     */
    async ensureReady() {
        if (this.isReady) return;
        
        if (!this.readyPromise) {
            this.readyPromise = new Promise((resolve) => {
                const checkReady = () => {
                    if (this.isReady) {
                        resolve();
        } else {
                        setTimeout(checkReady, 100);
                    }
                };
                checkReady();
            });
        }
        
        return this.readyPromise;
    }

    /**
     * Asegurar que el mazo por defecto esté cargado
     */
    async ensureDefaultDeckReady() {
        if (this.defaultDeckReady && this.defaultDeck) return this.defaultDeck;
        
        if (!this.defaultDeckPromise) {
            this.defaultDeckPromise = (async () => {
                try {
                    this.defaultDeck = await this.deckService.getDefaultDeck();
                    this.decks.set('default', this.defaultDeck);
                    this.defaultDeckReady = true;
                    
                    // Notificar listeners
                    this.defaultDeckListeners.forEach(listener => {
                        try {
                            listener(this.defaultDeck);
                        } catch (error) {
                            console.error('Error en listener de defaultDeck:', error);
                        }
                    });
                    
                    return this.defaultDeck;
                } catch (error) {
                    console.error('Error cargando mazo por defecto:', error);
                    // Fallback: crear mazo por defecto básico
                    this.defaultDeck = {
                        id: 'default',
                        name: 'Mazo Predeterminado',
                        units: ['hq', 'fob'],
                        bench: [],
                        disciplines: [],
                        isDefault: true
                    };
                    this.decks.set('default', this.defaultDeck);
                    this.defaultDeckReady = true;
                    return this.defaultDeck;
                }
            })();
        }
        
        return this.defaultDeckPromise;
    }

    /**
     * Refrescar lista de mazos desde la API
     */
    async refreshDecks() {
        try {
            // Verificar si hay autenticación antes de intentar cargar mazos
            if (!authService.isAuthenticated()) {
                // Usuario no autenticado, retornar array vacío silenciosamente
                return Array.from(this.decks.values()).filter(d => !d.isDefault);
            }
            
            const userDecks = await this.deckService.getUserDecks();
            
            // Actualizar caché
            userDecks.forEach(deck => {
                this.decks.set(deck.id, deck);
            });
            
            // Notificar listeners
            this.decksChangedListeners.forEach(listener => {
                try {
                    listener();
                } catch (error) {
                    console.error('Error en listener de decksChanged:', error);
                }
            });
            
            return userDecks;
        } catch (error) {
            // Solo registrar como warning si es un error de autenticación esperado
            if (error.status === 401) {
                // Silencioso: es normal si el usuario no está autenticado
                return Array.from(this.decks.values()).filter(d => !d.isDefault);
            } else {
                console.error('Error refrescando mazos:', error);
            }
            // Continuar con caché existente
            return Array.from(this.decks.values()).filter(d => !d.isDefault);
        }
    }

    /**
     * Obtener todos los mazos (default + usuario)
     */
    getAllDecks() {
        const allDecks = Array.from(this.decks.values());
        return allDecks.sort((a, b) => {
            // Default primero
            if (a.isDefault) return -1;
            if (b.isDefault) return 1;
            // Luego por fecha de actualización
            return (b.updated_at || b.updatedAt || 0) - (a.updated_at || a.updatedAt || 0);
        });
    }

    /**
     * Obtener un mazo por ID
     */
    getDeck(deckId) {
        if (deckId === 'default') {
            return this.defaultDeck;
        }
        return this.decks.get(deckId) || null;
    }
    
    /**
     * Obtener el mazo por defecto
     */
    getDefaultDeck() {
        return this.defaultDeck;
    }
    
    /**
     * Obtener el mazo seleccionado
     */
    getSelectedDeck() {
        if (this.lastSelectedDeckId) {
            return this.getDeck(this.lastSelectedDeckId);
        }
        return this.defaultDeck;
    }

    /**
     * Seleccionar un mazo
     */
    selectDeck(deckId) {
        this.lastSelectedDeckId = deckId;
        this.saveLastSelectedDeckId();
    }

    /**
     * Crear un nuevo mazo
     */
    async createDeck(name, units, bench = [], disciplines = []) {
        const deck = {
            name: name.trim(),
            units: [...units],
            bench: [...bench],
            disciplines: [...disciplines]
        };
        
        const created = await this.deckService.createDeck(deck);
        
        // Actualizar caché
        this.decks.set(created.id, created);
        
        // Notificar listeners
        this.decksChangedListeners.forEach(listener => {
            try {
                listener();
            } catch (error) {
                console.error('Error en listener de decksChanged:', error);
            }
        });
        
        return created;
    }

    /**
     * Actualizar un mazo existente
     */
    async updateDeck(deckId, updates) {
        const updated = await this.deckService.updateDeck(deckId, updates);
        
        // Actualizar caché
        this.decks.set(deckId, updated);
        
        // Notificar listeners
        this.decksChangedListeners.forEach(listener => {
            try {
                listener();
            } catch (error) {
                console.error('Error en listener de decksChanged:', error);
            }
        });
        
        return updated;
    }

    /**
     * Eliminar un mazo
     */
    async deleteDeck(deckId) {
        await this.deckService.deleteDeck(deckId);
        
        // Eliminar de caché
        this.decks.delete(deckId);
        
        // Si era el seleccionado, resetear
        if (this.lastSelectedDeckId === deckId) {
            this.lastSelectedDeckId = null;
            this.saveLastSelectedDeckId();
        }
        
        // Notificar listeners
        this.decksChangedListeners.forEach(listener => {
            try {
                listener();
            } catch (error) {
                console.error('Error en listener de decksChanged:', error);
            }
        });
    }

    /**
     * Calcular costo de un mazo
     */
    calculateDeckCost(units) {
        if (!units || !Array.isArray(units)) return 0;
        
        let total = 0;
        units.forEach(unitId => {
            if (unitId === 'hq' || unitId === 'fob') return; // HQ y FOB no cuentan
            const config = getNodeConfig(unitId);
            if (config && config.cost) {
                total += config.cost;
            }
        });
        return total;
    }

    /**
     * Validar un mazo
     */
    validateDeck(deck) {
        const errors = [];
        
        if (!deck.units || !Array.isArray(deck.units)) {
            errors.push('El mazo debe tener unidades');
        }
        
        if (!deck.units.includes('hq')) {
            errors.push('El mazo debe incluir el HQ');
        }
        
        const cost = this.calculateDeckCost(deck.units);
        if (this.deckPointLimit !== null && cost > this.deckPointLimit) {
            errors.push(`El costo del mazo (${cost}) excede el límite (${this.deckPointLimit})`);
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Obtener límite de puntos del mazo
     */
    getDeckPointLimit() {
        return this.deckPointLimit;
    }

    /**
     * Obtener límite de puntos del banquillo
     */
    getBenchPointLimit() {
        return this.benchPointLimit;
    }

    /**
     * Establecer límites (desde game_config del servidor)
     * Puede aceptar ambos límites o solo uno
     */
    setPointLimit(deckLimit, benchLimit) {
        if (deckLimit !== undefined) {
            this.deckPointLimit = deckLimit;
        }
        if (benchLimit !== undefined) {
            this.benchPointLimit = benchLimit;
        }
    }

    /**
     * Establecer límite del banquillo
     */
    setBenchPointLimit(limit) {
        this.benchPointLimit = limit;
    }

    /**
     * Listener para cambios en el mazo por defecto
     */
    onDefaultDeckUpdated(callback) {
        this.defaultDeckListeners.add(callback);
        // Si ya está cargado, llamar inmediatamente
        if (this.defaultDeckReady && this.defaultDeck) {
            try {
                callback(this.defaultDeck);
            } catch (error) {
                console.error('Error en listener de defaultDeck:', error);
            }
        }
    }

    /**
     * Listener para cambios en la lista de mazos
     */
    onDecksChanged(callback) {
        this.decksChangedListeners.add(callback);
    }
}

