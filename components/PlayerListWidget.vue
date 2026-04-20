<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWorldStore } from '@/stores/world';
import { usePlayerStore } from '@/stores/player';

const worldStore = useWorldStore();
const playerStore = usePlayerStore();

const isOpen = ref(false);

const onlineCount = computed(() => {
    return Object.keys(worldStore.otherPlayers).length + 1; // 1 for local player
});
</script>

<template>
  <div class="pointer-events-auto absolute top-4 right-4 z-40 hidden md:flex flex-col items-end gap-2" @click.stop @mousedown.stop @touchstart.stop @pointerdown.stop @wheel.stop>
    
    <!-- Toggle Button -->
    <button 
        @click="isOpen = !isOpen"
        class="flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-amber-100 p-2 md:px-3 md:py-1.5 rounded-lg shadow-lg backdrop-blur-sm transition-all shadow-black/50"
    >
        <span class="text-sm md:text-base">👥</span>
        <span class="font-bold text-sm hidden md:inline">{{ onlineCount }} en ligne</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hidden md:block transition-transform duration-200" :class="{ 'rotate-180': isOpen }"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </button>

    <!-- Dropdown List -->
    <div v-show="isOpen" class="w-56 bg-slate-900/90 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden animate-fade-in-down origin-top-right">
        <div class="p-2 border-b border-white/5 bg-black/20">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Joueurs Connectés</h3>
        </div>
        
        <div class="max-h-64 overflow-y-auto p-2 flex flex-col gap-1 custom-scrollbar">
            <!-- P1 (Local Player) -->
            <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div class="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]"></div>
                <span class="text-sm font-bold text-amber-100 truncate flex-1">{{ playerStore.username }}</span>
                <span class="text-[10px] text-amber-400/80 font-bold uppercase tracking-wide">Vous</span>
            </div>
            
            <!-- Other Players -->
            <div 
                v-for="player in worldStore.otherPlayers" 
                :key="player.id"
                class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
                <div class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                <span class="text-sm font-medium text-slate-200 truncate flex-1">{{ player.username || `Joueur ${player.id.substring(0, 4)}` }}</span>
            </div>
        </div>
    </div>

  </div>
</template>

<style scoped>
.animate-fade-in-down {
    animation: fadeInDown 0.2s ease-out forwards;
}

@keyframes fadeInDown {
    from {
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
</style>
