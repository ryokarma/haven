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

CRAFT_RECIPES: Dict[str, Dict[str, Any]] = {
    "campfire": {"cost": {"wood": 5, "stone": 5}, "output": "Kit de Feu de Camp", "yield": 1},
    "stone_axe": {"cost": {"wood": 10, "stone": 5}, "output": "Hache en pierre", "yield": 1},
    "craft_knife": {"cost": {"wood": 1, "stone": 1}, "output": "tool_knife", "yield": 1},
    "craft_pickaxe": {"cost": {"wood": 2, "stone": 2}, "output": "tool_pickaxe", "yield": 1},
    "craft_shovel": {"cost": {"wood": 2, "stone": 1}, "output": "tool_shovel", "yield": 1},
    "craft_furnace": {"cost": {"stone": 10}, "output": "furnace", "yield": 1},
    "craft_clay_pot": {"cost": {"raw_clay": 2, "wood": 1}, "output": "clay_pot", "yield": 1},
    "craft_watering_can": {"cost": {"raw_clay": 2, "wood": 2}, "output": "watering_can", "yield": 1}
}

def get_craft_recipe(recipe_id: str) -> Optional[Dict[str, Any]]:
    return CRAFT_RECIPES.get(recipe_id)
