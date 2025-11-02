// ===== GESTOR DEL ARSENAL =====
import { getAllyNodes, getProjectiles, getBuildableNodes } from '../config/nodes.js';

export class ArsenalManager {
    constructor(assetManager, game) {
        this.assetManager = assetManager;
        this.game = game;
        this.isVisible = false;
        this.openedFromMenu = false; // Track si se abrió desde el menú principal
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const arsenalBtn = document.getElementById('arsenal-btn');
        if (arsenalBtn) {
            arsenalBtn.addEventListener('click', () => {
                // Marcar que se abrió desde el menú si el menú está visible
                this.openedFromMenu = this.game.overlayManager.isOverlayVisible('main-menu-overlay');
                this.show();
            });
        }
        
        const backBtn = document.getElementById('arsenal-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.hide());
        }
    }
    
    show() {
        this.isVisible = true;
        // Ocultar el menú principal si está visible (cuando se abre desde el menú)
        if (this.game.overlayManager.isOverlayVisible('main-menu-overlay')) {
            this.game.overlayManager.hideOverlay('main-menu-overlay');
        }
        this.game.overlayManager.showOverlay('arsenal-overlay');
        this.populateArsenal();
    }
    
    hide() {
        this.isVisible = false;
        this.game.overlayManager.hideOverlay('arsenal-overlay');
        // Si se abrió desde el menú y estamos en estado menu, volver a mostrar el menú
        if (this.openedFromMenu && this.game.state === 'menu') {
            this.game.overlayManager.showOverlay('main-menu-overlay');
        }
        this.openedFromMenu = false; // Reset flag
    }
    
    populateArsenal() {
        const container = document.getElementById('arsenal-content');
        if (!container) return;
        
        // Limpiar contenido previo
        container.innerHTML = '';
        
        // Categoría 1: HQ (solo el HQ)
        const hqNode = getAllyNodes().find(n => n.id === 'hq');
        if (hqNode) {
            const hqCategory = this.createCategory('HQ', [{
                id: hqNode.id,
                name: hqNode.name,
                description: hqNode.description,
                spriteKey: hqNode.spriteKey,
                cost: hqNode.cost
            }]);
            container.appendChild(hqCategory);
        }
        
        // Categoría 2: Edificios (todos los buildable que NO sean proyectiles)
        const buildings = getAllyNodes().filter(n => 
            n.id !== 'hq' && n.id !== 'front' && n.category === 'buildable'
        );
        const buildingsCategory = this.createCategory('Edificios', buildings.map(b => ({
            id: b.id,
            name: b.name,
            description: b.description,
            spriteKey: b.spriteKey,
            cost: b.cost
        })));
        container.appendChild(buildingsCategory);
        
        // Categoría 3: Consumibles (proyectiles)
        const projectiles = getProjectiles();
        const projectilesCategory = this.createCategory('Consumibles', projectiles.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            spriteKey: p.spriteKey,
            cost: p.cost
        })));
        container.appendChild(projectilesCategory);
    }
    
    createCategory(title, items) {
        const category = document.createElement('div');
        category.className = 'arsenal-category';
        
        const categoryTitle = document.createElement('h3');
        categoryTitle.className = 'arsenal-category-title';
        categoryTitle.textContent = title;
        category.appendChild(categoryTitle);
        
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'arsenal-items';
        
        items.forEach(item => {
            const itemElement = this.createItem(item);
            itemsContainer.appendChild(itemElement);
        });
        
        category.appendChild(itemsContainer);
        return category;
    }
    
    createItem(item) {
        const div = document.createElement('div');
        div.className = 'arsenal-item';
        
        // Hover → panel de detalle
        div.addEventListener('mouseenter', () => this.showDetail(item));
        div.addEventListener('focus', () => this.showDetail(item));
        
        // Icono
        const icon = document.createElement('canvas');
        icon.className = 'arsenal-item-icon';
        icon.width = 64;
        icon.height = 64;
        
        // Renderizar sprite en el canvas
        const sprite = this.assetManager.getSprite(item.spriteKey);
        if (sprite) {
            const ctx = icon.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(sprite, 0, 0, 64, 64);
        }
        
        div.appendChild(icon);
        
        // Info
        const info = document.createElement('div');
        info.className = 'arsenal-item-info';
        
        const name = document.createElement('h4');
        name.className = 'arsenal-item-name';
        name.textContent = item.name;
        info.appendChild(name);
        
        // Descripción oculta en tarjeta (se muestra en panel detalle)
        
        const cost = document.createElement('p');
        cost.className = item.cost ? 'arsenal-item-cost' : 'arsenal-item-cost free';
        cost.textContent = item.cost ? `Coste: ${item.cost} $` : 'Inicial';
        info.appendChild(cost);
        
        div.appendChild(info);
        
        return div;
    }

    showDetail(item) {
        const nameEl = document.querySelector('#arsenal-detail .detail-name');
        const costEl = document.querySelector('#arsenal-detail .detail-cost');
        const descEl = document.querySelector('#arsenal-detail .detail-desc');
        const canvas = document.getElementById('detail-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        
        // Renderizar sprite en grande tal cual in-game
        const sprite = this.assetManager.getSprite(item.spriteKey);
        if (sprite) {
            // centrar sprite dentro del canvas manteniendo 1:1
            const targetW = Math.min(canvas.width, sprite.width);
            const targetH = Math.min(canvas.height, sprite.height);
            const x = (canvas.width - targetW) / 2;
            const y = (canvas.height - targetH) / 2;
            ctx.drawImage(sprite, 0, 0, sprite.width, sprite.height, x, y, targetW, targetH);
        }
        if (nameEl) nameEl.textContent = item.name || '';
        if (costEl) costEl.textContent = item.cost ? `Coste: ${item.cost} $` : '';
        if (descEl) {
            const tip = 'Wounded: el frente consume +100% suministros';
            const safeDesc = (item.description || '')
                .replace(/"wounded"|wounded/gi, (m) => `<span class="tooltip" data-tip="${tip}">${m}</span>`);
            descEl.innerHTML = safeDesc;
        }
    }
}

