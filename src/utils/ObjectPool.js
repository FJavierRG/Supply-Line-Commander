// ===== OBJECT POOL - Sistema de Reutilización de Objetos =====
// Previene garbage collection constante reutilizando objetos en lugar de crear/destruir

/**
 * ObjectPool - Pool genérico de objetos reutilizables
 * 
 * USO:
 * const pool = new ObjectPool(() => ({ x: 0, y: 0, active: false }), 50);
 * const obj = pool.acquire(); // Obtener objeto del pool
 * obj.active = true;
 * // ... usar objeto ...
 * pool.release(obj); // Devolver al pool cuando termine
 * 
 * BENEFICIOS:
 * - Reduce garbage collection (menos lag/tirones)
 * - Más rápido que crear objetos desde cero
 * - Memoria estable (no crece/decrece constantemente)
 */
export class ObjectPool {
    /**
     * @param {Function} factory - Función que crea un nuevo objeto cuando se necesita
     * @param {number} initialSize - Tamaño inicial del pool (default: 10)
     * @param {number} maxSize - Tamaño máximo del pool (default: 100)
     */
    constructor(factory, initialSize = 10, maxSize = 100) {
        this.factory = factory;
        this.maxSize = maxSize;
        this.available = []; // Objetos disponibles para usar
        this.inUse = new Set(); // Objetos actualmente en uso
        
        // Pre-crear objetos iniciales
        for (let i = 0; i < initialSize; i++) {
            this.available.push(this.factory());
        }
    }
    
    /**
     * Obtener un objeto del pool
     * @returns {Object} Objeto listo para usar
     */
    acquire() {
        let obj;
        
        if (this.available.length > 0) {
            // Reutilizar objeto existente
            obj = this.available.pop();
        } else {
            // Si no hay disponibles, crear uno nuevo (hasta maxSize)
            if (this.inUse.size < this.maxSize) {
                obj = this.factory();
            } else {
                // Pool lleno - devolver null o el más antiguo
                console.warn(`⚠️ ObjectPool lleno (${this.maxSize} objetos). Considera aumentar maxSize.`);
                return null;
            }
        }
        
        this.inUse.add(obj);
        return obj;
    }
    
    /**
     * Devolver un objeto al pool para reutilización
     * @param {Object} obj - Objeto a devolver
     */
    release(obj) {
        if (!obj) return;
        
        if (!this.inUse.has(obj)) {
            console.warn('⚠️ Intentando liberar objeto que no está en uso');
            return;
        }
        
        this.inUse.delete(obj);
        this.available.push(obj);
    }
    
    /**
     * Limpiar todos los objetos del pool
     */
    clear() {
        this.available = [];
        this.inUse.clear();
    }
    
    /**
     * Obtener estadísticas del pool (útil para debugging)
     */
    getStats() {
        return {
            available: this.available.length,
            inUse: this.inUse.size,
            total: this.available.length + this.inUse.size,
            maxSize: this.maxSize
        };
    }
}

