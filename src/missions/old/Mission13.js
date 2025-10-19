// ===== MISIÓN 13: TRIPLE AMENAZA =====
import { Mission } from './Mission.js';

export class Mission13 extends Mission {
    constructor() {
        super();
        
        // Metadata
        this.number = 13;
        this.name = 'Triple Amenaza';
        this.description = 'Nueva complejidad: Gestiona 3 FOBs por primera vez con 4 frentes activos.';
        this.objectives = '✓ Mantén 4 frentes abastecidos<br>✓ Coordina 3 FOBs<br>✓ Duración: 165 segundos';
        
        // Configuración de tiempo
        this.duration = 165;
        
        // 3 FOBs + 4 Frentes
        this.nodesConfig = {
            fobs: [
                {
                    xPercent: 0.40,
                    yPercent: 0.25
                },
                {
                    xPercent: 0.40,
                    yPercent: 0.50
                },
                {
                    xPercent: 0.40,
                    yPercent: 0.75
                }
            ],
            fronts: [
                {
                    xPercent: 0.80,
                    yPercent: 0.18
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
                    yPercent: 0.82
                }
            ]
        };
    }
}
