# 🏗️ EDIFICIOS FUNCIONALES - GUÍA DE TESTING

## 📋 Implementación Completada (2025-10-17)

Se han integrado completamente los efectos de los edificios funcionales en el servidor multiplayer.

---

## ✅ EDIFICIOS IMPLEMENTADOS

### 1. ⚡ Planta Nuclear (nuclearPlant)
**Costo:** 200$  
**Efecto:** +2$/s por cada planta construida

**Cómo testear:**
1. Construir una planta nuclear
2. Esperar 2 segundos a que termine la construcción
3. Verificar en la consola del servidor: `⚡ NuclearPlant completada - player1 recibirá +2$/s`
4. Observar el log de currency cada 5s: `💰 Currency: P1=XXX$ (+2/s plantas)`
5. Construir una segunda planta → Debería decir `(+4/s plantas)`

**Valores esperados:**
- Sin plantas: 2$/s base
- Con 1 planta: 4$/s (2 base + 2 bonus)
- Con 2 plantas: 6$/s (2 base + 4 bonus)
- Con 3 plantas: 8$/s (2 base + 6 bonus)

---

### 2. 🚚 Fábrica de Camiones (truckFactory)
**Costo:** 100$  
**Efectos:** 
- +1 vehículo al HQ (máximo)
- +15 capacidad de carga a heavy_trucks

**Cómo testear:**

**Parte A: Vehículos adicionales**
1. Verificar vehículos del HQ (debería ser 4/4)
2. Construir una truckFactory
3. Esperar 2 segundos a que termine
4. Verificar en consola del servidor: `🚚 TruckFactory completada - player1 HQ ahora tiene 5 vehículos`
5. Verificar HQ ahora tiene 5/5 vehículos disponibles
6. Construir segunda fábrica → HQ debería tener 6/6

**Parte B: Capacidad de carga**
1. Enviar un heavy_truck desde HQ SIN fábrica → Cargo: 15
2. Construir una truckFactory
3. Enviar un heavy_truck desde HQ → Debería decir en consola:
   `🚚 Heavy truck con 1 fábrica(s): capacidad = 30`
4. Construir segunda fábrica
5. Enviar un heavy_truck → Capacidad: 45 (15 base + 30 bonus)

**Valores esperados:**
- Sin fábricas: 15 de carga
- Con 1 fábrica: 30 de carga
- Con 2 fábricas: 45 de carga

---

### 3. 🔧 Centro de Ingenieros (engineerCenter)
**Costo:** 100$  
**Efecto:** +50% velocidad a todos los convoyes del equipo

**Cómo testear:**
1. Enviar un convoy desde HQ a un FOB (medir tiempo aproximado)
2. Construir un engineerCenter
3. Esperar 2s a que termine: `🔧 EngineerCenter completado - player1 tendrá +50% velocidad en convoyes`
4. Enviar otro convoy de la misma distancia
5. El segundo convoy debería llegar 50% más rápido

**Valores esperados:**
- Truck normal: 50px/s → 75px/s con engineer
- Heavy truck: 40px/s → 60px/s con engineer
- Ambulancia: 60px/s → 90px/s con engineer

**Ejemplo:**
- Distancia: 400px
- Sin engineer: 400/50 = 8 segundos
- Con engineer: 400/75 = 5.33 segundos

---

### 4. 🏥 Hospital de Campaña (campaignHospital)
**Costo:** 100$  
**Efecto:** Puede enviar ambulancias con rango limitado (260px)

**Cómo testear:**

**Parte A: Validación de rango**
1. Construir un hospital de campaña cerca del HQ
2. Esperar emergencia médica en un frente cercano (<260px)
3. Seleccionar hospital → click en frente con emergencia
4. Consola debería decir: `🏥 Hospital en rango: XXXpx <= 260px`
5. Ambulancia debería ser enviada

**Parte B: Rechazo fuera de rango**
1. Intentar enviar ambulancia desde hospital a frente lejano (>260px)
2. Consola debería decir: `⚠️ Hospital fuera de rango: XXXpx > 260px`
3. La solicitud debería ser rechazada

**Parte C: HQ sin restricción**
1. Intentar enviar ambulancia desde HQ a cualquier frente
2. Debería funcionar SIN importar la distancia (HQ no tiene restricción)

---

## 🧪 TESTING MULTIPLAYER

### Test 1: Sincronización de efectos
**Objetivo:** Verificar que los efectos se aplican correctamente para ambos jugadores

1. Iniciar partida 1v1
2. Player1 construye planta nuclear
3. Player2 debería ver la construcción
4. Verificar que solo el currency de Player1 aumenta (+2$/s)
5. Player2 construye su propia planta
6. Verificar que el currency de Player2 también aumenta

**Esperado:** Cada jugador recibe el bonus solo de SUS edificios

---

### Test 2: Competencia de economía
**Objetivo:** Verificar ventaja estratégica de plantas nucleares

1. Player1 construye 3 plantas nucleares (costo: 600$)
2. Player2 NO construye plantas
3. Después de 60 segundos:
   - Player1 debería tener: +60s × 8$/s = 480$ extra
   - Player2 debería tener: +60s × 2$/s = 120$ extra
   - Diferencia: 360$ de ventaja para Player1

**Esperado:** Player1 tiene ventaja económica masiva

---

### Test 3: Rush con truckFactory
**Objetivo:** Verificar saturación de convoyes

1. Player1 construye 2 truckFactories (HQ pasa a 6 vehículos)
2. Enviar 6 convoyes simultáneos desde HQ
3. Verificar que los 6 convoyes se envían correctamente
4. Verificar que cada uno lleva 45 suministros (15 + 30 bonus)
5. Total transportado: 6 × 45 = 270 suministros

**Esperado:** Capacidad logística superior

---

### Test 4: Velocidad con engineerCenter
**Objetivo:** Verificar ventaja táctica de velocidad

1. Crear emergencia médica en frente de Player1
2. Player2 (con engineer) envía ambulancia (debería llegar en ~5s)
3. Player1 (sin engineer) envía ambulancia igual distancia (debería llegar en ~7.5s)
4. Verificar diferencia de tiempo de respuesta

**Esperado:** Player2 resuelve emergencias 50% más rápido

---

### Test 5: Red de hospitales de campaña
**Objetivo:** Verificar cobertura médica avanzada

1. Player1 construye 3 hospitales de campaña distribuidos estratégicamente
2. Verificar que cubren un área amplia (cada uno 260px de rango)
3. Cuando hay emergencia, varios hospitales deberían poder responder
4. El más cercano dentro del rango es el óptimo

**Esperado:** Mejor cobertura médica que solo con HQ

---

## 📊 CHECKLIST DE TESTING

### Funcionalidad Básica
- [ ] Plantas nucleares generan currency correcta
- [ ] TruckFactory añade vehículos al HQ
- [ ] TruckFactory aumenta carga de heavy trucks
- [ ] EngineerCenter acelera convoyes
- [ ] CampaignHospital valida rango correctamente
- [ ] CampaignHospital rechaza fuera de rango
- [ ] HQ puede enviar ambulancias sin restricción

### Sincronización Multiplayer
- [ ] Player1 y Player2 ven las construcciones del otro
- [ ] Efectos se aplican solo al dueño del edificio
- [ ] Currency sincronizada correctamente
- [ ] Número de vehículos sincronizado
- [ ] Velocidad de convoyes consistente entre clientes

### Logs del Servidor
- [ ] `⚡ NuclearPlant completada` aparece en consola
- [ ] `🚚 TruckFactory completada - HQ tiene X vehículos`
- [ ] `🔧 EngineerCenter completado`
- [ ] `🏥 CampaignHospital completado`
- [ ] `💰 Currency: P1=XXX$ (+X/s plantas)`
- [ ] `🚚 Heavy truck con X fábrica(s): capacidad = XX`
- [ ] `🏥 Hospital en rango: XXXpx <= 260px`

### Edge Cases
- [ ] ¿Qué pasa si se destruye una planta nuclear? (currency debería reducirse)
- [ ] ¿Qué pasa si se destruye truckFactory? (vehículos deberían reducirse)
- [ ] ¿Múltiples edificios del mismo tipo se acumulan?
- [ ] ¿Edificios en construcción NO dan bonus?

---

## 🐛 BUGS CONOCIDOS / PENDIENTES

### Implementado ✅
- ✅ Bonus de currency de plantas nucleares
- ✅ Bonus de vehículos de truckFactory
- ✅ Bonus de carga de truckFactory
- ✅ Bonus de velocidad de engineerCenter
- ✅ Validación de rango de campaignHospital

### Pendiente ⏳
- ⏳ Destrucción de edificios (actualizar efectos al destruir)
- ⏳ Visualización de rango de hospital en cliente
- ⏳ Límite de ambulancias por hospital (actualmente ilimitado)
- ⏳ Serializar actionRange de campaignHospital al cliente

---

## 🎯 PRÓXIMOS PASOS

1. **Testing manual completo** de los 5 edificios
2. **Verificar sincronización** en partida 1v1
3. **Implementar destrucción** de edificios (actualizar efectos)
4. **Visualizar bonus** en UI del cliente (opcional)
5. **Pasar a Fase 2.1**: Drones al servidor

---

## 📝 NOTAS DE IMPLEMENTACIÓN

### Archivos modificados:
- `server/game/GameStateManager.js`:
  - Líneas 387-411: Currency pasiva con bonus de plantas
  - Líneas 113-145: Función `applyBuildingEffects()`
  - Líneas 277-287: Bonus de carga de truckFactory
  - Líneas 507-513: Bonus de velocidad de engineerCenter
  - Líneas 340-353: Validación de rango de campaignHospital

### Lógica implementada:
1. **nuclearPlant**: Se cuenta en cada tick cuántas plantas tiene cada equipo y se suma al income pasivo
2. **truckFactory**: Al completar construcción, incrementa maxVehicles y availableVehicles del HQ
3. **engineerCenter**: Al calcular velocidad de convoy, verifica si hay engineer y multiplica × 1.5
4. **campaignHospital**: Al enviar ambulancia, calcula distancia y rechaza si >260px
5. **Bonus de carga**: Al crear convoy heavy_truck, suma +15 por cada fábrica construida

---

## 🎉 ESTADO FINAL

**IMPLEMENTACIÓN COMPLETA** ✅  
Todos los edificios funcionales están integrados en el servidor multiplayer.

**PRÓXIMO PASO:** Testing exhaustivo en partida 1v1 real.

