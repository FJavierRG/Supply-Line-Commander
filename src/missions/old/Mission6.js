// ===== MISIÓN 6: PRIMERAS BAJAS (TUTORIAL MÉDICO) =====
import { Mission } from './Mission.js';

export class Mission6 extends Mission {
    constructor() {
        super();
        
        // Metadata
        this.number = 6;
        this.name = 'Primeras Bajas';
        this.description = '⚕️ Sistema médico activado. Los frentes pueden sufrir emergencias médicas que requieren atención inmediata.';
        this.objectives = '✓ Mantén 2 frentes abastecidos<br>✓ Atiende emergencias médicas<br>✓ Duración: 120 segundos';
        
        // Configuración de tiempo
        this.duration = 60;
        
        // Configuración SIMPLE: 1 FOB + 2 Frentes (como nivel 3)
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
                    yPercent: 0.35
                },
                {
                    xPercent: 0.80,
                    yPercent: 0.65
                }
            ]
        };
    }
}
