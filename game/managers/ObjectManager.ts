import Phaser from 'phaser';
import { IsoMath } from '../utils/IsoMath';
import { GameConfig, ASSET_MANIFEST } from '../config/GameConfig';

/**
 * Configuration centralisée des décalages de rendu
 * Centralise les Magic Numbers pour les positions
 */
export const RENDER_OFFSETS: Record<string, { originX: number; originY: number; offsetY: number }> = {
    'default': { originX: 0.5, originY: 1.0, offsetY: 0 },
    'tree': { originX: 0.5, originY: 0.82, offsetY: 0 },
    'rock': { originX: 0.5, originY: 0.72, offsetY: 0 },
    'cotton_bush': { originX: 0.5, originY: 1.0, offsetY: 0 },
    'clay_mound': { originX: 0.5, originY: 0.5, offsetY: 0 }, // "Terre labourée" potentiel
    'player': { originX: 0.5, originY: 1.0, offsetY: 0 },
    'clay_pot': { originX: 0.5, originY: 0.8, offsetY: 0 },
    'clay_pot_seeded': { originX: 0.5, originY: 0.8, offsetY: 0 },
    'clay_pot_watered': { originX: 0.5, originY: 0.8, offsetY: 0 },
    'clay_pot_ready': { originX: 0.5, originY: 0.9, offsetY: 0 },
    'furnace': { originX: 0.5, originY: 0.8, offsetY: 0 },
    'watering_can': { originX: 0.5, originY: 0.8, offsetY: 0 },
};

/**
 * Gestionnaire d'objets
 * Gère les objets du monde (arbres, rochers, etc.)
 */
export class ObjectManager {
    private scene: Phaser.Scene;
    private objectMap: Map<string, Phaser.GameObjects.Image>;

    // Joueurs distants (Multijoueur)
    public remotePlayers: Map<string, Phaser.GameObjects.Sprite> = new Map();

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
        isPlayerPlaced: boolean = false,
        server_id?: string // New optional param
    ): Phaser.GameObjects.Image {
        const pos = IsoMath.gridToIso(x, y, mapOriginX, mapOriginY);

        // Récupération de la config centralisée
        // Priorité : RENDER_OFFSETS > ASSET_MANIFEST > Default
        // On merge pour garder la souplesse
        const renderConfig = RENDER_OFFSETS[type] || RENDER_OFFSETS['default']!;
        const manifestConfig = ASSET_MANIFEST[type];

        // Asset Key vient du manifest, ou type par défaut
        const assetKey = manifestConfig?.assetKey || type;

        // Création de l'image
        const obj = this.scene.add.image(pos.x, pos.y, assetKey);

        // Application des Offsets
        obj.setOrigin(renderConfig.originX, renderConfig.originY);
        // Ajustement Y fin (pixels)
        obj.y = pos.y + renderConfig.offsetY;

        // --- DEBUG VISUEL (CRITIQUE) ---
        // Point rouge à la position d'ancrage iso théorique
        // Permet de voir l'écart entre le point de pivot et le sprite
        const SHOW_DEBUG = true; // Flag à passer à false pour la release
        if (SHOW_DEBUG) {
            const debugDot = this.scene.add.circle(pos.x, pos.y, 3, 0xff0000);
            debugDot.setDepth(999999); // Toujours au-dessus
        }

        // La profondeur est calculée pour un tri correct (Z-Sorting)
        // Formule : pos.y + (height * 0.5) + (x * 0.001)
        // Ajout d'un léger offset static si nécessaire (ici géré par height*0.5)
        obj.setDepth(pos.y + (obj.height * 0.5) + (pos.x * 0.001));

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

        if (server_id) {
            obj.setData('server_id', server_id);
        }

        // LOGIC LUMIÈRE (Campfire)
        if (type === 'camp' || type === 'campfire' || assetKey === 'campfire') { // Adapt key check
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
            this.destroyObject(obj, key);
        }
    }

    /**
     * Supprime un objet par son ID serveur
     */
    removeObjectById(id: string): void {
        // Recherche linéaire (Optimisation possible avec une 2ème Map si beaucoup d'objets)
        let foundKey: string | null = null;
        let foundObj: Phaser.GameObjects.Image | null = null;

        for (const [key, obj] of this.objectMap.entries()) {
            if (obj.getData('server_id') === id) {
                foundKey = key;
                foundObj = obj;
                break;
            }
        }

        if (foundObj && foundKey) {
            this.destroyObject(foundObj, foundKey);
        } else {
            console.warn(`[ObjectManager] Impossible de trouver l'objet avec server_id: ${id}`);
        }
    }

    private destroyObject(obj: Phaser.GameObjects.Image, key: string): void {
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

    /**
     * Ajoute un joueur distant
     */
    addRemotePlayer(id: string, x: number, y: number): void {
        if (this.remotePlayers.has(id)) return;

        // Use 'hero' texture or similar fallback
        const playerSprite = this.scene.add.sprite(x, y, 'hero_idle_down'); // Fallback to hero texture
        playerSprite.setTint(0xcccccc); // Greyish tint to distinguish
        playerSprite.setOrigin(0.5, 1);
        playerSprite.setScale(1);

        // Basic depth
        playerSprite.setDepth(y + 100);

        this.remotePlayers.set(id, playerSprite);
        console.log(`[ObjectManager] Added remote player ${id}`);
    }

    /**
     * Supprime un joueur distant
     */
    removeRemotePlayer(id: string): void {
        const sprite = this.remotePlayers.get(id);
        if (sprite) {
            sprite.destroy();
            this.remotePlayers.delete(id);
            console.log(`[ObjectManager] Removed remote player ${id}`);
        }
    }

    /**
     * Déplace un joueur distant (Interpolation simple)
     */
    moveRemotePlayer(id: string, targetX: number, targetY: number): void {
        const sprite = this.remotePlayers.get(id);
        if (sprite) {
            // Distance pour calculer la durée (vitesse constante)
            const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, targetX, targetY);
            // On s'assure que duration n'est pas 0 ou négatif
            const duration = Math.max(50, (dist / 32) * 250); // Basé sur ~250ms par tuile (32px approx)

            // Tween vers la nouvelle position
            this.scene.tweens.add({
                targets: sprite,
                x: targetX,
                y: targetY,
                duration: duration,
                ease: 'Linear'
            });

            // TODO: Jouer animation de marche si disponible
        }
    }
}
