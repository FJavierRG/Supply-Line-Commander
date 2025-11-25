// ===== MIDDLEWARE DE SEGURIDAD =====
// Evita que las variables de entorno se expongan accidentalmente

/**
 * Verifica que no se estén enviando variables de entorno al cliente
 */
export function preventEnvLeaks(req, res, next) {
    // Sobrescribir res.json para filtrar env vars
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
        // Si accidentalmente alguien intenta enviar process.env, bloquearlo
        if (data && typeof data === 'object') {
            if (data.env || data.SUPABASE_URL || data.SUPABASE_ANON_KEY) {
                console.error('❌ [SECURITY] Intento de exponer variables de entorno bloqueado');
                return originalJson({
                    error: 'Internal server error'
                });
            }
        }
        
        return originalJson(data);
    };
    
    next();
}

/**
 * Headers de seguridad adicionales
 */
export function securityHeaders(req, res, next) {
    // Prevenir que el navegador adivine el tipo de contenido
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Protección contra clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Protección XSS
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // No revelar información del servidor
    res.removeHeader('X-Powered-By');
    
    next();
}

/**
 * Limitar información en errores de producción
 */
export function safeErrorHandler(err, req, res, next) {
    console.error('❌ Error:', err);
    
    // En producción, NO revelar detalles del error
    if (process.env.NODE_ENV === 'production') {
        res.status(500).json({
            error: 'Internal server error'
        });
    } else {
        // En desarrollo, mostrar el error completo (para debugging)
        res.status(500).json({
            error: err.message,
            stack: err.stack
        });
    }
}

