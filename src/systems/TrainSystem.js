// ===== SISTEMA DE TRENES (CLIENTE - SOLO VISUAL) =====
// Gestiona la visualización de trenes en el cliente

import { Train } from '../entities/train.js';

export class TrainSystem {
    constructor(game) {
        this.game = game;
        this.trains = [];
    }
    
    /**
     * Añade un tren visual desde el servidor
     */
    addTrain(trainData) {
        const fromNode = this.game.nodes.find(n => n.id === trainData.fromId);
        const toNode = this.game.nodes.find(n => n.id === trainData.toId);
        
        if (!fromNode || !toNode) {
            console.error('⚠️ No se encontraron los nodos para el tren:', trainData.fromId, trainData.toId);
            return;
        }
        
        const train = new Train(fromNode, toNode, this.game);
        train.id = trainData.trainId; // Usar ID del servidor
        train.progress = trainData.progress || 0;
        train.targetProgress = trainData.progress || 0;
        train.returning = trainData.returning || false;
        train.updateVisualPosition();
        
        this.trains.push(train);
    }
    
    /**
     * Actualiza todos los trenes - SOLO VISUAL
     */
    update(dt) {
        for (const train of this.trains) {
            train.update(dt);
        }
    }
    
    /**
     * Actualiza el progress de un tren desde el servidor
     */
    updateTrainProgress(trainId, progress, returning) {
        const train = this.trains.find(t => t.id === trainId);
        if (train) {
            train.updateServerProgress(progress, returning);
        }
    }
    
    /**
     * Elimina un tren cuando llega o se destruye
     */
    removeTrain(trainId) {
        const index = this.trains.findIndex(t => t.id === trainId);
        if (index !== -1) {
            this.trains.splice(index, 1);
        }
    }
    
    /**
     * Limpia todos los trenes
     */
    clear() {
        this.trains = [];
    }
}

