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


# ─────────────────── Authentification ───────────────────

class RegisterRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

# ─────────────────── Sessions (Legacy, conservé) ───────────────────

# ─────────────────── Modèles SQLAlchemy (PostgreSQL) ───────────────────

from sqlalchemy import Column, String, Float, Integer, JSON, DateTime
from datetime import datetime
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True) # ID unique du joueur (ex: token auth)
    username = Column(String, unique=True, index=True, nullable=True)          # Pseudo
    password_hash = Column(String, nullable=True)     # Hachage du mot de passe
    role = Column(String, default="user")             # Rôle utilisateur
    created_at = Column(DateTime, default=datetime.utcnow) # Date de création
    position_x = Column(Float, default=10.0)          # X grille isométrique
    position_y = Column(Float, default=10.0)          # Y grille isométrique
    map_id = Column(String, default="main")           # Carte courante (ex: surface, cave)
    wallet = Column(JSON, default=dict)               # Monnaie locale (ex: wood, stone)
    inventory = Column(JSON, default=dict)            # Inventaire local du personnage

class WorldItem(Base):
    __tablename__ = "world_items"

    id = Column(String, primary_key=True, index=True) # ID original ex: "tree_X_Y"
    item_type = Column(String, index=True)            # Type de collision: 'obstacle', 'floor'
    asset = Column(String, index=True)                # Asset visuel (ex: tree, stone)
    position_x = Column(Integer)                      # X grille
    position_y = Column(Integer)                      # Y grille
    map_id = Column(String, default="main")           # Carte d'appartenance
    owner_id = Column(String, nullable=True)          # Si placé par un joueur, son ID (pour les permissions)

