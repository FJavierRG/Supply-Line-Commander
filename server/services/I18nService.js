// ===== SERVICIO DE INTERNACIONALIZACIÓN (i18n) - SERVIDOR =====
// Sistema centralizado de traducciones para el servidor Node.js

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Servicio de internacionalización para el servidor
 * Gestiona la carga y acceso a traducciones de descripciones de edificios
 */
export class I18nService {
    constructor() {
        this.translations = {}; // Cache de traducciones cargadas
        this.fallbackLanguage = 'es'; // Idioma de respaldo
        this.supportedLanguages = ['es', 'en'];
        this.initialized = false;
    }

    /**
     * Inicializa el servicio cargando todos los idiomas
     */
    init() {
        console.log('🌐 Inicializando servicio i18n del servidor...');
        
        // Cargar todos los idiomas soportados
        this.supportedLanguages.forEach(lang => {
            try {
                this.loadLanguage(lang);
            } catch (error) {
                console.error(`❌ Error cargando idioma ${lang}:`, error);
            }
        });

        this.initialized = true;
        console.log(`✅ Servicio i18n inicializado. Idiomas disponibles: ${this.supportedLanguages.join(', ')}`);
    }

    /**
     * Carga un archivo de idioma
     * @param {string} langCode - Código del idioma ('es', 'en')
     */
    loadLanguage(langCode) {
        if (!this.supportedLanguages.includes(langCode)) {
            console.warn(`⚠️ Idioma no soportado: ${langCode}`);
            return;
        }

        // Ruta al archivo JSON del idioma
        const filePath = join(__dirname, '../../locales/server', `${langCode}.json`);

        try {
            const fileContent = readFileSync(filePath, 'utf-8');
            const data = JSON.parse(fileContent);
            
            // Guardar en cache
            this.translations[langCode] = data;
            
            console.log(`✅ Idioma cargado: ${langCode} (${data.meta?.language || 'unknown'})`);
        } catch (error) {
            console.error(`❌ Error leyendo archivo de idioma ${langCode}:`, error.message);
            throw error;
        }
    }

    /**
     * Obtiene una traducción por su clave
     * Soporta claves anidadas usando notación de punto: 'buildings.hq.name'
     * Soporta interpolación de variables: 'Genera {amount} suministros' con data: { amount: 5 }
     * 
     * @param {string} langCode - Código del idioma ('es', 'en')
     * @param {string} key - Clave de la traducción (ej: 'buildings.hq.name')
     * @param {Object} data - Datos para interpolación (opcional)
     * @returns {string} Traducción o clave entre corchetes si no existe
     */
    t(langCode, key, data = {}) {
        if (!this.initialized) {
            console.warn('⚠️ I18n no inicializado, retornando clave');
            return `[${key}]`;
        }

        // Validar idioma
        if (!this.supportedLanguages.includes(langCode)) {
            console.warn(`⚠️ Idioma no soportado: ${langCode}, usando fallback`);
            langCode = this.fallbackLanguage;
        }

        // Obtener traducciones del idioma solicitado
        let translations = this.translations[langCode];
        
        // Si no hay traducciones para el idioma, usar fallback
        if (!translations) {
            console.warn(`⚠️ No hay traducciones para: ${langCode}, usando fallback`);
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
                if (langCode !== this.fallbackLanguage) {
                    const fallbackTranslations = this.translations[this.fallbackLanguage];
                    let fallbackValue = fallbackTranslations;
                    
                    for (const fk of keys) {
                        if (fallbackValue && typeof fallbackValue === 'object' && fk in fallbackValue) {
                            fallbackValue = fallbackValue[fk];
                        } else {
                            // Tampoco existe en fallback
                            console.warn(`⚠️ Traducción no encontrada: ${key} (idioma: ${langCode})`);
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
     * Ejemplo: 'Genera {amount} suministros' con { amount: 5 } -> 'Genera 5 suministros'
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
     * Obtiene las descripciones de un nodo/edificio en un idioma específico
     * @param {string} langCode - Código del idioma
     * @param {string} nodeId - ID del nodo (ej: 'hq', 'factory', 'drone')
     * @returns {Object} { name, description, details } o null si no existe
     */
    getNodeDescription(langCode, nodeId) {
        // Buscar primero en buildings
        let category = 'buildings';
        let desc = this.getNodeFromCategory(langCode, category, nodeId);
        
        // Si no está en buildings, buscar en consumables
        if (!desc) {
            category = 'consumables';
            desc = this.getNodeFromCategory(langCode, category, nodeId);
        }

        return desc;
    }

    /**
     * Helper: Obtiene un nodo de una categoría específica
     * @param {string} langCode - Código del idioma
     * @param {string} category - Categoría ('buildings' o 'consumables')
     * @param {string} nodeId - ID del nodo
     * @returns {Object|null}
     */
    getNodeFromCategory(langCode, category, nodeId) {
        const translations = this.translations[langCode] || this.translations[this.fallbackLanguage];
        
        if (!translations || !translations[category] || !translations[category][nodeId]) {
            return null;
        }

        return translations[category][nodeId];
    }

    /**
     * Obtiene todas las descripciones de nodos en un idioma específico
     * @param {string} langCode - Código del idioma
     * @returns {Object} Objeto con todas las descripciones { nodeId: { name, description, details } }
     */
    getAllDescriptions(langCode) {
        const translations = this.translations[langCode] || this.translations[this.fallbackLanguage];
        
        if (!translations) {
            console.error('❌ No hay traducciones disponibles');
            return {};
        }

        // Combinar buildings y consumables
        const result = {};
        
        if (translations.buildings) {
            Object.assign(result, translations.buildings);
        }
        
        if (translations.consumables) {
            Object.assign(result, translations.consumables);
        }

        return result;
    }

    /**
     * ✅ NUEVO: Obtiene todas las disciplinas traducidas
     * @param {string} langCode - Código del idioma
     * @returns {Object} Objeto con todas las disciplinas { disciplineId: { name, description } }
     */
    getAllDisciplines(langCode) {
        const translations = this.translations[langCode] || this.translations[this.fallbackLanguage];
        
        if (!translations) {
            console.error('❌ No hay traducciones disponibles');
            return {};
        }

        return translations.disciplines || {};
    }

    /**
     * Verifica si un idioma está disponible
     * @param {string} langCode - Código del idioma
     * @returns {boolean}
     */
    isLanguageAvailable(langCode) {
        return this.supportedLanguages.includes(langCode);
    }

    /**
     * Obtiene la lista de idiomas soportados
     * @returns {Array<string>}
     */
    getSupportedLanguages() {
        return this.supportedLanguages;
    }
}

// Exportar instancia singleton
export const i18nServer = new I18nService();

