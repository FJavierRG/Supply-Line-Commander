// ===== MISIÓN 1: ENTRENAMIENTO =====
import { Mission } from './Mission.js';

export class Mission1 extends Mission {
    constructor() {
        super();
        
        // Metadata
        this.number = 1;
        this.name = 'Entrenamiento Básico';
        this.description = 'Bienvenido, comandante. Misión de entrenamiento: establece una ruta de suministros desde la base principal (HQ) al puesto avanzado (FOB).';
        this.objectives = '✓ Llena la FOB con suministros (80/80)<br>✓ Aprende los controles básicos';
        
        // Configuración de tiempo (sin límite de tiempo para tutorial)
        this.duration = null;
        
        // Configuración de nodos (Sistema Cartesiano: 0,0 = inferior izquierda)
        // 1 FOB, 0 Frentes
        this.nodesConfig = {
            fobs: [
                {
                    xPercent: 0.5,  // Centro horizontal
                    yPercent: 0.5   // Centro vertical
                }
            ],
            fronts: []
        };
    }
}
