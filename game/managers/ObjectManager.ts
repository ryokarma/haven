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

    // Listes pour la persistance
    public removedObjectIds: string[] = [];
    public placedObjects: { type: string; x: number; y: number; id: string }[] = [];

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
        mapOriginY: number,
        isPlayerPlaced: boolean = false
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

        // Custom Tints based on Type (Override default white)
        let customTint = 0xffffff;

        obj.setData('originalTint', customTint);
        obj.setTint(customTint);

        if (isPlayerPlaced) {
            obj.setData('isPlayerPlaced', true);
            this.placedObjects.push({ type, x, y, id: `${x},${y}` });
        }

        // LOGIC LUMIÈRE (Campfire)
        if (type === 'camp' || type === 'campfire' || config.assetKey === 'campfire') { // Adapt key check
            const glow = this.scene.add.image(pos.x, pos.y, 'light_glow');
            glow.setOrigin(0.5, 0.5);
            glow.setBlendMode(Phaser.BlendModes.ADD);
            glow.setDepth(pos.y + 1); // Slightly in front
            glow.setAlpha(0); // Invisible le jour par défaut, sera update

            // Effet pulse
            this.scene.tweens.add({
                targets: glow,
                scale: { from: 1.0, to: 1.15 },
                alpha: { from: 0.6, to: 0.8 }, // Variation d'intensité
                duration: 1500 + Math.random() * 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            obj.setData('light', glow);
        }

        // Logique spécifique pour les arbres (Pommiers)
        if (type === 'tree') {
            // Utilise Math.random() ou le RNG de la scène si disponible (ici simple random pour l'effet visuel)
            // Note: Idéalement il faudrait utiliser le RNG seedé du MapManager, mais ObjectManager est agnostique.
            if (Math.random() < 0.2) {
                const appleTint = 0xFFaaaa;
                obj.setTint(appleTint); // Teinte rougeâtre
                obj.setData('subType', 'apple_tree');
                obj.setData('originalTint', appleTint);
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
            // Persistance Update
            if (obj.getData('isPlayerPlaced')) {
                // Si c'est un objet du joueur, on le retire de la liste des placés (il disparait de la save)
                this.placedObjects = this.placedObjects.filter(po => po.id !== key);
            } else {
                // Si c'est un objet du monde, on l'ajoute à la liste des supprimés
                if (!this.removedObjectIds.includes(key)) {
                    this.removedObjectIds.push(key);
                }
            }

            // Destruction de la lumière attachée si présente
            const light = obj.getData('light') as Phaser.GameObjects.Image;
            if (light) {
                light.destroy();
            }
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
