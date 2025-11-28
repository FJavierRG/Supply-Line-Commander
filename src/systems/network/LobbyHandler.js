// ===== GESTOR DE LOBBY Y UI PRE-JUEGO =====
// Responsabilidad: Gestión de la interfaz y estado del lobby (sala de espera)

export class LobbyHandler {
    constructor(networkManager, game) {
        this.networkManager = networkManager;
        this.game = game;
        this.lastLobbyData = null;
        this.isReady = false;
    }

    // ========== GESTIÓN DE VISTAS ==========

    /**
     * Mostrar vista de la sala (lobby mejorado)
     */
    showRoomView(roomId) {
        // Ocultar vista inicial, mostrar vista de sala
        const initialView = document.getElementById('lobby-initial-view');
        const roomView = document.getElementById('lobby-room-view');
        
        if (initialView) initialView.style.display = 'none';
        if (roomView) roomView.style.display = 'block';
        
        // Mostrar código de sala
        const roomCodeDisplay = document.getElementById('room-code-display');
        if (roomCodeDisplay) roomCodeDisplay.textContent = roomId;
        
        // Inicializar estado ready
        this.isReady = false;
        this.setupLobbyButtons();
    }

    /**
     * Ocultar lobby completamente
     */
    hideLobby() {
        // Ocultar todos los overlays usando OverlayManager
        this.game.overlayManager.hideAllOverlays();
        
        // CRÍTICO: Ocultar el botón de overlay "Comenzar" y TODOS los botones de overlay
        const startTimerBtn = document.getElementById('start-timer-btn');
        if (startTimerBtn) {
            startTimerBtn.style.display = 'none';
            startTimerBtn.style.visibility = 'hidden';
            startTimerBtn.style.opacity = '0';
            startTimerBtn.style.pointerEvents = 'none';
            // Ocultar botón completamente
            startTimerBtn.style.zIndex = '-1';
            console.log('  ✓ start-timer-btn FORZADO a oculto');
        }
        
        // Ocultar cualquier botón de overlay del juego
        const overlayButtons = document.querySelectorAll('.game-start-overlay-btn');
        overlayButtons.forEach(btn => {
            btn.style.display = 'none';
            btn.style.visibility = 'hidden';
            btn.style.opacity = '0';
        });
        
        // 🆕 SIMPLIFICADO: Solo ocultar overlay del tutorial si existe
        const tutorialOverlay = document.getElementById('tutorial-overlay');
        if (tutorialOverlay) {
            tutorialOverlay.style.display = 'none';
        }
        
        // Asegurar que el tutorialManager sepa que está inactivo
        if (this.game.tutorialManager) {
            this.game.tutorialManager.active = false;
        }
        
        console.log('✅ Tutorial oculto (si estaba activo)');
        
        // 🆕 FIX: Asegurar que todos los overlays del menú estén ocultos
        const overlaysToHide = [
            'main-menu-overlay',
            'multiplayer-lobby-overlay',
            'press-to-continue-screen',
            'tutorial-overlay'
        ];
        
        overlaysToHide.forEach(overlayId => {
            const overlay = document.getElementById(overlayId);
            if (overlay) {
                overlay.classList.add('hidden');
                overlay.style.display = 'none';
            }
        });
        
        // Asegurar que el canvas esté visible y en primer plano
        const gameCanvas = document.getElementById('game-canvas');
        if (gameCanvas) {
            gameCanvas.style.display = 'block';
            gameCanvas.style.visibility = 'visible';
            gameCanvas.style.opacity = '1';
            gameCanvas.style.zIndex = '1';
            gameCanvas.style.position = 'relative';
            gameCanvas.style.pointerEvents = 'auto';
        }
        
        // Asegurar que el contenedor del juego esté visible
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.style.display = 'block';
            gameContainer.style.visibility = 'visible';
        }
        
        const mainGame = document.getElementById('main-game');
        if (mainGame) {
            mainGame.style.display = 'block';
            mainGame.style.visibility = 'visible';
        }
        
        // Verificar TODOS los elementos que podrían estar tapando
        const allElements = document.querySelectorAll('*');
        let elementsOnTop = 0;
        allElements.forEach(el => {
            const zIndex = parseInt(window.getComputedStyle(el).zIndex);
            if (zIndex >= 100 && el.style.display !== 'none') {
                elementsOnTop++;
            }
        });
        
        // Ocultar slider de cámara inicialmente
        this.game.ui.hideElement('camera-slider-container');
        
        // Forzar actualización inmediata del HUD
        setTimeout(() => {
            this.game.ui.updateHUD(this.game.getGameState());
        }, 100);
    }

    /**
     * Salir de la sala
     */
    leaveRoom() {
        // Volver a vista inicial
        const initialView = document.getElementById('lobby-initial-view');
        const roomView = document.getElementById('lobby-room-view');
        
        if (initialView) initialView.style.display = 'block';
        if (roomView) roomView.style.display = 'none';
        
        // Limpiar chat
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) chatMessages.innerHTML = '';
        
        // 🆕 NUEVO: Limpiar completamente el estado de la sala
        this.networkManager.roomId = null;
        this.networkManager.myTeam = null;
        this.networkManager.opponentTeam = null;
        this.isReady = false;
        this.lastLobbyData = null;
        this.networkManager._startingGame = false;
        
        // 🆕 FIX: Restaurar botón de inicio
        const startBtn = document.getElementById('start-multiplayer-game-btn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = 'Comenzar Partida';
            startBtn.style.display = 'none';
        }
    }

    /**
     * Mostrar lista de salas
     */
    displayRoomsList(rooms) {
        console.log('📋 Salas disponibles:', rooms);
        // TODO: Crear UI de lista de salas
    }

    // ========== ACTUALIZACIÓN DE UI ==========

    /**
     * Actualizar UI del lobby con estado de jugadores
     */
    updateLobbyUI(data) {
        if (!data || !data.players) return;
        
        const playersList = document.getElementById('players-list');
        if (!playersList) return;
        
        // Limpiar lista
        playersList.innerHTML = '';
        
        // Guardar datos del lobby para uso posterior
        this.lastLobbyData = data;
        
        // 🆕 FIX: Determinar si soy host basándome en los datos del servidor
        const myPlayer = data.players.find(p => p.id === this.networkManager.socket.id);
        const isHost = myPlayer && (myPlayer.isHost || myPlayer.team === 'player1');
        
        // 🆕 FIX: Actualizar myTeam si aún no está establecido
        if (!this.networkManager.myTeam && myPlayer) {
            this.networkManager.myTeam = myPlayer.team;
            this.game.myTeam = myPlayer.team;
            console.log(`🔄 myTeam actualizado desde lobby_update: ${this.networkManager.myTeam}`);
        }
        
        // Renderizar cada jugador
        data.players.forEach(player => {
            const playerCard = this._createPlayerCard(player, isHost);
            playersList.appendChild(playerCard);
        });
        
        // 🤖 Gestionar slot de IA
        this._updateAISlot(data, isHost);
        
        // Actualizar mi estado de ready basado en los datos del servidor
        if (myPlayer) {
            this.isReady = myPlayer.ready;
            
            // Actualizar botón de ready
            const readyBtn = document.getElementById('ready-toggle-btn');
            if (readyBtn) {
                readyBtn.textContent = this.isReady ? 'Cancelar' : 'Marcar Listo';
            }
        }
        
        // Actualizar botón de inicio
        this._updateStartButton(data, isHost);
        
        // Configurar event listeners para los selects de raza
        this.setupRaceSelectListeners();
    }

    /**
     * Crear tarjeta de jugador
     */
    _createPlayerCard(player, isHost) {
        const playerCard = document.createElement('div');
        playerCard.style.cssText = `
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid ${player.team === 'player1' ? '#4ecca3' : '#e74c3c'};
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        const playerInfo = document.createElement('div');
        const isMe = player.id === this.networkManager.socket.id;
        const youLabel = isMe ? ' (Tú)' : '';
        const teamColor = player.team === 'player1' ? '#4ecca3' : '#e74c3c';
        const teamName = player.team === 'player1' ? 'Azul' : 'Rojo';
        
        // Checkbox visual
        const checkboxColor = player.ready ? '#4ecca3' : '#e74c3c';
        const checkIcon = player.ready ? '✓' : '✗';
        
        playerInfo.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="
                    width: 30px;
                    height: 30px;
                    border: 3px solid ${checkboxColor};
                    border-radius: 5px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    font-weight: bold;
                    color: ${checkboxColor};
                    background: rgba(0, 0, 0, 0.5);
                ">
                    ${checkIcon}
                </div>
                <div>
                    <div style="font-size: 18px; font-weight: bold; color: white; margin-bottom: 3px;">
                        ${player.name}${youLabel}
                    </div>
                    <div style="font-size: 14px; color: ${teamColor}; margin-bottom: 8px;">
                        Equipo: ${teamName}
                    </div>
                    ${isMe ? `
                        <select id="race-select-${player.id}" style="
                            padding: 5px 10px;
                            background: rgba(0, 0, 0, 0.7);
                            border: 2px solid #4ecca3;
                            border-radius: 5px;
                            color: white;
                            font-size: 14px;
                            width: 200px;
                        " ${player.ready ? 'disabled' : ''}>
                            ${this.generateDeckOptions(player.selectedRace)}
                        </select>
                    ` : `
                        <div style="font-size: 14px; color: ${player.selectedRace ? '#2ecc71' : '#e74c3c'};">
                            ${this.getDeckDisplayName(player.selectedRace)}
                        </div>
                    `}
                </div>
            </div>
        `;
        
        playerCard.appendChild(playerInfo);
        
        // Botón expulsar (solo si soy host y no es mi card)
        if (isHost && !isMe) {
            const kickBtn = document.createElement('button');
            kickBtn.className = 'menu-btn secondary';
            kickBtn.textContent = '🚫';
            kickBtn.style.cssText = 'padding: 8px 12px; font-size: 16px; min-width: 50px;';
            kickBtn.title = 'Expulsar jugador';
            kickBtn.onclick = () => this.kickPlayer(player.id);
            playerCard.appendChild(kickBtn);
        }
        
        return playerCard;
    }

    /**
     * Actualizar slot de IA
     */
    _updateAISlot(data, isHost) {
        const aiSlot = document.getElementById('ai-slot');
        const aiSlotEmpty = document.getElementById('ai-slot-empty');
        const aiSlotConfig = document.getElementById('ai-slot-config');
        
        if (data.aiPlayer) {
            // Hay IA: mostrar configuración
            if (aiSlotEmpty) aiSlotEmpty.style.display = 'none';
            if (aiSlotConfig) {
                aiSlotConfig.style.display = 'block';
                // Actualizar selectores
                const raceSelect = document.getElementById('ai-race-select');
                const difficultySelect = document.getElementById('ai-difficulty-select');
                if (raceSelect) raceSelect.value = data.aiPlayer.race;
                if (difficultySelect) difficultySelect.value = data.aiPlayer.difficulty;
            }
        } else if (data.players.length < 2 && isHost) {
            // No hay IA y soy host: mostrar botón para añadir
            if (aiSlot) aiSlot.style.display = 'block';
            if (aiSlotEmpty) aiSlotEmpty.style.display = 'block';
            if (aiSlotConfig) aiSlotConfig.style.display = 'none';
        } else {
            // No hay IA y no soy host, o hay player2: ocultar slot
            if (aiSlot) aiSlot.style.display = data.players.length === 2 ? 'none' : 'block';
        }
    }

    /**
     * Actualizar botón de inicio
     */
    _updateStartButton(data, isHost) {
        const startBtn = document.getElementById('start-multiplayer-game-btn');
        if (startBtn && isHost) {
            // Verificar si hay 2 jugadores humanos O 1 jugador + IA
            const hasPlayer2 = data.players.length === 2;
            const hasAI = data.aiPlayer !== null && data.aiPlayer !== undefined;
            const hasOpponent = hasPlayer2 || hasAI;
            
            // Verificar que todos estén ready
            const allPlayersReady = data.players.every(p => p.ready);
            const aiReady = hasAI ? true : true;
            const allReady = allPlayersReady && aiReady;
            
            // Verificar que todos tengan raza seleccionada
            const allPlayersHaveRace = data.players.every(p => p.selectedRace);
            const aiHasRace = hasAI ? (data.aiPlayer.race !== null) : true;
            const allHaveRace = allPlayersHaveRace && aiHasRace;
            
            // 🆕 FIX: Restaurar botón antes de mostrar/ocultar
            startBtn.disabled = false;
            startBtn.textContent = 'Comenzar Partida';
            
            startBtn.style.display = (hasOpponent && allReady && allHaveRace) ? 'block' : 'none';
        } else if (startBtn) {
            // Si no soy host, ocultar y restaurar el botón
            startBtn.style.display = 'none';
            startBtn.disabled = false;
            startBtn.textContent = 'Comenzar Partida';
        }
    }

    // ========== GESTIÓN DE MAZOS ==========

    /**
     * Genera las opciones del desplegable de mazos
     */
    generateDeckOptions(selectedDeckId) {
        if (!this.game || !this.game.deckManager) {
            return '<option value="default">Mazo Predeterminado</option>';
        }
        
        const allDecks = this.game.deckManager.getAllDecks();
        console.log('🗂️ [LOBBY] Decks disponibles:', allDecks.map(d => ({ id: d.id, name: d.name })));
        const defaultDeck = allDecks.find(d => d.isDefault === true);
        const playerDecks = allDecks.filter(d => d.isDefault === false);
        
        let optionsHTML = '';
        
        // Primero el mazo predeterminado
        if (defaultDeck) {
            const isSelected = (!selectedDeckId && !this.game.deckManager.lastSelectedDeckId) || 
                              selectedDeckId === defaultDeck.id ||
                              (!selectedDeckId && this.game.deckManager.lastSelectedDeckId === defaultDeck.id);
            optionsHTML += `<option value="${defaultDeck.id}" ${isSelected ? 'selected' : ''}>${defaultDeck.name}</option>`;
        }
        
        // Luego los mazos del jugador
        playerDecks.forEach(deck => {
            const isSelected = selectedDeckId === deck.id;
            optionsHTML += `<option value="${deck.id}" ${isSelected ? 'selected' : ''}>${deck.name}</option>`;
        });
        
        // Si no hay mazos guardados, mostrar solo el predeterminado
        if (playerDecks.length === 0 && !defaultDeck) {
            optionsHTML = '<option value="default">Mazo Predeterminado</option>';
        }
        
        return optionsHTML;
    }

    /**
     * Obtiene el nombre del mazo para mostrar en la UI
     */
    getDeckDisplayName(deckId) {
        if (!deckId) {
            return 'Sin seleccionar';
        }
        
        if (!this.game || !this.game.deckManager) {
            return 'Mazo Predeterminado';
        }
        
        const deck = this.game.deckManager.getDeck(deckId);
        return deck ? deck.name : 'Mazo desconocido';
    }

    /**
     * Configurar event listeners para los selects de raza
     */
    setupRaceSelectListeners() {
        const playersList = document.getElementById('players-list');
        if (!playersList) return;
        
        const raceSelects = playersList.querySelectorAll('select[id^="race-select-"]');
        
        raceSelects.forEach(select => {
            // Remover listeners anteriores para evitar duplicados
            select.removeEventListener('change', this.handleRaceSelect);
            
            // Auto-selección del mazo predeterminado si no hay mazo seleccionado
            if (select.value) {
                const playerId = select.id.replace('race-select-', '');
                const playerData = this.lastLobbyData?.players?.find(p => p.id === playerId);
                
                // Solo enviar si el jugador no tiene mazo seleccionado en el servidor
                if (playerData && !playerData.selectedRace) {
                    this._sendDeckSelection(select.value);
                }
            }
            
            // Agregar nuevo listener para cambios futuros
            select.addEventListener('change', (e) => {
                const deckId = e.target.value;
                if (deckId) {
                    this._sendDeckSelection(deckId);
                }
            });
        });
    }

    /**
     * Enviar selección de mazo al servidor (solo deckId)
     */
    _sendDeckSelection(deckId) {
        // 🆕 REFACTOR: Solo enviar el deckId, el servidor cargará el mazo desde la BD
        this.networkManager.clientSender.selectRace(this.networkManager.roomId, deckId);
    }

    // ========== GESTIÓN DE BOTONES ==========

    /**
     * Configurar event listeners de botones del lobby
     */
    setupLobbyButtons() {
        // Botón Ready
        const readyBtn = document.getElementById('ready-toggle-btn');
        if (readyBtn) {
            readyBtn.onclick = () => {
                // Verificar que haya seleccionado una nación antes de marcar ready
                if (!this.isReady) {
                    const myPlayer = this.getMyPlayerData();
                    if (!myPlayer || !myPlayer.selectedRace) {
                        alert('Debes seleccionar una nación antes de marcar listo');
                        return;
                    }
                }
                
                this.isReady = !this.isReady;
                this.networkManager.clientSender.setPlayerReady(this.networkManager.roomId, this.isReady);
                readyBtn.textContent = this.isReady ? 'Cancelar' : 'Marcar Listo';
                readyBtn.className = 'menu-btn primary';
            };
        }
        
        // Chat - Enviar con botón
        const chatSendBtn = document.getElementById('chat-send-btn');
        const chatInput = document.getElementById('chat-input');
        
        if (chatSendBtn && chatInput) {
            chatSendBtn.onclick = () => this.sendChatMessage();
            
            // Enviar con Enter
            chatInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    this.sendChatMessage();
                }
            };
        }
    }

    /**
     * Obtener datos del jugador actual
     */
    getMyPlayerData() {
        const playersList = document.getElementById('players-list');
        if (!playersList) return null;
        
        const mySelect = playersList.querySelector(`select[id^="race-select-"]`);
        if (!mySelect) return null;
        
        const playerId = mySelect.id.replace('race-select-', '');
        const selectedRace = mySelect.value || null;
        
        return {
            id: playerId,
            selectedRace: selectedRace,
            ready: this.isReady
        };
    }

    // ========== GESTIÓN DE CHAT ==========

    /**
     * Enviar mensaje de chat
     */
    sendChatMessage() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;
        
        const message = chatInput.value.trim();
        if (message === '') return;
        
        this.networkManager.clientSender.sendLobbyChat(this.networkManager.roomId, message);
        chatInput.value = '';
    }

    /**
     * Añadir mensaje al chat
     */
    addChatMessage(data) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        const time = new Date(data.timestamp).toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Mensajes del sistema tienen estilo diferente
        if (data.playerName === 'Sistema') {
            messageDiv.style.cssText = 'margin-bottom: 8px; color: #888; font-style: italic;';
            messageDiv.innerHTML = `
                <span style="color: #666;">[${time}]</span>
                <span style="color: #aaa;">ℹ️ ${data.message}</span>
            `;
        } else {
            messageDiv.style.cssText = 'margin-bottom: 8px; color: #ccc;';
            messageDiv.innerHTML = `
                <span style="color: #4ecca3;">[${time}]</span>
                <span style="color: white; font-weight: bold;">${data.playerName}:</span>
                <span style="color: #ddd;">${data.message}</span>
            `;
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll
    }

    /**
     * Expulsar jugador (solo host)
     */
    kickPlayer(targetPlayerId) {
        if (this.networkManager.myTeam !== 'player1') {
            return;
        }
        
        if (confirm('¿Expulsar a este jugador?')) {
            this.networkManager.clientSender.kickPlayer(this.networkManager.roomId, targetPlayerId);
        }
    }
}

