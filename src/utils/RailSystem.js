// ===== SISTEMA DE VÍAS DE TREN =====
// Renderiza vías de tren trainStation↔FOB como segmentos rotados, por debajo de todo

export class RailSystem {
    constructor(game) {
        this.game = game;
        this.segments = []; // { x, y, angle }
        // Tamaño lógico de cada tramo dibujado (independiente del tamaño del PNG)
        this.segmentLength = 64; // largo del tramo a lo largo del camino
        this.segmentThickness = 28; // grosor visual de la vía
        this.signature = '';
    }
    
    clearAllRails() {
        this.segments = [];
    }
    
    // Revisa cambios en FOBs/Estaciones de TODOS los equipos y reconstruye vías automáticamente
    update() {
        // Detectar todos los equipos presentes en el juego (basándose en HQs)
        const teams = [...new Set(this.game.nodes.filter(n => n.type === 'hq').map(n => n.team))];
        
        // Construir firma para detectar cambios
        const teamSignatures = teams.map(team => {
            const hasTrainStation = this.game.nodes.some(n => 
                n.type === 'trainStation' && 
                n.team === team && 
                n.constructed && 
                !n.isAbandoning
            );
            
            const fobIds = this.game.nodes
                .filter(n => 
                    n.type === 'fob' && 
                    n.team === team && 
                    !n.isConstructing && 
                    !n.isAbandoning
                )
                .map(n => n.id)
                .sort()
                .join(',');
            
            return `${team}:${hasTrainStation ? 'T' : 'N'}|${fobIds}`;
        }).join('||');
        
        if (teamSignatures !== this.signature) {
            this.signature = teamSignatures;
            this.buildAllRails();
        }
    }

    buildAllRails() {
        this.clearAllRails();
        
        // Detectar todos los equipos presentes en el juego (basándose en HQs)
        const teams = [...new Set(this.game.nodes.filter(n => n.type === 'hq').map(n => n.team))];
        
        // Construir vías para TODOS los equipos
        for (const team of teams) {
            // Verificar si este equipo tiene trainStation
            const trainStations = this.game.nodes.filter(n => 
                n.type === 'trainStation' && 
                n.team === team && 
                n.constructed && 
                !n.isAbandoning
            );
            
            if (trainStations.length === 0) continue; // Este equipo no tiene estación, no construir vías
            
            // Buscar FOBs del equipo
            const fobs = this.game.nodes.filter(n => 
                n.type === 'fob' && 
                n.team === team && 
                !n.isConstructing && 
                !n.isAbandoning
            );
            
            // Construir vías desde cada estación a cada FOB
            for (const station of trainStations) {
                for (const fob of fobs) {
                    this.buildRail(station, fob);
                }
            }
            
            if (fobs.length > 0 && trainStations.length > 0) {
                console.log(`🚂 Vías construidas para ${team}: ${trainStations.length} estaciones → ${fobs.length} FOBs`);
            }
        }
    }
    
    buildRail(from, to) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const angle = Math.atan2(dy, dx); // respecto a eje X
        const length = Math.hypot(dx, dy);
        const stepLen = this.segmentLength;
        // Sin offset: cubrir de centro a centro, dejando medio tramo como máximo de solape en extremos
        const steps = Math.max(1, Math.floor(length / stepLen));
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        const startOffset = 0; // sin recorte: arrancar desde la misma estación
        
        // Empezar 1 tile antes (i = -1) y terminar 1 tile después (i = steps) 
        // para que las vías se vean entrando en los edificios
        for (let i = -1; i <= steps; i++) {
            // Colocar cada tramo centrado en su segmento (centro a centro)
            const t = startOffset + i * stepLen + stepLen / 2;
            const cx = from.x + nx * t;
            const cy = from.y + ny * t;
            // No usar variante aleatoria - solo un sprite de vías
            this.segments.push({ x: cx, y: cy, angle });
        }
    }
    
    render(ctx, assetManager) {
        // Si no hay vías construidas, no renderizar nada
        if (this.segments.length === 0) return;
        // Vías deben renderizarse debajo de TODO: se llama al inicio de Game.render()
        for (const seg of this.segments) {
            const sprite = assetManager.getSprite('rail-trail');
            // Para sprite vertical: alto = avance (largo), ancho = grosor
            const h = this.segmentLength;
            let w = this.segmentThickness;
            // Si tenemos dimensiones reales del sprite, ajustar relación de aspecto si fuera muy diferente
            if (sprite && sprite.width && sprite.height) {
                const naturalAspect = sprite.width / sprite.height; // ancho/grosor relativo
                // Escalar grosor según aspecto natural (clamp para no desmadrar)
                const adjusted = this.segmentLength * naturalAspect;
                w = Math.max(18, Math.min(56, adjusted));
            }
            ctx.save();
            ctx.translate(seg.x, seg.y);
            // Sprite vertical: su eje Y es el avance. Convertir ángulo X→Y (−90°)
            ctx.rotate(seg.angle - Math.PI / 2);
            if (sprite) {
                ctx.globalAlpha = 0.255; // 15% menos opaco que carreteras (0.3 * 0.85)
                // Dibujar centrado: de -h/2 a +h/2 (centro a centro)
                ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
                ctx.globalAlpha = 1;
            } else {
                // Fallback visual: rectángulo gris para verificar render
                ctx.fillStyle = 'rgba(100, 80, 60, 0.85)';
                ctx.fillRect(-w / 2, -h / 2, w, h);
            }
            ctx.restore();
        }
    }
}

