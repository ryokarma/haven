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
    playerStore.setPlacementMode(false); // Disable game actions/camera movement? 
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
  <div class="pointer-events-auto absolute bottom-4 left-4 z-50 flex flex-col gap-2 w-80 max-h-[400px]">
    <!-- Messages List -->
    <div 
        ref="messagesContainer"
        class="flex flex-col gap-1 overflow-y-auto max-h-64 p-2 rounded-lg bg-black/40 backdrop-blur-sm transition-all hover:bg-black/60 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
        :class="{ 'opacity-60 hover:opacity-100': !isFocused, 'opacity-100': isFocused }"
    >
        <div v-for="(msg, idx) in chatStore.messages" :key="idx" class="text-xs shadow-black drop-shadow-md break-words animate-slide-in">
            <span class="text-slate-400 font-mono text-[10px] mr-1">[{{ formatTime(msg.timestamp) }}]</span>
            <span class="font-bold text-amber-400" :title="msg.sender">{{ msg.sender.slice(0, 5) }}:</span>
            <span class="text-white ml-1">{{ msg.text }}</span>
        </div>
    </div>

    <!-- Input -->
    <input 
        ref="inputRef"
        v-model="inputMessage"
        @keydown.enter="sendMessage"
        @focus="onFocus"
        @blur="onBlur"
        @keydown.stop 
        type="text" 
        placeholder="Entrée pour discuter..."
        class="w-full bg-black/60 text-white border border-white/20 rounded px-3 py-2 text-xs outline-none focus:border-amber-400 backdrop-blur-md transition-colors focus:bg-black/80 placeholder-white/30"
    />
  </div>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar { width: 4px; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
.animate-slide-in { animation: slideIn 0.2s ease-out; }
@keyframes slideIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>
