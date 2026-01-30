import { defineStore } from 'pinia';

export interface WorldState {
    worldSeed: string;
}

export const useWorldStore = defineStore('world', {
    state: (): WorldState => ({
        worldSeed: ''
    }),
    actions: {
        /**
         * Initialise la seed du monde.
         * Récupère depuis le localStorage si existant, sinon génère une nouvelle seed.
         */
        initSeed() {
            const storedSeed = localStorage.getItem('haven_world_seed');

            if (storedSeed) {
                this.worldSeed = storedSeed;
                console.log(`[WorldStore] Seed chargée depuis le stockage: ${this.worldSeed}`);
            } else {
                // Génère une string aléatoire (base 36 pour être compact)
                this.worldSeed = Math.random().toString(36).substring(2, 12).toUpperCase();
                localStorage.setItem('haven_world_seed', this.worldSeed);
                console.log(`[WorldStore] Nouvelle seed générée: ${this.worldSeed}`);
            }
        },

        /**
         * Force une nouvelle seed (pour debug ou reset)
         */
        regenerateSeed() {
            this.worldSeed = Math.random().toString(36).substring(2, 12).toUpperCase();
            localStorage.setItem('haven_world_seed', this.worldSeed);
            console.log(`[WorldStore] Seed régénérée: ${this.worldSeed}`);
        }
    }
});
