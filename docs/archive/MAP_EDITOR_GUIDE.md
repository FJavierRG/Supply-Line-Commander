# 🛠️ Guía del Editor de Mapas (v2.0 - Rediseñado)

## Activación

**Desde el Menú Principal** → Click en **"🛠️ Editor de Mapas"**

El editor es una sección completamente independiente del juego, accesible solo desde el menú principal.

## Interfaz Rediseñada

El editor tiene un diseño profesional estilo Unity/Unreal:
- **Toolbar horizontal superior**: Herramientas principales siempre visibles
- **Canvas central**: Protagonista absoluto (85% de la pantalla)
- **Panel lateral colapsable**: Propiedades de la misión (solo cuando lo necesitas)
- **Contador discreto**: Esquina inferior izquierda

## Controles del Editor

### 🎨 Toolbar (Barra Superior)

**Sección Izquierda:**
- **← Menú**: Volver al menú principal y guardar automáticamente
- **Editor de Mapas**: Título (solo visual)

**Sección Central (Herramientas):**
- **⛺ FOB**: Añadir Base Intermedia (click para activar, luego click en canvas)
- **⚔️ FRONT**: Añadir Frente de Combate
- **🧲 Grid**: Toggle snap to grid (se ilumina en azul cuando está activo)

**Sección Derecha (Acciones):**
- **🗑️**: Limpiar todo el mapa (confirma antes)
- **▶️ Probar**: Testear la misión inmediatamente
- **💾 Exportar**: Copiar JSON al portapapeles y descargar
- **⚙️**: Toggle panel de propiedades (abre/cierra el panel derecho)

### 🎮 Controles del Canvas

- **Click**: Colocar base (si hay herramienta activa) o seleccionar base
- **Click + Arrastrar**: Mover bases existentes
- **Delete / Supr**: Eliminar base bajo el cursor
- **Escape**: Deseleccionar herramienta activa

### 🏗️ Añadir Nodos

**🏠 HQ**: Siempre fijo en su posición estándar (semi-transparente en el canvas, no editable)

1. Click en **⛺ FOB** o **⚔️ FRONT** en el toolbar
2. El botón se ilumina con **borde azul** cuando está activo
3. Click en el canvas para colocar la base
4. Click en el botón nuevamente (o ESC) para deseleccionar

### 🧲 Snap to Grid

Click en el botón **🧲 Grid** en el toolbar:
- **Activo (azul)**: Las bases se alinean a una cuadrícula de 50px
  - Aparece grid visual en el canvas
  - Útil para layouts simétricos
- **Inactivo (gris)**: Colocación libre pixel-perfect

### 📝 Panel de Propiedades (⚙️)

Click en **⚙️** en el toolbar para abrir/cerrar el panel derecho.

Aquí puedes editar:

- **Número**: Número de la misión (99 por defecto para custom)
- **Nombre**: Nombre de la misión
- **Duración (s)**: Tiempo límite en segundos
- **Descripción**: Texto del briefing
- **Objetivos**: Objetivos que se mostrarán al jugador

### 🎬 Acciones

#### 🗑️ Limpiar Todo
Elimina todas las bases del mapa (pide confirmación).

#### ▶️ Probar Misión
- Valida que haya al menos 1 HQ y 1 FRONT
- Carga la misión inmediatamente para probarla
- Cierra el editor automáticamente
- **Ideal para iteración rápida**

#### 💾 Exportar JSON
- Copia el JSON al portapapeles
- Descarga un archivo `.json` con la configuración
- Muestra el JSON en consola para debug

## 📊 Información en Pantalla

Mientras editas, verás:

- **Indicador "MODO EDITOR"** en la esquina superior izquierda (naranja)
- **Contador de bases**: HQ, FOB y FRONT
- **Coordenadas en hover**: Al pasar el mouse sobre una base, muestra su posición en porcentajes (formato del JSON)
- **Preview de herramienta**: Fantasma semitransparente de la base que vas a colocar

## 📤 Formato de Exportación

El editor genera JSON compatible con el sistema de misiones:

```json
{
  "number": 99,
  "name": "Mi Misión Custom",
  "description": "Descripción...",
  "objectives": "✓ Objetivo 1<br>✓ Objetivo 2",
  "duration": 120,
  "nodesConfig": {
    "fobs": [
      { "xPercent": 0.4, "yPercent": 0.5 }
    ],
    "fronts": [
      { "xPercent": 0.7, "yPercent": 0.3 }
    ]
  }
}
```

### Sistema de Coordenadas

- **xPercent**: Posición horizontal (0.0 = izquierda, 1.0 = derecha)
- **yPercent**: Posición vertical **CARTESIANA** (0.0 = abajo, 1.0 = arriba)
  - ⚠️ El editor invierte automáticamente las coordenadas Y del canvas

## 🔄 Workflow Profesional

### Crear Misión Nueva

1. **Menú Principal** → **"🛠️ Editor de Mapas"**
2. Canvas limpio con HQ fijo visible
3. Click **⛺ FOB** → Click en canvas (repite para múltiples FOBs)
4. Click **⚔️ FRONT** → Click en canvas (coloca tus frentes)
5. Arrastra para ajustar posiciones
6. Click **⚙️** → Edita propiedades (nombre, duración, etc.)
7. Click **▶️ Probar** → Testea la misión
8. Vuelve con **"📝 Continuar Editando"** desde el menú
9. Ajusta según feedback del test
10. Click **💾 Exportar** cuando esté perfecta
11. **← Menú** para salir (guarda automáticamente)

**Nota**: El editor es una sección independiente. NO carga misiones existentes. Siempre empiezas desde cero.

### Crear Archivo de Misión

1. Exporta el JSON (se copia al portapapeles)
2. Crea `src/missions/MissionX.js`
3. Copia esta estructura:

```javascript
import { Mission } from './Mission.js';

export class MissionX extends Mission {
    constructor() {
        super();
        
        // PEGAR AQUÍ LA METADATA DEL JSON EXPORTADO
        this.number = 99;
        this.name = 'Mi Misión';
        this.description = '...';
        this.objectives = '...';
        this.duration = 120;
        
        // PEGAR AQUÍ EL nodesConfig DEL JSON EXPORTADO
        this.nodesConfig = {
            fobs: [...],
            fronts: [...]
        };
    }
}
```

4. Registra la misión en `src/missions/index.js`

## 💡 Tips

### Usar el Snap to Grid

**Cuándo activarlo:**
- ✅ Para crear layouts simétricos y ordenados
- ✅ Cuando quieres alineación vertical/horizontal perfecta
- ✅ Para espaciado uniforme entre bases

**Cuándo desactivarlo:**
- ✅ Para ajustes finos de posición
- ✅ Layouts asimétricos o irregulares
- ✅ Cuando necesitas máxima precisión

**Truco**: Activa el snap para colocar bases rápido, luego desactívalo para ajustes finales.

### Filosofía del Editor

**El editor SIEMPRE empieza vacío** - No importa si estás en medio de una misión, siempre abres con un lienzo en blanco. Esto es intencional para:
- Evitar editar por accidente una misión existente
- Claridad mental: cada sesión de edición es independiente
- Simplicidad: no hay confusión sobre qué estás editando

Si quieres "editar" una misión existente:
1. Abre el archivo `src/missions/MissionX.js`
2. Copia los valores `xPercent` y `yPercent` de cada base
3. Recréala manualmente en el editor

### Distribución de Bases

- **HQ**: Fijo en su posición estándar (izquierda-centro)
- **FOBs**: En el centro (xPercent ≈ 0.4 - 0.5)
- **FRONTs**: A la derecha (xPercent ≈ 0.7 - 0.85)

### Espaciado Vertical

Para N bases del mismo tipo distribuidas verticalmente:
- Base 1: yPercent = 0.2
- Base 2: yPercent = 0.5  
- Base 3: yPercent = 0.8

(Más espacio = menos congestión de rutas)

### Dificultad Progresiva

- **Fácil**: 1-2 FOBs, 1-2 FRONTs
- **Media**: 2-3 FOBs, 3-4 FRONTs
- **Difícil**: 4-5 FOBs, 5-7 FRONTs
- **Extremo**: 6+ FOBs, 8+ FRONTs

### Duración Recomendada

- Tutorial: sin límite (`duration: null`)
- Fácil: 60-80s
- Media: 90-120s
- Difícil: 130-150s
- Boss: 180s+

## 🐛 Troubleshooting

### "El HQ es fijo y no se puede editar"
- El HQ siempre está en su posición estándar (izquierda-centro)
- Solo puedes editar FOBs y FRONTs
- Esto simplifica el workflow y evita errores

### No puedo probar la misión
- Verifica que tengas al menos 1 FRONT
- El editor valida antes de permitir play test
- El HQ se añade automáticamente al testear

### Las coordenadas exportadas no coinciden
- Las coordenadas Y se invierten automáticamente (sistema cartesiano)
- Lo que ves en el editor es lo que obtendrás en el juego

### El editor no cierra
- Click en el botón "◀️ Volver al Menú" del panel
- Esto te regresa al menú principal

## 🎯 Atajos Rápidos

| Acción | Atajo |
|--------|-------|
| Abrir Editor | Botón en Menú Principal |
| Cerrar Editor | "Volver al Menú" |
| Eliminar base | `Delete` o `Supr` |
| Deseleccionar herramienta | Click en botón activo |
| Copiar JSON | Click en "Exportar JSON" |

## 🚀 Ejemplo Completo

Crear "Misión 16: Infierno Logístico":

1. Menú Principal → "🛠️ Editor de Mapas"
2. Colocar 7 FOBs en formación de V
3. Colocar 12 FRONTs en línea a la derecha
4. Nombre: "Infierno Logístico"
5. Duración: 240 segundos
6. Descripción: "La prueba definitiva..."
7. **"Probar Misión"** → Testear
8. Ajustar posiciones si hay overlapping
9. **"Exportar JSON"** → Guardar
10. Crear `Mission16.js` con el JSON
11. ¡Listo! 🎉

---

**Nota**: El editor es una herramienta de desarrollo. No modifica archivos automáticamente, solo exporta JSON que debes integrar manualmente en el código.

