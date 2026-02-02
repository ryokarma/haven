<script setup lang="ts">
import { usePlayerStore } from '@/stores/player';

const player = usePlayerStore();
const emit = defineEmits(['close']);

// Dictionnaire des slots pour affichage
const slots = {
  head: { name: 'Tête', icon: '👑' },
  body: { name: 'Corps', icon: '👕' },
  mainHand: { name: 'Main', icon: '⚔️' },
  accessory: { name: 'Accessoire', icon: '💍' }
};

// Layout grid pour positionner les slots autour du personnage
// [ ] [H] [ ]
// [M] [P] [A]
// [ ] [B] [ ]
// H=Head, M=Main, P=Player, A=Accessory, B=Body
// On utilisera simple flex/grid CSS

const handleUnequip = (slot: 'head' | 'body' | 'mainHand' | 'accessory') => {
    if (player.equipment[slot]) {
        player.unequipItem(slot);
    }
};
</script>

<template>
  <div class="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
    <div class="relative w-96 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-white/20">
        
        <div class="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
            <h2 class="text-xl font-bold text-amber-100 flex items-center gap-2">
                <span>👤</span> Équipement
            </h2>
            <button @click="$emit('close')" class="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white transition-colors">
                ✕
            </button>
        </div>

        <div class="relative flex flex-col items-center justify-center py-4">
            
            <!-- Avatar Central -->
            <div class="relative z-10 h-32 w-32 rounded-full border-4 border-white/10 bg-black/40 shadow-inner flex items-center justify-center mb-8">
                <img src="/assets/hero.png" alt="Hero" class="h-24 w-24 object-contain opacity-80" />
            </div>

            <!-- Slots en position absolue par rapport au centre -->
            <!-- HEAD (Top) -->
            <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-2">
                <div class="slot-container" title="Tête" @click="handleUnequip('head')">
                    <div v-if="player.equipment.head" class="item-equipped">{{ player.equipment.head.name.charAt(0) }}</div>
                    <div v-else class="slot-placeholder">👑</div>
                </div>
            </div>

            <!-- BODY (Bottom) -->
            <div class="absolute bottom-0 left-1/2 -translate-x-1/2 mb-4">
                <div class="slot-container" title="Corps" @click="handleUnequip('body')">
                     <div v-if="player.equipment.body" class="item-equipped">{{ player.equipment.body.name.charAt(0) }}</div>
                     <div v-else class="slot-placeholder">👕</div>
                </div>
            </div>

            <!-- MAIN HAND (Left) -->
            <div class="absolute top-1/2 left-8 -translate-y-1/2">
                <div class="slot-container" title="Main Principale" @click="handleUnequip('mainHand')">
                     <div v-if="player.equipment.mainHand" class="item-equipped">{{ player.equipment.mainHand.name.charAt(0) }}</div>
                     <div v-else class="slot-placeholder">⚔️</div>
                </div>
            </div>

            <!-- ACCESSORY (Right) -->
            <div class="absolute top-1/2 right-8 -translate-y-1/2">
                <div class="slot-container" title="Accessoire" @click="handleUnequip('accessory')">
                     <div v-if="player.equipment.accessory" class="item-equipped">{{ player.equipment.accessory.name.charAt(0) }}</div>
                     <div v-else class="slot-placeholder">💍</div>
                </div>
            </div>

        </div>

        <div class="mt-8 text-center text-xs text-slate-400 italic">
            Glissez-déposez des objets pour équiper (Bientôt disponible)
        </div>

    </div>
  </div>
</template>

<style scoped>
.slot-container {
    @apply h-14 w-14 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center shadow-lg transition-all hover:scale-105 hover:border-amber-400/30 hover:bg-white/10 cursor-pointer;
}

.slot-placeholder {
    @apply text-2xl opacity-30 grayscale;
}

.item-equipped {
    @apply h-full w-full flex items-center justify-center bg-amber-500/20 text-amber-200 font-bold rounded-xl;
}
</style>
