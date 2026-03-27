// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      // @ts-ignore
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:8000',
      // @ts-ignore
      wsUrl: process.env.NUXT_PUBLIC_WS_URL || 'ws://localhost:8000'
    }
  },

  devtools: { enabled: true },

  // On active le module Tailwind
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],

  // Configuration de l'application
  app: {
    head: {
      title: 'Projet Haven',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    }
  },

  // Important pour Phaser : on s'assure que le build est compatible
  vite: {
    build: {
      assetsInlineLimit: 0, // Pour éviter les soucis avec les assets graphiques
    }
  },

  compatibilityDate: '2025-01-14'
})