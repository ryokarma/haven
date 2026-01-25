// @ts-ignore
import EasyStar from 'easystarjs';

/**
 * Gestionnaire de pathfinding
 * Gère la recherche de chemin avec support des déplacements diagonaux
 */
export class PathfindingManager {
    private finder: EasyStar.js;
    private gridData: number[][];

    constructor(gridData: number[][]) {
        this.gridData = gridData;
        this.finder = new EasyStar.js();
        this.initializeFinder();
    }

    /**
     * Initialise le pathfinder avec les paramètres de grille
     */
    private initializeFinder(): void {
        this.finder.setGrid(this.gridData);
        this.finder.setAcceptableTiles([0]);

        // Active les déplacements diagonaux
        this.finder.enableDiagonals();

        // Désactive le "corner cutting" pour un déplacement plus naturel
        this.finder.disableCornerCutting();
    }

    /**
     * Trouve un chemin entre deux points
     * @param startX Position X de départ
     * @param startY Position Y de départ
     * @param endX Position X d'arrivée
     * @param endY Position Y d'arrivée
     * @param callback Fonction appelée avec le chemin trouvé
     */
    findPath(
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        callback: (path: { x: number; y: number }[] | null) => void
    ): void {
        this.finder.findPath(startX, startY, endX, endY, callback);
        this.finder.calculate();
    }

    /**
     * Met à jour la grille (après destruction d'un obstacle par exemple)
     */
    updateGrid(gridData: number[][]): void {
        this.gridData = gridData;
        this.finder.setGrid(this.gridData);
    }

    /**
     * Vérifie si une tuile est marchable
     */
    isTileWalkable(x: number, y: number): boolean {
        if (!this.gridData[y] || this.gridData[y][x] === undefined) {
            return false;
        }
        return this.gridData[y][x] === 0;
    }

    /**
     * Marque une tuile comme obstacle ou libre
     */
    setTileWalkable(x: number, y: number, walkable: boolean): void {
        if (this.gridData[y] && this.gridData[y][x] !== undefined) {
            this.gridData[y][x] = walkable ? 0 : 1;
            this.updateGrid(this.gridData);
        }
    }
}
