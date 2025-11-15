// ===== SISTEMA DE DEFENSA ANTI-DRONES (SOLO VISUAL) =====
// ⚠️ IMPORTANTE: Este sistema SOLO muestra efectos visuales cuando el servidor notifica disparos.
// NO ejecuta lógica de combate ni destruye drones - el servidor es la autoridad.

import { getNodeConfig } from '../config/nodes.js';

export class AntiDroneSystem {
    constructor(game) {
        this.game = game;
        this.antiDroneBuildings = []; // Array de edificios anti-drone activos
        this.lastShotTimes = new Map(); // Para trackear cooldowns por edificio
        this.alertSoundPlayed = new Map(); // Para trackear si ya se reprodujo el sonido de alerta
        
        // Configuración por defecto (se puede sobrescribir por edificio)
        const antiDroneConfig = getNodeConfig('antiDrone');
        this.defaultDetectionRange = antiDroneConfig?.detectionRange || 200;
        this.defaultAlertRange = antiDroneConfig?.alertRange || 250;
        this.defaultCooldownTime = antiDroneConfig?.cooldownTime || 3000;
    }
    
    /**
     * Actualiza todos los edificios anti-drone
     * ⚠️ LEGACY REMOVED: El servidor maneja toda la lógica de combate anti-drone.
     * El cliente solo renderiza los efectos visuales cuando el servidor notifica un disparo.
     * @param {number} dt - Delta time en milisegundos
     */
    update(dt) {
        // El servidor autoritativo maneja toda la detección y combate anti-drone.
        // El cliente solo renderiza efectos visuales cuando el servidor envía eventos de disparo.
        // TODO: Mantener solo la lógica de renderizado/efectos visuales si es necesaria.
        
        // Actualizar lista de edificios anti-drone activos (solo para renderizado)
        this.updateAntiDroneBuildings();
        
        // ⚠️ LEGACY REMOVED: NO verificar drones ni disparar aquí - el servidor maneja esto
        // El servidor enviará eventos cuando un anti-drone dispare y destruya un drone
    }
    
    /**
     * Actualiza la lista de edificios anti-drone activos
     */
    updateAntiDroneBuildings() {
        this.antiDroneBuildings = this.game.nodes.filter(node => 
            node.type === 'antiDrone' && 
            node.constructed === true && // Solo edificios terminados
            node.isConstructing === false // No están construyéndose
        );
        
        // Separar entre aliados y enemigos (usando team en lugar de isEnemy)
        const myTeam = this.game.myTeam || 'ally';
        this.allyAntiDrones = this.antiDroneBuildings.filter(b => b.team === myTeam);
        this.enemyAntiDrones = this.antiDroneBuildings.filter(b => b.team !== myTeam);
    }
    
    /**
     * === LEGACY REMOVED: checkForDrones() eliminado ===
     * El servidor maneja toda la detección y combate anti-drone.
     * Ver: server/game/handlers/CombatHandler.js
     */
    
    /**
     * Verifica si un edificio puede disparar (SOLO VISUAL para UI)
     * @param {Building} building - Edificio anti-drone
     * @returns {boolean} True si puede disparar (visual)
     */
    canShoot(building) {
        const lastShot = this.lastShotTimes.get(building.id) || 0;
        const timeSinceLastShot = Date.now() - lastShot;
        const cooldownTime = this.getBuildingCooldownTime(building);
        return timeSinceLastShot >= cooldownTime;
    }
    
    /**
     * Obtiene el rango de detección de un edificio
     * @param {Building} building - Edificio anti-drone
     * @returns {number} Rango de detección en píxeles
     */
    getBuildingDetectionRange(building) {
        const config = getNodeConfig(building.type);
        return config?.detectionRange || this.defaultDetectionRange;
    }
    
    /**
     * Obtiene el tiempo de cooldown de un edificio
     * @param {Building} building - Edificio anti-drone
     * @returns {number} Cooldown en milisegundos
     */
    getBuildingCooldownTime(building) {
        const config = getNodeConfig(building.type);
        return config?.cooldownTime || this.defaultCooldownTime;
    }
    
    /**
     * Obtiene el rango de alerta de un edificio
     * @param {Building} building - Edificio anti-drone
     * @returns {number} Rango de alerta en píxeles
     */
    getBuildingAlertRange(building) {
        const config = getNodeConfig(building.type);
        return config?.alertRange || this.defaultAlertRange;
    }
    
    /**
     * Encuentra el drone más cercano en rango de detección (SOLO VISUAL para UI)
     * @param {Building} building - Edificio anti-drone
     * @param {Array} drones - Array de drones activos
     * @returns {Object|null} Drone en rango o null
     */
    findDroneInRange(building, drones) {
        let closestDrone = null;
        const detectionRange = this.getBuildingDetectionRange(building);
        let closestDistance = detectionRange;
        
        for (const drone of drones) {
            const distance = Math.hypot(
                drone.x - building.x,
                drone.y - building.y
            );
            
            if (distance <= detectionRange && distance < closestDistance) {
                closestDrone = drone;
                closestDistance = distance;
            }
        }
        
        return closestDrone;
    }
    
    /**
     * Encuentra el drone más cercano en rango de alerta (SOLO VISUAL para UI)
     * @param {Building} building - Edificio anti-drone
     * @param {Array} drones - Array de drones activos
     * @returns {Object|null} Drone en rango de alerta o null
     */
    findDroneInAlertRange(building, drones) {
        const alertRange = this.getBuildingAlertRange(building);
        
        for (const drone of drones) {
            const distance = Math.hypot(
                drone.x - building.x,
                drone.y - building.y
            );
            
            if (distance <= alertRange) {
                return drone; // Retornar el primer dron en rango de alerta
            }
        }
        
        return null;
    }
    
    /**
     * Dispara contra un drone y muestra efectos visuales (SOLO VISUAL)
     * El servidor maneja la lógica de disparo y destrucción.
     * Este método debe llamarse cuando el servidor notifica un disparo.
     * @param {Building} building - Edificio que dispara
     * @param {Object} drone - Drone objetivo
     */
    shootDrone(building, drone) {
        // Marcar cooldown (solo visual para UI)
        this.lastShotTimes.set(building.id, Date.now());
        
        // Detener sonido del dron al ser destruido (usando ID único)
        if (drone.id) {
            this.game.audio.stopDroneSound(drone.id);
        }
        
        // Crear efecto visual de disparo
        this.createShotEffect(building, drone);
        
        // Crear partículas de explosión del drone (gris)
        this.game.particleSystem.createExplosion(
            drone.x, 
            drone.y, 
            8, // Número de partículas
            '#808080', // Color gris para explosión de drone
            800 // Duración en ms
        );
        
        // 🆕 NUEVO: Crear animación de explosión de dron (2 frames)
        if (this.game.particleSystem.createDroneExplosionSprite) {
            this.game.particleSystem.createDroneExplosionSprite(drone.x, drone.y);
        }
        
        // Crear cráter del dron destruido (50% del tamaño de edificios)
        this.game.particleSystem.createImpactMark(drone.x, drone.y, 'impact_icon', 0.5);
        
        // Sonido de disparo anti-drone
        this.game.audio.playBomShootSound();
        
        console.log(`🎯 Anti-dron disparó (visual only - servidor maneja estado)`);
    }
    
    /**
     * Crea efecto visual del disparo
     * @param {Building} building - Edificio que dispara
     * @param {Object} drone - Drone objetivo
     */
    createShotEffect(building, drone) {
        // Crear línea de disparo (proyectil visual)
        const dx = drone.x - building.x;
        const dy = drone.y - building.y;
        const distance = Math.hypot(dx, dy);
        
        // Crear partículas a lo largo de la línea de disparo
        const particles = 5;
        for (let i = 0; i < particles; i++) {
            const t = i / (particles - 1);
            const x = building.x + dx * t;
            const y = building.y + dy * t;
            
            this.game.particleSystem.createParticle(
                x, y,
                0, 0, // Sin velocidad
                '#ffff00', // Amarillo para el disparo
                300 // Duración corta
            );
        }
    }
    
    /**
     * Muestra efectos visuales cuando un edificio anti-drone se consume (SOLO VISUAL)
     * El servidor maneja la destrucción del edificio.
     * Este método debe llamarse cuando el servidor notifica que el edificio se consumió.
     * @param {Building} building - Edificio consumido
     */
    destroyAntiDroneBuilding(building) {
        // Limpiar flags del edificio (solo visual para UI)
        this.alertSoundPlayed.delete(building.id);
        this.lastShotTimes.delete(building.id);
        
        // Crear explosión del edificio
        this.game.particleSystem.createExplosion(
            building.x, 
            building.y, 
            15, // Más partículas para la explosión del edificio
            '#ff4444', // Rojo para explosión del edificio
            1200 // Duración más larga
        );
        
        // Sonido de explosión del edificio
        this.game.audio.playSound('explosion');
        
        console.log(`Edificio anti-dron consumido (visual only - servidor maneja estado)`);
    }
    
    /**
     * Renderiza debug visual del sistema (rangos de detección)
     * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
     */
    renderDebug(ctx) {
        if (!this.game.debugMode) return;
        
        ctx.save();
        
        for (const building of this.antiDroneBuildings) {
            const range = this.getBuildingDetectionRange(building);
            const canShoot = this.canShoot(building);
            
            // Círculo de rango de detección
            ctx.strokeStyle = canShoot ? '#00ff00' : '#ff0000'; // Verde si puede disparar, rojo si en cooldown
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]); // Línea punteada
            ctx.beginPath();
            ctx.arc(building.x, building.y, range, 0, Math.PI * 2);
            ctx.stroke();
            
            // Texto de estado
            ctx.fillStyle = canShoot ? '#00ff00' : '#ff0000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
                canShoot ? 'READY' : 'COOLDOWN',
                building.x,
                building.y - range - 10
            );
        }
        
        ctx.restore();
    }
    
    /**
     * Obtiene información de debug del sistema
     * @returns {Object} Información de debug
     */
    getDebugInfo() {
        return {
            activeBuildings: this.antiDroneBuildings.length,
            defaultDetectionRange: this.defaultDetectionRange,
            defaultCooldownTime: this.defaultCooldownTime,
            buildingsOnCooldown: this.antiDroneBuildings.filter(building => 
                !this.canShoot(building)
            ).length
        };
    }
    
    /**
     * 🆕 FIX: Limpia completamente el estado del sistema
     */
    clear() {
        this.antiDroneBuildings = [];
        this.lastShotTimes.clear();
        this.alertSoundPlayed.clear();
        if (this.allyAntiDrones) this.allyAntiDrones = [];
        if (this.enemyAntiDrones) this.enemyAntiDrones = [];
    }
}
