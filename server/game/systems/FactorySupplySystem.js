// ===== SISTEMA DE ENVÍOS DE FÁBRICAS DEL SERVIDOR =====
// Maneja la lógica autoritativa de envíos de suministros desde fábricas al HQ

import { v4 as uuidv4 } from 'uuid';
import { SERVER_NODE_CONFIG } from '../../config/serverNodes.js';

export class FactorySupplySystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.factoryTimers = new Map(); // Map<factoryId, timer> para cada fábrica
        
        // Obtener configuración desde serverNodes.js
        const factoryConfig = SERVER_NODE_CONFIG.effects.factory?.supplyGeneration || {};
        if (!factoryConfig.interval || !factoryConfig.amount || !factoryConfig.speed) {
            console.error('⚠️ Configuración de fábrica incompleta en serverNodes.js');
        }
        this.SUPPLY_INTERVAL = factoryConfig.interval;
        this.SUPPLY_AMOUNT = factoryConfig.amount;
        this.SUPPLY_SPEED = factoryConfig.speed; // Velocidad en píxeles por segundo (configurada en serverNodes.js)
    }
    
    /**
     * Actualiza el sistema de envíos de fábricas (llamado cada tick)
     */
    update(dt) {
        // Inicializar array de supplyDeliveries si no existe
        if (!this.gameState.factorySupplyDeliveries) {
            this.gameState.factorySupplyDeliveries = [];
        }
        
        // Actualizar timers de cada fábrica y crear envíos cuando corresponda
        this.updateFactoryTimers(dt);
        
        // Actualizar movimiento de envíos existentes
        this.updateSupplyMovement(dt);
        
        // Verificar llegadas de envíos
        this.checkSupplyArrivals();
    }
    
    /**
     * Actualiza los timers de cada fábrica y crea envíos automáticamente
     */
    updateFactoryTimers(dt) {
        // Buscar todas las fábricas construidas y activas
        const factories = this.gameState.nodes.filter(n => 
            n.type === 'factory' && 
            n.constructed && 
            n.active && 
            !n.disabled && 
            !n.isAbandoning &&
            !n.isConstructing
        );
        
        for (const factory of factories) {
            // Buscar el HQ del mismo equipo
            const hq = this.gameState.nodes.find(n => 
                n.type === 'hq' && 
                n.team === factory.team &&
                n.active &&
                n.hasSupplies
            );
            
            if (!hq) continue; // No hay HQ, saltar
            
            // 🆕 Calcular intervalo efectivo considerando plantas nucleares en rango
            const effectiveInterval = this.getEffectiveSupplyInterval(factory);
            
            // Inicializar timer si no existe
            if (!this.factoryTimers.has(factory.id)) {
                this.factoryTimers.set(factory.id, 0);
            }
            
            // Incrementar timer
            let timer = this.factoryTimers.get(factory.id);
            timer += dt;
            
            // Si pasó el intervalo efectivo, enviar suministros al HQ
            if (timer >= effectiveInterval) {
                timer = 0; // Resetear timer
                this.sendSupplyFromFactory(factory, hq);
            }
            
            this.factoryTimers.set(factory.id, timer);
        }
        
        // Limpiar timers de fábricas que ya no existen
        const factoryIds = new Set(factories.map(f => f.id));
        for (const [factoryId] of this.factoryTimers) {
            if (!factoryIds.has(factoryId)) {
                this.factoryTimers.delete(factoryId);
            }
        }
    }
    
    /**
     * 🆕 Calcula el intervalo efectivo de producción considerando plantas nucleares en rango
     * @param {Object} factory - Nodo fábrica
     * @returns {number} Intervalo efectivo en segundos
     */
    getEffectiveSupplyInterval(factory) {
        // Intervalo base desde configuración
        let effectiveInterval = this.SUPPLY_INTERVAL;
        
        // Obtener configuración de rango y bonus de planta nuclear
        const nuclearPlantRange = SERVER_NODE_CONFIG.ranges?.nuclearPlant || 0;
        const factorySpeedBonus = SERVER_NODE_CONFIG.effects?.nuclearPlant?.factorySpeedBonus || 0;
        
        // Si no hay rango o bonus configurado, usar intervalo base
        if (nuclearPlantRange <= 0 || factorySpeedBonus <= 0) {
            return effectiveInterval;
        }
        
        // Buscar todas las plantas nucleares del mismo equipo en rango
        const nuclearPlants = this.gameState.nodes.filter(n => 
            n.type === 'nuclearPlant' && 
            n.team === factory.team &&
            n.constructed &&
            n.active &&
            !n.disabled &&
            !n.isAbandoning &&
            !n.isConstructing
        );
        
        // Contar plantas nucleares en rango
        let plantsInRange = 0;
        for (const plant of nuclearPlants) {
            const dx = factory.x - plant.x;
            const dy = factory.y - plant.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Considerar el hitbox del edificio (radius * 1.2, similar a otros sistemas)
            const baseRadius = SERVER_NODE_CONFIG.radius?.[factory.type] || 30;
            const factoryHitboxRadius = baseRadius * 1.2;
            
            // Si el hitbox de la fábrica está dentro del rango de la planta, está afectada
            if (distance <= (nuclearPlantRange + factoryHitboxRadius)) {
                plantsInRange++;
            }
        }
        
        // Aplicar bonus acumulativo: cada planta reduce el intervalo
        if (plantsInRange > 0) {
            const totalBonus = factorySpeedBonus * plantsInRange;
            effectiveInterval = Math.max(0.1, effectiveInterval - totalBonus); // Mínimo 0.1 segundos
        }
        
        return effectiveInterval;
    }
    
    /**
     * Envía suministros desde una fábrica a su HQ
     */
    sendSupplyFromFactory(factory, hq) {
        const dx = hq.x - factory.x;
        const dy = hq.y - factory.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 1) {
            return; // Distancia inválida
        }
        
        // Usar velocidad configurada en serverNodes.js
        const speed = this.SUPPLY_SPEED;
        
        // 🆕 NUEVO: Aplicar modificadores de disciplinas
        const disciplineModifiers = this.gameState.disciplineManager.getModifiersForSystem(factory.team, 'factory');
        let effectiveCargo = this.SUPPLY_AMOUNT;
        
        // Aplicar penalización de supplies si la disciplina está activa
        if (disciplineModifiers.supplyPenalty) {
            effectiveCargo = Math.max(1, effectiveCargo + disciplineModifiers.supplyPenalty); // El penalty es negativo
        }
        
        const delivery = {
            id: `factory_supply_${uuidv4().substring(0, 8)}`,
            factoryId: factory.id,
            hqId: hq.id,
            team: factory.team,
            progress: 0, // 0 a 1
            initialDistance: distance,
            speed: speed,
            cargo: effectiveCargo
        };
        
        this.gameState.factorySupplyDeliveries.push(delivery);
        
        // Log silenciado para optimización de rendimiento
        // console.log(`🏭 Fábrica ${factory.id} envió ${effectiveCargo} suministros al HQ`);
    }
    
    /**
     * Actualiza el movimiento de todos los envíos de suministros
     */
    updateSupplyMovement(dt) {
        for (let i = this.gameState.factorySupplyDeliveries.length - 1; i >= 0; i--) {
            const delivery = this.gameState.factorySupplyDeliveries[i];
            
            // Verificar que los nodos existan
            const factory = this.gameState.nodes.find(n => n.id === delivery.factoryId);
            const hq = this.gameState.nodes.find(n => n.id === delivery.hqId);
            
            if (!factory || !hq) {
                // Nodo no existe, eliminar envío
                console.warn(`⚠️ Envío ${delivery.id} tiene nodo inexistente, eliminando`);
                this.gameState.factorySupplyDeliveries.splice(i, 1);
                continue;
            }
            
            // Usar distancia inicial fija
            const distance = delivery.initialDistance || 1;
            
            if (distance < 1) {
                // Distancia inválida, eliminar envío
                this.gameState.factorySupplyDeliveries.splice(i, 1);
                continue;
            }
            
            // Usar velocidad del envío (debe estar configurada al crearse)
            const speed = delivery.speed || this.SUPPLY_SPEED;
            
            // Progress por segundo = velocidad / distancia
            const progressPerSecond = speed / distance;
            
            // Actualizar progress
            delivery.progress += progressPerSecond * dt;
            
            // Si llegó al destino
            if (delivery.progress >= 1.0) {
                delivery.progress = 1.0;
                // El envío llegará en el siguiente checkSupplyArrivals()
            }
        }
    }
    
    /**
     * Verifica si algún envío llegó a su destino y entrega suministros
     */
    checkSupplyArrivals() {
        for (let i = this.gameState.factorySupplyDeliveries.length - 1; i >= 0; i--) {
            const delivery = this.gameState.factorySupplyDeliveries[i];
            
            if (delivery.progress >= 1.0) {
                // Envío llegó al HQ
                const hq = this.gameState.nodes.find(n => n.id === delivery.hqId);
                
                if (hq && hq.hasSupplies && hq.supplies !== null) {
                    // Entregar suministros
                    const oldSupplies = hq.supplies;
                    hq.supplies = Math.min(hq.maxSupplies, hq.supplies + delivery.cargo);
                    
                    // 🆕 NUEVO: Aplicar bonus de currency de disciplinas
                    const disciplineModifiers = this.gameState.disciplineManager.getModifiersForSystem(delivery.team, 'factory');
                    if (disciplineModifiers.currencyPerDelivery && disciplineModifiers.currencyPerDelivery > 0) {
                        const currencyBonus = disciplineModifiers.currencyPerDelivery;
                        this.gameState.currency[delivery.team] += currencyBonus;
                        
                        // 🆕 NUEVO: Crear evento visual para mostrar texto flotante en la fábrica
                        const factory = this.gameState.nodes.find(n => n.id === delivery.factoryId);
                        if (factory && this.gameState.addVisualEvent) {
                            this.gameState.addVisualEvent('factory_currency_bonus', {
                                factoryId: factory.id,
                                x: factory.x,
                                y: factory.y,
                                amount: currencyBonus,
                                team: delivery.team
                            });
                        }
                        
                        // Log silenciado para optimización
                        // console.log(`💰 Disciplina activa: +${currencyBonus} currency`);
                    }
                    
                    // Log silenciado para optimización de rendimiento
                    // console.log(`🏭 Envío entregó suministros al HQ`);
                }
                
                // Eliminar envío después de entregar
                this.gameState.factorySupplyDeliveries.splice(i, 1);
            }
        }
    }
    
    /**
     * Limpia todos los envíos (cuando termina la partida)
     */
    clear() {
        if (this.gameState.factorySupplyDeliveries) {
            this.gameState.factorySupplyDeliveries = [];
        }
        this.factoryTimers.clear();
    }
}

