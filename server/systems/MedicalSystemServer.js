// ===== SISTEMA DE EMERGENCIAS MÉDICAS (SERVIDOR) =====
// Este sistema se ejecuta SOLO en el servidor
// El cliente solo renderiza las emergencias que el servidor envía

export class MedicalSystemServer {
    constructor(gameState) {
        this.gameState = gameState;
        this.activeEmergencies = new Map(); // Map<frontId, emergency>
        this.nextEmergencyCheck = 30000; // 30 segundos hasta primera emergencia
        this.emergencyCheckInterval = 30000; // Verificar cada 30 segundos
        this.emergencyChance = 0.8; // 80% de probabilidad
        this.emergencyDuration = 20000; // 20 segundos para responder
        this.rngSeed = Date.now(); // Seed para RNG sincronizada
    }

    reset() {
        this.activeEmergencies.clear();
        this.nextEmergencyCheck = this.emergencyCheckInterval;
        this.rngSeed = Date.now();
    }

    /**
     * Actualizar sistema de emergencias
     * @param {number} dt - Delta time en segundos
     */
    update(dt) {
        const deltaTimeMs = dt * 1000; // Convertir a milisegundos

        // Chequeo periódico de nuevas emergencias
        this.nextEmergencyCheck -= deltaTimeMs;
        
        if (this.nextEmergencyCheck <= 0) {
            this.nextEmergencyCheck = this.emergencyCheckInterval;
            
            // Probabilidad de crear emergencia
            if (this.seededRandom() < this.emergencyChance) {
                this.triggerRandomEmergency();
            }
        }

        // Actualizar emergencias activas
        const now = Date.now();
        for (const [frontId, emergency] of this.activeEmergencies.entries()) {
            const elapsed = now - emergency.startTime;
            
            // Tiempo agotado
            if (elapsed >= emergency.duration && !emergency.penalty) {
                emergency.penalty = true;
                const front = this.gameState.nodes.find(n => n.id === frontId);
                if (front) {
                    this.applyPenalty(front);
                }
                this.activeEmergencies.delete(frontId);
                
                console.log(`⚠️ Emergencia médica expirada en frente ${frontId} - Penalización aplicada`);
            }
        }
    }

    /**
     * RNG sincronizada entre servidor y clientes (usando seed)
     */
    seededRandom() {
        // Simple LCG (Linear Congruential Generator)
        this.rngSeed = (this.rngSeed * 9301 + 49297) % 233280;
        return this.rngSeed / 233280;
    }

    /**
     * Activar emergencia en un frente aleatorio
     */
    triggerRandomEmergency() {
        // Si ya hay una emergencia activa, no crear otra
        if (this.activeEmergencies.size > 0) {
            console.log('⚠️ Ya hay una emergencia activa, esperando...');
            return;
        }

        // Obtener todos los frentes (ambos equipos)
        const fronts = this.gameState.nodes.filter(n => n.type === 'front');
        
        if (fronts.length === 0) return;

        // Elegir un frente aleatorio
        const randomIndex = Math.floor(this.seededRandom() * fronts.length);
        const randomFront = fronts[randomIndex];
        
        this.startEmergency(randomFront);
    }

    /**
     * Iniciar emergencia médica en un frente
     */
    startEmergency(front) {
        if (this.activeEmergencies.has(front.id)) {
            console.log(`⚠️ El frente ${front.id} ya tiene una emergencia activa`);
            return;
        }

        const emergency = {
            frontId: front.id,
            startTime: Date.now(),
            duration: this.emergencyDuration,
            resolved: false,
            penalty: false
        };

        this.activeEmergencies.set(front.id, emergency);
        
        // Evento de sonido: man down
        this.gameState.addSoundEvent('man_down', { frontId: front.id });
        
        console.log(`🚨 Emergencia médica iniciada en frente ${front.id} (${front.team})`);
    }

    /**
     * Resolver emergencia médica (ambulancia llegó)
     */
    resolveEmergency(frontId) {
        const emergency = this.activeEmergencies.get(frontId);
        if (!emergency) return false;

        emergency.resolved = true;
        this.activeEmergencies.delete(frontId);
        
        console.log(`✅ Emergencia médica resuelta en frente ${frontId}`);
        return true;
    }

    /**
     * Aplicar penalización por no responder a tiempo
     */
    applyPenalty(front) {
        // Guardar consumo original
        const originalConsumeRate = front.consumeRate || 1.6;
        
        // Duplicar consumo (+100%)
        front.consumeRate = originalConsumeRate * 2;
        
        // Añadir efecto "wounded" (15 segundos)
        if (!front.effects) front.effects = [];
        
        front.effects.push({
            type: 'wounded',
            icon: 'ui-wounded',
            tooltip: 'Heridos: +100% consumo de suministros',
            startTime: Date.now(),
            duration: 15000,
            expiresAt: Date.now() + 15000,
            originalConsumeRate
        });
        
        // Programar expiración del efecto
        setTimeout(() => {
            front.consumeRate = originalConsumeRate;
            if (front.effects) {
                front.effects = front.effects.filter(e => e.type !== 'wounded' || e.startTime !== front.effects[0].startTime);
            }
            console.log(`✅ Efecto wounded expirado en frente ${front.id}`);
        }, 15000);
        
        console.log(`⚠️ Penalización aplicada al frente ${front.id}: consumo x2 por 15 segundos`);
    }

    /**
     * Obtener todas las emergencias activas (para sincronizar con clientes)
     */
    getEmergencies() {
        const emergencies = [];
        const now = Date.now();
        
        for (const [frontId, emergency] of this.activeEmergencies.entries()) {
            const elapsed = now - emergency.startTime;
            const timeLeft = Math.max(0, emergency.duration - elapsed);
            
            emergencies.push({
                frontId,
                timeLeft,
                resolved: emergency.resolved
            });
        }
        
        return emergencies;
    }
}

