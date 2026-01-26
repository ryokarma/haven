import { defineStore } from 'pinia';

// Interface pour un objet groupé
export interface InventoryItem {
    name: string;
    count: number;
}

export const usePlayerStore = defineStore('player', {
    state: () => ({
        username: 'Voyageur',
        color: 0xe11d48, // Rose/Rouge par défaut
        position: { x: 0, y: 0 },
        level: 1,
        xp: 0,
        // On passe d'une liste de strings à une liste d'objets {name, count}
        inventory: [] as InventoryItem[],
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
        // Cette action reste compatible avec MainScene qui envoie juste "Bois" ou "Pierre"
        addItem(itemName: string) {
            const existingItem = this.inventory.find(i => i.name === itemName);

            if (existingItem) {
                existingItem.count++;
            } else {
                this.inventory.push({ name: itemName, count: 1 });
            }
            console.log(`[Store] Ajout de ${itemName}. Inventaire:`, this.inventory);
        }
    }
});