// ===== SISTEMA DE AUDIO =====

export class AudioManager {
    constructor() {
        this.sounds = {};
        this.music = {};
        this.lastTruckSound = 0;
        this.truckCooldown = 2000;
        this.lastHQSound = 0;
        this.hqCooldown = 3000;
        this.lastWhisperSound = 0;
        this.whisperCooldown = 3000; // 3 segundos como solicitado
        
        // Pool de sonidos activos para permitir múltiples simultáneos
        this.activeDroneSounds = new Map(); // droneId -> Audio instance
        this.soundInstances = []; // Array de todas las instancias de audio activas
        this.soundInstanceMap = new Map(); // Audio instance -> { soundType, baseVolume }
        
        // Timers para sonidos ambientales
        this.clearShootsTimer = 0;
        this.radioEffectTimer = 0;
        
        // Flags de eventos únicos
        this.hasPlayedEnemyContact = false;
        
        // Flags por frente para sonidos específicos
        this.noAmmoSoundPlayed = new Set(); // IDs de frentes que ya reprodujeron no_ammo
        this.manDownSoundPlayed = new Set(); // IDs de frentes que ya reprodujeron man_down
        
        // Referencia al OptionsManager para obtener volumen maestro (se establecerá después)
        this.optionsManager = null;
        
        // Configuración de volúmenes (0.0 a 1.0)
        this.volumes = {
            ambiance: 0.4875, // +30% adicional (0.375 * 1.3 = 0.4875)
            mainTheme: 0.3, // Música del menú principal
            victoryMarch: 0.4, // Música de victoria
            truck: 0.05,
            hq: 0.3,
            explosion: 0.45,
            drone: 0.263,
            clearShoots: 0.07, // -30% adicional (0.1 * 0.7 = 0.07)
            countdown: 0.4,
            enemyContact: 0.21, // -30% adicional (0.3 * 0.7 = 0.21)
            infantryMove: 0.14, // -50% adicional (0.28 * 0.5 = 0.14)
            manDown: 0.0875, // -50% adicional (0.175 * 0.5 = 0.0875)
            noAmmo: 0.175, // -30% adicional (0.25 * 0.7 = 0.175)
            placeBuilding: 0.3,
            radioEffect: 0.12,
            startingEngine: 0.28, // -30% (0.4 * 0.7 = 0.28)
            bomShoot: 0.3, // Sonido de disparo anti-drone (-25% de 0.4)
            antiDroneSpawn: 0.2625, // Sonido al construir anti-drone (-25% de 0.35)
            antiDroneAttack: 0.3, // Sonido de alerta de ataque anti-drone (-25% de 0.4)
            sniperSpotted: 0.84, // Sonido de francotirador detectando objetivo (+110%)
            chopper: 0.2, // Sonido de chopper (muy reducido, era demasiado alto)
            whisper: 0.9, // Sonido de whisper para specops (+30%: 0.3 * 1.3 = 0.39)
            commando: 0.6, // Sonido de despliegue de comando (+20% respecto a 0.5)
            menuHover: 0.4, // Sonido de hover en botones del menú
            alarm: 0.5, // Sonido de alarma del destructor de mundos
            nuclearExplosion: 0.6 // Sonido de explosión nuclear del destructor de mundos
        };
        
        this.loadSounds();
    }
    
    loadSounds() {
        // CORREGIDO: usar el repositorio correcto y la rama correcta
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const SOUNDS_BASE_URL = isLocalhost ? 
            'assets/sounds/normalized/' : 
            'https://raw.githubusercontent.com/FJavierRG/Supply-Line-Commander/master/assets/sounds/normalized/';
        
        // Música de fondo (normalizada)
        this.music.ambiance = this.createAudio(SOUNDS_BASE_URL + 'warsound_normalized.wav', this.volumes.ambiance, true);
        
        // Efectos de sonido originales (normalizados)
        this.sounds.truck = this.createAudio(SOUNDS_BASE_URL + 'truckengine_normalized.wav', this.volumes.truck, false);
        this.sounds.hq = this.createAudio(SOUNDS_BASE_URL + 'hqsound_normalized.wav', this.volumes.hq, false);
        this.sounds.explosion = this.createAudio(SOUNDS_BASE_URL + 'explosion_normalized.wav', this.volumes.explosion, false);
        this.sounds.drone = this.createAudio(SOUNDS_BASE_URL + 'droneflying_normalized.wav', this.volumes.drone, false);
        
        // Nuevos sonidos ambientales (normalizados)
        this.sounds.clearShoots = this.createAudio(SOUNDS_BASE_URL + 'clear_shoots_ambiance_normalized.wav', this.volumes.clearShoots, false);
        this.sounds.countdown = this.createAudio(SOUNDS_BASE_URL + 'countdown_normalized.wav', this.volumes.countdown, false);
        this.sounds.enemyContact = this.createAudio(SOUNDS_BASE_URL + 'enemy_contact_normalized.wav', this.volumes.enemyContact, false);
        this.sounds.startingEngine = this.createAudio(SOUNDS_BASE_URL + 'startinggame_engine_normalized.wav', this.volumes.startingEngine, false);
        this.sounds.placeBuilding = this.createAudio(SOUNDS_BASE_URL + 'place_building_normalized.wav', this.volumes.placeBuilding, false);
        
        // Variantes de infantry move (normalizadas)
        this.sounds.infantryMove1 = this.createAudio(SOUNDS_BASE_URL + 'infantry_move1_normalized.wav', this.volumes.infantryMove, false);
        this.sounds.infantryMove2 = this.createAudio(SOUNDS_BASE_URL + 'infantry_move2_normalized.wav', this.volumes.infantryMove, false);
        this.sounds.infantryMove3 = this.createAudio(SOUNDS_BASE_URL + 'infantry_move3_normalized.wav', this.volumes.infantryMove, false);
        
        // Variantes de man down (normalizadas)
        this.sounds.manDown1 = this.createAudio(SOUNDS_BASE_URL + 'man_down1_normalized.wav', this.volumes.manDown, false);
        this.sounds.manDown2 = this.createAudio(SOUNDS_BASE_URL + 'man_down2_normalized.wav', this.volumes.manDown, false);
        
        // Variantes de no ammo (normalizadas)
        this.sounds.noAmmo1 = this.createAudio(SOUNDS_BASE_URL + 'no_ammo1_normalized.wav', this.volumes.noAmmo, false);
        this.sounds.noAmmo2 = this.createAudio(SOUNDS_BASE_URL + 'no_ammo2_normalized.wav', this.volumes.noAmmo, false);
        this.sounds.noAmmo3 = this.createAudio(SOUNDS_BASE_URL + 'no_ammo3_normalized.wav', this.volumes.noAmmo, false);
        this.sounds.noAmmo4 = this.createAudio(SOUNDS_BASE_URL + 'no_ammo4_normalized.wav', this.volumes.noAmmo, false);
        
        // Variantes de radio effect (normalizadas)
        this.sounds.radioEffect1 = this.createAudio(SOUNDS_BASE_URL + 'radio_effect1_normalized.wav', this.volumes.radioEffect, false);
        this.sounds.radioEffect2 = this.createAudio(SOUNDS_BASE_URL + 'radio_effect2_normalized.wav', this.volumes.radioEffect, false);
        this.sounds.radioEffect3 = this.createAudio(SOUNDS_BASE_URL + 'radio_effect3_normalized.wav', this.volumes.radioEffect, false);
        this.sounds.radioEffect4 = this.createAudio(SOUNDS_BASE_URL + 'radio_effect4_normalized.wav', this.volumes.radioEffect, false);
        
        // Sonidos de sistema anti-drone
        this.sounds.bomShoot = this.createAudio(SOUNDS_BASE_URL + 'bom_shoot1_normalized.wav', this.volumes.bomShoot, false);
        this.sounds.antiDroneSpawn = this.createAudio(SOUNDS_BASE_URL + 'antidrone_spawn_normalized.wav', this.volumes.antiDroneSpawn, false);
        this.sounds.antiDroneAttack = this.createAudio(SOUNDS_BASE_URL + 'antidrone_attack_normalized.wav', this.volumes.antiDroneAttack, false);
        
        // Sonido de francotirador
        this.sounds.sniperSpotted = this.createAudio(SOUNDS_BASE_URL + 'sniper_spotted_normalized.wav', this.volumes.sniperSpotted, false);
        this.sounds.sniperShoot = this.createAudio(SOUNDS_BASE_URL + 'sniper_shoot.wav', 0.1, false); // 50% del volumen anterior
        
        // Sonido de chopper
        this.sounds.chopper = this.createAudio(SOUNDS_BASE_URL + 'chopper_normalized.wav', this.volumes.chopper, false);
        
        // Sonido de whisper para specops
        this.sounds.whisper = this.createAudio(SOUNDS_BASE_URL + 'specops_whisper.wav', this.volumes.whisper, false);
        
        // Sonidos de despliegue de comando
        this.sounds.commando1 = this.createAudio(SOUNDS_BASE_URL + 'commando1.wav', this.volumes.commando, false);
        this.sounds.commando2 = this.createAudio(SOUNDS_BASE_URL + 'commando2.wav', this.volumes.commando, false);
        
        // Música de menú - PRUEBA: cargar con fetch para verificar que funciona
        const mainThemeUrl = SOUNDS_BASE_URL + 'main_theme.wav';
        
        // Test: verificar que la URL es accesible
        fetch(mainThemeUrl, {method: 'HEAD'})
            .then(response => {
            })
            .catch(error => {
                console.error('❌ URL no accesible:', error);
            });
        
        this.music.mainTheme = this.createAudio(mainThemeUrl, this.volumes.mainTheme, true); // Loop activado
        
        // Música de victoria
        this.music.victoryMarch = this.createAudio(SOUNDS_BASE_URL + 'Victory-March.wav', this.volumes.victoryMarch, false); // Sin loop
        
        // Sonido de hover en menú - TEST: probar con sonido más pequeño
        const menuHoverUrl = SOUNDS_BASE_URL + 'menu_choice.wav';
        this.sounds.menuHover = this.createAudio(menuHoverUrl, this.volumes.menuHover, false);
        
        // Sonidos del destructor de mundos
        this.sounds.alarm = this.createAudio(SOUNDS_BASE_URL + 'alarm_sound_normalized.wav', this.volumes.alarm, false);
        this.sounds.nuclearExplosion = this.createAudio(SOUNDS_BASE_URL + 'nucelar_explosion_normalized.wav', this.volumes.nuclearExplosion, false);
    }
    
    createAudio(src, volume, loop) {
        const audio = new Audio();
        
        // Configurar propiedades ANTES de asignar src
        audio.volume = volume;
        audio.loop = loop;
        audio.crossOrigin = 'anonymous'; // Importante para CORS
        
        // Añadir listeners para debug ANTES de cargar
        audio.addEventListener('error', (e) => {
            console.error(`❌ Error cargando audio: ${src}`, e);
            console.error(`   Error details:`, {
                code: audio.error?.code,
                message: audio.error?.message,
                networkState: audio.networkState,
                readyState: audio.readyState
            });
        });
        
        audio.addEventListener('loadstart', () => {
        });
        
        audio.addEventListener('canplaythrough', () => {
        });
        
        // Asignar src DESPUÉS de configurar todo
        audio.src = src;
        
        return audio;
    }
    
    /**
     * Desbloquea el contexto de audio del navegador
     * Debe llamarse después de una interacción del usuario
     */
    unlockAudioContext() {
        // Intentar reproducir un sonido silencioso para desbloquear el contexto
        const testAudio = new Audio();
        testAudio.volume = 0.01; // Muy bajo para no molestarte
        testAudio.preload = 'none';
        
        // Intentar reproducir
        const playPromise = testAudio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                testAudio.pause();
                testAudio.currentTime = 0;
            }).catch(error => {
                console.log('⚠️ No se pudo desbloquear audio:', error);
            });
        }
        
        // Desbloquear el tema del menú intentando reproducirlo y pausarlo
        // Esto desbloquea el contexto sin dejar el audio reproduciéndose
        if (this.music.mainTheme) {
            // Asegurarse de que el volumen esté configurado correctamente
            this.music.mainTheme.volume = this.volumes.mainTheme;
            
            // Intentar reproducir para desbloquear el contexto
            const mainThemePromise = this.music.mainTheme.play();
            if (mainThemePromise !== undefined) {
                mainThemePromise.then(() => {
                    // Desbloquear el contexto pausándolo inmediatamente
                    // Esto permite que playMainTheme() lo reproduzca después sin problemas
                    this.music.mainTheme.pause();
                    this.music.mainTheme.currentTime = 0;
                }).catch(() => {
                    // Si falla, el audio se intentará reproducir en playMainTheme()
                });
            }
        }
    }
    
    /**
     * Reproduce un sonido SIN cancelar instancias previas
     * Crea una nueva instancia cada vez para permitir solapamiento
     * @param {string} src - Ruta del archivo de audio
     * @param {number} volume - Volumen (0.0 a 1.0) - se usa directamente sin aplicar volumen maestro adicional
     *                          (el volumen ya debe venir con el volumen maestro aplicado si viene del objeto original)
     * @param {string} soundType - Tipo de sonido (opcional, para poder actualizar el volumen después)
     * @returns {Audio} Instancia de audio creada
     */
    playSoundInstance(src, volume, soundType = null) {
        // Detectar el tipo de sonido si no se proporciona
        if (!soundType) {
            // Intentar detectar el tipo basándose en la ruta del archivo
            const srcLower = src.toLowerCase();
            if (srcLower.includes('man_down')) soundType = 'manDown';
            else if (srcLower.includes('no_ammo')) soundType = 'noAmmo';
            else if (srcLower.includes('radio_effect')) soundType = 'radioEffect';
            else if (srcLower.includes('explosion')) soundType = 'explosion';
            else if (srcLower.includes('place_building')) soundType = 'placeBuilding';
            else if (srcLower.includes('bom_shoot')) soundType = 'bomShoot';
            else if (srcLower.includes('antidrone_spawn')) soundType = 'antiDroneSpawn';
            else if (srcLower.includes('antidrone_attack')) soundType = 'antiDroneAttack';
            else if (srcLower.includes('alarm_sound')) soundType = 'alarm';
            else if (srcLower.includes('nucelar_explosion')) soundType = 'nuclearExplosion';
        }
        
        // Obtener volumen base original (sin volumen maestro aplicado)
        // Necesitamos el volumen base del OptionsManager para recalcular correctamente
        let baseVolume = volume;
        if (soundType && this.optionsManager && this.optionsManager.baseVolumes[soundType] !== undefined) {
            // Usar el volumen base original del OptionsManager
            baseVolume = this.optionsManager.baseVolumes[soundType];
        } else if (soundType && this.volumes[soundType] !== undefined) {
            // Fallback: usar el volumen actual (ya tiene volumen maestro aplicado)
            // Esto no es ideal pero funciona si no hay OptionsManager
            baseVolume = this.volumes[soundType];
            // Intentar deshacer el volumen maestro si está disponible
            if (this.optionsManager) {
                const masterVol = this.optionsManager.settings.masterVolume || 1.0;
                const sfxVol = this.optionsManager.settings.sfxVolume || 1.0;
                const musicSounds = ['ambiance', 'mainTheme', 'victoryMarch'];
                if (musicSounds.includes(soundType)) {
                    const musicVol = this.optionsManager.settings.musicVolume || 1.0;
                    baseVolume = this.volumes[soundType] / (masterVol * musicVol);
                } else {
                    baseVolume = this.volumes[soundType] / (masterVol * sfxVol);
                }
            }
        }
        
        // Usar el volumen directamente - si viene del objeto original ya tiene el volumen maestro aplicado
        const audio = this.createAudio(src, volume, false);
        
        // Guardar información de la instancia para poder actualizar su volumen después
        if (soundType) {
            this.soundInstanceMap.set(audio, { soundType, baseVolume });
        }
        
        // Limpiar cuando termine
        audio.addEventListener('ended', () => {
            const index = this.soundInstances.indexOf(audio);
            if (index > -1) {
                this.soundInstances.splice(index, 1);
            }
            this.soundInstanceMap.delete(audio);
        });
        
        audio.play().catch(e => {});
        this.soundInstances.push(audio);
        
        return audio;
    }
    
    /**
     * Actualiza el volumen de un sonido específico
     */
    setVolume(soundName, volume) {
        if (this.sounds[soundName]) {
            this.sounds[soundName].volume = Math.max(0, Math.min(1, volume));
            this.volumes[soundName] = this.sounds[soundName].volume;
        }
        if (this.music[soundName]) {
            this.music[soundName].volume = Math.max(0, Math.min(1, volume));
            this.volumes[soundName] = this.music[soundName].volume;
        }
    }
    
    /**
     * Inicia la música de batalla
     */
    startBattleMusic() {
        if (this.music.ambiance) {
            this.music.ambiance.currentTime = 0;
            this.music.ambiance.play().catch(e => console.log('Audio bloqueado por navegador'));
        }
    }
    
    /**
     * Detiene la música de batalla
     */
    stopBattleMusic() {
        if (this.music.ambiance) {
            this.music.ambiance.pause();
            this.music.ambiance.currentTime = 0;
        }
    }
    
    /**
     * Reproduce sonido de camión (con cooldown de 2s)
     */
    playTruckSound() {
        const now = Date.now();
        const timeSinceLastSound = now - this.lastTruckSound;
        
        if (timeSinceLastSound >= this.truckCooldown) {
            if (this.sounds.truck) {
                this.sounds.truck.currentTime = 0;
                this.sounds.truck.play().catch(e => {});
                this.lastTruckSound = now;
            }
        }
    }
    
    /**
     * Reproduce sonido de camión del enemigo (con cooldown de 2s y volumen reducido 50% respecto al original)
     */
    playEnemyTruckSound() {
        const now = Date.now();
        const timeSinceLastSound = now - this.lastTruckSound;
        
        if (timeSinceLastSound >= this.truckCooldown) {
            if (this.sounds.truck) {
                // Reducir volumen 50% para camiones del enemigo (era 70%, ahora 56% = 70% * 80%)
                const originalVolume = this.sounds.truck.volume;
                const enemyVolume = originalVolume * 0.56; // 56% del volumen original (reducido 20% adicional)
                
                this.sounds.truck.volume = enemyVolume;
                this.sounds.truck.currentTime = 0;
                this.sounds.truck.play().catch(e => {});
                
                // Restaurar volumen original después de un pequeño delay
                setTimeout(() => {
                    if (this.sounds.truck) {
                        this.sounds.truck.volume = originalVolume;
                    }
                }, 100);
                
                this.lastTruckSound = now;
            }
        }
    }
    
    /**
     * Reproduce sonido del HQ (con cooldown de 3s)
     */
    playHQSound() {
        const now = Date.now();
        if (now - this.lastHQSound >= this.hqCooldown) {
            if (this.sounds.hq) {
                this.sounds.hq.currentTime = 0;
                this.sounds.hq.play().catch(e => {});
                this.lastHQSound = now;
            }
        }
    }
    
    /**
     * Reproduce sonido de explosión (permite múltiples simultáneas)
     */
    playExplosionSound() {
        // Usar el volumen del objeto original que ya tiene el volumen maestro aplicado
        const explosionVolume = this.sounds.explosion ? this.sounds.explosion.volume : this.volumes.explosion;
        this.playSoundInstance('assets/sounds/normalized/explosion_normalized.wav', explosionVolume, 'explosion');
    }
    
    /**
     * Reproduce sonido del dron (crea una instancia independiente para cada dron)
     * @param {string} droneId - ID único del dron
     */
    playDroneSound(droneId) {
        // Obtener volumen actualizado con volumen maestro aplicado
        let finalVolume = this.volumes.drone;
        if (this.optionsManager) {
            const masterVolume = this.optionsManager.settings.masterVolume || 1.0;
            const sfxVolume = this.optionsManager.settings.sfxVolume || 1.0;
            finalVolume = this.volumes.drone * masterVolume * sfxVolume;
        }
        
        // Crear una nueva instancia de Audio para este dron específico
        const droneAudio = this.createAudio('assets/sounds/normalized/droneflying_normalized.wav', finalVolume, true);
        droneAudio.play().catch(e => {});
        
        // Guardar referencia para poder detenerla después
        this.activeDroneSounds.set(droneId, droneAudio);
        
        return droneAudio;
    }
    
    /**
     * Detiene el sonido de un dron específico
     * @param {string} droneId - ID único del dron
     */
    stopDroneSound(droneId) {
        const droneSound = this.activeDroneSounds.get(droneId);
        if (droneSound) {
            droneSound.pause();
            droneSound.currentTime = 0;
            this.activeDroneSounds.delete(droneId);
        }
    }
    
    /**
     * Reproduce sonido de alarma del destructor de mundos (cuando se activa)
     * Se reproduce para ambos jugadores cuando se activa el destructor
     */
    playAlarmSound() {
        // Obtener volumen actualizado con volumen maestro aplicado
        let finalVolume = this.volumes.alarm;
        if (this.optionsManager) {
            const masterVolume = this.optionsManager.settings.masterVolume || 1.0;
            const sfxVolume = this.optionsManager.settings.sfxVolume || 1.0;
            finalVolume = this.volumes.alarm * masterVolume * sfxVolume;
        }
        
        // Reproducir sonido (usar instancia para permitir múltiples reproducciones)
        this.playSoundInstance('assets/sounds/normalized/alarm_sound_normalized.wav', finalVolume, 'alarm');
    }
    
    /**
     * Reproduce sonido de explosión nuclear del destructor de mundos (cuando se muestra el flash blanco)
     * Se reproduce para ambos jugadores cuando se ejecuta el destructor
     */
    playNuclearExplosionSound() {
        // Obtener volumen actualizado con volumen maestro aplicado
        let finalVolume = this.volumes.nuclearExplosion;
        if (this.optionsManager) {
            const masterVolume = this.optionsManager.settings.masterVolume || 1.0;
            const sfxVolume = this.optionsManager.settings.sfxVolume || 1.0;
            finalVolume = this.volumes.nuclearExplosion * masterVolume * sfxVolume;
        }
        
        // Reproducir sonido (usar instancia para permitir múltiples reproducciones)
        this.playSoundInstance('assets/sounds/normalized/nucelar_explosion_normalized.wav', finalVolume, 'nuclearExplosion');
    }
    
    /**
     * Detiene todos los sonidos de drones
     */
    stopAllDroneSounds() {
        for (const [droneId, audio] of this.activeDroneSounds.entries()) {
            audio.pause();
            audio.currentTime = 0;
        }
        this.activeDroneSounds.clear();
    }
    
    /**
     * Actualiza el volumen de todos los drones activos con el volumen maestro actual
     */
    updateActiveDroneVolumes() {
        if (!this.optionsManager) return;
        
        const masterVolume = this.optionsManager.settings.masterVolume || 1.0;
        const sfxVolume = this.optionsManager.settings.sfxVolume || 1.0;
        const baseVolume = this.volumes.drone || 0.263;
        const finalVolume = baseVolume * masterVolume * sfxVolume;
        
        for (const [droneId, audio] of this.activeDroneSounds.entries()) {
            audio.volume = finalVolume;
        }
    }
    
    /**
     * Actualiza el volumen de todas las instancias de sonido dinámicas activas
     * con el volumen maestro y de efectos actual
     */
    updateActiveSoundInstances() {
        if (!this.optionsManager) return;
        
        const masterVolume = this.optionsManager.settings.masterVolume || 1.0;
        const sfxVolume = this.optionsManager.settings.sfxVolume || 1.0;
        
        // Clasificar sonidos de música (no deberían estar aquí, pero por si acaso)
        const musicSounds = ['ambiance', 'mainTheme', 'victoryMarch'];
        const musicVolume = this.optionsManager.settings.musicVolume || 1.0;
        
        // Actualizar todas las instancias activas
        for (const audio of this.soundInstances) {
            const instanceInfo = this.soundInstanceMap.get(audio);
            
            if (instanceInfo && instanceInfo.soundType) {
                // Tenemos información del tipo de sonido, recalcular volumen usando el volumen base guardado
                let baseVol = instanceInfo.baseVolume;
                
                // Si tenemos el volumen base en OptionsManager, usarlo (es más confiable)
                if (this.optionsManager.baseVolumes[instanceInfo.soundType] !== undefined) {
                    baseVol = this.optionsManager.baseVolumes[instanceInfo.soundType];
                }
                
                let finalVolume = baseVol * masterVolume;
                
                // Aplicar volumen de música o efectos según corresponda
                if (musicSounds.includes(instanceInfo.soundType)) {
                    finalVolume *= musicVolume;
                } else {
                    finalVolume *= sfxVolume;
                }
                
                audio.volume = Math.max(0, Math.min(1, finalVolume));
            }
            // Si no tenemos información del tipo, no podemos actualizar correctamente
            // Esto no debería pasar si todas las llamadas pasan el soundType
        }
    }
    
    /**
     * Reproduce la música del menú principal
     */
    playMainTheme() {
        if (this.music.mainTheme) {
            // Asegurarse de que el volumen esté configurado correctamente
            this.music.mainTheme.volume = this.volumes.mainTheme;
            
            // Si ya está reproduciendo, no hacer nada
            if (!this.music.mainTheme.paused) {
                return;
            }
            
            // Verificar si el audio está listo para reproducir
            if (this.music.mainTheme.readyState >= 3) { // HAVE_FUTURE_DATA o superior
                // Si estaba en tiempo 0, significa que es la primera vez
                // Intentar reproducir directamente
                const playPromise = this.music.mainTheme.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        // Si falla, puede ser que el contexto de audio no esté desbloqueado
                        // Intentar desbloquear y reproducir de nuevo
                        console.log('⚠️ Error al reproducir tema principal, reintentando...');
                        this.unlockAudioContext();
                        // Esperar un poco y reintentar
                        setTimeout(() => {
                            this.music.mainTheme.play().catch(err => {
                                console.error('❌ No se pudo reproducir el tema principal:', err);
                            });
                        }, 100);
                    });
                }
            } else {
                // Esperar a que esté listo
                const onCanPlay = () => {
                    this.music.mainTheme.removeEventListener('canplaythrough', onCanPlay);
                    const playPromise = this.music.mainTheme.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => {
                            console.error('❌ Error al reproducir tema principal después de cargar:', e);
                        });
                    }
                };
                this.music.mainTheme.addEventListener('canplaythrough', onCanPlay);
            }
        }
    }
    
    /**
     * Detiene la música del menú principal
     */
    stopMainTheme() {
        if (this.music.mainTheme) {
            this.music.mainTheme.pause();
            this.music.mainTheme.currentTime = 0;
        }
    }
    
    /**
     * Reproduce el sonido de hover del menú
     */
    playMenuHover() {
        if (this.sounds.menuHover) {
            // Reiniciar el sonido si ya se está reproduciendo
            this.sounds.menuHover.currentTime = 0;
            this.sounds.menuHover.play().catch(e => {});
        }
    }
    
    /**
     * Reproduce la música de victoria
     */
    playVictoryMarch() {
        if (this.music.victoryMarch) {
            // Verificar si el audio está listo para reproducir
            if (this.music.victoryMarch.readyState >= 3) { // HAVE_FUTURE_DATA o superior
                this.music.victoryMarch.play().catch(e => {
                });
            } else {
                // Esperar a que esté listo
                const onCanPlay = () => {
                    this.music.victoryMarch.removeEventListener('canplaythrough', onCanPlay);
                    this.music.victoryMarch.play().catch(e => {
                    });
                };
                this.music.victoryMarch.addEventListener('canplaythrough', onCanPlay);
            }
        }
    }
    
    /**
     * Detiene la música de victoria
     */
    stopVictoryMarch() {
        if (this.music.victoryMarch) {
            this.music.victoryMarch.pause();
            this.music.victoryMarch.currentTime = 0;
        }
    }
    
    /**
     * Detiene todos los sonidos (música y efectos)
     */
    stopAllSounds() {
        // Detener música de batalla
        this.stopBattleMusic();
        
        // Detener todas las músicas
        Object.values(this.music).forEach(music => {
            if (music) {
                music.pause();
                music.currentTime = 0;
            }
        });
        
        // Detener todos los efectos de sonido
        Object.values(this.sounds).forEach(sound => {
            if (sound) {
                sound.pause();
                sound.currentTime = 0;
            }
        });
        
        // Detener todos los sonidos de drones
        this.stopAllDroneSounds();
    }
    
    /**
     * Update - maneja sonidos ambientales con timer
     */
    update(dt) {
        this.clearShootsTimer += dt;
        this.radioEffectTimer += dt;
        
        // Clear shoots cada 60 segundos
        if (this.clearShootsTimer >= 60) {
            this.playClearShoots();
            this.clearShootsTimer = 0;
        }
        
        // Radio effect cada 50 segundos
        if (this.radioEffectTimer >= 50) {
            this.playRandomRadioEffect();
            this.radioEffectTimer = 0;
        }
    }
    
    /**
     * Reproduce sonido de construcción colocada (permite múltiples simultáneas)
     */
    playPlaceBuildingSound() {
        // Usar el volumen del objeto original que ya tiene el volumen maestro aplicado
        const placeVolume = this.sounds.placeBuilding ? this.sounds.placeBuilding.volume : this.volumes.placeBuilding;
        this.playSoundInstance('assets/sounds/normalized/place_building_normalized.wav', placeVolume, 'placeBuilding');
    }
    
    /**
     * Reproduce sonido de disparo anti-drone (acortado 15%, permite múltiples simultáneos)
     */
    playBomShootSound(playbackRate = 1.0) {
        // Usar el volumen del objeto original que ya tiene el volumen maestro aplicado
        const baseVolume = this.sounds.bomShoot ? this.sounds.bomShoot.volume : this.volumes.bomShoot;
        const volume = playbackRate === 2.0 ? baseVolume * 2.4 : baseVolume; // +140% si es sniper
        const audio = this.playSoundInstance('assets/sounds/normalized/bom_shoot1_normalized.wav', volume, 'bomShoot');
        
        // Aplicar velocidad de reproducción
        audio.playbackRate = playbackRate;
        
        // Detener el sonido un 15% antes de que termine
        audio.addEventListener('loadedmetadata', () => {
            if (audio.duration) {
                const cutoffTime = audio.duration * 0.85 / playbackRate; // Ajustar por velocidad
                setTimeout(() => {
                    audio.pause();
                    audio.currentTime = 0;
                }, cutoffTime * 1000);
            }
        });
    }
    
    /**
     * Reproduce sonido de spawn de anti-drone (permite múltiples simultáneos)
     */
    playAntiDroneSpawnSound() {
        // Usar el volumen del objeto original que ya tiene el volumen maestro aplicado
        const spawnVolume = this.sounds.antiDroneSpawn ? this.sounds.antiDroneSpawn.volume : this.volumes.antiDroneSpawn;
        this.playSoundInstance('assets/sounds/normalized/antidrone_spawn_normalized.wav', spawnVolume, 'antiDroneSpawn');
    }
    
    /**
     * Reproduce sonido de alerta de ataque anti-drone (permite múltiples simultáneos)
     */
    playAntiDroneAttackSound() {
        // Usar el volumen del objeto original que ya tiene el volumen maestro aplicado
        const attackVolume = this.sounds.antiDroneAttack ? this.sounds.antiDroneAttack.volume : this.volumes.antiDroneAttack;
        this.playSoundInstance('assets/sounds/normalized/antidrone_attack_normalized.wav', attackVolume, 'antiDroneAttack');
    }
    
    /**
     * Reproduce sonido de contacto enemigo (solo una vez)
     */
    playEnemyContact() {
        if (!this.hasPlayedEnemyContact && this.sounds.enemyContact) {
            this.sounds.enemyContact.currentTime = 0;
            this.sounds.enemyContact.play().catch(e => {});
            this.hasPlayedEnemyContact = true;
        }
    }
    
    /**
     * Reproduce sonido aleatorio de "man down" (solo una vez por frente, permite múltiples simultáneos)
     */
    playManDownSound(frontId = null) {
        // Si se proporciona ID de frente, verificar si ya se reprodujo
        if (frontId && this.manDownSoundPlayed.has(frontId)) {
            return; // Ya se reprodujo para este frente
        }
        
        // Usar el volumen del objeto original que ya tiene el volumen maestro aplicado
        const manDownVolume = this.sounds.manDown1 ? this.sounds.manDown1.volume : this.volumes.manDown;
        const variant = Math.random() < 0.5 ? 1 : 2;
        this.playSoundInstance(`assets/sounds/normalized/man_down${variant}_normalized.wav`, manDownVolume, 'manDown');
        
        // Marcar como reproducido para este frente
        if (frontId) {
            this.manDownSoundPlayed.add(frontId);
        }
    }
    
    /**
     * Reproduce sonido aleatorio de "no ammo" (solo una vez por frente, permite múltiples simultáneos)
     */
    playNoAmmoSound(frontId = null) {
        // Si se proporciona ID de frente, verificar si ya se reprodujo
        if (frontId && this.noAmmoSoundPlayed.has(frontId)) {
            return; // Ya se reprodujo para este frente
        }
        
        // Usar el volumen del objeto original que ya tiene el volumen maestro aplicado
        const noAmmoVolume = this.sounds.noAmmo1 ? this.sounds.noAmmo1.volume : this.volumes.noAmmo;
        const variantNum = Math.floor(Math.random() * 4) + 1;
        this.playSoundInstance(`assets/sounds/normalized/no_ammo${variantNum}_normalized.wav`, noAmmoVolume, 'noAmmo');
        
        // Marcar como reproducido para este frente
        if (frontId) {
            this.noAmmoSoundPlayed.add(frontId);
        }
    }
    
    /**
     * Reproduce clear shoots ambiance
     */
    playClearShoots() {
        if (this.sounds.clearShoots) {
            this.sounds.clearShoots.currentTime = 0;
            this.sounds.clearShoots.play().catch(e => {});
        }
    }
    
    /**
     * Reproduce radio effect aleatorio (permite múltiples simultáneos)
     */
    playRandomRadioEffect() {
        const variantNum = Math.floor(Math.random() * 4) + 1;
        // Usar el volumen del objeto original que ya tiene el volumen maestro aplicado
        const radioVolume = this.sounds.radioEffect1 ? this.sounds.radioEffect1.volume : this.volumes.radioEffect;
        this.playSoundInstance(`assets/sounds/normalized/radio_effect${variantNum}_normalized.wav`, radioVolume, 'radioEffect');
    }
    
    /**
     * Inicia la secuencia de cuenta atrás y comienzo de batalla
     */
    playGameStartSequence(onComplete) {
        // Reproducir SOLO countdown (1, 2, 3)
        if (this.sounds.countdown) {
            this.sounds.countdown.currentTime = 0;
            this.sounds.countdown.play().catch(e => {});
        }
        
        // Cuando termina countdown (3 segundos), reproducir resto de sonidos
        setTimeout(() => {
            // Reproducir dos infantry move aleatorios con desync de 0.7s
            const variants = ['infantryMove1', 'infantryMove2', 'infantryMove3'];
            const first = variants[Math.floor(Math.random() * variants.length)];
            const second = variants[Math.floor(Math.random() * variants.length)];
            
            if (this.sounds[first]) {
                this.sounds[first].currentTime = 0;
                this.sounds[first].play().catch(e => {});
            }
            
            setTimeout(() => {
                if (this.sounds[second]) {
                    this.sounds[second].currentTime = 0;
                    this.sounds[second].play().catch(e => {});
                }
            }, 700);
            
            // Reproducir starting engine
            if (this.sounds.startingEngine) {
                this.sounds.startingEngine.currentTime = 0;
                this.sounds.startingEngine.play().catch(e => {});
            }
            
            if (onComplete) onComplete();
        }, 3000);
    }
    
    /**
     * Resetea flags de eventos únicos (nueva partida)
     */
    resetEventFlags() {
        this.hasPlayedEnemyContact = false;
        this.clearShootsTimer = 0;
        this.radioEffectTimer = 0;
        this.noAmmoSoundPlayed.clear();
        this.manDownSoundPlayed.clear();
    }
    
    /**
     * Resetea el flag de no_ammo para un frente específico (cuando vuelve a tener munición)
     */
    resetNoAmmoFlag(frontId) {
        if (frontId) {
            this.noAmmoSoundPlayed.delete(frontId);
        }
    }
    
    /**
     * Resetea el flag de man_down para un frente específico (cuando se resuelve la emergencia)
     */
    resetManDownFlag(frontId) {
        if (frontId) {
            this.manDownSoundPlayed.delete(frontId);
        }
    }
    
    /**
     * Reproduce sonido de chopper con velocidad x1.25 y fadeout al 50% final
     * @param {number} volume - Volumen opcional (por defecto usa el volumen configurado con volumen maestro aplicado)
     */
    playChopperSound(volume = null) {
        if (this.sounds.chopper) {
            const audio = this.sounds.chopper.cloneNode(true);
            audio.playbackRate = 1.25; // Velocidad x1.25 como solicitado
            audio.currentTime = 0;
            
            // Usar volumen proporcionado o el volumen actual del objeto original (que ya tiene volumen maestro aplicado)
            if (volume !== null) {
                audio.volume = volume;
            } else {
                // Usar el volumen del objeto original que ya tiene el volumen maestro aplicado
                audio.volume = this.sounds.chopper.volume;
            }
            
            // Aplicar fadeout al 50% final del clip
            audio.addEventListener('loadedmetadata', () => {
                if (audio.duration) {
                    const fadeStartTime = audio.duration * 0.5; // 50% del clip
                    const fadeDuration = audio.duration * 0.5; // Los últimos 50%
                    
                    const startFade = () => {
                        const currentTime = audio.currentTime;
                        if (currentTime >= fadeStartTime) {
                            const fadeProgress = (currentTime - fadeStartTime) / fadeDuration;
                            const baseVolume = volume !== null ? volume : this.sounds.chopper.volume;
                            audio.volume = Math.max(0, baseVolume * (1 - fadeProgress));
                        } else {
                            // Mantener volumen inicial antes del fadeout
                            const baseVolume = volume !== null ? volume : this.sounds.chopper.volume;
                            audio.volume = baseVolume;
                        }
                    };
                    
                    // Aplicar fadeout durante la reproducción
                    const fadeInterval = setInterval(() => {
                        if (audio.ended || audio.paused) {
                            clearInterval(fadeInterval);
                        } else {
                            startFade();
                        }
                    }, 50); // Verificar cada 50ms
                    
                    // Limpiar intervalo cuando termine
                    audio.addEventListener('ended', () => clearInterval(fadeInterval));
                    audio.addEventListener('pause', () => clearInterval(fadeInterval));
                }
            });
            
            audio.play().catch(e => console.log('Error reproduciendo chopper:', e));
        }
    }
    
    /**
     * Reproduce sonido de whisper con cooldown de 3 segundos
     */
    playWhisperSound() {
        const now = Date.now();
        
        if (now - this.lastWhisperSound >= this.whisperCooldown) {
            if (this.sounds.whisper) {
                this.sounds.whisper.currentTime = 0;
                this.sounds.whisper.volume = this.volumes.whisper; // Asegurar volumen actualizado
                this.sounds.whisper.play().catch(e => console.log('Error reproduciendo whisper:', e));
                this.lastWhisperSound = now;
            }
        }
    }
    
    /**
     * Reproduce la secuencia de sonidos de despliegue de comando
     * Reproduce commando1 seguido de commando2 cuando termine el primero
     */
    playCommandoDeploySound() {
        if (!this.sounds.commando1 || !this.sounds.commando2) {
            console.warn('⚠️ Sonidos de comando no cargados');
            return;
        }
        
        // Usar el volumen del objeto original que ya tiene el volumen maestro aplicado
        const commandoVolume = this.sounds.commando1.volume;
        
        // Reproducir commando1
        const commando1 = this.sounds.commando1.cloneNode(true);
        commando1.volume = commandoVolume;
        commando1.currentTime = 0;
        
        // Cuando termine commando1, reproducir commando2
        commando1.addEventListener('ended', () => {
            const commando2 = this.sounds.commando2.cloneNode(true);
            commando2.volume = commandoVolume;
            commando2.currentTime = 0;
            commando2.play().catch(e => console.log('Error reproduciendo commando2:', e));
        });
        
        commando1.play().catch(e => console.log('Error reproduciendo commando1:', e));
    }
    
    /**
     * Sonido antiguo (fallback)
     */
    playSound(type) {
        switch(type) {
            case 'dispatch':
                this.playTruckSound();
                break;
        }
    }
}
