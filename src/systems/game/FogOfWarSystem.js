// ===== SISTEMA DE NIEBLA DE GUERRA =====
// Controla la visibilidad de zonas enemigas basándose en la proximidad de los frentes

/**
 * FogOfWarSystem - Sistema de niebla de guerra por carriles
 * 
 * El mapa se divide en 4 zonas (2 por jugador, superior e inferior).
 * Cada jugador tiene 2 nodos de frente que avanzan/retroceden automáticamente.
 * Cuando un frente se encuentra con el del enemigo a menos de cierta distancia,
 * ambos jugadores revelan esa zona del rival.
 * 
 * Responsabilidades:
 * - Mantener estado de visibilidad por carril (lane1Visible, lane2Visible)
 * - Calcular visibilidad basándose en distancia entre fronts
 * - Proporcionar método isVisible() para consultar si una entidad debe renderizarse
 */
export class FogOfWarSystem {
    constructor(game) {
        this.game = game;
        
        // Configuración de carriles (basado en yPercent del mapa)
        // Carril 1 (superior): y ~= 0.259 * 1080 = ~280px
        // Carril 2 (inferior): y ~= 0.722 * 1080 = ~780px
        // Límite entre carriles: mitad del mapa = 540px
        this.laneConfig = {
            lane1: { yCenter: 280, yMin: 0, yMax: 540 },      // Mitad superior
            lane2: { yCenter: 780, yMin: 540, yMax: 1080 }    // Mitad inferior
        };
        
        // Distancia mínima entre frentes para revelar la zona enemiga
        this.revealDistance = 200; // píxeles en eje X
        
        // Estado de visibilidad por carril (desde perspectiva del jugador actual)
        this.lane1Visible = false;
        this.lane2Visible = false;
        
        // Cache de posiciones de frentes para optimización
        this._frontPositions = {
            player1: { lane1: null, lane2: null },
            player2: { lane1: null, lane2: null }
        };
        
        // Flag para activar/desactivar el sistema
        this.enabled = true;
        
        // 🆕 NUEVO: Flags para revelación forzada por carril (efectos de edificios)
        this.lane1ForcedVisible = false;
        this.lane2ForcedVisible = false;
    }
    
    /**
     * Fuerza la visibilidad de un carril (para efectos de edificios como radar)
     * @param {number} lane - Número de carril (1 o 2)
     * @param {boolean} visible - Si debe forzar visibilidad
     */
    setLaneForcedVisible(lane, visible) {
        if (lane === 1) {
            this.lane1ForcedVisible = visible;
        } else if (lane === 2) {
            this.lane2ForcedVisible = visible;
        }
    }
    
    /**
     * Resetea todas las revelaciones forzadas
     */
    resetForcedVisibility() {
        this.lane1ForcedVisible = false;
        this.lane2ForcedVisible = false;
    }
    
    /**
     * Determina a qué carril pertenece una coordenada Y
     * @param {number} y - Coordenada Y
     * @returns {number} 1 o 2 según el carril
     */
    getLaneForY(y) {
        return y < this.laneConfig.lane1.yMax ? 1 : 2;
    }
    
    /**
     * Actualiza el estado de visibilidad de ambos carriles
     * Debe llamarse cada frame o cuando cambien las posiciones de los frentes
     */
    updateVisibility() {
        if (!this.enabled || !this.game) {
            this.lane1Visible = true;
            this.lane2Visible = true;
            return;
        }
        
        const nodes = this.game.nodes;
        if (!nodes || nodes.length === 0) {
            this.lane1Visible = false;
            this.lane2Visible = false;
            return;
        }
        
        // Recopilar frentes por equipo y carril
        const fronts = {
            player1: { lane1: null, lane2: null },
            player2: { lane1: null, lane2: null }
        };
        
        nodes.forEach(node => {
            if (node.type !== 'front' || !node.active) return;
            
            const team = this._normalizeTeam(node.team);
            const lane = this.getLaneForY(node.y);
            
            if (team === 'player1' || team === 'player2') {
                const laneKey = lane === 1 ? 'lane1' : 'lane2';
                fronts[team][laneKey] = { x: node.x, y: node.y };
            }
        });
        
        // Guardar en cache
        this._frontPositions = fronts;
        
        // Calcular visibilidad del carril 1 (superior)
        this.lane1Visible = this._calculateLaneVisibility(
            fronts.player1.lane1,
            fronts.player2.lane1
        );
        
        // Calcular visibilidad del carril 2 (inferior)
        this.lane2Visible = this._calculateLaneVisibility(
            fronts.player1.lane2,
            fronts.player2.lane2
        );
    }
    
    /**
     * Calcula si un carril es visible basándose en la distancia entre frentes
     * @param {Object|null} front1 - Posición del frente de player1 {x, y}
     * @param {Object|null} front2 - Posición del frente de player2 {x, y}
     * @returns {boolean} True si el carril es visible (frentes cercanos)
     */
    _calculateLaneVisibility(front1, front2) {
        // Si falta algún frente, el carril no es visible
        if (!front1 || !front2) {
            return false;
        }
        
        // Calcular distancia en X entre los frentes
        const distanceX = Math.abs(front1.x - front2.x);
        
        // El carril es visible si los frentes están a menos de revealDistance
        return distanceX <= this.revealDistance;
    }
    
    /**
     * Normaliza el equipo a 'player1' o 'player2'
     * @param {string} team - Equipo ('player1', 'player2', 'ally', 'enemy')
     * @returns {string} 'player1' o 'player2'
     */
    _normalizeTeam(team) {
        if (team === 'ally') return 'player1';
        if (team === 'enemy') return 'player2';
        return team;
    }
    
    /**
     * Determina si una entidad debe ser visible para el jugador actual
     * @param {Object} entity - Entidad a verificar (nodo, vehículo, drone, etc.)
     * @returns {boolean} True si la entidad debe renderizarse
     */
    isVisible(entity) {
        if (!this.enabled) return true;
        if (!entity) return false;
        
        const myTeam = this.game?.myTeam || 'player1';
        const entityTeam = this._normalizeTeam(entity.team);
        
        // Las entidades propias siempre son visibles
        if (entityTeam === myTeam) {
            return true;
        }
        
        // Entidades sin equipo (neutrales) siempre visibles
        if (!entityTeam || (entityTeam !== 'player1' && entityTeam !== 'player2')) {
            return true;
        }
        
        // Determinar el carril de la entidad
        const lane = this.getLaneForY(entity.y);
        
        // 🆕 NUEVO: Verificar si el carril tiene visibilidad forzada (efecto de edificio)
        if (lane === 1 && this.lane1ForcedVisible) return true;
        if (lane === 2 && this.lane2ForcedVisible) return true;
        
        // Verificar visibilidad del carril correspondiente
        return lane === 1 ? this.lane1Visible : this.lane2Visible;
    }
    
    /**
     * Verifica si debe renderizarse el overlay de niebla para un carril
     * @param {number} lane - Número de carril (1 o 2)
     * @returns {boolean} True si debe mostrarse la niebla en ese carril
     */
    shouldRenderFog(lane) {
        if (!this.enabled) return false;
        
        // 🆕 NUEVO: Si el carril tiene visibilidad forzada, no mostrar niebla
        if (lane === 1 && this.lane1ForcedVisible) return false;
        if (lane === 2 && this.lane2ForcedVisible) return false;
        
        return lane === 1 ? !this.lane1Visible : !this.lane2Visible;
    }
    
    /**
     * Obtiene los límites del territorio enemigo por carril
     * Útil para renderizar el overlay de niebla
     * @param {number} lane - Número de carril (1 o 2)
     * @returns {Object} {xStart, xEnd, yStart, yEnd}
     */
    getEnemyZoneBounds(lane) {
        const myTeam = this.game?.myTeam || 'player1';
        const worldWidth = this.game?.worldWidth || 1920;
        const laneConfig = lane === 1 ? this.laneConfig.lane1 : this.laneConfig.lane2;
        
        // El centro del mapa es donde se divide el territorio
        const centerX = worldWidth / 2;
        
        // Para player1, el enemigo está a la derecha (x > centerX)
        // Para player2, el enemigo está a la izquierda (x < centerX)
        if (myTeam === 'player1') {
            return {
                xStart: centerX,
                xEnd: worldWidth,
                yStart: laneConfig.yMin,
                yEnd: laneConfig.yMax
            };
        } else {
            return {
                xStart: 0,
                xEnd: centerX,
                yStart: laneConfig.yMin,
                yEnd: laneConfig.yMax
            };
        }
    }
    
    /**
     * Obtiene información de debug del sistema
     * @returns {Object} Estado actual del sistema
     */
    getDebugInfo() {
        return {
            enabled: this.enabled,
            lane1Visible: this.lane1Visible,
            lane2Visible: this.lane2Visible,
            lane1ForcedVisible: this.lane1ForcedVisible,
            lane2ForcedVisible: this.lane2ForcedVisible,
            revealDistance: this.revealDistance,
            frontPositions: this._frontPositions
        };
    }
    
    /**
     * Activa o desactiva el sistema de niebla de guerra
     * @param {boolean} enabled - Estado deseado
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    
    /**
     * Configura la distancia de revelación
     * @param {number} distance - Nueva distancia en píxeles
     */
    setRevealDistance(distance) {
        this.revealDistance = distance;
    }
}

