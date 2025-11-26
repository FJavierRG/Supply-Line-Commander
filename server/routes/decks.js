// ===== ENDPOINTS DE MAZOS =====
// API RESTful para gestionar mazos de jugadores

import { Router } from 'express';
import { db, DEFAULT_DECK_ID } from '../db/database.js';
import { randomUUID } from 'crypto';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { SERVER_NODE_CONFIG } from '../config/serverNodes.js';
import { validateDisciplineList } from '../config/disciplines.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ============================================================
// GET /api/decks - Obtener mazos del usuario autenticado
// ============================================================
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const decks = await db.getUserDecks(userId);
        
        res.json({
            success: true,
            decks
        });
    } catch (error) {
        console.error('Error obteniendo mazos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener mazos'
        });
    }
});

// ============================================================
// GET /api/decks/default - Obtener mazo por defecto
// UUID especial: 00000000-0000-0000-0000-000000000001
// ============================================================
router.get('/default/get', async (req, res) => {
    try {
        const defaultDeck = await db.getDefaultDeck();
        
        if (!defaultDeck) {
            return res.status(404).json({
                success: false,
                error: 'Mazo por defecto no encontrado'
            });
        }
        
        res.json({
            success: true,
            deck: defaultDeck
        });
    } catch (error) {
        console.error('Error obteniendo mazo por defecto:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener mazo por defecto'
        });
    }
});

// ============================================================
// POST /api/decks - Crear nuevo mazo
// ============================================================
router.post('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, units, bench = [], disciplines = [] } = req.body;
        
        // Validaciones
        if (!name || !units) {
            return res.status(400).json({
                success: false,
                error: 'name y units son requeridos'
            });
        }
        
        // Validar que todas las unidades existan y estén habilitadas
        const enabled = SERVER_NODE_CONFIG.gameplay.enabled || {};
        const costs = SERVER_NODE_CONFIG.costs || {};
        
        const validUnits = units.filter(unitId => enabled[unitId] === true);
        if (validUnits.length !== units.length) {
            return res.status(400).json({
                success: false,
                error: 'Algunas unidades no están habilitadas'
            });
        }
        
        // Validar que HQ y FOB estén presentes
        if (!validUnits.includes('hq')) {
            validUnits.unshift('hq');
        }
        if (!validUnits.includes('fob')) {
            const hqIndex = validUnits.indexOf('hq');
            validUnits.splice(hqIndex + 1, 0, 'fob');
        }
        
        // Validar límite de puntos del mazo
        const deckCost = validUnits
            .filter(unitId => unitId !== 'hq' && unitId !== 'fob')
            .reduce((total, unitId) => total + (costs[unitId] || 0), 0);
        
        const deckPointLimit = GAME_CONFIG.deck.pointLimit;
        if (deckCost > deckPointLimit) {
            return res.status(400).json({
                success: false,
                error: `El coste del mazo (${deckCost}) excede el límite (${deckPointLimit})`
            });
        }
        
        // Validar banquillo
        const validBenchUnits = bench.filter(unitId => enabled[unitId] === true);
        const benchCost = validBenchUnits.reduce((total, unitId) => total + (costs[unitId] || 0), 0);
        const benchPointLimit = GAME_CONFIG.deck.benchPointLimit;
        
        if (benchCost > benchPointLimit) {
            return res.status(400).json({
                success: false,
                error: `El coste del banquillo (${benchCost}) excede el límite (${benchPointLimit})`
            });
        }
        
        // Validar que no haya duplicados entre mazo y banquillo
        const deckSet = new Set(validUnits);
        const benchSet = new Set(validBenchUnits);
        const intersection = [...deckSet].filter(x => benchSet.has(x));
        if (intersection.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Unidades duplicadas entre mazo y banquillo: ${intersection.join(', ')}`
            });
        }
        
        // Validar disciplinas
        const maxDisciplines = GAME_CONFIG.disciplines.maxEquipped;
        if (disciplines.length > maxDisciplines) {
            return res.status(400).json({
                success: false,
                error: `Máximo ${maxDisciplines} disciplinas permitidas`
            });
        }
        
        const disciplineValidation = validateDisciplineList(disciplines);
        if (!disciplineValidation.valid) {
            return res.status(400).json({
                success: false,
                error: disciplineValidation.errors[0]
            });
        }
        
        // Crear mazo con UUID real
        const deck = {
            id: randomUUID(), // UUID v4 estándar
            user_id: userId,
            name: name.trim(),
            units: validUnits,
            bench: validBenchUnits,
            disciplines: disciplines,
            is_default: false
        };
        
        const createdDeck = await db.createDeck(deck);
        
        console.log(`✅ Mazo creado: ${createdDeck.name} (${createdDeck.id}) para usuario ${userId}`);
        
        res.json({
            success: true,
            deck: createdDeck
        });
    } catch (error) {
        console.error('Error creando mazo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear mazo'
        });
    }
});

// ============================================================
// GET /api/decks/:deckId - Obtener un mazo por ID
// ============================================================
router.get('/:deckId', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { deckId } = req.params;
        
        const deck = await db.getDeck(deckId);
        
        if (!deck) {
            return res.status(404).json({
                success: false,
                error: 'Mazo no encontrado'
            });
        }
        
        // Verificar ownership (excepto para el mazo por defecto)
        if (!deck.is_default && deck.user_id !== userId) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permiso para acceder a este mazo'
            });
        }
        
        res.json({
            success: true,
            deck: deck
        });
    } catch (error) {
        console.error('Error obteniendo mazo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener mazo'
        });
    }
});

// ============================================================
// PUT /api/decks/:deckId - Actualizar mazo existente
// ============================================================
router.put('/:deckId', requireAuth, async (req, res) => {
    try {
        const { deckId } = req.params;
        const { name, units, bench, disciplines } = req.body;
        
        // Obtener mazo existente
        const existingDeck = await db.getDeck(deckId);
        if (!existingDeck) {
            return res.status(404).json({
                success: false,
                error: 'Mazo no encontrado'
            });
        }
        
        // Verificar propiedad del mazo
        if (existingDeck.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permiso para modificar este mazo'
            });
        }
        
        // No permitir modificar el mazo por defecto
        if (existingDeck.is_default) {
            return res.status(400).json({
                success: false,
                error: 'No se puede modificar el mazo por defecto'
            });
        }
        
        const updates = {};
        
        if (name) updates.name = name.trim();
        if (units) {
            // Validar unidades igual que en POST
            const enabled = SERVER_NODE_CONFIG.gameplay.enabled || {};
            const validUnits = units.filter(unitId => enabled[unitId] === true);
            updates.units = validUnits;
        }
        if (bench) {
            const enabled = SERVER_NODE_CONFIG.gameplay.enabled || {};
            const validBenchUnits = bench.filter(unitId => enabled[unitId] === true);
            updates.bench = validBenchUnits;
        }
        if (disciplines) {
            const disciplineValidation = validateDisciplineList(disciplines);
            if (!disciplineValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: disciplineValidation.errors[0]
                });
            }
            updates.disciplines = disciplines;
        }
        
        const updatedDeck = await db.updateDeck(deckId, updates);
        
        console.log(`✅ Mazo actualizado: ${updatedDeck.name} (${updatedDeck.id})`);
        
        res.json({
            success: true,
            deck: updatedDeck
        });
    } catch (error) {
        console.error('Error actualizando mazo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar mazo'
        });
    }
});

// ============================================================
// DELETE /api/decks/:deckId - Eliminar mazo
// ============================================================
router.delete('/:deckId', requireAuth, async (req, res) => {
    try {
        const { deckId } = req.params;
        
        // Obtener mazo existente
        const existingDeck = await db.getDeck(deckId);
        if (!existingDeck) {
            return res.status(404).json({
                success: false,
                error: 'Mazo no encontrado'
            });
        }
        
        // Verificar propiedad del mazo
        if (existingDeck.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permiso para eliminar este mazo'
            });
        }
        
        // No permitir eliminar el mazo por defecto
        if (existingDeck.is_default) {
            return res.status(400).json({
                success: false,
                error: 'No se puede eliminar el mazo por defecto'
            });
        }
        
        await db.deleteDeck(deckId);
        
        console.log(`🗑️ Mazo eliminado: ${existingDeck.name} (${deckId})`);
        
        res.json({
            success: true,
            message: 'Mazo eliminado correctamente'
        });
    } catch (error) {
        console.error('Error eliminando mazo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar mazo'
        });
    }
});

export default router;

