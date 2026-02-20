# PROJECT_CONTEXT — Haven

> **État du projet : MVP Fonctionnel (Alpha 0.1)**
> Dernière mise à jour : 20/02/2026

---

## 🏗️ Architecture

| Couche       | Technologie                      | Rôle                                   |
|--------------|----------------------------------|-----------------------------------------|
| **Frontend** | Nuxt 4 (Vue 3) + Phaser 3       | Rendu isométrique, UI réactive          |
| **State**    | Pinia                            | Stores partagés (Player, World, Build)  |
| **Styling**  | Tailwind CSS                     | UI HUD, Fenêtres modales               |
| **Transport**| WebSockets                       | Communication temps réel bidirectionnelle|
| **Backend**  | FastAPI (Python)                 | Logique serveur, validation, persistance|
| **Persistence**| Fichiers JSON                  | Sauvegarde joueurs & monde              |

---

## ✅ Features Terminées

### Moteur Isométrique & Rendering
- Grille isométrique avec conversion de coordonnées (`IsoMath`).
- Génération procédurale de carte (Perlin Noise : Herbe, Eau, Ressources).
- Z-Sorting dynamique (profondeur calculée `y + height/2 + x*0.001`).
- Système `RENDER_OFFSETS` centralisé pour les sprites.
- Cycle Jour/Nuit avec teintes dynamiques et lumières (lucioles, feux de camp).
- Réticule isométrique animé (Breathing).

### Multijoueur Temps Réel
- Connexion WebSocket avec reconnexion automatique (3s).
- Synchronisation des mouvements (Broadcast `PLAYER_MOVED`, Tween interpolation).
- Gestion de présence (`PLAYER_JOINED`, `PLAYER_LEFT`, `CURRENT_PLAYERS`).
- Sprites teintés pour les joueurs distants.

### Social
- Chat global en temps réel (`PLAYER_CHAT` → `CHAT_MESSAGE`).
- Bulles de dialogue au-dessus des joueurs (Pop-in/Fade-out).
- Texte flottant pour le feedback visuel (+1 Bois, -2 Pierre).

### Économie & Inventaire
- Wallet serveur persistant (Bois, Pierre).
- Transactions atomiques validées côté serveur (`UserManager.update_wallet`).
- Récolte : Clic droit sur un arbre/rocher → Gain de ressource + `WALLET_UPDATE`.
- UI HUD avec affichage permanent des ressources.

### Construction
- Système de recettes backend (`BUILD_RECIPES` dans `recipes.py`).
- Barre d'outils (`BuildToolbar.vue`) avec sélection d'items et infobulles de coût.
- Ghost de prévisualisation (Semi-transparent, suit la souris).
- Feedback collision : Ghost rouge si case occupée, vert si libre.
- Validation serveur : Vérification coûts + collisions. Remboursement si race condition.
- Support des types `obstacle` (Bloque mouvement) et `floor` (Traversable, Z=1).

### Persistance
- `UserManager` : Position + Wallet sauvegardés dans `backend/data/users.json`.
- `GameState` : Ressources du monde en mémoire (10 ressources de test au démarrage).
- Identité joueur persistante via `localStorage` (`haven_player_id`).

### Système de Survie (Local)
- Jauges : Santé, Énergie, Faim, Soif avec dégradation temporelle.
- Mode fatigue : Déplacement ralenti à 0 énergie.
- Inventaire local avec équipement (Main, Tête, Corps, Accessoire).
- Crafting local avec recettes et stations de travail requises.

---

## 📡 Protocole WebSocket

### Client → Serveur
| Message          | Payload                    | Description                    |
|------------------|----------------------------|--------------------------------|
| `PLAYER_MOVE`    | `{ x, y }`                | Destination de déplacement     |
| `PLAYER_INTERACT`| `{ x, y }`                | Récolte / Interaction          |
| `PLAYER_BUILD`   | `{ x, y, itemId }`        | Construction d'un objet        |
| `PLAYER_CHAT`    | `{ text }`                 | Message de chat                |

### Serveur → Client
| Message            | Données                           | Description                      |
|--------------------|-----------------------------------|----------------------------------|
| `PLAYER_SYNC`      | `{ payload: userData }`           | Synchro initiale joueur          |
| `WORLD_STATE`      | `{ payload: { resources } }`      | Synchro initiale monde           |
| `CURRENT_PLAYERS`  | `{ players: [ids] }`             | Liste des joueurs connectés      |
| `PLAYER_JOINED`    | `{ id }`                         | Nouveau joueur                   |
| `PLAYER_LEFT`      | `{ id }`                         | Joueur déconnecté                |
| `PLAYER_MOVED`     | `{ id, x, y }`                   | Mouvement d'un autre joueur      |
| `WALLET_UPDATE`    | `{ payload: wallet }`            | Mise à jour du portefeuille      |
| `RESOURCE_PLACED`  | `{ resource: { id, type, asset, x, y } }` | Objet placé dans le monde |
| `RESOURCE_REMOVED` | `{ id, x, y }`                   | Objet supprimé du monde          |
| `CHAT_MESSAGE`     | `{ sender, text, timestamp }`    | Message de chat reçu             |
| `ERROR`            | `{ message }`                    | Erreur serveur (Fonds, Collision)|

---

## 📁 Cartographie des Fichiers Clés

### Backend (Python/FastAPI)
| Fichier                   | Rôle                                                                 |
|---------------------------|----------------------------------------------------------------------|
| `backend/main.py`         | Point d'entrée. WebSocket endpoint. Routeur de messages.             |
| `backend/gamestate.py`    | État du monde. CRUD ressources. Validation collisions.               |
| `backend/usermanager.py`  | Persistance joueurs. Position + Wallet. Transactions.                |
| `backend/recipes.py`      | Dictionnaire des recettes de construction et coûts.                  |
| `backend/data/users.json` | Sauvegarde JSON des joueurs.                                         |

### Frontend — Stores (Pinia)
| Fichier              | Rôle                                                            |
|----------------------|-----------------------------------------------------------------|
| `stores/network.ts`  | Connexion WebSocket. Envoi/Réception. Dispatch callbacks.       |
| `stores/player.ts`   | État joueur local. Inventaire. Stats. Équipement.               |
| `stores/world.ts`    | État monde local. Temps. Seed.                                  |
| `stores/build.ts`    | État de construction. Item sélectionné.                         |
| `stores/chat.ts`     | Historique des messages de chat.                                |

### Frontend — Game (Phaser)
| Fichier                            | Rôle                                                    |
|------------------------------------|---------------------------------------------------------|
| `game/scenes/MainScene.ts`        | Scène principale. Orchestre managers + boucle de jeu.   |
| `game/entities/Player.ts`         | Contrôleur joueur. Sprite, Animation, Mouvement.        |
| `game/managers/MapManager.ts`     | Grille, génération, `occupiedTiles`, `isTileOccupied`.  |
| `game/managers/ObjectManager.ts`  | Sprites monde. Z-sorting. Joueurs distants.             |
| `game/managers/TileManager.ts`    | Rendu tuiles de sol. Auto-tiling eau.                   |
| `game/managers/InputManager.ts`   | Capture inputs Phaser → Événements sémantiques.         |
| `game/managers/AmbianceManager.ts`| Cycle Jour/Nuit. Particules. Lumières.                  |
| `game/utils/IsoMath.ts`           | Conversion coordonnées Grille ↔ Isométrique.            |
| `game/config/GameConfig.ts`       | Constantes globales (Taille carte, couleurs, timings).  |

### Frontend — UI (Vue)
| Fichier                        | Rôle                                        |
|--------------------------------|---------------------------------------------|
| `components/GameUI.vue`        | HUD principal. Stats, Inventory, Boutons.   |
| `components/BuildToolbar.vue`  | Barre de construction (Curseur, Items).     |
| `components/CraftingWindow.vue`| Interface de craft. Recettes.               |
| `components/ChatWidget.vue`    | Widget de chat flottant.                    |

---

## 🚧 Prochaines Étapes

1. **Base de données SQL** : Remplacer les fichiers JSON par SQLite/PostgreSQL.
2. **Housing** : Zones privées par joueur (Claim de terrain).
3. **Système de Combat** : Tour par tour ou temps réel simplifié.
4. **Assets Graphiques** : Remplacer les placeholders procéduraux par des sprites finaux.
5. **Persistance Monde** : Sauvegarder `GameState.resources` dans un fichier JSON.
6. **Sécurité** : Rate limiting WebSocket, validation des inputs.

---

## 📝 Directives pour l'IA

1. **Refactoring** : Ne jamais ajouter de logique métier dans `MainScene.ts`. Utiliser/créer un Manager.
2. **Typage** : TypeScript strict. Toujours typer retours et props.
3. **UI vs Canvas** : Interfaces utilisateur en Vue+Tailwind. Canvas uniquement pour le rendu monde.
4. **SSR Safety** : Tout code Phaser dans `<ClientOnly>`. Vérifier `window` si nécessaire.
5. **Protocole** : Le backend est l'autorité finale. Le client ne doit jamais modifier l'état du monde sans validation serveur.
6. **Mémoire** : Toujours cleanup `.off()` et `.destroy()` les objets Phaser.

---

## 📜 Journal des Sessions

| Session | Date       | Description                                      |
|---------|------------|--------------------------------------------------|
| 1.1     | 16/02/2026 | Polish Visuel & Profondeur (Z-Sorting)           |
| 1.2     | 16/02/2026 | Standardisation des Entrées (InputManager)       |
| 2.1     | 16/02/2026 | Initialisation Backend FastAPI                   |
| 2.2     | 16/02/2026 | Implémentation WebSocket                         |
| 3.1     | 16/02/2026 | Présence Multijoueur                             |
| 3.2     | 16/02/2026 | Synchronisation des Mouvements                   |
| 4.1     | 16/02/2026 | Persistance de l'État du Monde                   |
| 4.2     | 16/02/2026 | Interaction et Modification du Monde             |
| 5.1     | 16/02/2026 | Persistance du Joueur (UserManager)              |
| 5.2     | 17/02/2026 | Inventaire & Économie de Base                    |
| 6.1     | 17/02/2026 | Système de Chat Global                           |
| 6.2     | 17/02/2026 | Feedback Visuel & Immersion                      |
| 7.1     | 17/02/2026 | Barre d'Outils de Construction                   |
| 7.2     | 17/02/2026 | Règles de Construction & Collisions              |
| 7.3     | 17/02/2026 | Sols et Gestion des Calques                      |
| **MVP** | 17/02/2026 | **Stabilisation MVP — Refonte Backend complète** |
| 8.1     | 19/02/2026 | Fix du crash MainScene (Pinia state) et nettoyage des listeners |
| 8.2     | 20/02/2026 | Rétablissement du rendu des objets via la synchronisation Server->Client |
