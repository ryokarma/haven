import Phaser from 'phaser';
import { IsoMath } from '../utils/IsoMath';
import { GameConfig } from '../config/GameConfig';

/**
 * Gestionnaire d'ambiance
 * Gère les effets visuels d'ambiance comme les lucioles
 */
export class AmbianceManager {
    private scene: Phaser.Scene;
    private background: Phaser.GameObjects.TileSprite | null = null;
    private vignette: Phaser.GameObjects.Image | null = null;
    private fireflies: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.initTextures();
        this.createBackground();
        this.createVignette();
    }

    /**
     * Génère les textures procédurales nécessaires
     */
    private initTextures(): void {
        // Texture de fond (Ciel nuit + étoiles)
        if (!this.scene.textures.exists('sky_background')) {
            const width = 512;
            const height = 512;
            const graphics = this.scene.make.graphics({ x: 0, y: 0 });

            // Fond sombre (Bleu nuit vers Violet)
            graphics.fillGradientStyle(0x0f172a, 0x0f172a, 0x312e81, 0x312e81, 1);
            graphics.fillRect(0, 0, width, height);

            // Étoiles
            graphics.fillStyle(0xffffff, 0.8);
            for (let i = 0; i < 100; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const size = Math.random() * 1.5;
                graphics.fillCircle(x, y, size);
            }

            graphics.generateTexture('sky_background', width, height);
            graphics.destroy();
        }

        // Texture de vignette (Gradient radial)
        if (!this.scene.textures.exists('vignette')) {
            const width = this.scene.scale.width;
            const height = this.scene.scale.height;
            const texture = this.scene.textures.createCanvas('vignette', width, height);

            if (texture) {
                const ctx = texture.getContext();
                // Gradient radial du centre transparent vers les bords noirs
                const radius = Math.max(width, height) / 1.5;
                const grd = ctx.createRadialGradient(width / 2, height / 2, width / 4, width / 2, height / 2, radius);

                grd.addColorStop(0, 'rgba(0,0,0,0)');
                grd.addColorStop(1, 'rgba(0,0,0,0.5)'); // Assombrissement des coins

                ctx.fillStyle = grd;
                ctx.fillRect(0, 0, width, height);
                texture.refresh();
            }
        }

        // Texture particule firefly si manquante
        if (!this.scene.textures.exists('firefly')) {
            const graphics = this.scene.make.graphics({ x: 0, y: 0 });
            graphics.fillStyle(0xffffcc, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('firefly', 8, 8);
            graphics.destroy();
        }
    }

    /**
     * Crée le fond animé
     */
    private createBackground(): void {
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;

        this.background = this.scene.add.tileSprite(
            width / 2,
            height / 2,
            width,
            height,
            'sky_background'
        );

        // Fixé à la caméra mais en profondeur maximale (derrière tout)
        this.background.setScrollFactor(0);
        this.background.setDepth(-1000000);
        this.background.setAlpha(1);
    }

    /**
     * Crée l'effet de vignettage
     */
    private createVignette(): void {
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;

        this.vignette = this.scene.add.image(width / 2, height / 2, 'vignette');
        this.vignette.setScrollFactor(0); // Fixe à la caméra
        this.vignette.setDepth(1000000); // Devant tout (UI)
        this.vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);
    }

    /**
     * Met à jour les effets d'ambiance (parallaxe)
     */
    update(): void {
        if (this.background) {
            // Parallaxe simple : le fond bouge lentement quand la caméra bouge
            // Ratio 0.05 comme suggéré
            this.background.tilePositionX = this.scene.cameras.main.scrollX * 0.05;
            this.background.tilePositionY = this.scene.cameras.main.scrollY * 0.05;
        }
    }

    /**
     * Crée les effets de lucioles autour du héros
     */
    createFireflies(target: Phaser.GameObjects.GameObject): void {
        this.fireflies = this.scene.add.particles(0, 0, 'firefly', {
            follow: target as Phaser.GameObjects.Sprite,
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Circle(0, 0, GameConfig.FIREFLIES.radius)
            },
            lifespan: {
                min: GameConfig.FIREFLIES.lifespanMin,
                max: GameConfig.FIREFLIES.lifespanMax
            },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0, end: 0.8 },
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
        if (this.background) {
            this.background.destroy();
            this.background = null;
        }
        if (this.vignette) {
            this.vignette.destroy();
            this.vignette = null;
        }
    }
}
