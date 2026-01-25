import Phaser from 'phaser';
import { IsoMath } from '../utils/IsoMath';
import { GameConfig } from '../config/GameConfig';

/**
 * Gestionnaire d'ambiance
 * Gère les effets visuels d'ambiance comme les lucioles
 */
export class AmbianceManager {
    private scene: Phaser.Scene;
    private fireflies: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Crée les effets de lucioles autour du héros
     */
    createFireflies(target: Phaser.GameObjects.GameObject): void {
        this.fireflies = this.scene.add.particles(0, 0, 'firefly', {
            follow: target,
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Circle(0, 0, GameConfig.FIREFLIES.radius)
            },
            lifespan: {
                min: GameConfig.FIREFLIES.lifespanMin,
                max: GameConfig.FIREFLIES.lifespanMax
            },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0, end: 0.8, yoyo: true },
            speed: {
                min: GameConfig.FIREFLIES.speedMin,
                max: GameConfig.FIREFLIES.speedMax
            },
            gravityY: GameConfig.FIREFLIES.gravityY,
            quantity: 1,
            frequency: GameConfig.FIREFLIES.frequency,
            blendMode: 'ADD'
        });
        this.fireflies.setDepth(100000);
    }

    /**
     * Détruit les effets d'ambiance
     */
    destroy(): void {
        if (this.fireflies) {
            this.fireflies.destroy();
            this.fireflies = null;
        }
    }
}
