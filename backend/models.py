"""
Modèles Pydantic — Haven Backend
Définit les structures de données échangées entre le serveur et les clients.
"""

from pydantic import BaseModel
from typing import Dict, List, Optional, Literal


# ─────────────────── Joueur ───────────────────

class PositionModel(BaseModel):
    x: float
    y: float


class PlayerState(BaseModel):
    id: str
    position: PositionModel
    anim_state: str  # ex: 'idle', 'walk'
    last_update: float


# ─────────────────── Monde ───────────────────

# Types d'assets visuels acceptés par le client Phaser (doit correspondre aux clés ASSET_MANIFEST / RENDER_OFFSETS)
AssetType = Literal["tree", "rock", "cotton_bush", "clay_node", "apple_tree", "path_stone", "furnace", "clay_pot"]

# Rôle de l'objet dans la grille de collision
ObjectRole = Literal["obstacle", "floor"]


class WorldObject(BaseModel):
    """
    Représente un objet du monde (ressource, décor, bâtiment).
    - `asset`  : Clé texture utilisée côté Phaser (ex: "tree", "cotton_bush")
    - `type`   : Rôle pour la grille de collision ("obstacle" bloque, "floor" est traversable)
    - `x`, `y` : Coordonnées grille isométrique
    """
    id: str
    asset: AssetType
    type: ObjectRole
    x: int
    y: int


# ─────────────────── Sessions (Legacy, conservé) ───────────────────

class GameStateModel(BaseModel):
    """Snapshot complet des joueurs connectés (non utilisé en WebSocket direct)."""
    players: Dict[str, PlayerState]
