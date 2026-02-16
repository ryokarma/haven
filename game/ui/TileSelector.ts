import Phaser from 'phaser';
import { IsoMath } from '../utils/IsoMath';
import { GameConfig } from '../config/GameConfig';

/**
 * Gestionnaire du sélecteur de tuile
 * Gère l'affichage de la tuile survolée par le curseur
 */
export class TileSelector {
    private scene: Phaser.Scene;
    private reticle: Phaser.GameObjects.Graphics;
    private mapOriginX: number;
    private mapOriginY: number;
    private gridSize: number;

    constructor(scene: Phaser.Scene, mapOriginX: number, mapOriginY: number, gridSize: number) {
        this.scene = scene;
        this.mapOriginX = mapOriginX;
        this.mapOriginY = mapOriginY;
        this.gridSize = gridSize;

        this.reticle = scene.add.graphics();
        this.createReticle();
    }

    /**
     * Crée le réticule (Curseur Graphique)
     */
    private createReticle(): void {
        this.reticle.clear();

        // Dessine un losange isométrique propre
        // Couleur blanche, alpha 0.5, épaisseur 2
        this.reticle.lineStyle(2, 0xffffff, 0.5);
        this.reticle.fillStyle(0xffffff, 0.1); // Remplissage très léger

        // Points relatifs pour un losange isométrique standard (taille d'une tuile)
        // Utilsant IsoMath.TILE_WIDTH et TILE_HEIGHT implicitement ou via config
        // On dessine le losange centré sur 0,0
        const w = IsoMath.TILE_WIDTH;
        const h = IsoMath.TILE_HEIGHT;

        this.reticle.beginPath();
        this.reticle.moveTo(0, -h / 2);
        this.reticle.lineTo(w / 2, 0);
        this.reticle.lineTo(0, h / 2);
        this.reticle.lineTo(-w / 2, 0);
        this.reticle.closePath();

        this.reticle.strokePath();
        this.reticle.fillPath();

        this.reticle.setVisible(false);
        this.reticle.setDepth(99999); // Toujours au-dessus

        // Animation "Breathing"
        this.scene.tweens.add({
            targets: this.reticle,
            scaleX: 1.05,
            scaleY: 1.05,
            alpha: 0.8,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * Met à jour la position et l'apparence du sélecteur
     */
    update(pointer: Phaser.Input.Pointer, camera: Phaser.Cameras.Scene2D.Camera, gridData: number[][]): void {
        const worldPoint = pointer.positionToCamera(camera) as Phaser.Math.Vector2;
        const coords = IsoMath.isoToGrid(worldPoint.x, worldPoint.y, this.mapOriginX, this.mapOriginY);

        if (this.isValidTile(coords.x, coords.y)) {
            this.reticle.setVisible(true);
            const isoPt = IsoMath.gridToIso(coords.x, coords.y, this.mapOriginX, this.mapOriginY);
            this.reticle.setPosition(isoPt.x, isoPt.y);

            // Change la couleur selon si c'est un obstacle ou de l'eau
            // On peut modifier le tint ou redessiner si nécessaire, mais le tint est plus performant sur Graphics ?
            // Graphics n'a pas setTint universellement simple sans pipeline, 
            // on va simplifier : si obstacle, on change l'alpha ou la couleur via clear/redraw si besoin, 
            // mais l'instruction demande surtout un "Réticule" subtil.
            // On peut garder le blanc par défaut, ou passer au rouge si bloqué ?
            // L'instruction : "On ne veut voir QUE la case survolée."

            const isWalkable = gridData[coords.y] &&
                gridData[coords.y][coords.x] !== undefined &&
                gridData[coords.y][coords.x] === 0;

            if (!isWalkable) {
                // Optionnel : Rouge si bloqué, mais "subtil" demandé.
                // Reset to white logic implicitly or change prop if needed.
                // Pour l'instant on garde le style "Propre" blanc défini dans createReticle.
            }

        } else {
            this.reticle.setVisible(false);
        }
    }

    /**
     * Vérifie si une tuile est valide
     */
    private isValidTile(x: number, y: number): boolean {
        return x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize;
    }

    /**
     * Détruit le sélecteur
     */
    destroy(): void {
        this.reticle.destroy();
    }
}
