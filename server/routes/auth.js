import { Router } from 'express';
import { authManager } from '../managers/AuthManager.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validación básica
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'username y password son requeridos'
            });
        }

        // Validar que no sean solo espacios
        if (typeof username === 'string' && username.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'El nombre de usuario no puede estar vacío'
            });
        }

        if (typeof password === 'string' && password.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'La contraseña no puede estar vacía'
            });
        }

        console.log(`[REGISTER] Intento de registro para usuario: ${username.substring(0, 3)}***`);

        const user = await authManager.register(username, password);
        const session = await authManager.login(username, password);

        console.log(`[REGISTER] Usuario registrado exitosamente: ${user.id}`);

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username
            },
            token: session.token,
            refreshToken: session.refreshToken,
            expiresAt: session.expiresAt
        });
    } catch (error) {
        console.error('[REGISTER] Error en registro:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        
        const status = error.code === 'USERNAME_TAKEN' ? 409 : 400;
        res.status(status).json({
            success: false,
            error: error.message || 'Error al registrar usuario'
        });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'username y password son requeridos'
            });
        }

        const session = await authManager.login(username, password);

        res.json({
            success: true,
            user: session.user,
            token: session.token,
            refreshToken: session.refreshToken,
            expiresAt: session.expiresAt
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(401).json({
            success: false,
            error: error.message || 'Credenciales inválidas'
        });
    }
});

router.get('/me', requireAuth, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'refreshToken es requerido'
            });
        }

        const session = await authManager.refreshSession(refreshToken);

        res.json({
            success: true,
            token: session.token,
            refreshToken: session.refreshToken,
            expiresAt: session.expiresAt,
            user: session.user
        });
    } catch (error) {
        console.error('Error refrescando sesión:', error);
        res.status(401).json({
            success: false,
            error: error.message || 'No se pudo refrescar la sesión'
        });
    }
});

export default router;




