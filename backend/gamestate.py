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

class GameState:
    def __init__(self):
        """Initialise l'état du monde avec génération procédurale ou depuis une sauvegarde."""
        self.resources = []
        
        if os.path.exists(WORLD_FILE):
            try:
                import json
                with open(WORLD_FILE, "r") as f:
                    self.resources = json.load(f)
                print(f"[GameState] Monde chargé depuis {WORLD_FILE} ({len(self.resources)} objets).")
            except Exception as e:
                print(f"[GameState] Erreur de lecture de {WORLD_FILE}: {e}")
                
        if not self.resources:
            self.resources: List[Dict[str, Any]] = _generate_world(WORLD_SEED)
            self.save_world()

        # Index spatial pour les lookups O(1) : (x, y) → ressource
        self._spatial_index: Dict[tuple, Dict[str, Any]] = {
            (r["x"], r["y"]): r for r in self.resources
        }
        
    def save_world(self):
        """Sauvegarde l'état du monde de manière persistante."""
        import json
        os.makedirs(os.path.dirname(WORLD_FILE), exist_ok=True)
        try:
            with open(WORLD_FILE, "w") as f:
                json.dump(self.resources, f, indent=4)
        except Exception as e:
            print(f"[GameState] Erreur lors de la sauvegarde: {e}")

    # ─────────────────── Lecture ───────────────────

    def get_full_state(self) -> Dict[str, Any]:
        """Retourne l'état complet du monde pour synchronisation initiale."""
        return {"resources": self.resources}

    def get_resource_at(self, x: int, y: int) -> Optional[Dict[str, Any]]:
        """Retourne la ressource à (x, y) ou None — O(1) grâce à l'index spatial."""
        return self._spatial_index.get((x, y))

    # ─────────────────── Écriture ───────────────────

    def remove_resource_at(self, x: int, y: int) -> Optional[Dict[str, Any]]:
        """
        Supprime la ressource aux coordonnées données.
        Met à jour la liste ET l'index spatial.
        Retourne l'objet complet ou None si rien à supprimer.
        """
        res = self._spatial_index.pop((x, y), None)
        if res is not None:
            try:
                self.resources.remove(res)
                self.save_world()
            except ValueError:
                pass  # Déjà absent — incohérence ignorée silencieusement
        return res

    def harvest_resource(self, player_id: str, resource_id: str, equipped_tool: str, user_manager: Any) -> Optional[Union[tuple[Dict[str, Any], Dict[str, int], Dict[str, int]], str]]:
        """
        Gère la logique de récolte côté serveur (autorité serveur).

        Validations :
        1. La ressource doit exister dans le monde.
        2. La distance joueur ↔ ressource doit être ≤ 3 cases (grille).
        3. Vérifie l'outil équipé transmis par le client (Session 9.5 & 9.6).

        Comportements spéciaux :
        - apple_tree : donne une pomme mais NE DÉTRUIT PAS l'arbre.
        - Autres : détruit la ressource et donne le loot correspondant.

        Retourne un tuple (resource_affectée, nouveau_wallet, loot) ou une string erreur si refus.
        """
        import math

        # ── Trouver le joueur ──────────────────────────────────────────────────
        user = user_manager.get_or_create_user(player_id)
        # Les coordonnées stockées dans l'UserManager sont en grille isométrique (cases)
        # PLAYER_MOVE envoie les coords grille depuis MainScene → update_user_position
        px = float(user.get("x", 0))
        py = float(user.get("y", 0))

        # ── Trouver la ressource ───────────────────────────────────────────────
        target = next((r for r in self.resources if r["id"] == resource_id), None)
        if not target:
            print(f"[GameState] Récolte refusée pour {player_id}: ressource '{resource_id}' introuvable.")
            return "Ressource introuvable."

        rx, ry = float(target["x"]), float(target["y"])
        asset  = target.get("asset", "")

        # ── Validation distance stricte (≤ 3 cases) ───────────────────────────
        dist = math.hypot(px - rx, py - ry)
        MAX_HARVEST_DIST = 3.0
        if dist > MAX_HARVEST_DIST:
            print(f"[GameState] Récolte refusée pour {player_id}: trop loin "
                  f"(player=({px:.1f},{py:.1f}), resource=({rx},{ry}), dist={dist:.2f}).")
            return "Cible trop éloignée."

        # ── Vérification de l'outil équipé (Session 9.5) ──────────────────────
        if asset == "tree" and equipped_tool != "axe":
            print(f"[GameState] Récolte refusée pour {player_id} : 'axe' requis, '{equipped_tool}' reçu.")
            return "Outil inadapté. Hache requise."
        if asset == "rock" and equipped_tool != "pickaxe":
            print(f"[GameState] Récolte refusée pour {player_id} : 'pickaxe' requis, '{equipped_tool}' reçu.")
            return "Outil inadapté. Pioche requise."
        if asset in ["clay_node", "clay_mound"] and equipped_tool != "shovel":
            print(f"[GameState] Récolte refusée pour {player_id} : 'shovel' requis, '{equipped_tool}' reçu.")
            return "Outil inadapté. Pelle requise."
        # cotton_bush peut être récolté avec gants ou knife, ce qui rend la validation difficile
        # si on ne passe qu'un seul outil depuis le client. Pour le MVP, on se fie au client pour cotton_bush.

        # ── Comportement SPÉCIAL : Pommier (sans destruction) ─────────────────
        if asset == "apple_tree":
            loot = {"apple": 1}
            new_wallet = None
            for res_type, amount in loot.items():
                new_wallet = user_manager.update_wallet(player_id, res_type, amount)
            print(f"[GameState] {player_id} récolte une pomme sur l'apple_tree {resource_id}.")
            # On retourne l'arbre lui-même (non supprimé) comme référence de position
            return target, new_wallet or {}, loot

        # ── Suppression de la ressource du monde ──────────────────────────────
        removed = self.remove_resource_at(int(rx), int(ry))
        if not removed:
            return "Erreur lors de la suppression de la ressource."

        # ── Table de loot ──────────────────────────────────────────────────────
        loot: Dict[str, int] = {}
        if asset == "tree":
            loot = {"wood": 1}
        elif asset == "rock":
            loot = {"stone": 1}
        elif asset == "clay_node":
            loot = {"stone": 1}   # raw_clay traité en stone pour l'économie serveur MVP
        elif asset == "cotton_bush":
            loot = {"cotton_plant": 1}
        else:
            loot = {"wood": 1}   # Fallback générique

        # ── Mise à jour du wallet ──────────────────────────────────────────────
        new_wallet = None
        for res_type, amount in loot.items():
            new_wallet = user_manager.update_wallet(player_id, res_type, amount)

        print(f"[GameState] {player_id} récolte {loot} sur '{asset}' ({resource_id}).")
        return removed, new_wallet or {}, loot

    def add_resource(self, asset: str, obj_type: str, x: int, y: int) -> Optional[Dict[str, Any]]:
        """
        Ajoute une ressource au monde (ex: construction joueur).
        - Vérifie la collision via l'index spatial O(1).
        - Génère un ID unique horodaté.
        Retourne l'objet créé ou None si collision.
        """
        if (x, y) in self._spatial_index:
            return None  # Case occupée

        new_id = f"{asset}_{x}_{y}_{int(time.time())}"
        new_resource: Dict[str, Any] = {
            "id":    new_id,
            "type":  obj_type,   # "obstacle" | "floor"
            "asset": asset,      # "tree", "rock", "path_stone", etc.
            "x":     x,
            "y":     y,
        }

        self.resources.append(new_resource)
        self._spatial_index[(x, y)] = new_resource
        self.save_world()
        return new_resource
