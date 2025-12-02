// ===== GESTOR DE UI =====
//import { getAllUpgrades, getUpgradeStatus } from '../../config/upgrades.js'; LEGACY, probando si al desactivar el juego sigue funcionando

export class UIManager {
    constructor(game) {
        this.game = game;
        // NUEVO: Referencia a OverlayManager si existe
        this.overlayManager = game.overlayManager;
        
        // Esperar un momento para asegurar que el DOM esté listo
        setTimeout(() => this.setupEventListeners(), 0);
    }
    
    setupEventListeners() {
        // Añadir hover a todos los botones del menú principal
        this.setupMenuButtonHovers();
    }
    
    setupMenuButtonHovers() {
        // Selectores de botones del menú principal y menú de pausa
        const menuButtons = document.querySelectorAll('.menu-btn, .back-btn, .action-btn');
        
        menuButtons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                if (this.game && this.game.audio) {
                    this.game.audio.playMenuHover();
                }
            });
        });
    }
    
    /**
     * Actualiza el indicador de loop/guerra
     */
    updateLoopIndicator(warNumber) {
        const loopIndicator = document.getElementById('loop-indicator');
        const loopCount = document.getElementById('loop-count');
        
        if (loopIndicator && loopCount) {
            loopIndicator.style.display = 'block';
            loopCount.textContent = `Guerra ${warNumber}`;
        }
    }
    
    /**
     * Muestra el menú principal
     */
    showMainMenu() {
        // 🆕 FIX: Usar ScreenManager para mostrar el menú (esto pausará el canvas automáticamente)
        if (this.game.screenManager) {
            this.game.screenManager.show('MAIN_MENU');
        }
        
        // Mantener compatibilidad
        this.overlayManager.showOverlay('main-menu-overlay');
        document.body.classList.add('menu-open');
        
        // Reproducir música del menú
        if (this.game && this.game.audio) {
            this.game.audio.playMainTheme();
        }
    }
    
    /**
     * Oculta el menú principal
     */
    hideMainMenu() {
        this.overlayManager.hideOverlay('main-menu-overlay');
        document.body.classList.remove('menu-open');
        
        // Detener música del menú
        if (this.game && this.game.audio) {
            this.game.audio.stopMainTheme();
        }
    }
    
    
    updateHUD(gameState) {
        // 🆕 ELIMINADO: Los elementos timer-display y fob-currency-display fueron eliminados del HTML
        // El HUD ahora se renderiza completamente desde el canvas
    }
    
    showMissionBriefing(missionMetadata, onStart) {
        const overlay = document.getElementById('mission-overlay');
        const missionNum = document.getElementById('overlay-mission-number');
        const description = document.getElementById('mission-description');
        const objectives = document.getElementById('mission-objectives');
        
        if (!overlay || !missionNum || !description || !objectives) {
            console.error('❌ No se encontraron elementos del briefing');
            return;
        }
        
        missionNum.textContent = missionMetadata.number;
        description.textContent = missionMetadata.description;
        objectives.innerHTML = missionMetadata.objectives;
        
        this.overlayManager.showOverlay('mission-overlay');
        
        // Configurar botón - REEMPLAZAR el botón para eliminar listeners previos
        const startBtn = document.getElementById('start-mission-btn');
        if (startBtn) {
            const newBtn = startBtn.cloneNode(true);
            startBtn.replaceWith(newBtn);
            newBtn.onclick = () => {
                this.overlayManager.hideOverlay('mission-overlay');
                onStart();
            };
        }
    }
    
    showMissionComplete(success, onNext, onRetry) {
        const overlay = document.getElementById('mission-complete-overlay');
        const resultTitle = document.getElementById('result-title');
        const resultIcon = overlay.querySelector('.result-icon');
        
        if (success) {
            resultTitle.textContent = 'Misión Completada';
            resultTitle.classList.remove('failure');
            if (resultIcon) {
                resultIcon.textContent = '✓';
                resultIcon.classList.remove('failure');
            }
        } else {
            resultTitle.textContent = 'Misión Fallida';
            resultTitle.classList.add('failure');
            if (resultIcon) {
                resultIcon.textContent = '✕';
                resultIcon.classList.add('failure');
            }
        }
        
        this.overlayManager.showOverlay('mission-complete-overlay');
        
        // Configurar botones
        const nextBtn = document.getElementById('next-mission-btn');
        const retryBtn = document.getElementById('retry-mission-btn');
        
        if (nextBtn) {
            nextBtn.onclick = () => {
                this.overlayManager.hideOverlay('mission-complete-overlay');
                onNext();
            };
        }
        
        if (retryBtn) {
            retryBtn.onclick = () => {
                this.overlayManager.hideOverlay('mission-complete-overlay');
                onRetry();
            };
        }
    }
    
    showPauseMenu(onContinue, onExit) {
        // 🆕 NUEVO: Usar ScreenManager para mostrar pausa
        if (this.game.screenManager) {
            this.game.screenManager.show('PAUSE');
        }
        
        // Mantener compatibilidad
        this.overlayManager.showOverlay('pause-overlay');
        
        const continueBtn = document.getElementById('pause-continue-btn');
        const exitBtn = document.getElementById('pause-exit-btn');
        
        if (continueBtn) continueBtn.onclick = () => { 
            this.hidePauseMenu();
            if (onContinue) onContinue(); 
        };
        if (exitBtn) exitBtn.onclick = () => { 
            this.hidePauseMenu();
            onExit(); 
        };
    }

    hidePauseMenu() {
        // 🆕 NUEVO: Usar ScreenManager para ocultar pausa
        if (this.game.screenManager) {
            this.game.screenManager.hide('PAUSE');
        }
        
        // Mantener compatibilidad
        this.overlayManager.hideOverlay('pause-overlay');
    }
    
    showUpgradeScreen(totalScore, upgradeLevels, onClose, onPurchase) {
        this.overlayManager.hideOverlay('mission-complete-overlay');
        this.overlayManager.showOverlay('upgrades-overlay');
        
        this.updateUpgradeButtons(totalScore, upgradeLevels);
        
        document.getElementById('close-upgrade-btn').onclick = onClose;
        
        // Configurar botones de compra
        document.querySelectorAll('.upgrade-purchase-btn').forEach(btn => {
            btn.onclick = (e) => {
                const card = e.target.closest('.upgrade-card');
                const upgradeType = card.dataset.upgrade;
                onPurchase(upgradeType);
            };
        });
    }
    
    updateUpgradeButtons(totalScore, upgradeLevels) {
        const costs = {
            speed: 500 * upgradeLevels.speed,
            capacity: 600 * upgradeLevels.capacity,
            armor: 800 * upgradeLevels.armor
        };
        
        document.querySelectorAll('.upgrade-card').forEach(card => {
            const type = card.dataset.upgrade;
            const cost = costs[type];
            const btn = card.querySelector('.upgrade-purchase-btn');
            const costValue = card.querySelector('.cost-value');
            
            costValue.textContent = cost;
            
            if (totalScore >= cost) {
                btn.disabled = false;
                btn.textContent = 'MEJORAR';
            } else {
                btn.disabled = true;
                btn.textContent = 'INSUFICIENTE';
            }
        });
    }
    
    hideUpgradeScreen() {
        this.overlayManager.hideOverlay('upgrades-overlay');
    }
    
    // === Helpers de Elementos DOM ===
    
    /**
     * Oculta un elemento del DOM
     * @param {string} id - ID del elemento
     */
    hideElement(id) {
        const el = document.getElementById(id);
        if (el) {
            // Si es un overlay, usar OverlayManager
            if (el.classList.contains('overlay')) {
                this.overlayManager.hideOverlay(id);
            } else {
                // Para elementos no-overlay, usar display normalmente
                el.style.display = 'none';
            }
        }
    }
    
    /**
     * Muestra un elemento del DOM
     * @param {string} id - ID del elemento
     */
    showElement(id) {
        const el = document.getElementById(id);
        if (el) {
            // Si es un overlay, usar OverlayManager
            if (el.classList.contains('overlay')) {
                this.overlayManager.showOverlay(id);
            } else {
                // Para elementos específicos que necesitan display: flex
                if (id === 'timer-display' || id === 'fob-currency-display') {
                    el.style.display = 'flex';
                } else {
                    // Para otros elementos, usar display: block
                    el.style.display = 'block';
                }
            }
        }
    }
    
    /**
     * Muestra u oculta un elemento del DOM
     * @param {string} id - ID del elemento
     * @param {boolean} show - true para mostrar, false para ocultar
     */
    toggleElement(id, show) {
        const el = document.getElementById(id);
        if (el) el.style.display = show ? 'block' : 'none';
    }
    
    /**
     * Configura la UI al inicio de una misión
     * @param {Array} bases - Array de bases para verificar enemigos
     */
    setupMissionUI(bases) {
        // Sistema de construcción SIEMPRE disponible
        this.showElement('build-store');
        
        // Botón de desarrollo desactivado para producción
        // const hasEnemyFronts = bases.some(b => b.type === 'front' && b.team === 'player2');
        // this.toggleElement('dev-supply-enemy-btn', hasEnemyFronts);
        
        // Ocultar elementos no necesarios
        this.hideElement('start-timer-btn');
        this.hideElement('pause-btn');
    }
}
