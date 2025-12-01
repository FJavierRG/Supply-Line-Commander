// ===== SISTEMA DE ARTILLERÍA (SERVIDOR) =====
// Maneja bombardeos de artillería de área que causan estado "broken" a edificios enemigos

import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

export class ArtillerySystemServer {
    constructor(gameState) {
        this.gameState = gameState;
        this.artilleryStrikes = []; // Array de bombardeos de artillería activos
        this.nextArtilleryId = 1; // Contador para IDs únicos
        
        const artilleryConfig = SERVER_NODE_CONFIG.gameplay.artillery;
        this.countdownDuration = artilleryConfig.countdownDuration || 3; // 3 segundos
        this.areaRadius = artilleryConfig.areaRadius || 200; // Radio del área de efecto
    }
    
    /**
     * Lanza un bombardeo de artillería en una posición
     * @param {string} playerTeam - Equipo del jugador ('player1' o 'player2')
     * @param {number} x - Coordenada X del centro del área de efecto
     * @param {number} y - Coordenada Y del centro del área de efecto
     * @returns {Object} Objeto del bombardeo de artillería
     */
    launchArtillery(playerTeam, x, y) {
        const artilleryId = `artillery_${this.nextArtilleryId++}`;
        
        const artilleryStrike = {
            id: artilleryId,
            x: x,
            y: y,
            playerTeam: playerTeam,
            startTime: this.gameState.gameTime,
            active: true,
            executed: false
        };
        
        this.artilleryStrikes.push(artilleryStrike);
        
        console.log(`💣 Artillería de ${playerTeam} lanzada en (${x}, ${y})`);
        
        return artilleryStrike;
    }
    
    /**
     * Actualiza todos los bombardeos de artillería activos (llamado cada tick)
     * @param {number} dt - Delta time en segundos
     * @returns {Object} Evento de ejecución si se ejecutó, null si no
     */
    update(dt) {
        for (let i = this.artilleryStrikes.length - 1; i >= 0; i--) {
            const artillery = this.artilleryStrikes[i];
            
            if (!artillery.active) {
                this.artilleryStrikes.splice(i, 1);
                continue;
            }
            
            // Verificar si el countdown ha terminado
            const elapsed = this.gameState.gameTime - artillery.startTime;
            
            if (elapsed >= this.countdownDuration && !artillery.executed) {
                // Ejecutar efecto: aplicar broken a todos los edificios en el área
                this.executeArtillery(artillery);
                artillery.executed = true;
                artillery.active = false;
                
                return {
                    artilleryId: artillery.id,
                    x: artillery.x,
                    y: artillery.y,
                    playerTeam: artillery.playerTeam,
                    affectedBuildings: artillery.affectedBuildings || []
                };
            }
        }
        
        return null;
    }
    
    /**
     * Ejecuta el efecto de artillería: aplica broken a todos los edificios enemigos en el área
     * @param {Object} artillery - Objeto del bombardeo de artillería
     */
    executeArtillery(artillery) {
        const enemyTeam = artillery.playerTeam === 'player1' ? 'player2' : 'player1';
        const affectedBuildings = [];
        
        // Buscar todos los edificios enemigos dentro del área de efecto
        for (const node of this.gameState.nodes) {
            // Solo considerar edificios enemigos construidos y activos
            // NO afectar FOBs ni HQs
            if (node.team !== enemyTeam || 
                !node.active || 
                !node.constructed ||
                node.isAbandoning ||
                node.type === 'hq' ||
                node.type === 'fob' ||
                node.type === 'front') {
                continue;
            }
            
            // Calcular distancia desde el centro del bombardeo hasta el edificio
            const dist = Math.hypot(node.x - artillery.x, node.y - artillery.y);
            const baseRadius = SERVER_NODE_CONFIG.radius?.[node.type] || 30;
            const nodeHitboxRadius = baseRadius * 1.2; // +20% hitbox para mejor detección
            
            // Si el hitbox del edificio está dentro del área de efecto, aplicar broken
            if (dist <= (this.areaRadius + nodeHitboxRadius)) {
                // Aplicar estado broken (NO destruir)
                node.broken = true;
                affectedBuildings.push({
                    id: node.id,
                    type: node.type,
                    x: node.x,
                    y: node.y
                });
                
                console.log(`💥 Artillería ${artillery.id}: aplicó estado "roto" a ${node.type} ${node.id}`);
            }
        }
        
        artillery.affectedBuildings = affectedBuildings;
        console.log(`💣 Artillería ${artillery.id} ejecutada: ${affectedBuildings.length} edificios afectados`);
    }
    
    /**
     * Obtiene todos los bombardeos de artillería activos para sincronizar
     */
    getArtilleryStrikes() {
        return this.artilleryStrikes.filter(a => a.active).map(a => ({
            id: a.id,
            x: a.x,
            y: a.y,
            playerTeam: a.playerTeam,
            startTime: a.startTime,
            executed: a.executed
        }));
    }
    
    /**
     * Limpia bombardeos de artillería inactivos (mantenimiento)
     */
    cleanup() {
        this.artilleryStrikes = this.artilleryStrikes.filter(a => a.active);
    }
}

