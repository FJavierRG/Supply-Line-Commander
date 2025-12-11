# 🐛 Bugfix: Arsenal mostraba textos en español con idioma inglés

## Problema Identificado

Al cambiar el idioma a inglés, el Arsenal (Constructor de Mazos) seguía mostrando:
- ✅ Nombres de edificios en español
- ✅ Descripciones en español
- ✅ Textos de UI en español ("Tu Mazo", "Banquillo", etc.)

## Causa Raíz

1. **Descripciones del servidor no se guardaban**: El evento `game_config` recibía las descripciones traducidas del servidor pero no las almacenaba en `game.serverBuildingConfig.descriptions`

2. **Textos de UI hardcodeados**: El ArsenalManager tenía textos hardcodeados como "Tu Mazo", "Banquillo", "puntos" en lugar de usar el servicio i18n

## Solución Implementada

### 1. Guardar descripciones del servidor

**Archivo:** `src/systems/NetworkManager.js`

```javascript
this.socket.on('game_config', (config) => {
    // ✅ NUEVO: Guardar descripciones traducidas del servidor
    if (config.descriptions) {
        console.log('🌐 Descripciones traducidas recibidas del servidor');
        if (!this.game.serverBuildingConfig) {
            this.game.serverBuildingConfig = {};
        }
        this.game.serverBuildingConfig.descriptions = config.descriptions;
    }
    // ... resto del código
});
```

### 2. Usar i18n en ArsenalManager

**Archivo:** `src/systems/ui/ArsenalManager.js`

```javascript
// Importar servicio i18n
import { i18n } from '../../services/I18nService.js';

// Usar traducciones en lugar de textos hardcodeados
if (panelTitle) panelTitle.textContent = i18n.t('arsenal.your_deck');
if (panelTitle) panelTitle.textContent = i18n.t('arsenal.bench');
```

### 3. Actualizar MenuUIManager

**Archivo:** `src/systems/ui/MenuUIManager.js`

Añadido método `updateArsenalTexts()` mejorado que actualiza:
- Títulos de paneles ("Mazo", "Banquillo")
- Botones de destino
- Textos de ayuda
- Contador de puntos
- Mensaje de mazo vacío

### 4. Añadir traducciones faltantes

**Archivos:** `locales/client/es.json` y `locales/client/en.json`

```json
{
  "arsenal": {
    "units": "Units",
    "disciplines": "Disciplines",
    "your_deck": "Deck",
    "bench": "Bench",
    "deck_empty": "Your deck is empty...",
    "points": "points",
    "hover_card": "Hover over an element",
    "add_card_left": "Left click to add card",
    "view_card_right": "Right click to view info",
    "cost": "Cost"
  }
}
```

## Flujo Corregido

```
1. Usuario selecciona idioma EN en login
   ↓
2. Cliente envía { language: 'en' } al servidor
   ↓
3. Servidor envía game_config con descriptions traducidas
   ↓
4. Cliente GUARDA descriptions en game.serverBuildingConfig
   ↓
5. getNodeConfig() lee de serverBuildingConfig.descriptions
   ↓
6. Arsenal muestra nombres/descripciones en inglés ✅
   ↓
7. MenuUIManager actualiza textos de UI en inglés ✅
```

## Testing

### Verificación Manual

1. ✅ Cambiar idioma a inglés en login
2. ✅ Abrir Arsenal
3. ✅ Verificar nombres de edificios en inglés
4. ✅ Verificar descripciones en inglés
5. ✅ Verificar "Deck", "Bench", "points" en inglés
6. ✅ Hover sobre cartas → tooltips en inglés
7. ✅ Click derecho en carta → detalles en inglés

### Casos de Prueba

| Elemento | Antes (bug) | Después (fix) |
|----------|-------------|---------------|
| Nombre HQ | "HQ (Cuartel General)" | "HQ (Headquarters)" ✅ |
| Descripción Factory | "Genera suministros..." | "Generates supplies..." ✅ |
| Panel título | "Tu Mazo" | "Deck" ✅ |
| Botón destino | "Banquillo" | "Bench" ✅ |
| Contador | "15 / 20 puntos" | "15 / 20 points" ✅ |
| Tab | "Unidades" | "Units" ✅ |

## Archivos Modificados

1. `src/systems/NetworkManager.js` - Guardar descriptions del servidor
2. `src/systems/ui/ArsenalManager.js` - Usar i18n para textos
3. `src/systems/ui/MenuUIManager.js` - Actualizar textos del Arsenal
4. `locales/client/es.json` - Añadir traducciones
5. `locales/client/en.json` - Añadir traducciones

## Resultado

✅ **Arsenal completamente traducido**
- Nombres de edificios/consumibles
- Descripciones cortas
- Detalles extendidos
- Textos de UI (botones, títulos, contadores)
- Tooltips y modales

---

**Fecha:** Diciembre 2025  
**Estado:** ✅ Bugfix Completado  
**Impacto:** Arsenal ahora respeta el idioma seleccionado

