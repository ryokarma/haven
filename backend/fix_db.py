"""
fix_db.py — Patch de migration SQLite (Session 8.2)
Ajoute la colonne `energy` à la table `users` sans perte de données.

Usage : python backend/fix_db.py
"""

import sqlite3
import os

# Chemin de la base de données (relatif à la racine du projet)
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "haven.db")
DB_PATH = os.path.abspath(DB_PATH)

print(f"[fix_db] Connexion à : {DB_PATH}")

if not os.path.exists(DB_PATH):
    print(f"[fix_db] ❌ Fichier introuvable : {DB_PATH}")
    print("[fix_db] Vérifiez que le backend a déjà été lancé au moins une fois (création automatique de haven.db).")
    exit(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE users ADD COLUMN energy INTEGER DEFAULT 100;")
    conn.commit()
    print("[fix_db] ✅ Colonne `energy` ajoutée avec succès (valeur par défaut = 100).")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e).lower():
        print("[fix_db] ⚠️  La colonne `energy` existe déjà — aucune modification nécessaire.")
    else:
        print(f"[fix_db] ❌ Erreur inattendue : {e}")
finally:
    conn.close()
    print("[fix_db] Connexion fermée.")
