# 🧪 Test Rápido de IA Enemiga

## Paso 1: Iniciar el juego

1. Abre el servidor local:
   ```bash
   python -m http.server 8000
   ```

2. Abre el navegador: `http://localhost:8000`

3. Inicia una partida (Mission 20)

---

## Paso 2: Activar Debug de IA

1. Abre la consola del navegador (F12)

2. Ejecuta:
   ```javascript
   window.game.enemyAI.setDebugMode(true);
   ```

3. Deberías ver: `🤖 IA Debug Mode: ON`

---

## Paso 3: Observar el comportamiento

### ¿Qué debería pasar?

**Cada 2 segundos**, la IA pensará y tomará decisiones:

1. **INMEDIATAMENTE (primeros 2 segundos)**:
   - Los FOBs enemigos empiezan VACÍOS (0% suministros)
   - La IA detecta esto y envía camiones desde el HQ enemigo
   - Deberías ver: `IA: Enviando suministros al FOB enemigo (0% suministros)`
   - Verás camiones rojos moverse del HQ enemigo hacia los FOBs

2. **A partir de 30-60 segundos**:
   - Los FOBs enemigos empiezan a consumir suministros
   - Cuando un FOB baje de 50% → Verás en consola:
     ```
     🤖 IA: Enviando suministros al FOB enemigo (45% suministros)
     ```
   - Un camión enemigo saldrá del HQ enemigo hacia el FOB

3. **A partir de 60-90 segundos**:
   - Los Frentes enemigos empiezan a quedarse sin munición
   - Cuando un Frente baje de 50% → Verás:
     ```
     🤖 IA: Enviando suministros al Frente enemigo (32% suministros)
     ```
   - La IA intentará enviar desde el FOB más cercano
   - Si no hay FOB disponible → Envía desde el HQ

---

## Paso 4: Verificar Estadísticas

Al final de la partida (o en cualquier momento):

```javascript
window.game.enemyAI.getStats();
```

**Output esperado**:
```javascript
{
    decisions: 25,      // Número de decisiones tomadas
    suppliesSent: 18,   // Convoyes enviados
    medicsSent: 0       // (Aún no implementado)
}
```

Si `suppliesSent > 0` → ✅ **La IA funciona correctamente**

---

## Paso 5: Tests Avanzados

### Test: Desactivar IA

```javascript
window.game.enemyAI.setEnabled(false);
```

- Los FOBs enemigos dejarán de recibir suministros
- Los Frentes enemigos se quedarán sin munición
- El enemigo retrocederá → ¡Victoria fácil!

### Test: Reactivar IA

```javascript
window.game.enemyAI.setEnabled(true);
```

- La IA volverá a funcionar normalmente

### Test: Forzar pensamiento

```javascript
window.game.enemyAI.think();
```

- Fuerza un ciclo de pensamiento inmediato
- Útil para debugging

---

## ✅ Checklist de Verificación

- [ ] La consola muestra logs de IA cuando debug está activo
- [ ] Los camiones enemigos salen del HQ hacia FOBs
- [ ] Los camiones enemigos salen de FOBs hacia Frentes
- [ ] Las estadísticas aumentan con el tiempo
- [ ] Desactivar IA hace que el enemigo deje de funcionar
- [ ] No hay errores en la consola

---

## 🐛 Si algo falla...

### No veo logs de IA

**Solución**:
```javascript
window.game.enemyAI.setDebugMode(true);
window.game.enemyAI.think(); // Forzar pensamiento
```

### La IA no envía nada

**Posibles causas**:
1. Los nodos enemigos aún tienen >50% suministros (espera más)
2. El HQ enemigo no tiene vehículos disponibles (poco probable)
3. Hay un error → Revisa la consola

**Debug**:
```javascript
// Verificar nodos enemigos
window.game.nodes.filter(n => n.type.includes('enemy'));

// Ver HQ enemigo
window.game.nodes.find(n => n.type === 'enemy_hq');
```

### Errores en consola

Si ves errores rojos, cópialos y revisa `EnemyAISystem.js` línea indicada.

---

## 🎯 Comportamiento Esperado

### IA Funcionando Correctamente:

1. ✅ Piensa cada 2 segundos (no spam)
2. ✅ Solo envía 1 convoy por ciclo de pensamiento
3. ✅ Prioriza FOBs sobre Frentes
4. ✅ Busca el FOB más cercano con recursos
5. ✅ Usa el HQ como fallback

### Lo que la IA NO hace (todavía):

- ❌ Construir edificios
- ❌ Lanzar drones
- ❌ Responder a emergencias médicas
- ❌ Estrategias avanzadas

Estas reglas se pueden añadir fácilmente siguiendo la guía en `ENEMY_AI_GUIDE.md`.

---

¡Disfruta testeando la IA! 🤖

