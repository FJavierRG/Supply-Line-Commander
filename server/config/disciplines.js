// ===== CONFIGURACIÓN DE DISCIPLINAS =====
// Define todas las disciplinas disponibles en el juego
// Las disciplinas son modificadores estratégicos temporales que afectan múltiples sistemas

/**
 * Estructura de una disciplina:
 * {
 *   id: string,              // Identificador único
 *   name: string,            // Nombre para mostrar
 *   description: string,     // Descripción de efectos (ventajas y desventajas)
 *   icon: string,            // Nombre del archivo de sprite (en assets/sprites/ui/Disciplines/)
 *   duration: number,        // Duración en segundos
 *   cooldown: number,        // Cooldown en segundos tras terminar
 *   enabled: boolean,        // Para habilitar/deshabilitar disciplinas
 *   
 *   effects: {               // Efectos organizados por sistema afectado
 *     [systemName]: {
 *       [parameter]: value
 *     }
 *   }
 * }
 */

export const DISCIPLINES = {
    // ============================================================
    // INDUSTRIA MOTORIZADA
    // ============================================================
    'motorized_industry': {
        id: 'motorized_industry',
        name: 'Industria Motorizada',
        description: 'Aumenta la velocidad: camiones ligeros +50%, camiones pesados +25%, trenes +10%. Enviar un vehículo cuesta 2 currency.',
        icon: 'assets/sprites/ui/Disciplines/vehicle.png',
        duration: 60,
        cooldown: 15,
        enabled: true,
        
        effects: {
            convoy: {
                speedMultipliers: {
                    truck: 1.5,
                    heavy_truck: 1.25,
                    train: 1.1,
                    default: 1.0
                },
                deploymentCost: 3
            }
        }
    },
    
    // ============================================================
    // INFRAESTRUCTURAS MEJORADAS
    // ============================================================
    'improved_infrastructure': {
        id: 'improved_infrastructure',
        name: 'Infraestructuras Mejoradas',
        description: 'Por cada paquete que una fábrica entrega al HQ genera +3 currency. Los suministros de las fábricas disminuyen en -3.',
        icon: 'assets/sprites/ui/Disciplines/production_focus2.png',
        duration: 60,
        cooldown: 50,
        enabled: true,
        
        effects: {
            factory: {
                currencyPerDelivery: 4,
                supplyPenalty: -3
            }
        }
    },
    
    // ============================================================
    // COMBATE DEFENSIVO
    // ============================================================
    'defensive_combat': {
        id: 'defensive_combat',
        name: 'Combate Defensivo',
        description: 'En modo Mantener: el gasto de suministros disminuye un 20% adicional y otorga +1 currency/segundo por frente.',
        icon: 'assets/sprites/ui/Disciplines/defense_focus.png',
        duration: 60,
        cooldown: 20,
        enabled: true,
        
        effects: {
            frontMode: {
                targetMode: 'hold',
                consumeMultiplierBonus: -0.20,
                currencyPerSecondPerFront: 1
            }
        }
    },
    
    // ============================================================
    // ENDEUDAMIENTO
    // ============================================================
    'endeudamiento': {
        id: 'endeudamiento',
        name: 'Endeudamiento',
        description: 'Permite gastar currency por debajo de 0 hasta -150. Ideal para inversiones agresivas durante la ventana activa.',
        icon: 'assets/sprites/ui/Disciplines/endeudamiento2.png',
        duration: 120,
        cooldown: 60,
        enabled: true,

        effects: {
            economy: {
                allowNegativeCurrency: true,
                minCurrency: -150
            }
        }
    },
    
    // ============================================================
    // AVANCE AGRESIVO
    // ============================================================
    'aggressive_advance': {
        id: 'aggressive_advance',
        name: 'Avance Agresivo',
        description: 'Los nodos en modo avanzar aumentan su velocidad de avance x2 así como su consumo de suministros x2.5.',
        icon: 'assets/sprites/ui/Disciplines/fusiles_masa.png',
        duration: 20,
        cooldown: 120,
        enabled: true,
        
        effects: {
            frontMode: {
                targetMode: 'advance',
                advanceSpeedMultiplier: 2.0,
                consumeMultiplierBonus: 1.5  // Base 1.0 + 1.5 = 2.5 total
            }
        }
    }

    // ✅ Para añadir una nueva disciplina, simplemente copia el bloque anterior
    // y rellena todos los campos incluyendo 'description'
};

// 🐛 DEBUG: Verificar que las disciplinas se cargan correctamente
console.log('✅ [DISCIPLINES] Configuración cargada:', Object.keys(DISCIPLINES).length, 'disciplinas ->', Object.keys(DISCIPLINES));

// ============================================================
// HELPERS
// ============================================================

/**
 * Obtiene una disciplina por su ID
 * @param {string} disciplineId - ID de la disciplina
 * @returns {Object|null} - Configuración de la disciplina o null si no existe
 */
export function getDiscipline(disciplineId) {
    return DISCIPLINES[disciplineId] || null;
}

/**
 * Obtiene todas las disciplinas habilitadas
 * @returns {Array<Object>} - Array de disciplinas habilitadas
 */
export function getEnabledDisciplines() {
    return Object.values(DISCIPLINES).filter(d => d.enabled !== false);
}

/**
 * Verifica si existe una disciplina
 * @param {string} disciplineId - ID de la disciplina
 * @returns {boolean} - true si existe
 */
export function disciplineExists(disciplineId) {
    return DISCIPLINES.hasOwnProperty(disciplineId);
}

/**
 * Obtiene todas las disciplinas (habilitadas y deshabilitadas)
 * @returns {Array<Object>} - Array de todas las disciplinas
 */
export function getAllDisciplines() {
    return Object.values(DISCIPLINES);
}

/**
 * Obtiene la descripción de una disciplina
 * @param {string} disciplineId - ID de la disciplina
 * @returns {string} - Descripción de la disciplina
 */
export function getDisciplineDescription(disciplineId) {
    const discipline = getDiscipline(disciplineId);
    return discipline?.description || 'Sin descripción disponible.';
}

/**
 * Valida que una lista de disciplinas sea válida para un mazo
 * @param {Array<string>} disciplineIds - Array de IDs de disciplinas
 * @returns {Object} - { valid: boolean, errors: Array<string> }
 */
export function validateDisciplineList(disciplineIds) {
    const errors = [];
    
    if (!Array.isArray(disciplineIds)) {
        errors.push('La lista de disciplinas debe ser un array');
        return { valid: false, errors };
    }
    
    // 🔧 FIX: Requerir EXACTAMENTE 2 disciplinas
    if (disciplineIds.length !== 2) {
        errors.push('Debes equipar exactamente 2 disciplinas en tu mazo');
        return { valid: false, errors };
    }
    
    // Verificar duplicados
    const unique = [...new Set(disciplineIds)];
    if (unique.length !== disciplineIds.length) {
        errors.push('No puede haber disciplinas duplicadas');
    }
    
    // Verificar que todas existan y estén habilitadas
    disciplineIds.forEach(id => {
        if (!disciplineExists(id)) {
            errors.push(`La disciplina "${id}" no existe`);
        } else {
            const discipline = getDiscipline(id);
            if (discipline.enabled === false) {
                errors.push(`La disciplina "${id}" está deshabilitada`);
            }
        }
    });
    
    return {
        valid: errors.length === 0,
        errors
    };
}

