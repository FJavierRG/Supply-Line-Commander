// ===== CONFIGURACIÓN DEL TUTORIAL SIMPLE =====
// Sistema simple de pantallazos con cajas de texto
import { i18n } from '../../services/I18nService.js';

/**
 * Obtiene los pasos del tutorial traducidos
 * @returns {Array} Array de pasos del tutorial
 */
export function getTutorialSteps() {
    const steps = i18n.t('tutorial.steps');
    
    // Mapear los textos traducidos con los metadatos de las imágenes
    const images = [
        null, // Paso 1
        'assets/demo/clean_map.png', // Paso 2
        'assets/demo/frontera_1.png', // Paso 3
        'assets/demo/frontera_2.png', // Paso 4
        'assets/demo/frontera_3.png', // Paso 5
        'assets/demo/resources_1.png', // Paso 6
        'assets/demo/resources_2.png', // Paso 7
        'assets/demo/resources_3.png', // Paso 8
        'assets/demo/resources_4.png', // Paso 9
        'assets/demo/store_1.png', // Paso 10
        'assets/demo/store_2.png', // Paso 11
        'assets/demo/enemy_1.png', // Paso 12
        'assets/demo/enemy_2.png', // Paso 13
        null // Paso 14
    ];
    
    return steps.map((stepData, index) => ({
        step: index + 1,
        title: stepData.title,
        image: images[index],
        text: stepData.text
    }));
}

// Mantener compatibilidad con código antiguo
export const TUTORIAL_STEPS = [
    // === PASO 1: INTRODUCCIÓN (sin imagen) ===
    {
        step: 1,
        get title() { return i18n.t('tutorial.steps.0.title'); },
        image: null,
        get text() { return i18n.t('tutorial.steps.0.text'); }
    },
    
    // === PASO 2: MAPA DEL JUEGO ===
    {
        step: 2,
        get title() { return i18n.t('tutorial.steps.1.title'); },
        image: 'assets/demo/clean_map.png',
        get text() { return i18n.t('tutorial.steps.1.text'); }
    },
    
    // === PASO 3: FRENTE DE BATALLA ===
    {
        step: 3,
        get title() { return i18n.t('tutorial.steps.2.title'); },
        image: 'assets/demo/frontera_1.png',
        get text() { return i18n.t('tutorial.steps.2.text'); }
    },
    
    // === PASO 4: FRENTE SIN RECURSOS ===
    {
        step: 4,
        get title() { return i18n.t('tutorial.steps.3.title'); },
        image: 'assets/demo/frontera_2.png',
        get text() { return i18n.t('tutorial.steps.3.text'); }
    },
    
    // === PASO 5: CONTROL DEL TERRITORIO ===
    {
        step: 5,
        get title() { return i18n.t('tutorial.steps.4.title'); },
        image: 'assets/demo/frontera_3.png',
        get text() { return i18n.t('tutorial.steps.4.text'); }
    },
    
    // === PASO 6: BARRA DE SUMINISTROS ===
    {
        step: 6,
        get title() { return i18n.t('tutorial.steps.5.title'); },
        image: 'assets/demo/resources_1.png',
        get text() { return i18n.t('tutorial.steps.5.text'); }
    },
    
    // === PASO 7: CAMIONES PESADOS DEL HQ ===
    {
        step: 7,
        get title() { return i18n.t('tutorial.steps.6.title'); },
        image: 'assets/demo/resources_2.png',
        get text() { return i18n.t('tutorial.steps.6.text'); }
    },
    
    // === PASO 8: CAMIONES LIGEROS DE LAS FOBS ===
    {
        step: 8,
        get title() { return i18n.t('tutorial.steps.7.title'); },
        image: 'assets/demo/resources_3.png',
        get text() { return i18n.t('tutorial.steps.7.text'); }
    },
    
    // === PASO 9: INDICADORES DE FOB ===
    {
        step: 9,
        get title() { return i18n.t('tutorial.steps.8.title'); },
        image: 'assets/demo/resources_4.png',
        get text() { return i18n.t('tutorial.steps.8.text'); }
    },
    
    // === PASO 10: DESPLEGAR LA TIENDA ===
    {
        step: 10,
        get title() { return i18n.t('tutorial.steps.9.title'); },
        image: 'assets/demo/store_1.png',
        get text() { return i18n.t('tutorial.steps.9.text'); }
    },
    
    // === PASO 11: CONTENIDO DE LA TIENDA ===
    {
        step: 11,
        get title() { return i18n.t('tutorial.steps.10.title'); },
        image: 'assets/demo/store_2.png',
        get text() { return i18n.t('tutorial.steps.10.text'); }
    },
    
    // === PASO 12: OBJETIVO DEL JUEGO ===
    {
        step: 12,
        get title() { return i18n.t('tutorial.steps.11.title'); },
        image: 'assets/demo/enemy_1.png',
        get text() { return i18n.t('tutorial.steps.11.text'); }
    },
    
    // === PASO 13: ENFRENTAMIENTO DE FRENTES ===
    {
        step: 13,
        get title() { return i18n.t('tutorial.steps.12.title'); },
        image: 'assets/demo/enemy_2.png',
        get text() { return i18n.t('tutorial.steps.12.text'); }
    },
    
    // === PASO 14: FINAL (sin imagen) ===
    {
        step: 14,
        get title() { return i18n.t('tutorial.steps.13.title'); },
        image: null,
        get text() { return i18n.t('tutorial.steps.13.text'); }
    }
];
