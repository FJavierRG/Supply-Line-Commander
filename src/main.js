// ===== PUNTO DE ENTRADA =====
import { Game } from './Game.js';
import { authService } from './services/AuthService.js';
import { AuthUIManager } from './systems/AuthUIManager.js';

async function ensureAuthenticated(authUI) {
    if (authService.isAuthenticated()) {
        const user = await authService.fetchCurrentUser();
        if (user) {
            return;
        }
    }
    await authUI.requireAuthentication();
    await authService.fetchCurrentUser();
}

window.addEventListener('load', async () => {
    try {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) {
            console.error('❌ No se encontró el canvas');
            return;
        }

        const authUI = new AuthUIManager();
        authUI.init();
        await ensureAuthenticated(authUI);

        const game = new Game(canvas);
        window.game = game;
        
        // Escuchar cambios de autenticación para actualizar el menú
        authService.on('auth:changed', ({ user }) => {
            if (game && game.updateMenuUserInfo) {
                game.updateMenuUserInfo();
            }
        });
    } catch (error) {
        console.error('❌ Error al inicializar el juego:', error);
    }
});
