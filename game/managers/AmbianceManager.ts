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
            } as any,
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
     * Calcule la couleur ambiante en fonction de l'heure
     * @param minutes Heure en minutes (0-1440)
     */
    public getAmbientColor(minutes: number): number {
        const hour = minutes / 60;

        // Paliers de couleur (Time Stops)
        // 0h = 0, 6h = 6, etc.
        const stops = [
            { time: 0, color: 0x1a1a40 },   // Nuit profonde
            { time: 5, color: 0x1a1a40 },   // Fin nuit
            { time: 6, color: 0x242450 },   // Début aube sombre
            { time: 7, color: 0xffddcc },   // Aube dorée
            { time: 8, color: 0xffffff },   // Jour plein (Early)
            { time: 17, color: 0xffffff },  // Fin jour (Late)
            { time: 18, color: 0xffccaa },  // Début coucher
            { time: 20, color: 0x3d3d60 },  // Crépuscule bleu
            { time: 22, color: 0x1a1a40 }   // Nuit
        ];

        // Trouver les deux stops entre lesquels on se trouve
        let startStop = stops[stops.length - 1];
        let endStop = stops[0];

        for (let i = 0; i < stops.length - 1; i++) {
            const currentStop = stops[i];
            const nextStop = stops[i + 1];
            if (currentStop && nextStop && hour >= currentStop.time && hour < nextStop.time) {
                startStop = currentStop;
                endStop = nextStop;
                break;
            }
        }

        // Cas spécial pour la boucle 22h -> 0h (si on ne gère pas le wrap dans la boucle)
        if (hour >= 22) {
            startStop = stops[stops.length - 1];
            // On simule un stop à 24h qui est le même que 0h
            endStop = { time: 24, color: 0x1a1a40 };
        }

        if (!startStop || !endStop) return 0xffffff;

        // Calcul du ratio d'interpolation (0 à 1)
        const duration = endStop.time - startStop.time;
        const progress = (hour - startStop.time) / duration;

        // Interpolation
        const color1 = Phaser.Display.Color.ValueToColor(startStop.color);
        const color2 = Phaser.Display.Color.ValueToColor(endStop.color);

        const result = Phaser.Display.Color.Interpolate.ColorWithColor(
            color1,
            color2,
            100,
            progress * 100
        );

        return Phaser.Display.Color.GetColor(result.r, result.g, result.b);
    }

    /**
     * Multiplie deux couleurs (Blend Multiply)
     * R = (R1 * R2) / 255
     */
    public multiplyColors(colorA: number, colorB: number): number {
        const rA = (colorA >> 16) & 0xFF;
        const gA = (colorA >> 8) & 0xFF;
        const bA = colorA & 0xFF;

        const rB = (colorB >> 16) & 0xFF;
        const gB = (colorB >> 8) & 0xFF;
        const bB = colorB & 0xFF;

        const r = Math.floor((rA * rB) / 255);
        const g = Math.floor((gA * gB) / 255);
        const b = Math.floor((bA * bB) / 255);

        return (r << 16) | (g << 8) | b;
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
