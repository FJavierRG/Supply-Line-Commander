// ===== DESCRIPCIONES DE EDIFICIOS (SERVIDOR COMO AUTORIDAD) =====
// Nombres y descripciones de todos los edificios y unidades
// Estas descripciones se envían al cliente para prevenir manipulación

export const NODE_DESCRIPTIONS = {
    // Nodos base
    hq: {
        name: 'HQ (Cuartel General)',
        description: 'Base principal: gestiona recursos, vehículos y ambulancias.'
    },
    fob: {
        name: 'FOB (Base de Operaciones Avanzada)',
        description: 'Base avanzada que almacena suministros y permite enviarlos al frente.'
    },
    front: {
        name: 'Frente',
        description: 'Nodo de avance en el frente. Consume suministros para empujar. Asegúrate de que tenga más recursos que el frente enemigo.'
    },
    
    // Edificios construibles
    antiDrone: {
        name: 'Anti-Dron',
        description: 'Sistema de defensa que intercepta drones enemigos, solo tiene un proyectil.'
    },
    droneLauncher: {
        name: 'Lanzadera de Drones',
        description: 'Desbloquea el uso de drones bomba en la tienda.'
    },
    razorNet: {
        name: 'Red de Navajas',
        description: 'Sistema defensivo que ralentiza y daña unidades enemigas que pasan por su área.'
    },
    truckFactory: {
        name: 'Fábrica de Camiones',
        description: 'Aumenta la capacidad de carga de los camiones pesados y añade un vehículo adicional al HQ.'
    },
    engineerCenter: {
        name: 'Centro de Ingenieros',
        description: 'Pavimenta el camino del HQ a los FOBs, aumentando la velocidad de los convoyes pesados.'
    },
    nuclearPlant: {
        name: 'Planta Nuclear',
        description: 'Genera currency pasiva adicional por segundo.'
    },
    machineNest: {
        name: 'Nido de Máquinas',
        description: 'Sistema defensivo automático que ataca unidades enemigas cercanas.'
    },
    campaignHospital: {
        name: 'Hospital de Campaña',
        description: 'Permite enviar ambulancias para evacuar heridos del frente.'
    },
    intelRadio: {
        name: 'Radio de Inteligencia',
        description: 'Pasado un tiempo en tu lado del campo de batalla se consume y devuelve su coste más un beneficio.'
    },
    intelCenter: {
        name: 'Centro de Inteligencia',
        description: 'Desbloquea el comando en la tienda.'
    },
    aerialBase: {
        name: 'Base Aérea',
        description: 'Permite el despliegue y recarga de helicópteros.'
    },
    vigilanceTower: {
        name: 'Torre de Vigilancia',
        description: 'Impide la aparicion de comandos y sabotajes enemigos en su area.'
    },
    trainStation: {
        name: 'Estación de Tren',
        description: 'Envía trenes automáticamente con suministros a los FOBs de forma periódica.'
    },
    
    // Consumibles/Proyectiles
    drone: {
        name: 'Dron Bomba',
        description: 'Destruye un objetivo enemigo. Puede ser interceptado por Anti-Drones. Requiere tener una lanzadera en el campo.'
    },
    sniperStrike: {
        name: 'Ataque de Francotirador',
        description: 'Aplica efecto "herido" a un frente enemigo o elimina un comando enemigo.'
    },
    fobSabotage: {
        name: 'Sabotaje FOB',
        description: 'Ralentiza los convoyes que salen de un FOB enemigo durante un tiempo.'
    },
    specopsCommando: {
        name: 'Comando Especial',
        description: 'Despliega un comando que deshabilita los edificios enemigos dentro de su área de efecto.'
    },
    tank: {
        name: 'Tanque',
        description: 'Unidad blindada que destruye edificios enemigos. No puede atacar FOBs ni HQs.'
    }
};

