// ===== EMISOR DE EVENTOS AL SERVIDOR =====
// Responsabilidad: Enviar comandos y solicitudes al servidor mediante socket.emit()

export class ClientSender {
    constructor(socket, networkManager) {
        this.socket = socket;
        this.networkManager = networkManager;
    }

    // ========== GESTIÓN DE SALAS ==========

    /**
     * Crear sala nueva
     */
    createRoom(playerName) {
        this.socket.emit('create_room', { playerName });
    }

    /**
     * Unirse a sala existente
     */
    joinRoom(roomId, playerName) {
        this.socket.emit('join_room', { roomId, playerName });
    }

    /**
     * Obtener lista de salas disponibles
     */
    getRooms() {
        this.socket.emit('get_rooms');
    }

    /**
     * Iniciar partida (solo host)
     */
    startGame(roomId) {
        console.log('🚀 Solicitando inicio de partida...');
        this.socket.emit('start_game', { roomId });
    }

    // ========== CONSTRUCCIÓN Y RECURSOS ==========

    /**
     * Solicitar construcción de edificio
     */
    requestBuild(roomId, buildingType, x, y) {
        this.socket.emit('build_request', {
            roomId,
            buildingType,
            x,
            y
        });
    }

    /**
     * Solicitar convoy de recursos
     */
    requestConvoy(roomId, fromId, toId) {
        this.socket.emit('convoy_request', {
            roomId,
            fromId,
            toId
        });
    }

    // ========== SELECCIÓN DE RAZA/MAZO ==========

    /**
     * Seleccionar raza y mazo
     */
    /**
     * ✅ REFACTORIZADO: Solo envía el deckId, el servidor obtiene el mazo de la BD
     */
    selectRace(roomId, deckId) {
        console.log('📤 [CLIENT_SENDER] Enviando select_race con deckId:', deckId);
        
        this.socket.emit('select_race', {
            roomId,
            deckId
        });
    }

    // ========== UNIDADES Y HABILIDADES ==========

    /**
     * Solicitar ambulancia
     */
    requestAmbulance(roomId, fromId, toId) {
        this.socket.emit('ambulance_request', {
            roomId,
            fromId,
            toId
        });
    }

    /**
     * Solicitar disparo de francotirador
     */
    requestSniper(roomId, targetId) {
        this.socket.emit('sniper_request', {
            roomId,
            targetId
        });
    }

    /**
     * Solicitar sabotaje de FOB
     */
    requestFobSabotage(roomId, targetId) {
        this.socket.emit('fob_sabotage_request', {
            roomId,
            targetId
        });
    }

    /**
     * Solicitar lanzamiento de dron
     */
    requestDrone(roomId, targetId) {
        this.socket.emit('drone_request', {
            roomId,
            targetId
        });
    }

    /**
     * Solicitar despliegue de tanque
     */
    requestTank(roomId, targetId) {
        this.socket.emit('tank_request', {
            roomId,
            targetId
        });
    }

    /**
     * Solicitar vehículo ligero
     */
    requestLightVehicle(roomId, targetId) {
        this.socket.emit('light_vehicle_request', {
            roomId,
            targetId
        });
    }

    /**
     * Solicitar despliegue de comando
     */
    requestCommandoDeploy(roomId, x, y) {
        this.socket.emit('commando_deploy_request', {
            roomId,
            x,
            y
        });
    }

    /**
     * Solicitar despliegue de dron de cámara
     */
    requestCameraDroneDeploy(roomId, x, y) {
        console.log(`📹 Camera drone deploy request enviado: x=${x}, y=${y}`);
        this.socket.emit('camera_drone_deploy_request', {
            roomId,
            x,
            y
        });
    }

    /**
     * Solicitar lanzamiento de artillería
     */
    requestArtilleryLaunch(roomId, x, y) {
        console.log(`💣 Enviando artillery_request: x=${x}, y=${y}`);
        this.socket.emit('artillery_request', {
            roomId,
            x,
            y
        });
    }

    /**
     * Solicitar despliegue de truck assault
     */
    requestTruckAssaultDeploy(roomId, x, y) {
        this.socket.emit('truck_assault_deploy_request', {
            roomId,
            x,
            y
        });
    }

    /**
     * Solicitar activación del Destructor de Mundos
     */
    requestWorldDestroyer(roomId) {
        this.socket.emit('world_destroyer_request', {
            roomId
        });
    }

    // ========== LOBBY Y CHAT ==========

    /**
     * Marcar jugador como listo
     */
    setPlayerReady(roomId, ready) {
        this.socket.emit('player_ready', { roomId, ready });
    }

    /**
     * Enviar mensaje de chat en lobby
     */
    sendLobbyChat(roomId, message) {
        this.socket.emit('lobby_chat', { roomId, message });
    }

    /**
     * Expulsar jugador (solo host)
     */
    kickPlayer(roomId, targetPlayerId) {
        this.socket.emit('kick_player', { roomId, targetPlayerId });
    }

    // ========== DISCIPLINAS ==========

    /**
     * 🆕 NUEVO: Activar disciplina
     */
    activateDiscipline(roomId, disciplineId) {
        this.socket.emit('activate_discipline', { roomId, disciplineId });
    }

    // ========== SISTEMA DE MODOS DE FRENTE ==========

    /**
     * 🆕 NUEVO: Cambiar modo de comportamiento de un frente
     * @param {string} frontId - ID del nodo de frente
     * @param {string} newMode - Nuevo modo ('advance', 'retreat', 'hold')
     */
    sendFrontModeChange(frontId, newMode) {
        const roomId = this.networkManager.roomId;
        if (!roomId) {
            console.warn('⚠️ No hay roomId para enviar cambio de modo de frente');
            return;
        }
        
        console.log(`🎮 Enviando cambio de modo: frente=${frontId.substring(0, 8)}, modo=${newMode}`);
        this.socket.emit('change_front_mode', {
            roomId,
            frontId,
            newMode
        });
    }

    // ========== SISTEMA ==========

    /**
     * Enviar ping al servidor
     */
    sendPing(timestamp) {
        this.socket.emit('ping', timestamp);
    }

    /**
     * CHEAT: Añadir currency (solo para testing)
     */
    addCurrency(roomId, amount) {
        this.socket.emit('cheat_add_currency', {
            roomId,
            amount
        });
    }
}

