// ===== GESTOR DE INPUTS =====
import { getNodeConfig, NODE_CONFIG } from '../config/nodes.js';
import { VisualNode } from '../entities/visualNode.js';

export class InputHandler {
    constructor(game) {
        this.game = game;
        this.mouseX = 0;
        this.mouseY = 0;
        
        // Throttling para optimización de rendimiento
        this.lastEffectCheckTime = 0;
        this.effectCheckInterval = 100; // Verificar efectos solo cada 100ms (10 veces/seg)
        
        this.lastHoverCheckTime = 0;
        this.hoverCheckInterval = 50; // Verificar hover solo cada 50ms (20 veces/seg)
        
        // Tooltip por hover prolongado
        this.hoverStartTime = 0;
        this.hoverTargetCache = null; // Referencia al último objetivo bajo cursor
        this.hoverDelayMs = 1500; // 1.5s
        
        // ELIMINADO: selectedDifficulty - Ahora se configura en el lobby
        
        this.setupListeners();
    }
    
    /**
     * Verifica si el overlay de pausa está visible
     * @returns {boolean} True si el overlay de pausa está visible
     */
    isPauseMenuVisible() {
        const pauseOverlay = document.getElementById('pause-overlay');
        return pauseOverlay && !pauseOverlay.classList.contains('hidden');
    }
    
    /**
     * Verifica si algún overlay importante está visible y bloquea el input del juego
     * @returns {boolean} True si el input del CANVAS debe ser bloqueado
     * NOTA: Solo bloquea eventos del canvas, NO afecta a botones HTML del menú
     */
    shouldBlockGameInput() {
        // Bloquear si el menú de pausa está visible (solo durante el juego)
        if (this.isPauseMenuVisible()) {
            return true;
        }
        
        // Bloquear si las opciones están visibles (solo durante el juego)
        if (this.game.options && this.game.options.isVisible) {
            return true;
        }
        
        // NO bloquear si estamos en el menú principal - los overlays del menú
        // tienen sus propios botones HTML que no deben ser bloqueados
        // El bloqueo del canvas en estado 'menu' ya se maneja en handleCanvasClick
        
        return false;
    }
    
    /**
     * Configura todos los event listeners
     */
    setupListeners() {
        // Canvas listeners
        // IMPORTANTE: Usar capture phase para poder interceptar antes
        this.game.canvas.addEventListener('click', (e) => {
            // CRÍTICO: Si hay overlays visibles o el click está en UI, NO procesar
            if (this.game.inputRouter) {
                if (this.game.inputRouter.isClickOnUIElement(e)) {
                    e.stopPropagation(); // Detener propagación
                    return; // No procesar en canvas
                }
                if (!this.game.inputRouter.shouldRouteToCanvas(e)) {
                    e.stopPropagation(); // Detener propagación
                    return; // No procesar en canvas
                }
            }
            this.handleCanvasClick(e);
        }, false); // No usar capture phase, pero verificar antes
        
        this.game.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        this.game.canvas.addEventListener('mousedown', (e) => {
            // CRÍTICO: Si hay overlays visibles o el click está en UI, NO procesar
            if (this.game.inputRouter) {
                if (this.game.inputRouter.isClickOnUIElement(e)) {
                    e.stopPropagation();
                    return;
                }
                if (!this.game.inputRouter.shouldRouteToCanvas(e)) {
                    e.stopPropagation();
                    return;
                }
            }
            this.handleCanvasMouseDown(e);
        });
        this.game.canvas.addEventListener('mouseup', (e) => {
            // CRÍTICO: Si hay overlays visibles o el click está en UI, NO procesar
            if (this.game.inputRouter) {
                if (this.game.inputRouter.isClickOnUIElement(e)) {
                    e.stopPropagation();
                    return;
                }
                if (!this.game.inputRouter.shouldRouteToCanvas(e)) {
                    e.stopPropagation();
                    return;
                }
            }
            this.handleCanvasMouseUp(e);
        });
        this.game.canvas.addEventListener('contextmenu', (e) => {
            // CRÍTICO: Si hay overlays visibles o el click está en UI, NO procesar
            if (this.game.inputRouter) {
                if (this.game.inputRouter.isClickOnUIElement(e)) {
                    e.stopPropagation();
                    return;
                }
                if (!this.game.inputRouter.shouldRouteToCanvas(e)) {
                    e.stopPropagation();
                    return;
                }
            }
            this.handleRightClick(e);
        });
        
        // Keyboard listeners
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Botones del menú principal
        this.setupButton('play-btn', () => this.showMultiplayerLobby());
        this.setupButton('tutorial-btn', () => this.game.startTutorialFromMenu());
        // Editor de mapas legacy eliminado
        // this.setupButton('editor-menu-btn', () => this.game.enterEditor(false));
        // this.setupButton('continue-editing-btn', () => this.game.continueEditingLastMap());
        
        // Botones del lobby multijugador
        this.setupButton('lobby-back-btn', () => this.hideMultiplayerLobby());
        this.setupButton('create-room-btn', () => this.createMultiplayerRoom());
        this.setupButton('join-room-btn', () => this.showJoinRoomInput());
        this.setupButton('join-with-code-btn', () => this.joinRoomWithCode());
        this.setupButton('start-multiplayer-game-btn', () => this.game.network.startGame());
        
        // Botones de IA en el lobby
        this.setupButton('add-ai-btn', () => this.addAIPlayer());
        this.setupButton('remove-ai-btn', () => this.removeAIPlayer());
        
        // Botones de victoria/derrota
        this.setupButton('victory-menu-btn', () => this.game.returnToMenuFromGame());
        this.setupButton('defeat-menu-btn', () => this.game.returnToMenuFromGame());
        
        // Botones de desarrollo desactivados para producción
        // this.setupButton('dev-supply-enemy-btn', () => {
        //     if (this.game.state === 'playing') {
        //         this.game.devSupplyEnemyMode = !this.game.devSupplyEnemyMode;
        //         const btn = document.getElementById('dev-supply-enemy-btn');
        //         if (btn) {
        //             btn.style.background = this.game.devSupplyEnemyMode ? 'rgba(255, 140, 0, 0.9)' : 'rgba(139, 0, 0, 0.8)';
        //             btn.textContent = this.game.devSupplyEnemyMode ? '🎁 ACTIVO' : '🎁 ENEMIGO';
        //         }
        //         console.log(`🎁 DEV: Modo supply enemigo ${this.game.devSupplyEnemyMode ? 'ACTIVADO' : 'DESACTIVADO'}`);
        //     }
        // });
        
        // Botón volver al editor (solo visible durante playtest)
        this.setupButton('back-to-editor-btn', () => {
            if (this.game.isPlaytesting) {
                console.log('🛠️ Volviendo al editor desde playtest...');
                this.game.returnToMenuFromGame();
            }
        });
        
        // Botones de construcción en la tienda (genérico para todos los edificios)
        this.setupBuildingButtons();
        
        this.setupButton('surrender-btn', () => {
            if (this.game.state === 'playing' && this.game.missionStarted) {
                this.game.confirmSurrender();
            }
        });
        
        
        // Botones de opciones
        this.setupButton('options-btn', () => {
            this.game.options.toggleOptions();
        });
        
        // Botón de salir
        this.setupButton('exit-btn', () => {
            if (confirm('¿Estás seguro de que quieres salir del juego?')) {
                window.close();
            }
        });
        
        this.setupButton('pause-options-btn', () => {
            this.game.options.toggleOptions();
        });
        
        // Controles de volumen
        this.setupVolumeSliders();
        
        // Botones del menú de opciones
        this.setupButton('reset-options-btn', () => {
            this.game.options.resetToDefaults();
        });
        
        this.setupButton('close-options-btn', () => {
            this.game.options.toggleOptions();
        });
        
        // Botones de debug
        // Botón de debug desactivado para producción
        // this.setupButton('toggle-debug-btn', () => {
        //     this.toggleDebugMode();
        // });
        
    }
    
    /**
     * Helper para configurar botones
     */
    setupButton(id, callback) {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', callback);
        }
    }
    
    /**
     * Configura los sliders de volumen
     */
    setupVolumeSliders() {
        // Volumen maestro
        const masterSlider = document.getElementById('master-volume-slider');
        if (masterSlider) {
            masterSlider.addEventListener('input', (e) => {
                this.game.options.setMasterVolume(parseInt(e.target.value));
            });
        }
        
        // Volumen música
        const musicSlider = document.getElementById('music-volume-slider');
        if (musicSlider) {
            musicSlider.addEventListener('input', (e) => {
                this.game.options.setMusicVolume(parseInt(e.target.value));
            });
        }
        
        // Volumen efectos
        const sfxSlider = document.getElementById('sfx-volume-slider');
        if (sfxSlider) {
            sfxSlider.addEventListener('input', (e) => {
                this.game.options.setSfxVolume(parseInt(e.target.value));
            });
        }
    }
    
    /**
     * Configura los botones de construcción de la tienda
     */
    setupBuildingButtons() {
        Object.values(NODE_CONFIG).forEach(building => {
            const buttonId = `build-${building.id}-item`;
            this.setupButton(buttonId, () => {
                if (this.game.state === 'playing' && this.game.missionStarted) {
                    // Solo activar si puede pagar
                    if (this.game.buildSystem.canAffordBuilding(building.id)) {
                        this.game.buildSystem.activateBuildMode(building.id);
                    }
                }
            });
        });
    }
    
    /**
     * Transforma coordenadas del mouse para Mirror View (player2)
     * @param {number} x - Coordenada X en el mundo
     * @param {number} y - Coordenada Y en el mundo
     * @returns {{x: number, y: number}} - Coordenadas transformadas
     */
    transformMirrorCoordinates(x, y) {
        if (!this.game.isMultiplayer || this.game.myTeam !== 'player2') {
            return { x, y };
        }
        
        // Invertir coordenada X para player2 (flip horizontal)
        const worldWidth = this.game.worldWidth || this.game.canvas.width;
        return {
            x: worldWidth - x,
            y: y
        };
    }
    
    /**
     * Maneja clicks en el canvas
     */
    handleCanvasClick(e) {
        // NUEVO: Usar InputRouter si está disponible
        if (this.game.inputRouter) {
            // Verificar si el click está en UI antes de procesar
            if (this.game.inputRouter.isClickOnUIElement(e)) {
                return; // Dejar que el elemento UI maneje el evento
            }
            
            // Verificar si debería rutear al canvas
            if (!this.game.inputRouter.shouldRouteToCanvas(e)) {
                return; // No procesar en canvas
            }
        } else {
            // FALLBACK: Verificación básica (compatibilidad)
            if (this.shouldBlockGameInput()) {
                return;
            }
        }
        
        const rect = this.game.canvas.getBoundingClientRect();
        // Coordenadas del click relativas al canvas escalado
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Convertir de coordenadas CSS escaladas a coordenadas del juego
        const scaleX = this.game.canvas.width / rect.width;
        const scaleY = this.game.canvas.height / rect.height;
        let x = clickX * scaleX;
        let y = clickY * scaleY;
        
        // Verificar si el click está en la Store UI ANTES de transformar coordenadas
        // La UI está en coordenadas de pantalla, NO en coordenadas de mundo
        if (this.game.storeUI && this.game.storeUI.handleClick(x, y)) {
            return; // Click manejado por la Store UI
        }
        
        // Verificar si el click está en la pantalla de selección de raza
        if (this.game.raceSelection && this.game.raceSelection.handleClick(x, y)) {
            return; // Click manejado por la selección de raza
        }
        
        // Convertir coordenadas de pantalla a mundo (cámara siempre activa)
        const worldPos = this.game.camera.screenToWorld(x, y);
        x = worldPos.x;
        y = worldPos.y;
        
        // Transformar coordenadas para Mirror View (player2) SOLO para el mundo del juego
        const transformed = this.transformMirrorCoordinates(x, y);
        x = transformed.x;
        y = transformed.y;
        
        // Detectar si se mantiene presionado Shift
        const shiftPressed = e.shiftKey;
        
        // Delegar al editor si está en modo editor
        if (this.game.state === 'editor') {
            if (this.game.mapEditor && this.game.mapEditor.active) {
                this.game.mapEditor.handleClick(x, y);
            }
            return;
        }
        
        // Permitir clics en 'playing' y 'tutorial'
        if (this.game.state !== 'playing' && this.game.state !== 'tutorial') return;
        
        // En tutorial, no verificar pausa ni missionStarted
        if (this.game.state === 'playing' && (this.game.paused || !this.game.missionStarted)) return;
        
        // Modo DEBUG: Colocar torreta anti-drone ENEMIGA
        if (this.game.debugEnemyBuildMode) {
            this.placeEnemyAntiDrone(x, y);
            return;
        }
        
        // Modo DEBUG: Lanzar dron enemigo a objetivo seleccionado
        if (this.game.debugEnemyDroneMode) {
            const clickedBase = this.getBaseAt(x, y);
            const clickedBuilding = this.getBuildingAt(x, y);
            const target = clickedBase || clickedBuilding;
            
            if (target) {
                this.game.droneSystem.launchDrone(
                    this.game.canvas.width, // Desde el borde derecho
                    target.y,
                    target,
                    true // Es un dron ENEMIGO
                );
                console.log(`💣 Dron ENEMIGO lanzado hacia ${target.type || target.name} en (${target.x.toFixed(0)}, ${target.y.toFixed(0)})`);
                // Desactivar modo tras lanzar
                this.game.debugEnemyDroneMode = false;
            } else {
                console.log('⚠️ Selecciona un objetivo válido (base o edificio)');
            }
            return;
        }
        
        // Modo DEBUG: Lanzar sniper enemigo a frente aliado seleccionado
        if (this.game.debugEnemySniperMode) {
            const clickedBase = this.getBaseAt(x, y);
            
            // Solo permitir frentes aliados
            if (clickedBase && clickedBase.type === 'front') {
                // Usar el mismo método que la IA
                // === LEGACY REMOVED: IA eliminada del cliente ===
                // El servidor maneja todas las acciones de IA.
                console.log(`🎯 DEBUG: Sniper enemigo ejecutado (usa lógica de IA)`);
                // Desactivar modo tras lanzar
                this.game.debugEnemySniperMode = false;
            } else {
                console.log('⚠️ Selecciona un FRENTE ALIADO (tipo "front")');
            }
            return;
        }
        
        // Modo DEV: Dar recursos a frente enemigo
        if (this.game.devSupplyEnemyMode) {
            const clickedBase = this.getBaseAt(x, y);
            if (clickedBase && clickedBase.type === 'front' && clickedBase.team === 'player2') {
                const amount = 20; // Dar 20 recursos (como un convoy)
                clickedBase.supplies = Math.min(clickedBase.supplies + amount, clickedBase.maxSupplies);
                this.game.particleSystem.createExplosion(clickedBase.x, clickedBase.y, '#ff0000');
                this.game.audio.playSound('dispatch');
                console.log(`🎁 DEV: +${amount} recursos al enemigo (${clickedBase.supplies}/${clickedBase.maxSupplies})`);
            }
            return;
        }
        
        // Modo construcción: colocar FOB
        if (this.game.buildSystem.buildMode) {
            this.game.buildSystem.buildFOB(x, y);
            return;
        }
        
        // Modo drone: lanzar dron a FOB enemigo
        if (this.game.buildSystem.droneMode) {
            const clickedBase = this.getBaseAt(x, y);
            if (clickedBase) {
                this.game.buildSystem.launchDrone(clickedBase);
            }
            return;
        }
        
        // Modo francotirador: disparar a frente enemigo
        if (this.game.buildSystem.sniperMode) {
            const clickedBase = this.getBaseAt(x, y);
            if (clickedBase) {
                this.game.buildSystem.executeSniperStrike(clickedBase);
            }
            return;
        }
        
        // Modo fobSabotage: sabotear FOB enemiga
        if (this.game.buildSystem.fobSabotageMode) {
            const clickedBase = this.getBaseAt(x, y);
            if (clickedBase) {
                this.game.buildSystem.executeFobSabotage(clickedBase);
            }
            return;
        }
        
        // Modo comando: desplegar comando especial operativo en territorio enemigo
        if (this.game.buildSystem.commandoMode) {
            // El comando se despliega en una posición (no requiere click en un nodo específico)
            this.game.buildSystem.executeCommandoDeploy(x, y);
            return;
        }
        
        // Detectar clic en selector de recursos del HQ - VERIFICAR ANTES DE getBaseAt
        // Porque los botones están FUERA del círculo del HQ
        let hq;
        if (this.game.state === 'tutorial' && this.game.tutorialManager && this.game.tutorialManager.tutorialNodes) {
            hq = this.game.tutorialManager.tutorialNodes.find(b => b.type === 'hq');
        } else {
            hq = this.game.bases.find(b => b.type === 'hq' && b.team === this.game.myTeam);
        }
        
        if (hq) {
            const resourceButtonClick = this.checkResourceSelectorClick(x, y, hq);
            if (resourceButtonClick) {
                hq.setResourceType(resourceButtonClick);
                // En tutorial, mantener HQ seleccionado al cambiar tipo de recurso
                if (this.game.state === 'tutorial' && this.game.tutorialManager && this.game.tutorialManager.isTutorialActive) {
                    this.game.selectedBase = hq;
                } else {
                    this.game.selectedBase = hq;
                }
                console.log(`🎯 HQ seleccionado: ${resourceButtonClick === 'medical' ? 'Modo MÉDICO 🚑' : 'Modo MUNICIÓN 📦'}`);
                return;
            }
        }
        
        const clickedBase = this.getBaseAt(x, y);
        const clickedBuilding = this.getBuildingAt(x, y);
        
        // Prioridad: primero verificar edificios (hospitales), luego bases
        if (clickedBuilding && clickedBuilding.canDispatchMedical) {
            // 🆕 NUEVO: No permitir seleccionar hospitales disabled
            if (clickedBuilding.disabled) {
                console.log('⚠️ Hospital deshabilitado - no se puede usar');
                return;
            }
            
            if (!this.game.selectedBase) {
                // Seleccionar hospital si tiene vehículos
                if (clickedBuilding.availableVehicles > 0) {
                    this.game.selectedBase = clickedBuilding;
                    console.log(`🏥 Hospital seleccionado (${clickedBuilding.availableVehicles}/${clickedBuilding.maxVehicles} vehículos)`);
                } else {
                    console.log('⚠️ Hospital sin vehículos disponibles');
                }
                return;
            } else {
                // Deseleccionar
                this.game.selectedBase = null;
                return;
            }
        }
        
        if (clickedBase) {
            if (!this.game.selectedBase) {
                // 🆕 NUEVO: No permitir seleccionar nodos disabled
                if (clickedBase.disabled) {
                    console.log('⚠️ Nodo deshabilitado - no se puede usar');
                    return;
                }
                
                // No permitir seleccionar nodos abandonando
                if (clickedBase.isAbandoning) {
                    console.log('⚠️ No se puede seleccionar: nodo abandonando');
                    return;
                }
                
                // No permitir seleccionar frentes (excepto si son de B_Nation) ni nodos enemigos
                if (clickedBase.type === 'front') {
                    // Solo permitir seleccionar frentes si son de B_Nation y tienen helicópteros disponibles
                    if (this.game.selectedRace !== 'B_Nation' || !clickedBase.hasAvailableHelicopter()) {
                        return;
                    }
                } else if (clickedBase.team !== this.game.myTeam) {
                    return;
                }
                
                // Tutorial: Verificar permisos para seleccionar
                if (this.game.tutorialManager && this.game.tutorialManager.isTutorialActive) {
                    const canSelect = (clickedBase.type === 'hq' && this.game.tutorialManager.isActionAllowed('canSelectHQ')) ||
                                     (clickedBase.type === 'fob' && this.game.tutorialManager.isActionAllowed('canSelectFOB'));
                    
                    if (!canSelect) {
                        console.log('⚠️ Tutorial: No puedes seleccionar esto aún');
                        return;
                    }
                }
                
                // Intentar seleccionar una base
                // Para HQ en modo médico, verificar ambulancia; sino verificar vehículos normales
                // Para frentes con helicópteros, verificar helicópteros disponibles
                let hasVehicle = false;
                if (clickedBase.type === 'hq' && clickedBase.selectedResourceType === 'medical') {
                    hasVehicle = clickedBase.hasAmbulanceAvailable();
                } else if (clickedBase.type === 'hq' && this.game.selectedRace === 'B_Nation' && clickedBase.hasHelicopters) {
                    // HQ de B_Nation: verificar helicópteros disponibles
                    hasVehicle = clickedBase.hasAvailableHelicopter();
                    console.log(`🚁 DEBUG HQ: hasHelicopters=${clickedBase.hasHelicopters}, availableHelicopters=${clickedBase.availableHelicopters}, hasVehicle=${hasVehicle}`);
                } else if (clickedBase.type === 'front' && this.game.selectedRace === 'B_Nation') {
                    hasVehicle = clickedBase.hasAvailableHelicopter();
                } else {
                    hasVehicle = clickedBase.hasAvailableVehicle();
                }
                
                if ((clickedBase.maxVehicles > 0 || (clickedBase.type === 'front' && this.game.selectedRace === 'B_Nation')) && !hasVehicle) {
                    // No tiene vehículos: mostrar feedback visual
                    this.showNoVehiclesFeedback(clickedBase);
                } else {
                    // Tiene vehículos: seleccionar
                    this.game.selectedBase = clickedBase;
                    
                    // Reproducir sonido específico del HQ
                    if (clickedBase.type === 'hq') {
                        this.game.audio.playHQSound();
                    } else {
                    }
                }
            } else if (this.game.selectedBase === clickedBase) {
                this.game.selectedBase = null;
            } else {
                // 🆕 NUEVO: No permitir enviar a nodos disabled
                if (clickedBase.disabled) {
                    console.log('⚠️ No se puede enviar convoy: nodo destino deshabilitado');
                    return;
                }
                
                // 🆕 NUEVO: No permitir enviar desde nodos disabled
                if (this.game.selectedBase.disabled) {
                    console.log('⚠️ No se puede enviar convoy: nodo origen deshabilitado');
                    return;
                }
                
                // No permitir enviar a nodos abandonando
                if (clickedBase.isAbandoning) {
                    console.log('⚠️ No se puede enviar convoy: nodo abandonando');
                    return;
                }
                
                // Enviar convoy, ambulancia o vehículo desde hospital
                
                // HOSPITAL DE CAMPAÑA: Enviar vehículo médico
                if (this.game.selectedBase.canDispatchMedical && this.game.selectedBase.type === 'campaignHospital') {
                    if (clickedBase.type === 'front' && this.game.medicalSystem.hasEmergency(clickedBase.id)) {
                        // Verificar rango
                        const distance = Math.hypot(
                            clickedBase.x - this.game.selectedBase.x,
                            clickedBase.y - this.game.selectedBase.y
                        );
                        
                        if (distance > this.game.selectedBase.actionRange) {
                            console.log(`⚠️ Frente fuera de rango (${distance.toFixed(0)}px > ${this.game.selectedBase.actionRange}px)`);
                            return;
                        }
                        
                        if (this.game.selectedBase.availableVehicles > 0) {
                            this.game.convoyManager.createMedicalRoute(this.game.selectedBase, clickedBase);
                            this.game.audio.playSound('dispatch');
                            console.log(`🚑 Ambulancia enviada desde hospital a frente`);
                            
                            // Deseleccionar solo si NO se mantiene Shift
                            if (!shiftPressed) {
                                this.game.selectedBase = null;
                            }
                        } else {
                            console.log('⚠️ Hospital sin vehículos disponibles');
                        }
                    } else {
                        console.log('⚠️ Solo se puede enviar ambulancia a frentes con emergencia médica');
                    }
                }
                // HQ EN MODO MÉDICO: Enviar ambulancia
                else if (this.game.selectedBase.type === 'hq' && 
                    this.game.selectedBase.selectedResourceType === 'medical') {
                    // MODO MÉDICO: Solo enviar a frentes con emergencia
                    if (clickedBase.type === 'front' && this.game.medicalSystem.hasEmergency(clickedBase.id)) {
                        if (this.game.selectedBase.hasAmbulanceAvailable()) {
                            this.game.convoyManager.createMedicalRoute(this.game.selectedBase, clickedBase);
                            this.game.audio.playSound('dispatch');
                            
                            // Deseleccionar solo si NO se mantiene Shift
                            if (!shiftPressed) {
                                this.game.selectedBase = null;
                            }
                        } else {
                        }
                    } else {
                    }
                } else {
                    // Tutorial: Verificar permisos para enviar convoy
                    if (this.game.tutorialManager && this.game.tutorialManager.isTutorialActive) {
                        if (!this.game.tutorialManager.isActionAllowed('canSendConvoy')) {
                            console.log('⚠️ Tutorial: No puedes enviar convoyes aún');
                            return;
                        }
                    }
                    
                    // MODO MUNICIÓN: Convoy normal
                    this.game.convoyManager.createRoute(this.game.selectedBase, clickedBase);
                    
                    // Tutorial: Detectar acciones
                    if (this.game.tutorialManager && this.game.tutorialManager.isTutorialActive) {
                        if (clickedBase.type === 'front') {
                            this.game.tutorialManager.notifyAction('convoy_sent_to_front', { 
                                from: this.game.selectedBase.type, 
                                to: clickedBase.type 
                            });
                        } else if (clickedBase.type === 'fob') {
                            this.game.tutorialManager.notifyAction('convoy_sent_to_fob', { 
                                from: this.game.selectedBase.type, 
                                to: clickedBase.type 
                            });
                        }
                    }
                    
                    // Deseleccionar solo si NO se mantiene Shift
                    if (!shiftPressed) {
                        this.game.selectedBase = null;
                    }
                }
            }
        } else {
            // Click en espacio vacío -> no hacer nada (mantener selección)
        }
    }
    
    /**
     * Detecta click en botones del selector de recursos del HQ
     */
    checkResourceSelectorClick(x, y, base) {
        if (base.type !== 'hq') return null;
        
        const buttonSize = 35; // +15% más grande (30 * 1.15 = 35)
        const buttonRadius = buttonSize / 2;
        const spacing = 10;
        const baseY = base.y - base.radius - 75; // Subido 15% más (de -65 a -75)
        const hitboxPadding = 5; // Padding extra para hitbox circular
        
        // Botón munición (CIRCULAR)
        const ammoCenterX = base.x - buttonRadius - spacing/2;
        const ammoCenterY = baseY + buttonRadius;
        const ammoDistance = Math.hypot(x - ammoCenterX, y - ammoCenterY);
        
        if (ammoDistance < buttonRadius + hitboxPadding) {
            return 'ammo';
        }
        
        // Botón médico (CIRCULAR)
        const medCenterX = base.x + buttonRadius + spacing/2;
        const medCenterY = baseY + buttonRadius;
        const medDistance = Math.hypot(x - medCenterX, y - medCenterY);
        
        if (medDistance < buttonRadius + hitboxPadding) {
            return 'medical';
        }
        
        return null;
    }
    
    /**
     * Maneja mouse down en el canvas
     */
    handleCanvasMouseDown(e) {
        // Bloquear input si el menú de pausa u otros overlays están visibles
        if (this.shouldBlockGameInput()) {
            return;
        }
        
        const rect = this.game.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Convertir de coordenadas CSS escaladas a coordenadas del juego
        const scaleX = this.game.canvas.width / rect.width;
        const scaleY = this.game.canvas.height / rect.height;
        let x = clickX * scaleX;
        let y = clickY * scaleY;
        
        // Convertir a coordenadas del mundo si la cámara está activa
        if (this.game.camera) {
            const worldPos = this.game.camera.screenToWorld(x, y);
            x = worldPos.x;
            y = worldPos.y;
            
            // Transformar coordenadas para Mirror View (player2)
            const transformed = this.transformMirrorCoordinates(x, y);
            x = transformed.x;
            y = transformed.y;
        }
        
        // Delegar al editor si está en modo editor
        if (this.game.state === 'editor') {
            if (this.game.mapEditor && this.game.mapEditor.active) {
                this.game.mapEditor.handleMouseDown(x, y);
            }
        }
    }
    
    /**
     * Maneja mouse up en el canvas
     */
    handleCanvasMouseUp(e) {
        // Bloquear input si el menú de pausa u otros overlays están visibles
        if (this.shouldBlockGameInput()) {
            return;
        }
        
        // Delegar al editor si está en modo editor
        if (this.game.state === 'editor') {
            if (this.game.mapEditor && this.game.mapEditor.active) {
                this.game.mapEditor.handleMouseUp();
            }
        }
    }
    
    /**
     * Maneja teclas presionadas
     */
    handleKeyDown(e) {
        // Delegar al editor si está activo
        if (this.game.state === 'editor' && this.game.mapEditor && this.game.mapEditor.active) {
            this.game.mapEditor.handleKeyDown(e.key);
            return;
        }
        
        // F1: Toggle modo debug visual (hitboxes, rangos, vectores)
        if (e.key === 'F1') {
            e.preventDefault();
            this.game.debugVisualMode = !this.game.debugVisualMode;
            console.log(this.game.debugVisualMode ? '🔍 DEBUG VISUAL: Activado (hitboxes, rangos, vectores)' : '✅ DEBUG VISUAL: Desactivado');
            return;
        }
        
        // ESC para pausar/reanudar el juego
        if (e.key === 'Escape') {
            // Si las opciones están visibles, las opciones manejan su propio ESC
            if (this.game.options && this.game.options.isVisible) {
                return;
            }
            
            // Si el menú de pausa está visible, cerrarlo (reanudar juego)
            if (this.isPauseMenuVisible()) {
                e.preventDefault();
                this.game.togglePause(); // Esto cerrará el menú y reanudará
                return;
            }
            
            // No abrir menú de pausa si estamos en el menú principal o tutorial
            if (this.game.state === 'menu') {
                return;
            }
            
            // Si está en modo construcción enemiga, cancelar
            if (this.game.debugEnemyBuildMode) {
                this.game.debugEnemyBuildMode = false;
                console.log('✅ MODO DEBUG: Construcción enemiga cancelada');
                return;
            }
            
            // Si está en modo dron enemigo, cancelar
            if (this.game.debugEnemyDroneMode) {
                this.game.debugEnemyDroneMode = false;
                console.log('✅ MODO DEBUG: Lanzamiento de dron enemigo cancelado');
                return;
            }
            
            // Si está en modo sniper enemigo, cancelar
            if (this.game.debugEnemySniperMode) {
                this.game.debugEnemySniperMode = false;
                console.log('✅ MODO DEBUG: Sniper enemigo cancelado');
                return;
            }
            
            // Abrir menú de pausa
            this.game.togglePause();
        }
        
        
        // Comandos de debug para testear sistema anti-drones
        if (this.game.debugMode && this.game.state === 'playing') {
            // F2: Toggle modo construcción de edificios ENEMIGOS
            if (e.key === 'F2') {
                e.preventDefault();
                if (!this.game.debugEnemyBuildMode) {
                    this.game.debugEnemyBuildMode = true;
                    console.log('🔴 MODO DEBUG: Colocar edificios ENEMIGOS activado (click para colocar, ESC para cancelar)');
                } else {
                    this.game.debugEnemyBuildMode = false;
                    console.log('✅ MODO DEBUG: Construcción enemiga desactivada');
                }
            }
            
            // F3: Lanzar dron ENEMIGO hacia el FOB con menor Y (más arriba)
            if (e.key === 'F3') {
                e.preventDefault();
                const allyFOBs = this.game.bases.filter(b => b.type === 'fob');
                
                if (allyFOBs.length > 0) {
                    // Encontrar el FOB con menor Y (más arriba en la pantalla)
                    const topFOB = allyFOBs.reduce((prev, current) => 
                        (prev.y < current.y) ? prev : current
                    );
                    
                    this.game.droneSystem.launchDrone(
                        this.game.canvas.width, // Desde el borde derecho
                        topFOB.y,
                        topFOB,
                        true // Es un dron ENEMIGO
                    );
                    console.log(`🎯 Dron ENEMIGO lanzado hacia FOB superior en Y=${topFOB.y.toFixed(0)} (modo debug)`);
                } else {
                    console.log('⚠️ No hay FOBs aliados para atacar');
                }
            }
            
            // F4: Mostrar info del sistema anti-drones
            if (e.key === 'F4') {
                e.preventDefault();
                const info = this.game.antiDroneSystem.getDebugInfo();
                console.log('📊 Sistema Anti-Drones:', info);
                console.log('📊 Drones activos:', this.game.droneSystem.getDrones().map(d => ({
                    isEnemy: d.isEnemy,
                    x: d.x.toFixed(0),
                    y: d.y.toFixed(0),
                    target: d.target?.type || d.target?.name
                })));
            }
        }
    }
    
    /**
     * Maneja teclas soltadas
     */
    handleKeyUp(e) {
        // Detectar cuando se suelta Shift
        if (e.key === 'Shift') {
            // Deseleccionar edificio si hay uno seleccionado
            if (this.game.selectedBase) {
                this.game.selectedBase = null;
                console.log('⬆️ Shift soltado - Edificio deseleccionado');
            }
        }
    }
    
    /**
     * Maneja movimiento del mouse en el canvas
     */
    handleCanvasMouseMove(e) {
        // Bloquear input si el menú de pausa u otros overlays están visibles
        // PERO permitir movimiento del mouse para hover (solo bloquear acciones)
        // Por ahora permitimos el movimiento para mantener la UI responsive
        
        const rect = this.game.canvas.getBoundingClientRect();
        const moveX = e.clientX - rect.left;
        const moveY = e.clientY - rect.top;
        
        // Convertir de coordenadas CSS escaladas a coordenadas del juego
        const scaleX = this.game.canvas.width / rect.width;
        const scaleY = this.game.canvas.height / rect.height;
        this.mouseX = moveX * scaleX;
        this.mouseY = moveY * scaleY;
        
        // Convertir a coordenadas del mundo (cámara siempre activa)
        const worldPos = this.game.camera.screenToWorld(this.mouseX, this.mouseY);
        this.mouseX = worldPos.x;
        this.mouseY = worldPos.y;
        
        // Transformar coordenadas para Mirror View (player2)
        const transformed = this.transformMirrorCoordinates(this.mouseX, this.mouseY);
        this.mouseX = transformed.x;
        this.mouseY = transformed.y;
        
        // Delegar hover a la tienda si está visible
        if (this.game.storeUI && this.game.storeUI.isVisible) {
            this.game.storeUI.handleMouseMove(this.mouseX, this.mouseY);
        }
        
        // Delegar al editor si está en modo editor
        if (this.game.state === 'editor') {
            if (this.game.mapEditor && this.game.mapEditor.active) {
                this.game.mapEditor.handleMouseMove(this.mouseX, this.mouseY);
            }
            return;
        }
        
        // OPTIMIZACIÓN: Throttle de detección de hover (solo cada 50ms)
        const currentTime = Date.now();
        if (currentTime - this.lastHoverCheckTime >= this.hoverCheckInterval) {
            const baseAtMouse = this.getBaseAt(this.mouseX, this.mouseY);
            const buildingAtMouse = this.getBuildingAt(this.mouseX, this.mouseY);
            
            // Actualizar hover de edificios (no permitir hover sobre nodos abandonando)
            this.game.hoveredBuilding = (buildingAtMouse && !buildingAtMouse.isAbandoning) ? buildingAtMouse : null;
            
            // Si estamos sobre un HQ, siempre mostrarlo (si no está abandonando)
            if (baseAtMouse && baseAtMouse.type === 'hq' && !baseAtMouse.isAbandoning) {
                this.game.hoveredBase = baseAtMouse;
            } 
            // Si estamos sobre el área del selector de recursos de un HQ, mantener el hover del HQ
            else if (this.isMouseOverResourceSelector(this.mouseX, this.mouseY)) {
                // Mantener el hover del HQ si existe
                if (!this.game.hoveredBase || this.game.hoveredBase.type !== 'hq') {
                    // Buscar el HQ más cercano
                    const hq = this.game.bases.find(b => b.type === 'hq');
                    if (hq && !hq.isAbandoning) this.game.hoveredBase = hq;
                }
            }
            else {
                // No permitir hover sobre nodos abandonando
                this.game.hoveredBase = (baseAtMouse && !baseAtMouse.isAbandoning) ? baseAtMouse : null;
            }
            
            // Gestionar inicio/reset del temporizador de tooltip
            const newHoverTarget = buildingAtMouse || baseAtMouse || null;
            if (newHoverTarget !== this.hoverTargetCache) {
                this.hoverTargetCache = newHoverTarget;
                this.hoverStartTime = currentTime;
                this.game.hoverTooltip = null; // Ocultar tooltip si cambia objetivo
            } else {
                // Si llevamos suficiente tiempo sobre el mismo objetivo, construir tooltip
                if (this.hoverTargetCache && currentTime - this.hoverStartTime >= this.hoverDelayMs) {
                    this.game.hoverTooltip = this.buildHoverTooltip(this.hoverTargetCache, this.mouseX, this.mouseY);
                }
            }
            
            this.lastHoverCheckTime = currentTime;
        }
        
        // Detectar si el mouse está sobre un icono de efecto (THROTTLED para rendimiento)
        if (currentTime - this.lastEffectCheckTime >= this.effectCheckInterval) {
            this.checkEffectHover(this.mouseX, this.mouseY);
            this.lastEffectCheckTime = currentTime;
        }
    }

    /**
     * Construye el contenido del tooltip de hover prolongado
     */
    buildHoverTooltip(target, mouseX, mouseY) {
        // Determinar si es base o edificio
        const isBase = typeof target.type === 'string' && !target.spriteKey;
        let name = '';
        let description = '';
        let ranges = [];
        
        if (isBase) {
            // Bases: hq, fob, front (diferenciados por team)
            const type = target.type;
            const config = getNodeConfig(type);
            
            if (config) {
                name = config.name;
                description = config.description;
            } else {
                name = 'Nodo';
                description = 'Nodo del mapa.';
            }
        } else {
            // Edificios construidos
            const config = getNodeConfig(target.type);
            name = config?.name || target.type;
            description = config?.description || 'Edificio.';
            
            // Rango de acción/alerta/detección si aplica
            if (config?.actionRange) {
                ranges.push({ radius: config.actionRange, color: 'rgba(0, 255, 100, 0.6)', dash: [10, 5] });
            }
            if (config?.detectionRange) {
                ranges.push({ radius: config.detectionRange, color: 'rgba(255, 200, 0, 0.6)', dash: [10, 5] });
            }
            if (config?.alertRange) {
                ranges.push({ radius: config.alertRange, color: 'rgba(255, 120, 0, 0.5)', dash: [6, 6] });
            }
        }
        
        return {
            x: mouseX,
            y: mouseY,
            anchorX: target.x,
            anchorY: target.y,
            name,
            description,
            ranges
        };
    }
    
    checkEffectHover(mouseX, mouseY) {
        this.game.hoveredEffect = null;
        
        // Optimización: salir temprano si no hay bases con efectos
        const basesWithEffects = this.game.bases.filter(b => b.effects && b.effects.length > 0);
        if (basesWithEffects.length === 0) return;
        
        // Revisar solo las bases con efectos
        for (const base of basesWithEffects) {
            
            // Configuración (debe coincidir con RenderSystem.renderEffects)
            const iconSize = 36;
            const spacing = 6;
            const iconsPerRow = 3;
            const startY = base.y - base.radius - 60;
            const totalWidth = (iconSize + spacing) * iconsPerRow - spacing;
            const startX = base.x - totalWidth / 2;
            
            // Revisar cada efecto
            for (let i = 0; i < base.effects.length; i++) {
                const row = Math.floor(i / iconsPerRow);
                const col = i % iconsPerRow;
                
                const x = startX + col * (iconSize + spacing);
                const y = startY + row * (iconSize + spacing);
                
                // Verificar si el mouse está sobre este icono
                if (mouseX >= x && mouseX <= x + iconSize &&
                    mouseY >= y && mouseY <= y + iconSize) {
                    this.game.hoveredEffect = {
                        tooltip: base.effects[i].tooltip,
                        x: mouseX,
                        y: mouseY
                    };
                    return;
                }
            }
        }
    }
    
    /**
     * Verifica si el mouse está sobre el área del selector de recursos
     */
    isMouseOverResourceSelector(x, y) {
        const hq = this.game.bases.find(b => b.type === 'hq');
        if (!hq) return false;
        
        const buttonSize = 35; // +15% más grande (30 * 1.15 = 35)
        const buttonRadius = buttonSize / 2;
        const spacing = 10;
        const baseY = hq.y - hq.radius - 75; // Subido 15% más (de -65 a -75)
        const hoverPadding = 10; // Padding extra para área de hover
        
        // Verificar si el mouse está cerca de alguno de los dos botones circulares
        const ammoCenterX = hq.x - buttonRadius - spacing/2;
        const ammoCenterY = baseY + buttonRadius;
        const ammoDistance = Math.hypot(x - ammoCenterX, y - ammoCenterY);
        
        const medCenterX = hq.x + buttonRadius + spacing/2;
        const medCenterY = baseY + buttonRadius;
        const medDistance = Math.hypot(x - medCenterX, y - medCenterY);
        
        return ammoDistance < buttonRadius + hoverPadding || medDistance < buttonRadius + hoverPadding;
    }
    
    /**
     * Encuentra un nodo en las coordenadas dadas
     */
    getNodeAt(x, y) {
        // En modo tutorial, usar los nodos del tutorial
        const nodes = (this.game.state === 'tutorial' && this.game.tutorialManager?.tutorialNodes)
            ? this.game.tutorialManager.tutorialNodes
            : this.game.nodes;
        
        for (const node of nodes) {
            if (!node.active) continue;
            // Edificios en construcción no se pueden seleccionar
            if (node.isConstructing) continue;
            
            // HQs y FOBs tienen hitbox más grande (+40% = 1.4x)
            const hitboxMultiplier = (node.type === 'hq' || node.type === 'fob') ? 1.4 : 1.2;
            
            const dist = Math.hypot(x - node.x, y - node.y);
            const effectiveHitboxRadius = (node.hitboxRadius || node.radius) * hitboxMultiplier;
            if (dist < effectiveHitboxRadius) {
                return node;
            }
        }
        return null;
    }
    
    /**
     * COMPATIBILIDAD: Encuentra una base en las coordenadas dadas
     */
    getBaseAt(x, y) {
        return this.getNodeAt(x, y);
    }
    
    /**
     * COMPATIBILIDAD: Encuentra un edificio en las coordenadas dadas
     */
    getBuildingAt(x, y) {
        const node = this.getNodeAt(x, y);
        return node && node.category === 'buildable' ? node : null;
    }
    
    /**
     * Muestra feedback visual cuando no hay vehículos
     */
    showNoVehiclesFeedback(base) {
        base.noVehiclesShake = true;
        base.noVehiclesShakeTime = 0;
        
        setTimeout(() => {
            base.noVehiclesShake = false;
        }, 500);
    }
    
    /**
     * Obtiene la posición actual del mouse
     */
    getMousePosition() {
        return { x: this.mouseX, y: this.mouseY };
    }
    
    /**
     * Actualiza el tooltip de hover (llamado desde el game loop)
     */
    updateHoverTooltip() {
        const currentTime = Date.now();
        
        // Solo actualizar si hay un objetivo en hover y no hay tooltip visible
        if (this.hoverTargetCache && !this.game.hoverTooltip) {
            // Verificar si ha pasado suficiente tiempo
            if (currentTime - this.hoverStartTime >= this.hoverDelayMs) {
                this.game.hoverTooltip = this.buildHoverTooltip(this.hoverTargetCache, this.mouseX, this.mouseY);
            }
        }
    }
    
    /**
     * Maneja click derecho - Cancela modo construcción/drone
     */
    handleRightClick(e) {
        e.preventDefault(); // Prevenir menú contextual del navegador
        
        // Bloquear input si el menú de pausa u otros overlays están visibles
        if (this.shouldBlockGameInput()) {
            return;
        }
        
        // Si está en modo construcción o drone, cancelarlo
        if (this.game.state === 'playing') {
            if (this.game.buildSystem.buildMode) {
                this.game.buildSystem.exitBuildMode();
                console.log('🚫 Construcción cancelada (click derecho)');
                return;
            }
            if (this.game.buildSystem.droneMode) {
                this.game.buildSystem.exitDroneMode();
                console.log('🚫 Modo dron cancelado (click derecho)');
                return;
            }
            if (this.game.buildSystem.sniperMode) {
                this.game.buildSystem.exitSniperMode();
                console.log('🚫 Modo francotirador cancelado (click derecho)');
                return;
            }
            if (this.game.buildSystem.fobSabotageMode) {
                this.game.buildSystem.exitFobSabotageMode();
                console.log('🚫 Modo sabotaje FOB cancelado (click derecho)');
                return;
            }
        }
        
        // Deseleccionar edificio con click derecho
        if (this.game.selectedBase) {
            this.game.selectedBase = null;
            console.log('🚫 Edificio deseleccionado (click derecho)');
        }
    }
    
    /**
     * Coloca una torreta anti-drone ENEMIGA (modo debug)
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     */
    placeEnemyAntiDrone(x, y) {
        const config = getNodeConfig('antiDrone');
        if (!config) {
            console.error('⚠️ No se encontró configuración de anti-drone');
            return;
        }
        
        // Crear el edificio enemigo directamente
        const enemyBuilding = new VisualNode(x, y, 'antiDrone', config, this.game);
        enemyBuilding.isEnemy = true; // Marcar como edificio enemigo
        enemyBuilding.isConstructing = false; // Ya construido
        enemyBuilding.constructed = true;
        enemyBuilding.hasPlayedSpawnSound = true; // Ya está construido, no reproducir spawn
        
        this.game.nodes.push(enemyBuilding);
        
        this.game.particleSystem.createExplosion(x, y, 10, '#ff0000', 500);
        this.game.audio.playPlaceBuildingSound();
        
        console.log(`🔴 Torreta anti-drone ENEMIGA colocada en (${x.toFixed(0)}, ${y.toFixed(0)})`);
    }
    
    
    // ===== FUNCIONES DE SELECTOR DE DIFICULTAD =====
    
    // ELIMINADO: Selector de dificultad singleplayer (ahora se configura en el lobby)
    
    // ===== FUNCIONES DE LOBBY UNIFICADO =====
    
    async showMultiplayerLobby() {
        // Ocultar menú principal
        this.game.ui.hideElement('main-menu-overlay');
        
        // Mostrar lobby
        this.game.ui.showElement('multiplayer-lobby-overlay');
        
        // Conectar al servidor
        try {
            await this.game.network.connect();
            document.getElementById('lobby-status').textContent = 'Conectado al servidor ✅';
        } catch (error) {
            console.error('Error al conectar:', error);
            document.getElementById('lobby-status').textContent = 'Error: No se pudo conectar al servidor ❌';
        }
    }
    
    addAIPlayer() {
        // Mostrar configuración de IA
        document.getElementById('ai-slot-empty').style.display = 'none';
        document.getElementById('ai-slot-config').style.display = 'block';
        
        // Notificar al servidor que se añadió una IA
        const aiRace = document.getElementById('ai-race-select').value;
        const aiDifficulty = document.getElementById('ai-difficulty-select').value;
        
        if (this.game.network && this.game.network.socket) {
            this.game.network.socket.emit('add_ai_player', {
                race: aiRace,
                difficulty: aiDifficulty
            });
        }
        
        console.log(`🤖 IA añadida: ${aiRace} (${aiDifficulty})`);
        
        // 🆕 NUEVO: Configurar listeners para los dropdowns de IA
        this.setupAIDropdownListeners();
    }
    
    setupAIDropdownListeners() {
        const raceSelect = document.getElementById('ai-race-select');
        const difficultySelect = document.getElementById('ai-difficulty-select');
        
        if (raceSelect) {
            raceSelect.onchange = () => {
                const newRace = raceSelect.value;
                const newDifficulty = difficultySelect.value;
                
                if (this.game.network && this.game.network.socket) {
                    this.game.network.socket.emit('update_ai_player', {
                        race: newRace,
                        difficulty: newDifficulty
                    });
                    console.log(`🤖 IA actualizada: ${newRace} (${newDifficulty})`);
                }
            };
        }
        
        if (difficultySelect) {
            difficultySelect.onchange = () => {
                const newRace = raceSelect.value;
                const newDifficulty = difficultySelect.value;
                
                if (this.game.network && this.game.network.socket) {
                    this.game.network.socket.emit('update_ai_player', {
                        race: newRace,
                        difficulty: newDifficulty
                    });
                    console.log(`🤖 IA actualizada: ${newRace} (${newDifficulty})`);
                }
            };
        }
    }
    
    removeAIPlayer() {
        // Ocultar configuración de IA
        document.getElementById('ai-slot-empty').style.display = 'block';
        document.getElementById('ai-slot-config').style.display = 'none';
        
        // Notificar al servidor que se quitó la IA
        if (this.game.network && this.game.network.socket) {
            this.game.network.socket.emit('remove_ai_player');
        }
        
        console.log('🤖 IA eliminada');
    }
    
    hideMultiplayerLobby() {
        // Salir de la sala si estaba en una
        if (this.game.network && this.game.network.roomId) {
            this.game.network.leaveRoom();
        }
        
        // Resetear vistas del lobby
        const initialView = document.getElementById('lobby-initial-view');
        const roomView = document.getElementById('lobby-room-view');
        if (initialView) initialView.style.display = 'block';
        if (roomView) roomView.style.display = 'none';
        
        // Ocultar inputs
        const roomCodeInput = document.getElementById('room-code-input-container');
        if (roomCodeInput) roomCodeInput.style.display = 'none';
        
        // Volver al menú principal
        this.game.ui.hideElement('multiplayer-lobby-overlay');
        this.game.ui.showElement('main-menu-overlay');
    }
    
    createMultiplayerRoom() {
        const playerName = prompt('Tu nombre:', 'Jugador 1') || 'Jugador 1';
        this.game.network.createRoom(playerName);
        // La UI se actualiza automáticamente con room_created
    }
    
    showJoinRoomInput() {
        const container = document.getElementById('room-code-input-container');
        container.style.display = 'block';
        document.getElementById('room-code-input').focus();
    }
    
    joinRoomWithCode() {
        const roomCode = document.getElementById('room-code-input').value.toUpperCase().trim();
        
        if (roomCode.length !== 4) {
            alert('El código debe tener 4 caracteres');
            return;
        }
        
        const playerName = prompt('Tu nombre:', 'Jugador 2') || 'Jugador 2';
        this.game.network.joinRoom(roomCode, playerName);
    }
}

