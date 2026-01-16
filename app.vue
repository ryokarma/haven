<template>
  <div class="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-4">
    
    <header class="mb-8 text-center">
      <h1 class="text-4xl font-bold text-amber-100 mb-2">Projet Haven</h1>
      <p class="text-stone-400">Hub Social • Fantasy • Isométrique</p>
    </header>

    <ClientOnly>
      <GameCanvas />

      <GameUI />
      
      <template #fallback>
        <div class="w-[800px] h-[600px] bg-stone-800 rounded-xl flex items-center justify-center text-stone-500">
          Chargement du monde...
        </div>
      </template>
    </ClientOnly>

    <div class="mt-6 w-full max-w-[800px] bg-stone-800 p-4 rounded-lg border border-stone-700">
      <p class="text-stone-500 italic text-sm">Système : Bienvenue dans Haven. Connecté en tant qu'Invité.</p>
    </div>

  </div>
</template>

<style>
/* Reset global basique */
body {
  margin: 0;
  background-color: #1c1917; /* stone-900 */
}
</style>