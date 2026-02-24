import { defineStore } from 'pinia';

/**
 * Représente un objet du monde reçu depuis le serveur.
 * Correspond au format de `GameState.resources` côté backend Python.
 */
export interface ServerWorldObject {
    id: string;
    type: string;   // "obstacle" | "floor"
    asset: string;  // "tree" | "rock" | "path_stone" | etc.
    x: number;
    y: number;
}

export interface RemotePlayer {
    id: string;
    x: number;
    y: number;
}

export interface WorldState {
    worldSeed: string;
    time: number;
    isMapLoaded: boolean;
    /**
     * Liste réactive des objets reçus depuis le serveur (WORLD_STATE).
     * Utilisée par l'ObjectManager pour le rendu visuel initial.
     */
    serverObjects: ServerWorldObject[];
    /**
     * Dictionnaire réactif des autres joueurs connectés
     */
    otherPlayers: Record<string, RemotePlayer>;
}


export const useWorldStore = defineStore('world', {
    state: (): WorldState => ({
        worldSeed: '',
        time: 480, // Commence à 08:00
        isMapLoaded: false,
        serverObjects: [],
        otherPlayers: {},
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

        /**
         * Reçoit et stocke l'état initial du monde envoyé par le serveur (WORLD_STATE).
         * Le payload est { resources: ServerWorldObject[] }.
         * Les objets sont stockés dans `serverObjects` pour être consommés par l'ObjectManager.
         */
        loadWorldState(payload: { resources?: ServerWorldObject[] }) {
            if (payload?.resources && Array.isArray(payload.resources)) {
                this.serverObjects = payload.resources;
                console.log(`[WorldStore] ${this.serverObjects.length} objet(s) du monde chargés depuis le serveur.`);
            } else {
                console.warn('[WorldStore] WORLD_STATE reçu mais payload.resources absent ou invalide.', payload);
            }
        },

        /**
         * Ajoute un objet au monde (reçu via RESOURCE_PLACED).
         */
        addServerObject(obj: ServerWorldObject) {
            // Évite les doublons sur le même id
            const exists = this.serverObjects.some(o => o.id === obj.id);
            if (!exists) {
                this.serverObjects.push(obj);
            }
        },

        /**
         * Supprime un objet du monde (reçu via RESOURCE_REMOVED).
         */
        removeServerObject(id: string) {
            this.serverObjects = this.serverObjects.filter(o => o.id !== id);
        },

        // --- MULTIJOUEUR ---

        setOtherPlayers(players: any[]) {
            this.otherPlayers = {};
            players.forEach(p => {
                const pId = typeof p === 'string' ? p : p.id;
                const pX = typeof p === 'string' ? 10 : (p.x !== undefined ? p.x : 10);
                const pY = typeof p === 'string' ? 10 : (p.y !== undefined ? p.y : 10);
                this.otherPlayers[pId] = { id: pId, x: pX, y: pY };
            });
        },

        addOtherPlayer(id: string, x: number, y: number) {
            this.otherPlayers[id] = { id, x, y };
        },

        removeOtherPlayer(id: string) {
            delete this.otherPlayers[id];
        },

        moveOtherPlayer(id: string, x: number, y: number) {
            if (this.otherPlayers[id]) {
                this.otherPlayers[id].x = x;
                this.otherPlayers[id].y = y;
            } else {
                this.addOtherPlayer(id, x, y);
            }
        }
    }
});
