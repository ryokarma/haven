"""
Haven — Backend Principal
FastAPI + WebSocket — MVP Alpha 0.1
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict
import json
import time

from backend.gamestate import GameState
from backend.usermanager import UserManager
from backend import recipes

# ──────────────────────────────────────────────
# 1. Application & CORS
# ──────────────────────────────────────────────
app = FastAPI(title="Haven Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# 2. Instances Globales
# ──────────────────────────────────────────────
gameState = GameState()
userManager = UserManager()


# ──────────────────────────────────────────────
# 3. Connection Manager
# ──────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()

        # Envoyer la liste des joueurs déjà connectés
        current_players = list(self.active_connections.keys())
        await websocket.send_text(json.dumps({
            "type": "CURRENT_PLAYERS",
            "players": current_players
        }))

        # Stocker la connexion
        self.active_connections[client_id] = websocket
        print(f"[WS] Client {client_id} connected ({len(self.active_connections)} total)")

        # Notifier les autres
        await self.broadcast(json.dumps({
            "type": "PLAYER_JOINED",
            "id": client_id
        }), exclude_id=client_id)

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            print(f"[WS] Client {client_id} disconnected")

    async def broadcast(self, message: str, exclude_id: str = None):
        """Envoie un message à tous les clients connectés (sauf exclude_id)."""
        disconnected = []
        for cid, ws in self.active_connections.items():
            if cid != exclude_id:
                try:
                    await ws.send_text(message)
                except Exception:
                    disconnected.append(cid)
        # Nettoyage des connexions mortes
        for cid in disconnected:
            self.disconnect(cid)

    async def send_to(self, client_id: str, message: str):
        """Envoie un message à un client spécifique."""
        ws = self.active_connections.get(client_id)
        if ws:
            try:
                await ws.send_text(message)
            except Exception:
                self.disconnect(client_id)


manager = ConnectionManager()


# ──────────────────────────────────────────────
# 4. Helpers
# ──────────────────────────────────────────────

def make_msg(msg_type: str, **kwargs) -> str:
    """Crée un message JSON sérialisé."""
    return json.dumps({"type": msg_type, **kwargs})


def determine_harvest_resource(asset: str) -> str:
    """Détermine le type de ressource gagnée pour une récolte."""
    if "rock" in asset:
        return "stone"
    return "wood"  # Default (tree, etc.)


# ──────────────────────────────────────────────
# 5. WebSocket Endpoint
# ──────────────────────────────────────────────

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)

    # ── A. Synchro Joueur ──
    user_data = userManager.get_or_create_user(client_id)
    await websocket.send_text(make_msg("PLAYER_SYNC", payload=user_data))

    # ── B. Synchro Monde ──
    await websocket.send_text(make_msg("WORLD_STATE", payload=gameState.get_full_state()))

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type")
            payload = msg.get("payload", {})

            # ──────────── PLAYER_MOVE ────────────
            if msg_type == "PLAYER_MOVE":
                x = payload.get("x")
                y = payload.get("y")
                if x is None or y is None:
                    continue

                userManager.update_user_position(client_id, x, y)

                await manager.broadcast(make_msg(
                    "PLAYER_MOVED",
                    id=client_id,
                    x=x,
                    y=y
                ), exclude_id=client_id)

            # ──────────── PLAYER_INTERACT (Récolte) ────────────
            elif msg_type == "PLAYER_INTERACT":
                x = payload.get("x")
                y = payload.get("y")
                if x is None or y is None:
                    continue

                removed = gameState.remove_resource_at(x, y)

                if removed:
                    # Gain de ressource
                    gain_type = determine_harvest_resource(removed.get("asset", ""))
                    wallet = userManager.update_wallet(client_id, gain_type, 1)

                    if wallet:
                        await websocket.send_text(make_msg(
                            "WALLET_UPDATE",
                            payload=wallet
                        ))

                    await manager.broadcast(make_msg(
                        "RESOURCE_REMOVED",
                        id=removed["id"],
                        x=x,
                        y=y
                    ))
                # else: Rien à récolter, on ignore silencieusement

            # ──────────── PLAYER_BUILD (Construction) ────────────
            elif msg_type == "PLAYER_BUILD":
                x = payload.get("x")
                y = payload.get("y")
                item_id = payload.get("itemId")

                if x is None or y is None or not item_id:
                    continue

                recipe = recipes.get_recipe(item_id)
                if not recipe:
                    await websocket.send_text(make_msg(
                        "ERROR",
                        message=f"Recette inconnue : {item_id}"
                    ))
                    continue

                # 1. Vérification & Paiement
                cost_dict = recipe["cost"]
                # Support mono-ressource pour le MVP
                resource_type = list(cost_dict.keys())[0]
                cost_amount = cost_dict[resource_type]

                wallet = userManager.update_wallet(client_id, resource_type, -cost_amount)
                if not wallet:
                    await websocket.send_text(make_msg(
                        "ERROR",
                        message="Ressources insuffisantes"
                    ))
                    continue

                # 2. Placement
                new_res = gameState.add_resource(
                    asset=recipe["asset"],
                    obj_type=recipe["type"],
                    x=x,
                    y=y
                )

                if not new_res:
                    # Collision — Rembourser le joueur
                    userManager.update_wallet(client_id, resource_type, cost_amount)
                    wallet = userManager.get_or_create_user(client_id).get("wallet", {})
                    await websocket.send_text(make_msg(
                        "WALLET_UPDATE",
                        payload=wallet
                    ))
                    await websocket.send_text(make_msg(
                        "ERROR",
                        message="Case occupée"
                    ))
                    continue

                # 3. Succès
                await websocket.send_text(make_msg(
                    "WALLET_UPDATE",
                    payload=wallet
                ))
                await manager.broadcast(make_msg(
                    "RESOURCE_PLACED",
                    resource=new_res
                ))

            # ──────────── PLAYER_CHAT ────────────
            elif msg_type == "PLAYER_CHAT":
                text = payload.get("text")
                if not text:
                    continue

                await manager.broadcast(make_msg(
                    "CHAT_MESSAGE",
                    sender=client_id,
                    text=text,
                    timestamp=time.time()
                ))

    except WebSocketDisconnect:
        manager.disconnect(client_id)
        await manager.broadcast(make_msg("PLAYER_LEFT", id=client_id))
    except Exception as e:
        print(f"[WS] Error for {client_id}: {e}")
        manager.disconnect(client_id)
        await manager.broadcast(make_msg("PLAYER_LEFT", id=client_id))
