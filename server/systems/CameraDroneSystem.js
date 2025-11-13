// ===== SISTEMA DE CAMERA DRONE =====
// Maneja la detección de vehículos ligeros y otorgamiento de currency

import { SERVER_NODE_CONFIG } from '../config/serverNodes.js';

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
     * @param {number} dt - Delta time en segundos
     */
    update(dt) {
        // Encontrar todos los camera drones activos
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
            
            // Verificar si el convoy pasa por el área de algún camera drone enemigo
            for (const cameraDrone of cameraDrones) {
                // Solo detectar convoyes enemigos
                if (cameraDrone.team === convoy.team) {
                    continue;
                }
                
                // Inicializar Map de estados anteriores para este camera drone si no existe
                if (!this.previousConvoyStates.has(cameraDrone.id)) {
                    this.previousConvoyStates.set(cameraDrone.id, new Map());
                }
                
                const previousStates = this.previousConvoyStates.get(cameraDrone.id);
                
                // Crear ID único para este convoy en esta dirección (ida o vuelta)
                const convoyDirectionId = `${convoy.id}_${convoy.returning ? 'return' : 'outbound'}`;
                
                // Calcular distancia desde el camera drone hasta la línea del convoy
                const distToLine = this.distanceToLineSegment(
                    cameraDrone.x, cameraDrone.y,
                    fromNode.x, fromNode.y,
                    toNode.x, toNode.y
                );
                
                // Verificar si está dentro del área ahora
                const isInsideNow = distToLine <= detectionRadius;
                
                // Obtener estado anterior (undefined si no existe = primera vez que vemos este convoy en esta dirección)
                const wasInsideBefore = previousStates.get(convoyDirectionId);
                
                // Inicializar Set de convoyes detectados para este camera drone si no existe
                if (!this.detectedConvoys.has(cameraDrone.id)) {
                    this.detectedConvoys.set(cameraDrone.id, new Set());
                }
                
                const detectedSet = this.detectedConvoys.get(cameraDrone.id);
                
                // CRÍTICO: Verificar PRIMERO si ya fue detectado para evitar pagos duplicados
                // Esta verificación debe ser lo primero que hacemos ANTES de cualquier otra lógica
                const alreadyDetected = detectedSet.has(convoyDirectionId);
                if (alreadyDetected) {
                    // Ya fue detectado antes, solo actualizar estado pero NO pagar
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
                    
                    // Verificar nuevamente después de agregar (doble verificación de seguridad)
                    // Esto debería ser redundante pero asegura que no hay condiciones de carrera
                    if (!detectedSet.has(convoyDirectionId)) {
                        console.error(`❌ ERROR: detectedSet no persiste para ${convoyDirectionId}`);
                        continue;
                    }
                    
                    // Otorgar currency al equipo del camera drone
                    if (this.gameState.currency && this.gameState.currency[cameraDrone.team] !== undefined) {
                        this.gameState.currency[cameraDrone.team] += currencyReward;
                        
                        console.log(`📹 Camera Drone ${cameraDrone.id.substring(0, 8)} detectó camión ligero ${convoy.id.substring(0, 8)} (${convoy.returning ? 'vuelta' : 'ida'}) → +${currencyReward}$ para ${cameraDrone.team} [detectedSet size: ${detectedSet.size}]`);
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

