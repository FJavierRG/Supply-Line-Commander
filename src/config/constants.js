// ===== CONFIGURACIÓN Y CONSTANTES =====

export const GAME_CONFIG = {
    CANVAS_BG_COLOR: '#0a0e27',
    // TAMAÑO BASE DEL JUEGO (nunca cambia, independiente del zoom/ventana)
    BASE_WIDTH: 1920,
    BASE_HEIGHT: 1080,
    // POSICIÓN FIJA DEL HQ ALIADO (porcentajes)
    HQ_X_PERCENT: 0.06,
    HQ_Y_PERCENT: 0.5,
};

export const VEHICLE_TYPES = {
    heavy_truck: {
        name: 'Camión Pesado',
        // capacity y speed: Definidos por el servidor (autoridad - ANTI-HACK)
        color: '#4ecca3'
    },
    truck: {
        name: 'Camión',
        // capacity y speed: Definidos por el servidor (autoridad - ANTI-HACK)
        color: '#4ecca3'
    },
    helicopter: {
        name: 'Helicóptero de Emergencia',
        // capacity y speed: Definidos por el servidor (autoridad - ANTI-HACK)
        color: '#f39c12'  // Amarillo/naranja
    },
    ambulance: {
        name: 'Ambulancia',
        // capacity y speed: Definidos por el servidor (autoridad - ANTI-HACK)
        color: '#ff3333'  // Rojo brillante
    }
};

// BASE_CONFIG movido a src/config/nodes.js
// Mantenemos solo las constantes de colisión que aún se usan en FrontMovementSystem
export const BASE_CONFIG = {
    front: {
        radius: 35  // Radio del frente (usado para cálculos de colisión)
    }
};

