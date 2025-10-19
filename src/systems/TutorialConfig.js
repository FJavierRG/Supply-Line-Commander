// ===== CONFIGURACIÓN DEL TUTORIAL =====

import { GAME_CONFIG } from '../config/constants.js';

// Calcular posiciones absolutas basadas en el tamaño del juego
const BASE_WIDTH = GAME_CONFIG.BASE_WIDTH;  // 1920
const BASE_HEIGHT = GAME_CONFIG.BASE_HEIGHT; // 1080

/**
 * Mapa simplificado para el tutorial
 * Estructura similar a Mission20 pero con 1 FOB y 1 Frente por lado, alineados horizontalmente
 */
export const TUTORIAL_MAP = {
    // Nodos iniciales del tutorial - SIN FOB aliado (el jugador lo construirá)
    nodes: [
        // === LADO ALIADO ===
        {
            type: 'hq',
            x: BASE_WIDTH * 0.06,  // HQ aliado a la izquierda (115.2)
            y: BASE_HEIGHT * 0.5,  // Centrado verticalmente (540)
            team: 'ally'
        },
        {
            type: 'front',
            x: BASE_WIDTH * 0.35,  // Frente aliado (672)
            y: BASE_HEIGHT * 0.5,  // Alineado con HQ (540)
            team: 'ally',
            supplies: 15 // Empieza con poca munición para que vea el problema
        },
        
        // === LADO ENEMIGO ===
        {
            type: 'hq',
            x: BASE_WIDTH * 0.94,  // HQ enemigo a la derecha (1804.8)
            y: BASE_HEIGHT * 0.5,  // Centrado verticalmente (540)
            team: 'player2'
        },
        {
            type: 'fob',
            x: BASE_WIDTH * 0.792, // FOB enemigo (1520.64)
            y: BASE_HEIGHT * 0.5,  // Alineado con HQ (540)
            team: 'player2',
            supplies: 50
        },
        {
            type: 'front',
            x: BASE_WIDTH * 0.65,  // Frente enemigo (1248)
            y: BASE_HEIGHT * 0.5,  // Alineado con HQ (540)
            team: 'player2',
            supplies: 50 // El enemigo tiene más munición para que no avance
        }
    ],
    
    // Configuración especial para el tutorial
    config: {
        disableEnemyAI: true, // La IA no actúa durante el tutorial
        disableMedicalEmergencies: true, // Sin emergencias random
        startingCurrency: 250, // Justo para construir FOB (200) + margen
        frontAdvanceSpeed: 0.5, // Muy lento para que vea el efecto
        convoySpeed: 2.5 // Más rápido para no aburrir
    }
};

/**
 * Pasos del tutorial con sus textos y permisos
 */
export const TUTORIAL_STEPS = [
    // === PASO 1: INTRODUCCIÓN ===
    {
        phase: 1,
        step: 1,
        title: "Bienvenido, Comandante",
        text: `
            <p>Tu trabajo aquí es mantener vivo el <strong>frente de batalla</strong>.</p>
            <p>Los soldados lucharán solos, pero <strong>tú controlas los suministros</strong>.</p>
            <p><em>Sin munición, el frente retrocede. Con munición, avanza.</em> Sencillo.</p>
        `,
        target: null,
        spotlightRadius: 0,
        requiresAction: false,
        permissions: {
            // Sin permisos, solo lectura
        }
    },
    
    // === PASO 2: MOSTRAR EL FRENTE (estático) ===
    {
        phase: 1,
        step: 2,
        title: "Suministros",
        text: `
            <h3>Frente sin Munición</h3>
            <p>Este es tu <strong>frente de batalla</strong>. Observa la barra de abajo.</p>
            <p>Consume <strong>munición constantemente</strong> para avanzar. Cuando se agote, retrocederá. Lo sabrás porque escucharás a los soldados quejarse.</p>
            `,
        spotlight: true, // Activar oscurecimiento
        spotlightTarget: 'front', // Tipo de nodo a iluminar
        spotlightRadius: 100, // Radio del spotlight
        spotlightOffsetX: -20, // Ajuste fino X (positivo = derecha, negativo = izquierda)
        spotlightOffsetY: -50, // Ajuste fino Y (positivo = abajo, negativo = arriba)
        requiresAction: false,
        permissions: {
            // Sin permisos todavía
        }
    },
    
    // === PASO 2.5: SIMULACIÓN INVISIBLE (sin mensaje) ===
    {
        phase: 1,
        step: 2.5,
        title: "Consumiendo munición...",
        text: `
            <p>Observa cómo la barra de munición del frente se va vaciando.</p>
        `,
        spotlight: true,
        spotlightTarget: 'front',
        spotlightRadius: 100,
        spotlightOffsetX: -20,
        spotlightOffsetY: -50,
        autoAdvanceWhen: 'front_half_ammo', // Avanzar al 50% de munición
        allowSimulation: true, // ACTIVAR simulación
        simulationSpeed: 8.0,  // 9x más rápido
        hideNextButton: true,  // Ocultar el botón "Siguiente" (auto-avanza)
        hideCancelButton: true, // Ocultar el botón "Salir" para evitar interrupciones
        requiresAction: false,
        permissions: {
            // Sin permisos todavía
        }
    },
    
    // === PASO 3: EXPLICAR LIMITACIÓN ===
    {
        phase: 1,
        step: 3,
        title: "La cadena de suministros",
        text: `
            <p>Este es tu <strong>Base Principal (HQ)</strong>. Es el centro desde el que salen todas tus vías de suministros.</p>
            <p>Debajo del HQ verás los camiones pesados disponibles.</p>
            <p><strong>1. Haz clic en el HQ</strong></p>
            <p><strong>2. Luego haz clic en el Frente para enviar munición</strong></p>
        `,
        spotlight: true,
        spotlightTarget: 'hq', // Iluminar el HQ
        spotlightRadius: 100,
        spotlightOffsetX: 0,
        spotlightOffsetY: -60,
        revealMapAfter: 4.0, // Revelar todo el mapa después de 4 segundos
        // SIN allowSimulation: El juego se congela mientras el jugador lee
        requiresAction: true, // Requiere acción del jugador
        autoAdvanceWhen: 'convoy_sent_to_front', // Avanzar cuando envíe convoy al frente
        hideNextButton: true, // Ocultar "Siguiente" para forzar la acción
        hideCancelButton: true, // Ocultar "Salir" también
        permissions: {
            canSelectHQ: true,    // Puede seleccionar el HQ
            canSendConvoy: true   // Puede enviar convoyes
        }
    },
    
    // === PASO 4: CONSTRUIR FOB ===
    {
        phase: 2,
        step: 4,
        title: "Puestos avanzados (FOB)",
        text: `
            <p>Habrás notado que el HQ no puede enviar camiones pesados directamente al frente.</p>
            <p>Necesitas construir un puesto de avanzada <strong>FOB</strong> entre tu HQ y el frente, y que sea este el que envíe vehículos ligeros a la zona de combate.</p>
            <p><strong>1. Click en el menú de construcción</strong>
            <p><strong>2. Click en "FOB"</strong></p>
            <p><strong>3. Colócala entre tu HQ y el frente</strong></p>
        `,
        revealMapAfter: 4.0, // A los 4 segundos, revelar tienda y dar dinero
        giveMoneyAfter: 4.0, // Dar dinero para construir FOB
        moneyAmount: 140,    // Dinero exacto para construir un FOB
        requiresAction: true,
        autoAdvanceWhen: 'fob_built', // Avanzar cuando construya el FOB
        hideNextButton: true, // Ocultar "Siguiente" para forzar la construcción
        permissions: {
            // Al inicio no puede hacer nada (se activa después de 4s)
        },
        permissionsAfterReveal: {
            canOpenStore: true,  // Puede abrir la tienda
            canBuildFOB: true    // Solo puede construir FOB
        }
    },
    
    // === PASO 5: ABASTECER FOB ===
    {
        phase: 2,
        step: 2,
        title: "Abastecer la FOB",
        text: `
            <p>Ahora que tienes una FOB, debes llenarla de suministros.</p>
            <p><strong>1. Click en tu HQ</strong></p>
            <p><strong>2. Click en la FOB</strong></p>
            <p>El camión pesado llevará suministros del HQ a la FOB.</p>
            <p><em>Envía suministros ahora.</em></p>
        `,
        target: null,
        spotlightRadius: 0,
        requiresAction: true,
        hideNextButton: true,
        autoAdvanceWhen: 'convoy_arrived_to_fob',
        allowSimulation: true,
        simulationSpeed: 1.0,
        permissions: {
            canSelectHQ: true,
            canSelectFOB: true,
            canSendConvoy: true
        }
    },
    
    // === PASO 6: ABASTECER FRENTE ===
    {
        phase: 3,
        step: 1,
        title: "Abastecer el Frente",
        text: `
            <p>Ahora la FOB tiene suministros. Es hora de enviarlos al frente.</p>
            <p><strong>1. Click en la FOB</strong></p>
            <p><strong>2. Click en el frente</strong></p>
            <p>Los camiones rápidos de la FOB llevarán munición al combate.</p>
            <p><em>Completa la cadena logística.</em></p>
        `,
        target: null,
        spotlightRadius: 0,
        requiresAction: true,
        actionType: 'send_convoy_to_front',
        hideNextButton: true,
        autoAdvanceWhen: 'convoy_arrived_to_front',
        allowSimulation: true,
        simulationSpeed: 1.0,
        permissions: {
            canSelectHQ: true,
            canSelectFOB: true,
            canSendConvoy: true
        }
    },
    
    // === PASO 7: EXPLICAR CADENA LOGÍSTICA ===
    {
        phase: 3,
        step: 2,
        title: "Cadena Completa",
        text: `
            <p>Perfecto. Ahora entiendes la <strong>cadena de suministros</strong>.</p>
            <p>Para crear una sólida cadena de suministros necesitarás recursos. Estos se ganan pasivamente y al hacer avanzar el frente. Tus unidades empujarán la frontera siempre que tengan más suministros que el enemigo.</p>

        `,
        target: null,
        spotlightRadius: 0,
        requiresAction: false,
        hideNextButton: false,
        autoAdvanceWhen: 'convoy_arrived_to_front',
        allowSimulation: true,
        simulationSpeed: 1.0,
        permissions: {
            canSelectHQ: true,
            canSelectFOB: true,
            canSendConvoy: true
        }
    },
    
    
    // === PASO 8: EMERGENCIAS MÉDICAS ===
    {
        phase: 4,
        step: 1,
        title: "Emergencias Médicas",
        text: `
            <p>A veces, el frente sufrirá <strong>bajas críticas</strong>. Verás un icono y escucharás a los sodados pedirte ayuda.</p>
            <p>Deberás enviarles vehículos médicos si no quieres que sufran una penalización en el consumo de suministros. Para ello:</p>
            <p><strong>1. Haz click en el HQ</strong></p>
            <p><strong>2. Click en el icono de ambulancia sobre él</strong></p>
            <p><strong>3. Click en el frente con emergencia</strong></p>
            <p>Responde a la emergencia médica actual.</p>
        `,
        target: null,
        spotlightRadius: 0,
        requiresAction: true,
        hideNextButton: true,
        // Al entrar: forzamos emergencia y permitimos ambulancias
        allowSimulation: true,
        simulationSpeed: 1.0,
        // Pausar simulación a los 4 segundos para evitar penalización
        pauseSimulationAfter: 4.0,
        permissions: {
            canSelectHQ: true,
            canSendConvoy: true
        },
        autoAdvanceWhen: 'medical_resolved'
    },
    
    // === PASO 10: DEFENSA ===
    {
        phase: 5,
        step: 1,
        title: "Defensa",
        text: `
            <p>El enemigo intentará destruir tus FOBs para ganarte en el empuje del frente.</p>
            <p>Experimenta con los recursos que tienes en la tienda y logra la mejor estrategia. ¡Se prudente usando los recursos y no te quedes siempre a 0!</p>
            <p>Puedes consultar las unidades disponibles en el Arsenal. </p>
            `,
        target: null,
        spotlightRadius: 0,
        requiresAction: false,
        permissions: {
            canSelectHQ: true,
            canSelectFOB: true,
            canSendConvoy: true,
            canOpenStore: true,
            canBuildOther: true
        }
    },
    
    // === PASO 11: FINAL ===
    {
        phase: 5,
        step: 2,
        title: "Tutorial Completo",
        text: `
            <h3>Ya Sabes lo Básico</h3>
            <p>Recuerda la cadena logística:</p>
            <br>
            <p>• Construye FOBs para expandirte</p>
            <p>• Mantén la cadena de suministros activa</p>
            <p>• Atiende emergencias médicas</p>
            <p>• Defiende tus bases y ataca las del enemigo para vencer en el <strong>empuje</strong></p>
            <br>
            <p><em>Buena suerte, Comandante.</em></p>
        `,
        target: null,
        spotlightRadius: 0,
        requiresAction: false,
        permissions: {
            // Todos los permisos desbloqueados
            canSelectHQ: true,
            canSelectFOB: true,
            canSendConvoy: true,
            canOpenStore: true,
            canBuildFOB: true,
            canBuildOther: true,
            canUseDrone: true,
            canUseSniper: true
        }
    }
];

