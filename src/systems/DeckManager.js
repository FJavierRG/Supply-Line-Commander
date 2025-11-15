// ===== GESTOR DE MAZOS =====
// Maneja la persistencia y gestión de mazos (CRUD)
// Preparado para migración fácil a base de datos

import { getNodeConfig } from '../config/nodes.js';

// 🆕 NUEVO: El mazo predeterminado ahora viene del servidor
// Se establece cuando se recibe game_config
let DEFAULT_DECK_FROM_SERVER = null;

const STORAGE_KEY = 'game_decks';
// 🆕 FIX: Valor por defecto debe coincidir con server/config/gameConfig.js deck.pointLimit
// Este valor solo se usa hasta que el servidor envíe el límite real
const DEFAULT_DECK_POINT_LIMIT = 815; // Valor por defecto (será sobrescrito por el servidor)
// 🆕 FIX: Valor por defecto debe coincidir con server/config/gameConfig.js deck.benchPointLimit
// Este valor solo se usa hasta que el servidor envíe el límite real
const DEFAULT_BENCH_POINT_LIMIT = 300; // Valor por defecto (será sobrescrito por el servidor)

export class DeckManager {
    constructor(game) {
        this.game = game;
        this.decks = [];
        this.defaultDeckId = null;
        this.lastSelectedDeckId = null;
        this.deckPointLimit = DEFAULT_DECK_POINT_LIMIT; // 🎯 Límite dinámico (actualizado desde servidor)
        this.benchPointLimit = DEFAULT_BENCH_POINT_LIMIT; // 🆕 NUEVO: Límite dinámico para banquillo (actualizado desde servidor)
        
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
     * 🆕 NUEVO: Migra mazos antiguos añadiendo bench: [] si no existe
     */
    loadDecks() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                this.decks = data.decks || [];
                this.defaultDeckId = data.defaultDeckId || null;
                this.lastSelectedDeckId = data.lastSelectedDeckId || null;
                
                // 🆕 NUEVO: Migración - añadir bench: [] a mazos antiguos que no lo tengan
                let needsSave = false;
                this.decks.forEach(deck => {
                    if (!deck.bench) {
                        deck.bench = [];
                        needsSave = true;
                    }
                });
                
                if (needsSave) {
                    this.saveDecks();
                    console.log('🔄 Mazos migrados: añadido campo bench a mazos antiguos');
                }
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
     * 🆕 NUEVO: Establece el mazo por defecto recibido del servidor
     * @param {Object} defaultDeck - Mazo por defecto del servidor
     */
    setDefaultDeckFromServer(defaultDeck) {
        DEFAULT_DECK_FROM_SERVER = {
            ...defaultDeck,
            isDefault: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        // Actualizar o crear el mazo por defecto en localStorage
        const existingIndex = this.decks.findIndex(d => d.id === 'default');
        if (existingIndex >= 0) {
            // Actualizar el existente, pero mantener bench si el usuario lo ha modificado
            const existingBench = this.decks[existingIndex].bench || [];
            this.decks[existingIndex] = {
                ...this.decks[existingIndex],
                ...DEFAULT_DECK_FROM_SERVER,
                bench: existingBench.length > 0 ? existingBench : (DEFAULT_DECK_FROM_SERVER.bench || [])
            };
        } else {
            this.decks.push({ ...DEFAULT_DECK_FROM_SERVER });
        }
        
        this.defaultDeckId = 'default';
        if (!this.lastSelectedDeckId) {
            this.lastSelectedDeckId = 'default';
        }
        
        this.saveDecks();
        console.log('🎴 Mazo por defecto actualizado desde servidor:', DEFAULT_DECK_FROM_SERVER);
    }
    
    /**
     * Crea el mazo predeterminado (solo si no viene del servidor)
     * 🆕 NUEVO: Ahora usa el mazo del servidor si está disponible
     */
    createDefaultDeck() {
        // Si ya tenemos el mazo del servidor, usarlo
        if (DEFAULT_DECK_FROM_SERVER) {
            const existingIndex = this.decks.findIndex(d => d.id === 'default');
            if (existingIndex >= 0) {
                // Ya existe, no hacer nada
                return this.decks[existingIndex];
            } else {
                // Crear desde el servidor
                this.decks.push({ ...DEFAULT_DECK_FROM_SERVER });
                this.defaultDeckId = 'default';
                if (!this.lastSelectedDeckId) {
                    this.lastSelectedDeckId = 'default';
                }
                this.saveDecks();
                return this.decks[this.decks.length - 1];
            }
        }
        
        // Fallback: crear un mazo básico si no hay servidor (modo offline)
        const now = Date.now();
        const defaultDeck = {
            id: 'default',
            name: 'Mazo Predeterminado',
            units: ['hq'], // Solo HQ como fallback
            bench: [],
            isDefault: true,
            createdAt: now,
            updatedAt: now
        };
        
        const existingIndex = this.decks.findIndex(d => d.id === defaultDeck.id);
        if (existingIndex >= 0) {
            return this.decks[existingIndex];
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
     * Calcula el costo total de un mazo (suma de precios de todas las unidades)
     * @param {Array<string>} units - Array de IDs de unidades
     * @returns {number} Costo total del mazo
     */
    calculateDeckCost(units) {
        if (!units || !Array.isArray(units)) return 0;
        
        let totalCost = 0;
        
        units.forEach(unitId => {
            // El HQ es gratis (no tiene costo o costo 0)
            if (unitId === 'hq') {
                return; // Continuar sin sumar
            }
            
            // Obtener el costo de la unidad desde la configuración
            const config = getNodeConfig(unitId);
            const cost = config?.cost || 0;
            
            totalCost += cost;
        });
        
        return totalCost;
    }
    
    /**
     * 🆕 NUEVO: Calcula el costo total del banquillo (suma de precios de todas las unidades)
     * @param {Array<string>} bench - Array de IDs de unidades del banquillo
     * @returns {number} Costo total del banquillo
     */
    calculateBenchCost(bench) {
        if (!bench || !Array.isArray(bench)) return 0;
        
        let totalCost = 0;
        
        bench.forEach(unitId => {
            // Obtener el costo de la unidad desde la configuración
            const config = getNodeConfig(unitId);
            const cost = config?.cost || 0;
            
            totalCost += cost;
        });
        
        return totalCost;
    }
    
    /**
     * Obtiene el límite de puntos permitido para un mazo
     * @returns {number} Límite de puntos
     */
    getDeckPointLimit() {
        return this.deckPointLimit;
    }
    
    /**
     * 🆕 NUEVO: Obtiene el límite de puntos permitido para el banquillo
     * @returns {number} Límite de puntos del banquillo
     */
    getBenchPointLimit() {
        return this.benchPointLimit;
    }
    
    /**
     * Establece el límite de puntos desde el servidor (ANTI-HACK)
     * @param {number} limit - Límite de puntos del servidor
     */
    setPointLimit(limit) {
        if (typeof limit === 'number' && limit > 0) {
            this.deckPointLimit = limit;
            console.log(`🎯 Límite de puntos actualizado desde servidor: ${limit}`);
            // 🆕 FIX: Refrescar arsenal si está visible para actualizar estado visual de los items
            if (this.game && this.game.arsenalManager && this.game.arsenalManager.isVisible) {
                this.game.arsenalManager.populateArsenal();
            }
        }
    }
    
    /**
     * 🆕 NUEVO: Establece el límite de puntos del banquillo desde el servidor (ANTI-HACK)
     * @param {number} limit - Límite de puntos del banquillo del servidor
     */
    setBenchPointLimit(limit) {
        if (typeof limit === 'number' && limit > 0) {
            this.benchPointLimit = limit;
            console.log(`🎯 Límite de puntos del banquillo actualizado desde servidor: ${limit}`);
            // Refrescar arsenal si está visible
            if (this.game && this.game.arsenalManager && this.game.arsenalManager.isVisible) {
                this.game.arsenalManager.populateArsenal();
            }
        }
    }
    
    /**
     * Valida que un mazo sea válido
     * 🆕 NUEVO: También valida el banquillo
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
        
        // 🆕 NUEVO: Asegurar que bench existe
        if (!Array.isArray(deck.bench)) {
            deck.bench = [];
        }
        
        if (!Array.isArray(deck.units)) {
            errors.push('El mazo debe tener un array de unidades');
        } else {
            // Verificar que el HQ esté incluido
            if (!deck.units.includes('hq')) {
                errors.push('El mazo debe incluir el HQ');
            }
            
            // Verificar que no haya duplicados en el mazo
            const uniqueUnits = [...new Set(deck.units)];
            if (uniqueUnits.length !== deck.units.length) {
                errors.push('El mazo no puede tener unidades duplicadas');
            }
            
            // 🆕 NUEVO: Verificar límite de puntos del mazo
            const deckCost = this.calculateDeckCost(deck.units);
            if (deckCost > this.deckPointLimit) {
                errors.push(`El mazo excede el límite de puntos (${deckCost}/${this.deckPointLimit})`);
            }
            
            // 🆕 NUEVO: Verificar que no haya duplicados en el banquillo
            const uniqueBench = [...new Set(deck.bench)];
            if (uniqueBench.length !== deck.bench.length) {
                errors.push('El banquillo no puede tener unidades duplicadas');
            }
            
            // 🆕 NUEVO: Verificar límite de puntos del banquillo
            const benchCost = this.calculateBenchCost(deck.bench);
            if (benchCost > this.benchPointLimit) {
                errors.push(`El banquillo excede el límite de puntos (${benchCost}/${this.benchPointLimit})`);
            }
            
            // 🆕 NUEVO: Verificar que no haya duplicados entre mazo y banquillo
            const deckSet = new Set(deck.units);
            const benchSet = new Set(deck.bench);
            const intersection = [...deckSet].filter(x => benchSet.has(x));
            if (intersection.length > 0) {
                errors.push(`No puede haber unidades duplicadas entre el mazo y el banquillo: ${intersection.join(', ')}`);
            }
            
            // 🆕 NUEVO: Verificar que el HQ no esté en el banquillo
            if (deck.bench.includes('hq')) {
                errors.push('El HQ no puede estar en el banquillo');
            }
            
            // Verificar que todas las unidades existan y estén habilitadas (si está disponible)
            if (this.game && this.game.serverBuildingConfig && this.game.serverBuildingConfig.behavior) {
                const enabled = this.game.serverBuildingConfig.behavior.enabled;
                
                // Validar unidades del mazo
                deck.units.forEach(unitId => {
                    if (unitId !== 'hq' && enabled[unitId] === false) {
                        errors.push(`La unidad "${unitId}" está deshabilitada`);
                    }
                });
                
                // 🆕 NUEVO: Validar unidades del banquillo
                deck.bench.forEach(unitId => {
                    if (enabled[unitId] === false) {
                        errors.push(`La unidad "${unitId}" del banquillo está deshabilitada`);
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
     * 🆕 NUEVO: Incluye bench: [] por defecto
     * @param {string} name - Nombre del mazo
     * @param {Array<string>} units - Array de IDs de unidades
     * @param {Array<string>} bench - Array de IDs de unidades del banquillo (opcional)
     * @returns {Object|null} El mazo creado o null si hay error
     */
    createDeck(name, units, bench = []) {
        const now = Date.now();
        const deck = {
            id: `deck_${now}_${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(),
            units: [...units], // Copia del array
            bench: [...(bench || [])], // 🆕 NUEVO: Copia del array del banquillo
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
     * 🆕 NUEVO: Incluye el banquillo en la exportación
     * @param {string} deckId - ID del mazo a exportar
     * @returns {string|null} JSON del mazo o null si hay error
     */
    exportDeck(deckId) {
        const deck = this.getDeck(deckId);
        if (!deck) return null;
        
        // Crear copia sin metadatos internos
        const exportData = {
            name: deck.name,
            units: [...deck.units],
            bench: [...(deck.bench || [])] // 🆕 NUEVO: Incluir banquillo
        };
        
        return JSON.stringify(exportData, null, 2);
    }
    
    /**
     * Importa un mazo desde JSON
     * 🆕 NUEVO: Soporta importar banquillo
     * @param {string} jsonString - JSON del mazo a importar
     * @param {string} name - Nombre opcional (si no viene en el JSON)
     * @returns {Object|null} El mazo importado o null si hay error
     */
    importDeck(jsonString, name = null) {
        try {
            const data = JSON.parse(jsonString);
            const deckName = name || data.name || `Mazo Importado ${Date.now()}`;
            const units = data.units || [];
            const bench = data.bench || []; // 🆕 NUEVO: Importar banquillo
            
            return this.createDeck(deckName, units, bench);
        } catch (error) {
            console.error('Error al importar mazo:', error);
            return null;
        }
    }
    
    /**
     * 🆕 NUEVO: Valida una permutación (intercambio) entre mazo y banquillo
     * @param {Object} deck - Objeto del mazo
     * @param {string} deckUnitId - ID de la unidad del mazo a intercambiar
     * @param {string} benchUnitId - ID de la unidad del banquillo a intercambiar
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validateSwap(deck, deckUnitId, benchUnitId) {
        const errors = [];
        
        if (!deck || !deck.units || !deck.bench) {
            errors.push('El mazo no es válido');
            return { valid: false, errors };
        }
        
        // Verificar que las unidades existan en sus respectivos lugares
        if (!deck.units.includes(deckUnitId)) {
            errors.push(`La unidad "${deckUnitId}" no está en el mazo`);
        }
        
        if (!deck.bench.includes(benchUnitId)) {
            errors.push(`La unidad "${benchUnitId}" no está en el banquillo`);
        }
        
        // Verificar que no se intente intercambiar el HQ
        if (deckUnitId === 'hq') {
            errors.push('No se puede intercambiar el HQ');
        }
        
        // Simular el intercambio para validar límites
        const newDeckUnits = [...deck.units];
        const newBenchUnits = [...deck.bench];
        
        // Intercambiar
        const deckIndex = newDeckUnits.indexOf(deckUnitId);
        const benchIndex = newBenchUnits.indexOf(benchUnitId);
        
        newDeckUnits[deckIndex] = benchUnitId;
        newBenchUnits[benchIndex] = deckUnitId;
        
        // Validar límites después del intercambio
        const newDeckCost = this.calculateDeckCost(newDeckUnits);
        const newBenchCost = this.calculateBenchCost(newBenchUnits);
        
        if (newDeckCost > this.deckPointLimit) {
            errors.push(`El intercambio excedería el límite del mazo (${newDeckCost}/${this.deckPointLimit})`);
        }
        
        if (newBenchCost > this.benchPointLimit) {
            errors.push(`El intercambio excedería el límite del banquillo (${newBenchCost}/${this.benchPointLimit})`);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

