<template>
  <div id="phaser-game" @pointerdown="handleCanvasClick" @touchstart="handleCanvasClick" class="w-full h-full flex-1 md:h-[80vh] md:flex-none rounded-none md:rounded-xl overflow-hidden shadow-none md:shadow-2xl border-none md:border-4 border-slate-700 bg-slate-900 relative z-0">
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import Phaser from 'phaser';
import { MainScene } from '@/game/scenes/MainScene';

import { usePlayerStore } from '@/stores/player';
import { IsoMath } from '@/game/utils/IsoMath';
import { GameConfig } from '@/game/config/GameConfig';

const handleCanvasClick = () => {
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
};

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
  // ════════════════════════════════════════════════════════════════
  // FIX DÉFINITIF DU "EVENT BLEEDING" (Canvas ↔ Vue UI)
  //
  // Par défaut, Phaser attache ses listeners (pointerdown, pointermove,
  // pointerup) sur `window` — pas sur le <canvas>. Résultat : même si
  // un div Vue avec pointer-events:auto est au-dessus, le clic remonte
  // jusqu'à window et Phaser le capte quand même.
  //
  // Avec `windowEvents: false`, Phaser n'écoute QUE sur le <canvas>.
  // Le navigateur applique alors son modèle natif : l'élément DOM le
  // plus haut dans le stacking order (z-index + pointer-events) reçoit
  // le clic, et le canvas en dessous ne le voit jamais.
  //
  // Conséquence : les modificateurs Vue (.stop) deviennent optionnels
  // (défense en profondeur uniquement). Aucun hack DOM, aucun state
  // Pinia, aucun elementFromPoint n'est nécessaire.
  // ════════════════════════════════════════════════════════════════
  input: {
    windowEvents: false,
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