// ===== SISTEMA DE COMANDO ESPECIAL OPERATIVO =====
// Maneja el efecto de deshabilitar edificios enemigos dentro del área del comando

export class CommandoSystem {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Actualiza el sistema de comandos
     * Deshabilita edificios enemigos dentro del área de detección de cada comando
     * @param {number} dt - Delta time en segundos
     */
    update(dt) {
        // Encontrar todos los comandos activos
        const commandos = this.gameState.nodes.filter(n => 
            n.isCommando && 
            n.active && 
            n.constructed &&
            !n.isAbandoning
        );
        
        if (commandos.length === 0) {
            // Si no hay comandos, resetear disabled de todos los nodos que fueron deshabilitados por comandos
            // (mantenemos disabledByCommando como tracking interno para saber qué resetear)
            for (const node of this.gameState.nodes) {
                if (node.disabledByCommando) {
                    node.disabled = false;
                    node.disabledByCommando = false;
                }
            }
            // Recalcular maxVehicles del HQ después de resetear disabled
            this.recalculateHQVehicles();
            return;
        }
        
        // Resetear estado de deshabilitación de todos los edificios afectados anteriormente por comandos
        // (para recalcular desde cero cada frame)
        // NOTA: disabledByCommando es solo tracking interno; la propiedad principal es disabled
        for (const node of this.gameState.nodes) {
            if (node.disabledByCommando) {
                node.disabled = false;
                node.disabledByCommando = false;
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
                
                // Calcular distancia desde el comando
                const dist = Math.hypot(node.x - commando.x, node.y - commando.y);
                
                // Si está dentro del área de detección, deshabilitar
                if (dist <= detectionRadius) {
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
                n.constructed &&
                !n.disabled &&
                !n.isAbandoning &&
                n.active
            ).length;
            
            // Calcular nuevo maxVehicles: base (4) + bonus de truckFactories
            const baseVehicles = 4;
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
            const dist = Math.hypot(node.x - commando.x, node.y - commando.y);
            return dist <= (commando.detectionRadius || 200);
        });
    }
}

