// ===== GESTOR DE CONVOYES =====
import { Convoy } from '../entities/Convoy.js';
import { VEHICLE_TYPES, VALID_ROUTES } from '../config/constants.js';

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
        
        // Validar jerarquía logística
        if (!VALID_ROUTES[from.type] || !VALID_ROUTES[from.type].includes(to.type)) {
            return;
        }
        
        // Verificar que haya vehículos disponibles
        if (!from.hasAvailableVehicle()) {
            return;
        }
        
        // Verificar suministros
        if (!from.hasEnoughSupplies(10)) {
            return;
        }
        
        // === MULTIJUGADOR: Enviar solicitud al servidor ===
        if (this.game.isMultiplayer && this.game.network) {
            // Log desactivado: convoys funcionan correctamente
            this.game.network.requestConvoy(from.id, to.id);
            // El servidor validará y enviará convoy_spawned, que será manejado por NetworkManager
            return;
        }
        
        // === SINGLEPLAYER: Crear convoy localmente ===
        
        // Tomar vehículo de la base
        if (!from.takeVehicle()) {
            return;
        }
        
        // Elegir tipo de camión según el origen
        // HQ → FOB/Frente: Heavy Truck (lento)
        // FOB → FOB/Frente: Truck normal (rápido)
        let vehicleType;
        if (from.type === 'hq') {
            vehicleType = 'heavy_truck'; // Camión pesado desde HQ
        } else {
            vehicleType = 'truck'; // Camión normal desde FOB
        }
        
        // Crear convoy con el tipo apropiado
        const vehicle = this.applyUpgrades(VEHICLE_TYPES[vehicleType], vehicleType);
        const cargo = from.removeSupplies(vehicle.capacity);
        
        const convoy = new Convoy(from, to, vehicle, vehicleType, cargo);
        
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
        
        this.game.audio.playSound('dispatch');
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
        const convoy = new Convoy(from, to, vehicle, 'ambulance', 0);
        convoy.isMedical = true;
        convoy.targetFrontId = to.id;
        
        // En tutorial, añadir a tutorialConvoys
        if (this.game.state === 'tutorial' && this.game.tutorialManager?.tutorialConvoys) {
            this.game.tutorialManager.tutorialConvoys.push(convoy);
        } else {
            this.convoys.push(convoy);
        }
        
        this.game.audio.playSound('dispatch');
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
            
            const arrived = convoy.update(dt, speedMultiplier);
            
            
            // Partículas de humo eliminadas para mejor rendimiento
            
            if (arrived) {
                if (convoy.returning) {
                    // Llegó de vuelta a la base de origen - devolver vehículo
                    if (convoy.isMedical) {
                        // Retornar ambulancia (funciona para cualquier HQ y Hospital)
                        if (convoy.originBase.type === 'hq') {
                            convoy.originBase.returnAmbulance();
                        } else if (convoy.originBase.type === 'campaignHospital') {
                            convoy.originBase.returnHospitalAmbulance();
                        }
                    } else {
                        convoy.originBase.returnVehicle();
                    }
                    this.convoys.splice(i, 1);
                } else {
                    // Llegó al destino - entregar y empezar retorno
                    this.deliverSupplies(convoy);
                    convoy.startReturning();
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
}

