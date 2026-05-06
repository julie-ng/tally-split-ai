// Deny-by-default route guard. Runs on every navigation (server + client).
// Public routes are explicitly listed; everything else redirects to /login
// when the user is not authenticated.
const PUBLIC_ROUTES = new Set([
  '/',
  '/login',
])

export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()

  if (to.path === '/login' && loggedIn.value) {
    return navigateTo('/dashboard')
  }

  if (PUBLIC_ROUTES.has(to.path)) {
    return
  }

  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})
