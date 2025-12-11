// ===== PUNTO DE ENTRADA =====
import { Game } from './Game.js';
import { authService } from './services/AuthService.js';
import { AuthUIManager } from './systems/ui/AuthUIManager.js';

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

window.addEventListener('load', () => {
    const startGame = async () => {
        try {
            const canvas = document.getElementById('game-canvas');
            if (!canvas) {
                console.error('❌ No se encontró el canvas');
                return;
            }

            const authUI = new AuthUIManager();
            await authUI.init(); // ✅ IMPORTANTE: await para que i18n se inicialice primero
            window.authUI = authUI;

            let game = null;
            authService.on('auth:changed', ({ user }) => {
                if (user) {
                    authUI.hide();
                } else {
                    authUI.show();
                    if (game && typeof game.handleUnauthenticatedState === 'function') {
                        game.handleUnauthenticatedState();
                    }
                }
                if (game && typeof game.updateMenuUserInfo === 'function') {
                    game.updateMenuUserInfo();
                }
            });

            await ensureAuthenticated(authUI);

            game = new Game(canvas);
            window.game = game;
        } catch (error) {
            console.error('❌ Error al inicializar el juego:', error);
        }
    };

    // Iniciar inmediatamente y reintentar al recuperar visibilidad (Alt+F5 sin recargar)
    startGame();
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !window.game) {
            startGame();
        }
    });
});
