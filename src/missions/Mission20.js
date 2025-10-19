// ===== MISIÓN 20: CUSTOM =====
import { Mission } from './Mission.js';

export class Mission20 extends Mission {
    constructor() {
        super();
        
        // Metadata
        this.number = 20;
        this.name = 'Misión Custom';
        this.description = 'Descripción de la misión';
        this.objectives = '✓ Objetivo 1<br>✓ Objetivo 2';
        
        // Configuración de tiempo
        this.duration = 520;
        
        // Configuración de nodos (SIMÉTRICA - Espejo perfecto)
        this.nodesConfig = {
            // FUERZAS ALIADAS
            fobs: [
                { xPercent: 0.208, yPercent: 0.722 },
                { xPercent: 0.208, yPercent: 0.259 }
            ],
            fronts: [
                { xPercent: 0.35, yPercent: 0.722 },
                { xPercent: 0.35, yPercent: 0.259 }
            ],
            
            // FUERZAS ENEMIGAS (ESPEJO)
            enemyHQ: { xPercent: 0.94, yPercent: 0.5 },  // Espejo del HQ aliado (0.03)
            enemyFobs: [
                { xPercent: 0.792, yPercent: 0.722 },  // Espejo de 0.208
                { xPercent: 0.792, yPercent: 0.259 }
            ],
            enemyFronts: [
                { xPercent: 0.65, yPercent: 0.722 },  // Espejo de 0.286
                { xPercent: 0.65, yPercent: 0.259 }
            ]
        };
    }
}


