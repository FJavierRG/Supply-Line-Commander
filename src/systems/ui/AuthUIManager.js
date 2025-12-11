import { authService } from '../../services/AuthService.js';
import { i18n } from '../../services/I18nService.js';

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
        this.i18nInitialized = false;
    }

    async init() {
        // ✅ NUEVO: Inicializar i18n primero
        if (!i18n.initialized) {
            await i18n.init();
        }
        this.i18nInitialized = true;

        if (!this.overlay) {
            console.warn('No se encontró el overlay de autenticación');
            return;
        }

        // ✅ NUEVO: Crear selector de idioma
        this.createLanguageSelector();

        // ✅ NUEVO: Actualizar textos con traducciones
        this.updateAuthTexts();

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

        // ✅ NUEVO: Listener para cambios de idioma
        window.addEventListener('languageChanged', () => {
            this.updateAuthTexts();
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

    // ===== MÉTODOS DE INTERNACIONALIZACIÓN =====

    /**
     * Crea el selector de idioma en la pantalla de login
     */
    createLanguageSelector() {
        const authModal = document.querySelector('.auth-modal');
        if (!authModal) {
            console.warn('⚠️ No se encontró .auth-modal para añadir selector de idioma');
            return;
        }

        // Verificar si ya existe
        if (document.getElementById('language-selector')) {
            return;
        }

        // Crear contenedor del selector
        const selectorContainer = document.createElement('div');
        selectorContainer.id = 'language-selector';
        selectorContainer.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.7);
            z-index: 10;
        `;

        // Crear icono de idioma
        const icon = document.createElement('span');
        icon.textContent = '🌐';
        icon.style.fontSize = '18px';

        // Crear selector dropdown
        const select = document.createElement('select');
        select.id = 'language-select';
        select.style.cssText = `
            background: rgba(0, 0, 0, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
            border-radius: 5px;
            color: white;
            padding: 5px 10px;
            font-size: 14px;
            cursor: pointer;
            outline: none;
            transition: border-color 0.2s;
        `;

        // Añadir opciones de idiomas
        const languages = i18n.getAvailableLanguages();
        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.name;
            if (lang.code === i18n.getCurrentLanguage()) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        // Hover effect
        select.addEventListener('mouseenter', () => {
            select.style.borderColor = 'rgba(255, 255, 255, 0.5)';
        });
        select.addEventListener('mouseleave', () => {
            select.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        });

        // Event listener para cambio de idioma
        select.addEventListener('change', async (e) => {
            const newLang = e.target.value;
            await this.changeLanguage(newLang);
        });

        // Ensamblar
        selectorContainer.appendChild(icon);
        selectorContainer.appendChild(select);
        authModal.appendChild(selectorContainer);

        console.log('✅ Selector de idioma creado');
    }

    /**
     * Actualiza todos los textos de la UI de autenticación
     */
    updateAuthTexts() {
        if (!this.i18nInitialized) return;

        // Título principal
        const title = document.querySelector('.auth-header h1');
        if (title) {
            title.textContent = i18n.t('auth.title');
        }

        // Tabs
        const loginTab = document.querySelector('[data-auth-tab="login"]');
        if (loginTab) {
            loginTab.textContent = i18n.t('auth.login.tab');
        }

        const registerTab = document.querySelector('[data-auth-tab="register"]');
        if (registerTab) {
            registerTab.textContent = i18n.t('auth.register.tab');
        }

        // Formulario de Login
        this.updateLoginFormTexts();

        // Formulario de Registro
        this.updateRegisterFormTexts();

        console.log('✅ Textos de autenticación actualizados');
    }

    /**
     * Actualiza textos del formulario de login
     */
    updateLoginFormTexts() {
        const loginForm = this.forms.login;
        if (!loginForm) return;

        // Username label
        const usernameLabel = loginForm.querySelector('label[for="auth-login-username"]');
        if (usernameLabel) {
            usernameLabel.textContent = i18n.t('auth.login.username_label');
        }

        // Username input
        const usernameInput = document.getElementById('auth-login-username');
        if (usernameInput) {
            usernameInput.placeholder = i18n.t('auth.login.username_placeholder');
        }

        // Password label
        const passwordLabel = loginForm.querySelector('label[for="auth-login-password"]');
        if (passwordLabel) {
            passwordLabel.textContent = i18n.t('auth.login.password_label');
        }

        // Password input
        const passwordInput = document.getElementById('auth-login-password');
        if (passwordInput) {
            passwordInput.placeholder = i18n.t('auth.login.password_placeholder');
        }

        // Submit button
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = i18n.t('auth.login.submit');
            submitBtn.dataset.originalText = i18n.t('auth.login.submit');
        }
    }

    /**
     * Actualiza textos del formulario de registro
     */
    updateRegisterFormTexts() {
        const registerForm = this.forms.register;
        if (!registerForm) return;

        // Username label
        const usernameLabel = registerForm.querySelector('label[for="auth-register-username"]');
        if (usernameLabel) {
            usernameLabel.textContent = i18n.t('auth.register.username_label');
        }

        // Username input
        const usernameInput = document.getElementById('auth-register-username');
        if (usernameInput) {
            usernameInput.placeholder = i18n.t('auth.register.username_placeholder');
        }

        // Password label
        const passwordLabel = registerForm.querySelector('label[for="auth-register-password"]');
        if (passwordLabel) {
            passwordLabel.textContent = i18n.t('auth.register.password_label');
        }

        // Password input
        const passwordInput = document.getElementById('auth-register-password');
        if (passwordInput) {
            passwordInput.placeholder = i18n.t('auth.register.password_placeholder');
        }

        // Confirm password label
        const confirmLabel = registerForm.querySelector('label[for="auth-register-confirm"]');
        if (confirmLabel) {
            confirmLabel.textContent = i18n.t('auth.register.confirm_label');
        }

        // Confirm password input
        const confirmInput = document.getElementById('auth-register-confirm');
        if (confirmInput) {
            confirmInput.placeholder = i18n.t('auth.register.confirm_placeholder');
        }

        // Submit button
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = i18n.t('auth.register.submit');
            submitBtn.dataset.originalText = i18n.t('auth.register.submit');
        }
    }

    /**
     * Cambia el idioma y actualiza la UI
     */
    async changeLanguage(langCode) {
        console.log(`🌐 Cambiando idioma a: ${langCode}`);
        
        const success = await i18n.setLanguage(langCode);
        
        if (success) {
            // Actualizar todos los textos
            this.updateAuthTexts();
            
            // Disparar evento personalizado para que otros componentes se actualicen
            window.dispatchEvent(new CustomEvent('languageChanged', { 
                detail: { language: langCode } 
            }));
            
            console.log(`✅ Idioma cambiado a: ${langCode}`);
        } else {
            console.error(`❌ Error al cambiar idioma a: ${langCode}`);
        }
    }
}

