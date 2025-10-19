// ===== ENTIDAD UNIFICADA: NODO DEL MAPA =====
// Reemplaza a Base y Building - TODO es un MapNode ahora

export class MapNode {
    static nextId = 1;
    
    constructor(x, y, nodeId, config, game = null) {
        this.x = x;
        this.y = y;
        this.type = nodeId; // 'hq', 'fob', 'antiDrone', etc.
        this.id = `node_${MapNode.nextId++}`;
        this.game = game;
        
        // Configuración básica
        this.name = config.name || 'Nodo';
        this.description = config.description || '';
        this.spriteKey = config.spriteKey || 'base-fob';
        this.category = config.category || 'buildable';
        this.radius = config.radius || 30;
        this.cost = config.cost || 0;
        
        // Propiedades de comportamiento
        this.canBeDestroyed = config.canBeDestroyed !== false;
        this.needsConstruction = config.needsConstruction || false;
        this.active = true;
        
        // Sistema de construcción
        // NOTA: needsConstruction indica que PUEDE construirse, no que DEBE construirse
        // Los nodos del mapa (creados por Mission) ya están construidos
        this.needsConstruction = config.needsConstruction || false;
        this.isConstructing = false; // Por defecto NO está en construcción
        this.constructed = true; // Por defecto YA está construido
        this.constructionTime = config.constructionTime || 2;
        this.constructionTimer = 0;
        this.constructionCompletedTime = Date.now(); // Timestamp de cuando se completó (para IA)
        this.hasPlayedSpawnSound = false;
        
        // Sistema de suministros
        this.hasSupplies = config.hasSupplies || false;
        if (this.hasSupplies) {
            this.maxSupplies = config.maxSupplies || 100;
            // Frentes empiezan llenos, FOBs vacíos
            if (this.type === 'front') {
                this.supplies = this.maxSupplies;
                this.consumeRate = config.consumeRate || 10;
                this.maxXReached = x; // Para territorio
            } else {
                this.supplies = 0;
            }
        } else {
            this.supplies = null; // HQ tiene infinitos
            this.maxSupplies = null;
        }
        
        // Sistema de vehículos
        this.hasVehicles = config.hasVehicles || config.maxVehicles > 0 || false;
        if (this.hasVehicles) {
            this.baseMaxVehicles = config.maxVehicles || 0; // Valor base sin bonuses
            this.availableVehicles = this.baseMaxVehicles;
        }
        
        // Sistema médico (solo HQ)
        this.hasMedicalSystem = config.hasMedicalSystem || false;
        if (this.hasMedicalSystem) {
            this.selectedResourceType = 'ammo'; // 'ammo' o 'medical'
            this.ambulanceAvailable = true;
            this.maxAmbulances = config.maxAmbulances || 1;
        }
        
        // Hospital de campaña
        if (config.canDispatchMedical) {
            this.canDispatchMedical = true;
            this.actionRange = config.actionRange || 200;
        }
        
        // Team (para diferenciar aliados de enemigos en edificios construibles)
        this.team = config.team || 'ally';
        
        // Ajustar spriteKey y shadowColor según team para nodos enemigos
        if (this.team === 'player2' && (this.type === 'hq' || this.type === 'fob' || this.type === 'front')) {
            // Para nodos enemigos (player2), usar sprites enemy
            this.spriteKey = `base-enemy-${this.type}`;
            // HQ enemigo debe tener resplandor rojo
            if (this.type === 'hq') {
                this.shadowColor = '#e74c3c'; // Rojo para HQ enemigo
            }
        }
        
        // Renderizado
        if (!this.shadowColor) {
            this.shadowColor = config.shadowColor || '#555';
        }
        this.sizeMultiplier = config.sizeMultiplier || 1.0;
        this.flipHorizontal = config.flipHorizontal || false;
        
        // Propiedades específicas por tipo
        this.detectionRange = config.detectionRange;
        this.alertRange = config.alertRange;
        this.cooldownTime = config.cooldownTime;
        this.isConsumable = config.isConsumable || false;
        this.showRangePreview = config.showRangePreview || false;
        this.passiveIncomeBonus = config.passiveIncomeBonus || 0;
        
        // Sistema de efectos (debuffs/buffs)
        this.effects = [];
        
        // Sistema de abandono (edificios construibles fuera de territorio)
        this.isAbandoning = false;           // Si está en proceso de abandono
        this.abandonStartTime = 0;           // Timestamp de inicio del abandono
        this.abandonPhase = 0;               // 0 = normal, 1 = gris claro (2s), 2 = gris oscuro (3s), 3 = eliminado
        this.abandonPhase1Duration = 2000;  // 2 segundos en gris claro
        this.abandonPhase2Duration = 3000;  // 3 segundos en gris oscuro
        
        // Visual
        this.hover = false;
        this.selected = false;
        this.noVehiclesShake = false;
        this.noVehiclesShakeTime = 0;
    }
    
    /**
     * Getter dinámico para maxVehicles que incluye bonus de Truck Factories
     */
    get maxVehicles() {
        if (!this.hasVehicles) return 0;
        
        let total = this.baseMaxVehicles;
        
        // Ambos HQs reciben el bonus de Truck Factories de su equipo
        if (this.type === 'hq' && this.game) {
            total += this.game.getTruckFactoryBonus(this.team);
        }
        
        return total;
    }
    
    update(dt) {
        // Sistema de construcción
        if (this.isConstructing) {
            this.constructionTimer += dt;
            if (this.constructionTimer >= this.constructionTime) {
                this.isConstructing = false;
                this.constructed = true;
                this.constructionCompletedTime = Date.now(); // Marcar cuándo se completó
                
                // Si es una Truck Factory, añadir un vehículo al HQ
                if (this.type === 'truckFactory' && this.game) {
                    const hq = this.game.nodes.find(n => n.type === 'hq' && n.team === 'ally');
                    if (hq && hq.hasVehicles) {
                        hq.availableVehicles++;
                    }
                }
                
                // Notificar al tutorial cuando una FOB termina de construirse
                if (this.game && this.game.tutorialManager && this.game.tutorialManager.isTutorialActive) {
                    if (this.type === 'fob') {
                        this.game.tutorialManager.notifyAction('fob_constructed', { nodeId: this.id });
                    }
                }
            }
        }
        
        // Sistema de abandono (FOBs fuera de territorio)
        if (this.isAbandoning) {
            const now = Date.now();
            const elapsed = now - this.abandonStartTime;
            
            // Actualizar fase de abandono
            if (elapsed < this.abandonPhase1Duration) {
                this.abandonPhase = 1; // Gris claro
            } else if (elapsed < this.abandonPhase1Duration + this.abandonPhase2Duration) {
                this.abandonPhase = 2; // Gris oscuro
            } else {
                this.abandonPhase = 3; // Listo para eliminar
            }
        }
        
        // Frentes consumen recursos
        if (this.type === 'front' && this.hasSupplies) {
            let currentConsumeRate = this.consumeRate;
            
            // Aplicar multiplicadores de efectos
            const woundedEffect = this.effects.find(e => e.type === 'wounded');
            if (woundedEffect && woundedEffect.consumeMultiplier) {
                currentConsumeRate *= woundedEffect.consumeMultiplier;
            }
            
            this.supplies = Math.max(0, this.supplies - currentConsumeRate * dt);
        }
        
        // Actualizar efectos temporales
        const now = Date.now();
        this.effects = this.effects.filter(effect => {
            if (effect.duration && effect.startTime) {
                const elapsed = now - effect.startTime;
                if (elapsed >= effect.duration) {
                    this.onEffectExpired(effect);
                    return false;
                }
            }
            return true;
        });
    }
    
    onEffectExpired(effect) {
        if (effect.type === 'wounded' && effect.onExpire) {
            effect.onExpire(this);
        }
        console.log(`⏱️ Efecto '${effect.type}' expirado en nodo #${this.id}`);
    }
    
    // ========== SISTEMA DE SUMINISTROS ==========
    
    addSupplies(amount) {
        if (this.supplies !== null) {
            this.supplies = Math.min(this.maxSupplies, this.supplies + amount);
        }
    }
    
    removeSupplies(amount) {
        // HQ tiene suministros infinitos
        if (this.supplies === null) {
            return amount;
        }
        // Otros nodos tienen límite
        const removed = Math.min(this.supplies, amount);
        this.supplies -= removed;
        return removed;
    }
    
    isCritical() {
        if (!this.hasSupplies || this.supplies === null) return false;
        return this.supplies < this.maxSupplies * 0.2;
    }
    
    hasEnoughSupplies(amount) {
        // HQ tiene suministros infinitos
        if (this.supplies === null) return true;
        // Otros nodos verifican si tienen suficiente
        return this.supplies >= amount;
    }
    
    // ========== SISTEMA DE VEHÍCULOS ==========
    
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
    
    // ========== SISTEMA MÉDICO (HQ) ==========
    
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
    
    // ========== HOSPITAL DE CAMPAÑA ==========
    
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
    
    // ========== SISTEMA DE EFECTOS ==========
    
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
    
    // ========== ABANDONO (edificios construibles fuera de territorio) ==========
    
    /**
     * Inicia el proceso de abandono del edificio (fuera de territorio)
     */
    startAbandoning() {
        if (this.isAbandoning) return; // Ya está abandonando
        
        this.isAbandoning = true;
        this.abandonStartTime = Date.now();
        this.abandonPhase = 1;
        // NO marcar como inactive aquí - necesitamos que se siga renderizando para la animación
        // La inutilización se controla con isAbandoning en lugar de active
        
        console.log(`🚫 ${this.name} #${this.id} (${this.type}) fuera de territorio - Iniciando abandono`);
    }
    
    /**
     * Verifica si el edificio puede ser usado (interacción, recibir/enviar convoyes)
     */
    isUsable() {
        return !this.isAbandoning && this.active && this.constructed;
    }
    
    // ========== CONSTRUCCIÓN ==========
    
    getConstructionProgress() {
        if (!this.needsConstruction) return 1;
        return Math.min(1, this.constructionTimer / this.constructionTime);
    }
    
    // ========== COMPATIBILIDAD (para sistemas que buscan propiedades específicas) ==========
    
    // Para anti-drones
    playAntiDroneSpawnSound() {
        if (this.type === 'antiDrone' && this.game && !this.hasPlayedSpawnSound) {
            this.game.audio.playAntiDroneSpawnSound();
            this.hasPlayedSpawnSound = true;
        }
    }
}










