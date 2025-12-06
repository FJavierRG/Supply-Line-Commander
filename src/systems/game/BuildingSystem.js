// ===== SISTEMA DE CONSTRUCCIÓN =====
import { getNodeConfig, getBuildableNodes, isNodeAvailableForRace } from '../../config/nodes.js';
import { getDefaultRace } from '../../config/races.js';
import { VisualNode } from '../../entities/visualNode.js';

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
        this.lightVehicleMode = false; // 🆕 NUEVO: Modo artillado ligero
        this.sniperMode = false;
        this.fobSabotageMode = false;
        this.commandoMode = false; // 🆕 NUEVO: Modo de despliegue de comando especial operativo
        this.truckAssaultMode = false; // 🆕 NUEVO: Modo de despliegue de truck assault
        this.cameraDroneMode = false; // 🆕 NUEVO: Modo de despliegue de camera drone
        this.artilleryMode = false; // 🆕 NUEVO: Modo de artillería
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
     * @param {boolean} showFeedback - Si true, muestra feedback visual cuando no se puede pagar
     * @returns {boolean} true si se puede pagar
     */
    canAffordBuilding(buildingId, showFeedback = false) {
        // Validación UI únicamente - la validación real está en el servidor
        // 🆕 NUEVO: Para drones, usar getDroneCost() que incluye el descuento del taller de drones
        const cost = this.isDroneWorkshopItem(buildingId)
            ? this.getDroneCost(buildingId)
            : this.getBuildingCost(buildingId);
        const canAfford = this.game.currency.canAfford(cost);
        
        // 🆕 NUEVO: Feedback visual si no puede pagar
        if (!canAfford && showFeedback && this.game.topBar) {
            this.game.topBar.triggerCurrencyShake();
        }
        
        return canAfford;
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
     * Obtiene el costo de un dron (proyectil o cámara)
     * 🆕 NUEVO: Aplica descuento del taller de drones si hay talleres activos y FOBs con suficientes suministros
     */
    getDroneCost(droneType = 'drone') {
        const baseCost = this.getBuildingCost(droneType);
        
        if (!this.isDroneWorkshopItem(droneType)) {
            return baseCost;
        }
        
        // Verificar si hay talleres de drones activos
        const myTeam = this.game.myTeam || 'ally';
        const droneWorkshops = this.game.nodes.filter(n => 
            n.type === 'droneWorkshop' && 
            n.team === myTeam && 
            n.active && 
            n.constructed &&
            !n.isAbandoning &&
            !n.disabled // 🆕 FIX: Taller roto no da descuento
        );
        
        if (droneWorkshops.length === 0) {
            return baseCost;
        }
        
        // Leer configuración del taller de drones desde el servidor
        const workshopConfig = this.game.serverBuildingConfig?.effects?.droneWorkshop || {};
        const requiredSupplies = workshopConfig.requiredSupplies || 0;
        const discountMultiplier = typeof workshopConfig.discountMultiplier === 'number'
            ? workshopConfig.discountMultiplier
            : 1;
        
        // Buscar FOBs aliados con suficientes suministros (si aplica)
        const fobs = this.game.nodes.filter(n => 
            n.type === 'fob' && 
            n.team === myTeam && 
            n.active && 
            n.constructed &&
            !n.isAbandoning &&
            (requiredSupplies <= 0 || (
                typeof n.supplies === 'number' &&
                n.supplies >= requiredSupplies
            ))
        );
        
        if (fobs.length === 0) {
            return baseCost;
        }
        
        // Aplicar descuento según configuración
        return Math.floor(baseCost * discountMultiplier);
    }

    /**
     * Determina si un building usa los descuentos del taller de drones
     */
    isDroneWorkshopItem(buildingId) {
        const discountedTypesConfig = this.game.serverBuildingConfig?.effects?.droneWorkshop?.discountedDroneTypes;
        const defaultTypes = ['drone'];
        const discountedTypes = Array.isArray(discountedTypesConfig) && discountedTypesConfig.length > 0
            ? discountedTypesConfig
            : defaultTypes;
        return discountedTypes.includes(buildingId);
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
        // 🆕 NUEVO: Para drones, usar getDroneCost() que incluye el descuento del taller de drones
        const actualCost = this.isDroneWorkshopItem(buildingId) ? this.getDroneCost(buildingId) : building.cost;
        if (!this.canAffordBuilding(buildingId, true)) {
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
        
        // Si es truckAssault, activar modo especial
        if (buildingId === 'truckAssault') {
            this.activateTruckAssaultMode();
            return;
        }
        
        // Si es cameraDrone, activar modo especial
        if (buildingId === 'cameraDrone') {
            this.activateCameraDroneMode();
            return;
        }
        
        // Si es tank, activar modo especial
        if (buildingId === 'tank') {
            this.toggleTankMode();
            return;
        }
        
        // 🆕 NUEVO: Si es lightVehicle, activar modo especial
        if (buildingId === 'lightVehicle') {
            this.toggleLightVehicleMode();
            return;
        }
        
        // 🆕 NUEVO: Si es worldDestroyer, activar modo especial
        if (buildingId === 'worldDestroyer') {
            this.activateWorldDestroyerMode();
            return;
        }
        
        // 🆕 NUEVO: Si es artillery, activar modo especial
        if (buildingId === 'artillery') {
            this.activateArtilleryMode();
            return;
        }
        
        // Activar modo construcción
        this.buildMode = true;
        this.currentBuildingType = buildingId;
        this.game.selectedBase = null;
        this.game.cursorManager.showCrosshair(); // 🆕 MODULARIZADO: Usar CursorManager
        
        console.log(`🔨 Modo construcción activado: ${building.name}`);
    }
    
    /**
     * Desactiva el modo construcción
     */
    deactivateBuildMode() {
        this.buildMode = false;
        this.currentBuildingType = null;
        this.game.cursorManager.reset(); // 🆕 MODULARIZADO: Usar CursorManager
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
        this.lightVehicleMode = false; // 🆕 NUEVO: Modo artillado ligero
        this.sniperMode = false;
        this.fobSabotageMode = false;
        this.commandoMode = false;
        this.truckAssaultMode = false;
        this.cameraDroneMode = false;
        this.artilleryMode = false;
        this.currentBuildingType = null;
    }
    
    /**
     * Verifica si el modo construcción O drone está activo
     */
    isActive() {
        return this.buildMode || this.droneMode || this.tankMode || this.lightVehicleMode || this.sniperMode || this.fobSabotageMode || this.commandoMode || this.truckAssaultMode || this.cameraDroneMode || this.artilleryMode;
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
            !n.disabled && // 🆕 FIX: No permitir si está deshabilitado/roto
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
            !n.disabled && // 🆕 FIX: No permitir si está deshabilitado/roto
            n.team === myTeam
        );
    }
    
    /**
     * 🆕 NUEVO: Verifica si existe al menos una Fábrica de Vehículos Artillados construida
     * Desbloquea tanque, artillado ligero y artillería
     */
    hasArmoredFactory() {
        const myTeam = this.game.myTeam || 'ally';
        
        return this.game.nodes.some(n =>
            n.type === 'armoredFactory' &&
            n.constructed &&
            !n.isAbandoning &&
            !n.disabled &&
            n.team === myTeam
        );
    }
    
    /**
     * Verifica si existe al menos una construcción prohibida construida
     * 🆕 NUEVO: Usado para desbloquear el consumible "Destructor de mundos"
     */
    hasDeadlyBuild() {
        // Obtener equipo del jugador
        const myTeam = this.game.myTeam || 'ally';
        
        return this.game.nodes.some(n => 
            n.type === 'deadlyBuild' && 
            n.constructed && 
            !n.isAbandoning &&
            !n.disabled && // 🆕 FIX: No permitir si está deshabilitado/roto
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
        
        if (!this.droneMode && !this.canAffordBuilding('drone', true)) {
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
            this.game.cursorManager.showCrosshair(); // 🆕 MODULARIZADO: Usar CursorManager
            console.log('💣 Modo dron activado - Click en FOB enemigo');
        } else {
            this.game.cursorManager.reset(); // 🆕 MODULARIZADO: Usar CursorManager
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
        // 🆕 Requisito: Fábrica de Vehículos Artillados
        if (!this.hasArmoredFactory()) {
            console.log('⚠️ Necesitas construir una Fábrica de Vehículos Artillados primero');
            return;
        }
        
        if (!this.canAffordTank(true)) {
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
            if (this.truckAssaultMode) {
                this.exitTruckAssaultMode();
            }
            if (this.artilleryMode) {
                this.exitArtilleryMode();
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
            this.game.cursorManager.showCrosshair(); // 🆕 MODULARIZADO: Usar CursorManager
            console.log('🛡️ Modo tanque activado - Click en edificio enemigo (NO FOBs ni HQs)');
        } else {
            this.game.cursorManager.reset(); // 🆕 MODULARIZADO: Usar CursorManager
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
        this.game.cursorManager.reset(); // 🆕 MODULARIZADO: Usar CursorManager
    }
    
    /**
     * Verifica si puede permitirse un tanque
     */
    canAffordTank(showFeedback = false) {
        return this.canAffordBuilding('tank', showFeedback);
    }
    
    /**
     * Obtiene el costo del tanque
     */
    getTankCost() {
        return this.getBuildingCost('tank');
    }
    
    /**
     * 🆕 NUEVO: Activa/desactiva el modo artillado ligero
     * Similar al modo tanque pero aplica broken en vez de destruir
     */
    toggleLightVehicleMode() {
        // 🆕 Requisito: Fábrica de Vehículos Artillados
        if (!this.hasArmoredFactory()) {
            console.log('⚠️ Necesitas construir una Fábrica de Vehículos Artillados primero');
            return;
        }
        
        if (!this.canAffordLightVehicle(true)) {
            console.log(`⚠️ No tienes suficiente currency para artillado ligero (Necesitas: ${this.getLightVehicleCost()})`);
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
            if (this.truckAssaultMode) {
                this.exitTruckAssaultMode();
            }
            if (this.artilleryMode) {
                this.exitArtilleryMode();
            }
        if (this.sniperMode) {
            this.exitSniperMode();
        }
        if (this.tankMode) {
            this.exitTankMode();
        }
        if (this.lightVehicleMode) {
            this.exitLightVehicleMode();
        }
        if (this.fobSabotageMode) {
            this.exitFobSabotageMode();
        }
        
        this.lightVehicleMode = !this.lightVehicleMode;
        
        if (this.lightVehicleMode) {
            this.game.selectedBase = null;
            this.game.cursorManager.showCrosshair(); // 🆕 MODULARIZADO: Usar CursorManager
            console.log('🚛 Modo artillado ligero activado - Click en edificio enemigo (NO FOBs ni HQs)');
        } else {
            this.game.cursorManager.reset(); // 🆕 MODULARIZADO: Usar CursorManager
            console.log('🚛 Modo artillado ligero desactivado');
        }
    }
    
    /**
     * 🆕 NUEVO: Lanza un artillado ligero hacia un objetivo
     * Similar al tanque pero aplica broken en vez de destruir
     */
    launchLightVehicle(targetBase) {
        if (!targetBase) {
            console.log('⚠️ Objetivo no válido');
            return;
        }
        
        // Validar que NO sea FOB ni HQ
        if (targetBase.type === 'fob' || targetBase.type === 'hq') {
            console.log('⚠️ El artillado ligero no puede atacar FOBs ni HQs');
            return;
        }
        
        // Delegar TODO al servidor autoritativo
        if (!this.game.network || !this.game.network.roomId) {
            console.error('❌ No hay conexión al servidor. No se puede lanzar artillado ligero.');
            return;
        }
        
        console.log(`🚛 Enviando light_vehicle_request: target=${targetBase.id}`);
        this.game.network.requestLightVehicle(targetBase.id);
        
        this.exitLightVehicleMode();
    }
    
    /**
     * 🆕 NUEVO: Sale del modo artillado ligero
     */
    exitLightVehicleMode() {
        this.lightVehicleMode = false;
        this.game.cursorManager.reset(); // 🆕 MODULARIZADO: Usar CursorManager
    }
    
    /**
     * 🆕 NUEVO: Verifica si puede permitirse un artillado ligero
     */
    canAffordLightVehicle(showFeedback = false) {
        return this.canAffordBuilding('lightVehicle', showFeedback);
    }
    
    /**
     * 🆕 NUEVO: Obtiene el costo del artillado ligero
     */
    getLightVehicleCost() {
        return this.getBuildingCost('lightVehicle');
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
        // 🆕 FIX: Requisito de Centro de Inteligencia (edificio de operaciones especiales)
        if (!this.hasIntelCenter()) {
            console.log('⚠️ Necesitas construir un Centro de Inteligencia primero');
            return;
        }
        
        // Verificar currency
        const sniperConfig = getNodeConfig('sniperStrike');
        if (!this.canAffordBuilding('sniperStrike', true)) {
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
        this.game.cursorManager.showSniper(); // 🆕 MODULARIZADO: Usar CursorManager
        
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
        this.game.cursorManager.reset(); // 🆕 MODULARIZADO: Usar CursorManager
    }
    
    /**
     * Activa el modo fobSabotage
     */
    activateFobSabotageMode() {
        // 🆕 FIX: Requisito de Centro de Inteligencia (edificio de operaciones especiales)
        if (!this.hasIntelCenter()) {
            console.log('⚠️ Necesitas construir un Centro de Inteligencia primero');
            return;
        }
        
        // Verificar currency
        const fobSabotageConfig = getNodeConfig('fobSabotage');
        if (!this.canAffordBuilding('fobSabotage', true)) {
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
        this.game.cursorManager.showFobSabotage(); // 🆕 MODULARIZADO: Usar CursorManager
        
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
        this.game.cursorManager.reset(); // 🆕 MODULARIZADO: Usar CursorManager
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
        if (!this.canAffordBuilding('specopsCommando', true)) {
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
        if (this.lightVehicleMode) {
            this.exitLightVehicleMode();
        }
        
        this.commandoMode = true;
        this.game.selectedBase = null;
        
        // Usar cursor normal de construcción (no personalizado)
        this.game.cursorManager.showCrosshair(); // 🆕 MODULARIZADO: Usar CursorManager
        
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
        this.game.cursorManager.reset(); // 🆕 MODULARIZADO: Usar CursorManager
    }
    
    /**
     * Activa el modo truck assault
     * 🆕 NUEVO
     */
    activateTruckAssaultMode() {
        // Verificar requisito de centro de inteligencia
        if (!this.hasIntelCenter()) {
            console.log(`⚠️ Necesitas construir un Centro de Inteligencia primero`);
            return;
        }
        
        // Verificar currency
        if (!this.canAffordBuilding('truckAssault', true)) {
            const truckAssaultCost = this.getBuildingCost('truckAssault');
            console.log(`⚠️ No tienes suficiente currency (Necesitas: ${truckAssaultCost})`);
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
        if (this.lightVehicleMode) {
            this.exitLightVehicleMode();
        }
        if (this.commandoMode) {
            this.exitCommandoMode();
        }
        
        this.truckAssaultMode = true;
        this.game.selectedBase = null;
        
        // Usar cursor normal de construcción
        this.game.cursorManager.showCrosshair(); // 🆕 MODULARIZADO: Usar CursorManager
        
        console.log('🚛 Modo truck assault activado - Selecciona una posición en territorio enemigo para desplegar');
    }
    
    /**
     * Activa el modo camera drone
     * 🆕 NUEVO
     */
    activateCameraDroneMode() {
        // Verificar requisito de lanzadera de drones
        if (!this.hasDroneLauncher()) {
            console.log(`⚠️ Necesitas construir una Lanzadera de Drones primero`);
            return;
        }
        
        // Verificar currency
        if (!this.canAffordBuilding('cameraDrone', true)) {
            const cameraDroneCost = this.getBuildingCost('cameraDrone');
            console.log(`⚠️ No tienes suficiente currency (Necesitas: ${cameraDroneCost})`);
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
        if (this.lightVehicleMode) {
            this.exitLightVehicleMode();
        }
            if (this.commandoMode) {
                this.exitCommandoMode();
            }
            if (this.truckAssaultMode) {
                this.exitTruckAssaultMode();
            }
            if (this.artilleryMode) {
                this.exitArtilleryMode();
            }
        
        this.cameraDroneMode = true;
        this.game.selectedBase = null;
        
        // Usar cursor normal de construcción
        this.game.cursorManager.showCrosshair(); // 🆕 MODULARIZADO: Usar CursorManager
        
        console.log('📹 Modo camera drone activado - Selecciona una posición en territorio enemigo para desplegar');
    }
    
    /**
     * Ejecuta el despliegue del camera drone
     * 🆕 NUEVO: Delega TODO al servidor
     */
    executeCameraDroneDeploy(x, y) {
        // Delegar TODO al servidor autoritativo
        if (!this.game.network || !this.game.network.roomId) {
            console.error('❌ No hay conexión al servidor. No se puede desplegar camera drone.');
            return;
        }
        
        console.log(`📹 Enviando camera_drone_deploy_request: x=${x}, y=${y}`);
        this.game.network.requestCameraDroneDeploy(x, y);
        
        this.exitCameraDroneMode();
    }
    
    /**
     * Sale del modo camera drone
     * 🆕 NUEVO
     */
    exitCameraDroneMode() {
        this.cameraDroneMode = false;
        this.game.cursorManager.reset(); // 🆕 MODULARIZADO: Usar CursorManager
    }
    
    /**
     * Activa el modo Destructor de mundos
     * 🆕 NUEVO: No requiere posición, se activa inmediatamente
     */
    activateWorldDestroyerMode() {
        // Verificar requisito de Construcción Prohibida
        if (!this.hasDeadlyBuild()) {
            console.log(`⚠️ Necesitas construir una Construcción Prohibida primero`);
            return;
        }
        
        // Verificar currency
        if (!this.canAffordBuilding('worldDestroyer', true)) {
            const worldDestroyerCost = this.getBuildingCost('worldDestroyer');
            console.log(`⚠️ No tienes suficiente currency (Necesitas: ${worldDestroyerCost})`);
            return;
        }
        
        // Delegar TODO al servidor autoritativo
        if (!this.game.network || !this.game.network.roomId) {
            console.error('❌ No hay conexión al servidor. No se puede activar el Destructor de mundos.');
            return;
        }
        
        console.log(`☠️ Activando Destructor de mundos...`);
        this.game.network.requestWorldDestroyer();
    }
    
    /**
     * Activa el modo artillería
     * 🆕 NUEVO
     */
    activateArtilleryMode() {
        // 🆕 Requisito: Fábrica de Vehículos Artillados
        if (!this.hasArmoredFactory()) {
            console.log('⚠️ Necesitas construir una Fábrica de Vehículos Artillados primero');
            return;
        }
        
        // Verificar currency
        if (!this.canAffordBuilding('artillery', true)) {
            const artilleryCost = this.getBuildingCost('artillery');
            console.log(`⚠️ No tienes suficiente currency (Necesitas: ${artilleryCost})`);
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
        if (this.lightVehicleMode) {
            this.exitLightVehicleMode();
        }
            if (this.commandoMode) {
                this.exitCommandoMode();
            }
            if (this.truckAssaultMode) {
                this.exitTruckAssaultMode();
            }
            if (this.artilleryMode) {
                this.exitArtilleryMode();
            }
        if (this.cameraDroneMode) {
            this.exitCameraDroneMode();
        }
        
        this.artilleryMode = true;
        this.game.selectedBase = null;
        
        // Ocultar cursor del navegador para mostrar sprite de artillery
        this.game.cursorManager.showArtillery(); // 🆕 MODULARIZADO: Usar CursorManager
        
        console.log('💣 Modo artillería activado - Selecciona un área en el mapa para bombardear');
    }
    
    /**
     * Ejecuta el bombardeo de artillería
     * 🆕 NUEVO: Delega TODO al servidor
     */
    executeArtilleryLaunch(x, y) {
        // Delegar TODO al servidor autoritativo
        if (!this.game.network || !this.game.network.roomId) {
            console.error('❌ No hay conexión al servidor. No se puede lanzar artillería.');
            return;
        }
        
        console.log(`💣 Enviando artillery_request: x=${x}, y=${y}`);
        this.game.network.requestArtilleryLaunch(x, y);
        
        this.exitArtilleryMode();
    }
    
    /**
     * Sale del modo artillería
     * 🆕 NUEVO
     */
    exitArtilleryMode() {
        this.artilleryMode = false;
        this.game.cursorManager.reset(); // 🆕 MODULARIZADO: Usar CursorManager
    }
    
    /**
     * Ejecuta el despliegue del truck assault
     * 🆕 NUEVO: Delega TODO al servidor
     */
    executeTruckAssaultDeploy(x, y) {
        // Delegar TODO al servidor autoritativo
        if (!this.game.network || !this.game.network.roomId) {
            console.error('❌ No hay conexión al servidor. No se puede desplegar truck assault.');
            return;
        }
        
        console.log(`🚛 Enviando truck_assault_deploy_request: x=${x}, y=${y}`);
        this.game.network.requestTruckAssaultDeploy(x, y);
        
        this.exitTruckAssaultMode();
    }
    
    /**
     * Sale del modo truck assault
     * 🆕 NUEVO
     */
    exitTruckAssaultMode() {
        this.truckAssaultMode = false;
        this.game.cursorManager.reset(); // 🆕 MODULARIZADO: Usar CursorManager
    }
    
    /**
     * Obtiene el estado actual
     */
    getState() {
        return {
            buildMode: this.buildMode,
            currency: this.game.getMissionCurrency(),
            fobCost: this.getFobCost(),
            canBuild: this.canAffordBuilding('fob')
        };
    }
}







