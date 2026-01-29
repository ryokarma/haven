import Phaser from 'phaser';
import { IsoMath } from '../utils/IsoMath';
import { GameConfig } from '../config/GameConfig';

/**
 * Gestionnaire du sélecteur de tuile
 * Gère l'affichage de la tuile survolée par le curseur
 */
export class TileSelector {
    private scene: Phaser.Scene;
    private graphics: Phaser.GameObjects.Graphics;
    private mapOriginX: number;
    private mapOriginY: number;
    private gridSize: number;

    constructor(scene: Phaser.Scene, mapOriginX: number, mapOriginY: number, gridSize: number) {
        this.scene = scene;
        this.mapOriginX = mapOriginX;
        this.mapOriginY = mapOriginY;
        this.gridSize = gridSize;

        this.graphics = scene.add.graphics();
        this.createSelector();
    }

    /**
     * Crée le graphique du sélecteur
     */
    private createSelector(): void {
        this.graphics.lineStyle(
            GameConfig.SELECTOR.lineWidth,
            GameConfig.SELECTOR.normalColor,
            GameConfig.SELECTOR.normalAlpha
        );

        const pts = IsoMath.getDebugPoints();
        if (pts.length > 0) {
            this.graphics.beginPath();
            this.graphics.moveTo(pts[0]!.x, pts[0]!.y);
            for (let i = 1; i < pts.length; i++) {
                this.graphics.lineTo(pts[i]!.x, pts[i]!.y);
            }
            this.graphics.closePath();
            this.graphics.strokePath();
        }
        this.graphics.setVisible(false);
        this.graphics.setDepth(99999);
    }

    /**
     * Met à jour la position et l'apparence du sélecteur
     */
    update(pointer: Phaser.Input.Pointer, camera: Phaser.Cameras.Scene2D.Camera, gridData: number[][]): void {
        const worldPoint = pointer.positionToCamera(camera) as Phaser.Math.Vector2;
        const coords = IsoMath.isoToGrid(worldPoint.x, worldPoint.y, this.mapOriginX, this.mapOriginY);

        if (this.isValidTile(coords.x, coords.y)) {
            this.graphics.setVisible(true);
            const isoPt = IsoMath.gridToIso(coords.x, coords.y, this.mapOriginX, this.mapOriginY);
            this.graphics.setPosition(isoPt.x, isoPt.y);

            // Change la couleur selon si c'est un obstacle ou de l'eau (non marchable)
            const isWalkable = gridData[coords.y] &&
                gridData[coords.y][coords.x] !== undefined &&
                gridData[coords.y][coords.x] === 0;

            if (!isWalkable) {
                this.graphics.clear();
                this.graphics.lineStyle(
                    GameConfig.SELECTOR.lineWidth,
                    GameConfig.SELECTOR.obstacleColor,
                    GameConfig.SELECTOR.obstacleAlpha
                );
            } else {
                this.graphics.clear();
                this.graphics.lineStyle(
                    GameConfig.SELECTOR.lineWidth,
                    GameConfig.SELECTOR.normalColor,
                    GameConfig.SELECTOR.normalAlpha
                );
            }

            const pts = IsoMath.getDebugPoints();
            if (pts.length > 0) {
                this.graphics.beginPath();
                this.graphics.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) {
                    this.graphics.lineTo(pts[i].x, pts[i].y);
                }
                this.graphics.closePath();
                this.graphics.strokePath();
            }
        } else {
            this.graphics.setVisible(false);
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
        this.graphics.destroy();
    }
}
