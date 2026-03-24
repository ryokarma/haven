FROM python:3.11-slim

WORKDIR /app

# Mise à jour de pip
RUN pip install --no-cache-dir --upgrade pip

# Copier et installer les dépendances (pour optimiser le cache Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier le reste du projet backend
COPY . .

# Exposer le port de l'API FastAPI
EXPOSE 8000

# Lancer server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
