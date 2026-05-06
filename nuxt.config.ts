// https://nuxt.com/docs/api/configuration/nuxt-config

const azureStorageAccount = process.env.AZURE_STORAGE_ACCOUNT
if (!azureStorageAccount) {
  throw new Error('AZURE_STORAGE_ACCOUNT must be set — used to allowlist the blob host in CSP')
}
const azureBlobHost = `https://${azureStorageAccount}.blob.core.windows.net`

const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com`,
  `worker-src 'self' blob:`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' https://fonts.gstatic.com`,
  `img-src 'self' data: blob: ${azureBlobHost} https://avatars.githubusercontent.com`,
  `connect-src 'self' ${azureBlobHost}`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
].join('; ')

export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxt/eslint',
    '@nuxthub/core',
    '@pinia/nuxt',
    'nuxt-auth-utils',
    ...(process.env.NODE_ENV === 'production' ? ['@vercel/analytics'] : []),
  ],
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
        process.env.NODE_ENV === 'production'
          ? { rel: 'icon', href: '/favicon.ico' }
          : { rel: 'icon', type: 'image/png', href: '/favicon-dev-256.png' },
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
    '~/assets/css/main.css',
  ],
  routeRules: {
    '/**': {
      headers: {
        'Content-Security-Policy': csp,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Frame-Options': 'DENY',
      },
    },
  },
  runtimeConfig: {
    session: {
      name: 'tally-split-session',
      maxAge: 60 * 60 * 24, // 1 day
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        // secure: true, // already env-gated by nuxt-auth-utils (true in prod, false in dev)
      },
    },
    public: {
      environment: 'development',
      uploadMaxConcurrent: 3,
      uploadAutoIntervalMs: 1000,
      uploadAutoEnabled: true,
    },
  },
  watch: [
    '~~/shared/**/*',
  ],
  compatibilityDate: '2025-07-15',
  hub: {},
  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        '@vueuse/core',
        'zod',
        '@tanstack/vue-table',
      ],
    },
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
