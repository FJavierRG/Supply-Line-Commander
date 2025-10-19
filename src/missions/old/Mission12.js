// ===== MISIÓN 12: MAESTRO DE LA LOGÍSTICA =====
import { Mission } from './Mission.js';

export class Mission12 extends Mission {
    constructor() {
        super();
        
        // Metadata
        this.number = 12;
        this.name = 'Maestro de la Logística';
        this.description = 'Domina 4 frentes dispersos con rutas óptimas bajo presión constante.';
        this.objectives = '✓ Mantén 4 frentes abastecidos<br>✓ Demuestra maestría logística<br>✓ Duración: 160 segundos';
        
        // Configuración de tiempo
        this.duration = 160;
        
        // 2 FOBs + 4 Frentes (más dispersos)
        this.nodesConfig = {
            fobs: [
                {
                    xPercent: 0.40,
                    yPercent: 0.30
                },
                {
                    xPercent: 0.40,
                    yPercent: 0.70
                }
            ],
            fronts: [
                {
                    xPercent: 0.85,
                    yPercent: 0.15
                },
                {
                    xPercent: 0.85,
                    yPercent: 0.38
                },
                {
                    xPercent: 0.85,
                    yPercent: 0.62
                },
                {
                    xPercent: 0.85,
                    yPercent: 0.85
                }
            ]
        };
    }
}
