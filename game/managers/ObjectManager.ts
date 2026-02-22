import Phaser from 'phaser';
import { IsoMath } from '../utils/IsoMath';
import { GameConfig, ASSET_MANIFEST } from '../config/GameConfig';
import type { ServerWorldObject } from '../../stores/world';

/**
 * Configuration centralisée des décalages de rendu
 * Centralise les Magic Numbers pour les positions
 */
export const RENDER_OFFSETS: Record<string, { originX: number; originY: number; offsetY: number }> = {
    'default': { originX: 0.5, originY: 1.0, offsetY: 0 },
    'tree': { originX: 0.5, originY: 0.82, offsetY: 0 },
    'rock': { originX: 0.5, originY: 0.72, offsetY: 0 },
    'cotton_bush': { originX: 0.5, originY: 1.0, offsetY: 0 },
    'clay_mound': { originX: 0.5, originY: 0.5, offsetY: 0 },
    // Alias serveur → même ancrage que clay_mound
    'clay_node': { originX: 0.5, originY: 0.6, offsetY: 0 },
    // Pommier → même ancrage que tree (même silhouette haute)
    'apple_tree': { originX: 0.5, originY: 0.95, offsetY: 0 },
    'player': { originX: 0.5, originY: 1.0, offsetY: 0 },
    'clay_pot': { originX: 0.5, originY: 0.8, offsetY: 0 },
    'clay_pot_seeded': { originX: 0.5, originY: 0.8, offsetY: 0 },
    'clay_pot_watered': { originX: 0.5, originY: 0.8, offsetY: 0 },
    'clay_pot_ready': { originX: 0.5, originY: 0.9, offsetY: 0 },
    'furnace': { originX: 0.5, originY: 0.8, offsetY: 0 },
    'watering_can': { originX: 0.5, originY: 0.8, offsetY: 0 },
    'path_stone': { originX: 0.5, originY: 0.5, offsetY: 0 },
};

/**
 * Gestionnaire d'objets
 * Gère les objets du monde (arbres, rochers, etc.)
 */
export class ObjectManager {
    private scene: Phaser.Scene;
    private objectMap: Map<string, Phaser.GameObjects.Image>;
    /** Index serveur_id → sprite pour diffing O(1) au lieu de recréer tous les sprites. */
    private serverObjectMap: Map<string, Phaser.GameObjects.Image> = new Map();

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
        const SHOW_DEBUG = false; // Session 9.4 : désactivé pour le polish
        if (SHOW_DEBUG) {
            const debugDot = this.scene.add.circle(pos.x, pos.y, 3, 0xff0000);
            debugDot.setDepth(999999); // Toujours au-dessus
        }

        // La profondeur est calculée pour un tri correct (Z-Sorting)
        // Formule : pos.y + (height * 0.5) + (x * 0.001)
        // Ajout d'un léger offset static si nécessaire (ici géré par height*0.5)

        // CUSTOM LAYER LOGIC
        const isFloor = type.includes('path') || type.includes('floor');
        if (isFloor) {
            // Sol : Z = 0 (ou très bas pour être juste au dessus des tuiles de base)
            // Les Tuiles de base sont rendue par TileManager, souvent depth 0 ou moins ?
            // On met -1 pour être sûr ? Non, TileManager met depth auto ? non TileManager utilise containers ou images.
            // On va dire Depth 10. Les obstacles seront > y (qui est souvent > 0).
            obj.setDepth(1);
        } else {
            // Obstacle / Objet Vertical — Profondeur basée sur la position au SOL (pos.y).
            // Session 9.4 : Suppression du `height * 0.5` qui brisait le tri avec le joueur.
            // Le tri isométrique repose uniquement sur y + x*epsilon, cohérent avec Player.
            obj.setDepth(pos.y + (pos.x * 0.001));
        }

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
        this.objectMap.forEach(obj => {
            // Détruire la lumière attachée si présente avant de détruire l'objet
            const light = obj.getData('light') as Phaser.GameObjects.Image | undefined;
            if (light) light.destroy();
            obj.destroy();
        });
        this.objectMap.clear();
    }

    /**
     * Récupère la Map complète des objets
     */
    getObjectMap(): Map<string, Phaser.GameObjects.Image> {
        return this.objectMap;
    }

    /**
     * Synchronise les objets du monde depuis l'état serveur — ALGORITHME DE DIFF.
     *
     * Au lieu de détruire et recréer tous les sprites à chaque WORLD_STATE, on :
     *   1. Calcule les objets à supprimer (présents localement, absents du serveur)
     *   2. Calcule les objets à ajouter   (absents localement, présents sur le serveur)
     *   3. Les objets déjà présents sont conservés intacts (0 glitch visuel)
     *
     * @param objects       - Liste des ressources reçues via WORLD_STATE
     * @param mapOriginX    - Origine X de la carte isométrique
     * @param mapOriginY    - Origine Y de la carte isométrique
     * @param onObjectPlaced  - Callback appelé pour chaque objet NOUVELLEMENT ajouté
     * @param onObjectRemoved - Callback appelé pour chaque objet supprimé
     */
    syncWorldObjects(
        objects: ServerWorldObject[],
        mapOriginX: number,
        mapOriginY: number,
        onObjectPlaced?: (obj: ServerWorldObject, isFloor: boolean) => void,
        onObjectRemoved?: (x: number, y: number) => void
    ): void {
        // ── 1. Construire un Set des IDs reçus par le serveur ────────────────
        const incomingIds = new Set<string>(objects.map(o => o.id));

        // ── 2. Supprimer ceux qui ne sont plus dans le WORLD_STATE ────────────
        const idsToRemove: string[] = [];
        this.serverObjectMap.forEach((sprite, serverId) => {
            if (!incomingIds.has(serverId)) {
                idsToRemove.push(serverId);
            }
        });

        idsToRemove.forEach(serverId => {
            const sprite = this.serverObjectMap.get(serverId);
            if (!sprite) return;

            // Retirer de tous les indexes
            const gx = sprite.getData('gridX') as number;
            const gy = sprite.getData('gridY') as number;
            const posKey = `${gx},${gy}`;

            const light = sprite.getData('light') as Phaser.GameObjects.Image | undefined;
            if (light) light.destroy();
            sprite.destroy();

            this.objectMap.delete(posKey);
            this.serverObjectMap.delete(serverId);

            // Libérer la cellule de pathfinding
            if (onObjectRemoved) onObjectRemoved(gx, gy);
        });

        if (idsToRemove.length > 0) {
            console.log(`[ObjectManager] Diff — ${idsToRemove.length} objet(s) supprimé(s).`);
        }

        // ── 3. Ajouter uniquement les nouveaux objets ─────────────────────────
        let addedCount = 0;
        objects.forEach(res => {
            // Déjà présent ? On ne touche à rien (conservation de l'état visuel)
            if (this.serverObjectMap.has(res.id)) return;

            const posKey = `${res.x},${res.y}`;
            if (this.objectMap.has(posKey)) {
                // Position prise par un objet local (ex: construction joueur) — on ignore
                return;
            }

            const spriteKey = res.asset || res.type;

            const sprite = this.placeObject(
                res.x,
                res.y,
                spriteKey,
                mapOriginX,
                mapOriginY,
                false,   // isPlayerPlaced = false
                res.id   // server_id
            );

            // Enregistrer dans l'index server_id pour diffing futur
            this.serverObjectMap.set(res.id, sprite);
            addedCount++;

            // Callback pathfinding
            if (onObjectPlaced) {
                const isFloor = res.type === 'floor' || spriteKey.includes('path');
                onObjectPlaced(res, isFloor);
            }
        });

        if (addedCount > 0) {
            console.log(`[ObjectManager] Diff — ${addedCount} objet(s) ajouté(s). Total: ${this.serverObjectMap.size} objets serveur.`);
        }
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
    /**
     * Affiche un texte flottant (ex: +1 Wood)
     */
    showFloatingText(x: number, y: number, message: string, color: string): void {
        const text = this.scene.add.text(x, y, message, {
            fontFamily: 'Arial',
            fontSize: '16px',
            fontStyle: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: 3
        });
        text.setOrigin(0.5, 0.5);
        text.setDepth(999999); // Toujours au-dessus

        this.scene.tweens.add({
            targets: text,
            y: y - 50,
            alpha: 0,
            duration: 1500,
            ease: 'Power1',
            onComplete: () => {
                text.destroy();
            }
        });
    }

    /**
     * Affiche une bulle de chat au-dessus d'un joueur
     */
    showChatBubble(playerId: string, message: string): void {
        // Trouver le sprite (Local ou Remote)
        // TODO: Gérer le joueur local si playerId === monId
        // Pour l'instant on cherche dans remotePlayers ou on passe le sprite en argument ?
        // Simplification: On cherche dans remotePlayers. Si pas trouvé, c'est peut-être le local player.

        let targetSprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container | Phaser.GameObjects.Image | undefined = this.remotePlayers.get(playerId);

        // Hack: Si c'est le joueur local, on doit le récupérer via la Scene mais ObjectManager n'a pas accès direct à "player" entity.
        // Solution: On expose une méthode ou on passe la target.
        // Mais pour faire simple : La MainScene appellera showChatBubbleWithTarget(sprite, msg)
        // Ou on stocke référence au local player dans ObjectManager ?
        // On va faire une méthode "getParamsForPlayer(id)"

    }

    /**
     * Méthode interne pour créer la bulle sur une cible
     */
    createChatBubbleOnSprite(sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container | Phaser.GameObjects.Image, message: string): void {
        // Nettoyage ancienne bulle si existe
        const oldBubble = sprite.getData('chatBubble');
        if (oldBubble) {
            oldBubble.destroy();
        }

        const container = this.scene.add.container(sprite.x, sprite.y - 60);
        container.setDepth(999999);

        // Texte pour mesurer
        const text = this.scene.add.text(0, 0, message, {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#000000',
            align: 'center',
            wordWrap: { width: 150 }
        });
        text.setOrigin(0.5, 0.5);

        const w = text.width + 20;
        const h = text.height + 14;

        // Fond (Graphique)
        const bg = this.scene.add.graphics();
        bg.fillStyle(0xffffff, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
        // Petite flèche bas
        bg.fillTriangle(-5, h / 2, 5, h / 2, 0, h / 2 + 5);

        container.add([bg, text]);

        // Sauvegarde référence
        sprite.setData('chatBubble', container);

        // Animation Pop In
        container.setScale(0);
        this.scene.tweens.add({
            targets: container,
            scale: { from: 0, to: 1 },
            duration: 200,
            ease: 'Back.out'
        });

        // Auto destroy
        this.scene.time.delayedCall(4000, () => {
            this.scene.tweens.add({
                targets: container,
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    container.destroy();
                    sprite.setData('chatBubble', null); // Clean ref
                }
            });
        });

        // Update position in update loop? 
        // Si le sprite bouge, le container ne suit pas automatiquement.
        // On attache un update listener ou on le met enfant du sprite ?
        // Si enfant du sprite, scale du sprite impacte bulle. Mieux vaut update position.
        // Pour ce MVP, bulle statique à l'endroit du message ou simple tracking via scene update ?
        // On va laisser statique pour l'instant (message "lâché" dans le monde) ou simple parenting si possible?
        // NON : Parenting Phaser Container -> Sprite n'est pas standard.
        // On laisse comme ça, si le joueur bouge la bulle reste là un peu comme dans certains RPGs, ou on ajoute un simple update.
        // On va ajouter un update callback à la scene.
        const updateListener = () => {
            if (!container.active) {
                this.scene.events.off('update', updateListener);
                return;
            }
            if (sprite.active) {
                container.setPosition(sprite.x, sprite.y - 60);
                container.setDepth(sprite.y + 1000); // Toujours devant
            }
        };
        this.scene.events.on('update', updateListener);
    }
}
