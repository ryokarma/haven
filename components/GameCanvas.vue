<template>
  <div id="phaser-game" class="w-full h-[80vh] rounded-xl overflow-hidden shadow-2xl border-4 border-slate-700 bg-slate-900 relative">
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import Phaser from 'phaser';
import { MainScene } from '@/game/scenes/MainScene';

import { usePlayerStore } from '@/stores/player';
import { IsoMath } from '@/game/utils/IsoMath';
import { GameConfig } from '@/game/config/GameConfig';

let game: Phaser.Game | null = null;
const player = usePlayerStore();

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

// Watcher pour le feedback visuel (Consommation d'objets)
import { watch } from 'vue';
watch(() => player.lastActionFeedback, (newVal) => {
    if (!newVal || !game) return;
    
    // Le format est "Message#Timestamp"
    const message = newVal.split('#')[0];
    if (!message) return;

    // Récupérer la scène
    const mainScene = game.scene.getScene('MainScene') as MainScene;
    if (mainScene && mainScene.showFloatingText) {
        // Position du joueur
        const isoPos = IsoMath.gridToIso(player.position.x, player.position.y, 
            GameConfig.MAP_SIZE * (IsoMath.TILE_WIDTH / 2), 
            100 // MapOriginY hardcodé dans MainScene (on devrait idéalement l'exporter)
        );
        mainScene.showFloatingText(isoPos.x, isoPos.y - 80, message, '#22c55e'); // Vert
    }
});

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