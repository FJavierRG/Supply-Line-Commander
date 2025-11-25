// ===== SERVICIO DE MIGRACIÓN DE MAZOS =====
// Migra mazos de localStorage a la base de datos (una sola vez)

import { deckService } from './DeckService.js';

const STORAGE_KEY = 'playerDecks';
const MIGRATION_KEY = 'decksMigrated';
const DEFAULT_DECK_UUID = '00000000-0000-0000-0000-000000000001';

export class MigrationService {
    /**
     * Verifica si ya se migró
     */
    static hasMigrated() {
        return localStorage.getItem(MIGRATION_KEY) === 'true';
    }
    
    /**
     * Marca como migrado
     */
    static markAsMigrated() {
        localStorage.setItem(MIGRATION_KEY, 'true');
    }
    
    /**
     * Migra los mazos de localStorage a la BD
     */
    static async migrateDecks() {
        // Si ya se migró, no hacer nada
        if (this.hasMigrated()) {
            console.log('ℹ️ Migración ya ejecutada previamente');
            return { migrated: 0, skipped: 0 };
        }
        
        console.log('🔄 Iniciando migración de mazos...');
        
        try {
            // Leer mazos de localStorage
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                console.log('ℹ️ No hay mazos en localStorage para migrar');
                this.markAsMigrated();
                return { migrated: 0, skipped: 0 };
            }
            
            const data = JSON.parse(stored);
            const localDecks = data.decks || [];
            
            if (localDecks.length === 0) {
                console.log('ℹ️ No hay mazos para migrar');
                this.markAsMigrated();
                return { migrated: 0, skipped: 0 };
            }
            
            console.log(`📦 Encontrados ${localDecks.length} mazos en localStorage`);
            
            let migrated = 0;
            let skipped = 0;
            
            // Migrar cada mazo (excepto el default)
            for (const deck of localDecks) {
                // Saltar el mazo por defecto (ya existe en BD)
                if (deck.isDefault || deck.id === 'default') {
                    console.log(`⏭️ Saltando mazo default`);
                    skipped++;
                    continue;
                }
                
                try {
                    // Crear el mazo en la BD
                    await deckService.createDeck(
                        deck.name,
                        deck.units || [],
                        deck.bench || [],
                        deck.disciplines || []
                    );
                    
                    migrated++;
                    console.log(`✅ Migrado: ${deck.name}`);
                } catch (error) {
                    console.error(`❌ Error migrando mazo "${deck.name}":`, error);
                    skipped++;
                }
            }
            
            // Marcar como migrado
            this.markAsMigrated();
            
            console.log(`✅ Migración completada: ${migrated} migrados, ${skipped} saltados`);
            
            return { migrated, skipped };
        } catch (error) {
            console.error('❌ Error durante la migración:', error);
            return { migrated: 0, skipped: 0, error };
        }
    }
    
    /**
     * Limpia localStorage después de migración exitosa (opcional)
     */
    static cleanupLocalStorage() {
        console.log('🧹 Limpiando localStorage...');
        
        // Guardar solo el userId y la marca de migración
        const userId = localStorage.getItem('userId');
        const migrated = localStorage.getItem(MIGRATION_KEY);
        
        // Limpiar todo
        localStorage.clear();
        
        // Restaurar lo importante
        if (userId) localStorage.setItem('userId', userId);
        if (migrated) localStorage.setItem(MIGRATION_KEY, migrated);
        
        console.log('✅ localStorage limpiado');
    }
    
    /**
     * Forzar remigración (solo para debugging)
     */
    static resetMigration() {
        localStorage.removeItem(MIGRATION_KEY);
        console.log('🔄 Marca de migración eliminada');
    }
}

