import json
import os
from typing import Dict, Any

DATA_DIR = "backend/data"
USERS_FILE = os.path.join(DATA_DIR, "users.json")

class UserManager:
    def __init__(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        self.users: Dict[str, Any] = {}
        self.load_users()

    def load_users(self):
        if os.path.exists(USERS_FILE):
            try:
                with open(USERS_FILE, "r") as f:
                    self.users = json.load(f)
            except json.JSONDecodeError:
                self.users = {}
                print(f"Error decoding {USERS_FILE}, starting with empty user list.")
        else:
            self.users = {}

    def save_users(self):
        with open(USERS_FILE, "w") as f:
            json.dump(self.users, f, indent=4)

    def get_or_create_user(self, user_id: str) -> Dict[str, Any]:
        if user_id not in self.users:
            self.users[user_id] = {
                "id": user_id,
                "x": 200, 
                "y": 200,
                "wallet": {"wood": 0, "stone": 0} # Initialisation du wallet
            }
            self.save_users()
        return self.users[user_id]

    def update_user_position(self, user_id: str, x: float, y: float):
        if user_id in self.users:
            self.users[user_id]["x"] = x
            self.users[user_id]["y"] = y
            self.save_users()

    def update_wallet(self, user_id: str, resource: str, amount: int) -> Dict[str, int] | bool:
        """Met à jour le wallet. Retourne le nouveau wallet ou False si fonds insuffisants."""
        if user_id not in self.users:
            return False
        
        user = self.users[user_id]
        if "wallet" not in user:
            user["wallet"] = {"wood": 0, "stone": 0}
            
        current_amount = user["wallet"].get(resource, 0)
        new_amount = current_amount + amount
        
        if new_amount < 0:
            return False # Pas assez de ressources
            
        user["wallet"][resource] = new_amount
        self.save_users()
        return user["wallet"]

    def consume_resources(self, user_id: str, costs: Dict[str, int]) -> Dict[str, int] | bool:
        """Déduit plusieurs ressources (transaction atomique). Retourne le wallet ou False si fonds insuffisants."""
        if user_id not in self.users:
            return False
            
        user = self.users[user_id]
        wallet = user.setdefault("wallet", {"wood": 0, "stone": 0})
        
        # 1. Vérification si toutes les conditions sont remplies
        for res, amount in costs.items():
            if wallet.get(res, 0) < amount:
                return False
                
        # 2. Déduction
        for res, amount in costs.items():
            wallet[res] -= amount
            
        self.save_users()
        return wallet

    def add_item(self, user_id: str, item_id: str, count: int) -> Dict[str, Any]:
        """Ajoute un item à l'inventaire du joueur."""
        user = self.get_or_create_user(user_id)
        inventory = user.setdefault("inventory", {})
        inventory[item_id] = inventory.get(item_id, 0) + count
        self.save_users()
        return inventory

    def consume_item(self, user_id: str, item_id: str, count: int) -> bool:
        """Consomme un item de l'inventaire. Retourne True si réussi."""
        if user_id not in self.users:
            return False
            
        user = self.users[user_id]
        inventory = user.setdefault("inventory", {})
        
        if inventory.get(item_id, 0) >= count:
            inventory[item_id] -= count
            if inventory[item_id] <= 0:
                del inventory[item_id]
            self.save_users()
            return True
            
        return False
