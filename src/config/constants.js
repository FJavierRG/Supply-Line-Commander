// ===== CONFIGURACIÓN Y CONSTANTES =====

export const GAME_CONFIG = {
    CANVAS_BG_COLOR: '#0a0e27',
    GRID_SIZE: 50,
    GRID_COLOR: 'rgba(78, 204, 163, 0.1)',
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
        capacity: 15,  // Cantidad de suministros por viaje
        speed: 1,      // 50% de velocidad original (HQ → FOB - Lento)
        color: '#4ecca3'
    },
    truck: {
        name: 'Camión',
        capacity: 15,  // Cantidad de suministros por viaje
        speed: 2,    // 125% de velocidad original (FOB → Frente - Rápido)
        color: '#4ecca3'
    },
    helicopter: {
        name: 'Helicóptero de Emergencia',
        capacity: 20,  // Helicóptero lleva más carga
        speed: 3,      // Más rápido que camión
        color: '#f39c12'  // Amarillo/naranja
    },
    ambulance: {
        name: 'Ambulancia',
        capacity: 0,   // No transporta suministros, solo misiones médicas
        speed: 2,    // Velocidad estándar
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

// VALID_ROUTES: Define qué tipos de nodos pueden enviar convoyes a qué otros tipos
// ⚠️ Ahora unificado: todos los equipos usan las mismas rutas lógicas
// La validación de team se hace en ConvoyManager (no puede enviar a nodos del equipo contrario)
export const VALID_ROUTES = {
    'hq': ['fob'],
    'fob': ['front', 'fob'],
    'front': []          // Los frentes solo reciben, nunca envían
};

export const FRONT_MOVEMENT_CONFIG = {
    advanceSpeed: 3,    // Velocidad de avance (px/s) cuando tiene recursos
    retreatSpeed: 3     // Velocidad de retroceso (px/s) cuando NO tiene recursos
};

export const FOB_CURRENCY_CONFIG = {
    pixelsPerCurrency: 2,           // Cada X pixels de avance del frente = 1 currency
    currencyName: 'Terreno Ganado', // Nombre de la currency
    passiveRate: 3                  // Currency ganada pasivamente por segundo
    // NOTA: Los costos de edificios están en src/config/nodes.js (sistema unificado)
};
