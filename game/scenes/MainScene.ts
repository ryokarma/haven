import { Scene } from 'phaser';
import { usePlayerStore } from '@/stores/player';
import { useNetworkStore } from '@/stores/network';
import { useWorldStore } from '@/stores/world';
import { getItemData, type ToolType } from '@/game/config/ItemRegistry';
import { useChatStore } from '@/stores/chat';
import { useBuildStore } from '@/stores/build';
import { IsoMath } from '@/game/utils/IsoMath';
import { GameConfig } from '@/game/config/GameConfig';
import { TextureGenerator } from '@/game/graphics/TextureGenerator';
import { PathfindingManager } from '@/game/managers/PathfindingManager';
import { TileManager } from '@/game/managers/TileManager';
import { ObjectManager, RENDER_OFFSETS } from '@/game/managers/ObjectManager';
import { AmbianceManager } from '@/game/managers/AmbianceManager';
import { MapManager } from '@/game/managers/MapManager';
import { SaveManager, type GameState } from '@/game/managers/SaveManager';
import { InputManager } from '@/game/managers/InputManager';
import { TileSelector } from '@/game/ui/TileSelector';
import { Player } from '@/game/entities/Player';

export class MainScene extends Scene {
    // Stores
    private playerStore!: ReturnType<typeof usePlayerStore>;
    private worldStore!: ReturnType<typeof useWorldStore>;
    private buildStore!: ReturnType<typeof useBuildStore>;

    // Config
    private mapOriginX!: number;
    private mapOriginY!: number;

    // Managers
    private tileManager!: TileManager;
    private objectManager!: ObjectManager;
    private ambianceManager!: AmbianceManager;
    private saveManager!: SaveManager;
    private mapManager!: MapManager;
    private pathfindingManager!: PathfindingManager;
    private textureGenerator!: TextureGenerator;

    // Entities
    private tileSelector!: TileSelector;
    private player!: Player;
    private houseRoof?: Phaser.GameObjects.Image;
    private placementGhost: Phaser.GameObjects.Image | null = null;
    private lastGhostIsoX: number = 0;
    private lastGhostIsoY: number = 0;

    // State
    private survivalTimer?: Phaser.Time.TimerEvent;
    private worldTimer?: Phaser.Time.TimerEvent;
    private lastGrowthCheck: number = 0;
    private isMoving: boolean = false;
    private currentPath: { x: number; y: number }[] = [];
    private pendingAction: (() => void) | null = null;

    // Input Manager
    private inputManager!: InputManager;

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
        this.worldStore = useWorldStore();
        this.buildStore = useBuildStore();

        // Réinitialiser le mode placement au démarrage par sécurité
        this.playerStore.setPlacementMode(false);

        // Configuration de l'origine de la carte
        this.mapOriginX = GameConfig.MAP_SIZE * (IsoMath.TILE_WIDTH / 2);
        this.mapOriginY = 100;

        // Initialisation des managers
        this.tileManager = new TileManager(this);
        this.objectManager = new ObjectManager(this);
        this.ambianceManager = new AmbianceManager(this);
        this.saveManager = new SaveManager(this, this.objectManager);

        // Input Manager (Initialisé tôt pour capturer les events si besoin)
        this.inputManager = new InputManager(this, this.mapOriginX, this.mapOriginY);

        // Map Manager (Handles Data & Generation)
        this.mapManager = new MapManager(
            this,
            this.tileManager,
            this.objectManager,
            this.mapOriginX,
            this.mapOriginY
        );

        // --- CHARGEMENT DE LA SAUVEGARDE ---
        const savedGame = this.saveManager.loadGame();
        let scaleFactor = 1; // Default zoom

        if (savedGame) {
            // Restauration des Stores
            console.log("Applying Save Data...");
            this.worldStore.time = savedGame.world.time;
            this.worldStore.worldSeed = savedGame.world.seed; // IMPORTANT: Set seed BEFORE gen

            // Player Stats & Inv
            this.playerStore.stats = savedGame.player.stats;
            this.playerStore.inventory = savedGame.player.inventory;
            this.playerStore.xp = savedGame.player.xp;
            this.playerStore.level = savedGame.player.level;
            this.playerStore.color = savedGame.player.color;
            this.playerStore.position = savedGame.player.position; // Store position textuelle
        } else {
            console.log("No Save Game. Starting New Game.");
            this.worldStore.initSeed();
        }

        // Génération de la carte (Basé sur la seed)
        this.mapManager.generate();

        // --- APPLICATION DES MODIFICATIONS DE MAP (Load) ---
        if (savedGame) {
            // 1. Supprimer les objets récoltés
            savedGame.map.removedObjectIds.forEach(id => {
                // ID format "x,y"
                const parts = id.split(',');
                const x = parseInt(parts[0] as string);
                const y = parseInt(parts[1] as string);
                this.objectManager.removeObject(x, y);
                this.mapManager.updateCell(x, y, 0); // Libère la tuile (important pour pathfinding)
            });

            // 2. Replacer les objets construits
            savedGame.map.placedObjects.forEach(objData => {
                this.objectManager.placeObject(
                    objData.x,
                    objData.y,
                    objData.type,
                    this.mapOriginX,
                    this.mapOriginY,
                    true // isPlayerPlaced = true
                );
                // Note: On ne set pas forcément la grid à 1 (bloquant) pour les feux de camp
                // selon règles du jeu. Si bloquant, ajouter updateCell(x,y,1).
            });
        }

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

        // Gestion de l'autosave
        this.saveManager.startAutoSave(30);

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

        // Configuration des événements d'entrée via InputManager
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

        // Timer pour l'heure du monde (10 minutes toutes les 1s)
        this.worldTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.worldStore.tickTime(10);
            },
            loop: true
        });


        // Notifier le store que le chargement est terminé pour enlever l'écran de chargement
        // Notifier le store que le chargement est terminé pour enlever l'écran de chargement
        const worldStore = useWorldStore();
        worldStore.setMapLoaded(true);

        // --- MULTIJOUEUR ---
        const networkStore = useNetworkStore();
        networkStore.listenForWalletUpdates(); // Start listening for economy
        networkStore.listenForErrors(); // Start listening for server errors

        // Abonnement aux messages
        networkStore.onMessage((msg: any) => {
            if (msg.type === 'PLAYER_JOINED') {
                // Spawn new player
                // Default specific coordinates for now: 200, 200 (screen space, temporary)
                // We will simply use 10,10 grid coordinates converted to iso for stability
                const spawnGrid = { x: 10, y: 10 };
                const isoPos = IsoMath.gridToIso(spawnGrid.x, spawnGrid.y, this.mapOriginX, this.mapOriginY);
                this.objectManager.addRemotePlayer(msg.id, isoPos.x, isoPos.y);

                this.showFloatingText(isoPos.x, isoPos.y - 120, "Un joueur arrive !", "#ffffff");
            }
            else if (msg.type === 'PLAYER_LEFT') {
                this.objectManager.removeRemotePlayer(msg.id);
            }
            else if (msg.type === 'CURRENT_PLAYERS') {
                if (msg.players && Array.isArray(msg.players)) {
                    msg.players.forEach((pid: string) => {
                        // Similar spawn logic
                        const spawnGrid = { x: 10, y: 10 };
                        const isoPos = IsoMath.gridToIso(spawnGrid.x, spawnGrid.y, this.mapOriginX, this.mapOriginY);
                        this.objectManager.addRemotePlayer(pid, isoPos.x, isoPos.y);
                    });
                }
            }
            else if (msg.type === 'PLAYER_MOVED') {
                this.objectManager.moveRemotePlayer(msg.id, msg.x, msg.y);
            }
            else if (msg.type === 'WORLD_STATE') {
                if (msg.payload && msg.payload.resources && Array.isArray(msg.payload.resources)) {
                    // 1. Stocker l'état de manière réactive dans le worldStore (source de vérité Pinia)
                    this.worldStore.loadWorldState(msg.payload);

                    // 2. Instancier visuellement les objets via MapManager → ObjectManager.syncWorldObjects()
                    //    (nettoyage des doublons + placement sur la carte isométrique inclus)
                    this.mapManager.populateFromState(msg.payload.resources);

                    // 3. Mettre à jour la grille de pathfinding avec les nouvelles collisions
                    this.pathfindingManager.updateGrid(this.mapManager.gridData);

                    console.log(`[MainScene] WORLD_STATE appliqué : ${msg.payload.resources.length} objet(s) placé(s).`);
                } else {
                    console.warn('[MainScene] WORLD_STATE reçu mais payload.resources absent ou vide.', msg);
                }
            }
            else if (msg.type === 'RESOURCE_PLACED') {
                this.mapManager.addResource(msg.resource);
            }
            else if (msg.type === 'RESOURCE_REMOVED') {
                this.mapManager.removeResource(msg.id, msg.x, msg.y);
            }
            else if (msg.type === 'PLAYER_SYNC') {
                const userData = msg.payload;
                if (userData && userData.x !== undefined && userData.y !== undefined) {
                    console.log(`[MainScene] Sync Player Position to ${userData.x}, ${userData.y}`);
                    this.player.setIsoPosition(userData.x, userData.y, this.mapOriginX, this.mapOriginY);

                    // Centrer caméra
                    this.cameras.main.centerOn(userData.x, userData.y);
                }
            }
        });

        // SYSTEME DE FEEDBACK (Chat & Economie)

        // 1. Chat Bubbles
        const chatStore = useChatStore();

        // Ecoute directe via NetworkStore (plus simple car on a déjà le message ici)
        networkStore.onMessage((msg: any) => {
            if (msg.type === 'CHAT_MESSAGE') {
                // Trouver le sprite cible
                let targetSprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container | Phaser.GameObjects.Image | undefined;

                // C'est moi ?
                const myId = localStorage.getItem('haven_player_id');
                if (msg.sender === myId) {
                    targetSprite = this.player.getSprite();
                } else {
                    targetSprite = this.objectManager.remotePlayers.get(msg.sender);
                }

                if (targetSprite) {
                    this.objectManager.createChatBubbleOnSprite(targetSprite, msg.text);
                }
            }

            // 2. Resource Feedback
            if (msg.type === 'WALLET_UPDATE') {
                // On compare avec l'ancien state ? 
                // Le payload contient le nouveau wallet complet : { wood: 10, stone: 5 }
                // On doit savoir ce qui a changé.
                // On utilise le store player pour avoir l'état précédent (il n'est pas encore mis à jour quand on reçoit le msg ici ?)
                // ATTENTION : networkStore met à jour playerStore AVANT d'appeler ce callback 
                // car listenForWalletUpdates est enregistré avant.
                // Donc playerStore a DEJA la nouvelle valeur.
                // Il nous faut la valeur précédente. 
                // Solution : Modifier PlayerStore pour émettre un 'diff' ou gérer ici en comparant avec une copie locale.
            }
        });


        // --- HANDSHAKE : Demande explicite de l'état du monde ---
        // On envoie cette requête une fois que TOUS les listeners sont enregistrés.
        // Le serveur ne pousse plus WORLD_STATE automatiquement (Session 8.3).
        // Cela garantit que la scène Phaser est prête à recevoir et traiter les données.
        console.log('[MainScene] Envoi de REQUEST_WORLD_STATE (handshake)...');
        networkStore.send('REQUEST_WORLD_STATE');

        // Cleanup on shutdown
        this.events.once('shutdown', this.shutdown, this);
    }

    override update(time: number, delta: number) {
        // Mise à jour périodique des stations proches (toutes les 60 frames environ ~1s)
        if (this.game.loop.frame % 60 === 0) {
            this.updateNearbyStations();
        }

        // Système de Croissance (Toutes les 5s)
        if (time - this.lastGrowthCheck > 5000) {
            this.checkGrowth();
            this.lastGrowthCheck = time;
        }

        // Mise à jour du sélecteur de tuile (Désormais géré via l'update loop pour la fluidité)
        // Mais InputManager pourrait aussi envoyer des events 'hover'.
        // Pour l'instant on garde le polling via InputManager ou native input ?
        // On va garder le polling native pour la fluidité du reticule, ou utiliser le pointeur actif.
        this.tileSelector.update(
            this.input.activePointer,
            this.cameras.main,
            this.mapManager.gridData
        );

        // Logic Visualisation Mode Placement (Ghost)
        this.updatePlacementGhost();

        // Mise à jour de l'ambiance (parallaxe fond)
        this.ambianceManager.update();

        // Application du cycle Jour/Nuit (Couleur globale)
        const ambientColor = this.ambianceManager.getAmbientColor(this.worldStore.time);

        // Teinter les tuiles
        this.tileManager.getTileGroup().getChildren().forEach(go => {
            const img = go as Phaser.GameObjects.Image;

            // Lazy init de la teinte originale
            if (!img.getData('hasOriginalTint')) {
                img.setData('originalTint', img.tintTopLeft);
                img.setData('hasOriginalTint', true);
            }

            const originalTint = img.getData('originalTint') as number;
            const finalTint = this.ambianceManager.multiplyColors(ambientColor, originalTint);
            img.setTint(finalTint);
        });

        // Teinter les objets
        this.objectManager.getObjectMap().forEach(obj => {
            // Lazy init (sécurité si pas set par ObjectManager à temps)
            if (obj.getData('originalTint') === undefined) {
                obj.setData('originalTint', 0xffffff);
            }

            const originalTint = obj.getData('originalTint') as number;
            const finalTint = this.ambianceManager.multiplyColors(ambientColor, originalTint);
            obj.setTint(finalTint);
        });

        // Teinter le joueur
        this.player.setTint(ambientColor);

        // GESTION DES LUMIÈRES (Contrast)
        // La nuit (20h-6h), les lumières sont allumées. Le jour, éteintes (0).
        // Transition plus franche pour éviter le "voile blanc".

        const isNight = this.worldStore.isNight;
        const lightAlpha = isNight ? 0.6 : 0;

        // Mise à jour lumière du joueur
        this.player.updateLight(lightAlpha);

        // Mise à jour lumières des objets (Feux de camp)
        this.objectManager.getObjectMap().forEach(obj => {
            const light = obj.getData('light') as Phaser.GameObjects.Image;
            if (light) {
                // On force la visibilité uniquement la nuit
                light.setVisible(lightAlpha > 0);
            }
        });
    }

    /**
     * Configure tous les événements d'entrée via InputManager
     */
    private setupInputEvents(): void {

        // Clic Gauche : Déplacement ou Placement
        this.inputManager.events.on('tile-clicked', (event: any) => {
            const { x, y } = event;
            this.handleLeftClick(x, y);
        });

        // Clic Droit : Interaction (Récolte, Utilisation)
        this.inputManager.events.on('tile-interact', (event: any) => {
            const { x, y } = event;
            const networkStore = useNetworkStore();

            if (this.buildStore.selectedItemId === 'cursor') {
                // Mode curseur : On récolte / interagit (Suppression server-side)
                networkStore.sendInteract(x, y);
            } else {
                // Mode construction : On construit
                // On vérifie d'abord si la case est libre localement (Feedback immédiat)
                if (this.mapManager.isTileOccupied(x, y)) {
                    // Feedback visuel déjà géré par le Ghost (Rouge)
                    // On peut ajouter un son ou un message d'erreur ici si nécessaire
                    return;
                }
                networkStore.sendBuild(x, y, this.buildStore.selectedItemId);
            }
        });
    }

    /**
     * Gère le clic gauche (Mouvement ou Placement)
     */
    private handleLeftClick(x: number, y: number): void {
        const gridData = this.mapManager.gridData;

        if (!this.isValidTile(x, y)) return;

        // --- SECTION : PLACEMENT D'OBJET ---
        if (this.playerStore.placementMode && this.playerStore.placingItemName) {
            // Vérification si la case est libre
            const isOccupied = this.objectManager.hasObject(x, y) ||
                gridData[y]?.[x] !== 0; // 0 = vide/herbe

            if (!isOccupied) {
                this.handlePlacement(x, y);
            } else {
                this.playerStore.lastActionFeedback = "Impossible de placer ici !#" + Date.now();
            }
            return;
        }

        // --- SECTION : MOUVEMENT STANDARD ---

        // Cas spécial : Récolte d'eau (Left Click autorisé pour fluidité)
        const playerPos = this.player.getGridPosition();
        const dist = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, x, y);
        if (gridData[y]?.[x] === 2 && dist < 2) {
            // On délègue à l'interaction pour l'eau aussi par simplicité ou on garde ?
            // Pour l'instant on garde le move sauf si c'est de l'eau proche
            this.handleInteraction(x, y);
            return;
        }

        // Sinon, Déplacement
        this.startMove(x, y, null);
    }

    /**
     * Gère l'interaction (Clic Droit ou spécial)
     */
    private handleInteraction(x: number, y: number): void {
        // Tentative de récolte / Utilisation
        if (this.isValidTile(x, y)) {
            this.handleHarvestIntent(x, y);
        }
    }

    /**
     * Nettoyage des ressources à la fermeture de la scène
     */
    private shutdown() {
        if (this.survivalTimer) this.survivalTimer.destroy();
        if (this.worldTimer) this.worldTimer.destroy();

        if (this.inputManager) this.inputManager.destroy();

        if (this.tileManager) this.tileManager.destroy();
        // Add other destroy calls if managers implement them
    }

    /**
     * Gère le placement effectif de l'objet
     */
    private handlePlacement(x: number, y: number): void {
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
        } else if (this.playerStore.placingItemName === 'furnace') {
            const furnace = this.objectManager.placeObject(x, y, 'furnace', this.mapOriginX, this.mapOriginY, true);
            furnace.setName('Four en pierre');
            furnace.setData('type', 'furnace'); // Ensure type is set for Station detection

            // Le four est un obstacle
            this.mapManager.updateCell(x, y, 1);

            // Consommation de l'item
            this.playerStore.removeItem(this.playerStore.placingItemName, 1);
            this.playerStore.lastActionFeedback = "Four placé !#" + Date.now();
        } else if (this.playerStore.placingItemName === 'clay_pot') {
            const pot = this.objectManager.placeObject(x, y, 'clay_pot', this.mapOriginX, this.mapOriginY, true);
            pot.setName('Pot en argile');
            pot.setData('type', 'clay_pot');

            // Consommation de l'item
            this.playerStore.removeItem(this.playerStore.placingItemName, 1);
            this.playerStore.lastActionFeedback = "Pot placé !#" + Date.now();
        }

        // Désactivation du mode placement (ou on le laisse pour en placer plusieurs ?) - Désactivation pour l'instant
        this.playerStore.setPlacementMode(false);
    }


    /**
     * Vérifie la croissance des plantes
     */
    private checkGrowth(): void {
        const objects = this.objectManager.getObjectMap();
        objects.forEach((obj, key) => {
            if (obj.getData('type') === 'clay_pot_watered') {
                if (Math.random() < 0.3) {
                    const x = obj.getData('gridX');
                    const y = obj.getData('gridY');

                    this.objectManager.removeObject(x, y);

                    const ready = this.objectManager.placeObject(x, y, 'clay_pot_ready', this.mapOriginX, this.mapOriginY, true);
                    ready.setName('Pot (Prêt)');
                    ready.setData('type', 'clay_pot_ready');

                    this.mapManager.updateCell(x, y, 1);
                }
            }
        });
    }

    /**
     * Gère l'intention de récolter une ressource
     */
    private handleHarvestIntent(targetX: number, targetY: number): void {
        const object = this.objectManager.getObject(targetX, targetY);
        const playerPos = this.player.getGridPosition();
        const dist = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, targetX, targetY);

        // Interaction : Plantation (Pot vide + Graine)
        if (object && object.getData('type') === 'clay_pot') {
            if (dist < 2) {
                const mainHand = this.playerStore.equipment.mainHand;
                if (mainHand && mainHand.name === 'cotton_seeds') {
                    // Consommer la graine (Déséquiper -> Retirer 1)
                    this.playerStore.unequipItem('mainHand');
                    this.playerStore.removeItem('cotton_seeds', 1);

                    // Remplacer l'objet
                    const tx = object.getData('gridX');
                    const ty = object.getData('gridY');
                    this.objectManager.removeObject(tx, ty);

                    const seededPot = this.objectManager.placeObject(tx, ty, 'clay_pot_seeded', this.mapOriginX, this.mapOriginY, true);
                    seededPot.setName('Pot (Semis)');
                    seededPot.setData('type', 'clay_pot_seeded');

                    // Obstacle
                    this.mapManager.updateCell(tx, ty, 1);

                    this.showFloatingText(object.x, object.y - 50, "Planté !", "#4ade80");
                    return;
                }
            }
        }

        // Interaction : Arrosage (Pot semé + Arrosoir)
        if (object && object.getData('type') === 'clay_pot_seeded') {
            if (dist < 2) {
                const mainHand = this.playerStore.equipment.mainHand;
                if (mainHand && mainHand.name === 'watering_can') {
                    // Arroser
                    const tx = object.getData('gridX');
                    const ty = object.getData('gridY');
                    this.objectManager.removeObject(tx, ty);

                    const wateredPot = this.objectManager.placeObject(tx, ty, 'clay_pot_watered', this.mapOriginX, this.mapOriginY, true);
                    wateredPot.setName('Pot (Arrosé)');
                    wateredPot.setData('type', 'clay_pot_watered');
                    this.mapManager.updateCell(tx, ty, 1);

                    this.showFloatingText(object.x, object.y - 50, "Arrosé !", "#29B6F6");
                    return;
                }
            }
        }

        // Interaction : Récolte Finale (Pot Prêt + Gants)
        if (object && object.getData('type') === 'clay_pot_ready') {
            if (dist < 2) {
                const accessory = this.playerStore.equipment.accessory;
                if (accessory?.name === 'gloves') {
                    // Récolte
                    const nbPlants = Phaser.Math.Between(2, 4);
                    const nbSeeds = Phaser.Math.Between(1, 2);

                    this.playerStore.addItem('cotton_plant', nbPlants);
                    this.playerStore.addItem('cotton_seeds', nbSeeds);

                    const tx = object.getData('gridX');
                    const ty = object.getData('gridY');
                    this.objectManager.removeObject(tx, ty);

                    // Reset to empty pot
                    const pot = this.objectManager.placeObject(tx, ty, 'clay_pot', this.mapOriginX, this.mapOriginY, true);
                    pot.setName('Pot en argile');
                    pot.setData('type', 'clay_pot');
                    this.mapManager.updateCell(tx, ty, 0);

                    this.showFloatingText(object.x, object.y - 50, `+${nbPlants} Coton`, "#4ade80");
                    return;
                } else {
                    this.showFloatingText(object.x, object.y - 50, "Il faut des gants !", "#ef4444");
                }
            }
        }

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
            const type = object.getData('type');
            const mainHand = this.playerStore.equipment.mainHand;
            const toolData = mainHand ? getItemData(mainHand.name) : null;
            const currentToolType = toolData?.toolType || 'none';

            let requiredTool: ToolType | 'any' = 'none';
            let requiredToolName = '';

            if (type === 'rock') { requiredTool = 'pickaxe'; requiredToolName = 'une pioche'; }
            else if (type === 'tree') { requiredTool = 'axe'; requiredToolName = 'une hache'; }
            else if (type === 'cotton_bush') {
                if (this.playerStore.equipment.accessory?.name === 'gloves') {
                    requiredTool = 'none';
                } else {
                    requiredTool = 'knife'; requiredToolName = 'un couteau';
                }
            }
            else if (type === 'clay_mound') { requiredTool = 'shovel'; requiredToolName = 'une pelle'; }

            // Vérification de l'outil
            if (requiredTool !== 'none' && currentToolType !== requiredTool) {
                this.showFloatingText(object.x, object.y - 50, `Il faut ${requiredToolName} !`, "#ef4444");
                return;
            }

            // Calcul du coût de récolte basé sur l'équipement
            const harvestCost = this.playerStore.statsModifiers.harvestCost;

            if (this.playerStore.stats.energy < harvestCost) {
                this.showFloatingText(object.x, object.y - 50, "Trop fatigué !", "#ef4444");
                return;
            }

            this.playerStore.consumeEnergy(harvestCost);

            // Feedback visuel sur l'effort
            const isEfficient = harvestCost < 3;
            // Green if efficient, white if normal
            const color = isEfficient ? "#4ade80" : "#ffffff";
            const text = isEfficient ? `- ${harvestCost} Énergie` : `- ${harvestCost} Énergie`;

            this.showFloatingText(object.x, object.y - 80, text, color);


            this.tweens.add({
                targets: object,
                x: object.x + 5,
                yoyo: true,
                duration: 50,
                repeat: 3,
                onComplete: () => {
                    let itemDropped = '';

                    let count = 1;

                    if (type === 'tree') itemDropped = 'Bois';
                    else if (type === 'rock') itemDropped = 'Pierre';
                    else if (type === 'cotton_bush') {
                        if (this.playerStore.equipment.accessory?.name === 'gloves') {
                            itemDropped = 'cotton_seeds';
                            count = Phaser.Math.Between(1, 3);
                        } else {
                            itemDropped = 'cotton_plant';
                        }
                    }
                    else if (type === 'clay_mound') itemDropped = 'raw_clay';

                    this.objectManager.removeObject(x, y);

                    // Mise à jour Data
                    this.mapManager.updateCell(x, y, 0);
                    this.pathfindingManager.updateGrid(this.mapManager.gridData);

                    if (itemDropped) {
                        this.playerStore.addItem(itemDropped, count);
                        this.showFloatingText(object.x, object.y - 50, `+${count} ${itemDropped}`, "#fbbf24"); // Ambre/Jaune
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
                // On n'empêche plus le mouvement si énergie vide, on ralentit juste (voir moveNextStep)

                path.shift(); // Retirer la position actuelle
                this.currentPath = path;
                this.isMoving = true;

                // Broadcast du mouvement initial (Destination finale ou prochaine étape ?)
                // Pour une synchro simple, on envoie la destination finale souhaitée
                // Mais ici on bouge case par case. Envoyer chaque pas ou la destination ?
                // Envoyer la destination finale (x,y) permet aux autres clients de pathfind.
                // Envoyer le prochain pas est plus simple mais plus coûteux en réseau.
                // Pour cette session : on envoie la destination finale du clic (x,y arguments de startMove).

                // Note: startMove recoit x,y qui sont des coordonnées GRILLE.
                // Le serveur attend des coordonnées. Idéalement Iso pour l'affichage direct par les autres.
                // ObjectManager.moveRemotePlayer attend des coordonnées écran (Iso).

                const targetIso = IsoMath.gridToIso(x, y, this.mapOriginX, this.mapOriginY);
                // On utilise le store qui est déjà importé mais pas assigné à une propriété de classe
                // On va devoir le récupérer via useNetworkStore() car pas stocké dans 'this'
                // Ou mieux, on l'ajoute aux propriétés de la classe.
                const networkStore = useNetworkStore();
                networkStore.sendMove(targetIso.x, targetIso.y);

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

        // Gestion de l'énergie et de la fatigue
        const currentEnergy = this.playerStore.stats.energy;
        const isExhausted = currentEnergy <= 0;

        // Calcul de la vitesse : Plus lent si épuisé (x2 duration = 0.5 speed)
        // Normal : 250ms, Épuisé : 500ms
        const stepDuration = isExhausted
            ? GameConfig.MOVEMENT.stepDuration * 2
            : GameConfig.MOVEMENT.stepDuration;

        // Feedback visuel temporaire si épuisé (Teinte bleutée "Fatigue")
        if (isExhausted) {
            this.player.setTint(0x88ccff);
        } else {
            // On laisse l'update loop gérer la teinte Jour/Nuit, 
            // mais on force un petit reset ici par sécurité ou on laisse le tint manager global
            // Pour l'instant on ne force pas le reset blanc pour ne pas casser l'ambiance nuit
        }

        // Consommation d'énergie par pas
        this.playerStore.consumeEnergy(1);

        this.checkRoofVisibility(nextTile.x, nextTile.y);

        this.player.animateMoveTo(
            nextTile.x,
            nextTile.y,
            this.mapOriginX,
            this.mapOriginY,
            () => this.moveNextStep(),
            stepDuration
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

    /**
     * Met à jour la liste des stations de craft proches
     */
    private updateNearbyStations(): void {
        const playerPos = this.player.getGridPosition();
        const range = 3; // Rayon de détection
        const stations: string[] = [];

        // Scan simple des objets proches
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                const checkX = playerPos.x + dx;
                const checkY = playerPos.y + dy;
                const obj = this.objectManager.getObject(checkX, checkY);
                if (obj) {
                    const type = obj.getData('type');
                    if (type === 'furnace') stations.push('furnace');
                }
            }
        }

        this.playerStore.updateNearbyStations(stations);
    }


    /**
     * Gère la chaleur du feu de camp
     */
    private handleCampfireWarmth(): void {
        const playerPos = this.player.getGridPosition();
        let nearFire = false;

        this.objectManager.getObjectMap().forEach(obj => {
            if (obj.getData('type') === 'campfire' || obj.getData('type') === 'camp') {
                const dist = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, obj.getData('gridX'), obj.getData('gridY'));
                if (dist <= 3) {
                    nearFire = true;
                }
            }
        });

        if (nearFire) {
            // Regen mild energy if near fire
            if (this.playerStore.stats.energy < this.playerStore.stats.maxEnergy) {
                this.playerStore.updateStats({ energy: this.playerStore.stats.energy + 0.2 });
            }
        }
    }

    /**
     * Met à jour le fantôme de placement
     */
    private updatePlacementGhost() {
        if (!this.buildStore) return;

        const selectedId = this.buildStore.selectedItemId;

        // Si curseur ou rien, on cache
        if (selectedId === 'cursor' || !selectedId) {
            if (this.placementGhost) {
                this.placementGhost.setVisible(false);
            }
            return;
        }

        // On crée le ghost s'il n'existe pas
        if (!this.placementGhost) {
            this.placementGhost = this.add.image(0, 0, selectedId);
            this.placementGhost.setAlpha(0.6);
            this.placementGhost.setDepth(999999);
        }

        // On met à jour la texture si elle a changé
        if (this.placementGhost.texture.key !== selectedId) {
            this.placementGhost.setTexture(selectedId);
        }

        this.placementGhost.setVisible(true);

        const pointer = this.input.activePointer;
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        // Conversion précise Iso -> Grid
        const gridPos = IsoMath.isoToGrid(worldPoint.x, worldPoint.y, this.mapOriginX, this.mapOriginY);
        const gx = Math.round(gridPos.x);
        const gy = Math.round(gridPos.y);

        const isoPos = IsoMath.gridToIso(gx, gy, this.mapOriginX, this.mapOriginY);

        this.placementGhost.setPosition(isoPos.x, isoPos.y);

        // Validation Collision
        if (this.mapManager.isTileOccupied(gx, gy)) {
            // Rouge si occupé
            this.placementGhost.setTint(0xff0000);
        } else {
            // Normal sinon
            this.placementGhost.clearTint();
        }
    }
}
