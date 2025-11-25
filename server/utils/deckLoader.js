// ===== UTILIDAD PARA CARGAR MAZOS DESDE LA BD =====

import { db } from '../db/database.js';

/**
 * Obtiene un mazo desde la base de datos (SQLite o Supabase)
 * @param {string} deckId - UUID del mazo
 * @returns {Promise<Object|null>} - Mazo o null si no existe
 */
export async function getDeckFromDatabase(deckId) {
    try {
        // Usar la API unificada del objeto db
        const deck = await db.getDeck(deckId);
        
        if (!deck) {
            console.warn('⚠️ Mazo no encontrado:', deckId);
            return null;
        }
        
        return deck;
    } catch (error) {
        console.error('❌ Error al obtener mazo:', error);
        return null;
    }
}

