// ===== CONFIGURACIÓN DEL TUTORIAL SIMPLE =====
// Sistema simple de pantallazos con cajas de texto

/**
 * Pasos del tutorial - Solo pantallazos con texto explicativo
 */
export const TUTORIAL_STEPS = [
    // === PASO 1: INTRODUCCIÓN (sin imagen) ===
    {
        step: 1,
        title: "Bienvenido, Comandante",
        image: null,
        text: `
            <p>Tu trabajo aquí es mantener vivo el <strong>frente de batalla</strong>.</p>
            <p>Los soldados lucharán solos, pero <strong>tú controlas los suministros</strong>.</p>

        `
    },
    
    // === PASO 2: MAPA DEL JUEGO ===
    {
        step: 2,
        title: "El Mapa",
        image: 'assets/demo/clean_map.png',
        text: `
            <p>Este es el mapa de batalla. A la izquierda puedes ver tu base de operaciones (HQ) tus puestos de avanzada (FOBs) y tus frentes de batalla. En azul verás todo el área que controla tu equipo.</p>
            <p>Al otro lado puedes ver a tu oponente jugando de forma simétrica</p>
        `
    },
    
    // === PASO 3: FRENTE DE BATALLA ===
    {
        step: 3,
        title: "El Frente de Batalla",
        image: 'assets/demo/frontera_1.png',
        text: `
            <p>Este es tu <strong>frente de batalla</strong>. Los nodos de frente de batalla se moverán de forma automática en función de los suministros disponibles</p>
        `
    },
    
    // === PASO 4: FRENTE SIN RECURSOS ===
    {
        step: 4,
        title: "Frente sin Recursos",
        image: 'assets/demo/frontera_2.png',
        text: `
            <p>La barra muestra los suministros del nodo. Cuando el frente se quede sin recursos, retrocederá automáticamente. Tu misión es evitar que esto suceda manteniendo una <strong>cadena de suministros</strong> activa.</p>
        `
    },
    
    // === PASO 5: CONTROL DEL TERRITORIO ===
    {
        step: 5,
        title: "Control del Territorio",
        image: 'assets/demo/frontera_3.png',
        text: `
            <p>El control del territorio repercute en la ganancia de oro. Por cada centímetro de tierra que tus soldados avanzan, obtienes riquezas. Además, obtienes una pequeña cantidad de forma pasiva. Este dinero te servirá para la tienda.</p>
        `
    },
    
    // === PASO 6: BARRA DE SUMINISTROS ===
    {
        step: 6,
        title: "Barra de Suministros",
        image: 'assets/demo/resources_1.png',
        text: `
            <p>Como vimos esta barra indica los suministros de tu frente de batalla. Para hacerle llegar nuevos suministros presta atención a los siguientes consejos.</p>
        `
    },
    
    // === PASO 7: CAMIONES PESADOS DEL HQ ===
    {
        step: 7,
        title: "Camiones Pesados del HQ",
        image: 'assets/demo/resources_2.png',
        text: `
            <p>El HQ tiene a tu disposición camiones pesados de suministros. No es seguro ni eficiente enviarlos directamente al frente de combate. Deberás enviarlos haciendo Click a los puestos de avanzada (FOBs).</p>
        `
    },
    
    // === PASO 8: CAMIONES LIGEROS DE LAS FOBS ===
    {
        step: 8,
        title: "Camiones Ligeros de las FOBs",
        image: 'assets/demo/resources_3.png',
        text: `
            <p>Desde las FOBs podrás enviar, haciendo Click, camiones ligeros que se desplazarán hasta el frente, entregarán los suministros y regresarán.</p>
        `
    },
    
    // === PASO 9: INDICADORES DE FOB ===
    {
        step: 9,
        title: "Indicadores de FOB",
        image: 'assets/demo/resources_4.png',
        text: `
            <p>Ten en cuenta que las FOBs tienen indicador de suministros y de vehículos disponibles. De nada te servirá tener camiones si no hay suministros y tampoco podrás enviar ayuda por muchos suministros que tengas si tus camiones aún no han regresado.</p>
        `
    },
    
    // === PASO 10: DESPLEGAR LA TIENDA ===
    {
        step: 10,
        title: "La Tienda",
        image: 'assets/demo/store_1.png',
        text: `
            <p>Aquí puedes desplegar la tienda haciendo click.</p>
        `
    },
    
    // === PASO 11: CONTENIDO DE LA TIENDA ===
    {
        step: 11,
        title: "Contenido de la Tienda",
        image: 'assets/demo/store_2.png',
        text: `
            <p>Dentro encontrarás toda una serie de edificios y recursos logísticos para ayudar a tu frente con el avance. Algunos te darán recompensas pasivas, otras fortalecerán tus cadenas de suministros, otros servirán para dificultar el desarrollo enemigo... Puedes revisar qué hacen en el Arsenal, desde el menú principal.</p>
        `
    },
    
    // === PASO 12: OBJETIVO DEL JUEGO ===
    {
        step: 12,
        title: "Objetivo del Juego",
        image: 'assets/demo/enemy_1.png',
        text: `
            <p>Tu objetivo es hacer retroceder la frontera enemiga hasta su HQ para ganar la partida.</p>
        `
    },
    
    // === PASO 13: ENFRENTAMIENTO DE FRENTES ===
    {
        step: 13,
        title: "Enfrentamiento de Frentes",
        image: 'assets/demo/enemy_2.png',
        text: `
            <p>Cuando ambos frentes se encuentren, el que tenga más suministros empujará al otro de forma automática.</p>
        `
    },
    
    // === PASO 14: FINAL (sin imagen) ===
    {
        step: 14,
        title: "¡A la Batalla!",
        image: null,
        text: `
            <p>Si quieres te puedes lanzar directamente a la batalla con el equipo por defecto o crear tu propio equipo desde el Arsenal. ¡Suerte!</p>
        `
    }
];
