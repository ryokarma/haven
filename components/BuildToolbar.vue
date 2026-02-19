<script setup lang="ts">
import { useBuildStore } from '@/stores/build';

const buildStore = useBuildStore();
</script>

<template>
  <div class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-stone-900/90 border border-stone-700 rounded-xl p-2 flex items-center gap-2 shadow-xl backdrop-blur-sm z-50">

    <!-- Bouton Cursor / Select -->
    <button
      class="w-12 h-12 rounded-lg flex items-center justify-center transition-all bg-stone-800 hover:bg-stone-700 border-2"
      :class="buildStore.selectedItemId === 'cursor' ? 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'border-stone-600'"
      @click="buildStore.selectItem('cursor')"
      title="Sélection / Récolte"
    >
      <span class="text-xl">🖱️</span>
    </button>

    <div class="w-px h-8 bg-stone-700 mx-1"></div>

    <!-- Item: Arbre -->
    <button
      class="relative w-12 h-12 rounded-lg flex items-center justify-center transition-all bg-stone-800 hover:bg-stone-700 border-2 group"
      :class="buildStore.selectedItemId === 'tree' ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'border-stone-600'"
      @click="buildStore.selectItem('tree')"
    >
      <span class="text-xl">🌲</span>
      <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-stone-900 border border-stone-600 px-2 py-1 rounded text-xs text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        5 Bois
      </div>
    </button>

    <!-- Item: Rocher -->
    <button
      class="relative w-12 h-12 rounded-lg flex items-center justify-center transition-all bg-stone-800 hover:bg-stone-700 border-2 group"
      :class="buildStore.selectedItemId === 'rock' ? 'border-gray-400 shadow-[0_0_10px_rgba(156,163,175,0.3)]' : 'border-stone-600'"
      @click="buildStore.selectItem('rock')"
    >
      <span class="text-xl">🪨</span>
      <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-stone-900 border border-stone-600 px-2 py-1 rounded text-xs text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        2 Pierre
      </div>
    </button>

    <!-- Item: Chemin -->
    <button
      class="relative w-12 h-12 rounded-lg flex items-center justify-center transition-all bg-stone-800 hover:bg-stone-700 border-2 group"
      :class="buildStore.selectedItemId === 'path_stone' ? 'border-zinc-400 shadow-[0_0_10px_rgba(161,161,170,0.3)]' : 'border-stone-600'"
      @click="buildStore.selectItem('path_stone')"
    >
      <span class="text-xl">⬜</span>
      <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-stone-900 border border-stone-600 px-2 py-1 rounded text-xs text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        1 Pierre
      </div>
    </button>

  </div>
</template>
