// ===== SERVICIO DE API DE MAZOS =====
// Maneja todas las peticiones HTTP a /api/decks

import { DEFAULT_DECK_UUID } from '../config/deckConstants.js';

export class DeckService {
    constructor(baseURL = 'http://localhost:3000') {
        this.baseURL = baseURL;
        this.userId = this.getUserId(); // ID único por navegador
    }
    
    /**
     * Obtiene o genera un userId único para este navegador
     */
    getUserId() {
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('userId', userId);
            console.log('🆔 Nuevo userId generado:', userId);
        }
        return userId;
    }
    
    /**
     * Obtener todos los mazos del usuario
     */
    async getUserDecks() {
        try {
            const response = await fetch(`${this.baseURL}/api/decks/${this.userId}`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Error obteniendo mazos');
            }
            
            console.log('📥 Mazos obtenidos:', data.decks.length);
            return data.decks;
        } catch (error) {
            console.error('❌ Error obteniendo mazos:', error);
            return [];
        }
    }
    
    /**
     * Obtener el mazo por defecto
     */
    async getDefaultDeck() {
        try {
            const response = await fetch(`${this.baseURL}/api/decks/default/get`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Error obteniendo mazo por defecto');
            }
            
            console.log('📥 Mazo por defecto obtenido:', data.deck.name);
            return data.deck;
        } catch (error) {
            console.error('❌ Error obteniendo mazo por defecto:', error);
            return null;
        }
    }
    
    /**
     * Crear un nuevo mazo
     */
    async createDeck(name, units, bench = [], disciplines = []) {
        try {
            const response = await fetch(`${this.baseURL}/api/decks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.userId,
                    name,
                    units,
                    bench,
                    disciplines
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Error creando mazo');
            }
            
            console.log('✅ Mazo creado:', data.deck.name, `(${data.deck.id})`);
            return data.deck;
        } catch (error) {
            console.error('❌ Error creando mazo:', error);
            throw error;
        }
    }
    
    /**
     * Actualizar un mazo existente
     */
    async updateDeck(deckId, updates) {
        try {
            const response = await fetch(`${this.baseURL}/api/decks/${deckId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Error actualizando mazo');
            }
            
            console.log('✅ Mazo actualizado:', data.deck.name, `(${data.deck.id})`);
            return data.deck;
        } catch (error) {
            console.error('❌ Error actualizando mazo:', error);
            throw error;
        }
    }
    
    /**
     * Eliminar un mazo
     */
    async deleteDeck(deckId) {
        try {
            const response = await fetch(`${this.baseURL}/api/decks/${deckId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Error eliminando mazo');
            }
            
            console.log('🗑️ Mazo eliminado:', deckId);
            return true;
        } catch (error) {
            console.error('❌ Error eliminando mazo:', error);
            throw error;
        }
    }
    
    /**
     * Obtener un mazo específico por ID
     * (útil para cargar un mazo en el arsenal)
     */
    async getDeck(deckId) {
        try {
            // Si es el default, usar el endpoint especial
            if (deckId === DEFAULT_DECK_UUID) {
                return await this.getDefaultDeck();
            }
            
            // Obtener todos los mazos y filtrar
            const decks = await this.getUserDecks();
            const deck = decks.find(d => d.id === deckId);
            
            if (!deck) {
                console.warn('⚠️ Mazo no encontrado:', deckId);
                return null;
            }
            
            return deck;
        } catch (error) {
            console.error('❌ Error obteniendo mazo:', error);
            return null;
        }
    }
}

// Singleton para usar en toda la app
export const deckService = new DeckService();

