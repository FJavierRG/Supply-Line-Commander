// ===== SISTEMA DE TRUCK ASSAULT =====
// Maneja el efecto de ralentizar vehículos enemigos dentro del área del truck assault

import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

export class TruckAssaultSystem {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Actualiza el sistema de truck assault
     * Ralentiza vehículos enemigos dentro del área de detección de cada truck assault
     * También verifica y elimina truck assaults expirados
     * @param {number} dt - Delta time en segundos
     */
    update(dt) {
        // Encontrar todos los truck assaults activos y verificar expiración
        const truckAssaults = [];
        const expiredAssaults = [];
        
        for (const node of this.gameState.nodes) {
            if (!node.isTruckAssault || !node.active || !node.constructed || node.isAbandoning) {
                continue;
            }
            
            // Verificar expiración
            if (node.expiresAt && this.gameState.gameTime >= node.expiresAt) {
                // Truck assault expirado: marcar para eliminación
                node.active = false;
                node.isAbandoning = true;
                expiredAssaults.push(node.id);
                console.log(`⏰ Truck Assault ${node.id} expirado después de ${(this.gameState.gameTime - node.spawnTime).toFixed(1)}s`);
                continue;
            }
            
            // Truck assault activo y no expirado
            truckAssaults.push(node);
        }
        
        // El efecto de ralentización se aplica directamente en ConvoyMovementManager
        // Este sistema solo gestiona la expiración de los truck assaults
    }
    
    /**
     * Verifica si un convoy está dentro del área de efecto de algún truck assault enemigo
     * ✅ FIX: Ahora verifica la POSICIÓN ACTUAL del convoy, no solo la ruta completa
     * @param {Object} convoy - Convoy a verificar
     * @returns {Object|null} Truck assault que está afectando al convoy, o null si ninguno
     */
    getAffectingTruckAssault(convoy) {
        if (!convoy || !convoy.fromId || !convoy.toId) {
            return null;
        }
        
        // Obtener nodos origen y destino del convoy
        const fromNode = this.gameState.nodes.find(n => n.id === convoy.fromId);
        const toNode = this.gameState.nodes.find(n => n.id === convoy.toId);
        
        if (!fromNode || !toNode) {
            return null;
        }
        
        // ✅ FIX: Calcular posición ACTUAL del convoy basada en su progress
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
        
        // Buscar truck assaults enemigos activos
        const enemyTruckAssaults = this.gameState.nodes.filter(n => 
            n.isTruckAssault && 
            n.active && 
            n.constructed &&
            !n.isAbandoning &&
            n.team !== convoy.team &&
            (!n.expiresAt || this.gameState.gameTime < n.expiresAt)
        );
        
        // ✅ FIX: Verificar si la POSICIÓN ACTUAL del convoy está dentro del área de algún truck assault
        for (const assault of enemyTruckAssaults) {
            const detectionRadius = assault.detectionRadius || 200;
            
            // Calcular distancia desde el truck assault hasta la posición actual del convoy
            const distToCurrentPosition = Math.hypot(
                assault.x - currentX,
                assault.y - currentY
            );
            
            // Si la posición actual está dentro del radio de detección, el convoy está afectado
            if (distToCurrentPosition <= detectionRadius) {
                return assault;
            }
        }
        
        return null;
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

