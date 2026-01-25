/**
 * Index des exports du module game
 * Facilite les imports dans d'autres parties de l'application
 */

// Configuration
export { GameConfig } from './config/GameConfig';

// Entities
export { Player } from './entities/Player';

// Graphics
export { TextureGenerator } from './graphics/TextureGenerator';

// Managers
export { AmbianceManager } from './managers/AmbianceManager';
export { ObjectManager } from './managers/ObjectManager';
export { PathfindingManager } from './managers/PathfindingManager';
export { TileManager } from './managers/TileManager';

// Scenes
export { default as MainScene } from './scenes/MainScene';

// UI
export { TileSelector } from './ui/TileSelector';

// Utils
export { IsoMath } from './utils/IsoMath';
