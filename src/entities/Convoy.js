// ===== ENTIDAD: CONVOY =====

export class Convoy {
    constructor(fromBase, toBase, vehicle, vehicleType, cargo, game = null) {
        // 🆕 NUEVO: ID único para el convoy
        this.id = `convoy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
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
        
        // Sistema de fobSabotage (nuevo)
        this.sabotageOrigin = false;
        this.sabotageSpeedPenalty = false;
        this.firstSabotageUpdate = false;
        
        // Sistema de fobSabotage (legacy - mantener compatibilidad)
        this.harassedOrigin = false;
        this.harassedSpeedPenalty = false;
        this.firstHarassedUpdate = false;
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
        // NO cambiar target aquí - se maneja en updateVisualPosition()
    }
    
    /**
     * Actualiza el progress desde el servidor (para multijugador)
     * DEAD RECKONING PURO: Solo sincroniza en cambio de estado crítico
     */
    updateServerProgress(newProgress, isReturning) {
        // Detectar cambio crítico de estado (returning cambió)
        const returningChanged = this.lastServerReturning !== isReturning;
        
        if (returningChanged) {
            // CRÍTICO: Actualizar estado returning
            this.returning = isReturning;
            
            if (isReturning && !this.lastServerReturning) {
                // Cambió de ida a vuelta: El servidor resetea progress=0, pero mantenemos continuidad
                // NO cambiar this.progress - mantener donde está visualmente (≈1.0)
                this.lastKnownProgress = 0; // Reset para Dead Reckoning del viaje de vuelta
            } else if (!isReturning && this.lastServerReturning) {
                // Cambió de vuelta a ida (nuevo convoy): usar server progress
                this.progress = newProgress;
                this.lastKnownProgress = newProgress;
            }
            
        } else {
            // Estado normal: Solo actualizar referencia del servidor para Dead Reckoning
            // No alteramos this.progress - lo maneja la predicción pura
            this.lastKnownProgress = newProgress;
        }
        
        // Actualizar datos para Dead Reckoning
        this.lastServerReturning = isReturning;
        this.lastServerUpdate = Date.now();
        this.serverProgress = newProgress; // Referencia para validación
    }
    
    /**
     * DEAD RECKONING PURO: Predice movimiento continuo sin interpolación del servidor
     * Solo sincroniza cuando hay cambio de estado (returning)
     */
    updatePosition(dt = 0.016) {
        if (!this.totalDistance || this.totalDistance <= 0) return;
        
        // Calcular tiempo desde último update del servidor
        const timeSinceUpdate = (Date.now() - this.lastServerUpdate) / 1000;
        
        // DEAD RECKONING PURO: Siempre predicir movimiento basado en velocidad conocida
        let vehicleSpeed = this.getVehicleSpeed();
        if (this.hasEngineerCenterBonus()) {
            vehicleSpeed *= 1.5; // +50% velocidad
        }
        
        // Progress por segundo = velocidad / distancia total
        const progressPerSecond = vehicleSpeed / this.getTotalDistance();
        
        // PREDICCIÓN: Calcular dónde debería estar ahora basado en último estado conocido
        let predictedProgress;
        
        // Si acabamos de cambiar a returning=true, mantener continuidad visual
        if (this.returning && this.lastKnownProgress === 0 && this.progress > 0.9) {
            // Estamos iniciando la vuelta desde el destino, continuar desde donde está visualmente
            predictedProgress = this.progress - (progressPerSecond * timeSinceUpdate);
        } else {
            // Predicción normal desde último estado conocido del servidor
            predictedProgress = this.lastKnownProgress + (progressPerSecond * timeSinceUpdate);
        }
        
        // Aplicar progress predicho continuamente
        this.progress = Math.max(0, Math.min(1.0, predictedProgress));
        
        // Corrección mínima solo si el servidor está muy desincronizado
        const serverDifference = Math.abs(this.serverProgress - predictedProgress);
        if (timeSinceUpdate < 0.1 && serverDifference > 0.1) {
            // Corrección muy suave solo para grandes discrepancias
            const correctionFactor = 0.05; // Corrección muy sutil
            this.progress += (this.serverProgress - this.progress) * correctionFactor;
        }
        
        // Calcular posición visual final
        this.updateVisualPosition();
    }
    
    /**
     * Actualiza la posición visual basada en el progress actual
     */
    updateVisualPosition() {
        let fromBase, toBase;
        
        if (this.returning) {
            // Volviendo: desde el destino original hacia la base de origen
            fromBase = this.target;  // Destino original (donde llegó)
            toBase = this.originBase; // Base de origen (donde debe volver)
        } else {
            // Yendo: desde la base de origen hacia el target
            fromBase = this.originBase;
            toBase = this.target;
        }
        
        // Calcular posición basada en progress
        this.x = fromBase.x + (toBase.x - fromBase.x) * this.progress;
        this.y = fromBase.y + (toBase.y - fromBase.y) * this.progress;
    }
}
