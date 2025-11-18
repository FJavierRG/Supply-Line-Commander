// ===== RENDERIZADO DE VEHÍCULOS =====
// Maneja el renderizado de todos los tipos de vehículos: convoys, trenes, helicópteros, tanques, etc.

/**
 * VehicleRenderer - Renderiza vehículos de combate y transporte
 * Responsabilidades:
 * - Renderizado de convoys (camiones, ambulancias, etc.)
 * - Renderizado de trenes
 * - Renderizado de helicópteros
 * - Renderizado de vehículos de combate (tanques, artillados ligeros)
 * - Renderizado de previews de vehículos
 * - Renderizado de iconos de helicópteros
 */
export class VehicleRenderer {
    constructor(ctx, assetManager = null, game = null) {
        this.ctx = ctx;
        this.assetManager = assetManager;
        this.game = game;
        this._heliFrameCount = 0; // Frame count para animación de helicópteros
    }
    
    /**
     * Renderiza un convoy
     * @param {Object} convoy - Convoy a renderizar
     */
    renderConvoy(convoy) {
        // 🆕 SKIP: Los helicópteros ya no se renderizan como convoys
        // Ahora son entidades persistentes renderizadas en renderHelicopter()
        if (convoy.vehicleType === 'helicopter') {
            return;
        }
        
        // Si está volviendo, renderizar en blanco y negro semi-transparente
        const isReturning = convoy.returning;
        const vehicleColor = isReturning ? '#888' : (convoy.vehicle?.color || '#4CAF50'); // Fallback a verde si no hay color
        const opacity = isReturning ? 0.8 : 1; // 80% opacidad para convoyes que regresan (más visible)
        
        // Detectar si es un convoy enemigo (origen es nodo enemigo)
        const myTeam = this.game?.myTeam || 'ally';
        const isEnemy = convoy.originBase && convoy.originBase.team !== myTeam;
        
        this.ctx.globalAlpha = opacity;
        
        // Usar sprites para todos los vehículos (incluida ambulancia y camión de reparación)
        let vehicleSpriteKey;
        if (convoy.isMedical) {
            vehicleSpriteKey = 'ambulance';
        } else if (convoy.vehicleType === 'repair' || convoy.vehicleType === 'repair_truck' || convoy.isRepair) {
            vehicleSpriteKey = 'repair_truck';
        } else {
            vehicleSpriteKey = convoy.vehicleType;
        }
        // No usar sprites "returning"; aplicamos estilos dinámicamente
        const sprite = this.assetManager?.getVehicleSprite(vehicleSpriteKey, false);
        const angle = convoy.getAngle();
        
        if (sprite) {
            // RENDERIZADO CON SPRITE
            // Sin glowing effect para camiones normales, solo ambulancias
            this.ctx.shadowColor = convoy.isMedical ? '#ff3333' : 'transparent';
            this.ctx.shadowBlur = convoy.isMedical ? 30 : 0;
            
            this.ctx.save();
            this.ctx.translate(convoy.x, convoy.y);
            
            // Determinar dirección basada en movimiento hacia el objetivo
            let shouldFlip = false;
            
            // Obtener nodo destino según estado (yendo o regresando)
            const destinationNode = convoy.returning ? convoy.fromBase : convoy.toBase;
            
            if (destinationNode) {
                const dx = destinationNode.x - convoy.x;
                
                // LÓGICA SIMPLIFICADA: Siempre usar la misma lógica independientemente del modo
                // Si va hacia la izquierda (dx < 0), flip
                // Si va hacia la derecha (dx > 0), no flip
                shouldFlip = dx < 0;
            } else {
                // Fallback: lógica antigua para compatibilidad
                shouldFlip = isEnemy ? !isReturning : isReturning;
            }
            
            // COMPENSAR MIRROR VIEW: Si la vista está mirroreada, NO invertir el flip
            // porque el mundo ya está volteado horizontalmente
            // if (this.mirrorViewApplied) {
            //     shouldFlip = !shouldFlip;
            // }
            
            if (shouldFlip) {
                this.ctx.scale(-1, 1);
            }
            
            // Dibujar sprite (rectangular, +95% + 25% = 1.95 * 1.25 = 2.4375)
            const baseSize = 32 * 2.4375;
            const spriteWidth = baseSize * 1.2; // mantener relación de aspecto alargada
            const spriteHeight = baseSize;
            // Filtro gris para returning
            this.ctx.filter = isReturning ? 'grayscale(100%)' : 'none';
            this.ctx.drawImage(
                sprite,
                -spriteWidth / 2,
                -spriteHeight / 2,
                spriteWidth,
                spriteHeight
            );
            
            this.ctx.restore();
            this.ctx.filter = 'none';
            this.ctx.shadowBlur = 0;
            
            // 🆕 NOTA: La barra de cargo para helicópteros ahora se renderiza en renderHelicopter()
            // Los helicópteros ya no son convoys, sino entidades persistentes
        } else {
            // FALLBACK: RENDERIZADO PLACEHOLDER (código original)
            
            // Ambulancias médicas: círculo rojo grande (+30% + 25% = 1.3 * 1.25 = 1.625)
            const size = convoy.isMedical ? 19 : 16; // 12*1.625=19.5≈19, 10*1.625=16.25≈16
            const shadowBlur = convoy.isMedical ? 30 : (isReturning ? 10 : 18);
            
            // Sombra
            this.ctx.shadowColor = vehicleColor;
            this.ctx.shadowBlur = shadowBlur;
            
            // Vehículo
            this.ctx.fillStyle = vehicleColor;
            this.ctx.beginPath();
            this.ctx.arc(convoy.x, convoy.y, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Icono según tipo de vehículo
            this.ctx.save();
            this.ctx.translate(convoy.x, convoy.y);
            if (isReturning) {
                // Solo mirar a la izquierda, sin rotación
            } else {
                // Ir al objetivo mirando a la derecha (sin rotación)
            }
            
            if (convoy.vehicleType === 'helicopter') {
                // Icono de helicóptero: símbolo 🚁 (+30% + 25% = 1.625)
                // No hay rotación en ningún caso ahora
                this.ctx.font = '29px Arial'; // 18*1.625=29.25≈29
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('🚁', 0, 0);
            } else {
                // Flecha normal para camiones (+30% + 25% = 1.625)
                this.ctx.fillStyle = isReturning ? '#aaa' : '#fff';
                this.ctx.beginPath();
                if (isReturning) {
                    // Flecha hacia la izquierda (12*1.625=19.5≈20, 6*1.625=9.75≈10)
                    this.ctx.moveTo(-20, 0);
                    this.ctx.lineTo(0, -10);
                    this.ctx.lineTo(0, 10);
                } else {
                    // Flecha hacia delante (según ángulo)
                    this.ctx.moveTo(20, 0);
                    this.ctx.lineTo(0, -10);
                    this.ctx.lineTo(0, 10);
                }
                this.ctx.fill();
            }
            
            this.ctx.restore();
            this.ctx.shadowBlur = 0;
        }
        
        // Línea al destino - SOLO MOSTRAR PARA CONVOYES PROPIOS (no enemigos)
        // Y solo si está activo el modo debug visual (F1)
        if (!isEnemy && this.game && this.game.debugVisualMode) {
            const destinationNode = convoy.returning ? convoy.fromBase : convoy.toBase;
            
            if (destinationNode) {
                this.ctx.strokeStyle = vehicleColor + (isReturning ? '20' : '40');
                this.ctx.lineWidth = isReturning ? 1.2 : 2.4;
                this.ctx.setLineDash([6, 6]);
                this.ctx.beginPath();
                this.ctx.moveTo(convoy.x, convoy.y);
                this.ctx.lineTo(destinationNode.x, destinationNode.y);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    /**
     * Renderiza un tren
     * @param {Object} train - Tren a renderizar
     */
    renderTrain(train) {
        if (!train) return;
        
        const sprite = this.assetManager?.getSprite('train');
        
        if (sprite) {
            this.ctx.save();
            this.ctx.translate(train.x, train.y);
            
            // Determinar dirección basada en movimiento hacia el objetivo (igual que convoyes)
            let shouldFlip = false;
            
            // Obtener nodo destino según estado (yendo o regresando)
            const destinationNode = train.returning ? train.fromBase : train.toBase;
            
            if (destinationNode) {
                const dx = destinationNode.x - train.x;
                // Si va hacia la izquierda (dx < 0), flip horizontal
                // Si va hacia la derecha (dx > 0), no flip
                shouldFlip = dx < 0;
            }
            
            if (shouldFlip) {
                this.ctx.scale(-1, 1);
            }
            
            // Dibujar sprite del tren (10% más pequeño: multiplicar por 0.9)
            const baseSize = 32 * 2.5 * 0.9; // 10% más pequeño
            const spriteWidth = baseSize * 1.5;
            const spriteHeight = baseSize;
            
            this.ctx.drawImage(
                sprite,
                -spriteWidth / 2,
                -spriteHeight / 2,
                spriteWidth,
                spriteHeight
            );
            
            this.ctx.restore();
        } else {
            // Fallback: círculo gris
            this.ctx.fillStyle = '#666';
            this.ctx.beginPath();
            this.ctx.arc(train.x, train.y, 20, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    /**
     * Renderiza un helicóptero persistente
     * @param {Object} heli - Helicóptero a renderizar
     */
    renderHelicopter(heli) {
        if (!heli || heli.state !== 'flying') return;
        
        // Obtener nodos de origen y destino
        const fromNode = this.game.nodes.find(n => n.id === heli.currentNodeId);
        const toNode = this.game.nodes.find(n => n.id === heli.targetNodeId);
        
        if (!fromNode || !toNode) return;
        
        // Calcular posición basada en el progress (ya interpolado en Game.updateHelicopterPosition)
        const progress = heli.progress || 0;
        const x = fromNode.x + (toNode.x - fromNode.x) * progress;
        const y = fromNode.y + (toNode.y - fromNode.y) * progress;
        
        // Determinar si es enemigo
        const isEnemy = heli.team !== this.game.myTeam;
        const heliColor = heli.team === 'player1' ? '#4CAF50' : '#FF5722';
        
        // 🆕 NUEVO: Animación de aspas - Alternar entre helicopter y helicopter2 cada 30 frames
        // Usar frame count global para sincronizar todos los helicópteros
        if (!this._heliFrameCount) this._heliFrameCount = 0;
        this._heliFrameCount++;
        
        const useFrame2 = Math.floor(this._heliFrameCount / 30) % 2 === 1;
        const spriteKey = useFrame2 ? 'helicopter2' : 'helicopter';
        const sprite = this.assetManager?.getSprite(spriteKey);
        
        if (sprite) {
            // RENDERIZADO CON SPRITE (sin glow/shadow)
            this.ctx.save();
            this.ctx.translate(x, y);
            
            // Determinar dirección (izquierda o derecha)
            const dx = toNode.x - fromNode.x;
            let shouldFlip = dx < 0; // Si va hacia la izquierda, flip
            
            // COMPENSAR MIRROR VIEW: Si la vista está mirroreada, NO invertir el flip
            // porque el mundo ya está volteado horizontalmente
            // if (this.mirrorViewApplied) {
            //     shouldFlip = !shouldFlip;
            // }
            
            if (shouldFlip) {
                this.ctx.scale(-1, 1);
            }
            
            // 🆕 NUEVO: Tamaño aumentado +20% (rectangular, +95% + 25% = 2.4375, luego *1.2 = 2.925)
            const baseSize = 32 * 2.925; // Aumentado de 2.4375 a 2.925 (+20%)
            const spriteWidth = baseSize * 1.2; // mantener relación de aspecto alargada
            const spriteHeight = baseSize;
            
            this.ctx.drawImage(
                sprite,
                -spriteWidth / 2,
                -spriteHeight / 2,
                spriteWidth,
                spriteHeight
            );
            
            this.ctx.restore();
            
            // Renderizar barra de cargo capacity
            const percentage = (heli.cargo / 100) * 100; // cargo ya está en 0-100
            const barWidth = 40;
            const barHeight = 6;
            const barY = y - 40; // Posición más arriba para no tapar el helicóptero
            
            // Fondo de la barra (gris oscuro)
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(
                x - barWidth / 2,
                barY - barHeight / 2,
                barWidth,
                barHeight
            );
            
            // Barra de progreso (verde a amarillo a rojo)
            let barColor;
            if (percentage > 50) {
                barColor = '#4ecca3'; // Verde (100-50%)
            } else if (percentage > 0) {
                barColor = '#f39c12'; // Amarillo (50-0%)
            } else {
                barColor = '#e74c3c'; // Rojo (0%)
            }
            
            this.ctx.fillStyle = barColor;
            this.ctx.fillRect(
                x - barWidth / 2,
                barY - barHeight / 2,
                (barWidth * percentage) / 100,
                barHeight
            );
            
            // Borde de la barra
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(
                x - barWidth / 2,
                barY - barHeight / 2,
                barWidth,
                barHeight
            );
            
            // Mostrar porcentaje de cargo
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                `${Math.round(percentage)}%`,
                x,
                barY - 10
            );
        }
        
        // Línea al destino - SOLO MOSTRAR PARA HELICÓPTEROS PROPIOS
        if (!isEnemy) {
            this.ctx.strokeStyle = heliColor + '40';
            this.ctx.lineWidth = 2.4;
            this.ctx.setLineDash([6, 6]);
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(toNode.x, toNode.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    /**
     * Renderiza un vehículo de combate genérico (método base para tanques y artillados)
     * @param {Object} vehicle - Vehículo a renderizar
     * @param {Object} config - Configuración del vehículo
     */
    renderCombatVehicle(vehicle, config) {
        const { getSpriteKey, fallbackEmoji, size = 100, shadowEnabled = true } = config;
        
        // Obtener sprite key (puede ser función o string)
        const spriteKey = typeof getSpriteKey === 'function' 
            ? getSpriteKey(vehicle) 
            : getSpriteKey;
        
        const vehicleSprite = this.assetManager.getSprite(spriteKey);
        
        if (vehicleSprite) {
            // Dibujar sprite del vehículo con sombra (opcional)
            if (shadowEnabled) {
                this.ctx.shadowColor = vehicle.team === 'player1' ? '#4ecca3' : '#e74c3c';
                this.ctx.shadowBlur = 15;
            } else {
                this.ctx.shadowColor = 'transparent';
                this.ctx.shadowBlur = 0;
            }
            
            this.ctx.save();
            this.ctx.translate(vehicle.x, vehicle.y);
            
            // Determinar dirección basada en movimiento hacia el objetivo
            let shouldFlip = false;
            if (vehicle.targetId) {
                const targetNode = this.game?.nodes?.find(n => n.id === vehicle.targetId);
                if (targetNode) {
                    const dx = targetNode.x - vehicle.x;
                    shouldFlip = dx < 0; // Si va hacia la izquierda, flip
                }
            }
            
            if (shouldFlip) {
                this.ctx.scale(-1, 1);
            }
            
            this.ctx.drawImage(
                vehicleSprite,
                -size/2,
                -size/2,
                size,
                size
            );
            
            this.ctx.restore();
            this.ctx.shadowBlur = 0;
        } else {
            // Fallback: círculo con color del equipo
            const color = vehicle.team === 'player1' ? '#4ecca3' : '#e74c3c';
            if (shadowEnabled) {
                this.ctx.shadowColor = color;
                this.ctx.shadowBlur = 25;
            } else {
                this.ctx.shadowColor = 'transparent';
                this.ctx.shadowBlur = 0;
            }
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(vehicle.x, vehicle.y, 15, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            
            // Icono de fallback
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(fallbackEmoji || '🚗', vehicle.x, vehicle.y);
        }
        
        // Línea hacia el objetivo eliminada - ya no se muestra
    }
    
    /**
     * Renderiza un tanque
     * @param {Object} tank - Tanque a renderizar
     */
    renderTank(tank) {
        this.renderCombatVehicle(tank, {
            getSpriteKey: (tank) => {
                // Determinar qué sprite usar según el estado
                if (tank.state === 'shooting' || tank.showShotOnImpact) {
                    // Mostrar sprite de shot durante el estado shooting o cuando ocurre el impacto
                    return 'vehicle-tank-shot';
                } else {
                    // Alternar entre tank_1 y tank_2 mientras se mueve
                    return tank.spriteFrame === 1 ? 'vehicle-tank-1' : 'vehicle-tank-2';
                }
            },
            fallbackEmoji: '🛡️',
            size: 100
        });
    }
    
    /**
     * Renderiza un artillado ligero
     * @param {Object} lightVehicle - Artillado ligero a renderizar
     */
    renderLightVehicle(lightVehicle) {
        this.renderCombatVehicle(lightVehicle, {
            getSpriteKey: (lightVehicle) => {
                // Determinar qué sprite usar según el estado
                if (lightVehicle.state === 'shooting' || lightVehicle.showShotOnImpact) {
                    // Mostrar sprite de disparo durante el estado shooting o cuando ocurre el impacto
                    return 'vehicle-light-2';
                } else {
                    // Sprite normal mientras se mueve
                    return 'vehicle-light-1';
                }
            },
            fallbackEmoji: '🚛',
            size: 100,
            shadowEnabled: false // 🆕 Sin glow/sombra verde para el artillado ligero
        });
    }
    
    /**
     * Renderiza preview genérico de vehículo de combate (método base)
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @param {Object} hoveredBase - Base sobre la que se hace hover
     * @param {Object} config - Configuración del preview
     */
    renderCombatVehiclePreview(x, y, hoveredBase, config) {
        const { 
            actionName, 
            validColor, 
            textColor, 
            label, 
            additionalValidation = null,
            getInvalidLabel = null
        } = config;
        
        const radius = 30;
        
        // 🎯 Validar objetivos permitidos
        let validTarget = false;
        if (hoveredBase && hoveredBase.team !== this.game?.myTeam) {
            // Obtener validTargets desde la configuración del servidor
            const validTargets = this.game?.serverBuildingConfig?.actions?.[actionName]?.validTargets || 
                                 ['nuclearPlant', 'antiDrone', 'campaignHospital', 'droneLauncher', 'truckFactory', 'engineerCenter', 'intelRadio', 'intelCenter', 'aerialBase', 'vigilanceTower'];
            
            validTarget = validTargets.includes(hoveredBase.type) && 
                         hoveredBase.constructed && 
                         !hoveredBase.isConstructing && 
                         !hoveredBase.isAbandoning;
            
            // Validación adicional si se proporciona
            if (validTarget && additionalValidation) {
                validTarget = additionalValidation(hoveredBase);
            }
        }
        
        // Círculo vacío con borde punteado
        this.ctx.strokeStyle = validTarget ? validColor : 'rgba(255, 0, 0, 0.8)';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([8, 8]);
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Si NO es un objetivo válido, mostrar X roja
        if (!validTarget) {
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 4;
            const crossSize = 15;
            
            // X roja
            this.ctx.beginPath();
            this.ctx.moveTo(x - crossSize, y - crossSize);
            this.ctx.lineTo(x + crossSize, y + crossSize);
            this.ctx.moveTo(x + crossSize, y - crossSize);
            this.ctx.lineTo(x - crossSize, y + crossSize);
            this.ctx.stroke();
        }
        
        // Etiqueta
        this.ctx.fillStyle = validTarget ? textColor : '#ff0000';
        this.ctx.font = 'bold 11px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        let displayLabel = label;
        
        if (!validTarget) {
            if (getInvalidLabel) {
                displayLabel = getInvalidLabel(hoveredBase);
            } else {
                // Fallback genérico
                if (hoveredBase && (hoveredBase.type === 'fob' || hoveredBase.type === 'hq')) {
                    displayLabel = 'NO FOBs/HQs';
                } else {
                    displayLabel = 'NO VÁLIDO';
                }
            }
        }
        
        this.ctx.fillText(displayLabel, x, y - radius - 12);
    }
    
    /**
     * Renderiza preview del tanque
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @param {Object} hoveredBase - Base sobre la que se hace hover
     */
    renderTankPreview(x, y, hoveredBase) {
        this.renderCombatVehiclePreview(x, y, hoveredBase, {
            actionName: 'tankLaunch',
            validColor: 'rgba(78, 204, 163, 0.8)',
            textColor: '#4ecca3',
            label: 'TANQUE',
            getInvalidLabel: (hoveredBase) => {
                if (hoveredBase && (hoveredBase.type === 'fob' || hoveredBase.type === 'hq')) {
                    return 'NO FOBs/HQs';
                }
                return 'NO VÁLIDO';
            }
        });
    }
    
    /**
     * Renderiza preview del artillado ligero
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @param {Object} hoveredBase - Base sobre la que se hace hover
     */
    renderLightVehiclePreview(x, y, hoveredBase) {
        this.renderCombatVehiclePreview(x, y, hoveredBase, {
            actionName: 'lightVehicleLaunch',
            validColor: 'rgba(255, 140, 0, 0.8)',
            textColor: '#ff8c00',
            label: 'ARTILLADO',
            additionalValidation: (hoveredBase) => !hoveredBase.broken,
            getInvalidLabel: (hoveredBase) => {
                if (hoveredBase && (hoveredBase.type === 'fob' || hoveredBase.type === 'hq')) {
                    return 'NO FOBs/HQs';
                } else if (hoveredBase && hoveredBase.broken) {
                    return 'YA ROTO';
                }
                return 'NO VÁLIDO';
            }
        });
    }
    
    /**
     * Renderiza icono de helicóptero en un nodo
     * @param {Object} node - Nodo donde renderizar el icono
     */
    renderHelicopterIcon(node) {
        // Posición del icono: a la izquierda del nodo
        const iconX = node.x - node.radius - 25; // 25px a la izquierda del borde
        const iconY = node.y;
        
        // Obtener sprite del icono de helicóptero
        const helicopterSprite = this.assetManager?.getSprite('ui-chopper-icon');
        if (helicopterSprite) {
            this.ctx.save();
            
            // Calcular dimensiones manteniendo proporciones del sprite original
            const spriteWidth = helicopterSprite.width;   // 1023px
            const spriteHeight = helicopterSprite.height; // 386px
            const aspectRatio = spriteWidth / spriteHeight; // 1023/386 ≈ 2.65
            
            // Usar la altura como referencia y calcular el ancho proporcional
            const iconHeight = 32;
            const iconWidth = iconHeight * aspectRatio; // 32 * 2.65 ≈ 85px
            
            // Dibujar el icono manteniendo proporciones
            this.ctx.drawImage(
                helicopterSprite,
                iconX - iconWidth / 2,
                iconY - iconHeight / 2,
                iconWidth,
                iconHeight
            );
            
            // Dibujar un pequeño indicador de cantidad si hay más de 1
            if (node.availableHelicopters > 1) {
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 12px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.strokeStyle = '#000';
                this.ctx.lineWidth = 2;
                
                const textX = iconX;
                const textY = iconY + iconHeight / 2 + 15;
                
                this.ctx.strokeText(node.availableHelicopters.toString(), textX, textY);
                this.ctx.fillText(node.availableHelicopters.toString(), textX, textY);
            }
            
            this.ctx.restore();
        }
    }
}

