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
        health: number;
        maxHealth: number;
        energy: number;
        maxEnergy: number;
        hunger: number;
        maxHunger: number;
        thirst: number;
        maxThirst: number;
    };
    lastActionFeedback: string;
    recipes: Recipe[];
    placementMode: boolean;
    placingItemName: string | null;
}

export interface Recipe {
    id: string;
    name: string;
    inputs: Record<string, number>;
    output: { name: string; count: number };
}

export const usePlayerStore = defineStore('player', {
    state: (): PlayerState => ({
        username: 'Voyageur',
        color: 0xe11d48, // Rose/Rouge par défaut
        position: { x: 0, y: 0 },
        level: 1,
        xp: 0,
        inventory: [],
        // Système de survie complet
        stats: {
            health: 100,
            maxHealth: 100,
            energy: 100,
            maxEnergy: 100,
            hunger: 100,
            maxHunger: 100, // 100 = Rassasié, 0 = Affamé
            thirst: 100,
            maxThirst: 100  // 100 = Hydraté, 0 = Assoiffé
        },
        lastActionFeedback: '',
        recipes: [
            {
                id: 'campfire',
                name: 'Feu de Camp',
                inputs: { 'Bois': 5, 'Pierre': 5 },
                output: { name: 'Kit de Feu de Camp', count: 1 }
            }
        ],
        placementMode: false,
        placingItemName: null
    }),
    actions: {
        setPlacementMode(active: boolean, itemName: string | null = null) {
            this.placementMode = active;
            this.placingItemName = itemName;
            if (active && itemName) {
                this.lastActionFeedback = `Mode placement : ${itemName}#${Date.now()}`;
            }
        },

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
        addItem(itemName: string, count: number = 1) {
            if (count <= 0) return;
            const existingItem = this.inventory.find(i => i.name === itemName);

            if (existingItem) {
                existingItem.count += count;
            } else {
                this.inventory.push({ name: itemName, count: count });
            }
        },

        // Helpers pour modifier les stats de manière sécurisée
        updateStats(changes: Partial<PlayerState['stats']>) {
            if (changes.health !== undefined) this.stats.health = Math.max(0, Math.min(this.stats.maxHealth, changes.health));
            if (changes.energy !== undefined) this.stats.energy = Math.max(0, Math.min(this.stats.maxEnergy, changes.energy));
            if (changes.hunger !== undefined) this.stats.hunger = Math.max(0, Math.min(this.stats.maxHunger, changes.hunger));
            if (changes.thirst !== undefined) this.stats.thirst = Math.max(0, Math.min(this.stats.maxThirst, changes.thirst));
        },

        // Dégrade les stats au fil du temps (Appelé chaque seconde)
        tickVitality(isMoving: boolean) {
            // Règle 4 (Métabolisme de base) : Faim et Soif baissent constamment
            const metabolismRate = 0.05;
            let currentHunger = this.stats.hunger - metabolismRate;
            let currentThirst = this.stats.thirst - metabolismRate;

            // Règle 1 (Fatigue naturelle)
            let currentEnergy = this.stats.energy - 0.1;

            // Règle 2 & 3 (Repos et Condition de repos)
            if (!isMoving) {
                // Le joueur récupère seulement s'il n'est pas affamé ni assoiffé (> 20)
                if (this.stats.hunger > 20 && this.stats.thirst > 20) {
                    currentEnergy += 1; // Bonus de régénération
                }
            }

            // Application des changements via updateStats pour le clamping
            this.updateStats({
                hunger: currentHunger,
                thirst: currentThirst,
                energy: currentEnergy
            });

            // Gestion des dégâts critiques (Faim/Soif à 0)
            if (this.stats.hunger <= 0 || this.stats.thirst <= 0) {
                this.updateStats({ health: this.stats.health - 2 });
                if (this.stats.health <= 0) {
                    console.warn("Joueur mort de faim ou de soif !");
                }
            }
            // Régénération de vie (Si tout va bien)
            else if (this.stats.health < this.stats.maxHealth && this.stats.hunger > 80 && this.stats.thirst > 80) {
                this.updateStats({ health: this.stats.health + 1 });
            }
        },

        // Helper pour retirer un item (utilisé pour craft et consommation)
        removeItem(itemName: string, count: number = 1) {
            const item = this.inventory.find(i => i.name === itemName);
            if (item) {
                item.count -= count;
                if (item.count <= 0) {
                    this.inventory = this.inventory.filter(i => i.name !== itemName);
                }
            }
        },

        // Action de Crafting
        craftItem(recipeId: string): boolean {
            const recipe = this.recipes.find(r => r.id === recipeId);
            if (!recipe) {
                console.error(`[Store] Recette ${recipeId} introuvable`);
                return false;
            }

            // 1. Vérification des ressources
            for (const [ingredientName, requiredCount] of Object.entries(recipe.inputs)) {
                const item = this.inventory.find(i => i.name === ingredientName);
                if (!item || item.count < requiredCount) {
                    return false;
                }
            }

            // 2. Consommation des ressources
            for (const [ingredientName, requiredCount] of Object.entries(recipe.inputs)) {
                this.removeItem(ingredientName, requiredCount);
            }

            // 3. Ajout de l'item produit
            this.addItem(recipe.output.name, recipe.output.count);

            // Feedback
            this.lastActionFeedback = `Fabriqué : ${recipe.output.name} !#${Date.now()}`;
            return true;
        },

        // Consomme de l'énergie (action immédiate)
        consumeEnergy(amount: number) {
            this.updateStats({ energy: this.stats.energy - amount });
        },

        // Consomme un item pour restaurer des stats
        consumeItem(itemName: string) {
            const item = this.inventory.find(i => i.name === itemName);

            if (!item || item.count === 0) {
                console.warn(`[Store] Impossible de consommer ${itemName} - Item introuvable ou quantité nulle`);
                return;
            }

            // Cas Spécial : Items à placer (Construction)
            if (itemName === 'Kit de Feu de Camp') {
                this.setPlacementMode(true, itemName);
                return;
            }

            const effect = GameConfig.ITEM_EFFECTS[itemName];

            if (effect) {
                // Vérifier si la consommation est utile (pas de gaspillage)
                let isUseful = false;

                if (effect.hunger && this.stats.hunger < this.stats.maxHunger) isUseful = true;
                if (effect.thirst && this.stats.thirst < this.stats.maxThirst) isUseful = true;
                if (effect.energy && this.stats.energy < this.stats.maxEnergy) isUseful = true;
                if (effect.health && this.stats.health < this.stats.maxHealth) isUseful = true;

                if (!isUseful) {
                    // Feedback UI
                    this.lastActionFeedback = `Pas nécessaire...#${Date.now()}`;
                    return;
                }

                const changes: Partial<PlayerState['stats']> = {};
                if (effect.hunger) changes.hunger = this.stats.hunger + effect.hunger;
                if (effect.energy) changes.energy = this.stats.energy + effect.energy;
                if (effect.thirst) changes.thirst = this.stats.thirst + effect.thirst;
                if (effect.health) changes.health = this.stats.health + effect.health;

                this.updateStats(changes);

                // Construction du message de feedback
                const feedbackParts = [];
                if (effect.hunger) feedbackParts.push(`+${effect.hunger} Faim`);
                if (effect.thirst) feedbackParts.push(`+${effect.thirst} Soif`);
                if (effect.energy) feedbackParts.push(`+${effect.energy} Énergie`);
                if (effect.health) feedbackParts.push(`+${effect.health} Santé`);

                // Mettre à jour le feedback pour l'UI / Phaser
                // On ajoute un timestamp pour forcer le watcher à réagir même si le message est identique
                this.lastActionFeedback = `${feedbackParts.join(' | ')}#${Date.now()}`;

                // Retire l'item de l'inventaire
                this.removeItem(itemName, 1);
            } else {
                console.warn(`[Store] ${itemName} n'a pas d'effet défini`);
            }
        }
    }
});
