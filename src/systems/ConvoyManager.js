// ===== GESTOR DE CONVOYES =====
import { Convoy } from '../entities/Convoy.js';
import { VEHICLE_TYPES, VALID_ROUTES, RACE_SPECIAL_ROUTES } from '../config/constants.js';
import { getRaceConfig, canRaceUseFOBs, getRaceTransportSystem } from '../config/races.js';

export class ConvoyManager {
    constructor(game) {
        this.game = game;
        this.convoys = [];
    }
    
    /**
     * Aplica todas las mejoras (upgrades) a un vehículo
     * @param {Object} baseVehicle - Vehículo base clonado de VEHICLE_TYPES
     * @param {string} vehicleType - Tipo: 'truck', 'heavy_truck', 'helicopter', 'ambulance'
     * @returns {Object} Vehículo con upgrades aplicados
     */
    applyUpgrades(baseVehicle, vehicleType) {
        const vehicle = { ...baseVehicle }; // Clonar para seguridad
        
        // === TRUCK FACTORY BONUS ===
        // Si hay un truckFactory construido, aumentar capacidad de camiones pesados
        if (vehicleType === 'heavy_truck') {
            const truckFactories = this.game.nodes.filter(n => 
                n.type === 'truckFactory' && 
                n.team === this.game.myTeam && 
                n.constructed && 
                !n.isAbandoning
            );
            
            if (truckFactories.length > 0) {
                // Bonus: +15 capacidad por cada fábrica
                const totalBonus = truckFactories.length * 15;
                vehicle.capacity += totalBonus;
            }
        }
        
        // === ENGINEER CENTER SPEED BUFF ===
        // Si hay un Centro de Ingenieros activo, aumentar +50% la velocidad de camiones pesados (HQ→FOB)
        if (vehicleType === 'heavy_truck') {
            const hasEngineer = this.game.nodes.some(n => n.type === 'engineerCenter' && n.constructed && !n.isAbandoning);
            if (hasEngineer) {
                vehicle.speed = (vehicle.speed || 1) * 1.5;
            }
        }
        
        return vehicle;
    }
    
    /**
     * Crea una ruta de suministros entre dos bases
     */
    createRoute(from, to) {
        console.log(`🔍 DEBUG: createRoute llamado desde ${from.type} (${from.id}) hacia ${to.type} (${to.id})`);
        
        // Verificar que los nodos no estén abandonando
        if (from.isAbandoning || to.isAbandoning) {
            console.log('⚠️ No se puede enviar convoy: nodo abandonando');
            return;
        }
        
        // Validar que ambos nodos sean del mismo equipo
        if (from.team !== to.team) {
            console.log('⚠️ No se puede enviar convoy a nodos enemigos');
            return;
        }
        
        // 🆕 NUEVO: Validar jerarquía logística CON soporte para razas especiales
        const validRoutes = this.getValidRoutesForRace(from.type, this.game.selectedRace);
        console.log(`🔍 DEBUG: Rutas válidas para ${from.type} (${this.game.selectedRace}):`, validRoutes);
        if (!validRoutes || !validRoutes.includes(to.type)) {
            console.log(`❌ Ruta bloqueada: ${from.type} → ${to.type} no está en rutas válidas`);
            return;
        }
        
        // Verificar que haya vehículos disponibles (o helicópteros para frentes)
        if (from.type === 'front' && from.hasHelicopters) {
            // Para frentes con helicópteros, verificar helicópteros disponibles
            if (!from.hasAvailableHelicopter()) {
                return;
            }
        } else if (from.type === 'hq' && this.game.selectedRace === 'B_Nation' && from.hasHelicopters) {
            // Para HQ de B_Nation con helicópteros, verificar helicópteros disponibles
            if (!from.hasAvailableHelicopter()) {
                return;
            }
        } else if ((from.type === 'aerialBase' || from.isAerialBase) && from.landedHelicopters && from.landedHelicopters.length > 0) {
            // 🆕 NUEVO: Base Aérea puede enviar helicópteros si tiene alguno aterrizado
            console.log(`✅ Base Aérea tiene ${from.landedHelicopters.length} helicópteros - permitiendo envío`);
            // No hacer nada, permitir continuar
        } else if ((from.type === 'aerialBase' || from.isAerialBase)) {
            // 🆕 NUEVO: Base Aérea sin helicópteros - inicializar array si no existe
            if (!from.landedHelicopters) {
                from.landedHelicopters = [];
            }
            console.log(`❌ Base Aérea sin helicópteros disponibles (tiene ${from.landedHelicopters.length})`);
            return;
        } else {
            // Para otros nodos, verificar vehículos normales
            if (!from.hasAvailableVehicle()) {
                return;
            }
        }
        
        // 🆕 NUEVO: Seleccionar tipo de vehículo según la raza y origen
        let vehicleType = this.selectVehicleType(from, this.game.selectedRace);
        
        // Verificar suministros (solo para sistema tradicional)
        if (this.game.selectedRace !== 'B_Nation') {
            if (!from.hasEnoughSupplies(10)) {
                return;
            }
        }
        
        // === MULTIJUGADOR: Enviar solicitud al servidor ===
        if (this.game.isMultiplayer && this.game.network) {
            // Log desactivado: convoys funcionan correctamente
            this.game.network.requestConvoy(from.id, to.id);
            // El servidor validará y enviará convoy_spawned, que será manejado por NetworkManager
            return;
        }
        
        // === SINGLEPLAYER: Manejar helicópteros con sistema persistente ===
        if (vehicleType === 'helicopter') {
            console.log(`🚁 SINGLEPLAYER: Llamando dispatchHelicopter desde ${from.type} hacia ${to.type}`);
            const success = this.game.dispatchHelicopter(from.id, to.id);
            if (!success) {
                console.error('❌ No se pudo despachar helicóptero');
            } else {
                console.log(`✅ Helicóptero despachado exitosamente`);
            }
            return;
        }
        
        // === SINGLEPLAYER: Crear convoy localmente (solo para trucks) ===
        
        // Tomar vehículo de la base
        if (!from.takeVehicle()) {
            return;
        }
        
        // Crear convoy con el tipo apropiado
        const vehicle = this.applyUpgrades(VEHICLE_TYPES[vehicleType], vehicleType);
        
        // 🆕 NUEVO: Sistema de cargo separado por raza
        let cargo = 0;
        if (this.game.selectedRace === 'B_Nation') {
            // SISTEMA AÉREO: Solo carga suministros cuando sale del HQ
            if (from.type === 'hq') {
                cargo = from.removeSupplies(vehicle.capacity);
            } else {
                // Cuando sale de un Front, NO quita suministros
                cargo = 0;
            }
        } else {
            // SISTEMA TRADICIONAL: Cargo normal
            cargo = from.removeSupplies(vehicle.capacity);
        }
        
        const convoy = new Convoy(from, to, vehicle, vehicleType, cargo, this.game);
        
        // Verificar si la base de origen está afectada por fobSabotage
        if (from.type === 'fob') {
            const isSabotaged = from.isSabotaged ? from.isSabotaged() : from.hasEffect && from.hasEffect('fobSabotage');
            
            if (isSabotaged) {
                console.log(`⚡ Convoy desde FOB ${from.id} saboteada - penalización aplicada`);
                // Marcar el convoy para aplicación de penalización de velocidad
                convoy.sabotageOrigin = true;
                convoy.sabotageSpeedPenalty = true; // Se aplicará en el primer update
                convoy.firstSabotageUpdate = true; // Para consumir camión solo la primera vez
            }
        }
        
        // En tutorial, agregar al array de convoyes del tutorial
        if (this.game.state === 'tutorial' && this.game.tutorialManager?.tutorialConvoys) {
            this.game.tutorialManager.tutorialConvoys.push(convoy);
        } else {
            this.convoys.push(convoy);
        }
        
        // Incrementar contador de convoyes (solo para jugador, no IA)
        if (from.team === this.game.myTeam) {
            this.game.matchStats.convoysDispatched++;
        }
        
        // Reproducir sonido: volumen reducido para convoyes del enemigo
        if (from.team === this.game.myTeam) {
            this.game.audio.playSound('dispatch'); // Sonido normal para convoyes del jugador
        } else {
            this.game.audio.playEnemyTruckSound(); // Sonido reducido para convoyes del enemigo
        }
    }
    
    /**
     * Crea una ruta médica de emergencia (ambulancia)
     */
    createMedicalRoute(from, to) {
        // Verificar que los nodos no estén abandonando
        if (from.isAbandoning || to.isAbandoning) {
            console.log('⚠️ No se puede enviar ambulancia: nodo abandonando');
            return;
        }
        
        // Permitir HQ (cualquier equipo) o Hospital de Campaña como origen
        const validOrigin = from.type === 'hq' || from.type === 'campaignHospital';
        // Permitir frentes (cualquier equipo) como destino
        const validDestination = to.type === 'front';
        
        if (!validOrigin || !validDestination) {
            console.log(`⚠️ Ruta médica inválida: origen=${from.type}, destino=${to.type}`);
            return;
        }
        
        // === MULTIJUGADOR: Enviar solicitud al servidor ===
        if (this.game.isMultiplayer && this.game.network) {
            console.log(`🚑 MULTIJUGADOR: Enviando solicitud de ambulancia: ${from.id} → ${to.id}`);
            this.game.network.requestAmbulance(from.id, to.id);
            // El servidor validará y enviará ambulance_spawned
            return;
        }
        
        // Verificar ambulancia disponible (funciona para HQ y hospitales)
        if (!from.hasAmbulanceAvailable && !from.dispatchAmbulance) {
            console.log(`⚠️ Nodo ${from.type} no tiene sistema médico`);
            return;
        }
        
        // Tomar ambulancia según el tipo de nodo
        if (from.type === 'hq') {
            // HQ (cualquier equipo)
            if (!from.hasAmbulanceAvailable || !from.hasAmbulanceAvailable()) {
                console.log(`⚠️ ${from.type} no tiene ambulancia disponible`);
                return;
            }
            if (!from.takeAmbulance()) {
                return;
            }
        } else if (from.type === 'campaignHospital') {
            // Hospital de Campaña
            if (!from.availableVehicles || from.availableVehicles <= 0) {
                console.log('⚠️ Hospital no tiene ambulancia disponible');
                return;
            }
            if (!from.dispatchAmbulance()) {
                return;
            }
        }
        
        // Crear convoy médico con upgrades aplicados
        const vehicle = this.applyUpgrades(VEHICLE_TYPES['ambulance'], 'ambulance');
        
        // Usar 'ambulance' como vehicleType para forzar renderizado de bolita roja
        const convoy = new Convoy(from, to, vehicle, 'ambulance', 0, this.game);
        convoy.isMedical = true;
        convoy.targetFrontId = to.id;
        
        // En tutorial, añadir a tutorialConvoys
        if (this.game.state === 'tutorial' && this.game.tutorialManager?.tutorialConvoys) {
            this.game.tutorialManager.tutorialConvoys.push(convoy);
        } else {
            this.convoys.push(convoy);
        }
        
        // Reproducir sonido: volumen reducido para ambulancias del enemigo
        if (from.team === this.game.myTeam) {
            this.game.audio.playSound('dispatch'); // Sonido normal para ambulancias del jugador
        } else {
            this.game.audio.playEnemyTruckSound(); // Sonido reducido para ambulancias del enemigo
        }
    }
    
    /**
     * Entrega suministros al destino
     */
    deliverSupplies(convoy) {
        // Ambulancia: resolver emergencia
        if (convoy.isMedical) {
            this.game.medicalSystem.resolveEmergency(convoy.targetFrontId);
            this.game.audio.playSound('delivery');
            return;
        }
        
        // Convoy normal
        convoy.target.addSupplies(convoy.cargo);
        
        if (convoy.target.type === 'front') {
            this.game.score += Math.floor(convoy.cargo);
            this.game.deliveries++;
            this.game.audio.playSound('delivery');
            
            // Texto flotante mostrando la cantidad (con acumulación por baseId)
            this.game.particleSystem.createFloatingText(
                convoy.target.x, 
                convoy.target.y - 30, 
                `+${Math.floor(convoy.cargo)}`, 
                '#4ecca3',
                convoy.target.id  // Pasar ID de la base para acumulación
            );

            // Tutorial: disparar trigger cuando el convoy llega al frente
            if (this.game.state === 'tutorial' && this.game.tutorialManager && convoy.target.type === 'front') {
                this.game.tutorialManager.notifyAction('convoy_arrived_to_front', { targetId: convoy.target.id });
            }
        } else {
            
            // Texto flotante para FOB también (con acumulación por baseId)
            this.game.particleSystem.createFloatingText(
                convoy.target.x, 
                convoy.target.y - 30, 
                `+${Math.floor(convoy.cargo)}`, 
                '#4ecca3',
                convoy.target.id  // Pasar ID de la base para acumulación
            );

            // Tutorial: disparar trigger cuando el convoy llega a la FOB
            if (this.game.state === 'tutorial' && this.game.tutorialManager && convoy.target.type === 'fob') {
                this.game.tutorialManager.notifyAction('convoy_arrived_to_fob', { targetId: convoy.target.id });
            }
        }
    }
    
    /**
     * Actualiza todos los convoyes
     */
    update(dt) {
        // Actualizar convoyes
        for (let i = this.convoys.length - 1; i >= 0; i--) {
            const convoy = this.convoys[i];
            
            // Velocidad normal (sin penalizaciones de terreno)
            let speedMultiplier = 1;
            
            // Aplicar penalización de fobSabotage si el convoy viene de una FOB sabotajeada
            if ((convoy.sabotageOrigin && convoy.sabotageSpeedPenalty) || (convoy.harassedOrigin && convoy.harassedSpeedPenalty)) {
                // Aplicar penalización constante durante todo el trayecto
                speedMultiplier = 0.5; // 50% de penalización
                
                // Consumir un camión del contador de fobSabotage SOLO la primera vez
                const firstUpdate = convoy.firstSabotageUpdate || convoy.firstHarassedUpdate;
                if (convoy.originBase && firstUpdate === true) {
                    if (typeof convoy.originBase.consumeFobSabotageTruck === 'function') {
                        convoy.originBase.consumeFobSabotageTruck();
                        convoy.firstSabotageUpdate = false;
                        console.log(`🚛 Convoy desde FOB saboteada - camión afectado`);
                    } else if (typeof convoy.originBase.consumeHarassmentTruck === 'function') {
                        convoy.originBase.consumeHarassmentTruck();
                        convoy.firstHarassedUpdate = false;
                        console.log(`🚛 Convoy desde FOB saboteada - camión afectado`);
                    }
                }
            }
            
            const arrived = convoy.update(dt, speedMultiplier);
            
            
            // Partículas de humo eliminadas para mejor rendimiento
            
            if (arrived) {
                if (convoy.returning) {
                    // Llegó de vuelta a la base de origen - devolver vehículo
                    if (convoy.isMedical) {
                        // CRÍTICO: Solo HQ regresa ambulancia, Hospital se consume
                        if (convoy.originBase.type === 'hq') {
                            convoy.originBase.returnAmbulance();
                        } else if (convoy.originBase.type === 'campaignHospital') {
                            // NO devolver - la ambulancia del hospital se consume
                            console.log(`🚑 Ambulancia ${convoy.id} CONSUMIDA del Hospital ${convoy.originBase.team}`);
                        }
                    } else {
                        convoy.originBase.returnVehicle();
                    }
                    this.convoys.splice(i, 1);
                } else {
                    // Llegó al destino
                    if (convoy.isMedical && convoy.originBase.type === 'campaignHospital') {
                        // Ambulancia del hospital: resolver emergencia y eliminar convoy (no regresa)
                        this.deliverSupplies(convoy);
                        
                        // Verificar si el hospital se queda sin ambulancias para eliminarlo
                        if (convoy.originBase.availableVehicles <= 0) {
                            console.log(`🏥 Hospital ${convoy.originBase.id} sin ambulancias - ELIMINANDO`);
                            convoy.originBase.active = false; // Marcar para eliminación
                        }
                        
                        this.convoys.splice(i, 1);
                    } else {
                        // SISTEMA TRADICIONAL: Entrega normal de suministros
                        this.deliverSupplies(convoy);
                        
                        // SINGLEPLAYER: Implementar lógica de returning localmente
                        if (!this.game.isMultiplayer) {
                            convoy.returning = true;
                            convoy.progress = 0;
                            convoy.target = convoy.originBase; // Actualizar target para el regreso
                            console.log(`🚛 SINGLEPLAYER: Convoy ${convoy.id} iniciando regreso a ${convoy.originBase.type}`);
                        } else {
                            convoy.startReturning();
                        }
                    }
                }
            }
        }
    }
    
    
    /**
     * Limpia todos los convoyes
     */
    clear() {
        this.convoys = [];
        this.emergencyHeliTimer = 0;
    }
    
    /**
     * Obtiene todos los convoyes actuales
     */
    getConvoys() {
        return this.convoys;
    }
    
    /**
     * Obtiene el número de convoyes activos
     */
    getCount() {
        return this.convoys.length;
    }
    
    // 🆕 NUEVO: Método para obtener rutas válidas por raza
    getValidRoutesForRace(fromType, raceId) {
        const raceConfig = getRaceConfig(raceId);
        
        // Si la raza tiene rutas especiales (aerial), usarlas
        if (raceConfig?.specialMechanics?.transportSystem === 'aerial') {
            return RACE_SPECIAL_ROUTES[raceId]?.[fromType] || VALID_ROUTES[fromType];
        }
        
        // Si no, usar rutas normales
        return VALID_ROUTES[fromType];
    }
    
    // 🆕 NUEVO: Método para seleccionar tipo de vehículo por raza
    selectVehicleType(from, raceId) {
        const raceConfig = getRaceConfig(raceId);
        
        // Si es HQ y la raza tiene transporte aéreo
        if (from.type === 'hq' && raceConfig?.specialMechanics?.transportSystem === 'aerial') {
            return 'helicopter';
        }
        
        // Si es Front y tiene helicópteros, usar helicóptero
        if (from.type === 'front' && from.hasHelicopters) {
            return 'helicopter';
        }
        
        // 🆕 NUEVO: Si es Base Aérea con helicópteros, usar helicóptero
        if ((from.type === 'aerialBase' || from.isAerialBase) && from.landedHelicopters && from.landedHelicopters.length > 0) {
            return 'helicopter';
        }
        
        // 🆕 NUEVO: Si es Base Aérea sin helicópteros, inicializar array
        if ((from.type === 'aerialBase' || from.isAerialBase)) {
            if (!from.landedHelicopters) {
                from.landedHelicopters = [];
            }
            return 'helicopter'; // Devolver helicopter aunque esté vacía para que el error se muestre arriba
        }
        
        // Lógica estándar
        if (from.type === 'hq') {
            return 'heavy_truck';
        } else {
            return 'truck';
        }
    }
}

