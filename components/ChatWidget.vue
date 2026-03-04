<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useChatStore } from '@/stores/chat';
import { usePlayerStore } from '@/stores/player';

const chatStore = useChatStore();
const playerStore = usePlayerStore();
const inputMessage = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const isFocused = ref(false);

const sendMessage = () => {
    if (!inputMessage.value.trim()) return;
    chatStore.sendMessage(inputMessage.value);
    inputMessage.value = '';
};

const onFocus = () => {
    isFocused.value = true;
    playerStore.setPlacementMode(false); // Désactive les actions de jeu
};

const onBlur = () => {
    isFocused.value = false;
};

// Scroll to bottom on new message
watch(() => chatStore.messages.length, () => {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
    });
});

// Global shortcut to focus chat
const handleGlobalKeydown = (e: KeyboardEvent) => {
    // Si la touche Entrée est pressée et qu'on n'est pas déjà dans l'input, on le focus
    // Pas besoin d'empêcher le comportement par défaut de l'Entrée ici sauf si Phaser l'utilise
    if (e.key === 'Enter' && !isFocused.value) {
        e.preventDefault();
        inputRef.value?.focus();
    }
};

onMounted(() => window.addEventListener('keydown', handleGlobalKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleGlobalKeydown));

// Helper for formatting time (HH:MM)
const formatTime = (ts: number | undefined) => {
    if (!ts) return "--:--";
    return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
</script>

<template>
  <div class="pointer-events-auto absolute bottom-32 left-4 z-40 flex flex-col gap-2 w-80 max-h-[400px]" @click.stop @mousedown.stop @touchstart.stop>
    <!-- Messages List -->
    <div 
        ref="messagesContainer"
        class="flex flex-col gap-1 overflow-y-auto max-h-64 p-3 rounded-lg bg-stone-900/40 backdrop-blur-sm transition-all hover:bg-stone-900/60 border border-stone-100/10 shadow-lg no-scrollbar"
        :class="{ 'opacity-60 hover:opacity-100': !isFocused, 'opacity-100': isFocused }"
    >
        <div v-for="(msg, idx) in chatStore.messages" :key="idx" class="text-sm shadow-black drop-shadow-md break-words animate-slide-in leading-tight">
            <span class="text-stone-400 font-mono text-[10px] mr-1 align-baseline">[{{ formatTime(msg.timestamp) }}]</span>
            <span class="font-bold text-amber-300 align-baseline" :title="msg.sender">{{ msg.sender.slice(0, 5) }}</span>
            <span class="text-stone-400 mx-1 align-baseline">:</span>
            <span class="text-stone-100 align-baseline font-medium">{{ msg.text }}</span>
        </div>
    </div>

    <!-- Input -->
    <!-- On stop la propagation du clavier pour ne pas déclencher les raccourcis Phaser -->
    <input 
        ref="inputRef"
        v-model="inputMessage"
        @keydown.enter="sendMessage"
        @focus="onFocus"
        @blur="onBlur"
        @keydown.stop
        @keyup.stop
        @keypress.stop
        type="text" 
        placeholder="Appuyez sur Entrée pour discuter..."
        class="w-full bg-stone-900/50 text-stone-100 border border-stone-100/10 rounded px-3 py-2 text-sm outline-none focus:border-amber-400/50 backdrop-blur-md transition-all focus:bg-stone-900/80 placeholder-stone-400/60 shadow-lg"
    />
  </div>
</template>

<style scoped>
/* Scrollbar invisible */
.no-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
}
.no-scrollbar::-webkit-scrollbar {
    display: none; /* Chrome, Safari and Opera */
}
.animate-slide-in { animation: slideIn 0.2s ease-out; }
@keyframes slideIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>
