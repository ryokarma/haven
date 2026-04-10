# PROJECT_CONTEXT — Haven

> **État du projet : MVP Fonctionnel (Alpha 0.1)**
> Dernière mise à jour : 10/04/2026

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
- `GameState` : Génération procédurale riche côté serveur (seed=42, grille 100x100 : ~2700 ressources).
- Types générés : `tree` (10%), `rock` (5%), `cotton_bush` (4%), `clay_node` (3%), `apple_tree` (2%).
- Index spatial `_spatial_index` pour les lookups O(1) lors des interactions.
- Identité joueur persistante via `localStorage` (`haven_player_id`).

### Système de Survie (Local)
- Jauges : Santé, Énergie, Faim, Soif avec dégradation temporelle.
- Mode fatigue : Déplacement ralenti à 0 énergie.
- Inventaire local avec équipement (Main, Tête, Corps, Accessoire).
- Crafting local avec recettes et stations de travail requises.

---

## 📡 Protocole WebSocket

### Client → Serveur
| Message               | Payload                    | Description                    |
|-----------------------|----------------------------|--------------------------------|
| `PLAYER_MOVE`         | `{ x, y }`                | Destination de déplacement     |
| `PLAYER_INTERACT`     | `{ x, y }`                | Récolte / Interaction (Legacy) |
| `ACTION_HARVEST`      | `{ resource_id, tool }`  | Demande explicite de récolte (tool = toolType équipé) |
| `PLAYER_BUILD`        | `{ x, y, itemId }`        | Construction d'un objet        |
| `PLAYER_CHAT`         | `{ text }`                 | Message de chat                |
| `REQUEST_WORLD_STATE` | `{}`                       | Handshake : demande l'état du monde (envoyé quand la scène est prête) |
| `REQUEST_TRAVEL`   | `{ target_map_id }`              | Demande de voyage inter-cartes |

### Serveur → Client
| Message            | Données                           | Description                      |
|--------------------|-----------------------------------|----------------------------------|
| `PLAYER_SYNC`      | `{ payload: userData }`           | Synchro initiale joueur (auto à la connexion) |
| `WORLD_STATE`      | `{ payload: { resources } }`      | Synchro monde (en réponse à `REQUEST_WORLD_STATE`) |
| `CURRENT_PLAYERS`  | `{ players: [ids] }`             | Liste des joueurs connectés      |
| `PLAYER_JOINED`    | `{ id }`                         | Nouveau joueur                   |
| `PLAYER_LEFT`      | `{ id }`                         | Joueur déconnecté                |
| `PLAYER_MOVED`     | `{ id, x, y }`                   | Mouvement d'un autre joueur      |
| `WALLET_UPDATE`    | `{ payload: wallet }`            | Mise à jour du portefeuille      |
| `RESOURCE_PLACED`  | `{ resource: { id, type, asset, x, y } }` | Objet placé dans le monde |
| `RESOURCE_REMOVED` | `{ id, x, y }`                   | Objet supprimé du monde          |
| `CHAT_MESSAGE`     | `{ sender, text, timestamp }`    | Message de chat reçu             |
| `ERROR`            | `{ message }`                    | Erreur serveur (Fonds, Collision)|
| `MAP_CHANGED`      | `{ map_id, map_width, map_height }` | Changement de map côté serveur — déclenche le reset du worldStore et l'attente du WORLD_STATE |

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
| 8.3     | 20/02/2026 | Implémentation du Handshake REQUEST_WORLD_STATE pour corriger la Race Condition au chargement des objets |
| 8.4     | 20/02/2026 | Migration de la génération procédurale riche (Arbres, Rochers, Coton, Argile, Pommiers) vers le Backend Python et mapping des placeholders visuels |
| 9.1     | 20/02/2026 | Création boucle ACTION_HARVEST (Client -> Serveur) et validation distance + loot |
| 9.2     | 20/02/2026 | Synchronisation du Wallet (Serveur -> Pinia) et ajout des textes flottants de récolte in-game |
| 9.3     | 21/02/2026 | Fix du Lag (Diffing au lieu de Re-render complet), attente de fin de pathfinding pour récolter, et logique spécifique pour les pommiers |
| **9.4** | **22/02/2026** | **Grand Nettoyage & Deep Polish** — (1) Fix Rubberbanding : PLAYER_SYNC ignoré pendant le mouvement. (2) Z-Sorting unifié : formule depth cohérente Player/Objets. (3) Récolte fixée : sendMove envoie coords GRILLE (plus ISO), fix mismatch distance serveur + ajout alias clay_node. (4) Apple_tree ancré au sol (originY 0.82→0.95). (5) Ressources hors eau : Perlin côté serveur (perlin.py) filtre les tuiles d'eau lors de la génération. Debug dots désactivés. |
| 9.5 | 22/02/2026 | Résolution des spawns de ressources sur l'eau (synchronisation via LCG déterministe) et réparation du flux de récolte avec validation des outils équipés (transmission au serveur) |
| 9.6 | 22/02/2026 | Alignement des IDs d'outils (Front/Back) pour la récolte et ajout de feedbacks visuels en cas de rejet d'action par le serveur |
| 9.7 | 23/02/2026 | Fix du pathfinding de récolte : gestion des cibles solides et déclenchement immédiat (sans mouvement) si le joueur est adjacent, plus feedback local si la distance est trop grande |
| 9.8 | 23/02/2026 | Audit Fullstack : Fix de la race condition double-fire (gameobjectup/pointerup), restauration du pathfinding adjacent pour les cibles solides, typage strict des payloads réseau et ajout de logs de debug sur toute la chaîne |
| 10.0 | 23/02/2026 | **Bloc 10 : Multijoueur Visuel** — Transmission des coordonnées lors de la connexion, interpolation fluide des mouvements (Tweens) des joueurs distants, et mise à jour dynamique du Z-Sorting. |
| 11.0 | 23/02/2026 | **Bloc 11 : Transformation (Crafting Autoritaire)** — Validation backend des composants, déduction transactionnelle `wallet` et propagation des objets craftés via `CRAFT_SUCCESS`. Remplacement des clés génériques Fronend par celles du Backend (`wood`, `stone`). |
| 12.0 | 23/02/2026 | **Bloc 12 : L'Empreinte (Housing & Persistance)** — Implémentation de `ACTION_PLACE` centralisé côté serveur avec vérification d'inventaire (`UserManager`), diffusion globale via `RESOURCE_PLACED`, et sauvegarde/restauration persistante de l'état du monde (`world.json`) par le `GameState`. |
| 10.2 | 24/02/2026 | Fix du Multijoueur : Handshake de présence (Join/Leave), génération d'UUID strict et rendu des sprites distants |
| 10.3 | 24/02/2026 | Fix du Rendu Multijoueur : Conversion isométrique des coordonnées des autres joueurs, Z-Sorting et instanciation des sprites distants |
| 10.4 | 25/02/2026 | Fix du Multijoueur : Envoi de la PLAYERS_LIST au démarrage pour afficher les joueurs déjà connectés après un rechargement de page |
| 13.0 | 25/02/2026 | Migration PostgreSQL : Création de database.py, modèles SQLAlchemy (User, WorldItem) et préparation de l'API. |
| 14.0 | 25/02/2026 | Architecture Multi-Maps : Refactoring du GameState en Rooms, isolation du broadcast WebSocket par map, et création de ACTION_CHANGE_MAP. |
| 14.1 | 25/02/2026 | Fix BDD : Pivot vers SQLite asynchrone (aiosqlite) pour l'environnement de développement local, création automatique des tables au démarrage de FastAPI. |
| 15.0 | 26/02/2026 | Transition Multi-Maps Frontend : Ajout UI de voyage, écoute du MAP_STATE pour reset complet de la scène Phaser (nettoyage ObjectManager, redessin MapManager). |
| 16.0 | 26/02/2026 | Génération Housing : Séparation de la génération backend (Farm procédural vs Housing plat 30x30), adaptation des limites de la caméra Phaser et recalibrage du point de spawn lors du voyage. |
| 16.1 | 02/03/2026 | Hotfix Transition Map : Implémentation du "Clean Slate" (vidage des stores Pinia et destruction stricte des sprites Phaser via clear(true,true)) pour éviter la superposition des mondes. |
| 16.2 | 02/03/2026 | Fix Définitif Transition : Implémentation du nettoyage profond de la scène Phaser (destruction stricte des GameObjects ou Scene.restart()) pour corriger le state leakage inter-maps. |
| 16.3 | 02/03/2026 | Option Nucléaire : Remplacement du nettoyage manuel par `scene.restart()`. Phaser détruit tout et rappelle `create()` avec le store Pinia pré-chargé. Suppression du watcher Vue, détection transition vs premier chargement via `mapChangedSignal`. |
| 16.4 | 02/03/2026 | Rollback Multi-Maps : Abandon temporaire du routage multi-maps pour des raisons de stabilité. Sécurisation des méthodes de destruction (Null checks dans TileManager et ObjectManager) et retour imposé à la map unique 100x100 (`farm_main`). |
| 17.0 | 02/03/2026 | Refonte Visuelle : Import des nouveaux assets graphiques, nettoyage du preloader, mise à jour des clés de textures dans les Managers et recalibrage des points d'ancrage isométriques (setOrigin). |
| 17.1 | 02/03/2026 | Polish Isométrique : Correction des artefacts d'escalier via Math.round() et ajustement des dimensions IsoMath. Alignement strict des objets avec setOrigin(0.5, 1) calé sur le bord inférieur des tuiles. |
| 17.2 | 03/03/2026 | Intégration Graphique Massive : Éradication des placeholders procéduraux. Remplacement par des PNG 100% aléatoires (5 herbes, 3 eaux, multiples arbres, rochers, plantations). Refactoring du TileManager et de l'ObjectManager pour attribuer dynamiquement les textures. |
| 17.3 | 03/03/2026 | Remboursement Dette Technique : Suppression complète de la maison temporaire codée en dur (génération) et de sa logique de transparence (Alpha Tweening sous le toit) pour préparer le vrai système de Housing modulaire. |
| 18.0 | 03/03/2026 | Polish Gameplay : Ancrage isométrique du sprite Player (setOrigin 0.5, 1) et implémentation du Pathfinding local pour les joueurs distants afin d'éviter la traversée d'obstacles lors de l'interpolation. |
| 18.1 | 03/03/2026 | Hotfix Visuel : Ajout d'un PLAYER_VISUAL_OFFSET_Y pour compenser l'espace transparent du sprite joueur et forcer l'ancrage visuel des pieds sur la grille isométrique sans altérer les coordonnées logiques. |
| 18.2 | 04/03/2026 | Fix UI : Hiérarchie stricte des Z-index (GameCanvas `z-0`, UI persistant `z-10`, Modales `z-50`). Blocage de la propagation des clics vers Phaser via `@click.stop` sur tous les conteneurs Tailwind d'interface. Ajout de la fermeture des modales par clic à l'extérieur sans mouvement du personnage (`@click.self`, `@mousedown.self.stop`). |
| 18.3 | 04/03/2026 | Refonte UI/Hotbar : Disparition de la `BuildToolbar` codée en dur (et nettoyage du vieux `PLAYER_BUILD` dans le réseau) au profit d'une vraie Hotbar dynamique (9 slots) lisant l'inventaire dans `PlayerStore`. Le clic sur un item l'équipe silencieusement (pour les outils/récolte Phaser) ou active le `placementMode` si c'est une ressource de construction. |
| 18.4 | 04/03/2026 | Polissage Chat : Restauration de l'interface de chat textuel (`ChatWidget`), intégration esthétique sur la gauche de l'écran avec fond semi-transparent, blocage de la propagation des raccourcis Phaser lors de la frappe (`@keydown.stop`), câblage à `networkStore` avec mémorisation des 50 derniers messages dans `chatStore`. |
| 19.0 | 04/03/2026 | Session 4 : Immersion Chat (Bulles HabboHôtel). L'affichage des messages au-dessus des sprites a été repensé. Utilisation de composants `Text` purs au-dessus du pseudo, avec interpolation fluide (`Lerp`) pour pousser les anciens messages vers le haut en cas de spam. Ajout d'une flottaison constante et d'un fade-out sur 4 secondes via `scene.tweens`. |
| 20.0 | 04/03/2026 | Session 5 : Authentification et Comptes. Renforcement du backend FastAPI avec SQLite (SQLAlchemy) et `passlib`. Remplacement de la connexion anonyme par des endpoints `/register` et `/login` (Jetons JWT). Modification du handshake WebSocket pour valider obligatoirement le token. |
| 20.1 | 04/03/2026 | Hotfix Auth / Refonte : Remplacement de `passlib` par `bcrypt` pur dans `auth.py` suite à l'incompatibilité dépendances. Suppression totale du mode "Guest" automatique dans le Frontend (`app.vue`) et ajout d'une vraie interface de connexion/inscription bloquant le chargement du monde isométrique tant que le joueur n'est pas loggué. |
| 21.0 | 05/03/2026 | Session 7 : Rôle Admin et Amélioration du Chat | Mise en place des rôles via le backend fastapi (table User) et transmission vers le store Pinia (auth). Tweak du chat Phaser (tweens) pour un effet de bulle lente (+haute, +longue) et ajout du bouton d'administration caché exclusif au rôle admin dans le HUD. |
| 22.0 | 06/03/2026 | Session 8 : Outils de Modération | Création d'une fenêtre d'administration `AdminWindow.vue`. Implémentation du kick des joueurs en temps réel (déconnexion WebSocket forcée avec erreur). Ajout de la fonction "Panic Button" Régénérer la Map qui efface toutes les constructions, regénère la seed du monde (`gamestate.py`), propulse les événements WebSocket, et nettoit complètement Phaser pour redessiner la map avec téléportation des joueurs au spawn. |
| 22.1 | 20/03/2026 | Session 8 : Fix Régénération Map | Correction du placement des objets sur les tuiles d'eau lors de la régénération en forçant le `WORLD_SEED` global. Ajout d'une recherche de "Safe Spawn" (`get_safe_spawn`) pour relocaliser automatiquement et sûrement les joueurs au plus proche du centre sans risque de tomber dans l'eau ou dans un obstacle. |
| 22.2 | 20/03/2026 | Hotfix : Interface de Connexion & Token Expiré | L'interface de connexion semblait perdue car `app.vue` forçait le chargement de la map si un token local existait, créant un écran vide quand WebSocket fermait sa connexion (`code=1008`) en cas de token expiré (effaçant le Login). `network.ts` a été mis à jour pour intercepter les codes `1008` et `403` lors de la déconnexion, effacer le `localStorage` erroné, et recharger la page proprement afin de rétablir l'interface de sécurité sans boucles de reconnexion fantômes. |
| 22.3 | 24/03/2026 | Sécurité Anti-Boucle Auth | Suppression totale du `onMounted` auto-connect dans `app.vue` (cause racine de la boucle 403 infinie). Le joueur DOIT désormais passer par le formulaire de login à chaque session. Ajout dans `network.ts` : flag `shouldReconnect` + compteur `reconnectAttempts` (max 5) + codes d'erreur auth étendus (1008, 403, 4001, 4003). Suppression du `window.location.reload()` au profit d'un flag réactif `authFailed` surveillé par un `watch()` dans `app.vue` pour retourner proprement sur l'écran de login. |
| 23.0 | 24/03/2026 | Session 9 : Déploiement & Containerisation | Création de la configuration Docker : Dockerfile racine (Frontend Nuxt 4, Node 20), Dockerfile `/backend` (FastAPI, Python 3.11), et `.dockerignore` appropriés (incluant la non-copie de `haven.db`). Orchéstration par `docker-compose.yml` (`3000:3000`, `8000:8000`) avec volume persistant `backend_data:/app/data`. Ajustement de `database.py` configurer dynamiquement (`DATABASE_URL`). Correction 1 : Ajout approfondi des dépendances (sqlalchemy, aiosqlite, websockets) dans `requirements.txt`. Correction 2 : Restructuration architecture conteneur python. Ajout `ENV PYTHONPATH=/app`, copie en tant que module dans `/app/backend/` et update de l'ENTRYPOINT vers `backend.main:app` pour réparer l'erreur `ModuleNotFoundError`. |
| 23.1 | 26/03/2026 | Session 9 : Dette Technique Sécurité | Génération crypto-sécurisée de `SECRET_KEY`, intégration dans `auth.py` via `os.getenv`. Refactor de `docker-compose.yml` pour utiliser un fichier `.env`. Création de `.env.example` à la racine pour documenter cette obligation en production. |
| 23.2 | 26/03/2026 | Session 9 : Environnement Dynamique | Substitution des chemins localhost codés en dur par `useRuntimeConfig` (`NUXT_PUBLIC_API_BASE`). Conversion automatique du protocole WebSocket (`ws://` / `wss://`) selon l'URL de base définie. Configuration dynamique du CORS FastAPI via `ALLOWED_ORIGINS`. Migration globale vers un pilotage 100% via variables d'environnement. |
| 23.4 | 27/03/2026 | Fix Prod : Éradication de `localhost:8000` | Refonte du Frontend : utilisation stricte de `useRuntimeConfig().public.apiUrl` et `.wsUrl` initialisés via `NUXT_PUBLIC_API_URL` et `NUXT_PUBLIC_WS_URL`. Correction des erreurs `ERR_CONNECTION_REFUSED` en production causées par du code en dur dans `network.ts` et `app.vue`. |
| 24.0 | 03/04/2026 | Démarrage Bloc 2 (Session 2.1) | Résolution de bugs UI/Multijoueur et améliorations UX : (1) Correction du Bug de "Click-Through" en ajoutant `@pointerdown.stop` sur toutes les interfaces (VueJS) pour empêcher la propagation d'événements vers le Canvas Phaser. (2) Amélioration de la Sync Multijoueur à la volée : le composant `networkStore` récupère les joueurs et `PLAYER_JOINED` instancie directement le fantôme du nouveau joueur connecté sans rafraîchir F5. (3) Polish Pseudonymes : Ajout de la diffusion du username (FastAPI) pour l'afficher distinctement (texte ambré lisible avec stroke + shadow) au-dessus des vrais joueurs (local et distants) et qui suit l'avatar dynamique. (4) UI Adjustment : Augmentation de la hauteur maximale du widget de chat de VueJS pour une meilleure lisibilité (`max-h-[500px]`, `max-h-96`). |
| 24.1 | 03/04/2026 | Suite Bloc 2 (Session 2.2) | Ajout du composant asynchrone `PlayerListWidget.vue` au sein du `GameUI.vue`. Création d'un menu déroulant esthétique "Hub Social" dans le coin supérieur droit (près du Reset) listant l'utilisateur et tous les autres joueurs de la session grâce l'import du `$worldStore.otherPlayers`. Cette modale met également à l'honneur les "usernames" des joueurs réels pour renforcer l'idée de Hub Communautaire. Le store (`stores/world.ts`) a été ajusté pour stocker le username distant. |
| 24.2 | 05/04/2026 | Fin Bloc 2 (Session 2.3) | Nettoyage de l'UI (`GameUI.vue`) : suppression du bouton "Reset Save" en mode public pour éviter les erreurs graves (déplacé sécuritairement dans la Danger Zone d'`AdminWindow.vue`). Repositionnement propre du widget `PlayerListWidget.vue` dans l'angle supérieur droit. Fin du Bloc 2 actée (Anti-Click Through résolu, Sync Pseudonymes Phaser instantanée, Hub Players en place). |
| 25.0 | 05/04/2026 | Démarrage Bloc 3 (Session 3.1) | Implémentation du système de Respawn des ressources : modification de `gamestate.py` pour stocker les objets récoltés dans une file d'attente (TTL de 2 à 5 minutes selon le type), boucle de vérification asynchrone (`respawn_loop` dans `main.py`) et émission de `RESOURCE_RESPAWNED`, traité localement dans Phaser (`MainScene.ts`) pour ré-instancier dynamiquement l'obstacle. |
| 25.1 | 05/04/2026 | Suite Bloc 3 (Session 3.2) | Séparation logique de l'inventaire : création de getters Pinia `resourceInventory` et `toolInventory` (via le typage item). Re-routage du widget d'inventaire (`GameUI.vue`) afin d'afficher exclusivement les ressources. Génération dynamique de l'`hotbar` (`player.ts`) pour limiter son contenu aux outils et éléments de construction équipables uniquement, fluidifiant l'expérience utilisateur et supprimant les doublons visuels. |
| 26.0 | 05/04/2026 | Démarrage Bloc 4 (Session 4.1) | Mise en place de l'identité Roleplay : Ajout des colonnes SQLite (via `models.py`) pour `job` (métier) et `description` (bio), en y incluant la lecture de `created_at`. Développement de l'API REST dans FastAPI (`GET /api/profile` et `PUT /api/profile`) associée. Et design d'une nouvelle modale `ProfileWindow.vue` pour la consultation et modification du profil par le joueur, instanciée dans `GameUI.vue`. |
| 26.1 | 05/04/2026 | Suite Bloc 4 (Session 4.2) | Système d'inspection sociale : Rendu interactif des joueurs (`ObjectManager.ts`) pour ouvrir la modale via Phaser (Sprites et Noms). Connexion du `PlayerListWidget.vue` pour le clic sur les pseudonymes. Adaptation de `ProfileWindow.vue` en mode de "Lecture Seule" dynamique. |
| 27.0 | 07/04/2026 | Démarrage Bloc 5 (Session 5.1) | Rendre le jeu "Mobile Friendly" : Utilisation de l'unité `100dvh` dans `app.vue` pour éviter le coupage par la barre d'adresse mobile. Ajout de `overflow-hidden`, `touch-none`, et `user-select-none` pour prévenir le pull-to-refresh et l'interaction navigateur indésirable. Vérification et validation du mode d'affichage `Phaser.Scale.RESIZE`. |
| 27.1 | 07/04/2026 | Suite Bloc 5 (Session 5.2) | Interface Responsive Tailwind : Ajustement avec les breakpoints `md:` de `GameUI.vue`. Compression drastique du ChatWidget sur mobile (Taille minifiée, transparence accrue). Rétractation du texte du statut en ligne pour n'afficher que l'icône `PlayerListWidget.vue` sur les petits écrans. Hotbar centrée systématiquement en bas sur mobile (`left-1/2`, `-translate-x-1/2`) et dimension des icônes réduites pour éviter tout débordement. |
| 27.2 | 07/04/2026 | Fin Bloc 5 (Session 5.3) | Scroll des UI et Optimisation Tactile : Limitation de la hauteur des fenêtres internes (Inventaire `GameUI.vue`, Profil) avec `max-h-[60vh] overflow-y-auto`. Élargissement des cibles tactiles minimales à 44x44px pour tous les boutons principaux et la frappe chat. Audit global des `pointer-events-none / auto` validé pour empêcher tout blocage mort de l'écran lors du balayage Phaser (Pan Camera). |
| 28.0 | 07/04/2026 | Refonte Mobile (Partie 1/3) | Refonte complète de la top bar mobile. Regroupement des statistiques, du temps/position et des joueurs sous des icônes d'actions sur mobile qui ouvrent des pop-ups dédiées. L'interface PC est intégralement préservée sans impact visuel grâce aux classes tailwind. Nettoyage définitif des icônes de portefeuilles/ressources statiques (Haut Centre). |
| 28.1 | 07/04/2026 | Refonte Mobile (Partie 2/3) | Refonte de la barre d'action inférieure sur mobile. Isolation de l'interface PC (boutons et modale inventaire) via `hidden md:flex`. Implémentation d'un bloc d'icônes tactiles en bas de l'écran donnant accès à l'inventaire de ressources, l'équipement (avec logique de clic pour équiper) et la table de craft. Ajout de modales dédiées mobiles (scrollables via `overflow-y-auto` et avec croix de fermeture larges). |
| 28.2 | 07/04/2026 | Refonte Mobile (Partie 3/3) | Résolution de l'ergonomie du Chat sur mobile. Réduction de la hauteur dynamique du widget (`max-h-40` & `max-h-28`) pour ne plus obstruer l'écran en session de jeu. Correction critique de la rétention de focus du clavier virtuel : implémentation d'une fonction de blur global (`document.activeElement.blur()`) attachée aux événements `@pointerdown` et `@touchstart` du `GameCanvas` afin de rendre les contrôles au joueur fluidement après la frappe. |
| 29.0 | 07/04/2026 | Démarrage Bloc 6 (Session 6.1) | Synchronisation globale du temps du serveur vers les clients. Le backend maintient une horloge de jeu globale (`gamestate.py` + boucle dans `main.py`) et diffuse périodiquement via le payload `TIME_SYNC`. Suppression de l'horloge locale indépendante du client (`MainScene.ts`). Mise à jour transparente en jeu pour préserver l'immersion Roleplay et aligner visuellement tous les joueurs. |
| 29.1 | 07/04/2026 | Démarrage Bloc 6 (Session 6.2) | Correction de bugs d'affichage de l'identité des joueurs dans le module social (liste des joueurs et chat). Injection directe côté backend (dans `userManager`) du pseudonyme contenu dans le payload JWT à chaque connexion pour résoudre les "Inconnu". Le serveur injecte désormais explicitement le paramètre optionnel `sender_name` dans les WebSockets de type `CHAT_MESSAGE`. Adaptation du client vue `ChatWidget` pour afficher le pseudo complet résolu depuis le `worldStore`. |
| 29.2 | 07/04/2026 | Fin du Bloc 6 (Session 6.3) | Clean-up final de l'interface mobile sans altérer l'UI PC. Masquage propre du titre (Hub Social) via `hidden md:block` sur la vue d'authentification (`app.vue`) et désactivation totale de l'ancienne toolbar PC sur mobile (`BuildToolbar.vue`) grâce à `hidden md:flex`. Ajustement ergonomique du chat sur mobile : remontée visuelle (`bottom-24`) et réduction drastique de sa hauteur maximale (`max-h-[15vh]`) couplée à un `overflow-y-auto` pour conserver la visibilité globale de l'écran lors d'échanges denses. |
| 29.3 | 07/04/2026 | Fix regression: Click-through UI (Session 6.4) | Correction d'une régression critique sur le bug de "click-through" : cliquer sur l'interface déclenchait le pathfinding du personnage vers la tuile sous-jacente. Audit complet de tous les composants interactifs. Les deux lacunes identifiées étaient : (1) la popup mobile `activeMobilePopup` dans `GameUI.vue` (l.190) qui avait `pointer-events-auto` mais aucun modificateur `.stop` ; (2) l'indicateur de statut WebSocket dans `app.vue` (l.66), également sans protection. Ajout systématique de `@click.stop @pointerdown.stop @mousedown.stop @touchstart.stop` sur tous les conteneurs non protégés. Les autres composants (`ChatWidget`, `BuildToolbar`, fenêtres PC, `PlayerListWidget`, `CraftingWindow`, `CharacterWindow`, `AdminWindow`, `ProfileWindow`) étaient déjà correctement blindés. |
| **30.0** | **10/04/2026** | **Démarrage Bloc 7 (Session 7.3) — UI de Voyage Inter-Cartes** | Implémentation complète du système de voyage entre maps. Frontend : ajout du bouton Voyager (🌍) dans la barre d'action PC et mobile de `GameUI.vue`, ouvrant une modale de sélection de destination (farm_main, desert) avec design cohérent au HUD. Store `network.ts` : ajout de `sendTravelRequest(targetMapId)` (envoie `REQUEST_TRAVEL`) et `listenForMapChange()` (écoute `MAP_CHANGED`). Store `world.ts` : `setMapInfo()` existant utilisé pour réinitialiser le state avant la réception du nouveau `WORLD_STATE`. Backend (`main.py`) : remplacement du handler `ACTION_CHANGE_MAP` bloqué par `REQUEST_TRAVEL` — retire le joueur de l'ancienne room, l'ajoute à la nouvelle, envoie `MAP_CHANGED`, `PLAYER_SYNC`, `WORLD_STATE` et `CURRENT_PLAYERS`. `gamestate.py` : initialisation de la room `desert` au démarrage + ajout de `get_map_info()`. `MainScene.ts` : enregistrement de `listenForMapChange()`. |
| **30.1** | **10/04/2026** | **Fin Bloc 7 (Session 7.4) — Connexion Phaser au Cycle de Vie des Maps (Multivers Opérationnel)** | Connexion complète de la réponse réseau `MAP_CHANGED` au moteur Phaser. `MainScene.ts` : ajout d'un watcher Pinia sur `worldStore.mapChangedSignal` (Vue `watch()`), déclenché à chaque `MAP_CHANGED`. La méthode `triggerMapTransition()` effectue un nettoyage strict en 12 étapes (timers, tweens, joueur, ObjectManager via `clearObjects()`, MapManager via `clearMap()` + `clearOccupied()`, ghost de placement, InputManager, TileSelector, WS listeners, worldStore) avant d'appeler `scene.restart()`. Le watcher est stoppé (`stopMapWatcher()`) dans `triggerMapTransition()` et dans `shutdown()` pour éviter toute re-entrance. Guard `_travelInProgress` et `_initialMapSignal` protègent le double-fire au premier `create()`. `init()` réinitialise les flags avant chaque cycle. `GameConfig.MAP_SIZE` est désormais lu depuis `worldStore.mapWidth` (multi-map aware). `TileManager.ts` : ajout de `setBiome(biome)` + table `BIOME_TINTS` — en mode `desert`, les tuiles sol deviennent sable (tint `0xd4a855`) et les oasis (`0x4caf78`). `MapManager.ts` : appel de `setTileVariants()` dans `generate()` + exposition de `clearOccupied()`. Le z-index du canvas (`z-0` dans `GameCanvas.vue`) est préservé — `scene.restart()` ne détruit pas le canvas, seule la logique interne Phaser est reconstruite. |
| **30.2** | **10/04/2026** | **Hotfix (Session 7.5) — Sécurisation Défensive du Changement de Map** | Résolution du crash "`Cannot read properties of undefined (reading 'size')`" survenant lors du `scene.restart()` dans Phaser. Ajout de vérifications strictes de l'existence des collections (comme `tileGroup.children` ou `objectMap`) avant appel aux méthodes Phaser internes potentiellement instables sur des managers détruits (`.clear()`, `.destroy()`). Assainissement global implémenté dans `TileManager.destroy()`, `ObjectManager.clearObjects()`, et `MapManager.clearMap()`. Purge systématique des références (`null` ou `undefined`) pour faciliter les GC sweeps. La transition inter-cartes est désormais 100% robuste. |
