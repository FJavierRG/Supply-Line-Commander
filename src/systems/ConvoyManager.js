// ===== GESTOR DE CONVOYES (SOLO VISUAL) =====
// ⚠️ IMPORTANTE: Este sistema SOLO muestra convoyes visualmente.
// NO entrega suministros ni modifica estado - el servidor es la autoridad.

import { Convoy } from '../entities/Convoy.js';
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
        
        // Verificar suministros
        if (!from.hasEnoughSupplies(10)) {
            return;
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
     * Muestra efectos visuales cuando un convoy entrega suministros (SOLO VISUAL)
     * El servidor maneja toda la lógica de entrega.
     * Este método debe llamarse cuando el servidor notifica que un convoy llegó.
     * @param {Convoy} convoy - Convoy que entregó
     */
    deliverSupplies(convoy) {
        // === SOLO EFECTOS VISUALES ===
        // El servidor ya entregó los suministros - esto solo muestra efectos
        
        // Ambulancia: mostrar resolución de emergencia (visual)
        if (convoy.isMedical) {
            // El servidor ya resolvió la emergencia - solo mostrar visual
            this.game.medicalSystem.resolveEmergency(convoy.targetFrontId);
            this.game.audio.playSound('delivery');
            return;
        }
        
        // === EFECTOS VISUALES PARA CONVOY NORMAL ===
        // El servidor ya entregó los suministros - solo mostrar efectos
        
        if (convoy.target && convoy.target.type === 'front') {
            // Texto flotante mostrando la cantidad (con acumulación por baseId)
            this.game.particleSystem.createFloatingText(
                convoy.target.x, 
                convoy.target.y - 30, 
                `+${Math.floor(convoy.cargo || 0)}`, 
                '#4ecca3',
                convoy.target.id  // Pasar ID de la base para acumulación
            );

            // Tutorial simple: no hay triggers
        } else if (convoy.target) {
            // Texto flotante para FOB también (con acumulación por baseId)
            this.game.particleSystem.createFloatingText(
                convoy.target.x, 
                convoy.target.y - 30, 
                `+${Math.floor(convoy.cargo || 0)}`, 
                '#4ecca3',
                convoy.target.id  // Pasar ID de la base para acumulación
            );

            // Tutorial simple: no hay triggers
        }
        
        // Sonido de entrega
        this.game.audio.playSound('delivery');
        
        // === LEGACY REMOVED: NO modificar estado aquí ===
        // - NO convoy.target.addSupplies() - el servidor maneja esto
        // - NO modificar score/deliveries - el servidor maneja esto
        // Ver: server/game/managers/ConvoyMovementManager.js
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

