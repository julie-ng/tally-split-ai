// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // css: ['~/assets/scss/main.scss'],
  modules: ['@nuxt/ui', '@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  pinia: {
    storesDirs: ['~/stores/**']
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
        class: 'bg-slate-100'
      }
    }
  },
  runtimeConfig: {
    public: {
      environment: 'development',
      demoUserFirstName: '',
      demoUserLastName: '',
      demoUserUsername: '',
      demoUserEmail: '',
      demoUserId: '',
    }
  }
})
