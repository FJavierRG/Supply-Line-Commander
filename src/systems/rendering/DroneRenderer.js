// ===== RENDERIZADO DE DRONES =====
// Maneja el renderizado de drones, camera drones y sus previews

/**
 * DroneRenderer - Renderiza drones y camera drones
 * Responsabilidades:
 * - Renderizado de drones de combate
 * - Renderizado de camera drones volando
 * - Renderizado de áreas de detección de camera drones
 * - Renderizado de previews de drones (aliados y enemigos)
 */
export class DroneRenderer {
    constructor(ctx, assetManager = null, game = null) {
        this.ctx = ctx;
        this.assetManager = assetManager;
        this.game = game;
    }
    
    /**
     * Renderiza un drone de combate
     * @param {Object} drone - Drone a renderizar
     */
    renderDrone(drone) {
        const droneSprite = this.assetManager.getSprite('vehicle-drone');
        const size = 50 * 1.15; // Tamaño del sprite del dron +15%
        
        if (droneSprite) {
            // Dibujar sprite del dron con sombra
            // Drones enemigos: sombra roja, aliados: naranja
            this.ctx.shadowColor = drone.isEnemy ? '#ff0000' : '#ff6600';
            this.ctx.shadowBlur = 15;
            
            this.ctx.save();
            this.ctx.translate(drone.x, drone.y);
            
            // Determinar dirección basada en movimiento hacia el objetivo
            let shouldFlip = false;
            if (drone.target) {
                const dx = drone.target.x - drone.x;
                shouldFlip = dx < 0; // Si va hacia la izquierda, flip
            } else {
                // Fallback: voltear drones enemigos horizontalmente
                shouldFlip = drone.isEnemy;
            }
            
            // COMPENSAR MIRROR VIEW: Si la vista está mirroreada, NO invertir el flip
            // porque el mundo ya está volteado horizontalmente
            // if (this.mirrorViewApplied) {
            //     shouldFlip = !shouldFlip;
            // }
            
            if (shouldFlip) {
                this.ctx.scale(-1, 1);
            }
            
            this.ctx.drawImage(
                droneSprite,
                -size/2,
                -size/2,
                size,
                size
            );
            
            this.ctx.restore();
            this.ctx.shadowBlur = 0;
        } else {
            // Fallback: círculo naranja/rojo
            this.ctx.shadowColor = drone.isEnemy ? '#ff0000' : '#ff6600';
            this.ctx.shadowBlur = 25;
            this.ctx.fillStyle = drone.isEnemy ? '#ff0000' : '#ff6600';
            this.ctx.beginPath();
            this.ctx.arc(drone.x, drone.y, 12, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            
            // Icono de bomba
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText('💣', drone.x, drone.y);
        }
        
        // Línea hacia el objetivo (roja para enemigos, naranja para aliados)
        if (drone.target) {
            this.ctx.strokeStyle = drone.isEnemy ? 'rgba(255, 0, 0, 0.4)' : 'rgba(255, 102, 0, 0.4)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([6, 6]);
            this.ctx.beginPath();
            this.ctx.moveTo(drone.x, drone.y);
            this.ctx.lineTo(drone.target.x, drone.target.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }
    
    /**
     * Renderiza un camera drone volando hacia su objetivo
     * @param {Object} cameraDrone - Camera drone a renderizar
     */
    renderCameraDroneFlying(cameraDrone) {
        const cameraDroneSprite = this.assetManager.getSprite('camera-drone');
        // Usar el mismo cálculo de tamaño que otros nodos (basado en radius)
        const size = (cameraDrone.radius || 25) * 2 * 1.875; // Mismo cálculo que renderNode
        
        if (cameraDroneSprite) {
            // Dibujar sprite del camera drone con sombra azul
            this.ctx.shadowColor = '#3498db';
            this.ctx.shadowBlur = 15;
            
            this.ctx.save();
            this.ctx.translate(cameraDrone.x, cameraDrone.y);
            
            // Determinar dirección basada en movimiento hacia el objetivo
            let shouldFlip = false;
            if (cameraDrone.targetX !== undefined && cameraDrone.targetY !== undefined) {
                const dx = cameraDrone.targetX - cameraDrone.x;
                shouldFlip = dx < 0; // Si va hacia la izquierda, flip
            }
            
            if (shouldFlip) {
                this.ctx.scale(-1, 1);
            }
            
            this.ctx.drawImage(
                cameraDroneSprite,
                -size/2,
                -size/2,
                size,
                size
            );
            
            this.ctx.restore();
            this.ctx.shadowBlur = 0;
        } else {
            // Fallback: círculo azul
            this.ctx.shadowColor = '#3498db';
            this.ctx.shadowBlur = 25;
            this.ctx.fillStyle = '#3498db';
            this.ctx.beginPath();
            this.ctx.arc(cameraDrone.x, cameraDrone.y, 12, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            
            // Icono de cámara
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText('📹', cameraDrone.x, cameraDrone.y);
        }
        
        // Línea hacia el objetivo (azul)
        if (cameraDrone.targetX !== undefined && cameraDrone.targetY !== undefined) {
            this.ctx.strokeStyle = 'rgba(52, 152, 219, 0.4)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([6, 6]);
            this.ctx.beginPath();
            this.ctx.moveTo(cameraDrone.x, cameraDrone.y);
            this.ctx.lineTo(cameraDrone.targetX, cameraDrone.targetY);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }
    
    /**
     * Renderiza el área de detección del camera drone
     * @param {Object} cameraDrone - Camera drone desplegado
     */
    renderCameraDroneDetectionArea(cameraDrone) {
        if (!cameraDrone.deployed || !cameraDrone.detectionRadius) return;
        
        // Círculo de área de detección
        this.ctx.strokeStyle = 'rgba(52, 152, 219, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 5]);
        this.ctx.beginPath();
        this.ctx.arc(cameraDrone.x, cameraDrone.y, cameraDrone.detectionRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    /**
     * Renderiza preview de drone (aliado)
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @param {Object} hoveredBase - Base sobre la que se hace hover
     */
    renderDronePreview(x, y, hoveredBase) {
        const radius = 30;
        
        // 🎯 NUEVO: Usar configuración del servidor para validar objetivos
        let validTarget = false;
        if (hoveredBase && hoveredBase.team !== this.game?.myTeam) {
            // Obtener validTargets desde la configuración del servidor
            const validTargets = this.game?.serverBuildingConfig?.actions?.droneLaunch?.validTargets || 
                                 ['fob', 'nuclearPlant', 'antiDrone', 'campaignHospital', 'droneLauncher', 'truckFactory', 'engineerCenter', 'intelRadio', 'intelCenter', 'aerialBase'];
            validTarget = validTargets.includes(hoveredBase.type) && 
                         hoveredBase.constructed && 
                         !hoveredBase.isConstructing && 
                         !hoveredBase.isAbandoning;
        }
        
        // Círculo vacío con borde blanco punteado
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([8, 8]);
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Si NO es un objetivo válido, mostrar X roja
        if (!validTarget) {
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 4;
            const crossSize = 15;
            
            // X roja
            this.ctx.beginPath();
            this.ctx.moveTo(x - crossSize, y - crossSize);
            this.ctx.lineTo(x + crossSize, y + crossSize);
            this.ctx.moveTo(x + crossSize, y - crossSize);
            this.ctx.lineTo(x - crossSize, y + crossSize);
            this.ctx.stroke();
        }
    }
    
    /**
     * Renderiza preview de drone enemigo
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @param {Object} hoveredBase - Base sobre la que se hace hover
     * @param {Object} hoveredBuilding - Edificio sobre el que se hace hover
     */
    renderEnemyDronePreview(x, y, hoveredBase, hoveredBuilding) {
        const radius = 30;
        
        // Verificar si el objetivo es válido (cualquier base o edificio aliado)
        const validTarget = (hoveredBase && !hoveredBase.type.includes('enemy')) || 
                           (hoveredBuilding && !hoveredBuilding.isEnemy);
        
        // Círculo rojo punteado
        this.ctx.strokeStyle = validTarget ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 0, 0, 0.4)';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([8, 8]);
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Texto de ayuda
        this.ctx.fillStyle = validTarget ? '#ff0000' : '#ffffff';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(validTarget ? 'ATACAR' : 'Selecciona objetivo', x, y - radius - 15);
    }
}

