// ===== SISTEMA CENTRALIZADO DE INTERPOLACIÓN =====
// Interpolación suave para posiciones desde el servidor (autoritativo)

/**
 * Interpola una posición 2D hacia un objetivo del servidor
 * @param {Object} obj - Objeto con propiedades {x, y, serverX, serverY}
 * @param {number} dt - Delta time en segundos
 * @param {Object} options - Opciones de interpolación
 * @returns {boolean} - true si se movió, false si estaba cerca
 */
export function interpolatePosition(obj, dt, options = {}) {
    const {
        speed = 8.0,              // Velocidad de interpolación (por defecto 8.0)
        threshold = 0.5,          // Distancia mínima para interpolar (default 0.5)
        snapThreshold = 0.1,      // Distancia para snap directo (default 0.1)
        logMovement = false      // Debug: logear movimientos
    } = options;
    
    // Verificar que hay posición objetivo del servidor
    if (obj.serverX === undefined || obj.serverY === undefined) {
        return false;
    }
    
    const dx = obj.serverX - obj.x;
    const dy = obj.serverY - obj.y;
    const distance = Math.hypot(dx, dy);
    
    // Si está muy cerca, snap directo
    if (distance < snapThreshold) {
        obj.x = obj.serverX;
        obj.y = obj.serverY;
        if (logMovement) console.log(`📌 Snap: ${distance.toFixed(2)}`);
        return false;
    }
    
    // Si hay diferencia significativa, interpolar
    if (distance > threshold) {
        const moveX = dx * speed * dt;
        const moveY = dy * speed * dt;
        
        obj.x += moveX;
        obj.y += moveY;
        
        if (logMovement) console.log(`🎯 Moving: ${distance.toFixed(2)} at speed ${speed}`);
        return true;
    }
    
    return false;
}

/**
 * Interpola un valor numérico hacia un objetivo con velocidad adaptativa
 * @param {Object} obj - Objeto con propiedades {current, target}
 * @param {number} dt - Delta time en segundos
 * @param {Object} options - Opciones de interpolación
 * @returns {boolean} - true si se movió, false si estaba cerca
 */
export function interpolateValue(obj, dt, options = {}) {
    const {
        speed = 8.0,              // Velocidad base de interpolación
        adaptiveSpeeds = {        // Velocidades adaptativas según diferencia
            large: 15.0,          // >0.1
            medium: 8.0,          // >0.05
            small: 5.0            // <=0.05
        },
        threshold = 0.001,        // Umbral mínimo para interpolar
        logMovement = false
    } = options;
    
    const current = obj.current;
    const target = obj.target;
    const diff = target - current;
    const absDiff = Math.abs(diff);
    
    // Si está muy cerca, snap directo
    if (absDiff < threshold) {
        obj.current = target;
        return false;
    }
    
    // Calcular velocidad adaptativa
    let lerpSpeed;
    if (absDiff > 0.1) {
        lerpSpeed = adaptiveSpeeds.large;
    } else if (absDiff > 0.05) {
        lerpSpeed = adaptiveSpeeds.medium;
    } else {
        lerpSpeed = adaptiveSpeeds.small;
    }
    
    // Aplicar interpolación con límite para evitar overshooting
    obj.current += diff * Math.min(lerpSpeed * dt, 1.0);
    
    if (logMovement) {
        console.log(`📈 Value: ${current.toFixed(3)} → ${obj.current.toFixed(3)} (target: ${target.toFixed(3)}) speed: ${lerpSpeed}`);
    }
    
    return true;
}

/**
 * Interpola progreso entre 0 y 1 (usado por convoyes y helicópteros)
 * @param {Object} obj - Objeto con propiedades {progress, targetProgress} o {progress, serverProgress}
 * @param {number} dt - Delta time en segundos
 * @param {Object} options - Opciones de interpolación
 * @returns {boolean} - true si se movió
 */
export function interpolateProgress(obj, dt, options = {}) {
    // Compatibilidad: usar serverProgress si targetProgress no existe
    const targetProgress = obj.targetProgress !== undefined ? obj.targetProgress : obj.serverProgress;
    const currentProgress = obj.progress || 0;
    
    if (targetProgress === undefined) {
        return false;
    }
    
    return interpolateValue(
        { current: currentProgress, target: targetProgress },
        dt,
        { 
            ...options, 
            threshold: options.threshold || 0.001 
        }
    );
}

/**
 * Interpola múltiples valores numéricos en paralelo
 * @param {Object} obj - Objeto con propiedades {[prop]: value, server[Prop]: target}
 * @param {number} dt - Delta time en segundos
 * @param {Array} properties - Array de nombres de propiedades a interpolar
 * @param {Object} options - Opciones de interpolación
 * @returns {boolean} - true si al menos uno se movió
 */
export function interpolateMultiple(obj, dt, properties, options = {}) {
    let moved = false;
    
    for (const prop of properties) {
        const serverProp = `server${prop.charAt(0).toUpperCase() + prop.slice(1)}`;
        
        if (obj[serverProp] !== undefined) {
            const result = interpolateValue(
                { current: obj[prop], target: obj[serverProp] },
                dt,
                options
            );
            
            obj[prop] = result ? obj[prop] : obj[serverProp];
            if (result) moved = true;
        }
    }
    
    return moved;
}

/**
 * Verifica si una posición está lo suficientemente cerca del servidor
 * @param {Object} obj - Objeto con propiedades {x, y, serverX, serverY}
 * @param {number} threshold - Distancia máxima para considerar "cerca"
 * @returns {boolean} - true si está cerca
 */
export function isSynced(obj, threshold = 0.5) {
    if (obj.serverX === undefined || obj.serverY === undefined) {
        return true;
    }
    
    const dx = obj.serverX - obj.x;
    const dy = obj.serverY - obj.y;
    const distance = Math.hypot(dx, dy);
    
    return distance < threshold;
}


