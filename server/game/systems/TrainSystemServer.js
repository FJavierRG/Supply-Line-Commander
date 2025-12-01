// ===== SISTEMA DE TRENES DEL SERVIDOR =====
// Maneja la lógica autoritativa de trenes: creación automática, movimiento y entrega

import { v4 as uuidv4 } from 'uuid';
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

export class TrainSystemServer {
    constructor(gameState) {
        this.gameState = gameState;
        this.trainTimers = new Map(); // Map<stationId, timer> para cada estación
        
        // Obtener configuración desde serverNodes.js
        const trainConfig = SERVER_NODE_CONFIG.effects.trainStation || {};
        this.TRAIN_INTERVAL = trainConfig.trainInterval || 15; // Segundos entre envíos de tren
        this.TRAIN_SPEED = trainConfig.trainSpeed || 100; // Píxeles por segundo
        this.TRAIN_CARGO = trainConfig.trainCargo || 50; // Suministros que entrega cada tren
    }
    
    /**
     * Actualiza el sistema de trenes (llamado cada tick)
     */
    update(dt) {
        // Inicializar array de trenes si no existe
        if (!this.gameState.trains) {
            this.gameState.trains = [];
        }
        
        // Actualizar timers de cada estación y crear trenes cuando corresponda
        this.updateTrainTimers(dt);
        
        // Actualizar movimiento de trenes existentes
        this.updateTrainMovement(dt);
        
        // Verificar llegadas de trenes
        this.checkTrainArrivals();
    }
    
    /**
     * Actualiza los timers de cada estación y crea trenes automáticamente
     */
    updateTrainTimers(dt) {
        // Buscar todas las estaciones de tren construidas
        const trainStations = this.gameState.nodes.filter(n => 
            n.type === 'trainStation' && 
            n.constructed && 
            !n.isAbandoning &&
            !n.isConstructing
        );
        
        for (const station of trainStations) {
            // Inicializar timer si no existe
            if (!this.trainTimers.has(station.id)) {
                this.trainTimers.set(station.id, 0);
            }
            
            // Incrementar timer
            let timer = this.trainTimers.get(station.id);
            timer += dt;
            
            // Si pasó el intervalo configurado, enviar trenes a todos los FOBs del equipo
            if (timer >= this.TRAIN_INTERVAL) {
                timer = 0; // Resetear timer
                this.sendTrainsFromStation(station);
            }
            
            this.trainTimers.set(station.id, timer);
        }
        
        // Limpiar timers de estaciones que ya no existen
        const stationIds = new Set(trainStations.map(s => s.id));
        for (const [stationId] of this.trainTimers) {
            if (!stationIds.has(stationId)) {
                this.trainTimers.delete(stationId);
            }
        }
    }
    
    /**
     * Envía trenes desde una estación a todos los FOBs del mismo equipo
     */
    sendTrainsFromStation(station) {
        // Buscar FOBs del mismo equipo
        const fobs = this.gameState.nodes.filter(n => 
            n.type === 'fob' && 
            n.team === station.team && 
            !n.isConstructing && 
            !n.isAbandoning
        );
        
        if (fobs.length === 0) {
            return; // No hay FOBs, no enviar trenes
        }
        
        // Crear un tren para cada FOB
        for (const fob of fobs) {
            this.createTrain(station, fob);
        }
        
        console.log(`🚂 Estación ${station.id} envió ${fobs.length} trenes`);
    }
    
    /**
     * Crea un nuevo tren
     */
    createTrain(fromStation, toFob) {
        const dx = toFob.x - fromStation.x;
        const dy = toFob.y - fromStation.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 1) {
            return; // Distancia inválida
        }
        
        const train = {
            id: `train_${uuidv4().substring(0, 8)}`,
            fromId: fromStation.id,
            toId: toFob.id,
            team: fromStation.team,
            progress: 0, // 0 a 1
            returning: false,
            initialDistance: distance,
            cargo: this.TRAIN_CARGO
        };
        
        this.gameState.trains.push(train);
        
        // Notificar a los clientes
        this.gameState.addSoundEvent('train_dispatch', { team: fromStation.team });
    }
    
    /**
     * Actualiza el movimiento de todos los trenes
     */
    updateTrainMovement(dt) {
        for (let i = this.gameState.trains.length - 1; i >= 0; i--) {
            const train = this.gameState.trains[i];
            
            // Verificar que los nodos existan
            const fromNode = this.gameState.nodes.find(n => n.id === train.fromId);
            const toNode = this.gameState.nodes.find(n => n.id === train.toId);
            
            if (!fromNode || !toNode) {
                // Nodo no existe, eliminar tren
                console.warn(`⚠️ Tren ${train.id} tiene nodo inexistente, eliminando`);
                this.gameState.trains.splice(i, 1);
                continue;
            }
            
            // Usar distancia inicial fija
            const distance = train.initialDistance || 1;
            
            if (distance < 1) {
                // Distancia inválida, eliminar tren
                this.gameState.trains.splice(i, 1);
                continue;
            }
            
            // Velocidad del tren (píxeles por segundo)
            let trainSpeed = this.TRAIN_SPEED;
            
            // 🆕 NUEVO: Aplicar modificadores de disciplinas activas
            trainSpeed = this.applyDisciplineModifiers(train, trainSpeed);
            
            // Progress por segundo = velocidad / distancia
            const progressPerSecond = trainSpeed / distance;
            
            // Actualizar progress
            train.progress += progressPerSecond * dt;
            
            // Si llegó al destino
            if (train.progress >= 1.0) {
                train.progress = 1.0;
                // El tren llegará en el siguiente checkTrainArrivals()
            }
        }
    }
    
    /**
     * 🆕 NUEVO: Aplica modificadores de disciplinas activas a los trenes
     * @param {Object} train - Tren
     * @param {number} trainSpeed - Velocidad actual del tren
     * @returns {number} Velocidad con modificadores de disciplina aplicados
     */
    applyDisciplineModifiers(train, trainSpeed) {
        // Obtener modificadores de la disciplina activa del jugador
        const modifiers = this.gameState.disciplineManager.getModifiersForSystem(train.team, 'convoy');
        
        // Aplicar multiplicadores específicos por tipo de vehículo
        if (modifiers.speedMultipliers) {
            const multiplier = modifiers.speedMultipliers.train || modifiers.speedMultipliers.default || 1.0;
            trainSpeed *= multiplier;
        }
        
        return trainSpeed;
    }
    
    /**
     * Verifica si algún tren llegó a su destino y entrega suministros
     */
    checkTrainArrivals() {
        for (let i = this.gameState.trains.length - 1; i >= 0; i--) {
            const train = this.gameState.trains[i];
            
            if (train.progress >= 1.0 && !train.returning) {
                // Tren llegó al FOB
                const fob = this.gameState.nodes.find(n => n.id === train.toId);
                
                if (fob && fob.hasSupplies) {
                    // Entregar suministros
                    const currentSupplies = fob.supplies || 0;
                    const maxSupplies = fob.maxSupplies || 100;
                    const newSupplies = Math.min(currentSupplies + train.cargo, maxSupplies);
                    fob.supplies = newSupplies;
                    
                    console.log(`🚂 Tren ${train.id} entregó ${train.cargo} suministros a FOB ${fob.id}`);
                }
                
                // Eliminar tren después de entregar (los trenes no vuelven)
                this.gameState.trains.splice(i, 1);
            }
        }
    }
    
    /**
     * Limpia todos los trenes (cuando termina la partida)
     */
    clear() {
        if (this.gameState.trains) {
            this.gameState.trains = [];
        }
        this.trainTimers.clear();
    }
}

