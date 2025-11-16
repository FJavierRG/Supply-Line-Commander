// ===== SELECTOR DE ACCIONES =====
// Selecciona la mejor acción de una lista de acciones evaluadas

export class AIActionSelector {
    /**
     * Selecciona la mejor acción de una lista de acciones evaluadas
     * @param {Array} evaluatedActions - Lista de acciones evaluadas (ya ordenadas por score)
     * @param {number} currency - Currency disponible del equipo
     * @returns {Object|null} Mejor acción que se pueda pagar, o null si no hay ninguna
     */
    static selectBestAction(evaluatedActions, currency) {
        if (!evaluatedActions || evaluatedActions.length === 0) {
            return null;
        }
        
        // Filtrar acciones que se puedan pagar
        const affordableActions = evaluatedActions.filter(action => 
            action.cost !== null && 
            action.cost !== undefined && 
            action.cost <= currency
        );
        
        if (affordableActions.length === 0) {
            return null; // No hay acciones que se puedan pagar
        }
        
        // La lista ya está ordenada por score descendente, retornar la primera
        return affordableActions[0];
    }
}

