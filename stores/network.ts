import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { usePlayerStore } from './player';
import { useChatStore } from './chat';

/**
 * Network Store — Gère la connexion WebSocket et le dispatch des messages
 * 
 * PROTOCOLE :
 * - Client → Serveur : { type: string, payload: { ... } }
 * - Serveur → Client : { type: string, ...data }
 * 
 * MESSAGES REÇUS :
 * - CURRENT_PLAYERS, PLAYER_JOINED, PLAYER_LEFT
 * - PLAYER_MOVED
 * - PLAYER_SYNC, WORLD_STATE
 * - WALLET_UPDATE
 * - RESOURCE_PLACED, RESOURCE_REMOVED
 * - CHAT_MESSAGE
 * - ERROR
 */
export const useNetworkStore = defineStore('network', () => {
    // --- State ---
    const isConnected = ref(false);
    const socket = shallowRef<WebSocket | null>(null);
    const error = ref<string | null>(null);
    const lastPing = ref(0);

    // Callbacks pour la gestion des messages
    const onMessageCallbacks = ref<Array<(msg: any) => void>>([]);

    // --- Listeners ---

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

            // ── Session 9.8 : Log des messages reçus pour le debug ──
            if (parsed.type === 'ERROR') {
                console.warn(`[Network] ← ERROR du serveur: ${parsed.message}`);
            }

            // Dispatch aux listeners enregistrés
            onMessageCallbacks.value.forEach(cb => cb(parsed));
        } catch (e) {
            console.warn('[Network] Message non-JSON reçu (ping?):', data?.substring?.(0, 50));
        }
    }

    // --- Connexion ---

    function cleanup() {
        isConnected.value = false;
        if (socket.value) {
            socket.value.onopen = null;
            socket.value.onmessage = null;
            socket.value.onclose = null;
            socket.value.onerror = null;
            socket.value.close();
            socket.value = null;
        }
    }

    function connect(playerId: string) {
        if (socket.value) {
            console.warn('[Network] Déjà connecté ou connexion en cours.');
            return;
        }

        const url = `ws://localhost:8000/ws/${playerId}`;
        console.log(`[Network] Connexion à ${url}...`);

        try {
            const ws = new WebSocket(url);

            ws.onopen = () => {
                console.log('[Network] Connecté !');
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
                setTimeout(() => {
                    console.log('[Network] Tentative de reconnexion...');
                    connect(playerId);
                }, 3000);
            };

            ws.onerror = (err) => {
                console.error('[Network] Erreur WebSocket:', err);
            };

            socket.value = ws;

        } catch (e) {
            console.error('[Network] Exception:', e);
            error.value = "Erreur de création WebSocket";
            cleanup();
        }
    }

    function disconnect() {
        cleanup();
    }

    // --- Envoi ---

    /**
     * Envoie un message au serveur.
     * Format : { type, payload }
     */
    function send(type: string, payload: any = {}) {
        if (!socket.value || !isConnected.value) {
            console.warn('[Network] Non connecté, message ignoré:', type);
            return;
        }
        socket.value.send(JSON.stringify({ type, payload }));
    }

    function sendMove(x: number, y: number) {
        send('PLAYER_MOVE', { x, y });
    }

    function sendInteract(x: number, y: number) {
        send('PLAYER_INTERACT', { x, y });
    }

    function sendBuild(x: number, y: number, itemId: string) {
        send('PLAYER_BUILD', { x, y, itemId });
    }

    function sendHarvest(resource_id: string, equipped_tool: string = 'none') {
        console.log(`[Network] → ACTION_HARVEST: resource_id=${resource_id}, tool=${equipped_tool}`);
        send('ACTION_HARVEST', { resource_id, tool: equipped_tool });
    }

    function sendCraft(recipeId: string) {
        console.log(`[Network] → ACTION_CRAFT: recipeId=${recipeId}`);
        send('ACTION_CRAFT', { recipeId });
    }

    function sendPlace(x: number, y: number, item_id: string) {
        console.log(`[Network] → ACTION_PLACE: itemId=${item_id} at (${x},${y})`);
        send('ACTION_PLACE', { x, y, itemId: item_id });
    }

    // --- Listeners Auto ---

    function listenForEconomy() {
        const playerStore = usePlayerStore();
        onMessage((msg: any) => {
            if (msg.type === 'WALLET_UPDATE') {
                playerStore.updateEconomyInventory(msg.payload);
            } else if (msg.type === 'PLAYER_SYNC') {
                if (msg.payload?.wallet) {
                    playerStore.updateEconomyInventory(msg.payload.wallet);
                }
            } else if (msg.type === 'CRAFT_SUCCESS') {
                playerStore.addItem(msg.payload.item, msg.payload.count);
                playerStore.lastActionFeedback = `Fabriqué : ${msg.payload.item} !#${Date.now()}`;
            } else if (msg.type === 'PLACE_SUCCESS') {
                if (msg.payload && msg.payload.itemId) {
                    playerStore.removeItem(msg.payload.itemId, 1);
                    playerStore.lastActionFeedback = "Objet placé !#" + Date.now();
                }
            }
        });
    }

    function listenForChatMessages() {
        const chatStore = useChatStore();
        onMessage((msg: any) => {
            if (msg.type === 'CHAT_MESSAGE') {
                chatStore.addMessage(msg);
            }
        });
    }

    function listenForErrors() {
        onMessage((msg: any) => {
            if (msg.type === 'ERROR') {
                console.warn('[Server Error]', msg.message);
                error.value = msg.message || 'Erreur serveur';
                // Auto-clear après 3s
                setTimeout(() => {
                    error.value = null;
                }, 3000);
            }
        });
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
        sendBuild,
        sendHarvest,
        sendCraft,
        sendPlace,
        listenForEconomy,
        listenForChatMessages,
        listenForErrors,
        onMessage
    };
});
