// ===== GESTOR DE MAZOS (REFACTORIZADO) =====
// Usa API REST en vez de localStorage

import { deckService } from '../services/DeckService.js';
import { MigrationService } from '../services/MigrationService.js';
import { getNodeConfig } from '../config/nodes.js';

const DEFAULT_DECK_UUID = '00000000-0000-0000-0000-000000000001';

export class DeckManager {
    constructor(game) {
        this.game = game;
        this.decks = []; // Cache en memoria
        this.defaultDeckId = DEFAULT_DECK_UUID;
        this.lastSelectedDeckId = null;
        this.deckPointLimit = null;
        this.benchPointLimit = null;
        
        // Sistema de notificaciones
        this.defaultDeckReady = false;
        this._defaultDeckResolve = null;
        this._defaultDeckReadyPromise = new Promise((resolve) => {
            this._defaultDeckResolve = resolve;
        });
        this.defaultDeckListeners = new Set();
        
        this.initialize();
    }
    
    /**
     * Inicializa el sistema de mazos
     */
    async initialize() {
        console.log('🎴 Inicializando DeckManager (versión API)...');
        
        // Ejecutar migración automática
        await this.runMigration();
        
        // Cargar mazos desde la API
        await this.loadDecks();
        
        // Cargar el último mazo seleccionado desde localStorage
        this.lastSelectedDeckId = localStorage.getItem('lastSelectedDeckId');
        
        this.markDefaultDeckReady();
    }
    
    /**
     * Ejecuta la migración de localStorage a BD (una sola vez)
     */
    async runMigration() {
        try {
            const result = await MigrationService.migrateDecks();
            if (result.migrated > 0) {
                console.log(`✅ Migración completada: ${result.migrated} mazos migrados`);
            }
        } catch (error) {
            console.error('❌ Error en migración:', error);
        }
    }
    
    /**
     * Carga todos los mazos desde la API
     */
    async loadDecks() {
        try {
            // Obtener mazos del usuario
            const userDecks = await deckService.getUserDecks();
            
            // Obtener mazo por defecto
            const defaultDeck = await deckService.getDefaultDeck();
            
            // Combinar (default + user decks)
            this.decks = defaultDeck ? [defaultDeck, ...userDecks] : userDecks;
            
            console.log(`📂 Mazos cargados: ${this.decks.length} (1 default + ${userDecks.length} propios)`);
        } catch (error) {
            console.error('❌ Error cargando mazos:', error);
            this.decks = [];
        }
    }
    
    /**
     * Guarda el ID del último mazo seleccionado (solo el ID, no todo el mazo)
     */
    saveSelectedDeckId(deckId) {
        this.lastSelectedDeckId = deckId;
        if (deckId) {
            localStorage.setItem('lastSelectedDeckId', deckId);
        } else {
            localStorage.removeItem('lastSelectedDeckId');
        }
    }
    
    /**
     * Verifica si existe un mazo predeterminado
     */
    hasDefaultDeck() {
        return this.decks.some(d => d.is_default === true);
    }
    
    /**
     * Establece el mazo por defecto desde el servidor
     */
    async setDefaultDeckFromServer(defaultDeck) {
        console.log('📥 Mazo por defecto recibido del servidor');
        
        // El default deck ya está en la BD, solo actualizar cache
        const existingIndex = this.decks.findIndex(d => d.id === DEFAULT_DECK_UUID);
        if (existingIndex >= 0) {
            this.decks[existingIndex] = { ...defaultDeck, is_default: true };
        } else {
            this.decks.unshift({ ...defaultDeck, is_default: true });
        }
        
        this.defaultDeckId = DEFAULT_DECK_UUID;
        this.markDefaultDeckReady();
        this.notifyDefaultDeckUpdated();
    }
    
    /**
     * Crea un nuevo mazo
     */
    async createDeck(name, units, bench = [], disciplines = []) {
        try {
            const deck = await deckService.createDeck(name, units, bench, disciplines);
            
            // Actualizar cache
            this.decks.push(deck);
            
            return deck;
        } catch (error) {
            console.error('❌ Error creando mazo:', error);
            return null;
        }
    }
    
    /**
     * Actualiza un mazo existente
     */
    async updateDeck(deckId, updates) {
        try {
            const updatedDeck = await deckService.updateDeck(deckId, updates);
            
            // Actualizar cache
            const index = this.decks.findIndex(d => d.id === deckId);
            if (index >= 0) {
                this.decks[index] = updatedDeck;
            }
            
            return updatedDeck;
        } catch (error) {
            console.error('❌ Error actualizando mazo:', error);
            return null;
        }
    }
    
    /**
     * Elimina un mazo
     */
    async deleteDeck(deckId) {
        try {
            await deckService.deleteDeck(deckId);
            
            // Actualizar cache
            this.decks = this.decks.filter(d => d.id !== deckId);
            
            // Si era el seleccionado, limpiar selección
            if (this.lastSelectedDeckId === deckId) {
                this.saveSelectedDeckId(null);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error eliminando mazo:', error);
            return false;
        }
    }
    
    /**
     * Selecciona un mazo como el actual
     */
    selectDeck(deckId) {
        const deck = this.getDeck(deckId);
        if (!deck) {
            console.error('Mazo no encontrado:', deckId);
            return false;
        }
        
        // No permitir seleccionar el mazo predeterminado
        if (deck.is_default) {
            console.error('No se puede seleccionar el mazo predeterminado');
            return false;
        }
        
        this.saveSelectedDeckId(deckId);
        return true;
    }
    
    /**
     * Obtiene un mazo por ID (desde cache)
     */
    getDeck(deckId) {
        const deck = this.decks.find(d => d.id === deckId) || null;
        if (deck) {
            console.log('🔍 [DECK_MANAGER] getDeck:', deckId, '→ Disciplinas:', deck.disciplines);
        } else {
            console.warn('⚠️ [DECK_MANAGER] getDeck: Mazo no encontrado:', deckId);
        }
        return deck;
    }
    
    /**
     * Obtiene el mazo predeterminado
     */
    getDefaultDeck() {
        return this.decks.find(d => d.is_default === true) || null;
    }
    
    /**
     * Obtiene el mazo actualmente seleccionado
     */
    getSelectedDeck() {
        if (this.lastSelectedDeckId && this.lastSelectedDeckId !== this.defaultDeckId) {
            const deck = this.getDeck(this.lastSelectedDeckId);
            if (deck && !deck.is_default) {
                return deck;
            }
        }
        return null;
    }
    
    /**
     * Obtiene todos los mazos
     */
    getAllDecks() {
        return [...this.decks];
    }
    
    /**
     * Calcula el costo total de un mazo
     */
    calculateDeckCost(units) {
        if (!units || !Array.isArray(units)) return 0;
        
        let totalCost = 0;
        
        units.forEach(unitId => {
            // El HQ y FOB son gratis
            if (unitId === 'hq' || unitId === 'fob') return;
            
            const config = getNodeConfig(unitId);
            if (config && config.cost !== undefined) {
                totalCost += config.cost;
            }
        });
        
        return totalCost;
    }
    
    /**
     * Valida un mazo (misma lógica que antes)
     */
    validateDeck(deck) {
        const errors = [];
        
        // Validar nombre
        if (!deck.name || deck.name.trim() === '') {
            errors.push('El mazo debe tener un nombre');
        }
        
        // Validar unidades
        if (!deck.units || !Array.isArray(deck.units) || deck.units.length === 0) {
            errors.push('El mazo debe tener al menos una unidad');
        }
        
        // Validar límite de puntos del mazo
        if (this.deckPointLimit !== null) {
            const deckCost = this.calculateDeckCost(deck.units.filter(u => u !== 'hq' && u !== 'fob'));
            if (deckCost > this.deckPointLimit) {
                errors.push(`El mazo excede el límite de ${this.deckPointLimit} puntos (actual: ${deckCost})`);
            }
        }
        
        // Validar límite de puntos del banquillo
        if (this.benchPointLimit !== null && deck.bench && deck.bench.length > 0) {
            const benchCost = this.calculateDeckCost(deck.bench);
            if (benchCost > this.benchPointLimit) {
                errors.push(`El banquillo excede el límite de ${this.benchPointLimit} puntos (actual: ${benchCost})`);
            }
        }
        
        // Validar disciplinas
        if (deck.disciplines && deck.disciplines.length > 2) {
            errors.push('Máximo 2 disciplinas permitidas');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    // ============================================================
    // MÉTODOS DE LÍMITES (desde servidor)
    // ============================================================
    
    setPointLimit(limit) {
        this.deckPointLimit = limit;
        console.log('🎯 Límite de puntos actualizado desde servidor:', limit);
    }
    
    setBenchPointLimit(limit) {
        this.benchPointLimit = limit;
        console.log('🎯 Límite de puntos del banquillo actualizado desde servidor:', limit);
    }
    
    getDeckPointLimit() {
        return this.deckPointLimit;
    }
    
    getBenchPointLimit() {
        return this.benchPointLimit;
    }
    
    // ============================================================
    // SISTEMA DE NOTIFICACIONES
    // ============================================================
    
    markDefaultDeckReady() {
        if (!this.defaultDeckReady) {
            this.defaultDeckReady = true;
            if (this._defaultDeckResolve) {
                this._defaultDeckResolve();
            }
        }
    }
    
    waitForDefaultDeck() {
        return this._defaultDeckReadyPromise;
    }
    
    onDefaultDeckUpdated(callback) {
        this.defaultDeckListeners.add(callback);
    }
    
    offDefaultDeckUpdated(callback) {
        this.defaultDeckListeners.delete(callback);
    }
    
    notifyDefaultDeckUpdated() {
        this.defaultDeckListeners.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Error en listener de default deck:', error);
            }
        });
    }
}

