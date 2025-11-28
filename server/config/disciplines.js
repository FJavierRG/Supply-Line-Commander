// ===== CONFIGURACIÓN DE DISCIPLINAS =====
// Define todas las disciplinas disponibles en el juego
// Las disciplinas son modificadores estratégicos temporales que afectan múltiples sistemas

/**
 * Estructura de una disciplina:
 * {
 *   id: string,              // Identificador único
 *   name: string,            // Nombre para mostrar
 *   description: string,     // Descripción de efectos (ventajas y desventajas)
 *   icon: string,            // Nombre del archivo de sprite (en assets/sprites/vehicles/)
 *   cost: number,            // Coste para activar (0 = gratis)
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
        icon: 'assets/sprites/ui/Disciplines/vehicle.png', // Sprite del vehículo
        cost: 0,             // Activación gratuita
        duration: 60,        // 1 minuto activa
        cooldown: 15,         // Sin cooldown - puedes activar otra inmediatamente
        enabled: true,
        
        effects: {
            convoy: {
                speedMultipliers: {
                    truck: 1.5,         // Camiones ligeros: +50%
                    heavy_truck: 1.25,  // Camiones pesados: +25%
                    train: 1.1,         // Trenes: +10%
                    default: 1.0        // Otros vehículos: sin bonus
                },
                deploymentCost: 2       // Coste de 1 currency al enviar vehículo
            }
        }
    },
    
    // ============================================================
    // INFRAESTRUCTURAS MEJORADAS
    // ============================================================
    'improved_infrastructure': {
        id: 'improved_infrastructure',
        name: 'Infraestructuras Mejoradas',
        icon: 'assets/sprites/ui/Disciplines/production_focus2.png', // Sprite de producción
        cost: 0,             // Activación gratuita
        duration: 60,        // 1 minuto activa
        cooldown: 50,         // Sin cooldown - puedes activar otra inmediatamente
        enabled: true,
        
        effects: {
            factory: {
                currencyPerDelivery: 3,    // +1 currency por cada paquete entregado al HQ
                supplyPenalty: -3          // -2 suministros por tick de fábrica
            }
        }
    },
    
    // ============================================================
    // COMBATE DEFENSIVO
    // ============================================================
    'defensive_combat': {
        id: 'defensive_combat',
        name: 'Combate Defensivo',
        icon: 'assets/sprites/ui/Disciplines/defense_focus.png', // Sprite de defensa
        cost: 0,             // Activación gratuita
        duration: 60,        // 1 minuto activa
        cooldown: 20,         // Sin cooldown - puedes activar otra inmediatamente
        enabled: true,
        
        effects: {
            frontMode: {
                targetMode: 'hold',              // Solo afecta cuando el frente está en modo "Mantener"
                consumeMultiplierBonus: -0.20,   // -25% adicional 
                currencyPerSecondPerFront: 1     // +1 currency/segundo por cada frente en modo hold
            }
        }
    },
    
    // ============================================================
    // ENDEUDAMIENTO
    // ============================================================
    'endeudamiento': {
        id: 'endeudamiento',
        name: 'Endeudamiento',
        icon: 'assets/sprites/ui/Disciplines/endeudamiento2.png',
        cost: 0,
        duration: 120,
        cooldown: 60,
        enabled: true,

        effects: {
            economy: {
                allowNegativeCurrency: true,
                minCurrency: -150
            }
        }
    }

    // 🔧 Más disciplinas se añadirán aquí
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
 * 🆕 NUEVO: Genera la descripción dinámica de una disciplina desde sus efectos
 * @param {string} disciplineId - ID de la disciplina
 * @returns {string} - Descripción generada dinámicamente
 */
export function getDisciplineDescription(disciplineId) {
    const discipline = getDiscipline(disciplineId);
    if (!discipline) return '';
    
    // Generar descripción según los efectos de cada disciplina
    switch (disciplineId) {
        case 'motorized_industry': {
            const effects = discipline.effects.convoy;
            const multipliers = effects.speedMultipliers;
            const cost = effects.deploymentCost;
            
            const truckBonus = Math.round((multipliers.truck - 1) * 100);
            const heavyTruckBonus = Math.round((multipliers.heavy_truck - 1) * 100);
            const trainBonus = Math.round((multipliers.train - 1) * 100);
            
            return `Aumenta la velocidad: camiones ligeros +${truckBonus}%, camiones pesados +${heavyTruckBonus}%, trenes +${trainBonus}%. Enviar un vehículo cuesta ${cost} currency.`;
        }
        
        case 'improved_infrastructure': {
            const effects = discipline.effects.factory;
            const currencyBonus = effects.currencyPerDelivery;
            const supplyPenalty = Math.abs(effects.supplyPenalty);
            return `Por cada paquete que una fábrica entrega al HQ genera +${currencyBonus} currency. Los suministros de las fábricas disminuyen en -${supplyPenalty}.`;
        }
        
        case 'defensive_combat': {
            const effects = discipline.effects.frontMode;
            const consumeReduction = Math.abs(Math.round(effects.consumeMultiplierBonus * 100));
            const currencyPerFront = effects.currencyPerSecondPerFront;
            return `En modo Mantener: el gasto de suministros disminuye un ${consumeReduction}% adicional y otorga +${currencyPerFront} currency/segundo por frente.`;
        }

        case 'endeudamiento': {
            const effects = discipline.effects.economy;
            const cap = effects.minCurrency ?? -150;
            return `Permite gastar currency por debajo de 0 hasta ${cap}. Ideal para inversiones agresivas durante la ventana activa.`;
        }
        
        // 🔧 Más disciplinas se añadirán aquí con su lógica de descripción
        
        default:
            return 'Sin descripción disponible.';
    }
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
    
    if (disciplineIds.length > 2) {
        errors.push('Solo se pueden equipar 2 disciplinas por mazo');
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

