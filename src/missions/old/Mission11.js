// ===== MISIÓN 11: CUATRO FRENTES =====
import { Mission } from './Mission.js';

export class Mission11 extends Mission {
    constructor() {
        super();
        
        // Metadata
        this.number = 11;
        this.name = 'Cuatro Frentes';
        this.description = 'Incremento de presión: Ahora son 4 frentes simultáneos con emergencias constantes.';
        this.objectives = '✓ Mantén 4 frentes abastecidos<br>✓ Atiende emergencias constantes<br>✓ Duración: 155 segundos';
        
        // Configuración de tiempo
        this.duration = 155;
        
        // 2 FOBs + 4 Frentes
        this.nodesConfig = {
            fobs: [
                {
                    xPercent: 0.45,
                    yPercent: 0.35
                },
                {
                    xPercent: 0.45,
                    yPercent: 0.65
                }
            ],
            fronts: [
                {
                    xPercent: 0.80,
                    yPercent: 0.20
                },
                {
                    xPercent: 0.80,
                    yPercent: 0.40
                },
                {
                    xPercent: 0.80,
                    yPercent: 0.60
                },
                {
                    xPercent: 0.80,
                    yPercent: 0.80
                }
            ]
        };
    }
}
