// ===== SISTEMA DE RENDERIZADO =====
import { GAME_CONFIG } from '../config/constants.js';
import { getNodeConfig } from '../config/nodes.js';
import { getBuildAreaVisual, getExclusionRadius } from '../config/buildAreaVisual.js';
import { RenderContext } from './rendering/RenderContext.js';
import { BackgroundRenderer } from './rendering/BackgroundRenderer.js';
import { ParticleRenderer } from './rendering/ParticleRenderer.js';
import { VehicleRenderer } from './rendering/VehicleRenderer.js';
import { DroneRenderer } from './rendering/DroneRenderer.js';
import { EffectRenderer } from './rendering/EffectRenderer.js';
import { NodeRenderer } from './rendering/NodeRenderer.js';
import { PreviewRenderer } from './rendering/PreviewRenderer.js';

export class RenderSystem {
    constructor(canvas, assetManager = null, game = null) {
        this.canvas = canvas;
        this.assetManager = assetManager; // Gestor de sprites (opcional)
        this.game = game; // Referencia al juego (para acceder a la cámara)
        this.backgroundPattern = null; // Patrón de fondo (se crea al cargar sprite - se sincroniza con BackgroundRenderer)
        
        // 🆕 REFACTOR: Crear contexto centralizado para gestión de canvas y mirror view
        this.renderContext = new RenderContext(canvas, game);
        
        // Proxy de propiedades para compatibilidad con código existente
        // this.ctx se asigna directamente (referencia al objeto del contexto)
        this.ctx = this.renderContext.ctx;
        
        // 🆕 REFACTOR: Proxy de width y height para sincronización bidireccional
        // Debe definirse ANTES de cualquier asignación directa
        Object.defineProperty(this, 'width', {
            get: () => this.renderContext.width,
            set: (value) => { this.renderContext.width = value; },
            enumerable: true,
            configurable: true
        });
        
        Object.defineProperty(this, 'height', {
            get: () => this.renderContext.height,
            set: (value) => { this.renderContext.height = value; },
            enumerable: true,
            configurable: true
        });
        
        // 🆕 REFACTOR: Proxy de mirrorViewApplied para compatibilidad
        // Permite que código externo acceda a this.renderer.mirrorViewApplied
        Object.defineProperty(this, 'mirrorViewApplied', {
            get: () => this.renderContext.mirrorViewApplied,
            set: (value) => { this.renderContext.mirrorViewApplied = value; },
            enumerable: true,
            configurable: true
        });
        
        // 🆕 REFACTOR: Crear renderer especializado para fondo y grid
        this.backgroundRenderer = new BackgroundRenderer(this.ctx, assetManager, game);
        
        // 🆕 REFACTOR: Crear renderer especializado para partículas y efectos
        this.particleRenderer = new ParticleRenderer(this.ctx, assetManager, this.renderContext);
        
        // 🆕 REFACTOR: Crear renderer especializado para vehículos
        this.vehicleRenderer = new VehicleRenderer(this.ctx, assetManager, game);
        
        // 🆕 REFACTOR: Crear renderer especializado para drones
        this.droneRenderer = new DroneRenderer(this.ctx, assetManager, game);
        
        // 🆕 REFACTOR: Crear renderer especializado para efectos especiales
        this.effectRenderer = new EffectRenderer(this.ctx, assetManager, game);
        
        // 🆕 REFACTOR: Crear renderer especializado para nodos y edificios
        this.nodeRenderer = new NodeRenderer(this.ctx, assetManager, game, this.renderContext, this.droneRenderer);
        
        // 🆕 REFACTOR: Crear renderer especializado para previews y cursors
        this.previewRenderer = new PreviewRenderer(this.ctx, assetManager, game, this.nodeRenderer);
        
        // Sincronizar backgroundPattern entre RenderSystem y BackgroundRenderer
        // (mantener compatibilidad por si algún código accede directamente)
        Object.defineProperty(this, 'backgroundPattern', {
            get: () => this.backgroundRenderer.backgroundPattern,
            set: (value) => { 
                this.backgroundRenderer.backgroundPattern = value;
                // También mantener referencia local para compatibilidad
                this._backgroundPattern = value;
            },
            enumerable: true,
            configurable: true
        });
        
        // 🆕 REFACTOR: Proxy de propiedades de efectos especiales para compatibilidad
        // Permite que código externo acceda a las propiedades del EffectRenderer
        Object.defineProperty(this, 'worldDestroyerActive', {
            get: () => this.effectRenderer.worldDestroyerActive,
            set: (value) => { this.effectRenderer.worldDestroyerActive = value; },
            enumerable: true,
            configurable: true
        });
        
        Object.defineProperty(this, 'worldDestroyerExecuted', {
            get: () => this.effectRenderer.worldDestroyerExecuted,
            set: (value) => { this.effectRenderer.worldDestroyerExecuted = value; },
            enumerable: true,
            configurable: true
        });
        
        Object.defineProperty(this, 'artilleryStrikes', {
            get: () => this.effectRenderer.artilleryStrikes,
            set: (value) => { this.effectRenderer.artilleryStrikes = value; },
            enumerable: true,
            configurable: true
        });
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     * Determina si un nodo siempre debe mirar hacia el oponente
     */
    shouldAlwaysFaceOpponent(node) {
        return this.nodeRenderer.shouldAlwaysFaceOpponent(node);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a RenderContext
     * Actualiza las dimensiones del contexto
     */
    resize(width, height) {
        this.renderContext.resize(width, height);
        // Los proxies de width/height actualizan automáticamente
    }
    
    /**
     * 🆕 REFACTOR: Delegado a RenderContext
     * Aplica vista espejo para player2 (flip horizontal del canvas completo)
     * Debe llamarse DESPUÉS de aplicar la cámara pero ANTES de renderizar el contenido
     */
    applyMirrorView() {
        return this.renderContext.applyMirrorView();
    }
    
    /**
     * 🆕 REFACTOR: Delegado a RenderContext
     * Restaura la transformación de vista espejo
     * Debe llamarse ANTES de restaurar la cámara
     */
    restoreMirrorView() {
        return this.renderContext.restoreMirrorView();
    }
    
    /**
     * 🆕 REFACTOR: Delegado a RenderContext
     * Aplica compensación del mirror view para UI centrada en un punto
     * Usar para elementos de UI que deben verse correctamente orientados (textos, iconos, botones)
     * @param {number} centerX - Coordenada X del centro del elemento
     * @param {number} centerY - Coordenada Y del centro del elemento
     * @returns {boolean} - True si se aplicó la compensación (para saber si hacer restore después)
     */
    applyMirrorCompensation(centerX, centerY) {
        return this.renderContext.applyMirrorCompensation(centerX, centerY);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a RenderContext
     * Restaura la compensación del mirror view aplicada con applyMirrorCompensation
     * @param {boolean} wasApplied - Resultado de applyMirrorCompensation
     */
    restoreMirrorCompensation(wasApplied) {
        return this.renderContext.restoreMirrorCompensation(wasApplied);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a RenderContext
     * Ejecuta una función de renderizado con compensación automática del mirror view
     * Útil para simplificar el código y evitar olvidar el restore
     * @param {Function} renderFn - Función que realiza el renderizado
     * @param {number} centerX - Coordenada X del centro del elemento
     * @param {number} centerY - Coordenada Y del centro del elemento
     */
    renderWithMirrorCompensation(renderFn, centerX, centerY) {
        return this.renderContext.renderWithMirrorCompensation(renderFn, centerX, centerY);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a RenderContext
     * Aplica compensación del mirror view para elementos globales (tooltips, textos flotantes)
     * Usar para elementos que no están centrados en un nodo específico
     * @returns {boolean} - True si se aplicó la compensación
     */
    applyGlobalMirrorCompensation() {
        return this.renderContext.applyGlobalMirrorCompensation();
    }
    
    /**
     * 🆕 REFACTOR: Delegado a RenderContext
     * Limpia el canvas completo (solo la parte visible en pantalla)
     */
    clear() {
        return this.renderContext.clear();
    }
    
    /**
     * 🆕 REFACTOR: Delegado a BackgroundRenderer
     * Renderiza el fondo del mundo (debe llamarse dentro del contexto de la cámara)
     */
    renderBackground() {
        return this.backgroundRenderer.renderBackground();
    }
    
    // ========== RENDERIZADO DE NODOS ==========
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     * Renderiza un nodo (método principal unificado)
     */
    renderNode(node, isSelected = false, isHovered = false, game = null) {
        return this.nodeRenderer.renderNode(node, isSelected, isHovered, game);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     * DEBUG: Renderiza información de debug (hitbox verde y área de detección naranja)
     */
    renderDebugInfo(node) {
        return this.nodeRenderer.renderDebugInfo(node);
    }
    
    // ========== COMPATIBILIDAD ==========
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     */
    renderBase(base, isSelected = false, isHovered = false, game = null) {
        return this.nodeRenderer.renderBase(base, isSelected, isHovered, game);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     */
    renderBuilding(building) {
        return this.nodeRenderer.renderBuilding(building);
    }
    
    // ========== UI ESPECÍFICA DE CADA NODO ==========
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     */
    renderNodeUI(node, game, spriteSize, isSelected) {
        return this.nodeRenderer.renderNodeUI(node, game, spriteSize, isSelected);
    }
    
    // ========== CONTADOR DE VEHÍCULOS DEL HQ ==========
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     */
    renderHQVehicles(node) {
        return this.nodeRenderer.renderHQVehicles(node);
    }
    
    // ========== UI DEL HOSPITAL DE CAMPAÑA ==========
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     */
    renderHospitalUI(node, spriteSize, isSelected) {
        return this.nodeRenderer.renderHospitalUI(node, spriteSize, isSelected);
    }
    
    // ========== RENDERIZADO TIPO BASE ==========
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     */
    renderBaseTypeNode(base, isSelected = false, isHovered = false, game = null) {
        return this.nodeRenderer.renderBaseTypeNode(base, isSelected, isHovered, game);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     */
    renderResourceSelector(base) {
        return this.nodeRenderer.renderResourceSelector(base);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     */
    renderSupplyBar(base) {
        return this.nodeRenderer.renderSupplyBar(base);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     */
    renderEffects(base) {
        return this.nodeRenderer.renderEffects(base);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     */
    renderEffectTooltip(hoveredEffect) {
        return this.nodeRenderer.renderEffectTooltip(hoveredEffect);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     */
    renderHoverTooltip(hover) {
        return this.nodeRenderer.renderHoverTooltip(hover);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a ParticleRenderer
     * Renderiza un texto flotante individual (DEPRECATED - usar renderFloatingTextsBatch)
     */
    renderFloatingText(text) {
        return this.particleRenderer.renderFloatingText(text);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a ParticleRenderer
     * Renderiza múltiples textos flotantes en batch (optimizado)
     */
    renderFloatingTextsBatch(texts) {
        return this.particleRenderer.renderFloatingTextsBatch(texts);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a ParticleRenderer
     * Renderiza sprites flotantes (ej: sniper kill feed)
     */
    renderFloatingSprites(sprites) {
        return this.particleRenderer.renderFloatingSprites(sprites);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a ParticleRenderer
     * Renderiza sprites cayendo
     */
    renderFallingSprites(sprites) {
        return this.particleRenderer.renderFallingSprites(sprites);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a VehicleRenderer
     * Renderiza un convoy
     */
    renderConvoy(convoy) {
        return this.vehicleRenderer.renderConvoy(convoy);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a VehicleRenderer
     * Renderiza un tren
     */
    renderTrain(train) {
        return this.vehicleRenderer.renderTrain(train);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a VehicleRenderer
     * Renderiza un helicóptero persistente
     */
    renderHelicopter(heli) {
        return this.vehicleRenderer.renderHelicopter(heli);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a ParticleRenderer
     * Renderiza una partícula básica
     */
    renderParticle(particle) {
        return this.particleRenderer.renderParticle(particle);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a ParticleRenderer
     * Renderiza un sprite de explosión (3 frames)
     */
    renderExplosionSprite(explosion) {
        return this.particleRenderer.renderExplosionSprite(explosion);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a ParticleRenderer
     * Renderiza una explosión de dron (2 frames)
     */
    renderDroneExplosionSprite(explosion) {
        return this.particleRenderer.renderDroneExplosionSprite(explosion);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a ParticleRenderer
     * Renderiza una marca de impacto
     */
    renderImpactMark(impactMark) {
        return this.particleRenderer.renderImpactMark(impactMark);
    }
    
    // ========== RENDERIZADO TIPO EDIFICIO ==========
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     */
    renderBuildingTypeNode(building) {
        return this.nodeRenderer.renderBuildingTypeNode(building);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a DroneRenderer
     * Renderiza un drone de combate
     */
    renderDrone(drone) {
        return this.droneRenderer.renderDrone(drone);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a DroneRenderer
     * Renderiza un camera drone volando hacia su objetivo
     */
    renderCameraDroneFlying(cameraDrone) {
        return this.droneRenderer.renderCameraDroneFlying(cameraDrone);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a DroneRenderer
     * Renderiza el área de detección del camera drone
     */
    renderCameraDroneDetectionArea(cameraDrone) {
        return this.droneRenderer.renderCameraDroneDetectionArea(cameraDrone);
    }
    
    /**
     * ✅ REFACTORIZADO: Método genérico para renderizar vehículos de combate
     * @param {Object} vehicle - El vehículo a renderizar (tank, lightVehicle, etc.)
     * @param {Object} config - Configuración del vehículo:
     *   - getSpriteKey: función(vehicle) -> string - Devuelve la clave del sprite a usar
     *   - fallbackEmoji: string - Emoji a mostrar si no hay sprite
     *   - size: number - Tamaño del sprite (default: 100)
     *   - shadowEnabled: boolean - Si debe tener sombra/glow (default: true)
     */
    /**
     * 🆕 REFACTOR: Delegado a VehicleRenderer
     * Renderiza un vehículo de combate genérico (método base)
     */
    renderCombatVehicle(vehicle, config) {
        return this.vehicleRenderer.renderCombatVehicle(vehicle, config);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a VehicleRenderer
     * Renderiza un tanque
     */
    renderTank(tank) {
        return this.vehicleRenderer.renderTank(tank);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a VehicleRenderer
     * Renderiza un artillado ligero
     */
    renderLightVehicle(lightVehicle) {
        return this.vehicleRenderer.renderLightVehicle(lightVehicle);
    }
    
    renderRoutePreview(from, to) {
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'; // Negro semi-transparente
        this.ctx.lineWidth = 3.6;  // +20% (3→3.6)
        this.ctx.setLineDash([12, 6]);  // +20% (10→12, 5→6)
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     * Helper: Verifica si una posición está en el área de construcción de un FOB aliado
     */
    isInFobBuildArea(x, y) {
        return this.nodeRenderer.isInFobBuildArea(x, y);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     * Helper: Verifica si una posición está en el área de construcción permitida por un camera drone
     */
    isInCameraDroneBuildArea(x, y) {
        return this.nodeRenderer.isInCameraDroneBuildArea(x, y);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     * Renderiza el overlay visual de áreas válidas/inválidas para construcción
     */
    renderBuildAreaOverlay(buildingType) {
        return this.nodeRenderer.renderBuildAreaOverlay(buildingType);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     * Renderiza overlay del territorio válido (verde semi-transparente)
     */
    renderTerritoryOverlay(territoryType) {
        return this.nodeRenderer.renderTerritoryOverlay(territoryType);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     * Renderiza un círculo de exclusión (área donde no se puede construir)
     */
    renderExclusionCircle(x, y, radius, color) {
        return this.nodeRenderer.renderExclusionCircle(x, y, radius, color);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     * Renderiza el rango de intercepción de una torreta anti-drone (cuando se selecciona)
     */
    renderAntiDroneInterceptionRange(x, y) {
        return this.nodeRenderer.renderAntiDroneInterceptionRange(x, y);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a PreviewRenderer
     * Renderiza preview de construcción
     */
    renderBuildPreview(x, y, bases, buildingType = 'fob') {
        return this.previewRenderer.renderBuildPreview(x, y, bases, buildingType);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a DroneRenderer
     * Renderiza preview de drone (aliado)
     */
    renderDronePreview(x, y, hoveredBase) {
        return this.droneRenderer.renderDronePreview(x, y, hoveredBase);
    }
    
    /**
     * ✅ REFACTORIZADO: Método genérico para renderizar preview de vehículos de combate
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @param {Object} hoveredBase - El nodo sobre el que se hace hover
     * @param {Object} config - Configuración del preview:
     *   - actionName: string - Nombre de la acción en serverBuildingConfig (ej: "tankLaunch", "lightVehicleLaunch")
     *   - validColor: string - Color cuando el objetivo es válido (ej: "rgba(78, 204, 163, 0.8)")
     *   - textColor: string - Color del texto cuando es válido (ej: "#4ecca3")
     *   - label: string - Etiqueta a mostrar (ej: "TANQUE", "ARTILLADO")
     *   - additionalValidation: función(hoveredBase) -> boolean - Validación adicional opcional
     *   - getInvalidLabel: función(hoveredBase) -> string - Función para obtener label cuando es inválido
     */
    /**
     * 🆕 REFACTOR: Delegado a VehicleRenderer
     * Renderiza preview genérico de vehículo de combate (método base)
     */
    renderCombatVehiclePreview(x, y, hoveredBase, config) {
        return this.vehicleRenderer.renderCombatVehiclePreview(x, y, hoveredBase, config);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a VehicleRenderer
     * Renderiza preview del tanque
     */
    renderTankPreview(x, y, hoveredBase) {
        return this.vehicleRenderer.renderTankPreview(x, y, hoveredBase);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a VehicleRenderer
     * Renderiza preview del artillado ligero
     */
    renderLightVehiclePreview(x, y, hoveredBase) {
        return this.vehicleRenderer.renderLightVehiclePreview(x, y, hoveredBase);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a PreviewRenderer
     * Renderiza preview de artillería
     */
    renderArtilleryPreview(x, y, hoveredBase) {
        return this.previewRenderer.renderArtilleryPreview(x, y, hoveredBase);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a PreviewRenderer
     * Renderiza cursor de sniper
     */
    renderSniperCursor(x, y, hoveredBase) {
        return this.previewRenderer.renderSniperCursor(x, y, hoveredBase);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a PreviewRenderer
     * Renderiza el cursor de Fob Sabotaje
     */
    renderFobSabotageCursor(x, y, hoveredBase) {
        return this.previewRenderer.renderFobSabotageCursor(x, y, hoveredBase);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a PreviewRenderer
     * Renderiza el cursor de Comando Especial Operativo
     */
    renderCommandoCursor(x, y, hoveredBase) {
        return this.previewRenderer.renderCommandoCursor(x, y, hoveredBase);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     * Función genérica para renderizar anillos de progreso (reutilizable)
     */
    renderProgressRing(x, y, radius, progress, options = {}) {
        return this.nodeRenderer.renderProgressRing(x, y, radius, progress, options);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     * Renderiza el anillo de efecto residual alrededor de un edificio afectado por comando eliminado
     */
    renderCommandoResidualRing(node, game) {
        return this.nodeRenderer.renderCommandoResidualRing(node, game);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     * Renderiza el anillo de duración del comando
     */
    renderCommandoDurationRing(node, game) {
        return this.nodeRenderer.renderCommandoDurationRing(node, game);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     * Renderiza el anillo de duración del truck assault
     */
    renderTruckAssaultDurationRing(node, game) {
        return this.nodeRenderer.renderTruckAssaultDurationRing(node, game);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     * Renderiza el anillo de progreso de inversión de intelRadio
     */
    renderIntelRadioInvestmentRing(node, game) {
        return this.nodeRenderer.renderIntelRadioInvestmentRing(node, game);
    }
    
    /**
     * Preview de dron ENEMIGO (modo debug)
     */
    /**
     * 🆕 REFACTOR: Delegado a DroneRenderer
     * Renderiza preview de drone enemigo
     */
    renderEnemyDronePreview(x, y, hoveredBase, hoveredBuilding) {
        return this.droneRenderer.renderEnemyDronePreview(x, y, hoveredBase, hoveredBuilding);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a PreviewRenderer
     * Preview de construcción enemiga (modo debug)
     */
    renderEnemyBuildPreview(x, y) {
        return this.previewRenderer.renderEnemyBuildPreview(x, y);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     * Renderiza SOLO la UI de vehículos e iconos del HQ
     */
    renderVehicleUI(node, game) {
        return this.nodeRenderer.renderVehicleUI(node, game);
    }
    
    // ========== ICONO DE HELICÓPTERO ==========
    
    /**
     * Renderiza el icono de helicóptero para frentes que tienen helicópteros
     * @param {MapNode} node - Nodo front con helicópteros
     */
    /**
     * 🆕 REFACTOR: Delegado a VehicleRenderer
     * Renderiza icono de helicóptero en un nodo
     */
    renderHelicopterIcon(node) {
        return this.vehicleRenderer.renderHelicopterIcon(node);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a NodeRenderer
     * Renderizado de cargo capacity (placeholder - reimplementar con nueva arquitectura)
     */
    renderCargoCapacityBarForIcon(node, iconX, iconY) {
        return this.nodeRenderer.renderCargoCapacityBarForIcon(node, iconX, iconY);
    }
    
    /**
     * 🆕 NUEVO: Inicia el efecto visual del Destructor de mundos
     * @param {number} startTime - Tiempo de inicio del countdown (gameTime del servidor)
     * @param {number} countdownDuration - Duración del countdown en segundos
     */
    /**
     * 🆕 REFACTOR: Delegado a EffectRenderer
     * Inicia el efecto visual del Destructor de mundos (countdown)
     */
    startWorldDestroyerEffect(startTime, countdownDuration) {
        return this.effectRenderer.startWorldDestroyerEffect(startTime, countdownDuration);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a EffectRenderer
     * Ejecuta el efecto visual del Destructor de mundos (pantallazo blanco)
     */
    executeWorldDestroyerEffect(eventData) {
        return this.effectRenderer.executeWorldDestroyerEffect(eventData);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a EffectRenderer
     * Inicia el efecto visual de artillería
     */
    executeArtilleryEffect(data) {
        return this.effectRenderer.executeArtilleryEffect(data);
    }
    
    /**
     * 🆕 REFACTOR: Delegado a EffectRenderer
     * Renderiza los efectos visuales de artillería
     */
    renderArtilleryEffects() {
        return this.effectRenderer.renderArtilleryEffects();
    }
    
    /**
     * 🆕 REFACTOR: Delegado a EffectRenderer
     * Renderiza los efectos visuales del Destructor de mundos
     */
    renderWorldDestroyerEffects() {
        return this.effectRenderer.renderWorldDestroyerEffects();
    }
    
    /**
     * 🆕 NUEVO: Delegado a EffectRenderer
     * Renderiza las conexiones visuales entre fábricas y HQs (líneas rojas)
     */
    renderFactoryConnections() {
        return this.effectRenderer.renderFactoryConnections();
    }
    
    /**
     * 🆕 NUEVO: Delegado a EffectRenderer
     * Renderiza los iconos de suministros viajando desde fábricas a HQs
     */
    renderFactorySupplyIcons() {
        return this.effectRenderer.renderFactorySupplyIcons();
    }
    
}
