"""
Recettes de Construction — Haven MVP
Chaque recette définit :
  - cost  : Dict[str, int] — ressources nécessaires
  - type  : str — catégorie de l'objet placé ("obstacle" | "floor")
  - asset : str — clé du sprite/texture côté client
"""

from typing import Dict, Any, Optional

BUILD_RECIPES: Dict[str, Dict[str, Any]] = {
    "tree": {
        "cost": {"wood": 5},
        "type": "obstacle",
        "asset": "tree"
    },
    "rock": {
        "cost": {"stone": 2},
        "type": "obstacle",
        "asset": "rock"
    },
    "path_stone": {
        "cost": {"stone": 1},
        "type": "floor",
        "asset": "path_stone"
    }
}


def get_recipe(item_id: str) -> Optional[Dict[str, Any]]:
    """Récupère la recette pour un item donné. Retourne None si inconnu."""
    return BUILD_RECIPES.get(item_id)
