# User Store

`useUserStore` exposes ComputedRefs derived from the auth session. Aliasing
them to local consts breaks reactivity:

```js
const displayName = userStore.displayName  // ❌ snapshot, won't update
```

Reference the store directly in templates and computeds. See
`app/stores/user.store.js` for the full rationale and acceptable exceptions
(e.g. form snapshots).
