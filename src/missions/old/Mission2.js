// ===== MISIÓN 2: PRIMERA OPERACIÓN =====
import { Mission } from './Mission.js';

export class Mission2 extends Mission {
    constructor() {
        super();
        
        // Metadata
        this.number = 2;
        this.name = 'Primera Operación';
        this.description = 'Primera operación real. Ahora tienes un frente de combate que consume recursos. No dejes que se quede sin suministros.';
        this.objectives = '✓ Mantén el frente abastecido<br>✓ Cadena: HQ → FOB → FRENTE<br>✓ Duración: 40 segundos';
        
        // Configuración de tiempo
        this.duration = 37;
        
        // Configuración de nodos (Sistema Cartesiano: 0,0 = inferior izquierda)
        // 1 FOB, 1 Frente
        this.nodesConfig = {
            fobs: [
                {
                    xPercent: 0.4,  // Centro-izquierda
                    yPercent: 0.5   // Centro vertical
                }
            ],
            fronts: [
                {
                    xPercent: 0.75, // Derecha
                    yPercent: 0.5   // Centro vertical
                }
            ]
        };
    }
}
