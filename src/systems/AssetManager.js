// ===== GESTOR DE ASSETS (SPRITES) =====

export class AssetManager {
    constructor() {
        this.images = new Map();
        this.loadStatus = new Map();
        this.allLoaded = false;
        this.loadingProgress = 0;
        
        // Catálogo de sprites a cargar
        this.assetCatalog = {
            // Bases (solo las que se usan)
            'base-hq': 'assets/sprites/bases/HQ.png',
            'base-fob': 'assets/sprites/bases/FOB.png',
            'base-front': 'assets/sprites/bases/FRONT.png',
            'base-front-no-ammo': 'assets/sprites/bases/front_no_ammo.png',
            // Sprites enemigos (usados dinámicamente según team)
            'base-enemy-front': 'assets/sprites/bases/front_enemy.png',
            'base-enemy-front-no-ammo': 'assets/sprites/bases/front_enemy_no_ammo.png',
            'base-enemy-fob': 'assets/sprites/bases/fob_enemy.png',
            'base-enemy-hq': 'assets/sprites/bases/hq_enemy.png',
            
            // Edificios construibles
            'building-anti-drone': 'assets/sprites/buildings/anti_drone_weapon.png',
            'building-drone-launcher': 'assets/sprites/buildings/drone_launcher.png',
            'building-razor-net': 'assets/sprites/buildings/razor_net.png',
            'building-truck-factory': 'assets/sprites/buildings/truck_factory.png',
            'building-nuclear-plant': 'assets/sprites/buildings/nuclear_plant.png',
            'building-machine-nest': 'assets/sprites/buildings/machine_nest.png',
            'building-campaign-hospital': 'assets/sprites/buildings/campaign_hospital.png',
            'building-construction': 'assets/sprites/buildings/construccion.png',
            // Placeholder para Centro de Ingenieros (reutiliza construcción hasta tener arte)
            'building-engineer-center': 'assets/sprites/buildings/engineer_center.png',

            // Carreteras (4 variantes)
            'road-1': 'assets/sprites/buildings/carretera1.png',
            'road-2': 'assets/sprites/buildings/carretera2.png',
            'road-3': 'assets/sprites/buildings/carretera3.png',
            'road-4': 'assets/sprites/buildings/carretera4.png',
            
            // Vehículos (solo los que se usan)
            'heavy_truck': 'assets/sprites/vehicles/heavy_truck.png',
            'truck': 'assets/sprites/vehicles/truck.png',
            'tank': 'assets/sprites/vehicles/tank.png',
            'helicopter': 'assets/sprites/vehicles/chopper.png',
            'ambulance': 'assets/sprites/vehicles/ambulance.png',
            'vehicle-drone': 'assets/sprites/vehicles/drone.png',
            'vehicle-sniper_shoot_icon': 'assets/sprites/vehicles/sniper_shoot_icon.png',
            
            // UI (solo los que se usan)
            'ui-supply-icon': 'assets/sprites/ui/resources.png',
            'ui-build-menu': 'assets/sprites/ui/build_menu.png',
            'ui-currency': 'assets/sprites/ui/currency.png',
            'ui-supplies': 'assets/sprites/ui/supplies.png',
            'ui-wounded': 'assets/sprites/ui/wounded.png',
            'ui-no-supplies': 'assets/sprites/ui/no_supplies.png',
            'ui-sniper-kill': 'assets/sprites/ui/sniper_kill_feed.png',
            'ui-emergency-medic': 'assets/sprites/ui/emergency_medic.png',
            'ui-vehicle-icon': 'assets/sprites/ui/vehicle_resource_icon.png',
            'ui-medic-vehicle-icon': 'assets/sprites/ui/medic_vehicle_resource_icon.png',
            
            // Nueva UI de tienda
            'ui-store-main': 'assets/sprites/ui/UIFrames/store_main_window.png',
            'ui-store-deployable': 'assets/sprites/ui/UIFrames/store_desplegable.png',
            'ui-button-background': 'assets/sprites/ui/UIFrames/bton_background.png',
            'ui-currency-background': 'assets/sprites/ui/UIFrames/currency_bton.png',
            
            // Tiles del background (desde map/)
            'map-floor1': 'assets/sprites/map/floor1.png',
            'map-floor2': 'assets/sprites/map/floor2.png',
            'map-floor3': 'assets/sprites/map/floor3.png',
            'map-soil': 'assets/sprites/map/soil.png',
            'map-trace': 'assets/sprites/map/trace.png',
            'map-worldmap': 'assets/sprites/map/worldmap.png',
            
            // Decoraciones especiales del mapa
            'map-log': 'assets/sprites/map/log.png',
            'map-tank-wreck': 'assets/sprites/map/tank_wreck.png',
            'map-grass1': 'assets/sprites/map/grass1.png',
            'map-grass2': 'assets/sprites/map/grass2.png',
            
            // Partículas (solo las que se usan)
            'particle-explosion': 'assets/sprites/particles/explosion.png',
            'explosion-1': 'assets/sprites/particles/explo1.png',
            'explosion-2': 'assets/sprites/particles/explo2.png',
            'explosion-3': 'assets/sprites/particles/explo3.png',
            'impact-1': 'assets/sprites/particles/impact_icon.png',
            'impact-2': 'assets/sprites/particles/impact_icon2.png'
        };
    }
    
    /**
     * Carga todos los sprites del catálogo
     * @param {Function} onProgress - Callback para reportar progreso (0-100)
     * @returns {Promise} Promesa que se resuelve cuando todo está cargado
     */
    async loadAll(onProgress = null) {
        const entries = Object.entries(this.assetCatalog);
        const totalAssets = entries.length;
        let loadedAssets = 0;
        
        const loadPromises = entries.map(async ([key, path]) => {
            try {
                await this.loadImage(key, path);
                loadedAssets++;
                this.loadingProgress = Math.floor((loadedAssets / totalAssets) * 100);
                if (onProgress) {
                    onProgress(this.loadingProgress);
                }
            } catch (error) {
                loadedAssets++;
                this.loadingProgress = Math.floor((loadedAssets / totalAssets) * 100);
                if (onProgress) {
                    onProgress(this.loadingProgress);
                }
            }
        });
        
        try {
            await Promise.all(loadPromises);
            this.allLoaded = true;
            this.loadingProgress = 100;
            if (onProgress) {
                onProgress(100);
            }
            return true;
        } catch (error) {
            console.warn('⚠️ AssetManager: Algunos sprites no se pudieron cargar, usando placeholders');
            this.allLoaded = true; // Marcar como cargado de todas formas (fallback activo)
            return false;
        }
    }
    
    /**
     * Carga una imagen individual
     * @param {string} key - Identificador del sprite
     * @param {string} path - Ruta al archivo
     * @returns {Promise}
     */
    loadImage(key, path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = async () => {
                // Los sprites del mapa NO necesitan chroma key (tienen transparencia real)
                const skipChromaKey = key.startsWith('map-');
                
                let processedImg;
                if (skipChromaKey) {
                    processedImg = img;
                } else {
                    // Procesar imagen para eliminar fondo blanco
                    processedImg = await this.removeWhiteBackground(img);
                }
                
                this.images.set(key, processedImg);
                this.loadStatus.set(key, 'loaded');
                this.updateProgress();
                resolve(processedImg);
            };
            
            img.onerror = () => {
                this.loadStatus.set(key, 'failed');
                this.updateProgress();
                // Silencioso - los placeholders funcionan automáticamente
                resolve(null);
            };
            
            img.src = path;
        });
    }
    
    /**
     * Elimina el fondo blanco de una imagen (chroma key)
     * @param {Image} image - Imagen original
     * @returns {Promise<Image>} Imagen procesada sin fondo blanco
     */
    removeWhiteBackground(image) {
        return new Promise((resolve) => {
            // Crear canvas temporal
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            
            // Dibujar imagen original
            ctx.drawImage(image, 0, 0);
            
            // Obtener datos de píxeles
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Procesar cada píxel
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // Si el píxel es muy claro (casi blanco), hacerlo transparente
                // Umbral: píxeles con R, G, B > 240 se consideran "blanco"
                if (r > 240 && g > 240 && b > 240) {
                    data[i + 3] = 0; // Alpha = 0 (transparente)
                }
            }
            
            // Aplicar datos procesados
            ctx.putImageData(imageData, 0, 0);
            
            // Convertir canvas a imagen
            const processedImage = new Image();
            processedImage.onload = () => {
                resolve(processedImage);
            };
            processedImage.src = canvas.toDataURL();
        });
    }
    
    /**
     * Actualiza el progreso de carga
     */
    updateProgress() {
        const total = Object.keys(this.assetCatalog).length;
        const loaded = Array.from(this.loadStatus.values()).length;
        this.loadingProgress = (loaded / total) * 100;
    }
    
    /**
     * Obtiene un sprite cargado
     * @param {string} key - Identificador del sprite
     * @returns {Image|null} La imagen o null si no está cargada/no existe
     */
    getSprite(key) {
        return this.images.get(key) || null;
    }
    
    /**
     * Verifica si un sprite específico está disponible
     * @param {string} key - Identificador del sprite
     * @returns {boolean}
     */
    hasSprite(key) {
        return this.images.has(key) && this.images.get(key) !== null;
    }
    
    /**
     * Obtiene el progreso de carga (0-100)
     * @returns {number}
     */
    getProgress() {
        return this.loadingProgress;
    }
    
    /**
     * Verifica si todos los sprites están cargados
     * @returns {boolean}
     */
    isReady() {
        return this.allLoaded;
    }
    
    /**
     * Verifica si los assets críticos están cargados
     * @returns {boolean}
     */
    areCriticalAssetsLoaded() {
        const criticalAssets = [
            'base-hq',
            'base-fob', 
            'base-front',
            'base-enemy-front',
            'base-enemy-hq',
            'base-enemy-fob'
        ];
        
        return criticalAssets.every(key => this.hasSprite(key));
    }
    
    /**
     * Obtiene sprite de base según estado
     * @param {string} type - Tipo de base (hq, fob, front)
     * @param {boolean} isSelected - Si está seleccionada
     * @param {boolean} isHovered - Si está con hover
     * @param {boolean} isCritical - Si está crítica (solo front)
     * @param {boolean} hasNoAmmo - Si no tiene munición (solo front)
     * @param {string} team - Equipo del nodo ('ally', 'player2')
     * @returns {Image|null}
     */
    getBaseSprite(type, isSelected = false, isHovered = false, isCritical = false, hasNoAmmo = false, team = 'ally') {
        // Determinar prefijo según equipo
        const prefix = team === 'player2' ? 'base-enemy-' : 'base-';
        
        // Front crítico tiene prioridad
        if (type === 'front' && isCritical) {
            const sprite = this.getSprite('base-front-critical');
            if (sprite) return sprite;
        }
        
        // Front sin munición (retirada) tiene prioridad sobre seleccionado/hovered
        if (type === 'front' && hasNoAmmo) {
            const spriteKey = team === 'player2' ? 'base-enemy-front-no-ammo' : 'base-front-no-ammo';
            const sprite = this.getSprite(spriteKey);
            if (sprite) return sprite;
        }
        
        // Estados de interacción (solo para nodos aliados)
        if (isSelected && team === 'ally') {
            return this.getSprite(`base-${type}-selected`);
        }
        if (isHovered && team === 'ally') {
            return this.getSprite(`base-${type}-hovered`);
        }
        
        // Estado normal
        return this.getSprite(`${prefix}${type}`);
    }
    
    /**
     * Obtiene sprite de vehículo según tipo y estado
     * @param {string} vehicleType - Tipo de vehículo (truck, helicopter)
     * @param {boolean} isReturning - Si está regresando
     * @returns {Image|null}
     */
    getVehicleSprite(vehicleType, isReturning = false) {
        const suffix = isReturning ? '-returning' : '';
        return this.getSprite(`${vehicleType}${suffix}`);
    }
}
