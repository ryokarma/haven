import Phaser from 'phaser';
import { IsoMath } from '../utils/IsoMath';
import { GameConfig } from '../config/GameConfig';
import { useNetworkStore } from '../../stores/network';

export type InputEvent = {
    x: number;
    y: number;
    pointer: Phaser.Input.Pointer;
    isRightClick: boolean;
};

/**
 * Gestionnaire des entrées (InputManager)
 * Capture les événements bruts (Souris, Clavier) et les transforme en événements de jeu sémantiques.
 * Permet de découpler la logique de la Scène et de préparer l'architecture serveur.
 */
export class InputManager {
    private scene: Phaser.Scene;
    private mapOriginX: number;
    private mapOriginY: number;

    // Événements publics
    public events: Phaser.Events.EventEmitter;

    // État interne pour le Drag
    private isDragging: boolean = false;
    private dragStartX: number = 0;
    private dragStartY: number = 0;
    private readonly DRAG_THRESHOLD = 5;

    // ── Session 9.8 : Anti-double-fire ──
    // Quand `gameobjectup` intercepte un clic sur une ressource,
    // on empêche `pointerup` (qui fire juste après) d'émettre aussi `tile-clicked`.
    // Sans ce flag, le clic envoie SIMULTANÉMENT resource-clicked ET tile-clicked,
    // ce dernier tentant un startMove vers la case solide → échec silencieux.
    private _resourceClickHandled: boolean = false;

    constructor(scene: Phaser.Scene, mapOriginX: number, mapOriginY: number) {
        this.scene = scene;
        this.mapOriginX = mapOriginX;
        this.mapOriginY = mapOriginY;
        this.events = new Phaser.Events.EventEmitter();

        this.setupListeners();
    }

    private setupListeners(): void {
        // Désactive le menu contextuel par défaut (Clic droit)
        this.scene.input.mouse?.disableContextMenu();

        // Pointer Down (Début potentiel de drag ou clic)
        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.isUIInteraction(pointer)) return;

            this.dragStartX = pointer.x;
            this.dragStartY = pointer.y;
            this.isDragging = false;
        });

        // Pointer Move (Gestion du Drag Caméra + Hover)
        this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            // Gestion du Drag Caméra
            if (pointer.isDown) {
                const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.dragStartX, this.dragStartY);

                if (dist > this.DRAG_THRESHOLD) {
                    this.isDragging = true;
                }

                if (this.isDragging) {
                    const camera = this.scene.cameras.main;
                    // Déplacement inversé pour un effet "Drag the world"
                    if (pointer.prevPosition) {
                        camera.scrollX -= (pointer.x - pointer.prevPosition.x) / camera.zoom;
                        camera.scrollY -= (pointer.y - pointer.prevPosition.y) / camera.zoom;
                    }
                }
            }

            // Gestion du Hover (Optionnel, pour le TileSelector par exemple)
            this.handleHover(pointer);
        });

        // Pointer Up (Action : Clic ou Fin de Drag)
        this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (this.isUIInteraction(pointer)) return;

            // Si c'était un drag, on arrête là
            if (this.isDragging) {
                this.isDragging = false;
                return;
            }

            // ── Session 9.8 : skip si gameobjectup a déjà traité ce clic ──
            if (this._resourceClickHandled) {
                this._resourceClickHandled = false;
                return;
            }

            // Sinon, c'est un Clic
            this.handleClick(pointer);
        });

        // Zoom (Molette)
        this.scene.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number) => {
            this.handleZoom(deltaY);
        });

        // Support spécial pour les GameObjects interactifs (si besoin spécifique)
        this.scene.input.on('gameobjectup', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
            // ── Session 9.8 : Skip si c'était un drag ──
            if (this.isDragging) return;

            const serverId = gameObject.getData('server_id');
            const type = gameObject.getData('type');
            const gridX = gameObject.getData('gridX') as number;
            const gridY = gameObject.getData('gridY') as number;

            if (serverId && ['tree', 'rock', 'cotton_bush', 'clay_node', 'apple_tree'].includes(type)) {
                // ── Session 9.8 : Anti-double-fire ──
                // Empêche le `pointerup` suivant d'émettre aussi un `tile-clicked`
                this._resourceClickHandled = true;

                this.events.emit('resource-clicked', {
                    serverId,
                    type,
                    x: gridX,
                    y: gridY,
                });
                console.log(`[InputManager] Clic sur ressource ${type} (id: ${serverId}) à (${gridX},${gridY}).`);
            }
        });
    }

    /**
     * Traite un clic validé (pas un drag)
     */
    private handleClick(pointer: Phaser.Input.Pointer): void {
        const worldPoint = pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
        const coords = IsoMath.isoToGrid(worldPoint.x, worldPoint.y, this.mapOriginX, this.mapOriginY);

        const eventData: InputEvent = {
            x: coords.x,
            y: coords.y,
            pointer: pointer,
            isRightClick: pointer.rightButtonDown() || pointer.button === 2
        };

        if (eventData.isRightClick) {
            this.events.emit('tile-interact', eventData);
        } else {
            this.events.emit('tile-clicked', eventData);
        }
    }

    /**
     * Traite le survol (Hover)
     */
    private handleHover(pointer: Phaser.Input.Pointer): void {
        const worldPoint = pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
        const coords = IsoMath.isoToGrid(worldPoint.x, worldPoint.y, this.mapOriginX, this.mapOriginY);

        this.events.emit('tile-hover', { x: coords.x, y: coords.y, pointer });
    }

    /**
     * Gère le zoom caméra
     */
    private handleZoom(deltaY: number): void {
        const camera = this.scene.cameras.main;
        if (deltaY > 0) {
            camera.zoom = Math.max(
                GameConfig.CAMERA.minZoom,
                camera.zoom - GameConfig.CAMERA.zoomSpeed
            );
        } else {
            camera.zoom = Math.min(
                GameConfig.CAMERA.maxZoom,
                camera.zoom + GameConfig.CAMERA.zoomSpeed
            );
        }
    }

    /**
     * Vérifie si l'interaction est sur l'UI (hors Canvas de jeu si superposé)
     * Note: Dans Phaser, `event.target` pointe souvent sur le Canvas. 
     * Si l'UI VueJS est au-dessus, elle intercepte généralement les événements avant le Canvas.
     * Cette méthode est un placeholder pour une logique plus complexe si nécessaire.
     */
    private isUIInteraction(pointer: Phaser.Input.Pointer): boolean {
        // Logique spécifique si besoin (ex: vérifier des zones d'exclusion)
        return false;
    }

    /**
     * Nettoyage
     */
    public destroy(): void {
        this.events.removeAllListeners();
        this.scene.input.off('pointerdown');
        this.scene.input.off('pointermove');
        this.scene.input.off('pointerup');
        this.scene.input.off('wheel');
        this.scene.input.off('gameobjectup');
    }
}
