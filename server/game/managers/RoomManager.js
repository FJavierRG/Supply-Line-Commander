// ===== GESTOR DE SALAS =====
import { v4 as uuidv4 } from 'uuid';

export class RoomManager {
    constructor() {
        this.rooms = new Map();
    }
    
    /**
     * Crea una nueva sala
     */
    createRoom(playerId, playerName) {
        const roomId = this.generateRoomCode();
        
        const room = {
            id: roomId,
            status: 'waiting', // 'waiting', 'playing', 'finished'
            createdAt: Date.now(),
            players: [
                {
                    id: playerId,
                    name: playerName,
                    team: 'player1', // El creador siempre es player1
                    selectedRace: null, // Mantener para compatibilidad
                    selectedDeck: null, // 🆕 NUEVO: Mazo seleccionado
                    ready: false
                }
            ],
            gameState: null
        };
        
        this.rooms.set(roomId, room);
        return room;
    }
    
    /**
     * Unirse a una sala existente
     */
    joinRoom(roomId, playerId, playerName) {
        const room = this.rooms.get(roomId);
        
        if (!room) {
            throw new Error('Sala no encontrada');
        }
        
        if (room.players.length >= 2) {
            throw new Error('Sala llena');
        }
        
        if (room.status !== 'waiting') {
            throw new Error('Partida ya iniciada');
        }
        
        room.players.push({
            id: playerId,
            name: playerName,
            team: 'player2', // El segundo jugador siempre es player2
            selectedRace: null, // Mantener para compatibilidad
            selectedDeck: null, // 🆕 NUEVO: Mazo seleccionado
            ready: false
        });
        
        return room;
    }
    
    /**
     * Obtener sala por ID
     */
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    
    /**
     * Buscar sala de un jugador
     */
    findRoomByPlayer(playerId) {
        for (const room of this.rooms.values()) {
            if (room.players.some(p => p.id === playerId)) {
                return room;
            }
        }
        return null;
    }
    
    /**
     * Obtener salas disponibles (esperando jugadores)
     */
    getAvailableRooms() {
        const available = [];
        
        for (const room of this.rooms.values()) {
            if (room.status === 'waiting' && room.players.length === 1) {
                available.push({
                    id: room.id,
                    hostName: room.players[0].name,
                    playersCount: room.players.length,
                    maxPlayers: 2,
                    createdAt: room.createdAt
                });
            }
        }
        
        return available;
    }
    
    /**
     * Eliminar sala
     */
    removeRoom(roomId) {
        const room = this.rooms.get(roomId);
        
        // Detener game loop si existe
        if (room && room.gameState) {
            room.gameState.stopGameLoop();
        }
        
        this.rooms.delete(roomId);
    }
    
    /**
     * Obtener número total de salas
     */
    getRoomCount() {
        return this.rooms.size;
    }
    
    /**
     * Obtener número de partidas activas
     */
    getActiveGames() {
        let count = 0;
        for (const room of this.rooms.values()) {
            if (room.status === 'playing') {
                count++;
            }
        }
        return count;
    }
    
    /**
     * Generar código de sala (4 caracteres alfanuméricos)
     */
    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin O, 0, I, 1
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Verificar que no exista (muy improbable)
        if (this.rooms.has(code)) {
            return this.generateRoomCode();
        }
        
        return code;
    }
    
    /**
     * Obtener team de un jugador en una sala
     */
    getPlayerTeam(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        
        const player = room.players.find(p => p.id === playerId);
        return player ? player.team : null;
    }
    
    /**
     * Marcar jugador como ready/not ready
     */
    setPlayerReady(roomId, playerId, ready) {
        const room = this.rooms.get(roomId);
        if (!room) return false;
        
        const player = room.players.find(p => p.id === playerId);
        if (!player) return false;
        
        player.ready = ready;
        return true;
    }
    
    /**
     * Verificar si todos los jugadores están ready
     * 🤖 NUEVO: Considera IA como siempre lista
     */
    allPlayersReady(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return false;
        
        // 🤖 NUEVO: Verificar si hay 2 jugadores humanos O 1 jugador + IA
        const hasPlayer2 = room.players.length === 2;
        const hasAI = room.aiPlayer !== null && room.aiPlayer !== undefined;
        
        // Debe haber al menos un oponente (humano o IA)
        if (!hasPlayer2 && !hasAI) return false;
        
        // Todos los jugadores humanos deben estar ready
        // La IA siempre está ready
        return room.players.every(p => p.ready);
    }
    
    /**
     * Verificar si un jugador es el host de la sala
     */
    isHost(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room || room.players.length === 0) return false;
        
        return room.players[0].id === playerId;
    }
    
    /**
     * Expulsar jugador de la sala (solo host puede hacerlo)
     */
    kickPlayer(roomId, hostId, targetPlayerId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            throw new Error('Sala no encontrada');
        }
        
        // Verificar que quien expulsa sea el host
        if (!this.isHost(roomId, hostId)) {
            throw new Error('Solo el host puede expulsar jugadores');
        }
        
        // No puede expulsarse a sí mismo
        if (hostId === targetPlayerId) {
            throw new Error('El host no puede expulsarse a sí mismo');
        }
        
        // Remover jugador
        room.players = room.players.filter(p => p.id !== targetPlayerId);
        
        return true;
    }
    
    /**
     * Remover jugador cuando se desconecta
     */
    removePlayer(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room) return;
        
        room.players = room.players.filter(p => p.id !== playerId);
        
        // Si no quedan jugadores, eliminar sala
        if (room.players.length === 0) {
            this.removeRoom(roomId);
        }
    }
}
