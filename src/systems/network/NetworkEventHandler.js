// ===== GESTOR DE EVENTOS AUDIOVISUALES DE RED =====
// Responsabilidad: Manejar feedback audiovisual y eventos "one-shot" del servidor

export class NetworkEventHandler {
    constructor(networkManager, game) {
        this.networkManager = networkManager;
        this.game = game;
    }

    // ========== MANEJO DE EVENTOS DE SONIDO ==========

    /**
     * Maneja eventos de sonido del servidor
     */
    handleSoundEvent(event) {
        switch(event.type) {
            case 'game_start_sequence':
                // IGNORAR: Ya se reproduce localmente después de 3s (evitar duplicación)
                break;
                
            case 'start_battle_music':
                // IGNORAR: Ya se reproduce localmente (evitar duplicación)
                break;
                
            case 'clear_shoots':
                // Ambientes cada 60s
                break;
                
            case 'random_radio_effect':
                // Radio effect cada 50s
                this.game.audio.playRandomRadioEffect();
                break;
                
            case 'man_down':
                // Emergencia médica generada
                this.game.audio.playManDownSound(event.frontId);
                break;
                
            case 'no_ammo':
                // Frente sin suministros
                this.game.audio.playNoAmmoSound(event.frontId);
                break;
                
            case 'enemy_contact':
                // Primer contacto entre frentes
                this.game.audio.playEnemyContact();
                break;
                
            case 'truck_dispatch':
                // Convoy despachado - usar volumen reducido si es del enemigo
                if (event.team && event.team !== this.networkManager.myTeam) {
                    this.game.audio.playEnemyTruckSound();
                } else {
                    this.game.audio.playTruckSound();
                }
                break;
                
            case 'hq_dispatch':
                // HQ enviando suministros - solo reproducir si es del propio jugador
                if (event.team && event.team === this.networkManager.myTeam) {
                    this.game.audio.playHQSound();
                }
                break;
                
            case 'chopper':
                // Helicóptero despachado - reproducir sonido con volumen 0.5
                if (this.game.audio && this.game.audio.playChopperSound) {
                    this.game.audio.playChopperSound(0.5);
                }
                break;
        }
    }

    // ========== MANEJO DE EVENTOS VISUALES ==========

    /**
     * Maneja eventos visuales del servidor
     */
    handleVisualEvent(event) {
        switch(event.type) {
            case 'camera_drone_currency':
                // Solo mostrar si es del equipo del jugador
                if (event.team === this.networkManager.myTeam && this.game.particleSystem) {
                    this.game.particleSystem.createFloatingText(
                        event.x,
                        event.y - 30,
                        `+${event.amount}`,
                        '#4ecca3',
                        null
                    );
                    console.log(`💰 Camera Drone ${event.cameraDroneId?.substring(0, 8)} otorgó +${event.amount}$`);
                }
                break;
                
            default:
                console.warn(`⚠️ Evento visual desconocido: ${event.type}`);
        }
    }

    // ========== MANEJO DE EVENTOS ESPECÍFICOS ==========

    /**
     * Manejo de disparo de francotirador
     */
    handleSniperFired(data) {
        // Reproducir sonido de disparo
        this.game.audio.sounds.sniperShoot.play();
        
        // Usar coordenadas del servidor si están disponibles
        let feedX, feedY;
        
        if (data.targetX !== undefined && data.targetY !== undefined) {
            feedX = data.targetX;
            feedY = data.targetY;
        } else {
            // Fallback: buscar el nodo localmente
            const target = this.game.nodes.find(n => n.id === data.targetId);
            if (target) {
                feedX = target.x;
                feedY = target.y;
            } else {
                console.warn(`⚠️ Objetivo sniper ${data.targetId} no encontrado y sin coordenadas del servidor`);
                return;
            }
        }
        
        // Si se eliminó un camera drone, crear animación de explosión
        if (data.eliminated && data.targetType === 'cameraDrone') {
            // Crear partículas de explosión (gris)
            this.game.particleSystem.createExplosion(
                feedX, 
                feedY, 
                '#808080',
                8
            );
            
            // Crear animación de explosión de dron (2 frames)
            if (this.game.particleSystem.createDroneExplosionSprite) {
                this.game.particleSystem.createDroneExplosionSprite(feedX, feedY);
            }
            
            // Crear cráter pequeño del dron destruido (50% del tamaño)
            this.game.particleSystem.createImpactMark(feedX, feedY, 'impact_icon', 0.5);
        }
        
        // Mostrar sprite flotante de kill feed sobre el objetivo
        this.game.particleSystem.createFloatingSprite(
            feedX, 
            feedY - 40,
            'ui-sniper-kill'
        );
    }

    /**
     * Manejo de sabotaje de FOB
     */
    handleFobSabotageFired(data) {
        // Buscar la FOB objetivo
        const targetFOB = this.game.nodes.find(n => n.id === data.targetId);
        
        if (targetFOB) {
            // Crear efecto visual: specops unit cayendo desde arriba de la FOB
            if (this.game.particleSystem.createFallingSprite) {
                this.game.particleSystem.createFallingSprite(
                    targetFOB.x, 
                    targetFOB.y - 80,
                    'specops_unit',
                    0.08
                );
            }
            
            // Reproducir sonido de chopper con velocidad x1.25
            if (this.game.audio && this.game.audio.playChopperSound) {
                this.game.audio.playChopperSound();
            }
        } else {
            console.warn(`⚠️ FOB objetivo ${data.targetId} no encontrada`);
        }
    }

    /**
     * Manejo de fallo de sabotaje de FOB
     */
    handleFobSabotageFailed(data) {
        console.warn(`⚠️ Sabotaje fallido: ${data.reason || 'Razón desconocida'}`);
        // Opcional: mostrar mensaje visual al usuario
        if (this.game && this.game.showNotification) {
            this.game.showNotification(data.reason || 'No se pudo realizar el sabotaje', 'error');
        }
    }

    /**
     * Manejo de activación del Destructor de mundos
     */
    handleWorldDestroyerActivated(data) {
        console.log(`☠️ Destructor de mundos activado por ${data.playerTeam}`);
        
        // Reproducir sonido de alarma para ambos jugadores
        if (this.game && this.game.audio && this.game.audio.playAlarmSound) {
            this.game.audio.playAlarmSound();
        }
    }

    /**
     * Manejo de lanzamiento de dron
     */
    handleDroneLaunched(data) {
        // El servidor ya lo tiene en el estado, solo reproducir sonido
        this.game.audio.playDroneSound(data.droneId);
    }

    /**
     * Manejo de despliegue de comando
     */
    handleCommandoDeployed(data) {
        // Verificar que no exista ya (evitar duplicados)
        const exists = this.game.nodes.find(n => n.id === data.commandoId);
        if (exists) {
            console.warn(`⚠️ Nodo ${data.commandoId} ya existe, ignorando commando_deployed`);
            return;
        }
        
        // Reproducir sonido de chopper
        if (this.game.audio && this.game.audio.playChopperSound) {
            this.game.audio.playChopperSound();
        }
    }

    /**
     * Manejo de despliegue de camera drone
     */
    handleCameraDroneDeployed(data) {
        console.log(`📹 [CLIENT] camera_drone_deployed recibido:`, data);
        
        // Verificar que no exista ya (evitar duplicados)
        const exists = this.game.nodes.find(n => n.id === data.cameraDroneId);
        if (exists) {
            console.warn(`⚠️ Nodo ${data.cameraDroneId} ya existe, ignorando camera_drone_deployed`);
            return;
        }
        
        // Reproducir sonido de dron
        if (this.game.audio && this.game.audio.playDroneSound) {
            this.game.audio.playDroneSound(data.cameraDroneId);
        }
    }

    /**
     * Manejo de despliegue de truck assault
     */
    handleTruckAssaultDeployed(data) {
        // Verificar que no exista ya (evitar duplicados)
        const exists = this.game.nodes.find(n => n.id === data.truckAssaultId);
        if (exists) {
            console.warn(`⚠️ Nodo ${data.truckAssaultId} ya existe, ignorando truck_assault_deployed`);
            return;
        }
        
        // Reproducir sonido de camión enemigo si no es del jugador
        if (data.team !== this.networkManager.myTeam) {
            this.game.audio.playEnemyTruckSound();
        }
    }
}

