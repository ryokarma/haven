import { Scene } from 'phaser';
// @ts-ignore
import EasyStar from 'easystarjs';
import { usePlayerStore } from '@/stores/player';
import { IsoMath } from '@/game/utils/IsoMath';

export default class MainScene extends Scene {
    // CONFIGURATION
    private mapSize = 50;
    private houseRect = { x: 15, y: 15, w: 6, h: 6 };

    // CALIBRAGE VISUEL
    // Valeur augmentée à 20 pour faire descendre les objets au centre de la tuile
    // Si c'est encore un peu haut, essaie 22 ou 24. Si c'est trop bas, tente 15.
    private ASSET_Y_OFFSET = 20;

    // OBJETS PHASER
    private tileGroup: Phaser.GameObjects.Group | null = null;
    private hero: Phaser.GameObjects.Image | null = null;
    private selector: Phaser.GameObjects.Graphics | null = null;
    private houseRoof: Phaser.GameObjects.Image | null = null;
    private fireflies: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

    // GESTION DES OBJETS
    private objectMap: Map<string, Phaser.GameObjects.Image> = new Map();

    // LOGIQUE
    private finder: EasyStar.js | null = null;
    private isMoving: boolean = false;
    private currentPath: { x: number, y: number }[] = [];
    private gridData: number[][] = [];
    private pendingAction: (() => void) | null = null;

    // NAVIGATION & UI
    private isDraggingMap = false;
    private dragStartX = 0;
    private dragStartY = 0;
    private mapOriginX = 0;
    private mapOriginY = 0;
    private ignoreNextMapClick = false;

    private playerStore: any = null;

    constructor() { super('MainScene'); }

    preload() {
        this.load.image('tree', '/assets/tree.png');
        this.load.image('rock', '/assets/rock.png');

        this.createHeroTexture();
        this.createPlaceholderTextures();
        this.createFireflyTexture();
    }

    // --- GÉNÉRATEURS DE TEXTURES ---
    createHeroTexture() {
        if (this.textures.exists('hero')) return;
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x000000, 0.2); g.fillEllipse(32, 58, 20, 10);
        g.fillStyle(0xffffff, 1); g.fillRect(24, 20, 16, 32);
        g.fillStyle(0xfecdd3, 1); g.fillCircle(32, 20, 10);
        g.generateTexture('hero', 64, 64);
    }

    createPlaceholderTextures() {
        const W = IsoMath.TILE_WIDTH;  // 64
        const H = IsoMath.TILE_HEIGHT; // 37

        // 1. SOL VERT (Plat)
        const greens = [0xA5D6A7, 0x81C784, 0x66BB6A, 0x4CAF50, 0x43A047];
        greens.forEach((color, index) => {
            const key = `tile_flat_${index}`;
            if (!this.textures.exists(key)) {
                const g = this.make.graphics({ x: 0, y: 0, add: false });
                g.fillStyle(color, 1);
                g.beginPath();
                g.moveTo(W / 2, 0); g.lineTo(W, H / 2); g.lineTo(W / 2, H); g.lineTo(0, H / 2);
                g.closePath();
                g.fillPath();
                g.generateTexture(key, W, H);
            }
        });

        // 2. SOL MAISON
        if (!this.textures.exists('floor_wood')) {
            const g = this.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(0x8D6E63, 1);
            g.beginPath();
            g.moveTo(W / 2, 0); g.lineTo(W, H / 2); g.lineTo(W / 2, H); g.lineTo(0, H / 2);
            g.closePath();
            g.fillPath();
            g.lineStyle(1, 0x5D4037, 0.5);
            g.strokePath();
            g.generateTexture('floor_wood', W, H);
        }

        // 3. TOIT MAISON
        if (!this.textures.exists('house_roof')) {
            const g = this.make.graphics({ x: 0, y: 0, add: false });
            const totalW = this.houseRect.w * W;
            const totalH = this.houseRect.h * H;
            const cx = totalW / 2;

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
        }
    }

    createFireflyTexture() {
        if (this.textures.exists('firefly')) return;
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xfffee0, 1); g.fillCircle(4, 4, 4);
        g.generateTexture('firefly', 8, 8);
    }

    create() {
        this.playerStore = usePlayerStore();
        this.mapOriginX = this.mapSize * (IsoMath.TILE_WIDTH / 2);
        this.mapOriginY = 100;

        this.tileGroup = this.add.group();
        this.finder = new EasyStar.js();
        this.objectMap.clear();

        const tileVariations = ['tile_flat_0', 'tile_flat_1', 'tile_flat_2', 'tile_flat_3', 'tile_flat_4'];

        // GÉNÉRATION MAP
        for (let y = 0; y < this.mapSize; y++) {
            let col: number[] = [];
            for (let x = 0; x < this.mapSize; x++) {
                const isInHouse = (x >= this.houseRect.x && x < this.houseRect.x + this.houseRect.w &&
                    y >= this.houseRect.y && y < this.houseRect.y + this.houseRect.h);

                let isObstacle = false;
                let tileKey = '';

                if (isInHouse) {
                    isObstacle = false; tileKey = 'floor_wood';
                } else {
                    isObstacle = (Math.random() < 0.15) && (x !== 0 || y !== 0);
                    tileKey = Phaser.Math.RND.pick(tileVariations);
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

        // SÉLECTEUR
        this.selector = this.add.graphics();
        this.selector.lineStyle(2, 0xffffff, 0.6);
        const pts = IsoMath.getDebugPoints();
        this.selector.beginPath();
        this.selector.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) this.selector.lineTo(pts[i].x, pts[i].y);
        this.selector.closePath();
        this.selector.strokePath();
        this.selector.setVisible(false);
        this.selector.setDepth(99999);

        // HÉROS
        this.createHero(this.playerStore.position.x, this.playerStore.position.y);
        if (this.hero) this.hero.setTint(this.playerStore.color);

        this.cameras.main.startFollow(this.hero, true, 0.08, 0.08);
        this.cameras.main.setZoom(1.2);
        this.createAmbiance();

        // EVENTS
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
                if (Phaser.Math.Distance.Between(pointer.x, pointer.y, this.dragStartX, this.dragStartY) > 5) this.isDraggingMap = true;
            }
        });
        this.input.on('wheel', (pointer: any, gameObjects: any, deltaX: number, deltaY: number) => {
            const zoomAmount = 0.1;
            if (deltaY > 0) this.cameras.main.zoom = Math.max(0.5, this.cameras.main.zoom - zoomAmount);
            else this.cameras.main.zoom = Math.min(2, this.cameras.main.zoom + zoomAmount);
        });
        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (this.ignoreNextMapClick) { this.ignoreNextMapClick = false; return; }
            if (!this.isDraggingMap) this.handleClick(pointer);
            this.isDraggingMap = false;
        });
        this.checkRoofVisibility(this.playerStore.position.x, this.playerStore.position.y);
    }

    createAmbiance() {
        if (this.hero) {
            this.fireflies = this.add.particles(0, 0, 'firefly', {
                follow: this.hero,
                emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 300) },
                lifespan: { min: 4000, max: 8000 },
                scale: { start: 0.5, end: 0 },
                alpha: { start: 0, end: 0.8, yoyo: true },
                speed: { min: 10, max: 25 }, gravityY: -5, quantity: 1, frequency: 500, blendMode: 'ADD'
            });
            this.fireflies.setDepth(100000);
        }
    }

    update() {
        const worldPoint = this.input.activePointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
        const coords = IsoMath.isoToGrid(worldPoint.x, worldPoint.y, this.mapOriginX, this.mapOriginY);

        if (this.isValidTile(coords.x, coords.y)) {
            this.selector?.setVisible(true);
            const isoPt = IsoMath.gridToIso(coords.x, coords.y, this.mapOriginX, this.mapOriginY);
            this.selector?.setPosition(isoPt.x, isoPt.y); // OFFSET RETIRÉ ICI CAR C'EST LE SOL

            if (this.gridData[coords.y] && this.gridData[coords.y][coords.x] === 1) {
                this.selector?.lineStyle(2, 0xeab308, 0.8);
            } else {
                this.selector?.lineStyle(2, 0xffffff, 0.6);
            }
        } else {
            this.selector?.setVisible(false);
        }
    }

    handleClick(pointer: Phaser.Input.Pointer) {
        const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
        const target = IsoMath.isoToGrid(worldPoint.x, worldPoint.y, this.mapOriginX, this.mapOriginY);

        if (!this.isValidTile(target.x, target.y)) return;
        if (this.gridData[target.y][target.x] === 1) {
            this.handleHarvestIntent(target.x, target.y);
            return;
        }
        this.startMove(target.x, target.y, null);
    }

    handleHarvestIntent(targetX: number, targetY: number) {
        const neighbors = [{ x: targetX + 1, y: targetY }, { x: targetX - 1, y: targetY }, { x: targetX, y: targetY + 1 }, { x: targetX, y: targetY - 1 }];
        const validNeighbors = neighbors.filter(n => this.isValidTile(n.x, n.y) && this.gridData[n.y][n.x] === 0);
        if (validNeighbors.length === 0) return;
        const bestSpot = validNeighbors.sort((a, b) => {
            const d1 = Phaser.Math.Distance.Between(this.playerStore.position.x, this.playerStore.position.y, a.x, a.y);
            const d2 = Phaser.Math.Distance.Between(this.playerStore.position.x, this.playerStore.position.y, b.x, b.y);
            return d1 - d2;
        })[0];
        this.startMove(bestSpot.x, bestSpot.y, () => { this.harvestResource(targetX, targetY); });
    }

    harvestResource(x: number, y: number) {
        const key = `${x},${y}`;
        const object = this.objectMap.get(key);
        if (object) {
            this.tweens.add({
                targets: object, x: object.x + 5, yoyo: true, duration: 50, repeat: 3,
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
                path.shift(); this.currentPath = path; this.isMoving = true; this.moveNextStep();
            } else {
                if (startX === x && startY === y && this.pendingAction) {
                    this.pendingAction(); this.pendingAction = null;
                }
                this.isMoving = false;
            }
        });
        this.finder?.calculate();
    }

    moveNextStep() {
        if (this.currentPath.length === 0) {
            this.isMoving = false;
            if (this.pendingAction) { this.pendingAction(); this.pendingAction = null; }
            return;
        }
        const nextTile = this.currentPath.shift();
        if (!nextTile || !this.hero) return;

        this.playerStore.move(nextTile.x, nextTile.y);
        this.checkRoofVisibility(nextTile.x, nextTile.y);

        const targetIso = IsoMath.gridToIso(nextTile.x, nextTile.y, this.mapOriginX, this.mapOriginY);
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

    createHouseRoof() {
        const gridCX = this.houseRect.x + (this.houseRect.w / 2);
        const gridCY = this.houseRect.y + (this.houseRect.h / 2);
        const centerIso = IsoMath.gridToIso(gridCX - 0.5, gridCY - 0.5, this.mapOriginX, this.mapOriginY);
        this.houseRoof = this.add.image(centerIso.x, centerIso.y - 120, 'house_roof');
        this.houseRoof.setDepth(99999);
    }

    checkRoofVisibility(x: number, y: number) {
        if (!this.houseRoof) return;
        const isInHouse = (x >= this.houseRect.x && x < this.houseRect.x + this.houseRect.w && y >= this.houseRect.y && y < this.houseRect.y + this.houseRect.h);
        this.tweens.add({ targets: this.houseRoof, alpha: isInHouse ? 0.2 : 1, duration: 300 });
    }

    isValidTile(x: number, y: number) { return x >= 0 && x < this.mapSize && y >= 0 && y < this.mapSize; }

    placeTile(x: number, y: number, key: string) {
        const pos = IsoMath.gridToIso(x, y, this.mapOriginX, this.mapOriginY);
        const tile = this.add.image(pos.x, pos.y, key);
        tile.setOrigin(0.5, 0.5);
        tile.setDepth(-1000);
    }

    placeObject(x: number, y: number, key: string) {
        const pos = IsoMath.gridToIso(x, y, this.mapOriginX, this.mapOriginY);

        // Offset augmenté à +20 pour centrer visuellement
        const visualY = pos.y + this.ASSET_Y_OFFSET;

        const obj = this.add.image(pos.x, visualY, key);
        obj.setOrigin(0.5, 1);
        obj.setDepth(visualY); // Profondeur basée sur la position visuelle

        obj.setInteractive({ cursor: 'pointer' });
        obj.setData('gridX', x); obj.setData('gridY', y);
        this.objectMap.set(`${x},${y}`, obj);
    }

    createHero(x: number, y: number) {
        const pos = IsoMath.gridToIso(x, y, this.mapOriginX, this.mapOriginY);
        this.hero = this.add.image(pos.x, pos.y, 'hero');
        this.hero.setOrigin(0.5, 1);
        this.hero.setDepth(pos.y);
    }
}