import { authManager } from '../managers/AuthManager.js';

function extractToken(req) {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }
    return null;
}

export async function requireAuth(req, res, next) {
    try {
        const token = extractToken(req);
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Autenticación requerida'
            });
        }

        const user = await authManager.getUserFromToken(token);
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        // Usar console.warn para errores de autenticación esperados (tokens inválidos/expirados)
        // Solo usar console.error para errores inesperados del sistema
        if (error.code === 'INVALID_TOKEN' || error.code === 'TOKEN_EXPIRED') {
            console.warn(`Token inválido o expirado en ${req.method} ${req.path}`);
        } else {
            console.error('Error inesperado en requireAuth:', error);
        }
        res.status(401).json({
            success: false,
            error: 'Sesión inválida o expirada'
        });
    }
}

export async function optionalAuth(req, _res, next) {
    try {
        const token = extractToken(req);
        if (!token) {
            req.user = null;
            return next();
        }

        const user = await authManager.getUserFromToken(token);
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.warn('optionalAuth token inválido:', error.message);
        req.user = null;
        next();
    }
}

