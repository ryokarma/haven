export class IsoMath {
    static readonly TILE_WIDTH = 64;
    static readonly TILE_HEIGHT = 37; // Hauteur ajustée pour le "True Isometric" (30°)

    static gridToIso(x: number, y: number, originX: number = 0, originY: number = 0): { x: number, y: number } {
        const isoX = (x - y) * (this.TILE_WIDTH / 2);
        const isoY = (x + y) * (this.TILE_HEIGHT / 2);
        return { x: originX + isoX, y: originY + isoY };
    }

    static isoToGrid(screenX: number, screenY: number, originX: number = 0, originY: number = 0): { x: number, y: number } {
        const adjX = screenX - originX;
        const adjY = screenY - originY;
        const halfW = this.TILE_WIDTH / 2;
        const halfH = this.TILE_HEIGHT / 2;

        const gridY = (adjY / halfH - adjX / halfW) / 2;
        const gridX = (adjY / halfH + adjX / halfW) / 2;

        return { x: Math.round(gridX), y: Math.round(gridY) };
    }

    static getDebugPoints(): { x: number, y: number }[] {
        const hw = this.TILE_WIDTH / 2;
        const hh = this.TILE_HEIGHT / 2;
        return [{ x: 0, y: -hh }, { x: hw, y: 0 }, { x: 0, y: hh }, { x: -hw, y: 0 }];
    }
}