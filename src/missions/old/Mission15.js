// ===== MISIÓN 15: OPERACIÓN FINAL =====
import { Mission } from './Mission.js';

export class Mission15 extends Mission {
    constructor() {
        super();
        
        // Metadata
        this.number = 15;
        this.name = 'Operación Final';
        this.description = 'La batalla definitiva: 5 frentes extremadamente dispersos bajo máxima presión médica.';
        this.objectives = '✓ Mantén 5 frentes abastecidos<br>✓ Sobrevive al caos total<br>✓ Duración: 180 segundos';
        
        // Configuración de tiempo
        this.duration = 180;
        
        // 3 FOBs + 5 Frentes (máxima dispersión)
        this.nodesConfig = {
            fobs: [
                {
                    xPercent: 0.35,
                    yPercent: 0.20
                },
                {
                    xPercent: 0.35,
                    yPercent: 0.50
                },
                {
                    xPercent: 0.35,
                    yPercent: 0.80
                }
            ],
            fronts: [
                {
                    xPercent: 0.85,
                    yPercent: 0.12
                },
                {
                    xPercent: 0.85,
                    yPercent: 0.30
                },
                {
                    xPercent: 0.85,
                    yPercent: 0.50
                },
                {
                    xPercent: 0.85,
                    yPercent: 0.70
                },
                {
                    xPercent: 0.85,
                    yPercent: 0.88
                }
            ]
        };
    }
}
