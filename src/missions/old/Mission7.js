// ===== MISIÓN 7: DOBLE FRENTE =====
import { Mission } from './Mission.js';

export class Mission7 extends Mission {
    constructor() {
        super();
        
        // Metadata
        this.number = 7;
        this.name = 'Doble Frente';
        this.description = 'Las emergencias médicas pueden aparecer en múltiples frentes simultáneamente.';
        this.objectives = '✓ Mantén 2 frentes abastecidos<br>✓ Gestiona múltiples emergencias<br>✓ Duración: 130 segundos';
        
        // Configuración de tiempo
        this.duration = 130;
        
        // 1 FOB + 2 Frentes (más separados)
        this.nodesConfig = {
            fobs: [
                {
                    xPercent: 0.50,
                    yPercent: 0.50
                }
            ],
            fronts: [
                {
                    xPercent: 0.85,
                    yPercent: 0.30
                },
                {
                    xPercent: 0.85,
                    yPercent: 0.70
                },
                {
                    xPercent: 0.7,
                    yPercent: 0.5
                }
            ]
        };
    }
}
