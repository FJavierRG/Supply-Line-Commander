// ===== SISTEMA DE CAMERA DRONE =====
// Maneja la detección de vehículos ligeros y otorgamiento de currency

import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

export class CameraDroneSystem {
    constructor(gameState) {
        this.gameState = gameState;
        // Tracking de convoyes detectados por cada camera drone
        // Estructura: Map<cameraDroneId, Set<convoyId>>
        this.detectedConvoys = new Map();
        // Tracking del estado anterior (dentro/fuera) de cada convoy respecto a cada camera drone
        // Estructura: Map<cameraDroneId, Map<convoyId_direction, boolean>>
        // true = estaba dentro del área en el frame anterior
        this.previousConvoyStates = new Map();
    }
    
    /**
     * Actualiza el sistema de camera drone
     * Detecta camiones ligeros que pasan por el área y otorga currency
     * También verifica expiración de camera drones desplegados
     * @param {number} dt - Delta time en segundos
     */
    update(dt) {
        // 🆕 NUEVO: Verificar expiración de camera drones desplegados
        const expiredDrones = this.checkExpiredCameraDrones();
        
        // Encontrar todos los camera drones activos (excluyendo los que acaban de expirar)
        const cameraDrones = this.gameState.nodes.filter(n => 
            n.isCameraDrone && 
            n.active && 
            n.constructed &&
            !n.isAbandoning &&
            n.deployed // Solo procesar drones que ya están desplegados
        );
        
        if (cameraDrones.length === 0) {
            return;
        }
        
        // Obtener configuración del camera drone
        const cameraDroneConfig = SERVER_NODE_CONFIG.specialNodes?.cameraDrone || {};
        const detectionRadius = cameraDroneConfig.detectionRadius || 200;
        const currencyReward = cameraDroneConfig.currencyReward || 10;
        
        // Iterar sobre todos los convoyes activos
        for (const convoy of this.gameState.convoys) {
            // Solo detectar camiones ligeros (vehicleType === 'truck')
            if (convoy.vehicleType !== 'truck') {
                continue;
            }
            
            // Obtener nodos origen y destino del convoy
            const fromNode = this.gameState.nodes.find(n => n.id === convoy.fromId);
            const toNode = this.gameState.nodes.find(n => n.id === convoy.toId);
            
            if (!fromNode || !toNode) {
                continue;
            }
            
            // ✅ FIX: Calcular posición ACTUAL del convoy basada en su progress (una sola vez)
            // El progress va de 0.0 (origen) a 1.0 (destino)
            const progress = Math.max(0, Math.min(1, convoy.progress || 0));
            
            // ✅ FIX: Cuando returning === true, el convoy va de toNode (progress=0) a fromNode (progress=1)
            // Cuando returning === false, el convoy va de fromNode (progress=0) a toNode (progress=1)
            let currentX, currentY;
            if (convoy.returning) {
                // Modo regreso: va de toNode (progress=0) a fromNode (progress=1)
                currentX = toNode.x + (fromNode.x - toNode.x) * progress;
                currentY = toNode.y + (fromNode.y - toNode.y) * progress;
            } else {
                // Modo ida: va de fromNode (progress=0) a toNode (progress=1)
                currentX = fromNode.x + (toNode.x - fromNode.x) * progress;
                currentY = fromNode.y + (toNode.y - fromNode.y) * progress;
            }
            
            // ✅ FIX: Filtrar solo camera drones enemigos y ordenarlos por distancia al convoy
            // Esto asegura que el camera drone más cercano detecte primero
            const enemyCameraDronesWithDist = cameraDrones
                .filter(cd => cd.team !== convoy.team)
                .map(cd => {
                    const dist = Math.hypot(cd.x - currentX, cd.y - currentY);
                    const isInside = dist <= detectionRadius;
                    return { cameraDrone: cd, distance: dist, isInside };
                })
                .sort((a, b) => a.distance - b.distance); // Ordenar por distancia (más cercano primero)
            
            const enemyCameraDrones = enemyCameraDronesWithDist.map(item => item.cameraDrone);
            
            // ✅ FIX: Rastrear si el convoy ya fue detectado en este tick por algún camera drone
            let detectedInThisTick = false;
            
            // Verificar si el convoy pasa por el área de algún camera drone enemigo
            for (const cameraDrone of enemyCameraDrones) {
                // Inicializar Map de estados anteriores para este camera drone si no existe
                if (!this.previousConvoyStates.has(cameraDrone.id)) {
                    this.previousConvoyStates.set(cameraDrone.id, new Map());
                }
                
                const previousStates = this.previousConvoyStates.get(cameraDrone.id);
                
                // Crear ID único para este convoy en esta dirección (ida o vuelta)
                const convoyDirectionId = `${convoy.id}_${convoy.returning ? 'return' : 'outbound'}`;
                
                // ✅ FIX: Calcular distancia desde el camera drone hasta la POSICIÓN ACTUAL del convoy
                const distToCurrentPosition = Math.hypot(
                    cameraDrone.x - currentX,
                    cameraDrone.y - currentY
                );
                
                // Verificar si la posición actual está dentro del área ahora
                const isInsideNow = distToCurrentPosition <= detectionRadius;
                
                // Obtener estado anterior (undefined si no existe = primera vez que vemos este convoy en esta dirección)
                const wasInsideBefore = previousStates.get(convoyDirectionId);
                
                // Inicializar Set de convoyes detectados para este camera drone si no existe
                if (!this.detectedConvoys.has(cameraDrone.id)) {
                    this.detectedConvoys.set(cameraDrone.id, new Set());
                }
                
                const detectedSet = this.detectedConvoys.get(cameraDrone.id);
                
                // CRÍTICO: Verificar PRIMERO si ya fue detectado por ESTE camera drone para evitar pagos duplicados
                // Esta verificación debe ser lo primero que hacemos ANTES de cualquier otra lógica
                const alreadyDetectedByThisDrone = detectedSet.has(convoyDirectionId);
                if (alreadyDetectedByThisDrone) {
                    // Ya fue detectado antes por este camera drone, solo actualizar estado pero NO pagar
                    previousStates.set(convoyDirectionId, isInsideNow);
                    continue; // Saltar al siguiente camera drone
                }
                
                // ✅ FIX: Si ya fue detectado por otro camera drone en este tick (más cercano), saltar
                // Esto previene que aparezcan múltiples eventos visuales para el mismo convoy
                if (detectedInThisTick) {
                    // Ya fue detectado por otro camera drone (más cercano) en este tick, solo actualizar estado pero NO pagar
                    previousStates.set(convoyDirectionId, isInsideNow);
                    continue; // Saltar al siguiente camera drone
                }
                
                // Solo otorgar currency cuando ENTRA al área (cambia de fuera a dentro)
                // Lógica de detección:
                // 1. Si es la primera vez que vemos este convoy (wasInsideBefore === undefined):
                //    - Si está dentro: Pagar (asumimos que acaba de entrar)
                //    - Si está fuera: Marcar como fuera, no pagar todavía
                // 2. Si ya lo habíamos visto antes:
                //    - Si estaba fuera y ahora está dentro: Pagar (transición clara)
                //    - Si estaba dentro y sigue dentro: No pagar (ya estaba dentro)
                //    - Si estaba dentro y ahora está fuera: No pagar (salió)
                //    - Si estaba fuera y sigue fuera: No pagar (sigue fuera)
                
                let shouldPay = false;
                
                if (wasInsideBefore === undefined) {
                    // Primera vez que vemos este convoy en esta dirección
                    if (isInsideNow) {
                        // Está dentro: asumimos que acaba de entrar, pagar
                        shouldPay = true;
                    }
                } else {
                    // Ya habíamos visto este convoy antes
                    // Solo pagar si hay transición de fuera a dentro
                    if (isInsideNow && wasInsideBefore === false) {
                        shouldPay = true;
                    }
                }
                
                // Pagar solo si corresponde y marcar como detectado INMEDIATAMENTE para evitar condiciones de carrera
                if (shouldPay) {
                    // CRÍTICO: Marcar como detectado INMEDIATAMENTE antes de cualquier otra operación
                    // Esto previene pagos duplicados incluso si el código se ejecuta múltiples veces
                    detectedSet.add(convoyDirectionId);
                    detectedInThisTick = true; // ✅ FIX: Marcar que fue detectado en este tick
                    
                    // Verificar nuevamente después de agregar (doble verificación de seguridad)
                    // Esto debería ser redundante pero asegura que no hay condiciones de carrera
                    if (!detectedSet.has(convoyDirectionId)) {
                        console.error(`❌ ERROR: detectedSet no persiste para ${convoyDirectionId}`);
                        continue;
                    }
                    
                    // Otorgar currency al equipo del camera drone
                    if (this.gameState.currency && this.gameState.currency[cameraDrone.team] !== undefined) {
                        this.gameState.currency[cameraDrone.team] += currencyReward;
                        // 🔧 FIX: También sumar al total generado para estadísticas
                        if (this.gameState.currencyGenerated) {
                            this.gameState.currencyGenerated[cameraDrone.team] += currencyReward;
                        }
                        
                        // 🆕 NUEVO: Agregar evento visual para mostrar número flotante en el cliente
                        if (this.gameState.addVisualEvent) {
                            this.gameState.addVisualEvent('camera_drone_currency', {
                                cameraDroneId: cameraDrone.id,
                                x: cameraDrone.x,
                                y: cameraDrone.y,
                                amount: currencyReward,
                                team: cameraDrone.team
                            });
                        }
                        
                    }
                }
                
                // Si el convoy cambió de dirección, limpiar el estado de la dirección anterior
                const oppositeDirectionId = `${convoy.id}_${convoy.returning ? 'outbound' : 'return'}`;
                if (previousStates.has(oppositeDirectionId)) {
                    previousStates.delete(oppositeDirectionId);
                    // También limpiar de detectedSet para permitir detección en la nueva dirección
                    if (detectedSet) {
                        detectedSet.delete(oppositeDirectionId);
                    }
                }
                
                // Guardar estado actual (true si está dentro, false si está fuera) para el próximo frame
                previousStates.set(convoyDirectionId, isInsideNow);
            }
        }
        
        // Limpiar tracking de convoyes que ya no existen
        this.cleanupDetectedConvoys();
    }
    
    /**
     * 🆕 NUEVO: Verifica y expira camera drones que han superado su duración
     * @returns {Array} IDs de camera drones expirados
     */
    checkExpiredCameraDrones() {
        const expiredDrones = [];
        const gameTime = this.gameState.gameTime;
        
        // Buscar camera drones desplegados con tiempo de expiración
        const deployedCameraDrones = this.gameState.nodes.filter(n => 
            n.isCameraDrone && 
            n.active && 
            n.deployed &&
            !n.isAbandoning &&
            n.expiresAt !== undefined
        );
        
        for (const cameraDrone of deployedCameraDrones) {
            // Verificar si ha expirado
            if (gameTime >= cameraDrone.expiresAt) {
                // Camera drone expirado: marcar para eliminación
                cameraDrone.active = false;
                cameraDrone.isAbandoning = true;
                expiredDrones.push(cameraDrone.id);
                
                const duration = cameraDrone.expiresAt - cameraDrone.spawnTime;
                console.log(`⏰ Camera Drone ${cameraDrone.id.substring(0, 8)} expirado después de ${duration.toFixed(1)}s`);
                
                // Limpiar tracking de este drone
                this.detectedConvoys.delete(cameraDrone.id);
                this.previousConvoyStates.delete(cameraDrone.id);
            }
        }
        
        return expiredDrones;
    }
    
    /**
     * Limpia el tracking de convoyes que ya no existen
     */
    cleanupDetectedConvoys() {
        const activeConvoyIds = new Set(this.gameState.convoys.map(c => c.id));
        
        for (const [cameraDroneId, detectedSet] of this.detectedConvoys.entries()) {
            // Verificar si el camera drone aún existe
            const cameraDrone = this.gameState.nodes.find(n => n.id === cameraDroneId);
            if (!cameraDrone || !cameraDrone.active) {
                this.detectedConvoys.delete(cameraDroneId);
                this.previousConvoyStates.delete(cameraDroneId);
                continue;
            }
            
            // Limpiar IDs de convoyes que ya no existen
            // CRÍTICO: El convoyDirectionId tiene formato "convoy_xxx_outbound" o "convoy_xxx_return"
            // Necesitamos extraer solo el ID del convoy (antes del primer "_" después del prefijo)
            const toRemove = [];
            for (const convoyDirectionId of detectedSet) {
                // El formato es: "convoy_xxx_direction" donde xxx es el ID del convoy
                // Necesitamos extraer "convoy_xxx" del string completo
                // Ejemplo: "convoy_0_outbound" -> "convoy_0"
                const parts = convoyDirectionId.split('_');
                if (parts.length >= 2) {
                    // Reconstruir el ID del convoy (primeras dos partes: "convoy" + ID)
                    const convoyId = parts.slice(0, 2).join('_');
                    if (!activeConvoyIds.has(convoyId)) {
                        toRemove.push(convoyDirectionId);
                    }
                }
            }
            
            toRemove.forEach(id => detectedSet.delete(id));
            
            // Limpiar estados anteriores también
            const previousStates = this.previousConvoyStates.get(cameraDroneId);
            if (previousStates) {
                for (const convoyDirectionId of toRemove) {
                    previousStates.delete(convoyDirectionId);
                }
            }
        }
    }
    
    /**
     * Verifica si hay un camera drone activo cerca de una posición que permita construcción en territorio enemigo
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @param {string} playerTeam - Equipo del jugador
     * @returns {boolean} true si hay un camera drone que permite construir aquí
     */
    canBuildInEnemyTerritory(x, y, playerTeam) {
        const cameraDrones = this.gameState.nodes.filter(n => 
            n.isCameraDrone && 
            n.team === playerTeam &&
            n.active && 
            n.constructed &&
            !n.isAbandoning &&
            n.deployed
        );
        
        if (cameraDrones.length === 0) {
            return false;
        }
        
        const cameraDroneConfig = SERVER_NODE_CONFIG.specialNodes?.cameraDrone || {};
        const buildRadius = cameraDroneConfig.buildRadius || 300; // Radio para permitir construcción
        
        // Verificar si la posición está dentro del radio de algún camera drone
        for (const cameraDrone of cameraDrones) {
            const distance = Math.hypot(x - cameraDrone.x, y - cameraDrone.y);
            if (distance <= buildRadius) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Calcula la distancia desde un punto hasta un segmento de línea
     * @param {number} px - Coordenada X del punto
     * @param {number} py - Coordenada Y del punto
     * @param {number} x1 - Coordenada X del inicio del segmento
     * @param {number} y1 - Coordenada Y del inicio del segmento
     * @param {number} x2 - Coordenada X del fin del segmento
     * @param {number} y2 - Coordenada Y del fin del segmento
     * @returns {number} Distancia mínima desde el punto hasta el segmento
     */
    distanceToLineSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;
        
        if (lengthSquared === 0) {
            // Segmento es un punto
            return Math.hypot(px - x1, py - y1);
        }
        
        // Calcular proyección del punto sobre el segmento
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
        
        // Punto más cercano en el segmento
        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;
        
        // Distancia desde el punto hasta el punto más cercano en el segmento
        return Math.hypot(px - closestX, py - closestY);
    }
}

