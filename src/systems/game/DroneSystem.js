// ===== SISTEMA DE DRONES BOMBA =====

export class DroneSystem {
    constructor(game) {
        this.game = game;
        this.drones = []; // Array de drones activos
        this.droneSpeed = 300; // Velocidad del dron (px/s)
        this.nextDroneId = 1; // Contador para IDs únicos
    }
    
    /**
     * Lanza un dron bomba hacia un objetivo
     * @param {number} startX - Posición inicial X o nodo de origen
     * @param {number} startY - Posición inicial Y (opcional si startX es nodo)
     * @param {Object} target - Objetivo del dron
     * @param {string} team - 'ally' o 'enemy'
     */
    launchDrone(startX, startY, target, team = 'ally') {
        // Manejar ambos casos: launchDrone(x, y, target, team) o launchDrone(node, target, team)
        let x, y, isEnemy, actualTarget;
        
        if (typeof startX === 'object' && startX.x !== undefined) {
            // startX es un nodo - launchDrone(node, target, team)
            const node = startX;
            x = node.x;
            y = node.y;
            actualTarget = startY; // startY es realmente el target
            isEnemy = (target === 'enemy'); // target es realmente el team
        } else {
            // startX y startY son coordenadas - launchDrone(x, y, target, team)
            x = startX;
            y = startY;
            actualTarget = target;
            isEnemy = (team === 'enemy');
        }
        
        const droneId = `drone_${this.nextDroneId++}`;
        
        const drone = {
            id: droneId,
            x: x,
            y: y,
            target: actualTarget,
            targetId: actualTarget.id,
            speed: this.droneSpeed,
            active: true,
            isEnemy: isEnemy // Identificar si es dron enemigo o aliado
        };
        
        this.drones.push(drone);
        
        // Reproducir sonido del dron con ID único
        this.game.audio.playDroneSound(droneId);
        
        const teamName = isEnemy ? 'ENEMIGO' : 'ALIADO';
        console.log(`💣 Dron ${teamName} creado en (${x}, ${y}) → Objetivo: ${actualTarget.type}`);
        
        // === LEGACY REMOVED: Registro de acciones eliminado ===
        // La IA del servidor detecta acciones automáticamente
    }
    
    /**
     * Actualiza todos los drones activos
     * ⚠️ LEGACY REMOVED: El servidor maneja toda la lógica de drones.
     * El cliente solo renderiza las posiciones que vienen del servidor.
     */
    update(dt) {
        // El servidor autoritativo maneja todo el movimiento y colisiones de drones.
        // El cliente solo renderiza las posiciones que vienen del servidor.
        // TODO: Eliminar completamente este método o dejar vacío si se necesita para compatibilidad.
    }
    
    /**
     * Crea un cráter pequeño cuando un dron es destruido
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     */
    createDroneCrater(x, y) {
        // Cráter al 50% del tamaño de los edificios
        this.game.particleSystem.createImpactMark(x, y, 'impact_icon', 0.5); // 0.5 = 50% del tamaño original
    }
    
    /**
     * Destruye el objetivo del dron
     * ⚠️ LEGACY REMOVED: El servidor maneja la destrucción de objetivos.
     * Este método solo debería usarse para efectos visuales cuando el servidor notifica destrucción.
     */
    destroyTarget(target) {
        // ⚠️ LEGACY: El servidor debería notificar cuando un objetivo es destruido.
        // Este método solo debería ejecutarse cuando el servidor envía un evento de destrucción.
        // Por ahora, mantener solo efectos visuales/audio pero NO modificar el estado del juego.
        
        // Reproducir sonido de explosión
        this.game.audio.playExplosionSound();
        
        // Crear explosión grande con partículas grises
        this.game.particleSystem.createExplosion(target.x, target.y, '#808080', 40);
        
        // Añadir sprite de explosión animado
        this.game.particleSystem.createExplosionSprite(target.x, target.y);
        
        // Crear marca de impacto permanente (cráter grande del edificio)
        this.game.particleSystem.createImpactMark(target.x, target.y, 'impact_icon', 1.2); // 120% del tamaño base
        
        // ⚠️ LEGACY REMOVED: NO eliminar nodos aquí - el servidor maneja esto
        // El servidor enviará actualización de estado con el nodo eliminado
        console.log(`💥 ${target.name || target.type} destruido por dron! (visual only - servidor maneja estado)`);
    }
    
    /**
     * Obtiene todos los drones activos
     */
    getDrones() {
        return this.drones.filter(d => d.active);
    }
    
    /**
     * Limpia todos los drones
     */
    clear() {
        // Detener todos los sonidos de drones activos
        this.drones.forEach(drone => {
            if (drone.id) {
                this.game.audio.stopDroneSound(drone.id);
            }
        });
        
        this.drones = [];
        this.nextDroneId = 1; // Resetear contador de IDs
    }
    
    /**
     * Resetea el sistema (nueva misión)
     */
    reset() {
        this.clear();
    }
}








