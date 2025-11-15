// ===== SISTEMA DE CARRETERAS =====
// Renderiza carreteras HQ↔FOB como segmentos rotados, por debajo de todo

export class RoadSystem {
    constructor(game) {
        this.game = game;
        this.segments = []; // { x, y, angle, variant }
        // Tamaño lógico de cada tramo dibujado (independiente del tamaño del PNG)
        this.segmentLength = 64; // largo del tramo a lo largo del camino
        this.segmentThickness = 28; // grosor visual de la carretera
        this.signature = '';
    }
    
    clearAllRoads() {
        this.segments = [];
    }
    
    // Revisa cambios en FOBs/Centros de TODOS los equipos y repavimenta automáticamente
    update() {
        // Detectar todos los equipos presentes en el juego (basándose en HQs)
        const teams = [...new Set(this.game.nodes.filter(n => n.type === 'hq').map(n => n.team))];
        
        // Construir firma para detectar cambios
        const teamSignatures = teams.map(team => {
            const hasEngineer = this.game.nodes.some(n => 
                n.type === 'engineerCenter' && 
                n.team === team && 
                n.constructed && 
                !n.isAbandoning &&
                !n.disabled && 
                !n.broken // 🆕 MODULARIZADO: No mantener carreteras si está disabled o roto
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
            
            return `${team}:${hasEngineer ? 'E' : 'N'}|${fobIds}`;
        }).join('||');
        
        if (teamSignatures !== this.signature) {
            this.signature = teamSignatures;
            this.buildAllRoads();
        }
    }

    buildAllRoads() {
        this.clearAllRoads();
        
        // Detectar todos los equipos presentes en el juego (basándose en HQs)
        const teams = [...new Set(this.game.nodes.filter(n => n.type === 'hq').map(n => n.team))];
        
        // Construir carreteras para TODOS los equipos
        for (const team of teams) {
            // Verificar si este equipo tiene engineerCenter (funcional)
            const hasEngineer = this.game.nodes.some(n => 
                n.type === 'engineerCenter' && 
                n.team === team && 
                n.constructed && 
                !n.isAbandoning &&
                !n.disabled && 
                !n.broken // 🆕 MODULARIZADO: No mantener carreteras si está disabled o roto
            );
            
            if (!hasEngineer) continue; // Este equipo no tiene engineer, no construir carreteras
            
            // Buscar HQ del equipo
            const hq = this.game.nodes.find(n => n.type === 'hq' && n.team === team);
            if (!hq) continue;
            
            // Buscar FOBs del equipo
            const fobs = this.game.nodes.filter(n => 
                n.type === 'fob' && 
                n.team === team && 
                !n.isConstructing && 
                !n.isAbandoning
            );
            
            for (const fob of fobs) {
                this.buildRoad(hq, fob);
            }
            
            if (fobs.length > 0) {
                console.log(`🛣️ Carreteras construidas para ${team}: ${fobs.length} FOBs`);
            }
        }
        
        // Log desactivado: spam excesivo en consola
    }
    
    buildRoad(from, to) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const angle = Math.atan2(dy, dx); // respecto a eje X
        const length = Math.hypot(dx, dy);
        const stepLen = this.segmentLength;
        // Sin offset: cubrir de centro a centro, dejando medio tramo como máximo de solape en extremos
        const steps = Math.max(1, Math.floor(length / stepLen));
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        const startOffset = 0; // sin recorte: arrancar desde el mismo HQ
        
        // Empezar 1 tile antes (i = -1) y terminar 1 tile después (i = steps) 
        // para que las carreteras se vean entrando en los edificios
        for (let i = -1; i <= steps; i++) {
            // Colocar cada tramo centrado en su segmento (centro a centro)
            const t = startOffset + i * stepLen + stepLen / 2;
            const cx = from.x + nx * t;
            const cy = from.y + ny * t;
            const variant = ((i + 100) % 4) + 1; // +100 para evitar negativos en el módulo
            this.segments.push({ x: cx, y: cy, angle, variant });
        }
    }
    
    render(ctx, assetManager) {
        // Si no hay carreteras construidas, no renderizar nada
        if (this.segments.length === 0) return;
        // Carreteras deben renderizarse debajo de TODO: se llama al inicio de Game.render()
        for (const seg of this.segments) {
            const sprite = assetManager.getSprite(`road-${seg.variant}`);
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
                ctx.globalAlpha = 0.3; // subir opacidad +20%
                // Dibujar centrado: de -h/2 a +h/2 (centro a centro)
                ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
                ctx.globalAlpha = 1;
            } else {
                // Fallback visual: rectángulo gris para verificar render
                ctx.fillStyle = 'rgba(80, 80, 80, 0.85)';
                ctx.fillRect(-w / 2, -h / 2, w, h);
            }
            ctx.restore();
        }
    }
}


