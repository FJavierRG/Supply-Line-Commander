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
            benchIcon: { x: 0, y: 0, w: 60, h: 60 }
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
        
        // 7. Banquillo (icono) - Ahora antes del reloj
        this.layout.benchIcon = { 
            x: currentX, 
            y: iconY, 
            w: iconSize, 
            h: iconSize 
        };
        currentX += iconSize + padding * 2;
        
        // Espacio adicional antes del reloj (100px a la derecha)
        currentX += 100;
        
        // 8. Reloj (icono + tiempo) - Ahora al final
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
        
        // 6. Renderizar reloj
        this.renderClock(ctx);
        
        // 7. Renderizar icono de bench
        this.renderBenchIcon(ctx);
        
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
     * Renderiza el dinero del jugador
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
        
        // Renderizar cantidad de dinero
        const currency = this.game.currency ? Math.floor(this.game.currency.get()) : 0;
        const textX = currencyIcon.x + currencyIcon.w + 5;
        const textY = currencyIcon.y + currencyIcon.h / 2;
        
        ctx.fillStyle = '#ffd700'; // Dorado
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        ctx.fillText(`${currency}`, textX, textY);
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

