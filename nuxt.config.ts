// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxthub/core', '@nuxt/eslint'],
  plugins: ['@/plugins/vue-json-pretty'],
  devtools: { enabled: true },
  app: {
    head: {
      title: 'AI Receipts POC',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      htmlAttrs: {
        lang: 'en',
      },
      link: [
        {
          rel: 'icon', href: '/favicon.ico',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
        },
      ],
      bodyAttrs: {
        class: '',
      },
    },
  },
  css: [
    'vue-json-pretty/lib/styles.css',
    '~/assets/css/main.css',
  ],
  runtimeConfig: {
    public: {
      environment: 'development',
      // TODO: remove after auth implementation
      demoUserFirstName: '',
      demoUserLastName: '',
      demoUserUsername: '',
      demoUserEmail: '',
      demoUserId: '',
      // usernameHashSalt: '',

      // Expense splitting identifiers (will be replaced with user IDs later)
      splitUser1: '',
      splitUser2: '',
    },
  },
  watch: [
    '~~/shared/**/*',
  ],
  compatibilityDate: '2025-07-15',
  hub: {
    db: 'sqlite',
  },
  eslint: {
    config: {
      stylistic: true,
    },
  },
  pinia: {
    storesDirs: ['~/stores/**'],
  },
})
