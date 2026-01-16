// game/scenes/MainScene.ts
import { Scene } from 'phaser';
// @ts-ignore
import EasyStar from 'easystarjs';
import { usePlayerStore } from '@/stores/player';

export default class MainScene extends Scene {
    private mapSize = 20;
    private tileWidth = 64;
    private tileHeight = 32;

    private tileGroup: Phaser.GameObjects.Group | null = null;
    private hero: Phaser.GameObjects.Image | null = null;
    private selector: Phaser.GameObjects.Graphics | null = null;

    private finder: EasyStar.js | null = null;
    private isMoving: boolean = false;
    private currentPath: { x: number, y: number }[] = [];

    private isDraggingMap = false;
    private dragStartX = 0;
    private dragStartY = 0;

    private mapOriginX = 0;
    private mapOriginY = 0;
    private gridData: number[][] = [];

    private playerStore: any = null;

    constructor() {
        super('MainScene');
    }

    preload() {
        // --- TEXTURES ---
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        // Sol
        g.fillStyle(0x56bc8a, 1);
        g.beginPath(); g.moveTo(32, 0); g.lineTo(64, 16); g.lineTo(32, 32); g.lineTo(0, 16); g.closePath(); g.fillPath();
        g.lineStyle(1, 0x2f6a4b, 0.5); g.strokePath();
        g.generateTexture('grass-tile', 64, 32);

        // Héro
        g.clear();
        g.fillStyle(0x000000, 0.2); g.fillEllipse(32, 58, 20, 10);
        g.fillStyle(0xffffff, 1);
        g.fillRect(24, 20, 16, 32);
        g.fillStyle(0xfecdd3, 1);
        g.fillCircle(32, 20, 10);
        g.generateTexture('hero', 64, 64);

        // Arbre
        g.clear();
        g.fillStyle(0x78350f, 1); g.fillRect(26, 40, 12, 24);
        g.fillStyle(0x15803d, 1);
        this.drawTriangle(g, 32, 10, 20); this.drawTriangle(g, 32, 25, 25); this.drawTriangle(g, 32, 40, 30);
        g.generateTexture('tree', 64, 80);
    }

    drawTriangle(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number) {
        g.beginPath(); g.moveTo(x, y - width / 2); g.lineTo(x + width / 2, y + width / 2); g.lineTo(x - width / 2, y + width / 2); g.closePath(); g.fillPath();
    }

    create() {
        this.playerStore = usePlayerStore();

        this.mapOriginX = this.cameras.main.width / 2;
        this.mapOriginY = 150;

        this.tileGroup = this.add.group();
        this.finder = new EasyStar.js();

        // Génération Carte
        for (let y = 0; y < this.mapSize; y++) {
            let col: number[] = [];
            for (let x = 0; x < this.mapSize; x++) {
                const isObstacle = (Math.random() < 0.15) && (x !== 0 || y !== 0);
                col.push(isObstacle ? 1 : 0);
                this.placeTile(x, y, 'grass-tile');
                if (isObstacle) this.placeObject(x, y, 'tree');
            }
            this.gridData.push(col);
        }

        this.finder.setGrid(this.gridData);
        this.finder.setAcceptableTiles([0]);

        this.selector = this.add.graphics();
        this.selector.lineStyle(2, 0xffffff, 1);
        this.selector.beginPath(); this.selector.moveTo(0, -16); this.selector.lineTo(32, 0); this.selector.lineTo(0, 16); this.selector.lineTo(-32, 0); this.selector.closePath(); this.selector.strokePath();
        this.selector.setVisible(false);
        // FIX SELECTEUR : On le met juste au dessus du sol (-999), mais en dessous des objets
        this.selector.setDepth(-999);

        this.createHero(this.playerStore.position.x, this.playerStore.position.y);
        if (this.hero) this.hero.setTint(this.playerStore.color);

        // Initialisation Caméra
        const startPos = this.getIsoFromGrid(this.playerStore.position.x, this.playerStore.position.y);
        this.cameras.main.centerOn(startPos.x, startPos.y);
        this.cameras.main.setZoom(1);

        // Events Souris
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.dragStartX = pointer.x;
            this.dragStartY = pointer.y;
            this.isDraggingMap = false;
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
            if (!this.isDraggingMap && !this.isMoving) this.handleClick(pointer);
            this.isDraggingMap = false;
        });
    }

    update() {
        const worldPoint = this.input.activePointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
        const coords = this.getGridFromScreen(worldPoint.x, worldPoint.y);

        if (this.isValidTile(coords.x, coords.y)) {
            this.selector?.setVisible(true);
            const isoPt = this.getIsoFromGrid(coords.x, coords.y);
            this.selector?.setPosition(isoPt.x, isoPt.y);
            // Le sélecteur n'a plus besoin de changer de profondeur, il est fixé à -999 dans le create()
        } else {
            this.selector?.setVisible(false);
        }
    }

    handleClick(pointer: Phaser.Input.Pointer) {
        const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
        const target = this.getGridFromScreen(worldPoint.x, worldPoint.y);

        if (!this.isValidTile(target.x, target.y) || this.gridData[target.y][target.x] === 1) return;

        const startX = this.playerStore.position.x;
        const startY = this.playerStore.position.y;

        this.finder?.findPath(startX, startY, target.x, target.y, (path) => {
            if (path && path.length > 0) {
                path.shift();
                this.currentPath = path;
                this.isMoving = true;
                this.moveNextStep();
            }
        }
        );
        this.finder?.calculate();
    }

    moveNextStep() {
        if (this.currentPath.length === 0) {
            this.isMoving = false;
            return;
        }
        const nextTile = this.currentPath.shift();
        if (!nextTile || !this.hero) return;

        this.playerStore.move(nextTile.x, nextTile.y);
        const targetIso = this.getIsoFromGrid(nextTile.x, nextTile.y);

        this.tweens.add({
            targets: this.hero,
            x: targetIso.x,
            y: targetIso.y - 24,
            duration: 250,
            ease: 'Linear',
            onUpdate: () => {
                // Tri de profondeur : Le Héros a toujours une profondeur égale à son Y
                if (this.hero) this.hero.setDepth(this.hero.y + 16);
            },
            onComplete: () => this.moveNextStep()
        });
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

    // --- MODIFICATION MAJEURE ICI ---
    placeTile(x: number, y: number, key: string) {
        const pos = this.getIsoFromGrid(x, y);
        const tile = this.add.image(pos.x, pos.y, key);
        // FIX : On force le sol à être tout en bas (-1000)
        tile.setDepth(-1000);
    }

    placeObject(x: number, y: number, key: string) {
        const pos = this.getIsoFromGrid(x, y);
        const obj = this.add.image(pos.x, pos.y - 32, key);
        // Les objets (arbres) gardent la profondeur dynamique pour que le héros puisse passer derrière
        obj.setDepth(pos.y + 1);
    }

    createHero(x: number, y: number) {
        const pos = this.getIsoFromGrid(x, y);
        this.hero = this.add.image(pos.x, pos.y - 24, 'hero');
        this.hero.setDepth(pos.y + 16);
    }
}