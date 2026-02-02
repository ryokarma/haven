import { Scene } from 'phaser';
import { usePlayerStore } from '@/stores/player';
import { IsoMath } from '@/game/utils/IsoMath';
import { GameConfig } from '@/game/config/GameConfig';
import { TextureGenerator } from '@/game/graphics/TextureGenerator';
import { PathfindingManager } from '@/game/managers/PathfindingManager';
import { TileManager } from '@/game/managers/TileManager';
import { ObjectManager } from '@/game/managers/ObjectManager';
import { AmbianceManager } from '@/game/managers/AmbianceManager';
import { MapManager } from '@/game/managers/MapManager';
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
    private mapManager!: MapManager;
    private tileSelector!: TileSelector;
    private textureGenerator!: TextureGenerator;

    // Entities
    private player!: Player;

    // Visuals
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

    // Store (Typed)
    private playerStore!: ReturnType<typeof usePlayerStore>;
    // Timer
    private survivalTimer!: Phaser.Time.TimerEvent;

    // Mode Placement
    private ghostObject: Phaser.GameObjects.Image | null = null;
    private ghostTween: Phaser.Tweens.Tween | null = null;

    constructor() {
        super('MainScene');
    }

    preload() {
        // Chargement des assets externes
        this.load.image('tree', '/assets/tree.png');
        this.load.image('rock', '/assets/rock.png');
        // Fallback or generated assets
        // Génération des textures procédurales
        this.textureGenerator = new TextureGenerator(this);
        this.textureGenerator.generateAll();
    }

    create() {
        this.playerStore = usePlayerStore();

        // Réinitialiser le mode placement au démarrage par sécurité
        this.playerStore.setPlacementMode(false);

        // Configuration de l'origine de la carte
        this.mapOriginX = GameConfig.MAP_SIZE * (IsoMath.TILE_WIDTH / 2);
        this.mapOriginY = 100;

        // Initialisation des managers
        this.tileManager = new TileManager(this);
        this.objectManager = new ObjectManager(this);
        this.ambianceManager = new AmbianceManager(this);

        // Map Manager (Handles Data & Generation)
        this.mapManager = new MapManager(
            this,
            this.tileManager,
            this.objectManager,
            this.mapOriginX,
            this.mapOriginY
        );

        // Génération de la carte
        this.mapManager.generate();
        const gridData = this.mapManager.gridData;

        // Initialisation du pathfinding avec déplacements diagonaux
        this.pathfindingManager = new PathfindingManager(gridData);

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

        // Configuration de la caméra - Game Feel
        // 1. Centrage immédiat (Teleport) pour éviter le traveling au chargement
        this.cameras.main.centerOn(this.player.getSprite().x, this.player.getSprite().y);

        // 2. Suivi fluide (Lerp) + Deadzone (Zone morte au centre)
        this.cameras.main.startFollow(
            this.player.getSprite(),
            true,
            GameConfig.MOVEMENT.cameraSmoothness, // 0.08
            GameConfig.MOVEMENT.cameraSmoothness
        );
        this.cameras.main.setDeadzone(50, 50);

        // 3. Zoom et rendering
        this.cameras.main.setZoom(GameConfig.CAMERA.initialZoom);
        this.cameras.main.setRoundPixels(true); // Optimisation rendu

        // Création de l'ambiance
        this.ambianceManager.createFireflies(this.player.getSprite());

        // Configuration des événements d'entrée
        this.setupInputEvents();

        // Vérifier la visibilité du toit
        const playerPos = this.player.getGridPosition();
        this.checkRoofVisibility(playerPos.x, playerPos.y);

        // Timer pour le système de survie (Faim/Soif/Énergie) - 1s Tick
        this.survivalTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                // Application de la chaleur des feux de camp
                this.handleCampfireWarmth();

                // On passe l'état "isMoving" pour ajuster la fatigue
                this.playerStore.tickVitality(this.isMoving);
            },
            loop: true
        });

        // Cleanup on shutdown
        this.events.once('shutdown', this.shutdown, this);
    }

    override update() {
        // Mise à jour du sélecteur de tuile
        this.tileSelector.update(
            this.input.activePointer,
            this.cameras.main,
            this.mapManager.gridData
        );

        // Logic Visualisation Mode Placement (Ghost)
        this.updatePlacementGhost();

        // Mise à jour de l'ambiance (parallaxe fond)
        this.ambianceManager.update();
    }

    /**
     * Gestion de la chaleur (Bonus d'énergie)
     */
    private handleCampfireWarmth(): void {
        const playerPos = this.player.getGridPosition();
        let nearFire = false;

        // On itère sur tous les objets pour trouver les feux de camp
        // Note: Pour optimiser, on pourrait garder une liste séparée des feux
        const objects = this.objectManager.getObjectMap();

        for (const [key, obj] of objects.entries()) {
            if (obj.getData('type') === 'campfire') {
                const fireX = obj.getData('gridX');
                const fireY = obj.getData('gridY');
                const dist = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, fireX, fireY);

                if (dist < 3) { // Moins de 3 cases
                    nearFire = true;
                    break;
                }
            }
        }

        if (nearFire) {
            // Bonus : Régénération d'énergie passive ou réduction de la perte
            if (this.playerStore.stats.energy < this.playerStore.stats.maxEnergy) {
                this.playerStore.updateStats({ energy: this.playerStore.stats.energy + 2 });

                // Petit feedback visuel (Texte flottant occasionnel)
                if (Math.random() < 0.2) {
                    this.showFloatingText(this.player.getSprite().x, this.player.getSprite().y - 60, "♨️ Au chaud", "#fb923c");
                }
            }
        }
    }

    /**
     * Logic du fantôme de placement
     */
    private updatePlacementGhost(): void {
        const pointer = this.input.activePointer;

        if (!this.playerStore.placementMode) {
            if (this.ghostObject) {
                this.ghostObject.destroy();
                this.ghostObject = null;
                if (this.ghostTween) {
                    this.ghostTween.stop();
                    this.ghostTween = null;
                }
            }
            return;
        }

        const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
        const target = IsoMath.isoToGrid(worldPoint.x, worldPoint.y, this.mapOriginX, this.mapOriginY);

        // Créer le fantôme s'il n'existe pas
        if (!this.ghostObject) {
            // On utilise 'rock' comme base pour le campfire pour l'instant
            this.ghostObject = this.add.image(0, 0, 'rock');
            this.ghostObject.setAlpha(0.6);
            this.ghostObject.setTint(0xffaa00);
            this.ghostObject.setOrigin(0.5, 1);

            // Animation de pulsation
            this.ghostTween = this.tweens.add({
                targets: this.ghostObject,
                scale: 1.1,
                alpha: 0.4,
                duration: 800,
                yoyo: true,
                repeat: -1
            });
        }

        // Positionner le fantôme
        if (this.isValidTile(target.x, target.y)) {
            const isoPos = IsoMath.gridToIso(target.x, target.y, this.mapOriginX, this.mapOriginY);
            this.ghostObject.setPosition(isoPos.x, isoPos.y);
            this.ghostObject.setDepth(999999);

            // Indiquer la validité (Vert si vide, Rouge si occupé)
            const isOccupied = this.objectManager.hasObject(target.x, target.y) ||
                this.mapManager.gridData[target.y]?.[target.x] !== 0;

            this.ghostObject.setTint(isOccupied ? 0xff0000 : 0x00ff00);
        } else {
            this.ghostObject.setVisible(false);
        }
    }

    /**
     * Nettoyage des ressources à la fermeture de la scène
     */
    private shutdown() {
        if (this.survivalTimer) this.survivalTimer.destroy();
        this.input.off('gameobjectup');
        this.input.off('pointerdown');
        this.input.off('pointermove');
        this.input.off('wheel');
        this.input.off('pointerup');

        if (this.tileManager) this.tileManager.destroy();
        // Add other destroy calls if managers implement them
    }

    /**
     * Configure tous les événements d'entrée
     */
    private setupInputEvents(): void {
        // Clic sur un objet
        this.input.on('gameobjectup', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image) => {
            // Empêche la récolte si on est en mode placement
            if (this.playerStore.placementMode) return;

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
        this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: unknown[], deltaX: number, deltaY: number) => {
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
        const gridData = this.mapManager.gridData;

        if (!this.isValidTile(target.x, target.y)) return;

        // --- SECTION : PLACEMENT D'OBJET ---
        if (this.playerStore.placementMode && this.playerStore.placingItemName) {
            // Vérification si la case est libre
            const isOccupied = this.objectManager.hasObject(target.x, target.y) ||
                gridData[target.y]?.[target.x] !== 0; // 0 = vide/herbe

            if (!isOccupied) {
                this.handlePlacement(target.x, target.y);
            } else {
                this.playerStore.lastActionFeedback = "Impossible de placer ici !#" + Date.now();
                console.log("Placement impossible : case occupée");
            }
            return; // On arrête là pour ne pas bouger
        }

        // --- SECTION : MOUVEMENT STANDARD ---

        const playerPos = this.player.getGridPosition();
        const dist = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, target.x, target.y);

        // Interaction avec l'eau (Récolte)
        // ID 2 correspond à l'eau dans MapManager
        if (gridData[target.y]?.[target.x] === 2) {
            if (dist < 2) {
                this.playerStore.addItem('Flasque d\'eau');
                const isoPos = IsoMath.gridToIso(target.x, target.y, this.mapOriginX, this.mapOriginY);
                this.showFloatingText(isoPos.x, isoPos.y - 50, "+1 Flasque d'eau", "#06b6d4"); // Cyan
            } else {
                console.log("Trop loin de l'eau !");
            }
            return;
        }

        // Récolte Objet
        if (gridData[target.y]?.[target.x] === 1) {
            this.handleHarvestIntent(target.x, target.y);
            return;
        }

        this.startMove(target.x, target.y, null);
    }

    /**
     * Gère le placement effectif de l'objet
     */
    private handlePlacement(x: number, y: number): void {
        console.log("Placement de :", this.playerStore.placingItemName);

        // Création de l'objet
        if (this.playerStore.placingItemName === 'Kit de Feu de Camp') {
            // On utilise 'rock' teinté pour l'instant
            const campfire = this.objectManager.placeObject(x, y, 'rock', this.mapOriginX, this.mapOriginY);
            campfire.setTint(0xffaa00);
            campfire.setName('Feu de Camp');
            campfire.setData('type', 'campfire');

            // Animation continue
            this.tweens.add({
                targets: campfire,
                scale: { from: 1, to: 1.05 },
                alpha: { from: 1, to: 0.9 },
                yoyo: true,
                repeat: -1,
                duration: 1000
            });

            // Consommation de l'item
            this.playerStore.removeItem(this.playerStore.placingItemName, 1);

            // Feedback
            this.playerStore.lastActionFeedback = "Feu de Camp placé !#" + Date.now();
        }

        // Désactivation du mode placement (ou on le laisse pour en placer plusieurs ?) - Désactivation pour l'instant
        this.playerStore.setPlacementMode(false);
    }


    /**
     * Gère l'intention de récolter une ressource
     */
    private handleHarvestIntent(targetX: number, targetY: number): void {
        const object = this.objectManager.getObject(targetX, targetY);
        const playerPos = this.player.getGridPosition();
        const dist = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, targetX, targetY);

        // Interaction spéciale : Pommier (sans détruire l'arbre)
        if (object && object.getData('subType') === 'apple_tree') {
            if (dist < 2) {
                this.playerStore.addItem('Pomme');

                const objectPos = IsoMath.gridToIso(targetX, targetY, this.mapOriginX, this.mapOriginY);
                this.showFloatingText(objectPos.x, objectPos.y - 50, "+1 Pomme", "#ef4444"); // Rouge

                // Animation de secousse
                this.tweens.add({
                    targets: object,
                    x: object.x + 3,
                    yoyo: true,
                    duration: 50,
                    repeat: 5
                });
                return;
            }
        }

        const gridData = this.mapManager.gridData;

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
            gridData[n.y]?.[n.x] === 0
        );

        if (validNeighbors.length === 0) return;

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

                    // Mise à jour Data
                    this.mapManager.updateCell(x, y, 0);
                    this.pathfindingManager.updateGrid(this.mapManager.gridData);

                    if (itemDropped) {
                        this.playerStore.addItem(itemDropped);
                        this.showFloatingText(object.x, object.y - 50, `+1 ${itemDropped}`, "#fbbf24"); // Ambre/Jaune
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
                // Calcul du coût en énergie pour le trajet total
                // On exclut la première tuile (position actuelle)
                const pathCost = path.length - 1;

                if (this.playerStore.stats.energy < pathCost) {
                    console.log(`[MainScene] Pas assez d'énergie ! Besoin: ${pathCost}, Dispo: ${Math.floor(this.playerStore.stats.energy)}`);
                    // TODO: Feedback UI "Pas assez d'énergie"

                    // On peut imaginer d'annuler tout le mouvement, ou de bouger jusqu'à épuisement.
                    // Pour l'exercice : on empêche le départ.
                    return;
                }

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

        // Consommation d'énergie par pas
        this.playerStore.consumeEnergy(1);

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

        // Use mapManager for reuse of logic
        const isInHouse = this.mapManager.isInsideHouse(x, y);
        this.tweens.add({
            targets: this.houseRoof,
            alpha: isInHouse ? 0.2 : 1,
            duration: 300
        });
    }

    /**
     * Affiche un texte flottant au-dessus d'une position
     */
    public showFloatingText(x: number, y: number, message: string, color: string = '#ffffff'): void {
        const text = this.add.text(x, y - 20, message, {
            fontFamily: 'monospace',
            fontSize: '14px',
            fontStyle: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: 3
        });
        text.setOrigin(0.5, 0.5);
        text.setDepth(999999); // Toujours au-dessus

        this.tweens.add({
            targets: text,
            y: y - 70,
            alpha: 0,
            duration: 1500,
            ease: 'Power1',
            onComplete: () => {
                text.destroy();
            }
        });
    }

    /**
     * Vérifie si une tuile est valide
     */
    private isValidTile(x: number, y: number): boolean {
        return x >= 0 && x < GameConfig.MAP_SIZE && y >= 0 && y < GameConfig.MAP_SIZE;
    }
}
