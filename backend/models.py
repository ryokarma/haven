from pydantic import BaseModel
from typing import Dict, Optional

class PositionModel(BaseModel):
    x: float
    y: float

class PlayerState(BaseModel):
    id: str
    position: PositionModel
    anim_state: str  # ex: 'idle', 'walk'
    last_update: float

class GameState(BaseModel):
    players: Dict[str, PlayerState]
