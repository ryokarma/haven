# GEMINI.md — Mémoire Morte · Projet Haven

> Ce fichier est la référence rapide de l'IA. Il résume les conventions incontournables et l'architecture du projet. Avant tout changement, lire cette page.

---

## 🏗️ Stack Technique

| Couche | Techno | Détail |
|---|---|---|
| **Jeu / Rendu** | Phaser 3 | Scène isométrique 2.5D, dans un `<canvas>` géré par `GameCanvas.vue` |
| **UI / HUD** | Vue 3 (Nuxt 4) + Tailwind CSS | Superposé au canvas via `position: absolute` |
| **État global** | Pinia | Stores typés TS partagés entre Vue et Phaser |
| **Transport** | WebSocket (natif) | Store `network.ts` : connexion, dispatch, listeners |
| **Backend** | FastAPI (Python) | Autorité absolue sur état du monde et économie |
| **Auth** | JWT (Bearer token) | Stocké dans `localStorage` (`haven_token`) |
| **Persistance** | SQLite (`haven.db`) | Remplace les anciens JSON |

---

## 📁 Fichiers Clés — Accès Rapide

### Backend (`/backend/`)
```
main.py         → WebSocket endpoint, routeur de messages, time_sync_loop
gamestate.py    → GameState : ressources monde, temps jeu (game_time + tick_time)
usermanager.py  → UserManager : wallet, position, username (injecté depuis JWT)
recipes.py      → BUILD_RECIPES & CRAFT_RECIPES
```

### Stores Pinia (`/stores/`)
```
network.ts  → connect(), send(), onMessage(), listenFor*()
player.ts   → stats, inventory, equipment, hotbar, position, role, username
world.ts    → time, formattedTime, isNight, otherPlayers, setMapLoaded()
chat.ts     → messages[], addMessage()
build.ts    → selectedItem, placementMode
```

### Phaser (`/game/`)
```
scenes/MainScene.ts          → Orchestre tout. NE PAS y mettre de logique métier.
managers/InputManager.ts     → Phaser input → events sémantiques (tile-clicked, resource-clicked)
managers/MapManager.ts       → Grille logique, gridData[][], populateFromState()
managers/ObjectManager.ts    → Sprites monde + remotePlayers Map<id, Sprite>
managers/AmbianceManager.ts  → Cycle Jour/Nuit, teintes, lucioles
utils/IsoMath.ts             → gridToIso() / isoToGrid() ← conversions de coordonnées
config/GameConfig.ts         → MAP_SIZE, CAMERA, MOVEMENT, TILE sizes
```

### Vue Components (`/components/`)
```
GameCanvas.vue      → Monte Phaser, blur() focus sur pointerdown (anti click-through)
GameUI.vue          → HUD principal : stats PC, popups mobiles, inventaire modal, bottom bar PC
ChatWidget.vue      → Chat flottant, bottom-left
BuildToolbar.vue    → Hotbar de raccourcis (PC uniquement, hidden sur mobile)
PlayerListWidget.vue→ Liste joueurs connectés (PC uniquement)
CraftingWindow.vue  → Fenêtre craft (PC + mobile via GameUI)
CharacterWindow.vue → Feuille de personnage
ProfileWindow.vue   → Profil RP (lecture ou consultation d'un autre joueur)
AdminWindow.vue     → Outils admin (visible si role === 'admin')
```

---

## 📡 Protocole WebSocket — Messages Clés

### Client → Serveur
| Type | Payload | Quand |
|---|---|---|
| `PLAYER_MOVE` | `{ x, y }` | Clic sur tuile → pathfinding |
| `ACTION_HARVEST` | `{ resource_id, tool }` | Joueur adjacent à une ressource |
| `PLAYER_BUILD` | `{ x, y, itemId }` | Placement d'objet |
| `PLAYER_CHAT` | `{ text }` | Message chat |
| `REQUEST_WORLD_STATE` | `{}` | Handshake initial (fin de `create()`) |

### Serveur → Client
| Type | Contenu | Effet |
|---|---|---|
| `TIME_SYNC` | `{ time }` | `worldStore.time = msg.time` |
| `WORLD_STATE` | `{ payload: { resources } }` | Repeuple la carte |
| `PLAYER_SYNC` | `{ payload: userData }` | Synchro position initiale |
| `PLAYER_JOINED` | `{ id, x, y, username }` | Ajoute sprite distant |
| `PLAYER_MOVED` | `{ id, x, y }` | Pathfind sprite distant |
| `CHAT_MESSAGE` | `{ sender, sender_name, text }` | `sender_name` = pseudo résolu côté serveur |
| `WALLET_UPDATE` | `{ payload: wallet }` | Met à jour économie joueur |
| `HARVEST_SUCCESS` | `{ loot, x, y }` | Affiche floating text |

---

## 🎮 Conventions de Code

### 1. UI vs Canvas — Règle d'Or
- **Vue + Tailwind** = tout ce qui est HUD, fenêtres, formulaires.
- **Phaser** = rendu monde uniquement (tuiles, sprites, effets).
- **Jamais** de DOM dans Phaser, **jamais** de logique monde dans Vue.

### 2. Click-Through — Protection Obligatoire
Tout élément Vue avec `pointer-events-auto` **doit** porter :
```html
@click.stop @pointerdown.stop @mousedown.stop @touchstart.stop
```
S'y soustraire cause le bug "click-through" (Phaser reçoit le clic et lance le pathfinding).

### 3. Responsive — Mobile First
- Classes PC : `hidden md:flex` ou `hidden md:block`
- Classes Mobile : `flex md:hidden` ou `block md:hidden`
- **Ne jamais** modifier le rendu PC pour corriger le mobile.

### 4. Temps — Autorité Serveur
- Le temps de jeu vient **uniquement** du serveur via `TIME_SYNC`.
- Ne jamais recréer un timer local (`worldTimer`) dans `MainScene`.
- Le cycle Jour/Nuit se lit depuis `worldStore.time`.

### 5. Identité Joueur
- Le username est injecté dans `UserManager` depuis le payload JWT à la connexion.
- Les messages `CHAT_MESSAGE` contiennent `sender_name` (résolu côté backend).
- Affichage : `msg.sender_name || worldStore.otherPlayers[msg.sender]?.username || 'Inconnu'`

### 6. TypeScript
- **Strict** partout. Toujours typer les retours et les props de composants.
- Les entités Phaser utilisent `.getData()` / `.setData()` pour les métadonnées (type, gridX, gridY, server_id...).

### 7. Logique Métier — Managers
- **Ne jamais** mettre de logique métier dans `MainScene.ts`.
- Créer ou utiliser un Manager (`PathfindingManager`, `MapManager`...) ou déléguer au store.

### 8. SSR / Nuxt
- Tout code Phaser dans `<ClientOnly>`.
- Vérifier `typeof window !== 'undefined'` avant tout accès DOM hors composant.

### 9. Cleanup Phaser
Toujours nettoyer en `shutdown()` / `onUnmounted()` :
```ts
timer.destroy();
inputManager.destroy();    // retire tous les .off()
game.destroy(true);
```

---

## 🗂️ Coordonnées — Référentiel

```
Grille logique (gridX, gridY) : entiers, [0..MAP_SIZE-1]
Isométrique (isoX, isoY)      : pixels canvas Phaser
Conversion : IsoMath.gridToIso(gx, gy, mapOriginX, mapOriginY)
             IsoMath.isoToGrid(ix, iy, mapOriginX, mapOriginY)

mapOriginX = MAP_SIZE * (TILE_WIDTH / 2)   // = 100 * 64 = 6400
mapOriginY = 100                            // fixe
```

---

## ⚠️ Pièges Connus

| Piège | Solution |
|---|---|
| Click-through UI → Phaser | Toujours `@pointerdown.stop` sur `pointer-events-auto` |
| Rubberbanding joueur | Ignorer `PLAYER_SYNC` si `isMoving === true` |
| Double-fire resource-click | Flag `_resourceClickHandled` dans `InputManager` |
| Focus clavier mobile bloqué | `GameCanvas` appelle `document.activeElement.blur()` sur `pointerdown` |
| Sprite distant position décalée | `isoToGrid` → arrondi → nouveau `gridToIso` avant tween |
| `sender_name` absent (ancien message) | Fallback : `worldStore.otherPlayers[id]?.username` |
