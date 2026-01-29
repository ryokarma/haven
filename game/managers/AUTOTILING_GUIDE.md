# Guide d'utilisation de l'Auto-Tiling (Bitmasking 4-bits)

Ce document explique comment utiliser le système d'auto-tiling implémenté dans `TileManager.ts`.

## Vue d'ensemble

Le système d'auto-tiling utilise un **bitmasking 4-bits** pour déterminer automatiquement quelle texture/frame afficher pour une tuile d'eau en fonction de ses voisins cardinaux (Nord, Est, Sud, Ouest).

## Principe du Bitmasking 4-bits

Chaque direction cardinale possède une valeur binaire :
- **Nord (N)** = 1 (0001)
- **Est (E)** = 2 (0010)
- **Sud (S)** = 4 (0100)
- **Ouest (W)** = 8 (1000)

L'index final (0-15) est la somme des directions où un voisin de même type existe.

### Exemples de configurations

| Index | Bitmask | Directions | Description |
|-------|---------|------------|-------------|
| 0     | 0000    | -          | Tuile isolée (aucun voisin) |
| 1     | 0001    | N          | Connexion au Nord uniquement |
| 2     | 0010    | E          | Connexion à l'Est uniquement |
| 3     | 0011    | N+E        | Connexions Nord et Est |
| 4     | 0100    | S          | Connexion au Sud uniquement |
| 5     | 0101    | N+S        | Connexions Nord et Sud (vertical) |
| 6     | 0110    | E+S        | Connexions Est et Sud |
| 7     | 0111    | N+E+S      | Connexions Nord, Est et Sud |
| 8     | 1000    | W          | Connexion à l'Ouest uniquement |
| 9     | 1001    | N+W        | Connexions Nord et Ouest |
| 10    | 1010    | E+W        | Connexions Est et Ouest (horizontal) |
| 11    | 1011    | N+E+W      | Connexions Nord, Est et Ouest |
| 12    | 1100    | S+W        | Connexions Sud et Ouest |
| 13    | 1101    | N+S+W      | Connexions Nord, Sud et Ouest |
| 14    | 1110    | E+S+W      | Connexions Est, Sud et Ouest |
| 15    | 1111    | N+E+S+W    | Toutes les connexions |

## Utilisation dans le code

### 1. Types exportés

```typescript
import { TileManager, TileType, GridCell } from '@/game/managers/TileManager';
```

- **TileType** : Enum définissant les types de tuiles
  - `EMPTY = 0` : Tuile vide/sol
  - `OBSTACLE = 1` : Obstacle (arbre, rocher)
  - `WATER = 2` : Eau

- **GridCell** : Interface pour les données de grille avancées
  ```typescript
  interface GridCell {
    type: TileType;
    walkable: boolean;
  }
  ```

### 2. Placer une tuile d'eau avec auto-tiling

```typescript
// Dans MainScene.ts ou tout autre endroit

// Option 1 : Avec le nouveau format GridCell[][]
const gridData: GridCell[][] = [
  [
    { type: TileType.WATER, walkable: false },
    { type: TileType.WATER, walkable: false },
    { type: TileType.EMPTY, walkable: true }
  ]
];

// Placer une tuile d'eau
const waterTile = this.tileManager.placeTile(
  x,                    // Position X dans la grille
  y,                    // Position Y dans la grille
  'water_texture',      // Clé de texture de base
  this.mapOriginX,      // Origine X de la carte
  this.mapOriginY,      // Origine Y de la carte
  gridData,             // Données de la grille
  TileType.WATER        // Type de tuile
);

// Option 2 : Avec l'ancien format number[][] (rétrocompatible)
const gridDataOld: number[][] = [
  [2, 2, 0],  // 2 = WATER, 0 = EMPTY
  [2, 0, 0]
];

const waterTile2 = this.tileManager.placeTile(
  x, y, 'water_texture',
  this.mapOriginX, this.mapOriginY,
  gridDataOld,
  TileType.WATER
);
```

### 3. Calculer manuellement un index d'auto-tiling

```typescript
const autotileIndex = this.tileManager.calculateAutotile(
  x,                // Position X
  y,                // Position Y
  gridData,         // Données de la grille
  TileType.WATER    // Type à vérifier
);

console.log(`Index d'auto-tiling : ${autotileIndex}`); // 0 à 15
```

### 4. Mettre à jour l'auto-tiling d'une tuile existante

Utile si vous modifiez la grille et que les voisins changent :

```typescript
// Après avoir modifié gridData
this.tileManager.updateTileAutotiling(
  x,
  y,
  gridData,
  waterTileReference  // Référence à l'image Phaser
);
```

## Visualisation actuelle (placeholder)

En l'absence d'assets graphiques, le système utilise des **tints de couleur** pour différencier les 16 configurations :

- Index 0 (isolé) : Bleu très foncé (#1a1a2e)
- Index 5 (N+S) : Rouge-brun (#b56576)
- Index 10 (E+W) : Gris foncé (#393e46)
- Index 15 (toutes connexions) : Bleu clair (#e4f9f5)
- ... (voir `autotileColors` dans TileManager.ts)

Chaque tuile stocke également ses métadonnées :
```typescript
const metadata = waterTile.getData('autotileIndex');    // Ex: 5
const description = waterTile.getData('autotileBitmask'); // Ex: "N+S"
```

## Intégration future avec des assets

Lorsque vous aurez des spritesheets d'eau, remplacez le code dans `placeTile` :

```typescript
// Au lieu de :
tile.setTint(tintColor);

// Utilisez :
tile.setFrame(autotileIndex); // Si c'est un spritesheet avec frames 0-15

// OU
const waterTextures = [
  'water_0', 'water_1', 'water_2', ..., 'water_15'
];
tile.setTexture(waterTextures[autotileIndex]);
```

## Exemple complet dans MainScene

```typescript
private generateMap(): void {
  const gridData: GridCell[][] = [];
  
  for (let y = 0; y < GameConfig.MAP_SIZE; y++) {
    const row: GridCell[] = [];
    
    for (let x = 0; x < GameConfig.MAP_SIZE; x++) {
      // Exemple : créer une zone d'eau au centre
      const isWater = (x >= 10 && x <= 15 && y >= 10 && y <= 15);
      
      const cellType = isWater ? TileType.WATER : TileType.EMPTY;
      row.push({ type: cellType, walkable: !isWater });
    }
    
    gridData.push(row);
  }
  
  // Placer toutes les tuiles
  for (let y = 0; y < GameConfig.MAP_SIZE; y++) {
    for (let x = 0; x < GameConfig.MAP_SIZE; x++) {
      const cell = gridData[y][x];
      
      if (cell.type === TileType.WATER) {
        // Les tuiles d'eau utilisent l'auto-tiling
        this.tileManager.placeTile(
          x, y, 'water_base',
          this.mapOriginX, this.mapOriginY,
          gridData, TileType.WATER
        );
      } else {
        // Les autres tuiles sont normales
        this.tileManager.placeTile(
          x, y, this.tileManager.getRandomTileKey(),
          this.mapOriginX, this.mapOriginY
        );
      }
    }
  }
}
```

## Debugging

Pour voir les indices d'auto-tiling en temps réel :

```typescript
// Activer le mode debug sur une tuile
tile.on('pointerover', () => {
  const index = tile.getData('autotileIndex');
  const bitmask = tile.getData('autotileBitmask');
  console.log(`Tuile (${x}, ${y}) - Index: ${index}, Connexions: ${bitmask}`);
});
```

## Avantages de cette implémentation

✅ **Rétrocompatible** : Fonctionne avec l'ancien format `number[][]` et le nouveau `GridCell[][]`  
✅ **Type-safe** : Entièrement typé en TypeScript  
✅ **Extensible** : Facile d'ajouter le support pour d'autres types de tuiles (herbe, lave, etc.)  
✅ **Robuste** : Gestion des cas limites (bords de carte, cellules undefined)  
✅ **Visualisation** : Système de tints temporaire pour le développement  
✅ **Métadonnées** : Chaque tuile stocke ses infos d'auto-tiling pour debugging

## Notes techniques

- Le bitmasking est calculé **au moment du placement** de la tuile
- Pour mettre à jour dynamiquement, utilisez `updateTileAutotiling`
- Le système ne prend que les **voisins cardinaux** (pas de diagonales dans le 4-bits)
- Pour un système 8-bits avec diagonales, il faudrait 256 configurations au lieu de 16
