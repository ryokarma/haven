# Schéma Visuel des 16 Configurations d'Auto-Tiling

Ce document présente visuellement les 16 configurations possibles du bitmasking 4-bits.

Légende :
- █ = Tuile d'eau
- ░ = Tuile de terre/vide
- ● = Tuile actuelle (celle dont on calcule l'index)

---

## Index 0 (0000) - Isolée
```
░ ░ ░
░ ● ░
░ ░ ░
```
Bitmask : 0 (Aucune connexion)
Couleur placeholder : #1a1a2e

---

## Index 1 (0001) - Nord
```
░ █ ░
░ ● ░
░ ░ ░
```
Bitmask : N (1)
Couleur placeholder : #16213e

---

## Index 2 (0010) - Est
```
░ ░ ░
░ ● █
░ ░ ░
```
Bitmask : E (2)
Couleur placeholder : #0f3460

---

## Index 3 (0011) - Nord + Est
```
░ █ ░
░ ● █
░ ░ ░
```
Bitmask : N+E (1+2=3)
Couleur placeholder : #533483

---

## Index 4 (0100) - Sud
```
░ ░ ░
░ ● ░
░ █ ░
```
Bitmask : S (4)
Couleur placeholder : #6d597a

---

## Index 5 (0101) - Nord + Sud (Vertical)
```
░ █ ░
░ ● ░
░ █ ░
```
Bitmask : N+S (1+4=5)
Couleur placeholder : #b56576
**Configuration de canal vertical**

---

## Index 6 (0110) - Est + Sud
```
░ ░ ░
░ ● █
░ █ ░
```
Bitmask : E+S (2+4=6)
Couleur placeholder : #e56b6f

---

## Index 7 (0111) - Nord + Est + Sud
```
░ █ ░
░ ● █
░ █ ░
```
Bitmask : N+E+S (1+2+4=7)
Couleur placeholder : #eaac8b
**T-junction orienté vers la droite**

---

## Index 8 (1000) - Ouest
```
░ ░ ░
█ ● ░
░ ░ ░
```
Bitmask : W (8)
Couleur placeholder : #355070

---

## Index 9 (1001) - Nord + Ouest
```
░ █ ░
█ ● ░
░ ░ ░
```
Bitmask : N+W (1+8=9)
Couleur placeholder : #6d5d6e

---

## Index 10 (1010) - Est + Ouest (Horizontal)
```
░ ░ ░
█ ● █
░ ░ ░
```
Bitmask : E+W (2+8=10)
Couleur placeholder : #393e46
**Configuration de canal horizontal**

---

## Index 11 (1011) - Nord + Est + Ouest
```
░ █ ░
█ ● █
░ ░ ░
```
Bitmask : N+E+W (1+2+8=11)
Couleur placeholder : #00adb5
**T-junction orienté vers le haut**

---

## Index 12 (1100) - Sud + Ouest
```
░ ░ ░
█ ● ░
░ █ ░
```
Bitmask : S+W (4+8=12)
Couleur placeholder : #f4eea9

---

## Index 13 (1101) - Nord + Sud + Ouest
```
░ █ ░
█ ● ░
░ █ ░
```
Bitmask : N+S+W (1+4+8=13)
Couleur placeholder : #ffcfdf
**T-junction orienté vers la gauche**

---

## Index 14 (1110) - Est + Sud + Ouest
```
░ ░ ░
█ ● █
░ █ ░
```
Bitmask : E+S+W (2+4+8=14)
Couleur placeholder : #fefdca
**T-junction orienté vers le bas**

---

## Index 15 (1111) - Toutes directions (Centre)
```
░ █ ░
█ ● █
░ █ ░
```
Bitmask : N+E+S+W (1+2+4+8=15)
Couleur placeholder : #e4f9f5
**Tuile centrale entourée d'eau**

---

## Patterns Importants

### Coins Intérieurs (Inner Corners)
- Index 3 : Coin Nord-Est
- Index 6 : Coin Sud-Est
- Index 9 : Coin Nord-Ouest
- Index 12 : Coin Sud-Ouest

### Bords Droits
- Index 1 : Bord Nord
- Index 2 : Bord Est
- Index 4 : Bord Sud
- Index 8 : Bord Ouest

### Canaux
- Index 5 : Canal vertical (N↔S)
- Index 10 : Canal horizontal (E↔W)

### T-Junctions
- Index 7 : T vers droite (➤)
- Index 11 : T vers haut (⬆)
- Index 13 : T vers gauche (⬅)
- Index 14 : T vers bas (⬇)

### Spéciaux
- Index 0 : Tuile isolée (îlot)
- Index 15 : Tuile centrale (océan intérieur)

---

## Application aux Assets Graphiques

Lorsque vous créerez vos assets, voici comment organiser votre spritesheet :

```
water_tileset.png (frame size: 64x64)

+----+----+----+----+
| 0  | 1  | 2  | 3  |  Frame 0-3   : 0000-0011
+----+----+----+----+
| 4  | 5  | 6  | 7  |  Frame 4-7   : 0100-0111
+----+----+----+----+
| 8  | 9  | 10 | 11 |  Frame 8-11  : 1000-1011
+----+----+----+----+
| 12 | 13 | 14 | 15 |  Frame 12-15 : 1100-1111
+----+----+----+----+
```

Ensuite, dans votre code :
```typescript
// Au lieu de setTint()
tile.setFrame(autotileIndex);

// Ou avec des textures séparées
const waterTextures = [
  'water_0', 'water_1', 'water_2', ... 'water_15'
];
tile.setTexture(waterTextures[autotileIndex]);
```

---

## Exemple Concret : Une Rivière

Imaginons une rivière horizontale de 5 tuiles de large :

```
Ligne Y=9  : ░ ░ ░ ░ ░
Ligne Y=10 : █ █ █ █ █
Ligne Y=11 : ░ ░ ░ ░ ░

Indices calculés pour Y=10 :
X=0 : Index 2  (E uniquement)
X=1 : Index 10 (E+W)
X=2 : Index 10 (E+W)
X=3 : Index 10 (E+W)
X=4 : Index 8  (W uniquement)
```

Visuel avec les connexions :
```
  ░   ░   ░   ░   ░
  ●→━━●━━━●━━━●━━←●
  ░   ░   ░   ░   ░
  2  10  10  10   8
```

---

## Algorithme de Calcul (Pseudo-code)

```
function calculateAutotile(x, y, grid):
  bitmask = 0
  
  # Vérifier Nord
  if grid[y-1][x] == WATER:
    bitmask |= 1
  
  # Vérifier Est
  if grid[y][x+1] == WATER:
    bitmask |= 2
  
  # Vérifier Sud
  if grid[y+1][x] == WATER:
    bitmask |= 4
  
  # Vérifier Ouest
  if grid[y][x-1] == WATER:
    bitmask |= 8
  
  return bitmask  # 0-15
```

---

## Conseils pour le Design Graphique

1. **Coins** (Index 0, 3, 6, 9, 12) : Dessinez des bords arrondis
2. **Bords** (Index 1, 2, 4, 8) : Bord franc d'un côté, eau de l'autre
3. **Canaux** (Index 5, 10) : Eau coulante dans une direction
4. **T-Junctions** (Index 7, 11, 13, 14) : Intersection en T
5. **Centre** (Index 15) : Eau pure sans bord visible
6. **Isolé** (Index 0) : Petite flaque ou îlot d'eau

Pour un rendu encore plus beau, considérez :
- Animations de vagues (superposer une animation à la tuile statique)
- Variations aléatoires pour chaque index (ex : 3 versions de l'index 10)
- Reflets et brillances
- Transitions diagonales (nécessite un système 8-bits)

---

## Debugging : Visualisation en Console

Ajoutez ce code pour voir votre carte :
```typescript
function visualizeAutotiling(gridData: GridCell[][], maxSize = 20) {
  console.log('╔' + '═'.repeat(maxSize * 3) + '╗');
  
  for (let y = 0; y < Math.min(maxSize, gridData.length); y++) {
    let line = '║ ';
    
    for (let x = 0; x < Math.min(maxSize, gridData[0].length); x++) {
      if (gridData[y][x].type === TileType.WATER) {
        const idx = calculateAutotile(x, y, gridData);
        line += idx.toString(16).toUpperCase() + ' ';
      } else {
        line += '· ';
      }
    }
    
    console.log(line + '║');
  }
  
  console.log('╚' + '═'.repeat(maxSize * 3) + '╝');
}
```

Résultat exemple :
```
╔════════════════════════════════╗
║ · · · · · · · · · · · · · · · ║
║ · · 3 A A 6 · · · · · · · · · ║
║ · · 5 F F 5 · · · · · · · · · ║
║ · · 5 F F 5 · · · · · · · · · ║
║ · · 9 E E C · · · · · · · · · ║
║ · · · · · · · · · · · · · · · ║
╚════════════════════════════════╝
```

Légende hexadécimale :
- 0-9 : Indices 0-9
- A-F : Indices 10-15 (A=10, B=11, C=12, D=13, E=14, F=15)
