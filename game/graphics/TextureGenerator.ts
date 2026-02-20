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
        this.generateResourceTextures();
        this.generateAppleTreeTexture();
        this.generateToolTextures();
        this.generateFurnaceTexture();
        this.generateCeramicTexture();
        this.generateAgriTextures();
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

        const g = this.scene.make.graphics({ x: 0, y: 0 });

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
                const g = this.scene.make.graphics({ x: 0, y: 0 });
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
            const g = this.scene.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0x8D6E63, 1);
            g.beginPath();
            g.moveTo(W / 2, 0);
            g.lineTo(W, H / 2);
            g.lineTo(W / 2, H);
            g.lineTo(0, H / 2);
            g.closePath();
            g.fillPath();
            // Contour subtil pour la maison
            const SHOW_DEBUG_GRID = false;
            if (SHOW_DEBUG_GRID) {
                g.lineStyle(1, 0x5D4037, 0.5);
                g.strokePath();
            }
            g.generateTexture('floor_wood', W, H);
            g.destroy();
        }

        // Toit de la maison
        if (!this.scene.textures.exists('house_roof')) {
            const totalW = GameConfig.HOUSE.width * W;
            const totalH = GameConfig.HOUSE.height * H;
            const cx = totalW / 2;

            const g = this.scene.make.graphics({ x: 0, y: 0 });
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

        const g = this.scene.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0xfffee0, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('firefly', 8, 8);
        g.destroy();
    }

    /**
     * Génère les textures des nouvelles ressources (Coton, Argile)
     */
    private generateResourceTextures(): void {
        // COTON
        if (!this.scene.textures.exists('tex_cotton_bush')) {
            const size = 64;
            const g = this.scene.make.graphics({ x: 0, y: 0 });

            // Buisson (Vert foncé)
            g.fillStyle(0x2E7D32, 1);
            g.fillCircle(size / 2, size / 2, 28);

            // Fleurs de coton (Blanches)
            g.fillStyle(0xf0fdf4, 1);
            g.fillCircle(size / 2 - 10, size / 2 - 10, 8);
            g.fillCircle(size / 2 + 10, size / 2 - 5, 8);
            g.fillCircle(size / 2, size / 2 + 12, 8);

            g.generateTexture('tex_cotton_bush', size, size);
            g.destroy();
        }

        // ARGILE
        if (!this.scene.textures.exists('tex_clay_mound')) {
            const size = 64;
            const g = this.scene.make.graphics({ x: 0, y: 0 });

            // Tas de terre (Marron/Orange)
            g.fillStyle(0xA1887F, 1); // Ombre base
            g.fillEllipse(size / 2, size / 2 + 5, 40, 20);

            g.fillStyle(0x8D6E63, 1); // Corps principal
            g.fillEllipse(size / 2, size / 2, 35, 18);

            g.fillStyle(0x6D4C41, 1); // Détail dessus
            g.fillEllipse(size / 2 - 5, size / 2 - 2, 15, 8);

            g.generateTexture('tex_clay_mound', size, size);
            g.destroy();
        }
    }

    /**
     * Génère la texture du pommier (apple_tree).
     * Visuellement distinct de l'arbre standard : feuillage vert tendre, pommes rouges.
     * Taille : 80x128 px pour conserver les mêmes proportions isométriques que 'tree'.
     */
    private generateAppleTreeTexture(): void {
        if (this.scene.textures.exists('tex_apple_tree')) return;

        const W = 80;
        const H = 128;
        const cx = W / 2;

        const g = this.scene.make.graphics({ x: 0, y: 0 });

        // Tronc (brun moyen)
        g.fillStyle(0x795548, 1);
        g.fillRect(cx - 6, H - 36, 12, 36);

        // Racines légères
        g.fillStyle(0x5D4037, 1);
        g.fillRect(cx - 10, H - 10, 6, 10);
        g.fillRect(cx + 4, H - 10, 6, 10);

        // Feuillage principal (vert clair, plus rond que le tree standard)
        g.fillStyle(0x66BB6A, 1);
        g.fillCircle(cx, H - 68, 32);

        // Couche secondaire (légèrement décalée, vert plus foncé pour la profondeur)
        g.fillStyle(0x43A047, 1);
        g.fillCircle(cx - 12, H - 72, 22);
        g.fillCircle(cx + 12, H - 74, 20);

        // Reflets de lumière sur le feuillage
        g.fillStyle(0x81C784, 0.6);
        g.fillCircle(cx - 4, H - 80, 12);

        // Pommes rouges (6 pommes bien visibles)
        g.fillStyle(0xE53935, 1);
        g.fillCircle(cx - 14, H - 60, 5);
        g.fillCircle(cx + 14, H - 64, 5);
        g.fillCircle(cx, H - 58, 5);
        g.fillCircle(cx - 6, H - 76, 4);
        g.fillCircle(cx + 10, H - 78, 4);
        g.fillCircle(cx - 20, H - 74, 4);

        // Queue des pommes (fine ligne verte)
        g.lineStyle(1, 0x33691E, 1);
        g.beginPath();
        g.moveTo(cx - 14, H - 65); g.lineTo(cx - 14, H - 68);
        g.moveTo(cx + 14, H - 69); g.lineTo(cx + 14, H - 72);
        g.moveTo(cx, H - 63); g.lineTo(cx, H - 66);
        g.strokePath();

        g.generateTexture('tex_apple_tree', W, H);
        g.destroy();
    }

    /**
     * Génère les icônes des outils
     */
    private generateToolTextures(): void {
        const size = 32;

        // ICO-COUTEAU
        if (!this.scene.textures.exists('tex_icon_knife')) {
            const g = this.scene.make.graphics({ x: 0, y: 0 });
            // Manche
            g.fillStyle(0x5D4037, 1);
            g.fillRect(8, 20, 8, 8);
            // Lame
            g.fillStyle(0xE0E0E0, 1);
            g.beginPath();
            g.moveTo(10, 20);
            g.lineTo(10, 4);
            g.lineTo(16, 4);
            g.lineTo(16, 20);
            g.closePath();
            g.fillPath();

            g.generateTexture('tex_icon_knife', size, size);
            g.destroy();
        }

        // ICO-PIOCHE
        if (!this.scene.textures.exists('tex_icon_pickaxe')) {
            const g = this.scene.make.graphics({ x: 0, y: 0 });
            // Manche
            g.fillStyle(0x5D4037, 1);
            g.fillRect(14, 8, 4, 20);
            // Tête
            g.fillStyle(0x9E9E9E, 1); // Pierre/Fer
            g.beginPath();
            g.moveTo(4, 10);
            g.lineTo(16, 4);
            g.lineTo(28, 10);
            g.lineTo(26, 14);
            g.lineTo(16, 8);
            g.lineTo(6, 14);
            g.closePath();
            g.fillPath();

            g.generateTexture('tex_icon_pickaxe', size, size);
            g.destroy();
        }

        // ICO-PELLE
        if (!this.scene.textures.exists('tex_icon_shovel')) {
            const g = this.scene.make.graphics({ x: 0, y: 0 });
            // Manche
            g.fillStyle(0x5D4037, 1);
            g.fillRect(15, 4, 2, 16);
            // Tête
            g.fillStyle(0x9E9E9E, 1);
            g.beginPath();
            g.moveTo(12, 18);
            g.lineTo(20, 18);
            g.lineTo(18, 28);
            g.lineTo(14, 28);
            g.closePath();
            g.fillPath();

            g.generateTexture('tex_icon_shovel', size, size);
            g.destroy();
        }
    }

    /**
     * Génère la texture du Four
     */
    private generateFurnaceTexture(): void {
        if (this.scene.textures.exists('tex_furnace')) return;

        const size = 64;
        const g = this.scene.make.graphics({ x: 0, y: 0 });

        // Base Pierre (Gris foncé)
        g.fillStyle(0x424242, 1);
        g.fillRect(8, 8, 48, 56); // Base rectangulaire

        // Dessus (Gris un peu plus clair)
        g.fillStyle(0x616161, 1);
        g.fillRect(8, 8, 48, 10);

        // Foyer (Orange/Feu)
        g.fillStyle(0xFF5722, 1);
        g.fillRect(16, 28, 32, 24);

        // Grille devant foyer (Lignes noires)
        g.lineStyle(2, 0x212121, 1);
        g.beginPath();
        g.moveTo(20, 28); g.lineTo(20, 52);
        g.moveTo(28, 28); g.lineTo(28, 52);
        g.moveTo(36, 28); g.lineTo(36, 52);
        g.moveTo(44, 28); g.lineTo(44, 52);
        g.strokePath();

        g.generateTexture('tex_furnace', size, size);
        g.destroy();
    }

    /**
     * Génère les textures de céramique / outils spéciaux
     */
    private generateCeramicTexture(): void {
        // POT EN ARGILE
        if (!this.scene.textures.exists('tex_pot')) {
            const size = 32;
            const g = this.scene.make.graphics({ x: 0, y: 0 });

            // Forme Trapèze inversé (Terracotta)
            g.fillStyle(0xD84315, 1);
            g.beginPath();
            g.moveTo(6, 4);
            g.lineTo(26, 4);
            g.lineTo(22, 28);
            g.lineTo(10, 28);
            g.closePath();
            g.fillPath();

            // Bordure haut
            g.fillStyle(0xBF360C, 1);
            g.fillRect(4, 2, 24, 4);

            g.generateTexture('tex_pot', size, size);
            g.destroy();
        }

        // ARROSOIR
        if (!this.scene.textures.exists('tex_watering_can')) {
            const size = 32;
            const g = this.scene.make.graphics({ x: 0, y: 0 });

            // Corps (Bleu/Metal)
            g.fillStyle(0x64B5F6, 1);
            g.fillRect(8, 10, 16, 18);

            // Anse
            g.lineStyle(3, 0x42A5F5, 1);
            g.beginPath();
            g.moveTo(8, 14);
            g.lineTo(2, 8);
            g.lineTo(8, 4);
            g.lineTo(24, 4);
            g.strokePath();

            // Bec
            g.fillStyle(0x90CAF9, 1);
            g.beginPath();
            g.moveTo(24, 14);
            g.lineTo(30, 8);
            g.lineTo(30, 10);
            g.lineTo(24, 18);
            g.closePath();
            g.fillPath();

            g.generateTexture('tex_watering_can', size, size);
            g.destroy();
        }
    }

    /**
     * Génère les textures agricoles (Graines, Pot planté)
     */
    private generateAgriTextures(): void {
        const size = 32;

        // GRAINES DE COTON
        if (!this.scene.textures.exists('tex_seeds_cotton')) {
            const g = this.scene.make.graphics({ x: 0, y: 0 });
            // Quelques points gris/noirs
            g.fillStyle(0x424242, 1);
            g.fillCircle(12, 12, 2);
            g.fillCircle(20, 14, 2);
            g.fillCircle(16, 20, 2);
            g.fillCircle(10, 22, 2);
            g.fillCircle(24, 24, 2);

            g.generateTexture('tex_seeds_cotton', size, size);
            g.destroy();
        }

        // POT PLANTÉ (Seeded)
        if (!this.scene.textures.exists('tex_pot_seeded')) {
            const g = this.scene.make.graphics({ x: 0, y: 0 });

            // 1. Le Pot
            g.fillStyle(0xD84315, 1);
            g.beginPath();
            g.moveTo(6, 4);
            g.lineTo(26, 4);
            g.lineTo(22, 28);
            g.lineTo(10, 28);
            g.closePath();
            g.fillPath();

            // Bordure haut
            g.fillStyle(0xBF360C, 1);
            g.fillRect(4, 2, 24, 4);

            // 2. La Terre
            g.fillStyle(0x5D4037, 1); // Terre foncée
            g.fillEllipse(16, 4, 10, 3); // Terre au sommet

            // 3. La Gaine plantée
            g.fillStyle(0x4CAF50, 1); // Vert
            g.fillCircle(16, 4, 2); // Petit point vert au centre

            g.generateTexture('tex_pot_seeded', size, size);
            g.destroy();
        }

        // POT ARROSÉ (Watered)
        if (!this.scene.textures.exists('tex_pot_watered')) {
            const g = this.scene.make.graphics({ x: 0, y: 0 });

            // 1. Le Pot
            g.fillStyle(0xD84315, 1);
            g.beginPath();
            g.moveTo(6, 4);
            g.lineTo(26, 4);
            g.lineTo(22, 28);
            g.lineTo(10, 28);
            g.closePath();
            g.fillPath();

            // Bordure haut
            g.fillStyle(0xBF360C, 1);
            g.fillRect(4, 2, 24, 4);

            // 2. La Terre Mouillée (Bleu/Marron foncé)
            g.fillStyle(0x3E2723, 1); // Très foncé
            g.fillEllipse(16, 4, 10, 3);
            g.fillStyle(0x29B6F6, 0.5); // Reflet eau bleu
            g.fillEllipse(16, 4, 8, 2);

            // 3. La Gaine (Toujours là)
            g.fillStyle(0x4CAF50, 1);
            g.fillCircle(16, 4, 2);

            g.generateTexture('tex_pot_watered', size, size);
            g.destroy();
        }

        // POT PRET (Ready - Cotton)
        if (!this.scene.textures.exists('tex_pot_ready')) {
            const h = 48; // Plus haut pour la plante
            const g = this.scene.make.graphics({ x: 0, y: 0 });

            // Offset Y pour dessiner le pot en bas (h=48, pot height~32)
            const oy = 16;

            // 1. Le Pot (Décalé vers le bas)
            g.fillStyle(0xD84315, 1);
            g.beginPath();
            g.moveTo(6, 4 + oy);
            g.lineTo(26, 4 + oy);
            g.lineTo(22, 28 + oy);
            g.lineTo(10, 28 + oy);
            g.closePath();
            g.fillPath();
            g.fillStyle(0xBF360C, 1);
            g.fillRect(4, 2 + oy, 24, 4);

            // 2. La Plante (Coton)
            // Tiges
            g.lineStyle(2, 0x2E7D32, 1);
            g.beginPath();
            g.moveTo(16, 4 + oy);
            g.lineTo(16, -5 + oy); // Tige principale montant
            g.moveTo(16, 0 + oy);
            g.lineTo(8, -2 + oy);
            g.moveTo(16, -2 + oy);
            g.lineTo(24, -8 + oy);
            g.strokePath();

            // Boules de coton (Blanches)
            g.fillStyle(0xFFFFFF, 1);
            g.fillCircle(16, -6 + oy, 4); // Top
            g.fillCircle(8, -2 + oy, 3); // Left
            g.fillCircle(24, -8 + oy, 3); // Right

            g.generateTexture('tex_pot_ready', size, h);
            g.destroy();
        }
    }
}
