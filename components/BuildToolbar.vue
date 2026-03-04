<script setup lang="ts">
import { usePlayerStore } from '@/stores/player';

const player = usePlayerStore();

// Icons mapped from the store/ItemRegistry or hardcoded SVG
const getIcon = (item: string) => {
    if (!item) return '';
    if (item.includes('Hache')) return '🪓';
    if (item.includes('pickaxe')) return '⛏️';
    if (item.includes('shovel')) return '🪏';
    if (item.includes('knife')) return '🗡️';
    if (item.includes('Bois')) return '🪵';
    if (item.includes('Pierre')) return '🪨';
    if (item.includes('cotton') || item.includes('Fleur')) return '🌸';
    if (item.includes('pot')) return '🏺';
    if (item.includes('clay')) return '🟤';
    if (item.includes('furnace')) return '🔥';
    return '📦';
};

const getCount = (itemName: string) => {
    if (['Bois', 'Pierre', 'wood', 'stone'].includes(itemName)) {
         // economy or standard? We know "Bois" is in inventory currently, or in economy depending on how the game handled it.
         const inInv = player.inventory.find(i => i.name === itemName);
         if (inInv) return inInv.count;
         // check economy
         const eqId = itemName === 'Bois' ? 'wood' : (itemName === 'Pierre' ? 'stone' : itemName);
         return player.economyInventory[eqId] || 0;
    }
    const inInv = player.inventory.find(i => i.name === itemName);
    return inInv ? inInv.count : 0;
};
</script>

<template>
  <div class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-stone-900/90 border border-stone-700 rounded-xl p-2 flex items-center gap-2 shadow-xl backdrop-blur-sm z-10 pointer-events-auto" @click.stop @mousedown.stop @touchstart.stop>

    <div 
        v-for="(itemName, idx) in player.hotbar" 
        :key="idx"
        class="relative w-12 h-12 rounded-lg flex items-center justify-center transition-all bg-stone-800 border-2"
        :class="[
            player.activeItemSlot === idx ? 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] bg-stone-700 scale-105' : 'border-stone-600 hover:bg-stone-700',
            !itemName || getCount(itemName) === 0 ? 'opacity-50 cursor-default' : 'cursor-pointer hover:border-stone-400'
        ]"
        @click="itemName && getCount(itemName) > 0 ? player.setActiveItemSlot(idx) : null"
        :title="itemName || 'Emplacement vide'"
    >
        <span class="text-xl drop-shadow-md select-none" v-if="itemName">{{ getIcon(itemName) }}</span>
        
        <!-- Slot Number -->
        <span class="absolute top-0.5 left-1 text-[8px] text-stone-500 font-bold select-none">{{ idx + 1 }}</span>
        
        <!-- Quantity Badge -->
        <span v-if="itemName && getCount(itemName) > 0" class="absolute bottom-0 right-0 bg-stone-800 text-stone-300 text-[9px] font-bold px-1 rounded border border-stone-600 select-none scale-90">
            {{ getCount(itemName) }}
        </span>
    </div>

  </div>
</template>
