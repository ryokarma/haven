<template>
  <div class="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-4">
    
    <header class="mb-8 text-center">
      <h1 class="text-4xl font-bold text-amber-100 mb-2">Projet Haven</h1>
      <p class="text-stone-400">Hub Social • Fantasy • Isométrique</p>
    </header>

    <!-- Login/Register Form -->
    <div v-if="!isAuthenticated" class="w-full max-w-sm bg-stone-800 p-8 rounded-xl border border-stone-700 shadow-2xl">
      <h2 class="text-2xl font-bold text-amber-100 mb-6 text-center">
        {{ isLoginMode ? 'Connexion' : 'Inscription' }}
      </h2>
      
      <form @submit.prevent="handleAuth" class="space-y-4">
        <div>
          <label class="block text-stone-400 text-sm mb-1">Pseudo</label>
          <input v-model="username" type="text" required
                 class="w-full bg-stone-900 border border-stone-700 rounded p-2 text-stone-200 focus:outline-none focus:border-amber-500" />
        </div>
        <div>
          <label class="block text-stone-400 text-sm mb-1">Mot de passe</label>
          <input v-model="password" type="password" required
                 class="w-full bg-stone-900 border border-stone-700 rounded p-2 text-stone-200 focus:outline-none focus:border-amber-500" />
        </div>
        
        <div v-if="errorMessage" class="text-red-400 text-sm text-center">
          {{ errorMessage }}
        </div>
        
        <button type="submit" 
                class="w-full bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold py-2 rounded transition-colors mt-4">
          {{ isLoginMode ? 'Jouer' : 'Créer mon compte' }}
        </button>
      </form>
      
      <div class="mt-4 text-center">
        <button @click="toggleMode" class="text-stone-500 hover:text-stone-300 text-sm underline">
          {{ isLoginMode ? "Vous n'avez pas de compte ? S'inscrire" : "Déjà un compte ? Se connecter" }}
        </button>
      </div>
    </div>

    <!-- Game Context -->
    <template v-else>
      <ClientOnly>
        <GameCanvas />

        <GameUI />
        <BuildToolbar />
        <ChatWidget />
        
        <template #fallback>
          <div class="w-[800px] h-[600px] bg-stone-800 rounded-xl flex items-center justify-center text-stone-500">
            Chargement du monde...
          </div>
        </template>
      </ClientOnly>

      <div class="mt-6 w-full max-w-[800px] bg-stone-800 p-4 rounded-lg border border-stone-700">
        <p class="text-stone-500 italic text-sm">Système : Bienvenue dans Haven. Connecté en tant que {{ currentUsername }}.</p>
      </div>
    </template>

    <!-- Indicateur de status WebSocket -->
    <div class="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-1 bg-stone-800 rounded-full border border-stone-700 shadow-lg" v-if="isAuthenticated">
      <div 
        class="w-3 h-3 rounded-full transition-colors duration-300" 
        :class="networkStore.isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'"
      ></div>
      <span class="text-xs text-stone-400 font-mono">
        {{ networkStore.isConnected ? 'ONLINE' : 'OFFLINE' }}
      </span>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useNetworkStore } from '@/stores/network';
import { usePlayerStore } from '@/stores/player';

const networkStore = useNetworkStore();
const playerStore = usePlayerStore();

const isAuthenticated = ref(false);
const isLoginMode = ref(true);
const username = ref('');
const password = ref('');
const errorMessage = ref('');
const currentUsername = ref('');

const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value;
  errorMessage.value = '';
};

const handleAuth = async () => {
    errorMessage.value = '';
    
    if (isLoginMode.value) {
        // Login
        try {
            const res = await fetch("http://localhost:8000/login", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({username: username.value, password: password.value})
            });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('haven_token', data.access_token);
                localStorage.setItem('haven_player_id', data.player_id);
                localStorage.setItem('haven_username', data.username);
                localStorage.setItem('haven_role', data.role);
                currentUsername.value = data.username;
                playerStore.username = data.username;
                playerStore.setRole(data.role);
                isAuthenticated.value = true;
                networkStore.connect(data.player_id, data.access_token);
            } else {
                const data = await res.json();
                errorMessage.value = data.detail || "Erreur de connexion";
            }
        } catch (e) {
            errorMessage.value = "Erreur réseau";
        }
    } else {
        // Register
        try {
            const res = await fetch("http://localhost:8000/register", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({username: username.value, password: password.value})
            });
            if (res.ok) {
                // Auto login après register
                isLoginMode.value = true;
                await handleAuth();
            } else {
                const data = await res.json();
                errorMessage.value = data.detail || "Erreur d'inscription";
            }
        } catch (e) {
            errorMessage.value = "Erreur réseau";
        }
    }
};

onMounted(() => {
  const token = localStorage.getItem('haven_token');
  const storedId = localStorage.getItem('haven_player_id');
  const uname = localStorage.getItem('haven_username');
  const role = localStorage.getItem('haven_role');
  
  if (token && storedId) {
      isAuthenticated.value = true;
      currentUsername.value = uname || 'Inconnu';
      playerStore.username = currentUsername.value;
      if (role) {
          playerStore.setRole(role);
      }
      networkStore.connect(storedId, token);
  }
});
</script>

<style>
/* Reset global basique */
body {
  margin: 0;
  background-color: #1c1917; /* stone-900 */
}
</style>