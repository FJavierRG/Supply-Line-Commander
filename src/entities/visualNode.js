// ===== ENTIDAD VISUAL: NODO DEL MAPA (SOLO RENDERIZADO - SIN LÓGICA DE JUEGO) =====
// Entidad puramente visual que solo maneja renderizado, interpolación y estados visuales
// Toda la lógica de juego (construcción, suministros, efectos, inversión) está en el servidor (ANTI-HACK)

import { interpolatePosition } from '../utils/InterpolationUtils.js';

export class VisualNode {
    static nextId = 1;
    
    constructor(x, y, nodeId, config, game = null) {
        this.x = x;
        this.y = y;
        this.type = nodeId; // 'hq', 'fob', 'antiDrone', etc.
        this.id = `node_${VisualNode.nextId++}`;
        this.game = game;
        
        // ✅ SEGURO: Propiedades básicas necesarias para renderizado
        this.name = config.name || 'Nodo';
        this.description = config.description || '';
        this.spriteKey = config.spriteKey || 'base-fob';
        this.category = config.category || 'buildable';
        this.radius = config.radius || 30;
        this.hitboxRadius = config.hitboxRadius || this.radius;
        this.detectionRadius = config.detectionRadius || null;
        this.cost = config.cost || 0;
        
        // ✅ SEGURO: Propiedades de estado básicas (solo para compatibilidad)
        this.canBeDestroyed = config.canBeDestroyed !== false;
        this.needsConstruction = config.needsConstruction || false;
        this.active = true;
        this.isConstructing = false;
        this.constructed = true;
        this.constructionTime = config.constructionTime || 2;
        this.constructionTimer = 0;
        this.constructionCompletedTime = Date.now();
        this.hasPlayedSpawnSound = false;
        
        // ✅ SEGURO: Propiedades de suministros (solo para display)
        this.hasSupplies = config.hasSupplies || false;
        if (this.hasSupplies) {
            this.maxSupplies = config.maxSupplies || 100;
            if (this.type === 'front') {
                this.supplies = this.maxSupplies;
                this.consumeRate = config.consumeRate || 10;
                this.maxXReached = x;
            } else {
                this.supplies = 0;
            }
        } else {
            this.supplies = null;
            this.maxSupplies = null;
        }
        
        // ✅ SEGURO: Propiedades de vehículos (solo para display)
        this.hasVehicles = config.hasVehicles || config.maxVehicles > 0 || false;
        if (this.hasVehicles) {
            this.baseMaxVehicles = config.maxVehicles || 0;
            this.availableVehicles = this.baseMaxVehicles;
        }
        
        // ✅ SEGURO: Propiedades de helicópteros (solo para display)
        this.hasHelicopters = config.hasHelicopters || false;
        if (this.hasHelicopters) {
            this.maxHelicopters = config.maxHelicopters || 1;
            this.availableHelicopters = 0;
        }
        this.landedHelicopters = [];
        
        // ✅ SEGURO: Propiedades médicas (solo para display)
        this.hasMedicalSystem = config.hasMedicalSystem || false;
        if (this.hasMedicalSystem) {
            this.selectedResourceType = 'ammo';
            this.ambulanceAvailable = true;
            this.maxAmbulances = config.maxAmbulances || 1;
        }
        
        if (config.canDispatchMedical) {
            this.canDispatchMedical = true;
            this.actionRange = config.actionRange || 200;
            this.lastAutoResponse = 0;
        }
        
        // ✅ SEGURO: Team (para diferenciar aliados de enemigos)
        this.team = config.team || 'ally';
        
        // ⚠️ NO establecer spriteKey aquí basado en team - se determina dinámicamente en RenderSystem
        // basado en si es mi equipo o no (myTeam)
        
        // ✅ SEGURO: Propiedades de renderizado (solo visuales)
        if (!this.shadowColor) {
            this.shadowColor = config.shadowColor || '#555';
        }
        this.sizeMultiplier = config.sizeMultiplier || 1.0;
        this.flipHorizontal = config.flipHorizontal || false;
        
        // ✅ SEGURO: Propiedades específicas (solo para display)
        this.detectionRange = config.detectionRange;
        this.alertRange = config.alertRange;
        this.cooldownTime = config.cooldownTime;
        this.isConsumable = config.isConsumable || false;
        this.showRangePreview = config.showRangePreview || false;
        this.passiveIncomeBonus = config.passiveIncomeBonus || 0;
        
        // ✅ SEGURO: Propiedades de inversión (solo para display)
        this.investmentTime = config.investmentTime || 0;
        this.investmentReturn = config.investmentReturn || 0;
        this.investmentTimer = 0;
        this.investmentStarted = false;
        this.investmentCompleted = false;
        
        // ✅ SEGURO: Sistema de efectos (solo para display)
        this.effects = [];
        
        // ✅ SEGURO: Sistema de abandono (solo para display)
        this.isAbandoning = false;
        this.abandonStartTime = 0;
        this.abandonPhase = 0;
        this.abandonPhase1Duration = this.type === 'intelRadio' ? 500 : 2000;
        this.abandonPhase2Duration = this.type === 'intelRadio' ? 500 : 3000;
        
        // ✅ SEGURO: Estados visuales (solo para renderizado)
        this.hover = false;
        this.selected = false;
        this.noVehiclesShake = false;
        this.noVehiclesShakeTime = 0;
        
        // ✅ SEGURO: Interpolación suave para multijugador
        this.serverX = x;
        this.serverY = y;
        this.lastServerUpdate = 0;
    }
    
    /**
     * ✅ SEGURO: Getter dinámico para maxVehicles (solo para display)
     */
    get maxVehicles() {
        if (!this.hasVehicles) return 0;
        
        let total = this.baseMaxVehicles;
        
        if (this.type === 'hq' && this.game) {
            total += this.game.getTruckFactoryBonus(this.team);
        }
        
        return total;
    }
    
    /**
     * ⚠️ DEPRECATED: Update movido al servidor (autoridad - ANTI-HACK)
     * Solo se mantiene para compatibilidad con código legacy
     */
    update(dt) {
        // ⚠️ DEPRECATED: Toda la lógica de juego está en el servidor
        // Esta función solo se mantiene para compatibilidad
        // El servidor maneja: construcción, suministros, efectos, inversión, abandono
    }
    
    // ========== ✅ SEGURO: FUNCIONES DE COMPATIBILIDAD (SOLO PARA DISPLAY) ==========
    
    // Sistema de suministros (solo para display)
    addSupplies(amount) {
        if (this.supplies !== null) {
            this.supplies = Math.min(this.maxSupplies, this.supplies + amount);
        }
    }
    
    removeSupplies(amount) {
        if (this.supplies === null) return amount;
        const removed = Math.min(this.supplies, amount);
        this.supplies -= removed;
        return removed;
    }
    
    isCritical() {
        if (!this.hasSupplies || this.supplies === null) return false;
        return this.supplies < this.maxSupplies * 0.2;
    }
    
    hasEnoughSupplies(amount) {
        if (this.supplies === null) return true;
        return this.supplies >= amount;
    }
    
    // Sistema de vehículos (solo para display)
    hasAvailableVehicle() {
        return this.hasVehicles && this.availableVehicles > 0;
    }
    
    takeVehicle() {
        if (this.hasAvailableVehicle()) {
            this.availableVehicles--;
            return true;
        }
        return false;
    }
    
    returnVehicle() {
        if (this.hasVehicles && this.availableVehicles < this.maxVehicles) {
            this.availableVehicles++;
        }
    }
    
    // Sistema de helicópteros (solo para display)
    hasAvailableHelicopter() {
        return this.landedHelicopters && this.landedHelicopters.length > 0;
    }
    
    takeHelicopter() {
        if (this.hasAvailableHelicopter()) {
            this.availableHelicopters--;
            return true;
        }
        return false;
    }
    
    returnHelicopter() {
        if (this.hasHelicopters && this.availableHelicopters < this.maxHelicopters) {
            this.availableHelicopters++;
        }
    }
    
    addHelicopter() {
        if (this.hasHelicopters && this.availableHelicopters < this.maxHelicopters) {
            this.availableHelicopters++;
            return true;
        }
        return false;
    }
    
    // Sistema médico (solo para display)
    setResourceType(type) {
        if (this.hasMedicalSystem) {
            this.selectedResourceType = type;
        }
    }
    
    hasAmbulanceAvailable() {
        return this.hasMedicalSystem && this.ambulanceAvailable;
    }
    
    takeAmbulance() {
        if (this.hasAmbulanceAvailable()) {
            this.ambulanceAvailable = false;
            return true;
        }
        return false;
    }
    
    returnAmbulance() {
        if (this.hasMedicalSystem) {
            this.ambulanceAvailable = true;
        }
    }
    
    dispatchAmbulance() {
        if (this.canDispatchMedical && this.availableVehicles > 0) {
            this.availableVehicles--;
            return true;
        }
        return false;
    }
    
    returnHospitalAmbulance() {
        if (this.canDispatchMedical && this.availableVehicles < this.maxVehicles) {
            this.availableVehicles++;
        }
    }
    
    // Sistema de efectos (solo para display)
    addEffect(effect) {
        const exists = this.effects.some(e => e.type === effect.type);
        if (!exists) {
            this.effects.push({
                ...effect,
                startTime: Date.now()
            });
        }
    }
    
    removeEffect(effectType) {
        this.effects = this.effects.filter(e => e.type !== effectType);
    }
    
    hasEffect(effectType) {
        return this.effects.some(e => e.type === effectType);
    }
    
    // Sistema de sabotaje (solo para display)
    consumeFobSabotageTruck() {
        const sabotageEffect = this.effects.find(e => e.type === 'fobSabotage');
        if (!sabotageEffect) return false;
        
        sabotageEffect.truckCount--;
        console.log(`🚛 FOB ${this.id} camión afectado por fobSabotage - quedan ${sabotageEffect.truckCount} camiones`);
        
        if (sabotageEffect.truckCount <= 0) {
            this.removeEffect('fobSabotage');
            return false;
        }
        return true;
    }
    
    isSabotaged() {
        return this.hasEffect('fobSabotage');
    }
    
    // Mantener compatibilidad con el nombre anterior (temporal)
    consumeHarassmentTruck() {
        return this.consumeFobSabotageTruck();
    }
    
    isHarassed() {
        return this.isSabotaged();
    }
    
    // Sistema de abandono (solo para display)
    startAbandoning() {
        if (this.isAbandoning) return;
        
        this.isAbandoning = true;
        this.abandonStartTime = Date.now();
        this.abandonPhase = 1;
    }
    
    isUsable() {
        return !this.isAbandoning && this.active && this.constructed;
    }
    
    // Sistema de construcción (solo para display)
    getConstructionProgress() {
        if (!this.needsConstruction) return 1;
        return Math.min(1, this.constructionTimer / this.constructionTime);
    }
    
    /**
     * ✅ SEGURO: Actualizar posición desde el servidor con interpolación suave (para multijugador)
     */
    updateServerPosition(newX, newY) {
        this.serverX = newX;
        this.serverY = newY;
        this.lastServerUpdate = Date.now();
    }
    
    /**
     * ✅ SEGURO: Actualizar posición visual con interpolación suave (para multijugador)
     * Solo para nodos que se mueven como fronts (usando sistema centralizado)
     */
    updatePosition(dt = 0.016) {
        // Solo interpolar si es un frente (se mueve)
        if (this.type === 'front') {
            interpolatePosition(this, dt, {
                speed: 8.0,
                threshold: 0.5,
                snapThreshold: 0.1
            });
        }
    }
    
    // ========== ✅ SEGURO: COMPATIBILIDAD (para sistemas que buscan propiedades específicas) ==========
    
    // Para anti-drones
    playAntiDroneSpawnSound() {
        if (this.type === 'antiDrone' && this.game && !this.hasPlayedSpawnSound) {
            this.game.audio.playAntiDroneSpawnSound();
            this.hasPlayedSpawnSound = true;
        }
    }
}