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
            },
            onComplete: onComplete
        });
    }

    /**
     * Détruit le joueur
     */
    destroy(): void {
        this.sprite.destroy();
    }
}
