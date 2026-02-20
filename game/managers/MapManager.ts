import { Scene } from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { TileManager } from './TileManager';
import { ObjectManager } from './ObjectManager';
import { Perlin } from '../utils/Perlin';
import { useWorldStore } from '../../stores/world';

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
    private rnd: Phaser.Math.RandomDataGenerator;
    private occupiedTiles: Set<string> = new Set();

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
        this.rnd = new Phaser.Math.RandomDataGenerator();
    }

    /**
     * Récupère les données de la grille
     */
    get gridData(): number[][] {
        return this._gridData;
    }

    /**
     * Génère la carte complète (terrain, lacs, obstacles) avec seed
     */
    generate(): void {
        const worldStore = useWorldStore();
        // Initialisation de la seed si pas encore faite (juste au cas où)
        if (!worldStore.worldSeed) {
            worldStore.initSeed();
        }

        console.log(`[MapManager] Génération avec seed: ${worldStore.worldSeed}`);
        // Initialiser le RNG local avec la seed
        this.rnd.sow([worldStore.worldSeed]);

        // Initialiser le bruit de Perlin
        const perlin = new Perlin(this.rnd);

        // TODO: Pour des tailles de carte > 100x100, envisager le Chunking ou WebWorker pour éviter de bloquer le thread principal.
        this.initGrid();
        this.generateTerrain(perlin);
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
     * Génère le terrain (lacs) via Perlin Noise
     */
    private generateTerrain(perlin: Perlin): void {
        const { scale, waterThreshold } = GameConfig.MAP_GENERATION.noise;

        for (let y = 0; y < GameConfig.MAP_SIZE; y++) {
            const row = this._gridData[y];
            if (!row) continue;

            for (let x = 0; x < GameConfig.MAP_SIZE; x++) {
                // Zone protégée (Maison)
                if (this.isInsideHouse(x, y)) continue;

                // Zone de départ protégée (pas d'eau au spawn)
                if (x < 10 && y < 10) continue;

                // Génération du bruit (valeur entre -1 et 1 environ)
                const noiseValue = perlin.noise(x * scale, y * scale);

                // Normalisation 0-1 (optionnel, mais noise brute est ok avec threshold adapté)
                // Ici on utilise directement la valeur du bruit. 
                // Pour Simplex/Perlin, c'est souvent entre -1 et 1.
                // On peut le mapper à 0-1 : (val + 1) / 2

                // Si on a config waterThreshold = 0.3 (config actuelle), ça suppose une valeur positive ?
                // Le commentaire disait "Les valeurs sous 0.3". 
                // Adaptons: (noise + 1) / 2 => range 0..1
                const normalizedNoise = (noiseValue + 1) / 2;

                if (normalizedNoise < waterThreshold) {
                    row[x] = 2; // Eau
                }
            }
        }
    }

    /**
     * Finalise la carte en plaçant tuiles et objets
     */
    private finalizeMap(): void {
        for (let y = 0; y < GameConfig.MAP_SIZE; y++) {
            const row = this._gridData[y];
            if (!row) continue;

            for (let x = 0; x < GameConfig.MAP_SIZE; x++) {
                let cellType = row[x];
                const isInHouse = this.isInsideHouse(x, y);

                // Chance d'obstacle (Désactivé pour la session 4.1 : Server Authority)
                /* if (cellType === 0 && !isInHouse && (x > 5 || y > 5)) {
                    const rnd = this.rnd.frac();
                    const resources = GameConfig.MAP_GENERATION.resources;

                    if (rnd < resources.cotton.chance) {
                        this.objectManager.placeObject(x, y, 'cotton_bush', this.mapOriginX, this.mapOriginY);
                        row[x] = 1;
                    }
                    else if (rnd < resources.cotton.chance + resources.clay.chance) {
                        this.objectManager.placeObject(x, y, 'clay_mound', this.mapOriginX, this.mapOriginY);
                        row[x] = 1;
                    }
                    else if (rnd < resources.cotton.chance + resources.clay.chance + GameConfig.MAP_GENERATION.obstacleChance) {
                        const type = this.rnd.frac() > GameConfig.MAP_GENERATION.treeVsRockRatio ? 'tree' : 'rock';
                        this.objectManager.placeObject(x, y, type, this.mapOriginX, this.mapOriginY);
                        row[x] = 1;
                    }
                } */

                let tileKey = '';
                if (isInHouse) {
                    tileKey = 'floor_wood';
                    // Nettoyer si jamais du noise a mis de l'eau (double check)
                    if (cellType !== 0) {
                        cellType = 0;
                        row[x] = 0;
                    }
                } else if (cellType === 2) {
                    tileKey = 'tile_flat_0'; // Placeholder eau - l'autotiling gérera ça
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

                // Affichage Objet (Désactivé aussi pour éviter les duplicatas si mapData était utilisé autrement)
                /* if (cellType === 1) {
                    const type = this.rnd.frac() > GameConfig.MAP_GENERATION.treeVsRockRatio ? 'tree' : 'rock';
                    this.objectManager.placeObject(x, y, type, this.mapOriginX, this.mapOriginY);
                } */
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
    /**
     * Peuple la carte depuis l'état serveur (WORLD_STATE).
     * Délègue le rendu visuel à ObjectManager.syncWorldObjects() pour un nettoyage propre.
     * La grille de collision (gridData + occupiedTiles) est mise à jour via le callback.
     *
     * @param resources - Liste des ressources reçues du serveur
     */
    public populateFromState(resources: any[]): void {
        console.log(`[MapManager] populateFromState — ${resources.length} ressource(s) à instancier.`);

        // Réinitialise les tiles occupées par des ressources serveur
        // (les objets placés par le joueur sont gérés séparément)
        this.occupiedTiles.clear();

        // Délégation à ObjectManager : nettoyage + instanciation des sprites
        this.objectManager.syncWorldObjects(
            resources,
            this.mapOriginX,
            this.mapOriginY,
            // Callback : mise à jour grille de collision pour chaque objet créé
            (res, isFloor) => {
                this.updateCell(res.x, res.y, isFloor ? 0 : 1);
                this.occupiedTiles.add(`${res.x},${res.y}`);
            }
        );
    }

    /**
     * Vérifie si une tuile est occupée par une ressource
     */
    public isTileOccupied(x: number, y: number): boolean {
        return this.occupiedTiles.has(`${x},${y}`) || this.isInsideHouse(x, y);
    }

    /**
     * Ajoute une ressource (venant du serveur)
     * resource = { id, type: "obstacle"|"floor", asset: "tree"|"rock"|"path_stone", x, y }
     */
    public addResource(resource: any): void {
        // Le sprite utilise 'asset' (ex: "tree"), pas 'type' (ex: "obstacle")
        const spriteKey = resource.asset || resource.type;

        this.objectManager.placeObject(
            resource.x,
            resource.y,
            spriteKey,
            this.mapOriginX,
            this.mapOriginY,
            false,
            resource.id
        );

        // Gestion Walkability : floor = traversable (0), obstacle = bloquant (1)
        const isFloor = resource.type === 'floor' || spriteKey.includes('path');
        this.updateCell(resource.x, resource.y, isFloor ? 0 : 1);

        // Toujours ajouter aux occupiedTiles pour empêcher de reconstruire par dessus
        this.occupiedTiles.add(`${resource.x},${resource.y}`);
    }

    /**
     * Supprime une ressource (venant du serveur)
     */
    public removeResource(id: string, x?: number, y?: number): void {
        if (x !== undefined && y !== undefined) {
            // Suppression rapide par coord
            this.objectManager.removeObject(x, y);
            this.updateCell(x, y, 0);
            this.occupiedTiles.delete(`${x},${y}`);
        } else {
            // Fallback par ID
            // Note: updateCell sera plus dur sans x,y si ObjectManager ne retourne pas l'obj détruit
            // Mais on va supposer que le serveur envoie x,y (ajouté dans le backend)
            this.objectManager.removeObjectById(id);
            // TODO: Retrouver les coords pour updateCell(0) si x,y manquants ?
            // Pour l'instant on compte sur le backend qui envoie x,y
        }
    }
}
