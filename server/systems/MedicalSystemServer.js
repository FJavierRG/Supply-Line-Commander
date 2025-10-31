// ===== SISTEMA DE EMERGENCIAS MÉDICAS (SERVIDOR) =====
// Este sistema se ejecuta SOLO en el servidor
// El cliente solo renderiza las emergencias que el servidor envía

import { SERVER_NODE_CONFIG } from '../config/serverNodes.js';

export class MedicalSystemServer {
    constructor(gameState) {
        this.gameState = gameState;
        this.activeEmergencies = new Map(); // Map<frontId, emergency>
        this.nextEmergencyCheck = 30000; // 30 segundos hasta primera emergencia
        this.emergencyCheckInterval = 30000; // Verificar cada 30 segundos
        this.emergencyChance = 0.8; // 80% de probabilidad
        this.emergencyDuration = 20000; // 20 segundos para responder
        this.rngSeed = Date.now(); // Seed para RNG sincronizada
        
        // Chequeo periódico de hospitales para emergencias existentes
        this.nextHospitalCheck = 2000; // 2 segundos hasta primer chequeo
        this.hospitalCheckInterval = 2000; // Verificar cada 2 segundos
    }

    reset() {
        this.activeEmergencies.clear();
        this.nextEmergencyCheck = this.emergencyCheckInterval;
        this.nextHospitalCheck = this.hospitalCheckInterval;
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

        // Chequeo periódico de hospitales para emergencias existentes
        this.nextHospitalCheck -= deltaTimeMs;
        if (this.nextHospitalCheck <= 0) {
            this.nextHospitalCheck = this.hospitalCheckInterval;
            this.checkHospitalsForActiveEmergencies();
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
        
        // NOTIFICAR HOSPITALES AUTOMÁTICAMENTE
        this.notifyNearbyHospitals(front);
    }
    
    /**
     * Notifica a hospitales cercanos sobre una nueva emergencia médica
     */
    notifyNearbyHospitals(front) {
        const nearbyHospitals = this.gameState.nodes.filter(node => 
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
            const hospitalRange = SERVER_NODE_CONFIG.ranges.campaignHospital;
            
            if (distance <= hospitalRange) {
                this.triggerHospitalResponse(hospital, front);
            }
        }
    }
    
    /**
     * Hace que un hospital responda automáticamente a una emergencia
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
        
        // Usar el sistema existente de ambulancia
        const result = this.gameState.convoyHandler.handleAmbulance(
            hospital.team, 
            hospital.id, 
            front.id
        );
        
        if (result.success) {
            hospital.lastAutoResponse = now;
            console.log(`🏥 Hospital ${hospital.id} respondió automáticamente a emergencia en ${front.id}`);
        }
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
     * Aplicar penalización por no responder a tiempo usando configuración del servidor
     */
    applyPenalty(front) {
        // Obtener configuración del efecto wounded del servidor
        const woundedConfig = SERVER_NODE_CONFIG.temporaryEffects.wounded;
        
        // Guardar consumo original usando configuración del servidor
        const originalConsumeRate = front.consumeRate || SERVER_NODE_CONFIG.gameplay.front.consumeRate;
        
        // Aplicar multiplicador usando configuración del servidor
        front.consumeRate = originalConsumeRate * woundedConfig.consumeMultiplier;
        
        // Añadir efecto "wounded" usando configuración del servidor
        if (!front.effects) front.effects = [];
        
        front.effects.push({
            type: 'wounded',
            icon: woundedConfig.icon,
            tooltip: woundedConfig.tooltip,
            startTime: Date.now(),
            duration: woundedConfig.duration * 1000, // Convertir a ms
            expiresAt: Date.now() + (woundedConfig.duration * 1000),
            originalConsumeRate
        });
        
        // Programar expiración del efecto usando configuración del servidor
        setTimeout(() => {
            front.consumeRate = originalConsumeRate;
            if (front.effects) {
                front.effects = front.effects.filter(e => e.type !== 'wounded' || e.startTime !== front.effects[0].startTime);
            }
            console.log(`✅ Efecto wounded expirado en frente ${front.id}`);
        }, woundedConfig.duration * 1000);
        
        console.log(`⚠️ Penalización aplicada al frente ${front.id}: consumo x${woundedConfig.consumeMultiplier} por ${woundedConfig.duration} segundos`);
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
    
    /**
     * Chequea todos los hospitales construidos para ver si hay emergencias activas en su rango
     */
    checkHospitalsForActiveEmergencies() {
        // Solo si hay emergencias activas
        if (this.activeEmergencies.size === 0) {
            return;
        }
        
        const hospitals = this.gameState.nodes.filter(node => 
            node.type === 'campaignHospital' &&
            node.constructed &&
            !node.isAbandoning &&
            node.availableVehicles > 0
        );
        
        // Para cada emergencia activa, buscar hospitales en rango
        for (const [frontId, emergency] of this.activeEmergencies.entries()) {
            if (emergency.resolved) continue; // Ya resuelta
            
            const front = this.gameState.nodes.find(n => n.id === frontId);
            if (!front) continue;
            
            // Buscar hospitales del mismo equipo en rango
            const nearbyHospitals = hospitals.filter(hospital => {
                if (hospital.team !== front.team) return false;
                
                const dx = front.x - hospital.x;
                const dy = front.y - hospital.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const hospitalRange = SERVER_NODE_CONFIG.ranges.campaignHospital;
                
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
     * Notifica inmediatamente a un hospital recién construido sobre emergencias activas
     */
    notifyNewHospital(hospital) {
        if (!hospital || hospital.type !== 'campaignHospital') return;
        if (!hospital.constructed || hospital.isAbandoning) return;
        
        // Buscar emergencias activas en rango
        for (const [frontId, emergency] of this.activeEmergencies.entries()) {
            if (emergency.resolved) continue;
            
            const front = this.gameState.nodes.find(n => n.id === frontId);
            if (!front || front.team !== hospital.team) continue;
            
            const dx = front.x - hospital.x;
            const dy = front.y - hospital.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const hospitalRange = SERVER_NODE_CONFIG.ranges.campaignHospital;
            
            if (distance <= hospitalRange) {
                console.log(`🏥 Hospital ${hospital.id} recién construido detecta emergencia activa en ${front.id}`);
                this.triggerHospitalResponse(hospital, front);
                break; // Solo responder a la primera emergencia encontrada
            }
        }
    }
}

