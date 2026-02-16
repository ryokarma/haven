from typing import List, Dict, Any

class GameState:
    def __init__(self):
        # Initialisation par défaut avec quelques ressources fixes pour tester
        self.resources: List[Dict[str, Any]] = [
            {"id": "tree_1", "type": "tree", "x": 10, "y": 15},
            {"id": "tree_2", "type": "tree", "x": 12, "y": 12},
            {"id": "tree_3", "type": "tree", "x": 8, "y": 20},
            {"id": "rock_1", "type": "rock", "x": 15, "y": 10},
            {"id": "rock_2", "type": "rock", "x": 18, "y": 18},
        ]
        # TODO: Charger depuis un fichier JSON si existant

    def get_full_state(self) -> Dict[str, Any]:
        return {
            "resources": self.resources
        }
        
    def remove_resource_at(self, x: int, y: int) -> str | None:
        """Supprime une ressource aux coordonnées données."""
        for res in self.resources:
            if res["x"] == x and res["y"] == y:
                self.resources.remove(res)
                return res["id"]
        return None

    def add_resource(self, type: str, x: int, y: int) -> Dict[str, Any]:
        """Ajoute une ressource aux coordonnées données."""
        import time
        new_id = f"{type}_{x}_{y}_{int(time.time())}"
        new_resource = {
            "id": new_id,
            "type": type,
            "x": x,
            "y": y
        }
        self.resources.append(new_resource)
        return new_resource
