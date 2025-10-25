# 🖥️ Guía para Añadir Pantallas Nuevas - ProyectoMil

## 📋 **Problema Común**

Cuando añades una nueva pantalla al juego, aparece completamente **negra** y no se renderiza. Este es un problema muy común que tiene una solución específica.

## 🔍 **¿Por qué pasa esto?**

El problema ocurre porque:

1. **El `gameLoop()` no se ejecuta en estado `'menu'`** por defecto
2. **Las nuevas pantallas necesitan que el loop de renderizado esté activo**
3. **Sin el loop activo, el método `render()` nunca se llama**

## ✅ **Solución Paso a Paso**

### **1. Crear el Manager de la Pantalla**

```javascript
// src/systems/MiPantallaManager.js
export class MiPantallaManager {
    constructor(game) {
        this.game = game;
        this.isVisible = false;
    }
    
    show() {
        this.isVisible = true;
        console.log('🖥️ Mi pantalla mostrada');
    }
    
    hide() {
        this.isVisible = false;
        console.log('🖥️ Mi pantalla oculta');
    }
    
    render(ctx) {
        if (!this.isVisible) return;
        
        // CRÍTICO: Limpiar el canvas completamente
        this.game.renderer.clear();
        
        // Renderizar tu contenido aquí
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Tu UI aquí...
    }
}
```

### **2. Añadir al Constructor de Game.js**

```javascript
// src/Game.js
import { MiPantallaManager } from './systems/MiPantallaManager.js';

export class Game {
    constructor(canvas) {
        // ... otros sistemas ...
        this.miPantalla = new MiPantallaManager(this);
    }
}
```

### **3. Modificar el gameLoop() para Renderizar la Pantalla**

```javascript
// src/Game.js - método gameLoop()
gameLoop() {
    // Solo actualizar si está en estado de juego activo
    if (this.state !== 'playing' && this.state !== 'victory' && this.state !== 'defeat' && this.state !== 'tutorial' && this.state !== 'menu') {
        requestAnimationFrame(() => this.gameLoop());
        return;
    }
    
    const now = Date.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    
    // Manejar tutorial por separado
    if (this.state === 'tutorial' && !this.isMultiplayer) {
        this.tutorialManager.update(dt);
        this.tutorialManager.render();
    } else {
        // Lógica normal del juego
        if (this.state === 'playing' && !this.paused) {
            this.update(dt);
        }
        
        // CRÍTICO: Renderizar pantalla personalizada si está visible
        if (this.state === 'menu' && this.miPantalla && this.miPantalla.isVisible) {
            this.miPantalla.render(this.renderer.ctx);
        } else {
            // Renderizado normal del juego
            this.render();
        }
    }
    
    requestAnimationFrame(() => this.gameLoop());
}
```

### **4. Asegurar que el GameLoop se Ejecute**

```javascript
// src/Game.js - método que muestra tu pantalla
mostrarMiPantalla() {
    // Mostrar la pantalla
    this.miPantalla.show();
    
    // CRÍTICO: Asegurar que el gameLoop esté ejecutándose
    if (!this._gameLoopRunning) {
        this._gameLoopRunning = true;
        this.lastTime = Date.now();
        this.gameLoop();
        console.log('🔄 GameLoop iniciado para mi pantalla');
    }
}
```

## 🎯 **Puntos Clave**

### **✅ Hacer:**
- **Limpiar el canvas** con `this.game.renderer.clear()` antes de renderizar
- **Asegurar que el gameLoop esté ejecutándose** cuando muestres la pantalla
- **Usar fondo sólido** en lugar de semi-transparente para tapar contenido anterior
- **Renderizar ANTES de restaurar la cámara** si usas coordenadas de pantalla

### **❌ No hacer:**
- Asumir que el gameLoop se ejecuta automáticamente en estado `'menu'`
- Usar overlays semi-transparentes sin limpiar el canvas
- Renderizar después de restaurar la cámara si usas coordenadas de pantalla

## 🔧 **Ejemplo Completo**

```javascript
// Ejemplo de una pantalla de configuración
export class ConfigScreenManager {
    constructor(game) {
        this.game = game;
        this.isVisible = false;
    }
    
    show() {
        this.isVisible = true;
        console.log('⚙️ Pantalla de configuración mostrada');
    }
    
    hide() {
        this.isVisible = false;
    }
    
    render(ctx) {
        if (!this.isVisible) return;
        
        // Limpiar canvas
        this.game.renderer.clear();
        
        // Fondo sólido
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Título
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Configuración', ctx.canvas.width / 2, 100);
        
        // Tu contenido aquí...
    }
}
```

## 🚨 **Síntomas del Problema**

- ✅ La pantalla se "muestra" (aparece el log de `show()`)
- ❌ La pantalla aparece completamente **negra**
- ❌ No aparecen logs de `render()`
- ❌ La pantalla desaparece automáticamente después de unos segundos

## 💡 **Debugging**

Si sigues teniendo problemas, añade estos logs:

```javascript
// En el gameLoop()
console.log(`🔄 GameLoop - state: ${this.state}, pantalla visible: ${this.miPantalla?.isVisible}`);

// En tu pantalla
render(ctx) {
    console.log(`🖥️ MiPantalla.render() - isVisible: ${this.isVisible}`);
    if (!this.isVisible) return;
    console.log('🖥️ Renderizando contenido...');
    // ... resto del código
}
```

## 📝 **Resumen**

El problema de pantallas negras se soluciona con **3 cambios clave**:

1. **Limpiar el canvas** antes de renderizar
2. **Modificar el gameLoop()** para renderizar tu pantalla
3. **Asegurar que el gameLoop se ejecute** cuando muestres la pantalla

¡Con estos cambios, cualquier pantalla nueva debería funcionar correctamente!


