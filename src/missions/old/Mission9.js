// ===== MISIÓN 9: RED DE SUMINISTRO =====
import { Mission } from './Mission.js';

export class Mission9 extends Mission {
    constructor() {
        super();
        
        // Metadata
        this.number = 9;
        this.name = 'Red de Suministro';
        this.description = 'Añade un FOB adicional para mayor flexibilidad logística.';
        this.objectives = '✓ Mantén 3 frentes abastecidos<br>✓ Gestiona 2 FOBs<br>✓ Duración: 145 segundos';
        
        // Configuración de tiempo
        this.duration = 145;
        
        // 2 FOBs + 3 Frentes
        this.nodesConfig = {
            fobs: [
                {
                    xPercent: 0.45,
                    yPercent: 0.30
                },
                {
                    xPercent: 0.45,
                    yPercent: 0.70
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
