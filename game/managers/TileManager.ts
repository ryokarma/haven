import Phaser from 'phaser';
import { IsoMath } from '../utils/IsoMath';
import { GameConfig } from '../config/GameConfig';

/**
 * Gestionnaire de tuiles
 * Gère la création et le placement des tuiles sur la carte
 */
export class TileManager {
    private scene: Phaser.Scene;
    private tileGroup: Phaser.GameObjects.Group;
    private tileVariations: string[];

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
     * Place une tuile à la position de grille spécifiée
     */
    placeTile(
        x: number,
        y: number,
        key: string,
        originX: number,
        originY: number
    ): Phaser.GameObjects.Image {
        const pos = IsoMath.gridToIso(x, y, originX, originY);
        const tile = this.scene.add.image(pos.x, pos.y, key);
        tile.setOrigin(0.5, 0.5);
        tile.setDepth(-1000);
        this.tileGroup.add(tile);
        return tile;
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
