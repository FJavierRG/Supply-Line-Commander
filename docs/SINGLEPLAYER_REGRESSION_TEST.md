# 🧪 TEST DE REGRESIÓN - SINGLEPLAYER

## 🎯 OBJETIVO
Verificar que el singleplayer sigue funcionando después de todos los cambios de multiplayer.

---

## ✅ CHECKLIST DE FUNCIONALIDADES:

### **INICIO:**
- [ ] El juego carga sin errores en consola
- [ ] Menú principal aparece correctamente
- [ ] Botón "Comenzar Misión" funciona
- [ ] Música del menú suena

### **CONSTRUCCIÓN:**
- [ ] Puedo construir FOBs
- [ ] Puedo construir edificios funcionales (planta, fábrica, etc.)
- [ ] Barra de progreso funciona
- [ ] Sonido de construcción se reproduce
- [ ] Currency se descuenta correctamente

### **EDIFICIOS FUNCIONALES:**
- [ ] Planta Nuclear: +2$/s por planta
- [ ] Fábrica de Camiones: +1 vehículo al HQ
- [ ] Centro de Ingenieros: +50% velocidad, carreteras visibles
- [ ] Hospital de Campaña: puede enviar ambulancias

### **CONVOYES:**
- [ ] Puedo enviar convoyes desde HQ
- [ ] Puedo enviar convoyes desde FOB
- [ ] Camiones se mueven correctamente
- [ ] Camiones entregan suministros
- [ ] Camiones regresan
- [ ] Sonido de convoy se reproduce

### **DRONES:**
- [ ] Puedo construir lanzadera
- [ ] Puedo comprar dron (150$)
- [ ] Dron se lanza hacia edificio enemigo
- [ ] Dron destruye edificio
- [ ] Sonido de dron funciona
- [ ] Explosión se ve y suena

### **ANTI-DRONES:**
- [ ] Puedo construir anti-drone
- [ ] Sonido característico al terminar construcción
- [ ] IA lanza dron → mi anti-drone lo intercepta
- [ ] Línea roja de detección aparece
- [ ] Anti-drone se autodestruye al disparar

### **SNIPERS:**
- [ ] Puedo usar sniper (40$)
- [ ] Sniper aplica efecto wounded a frente enemigo
- [ ] Icono wounded aparece
- [ ] Consumo del frente se duplica
- [ ] Efecto expira después de 15s

### **FRENTES:**
- [ ] Frentes se mueven correctamente
- [ ] Frentes consumen suministros
- [ ] Sonido "no ammo" cuando llegan a 0
- [ ] Frentes retroceden sin supplies

### **EMERGENCIAS MÉDICAS:**
- [ ] Se generan emergencias aleatorias
- [ ] Sonido "man down" al generarse
- [ ] Puedo enviar ambulancia desde HQ
- [ ] Ambulancia resuelve emergencia
- [ ] Emergencia expira si no respondo

### **TERRITORIO:**
- [ ] Fronteras se calculan correctamente
- [ ] Porcentajes se muestran en pantalla
- [ ] FOBs fuera de territorio se abandonan
- [ ] Solo puedo construir en mi territorio

### **IA ENEMIGA:**
- [ ] IA construye edificios
- [ ] IA envía convoyes
- [ ] IA lanza drones
- [ ] IA usa snipers
- [ ] IA responde a amenazas

### **VICTORIA/DERROTA:**
- [ ] Gano cuando mi frente llega a HQ enemigo
- [ ] Pierdo cuando frente enemigo llega a mi HQ
- [ ] Pantalla de victoria se muestra
- [ ] Música de victoria suena
- [ ] Estadísticas correctas
- [ ] Botón volver al menú funciona

---

## 🐛 BUGS POTENCIALES A VERIFICAR:

### **Validaciones de team:**
- ¿BuildingSystem valida correctamente team='ally'?
- ¿TerritorySystem funciona con myTeam='ally'?
- ¿Sprites funcionan con team='ally' y team='player2' (IA)?

### **Inicialización:**
- ¿game.isMultiplayer está en false por defecto?
- ¿game.myTeam está en 'ally' por defecto?
- ¿game.network existe pero no está conectado?

### **Sistemas duplicados:**
- ¿Se ejecutan los sistemas locales en singleplayer?
- ¿DroneSystem.update() se ejecuta?
- ¿MedicalSystem.update() se ejecuta?
- ¿FrontMovement.update() se ejecuta?

---

## 🔧 CÓDIGO A VERIFICAR:

### **src/Game.js - Inicialización:**
```javascript
this.isMultiplayer = false;  // ✅ Debe estar en false
this.myTeam = 'ally';        // ✅ Debe estar en 'ally'
```

### **src/Game.js - update():**
```javascript
if (this.isMultiplayer) {
    // NO ejecutar simulación
    return;
}

// SINGLEPLAYER: Ejecutar TODO
this.medicalSystem.update(dt * 1000);
this.frontMovement.update(dt * 1000);
this.convoyManager.update(dt);
this.droneSystem.update(dt);
// etc...
```

### **Validaciones team-based:**
```javascript
// DEBE funcionar con 'ally':
const myTeam = this.game.myTeam || 'ally';  // ✅ Fallback correcto

// PUEDE FALLAR:
if (myTeam === 'player1') { ... }
else if (myTeam === 'player2') { ... }
// ⚠️ Falta else { ... } para 'ally'
```

---

## 📝 PLAN DE ACCIÓN:

1. **Ejecutar singleplayer** y verificar consola
2. **Anotar errores** encontrados
3. **Arreglar validaciones** que asumen player1/player2
4. **Añadir fallbacks** para myTeam='ally'
5. **Testing completo** con el checklist

---

## 🚀 EJECUTAR TEST:

1. Abrir el juego
2. Click "Comenzar Misión" (singleplayer)
3. **Observar consola** (F12) - ¿hay errores?
4. Verificar cada punto del checklist
5. Reportar bugs encontrados

