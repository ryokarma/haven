FROM node:20-alpine

WORKDIR /app

# Copier les configurations de dépendances
COPY package*.json ./

# Installer les dépendances 
RUN npm install

# Copier l'intégralité du frontend
COPY . .

# Construire pour la production
RUN npm run build

# Configurer les paramètres d'host pour qu'il écoute sur toutes les interfaces réseau
ENV HOST=0.0.0.0
ENV NUXT_HOST=0.0.0.0
ENV PORT=3000

# Exposer le port par défaut Nuxt
EXPOSE 3000

# Lancer l'app en mode production
CMD ["node", ".output/server/index.mjs"]
