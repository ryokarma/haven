import { defineStore } from 'pinia';

export interface WorldState {
    worldSeed: string;
    time: number;
    isMapLoaded: boolean;
}


export const useWorldStore = defineStore('world', {
    state: (): WorldState => ({
        worldSeed: '',
        time: 480, // Commence à 08:00
        isMapLoaded: false
    }),
    getters: {
        hours: (state) => Math.floor(state.time / 60),
        minutes: (state) => Math.floor(state.time % 60),
        formattedTime(): string {
            const h = this.hours.toString().padStart(2, '0');
            const m = this.minutes.toString().padStart(2, '0');
            return `${h}:${m}`;
        },
        isNight: (state) => {
            const h = Math.floor(state.time / 60);
            return h < 6 || h >= 20;
        }
    },
    actions: {
        tickTime(amount: number) {
            this.time += amount;
            if (this.time >= 1440) {
                this.time = this.time % 1440;
            }
        },

        setMapLoaded(loaded: boolean) {
            this.isMapLoaded = loaded;
        },

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
        },

        loadWorldState(payload: any) {
            // Pour l'instant on stocke juste l'info si besoin, mais c'est le MapManager qui fera le rendu.
            // On pourrait stocker les ressources ici si on voulait une source de vérité côté client.
            console.log('[WorldStore] État du monde reçu du serveur', payload);
        }
    }
});
