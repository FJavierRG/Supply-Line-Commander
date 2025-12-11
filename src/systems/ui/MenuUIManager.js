// ===== GESTOR DE UI DEL MENÚ PRINCIPAL Y PANTALLAS =====
// Maneja la actualización de textos del menú, lobby, victoria/derrota, etc.

import { i18n } from '../../services/I18nService.js';

export class MenuUIManager {
    constructor() {
        this.initialized = false;
    }

    /**
     * Inicializa el gestor de UI del menú
     */
    init() {
        // Listener para cambios de idioma
        window.addEventListener('languageChanged', () => {
            this.updateAllTexts();
        });

        // Actualizar textos inicialmente
        if (i18n.initialized) {
            this.updateAllTexts();
        }

        this.initialized = true;
        console.log('✅ MenuUIManager inicializado');
    }

    /**
     * Actualiza todos los textos de todas las pantallas
     */
    updateAllTexts() {
        if (!i18n.initialized) return;

        this.updateMainMenuTexts();
        this.updateLobbyTexts();
        this.updateGameEndTexts();
        this.updatePauseMenuTexts();
        this.updateOptionsMenuTexts();
        this.updateArsenalTexts();
    }

    /**
     * Actualiza textos del menú principal
     */
    updateMainMenuTexts() {
        // Título del menú
        const menuTitle = document.querySelector('#main-menu-overlay .menu-title');
        if (menuTitle) {
            menuTitle.textContent = i18n.t('menu.title');
        }

        // Botón de logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.textContent = i18n.t('auth.logout');
        }

        // Botones del menú
        this.updateButton('play-btn', 'menu.play');
        this.updateButton('tutorial-btn', 'menu.tutorial');
        this.updateButton('arsenal-btn', 'menu.arsenal');
        this.updateButton('options-btn', 'menu.options');
        this.updateButton('exit-btn', 'menu.exit');

        // Botón de comenzar (en el juego)
        this.updateButton('start-timer-btn', 'menu.start');
    }

    /**
     * Actualiza textos del lobby multijugador
     */
    updateLobbyTexts() {
        // Botón volver
        this.updateButton('lobby-back-btn', 'menu.back');

        // Estado de conexión
        const lobbyStatus = document.getElementById('lobby-status');
        if (lobbyStatus && lobbyStatus.textContent.includes('Conectando')) {
            lobbyStatus.textContent = i18n.t('lobby.connecting');
        }

        // Botones principales
        this.updateButton('create-room-btn', 'lobby.create_room');
        this.updateButton('join-room-btn', 'lobby.join_room');
        this.updateButton('join-with-code-btn', 'lobby.join_with_code');

        // Placeholder del código de sala
        const roomCodeInput = document.getElementById('room-code-input');
        if (roomCodeInput) {
            roomCodeInput.placeholder = i18n.t('lobby.room_code_placeholder');
        }

        // Título de jugadores
        const playersTitle = document.querySelector('#lobby-room-view h3');
        if (playersTitle && playersTitle.textContent.includes('JUGADORES')) {
            playersTitle.textContent = i18n.t('lobby.players');
        }

        // Slot de IA
        const aiSlotEmpty = document.querySelector('#ai-slot-empty p');
        if (aiSlotEmpty) {
            aiSlotEmpty.textContent = i18n.t('lobby.ai_slot_empty');
        }

        this.updateButton('add-ai-btn', 'lobby.add_ai');
        this.updateButton('remove-ai-btn', 'lobby.remove_ai');

        // Labels de configuración de IA
        const nationLabel = document.querySelector('#ai-slot-config label');
        if (nationLabel) {
            nationLabel.textContent = i18n.t('lobby.nation_label');
        }

        const difficultyLabel = document.querySelectorAll('#ai-slot-config label')[1];
        if (difficultyLabel) {
            difficultyLabel.textContent = i18n.t('lobby.difficulty_label');
        }

        // Opciones de dificultad
        const aiDifficultySelect = document.getElementById('ai-difficulty-select');
        if (aiDifficultySelect) {
            const options = aiDifficultySelect.querySelectorAll('option');
            if (options[0]) options[0].textContent = i18n.t('lobby.difficulty_easy');
            if (options[1]) options[1].textContent = i18n.t('lobby.difficulty_medium');
            if (options[2]) options[2].textContent = i18n.t('lobby.difficulty_hard');
        }

        // Botones de acción
        this.updateButton('ready-toggle-btn', 'menu.ready');
        this.updateButton('start-multiplayer-game-btn', 'menu.start_game');

        // Chat
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.placeholder = i18n.t('lobby.chat_placeholder');
        }

        this.updateButton('chat-send-btn', 'lobby.send');
    }

    /**
     * Actualiza textos de pantallas de victoria/derrota
     */
    updateGameEndTexts() {
        // Victoria
        const victoryTitle = document.querySelector('#victory-overlay .game-end-title');
        if (victoryTitle) {
            victoryTitle.textContent = i18n.t('game_end.victory');
        }

        this.updateButton('victory-menu-btn', 'game_end.back_to_menu');

        // Derrota
        const defeatTitle = document.querySelector('#defeat-overlay .game-end-title');
        if (defeatTitle) {
            defeatTitle.textContent = i18n.t('game_end.defeat');
        }

        this.updateButton('defeat-menu-btn', 'game_end.back_to_menu');
    }

    /**
     * Actualiza textos del menú de pausa
     */
    updatePauseMenuTexts() {
        const pauseTitle = document.querySelector('#pause-overlay .menu-title');
        if (pauseTitle) {
            pauseTitle.textContent = i18n.t('pause.title');
        }

        this.updateButton('pause-continue-btn', 'pause.continue');
        this.updateButton('pause-options-btn', 'pause.options');
        this.updateButton('pause-exit-btn', 'pause.exit');
    }

    /**
     * Actualiza textos del menú de opciones
     */
    updateOptionsMenuTexts() {
        const optionsTitle = document.querySelector('#options-menu h2');
        if (optionsTitle) {
            optionsTitle.textContent = i18n.t('options.title');
        }

        // Labels de volumen
        const masterVolumeLabel = document.querySelector('label[for="master-volume-slider"]');
        if (masterVolumeLabel) {
            masterVolumeLabel.textContent = i18n.t('options.master_volume');
        }

        const musicVolumeLabel = document.querySelector('label[for="music-volume-slider"]');
        if (musicVolumeLabel) {
            musicVolumeLabel.textContent = i18n.t('options.music_volume');
        }

        const sfxVolumeLabel = document.querySelector('label[for="sfx-volume-slider"]');
        if (sfxVolumeLabel) {
            sfxVolumeLabel.textContent = i18n.t('options.sfx_volume');
        }

        // Botones
        this.updateButton('reset-options-btn', 'options.reset');
        this.updateButton('close-options-btn', 'options.close');
    }

    /**
     * Actualiza textos del arsenal/constructor de mazos
     */
    updateArsenalTexts() {
        this.updateButton('arsenal-back-btn', 'menu.back');

        const arsenalTitle = document.querySelector('.arsenal-title');
        if (arsenalTitle) {
            arsenalTitle.textContent = i18n.t('menu.deck_builder');
        }

        this.updateButton('arsenal-new-btn', 'common.new');
        this.updateButton('arsenal-load-btn', 'common.load');

        // Tabs
        this.updateButton('arsenal-tab-units', 'arsenal.units');
        this.updateButton('arsenal-tab-disciplines', 'arsenal.disciplines');

        // Títulos de paneles
        const deckPanelTitle = document.getElementById('deck-panel-title');
        if (deckPanelTitle) {
            deckPanelTitle.textContent = i18n.t('arsenal.your_deck');
        }

        // Botones de destino (Mazo/Banquillo)
        const deckBtn = document.getElementById('destination-deck-btn');
        if (deckBtn) {
            deckBtn.textContent = i18n.t('arsenal.your_deck');
        }

        const benchBtn = document.getElementById('destination-bench-btn');
        if (benchBtn) {
            benchBtn.textContent = i18n.t('arsenal.bench');
        }

        // Texto de ayuda
        const helpLeft = document.getElementById('arsenal-help-left');
        if (helpLeft) {
            helpLeft.textContent = i18n.t('arsenal.add_card_left');
        }
        
        const helpRight = document.getElementById('arsenal-help-right');
        if (helpRight) {
            helpRight.textContent = i18n.t('arsenal.view_card_right');
        }

        // Botones de acción
        this.updateButton('deck-clear-btn', 'common.clear');
        this.updateButton('deck-save-btn', 'common.save');
        this.updateButton('deck-selector-close-btn', 'common.close');
        this.updateButton('deck-name-cancel-btn', 'common.cancel');
        this.updateButton('deck-name-confirm-btn', 'common.save');

        // Texto del mazo vacío
        const deckEmpty = document.querySelector('.deck-empty');
        if (deckEmpty) {
            deckEmpty.textContent = i18n.t('arsenal.deck_empty');
        }

        // Texto del panel de detalle
        const detailName = document.querySelector('.detail-name');
        if (detailName && detailName.textContent.includes('Pasa el ratón')) {
            detailName.textContent = i18n.t('arsenal.hover_card');
        }
    }

    /**
     * Helper: Actualiza el texto de un botón usando una clave de traducción
     */
    updateButton(buttonId, translationKey) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.textContent = i18n.t(translationKey);
        }
    }
}

// Exportar instancia singleton
export const menuUIManager = new MenuUIManager();

