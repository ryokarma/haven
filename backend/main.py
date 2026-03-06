"""
Haven — Backend Principal
FastAPI + WebSocket — MVP Alpha 0.1
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict
import json
import time

from backend.gamestate import GameState
from backend.usermanager import UserManager
from backend import recipes
from backend.database import get_db, engine, Base
import backend.models
from backend.auth import get_password_hash, verify_password, create_access_token, decode_access_token

from fastapi import Query, HTTPException, status
import uuid
from sqlalchemy.future import select
from sqlalchemy import text

# ──────────────────────────────────────────────
# 1. Application & CORS
# ──────────────────────────────────────────────
app = FastAPI(title="Haven Backend", version="0.1.0")

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Migration SQLite basique pour ajouter les colonnes sans Alembic (si elles n'existent pas)
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'user'"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN created_at DATETIME"))
        except Exception:
            pass
    print("[DB] Tables SQLite créées ou vérifiées et colonnes migrées.")

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
        self.active_sessions: Dict[str, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        
        user = userManager.get_or_create_user(client_id)
        # [16.4] Force user map to farm_main
        user["map_id"] = "farm_main"
        current_map = "farm_main"

        self.active_sessions[client_id] = {"ws": websocket, "map_id": current_map}
        print(f"[WS] Client {client_id} connected to {current_map} ({len(self.active_sessions)} total)")

        current_players_data = []
        for cid, info in self.active_sessions.items():
            if cid != client_id and info["map_id"] == current_map:
                u = userManager.get_or_create_user(cid)
                current_players_data.append({"id": cid, "x": u.get("x", 10), "y": u.get("y", 10)})
        
        await websocket.send_text(json.dumps({
            "type": "CURRENT_PLAYERS",
            "players": current_players_data
        }))

        joined_user = userManager.get_or_create_user(client_id)
        await self.broadcast(json.dumps({
            "type": "PLAYER_JOINED",
            "id": client_id,
            "x": joined_user.get("x", 10),
            "y": joined_user.get("y", 10)
        }), map_id=current_map, exclude_id=client_id)

    def disconnect(self, client_id: str):
        if client_id in self.active_sessions:
            del self.active_sessions[client_id]
            print(f"[WS] Client {client_id} disconnected")

    async def broadcast(self, message: str, map_id: str, exclude_id: str = None):
        """Envoie un message à tous les clients connectés sur une carte spécifique."""
        disconnected = []
        for cid, info in self.active_sessions.items():
            if cid != exclude_id and info["map_id"] == map_id:
                try:
                    await info["ws"].send_text(message)
                except Exception:
                    disconnected.append(cid)
        for cid in disconnected:
            self.disconnect(cid)

    async def send_to(self, client_id: str, message: str):
        """Envoie un message à un client spécifique."""
        if client_id in self.active_sessions:
            try:
                await self.active_sessions[client_id]["ws"].send_text(message)
            except Exception:
                self.disconnect(client_id)
                
    def set_player_map(self, client_id: str, new_map_id: str):
        if client_id in self.active_sessions:
            self.active_sessions[client_id]["map_id"] = new_map_id


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
# 5. API REST — Authentification
# ──────────────────────────────────────────────

@app.post("/register")
async def register(req: backend.models.RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(backend.models.User).where(backend.models.User.username == req.username))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà pris")
    
    new_user = backend.models.User(
        id=str(uuid.uuid4()),
        username=req.username,
        password_hash=get_password_hash(req.password),
        role="user"
    )
    db.add(new_user)
    await db.commit()
    return {"message": "Compte créé avec succès"}

@app.post("/login")
async def login(req: backend.models.LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(backend.models.User).where(backend.models.User.username == req.username))
    user = result.scalars().first()
    
    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    
    token = create_access_token({"sub": user.id, "username": user.username, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "player_id": user.id, "username": user.username, "role": user.role}

# ──────────────────────────────────────────────
# 6. WebSocket Endpoint
# ──────────────────────────────────────────────

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str, token: str = Query(None)):
    if not token:
        await websocket.close(code=1008, reason="Token manquant (accès refusé)")
        return
    
    payload_token = decode_access_token(token)
    if not payload_token or payload_token.get("sub") != client_id:
        await websocket.close(code=1008, reason="Token invalide ou ne correspond pas au client_id")
        return
        
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
            current_map = manager.active_sessions.get(client_id, {}).get("map_id", "farm_main")

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
                ), map_id=current_map, exclude_id=client_id)

            # ──────────── ACTION_HARVEST (Récolte Serveur) ────────────
            elif msg_type == "ACTION_HARVEST":
                resource_id = payload.get("resource_id")
                equipped_tool = payload.get("tool", "none")
                print(f"[WS] ACTION_HARVEST reçu de {client_id}: resource_id={resource_id}, tool={equipped_tool}")
                
                if not resource_id:
                    await websocket.send_text(make_msg("ERROR", message="resource_id manquant"))
                    continue

                harvest_result = gameState.harvest_resource(client_id, current_map, resource_id, equipped_tool, userManager)

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
                    # Diffuse le nouveau WORLD_STATE à TOUS les clients de la map (diff côté client)
                    await manager.broadcast(make_msg(
                        "WORLD_STATE",
                        payload=gameState.get_full_state(current_map)
                    ), map_id=current_map)
                    # Compatibilité legacy : signal de suppression explicite
                    await manager.broadcast(make_msg(
                        "RESOURCE_REMOVED",
                        id=affected_res["id"],
                        x=affected_res["x"],
                        y=affected_res["y"]
                    ), map_id=current_map)
                # Sinon pour apple_tree : on ne fait rien de plus,
                # l'arbre reste dans le WORLD_STATE, aucun WORLD_STATE à rebrod.
                    
            # ──────────── PLAYER_INTERACT (Legacy Récolte) ────────────
            elif msg_type == "PLAYER_INTERACT":
                x = payload.get("x")
                y = payload.get("y")
                if x is None or y is None:
                    continue

                removed = gameState.remove_resource_at(current_map, x, y)

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
                    ), map_id=current_map)
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
                    y=y,
                    map_id=current_map
                )
                
                if not new_res:
                    userManager.add_item(client_id, item_id, 1)
                    await websocket.send_text(make_msg("ERROR", message="Case occupée"))
                    continue

                # Broadcast placement
                await manager.broadcast(make_msg(
                    "RESOURCE_PLACED",
                    resource=new_res
                ), map_id=current_map)
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
                    y=y,
                    map_id=current_map
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
                ), map_id=current_map)

            # ──────────── REQUEST_WORLD_STATE (Handshake) ────────────
            elif msg_type == "REQUEST_WORLD_STATE":
                print(f"[WS] Client {client_id} requests WORLD_STATE for {current_map}")
                world_state = gameState.get_full_state(current_map)
                await manager.send_to(client_id, make_msg(
                    "WORLD_STATE",
                    payload=world_state
                ))

                # Session 10.4 : On renvoie les joueurs déjà connectés ici
                # car le client est enfin prêt à les afficher (sa scène Phaser écoute)
                current_players_data = []
                for cid, info in manager.active_sessions.items():
                    if cid != client_id and info["map_id"] == current_map:
                        user = userManager.get_or_create_user(cid)
                        current_players_data.append({"id": cid, "x": user.get("x", 10), "y": user.get("y", 10)})
                
                await manager.send_to(client_id, make_msg(
                    "CURRENT_PLAYERS",
                    players=current_players_data
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
                ), map_id=current_map)
                
            # ──────────── ACTION_CHANGE_MAP ────────────
            elif msg_type == "ACTION_CHANGE_MAP":
                # [16.4] Rollback: Map transition disabled
                await websocket.send_text(make_msg("ERROR", message="Le voyage inter-cartes est temporairement désactivé."))

            # ──────────── ADMIN COMMANDS ────────────
            elif msg_type == "ADMIN_KICK_PLAYER":
                if payload_token.get("role") != "admin": # renamed from payload due to shadowing
                    await websocket.send_text(make_msg("ERROR", message="Permission refusée."))
                    continue
                
                target_id = payload.get("playerId")
                if target_id and target_id in manager.active_sessions:
                    target_ws = manager.active_sessions[target_id]["ws"]
                    await target_ws.send_text(make_msg("ERROR", message="Vous avez été expulsé par un administrateur."))
                    await target_ws.close(code=1008, reason="Kicked by admin")
                    # Close will trigger WebSocketDisconnect block

            elif msg_type == "ADMIN_REGENERATE_MAP":
                if payload_token.get("role") != "admin":
                    await websocket.send_text(make_msg("ERROR", message="Permission refusée."))
                    continue
                
                print(f"[WS] Admin {client_id} requests map regeneration for {current_map}")
                new_state = gameState.regenerate_room(current_map)
                
                # Relocalize all players to spawn (0,0 or similar)
                for cid, info in manager.active_sessions.items():
                    if info["map_id"] == current_map:
                        userManager.update_user_position(cid, 10, 10)
                
                await manager.broadcast(make_msg("MAP_REGENERATED", payload=new_state), map_id=current_map)
                
                # Send updated positions
                for cid, info in manager.active_sessions.items():
                    if info["map_id"] == current_map:
                        await manager.broadcast(make_msg("PLAYER_MOVED", id=cid, x=10, y=10), map_id=current_map, exclude_id=cid)
                        # send to the player themselves
                        user_data = userManager.get_or_create_user(cid)
                        await manager.send_to(cid, make_msg("PLAYER_SYNC", payload=user_data))


    except WebSocketDisconnect:
        current_m = manager.active_sessions.get(client_id, {}).get("map_id", "farm_main")
        manager.disconnect(client_id)
        await manager.broadcast(make_msg("PLAYER_LEFT", id=client_id), map_id=current_m)
    except Exception as e:
        print(f"[WS] Error for {client_id}: {e}")
        current_m = manager.active_sessions.get(client_id, {}).get("map_id", "farm_main")
        manager.disconnect(client_id)
        await manager.broadcast(make_msg("PLAYER_LEFT", id=client_id), map_id=current_m)
