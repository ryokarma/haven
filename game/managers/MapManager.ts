import { Scene } from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { IsoMath } from '../utils/IsoMath';
import { TileManager } from './TileManager';
import { ObjectManager } from './ObjectManager';

/**
 * Gère la génération et les données de la carte
 */
export class MapManager {
    private scene: Scene;
    private tileManager: TileManager;
    private objectManager: ObjectManager;
    private _gridData: number[][] = [];
    private mapOriginX: number;
    private mapOriginY: number;

    constructor(
        scene: Scene,
        tileManager: TileManager,
        objectManager: ObjectManager,
        mapOriginX: number,
        mapOriginY: number
    ) {
        this.scene = scene;
        this.tileManager = tileManager;
        this.objectManager = objectManager;
        this.mapOriginX = mapOriginX;
        this.mapOriginY = mapOriginY;
    }

    /**
     * Récupère les données de la grille
     */
    get gridData(): number[][] {
        return this._gridData;
    }

    /**
     * Génère la carte complète (terrain, lacs, obstacles)
     */
    generate(): void {
        this.initGrid();
        this.placeLakes();
        this.finalizeMap();
    }

    /**
     * Initialise la grille vide
     */
    private initGrid(): void {
        this._gridData = [];
        for (let y = 0; y < GameConfig.MAP_SIZE; y++) {
            const col: number[] = [];
            for (let x = 0; x < GameConfig.MAP_SIZE; x++) {
                col.push(0);
            }
            this._gridData.push(col);
        }
    }

    /**
     * Place les lacs procéduraux
     */
    private placeLakes(): void {
        const lakesConfig = GameConfig.MAP_GENERATION.lakes;
        const lakeCenters: { x: number, y: number }[] = [];
        const attempts = lakesConfig.attempts;

        for (let i = 0; i < attempts; i++) {
            const size = Phaser.Math.RND.pick(lakesConfig.sizes);
            const x = Phaser.Math.Between(1, GameConfig.MAP_SIZE - size - 1);
            const y = Phaser.Math.Between(1, GameConfig.MAP_SIZE - size - 1);

            // Vérification des zones protégées
            const lakeRect = new Phaser.Geom.Rectangle(x, y, size, size);

            // Zone maison
            const houseRect = new Phaser.Geom.Rectangle(
                GameConfig.HOUSE.x - 2,
                GameConfig.HOUSE.y - 2,
                GameConfig.HOUSE.width + 4,
                GameConfig.HOUSE.height + 4
            );

            // Zone départ
            const startRect = new Phaser.Geom.Rectangle(0, 0, 5, 5);

            if (Phaser.Geom.Rectangle.Overlaps(lakeRect, houseRect) ||
                Phaser.Geom.Rectangle.Overlaps(lakeRect, startRect)) {
                continue;
            }

            // Vérification distance autres lacs
            let tooClose = false;
            for (const center of lakeCenters) {
                const dist = Phaser.Math.Distance.Between(x + size / 2, y + size / 2, center.x, center.y);
                if (dist < lakesConfig.minDistance) {
                    tooClose = true;
                    break;
                }
            }

            if (tooClose) continue;

            // Application
            // Application
            for (let ly = 0; ly < size; ly++) {
                const mapRow = this._gridData[y + ly];
                if (!mapRow) continue;

                for (let lx = 0; lx < size; lx++) {
                    mapRow[x + lx] = 2; // Eau
                }
            }
            lakeCenters.push({ x: x + size / 2, y: y + size / 2 });
        }
    }

    /**
     * Finalise la carte en plaçant tuiles et objets
     */
    private finalizeMap(): void {
        for (let y = 0; y < GameConfig.MAP_SIZE; y++) {
            if (!this._gridData[y]) continue;

            for (let x = 0; x < GameConfig.MAP_SIZE; x++) {
                let cellType = this._gridData[y][x];
                const isInHouse = this.isInsideHouse(x, y);

                // Chance d'obstacle
                if (cellType === 0 && !isInHouse && (x !== 0 || y !== 0)) {
                    if (Math.random() < GameConfig.MAP_GENERATION.obstacleChance) {
                        cellType = 1;
                        this._gridData[y][x] = 1;
                    }
                }

                let tileKey = '';
                if (isInHouse) {
                    tileKey = 'floor_wood';
                    if (cellType !== 0) {
                        cellType = 0;
                        this._gridData[y][x] = 0;
                    }
                } else if (cellType === 2) {
                    tileKey = 'tile_flat_0'; // Placeholder eau
                } else {
                    tileKey = this.tileManager.getRandomTileKey();
                }

                // Affichage Tuile
                this.tileManager.placeTile(
                    x, y, tileKey,
                    this.mapOriginX, this.mapOriginY,
                    this._gridData,
                    cellType
                );

                // Affichage Objet
                if (cellType === 1) {
                    const type = Math.random() > GameConfig.MAP_GENERATION.treeVsRockRatio ? 'tree' : 'rock';
                    this.objectManager.placeObject(x, y, type, this.mapOriginX, this.mapOriginY);
                }
            }
        }
    }

    /**
     * Vérifie si les coordonnées sont dans la maison
     */
    public isInsideHouse(x: number, y: number): boolean {
        return (
            x >= GameConfig.HOUSE.x &&
            x < GameConfig.HOUSE.x + GameConfig.HOUSE.width &&
            y >= GameConfig.HOUSE.y &&
            y < GameConfig.HOUSE.y + GameConfig.HOUSE.height
        );
    }

    /**
     * Met à jour une cellule (ex: après récolte)
     */
    public updateCell(x: number, y: number, type: number): void {
        if (this._gridData[y]) {
            this._gridData[y][x] = type;
        }
    }
}
