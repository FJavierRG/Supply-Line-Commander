// ===== SISTEMA DE TANQUES =====

export class TankSystem {
    constructor(game) {
        this.game = game;
        this.tanks = []; // Array de tanques activos (sincronizado con servidor)
        this.nextTankId = 1; // Contador para IDs únicos
    }
    
    /**
     * Crea un tanque desde datos del servidor
     * @param {Object} tankData - Datos del tanque del servidor
     */
    createTank(tankData) {
        // Buscar si ya existe
        const existing = this.tanks.find(t => t.id === tankData.id);
        if (existing) {
            // Actualizar datos existentes (pero NO sobrescribir posiciones directamente - usar serverX/serverY)
            existing.serverX = tankData.x;
            existing.serverY = tankData.y;
            existing.targetId = tankData.targetId;
            existing.state = tankData.state || existing.state;
            existing.spriteFrame = tankData.spriteFrame || existing.spriteFrame;
            existing.waitTimer = tankData.waitTimer || 0;
            existing.shootTimer = tankData.shootTimer || 0;
            existing.lastServerUpdate = Date.now();
            return existing;
        }
        
        // Crear nuevo tanque
        const tank = {
            id: tankData.id,
            x: tankData.x,
            y: tankData.y,
            serverX: tankData.x,  // Posición objetivo del servidor para interpolación
            serverY: tankData.y,
            targetId: tankData.targetId,
            team: tankData.team,
            state: tankData.state || 'moving', // 'moving', 'waiting', 'shooting'
            spriteFrame: tankData.spriteFrame || 1, // 1 o 2 para alternar sprites
            waitTimer: tankData.waitTimer || 0,
            shootTimer: tankData.shootTimer || 0,
            frameTime: 0, // Contador de tiempo para alternar sprites (sincronizado con servidor)
            active: true,
            lastServerUpdate: Date.now()
        };
        
        this.tanks.push(tank);
        
        console.log(`🛡️ Tanque ${tank.id} creado en (${tank.x}, ${tank.y})`);
        
        return tank;
    }
    
    /**
     * Actualiza todos los tanques activos
     * ⚠️ LEGACY REMOVED: El servidor maneja toda la lógica de tanques.
     * El cliente solo renderiza las posiciones que vienen del servidor.
     */
    update(dt) {
        // El servidor autoritativo maneja todo el movimiento y estados de tanques.
        // El cliente solo renderiza las posiciones que vienen del servidor.
        // Actualizar frameCounter para animación de sprites
        for (const tank of this.tanks) {
            if (tank.state === 'moving') {
                tank.frameCounter = (tank.frameCounter || 0) + 1;
                // Alternar sprite cada 60 frames o cada segundo
                if (tank.frameCounter >= 60) {
                    tank.spriteFrame = tank.spriteFrame === 1 ? 2 : 1;
                    tank.frameCounter = 0;
                }
            }
            
            // Limpiar flag de showShotOnImpact después de un frame
            if (tank.showShotOnImpact && tank.state !== 'shooting') {
                // Si el tanque ya no está en estado shooting, limpiar el flag después de este frame
                tank.showShotOnImpact = false;
            }
        }
    }
    
    /**
     * Destruye el objetivo del tanque (efectos visuales)
     * ⚠️ LEGACY REMOVED: El servidor maneja la destrucción de objetivos.
     * Este método solo debería usarse para efectos visuales cuando el servidor notifica destrucción.
     */
    destroyTarget(target) {
        // Reproducir sonido de explosión
        this.game.audio.playExplosionSound();
        
        // Crear explosión grande con partículas grises
        this.game.particleSystem.createExplosion(target.x, target.y, '#808080', 40);
        
        // Añadir sprite de explosión animado
        this.game.particleSystem.createExplosionSprite(target.x, target.y);
        
        // Crear marca de impacto permanente (cráter grande del edificio)
        this.game.particleSystem.createImpactMark(target.x, target.y, 'impact_icon', 1.2); // 120% del tamaño base
        
        console.log(`💥 ${target.name || target.type} destruido por tanque! (visual only - servidor maneja estado)`);
    }
    
    /**
     * Obtiene todos los tanques activos
     */
    getTanks() {
        return this.tanks.filter(t => t.active !== false);
    }
    
    /**
     * Limpia todos los tanques
     */
    clear() {
        this.tanks = [];
        this.nextTankId = 1; // Resetear contador de IDs
    }
    
    /**
     * Resetea el sistema (nueva misión)
     */
    reset() {
        this.clear();
    }
}

