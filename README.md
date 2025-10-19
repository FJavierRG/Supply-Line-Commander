# 🎮 Supply Line Commander

**Auto-RTS de logística militar en tiempo real**

## 📖 ¿Qué es este juego?

Supply Line Commander es un juego de estrategia en tiempo real donde **NO controlas unidades directamente**. En su lugar, gestionas la **cadena logística** que mantiene vivo tu frente de batalla.

### Mecánicas Principales:
- 🏭 **Construye FOBs** (Forward Operating Bases) para expandir territorio
- 🚛 **Envía convoyes** de suministros del HQ → FOB → Frente
- ⚔️ **Empuja el frente**: Si tu frente tiene más recursos que el enemigo, avanza
- 🎯 **Victoria**: Alcanza el HQ enemigo con tu frente
- 💀 **Derrota**: El enemigo alcanza tu HQ

### Sistemas Adicionales:
- 🚁 Drones kamikaze para destruir edificios enemigos
- 🎯 Francotiradores para eliminar vehículos
- 🏥 Ambulancias para emergencias médicas
- 🏗️ 10+ tipos de edificios especializados
- 🤖 IA enemiga con múltiples estrategias

---

## 🚀 Cómo Ejecutar

### Método 1: START.bat (Recomendado en Windows)
```bash
START.bat
```

### Método 2: Servidor HTTP manual
```bash
python -m http.server 8001
# o
npx http-server -p 8001
```

Luego abre: **http://localhost:8001**

---

## 📁 Estructura del Proyecto

```
ProyectoMil/
├── index.html              # Entry point
├── styles.css              # Estilos globales
├── README.md              # Este archivo
├── .roadfaz               # Roadmap del proyecto multiplayer
├── ARCHITECTURE.md        # Arquitectura técnica
│
├── assets/                # Sprites y sonidos
│   ├── sprites/           # Imágenes del juego
│   └── sounds/            # Audio normalizado
│
├── src/                   # Código fuente
│   ├── Game.js            # Controlador principal
│   ├── main.js            # Entry point
│   │
│   ├── config/            # Configuración
│   │   ├── nodes.js       # Nodos del juego (HQ, FOB, edificios)
│   │   └── constants.js   # Constantes globales
│   │
│   ├── entities/          # Entidades del juego
│   │   ├── MapNode.js     # Entidad unificada (bases, edificios)
│   │   └── Convoy.js      # Vehículos en tránsito
│   │
│   ├── systems/           # Sistemas modulares (23+)
│   │   ├── RenderSystem.js
│   │   ├── UIManager.js
│   │   ├── AudioManager.js
│   │   ├── BuildingSystem.js
│   │   ├── ConvoyManager.js
│   │   ├── DroneSystem.js
│   │   ├── EnemyAISystem.js
│   │   └── ...
│   │
│   ├── ai/                # Sistema de IA enemiga
│   │   ├── AIDirector.js
│   │   ├── core/
│   │   └── config/
│   │
│   └── missions/          # Misiones del juego
│       └── Mission20.js   # Misión actual
│
└── docs/                  # Documentación técnica
    ├── ARCHITECTURE.md    # Arquitectura del sistema
    ├── SPRITES_GUIDE.md   # Guía de sprites
    └── archive/           # Docs obsoletas/específicas
```

---

## 🎯 Estado Actual

### ✅ Implementado (Singleplayer)
- Juego completo funcional vs IA
- 23+ sistemas modulares independientes
- Sistema de entidades unificado (MapNode)
- IA enemiga avanzada (EnemyAISystem + AIDirector)
- Tutorial completo
- 10+ tipos de edificios
- Sistemas de drones, emergencias médicas, territorio
- Audio ambiente dinámico

### 🔄 En Desarrollo (Multiplayer 1v1)
Ver archivo `.roadfaz` para el roadmap completo del proyecto multiplayer.

**✅ Fase 0 COMPLETADA:** Refactorización PvP (2025-10-16)
- ✅ Eliminado hardcoding de 'ally' vs 'enemy'
- ✅ Sistema unificado de nodos con diferenciación por `team`
- ✅ Código preparado para multijugador

**Próximo hito:** Fase 1 - Backend y Sincronización (Node.js + Socket.IO)

---

## 🛠️ Stack Tecnológico

**Cliente:**
- Vanilla JavaScript (ES6 Modules)
- Canvas 2D API
- HTML5 Audio API
- Arquitectura modular (23+ sistemas)

**Assets:**
- Sprites: PNG (bases, edificios, vehículos, UI)
- Audio: WAV normalizado a -3dB

**Sin dependencias externas** (cliente puro)

---

## 🎮 Controles

| Acción | Control |
|--------|---------|
| Seleccionar nodo | Click izquierdo |
| Enviar convoy | Click en nodo origen → Click en nodo destino |
| Construir | Tienda (esquina inferior derecha) |
| Lanzar dron | Seleccionar dron → Click en objetivo enemigo |
| Pausar | ESC o botón ⏸️ |
| Cámara | Arrastrar con ratón |

---

## 📚 Documentación Adicional

- **Arquitectura técnica**: Ver `ARCHITECTURE.md`
- **Roadmap multiplayer**: Ver `.roadfaz`
- **Guía de sprites**: Ver `docs/SPRITES_GUIDE.md`
- **Docs específicas**: Ver `docs/archive/` (IA, balance, testing)

---

## 🤝 Contribuir / Desarrollar

1. **Clonar** el repositorio
2. **Ejecutar** con servidor HTTP (ver arriba)
3. **Modificar** archivos en `src/`
4. **Refrescar** navegador (F5)

No requiere compilación ni build process.

---

## 📜 Licencia

Proyecto personal / educativo

---

## 🎓 Créditos

- **Diseño de juego**: Original
- **Código**: JavaScript vanilla
- **Sprites**: Custom
- **Audio**: Normalizado para experiencia consistente

---

**Versión:** 2.0 (PvP-Ready)  
**Estado:** ✅ Refactorizado para multijugador - Singleplayer funcional  
**Próximo:** Fase 1 - Backend (Node.js + Socket.IO)

Para más información sobre el proyecto multiplayer, ver `.roadfaz`
