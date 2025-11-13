// ===== SISTEMA DE CONSTRUCCIÓN =====
import { getNodeConfig, getBuildableNodes, isNodeAvailableForRace } from '../config/nodes.js';
import { getDefaultRace } from '../config/races.js';
import { VisualNode } from '../entities/visualNode.js';

// Compatibilidad temporal
export function getBuildingConfig(buildingId) {
    return getNodeConfig(buildingId);
}

export const BUILDING_TYPES = {};
getBuildableNodes().forEach(node => {
    BUILDING_TYPES[node.id] = node;
});

export class BuildingSystem {
    constructor(game) {
        this.game = game;
        this.buildMode = false;
        this.droneMode = false;
        this.tankMode = false;
        this.sniperMode = false;
        this.fobSabotageMode = false;
        this.commandoMode = false; // 🆕 NUEVO: Modo de despliegue de comando especial operativo
        this.currentBuildingType = null; // Tipo de edificio que se está construyendo actualmente
        this.currentRace = getDefaultRace(); // Raza actual (por defecto 'default')
        this.minDistance = 80; // Distancia mínima entre bases
    }
    
    /**
     * Establece la raza actual
     * @param {string} raceId - ID de la raza a establecer
     */
    setRace(raceId) {
        if (this.currentRace !== raceId) {
            this.currentRace = raceId;
            // Desactivar modo construcción si estaba activo
            if (this.isActive()) {
                this.deactivateBuildMode();
            }
            console.log(`🏗️ BuildingSystem actualizado para raza: ${raceId}`);
        }
    }
    
    /**
     * Obtiene la raza actual
     * @returns {string} ID de la raza actual
     */
    getCurrentRace() {
        return this.currentRace;
    }
    
    /**
     * Obtiene el costo de un edificio desde la configuración del servidor
     * @param {string} buildingId - ID del edificio
     * @returns {number} Costo del edificio
     */
    getBuildingCost(buildingId) {
        // Usar configuración autoritativa del servidor
        if (this.game.serverBuildingConfig?.costs?.[buildingId]) {
            return this.game.serverBuildingConfig.costs[buildingId];
        }
        const building = getBuildingConfig(buildingId);
        return building ? building.cost : 0;
    }
    
    /**
     * Verifica si se puede pagar un edificio
     * @param {string} buildingId - ID del edificio
     * @returns {boolean} true si se puede pagar
     */
    canAffordBuilding(buildingId) {
        // Validación UI únicamente - la validación real está en el servidor
        // 🆕 NUEVO: Para el dron, usar getDroneCost() que incluye el descuento del taller de drones
        const cost = buildingId === 'drone' ? this.getDroneCost() : this.getBuildingCost(buildingId);
        return this.game.currency.canAfford(cost);
    }
    
    /**
     * Verifica si un tipo de edificio está activo
     * @param {string} buildingId - ID del edificio
     * @returns {boolean} true si está activo
     */
    isActiveBuildingType(buildingId) {
        return this.buildMode && this.currentBuildingType === buildingId;
    }
    
    /**
     * Obtiene el costo actual de construir un FOB (compatibilidad)
     */
    getFobCost() {
        return this.getBuildingCost('fob');
    }
    
    /**
     * Obtiene el costo del dron (proyectil)
     * 🆕 NUEVO: Aplica descuento del taller de drones si hay talleres activos y FOBs con suficientes suministros
     */
    getDroneCost() {
        const baseCost = this.getBuildingCost('drone');
        
        // Verificar si hay talleres de drones activos
        const droneWorkshops = this.game.nodes.filter(n => 
            n.type === 'droneWorkshop' && 
            n.team === this.game.myTeam && 
            n.active && 
            n.constructed &&
            !n.isAbandoning
        );
        
        if (droneWorkshops.length > 0) {
            // Leer configuración del taller de drones desde el servidor
            const effects = this.game.serverBuildingConfig?.effects || {};
            const workshopConfig = effects.droneWorkshop || {};
            const requiredSupplies = workshopConfig.requiredSupplies || 10;
            const discountMultiplier = workshopConfig.discountMultiplier || 0.5;
            
            // Buscar FOBs aliados con suficientes suministros
            const fobs = this.game.nodes.filter(n => 
                n.type === 'fob' && 
                n.team === this.game.myTeam && 
                n.active && 
                n.constructed &&
                !n.isAbandoning &&
                n.supplies !== null &&
                n.supplies >= requiredSupplies
            );
            
            if (fobs.length > 0) {
                // Aplicar descuento según configuración
                return Math.floor(baseCost * discountMultiplier);
            }
        }
        
        return baseCost;
    }
    
    /**
     * Activa el modo construcción para un tipo de edificio específico
     * @param {string} buildingId - ID del edificio a construir
     */
    activateBuildMode(buildingId) {
        // Tutorial simple: no hay interacción
        if (this.game.state === 'tutorial') {
            return;
        }
        
        const building = getBuildingConfig(buildingId);
        if (!building) {
            console.warn(`⚠️ Edificio desconocido: ${buildingId}`);
            return;
        }
        
        // Verificar si tiene suficiente currency
        // 🆕 NUEVO: Para el dron, usar getDroneCost() que incluye el descuento del taller de drones
        const actualCost = buildingId === 'drone' ? this.getDroneCost() : building.cost;
        if (!this.canAffordBuilding(buildingId)) {
            console.log(`⚠️ No tienes suficiente currency (Necesitas: ${actualCost}, Tienes: ${this.game.getMissionCurrency()})`);
            return;
        }
        
        // Si el edificio es el dron, usar el sistema antiguo
        if (buildingId === 'drone') {
            this.toggleDroneMode();
            return;
        }
        
        // Si es el francotirador, activar modo especial
        if (buildingId === 'sniperStrike') {
            this.activateSniperMode();
            return;
        }
        
        // Si es fobSabotage, activar modo especial
        if (buildingId === 'fobSabotage') {
            this.activateFobSabotageMode();
            return;
        }
        
        // Si es specopsCommando, activar modo especial
        if (buildingId === 'specopsCommando') {
            this.activateCommandoMode();
            return;
        }
        
        // Si es tank, activar modo especial
        if (buildingId === 'tank') {
            this.toggleTankMode();
            return;
        }
        
        // Activar modo construcción
        this.buildMode = true;
        this.currentBuildingType = buildingId;
        this.game.selectedBase = null;
        this.game.canvas.style.cursor = 'crosshair';
        
        console.log(`🔨 Modo construcción activado: ${building.name}`);
    }
    
    /**
     * Desactiva el modo construcción
     */
    deactivateBuildMode() {
        this.buildMode = false;
        this.currentBuildingType = null;
        this.game.canvas.style.cursor = 'default';
    }
    
    /**
     * Activa/desactiva el modo construcción (compatibilidad con FOB)
     */
    toggleBuildMode() {
        if (this.buildMode && this.currentBuildingType === 'fob') {
            this.deactivateBuildMode();
        } else {
            this.activateBuildMode('fob');
        }
    }
    
    /**
     * Coloca un edificio en las coordenadas especificadas
     * ⚠️ REFACTORIZADO: Ya no ejecuta lógica autoritativa - delega TODO al servidor
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     */
    placeBuilding(x, y) {
        if (!this.buildMode || !this.currentBuildingType) return;
        
        const buildingId = this.currentBuildingType;
        
        // Delegar TODO al servidor autoritativo
        // Esto maneja validaciones, currency, territorio, colisiones, etc.
        if (!this.game.network || !this.game.network.roomId) {
            console.error('❌ No hay conexión al servidor. No se puede construir.');
            return;
        }
        
        console.log(`🏗️ Enviando build_request: ${buildingId} en (${x}, ${y})`);
        this.game.network.requestBuild(buildingId, x, y);
        
        // Desactivar modo construcción (optimista)
        this.deactivateBuildMode();
    }
    
    /**
     * Construye un FOB (compatibilidad)
     */
    buildFOB(x, y) {
        this.placeBuilding(x, y);
    }
    
    /**
     * Verifica si una ubicación es válida para construir
     */
    isValidLocation(x, y, buildingType = null) {
        // Verificar colisiones con todos los nodos existentes (bases + edificios construidos)
        const allNodes = [...this.game.bases, ...this.game.nodes];
        
        for (const node of allNodes) {
            if (!node.active) continue;
            
            const dist = Math.hypot(x - node.x, y - node.y);
            
            // Obtener radio de detección del nodo existente
            const existingConfig = getNodeConfig(node.type);
            const existingDetectionRadius = existingConfig?.detectionRadius || (existingConfig?.radius || 30) * 2.5;
            
            // Obtener radio de detección del edificio que se está construyendo
            let newDetectionRadius = this.minDistance; // Fallback al valor antiguo
            if (buildingType) {
                const newConfig = getNodeConfig(buildingType);
                newDetectionRadius = newConfig?.detectionRadius || (newConfig?.radius || 30) * 2.5;
            }
            
            // Verificar colisión: ningún edificio puede estar dentro del área de detección del otro
            const minSeparation = Math.max(existingDetectionRadius, newDetectionRadius);
            
            if (dist < minSeparation) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Sale del modo construcción
     */
    exitBuildMode() {
        this.deactivateBuildMode();
        
        // También salir del modo drone si estaba activo
        this.exitDroneMode();
    }
    
    /**
     * Resetea el sistema de construcción (nueva misión)
     */
    resetLevel() {
        this.deactivateBuildMode();
        this.droneMode = false;
        this.tankMode = false;
        this.sniperMode = false;
        this.fobSabotageMode = false;
        this.currentBuildingType = null;
    }
    
    /**
     * Verifica si el modo construcción O drone está activo
     */
    isActive() {
        return this.buildMode || this.droneMode || this.tankMode || this.sniperMode || this.fobSabotageMode || this.commandoMode;
    }
    
    /**
     * Verifica si existe al menos una lanzadera de drones construida
     */
    hasDroneLauncher() {
        // Obtener equipo del jugador
        const myTeam = this.game.myTeam || 'ally';
        
        return this.game.nodes.some(n => 
            n.type === 'droneLauncher' && 
            n.constructed && 
            !n.isAbandoning &&
            n.team === myTeam
        );
    }
    
    /**
     * Verifica si existe al menos un centro de inteligencia construido
     */
    hasIntelCenter() {
        // Obtener equipo del jugador
        const myTeam = this.game.myTeam || 'ally';
        
        return this.game.nodes.some(n => 
            n.type === 'intelCenter' && 
            n.constructed && 
            !n.isAbandoning &&
            n.team === myTeam
        );
    }
    
    /**
     * Activa/desactiva el modo drone
     */
    toggleDroneMode() {
        // Verificar requisito de lanzadera
        if (!this.hasDroneLauncher()) {
            console.log(`⚠️ Necesitas construir una Lanzadera de Drones primero`);
            return;
        }
        
        if (!this.droneMode && !this.canAffordDrone()) {
            console.log(`⚠️ No tienes suficiente currency para dron (Necesitas: ${this.getDroneCost()})`);
            return;
        }
        
        // Salir del modo construcción si estaba activo
        if (this.buildMode) {
            this.exitBuildMode();
        }
        
        this.droneMode = !this.droneMode;
        const droneItem = document.getElementById('build-drone-item');
        
        if (droneItem) {
            droneItem.classList.toggle('active', this.droneMode);
        }
        
        if (this.droneMode) {
            this.game.selectedBase = null;
            this.game.canvas.style.cursor = 'crosshair';
            console.log('💣 Modo dron activado - Click en FOB enemigo');
        } else {
            this.game.canvas.style.cursor = 'default';
            console.log('💣 Modo dron desactivado');
        }
    }
    
    /**
     * Lanza un dron bomba hacia un objetivo
     * ⚠️ REFACTORIZADO: Ya no ejecuta lógica autoritativa - delega TODO al servidor
     */
    launchDrone(targetBase) {
        if (!targetBase) {
            console.log('⚠️ Objetivo no válido');
            return;
        }
        
        // Delegar TODO al servidor autoritativo
        if (!this.game.network || !this.game.network.roomId) {
            console.error('❌ No hay conexión al servidor. No se puede lanzar dron.');
            return;
        }
        
        console.log(`💣 Enviando drone_request: target=${targetBase.id}`);
        this.game.network.requestDrone(targetBase.id);
        
        this.exitDroneMode();
    }
    
    /**
     * Activa/desactiva el modo tanque
     * 🆕 NUEVO: Similar al modo dron pero para tanques
     */
    toggleTankMode() {
        if (!this.canAffordTank()) {
            console.log(`⚠️ No tienes suficiente currency para tanque (Necesitas: ${this.getTankCost()})`);
            return;
        }
        
        // Salir del modo construcción si estaba activo
        if (this.buildMode) {
            this.exitBuildMode();
        }
        
        // Salir de otros modos
        if (this.droneMode) {
            this.exitDroneMode();
        }
        if (this.commandoMode) {
            this.exitCommandoMode();
        }
        if (this.sniperMode) {
            this.exitSniperMode();
        }
        if (this.fobSabotageMode) {
            this.exitFobSabotageMode();
        }
        
        this.tankMode = !this.tankMode;
        
        if (this.tankMode) {
            this.game.selectedBase = null;
            this.game.canvas.style.cursor = 'crosshair';
            console.log('🛡️ Modo tanque activado - Click en edificio enemigo (NO FOBs ni HQs)');
        } else {
            this.game.canvas.style.cursor = 'default';
            console.log('🛡️ Modo tanque desactivado');
        }
    }
    
    /**
     * Lanza un tanque hacia un objetivo
     * 🆕 NUEVO: Similar al dron pero no puede atacar FOBs ni HQs
     */
    launchTank(targetBase) {
        if (!targetBase) {
            console.log('⚠️ Objetivo no válido');
            return;
        }
        
        // Validar que NO sea FOB ni HQ
        if (targetBase.type === 'fob' || targetBase.type === 'hq') {
            console.log('⚠️ El tanque no puede atacar FOBs ni HQs');
            return;
        }
        
        // Delegar TODO al servidor autoritativo
        if (!this.game.network || !this.game.network.roomId) {
            console.error('❌ No hay conexión al servidor. No se puede lanzar tanque.');
            return;
        }
        
        console.log(`🛡️ Enviando tank_request: target=${targetBase.id}`);
        this.game.network.requestTank(targetBase.id);
        
        this.exitTankMode();
    }
    
    /**
     * Sale del modo tanque
     */
    exitTankMode() {
        this.tankMode = false;
        this.game.canvas.style.cursor = 'default';
    }
    
    /**
     * Verifica si puede permitirse un tanque
     */
    canAffordTank() {
        return this.game.canAffordBuilding('tank');
    }
    
    /**
     * Obtiene el costo del tanque
     */
    getTankCost() {
        return this.getBuildingCost('tank');
    }
    
    /**
     * Sale del modo drone
     */
    exitDroneMode() {
        this.droneMode = false;
        const droneItem = document.getElementById('build-drone-item');
        if (droneItem) {
            droneItem.classList.remove('active');
        }
    }
    
    // ========================================
    // SISTEMA DE FRANCOTIRADOR
    // ========================================
    
    /**
     * Activa el modo francotirador
     */
    activateSniperMode() {
        // Verificar currency
        const sniperConfig = getNodeConfig('sniperStrike');
        if (!this.canAffordBuilding('sniperStrike')) {
            console.log(`⚠️ No tienes suficiente currency (Necesitas: ${sniperConfig.cost})`);
            return;
        }
        
        // Salir del modo construcción si estaba activo
        if (this.buildMode) {
            this.exitBuildMode();
        }
        
        this.sniperMode = true;
        this.sniperLastSpottedSound = 0; // Timestamp del último sonido spotted
        this.game.selectedBase = null;
        
        // Cursor personalizado con mira de sniper
        this.game.canvas.style.cursor = 'none'; // Ocultar cursor default
        
        console.log('🎯 Modo francotirador activado - Selecciona un frente enemigo');
        
        // Reproducir sonido spotted (primera vez)
        this.playSniperSpottedSound();
    }
    
    /**
     * Reproduce el sonido sniper_spotted con cooldown de 7s
     */
    playSniperSpottedSound() {
        const now = Date.now();
        const sniperConfig = getNodeConfig('sniperStrike');
        const cooldown = sniperConfig.spottedSoundCooldown * 1000; // 7s en ms
        
        if (now - this.sniperLastSpottedSound >= cooldown) {
            const audio = this.game.audio.sounds.sniperSpotted;
            audio.playbackRate = 1.15; // +15% velocidad
            audio.play();
            this.sniperLastSpottedSound = now;
        }
    }
    
    /**
     * Ejecuta el disparo de francotirador en un frente enemigo
     * ⚠️ REFACTORIZADO: Ya no ejecuta lógica autoritativa - delega TODO al servidor
     */
    executeSniperStrike(targetFront) {
        if (!targetFront) {
            console.log('⚠️ Objetivo no válido');
            this.exitSniperMode();
            return;
        }
        
        // Delegar TODO al servidor autoritativo
        if (!this.game.network || !this.game.network.roomId) {
            console.error('❌ No hay conexión al servidor. No se puede lanzar sniper.');
            return;
        }
        
        console.log(`🎯 Enviando sniper_request: target=${targetFront.id}`);
        this.game.network.requestSniper(targetFront.id);
        
        this.exitSniperMode();
    }
    
    /**
     * Sale del modo francotirador
     */
    exitSniperMode() {
        this.sniperMode = false;
        this.game.canvas.style.cursor = 'default';
    }
    
    /**
     * Activa el modo fobSabotage
     */
    activateFobSabotageMode() {
        // Verificar currency
        const fobSabotageConfig = getNodeConfig('fobSabotage');
        if (!this.canAffordBuilding('fobSabotage')) {
            console.log(`⚠️ No tienes suficiente currency (Necesitas: ${fobSabotageConfig.cost})`);
            return;
        }
        
        // Salir del modo construcción si estaba activo
        if (this.buildMode) {
            this.exitBuildMode();
        }
        
        this.fobSabotageMode = true;
        this.game.selectedBase = null;
        
        // Cursor personalizado con specops_selector
        this.game.canvas.style.cursor = 'none'; // Ocultar cursor default
        
        // Reproducir sonido de whisper con cooldown de 3 segundos
        if (this.game.audio && this.game.audio.playWhisperSound) {
            this.game.audio.playWhisperSound();
        }
        
        console.log('⚡ Modo sabotaje activado - Selecciona una FOB enemiga para aplicar penalización de velocidad');
    }
    
    /**
     * Ejecuta el acoso en una FOB enemiga
     * ⚠️ REFACTORIZADO: Ya no ejecuta lógica autoritativa - delega TODO al servidor
     */
    executeFobSabotage(targetFOB) {
        if (!targetFOB) {
            console.log('⚠️ Objetivo no válido');
            this.exitFobSabotageMode();
            return;
        }
        
        // Delegar TODO al servidor autoritativo
        if (!this.game.network || !this.game.network.roomId) {
            console.error('❌ No hay conexión al servidor. No se puede lanzar sabotaje.');
            return;
        }
        
        console.log(`⚡ Enviando fob_sabotage_request: target=${targetFOB.id}`);
        this.game.network.requestFobSabotage(targetFOB.id);
        
        this.exitFobSabotageMode();
    }
    
    /**
     * Sale del modo fobSabotage
     */
    exitFobSabotageMode() {
        this.fobSabotageMode = false;
        this.game.canvas.style.cursor = 'default';
    }
    
    /**
     * Activa el modo comando especial operativo
     * 🆕 NUEVO
     */
    activateCommandoMode() {
        // Verificar requisito de centro de inteligencia
        if (!this.hasIntelCenter()) {
            console.log(`⚠️ Necesitas construir un Centro de Inteligencia primero`);
            return;
        }
        
        // Verificar currency (usa serverBuildingConfig.costs.specopsCommando)
        if (!this.canAffordBuilding('specopsCommando')) {
            const commandoCost = this.getBuildingCost('specopsCommando');
            console.log(`⚠️ No tienes suficiente currency (Necesitas: ${commandoCost})`);
            return;
        }
        
        // Salir del modo construcción si estaba activo
        if (this.buildMode) {
            this.exitBuildMode();
        }
        
        // Salir de otros modos de consumibles
        if (this.fobSabotageMode) {
            this.exitFobSabotageMode();
        }
        if (this.sniperMode) {
            this.exitSniperMode();
        }
        if (this.droneMode) {
            this.exitDroneMode();
        }
        if (this.tankMode) {
            this.exitTankMode();
        }
        
        this.commandoMode = true;
        this.game.selectedBase = null;
        
        // Usar cursor normal de construcción (no personalizado)
        this.game.canvas.style.cursor = 'crosshair';
        
        console.log('🎖️ Modo comando especial operativo activado - Selecciona una posición en territorio enemigo para desplegar');
    }
    
    /**
     * Ejecuta el despliegue del comando especial operativo
     * 🆕 NUEVO: Delega TODO al servidor
     */
    executeCommandoDeploy(x, y) {
        // Delegar TODO al servidor autoritativo
        if (!this.game.network || !this.game.network.roomId) {
            console.error('❌ No hay conexión al servidor. No se puede desplegar comando.');
            return;
        }
        
        console.log(`🎖️ Enviando commando_deploy_request: x=${x}, y=${y}`);
        this.game.network.requestCommandoDeploy(x, y);
        
        this.exitCommandoMode();
    }
    
    /**
     * Sale del modo comando
     * 🆕 NUEVO
     */
    exitCommandoMode() {
        this.commandoMode = false;
        this.game.canvas.style.cursor = 'default';
    }
    
    /**
     * Verifica si el jugador tiene suficiente currency para un dron
     */
    canAffordDrone() {
        return this.game.getMissionCurrency() >= this.getDroneCost();
    }
    
    /**
     * Obtiene el estado actual
     */
    getState() {
        return {
            buildMode: this.buildMode,
            currency: this.game.getMissionCurrency(),
            fobCost: this.getFobCost(),
            canBuild: this.canAffordFOB()
        };
    }
    
    /**
     * Verifica si el jugador tiene suficiente currency para construir un FOB
     */
    canAffordFOB() {
        return this.game.getMissionCurrency() >= this.getFobCost();
    }
}







