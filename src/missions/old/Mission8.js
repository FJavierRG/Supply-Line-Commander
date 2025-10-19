// ===== MISIÓN 8: TRES ES MULTITUD =====
import { Mission } from './Mission.js';

export class Mission8 extends Mission {
    constructor() {
        super();
        
        // Metadata
        this.number = 8;
        this.name = 'Tres es Multitud';
        this.description = 'Incremento de complejidad: Ahora debes gestionar 3 frentes simultáneos.';
        this.objectives = '✓ Mantén 3 frentes abastecidos<br>✓ Atiende emergencias médicas<br>✓ Duración: 140 segundos';
        
        // Configuración de tiempo
        this.duration = 140;
        
        // 1 FOB + 3 Frentes
        this.nodesConfig = {
            fobs: [
                {
                    xPercent: 0.50,
                    yPercent: 0.50
                }
            ],
            fronts: [
                {
                    xPercent: 0.80,
                    yPercent: 0.25
                },
                {
                    xPercent: 0.80,
                    yPercent: 0.50
                },
                {
                    xPercent: 0.80,
                    yPercent: 0.75
                }
            ]
        };
    }
}
