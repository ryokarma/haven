import { defineStore } from 'pinia';
import { GameConfig } from '@/game/config/GameConfig';

// Interface pour un objet groupé
export interface InventoryItem {
    name: string;
    count: number;
}

export interface PlayerState {
    username: string;
    color: number;
    position: { x: number; y: number };
    level: number;
    xp: number;
    inventory: InventoryItem[];
    stats: {
        energy: number;
        maxEnergy: number;
        hunger: number;
        maxHunger: number;
    };
}

export const usePlayerStore = defineStore('player', {
    state: (): PlayerState => ({
        username: 'Voyageur',
        color: 0xe11d48, // Rose/Rouge par défaut
        position: { x: 0, y: 0 },
        level: 1,
        xp: 0,
        inventory: [],
        // Système de survie
        stats: {
            energy: 100,
            maxEnergy: 100,
            hunger: 100,
            maxHunger: 100
        }
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
        },

        // Dégrade les stats au fil du temps
        tickStats() {
            // Diminue la faim de 1 point
            this.stats.hunger = Math.max(0, this.stats.hunger - 1);

            // Diminue l'énergie de 0.5 point (moins rapide que la faim)
            this.stats.energy = Math.max(0, this.stats.energy - 0.5);

            // LOG SPAM REDUCTION: Commented out for production readiness
            // console.log(`[Store] Stats dégradées - Faim: ${this.stats.hunger}, Énergie: ${this.stats.energy}`);
        },

        // Consomme un item pour restaurer des stats
        consumeItem(itemName: string) {
            const item = this.inventory.find(i => i.name === itemName);

            if (!item || item.count === 0) {
                console.warn(`[Store] Impossible de consommer ${itemName} - Item introuvable ou quantité nulle`);
                return;
            }

            const effect = GameConfig.ITEM_EFFECTS[itemName];

            if (effect) {
                if (effect.hunger) {
                    this.stats.hunger = Math.min(this.stats.maxHunger, this.stats.hunger + effect.hunger);
                }
                if (effect.energy) {
                    this.stats.energy = Math.min(this.stats.maxEnergy, this.stats.energy + effect.energy);
                }

                // Retire l'item de l'inventaire
                item.count--;
                if (item.count === 0) {
                    this.inventory = this.inventory.filter(i => i.name !== itemName);
                }

                console.log(`[Store] ${itemName} consommé ! Faim: ${this.stats.hunger}, Énergie: ${this.stats.energy}`);
            } else {
                console.warn(`[Store] ${itemName} n'a pas d'effet défini`);
            }
        }
    }
});
