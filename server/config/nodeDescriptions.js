// ===== DESCRIPCIONES DE EDIFICIOS (SERVIDOR COMO AUTORIDAD) =====
// Nombres y descripciones de todos los edificios y unidades
// Estas descripciones se envían al cliente para prevenir manipulación

export const NODE_DESCRIPTIONS = {
    // Nodos base
    hq: {
        name: 'HQ (Cuartel General)',
        description: 'Base principal: gestiona recursos, vehículos y ambulancias.',
        details: 'Base principal que gestiona recursos, produce {maxVehicles} vehículos y cuenta con {maxAmbulances} ambulancia para evacuar heridos del frente.'
    },
    fob: {
        name: 'FOB (Base de Operaciones Avanzada)',
        description: 'Base avanzada que almacena suministros y permite enviarlos al frente.',
        details: 'Base avanzada que puede almacenar hasta {maxSupplies} suministros y gestiona {maxVehicles} vehículos para enviar recursos al frente.'
    },
    front: {
        name: 'Frente',
        description: 'Nodo de avance en el frente. Consume suministros para empujar. Asegúrate de que tenga más recursos que el frente enemigo.',
        details: 'Punto de avance en el frente. Consume suministros automáticamente para empujar hacia el territorio enemigo. Gana si tienes más suministros que el frente enemigo.'
    },
    
    // Edificios construibles
    antiDrone: {
        name: 'Anti-Dron',
        description: 'Sistema de defensa que intercepta drones enemigos, solo tiene un proyectil.',
        details: 'Sistema de defensa que intercepta drones enemigos a una distancia de {detectionRange} píxeles. Solo tiene un proyectil disponible.'
    },
    droneLauncher: {
        name: 'Lanzadera de Drones',
        description: 'Desbloquea el uso de drones bomba en la tienda.',
        details: 'Edificio esencial que desbloquea la capacidad de lanzar drones bomba desde la tienda. Sin este edificio no podrás usar drones bomba en combate.'
    },
    razorNet: {
        name: 'Red de Navajas',
        description: 'Sistema defensivo que ralentiza y daña unidades enemigas que pasan por su área.',
        details: 'Sistema defensivo que ralentiza y causa daño a todas las unidades enemigas que pasan por su área de efecto. Efectivo contra convoyes y vehículos enemigos.'
    },
    truckFactory: {
        name: 'Fábrica de Camiones',
        description: 'Aumenta la capacidad de carga de los camiones pesados y añade un vehículo adicional al HQ.',
        details: 'Añade {vehicleBonus} vehículo adicional al HQ y aumenta la capacidad de carga de los camiones pesados en {capacityBonus} unidades.'
    },
    factory: {
        name: 'Fábrica',
        description: 'Genera suministros automáticamente cada 3 segundos y los envía al HQ.',
        details: 'Fábrica industrial que genera {amount} suministros cada {interval} segundos y los envía automáticamente al HQ.'
    },
    engineerCenter: {
        name: 'Centro de Ingenieros',
        description: 'Pavimenta el camino del HQ a los FOBs, aumentando la velocidad de los convoyes pesados.',
        details: 'Pavimenta los caminos entre el HQ y los FOBs, aumentando la velocidad de los camiones pesados en un {speedPercent}%.'
    },
    nuclearPlant: {
        name: 'Planta Nuclear',
        description: 'Genera currency pasiva adicional por segundo.',
        details: 'Genera {incomeBonus}$ por segundo de forma pasiva. Cada planta adicional suma más income.'
    },
    machineNest: {
        name: 'Nido Trinchera',
        description: 'Cuando un frente aliado pasa por encima, entra en modo Mantener durante 10s.',
        details: 'Posición defensiva fortificada. Cuando un nodo de Frente aliado pasa por encima del nido (los centros coinciden), el frente entra automáticamente en modo "Mantener" durante {holdDuration} segundos, reduciendo su consumo de suministros.'
    },
    campaignHospital: {
        name: 'Hospital de Campaña',
        description: 'Permite enviar ambulancias para evacuar heridos del frente.',
        details: 'Permite desplegar ambulancias hasta una distancia de {actionRange} píxeles para evacuar heridos del frente. Gestiona {maxVehicles} ambulancia.'
    },
    intelRadio: {
        name: 'Radio de Inteligencia',
        description: 'Devuelve su precio inicial más un beneficio adicional.',
        details: 'Después de {investmentTime} segundos en tu lado del campo de batalla, se consume automáticamente y devuelve su coste ({cost}$) más un beneficio adicional de {investmentBonus}$.'
    },
    intelCenter: {
        name: 'Centro de Inteligencia',
        description: 'Desbloquea el comando en la tienda.',
        details: 'Edificio esencial que desbloquea las unidades de operaciones especiales: Comando Especial y Truck Assault. Sin este edificio no podrás usar estas unidades en combate.'
    },
    aerialBase: {
        name: 'Base Aérea',
        description: 'Permite el despliegue y recarga de helicópteros.',
        details: 'Base aérea que puede almacenar hasta {maxSupplies} suministros y permite el despliegue y recarga de helicópteros. Se autodestruye cuando se agotan sus suministros.'
    },
    vigilanceTower: {
        name: 'Torre de Vigilancia',
        description: 'Impide la aparicion de comandos y sabotajes enemigos en su area.',
        details: 'Torre defensiva que protege un área de {detectionRadius} píxeles, impidiendo que los enemigos desplieguen comandos especiales o realicen sabotajes dentro de su rango.'
    },
    trainStation: {
        name: 'Estación de Tren',
        description: 'Envía automáticamente suministros extra a los FOBs de forma periódica.',
        details: 'Cada {trainInterval} segundos llegan trenes del extranjero con recursos adicionales hacia los FOBs aliados, entregando {trainCargo} suministros por tren.'
    },
    droneWorkshop: {
        name: 'Taller de Drones',
        description: 'Abarata los drones bomba a cambio de suministros de un FOB aliado cercano.',
        details: 'Debe construirse en el área de una FOB al menos. Si tiene en su rango una FOB con al menos {requiredSupplies} suministros permite lanzar drones bomba por {discountPercent} a cambio de consumir {suppliesCost} suministros de dicho FOB.'
    },
    vehicleWorkshop: {
        name: 'Taller de Vehículos',
        description: 'Aumenta en +1 los vehículos máximos y disponibles en todos los FOBs cercanos. Mejora la velocidad de los camiones ligeros en +20 px/s.',
        details: 'Aumenta en {vehicleBonus} los vehículos máximos y disponibles en todos los FOBs dentro de su área de efecto. Además, mejora los camiones ligeros (truck) de los FOBs cercanos, aumentando su velocidad en +{speedBonus} px/s y actualizando su apariencia.'
    },
    physicStudies: {
        name: 'Estudios de Física',
        description: 'Mejora las centrales nucleares en +1 currency/segundo.',
        details: 'Mejora todas las centrales nucleares en +{nuclearPlantBonus} currency/segundo mientras haya al menos una universidad de "Estudios de física" en mesa. El efecto no se acumula con otras universidades.'
    },
    secretLaboratory: {
        name: 'Laboratorio Secreto',
        description: 'Mejora las centrales nucleares en +1 currency/segundo.',
        details: 'Mejora todas las centrales nucleares en +{nuclearPlantBonus} currency/segundo mientras haya al menos un laboratorio secreto en mesa. El efecto no se acumula con otros laboratorios secretos, pero SÍ se acumula con Estudios de Física (puedes tener +1 de laboratorio y +1 de estudios de física al mismo tiempo).'
    },
    trainingCamp: {
        name: 'Campo de Entrenamiento',
        description: 'Aplica Vigor a tus soldados, aumentando en +1 la ganancia por tomar territorio.',
        details: 'Campo de entrenamiento que aplica el efecto "Vigor" (trained) a todos tus frentes. Cada frente con este efecto obtiene +{currencyBonus} currency adicional por cada avance de territorio.'
    },
    armoredFactory: {
        name: 'Fábrica de Vehículos Artillados',
        description: 'Desbloquea tanques, vehículos artillados ligeros y artillería.',
        details: 'Instalación militar especializada en vehículos blindados. Mientras esté construida y operativa, desbloquea el uso de Tanque, Artillado Ligero y Artillería en la tienda. Coste: {cost}$.'
    },
    deadlyBuild: {
        name: 'Construcción Prohibida',
        description: 'Requiere Planta Nuclear, Laboratorio Secreto y Estudios de Física en mesa. Desbloquea "Destructor de mundos".',
        details: 'Esta construcción altamente clasificada requiere tener al menos una Planta Nuclear, un Laboratorio Secreto y Estudios de Física en mesa para poder construirse. Una vez construida, desbloquea el consumible "Destructor de mundos" en la tienda.'
    },
    servers: {
        name: 'Servidores',
        description: 'Aumenta la generación pasiva de currency en +0.5 por segundo.',
        details: 'Centro de cómputo que aumenta la generación pasiva de currency en +{incomeBonus}$ por segundo. Se suma a la generación base.'
    },
    telecomsTower: {
        name: 'Torre de Telecomunicaciones',
        description: 'Genera +2$/s por cada Radio Intel aliada consumida en la partida. No acumulable.',
        details: 'Torre de comunicaciones que genera {baseIncomeBonus}$/s de base, incrementándose en +{bonusPerIntelRadio}$/s por cada Radio de Inteligencia aliada que haya completado su inversión durante la partida. Múltiples torres no acumulan el efecto.'
    },
    
    // Consumibles/Proyectiles
    drone: {
        name: 'Dron Bomba',
        description: 'Destruye un objetivo enemigo. Requiere tener una lanzadera en el campo.',
        details: 'Consumible que destruye un edificio enemigo seleccionado. Coste: {cost}$. Puede ser interceptado por Anti-Drones enemigos. Requiere tener una Lanzadera de Drones construida para poder usarlo.'
    },
    sniperStrike: {
        name: 'Ataque de Francotirador',
        description: 'Aplica efecto "herido" a un frente enemigo o elimina una enemigo disparable.',
        details: 'Ataque preciso que puede aplicarse a frentes enemigos para causarles el efecto "herido" (dobla su consumo de suministros) o eliminar comandos especiales, truck assaults o camera drones enemigos. Coste: {cost}$.'
    },
    fobSabotage: {
        name: 'Sabotaje FOB',
        description: 'Ralentiza los convoyes que salen de un FOB enemigo durante un tiempo.',
        details: 'Sabotaje que se aplica sobre un FOB enemigo, ralentizando todos los convoyes que salen de ese FOB durante un tiempo. Coste: {cost}$.'
    },
    specopsCommando: {
        name: 'Comando Especial',
        description: 'Deshabilita los edificios enemigos dentro de su área de efecto. Requiere el Centro de Inteligencia.',
        details: 'Unidad especial que se despliega en territorio enemigo. Deshabilita todos los edificios enemigos dentro de un radio de {detectionRadius} píxeles. Puede ser eliminado por ataques de francotirador. Requiere Centro de Inteligencia. Coste: {cost}$.'
    },
    truckAssault: {
        name: 'Truck Assault',
        description: 'Ralentiza los vehículos enemigos cercanos. Requiere el Centro de Inteligencia.',
        details: 'Unidad especial que se despliega en territorio enemigo. Ralentiza todos los vehículos enemigos dentro de un radio de {detectionRadius} píxeles en un 25%. Requiere Centro de Inteligencia. Coste: {cost}$.'
    },
    tank: {
        name: 'Tanque',
        description: 'Unidad blindada que destruye edificios enemigos. No puede atacar FOBs ni HQs.',
        details: 'Unidad blindada pesada que destruye edificios enemigos seleccionados. Puede atacar edificios pero NO puede atacar FOBs ni HQs. Coste: {cost}$.'
    },
    lightVehicle: {
        name: 'Artillado Ligero',
        description: 'Vehículo ligero que provoca rotura en edificios enemigos. No puede atacar FOBs ni HQs.',
        details: 'Vehículo de combate ligero que aplica el estado "Roto" a edificios enemigos seleccionados, deshabilitándolos hasta que sean reparados. Puede atacar edificios pero NO puede atacar FOBs ni HQs. Coste: {cost}$.'
    },
    artillery: {
        name: 'Artillería',
        description: 'Bombardeo de artillería que causa rotura a todos los edificios enemigos en el área seleccionada. No afecta a FOBs ni HQs.',
        details: 'Bombardeo de artillería de área que aplica el estado "Roto" a todos los edificios enemigos dentro del área de efecto. La artillería no afecta a FOBs ni HQs. Coste: {cost}$.'
    },
    cameraDrone: {
        name: 'Dron Cámara',
        description: 'Otorga currency por cada camión ligero enemigo detectado. Requiere lanzadera de drones.',
        details: 'Dron de vigilancia que se despliega en territorio enemigo. Detecta camiones ligeros en un radio de {detectionRadius} píxeles, otorgando {currencyReward}$ por cada detección. Permite construir edificios en territorio enemigo dentro de un radio de {buildRadius} píxeles. Puede ser eliminado por ataques de francotirador. Requiere Lanzadera de Drones. Coste: {cost}$.'
    },
    worldDestroyer: {
        name: 'Destructor de Mundos',
        description: 'Arma definitiva que siembra el caos en el campo de batalla. Requiere Construcción Prohibida.',
        details: 'Arma de destrucción masiva que se activa tras {countdownDuration} segundos. Destruye todos los edificios enemigos en mesa (excepto HQ y FOBs), vacía todos los suministros de los FOBs en el campo de batalla y vacía todos los suministros de los nodos de Frente. Requiere tener una Construcción Prohibida construida. Coste: {cost}$.'
    }
};

