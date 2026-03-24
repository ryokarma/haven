FROM python:3.11-slim

WORKDIR /app

# Ajout de la variable d'environnement pour que Python reconnaisse le package 'backend'
ENV PYTHONPATH=/app

# Mise à jour de pip
RUN pip install --no-cache-dir --upgrade pip

# Copier les dépendances d'abord pour le cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier TOUT le code du backend (depuis le contexte ./backend de docker-compose)
# DANS un dossier /app/backend afin de préserver les imports (from backend.xyz import ...)
COPY . /app/backend/

# Exposer le port de l'API
EXPOSE 8000

# Lancer le serveur uvicorn en pointant vers 'backend.main'
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
