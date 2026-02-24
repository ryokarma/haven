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

        self.active_connections[client_id] = websocket
        print(f"[WS] Client {client_id} connected ({len(self.active_connections)} total)")

        # Envoyer la liste des joueurs déjà connectés avec leurs positions
        current_players_data = []
        for cid in self.active_connections.keys():
            if cid != client_id:
                user = userManager.get_or_create_user(cid)
                current_players_data.append({"id": cid, "x": user.get("x", 10), "y": user.get("y", 10)})
        
        await websocket.send_text(json.dumps({
            "type": "CURRENT_PLAYERS",
            "players": current_players_data
        }))

        # Notifier les autres
        joined_user = userManager.get_or_create_user(client_id)
        await self.broadcast(json.dumps({
            "type": "PLAYER_JOINED",
            "id": client_id,
            "x": joined_user.get("x", 10),
            "y": joined_user.get("y", 10)
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
    # NOTE (Session 8.3): On n'envoie plus WORLD_STATE ici automatiquement.
    # Le client doit envoyer REQUEST_WORLD_STATE quand sa scène Phaser est prête.
    # Cela corrige la race condition où les données arrivaient avant les listeners.

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

            # ──────────── ACTION_HARVEST (Récolte Serveur) ────────────
            elif msg_type == "ACTION_HARVEST":
                resource_id = payload.get("resource_id")
                equipped_tool = payload.get("tool", "none")
                print(f"[WS] ACTION_HARVEST reçu de {client_id}: resource_id={resource_id}, tool={equipped_tool}")
                
                if not resource_id:
                    await websocket.send_text(make_msg("ERROR", message="resource_id manquant"))
                    continue

                harvest_result = gameState.harvest_resource(client_id, resource_id, equipped_tool, userManager)

                if isinstance(harvest_result, str):
                    # Refus avec motif précis généré par gameState
                    await websocket.send_text(make_msg("ERROR", message=harvest_result))
                    continue
                elif harvest_result is None:
                    # Fallback sécurité
                    await websocket.send_text(make_msg("ERROR", message="Récolte impossible (erreur inconnue)"))
                    continue

                affected_res, new_wallet, loot_dict = harvest_result

                # ── Wallet update (ciblé uniquement sur le joueur) ──
                if new_wallet:
                    await websocket.send_text(make_msg("WALLET_UPDATE", payload=new_wallet))

                # ── Feedback visuel (floating text) ──
                await websocket.send_text(make_msg(
                    "HARVEST_SUCCESS",
                    x=affected_res["x"],
                    y=affected_res["y"],
                    loot=loot_dict
                ))

                # ── Cas spécial : apple_tree — l'arbre n'est PAS supprimé ──
                is_apple_tree = affected_res.get("asset") == "apple_tree"
                if not is_apple_tree:
                    # Cas normal : la ressource a été retirée du monde
                    # Diffuse le nouveau WORLD_STATE à TOUS les clients (diff côté client)
                    await manager.broadcast(make_msg(
                        "WORLD_STATE",
                        payload=gameState.get_full_state()
                    ))
                    # Compatibilité legacy : signal de suppression explicite
                    await manager.broadcast(make_msg(
                        "RESOURCE_REMOVED",
                        id=affected_res["id"],
                        x=affected_res["x"],
                        y=affected_res["y"]
                    ))
                # Sinon pour apple_tree : on ne fait rien de plus,
                # l'arbre reste dans le WORLD_STATE, aucun WORLD_STATE à rebrod.
                    
            # ──────────── PLAYER_INTERACT (Legacy Récolte) ────────────
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

            # ──────────── ACTION_CRAFT (Artisanat Autoritaire) ────────────
            elif msg_type == "ACTION_CRAFT":
                recipe_id = payload.get("recipeId")
                if not recipe_id:
                    continue
                
                recipe = recipes.get_craft_recipe(recipe_id)
                if not recipe:
                    await websocket.send_text(make_msg("ERROR", message=f"Recette inconnue : {recipe_id}"))
                    continue
                
                cost_dict = recipe["cost"]
                
                new_wallet = userManager.consume_resources(client_id, cost_dict)
                if not new_wallet:
                    await websocket.send_text(make_msg("ERROR", message="Ressources insuffisantes"))
                    continue
                
                output_name = recipe["output"]
                output_count = recipe.get("yield", 1)
                
                userManager.add_item(client_id, output_name, output_count)
                
                # Informe le client que le craft a réussi pour qu'il s'ajoute le produit
                await websocket.send_text(make_msg("CRAFT_SUCCESS", payload={"item": output_name, "count": output_count}))
                # Actualise le portefeuille du joueur (les minerais/bois consommés)
                await websocket.send_text(make_msg("WALLET_UPDATE", payload=new_wallet))

            # ──────────── ACTION_PLACE (Placement de l'inventaire) ────────────
            elif msg_type == "ACTION_PLACE":
                x = payload.get("x")
                y = payload.get("y")
                item_id = payload.get("itemId")
                
                if x is None or y is None or not item_id:
                    continue

                if not userManager.consume_item(client_id, item_id, 1):
                    await websocket.send_text(make_msg("ERROR", message=f"Vous ne possédez pas : {item_id}"))
                    continue

                # Mapping "inventory item name" -> "GameState (asset, type)"
                place_rules = {
                    "Kit de Feu de Camp": {"asset": "rock", "type": "campfire"},
                    "furnace": {"asset": "furnace", "type": "furnace"},
                    "clay_pot": {"asset": "clay_pot", "type": "clay_pot"}
                }
                
                rule = place_rules.get(item_id)
                if not rule:
                    userManager.add_item(client_id, item_id, 1)
                    await websocket.send_text(make_msg("ERROR", message=f"Objet non plaçable : {item_id}"))
                    continue
                    
                target_asset = rule["asset"]
                target_type = rule["type"]

                new_res = gameState.add_resource(
                    asset=target_asset,
                    obj_type=target_type,
                    x=x,
                    y=y
                )
                
                if not new_res:
                    userManager.add_item(client_id, item_id, 1)
                    await websocket.send_text(make_msg("ERROR", message="Case occupée"))
                    continue

                # Broadcast placement
                await manager.broadcast(make_msg(
                    "RESOURCE_PLACED",
                    resource=new_res
                ))
                await websocket.send_text(make_msg("PLACE_SUCCESS", payload={"itemId": item_id}))

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

            # ──────────── REQUEST_WORLD_STATE (Handshake) ────────────
            elif msg_type == "REQUEST_WORLD_STATE":
                print(f"[WS] Client {client_id} requests WORLD_STATE (handshake)")
                world_state = gameState.get_full_state()
                await manager.send_to(client_id, make_msg(
                    "WORLD_STATE",
                    payload=world_state
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
