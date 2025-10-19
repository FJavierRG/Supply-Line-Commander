// ===== MISIÓN 10: COORDINACIÓN COMPLEJA =====
import { Mission } from './Mission.js';

export class Mission10 extends Mission {
    constructor() {
        super();
        
        // Metadata
        this.number = 10;
        this.name = 'Coordinación Compleja';
        this.description = 'Coordina 2 FOBs con 3 frentes bajo presión médica constante.';
        this.objectives = '✓ Mantén 3 frentes abastecidos<br>✓ Coordina 2 FOBs<br>✓ Duración: 150 segundos';
        
        // Configuración de tiempo
        this.duration = 150;
        
        // 2 FOBs + 3 Frentes (más espaciados)
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
                    yPercent: 0.20
                },
                {
                    xPercent: 0.85,
                    yPercent: 0.50
                },
                {
                    xPercent: 0.85,
                    yPercent: 0.80
                }
            ]
        };
    }
}
