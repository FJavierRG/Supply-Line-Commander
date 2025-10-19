// ===== MISIÓN 14: CINCO FRENTES =====
import { Mission } from './Mission.js';

export class Mission14 extends Mission {
    constructor() {
        super();
        
        // Metadata
        this.number = 14;
        this.name = 'Cinco Frentes';
        this.description = 'El reto definitivo: 5 frentes simultáneos con emergencias médicas constantes.';
        this.objectives = '✓ Mantén 5 frentes abastecidos<br>✓ Gestión perfecta de emergencias<br>✓ Duración: 170 segundos';
        
        // Configuración de tiempo
        this.duration = 170;
        
        // 3 FOBs + 5 Frentes
        this.nodesConfig = {
            fobs: [
                {
                    xPercent: 0.38,
                    yPercent: 0.25
                },
                {
                    xPercent: 0.38,
                    yPercent: 0.50
                },
                {
                    xPercent: 0.38,
                    yPercent: 0.75
                }
            ],
            fronts: [
                {
                    xPercent: 0.80,
                    yPercent: 0.15
                },
                {
                    xPercent: 0.80,
                    yPercent: 0.32
                },
                {
                    xPercent: 0.80,
                    yPercent: 0.50
                },
                {
                    xPercent: 0.80,
                    yPercent: 0.68
                },
                {
                    xPercent: 0.80,
                    yPercent: 0.85
                }
            ]
        };
    }
}
