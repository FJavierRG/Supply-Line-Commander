// ===== SISTEMA DE COMANDO ESPECIAL OPERATIVO =====
// Maneja el efecto de deshabilitar edificios enemigos dentro del área del comando

import { SERVER_NODE_CONFIG } from '../config/serverNodes.js';

export class CommandoSystem {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * ✅ Obtiene el radio del hitbox de un nodo (calculado dinámicamente)
     * Hitbox = radius * 1.2 (+20% para mejor detección de colisiones)
     * @param {Object} node - Nodo del juego
     * @returns {number} Radio del hitbox en píxeles
     */
    getNodeHitboxRadius(node) {
        const baseRadius = node.radius || SERVER_NODE_CONFIG.radius?.[node.type] || 30;
        return baseRadius * 1.2; // +20% hitbox para mejor detección de colisiones
    }
    
    /**
     * Actualiza el sistema de comandos
     * Deshabilita edificios enemigos dentro del área de detección de cada comando
     * 🆕 NUEVO: También verifica y elimina comandos expirados (optimizado: solo cuando se procesan)
     * @param {number} dt - Delta time en segundos
     */
    update(dt) {
        // Encontrar todos los comandos activos y verificar expiración en el mismo paso (más eficiente)
        const commandos = [];
        const expiredCommandos = [];
        
        for (const node of this.gameState.nodes) {
            if (!node.isCommando || !node.active || !node.constructed || node.isAbandoning) {
                continue;
            }
            
            // 🆕 NUEVO: Verificar expiración solo cuando procesamos comandos (no en loop separado)
            if (node.expiresAt && this.gameState.gameTime >= node.expiresAt) {
                // Comando expirado: marcar para eliminación
                node.active = false;
                node.isAbandoning = true;
                expiredCommandos.push(node.id);
                console.log(`⏰ Comando ${node.id} expirado después de ${(this.gameState.gameTime - node.spawnTime).toFixed(1)}s`);
                continue; // No incluirlo en la lista de comandos activos
            }
            
            // Comando activo y no expirado
            commandos.push(node);
        }
        
        if (commandos.length === 0) {
            // Si no hay comandos, resetear disabled de todos los nodos que fueron deshabilitados por comandos
            // (mantenemos disabledByCommando como tracking interno para saber qué resetear)
            // 🆕 NUEVO: NO resetear si tiene efecto residual activo (commandoResidual)
            for (const node of this.gameState.nodes) {
                if (node.disabledByCommando) {
                    // Verificar si tiene efecto residual activo
                    const hasResidualEffect = node.effects && node.effects.some(e => 
                        e.type === 'commandoResidual' && 
                        e.keepsDisabled && 
                        (!e.expiresAt || this.gameState.gameTime < e.expiresAt)
                    );
                    
                    // Solo resetear si NO tiene efecto residual activo
                    if (!hasResidualEffect) {
                        node.disabled = false;
                        node.disabledByCommando = false;
                    } else {
                        // Mantener disabled si tiene efecto residual
                        node.disabled = true;
                    }
                }
            }
            // Recalcular maxVehicles del HQ después de resetear disabled
            this.recalculateHQVehicles();
            return;
        }
        
        // Resetear estado de deshabilitación de todos los edificios afectados anteriormente por comandos
        // (para recalcular desde cero cada frame)
        // NOTA: disabledByCommando es solo tracking interno; la propiedad principal es disabled
        // 🆕 NUEVO: NO resetear si tiene efecto residual activo (commandoResidual)
        for (const node of this.gameState.nodes) {
            if (node.disabledByCommando) {
                // Verificar si tiene efecto residual activo
                const hasResidualEffect = node.effects && node.effects.some(e => 
                    e.type === 'commandoResidual' && 
                    e.keepsDisabled && 
                    (!e.expiresAt || this.gameState.gameTime < e.expiresAt)
                );
                
                // Solo resetear si NO tiene efecto residual activo
                if (!hasResidualEffect) {
                    node.disabled = false;
                    node.disabledByCommando = false;
                }
            }
        }
        
        // Para cada comando, encontrar y deshabilitar edificios enemigos dentro de su área
        for (const commando of commandos) {
            const detectionRadius = commando.detectionRadius || 200;
            const commandoTeam = commando.team;
            
            // Encontrar todos los edificios enemigos dentro del área
            for (const node of this.gameState.nodes) {
                // Solo afectar edificios enemigos construidos y activos
                if (node.team === commandoTeam || 
                    !node.active || 
                    !node.constructed ||
                    node.isAbandoning ||
                    node.type === 'hq' ||
                    node.type === 'front' ||
                    node.type === 'specopsCommando') {
                    continue;
                }
                
                // 🆕 NUEVO: Calcular distancia considerando el hitbox del edificio
                // Un edificio está afectado si cualquier parte de su hitbox está dentro del área del comando
                const dist = Math.hypot(node.x - commando.x, node.y - commando.y);
                const nodeHitboxRadius = this.getNodeHitboxRadius(node);
                
                // Si el hitbox del edificio entra en el área de detección, deshabilitar
                if (dist <= (detectionRadius + nodeHitboxRadius)) {
                    node.disabled = true;
                    node.disabledByCommando = true; // Tracking interno para saber qué resetear
                }
            }
        }
        
        // Recalcular maxVehicles del HQ después de aplicar disabled
        this.recalculateHQVehicles();
    }
    
    /**
     * Recalcula el maxVehicles del HQ basado en las truckFactories activas y no disabled
     */
    recalculateHQVehicles() {
        // Para cada equipo, recalcular maxVehicles del HQ
        const teams = ['player1', 'player2'];
        
        for (const team of teams) {
            const hq = this.gameState.nodes.find(n => n.type === 'hq' && n.team === team);
            if (!hq || !hq.hasVehicles) continue;
            
            // Contar truckFactories activas y no disabled
            const truckFactories = this.gameState.nodes.filter(n => 
                n.type === 'truckFactory' && 
                n.team === team && 
                !n.isAbandoning &&
                this.gameState.raceManager.isNodeFunctional(n) // 🆕 MODULARIZADO: Usar función helper (ya verifica constructed, active, disabled, broken)
            ).length;
            
            // ✅ Usar configuración de serverNodes (fuente única de verdad)
            const baseVehicles = SERVER_NODE_CONFIG.capacities.hq.maxVehicles || 4;
            const newMaxVehicles = baseVehicles + truckFactories;
            
            // Solo actualizar si cambió (evitar spam de logs)
            if (hq.maxVehicles !== newMaxVehicles) {
                const oldMax = hq.maxVehicles;
                const oldAvailable = hq.availableVehicles || 0;
                const difference = newMaxVehicles - oldMax;
                hq.maxVehicles = newMaxVehicles;
                
                // ✅ CORREGIDO: Aumentar availableVehicles cuando el máximo aumenta
                // Esto asegura que si una truckFactory se habilita (deja de estar disabled),
                // el jugador reciba el camión adicional
                hq.availableVehicles = oldAvailable + difference;
                
                // Asegurar que no exceda el máximo (por si acaso)
                if (hq.availableVehicles > newMaxVehicles) {
                    hq.availableVehicles = newMaxVehicles;
                }
                
                console.log(`🚚 HQ ${team}: maxVehicles recalculado ${oldMax} → ${newMaxVehicles} (${truckFactories} truckFactories activas), availableVehicles: ${oldAvailable} → ${hq.availableVehicles}`);
            }
        }
    }
    
    /**
     * Verifica si un nodo está siendo afectado por un comando
     * @param {string} nodeId - ID del nodo
     * @returns {boolean} True si está siendo afectado
     */
    isNodeDisabled(nodeId) {
        const node = this.gameState.nodes.find(n => n.id === nodeId);
        return node ? (node.disabled || false) : false;
    }
    
    /**
     * Obtiene todos los comandos que están afectando a un nodo
     * @param {string} nodeId - ID del nodo
     * @returns {Array} Array de nodos comando que están afectando al nodo
     */
    getAffectingCommandos(nodeId) {
        const node = this.gameState.nodes.find(n => n.id === nodeId);
        if (!node || node.isCommando) return [];
        
        const commandos = this.gameState.nodes.filter(n => 
            n.isCommando && 
            n.active && 
            n.constructed &&
            !n.isAbandoning &&
            n.team !== node.team
        );
        
        return commandos.filter(commando => {
            // 🆕 NUEVO: Verificar que el comando no haya expirado
            if (commando.expiresAt && this.gameState.gameTime >= commando.expiresAt) {
                return false;
            }
            
            // 🆕 NUEVO: Usar el mismo cálculo que en update() para consistencia
            const detectionRadius = commando.detectionRadius || 200;
            const dist = Math.hypot(node.x - commando.x, node.y - commando.y);
            const nodeHitboxRadius = this.getNodeHitboxRadius(node);
            
            // Un edificio está afectado si cualquier parte de su hitbox está dentro del área del comando
            return dist <= (detectionRadius + nodeHitboxRadius);
        });
    }
}

