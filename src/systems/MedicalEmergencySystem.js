// ===== SISTEMA DE EMERGENCIAS MÉDICAS (SOLO VISUAL) =====
// ⚠️ IMPORTANTE: Este sistema SOLO muestra emergencias del servidor.
// NO crea emergencias ni aplica penalizaciones - el servidor es la autoridad.

export class MedicalEmergencySystem {
    constructor(game) {
        this.game = game;
        // Solo almacena emergencias que vienen del servidor (para visualización)
        this.activeEmergencies = new Map(); // fronts con emergencias activas
        this.emergencyDuration = 20000; // 20 segundos para responder (visual)
        this.tutorialEmergency = false; // Para nivel 6
    }

    reset() {
        this.activeEmergencies.clear();
        this.tutorialEmergency = false;
    }

    /**
     * Activar tutorial (emergencia forzada en nivel 6)
     */
    enableTutorialEmergency() {
        this.tutorialEmergency = true;
    }

    /**
     * Iniciar una emergencia médica en un frente (SOLO VISUAL)
     * El servidor crea la emergencia real - esto solo la muestra
     * @param {Object} front - Frente con emergencia
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
        
        console.log(`🚨 Emergencia médica en ${front.type} #${front.id} (visual)`);
    }

    /**
     * Resolver una emergencia médica (SOLO VISUAL)
     * El servidor resuelve la emergencia real - esto solo la oculta
     * @param {string} frontId - ID del frente
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
     * === LEGACY REMOVED: applyPenalty() eliminado ===
     * El servidor maneja todas las penalizaciones.
     * Ver: server/systems/MedicalSystemServer.js
     */

    /**
     * Actualizar sistema de emergencias (SOLO VISUAL)
     * El servidor maneja toda la creación y gestión de emergencias.
     */
    update(deltaTime) {
        // Solo actualizar progreso visual de emergencias activas (para UI)
        const now = Date.now();
        for (const [frontId, emergency] of this.activeEmergencies.entries()) {
            const elapsed = now - emergency.startTime;
            // Solo para calcular progreso visual - el servidor maneja la lógica
        }
    }

    /**
     * === LEGACY REMOVED: triggerRandomEmergency() eliminado ===
     * El servidor crea todas las emergencias.
     * Ver: server/systems/MedicalSystemServer.js
     */

    /**
     * Obtener emergencia activa de un frente
     * @param {string} frontId - ID del frente
     * @returns {Object|null} Emergencia o null
     */
    getEmergency(frontId) {
        return this.activeEmergencies.get(frontId);
    }

    /**
     * Verificar si un frente tiene emergencia activa
     * @param {string} frontId - ID del frente
     * @returns {boolean} true si tiene emergencia activa
     */
    hasEmergency(frontId) {
        return this.activeEmergencies.has(frontId);
    }

    /**
     * Obtener progreso de una emergencia (0-1)
     * @param {string} frontId - ID del frente
     * @returns {number} Progreso de 0 a 1
     */
    getEmergencyProgress(frontId) {
        const emergency = this.activeEmergencies.get(frontId);
        if (!emergency) return 0;

        const elapsed = Date.now() - emergency.startTime;
        return Math.min(elapsed / emergency.duration, 1);
    }
    
    /**
     * === LEGACY REMOVED: notifyNearbyHospitals(), triggerHospitalResponse(), 
     * checkHospitalsForActiveEmergencies(), notifyNewHospital() eliminados ===
     * El servidor maneja todas las respuestas automáticas de hospitales.
     * Ver: server/systems/MedicalSystemServer.js
     */
}
