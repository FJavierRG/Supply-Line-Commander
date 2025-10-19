# 🚀 Guía de Instalación - Modo Multijugador

**Versión:** 1.0  
**Fase:** 1 - Backend y Sincronización Básica

---

## 📋 Requisitos

- **Node.js** >= 18.0.0
- **npm** (incluido con Node.js)
- **Python** (para cliente) o extensión Live Server

---

## 🔧 Instalación

### **Paso 1: Instalar Dependencias del Servidor**

```bash
cd server
npm install
```

Esto instalará:
- `express` (servidor HTTP)
- `socket.io` (WebSockets)
- `uuid` (generación de IDs)
- `cors` (CORS policy)

---

### **Paso 2: Iniciar el Servidor**

```bash
cd server
npm start
```

Deberías ver:
```
=====================================
  Supply Line Commander - Servidor
=====================================
✅ Servidor corriendo en puerto 3000
🌐 http://localhost:3000
=====================================
```

**El servidor debe estar corriendo** antes de abrir el cliente.

---

### **Paso 3: Iniciar el Cliente**

**Opción A: START.bat (Recomendado)**
```bash
# Desde la raíz del proyecto
START.bat
```

**Opción B: Python**
```bash
# Desde la raíz del proyecto
python -m http.server 8000
```

**Opción C: Live Server (VS Code/Cursor)**
- Click derecho en `index.html` → "Open with Live Server"

---

### **Paso 4: Abrir el Juego**

1. Abre tu navegador
2. Ve a: `http://localhost:8000` (o el puerto que uses)
3. Click en **"Multijugador"** en el menú principal

---

## 🎮 Cómo Jugar Multijugador

### **Jugador 1 (Host):**
1. Click en **"Crear Sala"**
2. Ingresa tu nombre
3. **Comparte el código de 4 letras** con tu oponente
4. Espera a que se una

### **Jugador 2 (Guest):**
1. Click en **"Unirse a Sala"**
2. Ingresa el **código de 4 letras**
3. Ingresa tu nombre
4. ¡Listo!

### **Inicio de Partida:**
- Automáticamente inicia countdown de 3 segundos
- Ambos jugadores ven el mismo mapa
- ¡A jugar!

---

## 🐛 Troubleshooting

### **Error: "No se pudo conectar al servidor"**

**Causa:** El servidor no está corriendo o usa puerto diferente.

**Solución:**
1. Verifica que el servidor esté corriendo (`npm start` en carpeta `server/`)
2. Verifica que use puerto 3000
3. Si usas otro puerto, actualiza `src/systems/NetworkManager.js`:
   ```javascript
   this.serverUrl = 'http://localhost:TU_PUERTO';
   ```

---

### **Error: "Sala no encontrada"**

**Causa:** El código de sala es incorrecto o la sala expiró.

**Solución:**
1. Verifica el código (4 caracteres exactos)
2. Pide al host que cree nueva sala

---

### **Los dos jugadores no se ven**

**Causa:** Problema de sincronización.

**Solución:**
1. Refresca ambos navegadores (`F5`)
2. Reinicia el servidor
3. Vuelve a crear la sala

---

## 📊 Estado de Implementación

### ✅ Implementado (Fase 1):
- ✅ Servidor Node.js + Socket.IO
- ✅ Sistema de lobby (crear/unirse)
- ✅ Códigos de sala (4 caracteres)
- ✅ Sincronización de estado inicial
- ✅ Construcción de edificios (básica)
- ✅ Envío de convoyes (básico)
- ✅ Currency pasiva sincronizada

### ⏳ Pendiente (Fase 2+):
- ⏳ Movimiento de frentes
- ⏳ Drones y anti-drones
- ⏳ Emergencias médicas
- ⏳ Victoria/Derrota
- ⏳ Reconexión
- ⏳ Observadores

---

## 🔍 Verificar que Funciona

### **Test Básico:**

1. **Terminal 1:** `cd server && npm start`
2. **Terminal 2:** `cd .. && START.bat` (o `python -m http.server 8000`)
3. **Navegador 1:** `http://localhost:8000` → Multijugador → Crear Sala
4. **Navegador 2:** `http://localhost:8000` → Multijugador → Unirse (con código)
5. ✅ Deberían ver ambos el countdown y luego el mismo mapa

---

## 📝 Notas

- El servidor corre en **puerto 3000**
- El cliente corre en **puerto 8000** (o el que elijas)
- Son **procesos separados** (servidor y cliente)
- Para jugar con otra persona en red local:
  - Comparte tu IP local (ej: `192.168.1.100`)
  - El otro jugador va a `http://TU_IP:8000`

---

**Última actualización:** 2025-10-16  
**Versión servidor:** 1.0.0  
**Fase completada:** Fase 1

