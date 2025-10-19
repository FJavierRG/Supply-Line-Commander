// ===== ENTIDAD: CONVOY =====

export class Convoy {
    constructor(fromBase, toBase, vehicle, vehicleType, cargo, game = null) {
        this.x = fromBase.x;
        this.y = fromBase.y;
        this.originBase = fromBase; // Base de origen (para volver)
        this.target = toBase;
        this.vehicle = vehicle;
        this.vehicleType = vehicleType;
        this.cargo = cargo;
        this.arrived = false;
        this.returning = false; // Si está volviendo a la base de origen
        this.progress = 0; // 0-1 para sincronización con servidor
        
        // Interpolación suave para multijugador
        this.serverProgress = 0; // Progress que viene del servidor
        this.lastServerUpdate = 0; // Timestamp del último update del servidor
        this.lastServerReturning = false; // Estado returning anterior del servidor
        
        // Dead Reckoning - predicción de movimiento
        this.lastKnownProgress = 0; // Último progress confirmado por servidor
        this.totalDistance = 0; // Distancia total calculada una vez
        this.vehicleSpeed = this.getVehicleSpeed(); // Velocidad conocida del vehículo
        this.game = game; // Referencia al game para verificar Engineer Centers
    }
    
    update(dt, speedMultiplier = 1) {
        const speed = this.vehicle.speed * 50 * speedMultiplier;
        
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist < 5) {
            // Llegó al destino
            this.arrived = true;
            return true;
        } else {
            // Moverse hacia el destino
            this.x += (dx / dist) * speed * dt;
            this.y += (dy / dist) * speed * dt;
            return false;
        }
    }
    
    getAngle() {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        return Math.atan2(dy, dx);
    }
    
    /**
     * Obtiene la velocidad del vehículo (sincronizada con servidor)
     */
    getVehicleSpeed() {
        if (this.vehicleType === 'heavy_truck') {
            return 40; // Camión pesado - px/s
        } else if (this.vehicleType === 'ambulance') {
            return 60; // Ambulancia: 20% más rápida
        } else {
            return 50; // Truck normal
        }
    }
    
    /**
     * Calcula la distancia total del trayecto (se calcula una sola vez)
     */
    getTotalDistance() {
        if (this.totalDistance === 0) {
            const dx = this.target.x - this.originBase.x;
            const dy = this.target.y - this.originBase.y;
            this.totalDistance = Math.hypot(dx, dy);
        }
        return this.totalDistance;
    }
    
    /**
     * Verifica si tiene Engineer Center bonus
     */
    hasEngineerCenterBonus() {
        if (!this.game || !this.game.nodes) return false;
        
        // Buscar Engineer Centers del mismo equipo que el convoy
        const engineerCenters = this.game.nodes.filter(n => 
            n.type === 'engineerCenter' && 
            n.team === this.originBase.team && 
            n.constructed && 
            !n.isAbandoning
        );
        
        return engineerCenters.length > 0;
    }
    
    takeDamage(amount) {
        this.cargo = Math.max(0, this.cargo - amount);
    }
    
    startReturning() {
        this.returning = true;
        this.cargo = 0; // Ya entregó la carga
        this.target = this.originBase; // Volver a la base de origen
    }
    
    /**
     * Actualiza el progress desde el servidor (para multijugador)
     */
    updateServerProgress(newProgress, isReturning) {
        // Detectar cambio crítico de estado (returning cambió)
        const returningChanged = this.lastServerReturning !== isReturning;
        
        if (returningChanged) {
            console.log(`🔄 Convoy ${this.id} cambió estado: returning ${this.lastServerReturning} → ${isReturning}, progress ${this.serverProgress} → ${newProgress}`);
            // Cambio crítico: actualizar inmediatamente, sin interpolación
            
            // PRIMERO: Actualizar el estado returning
            this.returning = isReturning;
            
            // SEGUNDO: Actualizar progress (esto es crítico para posición correcta)
            this.progress = newProgress;
            this.serverProgress = newProgress;
            
            // TERCERO: Actualizar posición inmediatamente para evitar "salto" visual
            this.updatePosition(0);
        } else {
            // Estado normal: usar interpolación suave
            this.serverProgress = newProgress;
            this.returning = isReturning;
        }
        
        // Actualizar datos para Dead Reckoning
        this.lastKnownProgress = newProgress;
        this.lastServerReturning = isReturning;
        this.lastServerUpdate = Date.now();
    }
    
    /**
     * Actualiza posición visual con Dead Reckoning + interpolación suave (para multijugador)
     * Predice movimiento cuando no hay updates recientes del servidor
     */
    updatePosition(dt = 0.016) {
        if (this.serverProgress < 0 || this.serverProgress > 1) return;
        
        // Calcular tiempo desde último update del servidor
        const timeSinceUpdate = (Date.now() - this.lastServerUpdate) / 1000;
        
        // DEAD RECKONING: Si no hay update reciente (>50ms), predecir movimiento
        if (timeSinceUpdate > 0.05 && this.totalDistance > 0) {
            // Calcular velocidad con bonus de Engineer Center si aplica
            let vehicleSpeed = this.getVehicleSpeed();
            if (this.hasEngineerCenterBonus()) {
                vehicleSpeed *= 1.5; // +50% velocidad
            }
            
            // Progress por segundo = velocidad / distancia total
            const progressPerSecond = vehicleSpeed / this.getTotalDistance();
            
            // PREDICCIÓN: Calcular dónde debería estar ahora
            const predictedProgress = this.lastKnownProgress + (progressPerSecond * timeSinceUpdate);
            
            // Limitar a rango válido (0-1)
            this.progress = Math.max(0, Math.min(1.0, predictedProgress));
            
            // Dead Reckoning activo: log ocasional para debug (cada 1000ms máximo)
            if (!this._lastDeadReckoningLog || Date.now() - this._lastDeadReckoningLog > 1000) {
                console.log(`🚛 Dead Reckoning: ${this.id} predijo progress ${predictedProgress.toFixed(3)} (${(timeSinceUpdate*1000).toFixed(0)}ms sin update)`);
                this._lastDeadReckoningLog = Date.now();
            }
        } else {
            // INTERPOLACIÓN NORMAL: Si hay updates frecuentes, usar interpolación suave
            const targetProgress = this.serverProgress;
            const currentProgress = this.progress;
            const difference = targetProgress - currentProgress;
            
            if (Math.abs(difference) < 0.001) {
                this.progress = targetProgress;
            } else {
                // Interpolación suave hacia el target (factor de 8 = ~125ms para llegar al target)
                const interpolationSpeed = 8.0;
                this.progress += difference * interpolationSpeed * dt;
            }
        }
        
        // Calcular posición final entre origen y destino
        this.updateVisualPosition();
    }
    
    /**
     * Actualiza la posición visual basada en el progress actual
     */
    updateVisualPosition() {
        const fromBase = this.returning ? this.target : this.originBase;
        const toBase = this.returning ? this.originBase : this.target;
        
        // Calcular posición basada en progress
        this.x = fromBase.x + (toBase.x - fromBase.x) * this.progress;
        this.y = fromBase.y + (toBase.y - fromBase.y) * this.progress;
    }
}
