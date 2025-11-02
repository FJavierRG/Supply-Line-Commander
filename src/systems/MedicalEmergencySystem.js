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
        
        // Chequeo periódico de hospitales para emergencias existentes
        this.nextHospitalCheck = 2; // 2 segundos hasta primer chequeo
        this.hospitalCheckInterval = 2; // Verificar cada 2 segundos
    }

    reset() {
        this.activeEmergencies.clear();
        this.nextEmergencyCheck = this.emergencyCheckInterval; // Empezar con el intervalo completo
        this.nextHospitalCheck = this.hospitalCheckInterval;
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
        
        // NOTIFICAR HOSPITALES AUTOMÁTICAMENTE (CLIENTE)
        this.notifyNearbyHospitals(front);
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
     * ⚠️ LEGACY REMOVED: El servidor maneja toda la lógica de emergencias médicas.
     * El cliente solo muestra las emergencias que vienen del servidor.
     */
    update(deltaTime) {
        // El servidor autoritativo maneja toda la creación y gestión de emergencias.
        // El cliente solo muestra las emergencias que vienen del estado del servidor.
        // TODO: Mantener solo la lógica de renderizado/progreso visual si es necesaria.
        
        // Actualizar progreso visual de emergencias activas (solo para UI)
        const now = Date.now();
        for (const [frontId, emergency] of this.activeEmergencies.entries()) {
            const elapsed = now - emergency.startTime;
            
            // ⚠️ LEGACY REMOVED: NO aplicar penalizaciones aquí - el servidor maneja esto
            // Solo actualizar para mostrar progreso visual en UI
            // El servidor enviará actualización cuando expire o se resuelva
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
    
    /**
     * Notifica a hospitales cercanos sobre una nueva emergencia médica (CLIENTE)
     */
    notifyNearbyHospitals(front) {
        const nearbyHospitals = this.game.nodes.filter(node => 
            node.type === 'campaignHospital' &&
            node.team === front.team &&
            node.constructed &&
            !node.isAbandoning &&
            node.availableVehicles > 0
        );
        
        for (const hospital of nearbyHospitals) {
            const dx = front.x - hospital.x;
            const dy = front.y - hospital.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const hospitalRange = hospital.actionRange || 260; // Usar rango del hospital
            
            if (distance <= hospitalRange) {
                this.triggerHospitalResponse(hospital, front);
            }
        }
    }
    
    /**
     * Hace que un hospital responda automáticamente a una emergencia (CLIENTE)
     */
    triggerHospitalResponse(hospital, front) {
        // Cooldown para evitar spam (2 segundos)
        const now = Date.now();
        if (hospital.lastAutoResponse && (now - hospital.lastAutoResponse) < 2000) {
            return; // Cooldown activo
        }
        
        // Verificar que siga teniendo vehículo disponible
        if (hospital.availableVehicles <= 0) {
            return;
        }
        
        // Verificar que la emergencia siga activa
        if (!this.activeEmergencies.has(front.id)) {
            return;
        }
        
        // Usar el sistema de convoyes del cliente
        if (this.game.convoyManager) {
            this.game.convoyManager.createMedicalRoute(hospital, front);
            hospital.lastAutoResponse = now;
        }
    }
    
    /**
     * Chequea todos los hospitales construidos para ver si hay emergencias activas en su rango (CLIENTE)
     */
    checkHospitalsForActiveEmergencies() {
        // Solo si hay emergencias activas
        if (this.activeEmergencies.size === 0) {
            return;
        }
        
        const hospitals = this.game.nodes.filter(node => 
            node.type === 'campaignHospital' &&
            node.constructed &&
            !node.isAbandoning &&
            node.availableVehicles > 0
        );
        
        // Para cada emergencia activa, buscar hospitales en rango
        for (const [frontId, emergency] of this.activeEmergencies.entries()) {
            if (emergency.resolved) continue; // Ya resuelta
            
            const front = this.game.nodes.find(n => n.id === frontId);
            if (!front) continue;
            
            // Buscar hospitales del mismo equipo en rango
            const nearbyHospitals = hospitals.filter(hospital => {
                if (hospital.team !== front.team) return false;
                
                const dx = front.x - hospital.x;
                const dy = front.y - hospital.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const hospitalRange = hospital.actionRange || 260;
                
                return distance <= hospitalRange;
            });
            
            // Notificar a hospitales cercanos (con cooldown)
            for (const hospital of nearbyHospitals) {
                const now = Date.now();
                if (!hospital.lastAutoResponse || (now - hospital.lastAutoResponse) >= 2000) {
                    this.triggerHospitalResponse(hospital, front);
                }
            }
        }
    }
    
    /**
     * Notifica inmediatamente a un hospital recién construido sobre emergencias activas (CLIENTE)
     */
    notifyNewHospital(hospital) {
        if (!hospital || hospital.type !== 'campaignHospital') return;
        if (!hospital.constructed || hospital.isAbandoning) return;
        
        // Buscar emergencias activas en rango
        for (const [frontId, emergency] of this.activeEmergencies.entries()) {
            if (emergency.resolved) continue;
            
            const front = this.game.nodes.find(n => n.id === frontId);
            if (!front || front.team !== hospital.team) continue;
            
            const dx = front.x - hospital.x;
            const dy = front.y - hospital.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const hospitalRange = hospital.actionRange || 260;
            
            if (distance <= hospitalRange) {
                this.triggerHospitalResponse(hospital, front);
                break; // Solo responder a la primera emergencia encontrada
            }
        }
    }
}

