/**
 * Configuration centralisée du jeu
 * Contient toutes les constantes et paramètres du jeu
 */
export class GameConfig {
    // Taille de la carte
    static readonly MAP_SIZE = 100;

    // Dimensions de la maison
    static readonly HOUSE = {
        x: 15,
        y: 15,
        width: 6,
        height: 6
    };

    // Calibrage visuel
    static readonly ASSET_Y_OFFSET = 20;

    // Paramètres de génération de la carte
    static readonly MAP_GENERATION = {
        obstacleChance: 0.15,
        treeVsRockRatio: 0.5,
        resources: {
            cotton: {
                chance: 0.05,
                color: 0xFFFFFF
            },
            clay: {
                chance: 0.08,
                color: 0x8B4513
            }
        },
        // Configuration du bruit de Perlin pour l'eau
        noise: {
            scale: 0.04,        // Un zoom de 0.04 donne des structures d'environ 25 blocs
            waterThreshold: 0.3 // Les valeurs sous 0.3 deviennent de l'eau
        },
        // Configuration des lacs (Legacy / Complémentaire si besoin)
        lakes: {
            attempts: 5,
            minDistance: 30,
            sizes: [3, 4]
        }
    };

    // Paramètres de mouvement
    static readonly MOVEMENT = {
        stepDuration: 250,
        cameraSmoothness: 0.08
    };

    // Paramètres de la caméra
    static readonly CAMERA = {
        initialZoom: 1.2,
        minZoom: 0.5,
        maxZoom: 2,
        zoomSpeed: 0.1
    };

    // Paramètres du sélecteur de tuile
    static readonly SELECTOR = {
        lineWidth: 2,
        normalColor: 0xffffff,
        normalAlpha: 0.6,
        obstacleColor: 0xeab308,
        obstacleAlpha: 0.8
    };

    // Paramètres des lucioles
    static readonly FIREFLIES = {
        radius: 300,
        lifespanMin: 4000,
        lifespanMax: 8000,
        speedMin: 10,
        speedMax: 25,
        gravityY: -5,
        frequency: 500
    };

    // Couleurs des tuiles d'herbe
    static readonly GRASS_COLORS = [
        0xA5D6A7,
        0x81C784,
        0x66BB6A,
        0x4CAF50,
        0x43A047
    ];

    // Effets des objets consommables
    // Effets des objets consommables
    static readonly ITEM_EFFECTS: Record<string, { hunger?: number; energy?: number; thirst?: number; health?: number }> = {
        'Pomme': { hunger: 15, health: 5 },
        'Bois': { energy: 2 },
        'Pierre': { hunger: 2 },
        'Flasque d\'eau': { thirst: 20, energy: 2 }
    };
}

/**
 * Définition technique d'un asset graphique
 */
export interface AssetDefinition {
    assetKey: string;     // Nom du fichier/clé texture
    pixelHeight: number;  // Hauteur de l'image (ref)
    originX: number;      // Ancrage horizontal (0.5 = milieu)
    originY: number;      // Ancrage vertical (1.0 = bas, idéal pour iso)
}

/**
 * Manifeste centralisé des assets du jeu
 */
export const ASSET_MANIFEST: Record<string, AssetDefinition> = {
    'tree': {
        assetKey: 'tree',
        pixelHeight: 128, // Hauteur hypothétique
        originX: 0.5,
        originY: 0.82     // Ajustement final
    },
    'rock': {
        assetKey: 'rock',
        pixelHeight: 64,
        originX: 0.5,
        originY: 0.72     // Ajustement final
    },
    'cotton_bush': {
        assetKey: 'tex_cotton_bush',
        pixelHeight: 64,
        originX: 0.5,
        originY: 1.0
    },
    'clay_mound': {
        assetKey: 'tex_clay_mound',
        pixelHeight: 64,
        originX: 0.5,
        originY: 0.5
    },
    'watering_can': {
        assetKey: 'tex_watering_can',
        pixelHeight: 32,
        originX: 0.5,
        originY: 0.8
    },
    'clay_pot': {
        assetKey: 'tex_pot',
        pixelHeight: 32,
        originX: 0.5,
        originY: 0.8
    },
    'furnace': {
        assetKey: 'tex_furnace',
        pixelHeight: 64,
        originX: 0.5,
        originY: 0.8  // Centrage vertical simple
    },
    'tex_seeds_cotton': {
        assetKey: 'tex_seeds_cotton',
        pixelHeight: 32,
        originX: 0.5,
        originY: 0.5
    },
    'clay_pot_seeded': {
        assetKey: 'tex_pot_seeded',
        pixelHeight: 32,
        originX: 0.5,
        originY: 0.8
    },
    'tex_pot_watered': {
        assetKey: 'tex_pot_watered',
        pixelHeight: 32,
        originX: 0.5,
        originY: 0.8
    },
    'clay_pot_watered': {
        assetKey: 'tex_pot_watered',
        pixelHeight: 32,
        originX: 0.5,
        originY: 0.8
    },
    'tex_pot_ready': {
        assetKey: 'tex_pot_ready',
        pixelHeight: 48, // Taller for plant
        originX: 0.5,
        originY: 0.9
    },
    'clay_pot_ready': {
        assetKey: 'tex_pot_ready',
        pixelHeight: 48,
        originX: 0.5,
        originY: 0.9
    },
    'fountain_placeholder': {
        assetKey: 'rock', // Utilise rock en attendant
        pixelHeight: 96,
        originX: 0.5,
        originY: 0.78
    }
};
