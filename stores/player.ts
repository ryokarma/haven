// stores/player.ts
import { defineStore } from 'pinia';

export const usePlayerStore = defineStore('player', {
    state: () => ({
        // Identité
        username: 'Voyageur',
        color: 0xe11d48, // La couleur par défaut (Rose/Rouge)

        // Position actuelle (Grille)
        position: { x: 0, y: 0 },

        // Stats (prévision pour le futur RPG)
        level: 1,
        xp: 0,

        // Inventaire basique
        inventory: [] as string[],
    }),

    actions: {
        move(x: number, y: number) {
            this.position = { x, y };
        },

        levelUp() {
            this.level++;
        },

        changeColor(newColor: number) {
            this.color = newColor;
        },

        addItem(item: string) {
            this.inventory.push(item);
        }
    }
});