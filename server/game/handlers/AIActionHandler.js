// ===== HANDLER DE ACCIONES DE IA =====
// Ejecuta decisiones tomadas por la IA

export class AIActionHandler {
    constructor(gameState, io, roomId) {
        this.gameState = gameState;
        this.io = io;
        this.roomId = roomId;
        this.buildHandler = gameState.buildHandler;
        this.combatHandler = gameState.combatHandler;
    }
    
    /**
     * Ejecuta una acción de la IA
     * @param {Object} action - Acción a ejecutar {type, ...}
     * @param {string} team - Team de la IA (player2)
     */
    async executeAction(action, team) {
        if (!action) return false;
        
        try {
            switch (action.type) {
                case 'build':
                    return await this.executeBuild(action, team);
                case 'attack':
                    return await this.executeAttack(action, team);
                default:
                    console.warn(`⚠️ Acción desconocida: ${action.type}`);
                    return false;
            }
        } catch (error) {
            console.error(`❌ Error ejecutando acción de IA:`, error);
            return false;
        }
    }
    
    /**
     * Ejecuta construcción (simulando evento de jugador real)
     */
    async executeBuild(action, team) {
        if (!action.buildingType) {
            console.warn('⚠️ Building type no especificado');
            return false;
        }
        
        // Obtener nodos del equipo
        const myNodes = this.gameState.nodes.filter(n => n.team === team);
        const myHQ = myNodes.find(n => n.type === 'hq');
        
        if (!myHQ) {
            console.warn('⚠️ HQ no encontrado para IA');
            return false;
        }
        
        // Calcular posición cerca del HQ
        const buildPosition = this.calculateBuildPosition(myHQ, myNodes, action.buildingType);
        
        if (!buildPosition) {
            console.warn('⚠️ No se pudo calcular posición de construcción');
            return false;
        }
        
        // 🎯 SIMULAR EVENTO DE JUGADOR REAL: Usar mismo handler que jugadores
        const result = this.gameState.handleBuild(team, action.buildingType, buildPosition.x, buildPosition.y);
        
        if (result.success) {
            // 🎯 BROADCAST como si fuera un jugador real
            this.io.to(this.roomId).emit('building_created', {
                nodeId: result.node.id,
                type: action.buildingType,
                x: buildPosition.x,
                y: buildPosition.y,
                team: team,
                constructionTime: result.node.constructionTime
            });
        }
        
        return result.success;
    }
    
    /**
     * Ejecuta ataque
     */
    async executeAttack(action, team) {
        if (!action.attackType) {
            console.warn('⚠️ Attack type no especificado');
            return false;
        }
        
        const myNodes = this.gameState.nodes.filter(n => n.team === team);
        
        // Dron
        if (action.attackType === 'drone') {
            return await this.executeDroneAttack(myNodes, team);
        }
        
        // Sniper
        if (action.attackType === 'sniper') {
            return await this.executeSniperAttack(myNodes, team);
        }
        
        return false;
    }
    
    /**
     * Ejecuta ataque con dron
     */
    async executeDroneAttack(myNodes, team) {
        // Encontrar lanzadera
        const launcher = myNodes.find(n => n.type === 'droneLauncher' && n.active);
        
        if (!launcher) {
            return false;
        }
        
        // Encontrar objetivo prioritario
        const target = this.findBestDroneTarget();
        
        if (!target) {
            return false;
        }
        
        // Lanzar dron
        return await this.gameState.droneSystem.launchDrone(team, launcher, target);
    }
    
    /**
     * Ejecuta ataque con sniper
     */
    async executeSniperAttack(myNodes, team) {
        // Encontrar HQ para obtener posición base
        const hq = myNodes.find(n => n.type === 'hq');
        
        if (!hq) {
            return false;
        }
        
        // Encontrar objetivo aleatorio del jugador
        const playerNodes = this.gameState.nodes.filter(n => n.team === 'player1' && n.active);
        const targets = playerNodes.filter(n => 
            n.type === 'fob' || 
            n.type === 'campaignFront' || 
            n.type === 'campaignHospital'
        );
        
        if (targets.length === 0) {
            return false;
        }
        
        const target = targets[Math.floor(Math.random() * targets.length)];
        
        // TODO: Implementar sniper en CombatHandler
        
        return true;
    }
    
    /**
     * Encuentra mejor objetivo para dron
     */
    findBestDroneTarget() {
        const playerNodes = this.gameState.nodes.filter(n => n.team === 'player1' && n.active);
        
        // Prioridad: Plantas > Hospitales > FOBs
        let target = playerNodes.find(n => n.type === 'nuclearPlant');
        if (!target) target = playerNodes.find(n => n.type === 'campaignHospital');
        if (!target) target = playerNodes.find(n => n.type === 'fob');
        
        return target;
    }
    
    /**
     * Calcula posición para construcción (usando mismo sistema que BuildHandler)
     * 🆕 MEJORADO: Para B_Nation construyendo Base Aérea, usa punto intermedio entre HQ y frentes
     */
    calculateBuildPosition(hq, myNodes, buildingType) {
        const territoryCalculator = this.gameState.territoryCalculator;
        const team = hq.team;
        
        // 🆕 NUEVO: Posición óptima para Base Aérea de B_Nation (intermedio entre HQ y frentes)
        const raceManager = this.gameState.raceManager;
        const playerRace = raceManager.getPlayerRace(team);
        
        if (playerRace === 'B_Nation' && buildingType === 'aerialBase') {
            const myFronts = myNodes.filter(n => n.type === 'front' && n.active);
            
            if (myFronts.length > 0) {
                // Calcular punto medio entre HQ y frentes
                // Si hay múltiples frentes, usar el promedio de sus posiciones
                let avgFrontX = 0;
                let avgFrontY = 0;
                
                for (const front of myFronts) {
                    avgFrontX += front.x;
                    avgFrontY += front.y;
                }
                
                avgFrontX /= myFronts.length;
                avgFrontY /= myFronts.length;
                
                // Calcular punto intermedio (50% entre HQ y promedio de frentes)
                const midpointX = (hq.x + avgFrontX) / 2;
                const midpointY = (hq.y + avgFrontY) / 2;
                
                // Buscar posición válida cerca del punto intermedio
                // Intentar en círculos concéntricos alrededor del punto medio
                const searchDistances = [0, 50, 100, 150, 200, 250];
                const searchAngles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4];
                
                for (const distance of searchDistances) {
                    for (const angle of searchAngles) {
                        const x = midpointX + Math.cos(angle) * distance;
                        const y = midpointY + Math.sin(angle) * distance;
                        
                        if (this.buildHandler.isValidLocation(x, y, buildingType) && 
                            territoryCalculator.isInTeamTerritory(x, team)) {
                            return { x, y };
                        }
                    }
                }
                
                // Si no se encontró posición válida cerca del punto intermedio, continuar con estrategia normal
                console.warn(`⚠️ IA B_Nation: No se encontró posición válida cerca del punto intermedio, usando estrategia normal`);
            }
        }
        
        // Estrategia 1: Círculo alrededor del HQ (múltiples distancias y ángulos)
        const distances = [200, 250, 300, 150, 350, 400];
        const angles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4];
        for (const distance of distances) {
            for (const angle of angles) {
                const x = hq.x + Math.cos(angle) * distance;
                const y = hq.y + Math.sin(angle) * distance;
                // Usar isValidLocation del BuildHandler (mismo sistema de validación)
                if (this.buildHandler.isValidLocation(x, y, buildingType) && 
                    territoryCalculator.isInTeamTerritory(x, team)) {
                    return { x, y };
                }
            }
        }
        
        // Estrategia 2: Espiral desde el HQ
        const step = 50;
        const maxRadius = 500;
        for (let radius = 150; radius <= maxRadius; radius += step) {
            const steps = Math.max(8, Math.floor((radius * 2 * Math.PI) / step));
            for (let i = 0; i < steps; i++) {
                const angle = (i / steps) * Math.PI * 2;
                const x = hq.x + Math.cos(angle) * radius;
                const y = hq.y + Math.sin(angle) * radius;
                if (this.buildHandler.isValidLocation(x, y, buildingType) && 
                    territoryCalculator.isInTeamTerritory(x, team)) {
                    return { x, y };
                }
            }
        }
        
        // Estrategia 3: Grid alrededor del HQ
        const gridSize = 150;
        const range = 5;
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                if (dx === 0 && dy === 0) continue;
                const x = hq.x + dx * gridSize;
                const y = hq.y + dy * gridSize;
                if (this.buildHandler.isValidLocation(x, y, buildingType) && 
                    territoryCalculator.isInTeamTerritory(x, team)) {
                    return { x, y };
                }
            }
        }
        
        // Último fallback: posición aleatoria lejos del HQ
        for (let attempt = 0; attempt < 100; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 200 + Math.random() * 400;
            const x = hq.x + Math.cos(angle) * distance;
            const y = hq.y + Math.sin(angle) * distance;
            if (this.buildHandler.isValidLocation(x, y, buildingType) && 
                territoryCalculator.isInTeamTerritory(x, team)) {
                return { x, y };
            }
        }
        
        // Si TODO falla
        console.warn(`⚠️ IA: No se pudo encontrar posición válida para ${buildingType} después de 100+ intentos`);
        return { 
            x: hq.x + 200, 
            y: hq.y 
        };
    }
}

