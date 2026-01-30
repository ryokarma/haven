import Phaser from 'phaser';
import { IsoMath } from '../utils/IsoMath';
import { GameConfig, ASSET_MANIFEST } from '../config/GameConfig';

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
     * Place un objet à une position de la grille en utilisant le Manifest
     */
    placeObject(
        x: number,
        y: number,
        type: string,
        mapOriginX: number,
        mapOriginY: number
    ): Phaser.GameObjects.Image {
        const pos = IsoMath.gridToIso(x, y, mapOriginX, mapOriginY);

        // Récupération de la config depuis le manifest ou fallback par défaut
        const config = ASSET_MANIFEST[type] || {
            assetKey: type,
            pixelHeight: 64,
            originX: 0.5,
            originY: 1.0
        };

        // Création de l'image avec les paramètres du manifest
        const obj = this.scene.add.image(pos.x, pos.y, config.assetKey);
        obj.setOrigin(config.originX, config.originY);

        // La profondeur est basée sur la position Y au sol pour un tri correct
        obj.setDepth(pos.y);

        obj.setInteractive({ cursor: 'pointer' });
        obj.setData('gridX', x);
        obj.setData('gridY', y);
        obj.setData('type', type); // Sauvegarde du type de base

        // Logique spécifique pour les arbres (Pommiers)
        if (type === 'tree') {
            // Utilise Math.random() ou le RNG de la scène si disponible (ici simple random pour l'effet visuel)
            // Note: Idéalement il faudrait utiliser le RNG seedé du MapManager, mais ObjectManager est agnostique.
            if (Math.random() < 0.2) {
                obj.setTint(0xFFaaaa); // Teinte rougeâtre
                obj.setData('subType', 'apple_tree');
            }
        }

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
