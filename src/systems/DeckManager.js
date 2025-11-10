// ===== GESTOR DE MAZOS =====
// Maneja la persistencia y gestión de mazos (CRUD)
// Preparado para migración fácil a base de datos

// Mazo predeterminado del juego
// Nota: Este debe coincidir con server/config/defaultDeck.js
const DEFAULT_DECK_CONFIG = {
    id: 'default',
    name: 'Mazo Predeterminado',
    units: [
        'hq', 'fob', 'antiDrone', 'droneLauncher',
        'truckFactory', 'engineerCenter', 'intelRadio',
        'drone', 'sniperStrike'
    ],
    isDefault: true
};

const STORAGE_KEY = 'game_decks';

export class DeckManager {
    constructor(game) {
        this.game = game;
        this.decks = [];
        this.defaultDeckId = null;
        this.lastSelectedDeckId = null;
        
        this.initialize();
    }
    
    /**
     * Inicializa el sistema de mazos
     * Carga desde localStorage o crea el mazo predeterminado
     */
    initialize() {
        this.loadDecks();
        
        // Asegurar que siempre haya un mazo predeterminado
        if (!this.hasDefaultDeck()) {
            this.createDefaultDeck();
        } else {
            // Asegurar que el defaultDeckId esté configurado
            const defaultDeck = this.decks.find(d => d.isDefault === true);
            if (defaultDeck) {
                this.defaultDeckId = defaultDeck.id;
            }
        }
        
        // Si el último mazo seleccionado es el predeterminado, resetearlo
        if (this.lastSelectedDeckId === this.defaultDeckId) {
            this.lastSelectedDeckId = null;
        }
        
        // Si no hay mazo seleccionado o solo hay el predeterminado, no seleccionar ninguno
        // El arsenal empezará con mazo vacío
    }
    
    /**
     * Carga todos los mazos desde localStorage
     */
    loadDecks() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                this.decks = data.decks || [];
                this.defaultDeckId = data.defaultDeckId || null;
                this.lastSelectedDeckId = data.lastSelectedDeckId || null;
            } else {
                this.decks = [];
                this.defaultDeckId = null;
                this.lastSelectedDeckId = null;
            }
        } catch (error) {
            console.error('Error al cargar mazos:', error);
            this.decks = [];
            this.defaultDeckId = null;
            this.lastSelectedDeckId = null;
        }
    }
    
    /**
     * Guarda todos los mazos en localStorage
     */
    saveDecks() {
        try {
            const data = {
                decks: this.decks,
                defaultDeckId: this.defaultDeckId,
                lastSelectedDeckId: this.lastSelectedDeckId
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Error al guardar mazos:', error);
        }
    }
    
    /**
     * Verifica si existe un mazo predeterminado
     */
    hasDefaultDeck() {
        return this.decks.some(deck => deck.isDefault === true);
    }
    
    /**
     * Crea el mazo predeterminado
     */
    createDefaultDeck() {
        const now = Date.now();
        const defaultDeck = {
            ...DEFAULT_DECK_CONFIG,
            createdAt: now,
            updatedAt: now
        };
        
        // Verificar si ya existe uno con el mismo ID
        const existingIndex = this.decks.findIndex(d => d.id === defaultDeck.id);
        if (existingIndex >= 0) {
            this.decks[existingIndex] = defaultDeck;
        } else {
            this.decks.push(defaultDeck);
        }
        
        this.defaultDeckId = defaultDeck.id;
        if (!this.lastSelectedDeckId) {
            this.lastSelectedDeckId = defaultDeck.id;
        }
        
        this.saveDecks();
        return defaultDeck;
    }
    
    /**
     * Valida que un mazo sea válido
     * @param {Object} deck - Objeto del mazo a validar
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validateDeck(deck) {
        const errors = [];
        
        if (!deck || typeof deck !== 'object') {
            errors.push('El mazo no es válido');
            return { valid: false, errors };
        }
        
        if (!deck.name || deck.name.trim() === '') {
            errors.push('El mazo debe tener un nombre');
        }
        
        if (!Array.isArray(deck.units)) {
            errors.push('El mazo debe tener un array de unidades');
        } else {
            // Verificar que el HQ esté incluido
            if (!deck.units.includes('hq')) {
                errors.push('El mazo debe incluir el HQ');
            }
            
            // Verificar que no haya duplicados
            const uniqueUnits = [...new Set(deck.units)];
            if (uniqueUnits.length !== deck.units.length) {
                errors.push('El mazo no puede tener unidades duplicadas');
            }
            
            // Verificar que todas las unidades existan y estén habilitadas (si está disponible)
            if (this.game && this.game.serverBuildingConfig && this.game.serverBuildingConfig.behavior) {
                const enabled = this.game.serverBuildingConfig.behavior.enabled;
                deck.units.forEach(unitId => {
                    if (unitId !== 'hq' && enabled[unitId] === false) {
                        errors.push(`La unidad "${unitId}" está deshabilitada`);
                    }
                });
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Obtiene todos los mazos guardados
     * @returns {Array<Object>} Array de mazos
     */
    getAllDecks() {
        return [...this.decks];
    }
    
    /**
     * Obtiene un mazo por ID
     * @param {string} deckId - ID del mazo
     * @returns {Object|null} El mazo o null si no existe
     */
    getDeck(deckId) {
        return this.decks.find(d => d.id === deckId) || null;
    }
    
    /**
     * Obtiene el mazo predeterminado
     * @returns {Object|null} El mazo predeterminado o null si no existe
     */
    getDefaultDeck() {
        return this.decks.find(d => d.isDefault === true) || null;
    }
    
    /**
     * Obtiene el mazo actualmente seleccionado
     * @returns {Object|null} El mazo seleccionado (solo si no es predeterminado) o null
     */
    getSelectedDeck() {
        if (this.lastSelectedDeckId && this.lastSelectedDeckId !== this.defaultDeckId) {
            const deck = this.getDeck(this.lastSelectedDeckId);
            if (deck && !deck.isDefault) {
                return deck;
            }
        }
        return null;
    }
    
    /**
     * Crea un nuevo mazo
     * @param {string} name - Nombre del mazo
     * @param {Array<string>} units - Array de IDs de unidades
     * @returns {Object|null} El mazo creado o null si hay error
     */
    createDeck(name, units) {
        const now = Date.now();
        const deck = {
            id: `deck_${now}_${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(),
            units: [...units], // Copia del array
            createdAt: now,
            updatedAt: now,
            isDefault: false
        };
        
        const validation = this.validateDeck(deck);
        if (!validation.valid) {
            console.error('Error al validar mazo:', validation.errors);
            return null;
        }
        
        this.decks.push(deck);
        this.saveDecks();
        return deck;
    }
    
    /**
     * Actualiza un mazo existente
     * @param {string} deckId - ID del mazo a actualizar
     * @param {Object} updates - Objeto con las propiedades a actualizar
     * @returns {Object|null} El mazo actualizado o null si hay error
     */
    updateDeck(deckId, updates) {
        const deckIndex = this.decks.findIndex(d => d.id === deckId);
        if (deckIndex < 0) {
            console.error('Mazo no encontrado:', deckId);
            return null;
        }
        
        const deck = this.decks[deckIndex];
        
        // No permitir cambiar el estado de default
        if (deck.isDefault && updates.isDefault === false) {
            console.error('No se puede quitar el estado de predeterminado');
            return null;
        }
        
        // Crear mazo actualizado
        const updatedDeck = {
            ...deck,
            ...updates,
            id: deck.id, // No permitir cambiar el ID
            isDefault: deck.isDefault, // No permitir cambiar isDefault
            updatedAt: Date.now()
        };
        
        const validation = this.validateDeck(updatedDeck);
        if (!validation.valid) {
            console.error('Error al validar mazo actualizado:', validation.errors);
            return null;
        }
        
        this.decks[deckIndex] = updatedDeck;
        this.saveDecks();
        return updatedDeck;
    }
    
    /**
     * Elimina un mazo
     * @param {string} deckId - ID del mazo a eliminar
     * @returns {boolean} true si se eliminó correctamente
     */
    deleteDeck(deckId) {
        const deckIndex = this.decks.findIndex(d => d.id === deckId);
        if (deckIndex < 0) {
            console.error('Mazo no encontrado:', deckId);
            return false;
        }
        
        const deck = this.decks[deckIndex];
        
        // No permitir eliminar el mazo predeterminado
        if (deck.isDefault) {
            console.error('No se puede eliminar el mazo predeterminado');
            return false;
        }
        
        // Si se elimina el mazo seleccionado, resetear la selección (no usar predeterminado)
        if (this.lastSelectedDeckId === deckId) {
            this.lastSelectedDeckId = null;
        }
        
        this.decks.splice(deckIndex, 1);
        
        // Si no quedan mazos del jugador, asegurar que el predeterminado exista
        const playerDecks = this.decks.filter(d => !d.isDefault);
        if (playerDecks.length === 0 && !this.hasDefaultDeck()) {
            this.createDefaultDeck();
        }
        
        this.saveDecks();
        return true;
    }
    
    /**
     * Selecciona un mazo como el actual
     * @param {string} deckId - ID del mazo a seleccionar
     * @returns {boolean} true si se seleccionó correctamente
     */
    selectDeck(deckId) {
        const deck = this.getDeck(deckId);
        if (!deck) {
            console.error('Mazo no encontrado:', deckId);
            return false;
        }
        
        // No permitir seleccionar el mazo predeterminado
        if (deck.isDefault) {
            console.error('No se puede seleccionar el mazo predeterminado');
            return false;
        }
        
        this.lastSelectedDeckId = deckId;
        this.saveDecks();
        return true;
    }
    
    /**
     * Exporta un mazo a JSON (útil para compartir o backup)
     * @param {string} deckId - ID del mazo a exportar
     * @returns {string|null} JSON del mazo o null si hay error
     */
    exportDeck(deckId) {
        const deck = this.getDeck(deckId);
        if (!deck) return null;
        
        // Crear copia sin metadatos internos
        const exportData = {
            name: deck.name,
            units: [...deck.units]
        };
        
        return JSON.stringify(exportData, null, 2);
    }
    
    /**
     * Importa un mazo desde JSON
     * @param {string} jsonString - JSON del mazo a importar
     * @param {string} name - Nombre opcional (si no viene en el JSON)
     * @returns {Object|null} El mazo importado o null si hay error
     */
    importDeck(jsonString, name = null) {
        try {
            const data = JSON.parse(jsonString);
            const deckName = name || data.name || `Mazo Importado ${Date.now()}`;
            const units = data.units || [];
            
            return this.createDeck(deckName, units);
        } catch (error) {
            console.error('Error al importar mazo:', error);
            return null;
        }
    }
}

