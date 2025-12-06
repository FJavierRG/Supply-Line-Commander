// ===== SERVICIO DE PERFILES =====
// Interactúa con la API REST para gestionar perfiles de usuario
// NOTA: Este servicio está actualmente deshabilitado porque no hay endpoints en el servidor
// Si se quiere implementar, crear las rutas correspondientes en server/routes/

import { http } from '../utils/httpClient.js';

export class ProfileService {
    /**
     * Obtener perfil de un usuario por ID
     * @param {string} userId - ID del usuario
     * @returns {Promise<Object|null>} Perfil del usuario o null
     */
    async getProfile(userId) {
        try {
            // TODO: Implementar endpoint en el servidor
            // const response = await http.get(`/api/profiles/${userId}`);
            // return response.profile;
            
            console.warn('⚠️ ProfileService.getProfile() no implementado - no hay endpoint en el servidor');
            return null;
        } catch (error) {
            console.error('Error obteniendo perfil:', error);
            return null;
        }
    }

    /**
     * Verificar si un nombre de usuario está disponible
     * @param {string} username - Nombre de usuario a verificar
     * @returns {Promise<boolean>} True si está disponible
     */
    async checkUsernameAvailability(username) {
        try {
            // TODO: Implementar endpoint en el servidor
            // const response = await http.get(`/api/profiles/check-username/${username}`);
            // return response.available;
            
            console.warn('⚠️ ProfileService.checkUsernameAvailability() no implementado - no hay endpoint en el servidor');
            // Por ahora retornar true para permitir continuar
            return true;
        } catch (error) {
            console.error('Error verificando disponibilidad de username:', error);
            return false;
        }
    }

    /**
     * Crear o actualizar perfil de usuario
     * @param {string} userId - ID del usuario
     * @param {string} username - Nombre de usuario
     * @param {string} displayName - Nombre para mostrar
     * @returns {Promise<Object|null>} Perfil creado/actualizado o null
     */
    async createOrUpdateProfile(userId, username, displayName) {
        try {
            // TODO: Implementar endpoint en el servidor
            // const response = await http.post(`/api/profiles`, {
            //     userId,
            //     username,
            //     displayName
            // });
            // return response.profile;
            
            console.warn('⚠️ ProfileService.createOrUpdateProfile() no implementado - no hay endpoint en el servidor');
            // Por ahora retornar un perfil fake para permitir continuar
            return {
                id: userId,
                username: username,
                display_name: displayName,
                created_at: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error creando/actualizando perfil:', error);
            return null;
        }
    }
}

export const profileService = new ProfileService();

