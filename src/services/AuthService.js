import { http, setHttpTokenProvider } from '../utils/httpClient.js';

const STORAGE_KEYS = {
    user: 'slc_auth_user',
    token: 'slc_auth_token',
    refresh: 'slc_auth_refresh',
    expiresAt: 'slc_auth_expires_at'
};

class AuthService {
    constructor() {
        this.user = null;
        this.token = null;
        this.refreshToken = null;
        this.expiresAt = null;
        this.listeners = new Map();

        this.loadFromStorage();
        setHttpTokenProvider(() => this.token);
    }

    loadFromStorage() {
        try {
            const storedUser = localStorage.getItem(STORAGE_KEYS.user);
            const storedToken = localStorage.getItem(STORAGE_KEYS.token);
            const storedRefresh = localStorage.getItem(STORAGE_KEYS.refresh);
            const storedExpires = localStorage.getItem(STORAGE_KEYS.expiresAt);

            if (storedToken && storedUser) {
                this.user = JSON.parse(storedUser);
                this.token = storedToken;
                this.refreshToken = storedRefresh;
                this.expiresAt = storedExpires ? Number(storedExpires) : null;
            }
        } catch (error) {
            console.warn('No se pudieron cargar las credenciales almacenadas:', error);
            this.clearSession();
        }
    }

    persistSession() {
        if (!this.token || !this.user) {
            this.clearSession();
            return;
        }

        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.user));
        localStorage.setItem(STORAGE_KEYS.token, this.token);
        if (this.refreshToken) {
            localStorage.setItem(STORAGE_KEYS.refresh, this.refreshToken);
        }
        if (this.expiresAt) {
            localStorage.setItem(STORAGE_KEYS.expiresAt, this.expiresAt.toString());
        }
    }

    clearSession() {
        this.user = null;
        this.token = null;
        this.refreshToken = null;
        this.expiresAt = null;

        localStorage.removeItem(STORAGE_KEYS.user);
        localStorage.removeItem(STORAGE_KEYS.token);
        localStorage.removeItem(STORAGE_KEYS.refresh);
        localStorage.removeItem(STORAGE_KEYS.expiresAt);
    }

    emit(event, payload) {
        const callbacks = this.listeners.get(event);
        if (!callbacks) return;
        callbacks.forEach(cb => cb(payload));
    }

    on(event, callback) {
        const existing = this.listeners.get(event) || [];
        existing.push(callback);
        this.listeners.set(event, existing);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        const callbacks = this.listeners.get(event);
        if (!callbacks) return;
        this.listeners.set(event, callbacks.filter(cb => cb !== callback));
    }

    isAuthenticated() {
        return Boolean(this.token);
    }

    getUser() {
        return this.user;
    }

    getToken() {
        return this.token;
    }

    getCurrentUserId() {
        return this.user?.id || null;
    }

    async register(username, password) {
        const response = await http.post('/api/auth/register', { username, password }, { auth: false });
        this.handleAuthSuccess(response);
        return response.user;
    }

    async login(username, password) {
        const response = await http.post('/api/auth/login', { username, password }, { auth: false });
        this.handleAuthSuccess(response);
        return response.user;
    }

    async refreshSession() {
        if (!this.refreshToken) {
            throw new Error('No hay refresh token disponible');
        }

        const response = await http.post('/api/auth/refresh', { refreshToken: this.refreshToken }, { auth: false });
        this.handleAuthSuccess(response);
        return response;
    }

    async fetchCurrentUser() {
        if (!this.token) return null;
        try {
            const response = await http.get('/api/auth/me');
            this.user = response.user;
            this.persistSession();
            this.emit('user:updated', this.user);
            this.emit('auth:changed', { user: this.user });
            return this.user;
        } catch (error) {
            console.warn('No se pudo obtener el usuario actual:', error.message);
            this.logout();
            return null;
        }
    }

    handleAuthSuccess(response) {
        this.user = response.user;
        this.token = response.token;
        this.refreshToken = response.refreshToken;
        this.expiresAt = response.expiresAt;
        this.persistSession();
        this.emit('auth:changed', { user: this.user });
    }

    logout() {
        this.clearSession();
        this.emit('auth:changed', { user: null });
    }
}

export const authService = new AuthService();

