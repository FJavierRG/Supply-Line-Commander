// ===== ENTIDAD: CONVOY - SOLO VISUAL (SERVIDOR AUTORITATIVO) =====
// El cliente SOLO renderiza la posición basándose en datos del servidor

export class Convoy {
    constructor(fromBase, toBase, vehicle, vehicleType, cargo, game = null) {
        this.id = `convoy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        this.x = fromBase.x;
        this.y = fromBase.y;
        this.fromBase = fromBase; // Base de origen (NUNCA cambia)
        this.toBase = toBase; // Destino (NUNCA cambia)
        
        this.vehicle = vehicle;
        this.vehicleType = vehicleType;
        this.cargo = cargo;
        this.arrived = false;
        this.returning = false; // Si está volviendo (se renderiza en gris - dato del servidor)
        this.progress = 0; // 0 a 1 (visual - interpolado)
        this.targetProgress = 0; // Progress objetivo del servidor (autoritativo)
        this.isMoving = true; // Si el convoy está en movimiento (predicción cliente)
        
        this.game = game; // Referencia al game
    }
    
    /**
     * Actualiza el movimiento del convoy - INTERPOLACIÓN SUAVE PROFESIONAL
     * El cliente interpola progresivamente hacia el target del servidor
     */
    update(dt, speedMultiplier = 1) {
        if (!this.isMoving || this.progress >= 1.0) {
            return false;
        }
        
        // Interpolar hacia el target del servidor solo si hay diferencia
        if (Math.abs(this.progress - this.targetProgress) > 0.001) {
            // Algoritmo de interpolación exponencial con compensación de latencia
            // Más rápido cuando hay mucha diferencia (catch-up suave)
            // Más lento cuando está cerca (movimiento suave)
            
            const diff = this.targetProgress - this.progress;
            const absDiff = Math.abs(diff);
            
            // Velocidad adaptativa: más rápido para diferencias grandes
            let lerpSpeed;
            if (absDiff > 0.1) {
                // Gran diferencia: interpolar rápidamente para alcanzar
                lerpSpeed = 15.0;
            } else if (absDiff > 0.05) {
                // Diferencia media: velocidad normal
                lerpSpeed = 8.0;
            } else {
                // Diferencia pequeña: muy suave
                lerpSpeed = 5.0;
            }
            
            // Aplicar interpolación con límite para evitar overshooting
            this.progress += diff * Math.min(lerpSpeed * dt, 1.0);
            
            // Snap si la diferencia es muy pequeña
            if (absDiff < 0.001) {
                this.progress = this.targetProgress;
            }
        }
        
        // Actualizar posición visual basada en el progress interpolado
        this.updateVisualPosition();
        
        return false; // El servidor decide cuándo llegó
    }
    
    /**
     * Obtiene el ángulo de dirección
     */
    getAngle() {
        const targetX = this.returning ? this.fromBase.x : this.toBase.x;
        const targetY = this.returning ? this.fromBase.y : this.toBase.y;
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        return Math.atan2(dy, dx);
    }
    
    /**
     * Obtiene la distancia total del viaje
     */
    getTotalDistance() {
        const dx = this.toBase.x - this.fromBase.x;
        const dy = this.toBase.y - this.fromBase.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Actualiza el progress desde el servidor - OBJETIVO AUTORITATIVO
     */
    updateServerProgress(newProgress, isReturning) {
        // CRÍTICO: Si returning cambió de estado, resetear el progress inmediatamente
        // para evitar saltos visuales
        if (this.returning !== isReturning) {
            // Guardar la posición visual actual antes de cambiar returning
            const oldReturning = this.returning;
            const oldProgress = this.progress;
            
            // Actualizar returning primero
            this.returning = isReturning;
            
            // Si cambiaramos returning, necesitamos ajustar progress para mantener
            // la posición visual constante
            // Cuando returning=false y progress=1.0 (destino), al cambiar a returning=true,
            // el progress debe ser 0.0 (empezando en destino, ahora es el origen del retorno)
            if ((oldReturning === false && oldProgress >= 0.99) || 
                (oldReturning === true && oldProgress >= 0.99)) {
                // Estábamos casi en el extremo, resetear a 0
                this.progress = 0;
            } else {
                // Interpolar: si estaba en progress=0.8 yendo, y ahora vuelve:
                // el nuevo progress debe ser 1-0.8 = 0.2 para mantener la posición
                this.progress = 1 - this.progress;
            }
        }
        
        // Actualizar TARGET (no el progress actual)
        this.targetProgress = newProgress;
        
        // Actualizar posición visual inmediatamente después de cambiar returning
        this.updateVisualPosition();
    }
    
    /**
     * Actualiza la posición visual - SIMPLE Y DIRECTO
     */
    updateVisualPosition() {
        if (this.returning) {
            // Regresando: de toBase → fromBase
            this.x = this.toBase.x + (this.fromBase.x - this.toBase.x) * this.progress;
            this.y = this.toBase.y + (this.fromBase.y - this.toBase.y) * this.progress;
        } else {
            // Yendo: de fromBase → toBase
            this.x = this.fromBase.x + (this.toBase.x - this.fromBase.x) * this.progress;
            this.y = this.fromBase.y + (this.toBase.y - this.fromBase.y) * this.progress;
        }
    }
}