// ===== SISTEMA DE CONTROL DE TERRITORIO (FRONTERA DINÁMICA) =====

// Configuración de territorio
const TERRITORY_CONFIG = {
    allyColor: 'rgba(57, 111, 211, 0.23)',      // Color del territorio aliado (azul semi-transparente)
    allyBorderColor: 'rgba(52, 91, 219, 0.8)', // Color del borde aliado (azul intenso)
    enemyColor: 'rgba(231, 77, 60, 0.18)',      // Color del territorio enemigo (rojo semi-transparente)
    enemyBorderColor: 'rgba(231, 76, 60, 0.8)', // Color del borde enemigo (rojo intenso)
    frontierGapPx: 25                            // Separación entre el frente y su frontera
};

export class TerritorySystem {
    constructor(game) {
        this.game = game;
        
        // Colores del territorio
        this.allyColor = TERRITORY_CONFIG.allyColor;
        this.allyBorderColor = TERRITORY_CONFIG.allyBorderColor;
        this.enemyColor = TERRITORY_CONFIG.enemyColor;
        this.enemyBorderColor = TERRITORY_CONFIG.enemyBorderColor;
        
        // Vértices de las fronteras
        this.allyFrontierVertices = [];   // Frontera aliada (azul)
        this.enemyFrontierVertices = [];  // Frontera enemiga (roja)
        
        // Flag para saber si necesita inicialización
        this.allyInitialized = false;
        this.enemyInitialized = false;
        
        // Sistema de abandono de FOBs
        this.checkAbandonmentTimer = 0;
        this.checkAbandonmentInterval = 1.0; // Verificar cada 1 segundo
    }
    
    /**
     * Normaliza un equipo a 'ally' o 'enemy' para uso interno con las fronteras
     * @param {string} team - El equipo a normalizar ('ally', 'player1', 'player2', etc.)
     * @returns {string} 'ally' o 'enemy'
     */
    normalizeTeamToFrontier(team) {
        // Si es mi equipo, mapear a 'ally'
        if (team === this.game.myTeam || team === 'ally') {
            return 'ally';
        }
        // Cualquier otro equipo es 'enemy'
        return 'enemy';
    }
    
    // Fuente de bases: usa nodos del tutorial cuando el estado es 'tutorial'
    getBases() {
        if (this.game.state === 'tutorial' && this.game.tutorialManager && this.game.tutorialManager.tutorialNodes) {
            // Filtrar como en Game.bases
            return this.game.tutorialManager.tutorialNodes.filter(n => 
                n.category === 'map_node' || 
                n.category === 'enemy' || 
                (n.category === 'buildable' && n.hasVehicles)
            );
        }
        return this.game.bases;
    }
    
    /**
     * Resetea completamente el estado del territorio
     */
    reset() {
        this.allyFrontierVertices = [];
        this.enemyFrontierVertices = [];
        this.allyInitialized = false;
        this.enemyInitialized = false;
    }
    
    /**
     * Inicializa la frontera ALIADA basándose en los frentes aliados
     */
    initializeAllyFrontier() {
        // En multiplayer, usar lógica basada en player1/player2 para estabilidad
        // En singleplayer, usar myTeam dinámico para soportar 'ally'
        const teamToFilter = this.game.isMultiplayer ? 'player1' : (this.game.myTeam || 'ally');
        const fronts = this.getBases().filter(b => b.type === 'front' && b.team === teamToFilter);
        
        if (fronts.length === 0) {
            this.allyFrontierVertices = [];
            this.allyInitialized = false;
            return;
        }
        
        // Ordenar frentes de arriba a abajo (por posición Y)
        fronts.sort((a, b) => a.y - b.y);
        
        const worldHeight = this.game.worldHeight;
        
        // Offset: el vértice debe estar DELANTE del frente (a la derecha)
        const gap = TERRITORY_CONFIG.frontierGapPx;
        const frontOffset = (fronts[0].radius || 40) + gap; // Offset delante del sprite
        
        // Crear vértices: esquina superior izquierda → cada frente → esquina inferior izquierda
        this.allyFrontierVertices = [
            { x: fronts[0].x + frontOffset, y: 0, frontId: null }, // Vértice superior
            ...fronts.map(f => ({ x: f.x + (f.radius || 40) + gap, y: f.y, frontId: f.id })), // Vértices delante del sprite
            { x: fronts[fronts.length - 1].x + frontOffset, y: worldHeight, frontId: null } // Vértice inferior
        ];
        
        this.allyInitialized = true;
    }
    
    /**
     * Inicializa la frontera ENEMIGA basándose en los frentes enemigos
     * ESPEJO de la frontera aliada: mira hacia la izquierda
     */
    initializeEnemyFrontier() {
        // En multiplayer, siempre player2 es el enemigo
        // En singleplayer, el enemigo es cualquier team que NO sea el mío
        let enemyFronts;
        if (this.game.isMultiplayer) {
            enemyFronts = this.getBases().filter(b => b.type === 'front' && b.team === 'player2');
        } else {
            const myTeam = this.game.myTeam || 'ally';
            enemyFronts = this.getBases().filter(b => b.type === 'front' && b.team !== myTeam);
        }
        
        if (enemyFronts.length === 0) {
            this.enemyFrontierVertices = [];
            this.enemyInitialized = false;
            return;
        }
        
        // Ordenar frentes de arriba a abajo (por posición Y)
        enemyFronts.sort((a, b) => a.y - b.y);
        
        const worldHeight = this.game.worldHeight;
        
        // Offset: el vértice debe estar DELANTE del frente enemigo (a la IZQUIERDA - espejo)
        const gap = TERRITORY_CONFIG.frontierGapPx;
        const frontOffset = (enemyFronts[0].radius || 40) + gap; // Offset delante del sprite
        
        // Crear vértices: esquina superior derecha → cada frente → esquina inferior derecha
        // NOTA: Los vértices van a la IZQUIERDA del frente enemigo (espejo)
        this.enemyFrontierVertices = [
            { x: enemyFronts[0].x - frontOffset, y: 0, frontId: null }, // Vértice superior
            ...enemyFronts.map(f => ({ x: f.x - (f.radius || 40) - gap, y: f.y, frontId: f.id })), // Vértices delante (izquierda) del sprite
            { x: enemyFronts[enemyFronts.length - 1].x - frontOffset, y: worldHeight, frontId: null } // Vértice inferior
        ];
        
        this.enemyInitialized = true;
    }
    
    /**
     * Actualiza la posición X de los vértices ALIADOS basándose en los frentes aliados
     */
    updateAllyFrontierPositions() {
        const teamToFilter = this.game.isMultiplayer ? 'player1' : (this.game.myTeam || 'ally');
        const fronts = this.getBases().filter(b => b.type === 'front' && b.team === teamToFilter);
        
        // Si no hay frentes o no está inicializado, reinicializar
        if (!this.allyInitialized || fronts.length === 0) {
            this.initializeAllyFrontier();
            return;
        }
        
        // Actualizar posiciones de vértices basándose en frentes
        for (const vertex of this.allyFrontierVertices) {
            if (vertex.frontId !== null) {
                const front = fronts.find(f => f.id === vertex.frontId);
                if (front) {
                    const frontOffset = (front.radius || 40) + TERRITORY_CONFIG.frontierGapPx;
                    vertex.x = front.x + frontOffset; // DELANTE del frente con separación
                    vertex.y = front.y; // Actualizar también Y por si acaso
                }
            }
        }
        
        // Actualizar vértices superior e inferior para que sigan al frente más cercano
        if (this.allyFrontierVertices.length > 0 && fronts.length > 0) {
            const sortedFronts = [...fronts].sort((a, b) => a.y - b.y);
            const gap = TERRITORY_CONFIG.frontierGapPx;
            const offTop = (sortedFronts[0].radius || 40) + gap;
            const offBottom = (sortedFronts[sortedFronts.length - 1].radius || 40) + gap;
            this.allyFrontierVertices[0].x = sortedFronts[0].x + offTop; // Superior
            this.allyFrontierVertices[this.allyFrontierVertices.length - 1].x = sortedFronts[sortedFronts.length - 1].x + offBottom; // Inferior
        }
    }
    
    /**
     * Actualiza la posición X de los vértices ENEMIGOS basándose en los frentes enemigos
     * ESPEJO de la actualización aliada (mirando a la izquierda)
     */
    updateEnemyFrontierPositions() {
        let enemyFronts;
        if (this.game.isMultiplayer) {
            enemyFronts = this.getBases().filter(b => b.type === 'front' && b.team === 'player2');
        } else {
            const myTeam = this.game.myTeam || 'ally';
            enemyFronts = this.getBases().filter(b => b.type === 'front' && b.team !== myTeam);
        }
        
        // Si no hay frentes enemigos o no está inicializado, reinicializar
        if (!this.enemyInitialized || enemyFronts.length === 0) {
            this.initializeEnemyFrontier();
            return;
        }
        
        // Actualizar posiciones de vértices basándose en frentes enemigos
        for (const vertex of this.enemyFrontierVertices) {
            if (vertex.frontId !== null) {
                const enemyFront = enemyFronts.find(f => f.id === vertex.frontId);
                if (enemyFront) {
                    const frontOffset = (enemyFront.radius || 40) + TERRITORY_CONFIG.frontierGapPx;
                    vertex.x = enemyFront.x - frontOffset; // DELANTE (izquierda) del frente enemigo
                    vertex.y = enemyFront.y; // Actualizar también Y por si acaso
                }
            }
        }
        
        // Actualizar vértices superior e inferior para que sigan al frente más cercano
        if (this.enemyFrontierVertices.length > 0 && enemyFronts.length > 0) {
            const sortedEnemyFronts = [...enemyFronts].sort((a, b) => a.y - b.y);
            const gap = TERRITORY_CONFIG.frontierGapPx;
            const offTop = (sortedEnemyFronts[0].radius || 40) + gap;
            const offBottom = (sortedEnemyFronts[sortedEnemyFronts.length - 1].radius || 40) + gap;
            this.enemyFrontierVertices[0].x = sortedEnemyFronts[0].x - offTop; // Superior
            this.enemyFrontierVertices[this.enemyFrontierVertices.length - 1].x = sortedEnemyFronts[sortedEnemyFronts.length - 1].x - offBottom; // Inferior
        }
    }
    
    /**
     * Renderiza el territorio controlado (fronteras dinámicas duales)
     * @param {CanvasRenderingContext2D} ctx - Contexto de renderizado
     */
    render(ctx) {
        ctx.save();
        
        // Actualizar posiciones de ambas fronteras
        this.updateAllyFrontierPositions();
        this.updateEnemyFrontierPositions();
        
        const worldWidth = this.game.worldWidth;
        const worldHeight = this.game.worldHeight;
        
        // === DIBUJAR TERRITORIO ALIADO (IZQUIERDA - AZUL) ===
        if (this.allyFrontierVertices.length > 0) {
            ctx.beginPath();
            ctx.moveTo(0, 0); // Esquina superior izquierda del mundo
            
            // Seguir la frontera aliada (vértices de arriba a abajo)
            for (const vertex of this.allyFrontierVertices) {
                ctx.lineTo(vertex.x, vertex.y);
            }
            
            // Cerrar el polígono por el borde izquierdo
            ctx.lineTo(0, worldHeight); // Esquina inferior izquierda
            ctx.closePath();
            
            ctx.fillStyle = this.allyColor;
            ctx.fill();
        }
        
        // === DIBUJAR TERRITORIO ENEMIGO (DERECHA - ROJO) ===
        if (this.enemyFrontierVertices.length > 0) {
            ctx.beginPath();
            ctx.moveTo(worldWidth, 0); // Esquina superior derecha del mundo
            ctx.lineTo(worldWidth, worldHeight); // Esquina inferior derecha
            
            // Seguir la frontera enemiga de abajo a arriba (orden inverso)
            for (let i = this.enemyFrontierVertices.length - 1; i >= 0; i--) {
                ctx.lineTo(this.enemyFrontierVertices[i].x, this.enemyFrontierVertices[i].y);
            }
            
            ctx.closePath();
            
            ctx.fillStyle = this.enemyColor;
            ctx.fill();
        }
        
        // === DIBUJAR BORDE DE LA FRONTERA ALIADA (AZUL) ===
        if (this.allyFrontierVertices.length > 0) {
            ctx.beginPath();
            ctx.moveTo(this.allyFrontierVertices[0].x, this.allyFrontierVertices[0].y);
            
            for (let i = 1; i < this.allyFrontierVertices.length; i++) {
                ctx.lineTo(this.allyFrontierVertices[i].x, this.allyFrontierVertices[i].y);
            }
            
            ctx.strokeStyle = this.allyBorderColor;
            ctx.lineWidth = 4;
            ctx.stroke();
        }
        
        // === DIBUJAR BORDE DE LA FRONTERA ENEMIGA (ROJO) ===
        if (this.enemyFrontierVertices.length > 0) {
            ctx.beginPath();
            ctx.moveTo(this.enemyFrontierVertices[0].x, this.enemyFrontierVertices[0].y);
            
            for (let i = 1; i < this.enemyFrontierVertices.length; i++) {
                ctx.lineTo(this.enemyFrontierVertices[i].x, this.enemyFrontierVertices[i].y);
            }
            
            ctx.strokeStyle = this.enemyBorderColor;
            ctx.lineWidth = 4;
            ctx.stroke();
        }
        
        ctx.restore();
    }

    /**
     * Renderiza los porcentajes de territorio controlado en la parte superior del mapa
     * SIN MIRROR: Azul siempre izquierda, Rojo siempre derecha
     * @param {CanvasRenderingContext2D} ctx - Contexto de renderizado
     */
    renderTerritoryPercentages(ctx) {
        // En multiplayer, usar lógica explícita player1/player2
        // En singleplayer, usar detección dinámica de equipos
        const bases = this.getBases();
        const myTeam = this.game.myTeam || 'ally'; // Definir aquí para que esté disponible en todo el método
        
        let player1Percentage, player2Percentage, topPlayer1Front, topPlayer2Front;
        
        if (this.game.isMultiplayer) {
            // MULTIPLAYER: Lógica original (estable)
            player1Percentage = this.calculateTerritoryPercentage('player1');
            player2Percentage = this.calculateTerritoryPercentage('player2');
            
            const player1Fronts = bases.filter(b => b.type === 'front' && b.team === 'player1');
            const player2Fronts = bases.filter(b => b.type === 'front' && b.team === 'player2');
            player1Fronts.sort((a, b) => a.y - b.y);
            player2Fronts.sort((a, b) => a.y - b.y);
            topPlayer1Front = player1Fronts[0] || null;
            topPlayer2Front = player2Fronts[0] || null;
        } else {
            // SINGLEPLAYER: Detección dinámica
            const myFronts = bases.filter(b => b.type === 'front' && b.team === myTeam);
            const enemyFronts = bases.filter(b => b.type === 'front' && b.team !== myTeam);
            myFronts.sort((a, b) => a.y - b.y);
            enemyFronts.sort((a, b) => a.y - b.y);
            
            player1Percentage = this.calculateTerritoryPercentage(myTeam);
            player2Percentage = enemyFronts.length > 0 ? this.calculateTerritoryPercentage(enemyFronts[0].team) : 0;
            topPlayer1Front = myFronts[0] || null;
            topPlayer2Front = enemyFronts[0] || null;
        }
        
        const topY = 20; // parte superior del mundo
        const margin = 24;
        const clamp = (x) => Math.max(margin, Math.min(this.game.worldWidth - margin, x));
        
        // Colores: Azul para MI equipo, Rojo para ENEMIGO
        const myColor = 'rgba(0, 100, 255, 0.9)'; // Azul (mi equipo)
        const enemyColor = 'rgba(255, 50, 50, 0.9)'; // Rojo (enemigo)
        
        // Determinar porcentajes y frentes según MI perspectiva
        let myPercentage, enemyPercentage, myTopFront, enemyTopFront;
        
        if (myTeam === 'player1') {
            // Soy player1 (azul)
            myPercentage = player1Percentage;
            enemyPercentage = player2Percentage;
            myTopFront = topPlayer1Front;
            enemyTopFront = topPlayer2Front;
        } else if (myTeam === 'player2') {
            // Soy player2 (rojo en mundo, pero AZUL en mi vista)
            myPercentage = player2Percentage;
            enemyPercentage = player1Percentage;
            myTopFront = topPlayer2Front;
            enemyTopFront = topPlayer1Front;
        } else {
            // Singleplayer: player1 = azul (yo), player2 = rojo (enemigo)
            myPercentage = player1Percentage;
            enemyPercentage = player2Percentage;
            myTopFront = topPlayer1Front;
            enemyTopFront = topPlayer2Front;
        }
        
        // === MI PORCENTAJE (AZUL) - SIEMPRE SOBRE MI FRENTE ===
        if (myPercentage > 0 && myTopFront) {
            let textX = clamp(myTopFront.x);
            
            ctx.save();
            ctx.fillStyle = myColor; // Azul (mi equipo)
            ctx.font = 'bold 21px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(`${myPercentage}%`, textX, topY);
            ctx.restore();
        }
        
        // === PORCENTAJE ENEMIGO (ROJO) - SIEMPRE SOBRE FRENTE ENEMIGO ===
        if (enemyPercentage > 0 && enemyTopFront) {
            let textX = clamp(enemyTopFront.x);
            
            ctx.save();
            ctx.fillStyle = enemyColor; // Rojo (enemigo)
            ctx.font = 'bold 21px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(`${enemyPercentage}%`, textX, topY);
            ctx.restore();
        }
    }

    brightenColor(rgbaString, factor) {
        try {
            const m = rgbaString.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/i);
            if (!m) return rgbaString;
            const r = Math.min(255, Math.round(parseInt(m[1], 10) * (1 + factor)));
            const g = Math.min(255, Math.round(parseInt(m[2], 10) * (1 + factor)));
            const b = Math.min(255, Math.round(parseInt(m[3], 10) * (1 + factor)));
            const a = Math.min(1, parseFloat(m[4]) * (1 + factor));
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        } catch (e) {
            return rgbaString;
        }
    }

    /**
     * Calcula el porcentaje de territorio controlado por un bando
     * @param {string} team - 'ally', 'player1', 'player2', etc.
     * @returns {number} Porcentaje de territorio (0-100)
     */
    calculateTerritoryPercentage(team) {
        const normalizedTeam = this.normalizeTeamToFrontier(team);
        
        if (normalizedTeam === 'ally') {
            if (this.allyFrontierVertices.length === 0) return 0;
            // Calcular área del territorio aliado
            const area = this.calculateAllyTerritoryArea();
            const totalArea = this.game.worldWidth * this.game.worldHeight;
            return Math.round((area / totalArea) * 100);
        } else {
            if (this.enemyFrontierVertices.length === 0) return 0;
            // Calcular área del territorio enemigo
            const area = this.calculateEnemyTerritoryArea();
            const totalArea = this.game.worldWidth * this.game.worldHeight;
            return Math.round((area / totalArea) * 100);
        }
    }

    /**
     * Calcula el área del territorio aliado
     * @returns {number} Área en píxeles cuadrados
     */
    calculateAllyTerritoryArea() {
        if (this.allyFrontierVertices.length === 0) return 0;
        
        const worldHeight = this.game.worldHeight;
        let area = 0;
        
        // Área desde el borde izquierdo (0) hasta la frontera aliada
        for (let i = 0; i < this.allyFrontierVertices.length - 1; i++) {
            const v1 = this.allyFrontierVertices[i];
            const v2 = this.allyFrontierVertices[i + 1];
            
            // Área del trapecio entre dos vértices
            const height = Math.abs(v2.y - v1.y);
            const avgX = (v1.x + v2.x) / 2;
            area += avgX * height;
        }
        
        return area;
    }

    /**
     * Calcula el área del territorio enemigo
     * @returns {number} Área en píxeles cuadrados
     */
    calculateEnemyTerritoryArea() {
        if (this.enemyFrontierVertices.length === 0) return 0;
        
        const worldWidth = this.game.worldWidth;
        const worldHeight = this.game.worldHeight;
        let area = 0;
        
        // Área desde la frontera enemiga hasta el borde derecho (worldWidth)
        for (let i = 0; i < this.enemyFrontierVertices.length - 1; i++) {
            const v1 = this.enemyFrontierVertices[i];
            const v2 = this.enemyFrontierVertices[i + 1];
            
            // Área del trapecio entre dos vértices
            const height = Math.abs(v2.y - v1.y);
            const avgX = (v1.x + v2.x) / 2;
            const width = worldWidth - avgX;
            area += width * height;
        }
        
        return area;
    }
    
    /**
     * Calcula el territorio total controlado (aproximación usando polígono)
     * @returns {number} Área total aproximada
     */
    calculateControlledTerritory() {
        if (this.allyFrontierVertices.length === 0) return 0;
        
        const worldHeight = this.game.worldHeight;
        
        // Calcular área usando fórmula del trapecio
        let totalArea = 0;
        
        for (let i = 0; i < this.allyFrontierVertices.length - 1; i++) {
            const v1 = this.allyFrontierVertices[i];
            const v2 = this.allyFrontierVertices[i + 1];
            
            // Área del trapecio formado entre dos vértices
            const height = Math.abs(v2.y - v1.y);
            const avgX = (v1.x + v2.x) / 2;
            totalArea += avgX * height;
        }
        
        return Math.floor(totalArea);
    }
    
    /**
     * Calcula el avance máximo del territorio aliado (posición X más avanzada)
     * @returns {number} Posición X del frente aliado más avanzado
     */
    calculateMaxAdvance() {
        if (this.allyFrontierVertices.length === 0) return 0;
        
        return Math.max(...this.allyFrontierVertices.map(v => v.x));
    }
    
    /**
     * Actualiza el sistema de territorio (detección de FOBs fuera de territorio)
     * ⚠️ LEGACY REMOVED: El servidor maneja toda la lógica de abandono de edificios.
     * El cliente solo renderiza el territorio basado en las posiciones de frentes del servidor.
     * @param {number} dt - Delta time en segundos
     */
    update(dt) {
        // El servidor autoritativo maneja toda la detección y ejecución de abandono.
        // El cliente solo renderiza el territorio basado en las posiciones que vienen del servidor.
        // TODO: Eliminar completamente este método o dejar vacío si se necesita para compatibilidad.
    }
    
    /**
     * Verifica si hay edificios construibles completamente fuera del territorio de su bando
     * Incluye: FOBs, Anti-Drones, Hospitales, Plantas Nucleares, etc.
     * Excluye: Proyectiles/consumibles (dron, sniper) que no permanecen en el mapa
     */
    checkFOBsOutOfTerritory() {
        // Verificar edificios ALIADOS construibles
        const allyBuildings = this.game.nodes.filter(n => 
            n.category === 'buildable' && 
            n.team === this.game.myTeam &&
            n.constructed && 
            !n.isAbandoning &&
            n.type !== 'drone' && // Excluir proyectiles
            n.type !== 'sniperStrike' &&
            n.type !== 'specopsCommando' // 🆕 Excluir comando - puede estar en territorio enemigo
        );
        
        for (const building of allyBuildings) {
            if (this.isBuildingCompletelyOutOfTerritory(building, this.game.myTeam)) {
                building.startAbandoning();
            }
        }
        
        // Verificar edificios ENEMIGOS (cualquier team que NO sea el mío)
        const enemyBuildings = this.game.nodes.filter(n => 
            n.category === 'buildable' && 
            n.team !== this.game.myTeam &&
            n.constructed &&
            !n.isAbandoning &&
            n.type !== 'drone' && // Excluir proyectiles
            n.type !== 'sniperStrike' &&
            n.type !== 'specopsCommando' // 🆕 Excluir comando - puede estar en territorio enemigo
        );
        
        for (const building of enemyBuildings) {
            if (this.isBuildingCompletelyOutOfTerritory(building, 'enemy')) {
                building.startAbandoning();
            }
        }
    }
    
    /**
     * Verifica si un edificio construible está COMPLETAMENTE fuera del territorio de su bando
     * (toda su hitbox, no solo el centro)
     * Aplica a: FOBs, Anti-Drones, Hospitales, Plantas Nucleares, etc.
     * @param {MapNode} building - El edificio a verificar
     * @param {string} team - 'ally', 'player1', 'player2', etc.
     * @returns {boolean} true si está completamente fuera de territorio
     */
    isBuildingCompletelyOutOfTerritory(building, team) {
        const buildingRadius = building.radius || 40;
        const normalizedTeam = this.normalizeTeamToFrontier(team);
        
        if (normalizedTeam === 'ally') {
            // Edificio aliado: está fuera si TODO el edificio está a la DERECHA (adelante) de la frontera aliada
            // El territorio aliado va desde el HQ (izquierda) hasta la frontera (frente)
            // Un edificio está fuera si está MÁS ALLÁ del frente (a la derecha de la frontera)
            
            // Verificar el punto más a la IZQUIERDA del edificio (centro - radio)
            const buildingLeftEdge = building.x - buildingRadius;
            
            // Obtener la posición X de la frontera a la altura del edificio
            const frontierX = this.getFrontierXAtY(building.y, team);
            
            // Si el borde IZQUIERDO del edificio está más adelante que la frontera, TODO el edificio está fuera
            return buildingLeftEdge > frontierX;
            
        } else {
            // Edificio enemigo: está fuera si TODO el edificio está a la IZQUIERDA (adelante) de la frontera enemiga
            // El territorio enemigo va desde la frontera (frente) hasta el HQ (derecha)
            // Un edificio está fuera si está MÁS ALLÁ del frente (a la izquierda de la frontera)
            
            // Verificar el punto más a la DERECHA del edificio (centro + radio)
            const buildingRightEdge = building.x + buildingRadius;
            
            // Obtener la posición X de la frontera a la altura del edificio
            const frontierX = this.getFrontierXAtY(building.y, 'enemy');
            
            // Si el borde DERECHO del edificio está más adelante que la frontera, TODO el edificio está fuera
            return buildingRightEdge < frontierX;
        }
    }
    
    /**
     * Obtiene la posición X de una frontera a una altura Y específica
     * Interpola entre los vértices de la frontera
     * @param {number} y - Altura Y donde buscar la frontera
     * @param {string} team - 'ally', 'player1', 'player2', etc.
     * @returns {number} Posición X de la frontera a esa altura
     */
    getFrontierXAtY(y, team) {
        const normalizedTeam = this.normalizeTeamToFrontier(team);
        const vertices = normalizedTeam === 'ally' ? this.allyFrontierVertices : this.enemyFrontierVertices;
        
        if (vertices.length === 0) {
            // Si no hay frontera, usar el borde del mapa
            return normalizedTeam === 'ally' ? 0 : this.game.worldWidth;
        }
        
        // Buscar los dos vértices entre los que está Y
        for (let i = 0; i < vertices.length - 1; i++) {
            const v1 = vertices[i];
            const v2 = vertices[i + 1];
            
            if (y >= v1.y && y <= v2.y) {
                // Interpolar linealmente entre los dos vértices
                const t = (y - v1.y) / (v2.y - v1.y);
                return v1.x + (v2.x - v1.x) * t;
            }
        }
        
        // Si Y está fuera del rango, usar el vértice más cercano
        if (y < vertices[0].y) return vertices[0].x;
        if (y > vertices[vertices.length - 1].y) return vertices[vertices.length - 1].x;
        
        // Fallback
        return normalizedTeam === 'ally' ? 0 : this.game.worldWidth;
    }
    
    /**
     * Verifica si una posición (x, y) está dentro del territorio aliado
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @returns {boolean} true si está dentro del territorio aliado
     */
    isInAllyTerritory(x, y) {
        // Obtener la frontera aliada a esa altura
        const frontierX = this.getFrontierXAtY(y, this.game.myTeam);
        
        // Detectar si somos player1 (izquierda) o player2 (derecha)
        // Buscar nuestro HQ para saber de qué lado del mapa estamos
        // USAR getBases() para que funcione correctamente en tutorial
        const bases = this.getBases();
        const myHQ = bases.find(n => n.type === 'hq' && n.team === this.game.myTeam);
        const isLeftSide = myHQ && myHQ.x < this.game.worldWidth / 2;
        
        if (isLeftSide) {
            // Player1 (lado izquierdo): Territorio va desde 0 hasta frontierX
            // Está dentro si X es MENOR que la frontera (a la izquierda)
            return x < frontierX;
        } else {
            // Player2 (lado derecho): Territorio va desde frontierX hasta worldWidth
            // Está dentro si X es MAYOR que la frontera (a la derecha)
            return x > frontierX;
        }
    }
    
    /**
     * Verifica si una posición (x, y) está dentro del territorio enemigo
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @returns {boolean} true si está dentro del territorio enemigo
     */
    isInEnemyTerritory(x, y) {
        // Obtener la frontera enemiga a esa altura
        const frontierX = this.getFrontierXAtY(y, 'enemy');
        
        // Está dentro si X es MAYOR que la frontera (a la derecha)
        // Territorio enemigo va desde la frontera hasta el borde derecho
        return x > frontierX;
    }
}











