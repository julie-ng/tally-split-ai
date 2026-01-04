// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // css: ['~/assets/scss/main.scss'],
  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxthub/core', 'nuxt-shiki'],
  plugins: ['@/plugins/vue-json-pretty'],
  hub: {
    db: 'sqlite'
  },
  css: [
    '~/assets/css/main.css',
    'vue-json-pretty/lib/styles.css'
  ],
  pinia: {
    storesDirs: ['~/stores/**']
  },
  shiki: {
    bundledLangs: ['json'],
    bundledThemes: ['min-light', 'material-theme-palenight'],
    defaultTheme: {
      light: 'min-light',
      dark: 'material-theme-palenight'
    }
  },
  app: {
    head: {
      title: 'AI Receipts POC',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      htmlAttrs: {
        lang: 'en'
      },
      link: [
        {
          rel: 'icon', href: '/favicon.ico'
        }
        ,
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com'
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: ''
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap'
        }
      ],
      bodyAttrs: {
        class: ''
      }
    }
  },
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
    }
  }
})
