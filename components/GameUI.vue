<template>
  <div class="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
    
    <div class="self-end bg-slate-900/80 backdrop-blur text-slate-200 p-3 rounded-lg border border-slate-700 shadow-xl flex flex-col items-end gap-1">
      <div class="font-bold text-amber-400 text-lg">{{ player.username }}</div>
      <div class="text-xs text-slate-400">Niveau {{ player.level }}</div>
      <div class="text-xs font-mono bg-slate-800 px-2 py-1 rounded mt-1">
        X: {{ player.position.x }} / Y: {{ player.position.y }}
      </div>
      <button @click="isInventoryOpen = !isInventoryOpen" class="mt-2 pointer-events-auto bg-slate-700 hover:bg-slate-600 text-white p-2 rounded transition-colors flex items-center gap-2">
        <span>🎒</span> <span class="text-sm font-bold">Sac ({{ player.inventory.length }})</span>
      </button>
    </div>

    <div v-if="isInventoryOpen" class="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-auto z-50">
      <div class="bg-slate-800 border-2 border-slate-600 rounded-xl p-6 w-96 shadow-2xl relative">
        <button @click="isInventoryOpen = false" class="absolute top-2 right-2 text-slate-400 hover:text-white">✕</button>
        <h2 class="text-xl font-bold text-amber-400 mb-4 border-b border-slate-600 pb-2">Inventaire</h2>
        
        <div v-if="player.inventory.length === 0" class="text-slate-500 text-center italic py-8">
          Votre sac est vide.
        </div>
        
        <div v-else class="grid grid-cols-4 gap-2">
          <div v-for="(item, idx) in player.inventory" :key="idx" 
               class="bg-slate-700 aspect-square rounded border border-slate-600 flex flex-col items-center justify-center text-xs text-slate-200 hover:bg-slate-600 cursor-pointer group"
               title="Cliquer pour utiliser (WIP)">
             <span class="text-xl mb-1">{{ getItemIcon(item) }}</span>
             <span class="scale-75">{{ item }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="w-96 flex flex-col gap-2">
      <div class="bg-slate-900/80 backdrop-blur-sm p-4 rounded-lg border border-slate-700 h-48 overflow-y-auto pointer-events-auto shadow-xl">
        <ul class="flex flex-col gap-1">
          <li v-for="(msg, index) in messages" :key="index" class="text-sm">
            <span class="font-bold text-amber-400">{{ msg.author }}:</span>
            <span class="text-slate-200 ml-2">{{ msg.text }}</span>
          </li>
        </ul>
      </div>
      <form @submit.prevent="sendMessage" class="flex gap-2 pointer-events-auto">
        <input v-model="newMessage" type="text" placeholder="Entrée pour discuter..." class="flex-1 bg-slate-800 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-amber-400" />
        <button type="submit" class="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-bold">Envoyer</button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { usePlayerStore } from '@/stores/player';

const player = usePlayerStore();
const isInventoryOpen = ref(false);

interface Message { author: string; text: string; }
const messages = ref<Message[]>([{ author: 'Système', text: 'Cliquez sur un arbre ou un rocher pour récolter !' }]);
const newMessage = ref('');

const sendMessage = () => {
  if (!newMessage.value.trim()) return;
  messages.value.push({ author: player.username, text: newMessage.value });
  newMessage.value = '';
};

// Petite fonction pour donner une icône selon le nom de l'item
const getItemIcon = (name: string) => {
  if (name === 'Bois') return '🪵';
  if (name === 'Pierre') return '🪨';
  return '❓';
};
</script>