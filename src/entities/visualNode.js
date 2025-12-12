// ===== ENTIDAD VISUAL: NODO DEL MAPA (SOLO RENDERIZADO - SIN LÓGICA DE JUEGO) =====
// Entidad puramente visual que solo maneja renderizado, interpolación y estados visuales
// Toda la lógica de juego (construcción, suministros, efectos, inversión) está en el servidor (ANTI-HACK)

import { interpolateWithVelocity } from '../utils/InterpolationUtils.js';

/**
 * 🔧 Obtener velocidad de frentes desde configuración del servidor (fuente única de verdad)
 * Fallback a 4.0 si no está disponible aún
 */
function getFrontServerSpeed() {
    return window.game?.serverBuildingConfig?.frontMovement?.advanceSpeed || 4.0;
}

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
        // ✅ Valor por defecto: true (todos necesitan construcción excepto hq y front que vienen como false del servidor)
        this.needsConstruction = config.needsConstruction !== undefined ? config.needsConstruction : true;
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
                
                // 🆕 NUEVO: Sistema de modos de frente
                this.frontMode = config.frontMode || 'advance'; // Modo por defecto
                this.modeCooldownUntil = config.modeCooldownUntil || 0; // Sin cooldown inicial
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
        
        // 🆕 NUEVO: Propiedades del sistema de reparación (solo para display)
        this.hasRepairSystem = config.hasRepairSystem || false;
        if (this.hasRepairSystem) {
            this.availableRepairVehicles = config.availableRepairVehicles || config.maxRepairVehicles || 0;
            this.maxRepairVehicles = config.maxRepairVehicles || 0;
        }
        
        // ✅ SEGURO: Propiedades de estado (solo para display)
        this.disabled = config.disabled || false; // Estado disabled (para comandos)
        this.broken = config.broken || false; // 🆕 NUEVO: Estado broken (roto - requiere reparación)
        
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
        // Los tiempos vienen del servidor (sincronizados en NetworkManager)
        // Valores por defecto solo si no hay configuración del servidor disponible
        this.isAbandoning = false;
        this.abandonStartTime = 0;
        this.abandonPhase = 0;
        // Obtener tiempos desde configuración del servidor si está disponible
        const serverConfig = window.game?.serverBuildingConfig;
        if (serverConfig?.abandonment) {
            const typeConfig = serverConfig.abandonment[this.type] || serverConfig.abandonment.default;
            this.abandonPhase1Duration = typeConfig?.phase1Duration || 2000;
            this.abandonPhase2Duration = typeConfig?.phase2Duration || 3000;
        } else {
            // Fallback: valores por defecto (se actualizarán cuando llegue la configuración del servidor)
            this.abandonPhase1Duration = 2000;
            this.abandonPhase2Duration = 3000;
        }
        
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
     * ✅ SEGURO: Getter para maxVehicles (solo para display)
     * 🆕 FIX: El servidor ya calcula el bonus del truck factory, no sumar dos veces
     */
    get maxVehicles() {
        if (!this.hasVehicles) return 0;
        // El servidor ya calcula maxVehicles incluyendo el bonus del truck factory
        // No necesitamos sumar nada adicional aquí
        return this.baseMaxVehicles || 0;
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
    
    // 🆕 NUEVO: Sistema de selección de tipo de vehículo (modular)
    setResourceType(type) {
        // Permitir cambio si el nodo tiene sistema médico O si tiene tipos de vehículos habilitados
        // La verificación de tipos habilitados se hace en el renderizado, aquí solo guardamos el valor
        this.selectedResourceType = type;
        // 🆕 NUEVO: Marcar timestamp para evitar que el servidor sobrescriba cambios locales recientes
        this._lastResourceTypeChange = Date.now();
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
        // 🆕 MODULARIZADO: Incluir verificaciones de disabled y broken
        return !this.isAbandoning && 
               this.active && 
               this.constructed && 
               !this.disabled && 
               !this.broken;
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
     * 🔧 v2.0: Usa interpolación basada en velocidad del servidor para movimiento fluido
     */
    updatePosition(dt = 0.016) {
        // Solo interpolar si es un frente (se mueve)
        if (this.type === 'front') {
            // 🔧 FIX: Usar interpolación basada en velocidad real del servidor
            // La velocidad se obtiene de serverBuildingConfig (fuente única de verdad)
            const serverSpeed = getFrontServerSpeed();
            interpolateWithVelocity(this, dt, {
                serverSpeed: serverSpeed,         // Velocidad desde gameConfig.frontMovement.advanceSpeed
                snapThreshold: 0.1,               // Snap si está muy cerca
                catchUpSpeed: serverSpeed * 3,    // Velocidad para alcanzar (3x la velocidad normal)
                catchUpThreshold: 5.0             // Distancia para empezar a acelerar
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