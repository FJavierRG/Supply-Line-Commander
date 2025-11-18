// ===== SISTEMA DE TALLER DE DRONES =====
// Centraliza lógica de descuentos y consumo de suministros para drones

import { SERVER_NODE_CONFIG } from '../config/serverNodes.js';

export class DroneWorkshopSystem {
    constructor(gameState) {
        this.gameState = gameState;
    }

    /**
     * Obtiene el costo (posiblemente con descuento) de un dron
     * @param {string} droneType - Tipo de dron (ej. 'drone', 'cameraDrone')
     * @param {string} playerTeam - Equipo solicitante
     * @returns {{ cost: number, baseCost: number, discountApplied: boolean, usedFobId: string|null }}
     */
    getDroneCost(droneType, playerTeam) {
        const baseCost = this.getBaseDroneCost(droneType);

        if (typeof baseCost !== 'number') {
            console.warn(`⚠️ DroneWorkshopSystem: costo base no encontrado para "${droneType}"`);
            return {
                cost: 0,
                baseCost: 0,
                discountApplied: false,
                usedFobId: null
            };
        }

        const config = this.getWorkshopConfig();
        const workshop = this.getActiveWorkshop(playerTeam);

        if (!workshop) {
            return {
                cost: baseCost,
                baseCost,
                discountApplied: false,
                usedFobId: null
            };
        }

        if (!this.isDiscountedDroneType(droneType, config.discountedDroneTypes)) {
            return {
                cost: baseCost,
                baseCost,
                discountApplied: false,
                usedFobId: null
            };
        }

        const eligibleFob = this.getEligibleFob(playerTeam, config.requiredSupplies);

        if (!eligibleFob) {
            return {
                cost: baseCost,
                baseCost,
                discountApplied: false,
                usedFobId: null
            };
        }

        const multiplier = typeof config.discountMultiplier === 'number'
            ? config.discountMultiplier
            : 1;

        const discountedCost = Math.max(0, Math.floor(baseCost * multiplier));

        if (config.suppliesCost > 0) {
            const newSupplies = Math.max(0, eligibleFob.supplies - config.suppliesCost);
            console.log(`📦 Drone Workshop consumió suministros: FOB ${eligibleFob.id.substring(0, 8)} ${eligibleFob.supplies}→${newSupplies} (-${config.suppliesCost})`);
            eligibleFob.supplies = newSupplies;
        }

        console.log(`💰 Drone Workshop (${playerTeam}) aplicado a ${droneType}: ${baseCost}→${discountedCost} (${(multiplier * 100).toFixed(0)}% del costo)`);

        return {
            cost: discountedCost,
            baseCost,
            discountApplied: true,
            usedFobId: eligibleFob.id
        };
    }

    getWorkshopConfig() {
        return SERVER_NODE_CONFIG.effects?.droneWorkshop || {
            discountMultiplier: 1,
            requiredSupplies: 0,
            suppliesCost: 0,
            discountedDroneTypes: []
        };
    }

    getBaseDroneCost(droneType) {
        return SERVER_NODE_CONFIG.costs?.[droneType];
    }

    /**
     * Busca un taller activo del equipo.
     */
    getActiveWorkshop(playerTeam) {
        return this.gameState.nodes.find(n =>
            n.type === 'droneWorkshop' &&
            n.team === playerTeam &&
            n.active &&
            n.constructed &&
            !n.isAbandoning
        );
    }

    /**
     * Obtiene el primer FOB con suministros suficientes.
     */
    getEligibleFob(playerTeam, requiredSupplies) {
        if (!requiredSupplies || requiredSupplies <= 0) {
            return this.gameState.nodes.find(n =>
                n.type === 'fob' &&
                n.team === playerTeam &&
                n.active &&
                n.constructed &&
                !n.isAbandoning
            ) || null;
        }

        return this.gameState.nodes.find(n =>
            n.type === 'fob' &&
            n.team === playerTeam &&
            n.active &&
            n.constructed &&
            !n.isAbandoning &&
            typeof n.supplies === 'number' &&
            n.supplies >= requiredSupplies
        ) || null;
    }

    /**
     * Determina si el tipo de dron es elegible para descuento.
     */
    isDiscountedDroneType(droneType, discountedTypes) {
        if (!Array.isArray(discountedTypes) || discountedTypes.length === 0) {
            return true; // Sin lista = aplica a todos
        }

        return discountedTypes.includes(droneType);
    }
}


