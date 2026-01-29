/**
 * EXEMPLE D'INTÉGRATION - Auto-Tiling dans MainScene
 * 
 * Ce fichier montre comment intégrer le système d'auto-tiling
 * pour créer des zones d'eau connectées automatiquement.
 */

import { Scene } from 'phaser';
import { TileManager, TileType, GridCell } from '@/game/managers/TileManager';
import { IsoMath } from '@/game/utils/IsoMath';
import { GameConfig } from '@/game/config/GameConfig';

export default class MainSceneWithWater extends Scene {
    private tileManager!: TileManager;
    private gridData: GridCell[][] = [];
    private mapOriginX = 0;
    private mapOriginY = 0;

    create() {
        // Configuration de l'origine de la carte
        this.mapOriginX = GameConfig.MAP_SIZE * (IsoMath.TILE_WIDTH / 2);
        this.mapOriginY = 100;

        // Initialisation du TileManager
        this.tileManager = new TileManager(this);

        // Génération de la carte avec des zones d'eau
        this.generateMapWithWater();
    }

    /**
     * EXEMPLE 1 : Génération simple avec une rivière horizontale
     */
    private generateMapWithWater(): void {
        // Initialiser la grille avec le nouveau format GridCell
        for (let y = 0; y < GameConfig.MAP_SIZE; y++) {
            const row: GridCell[] = [];

            for (let x = 0; x < GameConfig.MAP_SIZE; x++) {
                // Créer une rivière horizontale au milieu de la carte
                const isWaterRow = (y >= 10 && y <= 12);

                if (isWaterRow) {
                    row.push({ type: TileType.WATER, walkable: false });
                } else {
                    row.push({ type: TileType.EMPTY, walkable: true });
                }
            }

            this.gridData.push(row);
        }

        // Placer les tuiles avec auto-tiling
        this.placeTilesWithAutotiling();
    }

    /**
     * EXEMPLE 2 : Génération avec un lac irrégulier
     */
    private generateMapWithLake(): void {
        // Initialiser la grille
        for (let y = 0; y < GameConfig.MAP_SIZE; y++) {
            const row: GridCell[] = [];

            for (let x = 0; x < GameConfig.MAP_SIZE; x++) {
                row.push({ type: TileType.EMPTY, walkable: true });
            }

            this.gridData.push(row);
        }

        // Créer un lac irrégulier au centre
        const lakeCenter = { x: 15, y: 15 };
        const lakeRadius = 5;

        for (let y = 0; y < GameConfig.MAP_SIZE; y++) {
            for (let x = 0; x < GameConfig.MAP_SIZE; x++) {
                const distance = Math.sqrt(
                    Math.pow(x - lakeCenter.x, 2) +
                    Math.pow(y - lakeCenter.y, 2)
                );

                // Forme irrégulière avec du bruit
                const irregularity = Math.random() * 2;

                if (distance < lakeRadius + irregularity) {
                    this.gridData[y][x] = { type: TileType.WATER, walkable: false };
                }
            }
        }

        // Placer les tuiles avec auto-tiling
        this.placeTilesWithAutotiling();
    }

    /**
     * EXEMPLE 3 : Génération avec plusieurs types de terrain
     */
    private generateMapWithMultipleTerrain(): void {
        // Initialiser la grille
        for (let y = 0; y < GameConfig.MAP_SIZE; y++) {
            const row: GridCell[] = [];

            for (let x = 0; x < GameConfig.MAP_SIZE; x++) {
                // Génération procédurale avec Perlin-like logic
                const noise = this.simpleNoise(x, y);

                let cellType: TileType;
                let walkable: boolean;

                if (noise < 0.3) {
                    // Zone d'eau (30%)
                    cellType = TileType.WATER;
                    walkable = false;
                } else if (noise < 0.5) {
                    // Zone d'obstacles (20%)
                    cellType = TileType.OBSTACLE;
                    walkable = false;
                } else {
                    // Zone normale (50%)
                    cellType = TileType.EMPTY;
                    walkable = true;
                }

                row.push({ type: cellType, walkable });
            }

            this.gridData.push(row);
        }

        // Placer les tuiles avec auto-tiling
        this.placeTilesWithAutotiling();
    }

    /**
     * Place toutes les tuiles de la carte avec auto-tiling pour l'eau
     */
    private placeTilesWithAutotiling(): void {
        for (let y = 0; y < GameConfig.MAP_SIZE; y++) {
            for (let x = 0; x < GameConfig.MAP_SIZE; x++) {
                const cell = this.gridData[y][x];

                if (cell.type === TileType.WATER) {
                    // IMPORTANT : Passer gridData et TileType.WATER pour activer l'auto-tiling
                    this.tileManager.placeTile(
                        x,
                        y,
                        'water_base',           // Texture de base (sera tintée)
                        this.mapOriginX,
                        this.mapOriginY,
                        this.gridData,          // Activer l'auto-tiling
                        TileType.WATER          // Type de tuile
                    );
                } else if (cell.type === TileType.OBSTACLE) {
                    // Les obstacles n'utilisent pas l'auto-tiling pour l'instant
                    this.tileManager.placeTile(
                        x,
                        y,
                        'tile_rock',
                        this.mapOriginX,
                        this.mapOriginY
                    );
                } else {
                    // Les tuiles normales utilisent des variations aléatoires
                    this.tileManager.placeTile(
                        x,
                        y,
                        this.tileManager.getRandomTileKey(),
                        this.mapOriginX,
                        this.mapOriginY
                    );
                }
            }
        }
    }

    /**
     * EXEMPLE 4 : Mise à jour dynamique de l'auto-tiling
     * 
     * Utile quand vous modifiez la grille en jeu (ex: assécher l'eau)
     */
    private dynamicWaterUpdate(x: number, y: number): void {
        // Transformer une tuile d'eau en terre
        this.gridData[y][x] = { type: TileType.EMPTY, walkable: true };

        // Mettre à jour les tuiles voisines affectées
        const neighbors = [
            { x: x, y: y - 1 },     // Nord
            { x: x + 1, y: y },     // Est
            { x: x, y: y + 1 },     // Sud
            { x: x - 1, y: y }      // Ouest
        ];

        for (const neighbor of neighbors) {
            if (this.isValidPosition(neighbor.x, neighbor.y)) {
                const neighborCell = this.gridData[neighbor.y][neighbor.x];

                if (neighborCell.type === TileType.WATER) {
                    // Récupérer la tuile Phaser à cette position
                    // (vous devrez stocker les références quelque part)
                    const tile = this.getTileAt(neighbor.x, neighbor.y);

                    if (tile) {
                        // Recalculer l'auto-tiling pour cette tuile
                        this.tileManager.updateTileAutotiling(
                            neighbor.x,
                            neighbor.y,
                            this.gridData,
                            tile
                        );
                    }
                }
            }
        }
    }

    /**
     * EXEMPLE 5 : Debugging - Afficher les indices d'auto-tiling
     */
    private debugAutotiling(): void {
        console.log('=== CARTE D\'AUTO-TILING ===');

        for (let y = 0; y < Math.min(20, GameConfig.MAP_SIZE); y++) {
            let row = '';

            for (let x = 0; x < Math.min(20, GameConfig.MAP_SIZE); x++) {
                const cell = this.gridData[y][x];

                if (cell.type === TileType.WATER) {
                    const index = this.tileManager.calculateAutotile(
                        x, y, this.gridData, TileType.WATER
                    );
                    row += index.toString(16).toUpperCase().padStart(2, '0') + ' ';
                } else {
                    row += '.. ';
                }
            }

            console.log(row);
        }
    }

    /**
     * Fonction de bruit simple pour la génération procédurale
     */
    private simpleNoise(x: number, y: number): number {
        // Implémentation simple - remplacer par Perlin noise pour de meilleurs résultats
        const seed = x * 12.9898 + y * 78.233;
        return Math.abs(Math.sin(seed) * 43758.5453) % 1.0;
    }

    /**
     * Vérifie si une position est valide dans la grille
     */
    private isValidPosition(x: number, y: number): boolean {
        return x >= 0 && x < GameConfig.MAP_SIZE &&
            y >= 0 && y < GameConfig.MAP_SIZE;
    }

    /**
     * Récupère une tuile à une position donnée
     * Note: Vous devrez implémenter un système de stockage des tuiles
     */
    private getTileAt(x: number, y: number): Phaser.GameObjects.Image | null {
        // PLACEHOLDER - Implémentez votre propre logique de stockage
        // Par exemple, stockez les tuiles dans un tableau 2D :
        // return this.tileSprites[y][x];
        return null;
    }
}

/**
 * NOTES D'IMPLÉMENTATION
 * 
 * 1. Pour intégrer dans votre MainScene existant :
 *    - Changez `gridData: number[][]` en `gridData: GridCell[][]`
 *    - Mettez à jour la génération de carte pour utiliser le format GridCell
 *    - Ajoutez le paramètre gridData et tileType lors du placement d'eau
 * 
 * 2. Si vous voulez garder l'ancien format number[][] :
 *    - Le système est rétrocompatible !
 *    - Utilisez simplement 2 pour représenter l'eau
 *    - Passez quand même TileType.WATER lors du placement
 * 
 * 3. Pour stocker les références aux tuiles (utile pour updateTileAutotiling) :
 *    ```typescript
 *    private tileSprites: Phaser.GameObjects.Image[][] = [];
 *    
 *    // Dans generateMap :
 *    const tile = this.tileManager.placeTile(...);
 *    this.tileSprites[y][x] = tile;
 *    ```
 * 
 * 4. Prochaines étapes possibles :
 *    - Créer des assets graphiques pour les 16 configurations d'eau
 *    - Étendre le système pour d'autres types (herbe, lave, sable)
 *    - Implémenter un bitmasking 8-bits avec diagonales (47 configurations)
 *    - Ajouter des transitions douces entre types de terrain
 */
