// ===== SISTEMA DE TILES DEL BACKGROUND =====

// ===== COMPOSICIONES DE ESTILOS DE MAPA =====
const MAP_STYLES = {
    1: {
        name: 'Estilo 1 - Complejo',
        tiles: ['floor1', 'floor2', 'soil', 'trace'],
        decorations: ['log', 'stone', 'tank-wreck'],
        floor2MaxPer3x3: 3,
        soilChance: 0.15,
        traceChance: 0.08,
        traceMinDistance: 9
    },
    2: {
        name: 'Estilo 2 - Floor3 Simple',
        tiles: ['floor3'],
        decorations: ['grass'],
        singleTileMode: true // Llenar todo con un solo tipo
    },
    3: {
        name: 'Estilo 3 - Worldmap',
        tiles: ['worldmap'],
        decorations: [],
        worldmapMode: true // Modo especial: una sola imagen estirada
    }
};

// Estilo activo (cambia este número para cambiar el estilo: 1, 2, 3, etc.)
const ACTIVE_STYLE = 3;

export class BackgroundTileSystem {
    constructor(worldWidth, worldHeight, tileSize = 50) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.tileSize = tileSize;
        
        // Calcular cuántos tiles necesitamos
        this.cols = Math.ceil(worldWidth / tileSize);
        this.rows = Math.ceil(worldHeight / tileSize);
        
        // Mapa de tiles: cada celda tiene {type, x, y}
        this.tileMap = [];
        
        // Decoraciones especiales (logs, stones, tank_wreck)
        this.specialDecorations = [];
        
        // Cargar estilo activo
        this.style = MAP_STYLES[ACTIVE_STYLE];
        // Estilo de mapa configurado (silencioso)
        
        // Cache para worldmap mode (offscreen canvas para MÁXIMO rendimiento)
        this.worldmapCache = null;
        this.worldmapCacheReady = false;
        
        // Generar el mapa de tiles
        this.generateTileMap();
        
        // Generar decoraciones especiales
        this.generateSpecialDecorations();
    }
    
    /**
     * Genera el mapa de tiles proceduralmente
     */
    generateTileMap() {
        // Modo simple: llenar todo con un solo tile
        if (this.style.singleTileMode) {
            const singleType = this.style.tiles[0];
            for (let row = 0; row < this.rows; row++) {
                for (let col = 0; col < this.cols; col++) {
                    const x = col * this.tileSize;
                    const y = row * this.tileSize;
                    
                    this.tileMap.push({
                        type: singleType,
                        x: x,
                        y: y,
                        col: col,
                        row: row
                    });
                }
            }
            return; // No añadir decoraciones adicionales
        }
        
        // Modo complejo: crear la base con floor1 y floor2
        // Regla: De cada 3x3 tiles, máximo 3 floor2
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const x = col * this.tileSize;
                const y = row * this.tileSize;
                
                // Determinar si este tile puede ser floor2
                const floorType = this.canBeFloor2(col, row) ? 'floor2' : 'floor1';
                
                this.tileMap.push({
                    type: floorType,
                    x: x,
                    y: y,
                    col: col,
                    row: row
                });
            }
        }
        
        // Ahora añadir decoraciones (soil, trace) de forma dispersa
        this.addDecorations();
    }
    
    /**
     * Verifica si un tile puede ser floor2 (máximo 3 floor2 por cada 3x3)
     */
    canBeFloor2(col, row) {
        // Determinar a qué celda 3x3 pertenece este tile
        const gridRow = Math.floor(row / 3);
        const gridCol = Math.floor(col / 3);
        
        // Contar cuántos floor2 ya hay en esta celda 3x3
        let floor2Count = 0;
        for (let r = gridRow * 3; r < Math.min((gridRow + 1) * 3, this.rows); r++) {
            for (let c = gridCol * 3; c < Math.min((gridCol + 1) * 3, this.cols); c++) {
                // Buscar si ya existe un tile en esa posición
                const existingTile = this.tileMap.find(t => t.col === c && t.row === r);
                if (existingTile && existingTile.type === 'floor2') {
                    floor2Count++;
                }
            }
        }
        
        // Si ya hay 3 o más floor2 en esta celda, este NO puede ser floor2
        if (floor2Count >= 3) {
            return false;
        }
        
        // Si hay menos de 3, probabilidad aleatoria
        return Math.random() < 0.4; // 40% de probabilidad si es posible
    }
    
    /**
     * Añade decoraciones (soil, trace) evitando que se agrupen
     */
    addDecorations() {
        const decorationTypes = ['soil', 'trace'];
        const decorationChance = 0.12; // 12% de probabilidad por tile
        
        // Distancias mínimas por tipo
        const minDistances = {
            'soil': 3,
            'trace': 9  // Triple distancia para trace
        };
        
        // Mapa de decoraciones ya colocadas por tipo
        const placedDecorations = {
            'soil': [],
            'trace': []
        };
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                // Probabilidad de añadir decoración
                if (Math.random() < decorationChance) {
                    // Elegir tipo aleatoriamente
                    const decorationType = decorationTypes[Math.floor(Math.random() * decorationTypes.length)];
                    
                    // Verificar que no hay otra decoración del mismo tipo cerca
                    const canPlace = this.canPlaceDecoration(col, row, decorationType, placedDecorations[decorationType], minDistances[decorationType]);
                    
                    if (canPlace) {
                        const x = col * this.tileSize;
                        const y = row * this.tileSize;
                        
                        // Determinar si aplicar flip (solo para soil y trace)
                        const canFlip = decorationType === 'soil' || decorationType === 'trace';
                        const flipH = canFlip && Math.random() < 0.5; // 50% horizontal flip
                        const flipV = canFlip && Math.random() < 0.5; // 50% vertical flip
                        
                        this.tileMap.push({
                            type: decorationType,
                            x: x,
                            y: y,
                            col: col,
                            row: row,
                            isDecoration: true,
                            flipH: flipH,
                            flipV: flipV
                        });
                        
                        placedDecorations[decorationType].push({ col, row });
                    }
                }
            }
        }
    }
    
    /**
     * Verifica si se puede colocar una decoración en la posición dada
     */
    canPlaceDecoration(col, row, type, placedPositions, minDistance) {
        for (const pos of placedPositions) {
            const distance = Math.abs(pos.col - col) + Math.abs(pos.row - row); // Distancia Manhattan
            if (distance < minDistance) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Genera decoraciones especiales únicas (logs, stones, tank_wreck)
     */
    generateSpecialDecorations() {
        // Si el estilo no tiene decoraciones, salir
        if (!this.style.decorations || this.style.decorations.length === 0) {
            return;
        }
        
        // 3 logs (pueden mirrorear horizontalmente)
        if (this.style.decorations.includes('log')) {
            for (let i = 0; i < 3; i++) {
                const x = Math.random() * (this.worldWidth - 100) + 50; // Margen 50px
                const y = Math.random() * (this.worldHeight - 100) + 50;
                const flipH = Math.random() < 0.5;
                
                this.specialDecorations.push({
                    type: 'log',
                    x: x,
                    y: y,
                    size: 80, // Tamaño del sprite
                    flipH: flipH,
                    flipV: false
                });
            }
        }
        
        // 4 stones (pueden mirrorear horizontalmente)
        if (this.style.decorations.includes('stone')) {
            for (let i = 0; i < 4; i++) {
                const x = Math.random() * (this.worldWidth - 100) + 50;
                const y = Math.random() * (this.worldHeight - 100) + 50;
                const flipH = Math.random() < 0.5;
                
                this.specialDecorations.push({
                    type: 'stone',
                    x: x,
                    y: y,
                    size: 70,
                    flipH: flipH,
                    flipV: false
                });
            }
        }
        
        // 1 tank_wreck (cerca del borde del mapa)
        if (this.style.decorations.includes('tank-wreck')) {
            // Elegir un borde aleatorio: arriba, abajo, izquierda, derecha
            const edge = Math.floor(Math.random() * 4);
            let x, y;
            
            switch(edge) {
                case 0: // Arriba
                    x = Math.random() * this.worldWidth;
                    y = Math.random() * 100 + 20; // Primeros 100px del top
                    break;
                case 1: // Abajo
                    x = Math.random() * this.worldWidth;
                    y = this.worldHeight - Math.random() * 100 - 20; // Últimos 100px del bottom
                    break;
                case 2: // Izquierda
                    x = Math.random() * 100 + 20; // Primeros 100px de la izquierda
                    y = Math.random() * this.worldHeight;
                    break;
                case 3: // Derecha
                    x = this.worldWidth - Math.random() * 100 - 20; // Últimos 100px de la derecha
                    y = Math.random() * this.worldHeight;
                    break;
            }
            
            this.specialDecorations.push({
                type: 'tank-wreck',
                x: x,
                y: y,
                size: 200, // Doble de grande (100 * 2 = 200)
                flipH: false,
                flipV: false
            });
        }
        
        // Grass: hasta 12 de cada tipo (grass1 y grass2)
        // Distribuidos SOLO en bordes superior e inferior con distancias aleatorias
        if (this.style.decorations.includes('grass')) {
            const grassTypes = ['grass1', 'grass2'];
            const borderMargin = 150; // Distancia máxima desde el borde
            const grassSize = 80; // Tamaño base del grass
            const placedGrass = []; // Guardar posiciones de grass ya colocado
            
            grassTypes.forEach(grassType => {
                // Hasta 12 instancias de cada tipo de grass
                for (let i = 0; i < 12; i++) {
                    const flipH = Math.random() < 0.5; // Aleatorio si está mirroreado o no
                    let attempts = 0;
                    let validPosition = false;
                    let x, y;
                    
                    // Intentar hasta 50 veces encontrar una posición válida
                    while (!validPosition && attempts < 50) {
                        // Solo bordes superior (0) e inferior (1) - NO laterales
                        const edge = Math.floor(Math.random() * 2);
                        
                        if (edge === 0) {
                            // Borde superior
                            x = Math.random() * this.worldWidth;
                            y = Math.random() * borderMargin;
                        } else {
                            // Borde inferior
                            x = Math.random() * this.worldWidth;
                            y = this.worldHeight - Math.random() * borderMargin;
                        }
                        
                        // Distancia mínima aleatoria entre 50px y 150px (mucho más cercanos que árboles)
                        const minGrassDistance = 50 + Math.random() * 100;
                        
                        // Verificar que no esté muy cerca de otros grass
                        validPosition = true;
                        for (const grass of placedGrass) {
                            const distance = Math.sqrt((x - grass.x) ** 2 + (y - grass.y) ** 2);
                            if (distance < minGrassDistance) {
                                validPosition = false;
                                break;
                            }
                        }
                        
                        attempts++;
                    }
                    
                    // Solo añadir si encontramos posición válida
                    if (validPosition) {
                        const grassData = {
                            type: grassType,
                            x: x,
                            y: y,
                            size: grassSize,
                            flipH: flipH,
                            flipV: false
                        };
                        
                        this.specialDecorations.push(grassData);
                        placedGrass.push({ x, y }); // Guardar posición para futuras verificaciones
                    }
                }
            });
        }
    }
    
    /**
     * Renderiza todos los tiles
     * @param {CanvasRenderingContext2D} ctx - Contexto de renderizado
     * @param {Object} assetManager - Gestor de sprites
     */
    render(ctx, assetManager) {
        if (!assetManager) return;
        
        // MODO ESPECIAL: Worldmap (una sola imagen estirada) con CACHE
        if (this.style.worldmapMode) {
            const worldmapSprite = assetManager.getSprite('map-worldmap');
            
            // Si no existe el cache, crearlo UNA SOLA VEZ
            if (!this.worldmapCacheReady && worldmapSprite && worldmapSprite.complete && worldmapSprite.naturalHeight !== 0) {
                // Crear offscreen canvas
                this.worldmapCache = document.createElement('canvas');
                this.worldmapCache.width = this.worldWidth;
                this.worldmapCache.height = this.worldHeight;
                const cacheCtx = this.worldmapCache.getContext('2d');
                
                // 🎨 MEJORA DE CALIDAD: Habilitar suavizado para mejor calidad al escalar
                cacheCtx.imageSmoothingEnabled = true;
                if (cacheCtx.imageSmoothingQuality) {
                    cacheCtx.imageSmoothingQuality = 'high';
                }
                
                // Dibujar el worldmap UNA SOLA VEZ en el cache
                cacheCtx.drawImage(worldmapSprite, 0, 0, this.worldWidth, this.worldHeight);
                this.worldmapCacheReady = true;
                // Worldmap cache creado (silencioso)
            }
            
            // Renderizar desde el cache (SUPER RÁPIDO)
            if (this.worldmapCacheReady && this.worldmapCache) {
                ctx.drawImage(this.worldmapCache, 0, 0);
            } else {
                // Fallback temporal mientras carga
                ctx.fillStyle = '#3a3a3a';
                ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);
            }
            return; // No renderizar tiles ni decoraciones
        }
        
        // MODO NORMAL: Tiles y decoraciones
        
        // PASADA 1: Suelo (floor1 y floor2)
        ctx.globalAlpha = 1; 
        for (const tile of this.tileMap) {
            if (!tile.isDecoration) {
                const sprite = assetManager.getSprite(`map-${tile.type}`);
                if (sprite) {
                    ctx.drawImage(sprite, tile.x, tile.y, this.tileSize, this.tileSize);
                }
            }
        }
        
        // PASADA 2: Decoraciones (soil, trace) - se renderizan encima
        for (const tile of this.tileMap) {
            if (tile.isDecoration) {
                const sprite = assetManager.getSprite(`map-${tile.type}`);
                if (sprite) {
                    if (tile.flipH || tile.flipV) {
                        ctx.save();
                        ctx.translate(tile.x + this.tileSize / 2, tile.y + this.tileSize / 2);
                        ctx.scale(tile.flipH ? -1 : 1, tile.flipV ? -1 : 1);
                        ctx.drawImage(sprite, -this.tileSize / 2, -this.tileSize / 2, this.tileSize, this.tileSize);
                        ctx.restore();
                    } else {
                        ctx.drawImage(sprite, tile.x, tile.y, this.tileSize, this.tileSize);
                    }
                }
            }
        }
        
        ctx.globalAlpha = 1; 
        
        // PASADA 3: Decoraciones especiales (logs, stones, tank_wreck, grass)
        for (const deco of this.specialDecorations) {
            const sprite = assetManager.getSprite(`map-${deco.type}`);
            if (sprite) {
                if (deco.flipH) {
                    ctx.save();
                    ctx.translate(deco.x, deco.y);
                    ctx.scale(-1, 1);
                    ctx.drawImage(sprite, -deco.size / 2, -deco.size / 2, deco.size, deco.size);
                    ctx.restore();
                } else {
                    ctx.drawImage(sprite, deco.x - deco.size / 2, deco.y - deco.size / 2, deco.size, deco.size);
                }
            }
        }
    }
    
    /**
     * Regenera el mapa de tiles (útil para cambiar de misión)
     */
    regenerate() {
        this.tileMap = [];
        this.specialDecorations = [];
        this.worldmapCacheReady = false; // Resetear cache si se regenera
        this.worldmapCache = null;
        this.generateTileMap();
        this.generateSpecialDecorations();
    }
}















