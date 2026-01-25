import Phaser from 'phaser';
import { IsoMath } from '../utils/IsoMath';
import { GameConfig } from '../config/GameConfig';

/**
 * Gestionnaire d'objets
 * Gère les objets du monde (arbres, rochers, etc.)
 */
export class ObjectManager {
    private scene: Phaser.Scene;
    private objectMap: Map<string, Phaser.GameObjects.Image>;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.objectMap = new Map();
    }

    /**
     * Place un objet à une position de la grille
     */
    placeObject(
        x: number,
        y: number,
        key: string,
        originX: number,
        originY: number
    ): Phaser.GameObjects.Image {
        const pos = IsoMath.gridToIso(x, y, originX, originY);
        const visualY = pos.y + GameConfig.ASSET_Y_OFFSET;

        const obj = this.scene.add.image(pos.x, visualY, key);
        obj.setOrigin(0.5, 1);
        obj.setDepth(visualY);
        obj.setInteractive({ cursor: 'pointer' });
        obj.setData('gridX', x);
        obj.setData('gridY', y);

        this.objectMap.set(`${x},${y}`, obj);
        return obj;
    }

    /**
     * Récupère un objet à une position donnée
     */
    getObject(x: number, y: number): Phaser.GameObjects.Image | undefined {
        return this.objectMap.get(`${x},${y}`);
    }

    /**
     * Supprime un objet à une position donnée
     */
    removeObject(x: number, y: number): void {
        const key = `${x},${y}`;
        const obj = this.objectMap.get(key);
        if (obj) {
            obj.destroy();
            this.objectMap.delete(key);
        }
    }

    /**
     * Vérifie si un objet existe à une position donnée
     */
    hasObject(x: number, y: number): boolean {
        return this.objectMap.has(`${x},${y}`);
    }

    /**
     * Nettoie tous les objets
     */
    clear(): void {
        this.objectMap.forEach(obj => obj.destroy());
        this.objectMap.clear();
    }

    /**
     * Récupère la Map complète des objets
     */
    getObjectMap(): Map<string, Phaser.GameObjects.Image> {
        return this.objectMap;
    }
}
