# 🆕 EJEMPLO: Añadir Nueva Nación

## Paso 1: Añadir Configuración en `races.js`

```javascript
// En src/config/races.js - RACE_CONFIG
stealthOps: {
    id: 'stealthOps',
    name: 'Operaciones Encubiertas',
    description: 'Ejército especializado en infiltración y sabotaje',
    color: '#9b59b6',
    icon: 'race-stealth',
    
    buildings: [
        'intelRadio',        // Solo intel, no FOBs
        'campaignHospital'   // Hospitales móviles
    ],
    
    consumables: [
        'fobSabotage',       // Sabotaje especializado
        'sniperStrike'       // Ataques precisos
    ],
    
    specialMechanics: {
        canUseFOBs: false,           // No usa FOBs
        transportSystem: 'stealth',  // Sistema de transporte encubierto
        specialVehicles: ['stealth_transport'], // Vehículo especial
        stealthBonus: 0.3            // 30% menos detección
    }
}
```

## Paso 2: Añadir Vehículo Especial en `constants.js`

```javascript
// En src/config/constants.js - VEHICLE_TYPES
stealth_transport: {
    name: 'Transporte Encubierto',
    capacity: 20,
    speed: 3.0,  // Más rápido
    color: '#9b59b6',
    spriteKey: 'stealth_vehicle',
    specialProperties: {
        stealth: true,
        raceSpecific: 'stealthOps'
    }
}
```

## Paso 3: Añadir Rutas Especiales en `constants.js`

```javascript
// En src/config/constants.js - RACE_SPECIAL_ROUTES
stealthOps: {
    hq: ['front', 'fob'],  // Puede ir a FOBs enemigos
    fob: ['hq', 'front']
}
```

## Paso 4: Registrar Sprite en `AssetManager.js`

```javascript
// En src/systems/AssetManager.js - ASSET_PATHS
'stealth_vehicle': 'assets/sprites/vehicles/stealth_transport.png',
```

## ✅ ¡LISTO!

**Sin tocar ningún otro archivo**, la nueva nación:
- ✅ Aparecerá en la selección de naciones
- ✅ Tendrá sus edificios específicos
- ✅ Usará su vehículo especial
- ✅ Tendrá sus rutas especiales
- ✅ Funcionará automáticamente en singleplayer

## 🎯 Ventajas de esta Arquitectura:

1. **Un solo archivo** para configurar naciones
2. **Funciones automáticas** que detectan nuevas mecánicas
3. **Escalable** - añadir 10 naciones más es igual de fácil
4. **Mantenible** - cambios centralizados
5. **Extensible** - nuevas mecánicas se añaden fácilmente


