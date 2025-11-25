// ===== SISTEMA DE BASE DE DATOS =====
// Cambia automáticamente entre SQLite (dev) y Supabase (prod)

import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = process.env.NODE_ENV !== 'production';

// ============================================================
// CONSTANTES
// ============================================================

// UUID especial y conocido para el mazo por defecto
export const DEFAULT_DECK_ID = '00000000-0000-0000-0000-000000000001';

// ============================================================
// SQLITE (DESARROLLO LOCAL)
// ============================================================

let sqliteDb = null;

function initSQLite() {
    const dataDir = join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const dbPath = join(dataDir, 'dev.db');
    sqliteDb = new Database(dbPath);
    
    // Crear tabla si no existe
    sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS decks (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            units TEXT NOT NULL,
            bench TEXT DEFAULT '[]',
            disciplines TEXT DEFAULT '[]',
            is_default INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id);
    `);
    
    // Insertar mazo por defecto si no existe
    // UUID especial y conocido para el default deck
    const DEFAULT_DECK_ID = '00000000-0000-0000-0000-000000000001';
    const defaultExists = sqliteDb.prepare('SELECT id FROM decks WHERE id = ?').get(DEFAULT_DECK_ID);
    if (!defaultExists) {
        sqliteDb.prepare(`
            INSERT INTO decks (id, user_id, name, units, bench, disciplines, is_default)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            DEFAULT_DECK_ID,
            'system',
            'Mazo Predeterminado',
            JSON.stringify(['hq', 'servers', 'engineerCenter', 'factory', 'fob', 'antiDrone', 'trainStation', 'droneLauncher']),
            JSON.stringify(['drone']),
            JSON.stringify(['motorized_industry', 'improved_infrastructure']),
            1
        );
    }
    
    console.log('✅ SQLite inicializado:', dbPath);
}

// ============================================================
// SUPABASE (PRODUCCIÓN)
// ============================================================

let supabase = null;

function initSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    
    if (!url || !key) {
        throw new Error('❌ SUPABASE_URL y SUPABASE_ANON_KEY son requeridas en producción');
    }
    
    supabase = createClient(url, key);
    console.log('✅ Supabase inicializado');
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

if (isDev) {
    initSQLite();
} else {
    initSupabase();
}

// ============================================================
// API UNIFICADA
// ============================================================

export const db = {
    /**
     * Crear un nuevo mazo
     */
    async createDeck(deck) {
        if (isDev) {
            const stmt = sqliteDb.prepare(`
                INSERT INTO decks (id, user_id, name, units, bench, disciplines, is_default)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run(
                deck.id,
                deck.user_id,
                deck.name,
                JSON.stringify(deck.units),
                JSON.stringify(deck.bench || []),
                JSON.stringify(deck.disciplines || []),
                deck.is_default ? 1 : 0
            );
            
            return this.getDeck(deck.id);
        } else {
            const { data, error } = await supabase
                .from('decks')
                .insert(deck)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        }
    },
    
    /**
     * Obtener un mazo por ID
     */
    async getDeck(deckId) {
        if (isDev) {
            const row = sqliteDb.prepare('SELECT * FROM decks WHERE id = ?').get(deckId);
            if (!row) return null;
            
            return {
                id: row.id,
                user_id: row.user_id,
                name: row.name,
                units: JSON.parse(row.units),
                bench: JSON.parse(row.bench || '[]'),
                disciplines: JSON.parse(row.disciplines || '[]'),
                is_default: row.is_default === 1,
                created_at: row.created_at,
                updated_at: row.updated_at
            };
        } else {
            const { data, error } = await supabase
                .from('decks')
                .select('*')
                .eq('id', deckId)
                .single();
            
            if (error) return null;
            return data;
        }
    },
    
    /**
     * Obtener todos los mazos de un usuario
     */
    async getUserDecks(userId) {
        if (isDev) {
            const rows = sqliteDb.prepare('SELECT * FROM decks WHERE user_id = ? ORDER BY created_at DESC').all(userId);
            return rows.map(row => ({
                id: row.id,
                user_id: row.user_id,
                name: row.name,
                units: JSON.parse(row.units),
                bench: JSON.parse(row.bench || '[]'),
                disciplines: JSON.parse(row.disciplines || '[]'),
                is_default: row.is_default === 1,
                created_at: row.created_at,
                updated_at: row.updated_at
            }));
        } else {
            const { data, error } = await supabase
                .from('decks')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data;
        }
    },
    
    /**
     * Actualizar un mazo
     */
    async updateDeck(deckId, updates) {
        if (isDev) {
            const fields = [];
            const values = [];
            
            if (updates.name) {
                fields.push('name = ?');
                values.push(updates.name);
            }
            if (updates.units) {
                fields.push('units = ?');
                values.push(JSON.stringify(updates.units));
            }
            if (updates.bench) {
                fields.push('bench = ?');
                values.push(JSON.stringify(updates.bench));
            }
            if (updates.disciplines) {
                fields.push('disciplines = ?');
                values.push(JSON.stringify(updates.disciplines));
            }
            
            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(deckId);
            
            const stmt = sqliteDb.prepare(`
                UPDATE decks SET ${fields.join(', ')} WHERE id = ?
            `);
            
            stmt.run(...values);
            return this.getDeck(deckId);
        } else {
            const { data, error } = await supabase
                .from('decks')
                .update(updates)
                .eq('id', deckId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        }
    },
    
    /**
     * Eliminar un mazo
     */
    async deleteDeck(deckId) {
        if (isDev) {
            sqliteDb.prepare('DELETE FROM decks WHERE id = ?').run(deckId);
            return true;
        } else {
            const { error } = await supabase
                .from('decks')
                .delete()
                .eq('id', deckId);
            
            if (error) throw error;
            return true;
        }
    },
    
    /**
     * Obtener el mazo por defecto
     */
    async getDefaultDeck() {
        return this.getDeck(DEFAULT_DECK_ID);
    }
};

// Log de inicialización
console.log(`🗄️ Base de datos: ${isDev ? 'SQLite (dev)' : 'Supabase (prod)'}`);

