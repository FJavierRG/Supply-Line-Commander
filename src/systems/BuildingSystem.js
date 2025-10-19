// ===== SISTEMA DE CONSTRUCCIÓN =====
import { FOB_CURRENCY_CONFIG } from '../config/constants.js';
import { getNodeConfig, getBuildableNodes } from '../config/nodes.js';
import { MapNode } from '../entities/MapNode.js';

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
        this.currentBuildingType = null; // Tipo de edificio que se está construyendo actualmente
        this.minDistance = 80; // Distancia mínima entre bases
    }
    
    /**
     * Obtiene el costo de un edificio
     * @param {string} buildingId - ID del edificio
     * @returns {number} Costo del edificio
     */
    getBuildingCost(buildingId) {
        const building = getBuildingConfig(buildingId);
        return building ? building.cost : 0;
    }
    
    /**
     * Verifica si se puede pagar un edificio
     * @param {string} buildingId - ID del edificio
     * @returns {boolean} true si se puede pagar
     */
    canAffordBuilding(buildingId) {
        const cost = this.getBuildingCost(buildingId);
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
     */
    getDroneCost() {
        return this.getBuildingCost('drone');
    }
    
    /**
     * Activa el modo construcción para un tipo de edificio específico
     * @param {string} buildingId - ID del edificio a construir
     */
    activateBuildMode(buildingId) {
        // Tutorial: Verificar permisos
        if (this.game.tutorialManager && this.game.tutorialManager.isTutorialActive) {
            if (buildingId === 'fob' && !this.game.tutorialManager.isActionAllowed('canBuildFOB')) {
                console.log('⚠️ Tutorial: No puedes construir FOBs aún');
                return;
            }
            if (buildingId !== 'fob' && !this.game.tutorialManager.isActionAllowed('canBuildOther')) {
                console.log('⚠️ Tutorial: No puedes construir esto aún');
                return;
            }
        }
        
        const building = getBuildingConfig(buildingId);
        if (!building) {
            console.warn(`⚠️ Edificio desconocido: ${buildingId}`);
            return;
        }
        
        // Verificar si tiene suficiente currency
        if (!this.canAffordBuilding(buildingId)) {
            console.log(`⚠️ No tienes suficiente currency (Necesitas: ${building.cost}, Tienes: ${this.game.getMissionCurrency()})`);
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
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     */
    placeBuilding(x, y) {
        if (!this.buildMode || !this.currentBuildingType) return;
        
        const buildingId = this.currentBuildingType;
        const buildingConfig = getBuildingConfig(buildingId);
        
        if (!buildingConfig) {
            console.warn(`⚠️ Configuración de edificio no encontrada: ${buildingId}`);
            this.deactivateBuildMode();
            return;
        }
        
        // Verificar currency disponible
        if (!this.canAffordBuilding(buildingId)) {
            console.log(`⚠️ No tienes suficiente currency`);
            this.deactivateBuildMode();
            return;
        }
        
        // === MULTIJUGADOR: Enviar solicitud al servidor ===
        if (this.game.isMultiplayer && this.game.network) {
            console.log(`🏗️ MULTIJUGADOR: Enviando build_request: ${buildingId} en (${x}, ${y})`);
            this.game.network.requestBuild(buildingId, x, y);
            
            // Desactivar modo construcción (optimista)
            this.deactivateBuildMode();
            
            // El servidor validará y enviará building_created
            return;
        }
        
        // === SINGLEPLAYER: Construir localmente ===
        
        // Verificar que esté dentro del territorio aliado
        // (proyectiles como dron/sniper no se limitan, pero no usan este método)
        if (!this.game.territory.isInAllyTerritory(x, y)) {
            console.log('⚠️ Solo puedes construir en territorio aliado');
            return;
        }
        
        // Verificar que no esté muy cerca de otras bases o edificios
        if (!this.isValidLocation(x, y)) {
            console.log('⚠️ Muy cerca de otra base/edificio');
            return;
        }
        
        // Gastar currency
        if (!this.game.spendMissionCurrency(buildingConfig.cost)) {
            console.log('❌ Error al gastar currency');
            this.deactivateBuildMode();
            return;
        }
        
        // Crear nodo usando BaseFactory (funciona para FOBs y edificios)
        const newNode = this.game.baseFactory.createBase(x, y, buildingConfig.id, {
            isConstructed: true
        });
        
        if (newNode) {
            // En tutorial, agregar al array de nodos del tutorial
            if (this.game.state === 'tutorial' && this.game.tutorialManager?.tutorialNodes) {
                this.game.tutorialManager.tutorialNodes.push(newNode);
                
                // Tutorial: Hardcodear FOB con 0 suministros (aislado del resto del juego)
                if (buildingId === 'fob') {
                    newNode.supplies = 0;
                    console.log('🎓 Tutorial: FOB construido con 0 suministros');
                }
            } else {
                this.game.nodes.push(newNode);
            }
            
            // Tutorial: Detectar si construyó un FOB
            if (buildingId === 'fob' && this.game.tutorialManager && this.game.tutorialManager.isTutorialActive) {
                this.game.tutorialManager.notifyAction('fob_built', { buildingId });
            }
            
            // Registrar acción en la IA enemiga para que pueda reaccionar
            if (buildingConfig.id === 'antiDrone' || 
                buildingConfig.id === 'nuclearPlant' || 
                buildingConfig.id === 'campaignHospital') {
                this.game.enemyAI.registerPlayerAction(buildingConfig.id, { x, y });
                // También notificar al AIDirector si está en modo híbrido
                if (this.game.aiDirector && this.game.aiSystemMode !== 'legacy') {
                    this.game.aiDirector.onPlayerAction(buildingConfig.id, { x, y });
                }
            }
        }
        
        // Reproducir sonido de construcción
        this.game.audio.playPlaceBuildingSound();
        
        // Incrementar contador de edificios construidos
        this.game.matchStats.buildingsBuilt++;
        
        console.log(`✅ ${buildingConfig.name} construido en (${x.toFixed(0)}, ${y.toFixed(0)})`);
        
        // Desactivar modo construcción
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
    isValidLocation(x, y) {
        for (const base of this.game.bases) {
            const dist = Math.hypot(x - base.x, y - base.y);
            if (dist < this.minDistance) {
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
        this.currentBuildingType = null;
    }
    
    /**
     * Verifica si el modo construcción O drone está activo
     */
    isActive() {
        return this.buildMode || this.droneMode || this.sniperMode;
    }
    
    /**
     * Verifica si existe al menos una lanzadera de drones construida
     */
    hasDroneLauncher() {
        // Obtener equipo del jugador (soporta singleplayer y multiplayer)
        const myTeam = this.game.myTeam || 'ally';
        
        return this.game.nodes.some(n => 
            n.type === 'droneLauncher' && 
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
            this.game.canvas.style.cursor = 'crosshair';
            console.log('💣 Modo dron desactivado');
        }
    }
    
    /**
     * Lanza un dron bomba hacia un objetivo
     */
    launchDrone(targetBase) {
        // VALIDACIÓN: Objetivo no vacío
        if (!targetBase) {
            console.log('⚠️ Objetivo no válido');
            return;
        }
        
        // Validar que sea un objetivo enemigo válido (edificios construibles, no HQ ni frentes)
        const validTargetTypes = ['fob', 'nuclearPlant', 'antiDrone', 'campaignHospital', 'droneLauncher', 'truckFactory', 'engineerCenter'];
        const isEnemyTarget = targetBase.team !== this.game.myTeam && validTargetTypes.includes(targetBase.type);
        
        if (!isEnemyTarget) {
            // Mensajes específicos según qué intentó atacar
            if (targetBase.type === 'hq') {
                console.log('⚠️ No puedes atacar HQs');
            } else if (targetBase.type === 'front') {
                console.log('⚠️ No puedes atacar frentes');
            } else if (targetBase.team === this.game.myTeam) {
                console.log('⚠️ No puedes atacar tus propias bases');
            } else {
                console.log('⚠️ Solo puedes atacar edificios enemigos (FOBs, plantas nucleares, anti-drones, hospitales, etc.)');
            }
            return;
        }
        
        // Verificar currency disponible
        if (!this.canAffordDrone()) {
            console.log(`⚠️ No tienes suficiente currency (Necesitas: ${this.getDroneCost()})`);
            this.exitDroneMode();
            return;
        }
        
        // === MULTIJUGADOR: Enviar solicitud al servidor ===
        if (this.game.isMultiplayer && this.game.network) {
            console.log(`💣 Enviando drone_request al servidor: target=${targetBase.id}`);
            this.game.network.requestDrone(targetBase.id);
            this.exitDroneMode();
            return;
        }
        
        // === SINGLEPLAYER: Ejecutar localmente ===
        
        // Gastar currency
        if (!this.game.spendMissionCurrency(this.getDroneCost())) {
            console.log('❌ Error al gastar currency');
            this.exitDroneMode();
            return;
        }
        
        // Crear proyectil dron desde el borde izquierdo
        const droneStartX = 0;
        const droneStartY = targetBase.y;
        
        if (!this.game.droneSystem) {
            console.error('❌ DroneSystem no inicializado');
            return;
        }
        
        this.game.droneSystem.launchDrone(droneStartX, droneStartY, targetBase);
        this.game.matchStats.dronesLaunched++;
        
        console.log(`💣 Dron lanzado hacia ${targetBase.type} enemigo`);
        
        // Desactivar modo drone
        this.exitDroneMode();
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
     */
    executeSniperStrike(targetFront) {
        // VALIDACIÓN: Solo frentes enemigos
        const isEnemyFront = targetFront.team !== this.game.myTeam && targetFront.type === 'front';
        
        if (!targetFront || !isEnemyFront) {
            console.log('⚠️ Solo puedes atacar frentes enemigos con el francotirador');
            return;
        }
        
        const sniperConfig = getNodeConfig('sniperStrike');
        
        // Verificar currency
        if (!this.canAffordBuilding('sniperStrike')) {
            console.log(`⚠️ No tienes suficiente currency (Necesitas: ${sniperConfig.cost})`);
            this.exitSniperMode();
            return;
        }
        
        // === MULTIJUGADOR: Enviar solicitud al servidor ===
        if (this.game.isMultiplayer && this.game.network) {
            console.log(`🎯 Enviando sniper_request al servidor: target=${targetFront.id}`);
            this.game.network.requestSniper(targetFront.id);
            this.exitSniperMode();
            return;
        }
        
        // === SINGLEPLAYER: Ejecutar localmente ===
        
        // Gastar currency
        if (!this.game.spendMissionCurrency(sniperConfig.cost)) {
            console.log('❌ Error al gastar currency');
            this.exitSniperMode();
            return;
        }
        
        // Reproducir sonido de disparo de francotirador
        this.game.audio.sounds.sniperShoot.play();
        
        // Aplicar efecto "wounded" directamente (sin emergencia médica)
        if (this.game.medicalSystem) {
            this.game.medicalSystem.applyPenalty(targetFront);
            this.game.matchStats.snipersLaunched++;
            console.log(`🎯 Francotirador disparó al frente enemigo - Efecto wounded aplicado!`);
        } else {
            console.log('⚠️ Sistema de emergencias médicas no disponible');
        }
        
        // Crear sprite flotante de sniper kill feed
        this.game.particleSystem.createFloatingSprite(targetFront.x, targetFront.y - 40, 'ui-sniper-kill');
        
        // Desactivar modo sniper
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







