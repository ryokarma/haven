<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePlayerStore } from '@/stores/player';

const player = usePlayerStore();
const isInventoryOpen = ref(false);

// --- CHAT ---
interface Message { author: string; text: string; }
const messages = ref<Message[]>([
  { author: 'Système', text: 'Bienvenue sur Haven.' },
  { author: 'Tuto', text: 'Cliquez sur un arbre ou un rocher pour récolter.' }
]);
const newMessage = ref('');

const sendMessage = () => {
  if (!newMessage.value.trim()) return;
  messages.value.push({ author: player.username, text: newMessage.value });
  newMessage.value = '';
};

// --- ICONES SVG ---
// On remplace les emojis par des SVG plus "Pro" qui s'adaptent à la couleur du texte
const icons = {
  wood: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/><path d="M12 12h9"/><path d="M12 12H3"/><path d="M12 17l5-5"/></svg>',
  stone: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l9 20H3l9-20z"/><path d="M12 10v12"/></svg>',
  bag: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'
};

const getIcon = (name: string) => {
  if (name === 'Bois') return icons.wood;
  if (name === 'Pierre') return icons.stone;
  return '📦'; 
};
</script>

<template>
  <div class="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 z-50">
    
    <div class="pointer-events-auto flex items-center gap-4 animate-fade-in">
        <div class="relative group flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white/20 bg-slate-900/60 backdrop-blur-md shadow-lg transition-transform hover:scale-105">
            <img src="/assets/hero.png" class="h-12 w-12 object-contain" alt="Avatar" />
            <div class="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-slate-900 border border-white/20 shadow-sm">
                {{ player.level }}
            </div>
        </div>

        <div class="flex flex-col gap-1">
             <div class="flex items-center gap-2">
                <span class="font-serif text-xl font-bold text-white drop-shadow-md">{{ player.username }}</span>
             </div>
             <div class="flex items-center gap-2 text-xs font-mono text-slate-300 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm border border-white/5 w-fit">
                <span>X: {{ player.position.x }}</span>
                <span class="text-white/20">|</span>
                <span>Y: {{ player.position.y }}</span>
             </div>
        </div>
    </div>

    <div v-if="isInventoryOpen" class="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all">
      <div class="relative w-96 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-white/20">
        
        <div class="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
            <h2 class="flex items-center gap-2 text-xl font-bold text-amber-100">
                <span v-html="icons.bag" class="text-amber-400"></span>
                Sac à dos
            </h2>
            <button @click="isInventoryOpen = false" class="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white transition-colors">
                ✕
            </button>
        </div>
        
        <div v-if="player.inventory.length === 0" class="flex h-32 flex-col items-center justify-center text-slate-400 italic gap-2">
            <span class="text-4xl opacity-20">🎒</span>
            Vide... Récoltez des ressources !
        </div>
        
        <div v-else class="grid grid-cols-4 gap-3">
            <div v-for="(item, idx) in player.inventory" :key="idx" 
                 class="group relative aspect-square flex flex-col items-center justify-center rounded-xl border border-white/5 bg-white/5 transition-all hover:bg-white/10 hover:border-amber-400/30 cursor-pointer">
               
               <span v-html="getIcon(item.name)" class="text-amber-200 mb-1 drop-shadow-lg"></span>
               
               <span class="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white border border-white/10 shadow-sm">
                   {{ item.count }}
               </span>
               
               <span class="text-[10px] text-slate-300 font-medium tracking-wide">{{ item.name }}</span>
            </div>
        </div>

      </div>
    </div>

    <div class="flex w-full items-end justify-between gap-4">
      
      <div class="pointer-events-auto flex w-80 flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl shadow-lg transition-colors hover:bg-slate-900/70">
        <div class="flex h-32 flex-col justify-end overflow-y-auto pr-1 text-sm scrollbar-thin">
          <div v-for="(msg, index) in messages" :key="index" class="mb-1 animate-slide-in">
            <span class="font-bold text-amber-400 drop-shadow-sm">{{ msg.author }}:</span>
            <span class="ml-2 text-slate-200 shadow-black">{{ msg.text }}</span>
          </div>
        </div>
        <form @submit.prevent="sendMessage" class="relative flex items-center">
          <input 
            v-model="newMessage" 
            type="text" 
            placeholder="Écrire..." 
            class="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-amber-400/50 focus:bg-black/40 transition-all" 
          />
        </form>
      </div>

      <div class="pointer-events-auto flex items-center gap-3">
          <button 
            @click="isInventoryOpen = !isInventoryOpen" 
            class="group flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-slate-800/80 backdrop-blur-xl text-amber-100 shadow-lg transition-all hover:-translate-y-1 hover:bg-slate-700 hover:border-amber-400/30 active:scale-95"
            title="Ouvrir l'inventaire"
          >
            <div class="relative">
                <span v-html="icons.bag"></span>
                <span v-if="player.inventory.length > 0" class="absolute -top-2 -right-3 h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
            </div>
          </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
h1 { font-family: 'Merriweather', serif; }

/* Animation subtile à l'apparition */
.animate-fade-in { animation: fadeIn 0.5s ease-out; }
.animate-slide-in { animation: slideIn 0.3s ease-out; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

/* Scrollbar fine pour le chat */
.scrollbar-thin::-webkit-scrollbar { width: 4px; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
</style>