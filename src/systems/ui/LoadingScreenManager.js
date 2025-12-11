// ===== GESTOR DE PANTALLA DE CARGA =====

import { i18n } from '../../services/I18nService.js';

export class LoadingScreenManager {
    constructor() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.barFill = document.getElementById('loading-bar-fill');
        this.percentage = document.getElementById('loading-percentage');
        this.loadingText = document.getElementById('loading-text');
        this.pressToContinue = document.getElementById('press-to-continue-screen');
        
        // ✅ NUEVO: Listener para cambios de idioma
        window.addEventListener('languageChanged', () => {
            this.updateTexts();
        });
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
            const percent = Math.round(progress);
            this.percentage.textContent = i18n.initialized 
                ? i18n.t('loading.percentage', { percent }) 
                : `${percent}%`;
        }
        
        // El texto se actualiza automáticamente según el progreso
        // NOTA: El texto también puede ser establecido manualmente desde Game.init()
        if (this.loadingText && !this._manualTextOverride && i18n.initialized) {
            this.loadingText.textContent = i18n.t('loading.loading_resources');
        }
        
        // Resetear override después de cada actualización
        this._manualTextOverride = false;
    }
    
    /**
     * 🆕 NUEVO: Establece un texto de carga manual (anula el texto automático temporalmente)
     * @param {string} text - Texto a mostrar
     */
    setLoadingText(text) {
        if (this.loadingText) {
            this.loadingText.textContent = text;
            this._manualTextOverride = true;
        }
    }
    
    /**
     * ✅ NUEVO: Actualiza todos los textos de la pantalla de carga
     */
    updateTexts() {
        if (!i18n.initialized) return;
        
        // Título de la pantalla de carga
        const loadingTitle = this.loadingScreen?.querySelector('.loading-title');
        if (loadingTitle) {
            loadingTitle.textContent = i18n.t('loading.title');
        }
        
        // Texto de "Cargando recursos..."
        if (this.loadingText && !this._manualTextOverride) {
            this.loadingText.textContent = i18n.t('loading.loading_resources');
        }
        
        // Texto de "Pulsa para continuar"
        const pressToContinueText = this.pressToContinue?.querySelector('.press-to-continue-text');
        if (pressToContinueText) {
            pressToContinueText.textContent = i18n.t('loading.press_to_continue');
        }
    }
}

