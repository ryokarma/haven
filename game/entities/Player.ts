import Phaser from 'phaser';
import { IsoMath } from '../utils/IsoMath';
import { GameConfig } from '../config/GameConfig';
import { RENDER_OFFSETS } from '../managers/ObjectManager';

/**
 * Entité joueur
 * Représente le personnage jouable dans le jeu
 */
export class Player {
    private scene: Phaser.Scene;
    private sprite: Phaser.GameObjects.Image;
    private light: Phaser.GameObjects.Image; // La petite lumière du joueur
    private debugDot?: Phaser.GameObjects.Arc; // Point de debug
    private gridX: number;
    private gridY: number;

    constructor(scene: Phaser.Scene, x: number, y: number, originX: number, originY: number) {
        this.scene = scene;
        this.gridX = x;
        this.gridY = y;

        const pos = IsoMath.gridToIso(x, y, originX, originY);
        this.sprite = scene.add.image(pos.x, pos.y, 'hero');

        const config = RENDER_OFFSETS['player']!;
        this.sprite.setOrigin(config.originX, config.originY);
        this.sprite.y = pos.y + config.offsetY; // Apply offset

        // Profondeur dynamique
        // On aligne avec la logique des objets : sprite.y + offset X
        this.sprite.setDepth(this.sprite.y + (this.sprite.x * 0.001));

        // --- DEBUG VISUEL ---
        const SHOW_DEBUG = false; // Session 9.4 : désactivé pour le polish
        if (SHOW_DEBUG) {
            const debugDot = scene.add.circle(pos.x, pos.y, 3, 0xff0000);
            debugDot.setDepth(999999);
            // On pourrait le garder en prop pour le bouger avec le joueur si besoin, 
            // mais pour l'instant c'est juste un marqueur statique de spawn ou on le laisse trainer ?
            // Le user demande "Ajoute une méthode temporaire ou un code de debug". 
            // Si le joueur bouge, le point devrait rester sur la case ou suivre ? 
            // "voir si c'est la position de base qui est fausse".
            // Si le joueur bouge, on veut voir si le sprite est desync du point de pivot.
            // Donc le point doit représenter le "Pivot Reel" (IsoX, IsoY).
            // Je vais l'attacher au joueur pour le debug.
            this.debugDot = debugDot;
        }

        // Lumière du joueur
        this.light = scene.add.image(pos.x, pos.y - 32, 'light_glow'); // -32 pour centrer sur le corps
        this.light.setOrigin(0.5, 0.5);
        this.light.setBlendMode(Phaser.BlendModes.ADD);
        this.light.setDepth(pos.y + 1);
        this.light.setScale(0.8); // Plus petit que le feu
        this.light.setAlpha(0);
    }

    /**
     * Récupère le sprite du joueur
     */
    getSprite(): Phaser.GameObjects.Image {
        return this.sprite;
    }

    /**
     * Récupère la position en grille
     */
    getGridPosition(): { x: number; y: number } {
        return { x: this.gridX, y: this.gridY };
    }

    /**
     * Définit la position en grille
     */
    setGridPosition(x: number, y: number): void {
        this.gridX = x;
        this.gridY = y;
    }

    /**
     * Définit la position ISO (Pixels Screen) et recalcule la grille
     */
    setIsoPosition(x: number, y: number, originX: number, originY: number): void {
        this.sprite.x = x;
        this.sprite.y = y;

        // Update Grid Coords
        const gridPos = IsoMath.isoToGrid(x, y - RENDER_OFFSETS['player']!.offsetY, originX, originY);
        this.gridX = Math.round(gridPos.x); // Snap to nearest grid?
        this.gridY = Math.round(gridPos.y);

        // Sync Light
        if (this.light) {
            this.light.setPosition(this.sprite.x, this.sprite.y - 32);
            this.light.setDepth(this.sprite.y + 1);
        }

        // Update Depth
        this.sprite.setDepth(this.sprite.y + (this.sprite.x * 0.001));
    }

    /**
     * Définit la couleur du personnage
     */
    setTint(color: number): void {
        this.sprite.setTint(color);
    }

    /**
     * Anime le déplacement vers une position
     */
    /**
     * Met à jour l'intensité de la lumière
     */
    updateLight(targetAlpha: number): void {
        // On ne veut pas que ça clignote trop, un lerp serait bien mais simple assignment ok pour MVP
        // On garde un minimum de visibilité si demandé
        this.light.setVisible(targetAlpha > 0.05);
        this.light.setAlpha(targetAlpha * 0.6); // 60% de l'intensité max
    }

    /**
     * Anime le déplacement vers une position
     */
    /**
     * Déplace le joueur vers une position donnée (Interface Publique Standardisée)
     */
    moveTo(targetX: number, targetY: number, originX: number, originY: number, onComplete: () => void): void {
        this.animateMoveTo(targetX, targetY, originX, originY, onComplete);
    }

    /**
     * Anime le déplacement vers une position
     */
    animateMoveTo(
        targetX: number,
        targetY: number,
        originX: number,
        originY: number,
        onComplete: () => void,
        duration?: number
    ): void {
        this.gridX = targetX;
        this.gridY = targetY;

        const targetIso = IsoMath.gridToIso(targetX, targetY, originX, originY);
        const moveDuration = duration || GameConfig.MOVEMENT.stepDuration;

        this.scene.tweens.add({
            targets: this.sprite,
            x: targetIso.x,
            y: targetIso.y,
            duration: moveDuration,
            ease: 'Linear',
            onUpdate: () => {
                // Mise à jour de la profondeur dynamique pendant le mouvement
                this.sprite.setDepth(this.sprite.y + (this.sprite.x * 0.001));

                // Sync lumière
                if (this.light) {
                    this.light.setPosition(this.sprite.x, this.sprite.y - 32);
                    this.light.setDepth(this.sprite.y + 1);
                }

                // Sync Debug Dot (Doit rester au "sol" théorique)
                // Attention: this.sprite.y contient l'offsetY. 
                // Si on veut afficher le pivot, il faut soustraire l'offset.
                if (this.debugDot) {
                    const config = RENDER_OFFSETS['player']!;
                    this.debugDot.setPosition(this.sprite.x, this.sprite.y - config.offsetY);
                    this.debugDot.setDepth(999999);
                }
            },
            onComplete: onComplete
        });
    }

    /**
     * Détruit le joueur
     */
    destroy(): void {
        if (this.light) this.light.destroy();
        this.sprite.destroy();
    }
}
