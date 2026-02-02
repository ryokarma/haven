import Phaser from 'phaser';
import { usePlayerStore } from '@/stores/player';
import { useWorldStore } from '@/stores/world';
import { ObjectManager } from './ObjectManager';

// Définition de l'état du jeu pour la sauvegarde
export interface GameState {
    player: {
        stats: any;
        inventory: any;
        position: { x: number; y: number };
        xp: number;
        level: number;
        color: number; // Sauvegarde de la couleur/teinte
    };
    world: {
        time: number;
        seed: string;
    };
    map: {
        removedObjectIds: string[];
        placedObjects: { type: string; x: number; y: number; id: string }[];
    }
}

/**
 * Gestionnaire de sauvegarde
 * Gère la sérialisation et la persistance des données du jeu
 */
export class SaveManager {
    private scene: Phaser.Scene;
    private objectManager: ObjectManager;
    private playerStore: ReturnType<typeof usePlayerStore>;
    private worldStore: ReturnType<typeof useWorldStore>;
    private autoSaveInterval: number | null = null;

    constructor(scene: Phaser.Scene, objectManager: ObjectManager) {
        this.scene = scene;
        this.objectManager = objectManager;
        this.playerStore = usePlayerStore();
        this.worldStore = useWorldStore();
    }

    /**
     * Sauvegarde le jeu
     */
    saveGame(): void {
        const gameState: GameState = {
            player: {
                stats: this.playerStore.stats,
                inventory: this.playerStore.inventory,
                position: this.playerStore.position,
                xp: this.playerStore.xp,
                level: this.playerStore.level,
                color: this.playerStore.color
            },
            world: {
                time: this.worldStore.time,
                seed: this.worldStore.worldSeed
            },
            map: {
                removedObjectIds: this.objectManager.removedObjectIds,
                placedObjects: this.objectManager.placedObjects
            }
        };

        try {
            const json = JSON.stringify(gameState);
            localStorage.setItem('haven_save', json);
            console.log("Game Saved Successfully");

            // Feedback visuel optionnel via Scene ou Store
            // this.playerStore.lastActionFeedback = "Jeu sauvegardé.#" + Date.now(); 
        } catch (e) {
            console.error("Failed to save game:", e);
        }
    }

    /**
     * Tente de charger une sauvegarde
     * @returns GameState si une sauvegarde existe, sinon null
     */
    loadGame(): GameState | null {
        try {
            const json = localStorage.getItem('haven_save');
            if (json) {
                const state = JSON.parse(json) as GameState;
                console.log("Game Save Found");
                return state;
            }
        } catch (e) {
            console.error("Failed to load game:", e);
        }
        return null;
    }

    /**
     * Active la sauvegarde automatique
     * @param intervalSeconds Intervalle en secondes (défaut 30s)
     */
    startAutoSave(intervalSeconds: number = 30): void {
        this.stopAutoSave();
        this.autoSaveInterval = window.setInterval(() => {
            this.saveGame();
        }, intervalSeconds * 1000);
        console.log(`Auto-save started (${intervalSeconds}s)`);
    }

    /**
     * Arrête la sauvegarde automatique
     */
    stopAutoSave(): void {
        if (this.autoSaveInterval !== null) {
            window.clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }
}
