// ===== GESTOR DE SELECCIÓN DE RAZA =====
// Maneja la UI de selección de raza antes de iniciar la partida

import { getAllRaces, getRaceConfig } from '../../config/races.js';

export class RaceSelectionManager {
    constructor(game) {
        this.game = game;
        this.isVisible = false;
        this.selectedRace = null;
        this.races = getAllRaces();
        
        // Layout de la UI
        this.layout = {
            overlay: { x: 0, y: 0, w: 1920, h: 1080 }, // Pantalla completa
            container: { x: 0, y: 0, w: 800, h: 600 }, // Contenedor centrado
            title: { x: 0, y: 50, w: 800, h: 80 },
            racesContainer: { x: 0, y: 150, w: 800, h: 350 },
            raceButton: { w: 400, h: 150, gap: 80 }, // Botones más anchos y menos separados
            confirmButton: { x: 0, y: 520, w: 250, h: 60 }
        };
        
        // Hitboxes para interacción
        this.hitRegions = [];
        
        // Inicializar sin raza seleccionada por defecto
        this.selectedRace = null;
    }
    
    /**
     * Muestra la pantalla de selección de raza
     */
    show() {
        this.isVisible = true;
        
        // 🚧 TEMPORAL: Si solo hay una raza disponible (A_Nation), seleccionarla automáticamente
        if (this.races.length === 1) {
            this.selectedRace = this.races[0].id;
        }
        
        this.updateHitRegions();
        console.log('🏛️ Pantalla de selección de raza mostrada');
    }
    
    /**
     * Oculta la pantalla de selección de raza
     */
    hide() {
        this.isVisible = false;
        this.hitRegions = [];
        console.log('🏛️ Pantalla de selección de raza oculta');
    }
    
    /**
     * Selecciona una raza
     * @param {string} raceId - ID de la raza a seleccionar
     */
    selectRace(raceId) {
        const raceConfig = getRaceConfig(raceId);
        if (raceConfig) {
            this.selectedRace = raceId;
            console.log(`🏛️ Raza seleccionada: ${raceConfig.name}`);
        }
    }
    
    /**
     * Método llamado desde NetworkManager cuando se confirma la selección de raza
     * @param {string} raceId - ID de la raza confirmada por el servidor
     */
    onRaceSelected(raceId) {
        this.selectedRace = raceId;
        console.log(`🏛️ Raza confirmada por servidor: ${raceId}`);
        
        // Actualizar el juego local
        if (this.game.onRaceSelected) {
            this.game.onRaceSelected(raceId);
        }
    }
    
    /**
     * Confirma la selección de raza y continúa con el juego
     */
    confirmSelection() {
        if (!this.selectedRace) {
            console.log('⚠️ Debes seleccionar una raza antes de continuar');
            return;
        }
        
        console.log(`🏛️ Confirmando selección de raza: ${this.selectedRace}`);
        
        // Notificar al juego sobre la selección
        if (this.game.onRaceSelected) {
            this.game.onRaceSelected(this.selectedRace);
        }
        
        // Ocultar la pantalla de selección
        this.hide();
    }
    
    /**
     * Actualiza las hitboxes para la interacción
     */
    updateHitRegions() {
        this.hitRegions = [];
        
        if (!this.isVisible) return;
        
        // Obtener dimensiones reales del canvas
        const canvasWidth = this.game.canvas.width;
        const canvasHeight = this.game.canvas.height;
        
        // Centrar el contenedor en la pantalla
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        // Hitboxes de botones de raza en grid simétrico
        const totalWidth = (this.layout.raceButton.w * 2) + this.layout.raceButton.gap;
        const startX = centerX - totalWidth / 2;
        
        this.races.forEach((race, index) => {
            const col = index % 2; // 0 o 1
            const row = Math.floor(index / 2); // 0 o más
            
            const buttonX = startX + (col * (this.layout.raceButton.w + this.layout.raceButton.gap));
            const buttonY = centerY - this.layout.raceButton.h / 2 + (row * (this.layout.raceButton.h + 30));
            
            this.hitRegions.push({
                id: `race_${race.id}`,
                x: buttonX,
                y: buttonY,
                w: this.layout.raceButton.w,
                h: this.layout.raceButton.h,
                type: 'race',
                raceId: race.id
            });
        });
        
        // Hitbox del botón de confirmar
        const confirmX = centerX - this.layout.confirmButton.w / 2;
        const confirmY = centerY + 250;
        
        this.hitRegions.push({
            id: 'confirm',
            x: confirmX,
            y: confirmY,
            w: this.layout.confirmButton.w,
            h: this.layout.confirmButton.h,
            type: 'confirm'
        });
    }
    
    /**
     * Maneja clicks en la UI
     */
    handleClick(mouseX, mouseY) {
        if (!this.isVisible) return false;
        
        // Buscar hitbox clickeada
        const clickedRegion = this.hitRegions.find(region => 
            mouseX >= region.x && mouseX <= region.x + region.w &&
            mouseY >= region.y && mouseY <= region.y + region.h
        );
        
        if (clickedRegion) {
            if (clickedRegion.type === 'race') {
                this.selectRace(clickedRegion.raceId);
                this.updateHitRegions(); // Actualizar hitboxes
                return true;
            }
            
            if (clickedRegion.type === 'confirm') {
                if (this.selectedRace) {
                    this.confirmSelection();
                } else {
                    console.log('⚠️ Debes seleccionar una raza antes de continuar');
                }
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Renderiza la UI de selección de raza
     */
    render(ctx) {
        // console.log(`🏛️ RaceSelectionManager.render() llamado - isVisible: ${this.isVisible}`);
        if (!this.isVisible) return;
        
        // console.log('🏛️ RaceSelectionManager.render() EJECUTÁNDOSE');
        this.updateHitRegions();
        
        // Obtener dimensiones reales del canvas
        const canvasWidth = ctx.canvas.width;
        const canvasHeight = ctx.canvas.height;
        
        // Centrar el contenedor en la pantalla
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        // DEBUG: Log de dimensiones
        if (!this._debugLogged) {
            // console.log(`🏛️ RaceSelectionManager render: canvas=${canvasWidth}x${canvasHeight}, center=(${centerX}, ${centerY})`);
            this._debugLogged = true;
        }
        
        // CRÍTICO: Limpiar el canvas completamente antes de renderizar
        this.game.renderer.clear();
        
        // Renderizar overlay de fondo sólido (no semi-transparente)
        this.renderOverlay(ctx, canvasWidth, canvasHeight);
        
        // Renderizar título
        this.renderTitle(ctx, centerX, centerY - 250);
        
        // Renderizar botones de raza en grid simétrico
        this.renderRaceButtons(ctx, centerX, centerY);
        
        // Renderizar botón de confirmar
        this.renderConfirmButton(ctx, centerX, centerY + 250);
        
        // DEBUG: Renderizar hitboxes (comentar cuando no sea necesario)
        // this.renderDebugHitboxes(ctx);
    }
    
    /**
     * Renderiza el overlay de fondo
     */
    renderOverlay(ctx, canvasWidth, canvasHeight) {
        ctx.save();
        ctx.fillStyle = '#1a1a1a'; // Fondo sólido oscuro en lugar de semi-transparente
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.restore();
    }
    
    /**
     * Renderiza el título
     */
    renderTitle(ctx, centerX, y) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Selecciona tu Nación', centerX, y);
        ctx.restore();
        
        // DEBUG: Log de renderizado del título
        if (!this._titleDebugLogged) {
            // console.log(`🏛️ Título renderizado en: (${centerX}, ${y})`);
            this._titleDebugLogged = true;
        }
    }
    
    /**
     * Renderiza los botones de raza en grid simétrico
     */
    renderRaceButtons(ctx, centerX, centerY) {
        // Calcular posiciones para grid simétrico (2 columnas)
        const totalWidth = (this.layout.raceButton.w * 2) + this.layout.raceButton.gap;
        const startX = centerX - totalWidth / 2;
        
        this.races.forEach((race, index) => {
            const col = index % 2; // 0 o 1
            const row = Math.floor(index / 2); // 0 o más
            
            const buttonX = startX + (col * (this.layout.raceButton.w + this.layout.raceButton.gap));
            const buttonY = centerY - this.layout.raceButton.h / 2 + (row * (this.layout.raceButton.h + 30));
            
            this.renderRaceButton(ctx, race, buttonX, buttonY, this.selectedRace === race.id);
        });
    }
    
    /**
     * Renderiza un botón de raza individual usando UIFrame
     */
    renderRaceButton(ctx, race, x, y, isSelected) {
        ctx.save();
        
        // Usar el sprite UIFrame del menú principal
        const buttonSprite = this.game.assetManager.getSprite('ui-menu-button');
        
        if (buttonSprite) {
            // Renderizar sprite del botón
            ctx.drawImage(buttonSprite, x, y, this.layout.raceButton.w, this.layout.raceButton.h);
            
            // Overlay de selección si está seleccionado
            if (isSelected) {
                ctx.fillStyle = 'rgba(46, 204, 113, 0.3)'; // Verde semi-transparente
                ctx.fillRect(x, y, this.layout.raceButton.w, this.layout.raceButton.h);
                
                // Borde de selección
                ctx.strokeStyle = '#2ecc71';
                ctx.lineWidth = 4;
                ctx.strokeRect(x, y, this.layout.raceButton.w, this.layout.raceButton.h);
            }
        } else {
            // Fallback si no hay sprite
            if (isSelected) {
                ctx.fillStyle = '#2ecc71';
                ctx.strokeStyle = '#27ae60';
                ctx.lineWidth = 4;
            } else {
                ctx.fillStyle = '#34495e';
                ctx.strokeStyle = '#2c3e50';
                ctx.lineWidth = 2;
            }
            
            ctx.fillRect(x, y, this.layout.raceButton.w, this.layout.raceButton.h);
            ctx.strokeRect(x, y, this.layout.raceButton.w, this.layout.raceButton.h);
        }
        
        // Texto del nombre de la raza
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(race.name, x + this.layout.raceButton.w / 2, y + 40);
        
        // Descripción de la raza
        ctx.font = '18px Arial';
        ctx.fillStyle = '#ecf0f1';
        ctx.fillText(race.description, x + this.layout.raceButton.w / 2, y + 75);
        
        // Lista de edificios disponibles (SOLO VISUAL - FALLBACK)
        ctx.font = '16px Arial';
        ctx.fillStyle = '#bdc3c7';
        // ⚠️ DEPRECATED: race.buildings y race.consumables movidos al servidor
        // Usar fallback seguro para información visual
        const buildingsText = `Edificios: Disponibles`;
        const consumablesText = `Consumibles: Disponibles`;
        ctx.fillText(buildingsText, x + this.layout.raceButton.w / 2, y + 105);
        ctx.fillText(consumablesText, x + this.layout.raceButton.w / 2, y + 125);
        
        ctx.restore();
    }
    
    /**
     * Renderiza el botón de confirmar usando UIFrame
     */
    renderConfirmButton(ctx, centerX, y) {
        const buttonX = centerX - this.layout.confirmButton.w / 2;
        const isEnabled = this.selectedRace !== null;
        
        ctx.save();
        
        // Usar el sprite UIFrame del menú principal
        const buttonSprite = this.game.assetManager.getSprite('ui-menu-button');
        
        if (buttonSprite) {
            // Renderizar sprite del botón
            ctx.drawImage(buttonSprite, buttonX, y, this.layout.confirmButton.w, this.layout.confirmButton.h);
            
            // Overlay de deshabilitado si no está habilitado
            if (!isEnabled) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(buttonX, y, this.layout.confirmButton.w, this.layout.confirmButton.h);
            }
        } else {
            // Fallback si no hay sprite
            if (isEnabled) {
                ctx.fillStyle = '#e74c3c';
                ctx.strokeStyle = '#c0392b';
                ctx.lineWidth = 3;
            } else {
                ctx.fillStyle = '#7f8c8d';
                ctx.strokeStyle = '#95a5a6';
                ctx.lineWidth = 2;
            }
            
            ctx.fillRect(buttonX, y, this.layout.confirmButton.w, this.layout.confirmButton.h);
            ctx.strokeRect(buttonX, y, this.layout.confirmButton.w, this.layout.confirmButton.h);
        }
        
        // Texto del botón
        ctx.fillStyle = isEnabled ? '#ffffff' : '#bdc3c7';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const buttonText = isEnabled ? 'Iniciar Misión' : 'Elegir nación';
        ctx.fillText(buttonText, centerX, y + this.layout.confirmButton.h / 2);
        ctx.restore();
    }
    
    /**
     * DEBUG: Renderiza las hitboxes para visualizar su posición
     */
    renderDebugHitboxes(ctx) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
        
        this.hitRegions.forEach(region => {
            ctx.strokeRect(region.x, region.y, region.w, region.h);
            ctx.fillRect(region.x, region.y, region.w, region.h);
            
            // Texto con el ID
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.fillText(region.id, region.x + 5, region.y + 15);
            ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
        });
    }
}
