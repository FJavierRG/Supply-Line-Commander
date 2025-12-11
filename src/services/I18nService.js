// ===== SERVICIO DE INTERNACIONALIZACIÓN (i18n) =====
// Sistema centralizado de traducciones para el cliente

/**
 * Servicio de internacionalización
 * Gestiona la carga y acceso a traducciones
 */
export class I18nService {
    constructor() {
        this.currentLanguage = 'es'; // Idioma por defecto
        this.translations = {}; // Cache de traducciones cargadas
        this.fallbackLanguage = 'es'; // Idioma de respaldo si falta una traducción
        this.initialized = false;
    }

    /**
     * Inicializa el servicio de i18n
     * Lee el idioma guardado o detecta del navegador
     */
    async init() {
        // 1. Intentar leer idioma guardado en localStorage
        const savedLanguage = localStorage.getItem('game_language');
        
        // 2. Si no hay guardado, detectar del navegador
        let detectedLanguage = 'es'; // default
        if (!savedLanguage) {
            const browserLang = navigator.language || navigator.userLanguage;
            if (browserLang) {
                const langCode = browserLang.split('-')[0]; // 'en-US' -> 'en'
                if (langCode === 'en' || langCode === 'es') {
                    detectedLanguage = langCode;
                }
            }
        }
        
        const languageToLoad = savedLanguage || detectedLanguage;
        
        // 3. Cargar el idioma
        await this.setLanguage(languageToLoad);
        
        this.initialized = true;
        console.log(`✅ I18n inicializado: idioma="${this.currentLanguage}"`);
    }

    /**
     * Cambia el idioma actual
     * @param {string} langCode - Código del idioma ('es', 'en')
     * @returns {Promise<boolean>} true si se cargó correctamente
     */
    async setLanguage(langCode) {
        try {
            // Validar que el idioma es soportado
            if (!['es', 'en'].includes(langCode)) {
                console.warn(`⚠️ Idioma no soportado: ${langCode}, usando fallback: ${this.fallbackLanguage}`);
                langCode = this.fallbackLanguage;
            }

            // Si ya está cargado en cache, usarlo
            if (this.translations[langCode]) {
                this.currentLanguage = langCode;
                localStorage.setItem('game_language', langCode);
                console.log(`✅ Idioma cambiado a: ${langCode} (desde cache)`);
                return true;
            }

            // Cargar archivo JSON del idioma
            const response = await fetch(`locales/client/${langCode}.json`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Guardar en cache
            this.translations[langCode] = data;
            this.currentLanguage = langCode;
            
            // Guardar preferencia en localStorage
            localStorage.setItem('game_language', langCode);
            
            console.log(`✅ Idioma cargado: ${langCode}`);
            return true;
            
        } catch (error) {
            console.error(`❌ Error cargando idioma ${langCode}:`, error);
            
            // Si falla y no es el fallback, intentar con fallback
            if (langCode !== this.fallbackLanguage && !this.translations[this.fallbackLanguage]) {
                console.log(`🔄 Intentando cargar idioma fallback: ${this.fallbackLanguage}`);
                return await this.setLanguage(this.fallbackLanguage);
            }
            
            return false;
        }
    }

    /**
     * Obtiene una traducción por su clave
     * Soporta claves anidadas usando notación de punto: 'auth.login.title'
     * Soporta interpolación de variables: 'Hola {name}' con data: { name: 'Juan' }
     * 
     * @param {string} key - Clave de la traducción (ej: 'auth.login.title')
     * @param {Object} data - Datos para interpolación (opcional)
     * @returns {string} Traducción o clave entre corchetes si no existe
     */
    t(key, data = {}) {
        if (!this.initialized) {
            console.warn('⚠️ I18n no inicializado, usando clave raw:', key);
            return `[${key}]`;
        }

        // Obtener traducciones del idioma actual
        let translations = this.translations[this.currentLanguage];
        
        // Si no hay traducciones para el idioma actual, usar fallback
        if (!translations) {
            console.warn(`⚠️ No hay traducciones para idioma: ${this.currentLanguage}, usando fallback`);
            translations = this.translations[this.fallbackLanguage];
        }

        // Si tampoco hay fallback, retornar clave
        if (!translations) {
            console.error('❌ No hay traducciones disponibles');
            return `[${key}]`;
        }

        // Navegar por el objeto usando la clave con puntos
        const keys = key.split('.');
        let value = translations;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // No se encontró la clave, intentar con fallback
                if (this.currentLanguage !== this.fallbackLanguage) {
                    const fallbackTranslations = this.translations[this.fallbackLanguage];
                    let fallbackValue = fallbackTranslations;
                    
                    for (const fk of keys) {
                        if (fallbackValue && typeof fallbackValue === 'object' && fk in fallbackValue) {
                            fallbackValue = fallbackValue[fk];
                        } else {
                            // Tampoco existe en fallback
                            console.warn(`⚠️ Traducción no encontrada: ${key}`);
                            return `[${key}]`;
                        }
                    }
                    
                    value = fallbackValue;
                    console.warn(`⚠️ Usando fallback para: ${key}`);
                } else {
                    console.warn(`⚠️ Traducción no encontrada: ${key}`);
                    return `[${key}]`;
                }
                break;
            }
        }

        // Si el valor final no es string, retornar clave
        if (typeof value !== 'string') {
            console.warn(`⚠️ Traducción no es string: ${key}`);
            return `[${key}]`;
        }

        // Aplicar interpolación de variables
        return this.interpolate(value, data);
    }

    /**
     * Interpola variables en un string
     * Ejemplo: 'Hola {name}' con { name: 'Juan' } -> 'Hola Juan'
     * @param {string} text - Texto con placeholders
     * @param {Object} data - Datos para interpolación
     * @returns {string} Texto interpolado
     */
    interpolate(text, data) {
        if (!data || Object.keys(data).length === 0) {
            return text;
        }

        return text.replace(/\{(\w+)\}/g, (match, key) => {
            return data.hasOwnProperty(key) ? data[key] : match;
        });
    }

    /**
     * Obtiene el idioma actual
     * @returns {string} Código del idioma actual
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Obtiene todos los idiomas disponibles
     * @returns {Array<{code: string, name: string}>}
     */
    getAvailableLanguages() {
        return [
            { code: 'es', name: 'Español' },
            { code: 'en', name: 'English' }
        ];
    }

    /**
     * Verifica si un idioma está disponible
     * @param {string} langCode - Código del idioma
     * @returns {boolean}
     */
    isLanguageAvailable(langCode) {
        return ['es', 'en'].includes(langCode);
    }
}

// Exportar instancia singleton
export const i18n = new I18nService();

