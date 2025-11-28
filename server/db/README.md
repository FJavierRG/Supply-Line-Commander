# 🗄️ Sistema de Base de Datos

## Arquitectura

El juego usa un sistema de base de datos **híbrido**:

- **Desarrollo local**: SQLite (`server/data/dev.db`)
- **Producción**: Supabase (PostgreSQL)

El cambio es automático según `NODE_ENV`.

---

## Configuración

### Variables de entorno (`.env`):

```env
# development | production
NODE_ENV=development

# Solo necesario en producción
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
```

---

## UUIDs Especiales

### Mazo por Defecto:
```
ID: 00000000-0000-0000-0000-000000000001
```

Este UUID es **fijo y conocido** para facilitar queries:
```js
import { DEFAULT_DECK_ID } from './db/database.js';
const deck = await db.getDeck(DEFAULT_DECK_ID);
```

### Mazos de Usuarios:
Todos los mazos de usuarios usan **UUID v4 generados**:
```
Ejemplo: 550e8400-e29b-41d4-a916-446655440000
```

---

## API Unificada

El módulo `database.js` exporta una API consistente para ambos entornos:

```js
import { db, DEFAULT_DECK_ID } from './db/database.js';

// Crear mazo
await db.createDeck({ id: randomUUID(), user_id: 'player1', ... });

// Obtener mazo
await db.getDeck(deckId);

// Obtener mazos de usuario
await db.getUserDecks(userId);

// Actualizar mazo
await db.updateDeck(deckId, { name: 'Nuevo nombre' });

// Eliminar mazo
await db.deleteDeck(deckId);

// Obtener default
await db.getDefaultDeck(); // Retorna el mazo con UUID especial
```

---

## Migración de Datos

Si necesitas migrar mazos de localStorage a la BD:

```js
// Script de migración (ejemplo)
const oldDecks = JSON.parse(localStorage.getItem('decks'));
for (const deck of oldDecks) {
  await fetch('/api/decks', {
    method: 'POST',
    body: JSON.stringify(deck)
  });
}
```

---

## Respaldo Manual

### SQLite (dev):
```bash
cp server/data/dev.db server/data/dev.db.backup
```

### Supabase (prod):
Dashboard → Database → Backups (automático cada 24h en free tier)





