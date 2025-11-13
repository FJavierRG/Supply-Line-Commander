// ===== SERIALIZADOR DE ESTADO =====
export class StateSerializer {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Verifica si un nodo tiene cambios significativos desde el último envío
     */
    hasNodeSignificantChanges(node) {
        const lastNodeState = this.gameState.lastNodeStates.get(node.id);
        
        // Si es la primera vez que vemos este nodo, enviarlo
        if (!lastNodeState) {
            return true;
        }
        
        // Cambios críticos que SIEMPRE requieren actualización
        if (node.constructed !== lastNodeState.constructed ||
            node.isConstructing !== lastNodeState.isConstructing ||
            node.active !== lastNodeState.active ||
            node.isAbandoning !== lastNodeState.isAbandoning) {
            return true;
        }
        
        // Cambios en posición (crítico para frentes)
        if (Math.abs(node.x - lastNodeState.x) > 0.1 || 
            Math.abs(node.y - lastNodeState.y) > 0.1) {
            return true;
        }
        
        // Cambios significativos en supplies (≥5 unidades)
        if (node.supplies !== null && lastNodeState.supplies !== null) {
            if (Math.abs(node.supplies - lastNodeState.supplies) >= 5) {
                return true;
            }
        }
        
        // Cambios en vehículos disponibles
        if (node.availableVehicles !== lastNodeState.availableVehicles) {
            return true;
        }
        
        // Cambios en helicópteros disponibles
        if (node.availableHelicopters !== lastNodeState.availableHelicopters) {
            return true;
        }
        
        // Cambios en ambulance availability
        if (node.ambulanceAvailable !== lastNodeState.ambulanceAvailable) {
            return true;
        }
        
        // Construction timer - actualizar más frecuentemente para barrita fluida
        if (node.isConstructing && node.constructionTimer !== undefined && lastNodeState.constructionTimer !== undefined) {
            if (Math.abs(node.constructionTimer - lastNodeState.constructionTimer) >= 0.03) {
                return true; // Actualizar cada ~0.03s para 30+ FPS suaves
            }
        }
        
        // Cambios en efectos
        if (node.effects && node.effects.length !== (lastNodeState.effects?.length || 0)) {
            return true;
        }
        
        // Cambios en estado disabled (crítico para efectos de comando)
        if (node.disabled !== lastNodeState.disabled) {
            return true;
        }
        
        // 🆕 NUEVO: Cambios en tiempo de comando (spawnTime y expiresAt)
        if (node.isCommando) {
            if (node.spawnTime !== lastNodeState.spawnTime ||
                node.expiresAt !== lastNodeState.expiresAt) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Serializa nodos para enviar a cliente - SOLO los que han cambiado significativamente
     */
    serializeNodes() {
        // Filtrar nodos destruidos (active: false) y solo enviar los que han cambiado
        return this.gameState.nodes
            .filter(node => node.active !== false && this.hasNodeSignificantChanges(node))
            .map(node => {
                // Guardar estado actual para próxima comparación
                this.gameState.lastNodeStates.set(node.id, {
                    x: node.x,
                    y: node.y,
                    active: node.active,
                    constructed: node.constructed,
                    isConstructing: node.isConstructing,
                    constructionTimer: node.constructionTimer || 0,
                    supplies: node.supplies,
                    availableVehicles: node.availableVehicles,
                    // Guardar estado de helicópteros
                    availableHelicopters: node.availableHelicopters || 0,
                    ambulanceAvailable: node.ambulanceAvailable,
                    isAbandoning: node.isAbandoning,
                    abandonPhase: node.abandonPhase,
                    abandonStartTime: node.abandonStartTime || 0, // Timestamp para calcular tiempo transcurrido
                    effects: node.effects ? [...node.effects] : [],
                    disabled: node.disabled || false, // 🆕 NUEVO: Estado disabled
                    // 🆕 NUEVO: Tiempo de comando
                    spawnTime: node.spawnTime,
                    expiresAt: node.expiresAt
                });
                
                return {
                    id: node.id,
                    type: node.type,
                    team: node.team,
                    x: node.x,
                    y: node.y,
                    active: node.active,
                    constructed: node.constructed,
                    isConstructing: node.isConstructing,
                    constructionTimer: node.constructionTimer || 0,
                    constructionTime: node.constructionTime || 2,
                    supplies: node.supplies,
                    maxSupplies: node.maxSupplies,
                    availableVehicles: node.availableVehicles,
                    maxVehicles: node.maxVehicles,
                    // Propiedades de helicópteros según raza
                    hasHelicopters: node.hasHelicopters || false,
                    availableHelicopters: node.availableHelicopters || 0,
                    maxHelicopters: node.maxHelicopters || 0,
                    landedHelicopters: node.landedHelicopters || [], // Array de IDs de helicópteros aterrizados
                    consumeRate: node.consumeRate,
                    maxXReached: node.maxXReached,
                    minXReached: node.minXReached,
                    isAbandoning: node.isAbandoning,
                    abandonPhase: node.abandonPhase,
                    abandonStartTime: node.abandonStartTime || 0, // Timestamp para calcular tiempo transcurrido
                    effects: node.effects || [],
                    // Propiedades del sistema médico
                    hasMedicalSystem: node.hasMedicalSystem || false,
                    ambulanceAvailable: node.ambulanceAvailable || false,
                    maxAmbulances: node.maxAmbulances || 0,
                    // Propiedades de inversión (intelRadio)
                    investmentTime: node.investmentTime || 0,
                    investmentReturn: node.investmentReturn || 0,
                    investmentTimer: node.investmentTimer || 0,
                    investmentStarted: node.investmentStarted || false,
                    investmentCompleted: node.investmentCompleted || false,
                    abandonPhase1Duration: node.abandonPhase1Duration || 2000,
                    abandonPhase2Duration: node.abandonPhase2Duration || 3000,
                    disabled: node.disabled || false, // 🆕 NUEVO: Estado disabled (genérico)
                    // 🆕 NUEVO: Propiedades de comando (spawnTime y expiresAt)
                    spawnTime: node.isCommando ? node.spawnTime : undefined,
                    expiresAt: node.isCommando ? node.expiresAt : undefined,
                    // 🆕 NUEVO: detectionRadius para comandos, truck assaults y camera drones
                    detectionRadius: (node.isCommando || node.isTruckAssault || node.isCameraDrone) ? node.detectionRadius : undefined
                };
            });
    }
    
    /**
     * Verifica si un convoy tiene cambios significativos desde el último envío
     * OPTIMIZADO para Dead Reckoning: menos updates durante movimiento constante
     */
    hasConvoySignificantChanges(convoy) {
        const lastConvoyState = this.gameState.lastConvoyStates.get(convoy.id);
        
        // Si es la primera vez que vemos este convoy, enviarlo
        if (!lastConvoyState) {
            return true;
        }
        
        // OPTIMIZACIÓN DEAD RECKONING: Reducir frecuencia de updates durante movimiento
        // Cambios significativos en progress - aumentado a 0.25 para máxima fluidez (muchos menos updates)
        if (Math.abs(convoy.progress - lastConvoyState.progress) >= 0.25) {
            return true;
        }
        
        // Cambios críticos (siempre se envían inmediatamente)
        if (convoy.returning !== lastConvoyState.returning) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Serializa convoyes para enviar a cliente - SOLO los que han cambiado significativamente
     */
    serializeConvoys() {
        return this.gameState.convoys
            .filter(convoy => this.hasConvoySignificantChanges(convoy))
            .map(convoy => {
                // Guardar estado actual para próxima comparación
                this.gameState.lastConvoyStates.set(convoy.id, {
                    progress: convoy.progress,
                    returning: convoy.returning
                });
                
                return {
                    id: convoy.id,
                    fromId: convoy.fromId,
                    toId: convoy.toId,
                    team: convoy.team,
                    vehicleType: convoy.vehicleType,
                    cargo: convoy.cargo,
                    progress: convoy.progress,
                    returning: convoy.returning,
                    isMedical: convoy.isMedical || false,
                    targetFrontId: convoy.targetFrontId || null
                };
            });
    }
    
    /**
     * Serializa TODOS los nodos para envío inicial (sin filtrado)
     */
    serializeAllNodes() {
        // Filtrar solo nodos destruidos, pero enviar todos los demás sin filtrado de cambios
        return this.gameState.nodes
            .filter(node => node.active !== false)
            .map(node => {
                // Guardar estado para tracking (aunque sea inicial)
                this.gameState.lastNodeStates.set(node.id, {
                    x: node.x,
                    y: node.y,
                    active: node.active,
                    constructed: node.constructed,
                    isConstructing: node.isConstructing,
                    constructionTimer: node.constructionTimer || 0,
                    supplies: node.supplies,
                    availableVehicles: node.availableVehicles,
                    // Guardar estado de helicópteros
                    availableHelicopters: node.availableHelicopters || 0,
                    ambulanceAvailable: node.ambulanceAvailable,
                    isAbandoning: node.isAbandoning,
                    effects: node.effects ? [...node.effects] : [],
                    disabled: node.disabled || false, // 🆕 NUEVO: Estado disabled
                    // 🆕 NUEVO: Tiempo de comando
                    spawnTime: node.spawnTime,
                    expiresAt: node.expiresAt
                });
                
                return {
                    id: node.id,
                    type: node.type,
                    team: node.team,
                    x: node.x,
                    y: node.y,
                    active: node.active,
                    constructed: node.constructed,
                    isConstructing: node.isConstructing,
                    constructionTimer: node.constructionTimer || 0,
                    constructionTime: node.constructionTime || 2,
                    supplies: node.supplies,
                    maxSupplies: node.maxSupplies,
                    availableVehicles: node.availableVehicles,
                    maxVehicles: node.maxVehicles,
                    // Propiedades de helicópteros según raza
                    hasHelicopters: node.hasHelicopters || false,
                    availableHelicopters: node.availableHelicopters || 0,
                    maxHelicopters: node.maxHelicopters || 0,
                    landedHelicopters: node.landedHelicopters || [], // Array de IDs de helicópteros aterrizados
                    consumeRate: node.consumeRate,
                    maxXReached: node.maxXReached,
                    minXReached: node.minXReached,
                    isAbandoning: node.isAbandoning,
                    abandonPhase: node.abandonPhase,
                    abandonStartTime: node.abandonStartTime || 0, // Timestamp para calcular tiempo transcurrido
                    effects: node.effects || [],
                    // Propiedades del sistema médico
                    hasMedicalSystem: node.hasMedicalSystem || false,
                    ambulanceAvailable: node.ambulanceAvailable || false,
                    maxAmbulances: node.maxAmbulances || 0,
                    // Propiedades de inversión (intelRadio)
                    investmentTime: node.investmentTime || 0,
                    investmentReturn: node.investmentReturn || 0,
                    investmentTimer: node.investmentTimer || 0,
                    investmentStarted: node.investmentStarted || false,
                    investmentCompleted: node.investmentCompleted || false,
                    abandonPhase1Duration: node.abandonPhase1Duration || 2000,
                    abandonPhase2Duration: node.abandonPhase2Duration || 3000,
                    disabled: node.disabled || false, // 🆕 NUEVO: Estado disabled (genérico)
                    // 🆕 NUEVO: Propiedades de comando (spawnTime y expiresAt)
                    spawnTime: node.isCommando ? node.spawnTime : undefined,
                    expiresAt: node.isCommando ? node.expiresAt : undefined,
                    // 🆕 NUEVO: detectionRadius para comandos, truck assaults y camera drones
                    detectionRadius: (node.isCommando || node.isTruckAssault || node.isCameraDrone) ? node.detectionRadius : undefined
                };
            });
    }
    
    /**
     * Serializa TODOS los convoyes para envío inicial (sin filtrado)
     */
    serializeAllConvoys() {
        return this.gameState.convoys.map(convoy => {
            // Guardar estado para tracking (aunque sea inicial)
            this.gameState.lastConvoyStates.set(convoy.id, {
                progress: convoy.progress,
                returning: convoy.returning
            });
            
            return {
                id: convoy.id,
                fromId: convoy.fromId,
                toId: convoy.toId,
                team: convoy.team,
                vehicleType: convoy.vehicleType,
                cargo: convoy.cargo,
                progress: convoy.progress,
                returning: convoy.returning,
                isMedical: convoy.isMedical || false,
                targetFrontId: convoy.targetFrontId || null
            };
        });
    }
    
    /**
     * 🆕 NUEVO: Serializa TODOS los trenes para envío inicial
     */
    serializeAllTrains() {
        return this.gameState.trains.map(train => {
            return {
                id: train.id,
                trainId: train.id, // Alias para compatibilidad con cliente
                fromId: train.fromId,
                toId: train.toId,
                team: train.team,
                progress: train.progress,
                returning: train.returning,
                cargo: train.cargo
            };
        });
    }
    
    /**
     * Serializa helicópteros para envío incremental (solo los que han cambiado)
     */
    serializeHelicopters() {
        // Por ahora, enviar todos los helicópteros (optimización futura: solo los que cambiaron)
        return this.gameState.helicopters.map(heli => ({
            id: heli.id,
            team: heli.team,
            state: heli.state,
            cargo: heli.cargo,
            currentNodeId: heli.currentNodeId,
            targetNodeId: heli.targetNodeId,
            progress: heli.progress,
            initialDistance: heli.initialDistance // Necesario para interpolación en cliente
        }));
    }
    
    /**
     * Serializa TODOS los helicópteros para envío inicial
     */
    serializeAllHelicopters() {
        return this.gameState.helicopters.map(heli => ({
            id: heli.id,
            team: heli.team,
            state: heli.state,
            cargo: heli.cargo,
            currentNodeId: heli.currentNodeId,
            targetNodeId: heli.targetNodeId,
            progress: heli.progress,
            initialDistance: heli.initialDistance // Necesario para interpolación en cliente
        }));
    }
    
    /**
     * Serializa el estado completo del juego
     */
    serializeAll() {
        return {
            nodes: this.serializeAllNodes(),
            convoys: this.serializeAllConvoys(),
            helicopters: this.serializeAllHelicopters(),
            currency: { ...this.gameState.currency },
            duration: this.gameState.duration,
            gameTime: this.gameState.gameTime,
            tick: this.gameState.tickCounter,
            drones: this.gameState.droneSystem.getDrones(),
            emergencies: this.gameState.medicalSystem.getEmergencies()
        };
    }
}
