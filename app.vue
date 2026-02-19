<template>
  <div class="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-4">
    
    <header class="mb-8 text-center">
      <h1 class="text-4xl font-bold text-amber-100 mb-2">Projet Haven</h1>
      <p class="text-stone-400">Hub Social • Fantasy • Isométrique</p>
    </header>

    <ClientOnly>
      <GameCanvas />

      <GameUI />
      <BuildToolbar />
      <ChatWidget />
      
      <template #fallback>
        <div class="w-[800px] h-[600px] bg-stone-800 rounded-xl flex items-center justify-center text-stone-500">
          Chargement du monde...
        </div>
      </template>
    </ClientOnly>

    <div class="mt-6 w-full max-w-[800px] bg-stone-800 p-4 rounded-lg border border-stone-700">
      <p class="text-stone-500 italic text-sm">Système : Bienvenue dans Haven. Connecté en tant qu'Invité.</p>
    </div>

    <!-- Indicateur de status WebSocket -->
    <div class="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-1 bg-stone-800 rounded-full border border-stone-700 shadow-lg">
      <div 
        class="w-3 h-3 rounded-full transition-colors duration-300" 
        :class="networkStore.isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'"
      ></div>
      <span class="text-xs text-stone-400 font-mono">
        {{ networkStore.isConnected ? 'ONLINE' : 'OFFLINE' }}
      </span>
    </div>

  </div>
</template>

<script setup lang="ts">
import { useNetworkStore } from '@/stores/network';

const networkStore = useNetworkStore();

onMounted(() => {
  // Récupération ou Création d'un ID persistant
  let storedId = localStorage.getItem('haven_player_id');
  
  if (!storedId) {
    // Fallback UUID simple si crypto.randomUUID n'est pas dispo (ex: contextes non-secure)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        storedId = crypto.randomUUID();
    } else {
        storedId = 'player_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    }
    localStorage.setItem('haven_player_id', storedId);
  }
  
  // Connexion au WebSocket
  console.log('[App] Connexion avec ID Joueur :', storedId);
  networkStore.connect(storedId);
});
</script>

<style>
/* Reset global basique */
body {
  margin: 0;
  background-color: #1c1917; /* stone-900 */
}
</style>