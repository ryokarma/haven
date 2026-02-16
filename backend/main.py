from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import json

from backend.gamestate import GameState
from backend.usermanager import UserManager

# 1. Initialisation de l'application
app = FastAPI()

# 2. Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Autorise tout pour le dev (ou ["http://localhost:3000"])
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Gestionnaire de Connexions
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        
        # Envoyer la liste des joueurs actuels au nouvel arrivant
        current_players = list(self.active_connections.keys())
        await websocket.send_text(json.dumps({
            "type": "CURRENT_PLAYERS", 
            "players": current_players
        }))
        
        # Stocker la nouvelle connexion
        self.active_connections[client_id] = websocket
        print(f"Client {client_id} connected")
        
        # Notifier les autres joueurs
        await self.broadcast(json.dumps({
            "type": "PLAYER_JOINED", 
            "id": client_id
        }), exclude_id=client_id)

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            print(f"Client {client_id} disconnected")

    async def broadcast(self, message: str, exclude_id: str = None):
        for client_id, connection in self.active_connections.items():
            if client_id != exclude_id:
                try:
                    await connection.send_text(message)
                except Exception:
                    pass

# 4. Instanciation des Managers
manager = ConnectionManager()
gameState = GameState()
userManager = UserManager()

# 5. Endpoint WebSocket
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    # Connexion
    await manager.connect(websocket, client_id)
    
    # A. Synchro Joueur (Position Persistante)
    user_data = userManager.get_or_create_user(client_id)
    await websocket.send_text(json.dumps({
        "type": "PLAYER_SYNC",
        "payload": user_data
    }))
    
    # B. Synchro Monde (Ressources)
    await websocket.send_text(json.dumps({
        "type": "WORLD_STATE", 
        "payload": gameState.get_full_state()
    }))

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type")
                
                # Gestion Mouvement
                if msg_type == "PLAYER_MOVE":
                    x = msg.get("x")
                    y = msg.get("y")
                    
                    # Sauvegarde Position
                    userManager.update_user_position(client_id, x, y)
                    
                    # Broadcast
                    await manager.broadcast(json.dumps({
                        "type": "PLAYER_MOVED",
                        "id": client_id,
                        "x": x,
                        "y": y
                    }), exclude_id=client_id)
                
                # Gestion Interaction (Modification Monde)
                elif msg_type == "PLAYER_INTERACT":
                    x = msg.get("x")
                    y = msg.get("y")
                    
                    # Logique Toggle (Retirer ou Ajouter)
                    removed_id = gameState.remove_resource_at(x, y)
                    
                    if removed_id:
                        # --- RÉCOLTE ---
                        # Gain : 1 bois par arbre (simplifié pour 'tree' -> 'wood')
                        # Pour l'instant on suppose que tout donne du bois sauf si on a des types
                        resource_type = "wood" # Default
                        if "rock" in removed_id: resource_type = "stone" # Simple check ID base
                        
                        wallet = userManager.update_wallet(client_id, resource_type, 1)
                        
                        if wallet:
                            # 1. Informer le client du gain
                            await websocket.send_text(json.dumps({
                                "type": "WALLET_UPDATE",
                                "payload": wallet
                            }))
                            
                            # 2. Broadcast Suppression
                            await manager.broadcast(json.dumps({
                                "type": "RESOURCE_REMOVED",
                                "id": removed_id,
                                "x": x,
                                "y": y
                            }))
                            
                    else:
                        # --- CONSTRUCTION / PLACEMENT ---
                        # Coût : 1 Pierre pour poser un rocher (Test)
                        cost_resource = "stone"
                        cost_amount = -1
                        
                        wallet = userManager.update_wallet(client_id, cost_resource, cost_amount)
                        
                        if wallet: # Si succès (fonds suffisants)
                            # 1. Informer le client du coût
                            await websocket.send_text(json.dumps({
                                "type": "WALLET_UPDATE",
                                "payload": wallet
                            }))
                            
                            # 2. Placer le rocher
                            new_res = gameState.add_resource("rock", x, y)
                            await manager.broadcast(json.dumps({
                                "type": "RESOURCE_PLACED",
                                "resource": new_res
                            }))
                        else:
                            # Erreur (Fonds insuffisants...) - Optionnel : Envoyer message erreur
                            pass
                    
            except json.JSONDecodeError:
                pass 
                
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        await manager.broadcast(json.dumps({"type": "PLAYER_LEFT", "id": client_id}))
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(client_id)
        await manager.broadcast(json.dumps({"type": "PLAYER_LEFT", "id": client_id}))
