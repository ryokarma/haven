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

    // AMBIANCE
    private fireflies: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

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

    // Flags
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
        this.createFireflyTexture();
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

    createFireflyTexture() {
        if (this.textures.exists('firefly')) return;
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xfffee0, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('firefly', 8, 8);
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
        // [MODIF] Sélecteur plus discret : ligne plus fine (1) et transparente (0.4)
        this.selector.lineStyle(1, 0xffffff, 0.4);
        this.selector.beginPath(); this.selector.moveTo(0, -16); this.selector.lineTo(32, 0); this.selector.lineTo(0, 16); this.selector.lineTo(-32, 0); this.selector.closePath(); this.selector.strokePath();
        this.selector.setVisible(false);
        this.selector.setDepth(99999);

        this.createHero(this.playerStore.position.x, this.playerStore.position.y);
        if (this.hero) this.hero.setTint(this.playerStore.color);

        this.cameras.main.startFollow(this.hero, true, 0.08, 0.08);
        this.cameras.main.setZoom(1.2);

        this.createAmbiance();

        this.input.on('gameobjectup', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image) => {
            const gridX = gameObject.getData('gridX');
            const gridY = gameObject.getData('gridY');

            if (gridX !== undefined && gridY !== undefined) {
                this.handleHarvestIntent(gridX, gridY);
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

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (this.ignoreNextMapClick) {
                this.ignoreNextMapClick = false;
                return;
            }

            if (!this.isDraggingMap) this.handleClick(pointer);
            this.isDraggingMap = false;
        });

        this.checkRoofVisibility(this.playerStore.position.x, this.playerStore.position.y);
    }

    createAmbiance() {
        if (this.hero) {
            this.fireflies = this.add.particles(0, 0, 'firefly', {
                follow: this.hero,
                emitZone: {
                    type: 'random',
                    source: new Phaser.Geom.Circle(0, 0, 300)
                },
                lifespan: { min: 4000, max: 8000 },
                scale: { start: 0.5, end: 0 },
                alpha: { start: 0, end: 0.8, yoyo: true },
                speed: { min: 10, max: 25 },
                gravityY: -5,
                quantity: 1,
                frequency: 500,
                blendMode: 'ADD'
            });
            this.fireflies.setDepth(100000);
        }
    }

    update() {
        const worldPoint = this.input.activePointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
        const coords = this.getGridFromScreen(worldPoint.x, worldPoint.y);

        if (this.isValidTile(coords.x, coords.y)) {
            this.selector?.setVisible(true);
            const isoPt = this.getIsoFromGrid(coords.x, coords.y);
            // [MODIF] On abaisse le sélecteur de 12px pour coller visuellement à l'herbe
            this.selector?.setPosition(isoPt.x, isoPt.y + 12);

            // [MODIF] Style plus discret ici aussi (épaisseur 1, opacité 0.4)
            if (this.gridData[coords.y] && this.gridData[coords.y][coords.x] === 1) {
                this.selector?.lineStyle(1, 0xeab308, 0.6); // Jaune un peu plus visible
            } else {
                this.selector?.lineStyle(1, 0xffffff, 0.4); // Blanc discret
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
        this.tweens.killTweensOf(this.hero);
        this.currentPath = [];
        this.pendingAction = onComplete;

        const startX = this.playerStore.position.x;
        const startY = this.playerStore.position.y;

        this.finder?.findPath(startX, startY, x, y, (path) => {
            if (path && path.length > 0) {
                path.shift();
                this.currentPath = path;
                this.isMoving = true;
                this.moveNextStep();
            } else {
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

        // Valeur utilisée pour le sol : 12
        const tileYOffset = 12;

        const tile = this.add.image(pos.x, pos.y + tileYOffset, key);
        tile.setOrigin(0.5, 0.5);
        tile.setDepth(-1000);
    }

    placeObject(x: number, y: number, key: string) {
        const pos = this.getIsoFromGrid(x, y);
        // [MODIF] Augmenté de 10 à 18 pour mieux ancrer les objets au sol
        const visualOffsetY = 18;
        const obj = this.add.image(pos.x, pos.y + visualOffsetY, key);
        obj.setOrigin(0.5, 1);
        obj.setDepth(pos.y);
        obj.setInteractive({ cursor: 'pointer' });
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