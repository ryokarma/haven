<template>
  <div id="phaser-game" class="w-full h-[80vh] rounded-xl overflow-hidden shadow-2xl border-4 border-slate-700 bg-slate-900 relative">
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import Phaser from 'phaser';
import MainScene from '@/game/scenes/MainScene';

let game: Phaser.Game | null = null;

// Configuration mise à jour pour le redimensionnement
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  // IMPORTANT : On supprime width/height fixes et on utilise le mode RESIZE
  scale: {
    mode: Phaser.Scale.RESIZE, // Le jeu s'adapte au div parent
    width: '100%',
    height: '100%',
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  parent: 'phaser-game',
  backgroundColor: '#1e293b', // Couleur de fond (Slate-800)
  scene: [MainScene],
  render: {
    pixelArt: false,
    antialias: true,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  }
};

onMounted(() => {
  game = new Phaser.Game(config);
});

onUnmounted(() => {
  if (game) {
    game.destroy(true);
    game = null;
  }
});
</script>