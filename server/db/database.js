// ===== SISTEMA DE BASE DE DATOS =====
// Ahora SOLO usamos Supabase como fuente de datos para mazos

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY)
dotenv.config();

// ============================================================
// CONSTANTES
// ============================================================

// UUID especial y conocido para el mazo por defecto
export const DEFAULT_DECK_ID = '00000000-0000-0000-0000-000000000001';

// ============================================================
// SUPABASE (ÚNICA FUENTE DE DATOS)
// ============================================================

let supabase = null;

function initSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
        throw new Error('❌ SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY o SUPABASE_ANON_KEY son requeridas');
    }

    supabase = createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    });
    console.log(`✅ Supabase inicializado (${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service role' : 'anon key'})`);
}

// ============================================================
// INICIALIZACIÓN (siempre Supabase)
// ============================================================

initSupabase();

// ============================================================
// API UNIFICADA
// ============================================================

export const db = {
    /**
     * Crear un nuevo mazo
     */
    async createDeck(deck) {
        const { data, error } = await supabase
            .from('decks')
            .insert(deck)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Obtener un mazo por ID
     */
    async getDeck(deckId) {
        const { data, error } = await supabase
            .from('decks')
            .select('*')
            .eq('id', deckId)
            .single();

        if (error) return null;
        return data;
    },

    /**
     * Obtener todos los mazos de un usuario
     */
    async getUserDecks(userId) {
        const { data, error } = await supabase
            .from('decks')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Actualizar un mazo
     */
    async updateDeck(deckId, updates) {
        const { data, error } = await supabase
            .from('decks')
            .update(updates)
            .eq('id', deckId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Eliminar un mazo
     */
    async deleteDeck(deckId) {
        const { error } = await supabase
            .from('decks')
            .delete()
            .eq('id', deckId);

        if (error) throw error;
        return true;
    },

    /**
     * Obtener el mazo por defecto
     */
    async getDefaultDeck() {
        return this.getDeck(DEFAULT_DECK_ID);
    }
};

