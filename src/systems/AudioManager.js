// ===== SISTEMA DE AUDIO =====

export class AudioManager {
    constructor() {
        this.sounds = {};
        this.music = {};
        this.lastTruckSound = 0;
        this.truckCooldown = 2000;
        this.lastHQSound = 0;
        this.hqCooldown = 3000;
        
        // Pool de sonidos activos para permitir múltiples simultáneos
        this.activeDroneSounds = new Map(); // droneId -> Audio instance
        this.soundInstances = []; // Array de objetos {audio, src} para todas las instancias de audio activas
        
        // Timers para sonidos ambientales
        this.clearShootsTimer = 0;
        this.radioEffectTimer = 0;
        
        // Flags de eventos únicos
        this.hasPlayedEnemyContact = false;
        
        // Flags por frente para sonidos específicos
        this.noAmmoSoundPlayed = new Set(); // IDs de frentes que ya reprodujeron no_ammo
        this.manDownSoundPlayed = new Set(); // IDs de frentes que ya reprodujeron man_down
        
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
            sniperShoot: 0.1, // Sonido de disparo de francotirador
            menuHover: 0.4 // Sonido de hover en botones de menú
        };
        
        this.loadSounds();
    }
    
    loadSounds() {
        // Música de fondo (normalizada)
        this.music.ambiance = this.createAudio('assets/sounds/normalized/warsound_normalized.wav', this.volumes.ambiance, true);
        
        // Efectos de sonido originales (normalizados)
        this.sounds.truck = this.createAudio('assets/sounds/normalized/truckengine_normalized.wav', this.volumes.truck, false);
        this.sounds.hq = this.createAudio('assets/sounds/normalized/hqsound_normalized.wav', this.volumes.hq, false);
        this.sounds.explosion = this.createAudio('assets/sounds/normalized/explosion_normalized.wav', this.volumes.explosion, false);
        this.sounds.drone = this.createAudio('assets/sounds/normalized/droneflying_normalized.wav', this.volumes.drone, false);
        
        // Nuevos sonidos ambientales (normalizados)
        this.sounds.clearShoots = this.createAudio('assets/sounds/normalized/clear_shoots_ambiance_normalized.wav', this.volumes.clearShoots, false);
        this.sounds.countdown = this.createAudio('assets/sounds/normalized/countdown_normalized.wav', this.volumes.countdown, false);
        this.sounds.enemyContact = this.createAudio('assets/sounds/normalized/enemy_contact_normalized.wav', this.volumes.enemyContact, false);
        this.sounds.startingEngine = this.createAudio('assets/sounds/normalized/startinggame_engine_normalized.wav', this.volumes.startingEngine, false);
        this.sounds.placeBuilding = this.createAudio('assets/sounds/normalized/place_building_normalized.wav', this.volumes.placeBuilding, false);
        
        // Variantes de infantry move (normalizadas)
        this.sounds.infantryMove1 = this.createAudio('assets/sounds/normalized/infantry_move1_normalized.wav', this.volumes.infantryMove, false);
        this.sounds.infantryMove2 = this.createAudio('assets/sounds/normalized/infantry_move2_normalized.wav', this.volumes.infantryMove, false);
        this.sounds.infantryMove3 = this.createAudio('assets/sounds/normalized/infantry_move3_normalized.wav', this.volumes.infantryMove, false);
        
        // Variantes de man down (normalizadas)
        this.sounds.manDown1 = this.createAudio('assets/sounds/normalized/man_down1_normalized.wav', this.volumes.manDown, false);
        this.sounds.manDown2 = this.createAudio('assets/sounds/normalized/man_down2_normalized.wav', this.volumes.manDown, false);
        
        // Variantes de no ammo (normalizadas)
        this.sounds.noAmmo1 = this.createAudio('assets/sounds/normalized/no_ammo1_normalized.wav', this.volumes.noAmmo, false);
        this.sounds.noAmmo2 = this.createAudio('assets/sounds/normalized/no_ammo2_normalized.wav', this.volumes.noAmmo, false);
        this.sounds.noAmmo3 = this.createAudio('assets/sounds/normalized/no_ammo3_normalized.wav', this.volumes.noAmmo, false);
        this.sounds.noAmmo4 = this.createAudio('assets/sounds/normalized/no_ammo4_normalized.wav', this.volumes.noAmmo, false);
        
        // Variantes de radio effect (normalizadas)
        this.sounds.radioEffect1 = this.createAudio('assets/sounds/normalized/radio_effect1_normalized.wav', this.volumes.radioEffect, false);
        this.sounds.radioEffect2 = this.createAudio('assets/sounds/normalized/radio_effect2_normalized.wav', this.volumes.radioEffect, false);
        this.sounds.radioEffect3 = this.createAudio('assets/sounds/normalized/radio_effect3_normalized.wav', this.volumes.radioEffect, false);
        this.sounds.radioEffect4 = this.createAudio('assets/sounds/normalized/radio_effect4_normalized.wav', this.volumes.radioEffect, false);
        
        // Sonidos de sistema anti-drone
        this.sounds.bomShoot = this.createAudio('assets/sounds/normalized/bom_shoot1_normalized.wav', this.volumes.bomShoot, false);
        this.sounds.antiDroneSpawn = this.createAudio('assets/sounds/normalized/antidrone_spawn_normalized.wav', this.volumes.antiDroneSpawn, false);
        this.sounds.antiDroneAttack = this.createAudio('assets/sounds/normalized/antidrone_attack_normalized.wav', this.volumes.antiDroneAttack, false);
        
        // Sonido de francotirador
        this.sounds.sniperSpotted = this.createAudio('assets/sounds/normalized/sniper_spotted_normalized.wav', this.volumes.sniperSpotted, false);
        this.sounds.sniperShoot = this.createAudio('assets/sounds/normalized/sniper_shoot.wav', this.volumes.sniperShoot, false);
        
        // Música de menú
        this.music.mainTheme = this.createAudio('assets/sounds/normalized/main_theme.wav', this.volumes.mainTheme, true); // Loop activado
        
        // Música de victoria
        this.music.victoryMarch = this.createAudio('assets/sounds/normalized/Victory-March.wav', this.volumes.victoryMarch, false); // Sin loop
        
        // Sonido de hover en menú
        this.sounds.menuHover = this.createAudio('assets/sounds/normalized/menu_choice.wav', this.volumes.menuHover, false);
    }
    
    createAudio(src, volume, loop) {
        const audio = new Audio(src);
        audio.volume = volume;
        audio.loop = loop;
        return audio;
    }
    
    /**
     * Encuentra el volumen actual configurado para un sonido basado en la ruta del archivo
     * @param {string} src - Ruta del archivo de audio
     * @param {number} defaultVolume - Volumen por defecto si no se encuentra mapeo
     * @returns {number} Volumen actual configurado
     */
    getCurrentVolumeForSource(src, defaultVolume = 0.5) {
        // Mapear rutas a tipos de sonido para obtener el volumen actual
        const sourceMap = {
            'explosion_normalized.wav': 'explosion',
            'place_building_normalized.wav': 'placeBuilding',
            'bom_shoot1_normalized.wav': 'bomShoot',
            'antidrone_spawn_normalized.wav': 'antiDroneSpawn',
            'antidrone_attack_normalized.wav': 'antiDroneAttack',
            'man_down1_normalized.wav': 'manDown',
            'man_down2_normalized.wav': 'manDown',
            'no_ammo1_normalized.wav': 'noAmmo',
            'no_ammo2_normalized.wav': 'noAmmo',
            'no_ammo3_normalized.wav': 'noAmmo',
            'no_ammo4_normalized.wav': 'noAmmo',
            'radio_effect1_normalized.wav': 'radioEffect',
            'radio_effect2_normalized.wav': 'radioEffect',
            'radio_effect3_normalized.wav': 'radioEffect',
            'radio_effect4_normalized.wav': 'radioEffect',
            'droneflying_normalized.wav': 'drone'
        };
        
        // Extraer el nombre del archivo de la ruta
        const fileName = src.split('/').pop();
        
        // Buscar en el mapeo
        const soundType = sourceMap[fileName];
        if (soundType && this.volumes[soundType] !== undefined) {
            return this.volumes[soundType];
        }
        
        // Si no se encuentra, usar el volumen por defecto pasado como parámetro
        return defaultVolume;
    }
    
    /**
     * Reproduce un sonido SIN cancelar instancias previas
     * Crea una nueva instancia cada vez para permitir solapamiento
     * @param {string} src - Ruta del archivo de audio
     * @param {number} volume - Volumen base (se actualiza si hay configuración específica)
     * @returns {Audio} Instancia de audio creada
     */
    playSoundInstance(src, volume) {
        // Obtener el volumen actual configurado para este sonido
        const currentVolume = this.getCurrentVolumeForSource(src, volume);
        
        const audio = this.createAudio(src, currentVolume, false);
        
        // Crear objeto para guardar tanto el audio como la información de la ruta
        const soundInstance = { audio: audio, src: src };
        
        // Limpiar cuando termine
        audio.addEventListener('ended', () => {
            const index = this.soundInstances.findIndex(instance => instance.audio === audio);
            if (index > -1) {
                this.soundInstances.splice(index, 1);
            }
        });
        
        audio.play().catch(e => {});
        this.soundInstances.push(soundInstance);
        
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
     * Actualiza los volúmenes de todas las instancias activas de sonido
     * Útil cuando cambian las configuraciones de volumen
     */
    updateActiveInstancesVolume() {
        this.soundInstances.forEach(soundInstance => {
            if (soundInstance && soundInstance.audio && soundInstance.src) {
                const currentVolume = this.getCurrentVolumeForSource(soundInstance.src, soundInstance.audio.volume || 0.5);
                soundInstance.audio.volume = currentVolume;
            }
        });
        
        // También actualizar drones activos
        this.activeDroneSounds.forEach((audio, droneId) => {
            if (audio) {
                // Para drones, sabemos que siempre usan droneflying_normalized.wav
                const currentVolume = this.volumes.drone || 0.5;
                audio.volume = currentVolume;
            }
        });
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
     * Reproduce sonido de camión (con cooldown de 7s)
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
        this.playSoundInstance('assets/sounds/normalized/explosion_normalized.wav', this.volumes.explosion);
    }
    
    /**
     * Reproduce sonido del dron (crea una instancia independiente para cada dron)
     * @param {string} droneId - ID único del dron
     */
    playDroneSound(droneId) {
        // Crear una nueva instancia de Audio para este dron específico
        const droneAudio = this.createAudio('assets/sounds/normalized/droneflying_normalized.wav', this.volumes.drone, true);
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
     * Detiene todos los sonidos de drones
     */
    stopAllDroneSounds() {
        this.activeDroneSounds.forEach((sound) => {
            sound.pause();
            sound.currentTime = 0;
        });
        this.activeDroneSounds.clear();
    }
    
    /**
     * Reproduce la música del menú principal
     */
    playMainTheme() {
        if (this.music.mainTheme) {
            this.music.mainTheme.play().catch(e => {});
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
            this.music.victoryMarch.play().catch(e => {});
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
        
        // Detener todas las instancias activas de sonidos
        this.soundInstances.forEach(soundInstance => {
            if (soundInstance && soundInstance.audio) {
                soundInstance.audio.pause();
                soundInstance.audio.currentTime = 0;
            }
        });
        this.soundInstances.length = 0; // Limpiar el array
        
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
        this.playSoundInstance('assets/sounds/normalized/place_building_normalized.wav', this.volumes.placeBuilding);
    }
    
    /**
     * Reproduce sonido de disparo anti-drone (acortado 15%, permite múltiples simultáneos)
     */
    playBomShootSound(playbackRate = 1.0) {
        const volume = playbackRate === 2.0 ? this.volumes.bomShoot * 2.4 : this.volumes.bomShoot; // +140% si es sniper
        const audio = this.playSoundInstance('assets/sounds/normalized/bom_shoot1_normalized.wav', volume);
        
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
        this.playSoundInstance('assets/sounds/normalized/antidrone_spawn_normalized.wav', this.volumes.antiDroneSpawn);
    }
    
    /**
     * Reproduce sonido de alerta de ataque anti-drone (permite múltiples simultáneos)
     */
    playAntiDroneAttackSound() {
        this.playSoundInstance('assets/sounds/normalized/antidrone_attack_normalized.wav', this.volumes.antiDroneAttack);
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
        
        const variant = Math.random() < 0.5 ? 1 : 2;
        this.playSoundInstance(`assets/sounds/normalized/man_down${variant}_normalized.wav`, this.volumes.manDown);
        
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
        
        const variantNum = Math.floor(Math.random() * 4) + 1;
        this.playSoundInstance(`assets/sounds/normalized/no_ammo${variantNum}_normalized.wav`, this.volumes.noAmmo);
        
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
        this.playSoundInstance(`assets/sounds/normalized/radio_effect${variantNum}_normalized.wav`, this.volumes.radioEffect);
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
