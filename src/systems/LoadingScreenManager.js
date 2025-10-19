// ===== GESTOR DE PANTALLA DE CARGA =====

export class LoadingScreenManager {
    constructor() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.barFill = document.getElementById('loading-bar-fill');
        this.percentage = document.getElementById('loading-percentage');
        this.loadingText = document.getElementById('loading-text');
        this.pressToContinue = document.getElementById('press-to-continue-screen');
    }
    
    /**
     * Muestra la pantalla de carga
     */
    show() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.remove('hidden');
        }
    }
    
    /**
     * Oculta la pantalla de carga y muestra "Press to Continue"
     */
    hide() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.add('hidden');
        }
    }
    
    /**
     * Muestra la pantalla "Press to Continue"
     * @param {Function} onContinue - Callback al hacer clic
     */
    showPressToContinue(onContinue) {
        if (this.pressToContinue) {
            this.pressToContinue.classList.remove('hidden');
            
            // Listener para cualquier clic o tecla
            const continueHandler = () => {
                this.pressToContinue.classList.add('hidden');
                if (onContinue) onContinue();
                
                // Limpiar listeners
                this.pressToContinue.removeEventListener('click', continueHandler);
                document.removeEventListener('keydown', continueHandler);
            };
            
            this.pressToContinue.addEventListener('click', continueHandler);
            document.addEventListener('keydown', continueHandler);
        }
    }
    
    /**
     * Actualiza el progreso de carga
     * @param {number} progress - Progreso de 0 a 100
     */
    updateProgress(progress) {
        if (this.barFill) {
            this.barFill.style.width = `${progress}%`;
        }
        
        if (this.percentage) {
            this.percentage.textContent = `${progress}%`;
        }
        
        if (this.loadingText) {
            if (progress < 30) {
                this.loadingText.textContent = 'Cargando sprites...';
            } else if (progress < 60) {
                this.loadingText.textContent = 'Cargando vehículos...';
            } else if (progress < 90) {
                this.loadingText.textContent = 'Cargando mapas...';
            } else {
                this.loadingText.textContent = 'Preparando el campo de batalla...';
            }
        }
    }
}

