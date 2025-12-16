// ===== UTILIDADES DE SHAKE (VIBRACIÓN) =====
// Helper centralizado para efectos de shake en cualquier componente

/**
 * Calcula el offset de shake para un efecto de vibración
 * Usa una onda sinusoidal que se atenúa con el tiempo
 * 
 * @param {number} startTime - Timestamp de inicio del shake (Date.now())
 * @param {number} duration - Duración total del shake en ms (default: 400)
 * @param {number} intensity - Intensidad inicial en píxeles (default: 6)
 * @param {number} frequency - Frecuencia de vibración (default: 25)
 * @returns {{ x: number, y: number, done: boolean }} Offset y estado
 */
export function calculateShakeOffset(startTime, duration = 400, intensity = 6, frequency = 25) {
    const elapsed = Date.now() - startTime;
    
    if (elapsed >= duration) {
        return { x: 0, y: 0, done: true };
    }
    
    // Vibración sinusoidal que se atenúa con el tiempo
    const progress = elapsed / duration;
    const currentIntensity = intensity * (1 - progress); // Empieza en intensity, se reduce a 0
    
    return {
        x: Math.sin(elapsed * frequency / 100) * currentIntensity,
        y: 0,
        done: false
    };
}

/**
 * Crea un objeto de estado de shake reutilizable
 * @param {number} duration - Duración del shake en ms
 * @returns {Object} Estado de shake inicializado
 */
export function createShakeState(duration = 400) {
    return {
        active: false,
        startTime: 0,
        duration: duration
    };
}

/**
 * Activa un shake
 * @param {Object} shakeState - Estado de shake creado con createShakeState
 */
export function triggerShake(shakeState) {
    shakeState.active = true;
    shakeState.startTime = Date.now();
}

/**
 * Obtiene el offset actual de un shake y actualiza su estado
 * @param {Object} shakeState - Estado de shake
 * @param {number} intensity - Intensidad del shake (default: 6)
 * @param {number} frequency - Frecuencia del shake (default: 25)
 * @returns {{ x: number, y: number }} Offset actual
 */
export function getShakeOffset(shakeState, intensity = 6, frequency = 25) {
    if (!shakeState.active) {
        return { x: 0, y: 0 };
    }
    
    const result = calculateShakeOffset(
        shakeState.startTime, 
        shakeState.duration, 
        intensity, 
        frequency
    );
    
    if (result.done) {
        shakeState.active = false;
    }
    
    return { x: result.x, y: result.y };
}

