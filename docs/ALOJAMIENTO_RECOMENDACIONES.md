# 🚀 Recomendaciones de Alojamiento para Supply Line Commander

## 📊 Análisis de tu Juego

### Características Técnicas Identificadas:
- **Tipo**: Juego multijugador RTS 1v1 en tiempo real
- **Stack**: Node.js 18+ con Express y Socket.IO
- **Arquitectura**: Servidor autoritativo (correcto para evitar hacks)
- **Comunicación**: WebSocket persistente (Socket.IO)
- **Tick Rate**: 10 TPS (eficiente, no muy exigente)
- **Almacenamiento**: Sin base de datos (todo en memoria)
- **Concurrencia**: Máximo 2 jugadores por sala

### Requisitos Estimados para Testing:
- **RAM**: 256-512 MB debería ser suficiente para 5-20 jugadores simultáneos
- **CPU**: 1 vCPU básico es suficiente
- **Ancho de Banda**: Moderado (WebSocket es eficiente)
- **Almacenamiento**: Mínimo (~100-200 MB para código y assets)
- **Uptime**: Necesitas servidor siempre activo (no sleep)

---

## 🎯 Opciones Recomendadas (Ordenadas por Prioridad)

### 1. **Render.com** ⭐ RECOMENDADO PARA EMPEZAR

**Plan Gratuito:**
- ✅ 750 horas/mes gratis (suficiente para testing)
- ✅ Sin tarjeta de crédito requerida
- ✅ Auto-deploy desde GitHub
- ✅ SSL gratuito
- ✅ Sin sleep (servidor siempre activo)
- ⚠️ **Limitación**: Si no hay tráfico por 15 minutos, puede entrar en sleep (pero se despierta automáticamente)

**Plan Pago Más Barato ($7/mes):**
- ✅ Sin sleep
- ✅ Más recursos
- ✅ Mejor rendimiento

**Configuración Necesaria:**
```yaml
# render.yaml (crear en raíz del proyecto)
services:
  - type: web
    name: supply-line-commander
    env: node
    buildCommand: cd server && npm install
    startCommand: cd server && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
```

**Pros:**
- Muy fácil de configurar
- Buena documentación
- Ideal para proyectos en desarrollo

**Contras:**
- Plan gratuito puede tener sleep ocasional
- Límite de horas en plan gratuito

---

### 2. **Fly.io** ⭐ MEJOR OPCIÓN GRATUITA

**Plan Gratuito:**
- ✅ 3 VMs compartidas gratis (256 MB RAM cada una)
- ✅ Sin sleep
- ✅ Muy generoso con recursos
- ✅ Excelente para WebSocket
- ✅ Global edge network (baja latencia)

**Configuración:**
```toml
# fly.toml (crear en raíz)
app = "supply-line-commander"
primary_region = "mad"  # Madrid (cambiar según tu ubicación)

[build]
  builder = "nixpacks"

[env]
  PORT = "8080"
  NODE_ENV = "production"

[[services]]
  internal_port = 8080
  protocol = "tcp"
  [[services.ports]]
    handlers = ["http"]
    port = 80
  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

[[services.http_checks]]
  interval = "10s"
  timeout = "2s"
  grace_period = "5s"
  method = "GET"
  path = "/api/status"
```

**Pros:**
- Muy generoso en plan gratuito
- Excelente rendimiento
- Sin sleep garantizado
- Ideal para WebSocket

**Contras:**
- Curva de aprendizaje un poco más alta
- Requiere CLI de Fly.io

---

### 3. **Cyclic.sh** ⭐ MÁS SIMPLE

**Plan Gratuito:**
- ✅ Ilimitado (con limitaciones razonables)
- ✅ Auto-deploy desde GitHub
- ✅ Sin sleep
- ✅ SSL automático

**Configuración:**
- Conecta tu repositorio de GitHub
- Detecta automáticamente Node.js
- Configura el start command: `cd server && npm start`

**Pros:**
- Extremadamente simple
- Sin configuración compleja
- Bueno para empezar rápido

**Contras:**
- Menos recursos que Fly.io
- Menos control sobre configuración

---

### 4. **Oracle Cloud Always Free** ⭐ MÁS RECURSOS (AVANZADO)

**Plan Siempre Gratis:**
- ✅ 2 VMs con 1 vCPU y 1 GB RAM cada una (PERMANENTE)
- ✅ 10 TB de transferencia de datos/mes
- ✅ Sin límite de tiempo
- ✅ Totalmente gratis para siempre

**Pros:**
- Recursos muy generosos
- Gratis para siempre (no trial)
- Control total

**Contras:**
- Requiere configuración manual de servidor
- Necesitas conocimientos básicos de Linux/DevOps
- Proceso de registro más complejo

**Guía Rápida:**
1. Crear cuenta en Oracle Cloud
2. Crear instancia "Always Free" (Ubuntu 22.04)
3. Instalar Node.js 18+
4. Configurar Nginx como reverse proxy
5. Usar PM2 para mantener el proceso activo

---

### 5. **DigitalOcean App Platform** 💰 PLAN BÁSICO ($5/mes)

**Plan Starter:**
- ✅ $5/mes (muy barato)
- ✅ 512 MB RAM
- ✅ 1 vCPU
- ✅ Sin sleep
- ✅ Auto-deploy desde GitHub

**Pros:**
- Muy barato
- Confiable
- Buena documentación

**Contras:**
- No es gratis (pero muy barato)

---

## 🚫 Opciones NO Recomendadas para tu Caso

### ❌ Vercel / Netlify
- No soportan WebSocket persistente bien
- Diseñados para aplicaciones serverless
- No adecuados para juegos en tiempo real

### ❌ Glitch.com
- Entra en sleep después de inactividad
- No ideal para juegos multijugador

### ❌ Replit
- Limitaciones de recursos en plan gratuito
- No ideal para producción

---

## 📝 Recomendación Final

### Para Empezar RÁPIDO (Hoy mismo):
**Usa Render.com** - Es el más fácil de configurar y tiene plan gratuito decente.

### Para Máximo Rendimiento Gratuito:
**Usa Fly.io** - Mejor plan gratuito, sin sleep, excelente para WebSocket.

### Si Quieres Aprender DevOps:
**Oracle Cloud Always Free** - Recursos generosos gratis para siempre, pero requiere más configuración.

---

## 🔧 Pasos para Desplegar en Render.com (Recomendado)

1. **Preparar el proyecto:**
   ```bash
   # Asegúrate de que server/package.json tenga el script "start"
   ```

2. **Crear render.yaml en la raíz:**
   ```yaml
   services:
     - type: web
       name: supply-line-commander
       env: node
       buildCommand: cd server && npm install
       startCommand: cd server && npm start
       envVars:
         - key: NODE_ENV
           value: production
         - key: PORT
           value: 10000
   ```

3. **En Render.com:**
   - Crear cuenta (gratis)
   - Conectar repositorio de GitHub
   - Seleccionar "New Web Service"
   - Render detectará automáticamente el render.yaml
   - Deploy automático

4. **Verificar:**
   - Tu juego estará en: `https://supply-line-commander.onrender.com`
   - El endpoint `/api/status` debería funcionar

---

## 🔧 Pasos para Desplegar en Fly.io

1. **Instalar Fly CLI:**
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Login:**
   ```bash
   fly auth login
   ```

3. **Crear app:**
   ```bash
   fly launch
   ```
   - Seguir el asistente
   - Usar el fly.toml proporcionado arriba

4. **Deploy:**
   ```bash
   fly deploy
   ```

---

## 💡 Optimizaciones para Reducir Costos

1. **Implementar Health Check:**
   ```javascript
   // En server.js, ya tienes /api/status
   // Render/Fly lo usarán para mantener el servidor activo
   ```

2. **Monitorear Uso:**
   - Revisa logs regularmente
   - Optimiza si consumes muchos recursos

3. **Considera Rate Limiting:**
   - Evita abusos que consuman recursos innecesariamente

---

## 📊 Comparativa Rápida

| Plataforma | Gratis | Sin Sleep | Facilidad | Recursos | Recomendado |
|------------|--------|-----------|------------|----------|-------------|
| **Render.com** | ✅ (750h/mes) | ⚠️ (puede sleep) | ⭐⭐⭐⭐⭐ | Medio | ⭐⭐⭐⭐ |
| **Fly.io** | ✅ (3 VMs) | ✅ | ⭐⭐⭐⭐ | Alto | ⭐⭐⭐⭐⭐ |
| **Cyclic.sh** | ✅ | ✅ | ⭐⭐⭐⭐⭐ | Medio | ⭐⭐⭐⭐ |
| **Oracle Cloud** | ✅ (siempre) | ✅ | ⭐⭐ | Muy Alto | ⭐⭐⭐ |
| **DigitalOcean** | ❌ ($5/mes) | ✅ | ⭐⭐⭐⭐ | Medio | ⭐⭐⭐ |

---

## 🎯 Mi Recomendación Personal

**Empieza con Render.com** porque:
1. Es el más fácil de configurar
2. Tienes plan gratuito decente para testing
3. Si crece el proyecto, puedes migrar fácilmente
4. No necesitas conocimientos de DevOps

**Si el plan gratuito de Render te limita**, migra a **Fly.io** que tiene mejor plan gratuito.

**Si quieres aprender y tener recursos permanentes**, prueba **Oracle Cloud Always Free**.

---

## 📞 Próximos Pasos

1. ✅ Elige una plataforma (recomiendo Render.com)
2. ✅ Prepara el proyecto (verifica package.json)
3. ✅ Crea cuenta y conecta GitHub
4. ✅ Deploy y prueba
5. ✅ Comparte el link con tus testers

¿Necesitas ayuda configurando alguna de estas opciones? Puedo ayudarte con los archivos de configuración específicos.

