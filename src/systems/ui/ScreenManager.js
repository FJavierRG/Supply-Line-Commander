// ===== GESTOR DE PANTALLAS CENTRALIZADO =====

/**
 * ScreenManager - Gestión centralizada de todas las pantallas del juego
 * 
 * Responsabilidades:
 * - Mostrar/ocultar pantallas de forma consistente
 * - Gestionar transiciones entre pantallas
 * - Notificar cambios de pantalla a otros sistemas
 * - Mantener registro de pantalla actual
 */
export class ScreenManager {
    constructor() {
        this.currentScreen = null;
        this.previousScreen = null;
        this.screens = new Map(); // screenName -> screenElement
        this.listeners = []; // Array de callbacks para cambios de pantalla
        
        this.init();
    }
    
    /**
     * Inicializa el sistema registrando todas las pantallas
     */
    init() {
        // Registrar todas las pantallas existentes
        const screenIds = [
            'main-menu-overlay',
            'multiplayer-lobby-overlay',
            'arsenal-overlay',
            'pause-overlay',
            'victory-overlay',
            'defeat-overlay',
            'upgrades-overlay',
            'tutorial-overlay'
        ];
        
        screenIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                // Extraer nombre de pantalla del ID (ej: 'main-menu-overlay' -> 'MAIN_MENU')
                const screenName = this.idToScreenName(id);
                this.screens.set(screenName, element);
            } else {
                console.warn(`⚠️ Pantalla ${id} no encontrada en el DOM`);
            }
        });
    }
    
    /**
     * Convierte ID de elemento a nombre de pantalla
     * @param {string} id - ID del elemento (ej: 'main-menu-overlay')
     * @returns {string} Nombre de pantalla (ej: 'MAIN_MENU')
     */
    idToScreenName(id) {
        // Mapeo directo para los IDs existentes
        const mapping = {
            'main-menu-overlay': 'MAIN_MENU',
            'multiplayer-lobby-overlay': 'MULTIPLAYER_LOBBY',
            'arsenal-overlay': 'ARSENAL',
            'pause-overlay': 'PAUSE',
            'victory-overlay': 'VICTORY',
            'defeat-overlay': 'DEFEAT',
            'upgrades-overlay': 'UPGRADES',
            'tutorial-overlay': 'TUTORIAL'
        };
        
        return mapping[id] || id.replace('-overlay', '').replace(/-/g, '_').toUpperCase();
    }
    
    /**
     * Convierte nombre de pantalla a ID de elemento
     * @param {string} screenName - Nombre de pantalla (ej: 'MAIN_MENU')
     * @returns {string} ID del elemento (ej: 'main-menu-overlay')
     */
    screenNameToId(screenName) {
        return screenName.toLowerCase().replace(/_/g, '-') + '-overlay';
    }
    
    /**
     * Muestra una pantalla específica
     * @param {string} screenName - Nombre de la pantalla (ej: 'MAIN_MENU')
     * @returns {boolean} True si se mostró correctamente
     */
    show(screenName) {
        const element = this.screens.get(screenName);
        if (!element) {
            console.warn(`⚠️ Pantalla ${screenName} no encontrada`);
            return false;
        }
        
        // Si ya está mostrada, no hacer nada
        if (this.currentScreen === screenName) {
            return true;
        }
        
        // Guardar pantalla anterior
        this.previousScreen = this.currentScreen;
        
        // Ocultar pantalla anterior si existe
        if (this.previousScreen) {
            this.hide(this.previousScreen, false); // false = no notificar
        }
        
        // Mostrar nueva pantalla
        element.classList.remove('hidden');
        element.style.display = 'block';
        element.style.visibility = 'visible';
        element.style.opacity = '1';
        // 🆕 NUEVO: Usar variable CSS en lugar de valor hardcodeado
        // El CSS ya define z-index: var(--z-screens) para .overlay
        element.style.pointerEvents = 'auto';
        
        // Actualizar pantalla actual
        this.currentScreen = screenName;
        
        // Notificar cambio
        this.notifyScreenChange(screenName, this.previousScreen);
        
        console.log(`📺 Pantalla cambiada: ${this.previousScreen || 'NINGUNA'} → ${screenName}`);
        
        return true;
    }
    
    /**
     * Oculta una pantalla específica
     * @param {string} screenName - Nombre de la pantalla
     * @param {boolean} notify - Si debe notificar el cambio (default: true)
     * @returns {boolean} True si se ocultó correctamente
     */
    hide(screenName, notify = true) {
        const element = this.screens.get(screenName);
        if (!element) {
            return false;
        }
        
        // Ocultar pantalla
        element.classList.add('hidden');
        element.style.display = 'none';
        element.style.visibility = 'hidden';
        element.style.pointerEvents = 'none';
        
        // Si era la pantalla actual, limpiarla
        if (this.currentScreen === screenName) {
            this.previousScreen = this.currentScreen;
            this.currentScreen = null;
            
            if (notify) {
                this.notifyScreenChange(null, screenName);
            }
        }
        
        return true;
    }
    
    /**
     * Oculta todas las pantallas
     */
    hideAll() {
        this.screens.forEach((element, screenName) => {
            this.hide(screenName, false);
        });
        this.currentScreen = null;
        this.notifyScreenChange(null, this.previousScreen);
    }
    
    /**
     * Obtiene la pantalla actual
     * @returns {string|null} Nombre de la pantalla actual o null
     */
    getCurrentScreen() {
        return this.currentScreen;
    }
    
    /**
     * Obtiene la pantalla anterior
     * @returns {string|null} Nombre de la pantalla anterior o null
     */
    getPreviousScreen() {
        return this.previousScreen;
    }
    
    /**
     * Verifica si una pantalla está visible
     * @param {string} screenName - Nombre de la pantalla
     * @returns {boolean} True si está visible
     */
    isVisible(screenName) {
        return this.currentScreen === screenName;
    }
    
    /**
     * Registra un listener para cambios de pantalla
     * @param {Function} callback - Función a llamar: callback(newScreen, oldScreen)
     */
    onScreenChange(callback) {
        this.listeners.push(callback);
    }
    
    /**
     * Elimina un listener
     * @param {Function} callback - Callback a eliminar
     */
    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }
    
    /**
     * Notifica a todos los listeners sobre un cambio de pantalla
     * @param {string|null} newScreen - Nueva pantalla
     * @param {string|null} oldScreen - Pantalla anterior
     */
    notifyScreenChange(newScreen, oldScreen) {
        this.listeners.forEach(callback => {
            try {
                callback(newScreen, oldScreen);
            } catch (error) {
                console.error(`❌ Error en listener de pantalla:`, error);
            }
        });
    }
}

