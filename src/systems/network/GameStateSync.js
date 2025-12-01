// ===== SINCRONIZADOR DE ESTADO DEL JUEGO =====
// Responsabilidad: Sincronizar el estado crítico del juego desde el servidor

export class GameStateSync {
    constructor(networkManager, game) {
        this.networkManager = networkManager;
        this.game = game;
        
        // Guardar el último estado recibido
        this.lastGameState = null;
        
        // Variables para logging de currency
        this._lastCurrencyLogTime = 0;
        this._lastCurrencyLog = 0;
    }

    /**
     * Aplicar estado del juego recibido del servidor
     * Método principal que delega a submétodos especializados
     */
    applyGameState(gameState) {
        if (!gameState) return;
        
        // 🔍 DEBUG: Verificar gameTime
        if (!this._gameTimeLogged) {
            console.log(`🕐 GameStateSync recibió gameTime: ${gameState.gameTime}`);
            this._gameTimeLogged = true;
        }
        
        // Guardar el último estado recibido (para reloj, etc.)
        this.lastGameState = gameState;
        
        // Sincronizar subsistemas en orden
        this.syncHelicopters(gameState);
        this.syncCurrency(gameState);
        this.syncNodes(gameState);
        this.syncConvoys(gameState);
        this.syncTrains(gameState);
        this.syncFactorySupplyDeliveries(gameState); // 🆕 NUEVO: Envíos de fábricas
        this.syncDrones(gameState);
        this.syncTanks(gameState);
        this.syncLightVehicles(gameState);
        this.syncMedicalEmergencies(gameState);
        this.syncDisciplines(gameState); // 🆕 NUEVO: Estado de disciplinas
        
        // 🆕 PROCESAR EVENTOS DE SONIDO ===
        if (gameState.soundEvents && gameState.soundEvents.length > 0) {
            gameState.soundEvents.forEach(event => {
                if (this.networkManager.eventHandler) {
                    this.networkManager.eventHandler.handleSoundEvent(event);
                }
            });
        }
        
        // 🆕 PROCESAR EVENTOS VISUALES ===
        // 🔧 FIX: Los eventos visuales deben procesarse aquí para que funcionen correctamente
        if (gameState.visualEvents) {
            if (gameState.visualEvents.length > 0) {
                gameState.visualEvents.forEach(event => {
                    if (this.networkManager.eventHandler) {
                        this.networkManager.eventHandler.handleVisualEvent(event);
                    }
                });
            }
        }
    }

    // ========== SINCRONIZACIÓN DE HELICÓPTEROS ==========

    /**
     * Sincronizar helicópteros desde el servidor
     */
    syncHelicopters(gameState) {
        if (!gameState.helicopters) return;
        
        if (!this.game.helicopters) {
            this.game.helicopters = [];
        }
        
        // Sincronizar array de helicópteros
        gameState.helicopters.forEach(heliData => {
            let heli = this.game.helicopters.find(h => h.id === heliData.id);
            
            if (!heli) {
                // Crear nuevo helicóptero
                heli = { ...heliData };
                // 🎯 ASEGURAR: cargo siempre tiene un valor válido
                if (heli.cargo === undefined || heli.cargo === null) {
                    heli.cargo = 0;
                }
                this.game.helicopters.push(heli);
                console.log(`🚁 CLIENTE: Helicóptero ${heli.id} creado (team: ${heli.team}, cargo: ${heli.cargo})`);
                
                // Inicializar datos de interpolación
                heli.lastServerUpdate = Date.now();
                heli.lastKnownProgress = heliData.progress || 0;
                heli.serverProgress = heliData.progress || 0;
            } else {
                // Actualizar helicóptero existente
                // CRÍTICO: NO sobrescribir progress directamente (igual que convoys)
                const wasLanded = heli.state === 'landed';
                const isNowFlying = heliData.state === 'flying';
                
                heli.state = heliData.state;
                // 🎯 ASEGURAR: cargo siempre tiene un valor válido
                heli.cargo = heliData.cargo ?? heli.cargo ?? 0;
                heli.currentNodeId = heliData.currentNodeId;
                heli.targetNodeId = heliData.targetNodeId;
                heli.initialDistance = heliData.initialDistance;
                
                // CRÍTICO: Si cambió de 'landed' a 'flying', resetear progress a 0
                // Esto evita el salto visual cuando el helicóptero empieza a volar
                if (wasLanded && isNowFlying) {
                    heli.progress = 0;
                    heli.serverProgress = 0;
                    heli.lastKnownProgress = 0;
                }
                
                // NO actualizar heli.progress directamente - lo maneja updateHelicopterPosition()
                // Solo actualizar serverProgress si no acabamos de resetearlo
                if (!(wasLanded && isNowFlying)) {
                    heli.serverProgress = heliData.progress;
                    heli.lastKnownProgress = heliData.progress;
                }
                heli.lastServerUpdate = Date.now();
            }
        });
        
        // Eliminar helicópteros que ya no existen en el servidor
        this.game.helicopters = this.game.helicopters.filter(heli => 
            gameState.helicopters.some(h => h.id === heli.id)
        );
    }

    // ========== SINCRONIZACIÓN DE CURRENCY ==========

    /**
     * Sincronizar currency del jugador
     */
    syncCurrency(gameState) {
        if (!gameState.currency) return;
        
        const oldCurrency = this.game.currency.missionCurrency;
        this.game.currency.missionCurrency = gameState.currency[this.networkManager.myTeam];
        
        // DEBUG: Log cuando cambia significativamente (solo cambios grandes o cada 5 segundos)
        const now = Date.now();
        if ((!this._lastCurrencyLogTime || now - this._lastCurrencyLogTime > 5000) && 
            Math.abs(this.game.currency.missionCurrency - oldCurrency) >= 20) {
            console.log(`💰 Currency: ${oldCurrency} → ${this.game.currency.missionCurrency}$`);
            this._lastCurrencyLogTime = now;
            this._lastCurrencyLog = this.game.currency.missionCurrency;
        }
    }

    // ========== SINCRONIZACIÓN DE NODOS ==========

    /**
     * Sincronizar nodos desde el servidor (LA MÁS CRÍTICA)
     */
    syncNodes(gameState) {
        if (!gameState.nodes) return;
        
        gameState.nodes.forEach(nodeData => {
            let node = this.game.nodes.find(n => n.id === nodeData.id);
            
            if (node) {
                // Actualizar nodo existente
                
                // Actualizar posición - usar interpolación suave para fronts y camera drones volando en multijugador
                if (this.game.isMultiplayer && node.type === 'front') {
                    // Para fronts, usar interpolación suave
                    node.updateServerPosition(nodeData.x, nodeData.y);
                } else if (this.game.isMultiplayer && node.isCameraDrone && !nodeData.deployed) {
                    // 🆕 NUEVO: Para camera drones volando, usar interpolación suave
                    node.updateServerPosition(nodeData.x, nodeData.y);
                } else {
                    // Para otros nodos (construcciones), actualización directa
                    node.x = nodeData.x;
                    node.y = nodeData.y;
                }
                
                // Actualizar suministros
                node.supplies = nodeData.supplies;
                node.availableVehicles = nodeData.availableVehicles;
                // 🆕 NUEVO: Actualizar maxVehicles desde el servidor (para vehicleWorkshop)
                if (nodeData.maxVehicles !== undefined) {
                    node.baseMaxVehicles = nodeData.maxVehicles;
                }
                
                // 🆕 CENTRALIZADO: Actualizar propiedades de helicópteros según raza
                if (nodeData.hasHelicopters !== undefined) {
                    node.hasHelicopters = nodeData.hasHelicopters;
                }
                if (nodeData.availableHelicopters !== undefined) {
                    node.availableHelicopters = nodeData.availableHelicopters;
                }
                if (nodeData.maxHelicopters !== undefined) {
                    node.maxHelicopters = nodeData.maxHelicopters;
                }
                
                // 🆕 NUEVO: Sincronizar helicópteros aterrizados
                if (nodeData.landedHelicopters !== undefined) {
                    node.landedHelicopters = nodeData.landedHelicopters;
                }
                
                // 🆕 NUEVO: Sincronizar propiedades del sistema de reparación
                if (nodeData.hasRepairSystem !== undefined) {
                    node.hasRepairSystem = nodeData.hasRepairSystem;
                }
                if (nodeData.availableRepairVehicles !== undefined) {
                    node.availableRepairVehicles = nodeData.availableRepairVehicles;
                }
                if (nodeData.maxRepairVehicles !== undefined) {
                    node.maxRepairVehicles = nodeData.maxRepairVehicles;
                }
                
                // 🆕 NUEVO: Sincronizar contador de usos para lanzadera de drones
                if (node.type === 'droneLauncher' && nodeData.uses !== undefined) {
                    node.uses = nodeData.uses;
                }
                
                // 🆕 NUEVO: Actualizar tipo de recurso seleccionado desde el servidor (autoritativo)
                // El servidor es la fuente de verdad, siempre sincronizar
                if (nodeData.selectedResourceType !== undefined) {
                    // Verificar que el tipo enviado por el servidor sea válido para este nodo
                    const enabledTypes = this.game.getEnabledVehicleTypes(node.type);
                    if (enabledTypes.includes(nodeData.selectedResourceType)) {
                        // El servidor es autoritativo, siempre actualizar
                        node.selectedResourceType = nodeData.selectedResourceType;
                    }
                }
                
                // Actualizar estado activo
                node.active = nodeData.active;
                
                // 🆕 NUEVO: Actualizar propiedades específicas del camera drone
                if (node.isCameraDrone) {
                    node.deployed = nodeData.deployed || false;
                    node.targetX = nodeData.targetX;
                    node.targetY = nodeData.targetY;
                    node.detectionRadius = nodeData.detectionRadius || 200;
                    
                    // Si cambió de volando a desplegado, actualizar posición directamente
                    if (nodeData.deployed && !node.deployed) {
                        node.x = nodeData.x;
                        node.y = nodeData.y;
                        // Limpiar interpolación cuando se despliega
                        if (node.updateServerPosition) {
                            node.updateServerPosition(nodeData.x, nodeData.y);
                        }
                    }
                }
                
                // Actualizar estado de construcción
                const wasConstructing = node.isConstructing;
                node.constructed = nodeData.constructed;
                node.isConstructing = nodeData.isConstructing;
                node.constructionTimer = nodeData.constructionTimer || 0;
                node.constructionTime = nodeData.constructionTime || 2;
                
                // DEBUG: Log progreso de construcción (solo cada 25% o cada 2 segundos)
                if (node.isConstructing && nodeData.constructionTimer !== undefined) {
                }
                
                // Log cuando se completa construcción
                if (wasConstructing && !node.isConstructing && node.constructed) {
                    
                    // Sonido especial de anti-drone al COMPLETAR construcción (x2 velocidad)
                    if (node.type === 'antiDrone') {
                        const spawnVolume = this.game.audio.sounds.antiDroneSpawn ? 
                            this.game.audio.sounds.antiDroneSpawn.volume : 
                            this.game.audio.volumes.antiDroneSpawn;
                        const audio = this.game.audio.playSoundInstance(
                            'assets/sounds/normalized/antidrone_spawn_normalized.wav', 
                            spawnVolume,
                            'antiDroneSpawn'
                        );
                        audio.playbackRate = 2.0; // Doble velocidad
                    }
                }
                
                // Actualizar frentes
                if (nodeData.consumeRate !== undefined) {
                    node.consumeRate = nodeData.consumeRate;
                }
                if (nodeData.maxXReached !== undefined) {
                    node.maxXReached = nodeData.maxXReached;
                }
                if (nodeData.minXReached !== undefined) {
                    node.minXReached = nodeData.minXReached;
                }
                
                // 🆕 NUEVO: Sincronizar sistema de modos de frente
                if (node.type === 'front') {
                    if (nodeData.frontMode !== undefined) {
                        node.frontMode = nodeData.frontMode;
                    }
                    if (nodeData.modeCooldownUntil !== undefined) {
                        node.modeCooldownUntil = nodeData.modeCooldownUntil;
                    }
                }
                
                // Actualizar abandono
                node.isAbandoning = nodeData.isAbandoning;
                node.abandonPhase = nodeData.abandonPhase;
                if (nodeData.abandonStartTime !== undefined) {
                    node.abandonStartTime = nodeData.abandonStartTime; // Sincronizar timestamp del abandono
                }
                // Sincronizar tiempos de abandono desde el servidor (autoridad)
                if (nodeData.abandonPhase1Duration !== undefined) {
                    node.abandonPhase1Duration = nodeData.abandonPhase1Duration;
                }
                if (nodeData.abandonPhase2Duration !== undefined) {
                    node.abandonPhase2Duration = nodeData.abandonPhase2Duration;
                }
                
                // Actualizar efectos (wounded, etc.)
                if (nodeData.effects) {
                    node.effects = nodeData.effects;
                }
                
                // Actualizar propiedades del sistema médico
                if (nodeData.hasMedicalSystem !== undefined) {
                    node.hasMedicalSystem = nodeData.hasMedicalSystem;
                }
                if (nodeData.ambulanceAvailable !== undefined) {
                    node.ambulanceAvailable = nodeData.ambulanceAvailable;
                }
                if (nodeData.maxAmbulances !== undefined) {
                    node.maxAmbulances = nodeData.maxAmbulances;
                }
                
                // 🆕 NUEVO: Actualizar propiedades de inversión (intelRadio)
                if (nodeData.investmentTime !== undefined) {
                    node.investmentTime = nodeData.investmentTime;
                }
                if (nodeData.investmentTimer !== undefined) {
                    node.investmentTimer = nodeData.investmentTimer;
                }
                if (nodeData.investmentStarted !== undefined) {
                    node.investmentStarted = nodeData.investmentStarted;
                }
                if (nodeData.investmentCompleted !== undefined) {
                    node.investmentCompleted = nodeData.investmentCompleted;
                }
                
                // 🆕 NUEVO: Actualizar estado disabled (genérico)
                if (nodeData.disabled !== undefined) {
                    const wasDisabled = node.disabled || false;
                    const isNowDisabled = nodeData.disabled;
                    node.disabled = isNowDisabled;
                    
                    // 🆕 NUEVO: Crear floating text cuando un nodo se deshabilita
                    if (!wasDisabled && isNowDisabled) {
                        // Nodo se acaba de deshabilitar
                        this.game.particleSystem.createFloatingText(
                            node.x,
                            node.y - 30, // Un poco arriba del nodo
                            'Disabled',
                            '#ff0000' // Rojo
                        );
                    }
                }
                
                // 🆕 NUEVO: Actualizar estado broken (roto)
                if (nodeData.broken !== undefined) {
                    const wasBroken = node.broken || false;
                    const isNowBroken = nodeData.broken;
                    node.broken = isNowBroken;
                    
                    // 🆕 NUEVO: Crear floating text cuando un nodo se rompe
                    if (!wasBroken && isNowBroken) {
                        // Nodo se acaba de romper
                        this.game.particleSystem.createFloatingText(
                            node.x,
                            node.y - 30, // Un poco arriba del nodo
                            'Roto',
                            '#ff8800' // Naranja
                        );
                    }
                    
                    // 🆕 NUEVO: Crear floating text cuando un nodo se repara
                    if (wasBroken && !isNowBroken) {
                        // Nodo se acaba de reparar
                        this.game.particleSystem.createFloatingText(
                            node.x,
                            node.y - 30, // Un poco arriba del nodo
                            'Reparado',
                            '#4ecca3' // Verde
                        );
                    }
                }
                
                // 🆕 NUEVO: Sincronizar tiempo de comando (spawnTime y expiresAt)
                if (node.isCommando) {
                    if (nodeData.spawnTime !== undefined) {
                        node.spawnTime = nodeData.spawnTime;
                    }
                    if (nodeData.expiresAt !== undefined) {
                        node.expiresAt = nodeData.expiresAt;
                    }
                    if (nodeData.detectionRadius !== undefined) {
                        node.detectionRadius = nodeData.detectionRadius;
                    }
                }
            } else {
                // Nodo nuevo del servidor (construcción autorizada)
                // Ya debería haber sido creado por building_created
                // Si no existe, es un error
                console.warn(`⚠️ Nodo ${nodeData.id} del servidor no existe localmente`);
            }
        });
        
        // Eliminar nodos que ya no existen en el servidor (destruidos o abandonados)
        const serverNodeIds = gameState.nodes.map(n => n.id);
        for (let i = this.game.nodes.length - 1; i >= 0; i--) {
            const localNode = this.game.nodes[i];
            // Eliminar cualquier nodo que ya no esté en el servidor
            // (edificios destruidos por drones, abandonados, etc.)
            if (!serverNodeIds.includes(localNode.id)) {
                this.game.nodes.splice(i, 1);
            }
        }
    }

    // ========== SINCRONIZACIÓN DE CONVOYS ==========

    /**
     * Sincronizar convoys desde el servidor
     */
    syncConvoys(gameState) {
        if (!gameState.convoys || gameState.convoys.length === 0) return;
        
        // Sincronizar convoyes: actualizar progress de los existentes
        gameState.convoys.forEach(convoyData => {
            const convoy = this.game.convoyManager.convoys.find(c => c.id === convoyData.id);
            
            if (convoy) {
                // CRÍTICO: Actualizar progress desde el servidor con interpolación suave
                if (convoy.updateServerProgress) {
                    convoy.updateServerProgress(convoyData.progress, convoyData.returning);
                } else {
                    // Fallback para compatibilidad
                    convoy.progress = convoyData.progress;
                    convoy.returning = convoyData.returning;
                }
                convoy.isMedical = convoyData.isMedical || false;
                convoy.targetFrontId = convoyData.targetFrontId || null;
            }
            // Si no existe, será creado por el evento convoy_spawned o ambulance_spawned
        });
        
        // Eliminar convoyes que ya no existen en el servidor
        const serverConvoyIds = gameState.convoys.map(c => c.id);
        for (let i = this.game.convoyManager.convoys.length - 1; i >= 0; i--) {
            if (!serverConvoyIds.includes(this.game.convoyManager.convoys[i].id)) {
                this.game.convoyManager.convoys.splice(i, 1);
            }
        }
    }

    // ========== SINCRONIZACIÓN DE TRENES ==========

    /**
     * Sincronizar trenes desde el servidor
     */
    syncTrains(gameState) {
        if (gameState.trains && gameState.trains.length > 0) {
            // Sincronizar trenes: actualizar progress de los existentes
            gameState.trains.forEach(trainData => {
                const train = this.game.trainSystem.trains.find(t => t.id === trainData.id || t.id === trainData.trainId);
                
                if (train) {
                    // Actualizar progress desde el servidor con interpolación suave
                    if (train.updateServerProgress) {
                        train.updateServerProgress(trainData.progress, trainData.returning || false);
                    } else {
                        // Fallback para compatibilidad
                        train.progress = trainData.progress;
                        train.targetProgress = trainData.progress;
                        train.returning = trainData.returning || false;
                    }
                } else {
                    // Crear nuevo tren si no existe
                    this.game.trainSystem.addTrain(trainData);
                }
            });
            
            // Eliminar trenes que ya no existen en el servidor
            const serverTrainIds = gameState.trains.map(t => t.id || t.trainId);
            for (let i = this.game.trainSystem.trains.length - 1; i >= 0; i--) {
                if (!serverTrainIds.includes(this.game.trainSystem.trains[i].id)) {
                    this.game.trainSystem.removeTrain(this.game.trainSystem.trains[i].id);
                }
            }
        } else {
            // Si no hay trenes en el servidor, limpiar todos los trenes locales
            if (this.game.trainSystem && this.game.trainSystem.trains) {
                this.game.trainSystem.clear();
            }
        }
    }

    // ========== SINCRONIZACIÓN DE ENVÍOS DE FÁBRICAS ==========

    /**
     * 🆕 NUEVO: Sincronizar envíos de fábricas desde el servidor
     */
    syncFactorySupplyDeliveries(gameState) {
        if (!gameState.factorySupplyDeliveries) {
            // Si no hay envíos en el servidor, limpiar todos los iconos locales
            if (this.game.renderer?.effectRenderer) {
                this.game.renderer.effectRenderer.factorySupplyIcons = [];
            }
            return;
        }

        // Obtener el sistema de visualización
        if (!this.game.renderer?.effectRenderer) return;
        
        const effectRenderer = this.game.renderer.effectRenderer;
        
        // Sincronizar envíos: actualizar o crear iconos según el estado del servidor
        gameState.factorySupplyDeliveries.forEach(deliveryData => {
            // Buscar si ya existe un icono para este envío
            let icon = effectRenderer.factorySupplyIcons.find(i => i.deliveryId === deliveryData.id);
            
            if (icon) {
                // ✅ INTERPOLACIÓN: Actualizar serverProgress (objetivo del servidor)
                // El progress local se interpolará suavemente en updateFactoryVisuals()
                const factory = this.game.nodes.find(n => n.id === deliveryData.factoryId);
                const hq = this.game.nodes.find(n => n.id === deliveryData.hqId);
                
                if (factory && hq) {
                    // Actualizar coordenadas de inicio/destino por si los nodos se movieron
                    icon.startX = factory.x;
                    icon.startY = factory.y;
                    icon.targetX = hq.x;
                    icon.targetY = hq.y;
                    
                    // Guardar el progress del servidor como objetivo para interpolación
                    icon.serverProgress = deliveryData.progress;
                    icon.active = deliveryData.progress < 1.0;
                }
            } else {
                // Crear nuevo icono basado en el envío del servidor
                const factory = this.game.nodes.find(n => n.id === deliveryData.factoryId);
                const hq = this.game.nodes.find(n => n.id === deliveryData.hqId);
                
                if (factory && hq) {
                    const dx = hq.x - factory.x;
                    const dy = hq.y - factory.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    effectRenderer.factorySupplyIcons.push({
                        deliveryId: deliveryData.id,
                        factoryId: deliveryData.factoryId,
                        hqId: deliveryData.hqId,
                        team: factory.team, // 🆕 FOG OF WAR: Incluir equipo de la fábrica
                        startX: factory.x,
                        startY: factory.y,
                        targetX: hq.x,
                        targetY: hq.y,
                        currentX: factory.x,
                        currentY: factory.y,
                        distance: distance,
                        progress: deliveryData.progress, // Progress local (se interpolará)
                        serverProgress: deliveryData.progress, // Progress objetivo del servidor
                        speed: deliveryData.speed, // Velocidad viene del servidor (configurada en serverNodes.js)
                        active: deliveryData.progress < 1.0
                    });
                }
            }
        });
        
        // Eliminar iconos de envíos que ya no existen en el servidor
        const serverDeliveryIds = new Set(gameState.factorySupplyDeliveries.map(d => d.id));
        effectRenderer.factorySupplyIcons = effectRenderer.factorySupplyIcons.filter(icon => {
            if (icon.deliveryId && !serverDeliveryIds.has(icon.deliveryId)) {
                return false; // Eliminar si el envío ya no existe en el servidor
            }
            // Mantener iconos sin deliveryId (legacy) o que aún existen
            return true;
        });
    }

    // ========== SINCRONIZACIÓN DE DRONES ==========

    /**
     * Sincronizar drones desde el servidor
     */
    syncDrones(gameState) {
        if (!gameState.drones) return;
        
        // Actualizar drones existentes y crear nuevos
        gameState.drones.forEach(droneData => {
            let drone = this.game.droneSystem.drones.find(d => d.id === droneData.id);
            
            if (drone) {
                // Interpolación suave: guardar posición objetivo del servidor
                drone.serverX = droneData.x;
                drone.serverY = droneData.y;
                drone.targetId = droneData.targetId;
                drone.lastServerUpdate = Date.now();
            } else {
                // Dron nuevo del servidor - crear localmente
                const targetNode = this.game.nodes.find(n => n.id === droneData.targetId);
                if (targetNode) {
                    const newDrone = {
                        id: droneData.id,
                        x: droneData.x,
                        y: droneData.y,
                        serverX: droneData.x,  // Posición objetivo del servidor
                        serverY: droneData.y,
                        target: targetNode,
                        targetId: droneData.targetId,
                        speed: 300,
                        active: true,
                        isEnemy: (droneData.team !== this.networkManager.myTeam),
                        lastServerUpdate: Date.now()
                    };
                    
                    this.game.droneSystem.drones.push(newDrone);
                }
            }
        });
        
        // Eliminar drones que ya no existen en el servidor (impactaron)
        const serverDroneIds = gameState.drones.map(d => d.id);
        for (let i = this.game.droneSystem.drones.length - 1; i >= 0; i--) {
            if (!serverDroneIds.includes(this.game.droneSystem.drones[i].id)) {
                // Detener sonido antes de eliminar
                this.game.audio.stopDroneSound(this.game.droneSystem.drones[i].id);
                this.game.droneSystem.drones.splice(i, 1);
            }
        }
    }

    // ========== SINCRONIZACIÓN DE TANQUES ==========

    /**
     * Sincronizar tanques desde el servidor
     */
    syncTanks(gameState) {
        if (!gameState.tanks) return;
        
        // Actualizar tanques existentes y crear nuevos
        gameState.tanks.forEach(tankData => {
            let tank = this.game.tankSystem.tanks.find(t => t.id === tankData.id);
            
            if (tank) {
                // Interpolación suave: guardar posición objetivo del servidor
                tank.serverX = tankData.x;
                tank.serverY = tankData.y;
                tank.targetId = tankData.targetId;
                tank.state = tankData.state || tank.state;
                tank.spriteFrame = tankData.spriteFrame || tank.spriteFrame;
                tank.waitTimer = tankData.waitTimer || 0;
                tank.shootTimer = tankData.shootTimer || 0;
                tank.lastServerUpdate = Date.now();
            } else {
                // Tanque nuevo del servidor - crear localmente usando TankSystem
                this.game.tankSystem.createTank(tankData);
            }
        });
        
        // Eliminar tanques que ya no existen en el servidor (completaron su misión)
        const serverTankIds = gameState.tanks.map(t => t.id);
        for (let i = this.game.tankSystem.tanks.length - 1; i >= 0; i--) {
            if (!serverTankIds.includes(this.game.tankSystem.tanks[i].id)) {
                this.game.tankSystem.tanks.splice(i, 1);
            }
        }
    }

    // ========== SINCRONIZACIÓN DE LIGHT VEHICLES ==========

    /**
     * Sincronizar artillados ligeros desde el servidor
     */
    syncLightVehicles(gameState) {
        if (!gameState.lightVehicles) return;
        
        // Actualizar artillados ligeros existentes y crear nuevos
        gameState.lightVehicles.forEach(lightVehicleData => {
            let lightVehicle = this.game.lightVehicleSystem.lightVehicles.find(lv => lv.id === lightVehicleData.id);
            
            if (lightVehicle) {
                // Interpolación suave: guardar posición objetivo del servidor
                lightVehicle.serverX = lightVehicleData.x;
                lightVehicle.serverY = lightVehicleData.y;
                lightVehicle.targetId = lightVehicleData.targetId;
                lightVehicle.state = lightVehicleData.state || lightVehicle.state;
                lightVehicle.spriteFrame = lightVehicleData.spriteFrame || lightVehicleData.spriteFrame;
                lightVehicle.waitTimer = lightVehicleData.waitTimer || 0;
                lightVehicle.shootTimer = lightVehicleData.shootTimer || 0;
                lightVehicle.lastServerUpdate = Date.now();
            } else {
                // Artillado ligero nuevo del servidor - crear localmente usando LightVehicleSystem
                this.game.lightVehicleSystem.createLightVehicle(lightVehicleData);
            }
        });
        
        // Eliminar artillados ligeros que ya no existen en el servidor (completaron su misión)
        const serverLightVehicleIds = gameState.lightVehicles.map(lv => lv.id);
        for (let i = this.game.lightVehicleSystem.lightVehicles.length - 1; i >= 0; i--) {
            if (!serverLightVehicleIds.includes(this.game.lightVehicleSystem.lightVehicles[i].id)) {
                this.game.lightVehicleSystem.lightVehicles.splice(i, 1);
            }
        }
    }

    // ========== SINCRONIZACIÓN DE EMERGENCIAS MÉDICAS ==========

    /**
     * Sincronizar emergencias médicas desde el servidor
     */
    syncMedicalEmergencies(gameState) {
        if (!gameState.emergencies) return;
        
        // Limpiar emergencias antiguas
        this.game.medicalSystem.activeEmergencies.clear();
        
        // Aplicar emergencias del servidor
        gameState.emergencies.forEach(emergency => {
            if (!emergency.resolved) {
                this.game.medicalSystem.activeEmergencies.set(emergency.frontId, {
                    frontId: emergency.frontId,
                    startTime: Date.now() - (20000 - emergency.timeLeft), // Recalcular startTime
                    duration: 20000,
                    resolved: false,
                    penalty: false
                });
            }
        });
    }

    // ========== SINCRONIZACIÓN DE DISCIPLINAS ==========

    /**
     * 🆕 NUEVO: Sincronizar estado de disciplinas desde el servidor
     */
    syncDisciplines(gameState) {
        if (!gameState.disciplines) return;
        
        // Guardar estado de disciplinas en el game
        if (!this.game.disciplineStates) {
            this.game.disciplineStates = {};
        }
        
        // Actualizar estado de disciplinas para ambos jugadores
        this.game.disciplineStates.player1 = gameState.disciplines.player1 || {
            equipped: [],
            active: null,
            timeRemaining: 0,
            cooldowns: {}  // 🆕 NUEVO: Cooldowns individuales { disciplineId: secondsRemaining }
        };
        
        this.game.disciplineStates.player2 = gameState.disciplines.player2 || {
            equipped: [],
            active: null,
            timeRemaining: 0,
            cooldowns: {}  // 🆕 NUEVO: Cooldowns individuales { disciplineId: secondsRemaining }
        };
    }

    // ========== MÉTODOS AUXILIARES ==========

    /**
     * Obtener el último estado guardado
     */
    getLastGameState() {
        return this.lastGameState;
    }
}

