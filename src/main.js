// ===== PUNTO DE ENTRADA =====
import { Game } from './Game.js';

// Iniciar juego cuando cargue la página
window.addEventListener('load', () => {
    try {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) {
            console.error('❌ No se encontró el canvas');
            return;
        }
        const game = new Game(canvas);
        
        // Hacer el juego accesible globalmente para debugging
        window.game = game;
    } catch (error) {
        console.error('❌ Error al inicializar el juego:', error);
    }
});
