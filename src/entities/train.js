// ===== ENTIDAD: TREN - SOLO VISUAL (SERVIDOR AUTORITATIVO) =====
// El cliente SOLO renderiza la posición basándose en datos del servidor

export class Train {
    constructor(fromBase, toBase, game = null) {
        this.id = `train_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        this.x = fromBase.x;
        this.y = fromBase.y;
        this.fromBase = fromBase; // Estación de origen (NUNCA cambia)
        this.toBase = toBase; // FOB destino (NUNCA cambia)
        
        this.arrived = false;
        this.returning = false; // Si está volviendo
        this.progress = 0; // 0 a 1 (visual - interpolado)
        this.targetProgress = 0; // Progress objetivo del servidor (autoritativo)
        this.isMoving = true; // Si el tren está en movimiento
        
        this.game = game; // Referencia al game
    }
    
    /**
     * Actualiza el movimiento del tren - INTERPOLACIÓN SUAVE PROFESIONAL
     * El cliente interpola progresivamente hacia el target del servidor
     */
    update(dt) {
        if (!this.isMoving || this.progress >= 1.0) {
            return false;
        }
        
        // Interpolar hacia el target del servidor solo si hay diferencia
        if (Math.abs(this.progress - this.targetProgress) > 0.001) {
            const diff = this.targetProgress - this.progress;
            const absDiff = Math.abs(diff);
            
            // Velocidad adaptativa: más rápido para diferencias grandes
            let lerpSpeed;
            if (absDiff > 0.1) {
                lerpSpeed = 15.0;
            } else if (absDiff > 0.05) {
                lerpSpeed = 8.0;
            } else {
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
     * Actualiza el progress desde el servidor - OBJETIVO AUTORITATIVO
     */
    updateServerProgress(newProgress, isReturning) {
        // Si returning cambió de estado, resetear el progress inmediatamente
        if (this.returning !== isReturning) {
            const oldReturning = this.returning;
            const oldProgress = this.progress;
            
            this.returning = isReturning;
            
            if ((oldReturning === false && oldProgress >= 0.99) || 
                (oldReturning === true && oldProgress >= 0.99)) {
                this.progress = 0;
            } else {
                this.progress = 1 - this.progress;
            }
        }
        
        // Actualizar TARGET (no el progress actual)
        this.targetProgress = newProgress;
        
        // Actualizar posición visual inmediatamente
        this.updateVisualPosition();
    }
    
    /**
     * Actualiza la posición visual
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

