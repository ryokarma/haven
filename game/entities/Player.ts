import Phaser from 'phaser';
import { IsoMath } from '../utils/IsoMath';
import { GameConfig } from '../config/GameConfig';

/**
 * Entité joueur
 * Représente le personnage jouable dans le jeu
 */
export class Player {
    private scene: Phaser.Scene;
    private sprite: Phaser.GameObjects.Image;
    private light: Phaser.GameObjects.Image; // La petite lumière du joueur
    private gridX: number;
    private gridY: number;

    constructor(scene: Phaser.Scene, x: number, y: number, originX: number, originY: number) {
        this.scene = scene;
        this.gridX = x;
        this.gridY = y;

        const pos = IsoMath.gridToIso(x, y, originX, originY);
        this.sprite = scene.add.image(pos.x, pos.y, 'hero');
        this.sprite.setOrigin(0.5, 1);
        this.sprite.setDepth(pos.y);

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
    animateMoveTo(
        targetX: number,
        targetY: number,
        originX: number,
        originY: number,
        onComplete: () => void
    ): void {
        this.gridX = targetX;
        this.gridY = targetY;

        const targetIso = IsoMath.gridToIso(targetX, targetY, originX, originY);

        this.scene.tweens.add({
            targets: this.sprite,
            x: targetIso.x,
            y: targetIso.y,
            duration: GameConfig.MOVEMENT.stepDuration,
            ease: 'Linear',
            onUpdate: () => {
                this.sprite.setDepth(this.sprite.y);

                // Sync lumière
                if (this.light) {
                    this.light.setPosition(this.sprite.x, this.sprite.y - 32);
                    this.light.setDepth(this.sprite.y + 1);
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
