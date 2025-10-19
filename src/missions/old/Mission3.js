// ===== MISIÓN 3: OPERACIÓN EXPANDIDA =====
import { Mission } from './Mission.js';

export class Mission3 extends Mission {
    constructor() {
        super();
        
        // Metadata
        this.number = 3;
        this.name = 'Operación Expandida';
        this.description = 'Operación expandida. Múltiples frentes activos. Gestiona tus recursos sabiamente.';
        this.objectives = '✓ Mantén todos los frentes vivos<br>✓ Gestiona prioridades<br>✓ Duración: 62 segundos';
        
        // Configuración de tiempo
        this.duration = 55;
        
        // Configuración de nodos con control directo
        // Sistema cartesiano: (0,0) = esquina inferior izquierda
        // 2 FOBs, 2 Frentes
        this.nodesConfig = {
            fobs: [
                {
                    xPercent: 0.4,  // 40% del ancho → centro-izquierda
                    yPercent: 0.4  // 65% de altura desde abajo → arriba
                }
            ],
            fronts: [
                {
                    xPercent: 0.6, // 75% del ancho → derecha
                    yPercent: 0.3  // 65% de altura desde abajo → arriba
                },
                {
                    xPercent: 0.6, // 75% del ancho → derecha
                    yPercent: 0.7  // 35% de altura desde abajo → abajo
                }
            ]
        };
    }
}
