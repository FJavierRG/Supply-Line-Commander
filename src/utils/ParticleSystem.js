// ===== SISTEMA DE PARTÍCULAS =====

export class Particle {
    constructor(x, y, vx, vy, color, size, life) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.life = life;
        this.maxLife = life;
        this.alpha = 1;
    }
    
    update(dt) {
        this.life -= dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.alpha = Math.max(0, this.life / this.maxLife);
        return this.life > 0;
    }
}

export class ExplosionSprite {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.life = 2; // 2 segundos de duración
        this.maxLife = 2;
        this.scale = 0;
        this.alpha = 1;
    }
    
    update(dt) {
        this.life -= dt;
        
        // Progreso de 0 a 1
        const progress = 1 - (this.life / this.maxLife);
        
        // Animación de escala: crece hasta 1.5, luego decrece a 0.5
        if (progress < 0.5) {
            // Primera mitad: crece de 0 a 1.5
            this.scale = progress * 3;
        } else {
            // Segunda mitad: decrece de 1.5 a 0.5
            this.scale = 1.5 - (progress - 0.5) * 2;
        }
        
        // Fade out en la última parte
        if (progress > 0.7) {
            this.alpha = 1 - ((progress - 0.7) / 0.3);
        }
        
        return this.life > 0;
    }
}

export class ImpactMark {
    constructor(x, y, spriteKey, scale = 1.0) {
        this.x = x;
        this.y = y;
        this.spriteKey = spriteKey; // 'impact-1' o 'impact-2'
        this.alpha = 0.55; // 55% de opacidad (+5% menos transparente)
        this.flipH = Math.random() < 0.5; // 50% de probabilidad de voltear horizontalmente
        this.scale = scale; // Escala del sprite (1.0 = tamaño normal)
    }
}

export class ParticleSystem {
    constructor(game) {
        this.game = game;
        this.particles = [];
        this.explosionSprites = [];
        this.droneExplosionSprites = []; // 🆕 NUEVO: Explosiones de drones (2 frames)
        this.floatingTexts = [];
        this.floatingSprites = []; // Sprites flotantes (ej: sniper kill feed)
        this.fallingSprites = []; // Sprites que caen (ej: specops unit)
        this.impactMarks = []; // Marcas de impacto persistentes
        
        // Sistema de acumulación de textos flotantes para evitar spam
        this.floatingTextAccumulator = new Map(); // baseId -> {amount, lastUpdate}
        this.accumulatorTimeout = 300; // 300ms para acumular textos
    }
    
    update(dt) {
        this.particles = this.particles.filter(p => p.update(dt));
        this.explosionSprites = this.explosionSprites.filter(e => e.update(dt));
        this.droneExplosionSprites = this.droneExplosionSprites.filter(e => e.update(dt)); // 🆕 NUEVO
        this.floatingTexts = this.floatingTexts.filter(t => t.update(dt));
        this.floatingSprites = this.floatingSprites.filter(s => s.update(dt));
        this.fallingSprites = this.fallingSprites.filter(s => s.update(dt));
        
        // Procesar acumulador de textos flotantes
        const currentTime = Date.now();
        for (const [baseId, data] of this.floatingTextAccumulator.entries()) {
            if (currentTime - data.lastUpdate > this.accumulatorTimeout) {
                // Tiempo expirado, crear el texto flotante acumulado
                const base = this.game.bases.find(b => b.id === baseId);
                if (base) {
                    this.floatingTexts.push(new FloatingText(
                        base.x,
                        base.y - 30,
                        `+${Math.floor(data.amount)}`,
                        data.color
                    ));
                }
                this.floatingTextAccumulator.delete(baseId);
            }
        }
    }
    
    createParticle(x, y, color) {
        this.particles.push(new Particle(
            x, y,
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 50,
            color,
            2 + Math.random() * 3,
            0.5
        ));
    }
    
    createExplosion(x, y, color, particleCount = 20) {
        for (let i = 0; i < particleCount; i++) {
            this.particles.push(new Particle(
                x, y,
                (Math.random() - 0.5) * 200,
                (Math.random() - 0.5) * 200,
                color,
                3 + Math.random() * 5,
                1
            ));
        }
    }
    
    createExplosionSprite(x, y) {
        // Nueva explosión animada por frames: explo1 -> explo2 -> explo3 (2s total)
        this.explosionSprites.push(new FrameExplosion(this.game, x, y));
    }
    
    /**
     * 🆕 NUEVO: Crea una explosión animada específica para drones (2 frames)
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     */
    createDroneExplosionSprite(x, y) {
        this.droneExplosionSprites.push(new DroneFrameExplosion(this.game, x, y));
    }
    
    /**
     * 🆕 NUEVO: Obtiene todas las explosiones de drones activas
     * @returns {Array} Array de explosiones de drones
     */
    getDroneExplosionSprites() {
        return this.droneExplosionSprites;
    }
    
    clear() {
        this.particles = [];
        this.explosionSprites = [];
        this.droneExplosionSprites = []; // 🆕 NUEVO
        this.floatingTexts = [];
        this.floatingSprites = [];
        this.fallingSprites = [];
        this.impactMarks = [];
        this.floatingTextAccumulator.clear();
    }
    
    getParticles() {
        return this.particles;
    }
    
    getExplosionSprites() {
        return this.explosionSprites;
    }
    
    createFloatingText(x, y, text, color = '#ffffff', baseId = null) {
        // Si no hay baseId, crear inmediatamente (sin acumulación)
        if (!baseId) {
            this.floatingTexts.push(new FloatingText(x, y, text, color));
            return;
        }
        
        // Sistema de acumulación: si ya existe un acumulador para esta base, sumar
        const currentTime = Date.now();
        if (this.floatingTextAccumulator.has(baseId)) {
            const existing = this.floatingTextAccumulator.get(baseId);
            // Extraer el número del texto "+123"
            const amount = parseInt(text.replace('+', ''), 10) || 0;
            existing.amount += amount;
            existing.lastUpdate = currentTime;
        } else {
            // Crear nuevo acumulador
            const amount = parseInt(text.replace('+', ''), 10) || 0;
            this.floatingTextAccumulator.set(baseId, {
                amount: amount,
                lastUpdate: currentTime,
                color: color
            });
        }
    }
    
    getFloatingTexts() {
        return this.floatingTexts;
    }
    
    /**
     * Crea un sprite flotante que sube y desaparece
     */
    createFloatingSprite(x, y, spriteKey, scale = 0.67) {
        this.floatingSprites.push(new FloatingSprite(x, y, spriteKey, scale));
    }
    
    getFloatingSprites() {
        return this.floatingSprites;
    }
    
    /**
     * Crea un sprite que cae desde arriba y desaparece
     */
    createFallingSprite(x, y, spriteKey, scale = 0.67) {
        this.fallingSprites.push(new FallingSprite(x, y, spriteKey, scale));
    }
    
    getFallingSprites() {
        return this.fallingSprites;
    }
    
    /**
     * Crea una marca de impacto permanente en el mapa
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     * @param {string} spriteKey - Clave del sprite (opcional, se elige aleatoriamente si no se especifica)
     * @param {number} scale - Escala del sprite (opcional, 1.0 por defecto)
     */
    createImpactMark(x, y, spriteKey = null, scale = 1.0) {
        // Elegir aleatoriamente entre impact-1 o impact-2 si no se especifica
        if (!spriteKey) {
            spriteKey = Math.random() < 0.5 ? 'impact-1' : 'impact-2';
        }
        const impactMark = new ImpactMark(x, y, spriteKey, scale);
        this.impactMarks.push(impactMark);
    }
    
    /**
     * Obtiene todas las marcas de impacto
     * @returns {Array} Array de marcas de impacto
     */
    getImpactMarks() {
        return this.impactMarks;
    }
}

/**
 * 🆕 NUEVO: Explosión animada específica para drones (2 frames)
 * Similar a FrameExplosion pero con solo 2 frames y sin crear marca de impacto
 */
export class DroneFrameExplosion {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.life = 0.4; // Total: 0.2 + 0.2 = 0.4 segundos (más rápida que edificios)
        this.maxLife = 0.4;
        this.finished = false;
    }
    
    getCurrentFrame() {
        const elapsed = this.maxLife - this.life;
        
        // Frame 1: 0.0 - 0.2s
        if (elapsed < 0.2) {
            return 'drone-explosion-1';
        }
        // Frame 2: 0.2 - 0.4s (0.2s de duración)
        else {
            return 'drone-explosion-2';
        }
    }
    
    update(dt) {
        this.life -= dt;
        
        if (this.life <= 0) {
            this.finished = true;
            return false;
        }
        
        return this.life > 0;
    }
}

export class FrameExplosion {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.life = 0.6; // Total: 0.2 + 0.2 + 0.2 = 0.6 segundos
        this.maxLife = 0.6;
        this.finished = false;
        this.impactMarkCreated = false;
    }
    
    getCurrentFrame() {
        const elapsed = this.maxLife - this.life;
        
        // Frame 1: 0.0 - 0.2s
        if (elapsed < 0.2) {
            return 'explosion-1';
        }
        // Frame 2: 0.2 - 0.4s (0.2s de duración)
        else if (elapsed < 0.4) {
            return 'explosion-2';
        }
        // Frame 3: 0.4 - 0.6s (0.2s de duración)
        else {
            return 'explosion-3';
        }
    }
    
    update(dt) {
        this.life -= dt;
        
        // Cuando la explosión termina, crear marca de impacto
        if (this.life <= 0 && !this.impactMarkCreated) {
            this.game.particleSystem.createImpactMark(this.x, this.y);
            this.impactMarkCreated = true;
            this.finished = true;
            return false;
        }
        
        return this.life > 0;
    }
}

export class FloatingSprite {
    constructor(x, y, spriteKey, scale = 0.67) {
        this.x = x;
        this.y = y;
        this.spriteKey = spriteKey;
        this.life = 1.1; // 1.1 segundos (reducido 0.4s en total)
        this.maxLife = 1.1;
        this.alpha = 1;
        this.velocityY = -40; // Sube hacia arriba más rápido
        this.scale = scale; // 0.67 = reducción del 150% (1/1.5)
    }
    
    update(dt) {
        this.life -= dt;
        this.y += this.velocityY * dt;
        
        // Fade out en la segunda mitad
        if (this.life < this.maxLife / 2) {
            this.alpha = (this.life / (this.maxLife / 2));
        }
        
        return this.life > 0;
    }
}

export class FallingSprite {
    constructor(x, y, spriteKey, scale = 0.67) {
        this.x = x;
        this.y = y;
        this.spriteKey = spriteKey;
        this.life = 2.0; // 2 segundos
        this.maxLife = 2.0;
        this.alpha = 1;
        this.velocityY = 60; // Cae hacia abajo
        this.scale = scale;
        this.startY = y; // Posición inicial para referencia
    }
    
    update(dt) {
        this.life -= dt;
        this.y += this.velocityY * dt;
        
        // Fade out gradualmente durante toda la vida
        this.alpha = this.life / this.maxLife;
        
        return this.life > 0;
    }
}

export class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 2; // 2 segundos
        this.maxLife = 2;
        this.alpha = 1;
        this.velocityY = -30; // Sube hacia arriba
    }
    
    update(dt) {
        this.life -= dt;
        this.y += this.velocityY * dt;
        
        // Fade out en la segunda mitad
        if (this.life < this.maxLife / 2) {
            this.alpha = (this.life / (this.maxLife / 2));
        }
        
        return this.life > 0;
    }
}


