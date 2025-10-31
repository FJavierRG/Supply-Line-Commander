// ===== GESTOR DE CONVOYES =====
import { Convoy } from '../entities/convoy.js';
import { VEHICLE_TYPES } from '../config/constants.js';
import { getRaceConfig } from '../config/races.js';

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
        
        // ⚠️ DEPRECATED: Bonuses movidos al servidor (autoridad - ANTI-HACK)
        // Los bonuses de TruckFactory y EngineerCenter ahora se calculan en el servidor
        
        return vehicle;
    }
    
    /**
     * Crea una ruta de suministros entre dos bases
     */
    createRoute(from, to) {
        // DEBUG: Log desactivado - spam excesivo en consola
        
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
        
        // === SERVIDOR AUTORITATIVO: Siempre enviar solicitud al servidor ===
        if (this.game.network) {
            this.game.network.requestConvoy(from.id, to.id);
            // El servidor validará TODO y enviará convoy_spawned
            return;
        }
        
        // Si no hay NetworkManager, no hacer nada (modo obsoleto)
        console.error('❌ No se puede crear convoy: NetworkManager no disponible');
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
        
        // === SERVIDOR AUTORITATIVO: Siempre enviar solicitud al servidor ===
        if (this.game.network) {
            this.game.network.requestAmbulance(from.id, to.id);
            // El servidor validará TODO y enviará ambulance_spawned
            return;
        }
        
        // Si no hay NetworkManager, no hacer nada (modo obsoleto)
        console.error('❌ No se puede crear ambulancia: NetworkManager no disponible');
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
     * Actualiza todos los convoyes - SOLO VISUAL (servidor autoritativo)
     */
    update(dt) {
        // En modo servidor autoritativo, el servidor maneja TODO
        // El cliente SOLO actualiza posiciones visuales
        for (const convoy of this.convoys) {
            convoy.update(dt);
        }
        
        // La eliminación de convoys se maneja desde NetworkManager
        // cuando el servidor envía convoy_arrived o convoy_removed
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
            return this.game.serverBuildingConfig?.routes?.raceSpecial?.[raceId]?.[fromType] || 
                   this.game.serverBuildingConfig?.routes?.valid?.[fromType] || [];
        }
        
        // Si no, usar rutas normales
        return this.game.serverBuildingConfig?.routes?.valid?.[fromType] || [];
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

