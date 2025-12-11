# 🌐 Sistema i18n - Fase 2: Menú Principal y Pantallas

## ✅ Completado

### Archivos Modificados

1. **`locales/client/es.json`** - Añadidas traducciones de menú, lobby, game_end, pause, options, arsenal
2. **`locales/client/en.json`** - Añadidas traducciones en inglés
3. **`src/systems/ui/LoadingScreenManager.js`** - Añadido soporte i18n
4. **`src/systems/ui/MenuUIManager.js`** - **NUEVO** Gestor centralizado de textos del menú
5. **`src/Game.js`** - Inicialización de MenuUIManager

---

## 📋 Textos Migrados

### ✅ Menú Principal
- Título: "Supply Line Commander"
- Botones: Jugar, Tutorial, Arsenal, Opciones, Salir
- Botón de logout
- Botón "Comenzar"

### ✅ Lobby Multijugador
- Título y estado de conexión
- Botones: Crear Sala, Unirse a Sala
- Código de sala y placeholder
- Sección de jugadores
- Configuración de IA (slot, dificultad, nación)
- Chat (placeholder y botón enviar)
- Botones de acción (Listo, Comenzar Partida)

### ✅ Pantallas de Victoria/Derrota
- Títulos: "¡VICTORIA!" / "DERROTA"
- Botón "Volver al Menú"
- Estadísticas (preparadas para futuro)

### ✅ Menú de Pausa
- Título: "Pausa"
- Botones: Continuar, Opciones, Volver al menú

### ✅ Menú de Opciones
- Título: "Opciones"
- Labels de volumen (Maestro, Música, Efectos)
- Botones: Restaurar por defecto, Cerrar

### ✅ Arsenal/Constructor de Mazos
- Título: "Constructor de Mazos"
- Tabs: Unidades, Disciplinas
- Botones: Nuevo, Cargar, Limpiar, Guardar, Cerrar
- Textos de ayuda

### ✅ Pantalla de Carga
- Título
- Texto de progreso
- Porcentaje
- "Pulsa para continuar"

---

## 🎯 Características Implementadas

### 1. MenuUIManager (Nuevo)
Gestor centralizado que actualiza automáticamente todos los textos del menú cuando cambia el idioma:

```javascript
// Se inicializa en Game.js
this.menuUI = new MenuUIManager();
this.menuUI.init();

// Escucha cambios de idioma automáticamente
window.addEventListener('languageChanged', () => {
    this.menuUI.updateAllTexts();
});
```

### 2. Actualización Automática
Todos los textos se actualizan **instantáneamente** cuando el usuario cambia de idioma desde el selector.

### 3. Organización por Secciones
Los archivos JSON están organizados por secciones lógicas:
- `common` - Textos comunes (Guardar, Cancelar, etc.)
- `menu` - Menú principal
- `lobby` - Lobby multijugador
- `game_end` - Victoria/Derrota
- `pause` - Menú de pausa
- `options` - Opciones
- `arsenal` - Constructor de mazos
- `loading` - Pantalla de carga

---

## 🧪 Testing

### Casos de Prueba

| Pantalla | Acción | Resultado Esperado |
|----------|--------|-------------------|
| Login | Cambiar idioma ES→EN | Todos los textos cambian |
| Menú Principal | Cambiar idioma | Botones se actualizan |
| Lobby | Cambiar idioma | Chat, botones, labels cambian |
| Opciones | Cambiar idioma | Labels de volumen cambian |
| Arsenal | Cambiar idioma | Tabs y botones cambian |
| Carga | Cambiar idioma | Textos de progreso cambian |

### Verificación Manual
1. ✅ Abrir el juego
2. ✅ Cambiar idioma en login
3. ✅ Navegar por todos los menús
4. ✅ Verificar que todos los textos están traducidos
5. ✅ Recargar y verificar persistencia

---

## 📊 Estadísticas

- **Textos migrados:** ~80+ strings
- **Pantallas cubiertas:** 7 (Login, Menú, Lobby, Victoria, Derrota, Pausa, Opciones, Arsenal, Carga)
- **Idiomas soportados:** 2 (Español, English)
- **Archivos modificados:** 5
- **Archivos nuevos:** 1 (MenuUIManager.js)

---

## 🚀 Próximos Pasos (Fase 3)

### Descripciones de Edificios y Unidades
- [ ] Migrar `NODE_DESCRIPTIONS` del servidor
- [ ] Sincronización cliente-servidor con idioma preferido
- [ ] Tooltips de edificios traducidos
- [ ] Detalles de unidades traducidos

### Consideraciones Técnicas
El servidor envía descripciones de edificios al cliente. Necesitaremos:
1. Que el cliente informe su idioma preferido al conectar
2. Que el servidor tenga archivos de traducción propios
3. Que el servidor envíe descripciones en el idioma correcto

---

## 💡 Notas de Implementación

### MenuUIManager
- **Singleton**: Una sola instancia global
- **Automático**: Se actualiza solo cuando cambia el idioma
- **Modular**: Cada sección tiene su propio método `updateXXXTexts()`
- **Extensible**: Fácil añadir nuevas secciones

### Patrón de Uso
```javascript
// Helper para actualizar botones
updateButton(buttonId, translationKey) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.textContent = i18n.t(translationKey);
    }
}

// Uso
this.updateButton('play-btn', 'menu.play');
```

### Fallback Seguro
Si falta una traducción:
1. Intenta idioma actual
2. Intenta idioma fallback (español)
3. Muestra `[clave]` para debug

---

**Fecha:** Diciembre 2025  
**Estado:** ✅ Fase 2 Completada  
**Siguiente:** Fase 3 - Descripciones de Edificios (Servidor)

