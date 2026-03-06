<script setup lang="ts">
import { useWorldStore } from '@/stores/world';
import { useNetworkStore } from '@/stores/network';

const world = useWorldStore();
const network = useNetworkStore();

const emit = defineEmits(['close']);

const kickPlayer = (playerId: string) => {
    if (confirm(`Êtes-vous sûr de vouloir expulser le joueur ${playerId} ?`)) {
        network.sendAdminKick(playerId);
    }
};

const regenerateMap = () => {
    if (confirm("ATTENTION : Régénérer la map effacera toutes les constructions et ressources actuelles. Continuer ?")) {
        network.sendAdminRegenerateMap();
    }
};

</script>

<template>
  <div class="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all z-50 transform origin-center" @click.self="$emit('close')">
    <div class="relative w-[500px] h-[600px] rounded-3xl border border-rose-500/30 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-white/20 flex flex-col gap-4">
      
      <!-- HEADER -->
      <div class="flex items-center justify-between border-b border-rose-500/20 pb-4">
          <h2 class="flex items-center gap-2 text-2xl font-black text-rose-100 tracking-wide uppercase">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" class="text-rose-500" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Panneau d'Administration
          </h2>
          <button @click="$emit('close')" class="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-white transition-colors">
              ✕
          </button>
      </div>

      <!-- PLAYERS LIST -->
      <div class="flex-1 overflow-y-auto pr-2 space-y-2">
          <h3 class="text-sm font-bold text-rose-300 uppercase mb-2">Joueurs Connectés ({{ Object.keys(world.otherPlayers).length }})</h3>
          
          <div v-if="Object.keys(world.otherPlayers).length === 0" class="text-slate-500 italic text-sm text-center py-4 bg-white/5 rounded-xl border border-white/5">
              Aucun autre joueur connecté.
          </div>

          <div v-for="player in world.otherPlayers" :key="player.id" class="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors">
              <div class="flex items-center gap-3">
                  <div class="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center border border-rose-500/20 text-rose-200">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <div>
                      <p class="font-bold text-slate-200 text-sm">{{ player.id.substring(0, 8) }}</p>
                      <p class="text-xs text-slate-500 font-mono">Pos: {{ Math.round(player.x) }}, {{ Math.round(player.y) }}</p>
                  </div>
              </div>
              <button @click="kickPlayer(player.id)" class="px-3 py-1.5 rounded-lg bg-rose-600/20 text-rose-400 font-bold text-xs uppercase hover:bg-rose-600 hover:text-white border border-rose-500/30 transition-all shadow-md active:scale-95">
                  Kick
              </button>
          </div>
      </div>

      <!-- DANGER ZONE -->
      <div class="mt-auto pt-4 border-t border-rose-500/20">
          <h3 class="text-xs font-bold text-rose-500/80 mb-3 flex items-center gap-2 uppercase tracking-widest content-center text-center">
              <span class="flex-1 h-px bg-rose-500/20"></span>
              Danger Zone
              <span class="flex-1 h-px bg-rose-500/20"></span>
          </h3>
          <button @click="regenerateMap" class="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black uppercase tracking-widest shadow-[0_0_20px_rgba(225,29,72,0.4)] border border-red-400/30 transition-all hover:scale-[1.02] active:scale-95 flex flex-col items-center justify-center gap-1">
              <span class="text-lg">Régénérer la Map</span>
              <span class="text-[10px] text-red-200/70 font-normal normal-case">Efface tout le contenu généré et placé</span>
          </button>
      </div>

    </div>
  </div>
</template>
