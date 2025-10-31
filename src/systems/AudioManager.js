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
            chopper: 0.2, // Sonido de chopper (muy reducido, era demasiado alto)
            whisper: 0.9, // Sonido de whisper para specops (+30%: 0.3 * 1.3 = 0.39)
            commando: 0.6 // Sonido de despliegue de comando (+20% respecto a 0.5)
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
        console.log('🎵 Intentando cargar música del menú desde:', mainThemeUrl);
        
        // Test: verificar que la URL es accesible
        fetch(mainThemeUrl, {method: 'HEAD'})
            .then(response => {
                console.log('✅ URL accesible, Content-Type:', response.headers.get('content-type'));
            })
            .catch(error => {
                console.error('❌ URL no accesible:', error);
            });
        
        this.music.mainTheme = this.createAudio(mainThemeUrl, this.volumes.mainTheme, true); // Loop activado
        
        // Música de victoria
        this.music.victoryMarch = this.createAudio(SOUNDS_BASE_URL + 'Victory-March.wav', this.volumes.victoryMarch, false); // Sin loop
        
        // Sonido de hover en menú - TEST: probar con sonido más pequeño
        const menuHoverUrl = SOUNDS_BASE_URL + 'menu_choice.wav';
        console.log('🔊 Cargando sonido de hover desde:', menuHoverUrl);
        this.sounds.menuHover = this.createAudio(menuHoverUrl, 0.4, false);
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
            console.log(`🔄 Cargando audio: ${src}`);
        });
        
        audio.addEventListener('canplaythrough', () => {
            console.log(`✅ Audio listo: ${src}`);
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
                console.log('🔊 Contexto de audio desbloqueado correctamente');
                testAudio.pause();
                testAudio.currentTime = 0;
            }).catch(error => {
                console.log('⚠️ No se pudo desbloquear audio:', error);
            });
        }
        
        // También intentar con el tema del menú si existe
        if (this.music.mainTheme) {
            this.music.mainTheme.volume = 0;
            const mainThemePromise = this.music.mainTheme.play();
            if (mainThemePromise !== undefined) {
                mainThemePromise.then(() => {
                    console.log('🔊 Tema del menú preparado para desbloqueo');
                    this.music.mainTheme.pause();
                    this.music.mainTheme.currentTime = 0;
                    this.music.mainTheme.volume = this.volumes.mainTheme; // Restaurar volumen
                }).catch(() => {
                    this.music.mainTheme.volume = this.volumes.mainTheme; // Restaurar volumen
                });
            }
        }
    }
    
    /**
     * Reproduce un sonido SIN cancelar instancias previas
     * Crea una nueva instancia cada vez para permitir solapamiento
     * @param {string} src - Ruta del archivo de audio
     * @param {number} volume - Volumen (0.0 a 1.0)
     * @returns {Audio} Instancia de audio creada
     */
    playSoundInstance(src, volume) {
        const audio = this.createAudio(src, volume, false);
        
        // Limpiar cuando termine
        audio.addEventListener('ended', () => {
            const index = this.soundInstances.indexOf(audio);
            if (index > -1) {
                this.soundInstances.splice(index, 1);
            }
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
            // Verificar si el audio está listo para reproducir
            if (this.music.mainTheme.readyState >= 3) { // HAVE_FUTURE_DATA o superior
                console.log('🎵 Reproduciendo tema del menú (audio listo)');
                this.music.mainTheme.play().catch(e => {
                    console.log('🔊 Audio del menú bloqueado por navegador:', e.name);
                });
            } else {
                console.log('⏳ Esperando que el tema del menú se cargue...');
                // Esperar a que esté listo
                const onCanPlay = () => {
                    console.log('🎵 Tema del menú listo, reproduciendo...');
                    this.music.mainTheme.removeEventListener('canplaythrough', onCanPlay);
                    this.music.mainTheme.play().catch(e => {
                        console.log('🔊 Audio del menú bloqueado por navegador:', e.name);
                    });
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
                console.log('🎵 Reproduciendo música de victoria (audio listo)');
                this.music.victoryMarch.play().catch(e => {
                    console.log('🔊 Audio de victoria bloqueado por navegador:', e.name);
                });
            } else {
                console.log('⏳ Esperando que la música de victoria se cargue...');
                // Esperar a que esté listo
                const onCanPlay = () => {
                    console.log('🎵 Música de victoria listo, reproduciendo...');
                    this.music.victoryMarch.removeEventListener('canplaythrough', onCanPlay);
                    this.music.victoryMarch.play().catch(e => {
                        console.log('🔊 Audio de victoria bloqueado por navegador:', e.name);
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
     * Reproduce sonido de chopper con velocidad x1.25 y fadeout al 50% final
     * @param {number} volume - Volumen opcional (por defecto usa el volumen configurado)
     */
    playChopperSound(volume = null) {
        if (this.sounds.chopper) {
            const audio = this.sounds.chopper.cloneNode(true);
            audio.playbackRate = 1.25; // Velocidad x1.25 como solicitado
            audio.currentTime = 0;
            audio.volume = volume !== null ? volume : this.volumes.chopper; // Usar volumen proporcionado o el configurado
            
            // Aplicar fadeout al 50% final del clip
            audio.addEventListener('loadedmetadata', () => {
                if (audio.duration) {
                    const fadeStartTime = audio.duration * 0.5; // 50% del clip
                    const fadeDuration = audio.duration * 0.5; // Los últimos 50%
                    
                    const startFade = () => {
                        const currentTime = audio.currentTime;
                        if (currentTime >= fadeStartTime) {
                            const fadeProgress = (currentTime - fadeStartTime) / fadeDuration;
                            const baseVolume = volume !== null ? volume : this.volumes.chopper;
                            audio.volume = Math.max(0, baseVolume * (1 - fadeProgress));
                        } else {
                            // Mantener volumen inicial antes del fadeout
                            const baseVolume = volume !== null ? volume : this.volumes.chopper;
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
        
        // Reproducir commando1
        const commando1 = this.sounds.commando1.cloneNode(true);
        commando1.volume = this.volumes.commando;
        commando1.currentTime = 0;
        
        // Cuando termine commando1, reproducir commando2
        commando1.addEventListener('ended', () => {
            const commando2 = this.sounds.commando2.cloneNode(true);
            commando2.volume = this.volumes.commando;
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
