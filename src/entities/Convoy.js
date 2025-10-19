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
     * Actualiza solo la posición visual basándose en el progress (para multijugador)
     * El progress viene del servidor, este método solo calcula x,y para renderizar
     */
    updatePosition() {
        if (this.progress < 0 || this.progress > 1) return;
        
        // Calcular posición interpolada entre origen y destino
        // Cuando returning=true: va de target → originBase
        // Cuando returning=false: va de originBase → target
        const fromBase = this.returning ? this.target : this.originBase;
        const toBase = this.returning ? this.originBase : this.target;
        
        // Interpolar posición basándose en progress
        this.x = fromBase.x + (toBase.x - fromBase.x) * this.progress;
        this.y = fromBase.y + (toBase.y - fromBase.y) * this.progress;
    }
}
