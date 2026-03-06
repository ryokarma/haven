"""
GameState — État du monde Haven
Gère la liste des ressources du monde et les règles de collision.

Session 8.4 : Génération procédurale complète remplaçant les 10 objets hardcodés.
La carte 100x100 est peuplée aléatoirement avec une seed fixe pour la reproductibilité.
"""

import time
import random
import math
import os
from typing import List, Dict, Any, Optional, Set, Union

from backend.perlin import Perlin


# ─────────────────── Configuration Génération ───────────────────

# Taille de la carte, doit correspondre à GameConfig.MAP_SIZE côté client
MAP_SIZE = 100

# Zone de spawn protégée (pas de ressources ici pour laisser le joueur apparaître)
SAFE_ZONE_MIN_X = 0
SAFE_ZONE_MAX_X = 12
SAFE_ZONE_MIN_Y = 0
SAFE_ZONE_MAX_Y = 12

# Zone de la maison (correspond à GameConfig.HOUSE côté client)
HOUSE_X = 15
HOUSE_Y = 15
HOUSE_W = 6
HOUSE_H = 6

# Probabilités de génération par case (appliquées de manière exclusive, ordre = priorité)
# Total cumulé ~27% → densité raisonnable sur une 100x100 (~2700 objets max)
GENERATION_RULES = [
    {"asset": "tree",        "type": "obstacle", "chance": 0.10},  # 10% → ~1000 arbres
    {"asset": "rock",        "type": "obstacle", "chance": 0.05},  # 5%  → ~500 rochers
    {"asset": "cotton_bush", "type": "obstacle", "chance": 0.04},  # 4%  → ~400 buissons
    {"asset": "clay_node",   "type": "obstacle", "chance": 0.03},  # 3%  → ~300 gisements
    {"asset": "apple_tree",  "type": "obstacle", "chance": 0.02},  # 2%  → ~200 pommiers
]

# Seed de génération — utiliser une valeur fixe pour que tous les clients voient la même carte.
WORLD_SEED = 42

# Paramètres Perlin pour le terrain (eau) — DOIVENT correspondre à GameConfig.MAP_GENERATION.noise
PERLIN_SCALE = 0.04
WATER_THRESHOLD = 0.3


# ─────────────────── Helpers ───────────────────

def _is_in_safe_zone(x: int, y: int) -> bool:
    """Vérifie si la case est dans la zone de spawn protégée."""
    return (SAFE_ZONE_MIN_X <= x <= SAFE_ZONE_MAX_X and
            SAFE_ZONE_MIN_Y <= y <= SAFE_ZONE_MAX_Y)


def _is_in_house(x: int, y: int) -> bool:
    """Vérifie si la case est dans la zone de la maison."""
    return (HOUSE_X <= x < HOUSE_X + HOUSE_W and
            HOUSE_Y <= y < HOUSE_Y + HOUSE_H)


def _compute_water_tiles(seed: int) -> Set[tuple]:
    """
    Pré-calcule l'ensemble des tuiles d'eau via Perlin Noise.
    Reproduit la logique du MapManager.generateTerrain() côté client.

    Session 9.4 : Évite de placer des ressources sur l'eau.
    """
    perlin = Perlin(seed)
    water_tiles: Set[tuple] = set()

    for y in range(MAP_SIZE):
        for x in range(MAP_SIZE):
            # Zone protégée (maison)
            if _is_in_house(x, y):
                continue
            # Zone de départ protégée (pas d'eau au spawn — même logique que le client)
            if x < 10 and y < 10:
                continue

            noise_value = perlin.noise(x * PERLIN_SCALE, y * PERLIN_SCALE)
            normalized = (noise_value + 1) / 2

            if normalized < WATER_THRESHOLD:
                water_tiles.add((x, y))

    print(f"[GameState] Terrain calculé : {len(water_tiles)} tuile(s) d'eau détectée(s).")
    return water_tiles


def _generate_world(seed: int) -> List[Dict[str, Any]]:
    """
    Génère la liste des ressources du monde avec une seed déterministe.

    Algorithme :
    - Pré-calcule les tuiles d'eau via Perlin (session 9.4)
    - Parcourt chaque case de la grille 100x100
    - Skip les zones protégées (spawn + maison + eau)
    - Applique les règles de génération en cascade (tirage unique par case)
    - Retourne une liste compacte de dicts {id, asset, type, x, y}
    """
    # Pré-calcul des tuiles d'eau
    water_tiles = _compute_water_tiles(seed)

    rng = random.Random(seed)
    resources: List[Dict[str, Any]] = []

    # Index de position pour détection de collision O(1) lors de la construction
    occupied: set = set()

    print(f"[GameState] Génération du monde (seed={seed}, taille={MAP_SIZE}x{MAP_SIZE})...")

    for y in range(MAP_SIZE):
        for x in range(MAP_SIZE):

            # Skip zones protégées
            if _is_in_safe_zone(x, y) or _is_in_house(x, y):
                continue

            # Session 9.4 : Skip les tuiles d'eau
            if (x, y) in water_tiles:
                continue

            # Tirage unique pour cette case
            roll = rng.random()
            cumulative = 0.0

            for rule in GENERATION_RULES:
                cumulative += rule["chance"]
                if roll < cumulative:
                    key = (x, y)
                    if key not in occupied:
                        res_id = f"{rule['asset']}_{x}_{y}"
                        resources.append({
                            "id":    res_id,
                            "asset": rule["asset"],
                            "type":  rule["type"],
                            "x":     x,
                            "y":     y,
                        })
                        occupied.add(key)
                    break  # Une seule ressource par case

    print(f"[GameState] Monde généré : {len(resources)} ressource(s) placée(s).")
    return resources


WORLD_FILE = os.path.join("backend", "data", "world.json")

class RoomState:
    def __init__(self, map_id: str, resources: List[Dict[str, Any]], width: int = 100, height: int = 100, seed: int = WORLD_SEED):
        self.map_id = map_id
        self.resources = resources
        self.width = width
        self.height = height
        self.seed = seed
        self._spatial_index: Dict[tuple, Dict[str, Any]] = {
            (r["x"], r["y"]): r for r in self.resources
        }

def generate_room_state(map_id: str, seed: int) -> RoomState:
    if map_id.startswith("housing_"):
        return RoomState(map_id, [], 30, 30, seed)
    else:
        resources = _generate_world(seed)
        return RoomState(map_id, resources, 100, 100, seed)

class GameState:
    def __init__(self):
        """Initialise l'état du monde avec génération procédurale multi-maps."""
        self.maps: Dict[str, RoomState] = {}
        
        self.maps["farm_main"] = generate_room_state("farm_main", WORLD_SEED)
        self.maps["housing_hub_1"] = generate_room_state("housing_hub_1", WORLD_SEED)
        

        
    def save_world(self):
        """[WIP] Legacy save not fully supported with Multi-Map yet."""
        pass 

    # --- Futures méthodes asynchrones (PostgreSQL) ---
    async def load_from_db(self, session):
        """[WIP] Charge l'état du monde depuis la BDD (table world_items)"""
        pass
        
    async def save_to_db(self, session):
        """[WIP] Synchronise l'état en RAM vers la BDD"""
        pass

    # ─────────────────── Lecture ───────────────────

    def get_full_state(self, map_id: str = "farm_main") -> Dict[str, Any]:
        """Retourne l'état complet du monde pour synchronisation initiale pour la room spécifiée."""
        if map_id not in self.maps:
            self.maps[map_id] = generate_room_state(map_id, WORLD_SEED)
            
        room = self.maps[map_id]
        return {
            "map_id": room.map_id,
            "width": room.width,
            "height": room.height,
            "seed": room.seed,
            "resources": room.resources
        }
        
    def regenerate_room(self, map_id: str = "farm_main") -> Dict[str, Any]:
        """Regenerate the entire room with a new seed and return the new state."""
        import random
        # Give a new seed
        new_seed = random.randint(1, 1000000)
        self.maps[map_id] = generate_room_state(map_id, new_seed)
        return self.get_full_state(map_id)

    def get_resource_at(self, map_id: str, x: int, y: int) -> Optional[Dict[str, Any]]:
        """Retourne la ressource à (x, y) ou None — O(1) grâce à l'index spatial."""
        if map_id not in self.maps:
            return None
        return self.maps[map_id]._spatial_index.get((x, y))

    # ─────────────────── Écriture ───────────────────

    def remove_resource_at(self, map_id: str, x: int, y: int) -> Optional[Dict[str, Any]]:
        """
        Supprime la ressource aux coordonnées données.
        Met à jour la liste ET l'index spatial.
        Retourne l'objet complet ou None si rien à supprimer.
        """
        room = self.maps.get(map_id)
        if not room:
            return None
            
        res = room._spatial_index.pop((x, y), None)
        if res is not None:
            try:
                room.resources.remove(res)
            except ValueError:
                pass  # Déjà absent — incohérence ignorée silencieusement
        return res

    def harvest_resource(self, player_id: str, map_id: str, resource_id: str, equipped_tool: str, user_manager: Any) -> Optional[Union[tuple[Dict[str, Any], Dict[str, int], Dict[str, int]], str]]:
        """
        Gère la logique de récolte côté serveur (autorité serveur) sur une carte spécifique.
        """
        import math

        user = user_manager.get_or_create_user(player_id)
        px = float(user.get("x", 0))
        py = float(user.get("y", 0))

        room = self.maps.get(map_id)
        if not room:
            return "Carte introuvable."

        target = next((r for r in room.resources if r["id"] == resource_id), None)
        if not target:
            return "Ressource introuvable."

        rx, ry = float(target["x"]), float(target["y"])
        asset  = target.get("asset", "")

        dist = math.hypot(px - rx, py - ry)
        MAX_HARVEST_DIST = 3.0
        if dist > MAX_HARVEST_DIST:
            return "Cible trop éloignée."

        if asset == "tree" and equipped_tool != "axe":
            return "Outil inadapté. Hache requise."
        if asset == "rock" and equipped_tool != "pickaxe":
            return "Outil inadapté. Pioche requise."
        if asset in ["clay_node", "clay_mound"] and equipped_tool != "shovel":
            return "Outil inadapté. Pelle requise."

        if asset == "apple_tree":
            loot = {"apple": 1}
            new_wallet = None
            for res_type, amount in loot.items():
                new_wallet = user_manager.update_wallet(player_id, res_type, amount)
            return target, new_wallet or {}, loot

        removed = self.remove_resource_at(map_id, int(rx), int(ry))
        if not removed:
            return "Erreur lors de la suppression de la ressource."

        loot: Dict[str, int] = {}
        if asset == "tree":
            loot = {"wood": 1}
        elif asset == "rock":
            loot = {"stone": 1}
        elif asset == "clay_node":
            loot = {"stone": 1}   
        elif asset == "cotton_bush":
            loot = {"cotton_plant": 1}
        else:
            loot = {"wood": 1}

        new_wallet = None
        for res_type, amount in loot.items():
            new_wallet = user_manager.update_wallet(player_id, res_type, amount)

        return removed, new_wallet or {}, loot

    def add_resource(self, asset: str, obj_type: str, x: int, y: int, map_id: str = "farm_main") -> Optional[Dict[str, Any]]:
        """
        Ajoute une ressource au monde (ex: construction joueur).
        """
        room = self.maps.get(map_id)
        if not room:
            return None
            
        if (x, y) in room._spatial_index:
            return None  # Case occupée

        new_id = f"{asset}_{x}_{y}_{int(time.time())}"
        new_resource: Dict[str, Any] = {
            "id":    new_id,
            "type":  obj_type,   # "obstacle" | "floor"
            "asset": asset,      # "tree", "rock", "path_stone", etc.
            "x":     x,
            "y":     y,
        }

        room.resources.append(new_resource)
        room._spatial_index[(x, y)] = new_resource
        return new_resource
