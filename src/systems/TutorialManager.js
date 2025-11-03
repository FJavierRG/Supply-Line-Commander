// ===== TUTORIAL MANAGER: INSTANCIA AISLADA DEL JUEGO PARA TUTORIAL =====
import { TUTORIAL_MAP, TUTORIAL_STEPS } from './TutorialConfig.js';
import { VisualNode } from '../entities/visualNode.js';
import { Convoy } from '../entities/Convoy.js';
import { VEHICLE_TYPES, GAME_CONFIG } from '../config/constants.js';
import { BackgroundTileSystem } from './BackgroundTileSystem.js';
import { getNodeConfig } from '../config/nodes.js';

/**
 * TutorialManager - Maneja una instancia completamente aislada del juego para el tutorial
 * Esta clase crea su propio "mini-juego" con eventos scripteados y control total
 */
export class TutorialManager {
    constructor(game) {
        this.game = game; // Referencia al juego principal (solo para acceder a renderer, assets, etc.)
        
        // Estado del tutorial (completamente independiente del juego)
        this.active = false;
        this.currentStep = 0;
        this.steps = TUTORIAL_STEPS;
        
        // Nodos del tutorial (separados del juego principal)
        this.tutorialNodes = [];
        this.tutorialConvoys = [];
        
        // UI del tutorial
        this.overlayElement = null;
        this.textBoxElement = null;
        
        // Control de interactividad
        this.allowedActions = {
            canSelectHQ: false,
            canSelectFOB: false,
            canSendConvoy: false,
            canOpenStore: false,
            canBuildFOB: false,
            canBuildOther: false,
            canUseDrone: false,
            canUseSniper: false
        };
        
        // Control de auto-avance
        this.autoAdvanceTriggered = false;
        
        // Timer para revelar mapa
        this.revealTimer = 0;
        this.mapRevealed = false;
        
        this.createUIElements();
    }
    
    /**
     * Crea los elementos UI del tutorial
     */
    createUIElements() {
        // Overlay principal (sin fondo, lo manejará el canvas)
        this.overlayElement = document.createElement('div');
        this.overlayElement.id = 'tutorial-overlay';
        this.overlayElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 10000;
            display: none;
            pointer-events: none;
        `;
        
        // Canvas para el oscurecimiento y spotlight
        this.spotlightCanvas = document.createElement('canvas');
        this.spotlightCanvas.id = 'tutorial-spotlight';
        this.spotlightCanvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10000;
        `;
        
        // Caja de texto
        this.textBoxElement = document.createElement('div');
        this.textBoxElement.id = 'tutorial-textbox';
        this.textBoxElement.style.cssText = `
            position: fixed;
            top: 50px;
            left: calc(50% + 50px);
            transform: translateX(-50%);
            width: 500px;
            padding: 30px;
            background-image: url('assets/sprites/ui/UIFrames/store_desplegable.png');
            background-size: 100% 100%;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 15px;
            line-height: 1.6;
            z-index: 10001;
            pointer-events: auto;
        `;
        
        // Botón de salir (permanente, fuera de la caja de texto)
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
            z-index: 10002;
            pointer-events: auto;
        `;
        this.exitButton.onclick = () => this.exitTutorial();
        
        this.overlayElement.appendChild(this.spotlightCanvas);
        this.overlayElement.appendChild(this.textBoxElement);
        this.overlayElement.appendChild(this.exitButton);
        document.body.appendChild(this.overlayElement);
    }
    
    /**
     * Inicia el tutorial
     */
    startTutorial() {
        console.log('🎓 Iniciando tutorial aislado...');
        console.log('🎮 Estado del juego antes:', this.game.state);
        
        this.active = true;
        this.currentStep = 0;
        
        // Inicializar el mundo del tutorial (necesario para el fondo)
        this.game.worldWidth = GAME_CONFIG.BASE_WIDTH;
        this.game.worldHeight = GAME_CONFIG.BASE_HEIGHT;
        
        // Inicializar sistema de tiles del fondo si no existe
        if (!this.game.backgroundTiles) {
            this.game.backgroundTiles = new BackgroundTileSystem(this.game.worldWidth, this.game.worldHeight, 60);
            console.log('✅ Sistema de tiles del fondo inicializado');
        }
        
        // Resetear currency a 0 para el tutorial
        this.game.currency.reset();
        console.log('💰 Currency del tutorial: 0$');
        
        // Desactivar countdown y temporizador de misión
        this.game.countdown = 0;
        this.game.missionStarted = true; // Marcar como iniciada para evitar countdown
        
        // Inicializar UI del tutorial (mostrar currency y tienda)
        this.game.ui.setupMissionUI([]); // Array vacío porque los nodos se crean después
        
        // Ocultar elementos UI hasta que se necesiten
        const timerDisplay = document.getElementById('timer-display');
        if (timerDisplay) timerDisplay.style.display = 'none';
        
        const currencyDisplay = document.getElementById('fob-currency-display');
        if (currencyDisplay) currencyDisplay.style.display = 'none';
        
        // Ocultar la tienda (se controla por isVisible)
        this.game.storeUI.isVisible = false;
        
        console.log('🎨 UI del tutorial inicializada (oculta)');
        
        // Reproducir música de victoria al 50% durante el tutorial
        if (this.game.audio && this.game.audio.music.victoryMarch) {
            const originalVolume = this.game.audio.music.victoryMarch.volume;
            this.tutorialOriginalMusicVolume = originalVolume; // Guardar volumen original
            this.game.audio.music.victoryMarch.volume = originalVolume * 0.4; // 50% del volumen
            this.game.audio.music.victoryMarch.loop = true; // Activar loop para el tutorial
            this.game.audio.playVictoryMarch();
        }
        
        // Crear nodos del tutorial
        this.createTutorialMap();
        
        // Mostrar overlay
        this.overlayElement.style.display = 'block';
        
        // Mostrar primer paso
        this.showStep(0);
        
        console.log('🎮 Estado del juego después:', this.game.state);
        console.log('✅ Tutorial activo:', this.active);
        
        // IMPORTANTE: Reiniciar el gameLoop si no está corriendo
        if (!this.game.lastTime || this.game.lastTime === 0) {
            console.log('🔄 Reiniciando gameLoop para el tutorial...');
            this.game.lastTime = Date.now();
            this.game.gameLoop();
        }
    }
    
    /**
     * Crea el mapa del tutorial (completamente separado del juego)
     */
    createTutorialMap() {
        this.tutorialNodes = [];
        
        console.log('🔧 Creando mapa del tutorial...');
        console.log('📋 Nodos a crear:', TUTORIAL_MAP.nodes);
        
        TUTORIAL_MAP.nodes.forEach((nodeData, index) => {
            console.log(`🔧 Creando nodo ${index + 1}:`, nodeData);
            
            const config = getNodeConfig(nodeData.type);
            const node = new VisualNode(
                nodeData.x,
                nodeData.y,
                nodeData.type,
                {
                    ...config,
                    team: nodeData.team,
                    supplies: nodeData.supplies || undefined
                },
                null
            );
            
            if (node) {
                this.tutorialNodes.push(node);
                console.log(`✅ Nodo creado: ${node.type} en (${node.x}, ${node.y})`);
            } else {
                console.error(`❌ Error creando nodo: ${nodeData.type}`);
            }
        });
        
        console.log(`✅ Mapa del tutorial creado: ${this.tutorialNodes.length} nodos`);
        console.log('📍 Nodos finales:', this.tutorialNodes.map(n => `${n.type} (${n.x}, ${n.y})`));
    }
    
    /**
     * Muestra un paso del tutorial
     */
    showStep(stepIndex) {
        if (stepIndex >= this.steps.length) {
            this.endTutorial();
            return;
        }
        
        this.currentStep = stepIndex;
        const step = this.steps[stepIndex];
        
        // Resetear flags para el nuevo paso
        this.autoAdvanceTriggered = false;
        this.revealTimer = 0;
        this.mapRevealed = false;
        this.pauseTimer = 0;
        this.simulationPaused = false;
        
        // Actualizar permisos
        this.updatePermissions(step);
        
        // Actualizar spotlight
        this.updateSpotlightOverlay(step);
        
        // Mostrar texto (sin botón "Salir", solo "Siguiente")
        const showNextButton = !step.hideNextButton;
        
        this.textBoxElement.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #ffcc00;">${step.title}</h3>
            ${step.text}
            <div style="margin-top: 20px; text-align: right;">
                ${showNextButton ? `
                    <button id="tutorial-next-btn" style="
                        background-image: url('assets/sprites/ui/UIFrames/bton_background.png');
                        background-size: 100% 100%;
                        border: none;
                        color: white;
                        padding: 12px 25px;
                        font-size: 14px;
                        cursor: pointer;
                        font-weight: bold;
                    ">Siguiente</button>
                ` : ''}
            </div>
        `;
        
        // Event listeners
        if (showNextButton) {
            document.getElementById('tutorial-next-btn').onclick = () => this.nextStep();
        }
        
        // Hooks específicos por paso
        // Paso 8: forzar emergencia médica visible y pausar penalización
        if (step && step.autoAdvanceWhen === 'medical_resolved') {
            // Habilitar momentáneamente la simulación para disparar efectos/sonidos
            const allyFront = this.getNodeByType('front');
            if (allyFront) {
                // Forzar una emergencia inmediata en el frente aliado
                this.game.medicalSystem.startEmergency(allyFront);
                // Pausar simulación global (ya está allowSimulation=false en el step)
                // pero permitimos ambulancias moviéndose gestionándolo manualmente en update()
            }
        }
        
        console.log(`📖 Tutorial paso ${stepIndex + 1}/${this.steps.length}: ${step.title}`);
    }
    
    /**
     * Actualiza el overlay de spotlight según el paso actual
     */
    updateSpotlightOverlay(step) {
        const canvas = this.spotlightCanvas;
        const ctx = canvas.getContext('2d');
        
        // Ajustar tamaño del canvas a la ventana
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Si el mapa está revelado, no oscurecer nada
        if (this.mapRevealed) {
            return;
        }
        
        // Si no hay spotlight, no oscurecer nada
        if (!step.spotlight) {
            return;
        }
        
        // Oscurecer todo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Si hay un target, crear spotlight
        if (step.spotlightTarget) {
            const target = this.getNodeByType(step.spotlightTarget);
            
            if (target) {
                const radius = step.spotlightRadius || 80;
                const offsetX = step.spotlightOffsetX || 0;
                const offsetY = step.spotlightOffsetY || 0;
                
                // Obtener escalado del canvas una sola vez
                const canvas = this.game.canvas;
                const scaleX = canvas.offsetWidth / canvas.width;
                const scaleY = canvas.offsetHeight / canvas.height;
                
                // Convertir coordenadas del mundo a coordenadas de pantalla
                const screenPos = this.worldToScreen(target.x, target.y);
                
                // Escalar el radio para mantener proporción
                const scaledRadius = radius * Math.min(scaleX, scaleY);
                
                // Aplicar offsets específicos del paso (escalados)
                const finalX = screenPos.x + (offsetX * scaleX);
                // Añadir offset hacia abajo del 30% del diámetro escalado
                const diameterOffset = scaledRadius * 2 * 0.30; // 30% del diámetro hacia abajo
                const finalY = screenPos.y + (offsetY * scaleY) + diameterOffset;
                
                // Calcular radio del borde (ya tenemos scaledRadius)
                const scaledBorderRadius = (radius + 5) * Math.min(scaleX, scaleY);
                
                // Usar globalCompositeOperation para "cortar" el spotlight
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath();
                ctx.arc(finalX, finalY, scaledRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
                
                // Borde brillante alrededor del spotlight (también escalado)
                ctx.strokeStyle = '#ffcc00';
                ctx.lineWidth = 3 * Math.min(scaleX, scaleY); // Escalar grosor del borde
                ctx.setLineDash([8, 4]);
                ctx.beginPath();
                ctx.arc(finalX, finalY, scaledBorderRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }
    
    /**
     * Convierte coordenadas del mundo a coordenadas de pantalla
     * Considera el escalado CSS del canvas y su posición real en la página
     */
    worldToScreen(worldX, worldY) {
        const canvas = this.game.canvas;
        
        // 1. Aplicar transformación de cámara (aunque esté fija, puede tener offset)
        const cameraPos = this.game.camera.worldToScreen(worldX, worldY);
        
        // 2. Obtener escalado CSS del canvas
        // canvas.width/height = resolución interna fija (1920x1080)
        // canvas.offsetWidth/Height = tamaño visual en pantalla
        const scaleX = canvas.offsetWidth / canvas.width;
        const scaleY = canvas.offsetHeight / canvas.height;
        
        // 3. Obtener posición del canvas en la página
        const canvasRect = canvas.getBoundingClientRect();
        
        // 4. Aplicar transformaciones: coordenadas del mundo → CSS → posición en ventana
        return {
            x: canvasRect.left + (cameraPos.x * scaleX),
            y: canvasRect.top + (cameraPos.y * scaleY)
        };
    }
    
    /**
     * Avanza al siguiente paso
     */
    nextStep() {
        this.showStep(this.currentStep + 1);
    }
    
    /**
     * Actualiza los permisos según el paso actual
     */
    updatePermissions(step) {
        // RESETEAR todos los permisos primero
        this.allowedActions = {
            canSelectHQ: false,
            canSelectFOB: false,
            canSendConvoy: false,
            canOpenStore: false,
            canBuildFOB: false,
            canBuildOther: false,
            canUseDrone: false,
            canUseSniper: false
        };
        
        // Luego aplicar los permisos del paso actual
        if (step.permissions) {
            this.allowedActions = { ...this.allowedActions, ...step.permissions };
        }
    }
    
    /**
     * Verifica si una acción está permitida
     */
    isActionAllowed(action) {
        return this.allowedActions[action] === true;
    }
    
    /**
     * Notifica que el jugador realizó una acción (llamado desde InputHandler, BuildingSystem, etc.)
     */
    notifyAction(actionType, data = {}) {
        if (!this.active) return;
        
        const step = this.steps[this.currentStep];
        if (!step) return;
        
        console.log('🎯 Acción detectada:', actionType, data);
        
        // Verificar si esta acción dispara el auto-avance
        if (step.autoAdvanceWhen === actionType) {
            console.log('✅ Acción cumplida, avanzando al siguiente paso');
            console.log(`📊 Paso actual: ${this.currentStep}, Trigger esperado: ${step.autoAdvanceWhen}, Trigger recibido: ${actionType}`);
            this.autoAdvanceTriggered = true;
            
            setTimeout(() => {
                console.log(`🔄 Avanzando del paso ${this.currentStep} al ${this.currentStep + 1}`);
                this.nextStep();
            }, 500);
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
        this.tutorialNodes = [];
        this.tutorialConvoys = [];
        
        // Detener música del tutorial y restaurar volumen original
        if (this.game.audio && this.game.audio.music.victoryMarch) {
            this.game.audio.stopVictoryMarch();
            this.game.audio.music.victoryMarch.loop = false; // Restaurar loop a false
            if (this.tutorialOriginalMusicVolume !== undefined) {
                this.game.audio.music.victoryMarch.volume = this.tutorialOriginalMusicVolume;
            }
        }
        
        // Restaurar elementos UI del juego
        const timerDisplay = document.getElementById('timer-display');
        if (timerDisplay) timerDisplay.style.display = 'flex';
        
        // Volver al menú principal
        this.game.state = 'menu';
        this.game.ui.showMainMenu();
    }
    
    /**
     * Actualiza la lógica del tutorial (llamado cada frame)
     */
    update(dt) {
        if (!this.active) return;
        
        const step = this.steps[this.currentStep];
        
        // Timer para revelar el mapa y dar dinero
        if (step && step.revealMapAfter && !this.mapRevealed) {
            this.revealTimer += dt;
            
            if (this.revealTimer >= step.revealMapAfter) {
                console.log('🗺️ Revelando mapa completo');
                this.mapRevealed = true;
                
                // Dar dinero si el paso lo requiere
                if (step.giveMoneyAfter && step.moneyAmount) {
                    console.log(`💰 Dando dinero: ${step.moneyAmount}$`);
                    this.game.addMissionCurrency(step.moneyAmount);
                    console.log(`💰 Currency actual: ${this.game.currency.missionCurrency}$`);
                    // Forzar refresco inmediato de la HUD de currency
                    this.game.ui.updateHUD({
                        fobCurrency: this.game.currency.get(),
                        currencyRate: 0,
                        countdown: 0
                    });
                }
                
                // Activar permisos después de revelar
                if (step.permissionsAfterReveal) {
                    console.log('🔓 Activando permisos:', step.permissionsAfterReveal);
                    this.allowedActions = { ...this.allowedActions, ...step.permissionsAfterReveal };
                    console.log('🔓 Permisos actuales:', this.allowedActions);
                    
                    // Mostrar tienda y currency cuando se activan los permisos
                    if (step.permissionsAfterReveal.canOpenStore) {
                        // Mostrar la tienda (se renderiza en canvas)
                        this.game.storeUI.isVisible = true;
                        console.log('🏪 Tienda activada');
                        
                        // Mostrar display de currency
                        const currencyDisplay = document.getElementById('fob-currency-display');
                        if (currencyDisplay) {
                            currencyDisplay.style.display = 'flex';
                            console.log('💰 Currency visible');
                        }
                    }
                }
            }
        }
        
        // Timer para pausar simulación después de X segundos (paso 8)
        if (step && step.pauseSimulationAfter && !this.simulationPaused) {
            this.pauseTimer += dt;
            if (this.pauseTimer >= step.pauseSimulationAfter) {
                console.log('⏸️ Pausando simulación para evitar penalización');
                this.simulationPaused = true;
                
                // Congelar el tiempo de la emergencia médica activa
                const allyFront = this.getNodeByType('front');
                if (allyFront && this.game.medicalSystem.hasEmergency(allyFront.id)) {
                    const emergency = this.game.medicalSystem.getEmergency(allyFront.id);
                    if (emergency) {
                        // Guardar el tiempo transcurrido hasta ahora
                        const now = Date.now();
                        emergency.elapsedBeforePause = now - emergency.startTime;
                        // Congelar el startTime en el futuro para que no se agote
                        emergency.startTime = now + 999999999; // Tiempo muy lejano
                        console.log(`⏸️ Emergencia médica pausada: ${emergency.elapsedBeforePause}ms transcurridos`);
                    }
                }
            }
        }
        
        // Si el paso permite simulación Y no está pausado, actualizar nodos y convoyes
        if (step && step.allowSimulation && !this.simulationPaused) {
            const simulationSpeed = step.simulationSpeed || 1.0;
            const modifiedDt = dt * simulationSpeed;
            
            // Actualizar nodos con velocidad modificada
            this.tutorialNodes.forEach(node => {
                if (node.update) {
                    node.update(modifiedDt);
                }
            });
            
            // Actualizar convoyes con velocidad modificada (llegada/entrega/retorno)
            for (let i = this.tutorialConvoys.length - 1; i >= 0; i--) {
                const convoy = this.tutorialConvoys[i];
                const arrived = convoy.update(modifiedDt, 1);
                if (arrived) {
                    if (convoy.returning) {
                        // Devolver vehículo al origen
                        if (convoy.isMedical) {
                            if (convoy.originBase.type === 'hq') {
                                convoy.originBase.returnAmbulance();
                            } else if (convoy.originBase.type === 'campaignHospital') {
                                convoy.originBase.returnHospitalAmbulance();
                            }
                        } else {
                            convoy.originBase.returnVehicle();
                        }
                        this.tutorialConvoys.splice(i, 1);
                    } else {
                        // Entregar y comenzar retorno (usar la misma lógica del gestor principal)
                        this.game.convoyManager.deliverSupplies(convoy);
                        convoy.startReturning();
                    }
                }
            }
            
        // Verificar condiciones de auto-avance
            this.checkAutoAdvance(step);
        }
        
        // Paso 8: permitir que las ambulancias se muevan SIEMPRE, incluso cuando la simulación está pausada
        const isMedicalStep = step && step.autoAdvanceWhen === 'medical_resolved';
        if (isMedicalStep) {
            // Actualizar ambulancias SIEMPRE (incluso si la simulación está pausada)
            for (let i = this.tutorialConvoys.length - 1; i >= 0; i--) {
                const convoy = this.tutorialConvoys[i];
                if (!convoy.isMedical) continue;
                const arrived = convoy.update(dt, 1);
                if (arrived) {
                    if (convoy.returning) {
                        // devolver ambulancia al origen
                        if (convoy.originBase.type === 'hq') {
                            convoy.originBase.returnAmbulance();
                        } else if (convoy.originBase.type === 'campaignHospital') {
                            convoy.originBase.returnHospitalAmbulance();
                        }
                        this.tutorialConvoys.splice(i, 1);
                    } else {
                        // Resolver emergencia y comenzar retorno
                        this.game.medicalSystem.resolveEmergency(convoy.targetFrontId);
                        this.game.audio.playSound('delivery');
                        this.notifyAction('medical_resolved', { frontId: convoy.targetFrontId });
                        convoy.startReturning();
                    }
                }
            }
        }
        
        // Asegurar progreso de construcción SIEMPRE (aunque el paso no permita simulación)
        // Para que la FOB termine de construirse en el paso 4
        this.tutorialNodes.forEach(node => {
            if (node && node.isConstructing) {
                node.update(dt);
            }
        });
        
        // Actualizar spotlight cada frame (por si la cámara se mueve)
        if (step) {
            this.updateSpotlightOverlay(step);
        }

        // Actualizar HUD de currency cada frame durante el tutorial
        this.game.ui.updateHUD({
            fobCurrency: this.game.currency.get(),
            currencyRate: 0,
            countdown: 0
        });
    }
    
    /**
     * Verifica si se cumple la condición para auto-avanzar al siguiente paso
     */
    checkAutoAdvance(step) {
        if (!step.autoAdvanceWhen || this.autoAdvanceTriggered) return;
        
        switch(step.autoAdvanceWhen) {
            case 'front_no_ammo':
                const allyFront = this.getNodeByType('front');
                if (allyFront && allyFront.supplies <= 0) {
                    console.log('🎯 Auto-avance: Frente sin munición detectado');
                    this.autoAdvanceTriggered = true;
                    
                    // Esperar 1 segundo antes de avanzar para que el jugador escuche el sonido
                    setTimeout(() => {
                        this.nextStep();
                    }, 1000);
                }
                break;
            
            case 'front_half_ammo':
                const allyFrontHalf = this.getNodeByType('front');
                if (allyFrontHalf && allyFrontHalf.maxSupplies) {
                    const halfSupplies = allyFrontHalf.maxSupplies / 2;
                    const currentSupplies = allyFrontHalf.supplies;
                    
                    // Log temporal para debug
                    if (Math.random() < 0.01) { // Solo 1% de las veces para no inundar
                        console.log(`📊 Munición: ${currentSupplies.toFixed(1)} / ${allyFrontHalf.maxSupplies} (50% = ${halfSupplies})`);
                    }
                    
                    if (currentSupplies <= halfSupplies) {
                        console.log('🎯 Auto-avance: Frente al 50% de munición');
                        this.autoAdvanceTriggered = true;
                        
                        // Avanzar inmediatamente
                        setTimeout(() => {
                            this.nextStep();
                        }, 500);
                    }
                }
                break;
            
            // Puedes agregar más condiciones aquí
            case 'fob_built':
            case 'fob_constructed':
                // El avance lo dispara notifyAction cuando la FOB está colocada o terminada
                break;
        }
    }
    
    /**
     * Renderiza el tutorial (llamado cada frame)
     */
    render() {
        if (!this.active) return;
        
        const ctx = this.game.renderer.ctx;
        const renderer = this.game.renderer;
        
        // Limpiar canvas
        renderer.clear();
        
        // APLICAR CÁMARA
        this.game.camera.applyToContext(ctx);
        
        // Renderizar fondo
        renderer.renderBackground();
        renderer.renderGrid();
        
        // Renderizar territorio aliado/enemigo del tutorial
        this.game.territory.render(ctx);
        
        // Renderizar nodos del tutorial (con indicador de selección)
        this.tutorialNodes.forEach(node => {
            const isSelected = (node === this.game.selectedNode);
            const isHovered = (node === this.game.hoveredNode);
            renderer.renderNode(node, isSelected, isHovered, this.game);
        });
        
        // Renderizar UI de vehículos e iconos del HQ encima de todo
        this.tutorialNodes.forEach(node => {
            renderer.renderVehicleUI(node, this.game);
        });
        
        // Renderizar convoyes del tutorial
        this.tutorialConvoys.forEach(convoy => {
            renderer.renderConvoy(convoy);
        });
        
        // Renderizar preview de ruta (si hay nodo seleccionado y hover)
        if (this.game.selectedNode && this.game.hoveredNode && this.game.selectedNode !== this.game.hoveredNode) {
            // Usar configuración del servidor para rutas válidas
            const validTargets = this.game.serverBuildingConfig?.routes?.valid?.[this.game.selectedNode.type] || [];
            const isValidRoute = validTargets.includes(this.game.hoveredNode.type);
            
            if (isValidRoute) {
                renderer.renderRoutePreview(this.game.selectedNode, this.game.hoveredNode);
            }
        }
        
        // RESTAURAR CÁMARA
        this.game.camera.restoreContext(ctx);
        
        // Renderizar preview de construcción/dron/sniper (igual que en Game.render)
        if (this.game.buildSystem && this.game.buildSystem.isActive()) {
            const mousePos = this.game.inputHandler.getMousePosition();
            if (this.game.buildSystem.droneMode) {
                this.game.renderer.renderDronePreview(mousePos.x, mousePos.y, this.game.hoveredNode);
            } else if (this.game.buildSystem.sniperMode) {
                this.game.renderer.renderSniperCursor(mousePos.x, mousePos.y, this.game.hoveredNode);
            } else if (this.game.buildSystem.fobSabotageMode) {
                this.game.renderer.renderFobSabotageCursor(mousePos.x, mousePos.y, this.game.hoveredNode);
            } else if (this.game.buildSystem.commandoMode) {
                // Preview del comando: usar preview normal de construcción
                this.game.renderer.renderBuildPreview(mousePos.x, mousePos.y, this.tutorialNodes, 'specopsCommando');
            } else {
                const buildingType = this.game.buildSystem.currentBuildingType || 'fob';
                // Importante: pasar los nodos del tutorial para validaciones de solape/territorio
                this.game.renderer.renderBuildPreview(mousePos.x, mousePos.y, this.tutorialNodes, buildingType);
            }
        }
        
        // Renderizar tienda si está visible (anclada al mundo, necesita cámara)
        if (this.game.storeUI) {
            this.game.storeUI.updateLayout(this.game.canvas.width, this.game.canvas.height);
            this.game.camera.applyToContext(ctx);
            this.game.storeUI.render(ctx);
            this.game.camera.restoreContext(ctx);
        }
    }
    
    /**
     * Obtiene un nodo por su tipo
     */
    getNodeByType(type) {
        return this.tutorialNodes.find(node => node.type === type);
    }
    
    /**
     * Obtiene el mapa del tutorial
     */
    getTutorialMap() {
        return TUTORIAL_MAP;
    }
    
    /**
     * Verifica si el tutorial está activo
     */
    get isTutorialActive() {
        return this.active;
    }
}
