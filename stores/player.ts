import { defineStore } from 'pinia';

export const usePlayerStore = defineStore('player', {
    state: () => ({
        username: 'Voyageur',
        color: 0xe11d48,
        position: { x: 0, y: 0 },
        level: 1,
        xp: 0,
        // Inventaire simple : liste de chaînes de caractères
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
            console.log(`[Store] Ajout de ${item} à l'inventaire. Total: ${this.inventory.length}`);
        }
    }
});