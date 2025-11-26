// ===== SERVICIO DE MAZOS =====
// Interactúa con la API REST para gestionar mazos

import { http } from '../utils/httpClient.js';

export class DeckService {
    /**
     * Obtener el mazo por defecto
     */
    async getDefaultDeck() {
        const response = await http.get('/api/decks/default/get');
        if (response.success && response.deck) {
            return response.deck;
        }
        throw new Error(response.error || 'Error al obtener mazo por defecto');
    }

    /**
     * Obtener todos los mazos del usuario autenticado
     */
    async getUserDecks() {
        const response = await http.get('/api/decks');
        if (response.success && response.decks) {
            return response.decks;
        }
        throw new Error(response.error || 'Error al obtener mazos');
    }

    /**
     * Obtener un mazo por ID
     */
    async getDeck(deckId) {
        const response = await http.get(`/api/decks/${deckId}`);
        if (response.success && response.deck) {
            return response.deck;
        }
        throw new Error(response.error || 'Error al obtener mazo');
    }

    /**
     * Crear un nuevo mazo
     */
    async createDeck(deck) {
        const response = await http.post('/api/decks', deck);
        if (response.success && response.deck) {
            return response.deck;
        }
        throw new Error(response.error || 'Error al crear mazo');
    }

    /**
     * Actualizar un mazo existente
     */
    async updateDeck(deckId, updates) {
        const response = await http.put(`/api/decks/${deckId}`, updates);
        if (response.success && response.deck) {
            return response.deck;
        }
        throw new Error(response.error || 'Error al actualizar mazo');
    }

    /**
     * Eliminar un mazo
     */
    async deleteDeck(deckId) {
        const response = await http.delete(`/api/decks/${deckId}`);
        if (response.success) {
            return true;
        }
        throw new Error(response.error || 'Error al eliminar mazo');
    }
}