# Architecture du Projet Haven

## 📁 Structure du Dossier `game/`

```
game/
├── config/
│   └── GameConfig.ts          # Configuration centralisée du jeu
├── entities/
│   └── Player.ts              # Classe du personnage joueur
├── graphics/
│   └── TextureGenerator.ts    # Génération de textures procédurales
├── managers/
│   ├── AmbianceManager.ts     # Gestion des effets d'ambiance
│   ├── ObjectManager.ts       # Gestion des objets (arbres, rochers)
│   ├── PathfindingManager.ts  # Gestion du pathfinding avec diagonales
│   └── TileManager.ts         # Gestion des tuiles de la carte
├── scenes/
│   └── MainScene.ts           # Scène principale du jeu
├── ui/
│   └── TileSelector.ts        # Sélecteur de tuile survolée
└── utils/
    └── IsoMath.ts             # Utilitaires mathématiques isométriques
```

## 🎯 Principe d'Organisation

L'architecture suit les bonnes pratiques de développement de jeux vidéo :

### 1. **Séparation des Responsabilités**
Chaque classe a une responsabilité unique et bien définie :
- `GameConfig` : Centralise toutes les constantes
- `Managers` : Gèrent des aspects spécifiques (pathfinding, objets, etc.)
- `Entities` : Représentent les entités du jeu (joueur, ennemis futurs)
- `UI` : Composants d'interface utilisateur

### 2. **Pattern Manager**
Les managers encapsulent la logique métier :
- **PathfindingManager** : Gère la recherche de chemin avec support diagonal
- **TileManager** : Gère la création et manipulation des tuiles
- **ObjectManager** : Gère les objets interactifs
- **AmbianceManager** : Gère les effets visuels d'ambiance

### 3. **Modularité**
- Facile d'ajouter de nouvelles fonctionnalités
- Facile de tester chaque composant individuellement
- Réutilisable pour d'autres scènes

## 🚀 Nouvelles Fonctionnalités

### ✅ Déplacement Diagonal
Le système de pathfinding utilise maintenant `EasyStar` avec :
- `enableDiagonals()` : Active les déplacements en diagonale
- `disableCornerCutting()` : Empêche de couper les coins pour un mouvement naturel

### ✅ Suppression de la Grille
- Les tuiles d'herbe n'ont plus de contour
- Le sélecteur de tuile reste visible au survol
- Les tuiles de la maison conservent un contour subtil

### ✅ Configuration Centralisée
Toutes les constantes sont dans `GameConfig.ts` :
- Tailles de carte
- Paramètres de mouvement
- Couleurs et paramètres visuels
- Facile à ajuster sans chercher dans le code

## 📝 Comment Ajouter de Nouvelles Fonctionnalités

### Ajouter un Nouveau Type d'Objet
1. Ajouter la texture dans `TextureGenerator.ts`
2. Ajouter la logique dans `ObjectManager.ts`
3. Utiliser dans `MainScene.ts`

### Ajouter un Nouvel Effet Visuel
1. Créer ou modifier dans `AmbianceManager.ts`
2. Appeler depuis `MainScene.ts`

### Modifier les Paramètres du Jeu
1. Éditer `GameConfig.ts`
2. Les changements se propagent automatiquement

## 🎨 Avantages de cette Architecture

1. **Maintenabilité** : Code organisé et facile à comprendre
2. **Évolutivité** : Facile d'ajouter de nouvelles fonctionnalités
3. **Testabilité** : Chaque composant peut être testé indépendamment
4. **Réutilisabilité** : Les managers peuvent être réutilisés dans d'autres scènes
5. **Performance** : Séparation claire entre logique et rendu

## 🔧 Points Techniques

### Gestion Mémoire
- Tous les managers ont une méthode `destroy()`
- Les références sont nettoyées proprement
- Pas de fuites mémoire

### Type Safety
- TypeScript strict
- Interfaces claires
- Documentation JSDoc

### Performance
- Pathfinding optimisé avec EasyStar
- Gestion efficace des objets avec Map
- Profondeur calculée dynamiquement pour le tri isométrique
