// ===== GESTOR DE MISIONES =====
import { getMission } from '../missions/index.js';

export class MissionManager {
    constructor() {
        // Arrancar en la misión 20
        this.currentMissionNumber = 20;
        this.currentMission = null;
        this.loadMission(this.currentMissionNumber);
    }
    
    /**
     * Carga una misión específica
     */
    loadMission(missionNumber) {
        this.currentMissionNumber = missionNumber;
        this.currentMission = getMission(missionNumber);
        console.log(`📋 Misión ${missionNumber} cargada:`, this.currentMission.name);
    }
    
    /**
     * Genera las bases para la misión actual
     */
    generateBases(canvasWidth, canvasHeight, baseFactory) {
        if (!this.currentMission) {
            console.error('❌ No hay misión cargada');
            return [];
        }
        
        return this.currentMission.generateBases(canvasWidth, canvasHeight, baseFactory);
    }
    
    /**
     * Obtiene la duración de la misión actual
     */
    getMissionDuration() {
        if (!this.currentMission) {
            return 90; // Valor por defecto
        }
        
        return this.currentMission.duration;
    }
    
    /**
     * Obtiene la metadata de la misión actual para el UI
     */
    getMissionMetadata() {
        if (!this.currentMission) {
            return {
                number: 1,
                name: 'Misión',
                description: '',
                objectives: '',
                duration: 90
            };
        }
        
        return this.currentMission.getMetadata();
    }
    
    /**
     * Avanza a la siguiente misión
     */
    nextMission() {
        // Permanecer en la misión 20
        this.currentMissionNumber = 20;
        this.loadMission(20);
    }
    
    /**
     * Obtiene el número de la misión actual
     */
    getCurrentMission() {
        return this.currentMissionNumber;
    }
    
    /**
     * Establece una misión específica
     */
    setMission(missionNumber) {
        this.loadMission(missionNumber);
    }
}