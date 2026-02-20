"""
GameState — État du monde Haven
Gère la liste des ressources du monde et les règles de collision.

Session 8.4 : Génération procédurale complète remplaçant les 10 objets hardcodés.
La carte 100x100 est peuplée aléatoirement avec une seed fixe pour la reproductibilité.
"""

import time
import random
from typing import List, Dict, Any, Optional


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
# Peut être externalisé dans une config ou un paramètre de lancement.
WORLD_SEED = 42


# ─────────────────── Helpers ───────────────────

def _is_in_safe_zone(x: int, y: int) -> bool:
    """Vérifie si la case est dans la zone de spawn protégée."""
    return (SAFE_ZONE_MIN_X <= x <= SAFE_ZONE_MAX_X and
            SAFE_ZONE_MIN_Y <= y <= SAFE_ZONE_MAX_Y)


def _is_in_house(x: int, y: int) -> bool:
    """Vérifie si la case est dans la zone de la maison."""
    return (HOUSE_X <= x < HOUSE_X + HOUSE_W and
            HOUSE_Y <= y < HOUSE_Y + HOUSE_H)


def _generate_world(seed: int) -> List[Dict[str, Any]]:
    """
    Génère la liste des ressources du monde avec une seed déterministe.

    Algorithme :
    - Parcourt chaque case de la grille 100x100
    - Skip les zones protégées (spawn + maison)
    - Applique les règles de génération en cascade (tirage unique par case)
    - Retourne une liste compacte de dicts {id, asset, type, x, y}
    """
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


class GameState:
    def __init__(self):
        """Initialise l'état du monde avec génération procédurale."""
        # Génération initiale (reproductible via la seed)
        self.resources: List[Dict[str, Any]] = _generate_world(WORLD_SEED)

        # Index spatial pour les lookups O(1) : (x, y) → ressource
        self._spatial_index: Dict[tuple, Dict[str, Any]] = {
            (r["x"], r["y"]): r for r in self.resources
        }

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
            except ValueError:
                pass  # Déjà absent — incohérence ignorée silencieusement
        return res

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
        return new_resource
