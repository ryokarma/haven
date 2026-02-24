<script setup lang="ts">
import { usePlayerStore } from '@/stores/player';
import { useNetworkStore } from '@/stores/network';
import type { Recipe } from '@/stores/player';

const player = usePlayerStore();
const networkStore = useNetworkStore();
defineEmits(['close']);

// Icons for ingredients and UI
const icons: Record<string, string> = {
  'wood': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/><path d="M12 12h9"/><path d="M12 12H3"/><path d="M12 17l5-5"/></svg>',
  'stone': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l9 20H3l9-20z"/><path d="M12 10v12"/></svg>',
  'raw_clay': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/></svg>',
  'hammer': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>'
};

const getIngredientCount = (ingredientName: string) => {
  if (['wood', 'stone', 'raw_clay'].includes(ingredientName)) {
      return player.economyInventory[ingredientName] || 0;
  }
  const item = player.inventory.find(i => i.name === ingredientName);
  return item ? item.count : 0;
};

const hasRequiredStation = (recipe: Recipe) => {
  if (!recipe.station) return true;
  return player.nearbyStations.includes(recipe.station);
};

const canCraft = (recipe: Recipe) => {
  // 1. Station check
  if (!hasRequiredStation(recipe)) return false;

  // 2. Resources check
  for (const [name, count] of Object.entries(recipe.inputs)) {
    if (getIngredientCount(name) < count) return false;
  }
  return true;
};

const craft = (recipe: Recipe) => {
  if (!canCraft(recipe)) return;
  
  if (player.validateCraftStation(recipe.id)) {
      networkStore.sendCraft(recipe.id);
      // Wait for server response CRAFT_SUCCESS to add inventory
  }
};
</script>

<template>
  <div class="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all z-50 animate-fade-in">
      <div class="relative w-[500px] rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-white/20 scale-up">
        
        <!-- Header -->
        <div class="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
            <h2 class="flex items-center gap-3 text-2xl font-bold text-amber-100 font-serif tracking-wide">
                <span v-html="icons.hammer" class="text-amber-400 drop-shadow-md"></span>
                Artisanat
            </h2>
            <button @click="$emit('close')" class="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        
        <!-- Recipe List -->
        <div class="max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin flex flex-col gap-3">
             <div v-for="recipe in player.recipes" :key="recipe.id" 
                  class="group relative flex flex-col gap-3 rounded-xl border border-white/5 bg-gradient-to-br from-white/5 to-white/[0.02] p-4 transition-all hover:bg-white/10 hover:border-white/10 hover:shadow-lg hover:scale-[1.01]">
                
                <div class="flex items-center justify-between">
                    <div class="flex flex-col">
                        <span class="font-bold text-lg text-amber-100 group-hover:text-amber-50 transition-colors">{{ recipe.name }}</span>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-slate-400">Produit: {{ recipe.output.count }}x {{ recipe.output.name }}</span>
                            <span v-if="recipe.station" class="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700"
                                  :class="hasRequiredStation(recipe) ? 'text-green-400 border-green-900/50' : 'text-red-400 border-red-900/50'">
                                  Station requise : {{ recipe.station }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Divider -->
                <div class="h-px w-full bg-white/5"></div>

                <!-- Ingredients -->
                <div class="flex flex-wrap gap-2 text-xs items-center">
                    <span class="text-slate-500 uppercase font-bold tracking-wider text-[10px]">Requis:</span>
                    <div v-for="(requiredCount, name) in recipe.inputs" :key="name" 
                          class="flex items-center gap-2 px-2 py-1.5 rounded-md border backdrop-blur-sm transition-colors duration-300"
                          :class="getIngredientCount(name) >= requiredCount 
                              ? 'bg-emerald-900/30 border-emerald-500/30 text-emerald-200' 
                              : 'bg-red-900/20 border-red-500/30 text-red-300'">
                        
                        <!-- Icon if available -->
                        <span v-if="icons[name]" v-html="icons[name]" class="opacity-80"></span>
                        
                        <span class="font-medium">{{ name }}</span>
                        <span class="font-bold ml-1 opacity-90 text-[10px] bg-black/30 px-1 rounded">
                            {{ getIngredientCount(name) }}/{{ requiredCount }}
                        </span>
                    </div>
                </div>

                <!-- Action Button -->
                <button @click="craft(recipe)" 
                        :disabled="!canCraft(recipe)"
                        class="mt-2 w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold shadow-lg transition-all duration-200 border border-transparent"
                        :class="canCraft(recipe) 
                            ? 'bg-amber-500 text-slate-900 hover:bg-amber-400 hover:scale-[1.02] hover:shadow-amber-500/20 active:scale-95' 
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50 border-white/5'">
                    
                    <span v-if="canCraft(recipe)">🔨 Fabriquer</span>
                    <span v-else-if="!hasRequiredStation(recipe)" class="flex items-center gap-1">⚠️ Trop loin de la station : {{ recipe.station }}</span>
                    <span v-else class="flex items-center gap-1">❌ Manque de ressources</span>
                </button>
             </div>
        </div>

      </div>
  </div>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar { width: 4px; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }

.animate-fade-in { animation: fadeIn 0.3s ease-out; }
.scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleUp { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
</style>
