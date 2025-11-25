
// ===== GESTOR DEL BANNER SUPERIOR (TOP BAR) =====
// Centraliza toda la UI del banner superior del juego

export class TopBarManager {
    constructor(assetManager, game) {
        this.assetManager = assetManager;
        this.game = game;
        
        // Referencias a otros managers
        this.storeUI = null; // Se asignará desde Game.js
        this.territory = null; // Se asignará desde Game.js
        
        // Estado de visibilidad
        this.isVisible = true;
        
        // 🆕 NUEVO: Cache de imágenes de disciplinas
        this.disciplineImages = new Map(); // key: disciplineId, value: Image
        
        // Configuración del banner (se ajustará al tamaño del canvas)
        this.layout = {
            // Banner completo
            banner: {
                x: 0,
                y: 0,
                w: 1920, // Se ajustará dinámicamente
                h: 80    // Altura fija del banner
            },
            
            // Espaciado entre elementos
            padding: 10,
            iconSize: 60, // Tamaño de iconos (60x60)
            
            // Elementos individuales (se calculan en updateLayout)
            flag: { x: 0, y: 0, w: 60, h: 60 },
            buildingIcon: { x: 0, y: 0, w: 60, h: 60 },
            attackIcon: { x: 0, y: 0, w: 60, h: 60 },
            currencyIcon: { x: 0, y: 0, w: 60, h: 60 },
            player1Territory: { x: 0, y: 0, w: 60, h: 60 },
            player2Territory: { x: 0, y: 0, w: 60, h: 60 },
            clock: { x: 0, y: 0, w: 60, h: 60 },
            benchIcon: { x: 0, y: 0, w: 60, h: 60 },
            discipline1: { x: 0, y: 0, w: 60, h: 60 }, // 🆕 NUEVO: Slot disciplina 1
            discipline2: { x: 0, y: 0, w: 60, h: 60 }  // 🆕 NUEVO: Slot disciplina 2
        };
        
        // Hitboxes para clicks
        this.hitboxes = [];
    }
    
    /**
     * Actualiza el layout del banner según el tamaño del canvas
     */
    updateLayout(canvasWidth, canvasHeight) {
        const { padding, iconSize } = this.layout;
        
        // Banner completo
        this.layout.banner.w = canvasWidth;
        this.layout.banner.h = 80;
        
        // Posición Y centrada verticalmente en el banner
        const iconY = this.layout.banner.y + (this.layout.banner.h - iconSize) / 2;
        
        // Calcular posiciones de izquierda a derecha
        let currentX = padding;
        
        // 1. Bandera del jugador
        this.layout.flag = { 
            x: currentX, 
            y: iconY, 
            w: iconSize, 
            h: iconSize 
        };
        currentX += iconSize + padding;
        
        // 2. Icono de edificios (tienda)
        this.layout.buildingIcon = { 
            x: currentX, 
            y: iconY, 
            w: iconSize, 
            h: iconSize 
        };
        currentX += iconSize + padding;
        
        // 3. Icono de ataques/vehículos (tienda)
        this.layout.attackIcon = { 
            x: currentX, 
            y: iconY, 
            w: iconSize, 
            h: iconSize 
        };
        currentX += iconSize + padding * 3; // Más espacio antes de currency
        
        // 4. Currency (icono + texto)
        this.layout.currencyIcon = { 
            x: currentX, 
            y: iconY, 
            w: iconSize, 
            h: iconSize 
        };
        currentX += iconSize + 5; // Pequeño espacio para el texto
        
        // Espacio para el texto de currency (aproximado)
        const currencyTextWidth = 100;
        currentX += currencyTextWidth + padding * 2;
        
        // 5. Territorio Player 1 (icono + porcentaje)
        this.layout.player1Territory = { 
            x: currentX, 
            y: iconY, 
            w: iconSize, 
            h: iconSize 
        };
        currentX += iconSize + 5;
        
        // Espacio para el texto del porcentaje
        const percentageTextWidth = 50;
        currentX += percentageTextWidth + padding;
        
        // 6. Territorio Player 2 (icono + porcentaje)
        this.layout.player2Territory = { 
            x: currentX, 
            y: iconY, 
            w: iconSize, 
            h: iconSize 
        };
        currentX += iconSize + 5 + percentageTextWidth + padding * 3;
        
        // 7. Banquillo (icono) - Ahora antes de disciplinas
        this.layout.benchIcon = { 
            x: currentX, 
            y: iconY, 
            w: iconSize, 
            h: iconSize 
        };
        currentX += iconSize + padding * 2;
        
        // 8. Disciplina 1 (slot)
        this.layout.discipline1 = { 
            x: currentX, 
            y: iconY, 
            w: iconSize, 
            h: iconSize 
        };
        currentX += iconSize + 5; // Pequeño espacio entre disciplinas
        
        // 9. Disciplina 2 (slot)
        this.layout.discipline2 = { 
            x: currentX, 
            y: iconY, 
            w: iconSize, 
            h: iconSize 
        };
        currentX += iconSize + padding * 3;
        
        // Espacio adicional antes del reloj (70px a la derecha)
        currentX += 70;
        
        // 10. Reloj (icono + tiempo) - Ahora al final
        this.layout.clock = { 
            x: currentX, 
            y: iconY, 
            w: iconSize, 
            h: iconSize 
        };
        currentX += iconSize + 5;
        
        // Espacio para el texto del reloj
        const clockTextWidth = 80;
        currentX += clockTextWidth + padding * 2;
        
        // Actualizar hitboxes
        this.updateHitboxes();
    }
    
    /**
     * Actualiza las hitboxes para detección de clicks
     */
    updateHitboxes() {
        this.hitboxes = [
            { id: 'building', ...this.layout.buildingIcon, type: 'store_category' },
            { id: 'attack', ...this.layout.attackIcon, type: 'store_category' },
            { id: 'bench', ...this.layout.benchIcon, type: 'bench_toggle' }
        ];
        
        // 🆕 NUEVO: Añadir hitboxes de disciplinas si están equipadas
        if (this.game.disciplineStates && this.game.myTeam) {
            const myState = this.game.disciplineStates[this.game.myTeam];
            if (myState && myState.equipped) {
                myState.equipped.forEach((disciplineId, index) => {
                    const layoutKey = index === 0 ? 'discipline1' : 'discipline2';
                    this.hitboxes.push({
                        id: `discipline_${index}`,
                        disciplineId: disciplineId,
                        ...this.layout[layoutKey],
                        type: 'discipline_activate'
                    });
                });
            }
        }
    }
    
    /**
     * Renderiza todo el banner superior
     */
    render(ctx) {
        if (!this.isVisible) return;
        
        ctx.save();
        
        // 1. Renderizar el banner de fondo
        this.renderBanner(ctx);
        
        // 2. Renderizar la bandera del jugador
        this.renderFlag(ctx);
        
        // 3. Renderizar iconos de tienda
        this.renderStoreIcons(ctx);
        
        // 4. Renderizar currency
        this.renderCurrency(ctx);
        
        // 5. Renderizar territorios
        this.renderTerritories(ctx);
        
        // 6. Renderizar icono de bench
        this.renderBenchIcon(ctx);
        
        // 7. Renderizar disciplinas
        this.renderDisciplines(ctx);
        
        // 8. Renderizar reloj
        this.renderClock(ctx);
        
        ctx.restore();
    }
    
    /**
     * Renderiza el banner de fondo
     */
    renderBanner(ctx) {
        const banner = this.layout.banner;
        const sprite = this.assetManager.getSprite('ui-banner-bar');
        
        if (sprite) {
            // Estirar el banner horizontalmente para llenar todo el ancho
            ctx.drawImage(sprite, banner.x, banner.y, banner.w, banner.h);
        } else {
            // Fallback: fondo oscuro semi-transparente
            ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
            ctx.fillRect(banner.x, banner.y, banner.w, banner.h);
            
            // Borde inferior
            ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(banner.x, banner.y + banner.h);
            ctx.lineTo(banner.x + banner.w, banner.y + banner.h);
            ctx.stroke();
        }
    }
    
    /**
     * Renderiza la bandera del jugador
     * 🔧 DISABLED: Bandera oculta pero el espacio se mantiene en el layout
     */
    renderFlag(ctx) {
        // Bandera oculta - el espacio en el layout se mantiene para no mover los demás elementos
        return;
    }
    
    /**
     * Renderiza los iconos de la tienda (edificios y ataques)
     */
    renderStoreIcons(ctx) {
        // Icono de edificios
        const buildingIcon = this.layout.buildingIcon;
        const buildingSprite = this.assetManager.getSprite('ui-building-icon');
        
        if (buildingSprite) {
            // Resaltar si está seleccionada la categoría buildings
            const isSelected = this.storeUI && this.storeUI.selectedCategory === 'buildings';
            if (isSelected) {
                ctx.fillStyle = 'rgba(78, 204, 163, 0.3)';
                ctx.fillRect(buildingIcon.x - 2, buildingIcon.y - 2, buildingIcon.w + 4, buildingIcon.h + 4);
            }
            
            ctx.drawImage(buildingSprite, buildingIcon.x, buildingIcon.y, buildingIcon.w, buildingIcon.h);
        }
        
        // Icono de ataques/vehículos
        const attackIcon = this.layout.attackIcon;
        const attackSprite = this.assetManager.getSprite('ui-attack-icon');
        
        if (attackSprite) {
            // Resaltar si está seleccionada la categoría vehicles
            const isSelected = this.storeUI && this.storeUI.selectedCategory === 'vehicles';
            if (isSelected) {
                ctx.fillStyle = 'rgba(78, 204, 163, 0.3)';
                ctx.fillRect(attackIcon.x - 2, attackIcon.y - 2, attackIcon.w + 4, attackIcon.h + 4);
            }
            
            ctx.drawImage(attackSprite, attackIcon.x, attackIcon.y, attackIcon.w, attackIcon.h);
        }
    }
    
    /**
     * Calcula las ganancias por segundo del jugador
     * Incluye: generación pasiva base + bonos de edificios (plantas nucleares, servidores)
     * Los valores se obtienen de serverBuildingConfig (sincronizado desde server/config/gameConfig.js y serverNodes.js)
     */
    calculateIncomePerSecond() {
        // Tasa pasiva base: 1$/s (sincronizado con server/config/gameConfig.js -> currency.passiveRate)
        const passiveRate = 1;
        
        // Obtener bonos de edificios del servidor (con fallbacks seguros)
        const nuclearPlantBonus = this.game.serverBuildingConfig?.effects?.nuclearPlant?.incomeBonus || 1;
        const serversBonus = this.game.serverBuildingConfig?.effects?.servers?.incomeBonus || 0.5;
        const physicStudiesBonus = this.game.serverBuildingConfig?.effects?.physicStudies?.nuclearPlantBonus || 1;
        const secretLabBonus = this.game.serverBuildingConfig?.effects?.secretLaboratory?.nuclearPlantBonus || 1;
        
        // Empezar con la tasa base pasiva
        let totalIncome = passiveRate;
        
        // Si hay nodos disponibles, calcular bonos de edificios
        if (this.game.nodes && this.game.myTeam) {
            const myTeam = this.game.myTeam;
            
            // Contar plantas nucleares activas del jugador
            const nuclearPlants = this.game.nodes.filter(n => 
                n.type === 'nuclearPlant' && 
                n.team === myTeam && 
                n.active && 
                !n.isConstructing && 
                !n.isAbandoned
            ).length;
            
            // Contar servidores activos del jugador
            const servers = this.game.nodes.filter(n => 
                n.type === 'servers' && 
                n.team === myTeam && 
                n.active && 
                !n.isConstructing && 
                !n.isAbandoned
            ).length;
            
            // Verificar si tiene estudios de física o laboratorio secreto (bonos a plantas nucleares)
            const hasPhysicStudies = this.game.nodes.some(n => 
                n.type === 'physicStudies' && 
                n.team === myTeam && 
                n.active && 
                !n.isConstructing && 
                !n.isAbandoned
            );
            
            const hasSecretLab = this.game.nodes.some(n => 
                n.type === 'secretLaboratory' && 
                n.team === myTeam && 
                n.active && 
                !n.isConstructing && 
                !n.isAbandoned
            );
            
            // Calcular bonos de plantas nucleares
            let nuclearBonus = nuclearPlants * nuclearPlantBonus;
            
            // Aplicar bonos extra de estudios de física y laboratorio secreto
            if (hasPhysicStudies) {
                nuclearBonus += nuclearPlants * physicStudiesBonus;
            }
            if (hasSecretLab) {
                nuclearBonus += nuclearPlants * secretLabBonus;
            }
            
            // Sumar bonos de servidores
            const serverBonus = servers * serversBonus;
            
            totalIncome += nuclearBonus + serverBonus;
        }
        
        return totalIncome;
    }
    
    /**
     * Renderiza el dinero del jugador con las ganancias por segundo
     */
    renderCurrency(ctx) {
        const currencyIcon = this.layout.currencyIcon;
        const sprite = this.assetManager.getSprite('ui-currency-icon');
        
        // Renderizar icono (ancho 80%, alto 90%)
        if (sprite) {
            const reducedWidth = currencyIcon.w * 0.80;
            const reducedHeight = currencyIcon.h * 0.90;
            const offsetX = (currencyIcon.w - reducedWidth) / 2;
            const offsetY = (currencyIcon.h - reducedHeight) / 2;
            ctx.drawImage(sprite, 
                currencyIcon.x + offsetX, 
                currencyIcon.y + offsetY, 
                reducedWidth, 
                reducedHeight);
        }
        
        // Obtener dinero actual
        const currency = this.game.currency ? Math.floor(this.game.currency.get()) : 0;
        
        // Calcular ganancias por segundo
        const incomePerSecond = this.calculateIncomePerSecond();
        
        // Renderizar cantidad de dinero (línea superior)
        const textX = currencyIcon.x + currencyIcon.w + 5;
        const textY = currencyIcon.y + currencyIcon.h / 2 - 10; // Mover un poco arriba
        
        ctx.fillStyle = '#ffd700'; // Dorado
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        ctx.fillText(`${currency}`, textX, textY);
        
        // Renderizar ganancias por segundo (línea inferior, más pequeña y en verde)
        const incomeText = `+${incomePerSecond.toFixed(1)}/s`;
        const incomeTextX = textX;
        const incomeTextY = currencyIcon.y + currencyIcon.h / 2 + 12; // Mover un poco abajo
        
        ctx.fillStyle = '#4ecf75'; // Verde claro
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        ctx.fillText(incomeText, incomeTextX, incomeTextY);
    }
    
    /**
     * Renderiza los porcentajes de territorio de ambos equipos
     */
    renderTerritories(ctx) {
        if (!this.territory) return;
        
        // Obtener porcentajes calculados por TerritorySystem
        const player1Percentage = this.territory.calculateTerritoryPercentage('player1');
        const player2Percentage = this.territory.calculateTerritoryPercentage('player2');
        
        // Territorio Player 1
        const p1Icon = this.layout.player1Territory;
        const p1Sprite = this.assetManager.getSprite('ui-player1-territory');
        
        if (p1Sprite) {
            ctx.drawImage(p1Sprite, p1Icon.x, p1Icon.y, p1Icon.w, p1Icon.h);
        }
        
        // Texto del porcentaje Player 1
        const p1TextX = p1Icon.x + p1Icon.w + 5;
        const p1TextY = p1Icon.y + p1Icon.h / 2;
        
        ctx.fillStyle = '#4a90e2'; // Azul (Player 1)
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        ctx.fillText(`${player1Percentage}%`, p1TextX, p1TextY);
        
        // Territorio Player 2
        const p2Icon = this.layout.player2Territory;
        const p2Sprite = this.assetManager.getSprite('ui-player2-territory');
        
        if (p2Sprite) {
            ctx.drawImage(p2Sprite, p2Icon.x, p2Icon.y, p2Icon.w, p2Icon.h);
        }
        
        // Texto del porcentaje Player 2
        const p2TextX = p2Icon.x + p2Icon.w + 5;
        const p2TextY = p2Icon.y + p2Icon.h / 2;
        
        ctx.fillStyle = '#e74c3c'; // Rojo (Player 2)
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        ctx.fillText(`${player2Percentage}%`, p2TextX, p2TextY);
    }
    
    /**
     * Renderiza el reloj del juego
     */
    renderClock(ctx) {
        const clockIcon = this.layout.clock;
        const sprite = this.assetManager.getSprite('ui-clock');
        
        // Renderizar icono del reloj
        if (sprite) {
            ctx.drawImage(sprite, clockIcon.x, clockIcon.y, clockIcon.w, clockIcon.h);
        }
        
        // Obtener tiempo de juego (en segundos ENTEROS)
        let gameTime = 0;
        
        // 🔧 FIX: Acceder a lastGameState a través de gameStateSync
        if (this.game.network && this.game.network.gameStateSync && this.game.network.gameStateSync.lastGameState) {
            // Usar tiempo del servidor (redondear a segundos)
            gameTime = Math.floor(this.game.network.gameStateSync.lastGameState.gameTime || 0);
        } else if (this.game.matchStats && this.game.matchStats.startTime) {
            // Fallback: calcular desde el inicio de la partida
            gameTime = Math.floor((Date.now() - this.game.matchStats.startTime) / 1000);
        }
        
        // Convertir a formato MM:SS
        const minutes = Math.floor(gameTime / 60);
        const seconds = gameTime % 60;
        const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Renderizar texto del reloj DENTRO del sprite (centrado)
        const textX = clockIcon.x + clockIcon.w / 2;
        const textY = clockIcon.y + clockIcon.h / 2;
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';  // Centrado horizontal
        ctx.textBaseline = 'middle'; // Centrado vertical
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        
        ctx.strokeText(timeText, textX, textY);
        ctx.fillText(timeText, textX, textY);
    }
    
    /**
     * 🆕 NUEVO: Precarga las imágenes de disciplinas equipadas
     */
    preloadDisciplineImages() {
        if (!this.game.disciplineStates || !this.game.myTeam) return;
        if (!this.game.serverDisciplineConfig) return;
        
        const myState = this.game.disciplineStates[this.game.myTeam];
        if (!myState) return;
        
        // Precargar imágenes de disciplinas equipadas
        myState.equipped.forEach(disciplineId => {
            if (disciplineId && !this.disciplineImages.has(disciplineId)) {
                const config = this.game.serverDisciplineConfig[disciplineId];
                if (config && config.icon) {
                    const img = new Image();
                    img.src = config.icon;
                    this.disciplineImages.set(disciplineId, img);
                }
            }
        });
    }
    
    /**
     * 🆕 NUEVO: Renderiza las disciplinas equipadas
     */
    renderDisciplines(ctx) {
        // Verificar que tenemos todos los datos necesarios
        if (!this.game.disciplineStates || !this.game.myTeam) return;
        if (!this.game.serverDisciplineConfig) return;
        
        // Obtener estado de mis disciplinas
        const myState = this.game.disciplineStates[this.game.myTeam];
        if (!myState) return;
        
        // 🐛 DEBUG: Log solo una vez cada 5 segundos para no saturar
        if (!this._lastDisciplineLog || Date.now() - this._lastDisciplineLog > 5000) {
            console.log('🎨 [TOPBAR] Renderizando disciplinas:', myState.equipped);
            this._lastDisciplineLog = Date.now();
        }
        
        // Precargar imágenes si es necesario
        this.preloadDisciplineImages();
        
        // Renderizar cada slot (máximo 2)
        for (let i = 0; i < 2; i++) {
            const disciplineId = myState.equipped[i] || null;
            const layoutKey = i === 0 ? 'discipline1' : 'discipline2';
            const slot = this.layout[layoutKey];
            
            if (disciplineId) {
                // Disciplina equipada - renderizar con estado
                this.renderDisciplineSlot(ctx, disciplineId, slot, myState);
            } else {
                // Slot vacío
                this.renderEmptyDisciplineSlot(ctx, slot);
            }
        }
    }
    
    /**
     * 🆕 NUEVO: Renderiza un slot de disciplina con su icono y estado
     */
    renderDisciplineSlot(ctx, disciplineId, slot, state) {
        const config = this.game.serverDisciplineConfig[disciplineId];
        if (!config) return;
        
        ctx.save();
        
        // Determinar estado visual
        const isActive = (state.active === disciplineId);
        const isOnCooldown = (state.cooldownRemaining > 0);
        const canActivate = !isActive && !isOnCooldown && state.active === null;
        
        // Fondo del slot
        ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
        ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
        
        // Borde según estado
        ctx.lineWidth = 3;
        if (isActive) {
            // Activa: borde brillante amarillo/dorado con pulso
            const pulseValue = Math.sin(Date.now() / 500) * 0.3 + 0.7;
            ctx.strokeStyle = `rgba(255, 215, 0, ${pulseValue})`;
        } else if (isOnCooldown) {
            // Cooldown: borde rojo
            ctx.strokeStyle = '#ff4444';
        } else if (canActivate) {
            // Disponible: borde verde
            ctx.strokeStyle = '#44ff44';
        } else {
            // No se puede activar (otra disciplina activa): borde gris
            ctx.strokeStyle = '#666666';
        }
        ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);
        
        // Renderizar icono desde cache
        const sprite = this.disciplineImages.get(disciplineId);
        if (sprite && sprite.complete && sprite.naturalHeight !== 0) {
            const iconPadding = 5;
            ctx.drawImage(
                sprite, 
                slot.x + iconPadding, 
                slot.y + iconPadding, 
                slot.w - iconPadding * 2, 
                slot.h - iconPadding * 2
            );
        } else {
            // Fallback: renderizar icono genérico mientras carga
            ctx.fillStyle = '#666666';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚡', slot.x + slot.w / 2, slot.y + slot.h / 2);
        }
        
        // Overlay oscuro si no se puede activar
        if (!canActivate && !isActive) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
        }
        
        // Anillo de progreso si está activa (duración) o en cooldown
        if (isActive && state.timeRemaining > 0 && config.duration > 0) {
            // Anillo de duración (cuenta regresiva)
            const centerX = slot.x + slot.w / 2;
            const centerY = slot.y + slot.h / 2;
            const ringRadius = slot.w / 2 - 4;
            const progress = state.timeRemaining / config.duration;
            
            if (this.game.renderer && this.game.renderer.renderProgressRing) {
                this.game.renderer.renderProgressRing(centerX, centerY, ringRadius, progress, {
                    width: 4,
                    colorStart: { r: 255, g: 215, b: 0 }, // Dorado
                    colorEnd: { r: 255, g: 165, b: 0 },   // Naranja
                    reverse: false,
                    pulse: true,
                    pulseSpeed: 400,
                    backgroundAlpha: 0.3
                });
            }
            
            // Mostrar tiempo restante en el centro
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
            const secondsText = `${Math.ceil(state.timeRemaining)}`;
            ctx.strokeText(secondsText, centerX, centerY);
            ctx.fillText(secondsText, centerX, centerY);
            
        } else if (isOnCooldown && state.cooldownRemaining > 0) {
            // Anillo de cooldown
            const centerX = slot.x + slot.w / 2;
            const centerY = slot.y + slot.h / 2;
            const ringRadius = slot.w / 2 - 4;
            const progress = state.cooldownRemaining / config.cooldown;
            
            if (this.game.renderer && this.game.renderer.renderProgressRing) {
                this.game.renderer.renderProgressRing(centerX, centerY, ringRadius, progress, {
                    width: 4,
                    colorStart: { r: 255, g: 68, b: 68 }, // Rojo
                    colorEnd: { r: 255, g: 100, b: 100 },
                    reverse: false,
                    pulse: false,
                    backgroundAlpha: 0.3
                });
            }
            
            // Mostrar tiempo de cooldown restante
            ctx.fillStyle = '#ff4444';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
            const cooldownText = `${Math.ceil(state.cooldownRemaining)}`;
            ctx.strokeText(cooldownText, centerX, centerY);
            ctx.fillText(cooldownText, centerX, centerY);
        }
        
        ctx.restore();
    }
    
    /**
     * 🆕 NUEVO: Renderiza un slot vacío de disciplina
     */
    renderEmptyDisciplineSlot(ctx, slot) {
        ctx.save();
        
        // Fondo oscuro
        ctx.fillStyle = 'rgba(20, 20, 20, 0.6)';
        ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
        
        // Borde punteado
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);
        ctx.setLineDash([]); // Resetear line dash
        
        // Icono de "slot vacío" (signo de interrogación)
        ctx.fillStyle = '#666666';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', slot.x + slot.w / 2, slot.y + slot.h / 2);
        
        ctx.restore();
    }
    
    /**
     * Renderiza el icono del banquillo
     */
    renderBenchIcon(ctx) {
        const benchIcon = this.layout.benchIcon;
        const sprite = this.assetManager.getSprite('ui-bench-icon');
        
        if (sprite) {
            // Resaltar si el banquillo está expandido
            const isExpanded = this.storeUI && this.storeUI.benchExpanded;
            if (isExpanded) {
                ctx.fillStyle = 'rgba(255, 152, 0, 0.3)';
                ctx.fillRect(benchIcon.x - 2, benchIcon.y - 2, benchIcon.w + 4, benchIcon.h + 4);
            }
            
            ctx.drawImage(sprite, benchIcon.x, benchIcon.y, benchIcon.w, benchIcon.h);
        }
    }
    
    /**
     * Maneja clicks en el banner
     * @returns {boolean} true si el click fue manejado
     */
    handleClick(mouseX, mouseY) {
        if (!this.isVisible) return false;
        
        // Verificar si el click está dentro del banner
        const banner = this.layout.banner;
        if (mouseY < banner.y || mouseY > banner.y + banner.h) {
            return false; // Click fuera del banner
        }
        
        // Verificar clicks en cada hitbox
        for (const hitbox of this.hitboxes) {
            if (mouseX >= hitbox.x && mouseX <= hitbox.x + hitbox.w &&
                mouseY >= hitbox.y && mouseY <= hitbox.y + hitbox.h) {
                
                // Manejar según el tipo de hitbox
                if (hitbox.type === 'store_category') {
                    return this.handleStoreCategoryClick(hitbox.id);
                } else if (hitbox.type === 'bench_toggle') {
                    return this.handleBenchToggle();
                } else if (hitbox.type === 'discipline_activate') {
                    return this.handleDisciplineClick(hitbox.disciplineId);
                }
            }
        }
        
        return false; // Click no manejado
    }
    
    /**
     * Maneja clicks en categorías de la tienda
     */
    handleStoreCategoryClick(categoryId) {
        if (!this.storeUI) return false;
        
        // Mapear ID del banner a ID de categoría de la tienda
        const categoryMap = {
            'building': 'buildings',
            'attack': 'vehicles'
        };
        
        const storeCategory = categoryMap[categoryId];
        if (storeCategory) {
            // Alternar: si ya está seleccionada, cerrar; si no, abrir
            if (this.storeUI.selectedCategory === storeCategory) {
                this.storeUI.selectedCategory = null; // Cerrar
            } else {
                this.storeUI.selectCategory(storeCategory); // Abrir
            }
            return true;
        }
        
        return false;
    }
    
    /**
     * Maneja toggle del banquillo
     */
    handleBenchToggle() {
        if (!this.storeUI) return false;
        
        // Alternar estado del banquillo
        this.storeUI.benchExpanded = !this.storeUI.benchExpanded;
        return true;
    }
    
    /**
     * 🆕 NUEVO: Maneja clicks en disciplinas para activarlas
     */
    handleDisciplineClick(disciplineId) {
        if (!this.game.disciplineStates || !this.game.myTeam) return false;
        if (!this.game.serverDisciplineConfig) return false;
        
        const myState = this.game.disciplineStates[this.game.myTeam];
        const config = this.game.serverDisciplineConfig[disciplineId];
        
        if (!myState || !config) return false;
        
        // Verificar que la disciplina esté equipada
        if (!myState.equipped.includes(disciplineId)) {
            console.log('⚠️ Disciplina no equipada');
            return false;
        }
        
        // Verificar que no haya otra disciplina activa
        if (myState.active !== null) {
            console.log('⚠️ Ya hay una disciplina activa');
            // TODO: Mostrar notificación visual al usuario
            return false;
        }
        
        // Verificar que no esté en cooldown
        if (myState.cooldownRemaining > 0) {
            console.log(`⚠️ Disciplinas en cooldown (${Math.ceil(myState.cooldownRemaining)}s restantes)`);
            // TODO: Mostrar notificación visual al usuario
            return false;
        }
        
        // Enviar petición al servidor para activar
        console.log(`⚡ Activando disciplina: ${config.name}`);
        if (this.game.network && this.game.network.activateDiscipline) {
            this.game.network.activateDiscipline(disciplineId);
        } else {
            console.error('❌ NetworkManager no disponible o método activateDiscipline no existe');
        }
        
        return true;
    }
    
    /**
     * Verifica si un punto está dentro del banner
     */
    isPointInBanner(x, y) {
        const banner = this.layout.banner;
        return y >= banner.y && y <= banner.y + banner.h;
    }
    
    /**
     * Muestra/oculta el banner
     */
    setVisible(visible) {
        this.isVisible = visible;
    }
}


