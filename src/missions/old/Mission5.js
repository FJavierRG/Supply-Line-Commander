// ===== MISIÓN 5: OPERACIÓN FINAL =====
import { Mission } from './Mission.js';

export class Mission5 extends Mission {
    constructor() {
        super();
        
        // Metadata
        this.number = 5;
        this.name = 'Operación Final';
        this.description = 'Operación final. Máxima complejidad logística. Todo lo que aprendiste será puesto a prueba.';
        this.objectives = '✓ Mantén 4 frentes abastecidos<br>✓ Gestiona 3 FOBs<br>✓ Duración: 120 segundos';
        
        // Configuración de tiempo
        this.duration = 90;
        
        // Configuración de nodos (Sistema Cartesiano: 0,0 = inferior izquierda)
        // 3 FOBs, 4 Frentes
        this.nodesConfig = {
            fobs: [
                {
                    xPercent: 0.4,  // Centro-izquierda
                    yPercent: 0.75  // Arriba
                },
                {
                    xPercent: 0.4,  // Centro-izquierda
                    yPercent: 0.5   // Centro
                },
                {
                    xPercent: 0.4,  // Centro-izquierda
                    yPercent: 0.25  // Abajo
                }
            ],
            fronts: [
                {
                    xPercent: 0.7,  // Derecha
                    yPercent: 0.8   // Muy arriba
                },
                {
                    xPercent: 0.7,  // Derecha
                    yPercent: 0.6   // Arriba-centro
                },
                {
                    xPercent: 0.7,  // Derecha
                    yPercent: 0.4   // Abajo-centro
                },
                {
                    xPercent: 0.7,  // Derecha
                    yPercent: 0.2   // Muy abajo
                }
            ]
        };
    }
}
