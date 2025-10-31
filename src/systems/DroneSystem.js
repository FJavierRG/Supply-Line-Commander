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
        
        // Si es un dron del jugador (aliado), registrar la acción en la IA
        if (!isEnemy) {
            this.game.enemyAI.registerPlayerAction('drone', actualTarget);
            // También notificar al AIDirector si está en modo híbrido
            if (this.game.aiDirector && this.game.aiSystemMode !== 'legacy') {
                this.game.aiDirector.onPlayerAction('drone', actualTarget);
            }
        }
    }
    
    /**
     * Actualiza todos los drones activos
     */
    update(dt) {
        // En multijugador, el servidor maneja toda la lógica de drones
        if (this.game.isMultiplayer) {
            return;
        }
        
        for (let i = this.drones.length - 1; i >= 0; i--) {
            const drone = this.drones[i];
            
            if (!drone.active) {
                this.drones.splice(i, 1);
                continue;
            }
            
            // Encontrar el objetivo (ahora todo está en nodes)
            let target = this.game.nodes.find(n => n.id === drone.targetId);
            
            if (!target || !target.active) {
                // Objetivo destruido o no encontrado - detener sonido y eliminar dron
                this.game.audio.stopDroneSound(drone.id);
                drone.active = false;
                continue;
            }
            
            // Mover hacia el objetivo
            const dx = target.x - drone.x;
            const dy = target.y - drone.y;
            const distance = Math.hypot(dx, dy);
            
            if (distance < 5) {
                // IMPACTO - Destruir objetivo
                this.destroyTarget(target);
                drone.active = false;
                // Detener sonido del dron al impactar (usando ID único)
                this.game.audio.stopDroneSound(drone.id);
                // Crear cráter pequeño del dron (40% más pequeño)
                this.createDroneCrater(drone.x, drone.y);
            } else {
                // Mover hacia el objetivo
                const vx = (dx / distance) * drone.speed * dt;
                const vy = (dy / distance) * drone.speed * dt;
                
                drone.x += vx;
                drone.y += vy;
            }
        }
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
        
        // Eliminar el objetivo del array unificado de nodos
        const nodeIndex = this.game.nodes.findIndex(n => n.id === target.id);
        if (nodeIndex !== -1) {
            this.game.nodes.splice(nodeIndex, 1);
            console.log(`💥 ${target.name || target.type} destruido por dron!`);
        }
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








