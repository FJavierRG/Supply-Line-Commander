import { authService } from '../../services/AuthService.js';

export class AuthUIManager {
    constructor() {
        this.overlay = document.getElementById('auth-overlay');
        this.tabButtons = document.querySelectorAll('[data-auth-tab]');
        this.forms = {
            login: document.getElementById('auth-login-form'),
            register: document.getElementById('auth-register-form')
        };
        this.errorBoxes = {
            login: document.getElementById('auth-login-error'),
            register: document.getElementById('auth-register-error')
        };
        this.authPromiseResolve = null;
        this.activeTab = 'login';
    }

    init() {
        if (!this.overlay) {
            console.warn('No se encontró el overlay de autenticación');
            return;
        }
        this.bindTabEvents();
        this.bindFormEvents();
        this.activateTab('login');
        if (authService.isAuthenticated()) {
            this.hide();
        } else {
            this.show();
        }

        authService.on('auth:changed', ({ user }) => {
            if (user) {
                this.handleAuthSuccess();
            }
        });
    }

    bindTabEvents() {
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.dataset.authTab;
                this.activateTab(tab);
            });
        });
    }

    bindFormEvents() {
        this.forms.login?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLoginSubmit();
        });

        this.forms.register?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegisterSubmit();
        });
    }

    activateTab(tab) {
        this.activeTab = tab;
        this.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.authTab === tab);
        });
        Object.entries(this.forms).forEach(([key, form]) => {
            form?.classList.toggle('hidden', key !== tab);
        });
        Object.values(this.errorBoxes).forEach(box => {
            if (box) {
                box.textContent = '';
                box.classList.add('hidden');
            }
        });
    }

    async handleLoginSubmit() {
        if (!this.forms.login) return;
        const formData = new FormData(this.forms.login);
        const username = formData.get('username')?.toString().trim();
        const password = formData.get('password')?.toString() || '';

        if (!username || !password) {
            this.showError('login', 'Introduce usuario y contraseña.');
            return;
        }

        try {
            this.setLoading('login', true);
            await authService.login(username, password);
        } catch (error) {
            this.showError('login', error.message || 'No se pudo iniciar sesión.');
        } finally {
            this.setLoading('login', false);
        }
    }

    async handleRegisterSubmit() {
        if (!this.forms.register) return;
        const formData = new FormData(this.forms.register);
        const username = formData.get('username')?.toString().trim();
        const password = formData.get('password')?.toString() || '';
        const confirm = formData.get('confirmPassword')?.toString() || '';

        // Validación de campos vacíos
        if (!username || !password || !confirm) {
            this.showError('register', 'Completa todos los campos.');
            return;
        }

        // Validación de longitud del username
        if (username.length < 3) {
            this.showError('register', 'El nombre de usuario debe tener al menos 3 caracteres.');
            return;
        }

        if (username.length > 20) {
            this.showError('register', 'El nombre de usuario no puede exceder los 20 caracteres.');
            return;
        }

        // Validación de caracteres válidos del username (solo letras, números, guiones y guiones bajos)
        const usernameRegex = /^[a-zA-Z0-9_-]+$/;
        if (!usernameRegex.test(username)) {
            this.showError('register', 'El nombre de usuario solo puede contener letras, números, guiones (-) y guiones bajos (_).');
            return;
        }

        // Validación de longitud de la contraseña
        if (password.length < 6) {
            this.showError('register', 'La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        // Validación de coincidencia de contraseñas
        if (password !== confirm) {
            this.showError('register', 'Las contraseñas no coinciden.');
            return;
        }

        try {
            this.setLoading('register', true);
            await authService.register(username, password);
        } catch (error) {
            console.error('Error en registro:', error);
            // Extraer mensaje de error de diferentes formatos
            let errorMessage = 'No se pudo crear la cuenta.';
            
            if (error.message) {
                errorMessage = error.message;
            } else if (error.body?.error) {
                errorMessage = error.body.error;
            } else if (error.body && typeof error.body === 'string') {
                errorMessage = error.body;
            }
            
            this.showError('register', errorMessage);
        } finally {
            this.setLoading('register', false);
        }
    }

    showError(formKey, message) {
        const box = this.errorBoxes[formKey];
        if (!box) return;
        box.textContent = message;
        box.classList.remove('hidden');
    }

    setLoading(formKey, isLoading) {
        const form = this.forms[formKey];
        if (!form) return;
        const button = form.querySelector('button[type="submit"]');
        if (button) {
            if (!button.dataset.originalText) {
                button.dataset.originalText = button.textContent;
            }
            button.disabled = isLoading;
            button.textContent = isLoading ? 'Procesando...' : button.dataset.originalText;
        }
        form.querySelectorAll('input').forEach(input => {
            input.disabled = isLoading;
        });
    }

    show() {
        this.overlay?.classList.remove('hidden');
    }

    hide() {
        this.overlay?.classList.add('hidden');
    }

    requireAuthentication() {
        if (authService.isAuthenticated()) {
            return Promise.resolve();
        }
        this.show();
        return new Promise(resolve => {
            this.authPromiseResolve = resolve;
        });
    }

    handleAuthSuccess() {
        this.hide();
        if (this.authPromiseResolve) {
            this.authPromiseResolve();
            this.authPromiseResolve = null;
        }
    }
}

