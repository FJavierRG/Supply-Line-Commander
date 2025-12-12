// ===== GESTOR DE OPCIONES =====

export class OptionsManager {
    constructor(audioManager) {
        this.audioManager = audioManager;
        // Establecer referencia bidireccional para que AudioManager pueda acceder al volumen maestro
        if (audioManager) {
            audioManager.optionsManager = this;
        }
        this.isVisible = false;
        
        // Configuración por defecto
        this.settings = {
            masterVolume: 1.0, // 0.0 - 1.0
            musicVolume: 1.0,
            sfxVolume: 1.0,
            showFrontCurrency: true // 🆕 NUEVO: Mostrar contador de dinero en frentes
        };
        
        // Guardar volúmenes base originales
        this.baseVolumes = { ...audioManager.volumes };
        
        // Configurar event listeners
        this.setupKeyboardListeners();
        this.setupTabListeners();
        this.setupUIOptionListeners();
        
        // Cargar configuración guardada
        this.loadSettings();
    }
    
    /**
     * Configura los event listeners de teclado
     */
    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                e.preventDefault();
                e.stopPropagation();
                this.toggleOptions();
                console.log('🚪 Opciones cerradas con ESC');
            }
        });
    }
    
    /**
     * 🆕 NUEVO: Configura los listeners de las pestañas
     */
    setupTabListeners() {
        const tabs = document.querySelectorAll('.options-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                this.switchTab(targetTab);
            });
        });
    }
    
    /**
     * 🆕 NUEVO: Cambia entre pestañas
     */
    switchTab(tabName) {
        // Actualizar pestañas activas
        document.querySelectorAll('.options-tab').forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Mostrar/ocultar contenido
        const audioContent = document.getElementById('options-audio-content');
        const uiContent = document.getElementById('options-ui-content');
        
        if (tabName === 'audio') {
            if (audioContent) audioContent.style.display = 'block';
            if (uiContent) uiContent.style.display = 'none';
        } else if (tabName === 'ui') {
            if (audioContent) audioContent.style.display = 'none';
            if (uiContent) uiContent.style.display = 'block';
        }
    }
    
    /**
     * 🆕 NUEVO: Configura los listeners de opciones de UI
     */
    setupUIOptionListeners() {
        const showFrontCurrencyCheckbox = document.getElementById('show-front-currency-checkbox');
        if (showFrontCurrencyCheckbox) {
            showFrontCurrencyCheckbox.addEventListener('change', (e) => {
                this.settings.showFrontCurrency = e.target.checked;
                this.saveSettings();
                console.log(`🎨 Mostrar dinero en frentes: ${e.target.checked}`);
            });
        }
    }
    
    /**
     * Muestra/oculta el menú de opciones
     */
    toggleOptions() {
        this.isVisible = !this.isVisible;
        
        if (this.isVisible) {
            this.showOptionsMenu();
        } else {
            this.hideOptionsMenu();
        }
    }
    
    /**
     * Muestra el menú de opciones
     */
    showOptionsMenu() {
        const menu = document.getElementById('options-menu');
        if (menu) {
            menu.style.display = 'block';
            this.updateVolumeSliders();
            this.updateUIOptions();
        }
    }
    
    /**
     * 🆕 NUEVO: Actualiza los checkboxes de opciones de UI
     */
    updateUIOptions() {
        const showFrontCurrencyCheckbox = document.getElementById('show-front-currency-checkbox');
        if (showFrontCurrencyCheckbox) {
            showFrontCurrencyCheckbox.checked = this.settings.showFrontCurrency;
        }
    }
    
    /**
     * Oculta el menú de opciones
     */
    hideOptionsMenu() {
        const menu = document.getElementById('options-menu');
        if (menu) {
            menu.style.display = 'none';
        }
    }
    
    /**
     * Actualiza los sliders de volumen con los valores actuales
     */
    updateVolumeSliders() {
        const masterSlider = document.getElementById('master-volume-slider');
        const musicSlider = document.getElementById('music-volume-slider');
        const sfxSlider = document.getElementById('sfx-volume-slider');
        
        if (masterSlider) masterSlider.value = this.settings.masterVolume * 100;
        if (musicSlider) musicSlider.value = this.settings.musicVolume * 100;
        if (sfxSlider) sfxSlider.value = this.settings.sfxVolume * 100;
        
        this.updateVolumeLabels();
    }
    
    /**
     * Actualiza las etiquetas de volumen
     */
    updateVolumeLabels() {
        const masterLabel = document.getElementById('master-volume-label');
        const musicLabel = document.getElementById('music-volume-label');
        const sfxLabel = document.getElementById('sfx-volume-label');
        
        if (masterLabel) masterLabel.textContent = Math.round(this.settings.masterVolume * 100) + '%';
        if (musicLabel) musicLabel.textContent = Math.round(this.settings.musicVolume * 100) + '%';
        if (sfxLabel) sfxLabel.textContent = Math.round(this.settings.sfxVolume * 100) + '%';
    }
    
    /**
     * Cambia el volumen maestro
     */
    setMasterVolume(value) {
        this.settings.masterVolume = value / 100;
        console.log(`🔊 Volumen maestro: ${value}%`);
        this.applyVolumeSettings();
        this.updateVolumeLabels();
        this.saveSettings();
    }
    
    /**
     * Cambia el volumen de la música
     */
    setMusicVolume(value) {
        this.settings.musicVolume = value / 100;
        console.log(`🎵 Volumen música: ${value}%`);
        this.applyVolumeSettings();
        this.updateVolumeLabels();
        this.saveSettings();
    }
    
    /**
     * Cambia el volumen de efectos de sonido
     */
    setSfxVolume(value) {
        this.settings.sfxVolume = value / 100;
        console.log(`🔊 Volumen efectos: ${value}%`);
        this.applyVolumeSettings();
        this.updateVolumeLabels();
        this.saveSettings();
    }
    
    /**
     * Aplica los ajustes de volumen al AudioManager
     */
    applyVolumeSettings() {
        if (this.audioManager) {
            console.log('🎛️ Aplicando ajustes de volumen:', this.settings);
            
            // Aplicar volumen maestro a todos los sonidos usando volúmenes base
            Object.keys(this.baseVolumes).forEach(soundType => {
                let finalVolume = this.baseVolumes[soundType] * this.settings.masterVolume;
                
                // Clasificar como música o efectos de sonido
                const musicSounds = ['ambiance', 'mainTheme', 'victoryMarch'];
                if (musicSounds.includes(soundType)) {
                    // Música
                    finalVolume *= this.settings.musicVolume;
                } else {
                    // Efectos de sonido
                    finalVolume *= this.settings.sfxVolume;
                }
                
                console.log(`  ${soundType}: ${this.baseVolumes[soundType]} → ${finalVolume}`);
                this.audioManager.setVolume(soundType, finalVolume);
            });
            
            // Actualizar volumen de drones activos
            if (this.audioManager.updateActiveDroneVolumes) {
                this.audioManager.updateActiveDroneVolumes();
            }
            
            // Actualizar volumen de todas las instancias de sonido dinámicas activas
            if (this.audioManager.updateActiveSoundInstances) {
                this.audioManager.updateActiveSoundInstances();
            }
        } else {
            console.warn('⚠️ AudioManager no disponible');
        }
    }
    
    /**
     * Guarda la configuración en localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('gameSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('No se pudieron guardar las opciones:', error);
        }
    }
    
    /**
     * Carga la configuración desde localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('gameSettings');
            if (saved) {
                const loadedSettings = JSON.parse(saved);
                this.settings = { ...this.settings, ...loadedSettings };
                this.applyVolumeSettings();
            }
        } catch (error) {
            console.warn('No se pudieron cargar las opciones:', error);
        }
    }
    
    /**
     * Resetea todas las opciones a los valores por defecto
     */
    resetToDefaults() {
        this.settings = {
            masterVolume: 1.0,
            musicVolume: 1.0,
            sfxVolume: 1.0,
            showFrontCurrency: true
        };
        
        this.applyVolumeSettings();
        this.updateVolumeSliders();
        this.updateUIOptions();
        this.saveSettings();
        
        console.log('🔄 Opciones restauradas a valores por defecto');
    }
    
    /**
     * 🆕 NUEVO: Obtiene si se debe mostrar el contador de dinero en frentes
     */
    shouldShowFrontCurrency() {
        return this.settings.showFrontCurrency !== false; // Por defecto true
    }
}












