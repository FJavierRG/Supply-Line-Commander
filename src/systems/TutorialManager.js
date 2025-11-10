// ===== TUTORIAL MANAGER SIMPLE: PANTALLAZOS CON CAJAS DE TEXTO =====
import { TUTORIAL_STEPS } from './TutorialConfig.js';

/**
 * TutorialManager - Sistema simple de tutorial con pantallazos y cajas de texto
 * Solo muestra imágenes del juego con explicaciones, sin simulación
 */
export class TutorialManager {
    constructor(game) {
        this.game = game;
        
        // Estado del tutorial
        this.active = false;
        this.currentStepIndex = 0;
        this.steps = TUTORIAL_STEPS;
        
        // Elementos UI
        this.overlayElement = null;
        this.imageElement = null;
        this.textBoxElement = null;
        this.nextButton = null;
        this.prevButton = null;
        this.exitButton = null;
        
        this.createUIElements();
    }
    
    /**
     * Crea los elementos UI del tutorial
     */
    createUIElements() {
        // Overlay principal
        this.overlayElement = document.createElement('div');
        this.overlayElement.id = 'tutorial-overlay';
        this.overlayElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            z-index: 100; /* var(--z-modals) - Tutorial es un modal */
            display: none;
            pointer-events: auto;
        `;
        
        // Contenedor principal (centrado)
        const container = document.createElement('div');
        container.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 1400px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
        `;
        
        // Imagen del pantallazo
        this.imageElement = document.createElement('img');
        this.imageElement.id = 'tutorial-image';
        this.imageElement.style.cssText = `
            max-width: 100%;
            max-height: 60vh;
            object-fit: contain;
            border: 3px solid #ffcc00;
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(255, 204, 0, 0.5);
        `;
        
        // Caja de texto
        this.textBoxElement = document.createElement('div');
        this.textBoxElement.id = 'tutorial-textbox';
        this.textBoxElement.style.cssText = `
            width: 100%;
            max-width: 600px;
            padding: 30px;
            background-image: url('assets/sprites/ui/UIFrames/store_desplegable.png');
            background-size: 100% 100%;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 15px;
            line-height: 1.6;
            pointer-events: auto;
        `;
        
        // Contenedor de botones
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 15px;
            justify-content: center;
            width: 100%;
            max-width: 600px;
        `;
        
        // Botón Anterior
        this.prevButton = document.createElement('button');
        this.prevButton.id = 'tutorial-prev-btn';
        this.prevButton.innerHTML = '← Anterior';
        this.prevButton.style.cssText = `
            background-image: url('assets/sprites/ui/UIFrames/bton_background.png');
            background-size: 100% 100%;
            border: none;
            color: white;
            padding: 12px 25px;
            font-size: 14px;
            cursor: pointer;
            font-weight: bold;
            pointer-events: auto;
        `;
        this.prevButton.onclick = () => this.prevStep();
        
        // Botón Siguiente
        this.nextButton = document.createElement('button');
        this.nextButton.id = 'tutorial-next-btn';
        this.nextButton.innerHTML = 'Siguiente →';
        this.nextButton.style.cssText = `
            background-image: url('assets/sprites/ui/UIFrames/bton_background.png');
            background-size: 100% 100%;
            border: none;
            color: white;
            padding: 12px 25px;
            font-size: 14px;
            cursor: pointer;
            font-weight: bold;
            pointer-events: auto;
        `;
        this.nextButton.onclick = () => this.nextStep();
        
        // Botón Salir (fuera del contenedor, abajo a la derecha)
        this.exitButton = document.createElement('button');
        this.exitButton.id = 'tutorial-exit-btn';
        this.exitButton.innerHTML = '✕ Salir del Tutorial';
        this.exitButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-image: url('assets/sprites/ui/UIFrames/bton_background.png');
            background-size: 100% 100%;
            border: none;
            color: #ff6666;
            padding: 12px 25px;
            font-size: 14px;
            cursor: pointer;
            font-weight: bold;
            z-index: 101; /* Ligeramente por encima del overlay del tutorial */
            pointer-events: auto;
        `;
        this.exitButton.onclick = () => this.exitTutorial();
        
        // Ensamblar elementos
        buttonContainer.appendChild(this.prevButton);
        buttonContainer.appendChild(this.nextButton);
        container.appendChild(this.imageElement);
        container.appendChild(this.textBoxElement);
        container.appendChild(buttonContainer);
        this.overlayElement.appendChild(container);
        this.overlayElement.appendChild(this.exitButton);
        document.body.appendChild(this.overlayElement);
        
        // Event listeners de teclado
        this.keyboardHandler = (e) => {
            if (!this.active) return;
            
            e.stopPropagation();
            
            switch(e.key) {
                case 'Escape':
                    e.preventDefault();
                    this.exitTutorial();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.prevStep();
                    break;
                case 'ArrowRight':
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    this.nextStep();
                    break;
            }
        };
        
        document.addEventListener('keydown', this.keyboardHandler);
    }
    
    /**
     * Inicia el tutorial
     */
    startTutorial() {
        console.log('🎓 Iniciando tutorial simple...');
        
        // 🆕 FIX: Asegurarse de que el overlay exista y esté en el DOM
        if (!this.overlayElement || !this.overlayElement.parentNode) {
            console.warn('⚠️ Overlay del tutorial no existe, recreándolo...');
            this.createUIElements();
        }
        
        this.active = true;
        this.currentStepIndex = 0;
        
        // Mostrar overlay (z-index ya está definido en CSS inline)
        this.overlayElement.style.display = 'block';
        this.overlayElement.style.visibility = 'visible';
        this.overlayElement.style.opacity = '1';
        
        // Mostrar primer paso
        this.showStep(0);
    }
    
    /**
     * Muestra un paso del tutorial
     */
    showStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.steps.length) {
            return;
        }
        
        this.currentStepIndex = stepIndex;
        const step = this.steps[stepIndex];
        
        // Actualizar título y texto
        this.textBoxElement.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #ffcc00;">${step.title}</h3>
            ${step.text}
        `;
        
        // Actualizar imagen
        if (step.image) {
            this.imageElement.src = step.image;
            this.imageElement.style.display = 'block';
        } else {
            this.imageElement.style.display = 'none';
        }
        
        // Actualizar botones
        this.prevButton.style.display = stepIndex > 0 ? 'block' : 'none';
        this.nextButton.innerHTML = stepIndex === this.steps.length - 1 ? 'Finalizar' : 'Siguiente →';
        
        console.log(`📖 Tutorial paso ${stepIndex + 1}/${this.steps.length}: ${step.title}`);
    }
    
    /**
     * Avanza al siguiente paso
     */
    nextStep() {
        if (this.currentStepIndex < this.steps.length - 1) {
            this.showStep(this.currentStepIndex + 1);
        } else {
            this.endTutorial();
        }
    }
    
    /**
     * Retrocede al paso anterior
     */
    prevStep() {
        if (this.currentStepIndex > 0) {
            this.showStep(this.currentStepIndex - 1);
        }
    }
    
    /**
     * Finaliza el tutorial
     */
    endTutorial() {
        console.log('✅ Tutorial completado');
        this.exitTutorial();
    }
    
    /**
     * Sale del tutorial y vuelve al menú
     */
    exitTutorial() {
        console.log('🚪 Saliendo del tutorial...');
        
        this.active = false;
        this.overlayElement.style.display = 'none';
        
        // 🆕 FIX: Ocultar tutorial usando ScreenManager
        if (this.game.screenManager) {
            this.game.screenManager.hide('TUTORIAL');
        }
        
        // 🆕 FIX: Pausar renderizado ANTES de limpiar (canvas sigue visible pero limpio)
        if (this.game.canvasManager) {
            this.game.canvasManager.pause();
        }
        
        // 🆕 FIX: Limpiar cualquier estado residual del juego antes de volver al menú
        if (this.game.clearGameState) {
            this.game.clearGameState();
        }
        
        // 🆕 FIX: Cambiar estado a menú ANTES de mostrar el menú
        this.game.setGameState('menu');
        
        // 🆕 FIX: Mostrar menú usando ScreenManager
        if (this.game.screenManager) {
            this.game.screenManager.show('MAIN_MENU');
        }
        
        // Mantener compatibilidad
        this.game.ui.showMainMenu();
    }
    
    /**
     * Actualiza la lógica del tutorial (no hace nada, solo para compatibilidad)
     */
    update(dt) {
        // No hay simulación en el tutorial simple
    }
    
    /**
     * Renderiza el tutorial (no hace nada, solo para compatibilidad)
     */
    render() {
        // No hay renderizado en el tutorial simple, todo es HTML
    }
    
    /**
     * Verifica si el tutorial está activo
     */
    get isTutorialActive() {
        return this.active;
    }
    
    /**
     * Verifica si una acción está permitida (siempre false, no hay interacción)
     */
    isActionAllowed(action) {
        return false; // No hay interacción en el tutorial simple
    }
    
    /**
     * Notifica una acción (no hace nada, solo para compatibilidad)
     */
    notifyAction(actionType, data = {}) {
        // No hay acciones en el tutorial simple
    }
    
    /**
     * Obtiene el mapa del tutorial (retorna null, solo para compatibilidad)
     */
    getTutorialMap() {
        return null; // No hay mapa en el tutorial simple
    }
    
    /**
     * Limpia los elementos del DOM
     */
    destroy() {
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
        }
        
        if (this.overlayElement && this.overlayElement.parentNode) {
            this.overlayElement.parentNode.removeChild(this.overlayElement);
        }
    }
}




