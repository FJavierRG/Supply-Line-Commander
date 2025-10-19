// ===== SISTEMA DE TUTORIAL ORQUESTADO =====

export class TutorialSystem {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.currentStep = null;
        this.steps = [];
        this.currentStepIndex = 0;
        
        // Elementos del overlay
        this.overlay = null;
        this.spotlight = null;
        this.speechBubble = null;
        this.nextButton = null;
        
        // Configuración
        this.spotlightRadius = 100;
        this.blurAmount = 8;
        
        this.createOverlayElements();
    }
    
    /**
     * Crea los elementos HTML del overlay de tutorial
     */
    createOverlayElements() {
        // Crear overlay principal
        this.overlay = document.createElement('div');
        this.overlay.id = 'tutorial-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 9999;
            pointer-events: none;
            display: none;
            background: transparent;
        `;
        
        // Canvas para spotlight y blur
        this.spotlight = document.createElement('canvas');
        this.spotlight.id = 'tutorial-spotlight';
        this.spotlight.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        `;
        
        // Bocadillo de texto usando UI frame desplegable (vacío)
        this.speechBubble = document.createElement('div');
        this.speechBubble.id = 'tutorial-speech-bubble';
        this.speechBubble.style.cssText = `
            position: absolute;
            background: transparent;
            color: white;
            padding: 30px 30px 70px 30px;
            max-width: 500px;
            min-height: 180px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 15px;
            line-height: 1.5;
            z-index: 10001;
            display: none;
            background-image: url('assets/sprites/ui/UIFrames/store_desplegable.png');
            background-size: 100% 100%;
            background-repeat: no-repeat;
            background-position: center;
            pointer-events: auto;
        `;
        
        // Botón siguiente usando UI frame
        this.nextButton = document.createElement('button');
        this.nextButton.id = 'tutorial-next-button';
        this.nextButton.innerHTML = 'Siguiente →';
        this.nextButton.style.cssText = `
            position: absolute;
            bottom: 15px;
            right: 15px;
            background: transparent;
            color: white;
            border: none;
            padding: 15px 25px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
            z-index: 10002;
            display: none;
            background-image: url('assets/sprites/ui/UIFrames/bton_background.png');
            background-size: 100% 100%;
            background-repeat: no-repeat;
            background-position: center;
        `;
        
        // Hover effect para el botón
        this.nextButton.addEventListener('mouseenter', () => {
            this.nextButton.style.transform = 'scale(1.05)';
        });
        this.nextButton.addEventListener('mouseleave', () => {
            this.nextButton.style.transform = 'scale(1)';
        });
        
        // Event listener para el botón
        this.nextButton.addEventListener('click', () => {
            this.nextStep();
        });
        
        // Botón cancelar usando UI frame
        this.cancelButton = document.createElement('button');
        this.cancelButton.id = 'tutorial-cancel-button';
        this.cancelButton.innerHTML = '✕ Cancelar';
        this.cancelButton.style.cssText = `
            position: absolute;
            bottom: 15px;
            left: 15px;
            background: transparent;
            color: white;
            border: none;
            padding: 15px 25px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
            z-index: 10002;
            display: none;
            background-image: url('assets/sprites/ui/UIFrames/bton_background.png');
            background-size: 100% 100%;
            background-repeat: no-repeat;
            background-position: center;
            pointer-events: auto;
        `;
        
        // Hover effect para el botón cancelar
        this.cancelButton.addEventListener('mouseenter', () => {
            this.cancelButton.style.transform = 'scale(1.05)';
        });
        this.cancelButton.addEventListener('mouseleave', () => {
            this.cancelButton.style.transform = 'scale(1)';
        });
        
        // Event listener para cancelar
        this.cancelButton.addEventListener('click', () => {
            this.cancelTutorial();
        });
        
        // Ensamblar elementos
        this.overlay.appendChild(this.spotlight);
        this.speechBubble.appendChild(this.nextButton); // Botón dentro del bocadillo
        this.overlay.appendChild(this.speechBubble);
        this.overlay.appendChild(this.cancelButton);
        
        // Añadir al DOM
        document.body.appendChild(this.overlay);
        
        // Event listeners de teclado
        this.keyboardHandler = (e) => {
            if (!this.active) return;
            
            // Prevenir que otros sistemas manejen estas teclas durante el tutorial
            e.stopPropagation();
            
            switch(e.key) {
                case 'Escape':
                    e.preventDefault();
                    this.cancelTutorial();
                    break;
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
     * Inicia el tutorial con una lista de pasos
     * @param {Array} steps - Array de pasos del tutorial
     */
    startTutorial(steps) {
        if (this.active) return;
        
        this.steps = steps;
        this.currentStepIndex = 0;
        this.active = true;
        
        // NO pausar el juego en absoluto para que se renderice el mapa
        // this.game.isPaused = true; // COMENTADO TEMPORALMENTE
        
        // Mostrar overlay
        this.overlay.style.display = 'block';
        
        // Iniciar primer paso
        this.showStep(0);
        
        console.log('📚 Tutorial iniciado con', steps.length, 'pasos');
    }
    
    /**
     * Muestra un paso específico del tutorial
     * @param {number} stepIndex - Índice del paso
     */
    showStep(stepIndex) {
        if (stepIndex >= this.steps.length) {
            this.endTutorial();
            return;
        }
        
        this.currentStepIndex = stepIndex;
        this.currentStep = this.steps[stepIndex];
        
        // Actualizar bocadillo
        this.speechBubble.innerHTML = this.currentStep.text;
        
        // Re-agregar el botón después de actualizar el innerHTML
        this.speechBubble.appendChild(this.nextButton);
        
        // Posicionar spotlight y bocadillo
        this.updateSpotlight();
        this.positionSpeechBubble();
        
        // Mostrar elementos
        this.speechBubble.style.display = 'block';
        this.nextButton.style.display = 'block';
        this.cancelButton.style.display = 'block';
        
        // Si no hay target, mostrar el overlay solo para los elementos del tutorial
        if (!this.currentStep.target) {
            this.overlay.style.display = 'block';
        }
        
        // Callback cuando cambia de paso
        if (this.onStepChange) {
            this.onStepChange(this.currentStep);
        }
        
        console.log(`Tutorial paso ${stepIndex + 1}/${this.steps.length}: ${this.currentStep.title}`);
    }
    
    /**
     * Actualiza la posición y forma del spotlight
     */
    updateSpotlight() {
        if (!this.currentStep || !this.currentStep.target || this.currentStep.spotlightRadius === 0) {
            // Si no hay target o spotlight radius es 0, ocultar el spotlight
            this.spotlight.style.display = 'none';
            return;
        }
        
        // Mostrar el spotlight cuando hay un target
        this.spotlight.style.display = 'block';
        
        const canvas = this.spotlight;
        const ctx = canvas.getContext('2d');
        
        // Configurar tamaño del canvas
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Aplicar blur a todo el fondo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Crear spotlight (área sin blur)
        const target = this.currentStep.target;
        const centerX = target.x;
        const centerY = target.y;
        const radius = this.currentStep.spotlightRadius || this.spotlightRadius;
        
        // Usar composite operation para "cortar" el spotlight
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        
        // Añadir borde brillante al spotlight
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    /**
     * Posiciona el bocadillo en el centro superior de la pantalla
     */
    positionSpeechBubble() {
        const bubble = this.speechBubble;
        const bubbleWidth = 500;
        const margin = 30;
        
        // Centro superior
        const x = (window.innerWidth - bubbleWidth) / 2;
        const y = margin;
        
        bubble.style.left = x + 'px';
        bubble.style.top = y + 'px';
        bubble.style.width = bubbleWidth + 'px';
    }
    
    /**
     * Avanza al siguiente paso
     */
    nextStep() {
        this.currentStepIndex++;
        this.showStep(this.currentStepIndex);
    }
    
    /**
     * Termina el tutorial
     */
    endTutorial() {
        this.active = false;
        this.currentStep = null;
        
        // Reanudar el juego (si estaba pausado)
        // this.game.isPaused = false; // COMENTADO TEMPORALMENTE
        this.game.paused = false;
        
        // Ocultar overlay
        this.overlay.style.display = 'none';
        this.speechBubble.style.display = 'none';
        this.nextButton.style.display = 'none';
        this.cancelButton.style.display = 'none';
        
        console.log('📚 Tutorial completado');
        
        // Callback opcional
        if (this.onComplete) {
            this.onComplete();
        }
    }
    
    /**
     * Cancela el tutorial
     */
    cancelTutorial() {
        this.endTutorial();
        console.log('📚 Tutorial cancelado');
    }
    
    /**
     * Verifica si el tutorial está activo
     */
    isActive() {
        return this.active;
    }
    
    /**
     * Limpia los elementos del DOM
     */
    destroy() {
        // Remover event listener de teclado
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
        }
        
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
    }
}
