# PROJECT_CONTEXT

## En-tête & Stack Technique

- **Framework Web** : Nuxt 4.2.2 (Vue 3.5.26)
- **Moteur de Jeu** : Phaser 3.90.0
- **State Management** : Pinia 0.11.3 (via @pinia/nuxt)
- **Styling** : Tailwind CSS 6.14.0 (via @nuxtjs/tailwindcss)
- **Pathfinding** : easystarjs 0.4.4
- **Langage** : TypeScript (Strict Mode)

### Concept du Jeu
Un **Jeu de Survie Isométrique Social (Hub)** mélangeant mécanique de crafting, cycle jour/nuit et gestion de ressources (Faim, Soif, Énergie). Le joueur évolue dans un monde généré procéduralement, construit sa base et cultive des ressources (Coton, Argile).

---

## État d'avancement (Features Implémentées)

### Fonctionnel ✅
- **Moteur Isométrique** : Système de grille, conversion de coordonnées (IsoMath), et rendu de tuiles procédurales.
- **Génération de Carte** : Algorithme procédural (Herbe, Eau, Ressources : Arbres, Rochers, Argile, Coton).
- **Déplacement du Joueur** : Point-and-click avec pathfinding (EasyStar), gestion des collisions.
- **Cycle Jour/Nuit** : Système d'ambiance visuelle dynamique (teinte globale, lucioles, lumières).
- **Système de Survie** : Gestion complète des jauges (Santé, Énergie, Faim, Soif) avec dégradation temporelle.
- **Inventaire & Crafting** :
  - Stockage d'items, équipement (Main, Tête, Corps, Accessoire).
  - Système de recettes (Ingrédients -> Résultat).
  - Gestion des stations de travail (Four, Établi) requises pour crafter.
- **Agriculture (Farming)** : Cycle complet de la plante (Graine -> Pousse -> Mature -> Récolte) avec arrosage.
- **Construction** : Mode placement d'objets (Fantôme de prévisualisation, validation de grille).
- **Sauvegarde** : Persistance locale (LocalStorage) de l'état du joueur et du monde.
- **UI Vue.js Réactive** : HUD complet, fenêtres modales (Inventaire, Crafting, Personnage).

### En Cours / À Améliorer 🚧
- **Refactoring Architecture** : Découplage de la logique métier (Actuellement dans `MainScene.ts`) vers des Managers dédiés (`InteractionManager`, `TimeManager`).
- **Assets Graphiques** : Utilisation de `TextureGenerator` (Placeholders procéduraux) en attendant les assets finaux.
- **Multijoueur** : Prévu mais non implémenté (Architecture actuelle : Solo Local).
- **Système de Combat** : Non implémenté.

---

## Cartographie des Fichiers Clés

### Core & Configuration
- `/nuxt.config.ts` : Configuration du projet (Modules Pinia, Tailwind, Build Phaser/Vite).
- `/app.vue` : Point d'entrée de l'application Nuxt. Contient le `<GameCanvas />` wrappé dans `<ClientOnly>`.
- `/game/config/GameConfig.ts` : **Single Source of Truth** pour les constantes (Taille map, couleurs, timings, règles gameplay).
- `/game/config/ItemRegistry.ts` : Définitions des propriétés des items (types d'outils, slots d'équipement).
- `/game/utils/IsoMath.ts` : Bibliothèque utilitaire critique pour la conversion de coordonnées (Grille <-> Isométrique).

### Gestion de l'État (Pinia)
- `/stores/player.ts` : Cœur de la logique métier joueur. Gère l'inventaire, les stats, l'équipement et les actions (craft, consume).
- `/stores/world.ts` : État global du monde (Temps, Seed, Météo).

### Moteur de Jeu (Phaser)
- `/components/GameCanvas.vue` : **Bridge Vue <-> Phaser**. Initialise l'instance `Phaser.Game` et gère son cycle de vie (Mount/Unmount).
- `/game/scenes/MainScene.ts` : Scène principale. Orchestre les Managers, la boucle de jeu (`update`), et les inputs. **(Doit être allégée via Refactoring)**.
- `/game/entities/Player.ts` : Contrôleur visuel du joueur (Sprite, Animation, Mouvement interpolé).

### Managers (Logique Métier)
- `/game/managers/MapManager.ts` : Gère les données de la grille (`gridData`), la génération procédurale et les mises à jour de tuiles.
- `/game/managers/ObjectManager.ts` : Gère le cycle de vie des GameObjects Phaser (Sprites des ressources/constructions).
- `/game/managers/TileManager.ts` : Gère le rendu des tuiles de sol (Images isométriques).
- `/game/managers/AmbianceManager.ts` : Gère les effets visuels globaux (Lumière, Particules d'ambiance).
- `/game/managers/InteractionManager.ts` : **(Cible Refactor)** Gère la logique des clics, conditions de récolte et placement.

### UI (Vue Components)
- `/components/GameUI.vue` : HUD Principal (Barres de stats, Chat, Boutons rapides).
- `/components/CraftingWindow.vue` : Interface de craft (Liste recettes, validation ingrédients).
- `/components/CharacterWindow.vue` : Interface d'équipement.

---

## Architecture des Données

1.  **Single Source of Truth** : Le Store Pinia (`player.ts`, `world.ts`) détient l'état réel du jeu.
2.  **Rendu Réactif** :
    - **Phaser** lit le store pour positionner les entités et appliquer les teintes (ex: update couleur joueur).
    - **Vue** lit le store pour afficher l'UI (Inventaire, Stats).
3.  **Flux d'Actions** :
    - Inputs Utilisateur (Phaser Click) -> `InteractionManager` -> Appelle Action Pinia (ex: `playerStore.addItem`).
    - Feedback Visuel -> Pinia met à jour `lastActionFeedback` -> Watcher dans `GameCanvas.vue` -> Affiche un Floating Text Phaser.
4.  **Persistance** : `SaveManager` sérialise les stores Pinia et les données de MapManager vers LocalStorage.

---

## Notes pour l'IA Future (Directives)

1.  **Priorité au Refactoring** : Ne jamais ajouter de logique métier complexe directement dans `MainScene.ts`. Créer ou étendre un Manager dans `/game/managers/`.
2.  **Typage Strict** : Toujours typer les retours de fonctions et les props Vue. Utiliser les interfaces définies dans les stores ou configs.
3.  **UI vs Canvas** :
    - Toujours utiliser **Tailwind CSS + Vue** pour les interfaces utilisateur (Menus, Dialogues, HUD).
    - Phaser ne doit servir qu'au rendu du monde (Canvas). Ne jamais injecter de HTML via Phaser.
4.  **SSR Safety** : Tout code Phaser doit être exécuté côté client uniquement. Utiliser `<ClientOnly>` dans les templates Vue et vérifier `window` si nécessaire dans les scripts.
5.  **Assets** : Continuer d'utiliser `TextureGenerator` pour les nouveaux éléments graphiques tant que des assets externes ne sont pas fournis.
6.  **Gestion de la Mémoire** : Toujours nettoyer les événements (`.off`) et détruire les objets Phaser dans les méthodes `shutdown` ou `destroy`.
