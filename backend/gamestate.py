"""
GameState — État du monde Haven
Gère la liste des ressources du monde et les règles de collision.
"""

import time
from typing import List, Dict, Any, Optional


class GameState:
    def __init__(self):
        """Initialise le monde avec quelques ressources de test."""
        self.resources: List[Dict[str, Any]] = [
            {"id": "tree_1",  "type": "obstacle", "asset": "tree", "x": 10, "y": 15},
            {"id": "tree_2",  "type": "obstacle", "asset": "tree", "x": 12, "y": 12},
            {"id": "tree_3",  "type": "obstacle", "asset": "tree", "x": 8,  "y": 20},
            {"id": "tree_4",  "type": "obstacle", "asset": "tree", "x": 14, "y": 22},
            {"id": "tree_5",  "type": "obstacle", "asset": "tree", "x": 6,  "y": 18},
            {"id": "rock_1",  "type": "obstacle", "asset": "rock", "x": 15, "y": 10},
            {"id": "rock_2",  "type": "obstacle", "asset": "rock", "x": 18, "y": 18},
            {"id": "rock_3",  "type": "obstacle", "asset": "rock", "x": 20, "y": 14},
            {"id": "rock_4",  "type": "obstacle", "asset": "rock", "x": 22, "y": 8},
            {"id": "rock_5",  "type": "obstacle", "asset": "rock", "x": 16, "y": 25},
        ]

    # ─────────────────── Lecture ───────────────────

    def get_full_state(self) -> Dict[str, Any]:
        """Retourne l'état complet du monde pour synchronisation initiale."""
        return {"resources": self.resources}

    def get_resource_at(self, x: int, y: int) -> Optional[Dict[str, Any]]:
        """Retourne la ressource à (x, y) ou None."""
        for res in self.resources:
            if res["x"] == x and res["y"] == y:
                return res
        return None

    # ─────────────────── Écriture ───────────────────

    def remove_resource_at(self, x: int, y: int) -> Optional[Dict[str, Any]]:
        """
        Supprime la ressource aux coordonnées données.
        Retourne l'objet complet (id, type, asset, x, y) ou None.
        """
        for res in self.resources:
            if res["x"] == x and res["y"] == y:
                self.resources.remove(res)
                return res
        return None

    def add_resource(self, asset: str, obj_type: str, x: int, y: int) -> Optional[Dict[str, Any]]:
        """
        Ajoute une ressource au monde.
        - Vérifie la collision : on ne peut PAS placer sur un obstacle existant.
        - On PEUT placer sur un floor (chemin) — mais pas un 2e objet dessus.
          (Simplifié : on bloque si quoi que ce soit est déjà là.)
        Retourne l'objet créé ou None si collision.
        """
        existing = self.get_resource_at(x, y)
        if existing is not None:
            return None  # Case occupée

        new_id = f"{asset}_{x}_{y}_{int(time.time())}"
        new_resource = {
            "id": new_id,
            "type": obj_type,   # "obstacle" | "floor"
            "asset": asset,     # "tree", "rock", "path_stone"
            "x": x,
            "y": y
        }
        self.resources.append(new_resource)
        return new_resource
