// ===== FACTORY: CREACIÓN DE NODOS CON UPGRADES =====
import { MapNode } from '../entities/MapNode.js';
import { getNodeConfig } from '../config/nodes.js';

/**
 * Factory para crear nodos del mapa con upgrades aplicados automáticamente
 */
export class BaseFactory {
    constructor(game) {
        this.game = game;
    }
    
    /**
     * Crea un nuevo nodo con todos los upgrades aplicados
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     * @param {string} type - Tipo: 'hq', 'fob', 'front', etc.
     * @param {Object} options - Opciones adicionales: { isConstructed: bool, startingSuppliesPercent: number }
     * @returns {MapNode} Nodo con upgrades aplicados
     */
    createBase(x, y, type, options = {}) {
        // Obtener configuración del nodo
        const config = getNodeConfig(type);
        if (!config) {
            console.error(`⚠️ No se encontró configuración para el tipo: ${type}`);
            return null;
        }
        
        // Extender config con opciones (permite sobrescribir team, etc.)
        const extendedConfig = { ...config, ...options };
        
        // Crear nodo
        const node = new MapNode(x, y, type, extendedConfig, this.game);
        
        // Si se marca isConstructed, significa que debe EMPEZAR en construcción
        if (options.isConstructed === true && node.needsConstruction) {
            node.isConstructing = true;
            node.constructed = false;
            node.constructionTimer = 0;
        }
        
        // ⚠️ NOTA: flipHorizontal ahora se maneja dinámicamente por equipo en RenderSystem
        // Ya no se aplica basándose en el tipo de nodo
        
        // Aplicar upgrades según tipo
        this.applyUpgradesToNode(node, options);
        
        return node;
    }
    
    /**
     * Aplica todos los upgrades relevantes a un nodo
     * @param {MapNode} node - Nodo a modificar
     * @param {Object} options - Opciones: { isConstructed: false, startingSuppliesPercent: 0 }
     */
    applyUpgradesToNode(node, options = {}) {
        const { isConstructed = false, startingSuppliesPercent = 0 } = options;
        
        // === UPGRADES ESPECÍFICOS POR TIPO ===
        if (node.type === 'hq') {
            this.applyHQUpgrades(node);
        } else if (node.type === 'fob') {
            this.applyFOBUpgrades(node, isConstructed, startingSuppliesPercent);
        } else if (node.type === 'front') {
            this.applyFrontUpgrades(node, isConstructed, startingSuppliesPercent);
        }
    }
    
    /**
     * Aplica upgrades específicos del HQ
     */
    applyHQUpgrades(node) {
        // Sin upgrades permanentes, valores base
    }
    
    /**
     * Aplica upgrades específicos de FOB
     */
    applyFOBUpgrades(node, isConstructed, startingSuppliesPercent) {
        // === RECURSOS INICIALES ===
        if (node.hasSupplies) {
            if (isConstructed) {
                // FOBs construidos empiezan con 25% de recursos
                node.supplies = Math.floor(node.maxSupplies * 0.30);
            } else if (startingSuppliesPercent > 0) {
                node.supplies = Math.floor(node.maxSupplies * startingSuppliesPercent);
            }
        }
    }
    
    /**
     * Aplica upgrades específicos de Frente
     */
    applyFrontUpgrades(node, isConstructed, startingSuppliesPercent) {
        // Los frentes SIEMPRE empiezan con recursos al MÁXIMO
        // (tanto player1 como player2)
        if (node.hasSupplies) {
            node.supplies = node.maxSupplies;
        }
    }
}
