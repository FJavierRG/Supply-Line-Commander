// ===== GESTOR DE UI =====
//import { getAllUpgrades, getUpgradeStatus } from '../config/upgrades.js'; LEGACY, probando si al desactivar el juego sigue funcionando

export class UIManager {
    constructor(game) {
        this.game = game;
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
        const mainMenu = document.getElementById('main-menu-overlay');
        if (mainMenu) {
            document.body.classList.add('menu-open');
            mainMenu.classList.remove('hidden');
            
            // Reproducir música del menú
            if (this.game && this.game.audio) {
                this.game.audio.playMainTheme();
            }
        }
    }
    
    /**
     * Oculta el menú principal
     */
    hideMainMenu() {
        const mainMenu = document.getElementById('main-menu-overlay');
        if (mainMenu) {
            mainMenu.classList.add('hidden');
            
            // Detener música del menú
            if (this.game && this.game.audio) {
                this.game.audio.stopMainTheme();
            }
        }
        document.body.classList.remove('menu-open');
    }
    
    
    updateHUD(gameState) {
        // Actualizar cuenta atrás (invertida: 1, 2, 3)
        const timerElement = document.getElementById('timer');
        if (timerElement && gameState.countdown !== undefined) {
            if (gameState.countdown > 0) {
                // Invertir: si countdown es 3 mostrar 1, si es 2 mostrar 2, si es 1 mostrar 3
                const invertedCount = 4 - Math.ceil(gameState.countdown);
                timerElement.textContent = invertedCount;
            } else {
                timerElement.textContent = '';
            }
        }
        
        // Actualizar currency de FOB
        const currencyAmountElement = document.getElementById('fob-currency-amount');
        if (currencyAmountElement && gameState.fobCurrency !== undefined) {
            const currentCurrency = Math.floor(gameState.fobCurrency);
            const incomeRate = gameState.currencyRate || 0;
            currencyAmountElement.textContent = `${currentCurrency} (+${incomeRate}/s)`;
        }
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
        
        overlay.classList.remove('hidden');
        
        // Configurar botón - REEMPLAZAR el botón para eliminar listeners previos
        const startBtn = document.getElementById('start-mission-btn');
        if (startBtn) {
            const newBtn = startBtn.cloneNode(true);
            startBtn.replaceWith(newBtn);
            newBtn.onclick = () => {
                overlay.classList.add('hidden');
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
        
        overlay.classList.remove('hidden');
        
        // Configurar botones
        const nextBtn = document.getElementById('next-mission-btn');
        const retryBtn = document.getElementById('retry-mission-btn');
        
        if (nextBtn) {
            nextBtn.onclick = () => {
                overlay.classList.add('hidden');
                onNext();
            };
        }
        
        if (retryBtn) {
            retryBtn.onclick = () => {
                overlay.classList.add('hidden');
                onRetry();
            };
        }
    }
    
    showPauseMenu(onContinue, onRestart, onExit) {
        const overlay = document.getElementById('pause-overlay');
        if (!overlay) return;
        overlay.classList.remove('hidden');
        const continueBtn = document.getElementById('pause-continue-btn');
        const restartBtn = document.getElementById('pause-restart-btn');
        const exitBtn = document.getElementById('pause-exit-btn');
        if (continueBtn) continueBtn.onclick = () => { overlay.classList.add('hidden'); if (onContinue) onContinue(); };
        if (restartBtn) restartBtn.onclick = () => { overlay.classList.add('hidden'); onRestart(); };
        if (exitBtn) exitBtn.onclick = () => { overlay.classList.add('hidden'); onExit(); };
    }

    hidePauseMenu() {
        const overlay = document.getElementById('pause-overlay');
        if (overlay) overlay.classList.add('hidden');
    }
    
    showUpgradeScreen(totalScore, upgradeLevels, onClose, onPurchase) {
        document.getElementById('mission-complete-overlay').classList.add('hidden');
        document.getElementById('upgrade-overlay').classList.remove('hidden');
        
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
        document.getElementById('upgrade-overlay').classList.add('hidden');
    }
    
    // === Helpers de Elementos DOM ===
    
    /**
     * Oculta un elemento del DOM
     * @param {string} id - ID del elemento
     */
    hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }
    
    /**
     * Muestra un elemento del DOM
     * @param {string} id - ID del elemento
     */
    showElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'block';
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
        this.showElement('fob-currency-display');
        
        // Botón de desarrollo desactivado para producción
        // const hasEnemyFronts = bases.some(b => b.type === 'front' && b.team === 'player2');
        // this.toggleElement('dev-supply-enemy-btn', hasEnemyFronts);
        
        // Mostrar timer-display para la cuenta atrás
        this.showElement('timer-display');
        
        // Ocultar elementos no necesarios
        this.hideElement('start-timer-btn');
        this.hideElement('pause-btn');
    }
}
