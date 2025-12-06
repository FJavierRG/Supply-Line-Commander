// ===== CONFIGURACIÓN DE CURSORES =====

/**
 * Tipos de cursor disponibles en el juego
 */
export const CURSOR_TYPES = {
    // Cursores nativos del navegador
    DEFAULT: 'default',           // Cursor normal del sistema
    CROSSHAIR: 'crosshair',       // Cruz por defecto del juego
    POINTER: 'pointer',           // Mano (hover sobre botones)
    HELP: 'help',                 // Interrogación (tooltips)
    NOT_ALLOWED: 'not-allowed',   // Prohibido
    
    // Cursores custom (renderizados con sprites)
    SNIPER: 'sniper',             // Mira de francotirador
    ARTILLERY: 'artillery',       // Selector de artillería
    FOB_SABOTAGE: 'fob_sabotage', // Cursor de sabotaje especial
    
    // Estados especiales
    NONE: 'none'                  // Sin cursor (oculto)
};

/**
 * Configuración de cursores custom (sprites)
 * Estos cursores se renderizan como sprites en el canvas
 */
export const CUSTOM_CURSOR_CONFIG = {
    [CURSOR_TYPES.SNIPER]: {
        spriteKey: 'fob_sabotage_cursor',  // Sprite de mira (reutilizado)
        size: 64,                          // Tamaño en píxeles
        offset: { x: 0, y: 0 },           // Offset desde el centro del cursor
        hideNativeCursor: true,            // Ocultar cursor nativo del navegador
        alpha: 1.0,                        // Opacidad
        rotation: 0                        // Rotación en radianes
    },
    [CURSOR_TYPES.ARTILLERY]: {
        spriteKey: 'artillery_selector',
        size: 80,
        offset: { x: 0, y: 0 },
        hideNativeCursor: true,
        alpha: 1.0,
        rotation: 0
    },
    [CURSOR_TYPES.FOB_SABOTAGE]: {
        spriteKey: 'fob_sabotage_cursor',
        size: 64,
        offset: { x: 0, y: 0 },
        hideNativeCursor: true,
        alpha: 1.0,
        rotation: 0
    }
};

/**
 * Mapeo de modos de BuildingSystem a tipos de cursor
 * Facilita la integración automática
 */
export const MODE_TO_CURSOR = {
    buildMode: CURSOR_TYPES.CROSSHAIR,
    sniperMode: CURSOR_TYPES.SNIPER,
    artilleryMode: CURSOR_TYPES.ARTILLERY,
    fobSabotageMode: CURSOR_TYPES.FOB_SABOTAGE,
    droneMode: CURSOR_TYPES.CROSSHAIR,
    tankMode: CURSOR_TYPES.CROSSHAIR,
    lightVehicleMode: CURSOR_TYPES.CROSSHAIR,
    commandoMode: CURSOR_TYPES.CROSSHAIR,
    truckAssaultMode: CURSOR_TYPES.CROSSHAIR,
    cameraDroneMode: CURSOR_TYPES.CROSSHAIR
};

