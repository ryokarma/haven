/**
 * Configuration centralisée du jeu
 * Contient toutes les constantes et paramètres du jeu
 */
export class GameConfig {
    // Taille de la carte
    static readonly MAP_SIZE = 50;

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
        // Configuration des lacs
        lakes: {
            attempts: 10,   // Nombre d'essais pour placer des lacs
            minDistance: 30, // Distance minimum entre les lacs
            sizes: [3, 4]    // Tailles possibles (3x3 ou 4x4)
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
    'fountain_placeholder': {
        assetKey: 'rock', // Utilise rock en attendant
        pixelHeight: 96,
        originX: 0.5,
        originY: 0.78
    }
};
