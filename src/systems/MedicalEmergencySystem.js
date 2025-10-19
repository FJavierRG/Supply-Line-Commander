// ===== SISTEMA DE EMERGENCIAS MÉDICAS =====

export class MedicalEmergencySystem {
    constructor(game) {
        this.game = game;
        this.activeEmergencies = new Map(); // fronts con emergencias activas
        this.nextEmergencyCheck = 0;
        this.emergencyCheckInterval = 30000; // 20 segundos
        this.emergencyChance = 0.8; // 85% de probabilidad
        this.emergencyDuration = 20000; // 20 segundos para responder
        this.tutorialEmergency = false; // Para nivel 6
    }

    reset() {
        this.activeEmergencies.clear();
        this.nextEmergencyCheck = this.emergencyCheckInterval; // Empezar con el intervalo completo
        this.tutorialEmergency = false;
    }

    /**
     * Activar tutorial (emergencia forzada en nivel 6)
     */
    enableTutorialEmergency() {
        this.tutorialEmergency = true;
        this.nextEmergencyCheck = 5000; // 5 segundos después de empezar
        this.activeEmergencies.clear(); // Limpiar cualquier emergencia previa
    }

    /**
     * Iniciar una emergencia médica en un frente
     */
    startEmergency(front) {
        if (this.activeEmergencies.has(front.id)) {
            console.log(`⚠️ El frente #${front.id} ya tiene una emergencia activa`);
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
        
        // Reproducir sonido de man down solo para frentes aliados (sin audio para enemigos)
        if (front.type === 'front') {
            this.game.audio.playManDownSound(front.id);
        }
        
        console.log(`🚨 Emergencia médica en ${front.type} #${front.id} (tipo: ${front.type})`);
    }

    /**
     * Resolver una emergencia médica
     */
    resolveEmergency(frontId) {
        const emergency = this.activeEmergencies.get(frontId);
        if (!emergency) return false;

        emergency.resolved = true;
        this.activeEmergencies.delete(frontId);
        
        // Incrementar contador de emergencias resueltas
        this.game.matchStats.emergenciesResolved++;
        
        // Resetear flag de sonido para permitir futuras emergencias
        this.game.audio.resetManDownFlag(frontId);
        
        console.log(`✅ Emergencia médica resuelta en Frente #${frontId}`);
        return true;
    }

    /**
     * Aplicar penalización por no responder a tiempo
     */
    applyPenalty(front) {
        // Guardar consumo original antes de aumentarlo
        const originalConsumeRate = front.consumeRate;
        
        // Aumentar consumo +100% (duplicar consumo)
        front.consumeRate *= 2;
        
        // Añadir efecto visual "wounded" temporal (15 segundos)
        front.addEffect({
            type: 'wounded',
            icon: 'ui-wounded',
            tooltip: 'Heridos: +100% consumo de suministros',
            duration: 15000,
            onExpire: (affectedFront) => {
                // Al expirar, restaurar consumo normal
                affectedFront.consumeRate = originalConsumeRate;
                console.log(`✅ Efecto wounded expirado, consumo restaurado en Frente #${affectedFront.id}`);
            }
        });
        
        console.log(`⚠️ Penalización aplicada al Frente #${front.id}: consumo +100% por 15 segundos`);
    }

    /**
     * Actualizar sistema de emergencias
     */
    update(deltaTime) {
        // Sistema médico siempre activo
        if (!this.game.missionStarted) return;

        // Tutorial: pausar progreso de emergencias si está pausado
        if (this.game.state === 'tutorial' && this.game.tutorialManager && this.game.tutorialManager.simulationPaused) {
            // No actualizar el progreso de emergencias cuando está pausado
            return;
        }

        // Tutorial: forzar emergencia en nivel 6
        if (this.tutorialEmergency && this.nextEmergencyCheck > 0) {
            this.nextEmergencyCheck -= deltaTime;
            if (this.nextEmergencyCheck <= 0) {
                this.triggerRandomEmergency();
                this.tutorialEmergency = false;
            }
        }

        // Chequeo periódico de nuevas emergencias
        if (!this.tutorialEmergency) {
            this.nextEmergencyCheck -= deltaTime;
            if (this.nextEmergencyCheck <= 0) {
                this.nextEmergencyCheck = this.emergencyCheckInterval;
                
                // Probabilidad de crear emergencia
                if (Math.random() < this.emergencyChance) {
                    this.triggerRandomEmergency();
                }
            }
        }

        // Actualizar emergencias activas
        const now = Date.now();
        for (const [frontId, emergency] of this.activeEmergencies.entries()) {
            const elapsed = now - emergency.startTime;
            
            // Tiempo agotado
            if (elapsed >= emergency.duration && !emergency.penalty) {
                emergency.penalty = true;
                const front = this.game.nodes.find(b => b.id === frontId);
                if (front) {
                    this.applyPenalty(front);
                    // Incrementar contador de emergencias fallidas (solo para jugador)
                    if (front.team === this.game.myTeam) {
                        this.game.matchStats.emergenciesFailed++;
                    }
                }
                this.activeEmergencies.delete(frontId);
            }
        }
    }

    /**
     * Activar emergencia en un frente aleatorio
     * SOLO permite UNA emergencia activa a la vez
     */
    triggerRandomEmergency() {
        // Si ya hay una emergencia activa, no crear otra
        if (this.activeEmergencies.size > 0) {
            console.log('⚠️ Ya hay una emergencia activa, esperando...');
            return;
        }
        
        // En tutorial, usar nodos del tutorial
        let fronts;
        if (this.game.state === 'tutorial' && this.game.tutorialManager && this.game.tutorialManager.tutorialNodes) {
            fronts = this.game.tutorialManager.tutorialNodes.filter(b => b.type === 'front');
        } else {
            fronts = this.game.nodes.filter(b => b.type === 'front');
        }
        
        if (fronts.length === 0) return;

        // Elegir un frente aleatorio
        const randomFront = fronts[Math.floor(Math.random() * fronts.length)];
        this.startEmergency(randomFront);
    }

    /**
     * Obtener emergencia activa de un frente
     */
    getEmergency(frontId) {
        return this.activeEmergencies.get(frontId);
    }

    /**
     * Verificar si un frente tiene emergencia activa
     */
    hasEmergency(frontId) {
        return this.activeEmergencies.has(frontId);
    }

    /**
     * Obtener progreso de una emergencia (0-1)
     */
    getEmergencyProgress(frontId) {
        const emergency = this.activeEmergencies.get(frontId);
        if (!emergency) return 0;

        const elapsed = Date.now() - emergency.startTime;
        return Math.min(elapsed / emergency.duration, 1);
    }
}

