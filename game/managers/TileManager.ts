import Phaser from 'phaser';
import { IsoMath } from '../utils/IsoMath';
import { GameConfig } from '../config/GameConfig';

/**
 * Type de tuile dans la grille
 */
export enum TileType {
    EMPTY = 0,
    OBSTACLE = 1,
    WATER = 2,
}

/**
 * Données d'une cellule de la grille
 */
export interface GridCell {
    type: TileType;
    walkable: boolean;
}

/**
 * Direction cardinale pour le bitmasking (4-bits)
 */
enum AutotileDirection {
    NORTH = 1,  // 0001
    EAST = 2,   // 0010
    SOUTH = 4,  // 0100
    WEST = 8,   // 1000
}

/**
 * Gestionnaire de tuiles
 * Gère la création et le placement des tuiles sur la carte avec support d'auto-tiling
 */
export class TileManager {
    private scene: Phaser.Scene;
    private tileGroup: Phaser.GameObjects.Group;
    private tileVariations: string[];

    // Couleurs pour visualiser les différentes configurations d'auto-tiling (placeholder)
    // Palette bleue pour représenter l'eau avec différentes nuances selon les connexions
    private autotileColors: number[] = [
        0x1e3a5f, // 0:  Aucune connexion (eau isolée - bleu foncé)
        0x2c5f8d, // 1:  Nord
        0x3a7ca5, // 2:  Est
        0x4682b4, // 3:  Nord + Est
        0x5899c2, // 4:  Sud
        0x6bb6d0, // 5:  Nord + Sud
        0x7ec8dd, // 6:  Est + Sud
        0x91d5e8, // 7:  Nord + Est + Sud
        0x4a90b5, // 8:  Ouest
        0x5ba3c8, // 9:  Nord + Ouest
        0x6cb5da, // 10: Est + Ouest
        0x7dc7ec, // 11: Nord + Est + Ouest
        0x8dd9fe, // 12: Sud + Ouest
        0x9de5ff, // 13: Nord + Sud + Ouest
        0xadf1ff, // 14: Est + Sud + Ouest
        0xbdfdff, // 15: Toutes les directions (eau entièrement connectée - bleu clair)
    ];

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.tileGroup = scene.add.group();
        this.tileVariations = [
            'tile_flat_0',
            'tile_flat_1',
            'tile_flat_2',
            'tile_flat_3',
            'tile_flat_4'
        ];
    }

    /**
     * Calcule l'index d'auto-tiling (0-15) basé sur les voisins cardinaux (4-bits)
     * 
     * @param x Position X dans la grille
     * @param y Position Y dans la grille
     * @param gridData Données de la grille
     * @param tileType Type de tuile à vérifier pour les connexions
     * @returns Index de frame (0-15) correspondant à la configuration de voisinage
     */
    calculateAutotile(
        x: number,
        y: number,
        gridData: (GridCell | number)[][],
        tileType: TileType = TileType.WATER
    ): number {
        let bitmask = 0;

        // Vérifier le voisin Nord (y - 1)
        if (this.isSameType(x, y - 1, gridData, tileType)) {
            bitmask |= AutotileDirection.NORTH;
        }

        // Vérifier le voisin Est (x + 1)
        if (this.isSameType(x + 1, y, gridData, tileType)) {
            bitmask |= AutotileDirection.EAST;
        }

        // Vérifier le voisin Sud (y + 1)
        if (this.isSameType(x, y + 1, gridData, tileType)) {
            bitmask |= AutotileDirection.SOUTH;
        }

        // Vérifier le voisin Ouest (x - 1)
        if (this.isSameType(x - 1, y, gridData, tileType)) {
            bitmask |= AutotileDirection.WEST;
        }

        return bitmask;
    }

    /**
     * Vérifie si une cellule voisine est du même type
     * 
     * @param x Position X dans la grille
     * @param y Position Y dans la grille
     * @param gridData Données de la grille
     * @param targetType Type de tuile à vérifier
     * @returns true si la cellule est du même type, false sinon
     */
    private isSameType(
        x: number,
        y: number,
        gridData: (GridCell | number)[][],
        targetType: TileType
    ): boolean {
        // Vérifier les limites de la grille
        if (!gridData || gridData.length === 0 || !gridData[0]) {
            return false;
        }

        if (y < 0 || y >= gridData.length || x < 0 || x >= gridData[0].length) {
            return false;
        }

        const cell = gridData[y]?.[x];

        if (cell === undefined) {
            return false;
        }

        // Support pour l'ancien format (number[][]) et le nouveau format (GridCell[][])
        if (typeof cell === 'number') {
            // Ancien format : considérer que 2 = water
            return cell === targetType;
        } else {
            // Nouveau format
            return cell.type === targetType;
        }
    }

    /**
     * Place une tuile à la position de grille spécifiée
     * Si la tuile est de type eau, applique l'auto-tiling
     * 
     * @param x Position X dans la grille
     * @param y Position Y dans la grille
     * @param key Clé de texture de base
     * @param originX Origine X de la carte
     * @param originY Origine Y de la carte
     * @param gridData (Optionnel) Données de la grille pour l'auto-tiling
     * @param tileType (Optionnel) Type de tuile
     * @returns L'image de la tuile créée
     */
    placeTile(
        x: number,
        y: number,
        key: string,
        originX: number,
        originY: number,
        gridData?: (GridCell | number)[][],
        tileType?: TileType
    ): Phaser.GameObjects.Image {
        const pos = IsoMath.gridToIso(x, y, originX, originY);
        const tile = this.scene.add.image(pos.x, pos.y, key);
        tile.setOrigin(0.5, 0.5);
        tile.setDepth(-1000);

        // Appliquer l'auto-tiling si c'est une tuile d'eau et que les données de grille sont fournies
        if (tileType === TileType.WATER && gridData) {
            const autotileIndex = this.calculateAutotile(x, y, gridData, TileType.WATER);

            // Pour l'instant, appliquer un tint de couleur basé sur l'index
            // Cela sera remplacé par la sélection de frame/texture appropriée quand les assets seront disponibles
            const tintColor = this.autotileColors[autotileIndex];
            tile.setTint(tintColor);

            // Stocker les métadonnées pour debug/futur usage
            tile.setData('autotileIndex', autotileIndex);
            tile.setData('autotileBitmask', this.getBitmaskDescription(autotileIndex));
        }

        this.tileGroup.add(tile);
        return tile;
    }

    /**
     * Obtient une description textuelle du bitmask (pour debugging)
     * 
     * @param bitmask Valeur du bitmask (0-15)
     * @returns Description des connexions
     */
    private getBitmaskDescription(bitmask: number): string {
        const directions: string[] = [];

        if (bitmask & AutotileDirection.NORTH) directions.push('N');
        if (bitmask & AutotileDirection.EAST) directions.push('E');
        if (bitmask & AutotileDirection.SOUTH) directions.push('S');
        if (bitmask & AutotileDirection.WEST) directions.push('W');

        return directions.length > 0 ? directions.join('+') : 'Isolated';
    }

    /**
     * Met à jour l'auto-tiling d'une tuile spécifique
     * Utile quand une tuile voisine change
     * 
     * @param x Position X dans la grille
     * @param y Position Y dans la grille
     * @param gridData Données de la grille
     * @param tile Référence à l'image de la tuile
     */
    updateTileAutotiling(
        x: number,
        y: number,
        gridData: (GridCell | number)[][],
        tile: Phaser.GameObjects.Image
    ): void {
        // Vérifier que la cellule existe
        if (!gridData || !gridData[y] || gridData[y][x] === undefined) {
            return;
        }

        const cell = gridData[y][x];
        const tileType = typeof cell === 'number' ? cell : cell.type;

        if (tileType === TileType.WATER) {
            const autotileIndex = this.calculateAutotile(x, y, gridData, TileType.WATER);
            const tintColor = this.autotileColors[autotileIndex];

            tile.setTint(tintColor);
            tile.setData('autotileIndex', autotileIndex);
            tile.setData('autotileBitmask', this.getBitmaskDescription(autotileIndex));
        }
    }

    /**
     * Récupère une texture de tuile aléatoire
     */
    getRandomTileKey(): string {
        return Phaser.Math.RND.pick(this.tileVariations);
    }

    /**
     * Récupère le groupe de tuiles
     */
    getTileGroup(): Phaser.GameObjects.Group {
        return this.tileGroup;
    }

    /**
     * Détruit le gestionnaire de tuiles
     */
    destroy(): void {
        this.tileGroup.clear(true, true);
    }
}
