## ✅ Refactorización Sistema de Mazos (Cliente+Servidor)

### 🎯 Objetivos
- Eliminar `localStorage` como fuente de verdad.
- Usar siempre la API (`DeckService`) + Supabase.
- Reducir payload en el lobby: enviar solo `deckId`.
- Mantener Arsenal/Lobby/Store funcionando sin duplicar lógica.

---

### Fase 1 — Nuevo DeckManager (cliente)
- [ ] Crear `DeckManager` v2 que:
  - [ ] Use `DeckService` para `getDefaultDeck`, `getUserDecks`, `create/update/delete`.
  - [ ] Mantenga caché en memoria y sólo guarde `lastSelectedDeckId` en `localStorage`.
  - [ ] Exponga `ensureReady()`/`isReady` para esperar la carga inicial.
  - [ ] Mantenga listeners (`onDefaultDeckUpdated`, `onDecksChanged`) para Arsenal/Lobby.
  - [ ] Siga calculando costos/validaciones usando `serverNodes` (no hardcodear límites).
- [ ] Actualizar `Game` para inicializar este DeckManager y esperar a que esté listo antes de abrir el Arsenal/Lobby.

### Fase 2 — Arsenal con DeckService
- [ ] Reemplazar todas las llamadas directas a `DeckManager` por las nuevas APIs (async).
- [ ] `show()` del Arsenal debe hacer `await deckManager.ensureReady()` y manejar estados de carga/errores.
- [ ] Guardar/crear mazos: usar `await deckManager.saveDeck()` / `createDeck()` (propagando errores al usuario).
- [ ] El selector de mazos (`deck-selector`) debe renderizar la lista que venga del nuevo manager.
- [ ] Integrar notificaciones cuando la API falle (mensaje claro).

### Fase 3 — Lobby / Network
- [ ] Lobby usa `deckManager.getAllDecks()` para poblar dropdowns (esperar `ensureReady()`).
- [ ] Evento `select_race` del cliente envía solo `{ roomId, deckId }`.
- [ ] UI del lobby debe manejar estado “sin mazos” mostrando mensaje para ir al Arsenal.
- [ ] Store/TopBar/etc. deben leer mazo activo desde el nuevo manager (no `localStorage`).

### Fase 4 — Servidor (select_race)
- [ ] Handler `select_race` recibe `deckId`, busca en BD via `db.getDeck(deckId)` o usa `DEFAULT_DECK`.
- [ ] Verifica que `deck.user_id === player.userId` (anti hack).
- [ ] Ejecuta las mismas validaciones previas (costes, disciplinas, duplicados) antes de asignar.
- [ ] Guarda en `player.selectedDeck = deck` (unidades/banquillo/disciplinas) para iniciar partida.

### Fase 5 — Limpieza & Tests
- [ ] Eliminar `src/systems/DeckManager.js.backup`.
- [ ] Quitar todo rastro de `localStorage` en mazos.
- [ ] Revisar Store/TopBar por dependencias residuales.
- [ ] Pruebas manuales:
  - [ ] Crear/editar/borrar mazo.
  - [ ] Seleccionar mazo en lobby y entrar a partida.
  - [ ] Cambiar de cuenta → ver sólo mazos propios.
- [ ] Actualizar documentación (`PLAN_SISTEMA_USUARIOS_Y_MAZOS.md`) con el nuevo flujo.




