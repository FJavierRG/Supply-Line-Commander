// ===== SISTEMA DE ARTILLADO LIGERO =====

export class LightVehicleSystem {
    constructor(game) {
        this.game = game;
        this.lightVehicles = []; // Array de artillados ligeros activos (sincronizado con servidor)
        this.nextLightVehicleId = 1; // Contador para IDs únicos
    }
    
    /**
     * Crea un artillado ligero desde datos del servidor
     * @param {Object} lightVehicleData - Datos del artillado ligero del servidor
     */
    createLightVehicle(lightVehicleData) {
        // Buscar si ya existe
        const existing = this.lightVehicles.find(lv => lv.id === lightVehicleData.id);
        if (existing) {
            // Actualizar datos existentes (pero NO sobrescribir posiciones directamente - usar serverX/serverY)
            existing.serverX = lightVehicleData.x;
            existing.serverY = lightVehicleData.y;
            existing.targetId = lightVehicleData.targetId;
            existing.state = lightVehicleData.state || existing.state;
            existing.spriteFrame = lightVehicleData.spriteFrame || existing.spriteFrame;
            existing.waitTimer = lightVehicleData.waitTimer || 0;
            existing.shootTimer = lightVehicleData.shootTimer || 0;
            existing.lastServerUpdate = Date.now();
            return existing;
        }
        
        // Crear nuevo artillado ligero
        const lightVehicle = {
            id: lightVehicleData.id,
            x: lightVehicleData.x,
            y: lightVehicleData.y,
            serverX: lightVehicleData.x,  // Posición objetivo del servidor para interpolación
            serverY: lightVehicleData.y,
            targetId: lightVehicleData.targetId,
            team: lightVehicleData.team,
            state: lightVehicleData.state || 'moving', // 'moving', 'waiting', 'shooting'
            spriteFrame: lightVehicleData.spriteFrame || 1, // 1 o 2 para alternar sprites
            waitTimer: lightVehicleData.waitTimer || 0,
            shootTimer: lightVehicleData.shootTimer || 0,
            frameTime: 0, // Contador de tiempo para alternar sprites (sincronizado con servidor)
            active: true,
            lastServerUpdate: Date.now()
        };
        
        this.lightVehicles.push(lightVehicle);
        
        console.log(`🚛 Artillado ligero ${lightVehicle.id} creado en (${lightVehicle.x}, ${lightVehicle.y})`);
        
        return lightVehicle;
    }
    
    /**
     * Actualiza todos los artillados ligeros activos
     * ⚠️ LEGACY REMOVED: El servidor maneja toda la lógica de artillados ligeros.
     * El cliente solo renderiza las posiciones que vienen del servidor.
     */
    update(dt) {
        // El servidor autoritativo maneja todo el movimiento y estados de artillados ligeros.
        // El cliente solo renderiza las posiciones que vienen del servidor.
        // Actualizar frameCounter para animación de sprites
        for (const lightVehicle of this.lightVehicles) {
            if (lightVehicle.state === 'moving') {
                lightVehicle.frameCounter = (lightVehicle.frameCounter || 0) + 1;
                // Alternar sprite cada 60 frames o cada segundo
                if (lightVehicle.frameCounter >= 60) {
                    lightVehicle.spriteFrame = lightVehicle.spriteFrame === 1 ? 2 : 1;
                    lightVehicle.frameCounter = 0;
                }
            }
            
            // Limpiar flag de showShotOnImpact después de un frame
            if (lightVehicle.showShotOnImpact && lightVehicle.state !== 'shooting') {
                // Si el artillado ligero ya no está en estado shooting, limpiar el flag después de este frame
                lightVehicle.showShotOnImpact = false;
            }
        }
    }
    
    /**
     * Aplica estado "broken" al objetivo (efectos visuales)
     * ⚠️ LEGACY REMOVED: El servidor maneja la aplicación de broken.
     * Este método solo debería usarse para efectos visuales cuando el servidor notifica broken.
     */
    breakTarget(target) {
        // Reproducir sonido de explosión (igual que el tanque)
        this.game.audio.playExplosionSound();
        
        // Crear explosión grande con partículas grises
        this.game.particleSystem.createExplosion(target.x, target.y, '#808080', 40);
        
        // Añadir sprite de explosión animado
        this.game.particleSystem.createExplosionSprite(target.x, target.y);
        
        // NO crear marca de impacto permanente (el edificio no se destruye, solo se rompe)
        
        console.log(`💥 ${target.name || target.type} roto por artillado ligero! (visual only - servidor maneja estado)`);
    }
    
    /**
     * Obtiene todos los artillados ligeros activos
     */
    getLightVehicles() {
        return this.lightVehicles.filter(lv => lv.active !== false);
    }
    
    /**
     * Limpia todos los artillados ligeros
     */
    clear() {
        this.lightVehicles = [];
        this.nextLightVehicleId = 1; // Resetear contador de IDs
    }
    
    /**
     * Resetea el sistema (nueva misión)
     */
    reset() {
        this.clear();
    }
}

