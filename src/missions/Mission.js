// ===== CLASE BASE: MISIÓN =====
import { MapNode } from '../entities/MapNode.js';
import { GAME_CONFIG } from '../config/constants.js';

/**
 * Clase base para todas las misiones.
 * Cada misión individual extenderá esta clase y definirá su configuración específica.
 */
export class Mission {
    constructor() {
        // Metadata de la misión
        this.number = 0;
        this.name = '';
        this.description = '';
        this.objectives = '';
        
        // Configuración de tiempo
        this.duration = 90; // segundos
        
        // Configuración de nodos
        this.nodesConfig = {
            fobs: [],         // Array de configuración de FOBs aliados
            fronts: [],       // Array de configuración de Frentes aliados
            enemyFronts: [],  // Array de configuración de Frentes enemigos
            enemyFobs: [],    // Array de configuración de FOBs enemigos
            enemyHQ: null     // Configuración del HQ enemigo (solo 1)
        };
        
        // Configuración de recursos iniciales
        this.initialResources = {
            fuel: 100,
            supplies: 100
        };
        
        // Eventos habilitados
        this.eventsEnabled = false;
        
        // Condiciones de victoria/derrota personalizadas (futuro)
        this.customWinCondition = null;
        this.customLoseCondition = null;
    }
    
    /**
     * Genera las bases para esta misión
     * @param {number} canvasWidth - Ancho del canvas
     * @param {number} canvasHeight - Alto del canvas
     * @param {Object} baseFactory - Factory para crear bases con upgrades
     * @returns {Base[]} Array de bases generadas
     */
    generateBases(canvasWidth, canvasHeight, baseFactory) {
        const bases = [];
        const margin = 100;
        
        // 1. Generar HQ (siempre presente)
        const hq = this.generateHQ(canvasWidth, canvasHeight, margin, baseFactory);
        bases.push(hq);
        
        // 2. Generar FOBs según configuración
        this.nodesConfig.fobs.forEach(fobConfig => {
            const fob = this.generateNode('fob', fobConfig, canvasWidth, canvasHeight, margin, baseFactory);
            bases.push(fob);
        });
        
        // 3. Generar Frentes según configuración
        this.nodesConfig.fronts.forEach(frontConfig => {
            const front = this.generateNode('front', frontConfig, canvasWidth, canvasHeight, margin, baseFactory);
            bases.push(front);
        });
        
        // 4. Generar Frentes Enemigos según configuración - Ahora como player2
        if (this.nodesConfig.enemyFronts) {
            this.nodesConfig.enemyFronts.forEach(enemyFrontConfig => {
                const enemyFront = this.generateNode('front', enemyFrontConfig, canvasWidth, canvasHeight, margin, baseFactory, { team: 'player2' });
                bases.push(enemyFront);
            });
        }
        
        // 5. Generar FOBs Enemigos según configuración - Ahora como player2
        if (this.nodesConfig.enemyFobs) {
            this.nodesConfig.enemyFobs.forEach(enemyFobConfig => {
                const enemyFob = this.generateNode('fob', enemyFobConfig, canvasWidth, canvasHeight, margin, baseFactory, { team: 'player2' });
                bases.push(enemyFob);
            });
        }
        
        // 6. Generar HQ Enemigo si existe - Ahora como player2
        if (this.nodesConfig.enemyHQ) {
            const enemyHQ = this.generateNode('hq', this.nodesConfig.enemyHQ, canvasWidth, canvasHeight, margin, baseFactory, { team: 'player2' });
            bases.push(enemyHQ);
        }
        
        return bases;
    }
    
    /**
     * Genera el HQ (posición centralizada en constantes)
     */
    generateHQ(canvasWidth, canvasHeight, margin, baseFactory) {
        // Usar posición fija desde GAME_CONFIG
        const hqX = canvasWidth * GAME_CONFIG.HQ_X_PERCENT;
        const hqY = canvasHeight * (1 - GAME_CONFIG.HQ_Y_PERCENT); // Invertir Y (sistema cartesiano)
        
        return baseFactory ? baseFactory.createBase(hqX, hqY, 'hq') : new MapNode(hqX, hqY, 'hq', { radius: 50 });
    }
    
    /**
     * Genera un nodo (FOB o Frente) según configuración
     */
    generateNode(type, config, canvasWidth, canvasHeight, margin, baseFactory, options = {}) {
        let x, y;
        
        // Si se especifica posición exacta
        if (config.x !== undefined && config.y !== undefined) {
            x = config.x;
            y = config.y;
        }
        // Si se especifica posición en porcentaje (sistema cartesiano: 0,0 = inferior izquierda)
        else if (config.xPercent !== undefined && config.yPercent !== undefined) {
            x = canvasWidth * config.xPercent;
            y = canvasHeight * (1 - config.yPercent);  // Invertir Y para que 0 sea abajo
        }
        // Generación automática (zona predefinida con offset aleatorio)
        else if (config.zone !== undefined) {
            const zone = this.getZone(config.zone, canvasWidth, canvasHeight, margin);
            const index = config.index || 0;
            const total = config.total || 1;
            
            const spacing = (canvasHeight - margin * 2) / (total + 1);
            x = zone.x + zone.width / 2 + (config.randomX || 0) * (Math.random() - 0.5);
            y = margin + spacing * (index + 1) + (config.randomY || 0) * (Math.random() - 0.5);
        }
        
        return baseFactory ? baseFactory.createBase(x, y, type, options) : new MapNode(x, y, type, { radius: 35, ...options });
    }
    
    /**
     * Define zonas del canvas para generación automática
     */
    getZone(zoneName, canvasWidth, canvasHeight, margin) {
        const zones = {
            hq: { x: margin, width: canvasWidth * 0.2 },
            fob: { x: canvasWidth * 0.35, width: canvasWidth * 0.3 },
            front: { x: canvasWidth * 0.7, width: canvasWidth - margin - canvasWidth * 0.7 }
        };
        
        return zones[zoneName] || zones.fob;
    }
    
    /**
     * Obtiene la metadata de la misión para el UI
     */
    getMetadata() {
        return {
            number: this.number,
            name: this.name,
            description: this.description,
            objectives: this.objectives,
            duration: this.duration
        };
    }
}
