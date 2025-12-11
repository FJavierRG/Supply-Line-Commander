// ===== SISTEMA CENTRALIZADO DE INTERPOLACIÓN =====
// Interpolación suave para posiciones desde el servidor (autoritativo)
// 🔧 v2.0: Interpolación basada en velocidad del servidor para movimiento fluido

/**
 * Interpola una posición 2D hacia un objetivo del servidor
 * @param {Object} obj - Objeto con propiedades {x, y, serverX, serverY}
 * @param {number} dt - Delta time en segundos
 * @param {Object} options - Opciones de interpolación
 * @returns {boolean} - true si se movió, false si estaba cerca
 */
export function interpolatePosition(obj, dt, options = {}) {
    const {
        speed = 8.0,              // Velocidad de interpolación (lerp factor)
        snapThreshold = 0.1,      // Distancia para snap directo (default 0.1)
        logMovement = false       // Debug: logear movimientos
        // 🔧 ELIMINADO: threshold - causaba "zona muerta" donde no se interpolaba
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
    
    // 🔧 FIX: Siempre interpolar si hay diferencia (sin zona muerta)
    // Usar interpolación exponencial suave para movimiento fluido
    const lerpFactor = 1 - Math.exp(-speed * dt);
    
    obj.x += dx * lerpFactor;
    obj.y += dy * lerpFactor;
    
    if (logMovement) console.log(`🎯 Moving: ${distance.toFixed(2)} lerp: ${lerpFactor.toFixed(3)}`);
    return true;
}

/**
 * 🆕 Interpola una posición usando la velocidad real del servidor
 * Ideal para entidades que se mueven a velocidad constante (como nodos de frente)
 * @param {Object} obj - Objeto con propiedades {x, y, serverX, serverY, lastServerUpdate}
 * @param {number} dt - Delta time en segundos
 * @param {Object} options - Opciones de interpolación
 * @returns {boolean} - true si se movió
 */
export function interpolateWithVelocity(obj, dt, options = {}) {
    const {
        serverSpeed = 4.0,        // Velocidad del servidor en px/s (sincronizada con gameConfig)
        snapThreshold = 0.5,      // Distancia para snap directo
        catchUpSpeed = 12.0,      // Velocidad para "alcanzar" si está muy atrás
        catchUpThreshold = 10.0,  // Distancia a partir de la cual acelerar para alcanzar
        logMovement = false
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
        return false;
    }
    
    // Calcular dirección normalizada
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Determinar velocidad: usar catchUpSpeed si está muy atrás, sino serverSpeed
    let moveSpeed = serverSpeed;
    if (distance > catchUpThreshold) {
        // Interpolar entre serverSpeed y catchUpSpeed basado en cuánto atrás está
        const catchUpFactor = Math.min((distance - catchUpThreshold) / catchUpThreshold, 1.0);
        moveSpeed = serverSpeed + (catchUpSpeed - serverSpeed) * catchUpFactor;
    }
    
    // Calcular movimiento
    const moveDistance = moveSpeed * dt;
    
    // No pasarse del objetivo
    if (moveDistance >= distance) {
        obj.x = obj.serverX;
        obj.y = obj.serverY;
        if (logMovement) console.log(`📌 Reached target: ${distance.toFixed(2)}`);
        return true;
    }
    
    // Mover hacia el objetivo
    obj.x += dirX * moveDistance;
    obj.y += dirY * moveDistance;
    
    if (logMovement) {
        console.log(`🎯 Velocity move: dist=${distance.toFixed(2)} speed=${moveSpeed.toFixed(1)} moved=${moveDistance.toFixed(2)}`);
    }
    
    return true;
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
    
    // Crear objeto temporal para interpolateValue
    const tempObj = { current: currentProgress, target: targetProgress };
    const moved = interpolateValue(
        tempObj,
        dt,
        { 
            ...options, 
            threshold: options.threshold || 0.001 
        }
    );
    
    // Actualizar el progress del objeto original con el valor interpolado
    obj.progress = tempObj.current;
    
    return moved;
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


