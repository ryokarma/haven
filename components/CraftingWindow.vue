<script setup lang="ts">
import { usePlayerStore } from '@/stores/player';
import type { Recipe } from '@/stores/player';

const player = usePlayerStore();
const emit = defineEmits(['close']);

const getIngredientCount = (ingredientName: string) => {
  const item = player.inventory.find(i => i.name === ingredientName);
  return item ? item.count : 0;
};

const canCraft = (recipe: Recipe) => {
  for (const [name, count] of Object.entries(recipe.inputs)) {
    if (getIngredientCount(name) < count) return false;
  }
  return true;
};

const craft = (recipe: Recipe) => {
  if (!canCraft(recipe)) return;
  
  // Simulation pour l'instant
  console.log(`Fabrication de ${recipe.output.name}...`);
  // TODO: Implémenter la logique de consommation et d'ajout
};
</script>

<template>
  <div class="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all z-50">
      <div class="relative w-96 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-white/20">
        
        <div class="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
            <h2 class="flex items-center gap-2 text-xl font-bold text-amber-100">
                <span class="text-amber-400 text-2xl">🛠️</span>
                Artisanat
            </h2>
            <button @click="$emit('close')" class="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white transition-colors">
                ✕
            </button>
        </div>
        
        <div class="max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin flex flex-col gap-3">
             <div v-for="recipe in player.recipes" :key="recipe.id" 
                  class="flex flex-col gap-3 rounded-xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10">
                
                <div class="flex items-center justify-between">
                    <span class="font-bold text-amber-100">{{ recipe.name }}</span>
                    <span class="text-xs text-slate-400 bg-black/30 px-2 py-0.5 rounded">x{{ recipe.output.count }}</span>
                </div>

                <!-- Ingrédients -->
                <div class="flex flex-wrap gap-2 text-xs">
                    <span v-for="(count, name) in recipe.inputs" :key="name" 
                          class="px-2 py-1 rounded bg-black/40 border"
                          :class="getIngredientCount(name) >= count ? 'border-green-500/30 text-green-200' : 'border-red-500/30 text-red-300'">
                        {{ name }}: {{ getIngredientCount(name) }}/{{ count }}
                    </span>
                </div>

                <!-- Bouton Action -->
                <button @click="craft(recipe)" 
                        :disabled="!canCraft(recipe)"
                        class="mt-1 w-full rounded-lg py-2 text-sm font-bold shadow-lg transition-all"
                        :class="canCraft(recipe) 
                            ? 'bg-amber-500 text-slate-900 hover:bg-amber-400 hover:scale-[1.02]' 
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'">
                    {{ canCraft(recipe) ? 'Fabriquer' : 'Manque ressources' }}
                </button>
             </div>
        </div>

      </div>
  </div>
</template>

<style scoped>
/* Scrollbar fine */
.scrollbar-thin::-webkit-scrollbar { width: 4px; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
</style>
