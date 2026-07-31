// Detail routes are panels, not pages.
//
// Per the v1 design direction the expense is the primary noun and everything
// else is a facet surfaced in a side panel — so `/expenses/[id]` and
// `/uploads/[id]` have no page to render. They previously 404'd; this rewrites
// them onto the list route with the panel open.
//
// IMPORTANT
// - The `tab` values must stay in sync with each preview composable's
//   `defaultTab` (`useExpensePreview` → overview, `useUploadPreview` → workflow).
// - Client-side, not a server routeRule: Nitro's `redirect` can only splice a
//   path prefix, it cannot move a path segment into a query param. Running in
//   route middleware also covers in-app navigation, not just full page loads.
const PANEL_ROUTES = [
  { prefix: '/expenses/', list: '/expenses', tab: 'overview' },
  { prefix: '/uploads/', list: '/uploads', tab: 'workflow' },
]

export default defineNuxtRouteMiddleware((to) => {
  for (const { prefix, list, tab } of PANEL_ROUTES) {
    if (!to.path.startsWith(prefix)) {
      continue
    }

    // Only a bare `/<resource>/<id>` maps to a panel. Anything deeper is a real
    // route (e.g. /expenses/2026/07) and must fall through.
    const rest = to.path.slice(prefix.length).replace(/\/$/, '')
    if (!rest || rest.includes('/')) {
      continue
    }

    return navigateTo(
      { path: list, query: { ...to.query, preview: rest, tab: to.query.tab ?? tab } },
      { replace: true },
    )
  }
})
