<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { usePlayerStore } from '@/stores/player';
import { useWorldStore } from '@/stores/world';
import { useNetworkStore } from '@/stores/network';
import CraftingWindow from './CraftingWindow.vue';
import CharacterWindow from './CharacterWindow.vue';
import AdminWindow from './AdminWindow.vue';
import PlayerListWidget from './PlayerListWidget.vue';
import ProfileWindow from './ProfileWindow.vue';

const player = usePlayerStore();
const world = useWorldStore();
const networkStore = useNetworkStore();
const isInventoryOpen = ref(false);
const isCraftingOpen = ref(false);
const isCharacterOpen = ref(false);
const isAdminOpen = ref(false);
const isProfileOpen = ref(false);
const inspectedPlayerId = ref<string | null>(null);
const activeMobilePopup = ref<string | null>(null);

function openProfile(playerId: string | null = null) {
    inspectedPlayerId.value = playerId;
    isProfileOpen.value = true;
}

const handleInspectEvent = (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail && customEvent.detail.playerId) {
        openProfile(customEvent.detail.playerId);
    }
};



onMounted(() => {
    window.addEventListener('inspectPlayerProfile', handleInspectEvent);
});

onUnmounted(() => {
    window.removeEventListener('inspectPlayerProfile', handleInspectEvent);
});



// --- ICONES SVG ---
// On remplace les emojis par des SVG plus "Pro" qui s'adaptent à la couleur du texte
const icons = {
  wood: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/><path d="M12 12h9"/><path d="M12 12H3"/><path d="M12 17l5-5"/></svg>',
  stone: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l9 20H3l9-20z"/><path d="M12 10v12"/></svg>',
  bag: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
  hammer: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>'
};

const getIcon = (name: string) => {
  if (name === 'Bois') return icons.wood;
  if (name === 'Pierre') return icons.stone;
  return '📦'; 
};


// Fonction pour consommer un item
const handleItemClick = (itemName: string) => {
  player.consumeItem(itemName);
};

// --- FEEDBACK SYSTEM ---
const feedbackMessage = ref<string | null>(null);
let feedbackTimeout: ReturnType<typeof setTimeout>;

watch(() => player.lastActionFeedback, (newVal) => {
  if (!newVal) return;
  
  // Le format est "Message#Timestamp"
  const message = newVal.split('#')[0] || '';
  feedbackMessage.value = message;

  if (feedbackTimeout) clearTimeout(feedbackTimeout);
  feedbackTimeout = setTimeout(() => {
    feedbackMessage.value = null;
  }, 3000);
});
</script>

<template>
  <div class="pointer-events-none absolute inset-0 flex flex-col justify-between p-2 md:p-6 text-sm md:text-base">
    
    <!-- PLAYER LIST WIDGET -->
    <PlayerListWidget />
    
    <div class="pointer-events-auto flex items-start z-10 w-fit relative" @click.stop @pointerdown.stop @mousedown.stop @touchstart.stop>
        
        <!-- ============================== -->
        <!-- PC ONLY: AVATAR & STATS COLUMN -->
        <!-- ============================== -->
        <div class="hidden md:flex items-center gap-4 animate-fade-in">
            <div class="relative group flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white/20 bg-slate-900/60 backdrop-blur-md shadow-lg transition-transform hover:scale-105">
                <img src="/assets/hero.png" class="h-12 w-12 object-contain" alt="Avatar" />
                <div class="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-slate-900 border border-white/20 shadow-sm">
                    {{ player.level }}
                </div>
            </div>

            <div class="flex flex-col gap-1.5">
                 <div class="flex items-center gap-2">
                    <span class="font-serif text-xl font-bold text-white drop-shadow-md">{{ player.username }}</span>
                 </div>
                 
                 <!-- Barres de stats -->
                 <div class="flex flex-col gap-2 mt-2">
                    <div v-for="(stat, key) in [
                        { label: 'SANTÉ', value: player.stats.health, max: player.stats.maxHealth, color: 'bg-red-500', gradient: 'from-red-500 to-red-400' },
                        { label: 'ÉNERGIE', value: player.stats.energy, max: player.stats.maxEnergy, color: 'bg-yellow-400', gradient: 'from-yellow-400 to-yellow-300' },
                        { label: 'FAIM', value: player.stats.hunger, max: player.stats.maxHunger, color: 'bg-orange-500', gradient: 'from-orange-500 to-orange-400' },
                        { label: 'SOIF', value: player.stats.thirst, max: player.stats.maxThirst, color: 'bg-cyan-400', gradient: 'from-cyan-400 to-cyan-300' }
                    ]" :key="key" class="group relative flex items-center gap-3">
                      
                      <!-- Label -->
                      <span class="text-[10px] font-bold text-white/80 w-12 tracking-wider">{{ stat.label }}</span>
                      
                      <!-- Barre Background -->
                      <div class="relative w-32 h-2.5 bg-slate-900/60 rounded-full border border-white/10 overflow-hidden shadow-inner">
                        <!-- Barre Remplissage -->
                        <div 
                          class="h-full bg-gradient-to-r transition-all duration-300 ease-out shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                          :class="stat.gradient"
                          :style="{ width: `${(stat.value / stat.max) * 100}%` }"
                        ></div>
                      </div>

                      <!-- Tooltip (au survol) -->
                      <div class="absolute left-full ml-2 px-2 py-1 bg-black/80 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 backdrop-blur-sm border border-white/10">
                        {{ Math.floor(stat.value) }} / {{ stat.max }}
                      </div>
                    </div>
                 </div>

                 <!-- Time Widget -->
                 <div class="flex items-center gap-2 bg-slate-900/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full shadow-lg w-fit mt-1">
                   <span class="text-xl animate-pulse">{{ world.isNight ? '🌙' : '☀️' }}</span>
                   <span class="font-mono text-lg font-bold text-white tracking-widest drop-shadow-md">
                     {{ world.formattedTime }}
                   </span>
                 </div>

                 <div class="flex items-center gap-2 text-xs font-mono text-slate-300 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm border border-white/5 w-fit">
                    <span>X: {{ player.position.x }}</span>
                    <span class="text-white/20">|</span>
                    <span>Y: {{ player.position.y }}</span>
                 </div>
            </div>
        </div>

        <!-- ============================== -->
        <!-- MOBILE ONLY: TOP ICONS BAR     -->
        <!-- ============================== -->
        <div class="md:hidden flex gap-3 animate-fade-in">
            <!-- Stats/Profile Icon -->
            <button @click="activeMobilePopup = activeMobilePopup === 'stats' ? null : 'stats'" 
                    class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 shadow-lg relative transition-all active:scale-95"
                    :class="{'ring-2 ring-amber-400': activeMobilePopup === 'stats'}">
                <img src="/assets/hero.png" class="h-8 w-8 object-contain" alt="Mobile Avatar" />
                <div class="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-slate-900 border border-white/20 shadow-sm">
                    {{ player.level }}
                </div>
            </button>

            <!-- World Icon -->
            <button @click="activeMobilePopup = activeMobilePopup === 'world' ? null : 'world'"
                    class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 shadow-lg text-xl transition-all active:scale-95"
                    :class="{'ring-2 ring-cyan-400 bg-slate-800': activeMobilePopup === 'world'}">
                🌍
            </button>

            <!-- Players Icon -->
            <button @click="activeMobilePopup = activeMobilePopup === 'players' ? null : 'players'"
                    class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 shadow-lg text-xl relative transition-all active:scale-95"
                    :class="{'ring-2 ring-emerald-400 bg-slate-800': activeMobilePopup === 'players'}">
                👥
                <div class="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white border border-slate-900 shadow-sm">
                    {{ Object.keys(world.otherPlayers).length + 1 }}
                </div>
            </button>
        </div>

        <!-- ============================== -->
        <!-- MOBILE ONLY: POPUP WINDOWS     -->
        <!-- ============================== -->
        <div v-if="activeMobilePopup" class="md:hidden absolute top-16 left-0 w-64 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 p-4 animate-fade-in-down origin-top-left pointer-events-auto">
            
            <!-- Stats Popup -->
            <div v-if="activeMobilePopup === 'stats'" class="flex flex-col gap-3">
                <div class="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                    <span class="font-serif text-lg font-bold text-white">{{ player.username }}</span>
                    <!-- Lien vers le vrai profil -->
                    <button @click="openProfile(null); activeMobilePopup = null" class="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-white flex items-center gap-1 transition-colors">
                        Profil 📜
                    </button>
                </div>
                <div v-for="(stat, key) in [
                    { label: 'SANTÉ', value: player.stats.health, max: player.stats.maxHealth, color: 'bg-red-500', gradient: 'from-red-500 to-red-400' },
                    { label: 'ÉNERGIE', value: player.stats.energy, max: player.stats.maxEnergy, color: 'bg-yellow-400', gradient: 'from-yellow-400 to-yellow-300' },
                    { label: 'FAIM', value: player.stats.hunger, max: player.stats.maxHunger, color: 'bg-orange-500', gradient: 'from-orange-500 to-orange-400' },
                    { label: 'SOIF', value: player.stats.thirst, max: player.stats.maxThirst, color: 'bg-cyan-400', gradient: 'from-cyan-400 to-cyan-300' }
                ]" :key="key" class="flex flex-col gap-1">
                    <div class="flex justify-between text-[10px] font-bold text-white/80 tracking-wider">
                        <span>{{ stat.label }}</span>
                        <span>{{ Math.floor(stat.value) }} / {{ stat.max }}</span>
                    </div>
                    <div class="relative w-full h-2.5 bg-slate-900/60 rounded-full border border-white/10 overflow-hidden shadow-inner">
                        <div class="h-full bg-gradient-to-r transition-all duration-300 ease-out"
                            :class="stat.gradient" :style="{ width: `${(stat.value / stat.max) * 100}%` }"></div>
                    </div>
                </div>
            </div>

            <!-- World Popup -->
            <div v-if="activeMobilePopup === 'world'" class="flex flex-col gap-4">
                <div class="flex items-center gap-3 justify-center py-2 bg-black/40 rounded-xl border border-white/5">
                   <span class="text-2xl">{{ world.isNight ? '🌙' : '☀️' }}</span>
                   <span class="font-mono text-xl font-bold text-white tracking-widest">{{ world.formattedTime }}</span>
                </div>
                <div class="flex items-center justify-center gap-2 text-sm font-mono text-slate-300 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                    <span>X: {{ player.position.x }}</span>
                    <span class="text-white/20">|</span>
                    <span>Y: {{ player.position.y }}</span>
                </div>
            </div>

            <!-- Players Popup -->
            <div v-if="activeMobilePopup === 'players'" class="flex flex-col gap-2">
                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-2">Joueurs Connectés</div>
                <div class="max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
                    <!-- Local Player -->
                    <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                        <span class="text-sm font-bold text-amber-100 truncate flex-1">{{ player.username }}</span>
                    </div>
                    <!-- Other Players -->
                    <div v-for="p in world.otherPlayers" :key="p.id" 
                         @click="openProfile(p.id); activeMobilePopup = null"
                         class="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 active:bg-white/10 transition-colors cursor-pointer">
                        <div class="w-2 h-2 rounded-full bg-emerald-400"></div>
                        <span class="text-sm font-medium text-slate-200 truncate flex-1">{{ p.username || `Joueur ${p.id.substring(0, 4)}` }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- FEEDBACK TOAST -->
        <div v-if="feedbackMessage" class="absolute left-2 md:left-24 -bottom-10 md:top-0 pointer-events-none animate-slide-in z-[60]">
             <div class="bg-black/60 text-white text-sm px-3 py-1 rounded-full backdrop-blur-md border border-white/10 shadow-lg whitespace-nowrap">
                 {{ feedbackMessage }}
             </div>
        </div>

    </div>



    <!-- WALLET DISPLAY DELETED IN REFONTE -->

    <!-- ============================== -->
    <!-- PC ONLY: INVENTAIRE MODAL      -->
    <!-- ============================== -->
    <div v-if="isInventoryOpen" class="pointer-events-auto absolute inset-0 hidden md:flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all z-50" @click.self="isInventoryOpen = false" @pointerdown.self.stop @mousedown.self.stop @touchstart.self.stop>
      <div class="relative w-96 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-white/20 pointer-events-auto" @click.stop @pointerdown.stop @mousedown.stop @touchstart.stop>
        
        <div class="mb-4 flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
            <h2 class="flex items-center gap-2 text-xl font-bold text-amber-100">
                <span v-html="icons.bag" class="text-amber-400"></span>
                Sac à dos
            </h2>
            <button @click="isInventoryOpen = false" class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white transition-colors">
                ✕
            </button>
        </div>
        
        <div class="overflow-y-auto max-h-[60vh] md:max-h-[400px] overflow-x-hidden custom-scrollbar pr-2">
            <div v-if="player.resourceInventory.length === 0" class="flex h-32 flex-col items-center justify-center text-slate-400 italic gap-2">
                <span class="text-4xl opacity-20">🎒</span>
                Vide... Récoltez des ressources !
            </div>
            
            <div v-else class="grid grid-cols-4 gap-3">
                <div v-for="(item, idx) in player.resourceInventory" :key="idx" 
                     @click="handleItemClick(item.name)"
                     @contextmenu.prevent="player.equipItem(item.name)"
                     title="Clic: Utiliser/Équiper | Clic Droit: Équiper"
                     class="group relative min-h-[44px] min-w-[44px] aspect-square flex flex-col items-center justify-center rounded-xl border border-white/5 bg-white/5 transition-all hover:bg-white/10 hover:border-amber-400/30 hover:scale-105 cursor-pointer active:scale-95">
                   
                   <span v-html="getIcon(item.name)" class="text-amber-200 mb-1 drop-shadow-lg"></span>
                   
                   <span class="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white border border-white/10 shadow-sm">
                       {{ item.count }}
                   </span>
                   
                   <span class="text-[10px] text-slate-300 font-medium tracking-wide">{{ item.name }}</span>
                   
                   <!-- Indicateur de clic -->
                   <div class="absolute inset-0 rounded-xl bg-amber-400/0 group-hover:bg-amber-400/10 transition-colors pointer-events-none"></div>
                </div>
            </div>
        </div>

      </div>
    </div>

    <CraftingWindow 
        v-if="isCraftingOpen" 
        @close="isCraftingOpen = false" 
    />

    <CharacterWindow 
        v-if="isCharacterOpen" 
        @close="isCharacterOpen = false" 
    />

    <AdminWindow 
        v-if="isAdminOpen" 
        @close="isAdminOpen = false" 
    />

    <ProfileWindow 
        v-if="isProfileOpen" 
        :player-id="inspectedPlayerId || undefined"
        @close="isProfileOpen = false" 
    />

    <!-- ============================== -->
    <!-- PC ONLY: BOTTOM ACTION BAR     -->
    <!-- ============================== -->
    <div class="absolute bottom-4 right-4 hidden md:flex items-center justify-end gap-3 pointer-events-auto z-10" @click.stop @pointerdown.stop @mousedown.stop @touchstart.stop>
          <!-- Bouton Crafting -->
          <button 
            @click="isCraftingOpen = !isCraftingOpen" 
            class="group flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-xl md:rounded-2xl border border-white/10 bg-slate-800/80 backdrop-blur-xl text-amber-100 shadow-lg transition-all hover:-translate-y-1 hover:bg-slate-700 hover:border-amber-400/30 active:scale-95"
            title="Artisanat"
          >
             <span class="scale-[0.85] md:scale-100" v-html="icons.hammer"></span>
          </button>

          <!-- Bouton Admin (Caché si pas admin) -->
          <button 
            v-if="player.role === 'admin'"
            @click="isAdminOpen = !isAdminOpen"
            class="group flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-xl md:rounded-2xl border border-rose-500/30 bg-rose-900/80 backdrop-blur-xl text-rose-100 shadow-lg transition-all hover:-translate-y-1 hover:bg-rose-800 hover:border-rose-400/50 active:scale-95"
            title="Administration"
          >
             <div class="relative scale-[0.85] md:scale-100">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
             </div>
          </button>

          <!-- Bouton Personnage (Nouveau) -->
          <button 
            @click="isCharacterOpen = !isCharacterOpen" 
            class="group flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-xl md:rounded-2xl border border-white/10 bg-slate-800/80 backdrop-blur-xl text-amber-100 shadow-lg transition-all hover:-translate-y-1 hover:bg-slate-700 hover:border-amber-400/30 active:scale-95"
            title="Personnage"
          >
             <div class="relative scale-[0.85] md:scale-100">
                 <!-- Icone simple pour le personnage -->
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
             </div>
          </button>

          <!-- Bouton Profil (Nouveau) -->
          <button 
            @click="openProfile(null)" 
            class="group flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-xl md:rounded-2xl border border-white/10 bg-slate-800/80 backdrop-blur-xl text-amber-100 shadow-lg transition-all hover:-translate-y-1 hover:bg-slate-700 hover:border-amber-400/30 active:scale-95"
            title="Profil RP"
          >
             <div class="relative scale-[0.85] md:scale-100">
                 <span class="text-xl md:text-2xl drop-shadow-md">📜</span>
             </div>
          </button>

          <!-- Bouton Inventaire -->
          <button 
            @click="isInventoryOpen = !isInventoryOpen" 
            class="group flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-xl md:rounded-2xl border border-white/10 bg-slate-800/80 backdrop-blur-xl text-amber-100 shadow-lg transition-all hover:-translate-y-1 hover:bg-slate-700 hover:border-amber-400/30 active:scale-95"
            title="Ouvrir l'inventaire"
          >
            <div class="relative scale-[0.85] md:scale-100">
                <span v-html="icons.bag"></span>
                <span v-if="player.resourceInventory.length > 0" class="absolute -top-1 -right-2 md:-top-2 md:-right-3 h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
            </div>
          </button>
      </div>

    <!-- ============================== -->
    <!-- MOBILE ONLY: BOTTOM BAR ICONS  -->
    <!-- ============================== -->
    <div class="md:hidden absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/90 backdrop-blur-xl border border-white/15 px-6 py-3 rounded-[2rem] shadow-2xl z-40 pointer-events-auto" @click.stop @pointerdown.stop @mousedown.stop @touchstart.stop>
        
        <!-- Inventory (Resources) -->
        <button @click="activeMobilePopup = activeMobilePopup === 'inventory' ? null : 'inventory'" 
                class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 active:scale-95 transition-all text-2xl relative"
                :class="{'bg-amber-500/20 border-amber-500/50': activeMobilePopup === 'inventory'}">
            🎒
            <span v-if="player.resourceInventory.length > 0" class="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] border border-slate-900"></span>
        </button>

        <!-- Tools (Equipment) -->
        <button @click="activeMobilePopup = activeMobilePopup === 'tools' ? null : 'tools'" 
                class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 active:scale-95 transition-all text-2xl relative"
                :class="{'bg-blue-500/20 border-blue-500/50': activeMobilePopup === 'tools'}">
            🪓
            <span v-if="player.toolInventory.length > 0" class="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] border border-slate-900"></span>
        </button>

        <!-- Crafting (Ouvre CraftingWindow) -->
        <button @click="isCraftingOpen = true; activeMobilePopup = null" 
                class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 active:scale-95 transition-all text-2xl">
            🔨
        </button>
    </div>

    <!-- ============================== -->
    <!-- MOBILE ONLY: BOTTOM POPUPS     -->
    <!-- ============================== -->
    <div v-if="activeMobilePopup === 'inventory' || activeMobilePopup === 'tools'" 
         class="md:hidden absolute bottom-24 left-3 right-3 bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-3xl shadow-2xl z-50 p-5 pointer-events-auto flex flex-col" 
         style="max-height: 50vh;" @click.stop @pointerdown.stop @mousedown.stop @touchstart.stop>
        
        <!-- Bouton Fermer -->
        <button @click="activeMobilePopup = null" class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:text-white transition-colors active:scale-95 z-10">
            ✕
        </button>

        <!-- Inventory (Ressources) Popup -->
        <div v-if="activeMobilePopup === 'inventory'" class="flex flex-col h-full overflow-hidden">
            <h2 class="text-xl font-bold text-amber-100 flex items-center gap-2 mb-4 shrink-0">
                <span v-html="icons.bag" class="text-amber-400"></span> Sac à dos
            </h2>
            <div class="overflow-y-auto custom-scrollbar flex-1 pr-2">
                <div v-if="player.resourceInventory.length === 0" class="flex flex-col items-center justify-center text-slate-400 h-24 italic">
                    <span class="text-3xl opacity-30">🎒</span>
                    Vide...
                </div>
                <div v-else class="grid grid-cols-4 gap-3">
                    <div v-for="(item, idx) in player.resourceInventory" :key="'res-'+idx" 
                         @click="handleItemClick(item.name)"
                         class="group relative aspect-square flex flex-col items-center justify-center rounded-[1rem] border border-white/5 bg-black/40 active:bg-white/10 active:border-amber-400/30 transition-all active:scale-95">
                        <span v-html="getIcon(item.name)" class="text-amber-200 mb-1 drop-shadow-md"></span>
                        <span class="text-[10px] text-slate-300 font-medium truncate w-full text-center px-1">{{ item.name }}</span>
                        <div class="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-slate-800 text-[10px] font-bold text-white px-1.5 rounded-full border border-white/20 shadow-sm">
                            {{ item.count }}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tools (Outils) Popup -->
        <div v-if="activeMobilePopup === 'tools'" class="flex flex-col h-full overflow-hidden">
            <h2 class="text-xl font-bold text-blue-200 flex items-center gap-2 mb-4 shrink-0">
                <span class="text-blue-400">🪓</span> Outils & Équipement
            </h2>
            <div class="overflow-y-auto custom-scrollbar flex-1 pr-2">
                <div v-if="player.toolInventory.length === 0" class="flex flex-col items-center justify-center text-slate-400 h-24 italic">
                     Aucun équipement...
                </div>
                <div v-else class="grid grid-cols-4 gap-3">
                    <div v-for="(tool, idx) in player.toolInventory" :key="'tool-'+idx" 
                         @click="player.equipItem(tool.name); activeMobilePopup = null"
                         class="group relative aspect-square flex flex-col items-center justify-center rounded-[1rem] border border-white/5 bg-black/40 active:bg-blue-500/20 active:border-blue-400/30 transition-all active:scale-95">
                        <span class="text-2xl mb-1 drop-shadow-md">🛠️</span>
                        <span class="text-[10px] text-slate-300 font-medium truncate w-full text-center px-1">{{ tool.name }}</span>
                        <div class="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-slate-800 text-[10px] font-bold text-white px-1.5 rounded-full border border-white/20 shadow-sm">
                            {{ tool.count }}
                        </div>
                    </div>
                </div>
            </div>
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
</style>