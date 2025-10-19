// ===== MISIÓN 4: TEATRO COMPLEJO =====
import { Mission } from './Mission.js';

export class Mission4 extends Mission {
    constructor() {
        super();
        
        // Metadata
        this.number = 4;
        this.name = 'Teatro Complejo';
        this.description = 'Teatro de operaciones complejo. Múltiples FOBs y frentes. Eficiencia logística crítica.';
        this.objectives = '✓ Mantén 3 frentes abastecidos<br>✓ Gestiona 2 FOBs<br>✓ Duración: 90 segundos';
        
        // Configuración de tiempo
        this.duration = 90;
        
        // Configuración de nodos (Sistema Cartesiano: 0,0 = inferior izquierda, 0.5, 0.5 = centro del mapa)
        // 2 FOBs, 3 Frentes
        this.nodesConfig = {
            fobs: [
                {
                    xPercent: 0.4,  // Centro-izquierda
                    yPercent: 0.7   // Arriba
                },
                {
                    xPercent: 0.4,  // Centro-izquierda
                    yPercent: 0.4   // Abajo
                }
            ],
            fronts: [
                {
                    xPercent: 0.61, // Derecha
                    yPercent: 0.75  // Arriba
                },
                {
                    xPercent: 0.55, // Derecha
                    yPercent: 0.5   // Centro
                },
                {
                    xPercent: 0.58, // Derecha
                    yPercent: 0.25  // Abajo
                }
            ]
        };
    }
}
