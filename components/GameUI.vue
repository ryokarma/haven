<template>
  <div class="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
    
    <div class="self-end bg-slate-900/80 backdrop-blur text-slate-200 p-3 rounded-lg border border-slate-700 shadow-xl flex flex-col items-end gap-1">
      <div class="font-bold text-amber-400 text-lg">{{ player.username }}</div>
      <div class="text-xs text-slate-400">Niveau {{ player.level }}</div>
      <div class="text-xs font-mono bg-slate-800 px-2 py-1 rounded mt-1">
        X: {{ player.position.x }} / Y: {{ player.position.y }}
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
        <input v-model="newMessage" type="text" placeholder="Dire quelque chose..." class="flex-1 bg-slate-800 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-amber-400" />
        <button type="submit" class="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-bold">Envoyer</button>
      </form>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
// On importe le store
import { usePlayerStore } from '@/stores/player';

const player = usePlayerStore(); // C'est tout ce qu'il faut ! C'est réactif.

interface Message { author: string; text: string; }
const messages = ref<Message[]>([{ author: 'Système', text: 'Bienvenue dans Haven.' }]);
const newMessage = ref('');

const sendMessage = () => {
  if (!newMessage.value.trim()) return;
  messages.value.push({ author: player.username, text: newMessage.value }); // On utilise le vrai pseudo
  newMessage.value = '';
};
</script>