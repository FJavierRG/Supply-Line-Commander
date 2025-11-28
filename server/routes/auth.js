import { Router } from 'express';
import { authManager } from '../managers/AuthManager.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'username y password son requeridos'
            });
        }

        const user = await authManager.register(username, password);
        const session = await authManager.login(username, password);

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
        console.error('Error en registro:', error);
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




