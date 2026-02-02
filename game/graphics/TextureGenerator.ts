import Phaser from 'phaser';
import { IsoMath } from '../utils/IsoMath';
import { GameConfig } from '../config/GameConfig';

/**
 * Générateur de textures
 * Crée toutes les textures procédurales du jeu
 */
export class TextureGenerator {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Génère toutes les textures nécessaires
     */
    generateAll(): void {
        this.generateHeroTexture();
        this.generateTileTextures();
        this.generateFireflyTexture();
        this.generateGlowTexture();
    }

    /**
     * Génère la texture de halo lumineux
     */
    private generateGlowTexture(): void {
        if (this.scene.textures.exists('light_glow')) return;

        // Création d'un canvas pour le gradient radial
        const size = 256;
        const texture = this.scene.textures.createCanvas('light_glow', size, size);

        if (texture) {
            const ctx = texture.getContext();
            const cx = size / 2;
            const cy = size / 2;
            const radius = size / 2;

            // Gradient radial: Centre chaud/lumineux -> Bord transparent
            const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
            grd.addColorStop(0, 'rgba(255, 250, 200, 0.8)'); // Centre blanc-chaud opaque
            grd.addColorStop(0.4, 'rgba(255, 150, 50, 0.2)'); // Milieu orange doux translucide
            grd.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Bord transparent

            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, size, size);

            texture.refresh();
        }
    }

    /**
     * Génère la texture du héros
     */
    private generateHeroTexture(): void {
        if (this.scene.textures.exists('hero')) return;

        const g = this.scene.make.graphics({ x: 0, y: 0, add: false });

        // Ombre
        g.fillStyle(0x000000, 0.2);
        g.fillEllipse(32, 58, 20, 10);

        // Corps
        g.fillStyle(0xffffff, 1);
        g.fillRect(24, 20, 16, 32);

        // Tête
        g.fillStyle(0xfecdd3, 1);
        g.fillCircle(32, 20, 10);

        g.generateTexture('hero', 64, 64);
        g.destroy();
    }

    /**
     * Génère les textures des tuiles
     */
    private generateTileTextures(): void {
        const W = IsoMath.TILE_WIDTH;
        const H = IsoMath.TILE_HEIGHT;

        // Tuiles d'herbe (sans contour)
        GameConfig.GRASS_COLORS.forEach((color, index) => {
            const key = `tile_flat_${index}`;
            if (!this.scene.textures.exists(key)) {
                const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
                g.fillStyle(color, 1);
                g.beginPath();
                g.moveTo(W / 2, 0);
                g.lineTo(W, H / 2);
                g.lineTo(W / 2, H);
                g.lineTo(0, H / 2);
                g.closePath();
                g.fillPath();
                // IMPORTANT: Pas de strokePath() ici pour retirer la grille
                g.generateTexture(key, W, H);
                g.destroy();
            }
        });

        // Sol de la maison
        if (!this.scene.textures.exists('floor_wood')) {
            const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(0x8D6E63, 1);
            g.beginPath();
            g.moveTo(W / 2, 0);
            g.lineTo(W, H / 2);
            g.lineTo(W / 2, H);
            g.lineTo(0, H / 2);
            g.closePath();
            g.fillPath();
            // Contour subtil pour la maison
            g.lineStyle(1, 0x5D4037, 0.5);
            g.strokePath();
            g.generateTexture('floor_wood', W, H);
            g.destroy();
        }

        // Toit de la maison
        if (!this.scene.textures.exists('house_roof')) {
            const totalW = GameConfig.HOUSE.width * W;
            const totalH = GameConfig.HOUSE.height * H;
            const cx = totalW / 2;

            const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(0x37474F, 1);
            g.beginPath();
            g.moveTo(cx, 0);
            g.lineTo(totalW, totalH / 2);
            g.lineTo(cx, totalH);
            g.lineTo(0, totalH / 2);
            g.closePath();
            g.fillPath();
            g.lineStyle(4, 0x263238, 1);
            g.strokePath();
            g.generateTexture('house_roof', totalW, totalH);
            g.destroy();
        }
    }

    /**
     * Génère la texture des lucioles
     */
    private generateFireflyTexture(): void {
        if (this.scene.textures.exists('firefly')) return;

        const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xfffee0, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('firefly', 8, 8);
        g.destroy();
    }
}
