
import { defineStore } from 'pinia';

export const useBuildStore = defineStore('build', {
    state: () => ({
        selectedItemId: 'cursor', // 'cursor', 'tree', 'rock', etc.
        isBuildMode: false
    }),
    actions: {
        selectItem(id: string) {
            this.selectedItemId = id;
            this.isBuildMode = id !== 'cursor';
        },
        toggleBuildMode() {
            // Si on est en mode build, on revient au curseur
            if (this.isBuildMode) {
                this.selectItem('cursor');
            }
        }
    }
});
