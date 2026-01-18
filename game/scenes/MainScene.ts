import { Scene } from 'phaser';
// @ts-ignore
import EasyStar from 'easystarjs';
import { usePlayerStore } from '@/stores/player';

export default class MainScene extends Scene {
    // CONFIGURATION
    private mapSize = 50;
    private tileWidth = 64;
    private tileHeight = 32;
    private houseRect = { x: 15, y: 15, w: 6, h: 6 };

    // OBJETS PHASER
    private tileGroup: Phaser.GameObjects.Group | null = null;
    private hero: Phaser.GameObjects.Image | null = null;
    private selector: Phaser.GameObjects.Graphics | null = null;
    private houseRoof: Phaser.GameObjects.Image | null = null;

    // GESTION DES OBJETS
    private objectMap: Map<string, Phaser.GameObjects.Image> = new Map();

    // LOGIQUE
    private finder: EasyStar.js | null = null;
    private isMoving: boolean = false;
    private currentPath: { x: number, y: number }[] = [];
    private gridData: number[][] = [];

    // ACTION EN ATTENTE
    private pendingAction: (() => void) | null = null;

    // NAVIGATION
    private isDraggingMap = false;
    private dragStartX = 0;
    private dragStartY = 0;
    private mapOriginX = 0;
    private mapOriginY = 0;

    // Flag pour éviter le double clic (Objet + Sol en même temps)
    private ignoreNextMapClick = false;

    private playerStore: any = null;

    constructor() { super('MainScene'); }

    preload() {
        this.load.image('grass_1', '/assets/grass.png');
        this.load.image('grass_2', '/assets/grass1.png');
        this.load.image('grass_3', '/assets/grass2.png');
        this.load.image('grass_4', '/assets/grass3.png');
        this.load.image('grass_5', '/assets/grass4.png');
        this.load.image('tree', '/assets/tree.png');
        this.load.image('rock', '/assets/rock.png');

        this.createHeroTexture();
        this.createPlaceholderTextures();
    }

    createHeroTexture() {
        if (this.textures.exists('hero')) return;
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x000000, 0.2); g.fillEllipse(32, 58, 20, 10);
        g.fillStyle(0xffffff, 1); g.fillRect(24, 20, 16, 32);
        g.fillStyle(0xfecdd3, 1); g.fillCircle(32, 20, 10);
        g.generateTexture('hero', 64, 64);
    }

    createPlaceholderTextures() {
        if (!this.textures.exists('floor_wood')) {
            const g = this.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(0x8D6E63, 1);
            g.beginPath(); g.moveTo(32, 0); g.lineTo(64, 16); g.lineTo(32, 32); g.lineTo(0, 16); g.closePath(); g.fillPath();
            g.lineStyle(1, 0x5D4037, 1); g.strokePath();
            g.generateTexture('floor_wood', 64, 32);
        }
        if (!this.textures.exists('house_roof')) {
            const g = this.make.graphics({ x: 0, y: 0, add: false });
            const roofW = this.houseRect.w * 64;
            const roofH = this.houseRect.h * 32;
            g.fillStyle(0x37474F, 1);
            g.beginPath(); g.moveTo(roofW / 2, 0); g.lineTo(roofW, roofH / 2); g.lineTo(roofW / 2, roofH); g.lineTo(0, roofH / 2); g.closePath(); g.fillPath();
            g.lineStyle(4, 0x263238, 1); g.strokePath();
            g.generateTexture('house_roof', roofW, roofH);
        }
    }

    create() {
        this.playerStore = usePlayerStore();
        this.mapOriginX = this.mapSize * 20;
        this.mapOriginY = 100;

        this.tileGroup = this.add.group();
        this.finder = new EasyStar.js();
        this.objectMap.clear();

        const grassVariations = ['grass_1', 'grass_2', 'grass_3', 'grass_4', 'grass_5'];

        for (let y = 0; y < this.mapSize; y++) {
            let col: number[] = [];
            for (let x = 0; x < this.mapSize; x++) {
                const isInHouse = (x >= this.houseRect.x && x < this.houseRect.x + this.houseRect.w &&
                    y >= this.houseRect.y && y < this.houseRect.y + this.houseRect.h);

                let isObstacle = false;
                let tileKey = '';

                if (isInHouse) {
                    isObstacle = false;
                    tileKey = 'floor_wood';
                } else {
                    isObstacle = (Math.random() < 0.15) && (x !== 0 || y !== 0);
                    tileKey = Phaser.Math.RND.pick(grassVariations);
                }

                col.push(isObstacle ? 1 : 0);
                this.placeTile(x, y, tileKey);

                if (isObstacle) {
                    const type = Math.random() > 0.5 ? 'tree' : 'rock';
                    this.placeObject(x, y, type);
                }
            }
            this.gridData.push(col);
        }

        this.finder.setGrid(this.gridData);
        this.finder.setAcceptableTiles([0]);

        this.createHouseRoof();

        this.selector = this.add.graphics();
        this.selector.lineStyle(2, 0xffffff, 1);
        this.selector.beginPath(); this.selector.moveTo(0, -16); this.selector.lineTo(32, 0); this.selector.lineTo(0, 16); this.selector.lineTo(-32, 0); this.selector.closePath(); this.selector.strokePath();
        this.selector.setVisible(false);
        this.selector.setDepth(99999);

        this.createHero(this.playerStore.position.x, this.playerStore.position.y);
        if (this.hero) this.hero.setTint(this.playerStore.color);

        this.cameras.main.startFollow(this.hero, true, 0.08, 0.08);
        this.cameras.main.setZoom(1.2);

        // --- INPUTS GESTION ---

        // 1. GESTION DU CLIC SUR UN OBJET (Arbre, Rocher)
        this.input.on('gameobjectup', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image) => {
            // On vérifie si c'est bien un objet interactif de la map
            const gridX = gameObject.getData('gridX');
            const gridY = gameObject.getData('gridY');

            if (gridX !== undefined && gridY !== undefined) {
                // C'est un arbre/rocher !
                this.handleHarvestIntent(gridX, gridY);
                // IMPORTANT : On signale qu'on vient de cliquer un objet
                // pour ne pas déclencher le déplacement sur le sol juste après.
                this.ignoreNextMapClick = true;
            }
        });

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.dragStartX = pointer.x; this.dragStartY = pointer.y; this.isDraggingMap = false;
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (pointer.isDown) {
                this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
                this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
                if (Phaser.Math.Distance.Between(pointer.x, pointer.y, this.dragStartX, this.dragStartY) > 5) {
                    this.isDraggingMap = true;
                }
            }
        });

        this.input.on('wheel', (pointer: any, gameObjects: any, deltaX: number, deltaY: number) => {
            const zoomAmount = 0.1;
            if (deltaY > 0) this.cameras.main.zoom = Math.max(0.5, this.cameras.main.zoom - zoomAmount);
            else this.cameras.main.zoom = Math.min(2, this.cameras.main.zoom + zoomAmount);
        });

        // 2. GESTION DU CLIC SUR LE SOL (Map)
        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (this.ignoreNextMapClick) {
                this.ignoreNextMapClick = false;
                return;
            }

            // MODIFICATION ICI : On a retiré "&& !this.isMoving"
            if (!this.isDraggingMap) this.handleClick(pointer);

            this.isDraggingMap = false;
        });

        this.checkRoofVisibility(this.playerStore.position.x, this.playerStore.position.y);
    }

    update() {
        const worldPoint = this.input.activePointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
        const coords = this.getGridFromScreen(worldPoint.x, worldPoint.y);

        if (this.isValidTile(coords.x, coords.y)) {
            this.selector?.setVisible(true);
            const isoPt = this.getIsoFromGrid(coords.x, coords.y);
            this.selector?.setPosition(isoPt.x, isoPt.y);

            if (this.gridData[coords.y] && this.gridData[coords.y][coords.x] === 1) {
                this.selector?.lineStyle(2, 0xeab308, 1);
            } else {
                this.selector?.lineStyle(2, 0xffffff, 1);
            }
        } else {
            this.selector?.setVisible(false);
        }
    }

    handleClick(pointer: Phaser.Input.Pointer) {
        const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
        const target = this.getGridFromScreen(worldPoint.x, worldPoint.y);

        if (!this.isValidTile(target.x, target.y)) return;

        if (this.gridData[target.y][target.x] === 1) {
            this.handleHarvestIntent(target.x, target.y);
            return;
        }

        this.startMove(target.x, target.y, null);
    }

    handleHarvestIntent(targetX: number, targetY: number) {
        const neighbors = [
            { x: targetX + 1, y: targetY }, { x: targetX - 1, y: targetY },
            { x: targetX, y: targetY + 1 }, { x: targetX, y: targetY - 1 }
        ];

        const validNeighbors = neighbors.filter(n =>
            this.isValidTile(n.x, n.y) && this.gridData[n.y][n.x] === 0
        );

        if (validNeighbors.length === 0) return;

        const bestSpot = validNeighbors[0];

        this.startMove(bestSpot.x, bestSpot.y, () => {
            this.harvestResource(targetX, targetY);
        });
    }

    harvestResource(x: number, y: number) {
        const key = `${x},${y}`;
        const object = this.objectMap.get(key);

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

                    object.destroy();
                    this.objectMap.delete(key);

                    this.gridData[y][x] = 0;
                    this.finder?.setGrid(this.gridData);

                    if (itemDropped) this.playerStore.addItem(itemDropped);
                }
            });
        }
    }

    startMove(x: number, y: number, onComplete: (() => void) | null) {
        // 1. STOPPER TOUT MOUVEMENT EN COURS
        // On arrête immédiatement l'animation du héros
        this.tweens.killTweensOf(this.hero);

        // On vide le chemin précédent pour ne pas qu'il reprenne
        this.currentPath = [];

        // Si on avait une action prévue (récolte), on l'annule car on change d'avis
        // Sauf si le nouveau clic définit une nouvelle action (onComplete)
        this.pendingAction = onComplete;

        // 2. CALCUL DU NOUVEAU CHEMIN
        // Le point de départ est la position LOGIQUE actuelle du joueur
        // (La case vers laquelle il se dirigeait ou sur laquelle il est)
        const startX = this.playerStore.position.x;
        const startY = this.playerStore.position.y;

        this.finder?.findPath(startX, startY, x, y, (path) => {
            if (path && path.length > 0) {
                path.shift(); // On enlève la case actuelle
                this.currentPath = path;
                this.isMoving = true;
                this.moveNextStep(); // On lance le mouvement immédiatement
            } else {
                // Si on clique sur la case où on est déjà
                if (startX === x && startY === y && this.pendingAction) {
                    this.pendingAction();
                    this.pendingAction = null;
                }
                this.isMoving = false;
            }
        }
        );
        this.finder?.calculate();
    }

    moveNextStep() {
        if (this.currentPath.length === 0) {
            this.isMoving = false;
            if (this.pendingAction) {
                this.pendingAction();
                this.pendingAction = null;
            }
            return;
        }
        const nextTile = this.currentPath.shift();
        if (!nextTile || !this.hero) return;

        this.playerStore.move(nextTile.x, nextTile.y);
        this.checkRoofVisibility(nextTile.x, nextTile.y);

        const targetIso = this.getIsoFromGrid(nextTile.x, nextTile.y);

        this.tweens.add({
            targets: this.hero,
            x: targetIso.x,
            y: targetIso.y,
            duration: 250,
            ease: 'Linear',
            onUpdate: () => { if (this.hero) this.hero.setDepth(this.hero.y); },
            onComplete: () => this.moveNextStep()
        });
    }

    // --- HELPERS ---

    createHouseRoof() {
        const centerX = this.houseRect.x + this.houseRect.w / 2;
        const centerY = this.houseRect.y + this.houseRect.h / 2;
        const centerIso = this.getIsoFromGrid(centerX - 0.5, centerY - 0.5);
        this.houseRoof = this.add.image(centerIso.x, centerIso.y - 100, 'house_roof');
        this.houseRoof.setDepth(99999);
    }

    checkRoofVisibility(x: number, y: number) {
        if (!this.houseRoof) return;
        const isInHouse = (x >= this.houseRect.x && x < this.houseRect.x + this.houseRect.w &&
            y >= this.houseRect.y && y < this.houseRect.y + this.houseRect.h);
        const targetAlpha = isInHouse ? 0.2 : 1;
        this.tweens.add({ targets: this.houseRoof, alpha: targetAlpha, duration: 300 });
    }

    isValidTile(x: number, y: number) { return x >= 0 && x < this.mapSize && y >= 0 && y < this.mapSize; }

    getIsoFromGrid(x: number, y: number) {
        const isoX = (x - y) * (this.tileWidth / 2);
        const isoY = (x + y) * (this.tileHeight / 2);
        return { x: this.mapOriginX + isoX, y: this.mapOriginY + isoY };
    }

    getGridFromScreen(x: number, y: number) {
        const adjX = x - this.mapOriginX; const adjY = y - this.mapOriginY;
        const halfW = this.tileWidth / 2; const halfH = this.tileHeight / 2;
        const gridY = (adjY / halfH - adjX / halfW) / 2; const gridX = (adjY / halfH + adjX / halfW) / 2;
        return { x: Math.round(gridX), y: Math.round(gridY) };
    }

    placeTile(x: number, y: number, key: string) {
        const pos = this.getIsoFromGrid(x, y);
        const tile = this.add.image(pos.x, pos.y, key);
        tile.setOrigin(0.5, 0.5);
        tile.setDepth(-1000);
    }

    placeObject(x: number, y: number, key: string) {
        const pos = this.getIsoFromGrid(x, y);

        // [FIX VISUEL] On descend l'objet de 10px pour qu'il s'ancre mieux dans l'herbe
        const visualOffsetY = 10;

        const obj = this.add.image(pos.x, pos.y + visualOffsetY, key);
        obj.setOrigin(0.5, 1);

        // On garde le depth basé sur le Y "logique" de la grille, pas le Y modifié
        obj.setDepth(pos.y);

        // [FIX CLIC] On rend l'objet interactif (cliquable)
        // cursor: 'pointer' affiche la petite main quand on passe dessus
        obj.setInteractive({ cursor: 'pointer' });

        // On stocke les coordonnées de grille DANS l'objet pour savoir où il est quand on clique dessus
        obj.setData('gridX', x);
        obj.setData('gridY', y);

        this.objectMap.set(`${x},${y}`, obj);
    }

    createHero(x: number, y: number) {
        const pos = this.getIsoFromGrid(x, y);
        this.hero = this.add.image(pos.x, pos.y, 'hero');
        this.hero.setOrigin(0.5, 1);
        this.hero.setDepth(pos.y);
        this.cameras.main.startFollow(this.hero, true, 0.08, 0.08);
    }
}