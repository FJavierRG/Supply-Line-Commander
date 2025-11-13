# 🚀 Guía Rápida de Despliegue

## Opción 1: Render.com (MÁS FÁCIL) ⭐

### Pasos:

1. **Crear cuenta en Render.com**
   - Ve a https://render.com
   - Regístrate con GitHub (recomendado)

2. **Conectar repositorio**
   - Click en "New +" → "Web Service"
   - Conecta tu repositorio de GitHub
   - Selecciona el repositorio del juego

3. **Configuración automática**
   - Render detectará el archivo `render.yaml`
   - Configuración automática:
     - Build Command: `cd server && npm install`
     - Start Command: `cd server && npm start`
     - Port: `10000` (automático desde render.yaml)

4. **Deploy**
   - Click en "Create Web Service"
   - Espera 2-5 minutos para el primer deploy
   - Tu juego estará en: `https://supply-line-commander.onrender.com`

5. **Verificar**
   - Abre: `https://tu-app.onrender.com/api/status`
   - Deberías ver: `{"status":"online",...}`

### ⚠️ Nota sobre Sleep:
- El plan gratuito puede entrar en sleep después de 15 min sin tráfico
- Se despierta automáticamente cuando alguien accede (puede tardar 30-60 segundos)
- Para evitar sleep, puedes usar un servicio como UptimeRobot (gratis) para hacer ping cada 10 minutos

---

## Opción 2: Fly.io (MEJOR GRATIS) ⭐⭐

### Requisitos Previos:
- Instalar Fly CLI: https://fly.io/docs/getting-started/installing-flyctl/

### Pasos:

1. **Instalar Fly CLI (Windows PowerShell):**
   ```powershell
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Login:**
   ```bash
   fly auth login
   ```
   - Te abrirá el navegador para autenticarte

3. **Crear aplicación:**
   ```bash
   fly launch
   ```
   - Sigue las preguntas:
     - App name: `supply-line-commander` (o el que quieras)
     - Region: Elige el más cercano (ej: `mad` para Madrid)
     - PostgreSQL: No
     - Redis: No
     - Deploy now: Yes

4. **Verificar:**
   - Tu app estará en: `https://supply-line-commander.fly.dev`
   - Endpoint: `https://supply-line-commander.fly.dev/api/status`

5. **Actualizaciones futuras:**
   ```bash
   fly deploy
   ```

### Ventajas de Fly.io:
- ✅ Sin sleep garantizado
- ✅ Plan gratuito muy generoso
- ✅ Excelente para WebSocket

---

## Opción 3: Cyclic.sh (MÁS SIMPLE) ⭐

### Pasos:

1. **Crear cuenta**
   - Ve a https://cyclic.sh
   - Regístrate con GitHub

2. **Conectar repositorio**
   - Click en "New App"
   - Selecciona tu repositorio
   - Cyclic detectará automáticamente Node.js

3. **Configurar**
   - Root Directory: `/` (raíz del proyecto)
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && npm start`
   - Port: `3000` (o el que uses)

4. **Deploy**
   - Click en "Deploy"
   - Espera 2-3 minutos
   - Tu app estará en: `https://tu-app.cyclic.app`

---

## 🔧 Configuración del Cliente

Una vez desplegado, necesitas actualizar la URL del servidor en tu cliente:

### En `src/systems/NetworkManager.js` o donde configures la conexión:

```javascript
// Para desarrollo local
const SERVER_URL = 'http://localhost:3000';

// Para producción (Render)
const SERVER_URL = 'https://supply-line-commander.onrender.com';

// Para producción (Fly.io)
const SERVER_URL = 'https://supply-line-commander.fly.dev';

// O mejor aún, usar variable de entorno:
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
```

### Si usas variables de entorno:
1. Crea un archivo `.env` en la raíz:
   ```
   VITE_SERVER_URL=https://tu-app.onrender.com
   ```

2. O configura en Render/Fly/Cyclic:
   - En el panel de configuración, añade variable de entorno:
     - Key: `VITE_SERVER_URL`
     - Value: `https://tu-app.onrender.com`

---

## 🧪 Probar el Despliegue

1. **Verificar servidor:**
   ```bash
   curl https://tu-app.onrender.com/api/status
   ```
   Deberías ver JSON con el estado del servidor.

2. **Probar WebSocket:**
   - Abre la consola del navegador
   - Conecta a tu juego
   - Deberías ver conexiones Socket.IO exitosas

3. **Probar partida:**
   - Crea una sala
   - Únete con otro navegador/dispositivo
   - Inicia una partida

---

## 🐛 Solución de Problemas

### El servidor entra en sleep (Render.com):
- **Solución**: Usa UptimeRobot (gratis) para hacer ping cada 10 minutos
- O actualiza al plan de pago ($7/mes)

### Error "Port already in use":
- Verifica que uses la variable `PORT` del entorno
- Render usa puerto `10000`
- Fly.io usa puerto `8080`

### WebSocket no funciona:
- Verifica que la plataforma soporte WebSocket (Render, Fly.io y Cyclic lo hacen)
- Revisa los logs del servidor para errores

### CORS errors:
- Tu servidor ya tiene CORS configurado para `*`
- Si persisten, verifica que el cliente use la URL correcta

---

## 📊 Comparativa Rápida

| Característica | Render.com | Fly.io | Cyclic.sh |
|----------------|------------|--------|-----------|
| Facilidad | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Plan Gratuito | ✅ (750h/mes) | ✅ (3 VMs) | ✅ |
| Sin Sleep | ⚠️ (puede sleep) | ✅ | ✅ |
| WebSocket | ✅ | ✅ | ✅ |
| Auto-deploy | ✅ | ✅ | ✅ |

---

## 🎯 Recomendación Final

**Para empezar HOY**: Usa **Render.com** - Es el más fácil y rápido.

**Para mejor rendimiento gratis**: Usa **Fly.io** - Sin sleep y más recursos.

**Para máxima simplicidad**: Usa **Cyclic.sh** - Casi sin configuración.

---

## 📞 Siguiente Paso

1. Elige una plataforma
2. Sigue los pasos arriba
3. Comparte el link con tus testers
4. ¡Disfruta probando tu juego! 🎮

