// ===== ENTIDAD: CONVOY =====

export class Convoy {
    constructor(fromBase, toBase, vehicle, vehicleType, cargo) {
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
        
        this.lastServerReturning = isReturning;
        this.lastServerUpdate = Date.now();
    }
    
    /**
     * Actualiza solo la posición visual con interpolación suave (para multijugador)
     * El progress viene del servidor, este método interpola suavemente entre frames
     */
    updatePosition(dt = 0.016) {
        if (this.serverProgress < 0 || this.serverProgress > 1) return;
        
        // Interpolación suave: si hay diferencia entre progress actual y target, interpolar gradualmente
        const targetProgress = this.serverProgress;
        const currentProgress = this.progress;
        const difference = targetProgress - currentProgress;
        
        // Si la diferencia es muy pequeña, usar directamente el target
        if (Math.abs(difference) < 0.001) {
            this.progress = targetProgress;
        } else {
            // Interpolación suave hacia el target (factor de 8 = ~125ms para llegar al target)
            const interpolationSpeed = 8.0; // Ajustable según preferencia
            this.progress += difference * interpolationSpeed * dt;
        }
        
        // Calcular posición interpolada entre origen y destino
        // Cuando returning=true: va de target → originBase
        // Cuando returning=false: va de originBase → target
        const fromBase = this.returning ? this.target : this.originBase;
        const toBase = this.returning ? this.originBase : this.target;
        
        // Interpolar posición basándose en progress suavizado
        this.x = fromBase.x + (toBase.x - fromBase.x) * this.progress;
        this.y = fromBase.y + (toBase.y - fromBase.y) * this.progress;
    }
}
