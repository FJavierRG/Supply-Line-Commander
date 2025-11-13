// ===== CONFIGURACIÓN VISUAL DE ÁREAS DE CONSTRUCCIÓN =====
// Define cómo se renderizan visualmente las áreas válidas/inválidas para construir
// SOLO VISUAL - No contiene lógica de validación (eso está en el servidor)

import { getNodeConfig } from './nodes.js';

/**
 * Configuración visual de áreas de construcción por tipo de edificio
 * Cada entrada define:
 * - territoryType: 'ally' | 'enemy' - Qué territorio mostrar en verde
 * - exclusionRules: Array de reglas que definen qué áreas mostrar en rojo
 */
export const BUILD_AREA_VISUAL = {
    // Regla por defecto (edificios normales)
    default: {
        territoryType: 'ally', // Territorio aliado en verde
        exclusionRules: [
            {
                // Todos los nodos bloquean construcción con su área de construcción
                filter: (node, game) => true, // Todos los nodos activos
                radiusType: 'buildRadius', // Usar buildRadius o detectionRadius como fallback
                color: 'rgba(231, 76, 60, 0.2)' // Rojo semi-transparente
            }
        ]
    },
    
    // Torre de vigilancia: puede construirse cerca de comandos enemigos
    vigilanceTower: {
        territoryType: 'ally',
        exclusionRules: [
            {
                // Comandos enemigos solo bloquean con colisión física (no área de detección)
                filter: (node, game) => {
                    const myTeam = game?.myTeam || 'player1';
                    return node.isCommando && node.team !== myTeam;
                },
                radiusType: 'physical', // Solo radio físico del nodo
                color: 'rgba(231, 76, 60, 0.15)' // Rojo más tenue
            },
            {
                // Todos los demás nodos bloquean normalmente
                filter: (node, game) => true,
                radiusType: 'buildRadius',
                color: 'rgba(231, 76, 60, 0.2)'
            }
        ]
    },
    
    // Comando especial operativo: territorio enemigo, bloqueado por torres de vigilancia
    specopsCommando: {
        territoryType: 'enemy', // Territorio enemigo en verde
        exclusionRules: [
            {
                // Torres de vigilancia enemigas bloquean con su radio de detección
                filter: (node, game) => {
                    const myTeam = game?.myTeam || 'player1';
                    const isEnemyTower = (node.type === 'vigilanceTower' || node.isVigilanceTower) && 
                                         node.team !== myTeam;
                    return isEnemyTower;
                },
                radiusType: 'detectionRadius', // Usar radio de detección de la torre
                color: 'rgba(255, 0, 0, 0.3)' // Rojo más intenso para destacar
            },
            {
                // Todos los demás nodos solo bloquean con colisión física
                filter: (node, game) => true,
                radiusType: 'physical', // Solo radio físico
                color: 'rgba(231, 76, 60, 0.15)' // Rojo más tenue
            }
        ]
    },
    
    // 🆕 NUEVO: Dron - muestra áreas de torretas antidrones enemigas que bloquean el lanzamiento
    drone: {
        territoryType: null, // No mostrar territorio válido (solo áreas de exclusión)
        exclusionRules: [
            {
                // Torretas antidrones enemigas bloquean con su radio de intercepción (160px)
                filter: (node, game) => {
                    const myTeam = game?.myTeam || 'player1';
                    return node.type === 'antiDrone' && 
                           node.team !== myTeam &&
                           node.active &&
                           node.constructed &&
                           !node.isAbandoning;
                },
                radiusType: 'droneInterception', // Radio de intercepción de drones (160px)
                color: 'rgba(255, 0, 0, 0.25)' // Rojo semi-transparente para áreas bloqueadas
            }
        ]
    },
    
    // 🆕 NUEVO: Sabotaje FOB - muestra áreas de torres de vigilancia enemigas que bloquean el sabotaje
    fobSabotage: {
        territoryType: null, // No mostrar territorio válido (solo áreas de exclusión)
        exclusionRules: [
            {
                // Torres de vigilancia enemigas bloquean sabotajes con su radio de detección (400px)
                filter: (node, game) => {
                    const myTeam = game?.myTeam || 'player1';
                    const isEnemyTower = (node.type === 'vigilanceTower' || node.isVigilanceTower) && 
                                         node.team !== myTeam &&
                                         node.active &&
                                         node.constructed &&
                                         !node.isAbandoning;
                    return isEnemyTower;
                },
                radiusType: 'detectionRadius', // Usar radio de detección de la torre (320px, reducido 20%)
                color: 'rgba(255, 0, 0, 0.25)' // Rojo semi-transparente para áreas bloqueadas
            }
        ]
    },
    
    // 🆕 NUEVO: Taller de drones - solo se puede construir en el área de detección de FOBs aliados
    droneWorkshop: {
        territoryType: 'ally', // Territorio aliado en verde
        exclusionRules: [
            {
                // Todos los nodos EXCEPTO FOBs aliados bloquean construcción con su área de construcción
                // Los FOBs aliados NO bloquean porque el taller DEBE construirse cerca de ellos
                filter: (node, game) => {
                    const myTeam = game?.myTeam || 'player1';
                    // Excluir FOBs aliados de las áreas de exclusión
                    const isAllyFob = node.type === 'fob' && node.team === myTeam;
                    return !isAllyFob; // Bloquear todos excepto FOBs aliados
                },
                radiusType: 'buildRadius', // Usar buildRadius o detectionRadius como fallback
                color: 'rgba(231, 76, 60, 0.2)' // Rojo semi-transparente
            }
        ],
        // 🆕 Función especial para mostrar áreas válidas de FOBs aliados
        showFobAreas: true // Indicador para el renderer de que debe mostrar áreas de FOBs
    }
};

/**
 * Obtiene la configuración visual de áreas para un tipo de edificio
 * @param {string} buildingType - Tipo de edificio ('fob', 'vigilanceTower', etc.)
 * @returns {Object} Configuración visual de áreas
 */
export function getBuildAreaVisual(buildingType) {
    return BUILD_AREA_VISUAL[buildingType] || BUILD_AREA_VISUAL.default;
}

/**
 * Obtiene el radio de exclusión para un nodo según el tipo especificado
 * @param {Object} node - Nodo del juego
 * @param {string} radiusType - 'buildRadius' | 'detectionRadius' | 'physical'
 * @param {Object} game - Instancia del juego (para acceder a serverBuildingConfig)
 * @returns {number} Radio en píxeles
 */
export function getExclusionRadius(node, radiusType, game = null) {
    const config = getNodeConfig(node.type);
    
    switch (radiusType) {
        case 'buildRadius':
            // Intentar obtener buildRadius del servidor primero
            const buildRadii = game?.serverBuildingConfig?.buildRadii || {};
            if (buildRadii[node.type]) {
                return buildRadii[node.type];
            }
            // Fallback a detectionRadius o cálculo por defecto
            return config?.detectionRadius || (config?.radius || 30) * 2.5;
            
        case 'detectionRadius':
            // Usar detectionRadius del nodo o de la configuración
            return node.detectionRadius || config?.detectionRadius || (config?.radius || 30) * 2.5;
            
        case 'droneInterception':
            // 🆕 Radio de intercepción de drones por torretas antidrones (160px según DroneSystemServer)
            return 160;
            
        case 'physical':
            // Solo el radio físico del nodo
            return config?.radius || node.radius || 30;
            
        default:
            return config?.radius || 30;
    }
}

