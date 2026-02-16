import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';

export const useNetworkStore = defineStore('network', () => {
    // --- State ---
    const isConnected = ref(false);
    // Utilisation de shallowRef pour le WebSocket car c'est un objet complexe non-reactif
    const socket = shallowRef<WebSocket | null>(null);
    const error = ref<string | null>(null);
    const lastPing = ref(0);

    // Liste des callbacks pour la gestion des messages
    const onMessageCallbacks = ref<Array<(msg: any) => void>>([]);

    // --- Actions ---

    /**
     * Enregistre un callback pour traiter les messages reçus
     */
    function onMessage(callback: (msg: any) => void) {
        onMessageCallbacks.value.push(callback);
    }

    /**
     * Traite un message entrant
     */
    function handleMessage(data: string) {
        try {
            const parsed = JSON.parse(data);
            lastPing.value = Date.now();

            // Dispatch aux listeners enregistrés
            onMessageCallbacks.value.forEach(cb => cb(parsed));
        } catch (e) {
            // Ignore les erreurs de parsing (ex: ping simple string)
            // console.error('[Network] Erreur de parsing message:', e);
        }
    }

    /**
     * Nettoie la connexion
     */
    function cleanup() {
        isConnected.value = false;
        if (socket.value) {
            // Retire les listeners pour éviter les effets de bord
            socket.value.onopen = null;
            socket.value.onmessage = null;
            socket.value.onclose = null;
            socket.value.onerror = null;

            socket.value.close();
            socket.value = null;
        }
    }

    /**
     * Connecte le joueur au WebSocket
     */
    function connect(playerId: string) {
        if (socket.value) {
            console.warn('[Network] Déjà connecté ou connexion en cours.');
            return;
        }

        const url = `ws://localhost:8000/ws/${playerId}`;
        console.log(`[Network] Tentative de connexion à ${url}...`);

        try {
            const ws = new WebSocket(url);

            ws.onopen = (event) => {
                console.log('[Network] Connecté au serveur !');
                isConnected.value = true;
                error.value = null;
                lastPing.value = Date.now();
            };

            ws.onmessage = (event) => {
                handleMessage(event.data);
            };

            ws.onclose = (event) => {
                console.log('[Network] Déconnecté.', event.reason);
                cleanup();

                // Tentative de reconnexion auto dans 3s
                // On utilise un timeout simple
                setTimeout(() => {
                    console.log('[Network] Tentative de reconnexion...');
                    connect(playerId);
                }, 3000);
            };

            ws.onerror = (err) => {
                console.error('[Network] Erreur WebSocket:', err);
                // On ne stocke pas l'objet erreur complet pour éviter les soucis de réactivité
            };

            socket.value = ws;

        } catch (e) {
            console.error('[Network] Exception lors de la création du WebSocket:', e);
            error.value = "Erreur de création WebSocket";
            cleanup();
        }
    }

    /**
     * Envoie un message générique
     */
    function send(type: string, payload: any) {
        if (!socket.value || !isConnected.value) {
            console.warn('[Network] Impossible d\'envoyer le message : non connecté.', type);
            return;
        }
        const message = JSON.stringify({ type, payload });
        socket.value.send(message);
    }

    /**
     * Envoie un mouvement joueur
     */
    function sendMove(x: number, y: number) {
        send('PLAYER_MOVE', { x, y });
    }

    /**
     * Envoie une interaction joueur
     */
    function sendInteract(x: number, y: number) {
        send('PLAYER_INTERACT', { x, y });
    }

    function listenForWalletUpdates() {
        const playerStore = usePlayerStore();
        onMessage((msg: any) => {
            if (msg.type === 'WALLET_UPDATE') {
                playerStore.updateEconomyInventory(msg.payload);
            } else if (msg.type === 'PLAYER_SYNC') {
                if (msg.payload.wallet) {
                    playerStore.updateEconomyInventory(msg.payload.wallet);
                }
            }
        });
    }

    /**
     * Déconnecte manuellement
     */
    function disconnect() {
        cleanup();
    }

    return {
        // State
        isConnected,
        socket,
        error,
        lastPing,
        onMessageCallbacks,

        // Actions
        connect,
        disconnect,
        send,
        sendMove,
        sendInteract,
        onMessage
    };
});
