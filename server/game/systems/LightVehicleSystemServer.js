// ===== SISTEMA DE ARTILLADO LIGERO (SERVIDOR) =====
// Versión servidor del LightVehicleSystem - Simulación autoritativa
// Similar al tanque pero aplica estado "broken" en vez de destruir

import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

export class LightVehicleSystemServer {
    constructor(gameState) {
        this.gameState = gameState;
        this.lightVehicles = []; // Array de artillados ligeros activos
        this.lightVehicleSpeed = 125; // Velocidad del artillado ligero (px/s) - igual que tanque
        this.nextLightVehicleId = 1; // Contador para IDs únicos
        this.shootDuration = 0.35; // Duración de la animación de disparo (segundos)
        this.waitBeforeShoot = 1.0; // Tiempo de espera antes de disparar (segundos)
    }
    
    /**
     * Lanza un artillado ligero hacia un objetivo
     * @param {string} playerTeam - Equipo del jugador ('player1' o 'player2')
     * @param {Object} targetNode - Nodo objetivo del artillado ligero
     */
    launchLightVehicle(playerTeam, targetNode) {
        const lightVehicleId = `lightVehicle_${this.nextLightVehicleId++}`;
        
        // CRÍTICO: Artillado ligero sale desde el EXTREMO del mapa del jugador (igual que tanque/dron)
        // Player1 (izquierda) → x=0
        // Player2 (derecha) → x=1920 (worldWidth)
        const worldWidth = 1920;
        const lightVehicleStartX = playerTeam === 'player1' ? 0 : worldWidth;
        const lightVehicleStartY = targetNode.y; // Altura del objetivo
        
        // Calcular posición objetivo: borde del hitbox del edificio (no el centro)
        // IMPORTANTE: Considerar la dirección del movimiento para detenerse en el lado correcto
        const targetRadius = SERVER_NODE_CONFIG.radius?.[targetNode.type] || 30;
        const margin = 45; // 🆕 AUMENTADO: Píxeles de margen antes del edificio (de 15 a 45 para que se pare más lejos)
        
        // Calcular dirección del movimiento
        const dx = targetNode.x - lightVehicleStartX;
        const dy = targetNode.y - lightVehicleStartY;
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
            const stopDx = stopX - lightVehicleStartX;
            const stopDy = stopY - lightVehicleStartY;
            const stopDistance = Math.hypot(stopDx, stopDy);
            
            // Usar la dirección original (hacia el centro del objetivo) pero ajustar la distancia
            const dirX = dx / distance;
            const dirY = dy / distance;
            
            // Calcular la posición final manteniendo la misma dirección pero con la distancia de parada
            targetX = lightVehicleStartX + (dirX * stopDistance);
            targetY = lightVehicleStartY + (dirY * stopDistance);
        } else {
            // Player2: movimiento hacia la izquierda, parar a la derecha del edificio
            const stopX = targetNode.x + targetRadius + margin;
            const stopY = targetNode.y; // Misma altura
            
            // Calcular dirección normalizada desde el inicio hasta el punto de parada
            const stopDx = stopX - lightVehicleStartX;
            const stopDy = stopY - lightVehicleStartY;
            const stopDistance = Math.hypot(stopDx, stopDy);
            
            // Usar la dirección original (hacia el centro del objetivo) pero ajustar la distancia
            const dirX = dx / distance;
            const dirY = dy / distance;
            
            // Calcular la posición final manteniendo la misma dirección pero con la distancia de parada
            targetX = lightVehicleStartX + (dirX * stopDistance);
            targetY = lightVehicleStartY + (dirY * stopDistance);
        }
        
        const lightVehicle = {
            id: lightVehicleId,
            x: lightVehicleStartX,
            y: lightVehicleStartY,
            targetX: targetX, // Posición objetivo donde se detiene
            targetY: targetY,
            targetId: targetNode.id,
            speed: this.lightVehicleSpeed,
            team: playerTeam,
            active: true,
            state: 'moving', // 'moving', 'waiting', 'shooting', 'completed'
            waitTimer: 0,
            shootTimer: 0,
            spriteFrame: 1 // 1 o 2 para alternar sprites
        };
        
        this.lightVehicles.push(lightVehicle);
        
        console.log(`🚛 Artillado ligero de ${playerTeam} lanzado desde extremo (${lightVehicle.x}, ${lightVehicle.y}) → ${targetNode.type} ${targetNode.id}`);
        
        return lightVehicle;
    }
    
    /**
     * Actualiza todos los artillados ligeros activos (llamado cada tick)
     */
    update(dt) {
        const impacts = []; // Array de impactos en este tick
        
        for (let i = this.lightVehicles.length - 1; i >= 0; i--) {
            const lightVehicle = this.lightVehicles[i];
            
            if (!lightVehicle.active) {
                this.lightVehicles.splice(i, 1);
                continue;
            }
            
            // Encontrar el objetivo
            const target = this.gameState.nodes.find(n => n.id === lightVehicle.targetId);
            
            if (!target || !target.active) {
                // Objetivo destruido o no encontrado - eliminar artillado ligero
                lightVehicle.active = false;
                console.log(`⚠️ Artillado ligero ${lightVehicle.id}: objetivo no encontrado, eliminando`);
                continue;
            }
            
            // Máquina de estados del artillado ligero
            if (lightVehicle.state === 'moving') {
                // === MOVER HACIA EL OBJETIVO ===
                const dx = lightVehicle.targetX - lightVehicle.x;
                const dy = lightVehicle.targetY - lightVehicle.y;
                const distance = Math.hypot(dx, dy);
                
                // Calcular cuánto se movería este frame
                const speed = lightVehicle.speed * dt;
                
                // Actualizar sprite frame cada segundo (más estable que por frames)
                lightVehicle.frameTime = (lightVehicle.frameTime || 0) + dt;
                if (lightVehicle.frameTime >= 1.0) {
                    lightVehicle.spriteFrame = lightVehicle.spriteFrame === 1 ? 2 : 1;
                    lightVehicle.frameTime = 0;
                }
                
                // LLEGADA: Si está muy cerca del objetivo
                if (distance < 5 || distance <= speed) {
                    // Llegó al objetivo
                    lightVehicle.x = lightVehicle.targetX;
                    lightVehicle.y = lightVehicle.targetY;
                    lightVehicle.state = 'waiting';
                    lightVehicle.waitTimer = 0;
                    console.log(`⏸️ Artillado ligero ${lightVehicle.id} llegó al objetivo, esperando 1 segundo antes de disparar`);
                } else {
                    // Mover hacia el objetivo
                    const vx = (dx / distance) * lightVehicle.speed * dt;
                    const vy = (dy / distance) * lightVehicle.speed * dt;
                    
                    lightVehicle.x += vx;
                    lightVehicle.y += vy;
                }
            } else if (lightVehicle.state === 'waiting') {
                // === ESPERAR 1 SEGUNDO ANTES DE DISPARAR ===
                lightVehicle.waitTimer += dt;
                
                if (lightVehicle.waitTimer >= this.waitBeforeShoot) {
                    lightVehicle.state = 'shooting';
                    lightVehicle.shootTimer = 0;
                    console.log(`🔫 Artillado ligero ${lightVehicle.id} comenzando animación de disparo`);
                }
            } else if (lightVehicle.state === 'shooting') {
                // === ANIMACIÓN DE DISPARO (0.35 SEGUNDOS) ===
                lightVehicle.shootTimer += dt;
                
                if (lightVehicle.shootTimer >= this.shootDuration) {
                    // IMPACTO - Aplicar estado "broken" al objetivo (NO destruir)
                    console.log(`💥 Artillado ligero ${lightVehicle.id} aplicó estado "roto" a ${target.type} ${target.id}`);
                    
                    // 🆕 NUEVO: Aplicar estado broken en vez de destruir
                    target.broken = true;
                    
                    // Registrar impacto
                    impacts.push({
                        lightVehicleId: lightVehicle.id,
                        targetId: target.id,
                        targetType: target.type,
                        x: target.x,
                        y: target.y,
                        team: lightVehicle.team
                    });
                    
                    // Desactivar artillado ligero
                    lightVehicle.active = false;
                }
            }
        }
        
        return { impacts }; // Retornar eventos de impacto
    }
    
    /**
     * Obtiene todos los artillados ligeros activos para sincronizar
     */
    getLightVehicles() {
        return this.lightVehicles.filter(lv => lv.active).map(lv => ({
            id: lv.id,
            x: lv.x,
            y: lv.y,
            targetId: lv.targetId,
            team: lv.team,
            state: lv.state,
            spriteFrame: lv.spriteFrame,
            waitTimer: lv.waitTimer,
            shootTimer: lv.shootTimer
        }));
    }
    
    /**
     * Limpia artillados ligeros inactivos (mantenimiento)
     */
    cleanup() {
        this.lightVehicles = this.lightVehicles.filter(lv => lv.active);
    }
}

