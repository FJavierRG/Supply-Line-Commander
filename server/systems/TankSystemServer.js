// ===== SISTEMA DE TANQUES (SERVIDOR) =====
// Versión servidor del TankSystem - Simulación autoritativa

import { SERVER_NODE_CONFIG } from '../config/serverNodes.js';

export class TankSystemServer {
    constructor(gameState) {
        this.gameState = gameState;
        this.tanks = []; // Array de tanques activos
        this.tankSpeed = 125; // Velocidad del tanque (px/s) - mitad de la velocidad original
        this.nextTankId = 1; // Contador para IDs únicos
        this.shootDuration = 0.35; // Duración de la animación de disparo (segundos) - 0.15s menos que antes
        this.waitBeforeShoot = 1.0; // Tiempo de espera antes de disparar (segundos)
    }
    
    /**
     * Lanza un tanque hacia un objetivo
     * @param {string} playerTeam - Equipo del jugador ('player1' o 'player2')
     * @param {Object} targetNode - Nodo objetivo del tanque
     */
    launchTank(playerTeam, targetNode) {
        const tankId = `tank_${this.nextTankId++}`;
        
        // CRÍTICO: Tanque sale desde el EXTREMO del mapa del jugador (igual que dron)
        // Player1 (izquierda) → x=0
        // Player2 (derecha) → x=1920 (worldWidth)
        const worldWidth = 1920;
        const tankStartX = playerTeam === 'player1' ? 0 : worldWidth;
        const tankStartY = targetNode.y; // Altura del objetivo
        
        // Calcular posición objetivo: borde del hitbox del edificio (no el centro)
        // IMPORTANTE: Considerar la dirección del movimiento para detenerse en el lado correcto
        const targetRadius = SERVER_NODE_CONFIG.radius?.[targetNode.type] || 30;
        const margin = 15; // Píxeles de margen antes del edificio
        
        // Calcular dirección del movimiento
        const dx = targetNode.x - tankStartX;
        const dy = targetNode.y - tankStartY;
        const distance = Math.hypot(dx, dy);
        
        // Determinar punto de parada según la dirección:
        // - Player1 viene desde la izquierda (x=0) → debe parar a la izquierda del edificio (target.x - radius - margin)
        // - Player2 viene desde la derecha (x=1920) → debe parar a la derecha del edificio (target.x + radius + margin)
        let targetX, targetY;
        if (playerTeam === 'player1') {
            // Player1: movimiento hacia la derecha, parar a la izquierda del edificio
            const stopX = targetNode.x - targetRadius - margin;
            const stopY = targetNode.y; // Misma altura
            
            // Calcular dirección normalizada desde el inicio hasta el punto de parada
            const stopDx = stopX - tankStartX;
            const stopDy = stopY - tankStartY;
            const stopDistance = Math.hypot(stopDx, stopDy);
            
            // Usar la dirección original (hacia el centro del objetivo) pero ajustar la distancia
            const dirX = dx / distance;
            const dirY = dy / distance;
            
            // Calcular la posición final manteniendo la misma dirección pero con la distancia de parada
            targetX = tankStartX + (dirX * stopDistance);
            targetY = tankStartY + (dirY * stopDistance);
        } else {
            // Player2: movimiento hacia la izquierda, parar a la derecha del edificio
            const stopX = targetNode.x + targetRadius + margin;
            const stopY = targetNode.y; // Misma altura
            
            // Calcular dirección normalizada desde el inicio hasta el punto de parada
            const stopDx = stopX - tankStartX;
            const stopDy = stopY - tankStartY;
            const stopDistance = Math.hypot(stopDx, stopDy);
            
            // Usar la dirección original (hacia el centro del objetivo) pero ajustar la distancia
            const dirX = dx / distance;
            const dirY = dy / distance;
            
            // Calcular la posición final manteniendo la misma dirección pero con la distancia de parada
            targetX = tankStartX + (dirX * stopDistance);
            targetY = tankStartY + (dirY * stopDistance);
        }
        
        const tank = {
            id: tankId,
            x: tankStartX,
            y: tankStartY,
            targetX: targetX, // Posición objetivo donde se detiene
            targetY: targetY,
            targetId: targetNode.id,
            speed: this.tankSpeed,
            team: playerTeam,
            active: true,
            state: 'moving', // 'moving', 'waiting', 'shooting', 'completed'
            waitTimer: 0,
            shootTimer: 0,
            spriteFrame: 1 // 1 o 2 para alternar sprites
        };
        
        this.tanks.push(tank);
        
        console.log(`🛡️ Tanque de ${playerTeam} lanzado desde extremo (${tank.x}, ${tank.y}) → ${targetNode.type} ${targetNode.id}`);
        
        return tank;
    }
    
    /**
     * Actualiza todos los tanques activos (llamado cada tick)
     */
    update(dt) {
        const impacts = []; // Array de impactos en este tick
        
        for (let i = this.tanks.length - 1; i >= 0; i--) {
            const tank = this.tanks[i];
            
            if (!tank.active) {
                this.tanks.splice(i, 1);
                continue;
            }
            
            // Encontrar el objetivo
            const target = this.gameState.nodes.find(n => n.id === tank.targetId);
            
            if (!target || !target.active) {
                // Objetivo destruido o no encontrado - eliminar tanque
                tank.active = false;
                console.log(`⚠️ Tanque ${tank.id}: objetivo no encontrado, eliminando`);
                continue;
            }
            
            // Máquina de estados del tanque
            if (tank.state === 'moving') {
                // === MOVER HACIA EL OBJETIVO ===
                const dx = tank.targetX - tank.x;
                const dy = tank.targetY - tank.y;
                const distance = Math.hypot(dx, dy);
                
                // Calcular cuánto se movería este frame
                const speed = tank.speed * dt;
                
                // Actualizar sprite frame cada segundo (más estable que por frames)
                tank.frameTime = (tank.frameTime || 0) + dt;
                if (tank.frameTime >= 1.0) {
                    tank.spriteFrame = tank.spriteFrame === 1 ? 2 : 1;
                    tank.frameTime = 0;
                }
                
                // LLEGADA: Si está muy cerca del objetivo
                if (distance < 5 || distance <= speed) {
                    // Llegó al objetivo
                    tank.x = tank.targetX;
                    tank.y = tank.targetY;
                    tank.state = 'waiting';
                    tank.waitTimer = 0;
                    console.log(`⏸️ Tanque ${tank.id} llegó al objetivo, esperando 1 segundo antes de disparar`);
                } else {
                    // Mover hacia el objetivo
                    const vx = (dx / distance) * tank.speed * dt;
                    const vy = (dy / distance) * tank.speed * dt;
                    
                    tank.x += vx;
                    tank.y += vy;
                }
            } else if (tank.state === 'waiting') {
                // === ESPERAR 1 SEGUNDO ANTES DE DISPARAR ===
                tank.waitTimer += dt;
                
                if (tank.waitTimer >= this.waitBeforeShoot) {
                    tank.state = 'shooting';
                    tank.shootTimer = 0;
                    console.log(`🔫 Tanque ${tank.id} comenzando animación de disparo`);
                }
            } else if (tank.state === 'shooting') {
                // === ANIMACIÓN DE DISPARO (0.35 SEGUNDOS) ===
                tank.shootTimer += dt;
                
                if (tank.shootTimer >= this.shootDuration) {
                    // IMPACTO - Destruir objetivo
                    console.log(`💥 Tanque ${tank.id} destruyó ${target.type} ${target.id}`);
                    
                    // Marcar objetivo como destruido
                    target.active = false;
                    target.destroyed = true;
                    
                    // Registrar impacto
                    impacts.push({
                        tankId: tank.id,
                        targetId: target.id,
                        targetType: target.type,
                        x: target.x,
                        y: target.y,
                        team: tank.team
                    });
                    
                    // Desactivar tanque
                    tank.active = false;
                }
            }
        }
        
        return { impacts }; // Retornar eventos de impacto
    }
    
    /**
     * Obtiene todos los tanques activos para sincronizar
     */
    getTanks() {
        return this.tanks.filter(t => t.active).map(t => ({
            id: t.id,
            x: t.x,
            y: t.y,
            targetId: t.targetId,
            team: t.team,
            state: t.state,
            spriteFrame: t.spriteFrame,
            waitTimer: t.waitTimer,
            shootTimer: t.shootTimer
        }));
    }
    
    /**
     * Limpia tanques inactivos (mantenimiento)
     */
    cleanup() {
        this.tanks = this.tanks.filter(t => t.active);
    }
}

