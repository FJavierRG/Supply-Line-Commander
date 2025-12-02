// ===== GESTOR DE DISCIPLINAS (SERVIDOR) =====
// Gestiona la activación, duración y cooldown de disciplinas durante la partida
// El servidor es la autoridad (ANTI-HACK)

import { getDiscipline, disciplineExists } from '../../config/disciplines.js';

export class DisciplineManager {
    constructor(gameId) {
        this.gameId = gameId;
        
        // Estado de disciplinas por jugador
        this.playerDisciplines = {
            player1: {
                equipped: [],        // [disciplineId1, disciplineId2] - Las 2 disciplinas del mazo
                active: null,        // ID de disciplina activa o null
                activeStartTime: 0,  // Timestamp de cuando se activó
                activeDuration: 0,   // Duración total en ms
                cooldowns: {}        // 🆕 NUEVO: Cooldowns individuales por disciplina { disciplineId: cooldownUntil }
            },
            player2: {
                equipped: [],
                active: null,
                activeStartTime: 0,
                activeDuration: 0,
                cooldowns: {}        // 🆕 NUEVO: Cooldowns individuales por disciplina { disciplineId: cooldownUntil }
            }
        };
    }
    
    /**
     * Establece las disciplinas equipadas de un jugador (al inicio de partida)
     * @param {string} playerId - 'player1' o 'player2'
     * @param {Array<string>} disciplines - Array de IDs de disciplinas (máximo 2)
     * @returns {boolean} - true si se establecieron correctamente
     */
    setEquippedDisciplines(playerId, disciplines) {
        // Validar que sea un array
        if (!Array.isArray(disciplines)) {
            console.error(`❌ DisciplineManager: disciplines debe ser un array`);
            return false;
        }
        
        // Permitir 0, 1 o 2 disciplinas (no forzar exactamente 2)
        if (disciplines.length > 2) {
            console.error(`❌ DisciplineManager: ${playerId} tiene más de 2 disciplinas`);
            return false;
        }
        
        // Si no hay disciplinas, está ok (mazo sin disciplinas)
        if (disciplines.length === 0) {
            this.playerDisciplines[playerId].equipped = [];
            console.log(`✅ ${playerId} no tiene disciplinas equipadas`);
            return true;
        }
        
        // Validar que todas existan
        for (const disciplineId of disciplines) {
            if (!disciplineExists(disciplineId)) {
                console.error(`❌ DisciplineManager: Disciplina inválida: ${disciplineId}`);
                return false;
            }
        }
        
        // Validar que no haya duplicados
        const uniqueIds = [...new Set(disciplines)];
        if (uniqueIds.length !== disciplines.length) {
            console.error(`❌ DisciplineManager: ${playerId} tiene disciplinas duplicadas`);
            return false;
        }
        
        this.playerDisciplines[playerId].equipped = [...disciplines];
        console.log(`✅ ${playerId} equipó disciplinas:`, disciplines);
        return true;
    }
    
    /**
     * Activa una disciplina para un jugador
     * @param {string} playerId - 'player1' o 'player2'
     * @param {string} disciplineId - ID de la disciplina a activar
     * @param {number} currentTime - Timestamp actual del servidor (Date.now())
     * @returns {Object} - { success: boolean, reason: string }
     */
    activateDiscipline(playerId, disciplineId, currentTime) {
        const playerState = this.playerDisciplines[playerId];
        
        // Validar que la disciplina esté equipada
        if (!playerState.equipped.includes(disciplineId)) {
            return { 
                success: false, 
                reason: 'Disciplina no equipada' 
            };
        }
        
        // Validar que no haya otra disciplina activa
        if (playerState.active !== null) {
            return { 
                success: false, 
                reason: `Ya hay una disciplina activa: ${playerState.active}` 
            };
        }
        
        // 🆕 NUEVO: Validar cooldown individual de esta disciplina específica
        const disciplineCooldownUntil = playerState.cooldowns[disciplineId] || 0;
        if (currentTime < disciplineCooldownUntil) {
            const remaining = Math.ceil((disciplineCooldownUntil - currentTime) / 1000);
            return { 
                success: false, 
                reason: `Cooldown activo (${remaining}s restantes)` 
            };
        }
        
        // Obtener configuración de la disciplina
        const discipline = getDiscipline(disciplineId);
        if (!discipline || discipline.enabled === false) {
            return { 
                success: false, 
                reason: 'Disciplina deshabilitada o no existe' 
            };
        }
        
        // Activar disciplina
        playerState.active = disciplineId;
        playerState.activeStartTime = currentTime;
        playerState.activeDuration = discipline.duration * 1000; // Convertir a ms
        
        console.log(`✅ ${playerId} activó disciplina: ${disciplineId} (${discipline.duration}s)`);
        
        return { 
            success: true, 
            reason: 'Disciplina activada',
            discipline: discipline
        };
    }
    
    /**
     * Actualiza el estado de las disciplinas (llamar en cada tick del servidor)
     * @param {number} currentTime - Timestamp actual del servidor (Date.now())
     * @returns {Array<Object>} - Array de eventos ocurridos [{playerId, event: 'ended'/'cooldown_ready', disciplineId}]
     */
    update(currentTime) {
        const events = [];
        
        for (const playerId in this.playerDisciplines) {
            const playerState = this.playerDisciplines[playerId];
            
            // Si hay disciplina activa, verificar si terminó
            if (playerState.active !== null) {
                const endTime = playerState.activeStartTime + playerState.activeDuration;
                
                if (currentTime >= endTime) {
                    // Disciplina terminó
                    const disciplineId = playerState.active;
                    const discipline = getDiscipline(disciplineId);
                    
                    console.log(`⏱️ ${playerId} - Disciplina terminada: ${disciplineId}`);
                    
                    // 🆕 NUEVO: Establecer cooldown individual para esta disciplina específica
                    if (discipline.cooldown > 0) {
                        playerState.cooldowns[disciplineId] = currentTime + (discipline.cooldown * 1000);
                    } else {
                        // Sin cooldown - eliminar entrada si existe
                        delete playerState.cooldowns[disciplineId];
                    }
                    
                    // Desactivar
                    playerState.active = null;
                    playerState.activeStartTime = 0;
                    playerState.activeDuration = 0;
                    
                    // Añadir evento
                    events.push({
                        playerId,
                        event: 'ended',
                        disciplineId
                    });
                }
            }
            
            // 🆕 NUEVO: Verificar cooldowns individuales de todas las disciplinas equipadas
            for (const disciplineId of playerState.equipped) {
                const cooldownUntil = playerState.cooldowns[disciplineId] || 0;
                if (cooldownUntil > 0 && currentTime >= cooldownUntil) {
                    // Cooldown terminó - eliminar entrada
                    delete playerState.cooldowns[disciplineId];
                    events.push({
                        playerId,
                        event: 'cooldown_ready',
                        disciplineId
                    });
                }
            }
        }
        
        return events;
    }
    
    /**
     * Obtiene los modificadores activos para un sistema específico
     * Este método es usado por otros sistemas para consultar si deben aplicar modificadores
     * @param {string} playerId - 'player1' o 'player2'
     * @param {string} systemName - Nombre del sistema (ej: 'economy', 'frontMovement', 'convoy')
     * @returns {Object} - Objeto con modificadores o {} si no hay disciplina activa
     */
    getModifiersForSystem(playerId, systemName) {
        const playerState = this.playerDisciplines[playerId];
        
        // Si no hay disciplina activa, retornar vacío
        if (playerState.active === null) {
            return {};
        }
        
        // Obtener configuración de la disciplina activa
        const discipline = getDiscipline(playerState.active);
        if (!discipline || !discipline.effects) {
            return {};
        }
        
        // Retornar modificadores para el sistema solicitado
        return discipline.effects[systemName] || {};
    }
    
    /**
     * Obtiene el estado completo de un jugador (para enviar al cliente)
     * @param {string} playerId - 'player1' o 'player2'
     * @param {number} currentTime - Timestamp actual del servidor
     * @returns {Object} - Estado serializable para enviar por red
     */
    getPlayerState(playerId, currentTime) {
        const state = this.playerDisciplines[playerId];
        
        // 🆕 NUEVO: Calcular cooldowns individuales para cada disciplina equipada
        const cooldowns = {};
        for (const disciplineId of state.equipped) {
            const cooldownUntil = state.cooldowns[disciplineId] || 0;
            cooldowns[disciplineId] = Math.max(0, Math.ceil((cooldownUntil - currentTime) / 1000));
        }
        
        return {
            equipped: [...state.equipped],
            active: state.active,
            timeRemaining: state.active !== null 
                ? Math.max(0, Math.ceil((state.activeStartTime + state.activeDuration - currentTime) / 1000))
                : 0,
            cooldowns: cooldowns  // 🆕 NUEVO: Cooldowns individuales { disciplineId: secondsRemaining }
        };
    }
    
    /**
     * Verifica si un jugador puede activar una disciplina específica
     * @param {string} playerId - 'player1' o 'player2'
     * @param {string} disciplineId - ID de la disciplina
     * @param {number} currentTime - Timestamp actual del servidor
     * @returns {Object} - { canActivate: boolean, reason: string }
     */
    canActivate(playerId, disciplineId, currentTime) {
        const playerState = this.playerDisciplines[playerId];
        
        if (!playerState.equipped.includes(disciplineId)) {
            return { canActivate: false, reason: 'Disciplina no equipada' };
        }
        
        if (playerState.active !== null) {
            return { canActivate: false, reason: 'Ya hay una disciplina activa' };
        }
        
        // 🆕 NUEVO: Verificar cooldown individual de esta disciplina específica
        const disciplineCooldownUntil = playerState.cooldowns[disciplineId] || 0;
        if (currentTime < disciplineCooldownUntil) {
            const remaining = Math.ceil((disciplineCooldownUntil - currentTime) / 1000);
            return { canActivate: false, reason: `Cooldown: ${remaining}s` };
        }
        
        const discipline = getDiscipline(disciplineId);
        if (!discipline || discipline.enabled === false) {
            return { canActivate: false, reason: 'Disciplina deshabilitada' };
        }
        
        return { canActivate: true, reason: 'Puede activarse' };
    }
    
    /**
     * Obtiene la disciplina activa de un jugador (si hay alguna)
     * @param {string} playerId - 'player1' o 'player2'
     * @returns {string|null} - ID de la disciplina activa o null
     */
    getActiveDiscipline(playerId) {
        return this.playerDisciplines[playerId].active;
    }
    
    /**
     * Verifica si un jugador tiene una disciplina activa
     * @param {string} playerId - 'player1' o 'player2'
     * @returns {boolean}
     */
    hasActiveDiscipline(playerId) {
        return this.playerDisciplines[playerId].active !== null;
    }
    
    /**
     * Fuerza el fin de una disciplina activa (para testing o situaciones especiales)
     * @param {string} playerId - 'player1' o 'player2'
     */
    forceEndDiscipline(playerId) {
        const playerState = this.playerDisciplines[playerId];
        if (playerState.active !== null) {
            const disciplineId = playerState.active;
            const discipline = getDiscipline(disciplineId);
            const currentTime = Date.now();
            
            // 🆕 NUEVO: Establecer cooldown individual para esta disciplina específica
            if (discipline.cooldown > 0) {
                playerState.cooldowns[disciplineId] = currentTime + (discipline.cooldown * 1000);
            } else {
                delete playerState.cooldowns[disciplineId];
            }
            
            playerState.active = null;
            playerState.activeStartTime = 0;
            playerState.activeDuration = 0;
            console.log(`⚠️ ${playerId} - Disciplina forzada a terminar`);
        }
    }
}

