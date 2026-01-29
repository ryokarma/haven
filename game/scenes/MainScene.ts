import { Scene } from 'phaser';
import { usePlayerStore } from '@/stores/player';
import { IsoMath } from '@/game/utils/IsoMath';
import { GameConfig } from '@/game/config/GameConfig';
import { TextureGenerator } from '@/game/graphics/TextureGenerator';
import { PathfindingManager } from '@/game/managers/PathfindingManager';
import { TileManager } from '@/game/managers/TileManager';
import { ObjectManager } from '@/game/managers/ObjectManager';
import { AmbianceManager } from '@/game/managers/AmbianceManager';
import { TileSelector } from '@/game/ui/TileSelector';
import { Player } from '@/game/entities/Player';

/**
 * Scène principale du jeu
 * Point central qui orchestre tous les managers et la logique de jeu
 */
export default class MainScene extends Scene {
    // Managers
    private pathfindingManager!: PathfindingManager;
    private tileManager!: TileManager;
    private objectManager!: ObjectManager;
    private ambianceManager!: AmbianceManager;
    private tileSelector!: TileSelector;
    private textureGenerator!: TextureGenerator;

    // Entities
    private player!: Player;

    // État du jeu
    private gridData: number[][] = [];
    private houseRoof: Phaser.GameObjects.Image | null = null;

    // État de mouvement
    private isMoving: boolean = false;
    private currentPath: { x: number; y: number }[] = [];
    private pendingAction: (() => void) | null = null;

    // Coordonnées de la carte
    private mapOriginX = 0;
    private mapOriginY = 0;

    // Navigation & UI
    private isDraggingMap = false;
    private dragStartX = 0;
    private dragStartY = 0;
    private ignoreNextMapClick = false;

    // Store
    private playerStore: any = null;

    constructor() {
        super('MainScene');
    }

    preload() {
        // Chargement des assets externes
        this.load.image('tree', '/assets/tree.png');
        this.load.image('rock', '/assets/rock.png');

        // Génération des textures procédurales
        this.textureGenerator = new TextureGenerator(this);
        this.textureGenerator.generateAll();
    }

    create() {
        this.playerStore = usePlayerStore();

        // Configuration de l'origine de la carte
        this.mapOriginX = GameConfig.MAP_SIZE * (IsoMath.TILE_WIDTH / 2);
        this.mapOriginY = 100;

        // Initialisation des managers
        this.tileManager = new TileManager(this);
        this.objectManager = new ObjectManager(this);
        this.ambianceManager = new AmbianceManager(this);

        // Génération de la carte
        this.generateMap();

        // Initialisation du pathfinding avec déplacements diagonaux
        this.pathfindingManager = new PathfindingManager(this.gridData);

        // Création du toit de la maison
        this.createHouseRoof();

        // Création du sélecteur de tuile
        this.tileSelector = new TileSelector(
            this,
            this.mapOriginX,
            this.mapOriginY,
            GameConfig.MAP_SIZE
        );

        // Création du joueur
        this.player = new Player(
            this,
            this.playerStore.position.x,
            this.playerStore.position.y,
            this.mapOriginX,
            this.mapOriginY
        );
        this.player.setTint(this.playerStore.color);

        // Configuration de la caméra
        this.cameras.main.startFollow(
            this.player.getSprite(),
            true,
            GameConfig.MOVEMENT.cameraSmoothness,
            GameConfig.MOVEMENT.cameraSmoothness
        );
        this.cameras.main.setZoom(GameConfig.CAMERA.initialZoom);

        // Création de l'ambiance
        this.ambianceManager.createFireflies(this.player.getSprite());

        // Configuration des événements d'entrée
        this.setupInputEvents();

        // Vérifier la visibilité du toit
        const playerPos = this.player.getGridPosition();
        this.checkRoofVisibility(playerPos.x, playerPos.y);

        // Timer pour le système de survie - dégrade les stats toutes les 5 secondes
        this.time.addEvent({
            delay: 5000, // 5 secondes
            callback: () => {
                this.playerStore.tickStats();
            },
            loop: true
        });
    }

    override update() {
        // Mise à jour du sélecteur de tuile
        this.tileSelector.update(
            this.input.activePointer,
            this.cameras.main,
            this.gridData
        );
    }

    /**
     * Génère la carte du jeu
     */
    /**
     * Génère la carte du jeu
     */
    private generateMap(): void {
        // 1. Initialisation de la grille vide (tout à 0)
        this.gridData = [];
        for (let y = 0; y < GameConfig.MAP_SIZE; y++) {
            const col: number[] = [];
            for (let x = 0; x < GameConfig.MAP_SIZE; x++) {
                col.push(0);
            }
            this.gridData.push(col);
        }

        // 2. Placement des lacs (avant les obstacles pour qu'ils soient prioritaires)
        this.placeLakes();

        // 3. Placement des tuiles visuelles et des obstacles
        for (let y = 0; y < GameConfig.MAP_SIZE; y++) {
            if (!this.gridData[y]) continue;

            for (let x = 0; x < GameConfig.MAP_SIZE; x++) {
                let cellType = this.gridData[y][x];
                const isInHouse = this.isInsideHouse(x, y);

                // Si la case est vide (0) et pas dans la maison ni au start, chance d'obstacle
                if (cellType === 0 && !isInHouse && (x !== 0 || y !== 0)) {
                    if (Math.random() < GameConfig.MAP_GENERATION.obstacleChance) {
                        cellType = 1;
                        this.gridData[y][x] = 1; // Mettre à jour la grille
                    }
                }

                let tileKey = '';
                if (isInHouse) {
                    tileKey = 'floor_wood';
                    // Force le type 0 dans la maison au cas où
                    if (cellType !== 0) {
                        cellType = 0;
                        this.gridData[y][x] = 0;
                    }
                } else if (cellType === 2) {
                    // Tuile d'eau
                    tileKey = 'tile_flat_0';
                } else {
                    tileKey = this.tileManager.getRandomTileKey();
                }

                // Placer la tuile
                this.tileManager.placeTile(
                    x,
                    y,
                    tileKey,
                    this.mapOriginX,
                    this.mapOriginY,
                    this.gridData,
                    cellType
                );

                // Placer l'objet si c'est un obstacle
                if (cellType === 1) {
                    const type = Math.random() > GameConfig.MAP_GENERATION.treeVsRockRatio
                        ? 'tree'
                        : 'rock';
                    this.objectManager.placeObject(x, y, type, this.mapOriginX, this.mapOriginY);
                }
            }
        }
    }

    /**
     * Place des lacs de taille fixe avec espacement minimum
     */
    private placeLakes(): void {
        const lakesConfig = GameConfig.MAP_GENERATION.lakes;
        const lakeCenters: { x: number, y: number }[] = [];
        const attempts = lakesConfig.attempts;

        for (let i = 0; i < attempts; i++) {
            // Choisir une taille aléatoire (3x3 ou 4x4)
            const size = Phaser.Math.RND.pick(lakesConfig.sizes);

            // Choisir une position aléatoire (en gardant une marge pour que le lac soit entier)
            const x = Phaser.Math.Between(1, GameConfig.MAP_SIZE - size - 1);
            const y = Phaser.Math.Between(1, GameConfig.MAP_SIZE - size - 1);

            // Vérifier les conflits (Maison, Start)
            const lakeRect = new Phaser.Geom.Rectangle(x, y, size, size);

            // Zone de la maison (avec marge)
            const houseRect = new Phaser.Geom.Rectangle(
                GameConfig.HOUSE.x - 2,
                GameConfig.HOUSE.y - 2,
                GameConfig.HOUSE.width + 4,
                GameConfig.HOUSE.height + 4
            );

            // Zone de départ (avec marge)
            const startRect = new Phaser.Geom.Rectangle(0, 0, 5, 5);

            if (Phaser.Geom.Rectangle.Overlaps(lakeRect, houseRect) ||
                Phaser.Geom.Rectangle.Overlaps(lakeRect, startRect)) {
                continue;
            }

            // Vérifier la distance avec les autres lacs
            let tooClose = false;
            for (const center of lakeCenters) {
                const dist = Phaser.Math.Distance.Between(x + size / 2, y + size / 2, center.x, center.y);
                if (dist < lakesConfig.minDistance) {
                    tooClose = true;
                    break;
                }
            }

            if (tooClose) continue;

            // Placer le lac
            for (let ly = 0; ly < size; ly++) {
                if (!this.gridData[y + ly]) continue;
                for (let lx = 0; lx < size; lx++) {
                    this.gridData[y + ly][x + lx] = 2; // Type Eau
                }
            }

            // Enregistrer le centre
            lakeCenters.push({ x: x + size / 2, y: y + size / 2 });
        }
    }

    /**
     * Configure tous les événements d'entrée
     */
    private setupInputEvents(): void {
        // Clic sur un objet
        this.input.on('gameobjectup', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image) => {
            const gridX = gameObject.getData('gridX');
            const gridY = gameObject.getData('gridY');
            if (gridX !== undefined && gridY !== undefined) {
                this.handleHarvestIntent(gridX, gridY);
                this.ignoreNextMapClick = true;
            }
        });

        // Début du drag
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.dragStartX = pointer.x;
            this.dragStartY = pointer.y;
            this.isDraggingMap = false;
        });

        // Déplacement de la carte
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (pointer.isDown && pointer.prevPosition) {
                this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
                this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;

                if (Phaser.Math.Distance.Between(pointer.x, pointer.y, this.dragStartX, this.dragStartY) > 5) {
                    this.isDraggingMap = true;
                }
            }
        });

        // Zoom avec la molette
        this.input.on('wheel', (pointer: any, gameObjects: any, deltaX: number, deltaY: number) => {
            if (deltaY > 0) {
                this.cameras.main.zoom = Math.max(
                    GameConfig.CAMERA.minZoom,
                    this.cameras.main.zoom - GameConfig.CAMERA.zoomSpeed
                );
            } else {
                this.cameras.main.zoom = Math.min(
                    GameConfig.CAMERA.maxZoom,
                    this.cameras.main.zoom + GameConfig.CAMERA.zoomSpeed
                );
            }
        });

        // Clic sur la carte
        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (this.ignoreNextMapClick) {
                this.ignoreNextMapClick = false;
                return;
            }
            if (!this.isDraggingMap) {
                this.handleClick(pointer);
            }
            this.isDraggingMap = false;
        });
    }

    /**
     * Gère le clic sur la carte
     */
    private handleClick(pointer: Phaser.Input.Pointer): void {
        const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
        const target = IsoMath.isoToGrid(worldPoint.x, worldPoint.y, this.mapOriginX, this.mapOriginY);

        if (!this.isValidTile(target.x, target.y)) return;

        if (this.gridData[target.y] && this.gridData[target.y][target.x] === 1) {
            this.handleHarvestIntent(target.x, target.y);
            return;
        }

        this.startMove(target.x, target.y, null);
    }

    /**
     * Gère l'intention de récolter une ressource
     */
    private handleHarvestIntent(targetX: number, targetY: number): void {
        // Trouve les tuiles adjacentes (incluant les diagonales)
        const neighbors = [
            { x: targetX + 1, y: targetY },
            { x: targetX - 1, y: targetY },
            { x: targetX, y: targetY + 1 },
            { x: targetX, y: targetY - 1 },
            { x: targetX + 1, y: targetY + 1 },
            { x: targetX + 1, y: targetY - 1 },
            { x: targetX - 1, y: targetY + 1 },
            { x: targetX - 1, y: targetY - 1 }
        ];

        const validNeighbors = neighbors.filter(n =>
            this.isValidTile(n.x, n.y) &&
            this.gridData[n.y] &&
            this.gridData[n.y][n.x] === 0
        );

        if (validNeighbors.length === 0) return;

        const playerPos = this.player.getGridPosition();
        const bestSpot = validNeighbors.sort((a, b) => {
            const d1 = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, a.x, a.y);
            const d2 = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, b.x, b.y);
            return d1 - d2;
        })[0];

        if (bestSpot) {
            this.startMove(bestSpot.x, bestSpot.y, () => {
                this.harvestResource(targetX, targetY);
            });
        }
    }

    /**
     * Récolte une ressource
     */
    private harvestResource(x: number, y: number): void {
        const object = this.objectManager.getObject(x, y);

        if (object) {
            this.tweens.add({
                targets: object,
                x: object.x + 5,
                yoyo: true,
                duration: 50,
                repeat: 3,
                onComplete: () => {
                    const textureKey = object.texture.key;
                    let itemDropped = '';

                    if (textureKey === 'tree') itemDropped = 'Bois';
                    else if (textureKey === 'rock') itemDropped = 'Pierre';

                    this.objectManager.removeObject(x, y);
                    if (this.gridData[y]) {
                        this.gridData[y][x] = 0;
                        this.pathfindingManager.updateGrid(this.gridData);
                    }

                    if (itemDropped) {
                        this.playerStore.addItem(itemDropped);
                    }
                }
            });
        }
    }

    /**
     * Démarre le déplacement vers une position
     */
    private startMove(x: number, y: number, onComplete: (() => void) | null): void {
        this.tweens.killTweensOf(this.player.getSprite());
        this.currentPath = [];
        this.pendingAction = onComplete;

        const playerPos = this.player.getGridPosition();

        this.pathfindingManager.findPath(playerPos.x, playerPos.y, x, y, (path) => {
            if (path && path.length > 0) {
                path.shift(); // Retirer la position actuelle
                this.currentPath = path;
                this.isMoving = true;
                this.moveNextStep();
            } else {
                if (playerPos.x === x && playerPos.y === y && this.pendingAction) {
                    this.pendingAction();
                    this.pendingAction = null;
                }
                this.isMoving = false;
            }
        });
    }

    /**
     * Exécute la prochaine étape du déplacement
     */
    private moveNextStep(): void {
        if (this.currentPath.length === 0) {
            this.isMoving = false;
            if (this.pendingAction) {
                this.pendingAction();
                this.pendingAction = null;
            }
            return;
        }

        const nextTile = this.currentPath.shift();
        if (!nextTile) return;

        this.playerStore.move(nextTile.x, nextTile.y);
        this.checkRoofVisibility(nextTile.x, nextTile.y);

        this.player.animateMoveTo(
            nextTile.x,
            nextTile.y,
            this.mapOriginX,
            this.mapOriginY,
            () => this.moveNextStep()
        );
    }

    /**
     * Crée le toit de la maison
     */
    private createHouseRoof(): void {
        const gridCX = GameConfig.HOUSE.x + (GameConfig.HOUSE.width / 2);
        const gridCY = GameConfig.HOUSE.y + (GameConfig.HOUSE.height / 2);
        const centerIso = IsoMath.gridToIso(gridCX - 0.5, gridCY - 0.5, this.mapOriginX, this.mapOriginY);

        this.houseRoof = this.add.image(centerIso.x, centerIso.y - 120, 'house_roof');
        this.houseRoof.setDepth(99999);
    }

    /**
     * Vérifie la visibilité du toit selon la position du joueur
     */
    private checkRoofVisibility(x: number, y: number): void {
        if (!this.houseRoof) return;

        const isInHouse = this.isInsideHouse(x, y);
        this.tweens.add({
            targets: this.houseRoof,
            alpha: isInHouse ? 0.2 : 1,
            duration: 300
        });
    }

    /**
     * Vérifie si une position est à l'intérieur de la maison
     */
    private isInsideHouse(x: number, y: number): boolean {
        return (
            x >= GameConfig.HOUSE.x &&
            x < GameConfig.HOUSE.x + GameConfig.HOUSE.width &&
            y >= GameConfig.HOUSE.y &&
            y < GameConfig.HOUSE.y + GameConfig.HOUSE.height
        );
    }

    /**
     * Vérifie si une tuile est valide
     */
    private isValidTile(x: number, y: number): boolean {
        return x >= 0 && x < GameConfig.MAP_SIZE && y >= 0 && y < GameConfig.MAP_SIZE;
    }
}