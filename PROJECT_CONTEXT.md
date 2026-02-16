# PROJECT_CONTEXT

## En-tête & Stack Technique

- **Framework Web** : Nuxt 4.2.2 (Vue 3.5.26)
- **Backend** : FastAPI (Python 3.x)
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
- **Rendu Centralisé** : Système `RENDER_OFFSETS` pour gérer les points d'ancrage et offsets Y des sprites sans nombres magiques.
- **Sauvegarde** : Persistance locale (LocalStorage) de l'état du joueur et du monde.
- **UI Vue.js Réactive** : HUD complet, fenêtres modales (Inventaire, Crafting, Personnage).

### En Cours (Refactoring Pré-Backend) 🚧
- **Refactoring Architecture** : Découplage de la logique métier (Actuellement dans `MainScene.ts`) vers des Managers dédiés (`InteractionManager`, `TimeManager`).
- **Assets Graphiques** : Utilisation de `TextureGenerator` (Placeholders procéduraux) en attendant les assets finaux.
- **Multijoueur** : Prévu mais non implémenté (Architecture actuelle : Solo Local).
- **Système de Combat** : Non implémenté.

### Polish & Correctifs 🛠️
- **Gameplay Update** : Mode "Fatigue" (Déplacement possible mais lent à 0 énergie).
- **UX Crafting** : Indication visuelle si le joueur est trop loin d'une station requise.
- **Debug Visuel** : Ajout d'un point de pivot rouge (Debug Dot) pour calibrer les offsets.
- **Grille** : Vérification de la désactivation des contours de debug (TextureGenerator).

### Session 1.1 : Polish Visuel & Profondeur (16/02/2026) ✅
- **TileSelector Refactor** : Remplacement de la grille de debug par un **Réticule Isométrique (Losange)** animé (Breathing) et subtil.
- **Z-Sorting Overhaul** : Nouvelle formule de profondeur (`depth = y + (height * 0.5) + (x * 0.001)`) pour les Objets et le Joueur, corrigeant les glitchs de superposition et le Z-fighting.
- **Placement Ghost** : Mise à jour du fantôme de construction pour utiliser la même logique de profondeur, assurant une prévisualisation fidèle.

### Session 1.2 : Standardisation des Entrées (16/02/2026) ✅
- **InputManager** : Création d'un manager centralisé pour capturer les inputs Phaser et émettre des événements sémantiques (`tile-clicked`, `tile-interact`).
- **MainScene Cleanup** : Découplage de la logique de clic directe. Le `pointermove` (Drag Caméra) est désormais géré par InputManager.
- **Player API** : Exposition de `moveTo()` pour faciliter le contrôle externe (ex: Réseau).

### Session 2.1 : Initialisation Backend (16/02/2026) ✅
- **Setup FastAPI** : Initialisation du serveur Python (`backend/main.py`) avec route de status et support préliminaire WebSocket.
- **Modèles de Données** : Définition des structures Pydantic (`backend/models.py`) pour `PlayerState` et `GameState`, miroirs des entités TypeScript.
- **Configuration** : Ajout de `requirements.txt` et configuration CORS pour le frontend (localhost:3000).

### Session 2.2 : Implémentation du WebSocket (16/02/2026) ✅
- **Store Network** : Création de `stores/network.ts` (Connexion, Reconnexion 3s, Error handling).
- **Backend** : Gestionnaire de connexions `ConnectionManager` et endpoint Echo dans `backend/main.py`.
- **UI** : Intégration dans `app.vue` avec indicateur visuel (Online/Offline) et génération d'ID temporaire.

### Session 3.1 : Présence Multijoueur (16/02/2026) ✅
- **Backend** : Gestion des événements `PLAYER_JOINED`, `PLAYER_LEFT` et `CURRENT_PLAYERS` dans `ConnectionManager`.
- **ObjectManager** : Ajout de la gestion des `remotePlayers` (Sprites teintés).
- **Network Store** : Système de callbacks `onMessage` pour découpler la logique.
- **MainScene** : Intégration des événements pour faire apparaître/disparaître les joueurs distants.

### Session 3.2 : Synchronisation des mouvements (16/02/2026) ✅
- **Backend** : Relais des messages `PLAYER_MOVE` -> `PLAYER_MOVED` via `broadcast`.
- **Network Store** : Ajout de l'action `sendMove`.
- **ObjectManager** : Méthode `moveRemotePlayer` avec interpolation (Tween).
- **MainScene** : Envoi de la destination lors du clic de déplacement et mise à jour des positions distantes.

### Session 4.1 : Persistance de l'État du Monde (16/02/2026) ✅
- **Backend** : Création de `GameState` et envoi du message `WORLD_STATE` à la connexion.
- **MainScene** : Réception de l'état du monde et appel au `MapManager`.
- **MapManager** : Désactivation de la génération aléatoire locale et ajout de `populateFromState`.
- **WorldStore** : Ajout de l'action `loadWorldState` (placeholder).

### Session 4.2 : Interaction et Modification du Monde (16/02/2026) ✅
- **Backend** : Gestion de `PLAYER_INTERACT` avec logique toggle (Ajout/Suppression) et broadcast.
- **GameState** : Méthodes `add_resource` et `remove_resource_at`.
- **ObjectManager** : Support des `server_id` et suppression par ID.
- **MainScene** : Clic Droit connecté au `sendInteract`. Réception des updates `RESOURCE_PLACED/REMOVED`.

### Session 5.1 : Persistance du Joueur (16/02/2026) ✅
- **Backend** : Création de `UserManager` et fichier `data/users.json`.
- **App.vue** : Identité persistante via LocalStorage (`haven_player_id`).
- **Sync** : Le serveur envoie `PLAYER_SYNC` à la connexion avec la dernière position connue. Le client se téléporte.
- **MainScene** : Gestion du message `PLAYER_SYNC`.

- **MainScene** : Gestion du message `PLAYER_SYNC`.

### Session 5.2 : Inventaire & Économie de Base (16/02/2026) ✅
- **Backend** : `UserManager` gère maintenant un `wallet` (ressources). Validation des coûts côté serveur.
- **MainScene** : Logique de récolte (+1 bois) et construction (-1 pierre) sécurisée par le serveur.
- **Store** : `playerStore` synchronisé avec le portefeuille serveur via `WALLET_UPDATE`.
- **UI** : Affichage temps réel des ressources (Bois/Pierre) dans le HUD.

---

## Cartographie des Fichiers Clés

### Backend (Python/FastAPI)
- `backend/main.py` : Point d'entrée, WebSocket, Logique de jeu principale.
- `backend/gamestate.py` : État du monde (Ressources).
- `backend/usermanager.py` : Persistance Joueurs (Position, Wallet).
- `backend/data/` : Dossier de stockage JSON.

### Frontend (Nuxt/Vue)
- `stores/network.ts` : Gestion WebSocket (Setup Store).
- `stores/player.ts` : État local joueur + Inventaire Économique.
- `components/GameUI.vue` : HUD principal.
- `game/scenes/MainScene.ts` : Scène Phaser principale.

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
