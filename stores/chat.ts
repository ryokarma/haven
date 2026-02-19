import { defineStore } from 'pinia';
import { useNetworkStore } from './network';

export interface ChatMessage {
    id: string;
    sender: string;
    text: string;
    timestamp: number;
    isSystem?: boolean;
}

export const useChatStore = defineStore('chat', {
    state: () => ({
        messages: [] as ChatMessage[],
    }),
    actions: {
        addMessage(msg: ChatMessage) {
            this.messages.push(msg);
            // Garder l'historique propre (50 derniers messages)
            if (this.messages.length > 50) {
                this.messages.shift();
            }
        },
        sendMessage(text: string) {
            const network = useNetworkStore();
            // On envoie juste le texte, le serveur s'occupe du reste (ID, timestamp)
            network.send('PLAYER_CHAT', { text });
        }
    }
});
