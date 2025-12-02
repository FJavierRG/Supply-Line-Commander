// ===== SISTEMA DE DRONES BOMBA (SERVIDOR) =====
// Versión servidor del DroneSystem.js - Simulación autoritativa

export class DroneSystemServer {
    constructor(gameState) {
        this.gameState = gameState;
        this.drones = []; // Array de drones activos
        this.droneSpeed = 300; // Velocidad del dron (px/s) - mismo que cliente
        this.nextDroneId = 1; // Contador para IDs únicos
        this.alertSoundPlayed = new Map(); // Para trackear si ya se reprodujo el sonido de alerta
    }
    
    /**
     * Lanza un dron bomba hacia un objetivo
     */
    launchDrone(playerTeam, launcherNode, targetNode) {
        const droneId = `drone_${this.nextDroneId++}`;
        
        // CRÍTICO: Dron sale desde el EXTREMO del mapa del jugador (igual que singleplayer)
        // Player1 (izquierda) → x=0
        // Player2 (derecha) → x=1920 (worldWidth)
        const worldWidth = 1920;
        const droneStartX = playerTeam === 'player1' ? 0 : worldWidth;
        const droneStartY = targetNode.y; // Altura del objetivo
        
        const drone = {
            id: droneId,
            x: droneStartX,
            y: droneStartY,
            targetId: targetNode.id,
            speed: this.droneSpeed,
            team: playerTeam,
            active: true
        };
        
        this.drones.push(drone);
        
        console.log(`💣 Dron de ${playerTeam} lanzado desde extremo (${drone.x}, ${drone.y}) → ${targetNode.type} ${targetNode.id}`);
        
        return drone;
    }
    
    /**
     * Actualiza todos los drones activos (llamado cada tick)
     */
    update(dt) {
        const impacts = []; // Array de impactos en este tick
        const interceptions = []; // Array de intercepciones por anti-drones
        const alerts = []; // Array de alertas (dron en rango de detección)
        
        for (let i = this.drones.length - 1; i >= 0; i--) {
            const drone = this.drones[i];
            
            if (!drone.active) {
                this.drones.splice(i, 1);
                continue;
            }
            
            // Encontrar el objetivo
            const target = this.gameState.nodes.find(n => n.id === drone.targetId);
            
            if (!target || !target.active) {
                // Objetivo destruido o no encontrado - eliminar dron
                drone.active = false;
                console.log(`⚠️ Dron ${drone.id}: objetivo no encontrado, eliminando`);
                continue;
            }
            
            // === VERIFICAR ALERTA DE ANTI-DRONES (220px) ===
            const alert = this.checkAntiDroneAlert(drone);
            if (alert && !this.alertSoundPlayed.get(drone.id)) {
                // Registrar alerta para reproducir sonido en clientes
                alerts.push({
                    droneId: drone.id,
                    antiDroneId: alert.antiDroneId
                });
                
                this.alertSoundPlayed.set(drone.id, true);
                console.log(`🚨 Anti-drone ${alert.antiDroneId} detectó dron ${drone.id} (alerta)`);
            }
            
            // === VERIFICAR INTERCEPCIÓN POR ANTI-DRONES (160px) ===
            const interception = this.checkAntiDroneInterception(drone);
            if (interception) {
                // Dron interceptado
                console.log(`🎯 Anti-drone ${interception.antiDroneId} interceptó dron ${drone.id}`);
                
                // Desactivar dron
                drone.active = false;
                
                // Limpiar alerta
                this.alertSoundPlayed.delete(drone.id);
                
                // Marcar anti-drone como usado (se autodestruye)
                const antiDrone = this.gameState.nodes.find(n => n.id === interception.antiDroneId);
                if (antiDrone) {
                    antiDrone.active = false;
                    antiDrone.destroyed = true;
                }
                
                // Registrar intercepción para broadcast
                interceptions.push({
                    droneId: drone.id,
                    antiDroneId: interception.antiDroneId,
                    x: drone.x,
                    y: drone.y,
                    antiDroneX: interception.antiDroneX,
                    antiDroneY: interception.antiDroneY
                });
                
                continue; // No mover ni impactar, fue interceptado
            }
            
            // === MOVER HACIA EL OBJETIVO ===
            const dx = target.x - drone.x;
            const dy = target.y - drone.y;
            const distance = Math.hypot(dx, dy);
            
            // Calcular cuánto se movería este frame
            const speed = drone.speed * dt;
            
            // IMPACTO: Si está muy cerca O si el próximo movimiento lo pasaría
            if (distance < 5 || distance <= speed) {
                // IMPACTO - Destruir objetivo
                console.log(`💥 Dron ${drone.id} impactó ${target.type} ${target.id} (distancia: ${distance.toFixed(2)}px)`);
                
                // Marcar objetivo como destruido
                target.active = false;
                target.destroyed = true;
                
                // 🆕 NUEVO: Trackear edificios destruidos
                if (this.gameState.buildingsDestroyed && this.gameState.buildingsDestroyed[drone.team] !== undefined) {
                    this.gameState.buildingsDestroyed[drone.team]++;
                }
                
                // Registrar impacto
                impacts.push({
                    droneId: drone.id,
                    targetId: target.id,
                    targetType: target.type,
                    x: target.x,
                    y: target.y,
                    team: drone.team
                });
                
                // Desactivar dron
                drone.active = false;
            } else {
                // Mover hacia el objetivo (mismo cálculo que cliente)
                const vx = (dx / distance) * drone.speed * dt;
                const vy = (dy / distance) * drone.speed * dt;
                
                drone.x += vx;
                drone.y += vy;
            }
        }
        
        return { impacts, interceptions, alerts }; // Retornar los 3 tipos de eventos
    }
    
    /**
     * Verifica si un dron entra en rango de alerta (220px) de anti-drones
     */
    checkAntiDroneAlert(drone) {
        // Buscar anti-drones del equipo enemigo (que pueden detectar este dron)
        const enemyTeam = drone.team === 'player1' ? 'player2' : 'player1';
        const antiDrones = this.gameState.nodes.filter(n => 
            n.type === 'antiDrone' && 
            n.team === enemyTeam && 
            n.constructed && 
            n.active &&
            !n.isAbandoning
        );
        
        // Buscar si hay algún anti-drone en rango de alerta
        const alertRange = 220; // Rango de alerta (mayor que detección)
        
        for (const antiDrone of antiDrones) {
            const distance = Math.hypot(
                drone.x - antiDrone.x,
                drone.y - antiDrone.y
            );
            
            if (distance <= alertRange) {
                return {
                    antiDroneId: antiDrone.id,
                    distance: distance
                };
            }
        }
        
        return null;
    }
    
    /**
     * Verifica si un dron es interceptado por anti-drones (160px)
     */
    checkAntiDroneInterception(drone) {
        // Buscar anti-drones del equipo enemigo (que pueden atacar este dron)
        const enemyTeam = drone.team === 'player1' ? 'player2' : 'player1';
        const antiDrones = this.gameState.nodes.filter(n => 
            n.type === 'antiDrone' && 
            n.team === enemyTeam && 
            n.constructed && 
            n.active &&
            !n.isAbandoning
        );
        
        // Buscar el anti-drone más cercano en rango de intercepción
        const detectionRange = 160; // Rango de disparo (sincronizado con cliente)
        let closestAntiDrone = null;
        let closestDistance = detectionRange;
        
        for (const antiDrone of antiDrones) {
            const distance = Math.hypot(
                drone.x - antiDrone.x,
                drone.y - antiDrone.y
            );
            
            if (distance <= detectionRange && distance < closestDistance) {
                closestAntiDrone = antiDrone;
                closestDistance = distance;
            }
        }
        
        // Si hay un anti-drone en rango, interceptar
        if (closestAntiDrone) {
            return {
                antiDroneId: closestAntiDrone.id,
                antiDroneX: closestAntiDrone.x,
                antiDroneY: closestAntiDrone.y,
                distance: closestDistance
            };
        }
        
        return null;
    }
    
    /**
     * Obtiene todos los drones activos para sincronizar
     */
    getDrones() {
        return this.drones.filter(d => d.active).map(d => ({
            id: d.id,
            x: d.x,
            y: d.y,
            targetId: d.targetId,
            team: d.team
        }));
    }
    
    /**
     * Limpia drones inactivos (mantenimiento)
     */
    cleanup() {
        this.drones = this.drones.filter(d => d.active);
    }
}

