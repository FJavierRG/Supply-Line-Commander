import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export class AuthManager {
    constructor() {
        this.supabaseUrl = process.env.SUPABASE_URL;
        this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!this.supabaseUrl || !this.serviceRoleKey) {
            throw new Error('Supabase URL y SERVICE_ROLE_KEY son requeridos para AuthManager');
        }

        this.client = createClient(this.supabaseUrl, this.serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        });
    }

    normalizeUsername(input) {
        if (!input || typeof input !== 'string') {
            throw this._error('USERNAME_REQUIRED', 'El nombre de usuario es obligatorio.');
        }

        const trimmed = input.trim();
        if (trimmed.length < 3) {
            throw this._error('USERNAME_TOO_SHORT', 'El nombre de usuario debe tener al menos 3 caracteres.');
        }

        if (trimmed.length > 20) {
            throw this._error('USERNAME_TOO_LONG', 'El nombre de usuario no puede exceder los 20 caracteres.');
        }

        const normalized = trimmed.toLowerCase();
        if (!USERNAME_REGEX.test(normalized)) {
            throw this._error('USERNAME_INVALID', 'Solo se permiten letras, números, guiones y guiones bajos.');
        }

        return normalized;
    }

    validatePassword(password) {
        if (!password || typeof password !== 'string') {
            throw this._error('PASSWORD_REQUIRED', 'La contraseña es obligatoria.');
        }

        if (password.length < 6) {
            throw this._error('PASSWORD_TOO_SHORT', 'La contraseña debe tener al menos 6 caracteres.');
        }
    }

    usernameToEmail(username) {
        return `${username}@game.local`;
    }

    async register(username, password) {
        const normalizedUsername = this.normalizeUsername(username);
        this.validatePassword(password);

        const email = this.usernameToEmail(normalizedUsername);

        const { data, error } = await this.client.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                username: normalizedUsername
            }
        });

        if (error) {
            if (error.message?.toLowerCase().includes('duplicate')) {
                throw this._error('USERNAME_TAKEN', 'Este nombre de usuario ya está en uso.');
            }
            throw this._error('REGISTER_FAILED', error.message || 'No se pudo crear el usuario.');
        }

        return {
            id: data.user.id,
            username: normalizedUsername
        };
    }

    async login(username, password) {
        const normalizedUsername = this.normalizeUsername(username);
        this.validatePassword(password);

        const email = this.usernameToEmail(normalizedUsername);

        const { data, error } = await this.client.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw this._error('INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos.');
        }

        const user = data.user;
        const session = data.session;

        if (!session) {
            throw this._error('LOGIN_FAILED', 'No se pudo iniciar sesión.');
        }

        return {
            user: {
                id: user.id,
                username: user.user_metadata?.username || normalizedUsername,
                email: user.email
            },
            token: session.access_token,
            refreshToken: session.refresh_token,
            expiresAt: session.expires_at
        };
    }

    async refreshSession(refreshToken) {
        if (!refreshToken) {
            throw this._error('REFRESH_TOKEN_REQUIRED', 'El refresh token es obligatorio.');
        }

        const { data, error } = await this.client.auth.refreshSession({
            refresh_token: refreshToken
        });

        if (error) {
            throw this._error('REFRESH_FAILED', 'No se pudo refrescar la sesión.');
        }

        return {
            token: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at,
            user: {
                id: data.user.id,
                username: data.user.user_metadata?.username || this.extractUsernameFromEmail(data.user.email)
            }
        };
    }

    async getUserFromToken(token) {
        if (!token) {
            throw this._error('TOKEN_REQUIRED', 'El token es obligatorio.');
        }

        const { data, error } = await this.client.auth.getUser(token);
        if (error) {
            throw this._error('INVALID_TOKEN', 'Token inválido o expirado.');
        }

        return {
            id: data.user.id,
            username: data.user.user_metadata?.username || this.extractUsernameFromEmail(data.user.email),
            email: data.user.email
        };
    }

    extractUsernameFromEmail(email) {
        return email?.split('@')?.[0] || '';
    }

    _error(code, message) {
        const err = new Error(message);
        err.code = code;
        return err;
    }
}

export const authManager = new AuthManager();

