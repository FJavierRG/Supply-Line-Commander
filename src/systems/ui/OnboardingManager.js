// ===== SISTEMA DE ONBOARDING =====
// Pantalla de bienvenida para que usuarios nuevos elijan su nombre

import { authService } from '../../services/AuthService.js';
import { profileService } from '../../services/ProfileService.js';

export class OnboardingManager {
    constructor() {
        this.onboardingComplete = false;
        this.overlay = null;
    }
    
    /**
     * Verificar si el usuario necesita completar onboarding
     */
    async checkOnboarding() {
        try {
            const userId = authService.getCurrentUserId();
            if (!userId) {
                console.error('❌ No hay usuario autenticado');
                return false;
            }
            
            // Verificar si ya completó el onboarding
            const hasCompletedOnboarding = localStorage.getItem('onboarding_complete');
            if (hasCompletedOnboarding === 'true') {
                console.log('✅ Usuario ya completó onboarding');
                this.onboardingComplete = true;
                return true;
            }
            
            // Verificar si tiene perfil en Supabase
            const profile = await profileService.getProfile(userId);
            
            if (profile && !profile.username.startsWith('Guest_')) {
                // Tiene un username personalizado, marcar onboarding como completo
                localStorage.setItem('onboarding_complete', 'true');
                this.onboardingComplete = true;
                console.log('✅ Usuario tiene perfil personalizado:', profile.username);
                return true;
            }
            
            // Necesita completar onboarding
            console.log('⚠️ Usuario necesita completar onboarding');
            return false;
        } catch (error) {
            console.error('❌ Error verificando onboarding:', error);
            return false;
        }
    }
    
    /**
     * Mostrar pantalla de onboarding
     */
    async showOnboarding() {
        return new Promise((resolve) => {
            // Crear overlay
            this.overlay = document.createElement('div');
            this.overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease-in;
            `;
            
            // Crear contenedor del formulario
            const container = document.createElement('div');
            container.style.cssText = `
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 3px solid #4ecca3;
                border-radius: 20px;
                padding: 40px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(78, 204, 163, 0.3);
                animation: slideIn 0.5s ease-out;
            `;
            
            container.innerHTML = `
                <style>
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideIn {
                        from {
                            transform: translateY(-50px);
                            opacity: 0;
                        }
                        to {
                            transform: translateY(0);
                            opacity: 1;
                        }
                    }
                    .pulse {
                        animation: pulse 2s ease-in-out infinite;
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                </style>
                
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="
                        color: #4ecca3;
                        font-size: 36px;
                        margin: 0 0 10px 0;
                        font-weight: bold;
                        text-shadow: 0 0 20px rgba(78, 204, 163, 0.5);
                    ">
                        🎮 Bienvenido
                    </h1>
                    <p style="
                        color: #aaa;
                        font-size: 16px;
                        margin: 0;
                        line-height: 1.6;
                    ">
                        Elige un nombre de usuario para empezar
                    </p>
                </div>
                
                <div style="margin-bottom: 25px;">
                    <label style="
                        display: block;
                        color: #4ecca3;
                        font-size: 14px;
                        font-weight: bold;
                        margin-bottom: 10px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    ">
                        Nombre de Usuario
                    </label>
                    <input 
                        type="text" 
                        id="username-input" 
                        placeholder="MiNombre123"
                        maxlength="20"
                        style="
                            width: 100%;
                            padding: 15px;
                            background: rgba(0, 0, 0, 0.5);
                            border: 2px solid #4ecca3;
                            border-radius: 10px;
                            color: white;
                            font-size: 18px;
                            box-sizing: border-box;
                            transition: all 0.3s;
                        "
                    />
                    <div id="username-error" style="
                        color: #e74c3c;
                        font-size: 12px;
                        margin-top: 8px;
                        min-height: 16px;
                        font-weight: bold;
                    "></div>
                    <div style="
                        color: #888;
                        font-size: 12px;
                        margin-top: 5px;
                    ">
                        • 3-20 caracteres<br>
                        • Solo letras, números, guiones y guiones bajos<br>
                        • No se puede cambiar después
                    </div>
                </div>
                
                <button id="continue-btn" disabled style="
                    width: 100%;
                    padding: 15px;
                    background: linear-gradient(135deg, #4ecca3 0%, #3aa88c 100%);
                    border: none;
                    border-radius: 10px;
                    color: white;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    box-shadow: 0 5px 15px rgba(78, 204, 163, 0.3);
                ">
                    Continuar
                </button>
                
                <div style="
                    text-align: center;
                    margin-top: 20px;
                    color: #666;
                    font-size: 12px;
                ">
                    🔒 Tu sesión es anónima y segura.<br>
                    Podrás agregar contraseña más tarde.
                </div>
            `;
            
            this.overlay.appendChild(container);
            document.body.appendChild(this.overlay);
            
            // Referencias a elementos
            const usernameInput = document.getElementById('username-input');
            const usernameError = document.getElementById('username-error');
            const continueBtn = document.getElementById('continue-btn');
            
            // Focus automático
            usernameInput.focus();
            
            // Validación en tiempo real
            let validationTimeout = null;
            usernameInput.addEventListener('input', () => {
                const username = usernameInput.value.trim();
                
                // Limpiar timeout anterior
                clearTimeout(validationTimeout);
                
                // Validación básica inmediata
                if (username.length < 3) {
                    usernameError.textContent = 'Mínimo 3 caracteres';
                    continueBtn.disabled = true;
                    continueBtn.style.opacity = '0.5';
                    continueBtn.style.cursor = 'not-allowed';
                    return;
                }
                
                if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
                    usernameError.textContent = 'Solo letras, números, - y _';
                    continueBtn.disabled = true;
                    continueBtn.style.opacity = '0.5';
                    continueBtn.style.cursor = 'not-allowed';
                    return;
                }
                
                // Validación con servidor (debounced)
                usernameError.textContent = 'Verificando...';
                usernameError.style.color = '#f39c12';
                continueBtn.disabled = true;
                continueBtn.style.opacity = '0.5';
                
                validationTimeout = setTimeout(async () => {
                    try {
                        const available = await profileService.checkUsernameAvailability(username);
                        
                        if (available) {
                            usernameError.textContent = '✓ Disponible';
                            usernameError.style.color = '#2ecc71';
                            continueBtn.disabled = false;
                            continueBtn.style.opacity = '1';
                            continueBtn.style.cursor = 'pointer';
                        } else {
                            usernameError.textContent = '✗ No disponible';
                            usernameError.style.color = '#e74c3c';
                            continueBtn.disabled = true;
                            continueBtn.style.opacity = '0.5';
                            continueBtn.style.cursor = 'not-allowed';
                        }
                    } catch (error) {
                        usernameError.textContent = '⚠ Error verificando';
                        usernameError.style.color = '#e74c3c';
                        continueBtn.disabled = true;
                    }
                }, 500);
            });
            
            // Hover del botón
            continueBtn.addEventListener('mouseenter', () => {
                if (!continueBtn.disabled) {
                    continueBtn.style.transform = 'translateY(-2px)';
                    continueBtn.style.boxShadow = '0 8px 20px rgba(78, 204, 163, 0.4)';
                }
            });
            
            continueBtn.addEventListener('mouseleave', () => {
                continueBtn.style.transform = 'translateY(0)';
                continueBtn.style.boxShadow = '0 5px 15px rgba(78, 204, 163, 0.3)';
            });
            
            // Submit con Enter
            usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !continueBtn.disabled) {
                    continueBtn.click();
                }
            });
            
            // Handler del botón continuar
            continueBtn.addEventListener('click', async () => {
                const username = usernameInput.value.trim();
                
                if (!username) return;
                
                // Deshabilitar botón durante el proceso
                continueBtn.disabled = true;
                continueBtn.textContent = 'Creando perfil...';
                continueBtn.classList.add('pulse');
                
                try {
                    const userId = authService.getCurrentUserId();
                    
                    // Crear/actualizar perfil en Supabase
                    const profile = await profileService.createOrUpdateProfile(
                        userId,
                        username,
                        username // display_name = username por defecto
                    );
                    
                    if (profile) {
                        // Marcar onboarding como completo
                        localStorage.setItem('onboarding_complete', 'true');
                        this.onboardingComplete = true;
                        
                        // Cerrar overlay con animación
                        this.overlay.style.animation = 'fadeOut 0.3s ease-out';
                        setTimeout(() => {
                            this.overlay.remove();
                            this.overlay = null;
                            resolve(profile);
                        }, 300);
                        
                        console.log('✅ Onboarding completado:', profile.username);
                    } else {
                        throw new Error('No se pudo crear el perfil');
                    }
                } catch (error) {
                    console.error('❌ Error al crear perfil:', error);
                    usernameError.textContent = '⚠ Error al crear perfil. Intenta de nuevo.';
                    usernameError.style.color = '#e74c3c';
                    continueBtn.disabled = false;
                    continueBtn.textContent = 'Continuar';
                    continueBtn.classList.remove('pulse');
                }
            });
            
            // Agregar animación fadeOut al CSS
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        });
    }
    
    /**
     * Iniciar proceso de onboarding si es necesario
     */
    async start() {
        const needsOnboarding = await this.checkOnboarding();
        
        if (!needsOnboarding) {
            await this.showOnboarding();
        }
        
        return this.onboardingComplete;
    }
}

