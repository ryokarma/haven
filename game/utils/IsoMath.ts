export class IsoMath {
    // CONFIGURATION "TRUE ISO" (30°)
    // Largeur de référence (base de la tuile)
    static readonly TILE_WIDTH = 64;

    // Hauteur mathématique exacte pour 30° : W * tan(30°)
    // 64 * 0.57735... ≈ 36.95 -> Arrondi à 37 pixels
    static readonly TILE_HEIGHT = 37;

    // Conversion Grille -> Écran (Isométrique)
    static gridToIso(x: number, y: number, originX: number = 0, originY: number = 0): { x: number, y: number } {
        const isoX = (x - y) * (this.TILE_WIDTH / 2);
        const isoY = (x + y) * (this.TILE_HEIGHT / 2);

        return {
            x: originX + isoX,
            y: originY + isoY
        };
    }

    // Conversion Écran -> Grille (Clic souris)
    static isoToGrid(screenX: number, screenY: number, originX: number = 0, originY: number = 0): { x: number, y: number } {
        const adjX = screenX - originX;
        const adjY = screenY - originY;

        const halfW = this.TILE_WIDTH / 2;
        const halfH = this.TILE_HEIGHT / 2;

        // Formule inverse mathématique
        const gridY = (adjY / halfH - adjX / halfW) / 2;
        const gridX = (adjY / halfH + adjX / halfW) / 2;

        return {
            x: Math.round(gridX),
            y: Math.round(gridY)
        };
    }

    // Helper pour dessiner le debug (Sélecteur losange parfait)
    static getDebugPoints(): { x: number, y: number }[] {
        const hw = this.TILE_WIDTH / 2;
        const hh = this.TILE_HEIGHT / 2;

        // Les 4 points du losange isométrique
        return [
            { x: 0, y: -hh }, // Haut
            { x: hw, y: 0 },  // Droite
            { x: 0, y: hh },  // Bas
            { x: -hw, y: 0 }  // Gauche
        ];
    }
}