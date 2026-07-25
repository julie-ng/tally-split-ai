// https://nuxt.com/docs/api/configuration/nuxt-config

const azureStorageAccount = process.env.AZURE_STORAGE_ACCOUNT
if (!azureStorageAccount) {
  console.warn('[nuxt.config] AZURE_STORAGE_ACCOUNT not set — CSP will not allowlist the Azure blob host. Azure blobs will be blocked at runtime.')
}
const azureBlobHost = azureStorageAccount
  ? `https://${azureStorageAccount}.blob.core.windows.net`
  : null

// Supabase Realtime connects over WebSocket (wss://) and also makes https calls
// to the same project host. Derive both origins from the public URL so the CSP
// allowlists them. See docs/REALTIME.md.
const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
if (!supabaseUrl) {
  console.warn('[nuxt.config] NUXT_PUBLIC_SUPABASE_URL not set — CSP will not allowlist Supabase. Realtime will be blocked at runtime.')
}
const supabaseHost = supabaseUrl ? supabaseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : null
const supabaseConnectSrc = supabaseHost ? ` https://${supabaseHost} wss://${supabaseHost}` : ''

const isDev = process.env.NODE_ENV !== 'production'

const csp = [
  `default-src 'self'`,
  // 'wasm-unsafe-eval' allows WebAssembly compilation. Nuxt Content's client-side
  // query layer loads wa-sqlite (WASM) on SPA navigations; without this, queries
  // return undefined on client-side route transitions and content pages break.
  // Narrower than 'unsafe-eval' — does NOT enable eval() or string-to-code.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://va.vercel-scripts.com`,
  `worker-src 'self' blob:`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' https://fonts.gstatic.com`,
  azureBlobHost
    ? `img-src 'self' data: blob: https://avatars.githubusercontent.com ${azureBlobHost}`
    : `img-src 'self' data: blob: https://avatars.githubusercontent.com`,
  azureBlobHost
    ? `connect-src 'self' ${azureBlobHost}${supabaseConnectSrc}`
    : `connect-src 'self'${supabaseConnectSrc}`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
].join('; ')

// Prod uses Turso (libsql); dev falls back to @nuxt/content's local default.
// The libsql config type requires string url/authToken; these come from env
// (string | undefined). At runtime prod always has them set — @nuxt/content
// fails clearly if not. The type mismatch is suppressed at the `content:` usage
// site below (that's where the type flows), not here.
const contentConfig = isDev
  ? {}
  : {
    database: {
      type: 'libsql' as const, // literal, not string — matches LibSQLDatabaseConfig
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    },
  }

export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxt/image',
    '@nuxt/content',
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
          ? { rel: 'icon', href: '/favicon-inverse.png' }
          : { rel: 'icon', type: 'image/png', href: '/favicon-red.png' },
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
    // `password` is intentionally omitted here — nuxt-auth-utils injects it from
    // NUXT_SESSION_PASSWORD at runtime (never hardcode the session secret). The
    // SessionConfig type marks it required, so suppress that one mismatch.
    // @ts-expect-error password is provided via NUXT_SESSION_PASSWORD env
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
    // Server-only: the ES256 signing key as a JWK JSON string (includes its own
    // kid), used by /api/realtime/token to mint short-lived Supabase JWTs. Never
    // exposed to the client. Auto-populated from NUXT_SUPABASE_JWT_PRIVATE_KEY at
    // runtime. See docs/REALTIME.md.
    supabaseJwtPrivateKey: '',
    public: {
      environment: 'development',
      uploadMaxConcurrent: 3,
      uploadAutoIntervalMs: 1000,
      uploadAutoEnabled: true,
      // Client-safe Supabase connection details. Auto-populated from
      // NUXT_PUBLIC_SUPABASE_* env vars at runtime. Publishable key = the new
      // API-key system's browser-safe key (replaces the legacy anon key).
      supabaseUrl: '',
      supabasePublishableKey: '',
    },
  },
  // Bundle icon collections locally — without this, Nuxt UI fetches icons
  // from api.iconify.design at runtime, which the CSP blocks (and would be a
  // privacy/availability liability anyway).
  icon: {
    serverBundle: {
      collections: ['lucide', 'simple-icons', 'material-icon-theme'],
    },
  },
  watch: [
    '~~/shared/**/*',
  ],
  compatibilityDate: '2025-07-15',
  // App-specific key so the color mode preference doesn't collide with other
  // Nuxt apps sharing the localhost origin (default key is 'nuxt-color-mode').
  colorMode: {
    preference: 'light',
    fallback: 'light',
    storageKey: 'tally-split:color-mode',
  },
  hub: {},
  vite: {
    optimizeDeps: {
      include: [
        '@supabase/supabase-js',
        '@tanstack/vue-table',
        '@vue/devtools-core',
        '@vue/devtools-kit',
        '@vueuse/core',
        'mermaid',
        'zod',
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
  // @ts-expect-error contentConfig.database url/authToken are env-provided (string | undefined); set in prod
  content: contentConfig,
})
